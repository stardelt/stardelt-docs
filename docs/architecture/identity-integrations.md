---
title: "Identity integrations"
sidebar_label: "Identity integrations"
slug: /architecture/identity-integrations
---

# Identity integrations, block by block

stardelt supports **two identity modes**, and in both, every building block authenticates users
against the same OIDC issuer:

- **`platform`**: stardelt deploys Keycloak (Apache-2.0), realm `stardelt`, at `id.<baseDomain>`.
  This is the master spec's default plug (§5, row 3).
- **`external`**: the customer's IdP. **Microsoft Entra ID** is the primary target. Any
  standards-compliant OIDC provider (Okta, Auth0, a corporate Keycloak) uses the same knobs.

This page covers the per-block mechanics: what each upstream project supports at the versions
stardelt pins, the Helm value paths, the claims each block needs, and where the user's token
can and cannot travel. The Nova-side contract (env vars, flows, rules) is on the *Identity* page
in this section. When the two pages disagree, the master spec decides.

Pinned versions (`stardelt-platform/Makefile`): Trino chart 1.42.2 (Trino 480), Lakekeeper chart
0.11.0 (Lakekeeper 0.12.2), Superset chart 0.15.5 (Superset 5.0.0, Flask-AppBuilder 4.5.5),
Airflow chart 1.21.0 (Airflow 3.2.0, FAB provider 3.5.0), JupyterHub chart 4.4.3 (JupyterHub 5.5.3,
OAuthenticator 17.4.0), SeaweedFS chart 4.25.1 (SeaweedFS 4.25).

Anything marked **unverified** is not confirmed by upstream docs or source for the pinned
version. Test it before you depend on it.

## Summary matrix

| Block | Native OIDC | Via proxy | Not possible in OSS | Groups / roles from token | User token to next hop | Effort |
|---|---|---|---|---|---|---|
| **Nova** | ✅ (stardelt-built: auth code + PKCE, bearer) | n/a | n/a | yes (`identity.groupClaim`) | ✅ Bearer to Trino and Lakekeeper (phase 2) | M |
| **Trino** | ✅ `OAUTH2` (Web UI and bearer JWT) | n/a | groups from claims | ❌ group providers are file/LDAP only | ❌ to Lakekeeper: service principal (user forwarding unverified) | M |
| **Lakekeeper** | ✅ native OIDC (API and UI) | n/a | n/a | roles claim read only by Cedar; OpenFGA ignores token roles | n/a (end of chain; signs or vends S3 access) | S, or M with OpenFGA |
| **Superset** | ✅ FAB `AUTH_OAUTH` | n/a | n/a | ✅ `AUTH_ROLES_MAPPING` | ⚠️ service account + impersonation, or a second per-user OAuth2 consent for Trino | S |
| **Airflow 3** | ✅ FAB auth manager `AUTH_OAUTH` | n/a | n/a | ✅ `AUTH_ROLES_MAPPING` | ❌ tasks use connections (service accounts) | S–M |
| **JupyterHub** | ✅ OAuthenticator (Generic / AzureAd) | n/a | n/a | ✅ `manage_groups` | ✅ via `auth_state` into the pod (refresh is your problem) | S–M |
| **SeaweedFS S3** | ⚠️ OIDC/STS exists upstream; needs ≥ 4.40 (CVE-2026-77298) | n/a | user SSO at 4.25 (do not enable) | role mapping in IAM JSON (upstream) | n/a | stay on static keys |
| **SeaweedFS admin UI** | ❌ OIDC is SeaweedFS **Enterprise** only | ✅ oauth2-proxy | yes, in OSS | via oauth2-proxy `allowed_groups` | n/a | S |
| **SeaweedFS filer UI** | ❌ | ✅ oauth2-proxy, or do not expose | yes | via oauth2-proxy | n/a | S |
| OpenMetadata | not deployed today; skipped | | | | | |

Effort: **S** is values only. **M** adds an image change, a bootstrap step or extra components.

**What "one identity enforced at the catalog" (master spec §7) actually looks like on these
versions.** Trino authenticates the user, then talks to Lakekeeper as one trusted service
principal. Per-user table policy reaches Trino through Trino's OPA access control plus
Lakekeeper's **OPA bridge**, which answers Trino's checks from Lakekeeper's permission model. That
needs a real authorization backend in Lakekeeper (OpenFGA, Apache-2.0), not today's `allowall`.
Direct callers (Nova, notebooks, PyIceberg) present the user's own token to Lakekeeper.

