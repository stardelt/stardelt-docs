---
title: "Identity: Nova, Trino, Lakekeeper, Superset"
sidebar_label: "Nova, Trino, Lakekeeper, Superset"
slug: /architecture/identity-blocks-core
---

# Identity: Nova, Trino, Lakekeeper, Superset

The four blocks most people touch first. The pinned versions and the mode decision are on
[Identity integrations](./identity-integrations); the other blocks are on
[Airflow, JupyterHub and SeaweedFS](./identity-blocks-platform).

### Nova (stardelt, Rust axum)

- **Mechanism.** Built by stardelt to the contract on the Identity page: authorization code + PKCE
  against `issuerUrl` discovery, a server-side session cookie, and `Authorization: Bearer` on
  `/api/*`. `NOVA_FORWARD_IDENTITY` sends the caller's token on to Trino.
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
     **unverified** end to end against Trino 484 OAUTH2.

