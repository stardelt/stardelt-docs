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
        Airflow (KubernetesExecutor)          ← APP_PROFILE=full only
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

Nova runs in front of it. Everything lives in namespace `stardelt`; the cluster is named
`stardelt`.

## Bring it up

From `stardelt-demos/`:

```bash
make up               # kind cluster, then delegates the install to stardelt-platform
make smoke            # acceptance: CREATE/INSERT/SELECT through Trino
make pf               # port-forwards (Trino 8081, Lakekeeper 8181)

APP_PROFILE=full make up      # adds Airflow + Superset (needs ~16 GB to be comfortable)
make airflow-trigger          # full only: trigger the nyc_taxi_load DAG
make airflow-ui               # full only: Airflow UI on localhost:8088
make superset-ui              # full only: Superset UI on localhost:8089
make down                     # delete the cluster
```

`make up` is idempotent — re-running it skips steps that already succeeded.

## What `make up` does

The demo repo owns only the kind-specific steps; the install itself is the platform Makefile, so
the two paths cannot drift:

1. Creates the kind cluster from `kind/kind-config.yaml` (host ports 8080/8081/8181), selects its
   kube-context, and creates the `stardelt` namespace.
2. Builds the stardelt-owned images and loads them into kind.
3. Runs `make install-core` (default `APP_PROFILE=core`) — or `make install` with
   `APP_PROFILE=full` — in `stardelt-platform`. `SLIM=1` forwards the small-node overrides.
4. Re-points the Nova Deployment at the locally built image instead of `ghcr.io`.

## Inspect

```bash
kubectl -n stardelt get pods
kubectl -n stardelt logs deploy/trino-coordinator -f
kubectl -n stardelt exec deploy/trino-coordinator -- trino
```
