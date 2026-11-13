---
title: "CloudNativePG"
sidebar_label: "CloudNativePG"
slug: /services/cloudnative-pg
---

# CloudNativePG

**What it is.** CloudNativePG is the Kubernetes operator that runs PostgreSQL as a `Cluster` custom resource: from the resource it creates the StatefulSet, the `-rw`/`-ro`/`-r` Services, the PVCs and the credentials Secrets, and it manages failover, WAL archiving and base backups. It is Apache-2.0. The platform installs chart `cnpg/cloudnative-pg` **0.29.1** from `https://cloudnative-pg.github.io/charts`; the chart version is fixed in the `Makefile` (`CNPG_VERSION`) and in `crates/stardelt-operator/src/planner.rs`, and the running operator is `ghcr.io/cloudnative-pg/cloudnative-pg:1.30.1`.

**How it fits.** Four databases on the platform are CloudNativePG `Cluster`s. All four run `instances: 1`, keep `backup.retentionPolicy: 14d`, and take continuous WAL plus a daily base backup through the barman-cloud plugin into `s3://backups/<cluster>/`:

| Cluster | PostgreSQL image | Storage | Daily `ScheduledBackup` | Used by |
|---|---|---|---|---|
| `lakekeeper-pg` | `ghcr.io/cloudnative-pg/postgresql:17.7-system-trixie` | 2Gi | `lakekeeper-pg-daily`, `0 30 2 * * *` | Lakekeeper's catalog database |
| `keycloak-pg` | `ghcr.io/cloudnative-pg/postgresql:18.3-system-trixie` | 1Gi | `keycloak-pg-daily`, `0 45 2 * * *` | Keycloak |
| `nova-pg` | `ghcr.io/cloudnative-pg/postgresql:18.3-system-trixie` | 1Gi | `nova-pg-daily`, `0 0 3 * * *` | Nova (state store, query log) |
| `openfga-pg` | `ghcr.io/cloudnative-pg/postgresql:18.3-system-trixie` | 1Gi | `openfga-pg-daily`, `0 30 2 * * *` | OpenFGA (the permission store) |

The make path installs the operator in `make step-cnpg` and the catalog's cluster in `make step-cnpg-cluster`; the operator path puts `cnpg` first in `plan_platform` and creates all four clusters with their daily backups (`ensure_catalog_database`, `ensure_keycloak_pg`, `ensure_nova_pg`, `ensure_openfga_database`). The manifests are `manifests/cnpg-postgres.yaml` (the catalog), `manifests/keycloak.yaml`, `manifests/nova-pg.yaml` and `manifests/openfga-pg.yaml`; the catalog's and OpenFGA's schedules live in `manifests/cnpg-backup-schedule.yaml`. Every cluster requests `cpu: 50m, memory: 256Mi` and is limited to `cpu: 1, memory: 2Gi` (Nova and Keycloak to `cpu: 500m`). The operator generates each cluster's credentials Secret (`<name>-app`, and `<name>-superuser` for the catalog and OpenFGA); none is in git.

**Two databases are not CloudNativePG.** Superset and Airflow keep their state in the charts' Bitnami PostgreSQL StatefulSets, `superset-postgresql` and `airflow-postgresql`, with a 10 Gi volume but no WAL archive and no base backup. Instead, `manifests/pg-dump-backup.yaml` adds the CronJobs `superset-pg-dump` (02:30) and `airflow-pg-dump` (02:45), which take a logical `pg_dump --format=custom` into `s3://backups/pgdump/<name>/<UTC date>.dump` and prune that prefix after 14 days. `make backups` applies them, and `make verify-pgdump PG_DUMP=all` runs each and restores it into a throwaway database. A restore from these dumps loses the writes after the last dump; that is the stated limit of the mechanism, not an oversight. A CloudNativePG backup does not restore the Superset or Airflow databases.

**What happens when it is down.** The PostgreSQL pods keep serving queries: the operator is not in the data path. What stops is everything that creates or changes a database — new `Cluster`s, configuration and version changes, failover of a lost primary — and the daily backups. `kubectl get clusters` still answers; the `STATUS` column may freeze at its last value.

**What you can tune.**

| Cluster | Manifest | Keys |
|---|---|---|
| `lakekeeper-pg` | `manifests/cnpg-postgres.yaml` | `spec.imageName`, `spec.storage.size`, `spec.instances`, `spec.backup.retentionPolicy`, `spec.plugins[0].parameters.barmanObjectName`; `lakekeeper-pg-daily` in `manifests/cnpg-backup-schedule.yaml` (`spec.schedule`) |
| `keycloak-pg` | `manifests/keycloak.yaml` | the same keys; `keycloak-pg-daily` (`spec.schedule`) |
| `nova-pg` | `manifests/nova-pg.yaml` | the same keys; `nova-pg-daily` (`spec.schedule`) |
| `openfga-pg` | `manifests/openfga-pg.yaml` | the same keys; `openfga-pg-daily` in `manifests/cnpg-backup-schedule.yaml` (`spec.schedule`) |

`spec.plugins[0].parameters.barmanObjectName` names the cluster's `ObjectStore` in `manifests/cnpg-objectstore.yaml` — that is where the bucket, the endpoint and the credentials live. The plugin itself is installed once for the namespace, as `deploy/barman-cloud-plugin-barman-cloud` (chart `cnpg/plugin-barman-cloud`); `make step-barman-cloud-plugin` installs it and the four stores, the chart does it through its `plugin-barman-cloud` sub-chart.

The chart version is not in a values file: it is fixed in the `Makefile` and in `planner.rs` and moves with the pin process. The PostgreSQL image is always pinned on purpose — an unpinned `imageName` would track the operator's default and start a major upgrade on the next apply.

**Operating it.**

- **Install:** `make step-cnpg` and `make step-cnpg-cluster` in the make path; in the operator path the four clusters come with the `PlatformInstance`.
- **List the clusters:** `kubectl -n stardelt get clusters.postgresql.cnpg.io` — columns `NAME INSTANCES READY STATUS PRIMARY`.
- **List the schedules and the last backup:** `kubectl -n stardelt get scheduledbackups.postgresql.cnpg.io` — the last column is the age of the last backup.
- **Operator logs:** `kubectl -n stardelt logs deploy/cnpg-cloudnative-pg`.
- **Plugin:** the `cnpg` kubectl plugin makes the cluster status easier to read, but it is not required.
- **Restore:** the procedure and its limits are on [Backups](../operations/backups).

**Related pages.** [Backups](../operations/backups), [Operator](operator), [PlatformInstance reference](../reference/resources/platforminstance), [Lakehouse reference](../reference/resources/lakehouse), [Licenses](../architecture/licenses).