## Decision: two modes, one knob

The umbrella chart (`stardelt-platform/chart/values.yaml`) already carries this block. The
`PlatformInstance` CRD will carry the same four fields with the same meanings:

```yaml
identity:
  mode: platform          # platform | external   (none = dev/CI only, see below)
  issuerUrl: ""           # external: required, https only
                          # platform: derived, https://id.<baseDomain>/realms/stardelt
  groupClaim: groups      # Keycloak: groups   | Entra ID: roles (app roles, recommended)
  adminGroup: stardelt-admins   # Keycloak group name | Entra app-role value, e.g. stardelt.admin
```

- `none` is not a third identity mode. It is the dev and CI path (`kind`, `make demo`), with no
  IdP and components on their dev auth, as the Identity page requires.
- The chart publishes ConfigMap `stardelt-identity` (`issuerUrl`, `groupClaim`, `adminGroup`).
  Every block's values are derived from it. Client IDs and secrets live in Secrets
  (`stardelt-oidc-clients` in platform mode, customer-provided in external mode), never in this
  block.
- The user-ID claim is derived, not configured. Use `oid` on Entra, because Entra's `sub` is
  pairwise per application: the same user gets a different `sub` in Nova than in Trino. Use
  `sub` everywhere else. Lakekeeper already prefers `oid` and falls back to `sub`.

How the knob lands in each block:

| Knob | Nova | Trino | Lakekeeper | Superset / Airflow (FAB) | JupyterHub |
|---|---|---|---|---|---|
| `issuerUrl` | `NOVA_OIDC_ISSUER` | `…oauth2.issuer` | `auth.oauth2.providerUri` | `server_metadata_url` / provider URLs | `authorize_url`, `token_url`, `userdata_url` (no discovery) |
| `groupClaim` | `NOVA_OIDC_GROUP_CLAIM` | not consumable (see Trino) | `LAKEKEEPER__OPENID_ROLES_CLAIM` (Cedar only) | built-in providers read it themselves (`groups` for keycloak, `roles` for azure) | `auth_state_groups_key: oauth_user.<claim>` |
| `adminGroup` | `NOVA_OIDC_ADMIN_GROUP` | access-control rules | Lakekeeper role assignment | `AUTH_ROLES_MAPPING = {adminGroup: ["Admin"]}` | `admin_groups: [adminGroup]` |

## Block by block

### Nova (stardelt, Rust axum)

- **Mechanism.** Built by stardelt to the contract on the Identity page: authorization code + PKCE
  against `issuerUrl` discovery, a server-side session cookie, and `Authorization: Bearer` on
  `/api/*`. Not implemented on `main` yet: the backend still sends a fixed `X-Trino-User`.
- **Values.** `NOVA_AUTH_MODE=oidc`, `NOVA_OIDC_ISSUER`, `NOVA_OIDC_CLIENT_ID`,
  `NOVA_OIDC_CLIENT_SECRET`, `NOVA_OIDC_SCOPES`, `NOVA_OIDC_GROUP_CLAIM`, `NOVA_OIDC_ADMIN_GROUP`,
  `NOVA_SESSION_SECRET`. Redirect URI: `https://<baseDomain>/api/auth/callback`.
- **Claims.** `sub` (or `oid` on Entra) as the key, `preferred_username` / `email` for display, the
  group claim for admin.
- **Forwarding.** Nova is where forwarding works best. Its access token must carry an audience
  that Trino and Lakekeeper accept:
  - **Keycloak:** an Audience mapper adds `trino` and `lakekeeper` to `aud`.
  - **Entra:** a token has exactly one resource audience, so Nova requests a scope on the
    stardelt API app (see the Entra section). Trino and Lakekeeper both trust that one audience.

### Trino 480 (chart 1.42.2)

- **Mechanism.** `http-server.authentication.type=oauth2` (chart: `server.config.authenticationType: OAUTH2`).
  It covers browser login via `web-ui.authentication.type=oauth2` and bearer JWT access tokens
  from clients such as Nova, the JDBC/Python client and Superset.
  - **TLS is required.** Upstream says "Using TLS and a configured shared secret is required for
    OAuth 2.0 authentication".
  - **TLS options.** Either terminate TLS at the ingress and set `http-server.process-forwarded=true`
    (already set in `helm-values/trino.yaml`), or enable coordinator TLS with
    `server.config.https.enabled` and `server.config.https.keystore.path`.
  - **Shared secret.** Set `internal-communication.shared-secret` to the same value on all nodes.
  - **In-cluster callers.** Callers on plain `http://trino:8080` with authentication enabled need
    either TLS on the coordinator or `http-server.authentication.allow-insecure-over-http=true`.
    The docs only describe this for the coordinator-TLS case. **Unverified** for TLS terminated
    at the ingress. Test it.
