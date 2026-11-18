---
title: "Identity"
description: "One identity from the login page to the table: the contract, Nova's settings, and how each building block authenticates."
sidebar_label: "Identity"
slug: /architecture/identity
---

# Identity and access

**One identity, from the login page to the table.** The token that signs you in to Nova is the token
your query carries to the SQL engine.

## The shape

```text
   browser ──login──▶ Nova ──OIDC authorization code + PKCE──▶ identity provider
                       │                                        (Keycloak or your own)
                       │  session cookie (HttpOnly, Secure)
                       ▼
                  Nova backend ──your access token──▶ Trino ──▶ permission check
                                                        │
                                                        ▼
                                                   Lakekeeper (as a service)
```

Nova holds no passwords and no user store. Keycloak ships as the default. Any standards-compliant OIDC
provider, such as Entra ID, Okta or your own Keycloak, can take its place.

Trino authenticates you and asks the permission store whether you may do what you asked. Trino then
talks to the catalog as a trusted service, not as you. [Sign-in](../operations/sign-in)
explains each hop.

## Choose a mode

| `identity.mode` | What happens |
|---|---|
| `none` (chart default) | No sign-in. Everyone is treated the same. For trying things out behind a port-forward |
| `platform` | stardelt deploys Keycloak at `id.<baseDomain>` with the `stardelt` realm and its clients |
| `external` | You bring the OIDC provider and register the clients yourself |

Switching a running install to sign-in is a values change and a rollout, with no data migration.

## Bring your own OIDC provider

stardelt signs people in with OpenID Connect. Any provider that meets the requirements below can be used; Keycloak is the one stardelt can deploy and configure for you.

**Requirements**

| Requirement | Why stardelt needs it |
|---|---|
| Discovery at `<issuer>/.well-known/openid-configuration` | every component finds the endpoints from the issuer |
| Authorization code flow with PKCE | browser sign-in to Nova, Superset, Airflow and JupyterHub |
| Device authorization flow | `stardelt login` on the command line |
| Client credentials flow | service principals that run pipelines |
| A groups claim in the access token (name set with `NOVA_OIDC_GROUP_CLAIM`, default `groups`) | permissions by group |
| An audience that Nova and Trino accept | one token reaches Nova, Trino and the catalog |

**Name the token endpoint.** The chart and the operator cannot fetch an external discovery document,
so `identity.tokenEndpoint` carries the provider's `token_endpoint`
(`<issuer>/.well-known/openid-configuration` → `token_endpoint`). `external` refuses to render or
reconcile without it; `platform` derives it from the Keycloak it deploys. The requirements table
above still applies — this value is the one endpoint stardelt cannot discover itself.

**Tested providers**

| Provider | Mode | Status |
|---|---|---|
| Keycloak | `identity.mode: platform` | tested in CI and on the dev cluster |

Other providers are expected to work when they meet the requirements; testing them is tracked in stardelt/stardelt#61.

**What does not follow the token.** Nova, Superset and Airflow map a person's `groups` claim to
roles at every sign-in, so they work with any provider. The rest of the permission model does not:
Trino's group file, the catalog's role memberships and the OPA table are written by the `access-sync`
job from the list of groups and their members in a Keycloak realm. A provider that is not the
Keycloak stardelt deploys has no such list — the standard interface for one, SCIM 2.0, is not
implemented yet (`stardelt/stardelt#39`) — so `identity.mode: external` gives you sign-in
and role mapping, not group-derived table permissions. Use `identity.mode: platform` where table
permissions by group are needed; bringing another provider to parity is tracked in
`stardelt/stardelt#61`.

## Names

| Thing | Value | Notes |
|---|---|---|
| Realm | `stardelt` | users, groups and clients; one per platform |
| Issuer URL | `https://id.<baseDomain>/realms/stardelt` | what every component validates against |
| Nova client | `nova`, confidential | authorization code with PKCE, redirect `https://<nova-host>/api/auth/callback` |
| Trino client | `trino`, public | bearer tokens for queries |
| Admin | a member of `stardelt-admins` | group membership is the role |

## Nova's settings

| Variable | Meaning |
|---|---|
| `NOVA_AUTH_MODE` | `dev` (no login, the default) or `oidc` |
| `NOVA_OIDC_ISSUER` | Issuer URL; discovery is `/.well-known/openid-configuration` |
| `NOVA_OIDC_CLIENT_ID`, `NOVA_OIDC_CLIENT_SECRET` | Registered client credentials |
| `NOVA_OIDC_SCOPES` | Default `openid profile email` |
| `NOVA_SESSION_SECRET` | Signs the session cookie; generated per install |
| `NOVA_OIDC_GROUP_CLAIM` | Claim that carries groups, default `groups` |
| `NOVA_OIDC_ADMIN_GROUP` | Group that maps to Nova admin, default `stardelt-admins` |
| `NOVA_FORWARD_IDENTITY` | Sends the caller's token to Trino, so queries run as that person |

