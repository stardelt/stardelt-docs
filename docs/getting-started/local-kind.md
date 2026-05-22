---
title: "Run stardelt locally on kind"
sidebar_label: "Local (kind)"
slug: /getting-started/local-kind
---

# Run stardelt locally on kind

This page walks through bringing the MVP stardelt lakehouse slice up on a
single-node `kind` cluster. The same Helm charts and manifests are used as in
production, just with values tuned for a laptop.

Before you start, make sure you have the tools from [Prerequisites](./prerequisites)
on `$PATH`.

## The stack you'll get

```
                                    ┌──────────────────────┐
                                    │ Airflow              │
                                    │ scheduler + api +    │
                                    │ dag-processor +      │
                                    │ triggerer            │
                                    │                      │
                                    │ KubernetesExecutor   │
                                    │ spawns task pods     │
                                    └──────────┬───────────┘
                                               │ pyiceberg
                                               ▼
                       trino (coord + 1 worker)
                                │
                            REST + S3
                                │
                  ┌─────────────┼────────────┐
                  ▼                          ▼
              lakekeeper           seaweedfs (master,
              (Iceberg REST          volume, filer, s3)
              catalog)                       │
                  │                          │
            CNPG lakekeeper-pg               │
            (Postgres, 1 instance)      bucket: lakehouse
                                        (PVC-backed)
```

All resources live in namespace `stardelt`. Kind cluster name: `stardelt`.

## Bring the stack up

From the `stardelt-demos/` repo:

```bash
make up               # kind + cnpg + seaweedfs + lakekeeper + trino + airflow  (~12 min cold)
make smoke            # acceptance: CREATE/INSERT/SELECT through Trino
make airflow-trigger  # trigger the nyc_taxi_load DAG (1 year, ~3 min)
make pf               # port-forwards: 8081 Trino, 8181 Lakekeeper
make airflow-ui       # port-forward Airflow UI to localhost:8088
make down             # tear down the cluster
```

`make up` is idempotent — re-running it skips steps that already succeeded.

## What `make up` does

1. **kind cluster** (`deploy/kind-config.yaml`) — single node, host ports 8080/8081/8181 mapped to the host.
2. **CloudNative-PG operator** (`cnpg/cloudnative-pg`) in namespace `cnpg-system`. Used by Lakekeeper for its metadata Postgres.
3. **SeaweedFS** in `stardelt` — master + volume + filer + S3 gateway, trimmed for kind (1 replica each, replication `000`). The `lakehouse` bucket is auto-created on install.
4. **S3 credentials Secret** (`deploy/manifests/stardelt-s3-creds.yaml`) — `access-key`, `secret-key`, `endpoint`, `bucket`, `region` consumed by Lakekeeper bootstrap and Trino's catalog config.
5. **Lakekeeper Postgres** (`postgresql.cnpg.io/Cluster` `lakekeeper-pg`) — single instance, 2 GiB.
6. **Lakekeeper** — bundled Postgres + OpenFGA disabled, `authz.backend: allowall`, points at the CNPG Postgres via the `lakekeeper-pg-app` Secret.
7. **Lakekeeper warehouse bootstrap** (`deploy/manifests/lakekeeper-bootstrap.yaml`) — a Job that POSTs `/management/v1/bootstrap` and `/management/v1/warehouse` (creating `warehouse` on `s3://lakehouse/warehouse`). Idempotent.
8. **Trino** — coordinator + 1 worker, 2 GiB heap each. The catalog `warehouse` is configured with `iceberg.catalog.type=rest`, REST URI = Lakekeeper, S3 endpoint = SeaweedFS, path-style access, credentials from `stardelt-s3-creds`.
9. **Apache Airflow** — slim image plus the `postgres`, `fab`, and `cncf-kubernetes` providers; KubernetesExecutor; ships the `nyc_taxi_load` DAG that loads NYC TLC yellow-taxi Parquet into `warehouse.nyc_taxi.yellow_trips` via pyiceberg.

When this finishes, verify with the [smoke test](./smoke-test).

## Inspecting the stack

```bash
kubectl -n stardelt get pods                     # all should be Running/Ready
kubectl -n stardelt logs deploy/trino-coordinator -f
kubectl -n stardelt logs deploy/lakekeeper -f
kubectl -n stardelt exec deploy/trino-coordinator -- trino  # interactive SQL
```
