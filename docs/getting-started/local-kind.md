---
title: "Run stardelt locally on kind"
sidebar_label: "Local (kind)"
slug: /getting-started/local-kind
---

# Run stardelt locally on kind

A single-node [kind](https://kind.sigs.k8s.io) cluster for laptop work. This runs the same Helm
charts and manifests as the real platform, sized for one machine. For the full chart set, use
the [Hetzner k3s](./hetzner-k3s) development cluster instead — kind is best for the core
lakehouse slice and Nova work.

Before you start, install the tools in [Prerequisites](./prerequisites).

## The stack you'll get

```
        Airflow (KubernetesExecutor)
                 │ pyiceberg
                 ▼
        trino (coordinator + 1 worker)
                 │ REST + S3
        ┌────────┴─────────┐
        ▼                  ▼
    Lakekeeper        SeaweedFS (master, volume,
    (Iceberg REST      filer, S3 gateway)
     catalog)               │
        │             bucket: lakehouse
   CNPG lakekeeper-pg (Postgres)
```

Everything lives in namespace `stardelt`; the cluster is named `stardelt`.

## Bring it up

From `stardelt-demos/`:

```bash
make up               # kind + CNPG + SeaweedFS + Lakekeeper + Trino + Airflow + Superset + Nova
make smoke            # acceptance: CREATE/INSERT/SELECT through Trino
make airflow-trigger  # trigger the nyc_taxi_load DAG
make pf               # port-forwards (Trino 8081, Lakekeeper 8181)
make airflow-ui       # Airflow UI on localhost:8088
make superset-ui      # Superset UI on localhost:8089
make down             # delete the cluster
```

`make up` is idempotent — re-running it skips steps that already succeeded.

## What `make up` does

1. Creates the kind cluster from `kind/kind-config.yaml` (host ports 8080/8081/8181).
2. Installs the CloudNative-PG operator (`cnpg-system`).
3. Installs SeaweedFS (1 replica each; replication `000`), bucket `lakehouse`.
4. Applies the `stardelt-s3-creds` Secret.
5. Creates the `lakekeeper-pg` CNPG cluster.
6. Installs Lakekeeper (OpenFGA disabled, `authz.backend: allowall`).
7. Bootstraps the Lakekeeper warehouse on `s3://lakehouse/warehouse`.
8. Installs Trino (coordinator + 1 worker).
9. Builds the stardelt images, installs Airflow, Superset and Nova.

## Inspect

```bash
kubectl -n stardelt get pods
kubectl -n stardelt logs deploy/trino-coordinator -f
kubectl -n stardelt exec deploy/trino-coordinator -- trino
```
