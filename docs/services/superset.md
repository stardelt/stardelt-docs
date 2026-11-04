---
title: "Superset"
sidebar_label: "Superset"
slug: /services/superset
---

# Superset

**What it is.** A BI and dashboarding platform (Apache Superset chart 0.15.5, appVersion 5.0.0).

**Why stardelt uses it.** Superset provides interactive dashboards and SQL Lab over the data platform, using Trino as its query engine.

**How it fits.** Superset lives in the application layer and queries Trino via the SQLAlchemy Trino driver. It signs in through the platform IdP (Keycloak) and is consumed by users for dashboards and ad hoc SQL. See [Services](../architecture/services) and [How it works](../architecture/how-it-works).

**Who can use it.** Users sign in at `https://superset.<base domain>` with the same Keycloak account used for Nova. `stardelt-admins` map to Superset Admin; `stardelt-users` map to Gamma and `stardelt-analyst`. Per-group catalog access is granted via roles `stardelt-group-<group>` created by `manifests/superset-group-roles.yaml` (cron every 5 min) based on Catalog grants; roles sync at login (`AUTH_ROLES_SYNC_AT_LOGIN`). See [Dashboards and SQL Lab](../guides/source-to-dashboard).

**What you can tune.** Key settings from `helm-values/superset.yaml`:

| Setting | Values file | Key | Default | What it changes |
|---|---|---|---|---|
| Superset image | `helm-values/superset.yaml` | `image.repository` / `image.tag` | `ghcr.io/stardelt/superset` / `dev@sha256:b9ced85d81a0c9efd2ca993f27bba5470e4815aad9d246b93e3ca5e62d26e8cd` | Stardelt Superset image with drivers pre-installed. |
| Image pull secret | `helm-values/superset.yaml` | `imagePullSecrets` | `[{"name": "ghcr-creds"}]` | Pull secret for private image. |
| Service account | `helm-values/superset.yaml` | `serviceAccountName` | `superset` | SA used by pods and init Jobs for group role sync. |
| Bootstrap script | `helm-values/superset.yaml` | `bootstrapScript` | (inline script) | Startup bootstrap behavior. |
| Iframe embedding | `helm-values/superset.yaml` | `configOverrides.iframe_embedding` | `TALISMAN_ENABLED=False` | Allows embedding in Nova (MVP). |
| Init configuration | `helm-values/superset.yaml` | `init` | (see values) | Init jobs/config for Superset setup. |
| Superset node | `helm-values/superset.yaml` | `supersetNode` | (see values) | Web node configuration. |
| Superset worker | `helm-values/superset.yaml` | `supersetWorker` | (see values) | Celery worker configuration. |
| Metadata DB | `helm-values/superset.yaml` | `postgresql.enabled` | `true` | Bundled PostgreSQL for Superset metadata. |
| Redis | `helm-values/superset.yaml` | `redis.enabled` | `true` | Bundled Redis for caching/celery. |

**What it replaces.** Superset replaces a standalone BI server over a warehouse with a platform-integrated dashboarding tool.

**Operating it.**

- **Health check:** `kubectl -n stardelt get pods -l app.kubernetes.io/name=superset`
- **Logs:** `kubectl -n stardelt logs -l app.kubernetes.io/component=superset -n stardelt`
- **Install step:** `make step-superset` (from `stardelt-platform`)
- **Backup:** App database dump via `manifests/pg-dump-backup.yaml` / `make step-pgdump` (Superset metadata DB)
