---
title: "stardelt Nova"
sidebar_label: "Nova"
slug: /services/nova
---

# stardelt Nova

**What it is.** A web UI and API gateway deployed from `manifests/nova-deployment.yaml` as a single pod in namespace `stardelt`.

**What it does.** Nova serves the platform UI and API on the base domain under `/api/`. It reads Trino, Lakekeeper, SeaweedFS, Airflow, and the secret store to present catalog browsing, SQL editing, load and transfer, jobs, health, and app status. It authenticates via OIDC when enabled, stores state in its own Postgres cluster, and lists Kubernetes resources in its namespace to show deployed workloads and their image digests.

**How you reach it.** Reach it at the base domain Ingress `nova` (URL path `/api/`). Health check: `curl -s https://<baseDomain>/api/health` → `{"status":"ok","db":"up"}`. Without a token, `GET /api/me` returns `401`.

**What you can tune.** Settings from `manifests/nova-deployment.yaml` (and related manifests):

| Setting | Where | Key | Default | What it changes |
|---|---|---|---|---|
| Query engine URL | `manifests/nova-deployment.yaml` | `NOVA_TRINO_URL` | From `stardelt-identity` ConfigMap key `trinoUrl` if present; otherwise built-in default | URL of the Trino endpoint Nova connects to. |
| Trino CA | `manifests/nova-deployment.yaml` | `NOVA_TRINO_CA_PEM` | From Secret `trino-ca` key `tls.crt` if present | Internal CA added to TLS roots for Trino TLS. |
| Catalog URL | `manifests/nova-deployment.yaml` | `NOVA_LAKEKEEPER_URL` | `http://lakekeeper.stardelt.svc.cluster.local:8181` | Lakekeeper Iceberg REST catalog endpoint. |
| Warehouse name | `manifests/nova-deployment.yaml` | `NOVA_WAREHOUSE_NAME` | `warehouse` | Default warehouse name used by Nova. |
| Auth mode | `manifests/nova-deployment.yaml` | `NOVA_AUTH_MODE` | From `stardelt-identity` ConfigMap key `authMode` if present (otherwise dev/no login) | Sign-in mode (`oidc` to enable SSO). |
| Public URL | `manifests/nova-deployment.yaml` | `NOVA_PUBLIC_URL` | From `stardelt-identity` ConfigMap key `publicUrl` if present | Public origin used by Nova. |
| Database URL | `manifests/nova-deployment.yaml` | `NOVA_DATABASE_URL` | From Secret `nova-pg-app` key `uri` (via CNPG) | Postgres connection string for Nova state. |
| Base domain | `manifests/nova-deployment.yaml` | `NOVA_BASE_DOMAIN` | Set per install | Base domain used by Nova. |

**Related pages.** [Nova API](../reference/api), [From source to dashboard](../guides/source-to-dashboard), [The query log](../guides/query-log), [Connections](../guides/connections), [How it works](../architecture/how-it-works).

**Operating it.**

- **Install:** Applied as part of the platform install from `manifests/nova-deployment.yaml` (and `manifests/nova-pg.yaml`). Nova's Postgres cluster is a CloudNativePG `Cluster` named `nova-pg` in namespace `stardelt`.
- **Image pinning:** The image is pinned by digest in `manifests/nova-deployment.yaml` (line ~118). `scripts/check-version-parity.sh` checks the pin.
- **Logs:** `kubectl -n stardelt logs -l app.kubernetes.io/name=nova`.
- **Health:** `curl -s https://<baseDomain>/api/health` returns `{"status":"ok","db":"up"}` when healthy.
- **Database backup:** Nova uses CloudNativePG cluster `nova-pg` with scheduled backups configured in `manifests/nova-pg.yaml` (Barman object store to `s3://backups/`, retention `14d`).
