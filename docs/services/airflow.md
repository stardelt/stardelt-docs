---
title: "Airflow"
sidebar_label: "Airflow"
slug: /services/airflow
---

# Airflow

**What it is.** A DAG-based workflow orchestrator (Apache Airflow chart 1.21.0, appVersion 3.2.0).

**Why stardelt uses it.** Airflow runs scheduled data pipelines on the platform. DAGs are baked into the stardelt-owned image so pipeline code and the runtime ship together.

**How it fits.** Airflow lives in the orchestration layer. It schedules and runs tasks via KubernetesExecutor, uses the bundled PostgreSQL for metadata, and reads/writes objects as configured by its tasks. It is consumed by Nova (run/pause/schedule) and by group members through the Airflow UI. See [Services](../architecture/services) and [How it works](../architecture/how-it-works).

**Who can use it.** Users sign in at `https://airflow.<base domain>` with the same Keycloak account used for Nova. Access is mapped by platform groups: `stardelt-admins` is synced to Airflow's Admin role at sign-in; other groups get role `stardelt-group-<ownerGroup>`. Per-group DAG visibility and permissions are created by `manifests/airflow-group-roles.yaml` (cron every 5 min) and enforced via Airflow RBAC; group sync at login uses `AUTH_ROLES_SYNC_AT_LOGIN`. See [Airflow for group members](../guides/airflow).

**What you can tune.** Key settings from `helm-values/airflow.yaml`:

| Setting | Values file | Key | Default | What it changes |
|---|---|---|---|---|
| Executor | `helm-values/airflow.yaml` | `executor` | `KubernetesExecutor` | Task execution model (Kubernetes pods per task). |
| Airflow image | `helm-values/airflow.yaml` | `images.airflow.repository` / `tag` / `digest` | `ghcr.io/stardelt/airflow` / `demo` / `sha256:2d9504d1a88770bbea76c64dae7cd64c2fb6097c19bc20d19d5b0314c5d4c33f` | Stardelt-owned image with DAGs baked in. |
| DAG source | `helm-values/airflow.yaml` | `dags.gitSync.enabled` / `dags.persistence.enabled` | `false` / `false` | DAGs come from the image, not gitSync or persistence. |
| Logs storage | `helm-values/airflow.yaml` | `logs.persistence.enabled` | `false` | Task logs in emptyDir (lost on pod restart). |
| Redis | `helm-values/airflow.yaml` | `redis.enabled` | `false` | Disabled for KubernetesExecutor. |
| Workers | `helm-values/airflow.yaml` | `workers.replicas` | `0` | No Celery workers. |
| Metadata DB | `helm-values/airflow.yaml` | `postgresql.enabled` / `postgresql.primary.persistence.size` | `true` / `2Gi` | Bundled PostgreSQL for metadata. |
| API server replicas | `helm-values/airflow.yaml` | `apiServer.replicas` | `1` | Number of API server pods. |

**What it replaces.** Airflow replaces ad hoc cron and shell scripts for scheduled data pipelines.

**Operating it.**

- **Health check:** `kubectl -n stardelt get pods -l app.kubernetes.io/name=airflow`
- **Logs:** `kubectl -n stardelt logs -l component=api-server -n stardelt` or `kubectl -n stardelt logs -l component=scheduler -n stardelt`
- **Install step:** `make step-airflow` (from `stardelt-platform`)
- **Backup:** App database dump via `manifests/pg-dump-backup.yaml` / `make step-pgdump` (Airflow metadata DB)