## How you sign in

- **Browser.** Nova sends you to the identity provider, exchanges the returned code for tokens, verifies
  them, and sets a session cookie. The cookie holds a reference, and tokens stay on the server.
- **Scripts and tools.** Send `Authorization: Bearer <access token>` on any `/api/*` route. `stardelt
  login` gets a token with the device code flow. See
  [Python](../guides/python).
- **Check yourself.** `GET /api/me` returns your claims and whether your identity is forwarded
  (`identity_forwarding`).

## Claims Nova reads

| Claim | Used for |
|---|---|
| `sub` | The stable user identifier |
| `preferred_username`, `email` | Display |
| `groups` (configurable) | Administrator or not, and which groups you belong to |
| `exp`, `aud`, `iss` | Validation only |

## Nova, Trino, Lakekeeper and Superset

### Nova (stardelt, Rust axum)

- **Mechanism.** Built by stardelt to the contract on the Identity page: authorization code + PKCE
  against `issuerUrl` discovery, a server-side session cookie, and `Authorization: Bearer` on
  `/api/*`. `NOVA_FORWARD_IDENTITY` sends the caller's token on to Trino.
- **Values.** See [Nova's settings](#novas-settings). Redirect URI: `https://<baseDomain>/api/auth/callback`.
- **Claims.** See [Claims Nova reads](#claims-nova-reads).
- **Forwarding.** Nova is where forwarding works best. Its access token must carry an audience
  that Trino and Lakekeeper accept:
  - **Keycloak:** an Audience mapper adds `trino` and `lakekeeper` to `aud`.
  - **Entra:** a token has exactly one resource audience, so Nova requests a scope on the
    stardelt API app (see the Entra section). Trino and Lakekeeper both trust that one audience.

### Trino 484 (chart 1.45.0)

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
  - **Web UI.** Trino 483 and later serve the redesigned UI at `/ui`. The previous UI is at
    `/ui/legacy` and is off unless `web-ui.legacy.enabled=true` is set (a coordinator-only
    property); both UIs use the same OAuth2 sign-in.
- **Claims.**
  - **Principal.** `principal-field` picks one claim (default `sub`). `preferred_username` gives
    readable user names in query history and rules. On Entra it is mutable, so do not base
    authorization on it there. Use `oid` with `user-mapping` if the OPA bridge has to match
    Lakekeeper user IDs. **Unverified:** which form the bridge expects. Its docs only say
    "typically OIDC subject identifiers".
  - **Groups.** Trino 484 documents no way to take groups from a token claim. Group providers are
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

### Lakekeeper 0.15.0 (chart 0.14.0)

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
    backend: openfga                           # allowall = no enforcement
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
    it, so add it to `platform/images/superset/Dockerfile`.
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
     **unverified** end to end against Trino 484 OAUTH2.

## Airflow, JupyterHub and SeaweedFS

### Airflow 3.2.2 (chart 1.22.0)

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
  - **Authlib.** It is in the Airflow 3.2.2 constraints (`Authlib==1.7.2`). Whether it is installed
    in the official image that stardelt's Airflow image builds on is **unverified**.
  - **Shared secrets.** The fixed dev `jwtSecret` and `webserverSecretKey` in
    `helm-values/airflow.yaml` must be replaced before SSO means anything.
- **Claims.** The same as Superset. FAB 5.2 (Airflow) also has
  `AUTH_OAUTH_ROLE_KEYS = {"azure": "groups"}` to choose the claim.
- **Forwarding.** None. DAG tasks run with Airflow connections, so give them a dedicated
  client-credentials client per target (Lakekeeper, Trino). User identity ends at the Airflow UI.

### JupyterHub 5.5.5 (chart 4.4.5, OAuthenticator 17.4.0)

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

## Rules

- Tokens never appear in a URL, a log line or an error message.
- The session cookie is `HttpOnly`, `SameSite=Lax`, and `Secure` on HTTPS.
- Logging out ends the session in Nova and at the identity provider.
- Group membership is the role. There are no per-user special cases.
- A failed identity provider is a failed login. Nova never falls back to `dev` at runtime.