- **Values** (chart key `additionalConfigProperties`, secrets through `env` / `envFrom` and `${ENV:…}`):

  ```yaml
  server:
    config:
      authenticationType: OAUTH2
  additionalConfigProperties:
    - http-server.process-forwarded=true
    - internal-communication.shared-secret=${ENV:TRINO_SHARED_SECRET}
    - web-ui.authentication.type=oauth2
    - http-server.authentication.oauth2.issuer=<issuerUrl>
    - http-server.authentication.oauth2.client-id=${ENV:TRINO_OIDC_CLIENT_ID}
    - http-server.authentication.oauth2.client-secret=${ENV:TRINO_OIDC_CLIENT_SECRET}
    - http-server.authentication.oauth2.scopes=openid,profile   # Entra: add api://<stardelt-api>/access
    - http-server.authentication.oauth2.additional-audiences=<audience of Nova's token>
    - http-server.authentication.oauth2.principal-field=preferred_username
    - http-server.authentication.oauth2.oidc.use-userinfo-endpoint=false
  ```

  - **Userinfo.** Upstream says to set `use-userinfo-endpoint=false` when the IdP issues JWT access
    tokens and advertises a userinfo endpoint. That is required for Entra, where userinfo is
    Microsoft Graph.
  - **Access-token issuer.** `access-token-issuer` defaults to `issuer`. On Entra it only matches
    when the API app issues v2 tokens (`accessTokenAcceptedVersion: 2`).
  - **Redirect URI.** `https://trino.<baseDomain>/oauth2/callback`.
- **Claims.**
  - **Principal.** `principal-field` picks one claim (default `sub`). `preferred_username` gives
    readable user names in query history and rules. On Entra it is mutable, so do not base
    authorization on it there. Use `oid` with `user-mapping` if the OPA bridge has to match
    Lakekeeper user IDs. **Unverified:** which form the bridge expects. Its docs only say
    "typically OIDC subject identifiers".
  - **Groups.** Trino 480 documents no way to take groups from a token claim. Group providers are
    `file` and `ldap` only. Role logic belongs in OPA (Lakekeeper permissions) or file rules keyed
    on users.
