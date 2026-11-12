---
title: "Identity integrations"
sidebar_label: "Identity integrations"
slug: /architecture/identity-integrations
---

# Identity integrations, block by block

stardelt supports **two identity modes**, and in both, every building block authenticates users
against the same OIDC issuer:

- **`platform`**: stardelt deploys Keycloak (Apache-2.0), realm `stardelt`, at `id.<baseDomain>`.
  This is the default identity provider.
- **`external`**: the customer's IdP. **Microsoft Entra ID** is the primary target. Any
  standards-compliant OIDC provider (Okta, Auth0, a corporate Keycloak) uses the same knobs.

These pages cover the per-block mechanics: what each upstream project supports at the versions
stardelt pins, the Helm value paths, the claims each block needs, and where the user's token
can and cannot travel. The Nova-side contract (env vars, flows, rules) is on the *Identity* page
in this section. When the two pages disagree, the *Identity* page is authoritative for the contract.

Pinned versions (`stardelt-platform/Makefile`): Trino chart 1.45.0 (Trino 484), Lakekeeper chart
0.14.0 (Lakekeeper 0.15.0), Superset chart 0.15.5 (Superset 5.0.0, Flask-AppBuilder 4.5.5),
Airflow chart 1.22.0 (Airflow 3.2.2, FAB provider 3.6.4), JupyterHub chart 4.4.5 (JupyterHub 5.5.5,
OAuthenticator 17.4.0), SeaweedFS chart 4.25.1 (SeaweedFS 4.25).

Anything marked **unverified** is not confirmed by upstream docs or source for the pinned
version. Test it before you depend on it.

## Summary matrix

| Block | Native OIDC | Via proxy | Not possible in OSS | Groups / roles from token | User token to next hop | Effort |
|---|---|---|---|---|---|---|
| **Nova** | ✅ (stardelt-built: auth code + PKCE, bearer) | n/a | n/a | yes (`identity.groupClaim`) | ✅ Bearer to Trino and Lakekeeper | M |
| **Trino** | ✅ `OAUTH2` (Web UI and bearer JWT) | n/a | groups from claims | ❌ group providers are file/LDAP only | ❌ to Lakekeeper: service principal (user forwarding unverified) | M |
| **Lakekeeper** | ✅ native OIDC (API and UI) | n/a | n/a | roles claim read only by Cedar; OpenFGA ignores token roles | n/a (end of chain; signs or vends S3 access) | S, or M with OpenFGA |
| **Superset** | ✅ FAB `AUTH_OAUTH` | n/a | n/a | ✅ `AUTH_ROLES_MAPPING` | ⚠️ service account + impersonation, or a second per-user OAuth2 consent for Trino | S |
| **Airflow 3** | ✅ FAB auth manager `AUTH_OAUTH` | n/a | n/a | ✅ `AUTH_ROLES_MAPPING` | ❌ tasks use connections (service accounts) | S–M |
| **JupyterHub** | ✅ OAuthenticator (Generic / AzureAd) | n/a | n/a | ✅ `manage_groups` | ✅ via `auth_state` into the pod (refresh is your problem) | S–M |
| **SeaweedFS S3** | ⚠️ OIDC/STS exists upstream; needs ≥ 4.40 (CVE-2026-77298) | n/a | user SSO at 4.25 (do not enable) | role mapping in IAM JSON (upstream) | n/a | stay on static keys |
| **SeaweedFS admin UI** | ❌ OIDC is SeaweedFS **Enterprise** only | ✅ oauth2-proxy | yes, in OSS | via oauth2-proxy `allowed_groups` | n/a | S |
| **SeaweedFS filer UI** | ❌ | ✅ oauth2-proxy, or do not expose | yes | via oauth2-proxy | n/a | S |

Effort: **S** is values only. **M** adds an image change, a bootstrap step or extra components.

**What "one identity enforced at the catalog" actually looks like on these
versions.** Trino authenticates the user, then talks to Lakekeeper as one trusted service
principal. Per-user table policy reaches Trino through Trino's OPA access control plus
Lakekeeper's **OPA bridge**, which answers Trino's checks from Lakekeeper's permission model. That
needs a real authorization backend in Lakekeeper (OpenFGA), not `allowall`, which the chart's default uses.
Direct callers (Nova, notebooks, PyIceberg) present the user's own token to Lakekeeper.

## Decision: two modes, one knob

The umbrella chart (`stardelt-platform/chart/values.yaml`) already carries this block. The
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
- The chart publishes ConfigMap `stardelt-identity` (`issuerUrl`, `tokenEndpoint`, `groupClaim`, `adminGroup`).
  Every block's values are derived from it. Client IDs and secrets live in Secrets
  (`stardelt-oidc-clients` in platform mode, customer-provided in external mode), never in this
  block.
- `tokenEndpoint` is configuration, not discovery. Neither Helm nor the operator can fetch an
  external discovery document (Helm has no HTTP; the operator's only transport is the
  API-server proxy, which cannot leave the cluster), so an `external` install names the
  provider's `token_endpoint` once and the chart publishes it. `platform` derives it from the
  Keycloak it deploys and refuses the value.
- The user-ID claim is derived, not configured. Use `oid` on Entra, because Entra's `sub` is
  pairwise per application: the same user gets a different `sub` in Nova than in Trino. Use
  `sub` everywhere else. Lakekeeper already prefers `oid` and falls back to `sub`.

How the knob lands in each block:

| Knob | Nova | Trino | Lakekeeper | Superset / Airflow (FAB) | JupyterHub |
|---|---|---|---|---|---|
| `issuerUrl` | `NOVA_OIDC_ISSUER` | `…oauth2.issuer` | `auth.oauth2.providerUri` | `server_metadata_url` / provider URLs | `authorize_url`, `token_url`, `userdata_url` (no discovery) |
| `tokenEndpoint` | `NOVA_CATALOG_TOKEN_URL` | `CATALOG_TOKEN_URL` | discovers its own endpoints (not this value) | `PIPELINE_TOKEN_URL` (Airflow) / FAB's own discovery (Superset) | not used |
| `groupClaim` | `NOVA_OIDC_GROUP_CLAIM` | not consumable (see Trino) | `LAKEKEEPER__OPENID_ROLES_CLAIM` (Cedar only) | built-in providers read it themselves (`groups` for keycloak, `roles` for azure) | `auth_state_groups_key: oauth_user.<claim>` |
| `adminGroup` | `NOVA_OIDC_ADMIN_GROUP` | access-control rules | Lakekeeper role assignment | `AUTH_ROLES_MAPPING = {adminGroup: ["Admin"]}` | `admin_groups: [adminGroup]` |

## Block by block

Each block's mechanics are on its own page, so a lookup does not scroll past the others:

- [Nova, Trino, Lakekeeper and Superset](./identity-blocks-core)
- [Airflow, JupyterHub and SeaweedFS](./identity-blocks-platform)
- [Keycloak, Entra ID and several instances on one IdP](./identity-providers)

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
