---
title: "Keycloak"
sidebar_label: "Keycloak"
slug: /services/keycloak
---

# Keycloak

**What it is.** Keycloak is the OpenID Connect provider stardelt can deploy for you. It is optional: with `identity.mode: external` you use your own provider instead ([Bring your own OIDC provider](../architecture/identity#bring-your-own-oidc-provider)). It issues OIDC tokens for realm `stardelt`.

**What it decides.** Keycloak authenticates users and issues tokens that Nova, Trino, and other clients validate. On login it returns tokens carrying claims such as `sub`, `groups`, and identity metadata used by the platform. The realm `stardelt` is generated from `chart/files/keycloak-realm.json` with the base domain substituted, and clients registered there are what downstream components trust for authentication.

**How it fits.** Keycloak sits at the identity layer, upstream of Nova. It answers token requests for the clients configured in the realm and is the source of truth for groups like `stardelt-admins`. See [Identity](../architecture/identity) and [Identity integrations](../architecture/identity-integrations) for the flows it participates in.

**What happens when it is down.** If Keycloak is unavailable, interactive login cannot complete and token issuance fails. Clients that require a valid bearer token cannot authenticate until Keycloak recovers; `NOVA_AUTH_MODE=dev` remains available as a development escape hatch where configured, but that is not a fallback for an OIDC-configured install.

**What you can tune.**

| Setting | Values file | Key | Default | What it changes |
|---|---|---|---|---|
| Image tag | `Makefile` | `KEYCLOAK_VERSION` | `26.8.1` | Version of `quay.io/keycloak/keycloak` used by Keycloak. |
| Image tag (chart) | `chart/values.yaml` | `identity.keycloak.image.tag` | `26.8.1` | Image tag rendered by the umbrella chart. |
| Image tag (manifest) | `manifests/keycloak.yaml` | `image` | `quay.io/keycloak/keycloak:26.8.1` | Image used by the standalone manifest install. |
| Replicas | `manifests/keycloak.yaml` | `spec.replicas` | `1` | Number of Keycloak pods. |
| Postgres max connections | `manifests/keycloak.yaml` | `postgresql.parameters.max_connections` | `150` | Max connections for `keycloak-pg`. |

**Operating it.**

- **Install:** `make install-identity` (applies `scripts/identity-bootstrap.sh` first to create required Secrets and ConfigMaps, then installs Keycloak). The realm is applied as ConfigMap `keycloak-realm` with hosts rendered for `id.<baseDomain>`.
- **Health check:** Keycloak answers at `https://id.<baseDomain>/realms/stardelt`. The realm administrator password lives in Secret `stardelt-realm-admin`.
- **Database and backups:** Keycloak uses the `keycloak-pg` CloudNativePG cluster (database `keycloak`). Backups are taken by `keycloak-pg-daily` (ScheduledBackup) to S3 via the configured backup store.
- **Logs:** Keycloak logs come from the `keycloak` Deployment in namespace `stardelt`. Realm and client configuration are stored in the `keycloak-pg` database and imported from `keycloak-realm`.
