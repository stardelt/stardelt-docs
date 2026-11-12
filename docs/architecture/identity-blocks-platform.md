---
title: "Identity: Airflow, JupyterHub, SeaweedFS"
sidebar_label: "Airflow, JupyterHub, SeaweedFS"
slug: /architecture/identity-blocks-platform
---

# Identity: Airflow, JupyterHub, SeaweedFS

The three blocks that are not in the request path of a Trino query. The pinned versions and the
mode decision are on [Identity integrations](./identity-integrations); Nova, Trino, Lakekeeper and
Superset are on [Nova, Trino, Lakekeeper, Superset](./identity-blocks-core).

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

