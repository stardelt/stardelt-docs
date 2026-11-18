---
title: "Sign-in"
sidebar_label: "Sign-in"
slug: /operations/sign-in
description: "Keycloak, or your own OIDC provider: the two modes, the clients to register, and what each building block supports."
---

# Sign-in

stardelt supports two identity modes: `platform`, where stardelt deploys Keycloak, and `external`,
the customer's OIDC provider, chiefly Microsoft Entra ID. In both, every building
block authenticates users against one OIDC issuer. The per-block mechanics are on the three
pages under [Where the mechanics are](#where-the-mechanics-are); the Nova-side contract is the
[Identity](../architecture/identity) page, authoritative when the two disagree.

## Two modes, one knob

The umbrella chart (`platform/chart/values.yaml`) already carries this block. The
`PlatformInstance` CRD will carry the same five fields with the same meanings:

```yaml
identity:
  mode: platform          # platform | external   (none = dev/CI only, see below)
  issuerUrl: ""           # external: required, https only
                          # platform: derived, https://id.<baseDomain>/realms/stardelt
  tokenEndpoint: ""       # external: required, the token_endpoint of <issuerUrl>/.well-known/openid-configuration
                          # platform: derived, https://id.<baseDomain>/realms/stardelt/protocol/openid-connect/token
  groupClaim: groups      # Keycloak: groups   | Entra ID: roles (app roles, recommended)
  adminGroup: stardelt-admins   # Keycloak group name | Entra app-role value, e.g. stardelt.admin
```

- `none` is not a third identity mode. It is the dev and CI path (`make demo`), with no
  IdP and components on their dev auth, as the Identity page requires.
- The chart publishes ConfigMap `stardelt-identity` (`issuerUrl`, `tokenEndpoint`, `groupClaim`, `adminGroup`),
  from which every block's values are derived. Client IDs and secrets live in Secrets
  (`stardelt-oidc-clients` in platform mode, customer-provided in external mode), never in this
  block.
- `tokenEndpoint` is configuration, not discovery. Neither Helm nor the operator can fetch an
  external discovery document (Helm has no HTTP; the operator's only transport is the
  API-server proxy, which cannot leave the cluster), so an `external` install names the
  `token_endpoint` once and the chart publishes it. `platform` derives it from its Keycloak
  and refuses the value.
- The user-ID claim is derived, not configured. Use `oid` on Entra, whose `sub` is
  pairwise per application: the same user gets a different `sub` in Nova than in Trino. Use
  `sub` everywhere else. Lakekeeper already prefers `oid` and falls back to `sub`.

How the knob lands in each block:

| Knob | Nova | Trino | Lakekeeper | Superset / Airflow (FAB) | JupyterHub |
|---|---|---|---|---|---|
| `issuerUrl` | `NOVA_OIDC_ISSUER` | `…oauth2.issuer` | `auth.oauth2.providerUri` | `server_metadata_url` / provider URLs | `authorize_url`, `token_url`, `userdata_url` (no discovery) |
| `tokenEndpoint` | `NOVA_CATALOG_TOKEN_URL` | `CATALOG_TOKEN_URL` | discovers its own endpoints (not this value) | `PIPELINE_TOKEN_URL` (Airflow) / FAB's own discovery (Superset) | not used |
| `groupClaim` | `NOVA_OIDC_GROUP_CLAIM` | not consumable (see Trino) | `LAKEKEEPER__OPENID_ROLES_CLAIM` (Cedar only) | built-in providers read it themselves (`groups` for keycloak, `roles` for azure) | `auth_state_groups_key: oauth_user.<claim>` |
| `adminGroup` | `NOVA_OIDC_ADMIN_GROUP` | access-control rules | Lakekeeper role assignment | `AUTH_ROLES_MAPPING = {adminGroup: ["Admin"]}` | `admin_groups: [adminGroup]` |

## Keycloak (platform mode)

The chart deploys the official image (`quay.io/keycloak/keycloak`, Apache-2.0), realm
`stardelt` (`chart/files/keycloak-realm.json`). Issuer: `https://id.<baseDomain>/realms/stardelt`.

### Groups

- `stardelt-admins` exists. Add `stardelt-users`, so `allowed_groups` and role mappings have
  a non-admin target.
- Group Membership mapper (`oidc-group-membership-mapper`): claim `groups`, `full.path: false`
  (emits `stardelt-admins`, not `/stardelt-admins`), on for the ID token, access token, **userinfo**
  and introspection. Superset and Airflow read userinfo.
- Put the mapper in a shared client scope `stardelt-groups`, not one per client.

### Audience

Client scope `stardelt-audience` with Audience mappers for `trino` and `lakekeeper` (add to access
token), default on `nova` and `jupyterhub`. Lakekeeper's own guidance uses a `lakekeeper` scope for
this; machine clients request it as optional.

### Clients

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

- **Trino client type.** The Identity page and the `main` realm register `trino` as public, enough as a
  bearer audience. The Trino Web UI login also takes
  `http-server.authentication.oauth2.client-secret`. Whether Trino 484 starts without a secret is
  **unverified**, so register it confidential when the Web UI login is enabled.
- **Token lifespan.** Keycloak's default is short, and Lakekeeper recommends
  12 hours for interactive catalog use. Choose a realm value deliberately: notebooks carry it.
- **Token exchange.** Keycloak's Standard Token Exchange can mint a token for a different audience
  instead of every audience in one token. Lakekeeper's machine-client guidance enables it;
  stardelt does not depend on it yet.

## Entra ID (external IdP)

### Registrations

1. **`stardelt`**: one app registration, single tenant, both client and API, so every
   block shares one audience.
   - **Web platform redirect URIs:**
     - `https://<baseDomain>/api/auth/callback`
     - `https://trino.<baseDomain>/oauth2/callback`
     - `https://superset.<baseDomain>/oauth-authorized/azure`
     - `https://airflow.<baseDomain>/auth/oauth-authorized/azure`
     - `https://jupyter.<baseDomain>/hub/oauth_callback`
     - `https://seaweedfs.<baseDomain>/oauth2/callback`
   - **SPA platform redirect URI:** `https://lakekeeper.<baseDomain>/ui/callback`. Lakekeeper's UI
     is a public browser client; upstream uses a separate SPA registration, and either works.
   - **Expose an API.** Application ID URI `api://<client-id>`, with a scope such as `access`.
     Blocks that forward tokens request `api://<client-id>/access` next to
     `openid profile email`. A token requested only for `openid profile` is a Microsoft Graph
     token: Trino and Lakekeeper cannot validate its audience.
   - **Manifest.** Set `accessTokenAcceptedVersion: 2`. In the Microsoft Graph manifest format
     the field is `api.requestedAccessTokenVersion`; that field name is unverified. Without it,
     access tokens are v1 with `iss = https://sts.windows.net/<tenant>/`, which does not match
     the v2 issuer `https://login.microsoftonline.com/<tenant>/v2.0`. The fallback is
     Lakekeeper's `additionalIssuers` and Trino's `access-token-issuer`, but fix the manifest
     instead.
   - **App roles.** `stardelt.admin`, `stardelt.user` and any data roles, allowed for users and
     groups. Assign them under *Enterprise applications → Users and groups*. Assigning groups
     rather than users needs Entra ID P1 or higher (**unverified** for your tenant's
     licensing).
2. **Service principals** for client credentials, one each for Trino's catalog, the OPA bridge
   and Airflow tasks. Each is an app registration with an application permission (app role) on
   `stardelt`. Scope `api://<client-id>/.default`, token endpoint
   `https://login.microsoftonline.com/<tenant>/oauth2/v2.0/token`.

### `roles` vs `groups`

- **Recommendation.** Set `identity.groupClaim: roles` and `identity.adminGroup: stardelt.admin`.
- **Why roles.** App-role values are readable strings, scoped to the app, and have no overage.
- **Groups in tokens.** The `groups` claim carries **object-ID GUIDs**. Past **200 groups (JWT)**
  or 150 (SAML), Entra omits the claim and emits an overage pointer (`_claim_names` /
  `_claim_sources`). Of these blocks, only oauth2-proxy follows it, through Graph.
- **If you must use groups.** Set `groupMembershipClaims` to `ApplicationGroup` (groups assigned
  to the app) to stay under the limit, and map by GUID.

### Claims per block

| Block | User key | Display / username | Group claim | Optional claims to add |
|---|---|---|---|---|
| Nova | `oid` | `preferred_username`, `email` | `roles` | `email` (ID token) |
| Trino | `principal-field` (`preferred_username`, or `oid` for OPA matching) | the same | none | none (`preferred_username` needs `profile`) |
| Lakekeeper | `oid` (default order) | `name`, `preferred_username` | none (OpenFGA) | none |
| Superset / Airflow (FAB `azure`) | `oid` (FAB username) | `upn`, else `email` (**required**, error if absent) | `roles` | `upn` and/or `email` in the ID token |
| JupyterHub (`azuread`) | `username_claim`, set explicitly | the same | `oauth_user.roles` | `email` if used |
| oauth2-proxy | `email` by default | `email` | group IDs | `email` |

- **`preferred_username`.** It is in v2 tokens with the `profile` scope. Microsoft marks it
  mutable: "don't use it to make authorization decisions". `upn` is a v1 basic claim; request it
  as optional for v2.
- **Credentials.** Use a client secret everywhere: Trino, FAB, OAuthenticator and oauth2-proxy
  all take one. Certificate or `private_key_jwt` client authentication is not supported
  across these blocks (**unverified** per block), so treat secrets as the baseline, store them in
  Secrets and rotate before expiry.
- **Token lifetime.** Lakekeeper's guide recommends a token-lifetime policy longer than the
  roughly one-hour default for interactive catalog use.

## One IdP, several platform instances

An organization often runs the platform more than once (staging, test, production) and has **one** IdP, for example a single Entra tenant. This is the `external` mode used several times, not a new object:

- **Same issuer, one app registration per instance.** Every instance uses the tenant's issuer (`https://login.microsoftonline.com/<tenant>/v2.0`) but its own registration (`stardelt-staging`, `stardelt-prod`) with its own redirect URIs and its own client secrets, referenced from that instance's `spec.identity`.
- **Audience separates the stages.** Tokens carry the registration's client id as `aud`; each instance validates its own audience, so a staging token is refused by production.
- **Map roles or groups per stage.** Define app roles (`stardelt-admins`, `stardelt-users`) on each registration and assign them to stage-specific Entra groups; use the `roles` claim (`groupClaim: roles`), which also avoids the group-overage problem described above. The admin group value and the claim name are per-instance settings.
- **Keycloak (platform mode) is not shared this way.** One Keycloak per instance suits organizations without an IdP; with an IdP, point every instance at it.

## What each block supports

Pinned versions (`platform/Makefile`): Trino chart 1.45.0 (Trino 484), Lakekeeper chart
0.14.0 (Lakekeeper 0.15.0), Superset chart 0.15.5 (Superset 5.0.0, Flask-AppBuilder 4.5.5),
Airflow chart 1.22.0 (Airflow 3.2.2, FAB provider 3.6.4), JupyterHub chart 4.4.5 (JupyterHub 5.5.5,
OAuthenticator 17.4.0), SeaweedFS chart 4.25.1 (SeaweedFS 4.25).

Anything marked **unverified** is not confirmed for the pinned version by upstream docs or
source. Test it before you depend on it.

### Summary matrix

| Block | Native OIDC | Via proxy | Not possible in OSS | Groups / roles from token | User token to next hop | Effort |
|---|---|---|---|---|---|---|
| **Nova** | ✅ (stardelt-built: auth code + PKCE, bearer) | n/a | n/a | yes (`identity.groupClaim`) | ✅ Bearer to Trino and Lakekeeper | M |
| **Trino** | ✅ `OAUTH2` (Web UI and bearer JWT) | n/a | groups from claims | ❌ file/LDAP providers only | ❌ to Lakekeeper: service principal (user forwarding unverified) | M |
| **Lakekeeper** | ✅ native OIDC (API and UI) | n/a | n/a | roles claim read only by Cedar; OpenFGA ignores token roles | n/a (end of chain; signs or vends S3 access) | S, or M with OpenFGA |
| **Superset** | ✅ FAB `AUTH_OAUTH` | n/a | n/a | ✅ `AUTH_ROLES_MAPPING` | ⚠️ service account + impersonation, or a second per-user OAuth2 consent for Trino | S |
| **Airflow 3** | ✅ FAB auth manager `AUTH_OAUTH` | n/a | n/a | ✅ `AUTH_ROLES_MAPPING` | ❌ tasks use connections (service accounts) | S–M |
| **JupyterHub** | ✅ OAuthenticator (Generic / AzureAd) | n/a | n/a | ✅ `manage_groups` | ✅ via `auth_state` into the pod (refresh is your problem) | S–M |
| **SeaweedFS S3** | ⚠️ OIDC/STS exists upstream; needs ≥ 4.40 (CVE-2026-77298) | n/a | user SSO at 4.25 (do not enable) | role mapping in IAM JSON (upstream) | n/a | stay on static keys |
| **SeaweedFS admin UI** | ❌ OIDC is SeaweedFS **Enterprise** only | ✅ oauth2-proxy | yes, in OSS | via oauth2-proxy `allowed_groups` | n/a | S |
| **SeaweedFS filer UI** | ❌ | ✅ oauth2-proxy, or do not expose | yes | via oauth2-proxy | n/a | S |

Effort: **S** is values only. **M** adds an image change, a bootstrap step or extra components.

What "one identity enforced at the catalog" actually looks like on these versions. Trino
authenticates the user, then talks to Lakekeeper as one trusted service principal. Per-user table
policy reaches Trino through Trino's OPA access control plus Lakekeeper's **OPA bridge**, which
answers Trino's checks from Lakekeeper's permission model. That needs a real authorization backend
in Lakekeeper (OpenFGA), not `allowall`, which the chart's default uses. Direct callers (Nova,
notebooks, PyIceberg) present the user's own token to Lakekeeper.

