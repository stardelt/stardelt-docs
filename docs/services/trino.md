---
title: "Trino"
sidebar_label: "Trino"
slug: /services/trino
---

# Trino

**What it is.** A distributed MPP SQL engine (chart `trino/trino` 1.42.2, appVersion 480).

**Why stardelt uses it.** Trino is the query engine the platform uses for interactive SQL over Iceberg tables. It serves the SQL editor, Superset, and client connections, reading Iceberg catalogs through Lakekeeper and Parquet data from SeaweedFS.

**How it fits.** Trino runs in the data plane between the applications and the catalog/storage. It calls Lakekeeper for Iceberg REST catalog metadata and reads/writes objects in SeaweedFS via the S3 API. It is consumed by Nova's SQL editor and by Superset. See [Services](../architecture/services) and [How it works](../architecture/how-it-works).

**What you can tune.** Key settings from `stardelt-platform/helm-values/trino.yaml` and `stardelt-platform/helm-values/trino-identity.yaml`:

| Setting | Values file | Key | Default | What it changes |
|---|---|---|---|---|
| Worker count | `helm-values/trino.yaml` | `server.workers` | `1` | Number of Trino workers. |
| Coordinator memory per node | `helm-values/trino.yaml` | `coordinator.config.query.maxMemoryPerNode` | `800MB` | Per-node memory cap for the coordinator. |
| Worker memory per node | `helm-values/trino.yaml` | `worker.config.query.maxMemoryPerNode` | `800MB` | Per-node memory cap for workers. |
| Query time limits (coordinator) | `helm-values/trino.yaml` | `server.coordinatorExtraConfig` (`query.max-execution-time`, `query.max-run-time`) | `10m`, `15m` | Coordinator-only query execution/run time limits. |
| Coordinator resources | `helm-values/trino.yaml` | `coordinator.resources` | `requests: {cpu: "500m", memory: "2300Mi"}, limits: {memory: "3000Mi"}` | CPU/memory requests and limits for the coordinator. |
| Worker resources | `helm-values/trino.yaml` | `worker.resources` | `requests: {cpu: "500m", memory: "2300Mi"}, limits: {memory: "3000Mi"}` | CPU/memory requests and limits for workers. |
| Object cache | `helm-values/trino.yaml` | `coordinator.additionalVolumes` / `fs.cache.*` in catalog config | cache dir `/var/trino/cache`, max size `10GB`, TTL `7d` | Worker-local file-system cache for object-store reads. |
| Authentication/TLS (when IdP present) | `helm-values/trino-identity.yaml` | `server.config.authenticationType`, `server.config.https` | `PASSWORD,OAUTH2`, HTTPS on `8443` | Enables authentication and in-cluster TLS when the platform IdP exists. |

**What it replaces.** Trino replaces legacy query engines such as Hive/Impala for interactive SQL over object storage.

**Operating it.**

- **Health check:** Check the Trino coordinator service readiness in the cluster (e.g. `kubectl -n stardelt get pods -l app.kubernetes.io/name=trino`).
- **Logs:** View coordinator/worker logs with `kubectl -n stardelt logs -l app.kubernetes.io/name=trino`.
- **Install step:** `make step-trino` (see `stardelt-platform/Makefile`). With a platform IdP present, it also applies TLS manifests and configures identity.
- **Backup:** Trino has no persistent catalog metadata of its own in this setup; backups focus on the catalog (Lakekeeper/Postgres) and object store. See [Backups](../operations/backups).
- **Query log:** Query history is recorded by Nova; see [The query log](../guides/query-log).
