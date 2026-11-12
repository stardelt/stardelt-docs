---
title: "Identity providers"
sidebar_label: "Identity providers"
slug: /architecture/identity-providers
---

# Identity providers

Keycloak when stardelt deploys the IdP, Entra ID (or any OIDC provider) when the customer brings
one, and what changes when several platform instances share an IdP. The per-block mechanics are on
[Identity integrations](./identity-integrations).

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
  `http-server.authentication.oauth2.client-secret`. Whether Trino 484 starts without a secret is
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

An organization often runs the platform more than once (staging, test, production) and has **one** IdP, for example a single Entra tenant. This is the `external` mode used several times, not a new object:

- **Same issuer, one app registration per instance.** Every instance uses the tenant's issuer (`https://login.microsoftonline.com/<tenant>/v2.0`) but its own registration (`stardelt-staging`, `stardelt-prod`) with its own redirect URIs and its own client secrets, referenced from that instance's `spec.identity`.
- **Audience separates the stages.** Tokens carry the registration's client id as `aud`; each instance validates its own audience, so a staging token is refused by production.
- **Map roles or groups per stage.** Define app roles (`stardelt-admins`, `stardelt-users`) on each registration and assign them to stage-specific Entra groups; use the `roles` claim (`groupClaim: roles`), which also avoids the group-overage problem described above. The admin group value and the claim name are per-instance settings.
- **Keycloak (platform mode) is not shared this way.** One Keycloak per instance suits organizations without an IdP; with an IdP, point every instance at it.