- **Forwarding to Lakekeeper.** The documented path is a service principal (client credentials)
  on the Iceberg catalog:

  ```properties
  iceberg.rest-catalog.security=OAUTH2
  iceberg.rest-catalog.oauth2.server-uri=<token endpoint>
  iceberg.rest-catalog.oauth2.credential=${ENV:TRINO_CATALOG_CLIENT_ID}:${ENV:TRINO_CATALOG_CLIENT_SECRET}
  iceberg.rest-catalog.oauth2.scope=lakekeeper           # Entra: api://<stardelt-api>/.default
  iceberg.rest-catalog.vended-credentials-enabled=true
  ```

  `iceberg.rest-catalog.session=USER` exists ("Session information included when communicating
  with the REST Catalog"). Whether it carries the end user's token in a form Lakekeeper
  authenticates is **unverified**. Neither Trino nor Lakekeeper documents it. Per-user
  enforcement therefore uses `access-control.name=opa` with `opa.policy.uri` and
  `opa.policy.batched-uri` (chart: `accessControl.type: properties`), backed by the Lakekeeper OPA
  bridge (OPA, Apache-2.0) and its own technical client.

### Lakekeeper 0.12.2 (chart 0.11.0)

- **Mechanism.** Native OIDC: JWT validation against `LAKEKEEPER__OPENID_PROVIDER_URI` discovery,
  plus a browser UI that runs authorization code in the browser.
- **Values.**

  ```yaml
  auth:
    oauth2:
      providerUri: <issuerUrl>                 # LAKEKEEPER__OPENID_PROVIDER_URI
      audience: lakekeeper                     # Entra: the stardelt API app's client ID (v2 aud)
      additionalIssuers: []                    # Entra fallback for v1 tokens: https://sts.windows.net/<tenant>/
      ui:
        clientID: lakekeeper                   # Entra: the SPA app registration
        scopes: "openid profile"               # Entra: "openid profile api://<stardelt-api>/access"
  authz:
    backend: openfga                           # allowall today = no enforcement
  internalOpenFGA: true
  catalog:
    extraEnv:
      - { name: LAKEKEEPER__OPENID_SUBJECT_CLAIM, value: oid }   # optional; oid→sub is already the default order
  ```

  - **UI redirect.** The UI's redirect URI is `https://lakekeeper.<baseDomain>/ui/callback`.
  - **UI client type.** Upstream configures the UI client as **public** (Keycloak: client
    authentication off, standard flow and device grant on; Entra: SPA platform). The current
    realm export on `main` registers `lakekeeper` as confidential, which the browser flow cannot
    use. Fix it when Lakekeeper SSO is wired.
- **Claims.**
  - **Audience.** `aud` must match `audience`. In Keycloak that takes an Audience mapper; the
    `main` realm has none yet.
  - **User ID.** Built as `oidc~<oid|sub>`.
  - **Roles claim.** `LAKEKEEPER__OPENID_ROLES_CLAIM` is read only by role-consuming authorizers
    such as Cedar. "The default OpenFGA implementation does not use token roles", so OpenFGA roles
    are assigned in Lakekeeper itself. Whether Cedar ships in the OSS image is **unverified**: the
    docs carry no edition note, and the chart has a license-key field for the enterprise build.
- **Machine users.** Use client credentials (Trino, Spark, Airflow tasks, the OPA bridge) or
  Kubernetes service-account tokens (`auth.k8s.enabled: true`, audience
  `https://kubernetes.default.svc`).
- **Downstream.** Lakekeeper holds the SeaweedFS keys itself and hands engines vended credentials
  or remote signing. Users never get S3 keys.

### Superset 5.0.0 (chart 0.15.5, Flask-AppBuilder 4.5.5)

- **Mechanism.** FAB `AUTH_TYPE = AUTH_OAUTH` with `OAUTH_PROVIDERS`.
  - **Built-in providers.** Use FAB's own provider names so the built-in userinfo logic applies
    (read from FAB 4.5.x source).
  - **`keycloak`** calls `openid-connect/userinfo` and maps `preferred_username` to the username
    and `groups` to `role_keys`.
  - **`azure`** decodes the ID token and maps `oid` to the username and `upn`, else `email`, to the
    email. It raises an error if neither is present. It maps `roles` to `role_keys`, and skips
    signature verification unless `client_kwargs.verify_signature: True`.
  - **Authlib.** It must be in the image. Superset 5.0.0's `requirements/base.txt` does not include
    it, so add it to `stardelt-platform/images/superset/Dockerfile`.
- **Values** (chart keys `configOverrides`, secrets via `extraSecretEnv`):

  ```python
  # configOverrides.enable_oauth
  from flask_appbuilder.security.manager import AUTH_OAUTH
  AUTH_TYPE = AUTH_OAUTH
  AUTH_USER_REGISTRATION = True
  AUTH_USER_REGISTRATION_ROLE = "Gamma"
  AUTH_ROLES_SYNC_AT_LOGIN = True
  AUTH_ROLES_MAPPING = {"stardelt-admins": ["Admin"], "stardelt-users": ["Gamma"]}
  OAUTH_PROVIDERS = [{
      "name": "keycloak", "icon": "fa-key", "token_key": "access_token",
      "remote_app": {
          "client_id": os.environ["SUPERSET_OIDC_CLIENT_ID"],
          "client_secret": os.environ["SUPERSET_OIDC_CLIENT_SECRET"],
          "api_base_url": "https://id.<baseDomain>/realms/stardelt/protocol/openid-connect",
          "server_metadata_url": "https://id.<baseDomain>/realms/stardelt/.well-known/openid-configuration",
          "client_kwargs": {"scope": "openid email profile"},
      },
  }]
  # Entra: "name": "azure", server_metadata_url = https://login.microsoftonline.com/<tenant>/v2.0/.well-known/openid-configuration,
  #        client_kwargs = {"scope": "openid email profile", "verify_signature": True}; mapping keys are app-role values.
  ```

  Redirect URI: `https://superset.<baseDomain>/oauth-authorized/<provider>`, with `keycloak` or
  `azure` as the provider name. Combining `server_metadata_url` with FAB's built-in `keycloak` and
  `azure` userinfo paths is **unverified** for the pinned FAB. Upstream's examples use explicit
  `authorize_url` and `access_token_url` instead.
- **Claims.** Keycloak needs `groups` in **userinfo**, so turn on the mapper's userinfo toggle.
  Entra needs `roles`, plus `upn` or `email` in the ID token.
- **Forwarding to Trino.** The login token is not reused. There are three options:
  1. Service account (today).
  2. **Impersonation.** Superset's Trino engine spec sets `user` to the Superset username when the
     database has "impersonate user" on. Trino must allow the Superset principal to impersonate
     users, through its impersonation access-control rules. On Entra the FAB username is the
     `oid`.
  3. **Per-user OAuth2 to Trino.** `supports_oauth2 = True` and `DATABASE_OAUTH2_CLIENTS["Trino"]`.
     Each user goes through a second consent, and Superset stores their token. This path is
     **unverified** end to end against Trino 480 OAUTH2.

### Airflow 3.2 (chart 1.21.0)

- **Mechanism.** The chart already sets
  `config.core.auth_manager: airflow.providers.fab.auth_manager.fab_auth_manager.FabAuthManager`.
  OAuth goes in `webserver_config.py` (`AUTH_TYPE = AUTH_OAUTH`, `OAUTH_PROVIDERS`,
  `AUTH_ROLES_MAPPING`, `AUTH_ROLES_SYNC_AT_LOGIN`, `AUTH_USER_REGISTRATION`). It cannot be set
  through `airflow.cfg` or `AIRFLOW__FAB__*`.
  - **Airflow 3 callback.** It has the `/auth` prefix.
  - **Entra tenant.** It must be a tenant GUID or domain. `common`, `organizations` and
    `consumers` are rejected, and B2C is not supported.
  - **Keycloak auth manager.** `apache-airflow-providers-keycloak`
    (`…keycloak_auth_manager.KeycloakAuthManager`) is "alpha/experimental" and Keycloak-only. Do
    not use it: it cannot serve `external` mode.
- **Values.**

  ```yaml
  apiServer:
    apiServerConfig: |      # rendered as webserver_config.py for the api-server
      from flask_appbuilder.const import AUTH_OAUTH
      AUTH_TYPE = AUTH_OAUTH
      AUTH_ROLES_SYNC_AT_LOGIN = True
      AUTH_USER_REGISTRATION = True
      AUTH_USER_REGISTRATION_ROLE = "Viewer"
      AUTH_ROLES_MAPPING = {"stardelt-admins": ["Admin"], "stardelt-users": ["User"]}
      OAUTH_PROVIDERS = [ ...same shape as Superset; Entra: "name": "azure" ... ]
  ```

  - **Redirect URI.** `https://airflow.<baseDomain>/auth/oauth-authorized/<provider>`.
  - **Authlib.** It is in the Airflow 3.2.0 constraints (`Authlib==1.6.9`). Whether it is installed
    in the official image that stardelt's Airflow image builds on is **unverified**.
  - **Shared secrets.** The fixed dev `jwtSecret` and `webserverSecretKey` in
    `helm-values/airflow.yaml` must be replaced before SSO means anything.
- **Claims.** The same as Superset. FAB 5.2 (Airflow) also has
  `AUTH_OAUTH_ROLE_KEYS = {"azure": "groups"}` to choose the claim.
- **Forwarding.** None. DAG tasks run with Airflow connections, so give them a dedicated
  client-credentials client per target (Lakekeeper, Trino). User identity ends at the Airflow UI.

### JupyterHub 5.5.3 (chart 4.4.3, OAuthenticator 17.4.0)

- **Mechanism.** OAuthenticator. Use `generic-oauth` for Keycloak or any OIDC provider; it has no
  discovery, so list all endpoints. Use `azuread` (`AzureAdOAuthenticator`, plus `tenant_id`) for
  Entra.
- **Values.**

  ```yaml
  hub:
    config:
      JupyterHub:
        authenticator_class: generic-oauth          # Entra: azuread
      GenericOAuthenticator:
        client_id: jupyterhub
        client_secret: <from Secret>
        oauth_callback_url: https://jupyter.<baseDomain>/hub/oauth_callback
        authorize_url: <issuer>/protocol/openid-connect/auth
        token_url: <issuer>/protocol/openid-connect/token
        userdata_url: <issuer>/protocol/openid-connect/userinfo
        scope: [openid, profile, email]
        username_claim: preferred_username
        manage_groups: true
        auth_state_groups_key: oauth_user.groups    # claim_groups_key is deprecated since 17.0
        allowed_groups: [stardelt-users, stardelt-admins]
        admin_groups: [stardelt-admins]
      Authenticator:
        enable_auth_state: true                      # chart auto-generates the CryptKeeper key
  ```

  For Entra, set `AzureAdOAuthenticator.username_claim` explicitly (`preferred_username`, or `oid`
  for stability), and use `auth_state_groups_key: oauth_user.roles` for app roles. The nested
  dotted-key form is **unverified** for 17.4.
- **Forwarding.** This is the one block besides Nova that can hand the user's token onwards.
  `enable_auth_state` stores the tokens, and `Spawner.auth_state_hook` (in `hub.extraConfig`)
  copies `access_token` into the notebook's environment for PyIceberg (`token=`) and the Trino
  client. Caveats:
  - `refresh_pre_spawn` and `auth_refresh_age` refresh only at the Hub. A long-running kernel
    holds an expiring token, and Keycloak's default access-token lifespan is short.
  - The token's `aud` must satisfy Trino and Lakekeeper, the same requirement as Nova.

### SeaweedFS 4.25 (chart 4.25.1)

- **S3 API.**
  - **Today.** Static identities via `s3.enableAuth` and `s3.existingConfigSecret`.
  - **Upstream OIDC.** Upstream has an advanced IAM file (`-s3.iam.config`: `sts`, `providers`
    with `type: oidc` and `roleMapping` on a claim such as `groups`, `policies`, `roles`) and
    `AssumeRoleWithWebIdentity`.
  - **Do not enable it on 4.25.** CVE-2026-77298 (fixed in **4.40**): the direct S3 bearer path
    accepts an OIDC JWT and maps it to a role without enforcing the role's trust policy. Whether
    the IAM/STS feature set is complete at 4.25 is **unverified**.
  - **Recommendation.** Keep S3 a machine-to-machine interface. Lakekeeper and Trino hold the keys,
    and users reach data through the catalog.
- **Admin UI (`weed admin`).** OSS supports only a local user and password
  (`admin.secret.adminUser` / `adminPassword`). Upstream states OIDC login on the admin UI "is part
  of SeaweedFS Enterprise", which is out under the permissive-only policy. Front it with
  **oauth2-proxy** (MIT, permissive) at `seaweedfs.<baseDomain>`, restricted to `adminGroup`:
  - **Keycloak:** `--provider=keycloak-oidc --allowed-group=stardelt-admins`.
  - **Entra:** `provider="entra-id"`, `allowed_groups=["<group object ID>"]`. Request `User.Read`
    so oauth2-proxy can resolve more than 200 groups via Graph.
  - **Redirect URI:** `https://seaweedfs.<baseDomain>/oauth2/callback`.
- **Filer UI.** It has no user authentication, only JWT signing for read and write. Do not expose
  it. If it must be reachable, put it behind the same oauth2-proxy.

## Keycloak (platform IdP)

The chart deploys the official image (`quay.io/keycloak/keycloak`, Apache-2.0) with realm
`stardelt` from `chart/files/keycloak-realm.json`. Issuer: `https://id.<baseDomain>/realms/stardelt`.

**Groups.**
- `stardelt-admins` exists today. Add `stardelt-users`, so `allowed_groups` and role mappings have
  a non-admin target.
- Group Membership mapper (`oidc-group-membership-mapper`): claim `groups`, `full.path: false`
  (emits `stardelt-admins`, not `/stardelt-admins`), and on for the ID token, access token,
  **userinfo** and introspection. Superset and Airflow read userinfo.
- Move the mapper into a shared client scope `stardelt-groups` rather than one copy per client.

**Audience.** Client scope `stardelt-audience` with Audience mappers for `trino` and `lakekeeper`
(add to access token). It is a default scope on `nova` and `jupyterhub`, the clients whose tokens
are forwarded. Lakekeeper's own guidance uses a `lakekeeper` scope for the same purpose; machine
clients request it as an optional scope.

**Clients.**

| Client | Type | Flows | Redirect URI | Scopes |
|---|---|---|---|---|
| `nova` | confidential | code + PKCE S256 | `https://<baseDomain>/api/auth/callback` | groups, audience |
| `trino` | confidential (see note) | code | `https://trino.<baseDomain>/oauth2/callback` | groups |
| `lakekeeper` | **public** | code + PKCE, device grant | `https://lakekeeper.<baseDomain>/ui/callback` | groups, `lakekeeper` |
| `superset` | confidential | code | `https://superset.<baseDomain>/oauth-authorized/keycloak` | groups |
| `airflow` | confidential | code | `https://airflow.<baseDomain>/auth/oauth-authorized/keycloak` | groups |
| `jupyterhub` | confidential | code | `https://jupyter.<baseDomain>/hub/oauth_callback` | groups, audience |
| `oauth2-proxy` | confidential | code | `https://seaweedfs.<baseDomain>/oauth2/callback` | groups |
| `trino-catalog` | confidential | client credentials | none | `lakekeeper` |
| `lakekeeper-opa` | confidential | client credentials | none | `lakekeeper` |
| `airflow-tasks` | confidential | client credentials | none | `lakekeeper`, audience |

- **Trino client type.** The Identity page and the `main` realm register `trino` as public, which
  is enough as a bearer audience. The Trino Web UI login also takes
  `http-server.authentication.oauth2.client-secret`. Whether Trino 480 starts without a secret is
  **unverified**, so register it as confidential when the Web UI login is enabled.
- **Token lifespan.** Keycloak's default access-token lifespan is short. Lakekeeper recommends
  12 hours for interactive catalog use. Choose a realm value deliberately, because notebooks
  carry it.
- **Token exchange.** Keycloak's Standard Token Exchange can mint a token for a different audience
  instead of putting every audience in one token. Lakekeeper's machine-client guidance enables
  it. stardelt does not depend on it yet.

## Entra ID (external IdP)

**Registrations.**

1. **`stardelt`**: one app registration, single tenant. It is both the client and the API, which
   keeps every block on one audience.
   - **Web platform redirect URIs:**
     - `https://<baseDomain>/api/auth/callback`
     - `https://trino.<baseDomain>/oauth2/callback`
     - `https://superset.<baseDomain>/oauth-authorized/azure`
     - `https://airflow.<baseDomain>/auth/oauth-authorized/azure`
     - `https://jupyter.<baseDomain>/hub/oauth_callback`
     - `https://seaweedfs.<baseDomain>/oauth2/callback`
   - **SPA platform redirect URI:** `https://lakekeeper.<baseDomain>/ui/callback`. Lakekeeper's UI
     is a public browser client. The upstream guide uses a separate SPA registration; either
     works.
   - **Expose an API.** Application ID URI `api://<client-id>`, with a scope such as `access`.
     Blocks that forward tokens (Nova, JupyterHub, Lakekeeper UI, Trino Web UI) request
     `api://<client-id>/access` next to `openid profile email`. A token requested only for
     `openid profile` is a Microsoft Graph token: Trino and Lakekeeper cannot validate its
     audience.
   - **Manifest.** Set `accessTokenAcceptedVersion: 2`. In the Microsoft Graph manifest format
     the field is `api.requestedAccessTokenVersion`; that field name is unverified. Without it,
     access tokens are v1 with `iss = https://sts.windows.net/<tenant>/`, which does not match
     the v2 issuer `https://login.microsoftonline.com/<tenant>/v2.0`. The fallback is
     Lakekeeper's `additionalIssuers` and Trino's `access-token-issuer`, but fix the manifest
     instead.
   - **App roles.** `stardelt.admin`, `stardelt.user` and any data roles, allowed for users and
     groups. Assign them under *Enterprise applications → Users and groups*. Assigning groups
     rather than individual users needs Entra ID P1 or higher (**unverified** for your tenant's
     licensing).
2. **Service principals** for client credentials, one each for Trino's catalog, the OPA bridge
   and Airflow tasks. Each is an app registration with an application permission (app role) on
   `stardelt`. Scope `api://<client-id>/.default`, token endpoint
   `https://login.microsoftonline.com/<tenant>/oauth2/v2.0/token`.

**`roles` vs `groups`.**
- **Recommendation.** Set `identity.groupClaim: roles` and `identity.adminGroup: stardelt.admin`.
- **Why roles.** App-role values are readable strings, scoped to the app, and have no overage.
- **Groups in tokens.** The `groups` claim carries **object-ID GUIDs**. Past **200 groups (JWT)**
  or 150 (SAML), Entra omits the claim and emits an overage pointer (`_claim_names` /
  `_claim_sources`). Of these blocks, only oauth2-proxy follows it, through Graph.
- **If you must use groups.** Set `groupMembershipClaims` to `ApplicationGroup` (groups assigned
  to the app) to stay under the limit, and map by GUID.

**Claims per block.**

| Block | User key | Display / username | Group claim | Optional claims to add |
|---|---|---|---|---|
| Nova | `oid` | `preferred_username`, `email` | `roles` | `email` (ID token) |
| Trino | `principal-field` (`preferred_username`, or `oid` for OPA matching) | the same | none | none (`preferred_username` needs `profile`) |
| Lakekeeper | `oid` (default order) | `name`, `preferred_username` | none (OpenFGA) | none |
| Superset / Airflow (FAB `azure`) | `oid` (FAB username) | `upn`, else `email` (**required**, error if absent) | `roles` | `upn` and/or `email` in the ID token |
| JupyterHub (`azuread`) | `username_claim`, set explicitly | the same | `oauth_user.roles` | `email` if used |
| oauth2-proxy | `email` by default | `email` | group IDs (Graph past 200) | `email` |

- **`preferred_username`.** It is in v2 tokens with the `profile` scope. Microsoft marks it
  mutable: "don't use it to make authorization decisions". `upn` is a v1 basic claim; request it
  as an optional claim for v2.
- **Credentials.** Use a client secret everywhere. All of Trino, FAB, OAuthenticator and
  oauth2-proxy take one. Certificate or `private_key_jwt` client authentication is not supported
  across these blocks (**unverified** per block), so treat secrets as the baseline, store them in
  Secrets, and rotate before expiry.
- **Token lifetime.** Lakekeeper's guide recommends a token-lifetime policy longer than the
  roughly one-hour default for interactive catalog use.

## One IdP, several platform instances

An organization often runs the platform more than once (staging, test, production) and has **one** IdP, for example a single Entra tenant. This is the `external` mode used several times, not a new object (decision D20):

- **Same issuer, one app registration per instance.** Every instance uses the tenant's issuer (`https://login.microsoftonline.com/<tenant>/v2.0`) but its own registration (`stardelt-staging`, `stardelt-prod`) with its own redirect URIs and its own client secrets, referenced from that instance's `spec.identity`.
- **Audience separates the stages.** Tokens carry the registration's client id as `aud`; each instance validates its own audience, so a staging token is refused by production.
- **Map roles or groups per stage.** Define app roles (`stardelt-admins`, `stardelt-users`) on each registration and assign them to stage-specific Entra groups; use the `roles` claim (`groupClaim: roles`), which also avoids the group-overage problem described above. The admin group value and the claim name are per-instance settings.
- **Keycloak (platform mode) is not shared this way.** One Keycloak per instance suits organizations without an IdP; with an IdP, point every instance at it.

## Forwarding at a glance

```text
browser ──▶ Nova ──Bearer(user)──▶ Trino ──client-credentials(trino-catalog)──▶ Lakekeeper ──signed/vended──▶ SeaweedFS
              │                      └── access-control=opa ──▶ OPA + Lakekeeper OPA bridge (per-user check)
              └────Bearer(user)─────────────────────────────────▶ Lakekeeper
JupyterHub ──auth_state──▶ kernel ──Bearer(user)──▶ Trino / Lakekeeper     (until the token expires)
Superset ──service account (+ impersonation: user=<FAB username>)──▶ Trino
Airflow tasks ──client-credentials(airflow-tasks)──▶ Lakekeeper / Trino
```

## Sources

Read for the pinned versions, from the Helm charts (`helm show values` at the pinned versions)
plus:

- **Trino 480:** OAuth 2.0, JWT, TLS, internal communication, group mapping and Iceberg REST
  catalog pages (trino.io/docs/480).
- **Lakekeeper 0.12.x:** authentication, configuration and OPA docs (docs.lakekeeper.io).
- **Flask-AppBuilder:** security docs, and `security/manager.py` source at v4.5.4 (closest tag to
  4.5.5).
- **Superset 5.0.0:** `config.py`, `db_engine_specs/trino.py` and `requirements/base.txt`.
- **Airflow:** FAB provider SSO docs, Keycloak auth-manager docs, constraints-3.2.0.
- **JupyterHub:** z2jh authentication docs, OAuthenticator API reference, and z2jh 4.4.3 hub
  `requirements.txt`.
- **SeaweedFS:** wiki *OIDC Integration* and *Admin UI OIDC* pages, and CVE-2026-77298 (OSV,
  GHSA-757h-cm9x-wprg).
- **oauth2-proxy:** Entra ID and Keycloak OIDC provider docs.
- **Microsoft identity platform:** access-token claims reference.