## Where the mechanics are

- [Nova, Trino, Lakekeeper and Superset](../architecture/identity-blocks-core)
- [Airflow, JupyterHub and SeaweedFS](../architecture/identity-blocks-platform)
- [Keycloak, Entra ID and several instances on one IdP](#one-idp-several-platform-instances)

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

From the Helm charts (`helm show values`) plus:

- **Trino 484:** OAuth 2.0, JWT, TLS, internal communication, group mapping and Iceberg REST
  catalog pages (trino.io/docs/484).
- **Lakekeeper 0.15.x:** authentication, configuration and OPA docs (docs.lakekeeper.io).
- **Flask-AppBuilder:** security docs, and `security/manager.py` source at v4.5.4 (closest tag to
  4.5.5).
- **Superset 5.0.0:** `config.py`, `db_engine_specs/trino.py` and `requirements/base.txt`.
- **Airflow:** FAB provider SSO docs, Keycloak auth-manager docs, constraints-3.2.2.
- **JupyterHub:** z2jh authentication docs, OAuthenticator API reference, and z2jh 4.4.5 hub
  `requirements.txt`.
- **SeaweedFS:** wiki *OIDC Integration* and *Admin UI OIDC* pages, and CVE-2026-77298 (OSV,
  GHSA-757h-cm9x-wprg).
- **oauth2-proxy:** Entra ID and Keycloak OIDC provider docs.
- **Microsoft identity platform:** access-token claims reference.
