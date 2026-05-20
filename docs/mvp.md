---
title: "MVP — local kind deployment"
sidebar_label: "MVP"
slug: /mvp
---

# Stardelt MVP — local kind deployment

The MVP runs Stardelt's lakehouse slice on a single-node `kind` cluster.
Plan progress:

- **Stage 1 — done**: kind + SeaweedFS + Lakekeeper + Trino, smoke test passes.
- **Stage 2 — done**: Apache Airflow installed; `nyc_taxi_load` DAG loads NYC TLC yellow-taxi Parquet via pyiceberg into `warehouse.nyc_taxi.yellow_trips`.
- **Stage 3 — done (first draft)**: Stardelt Nova up. Rust+axum backend proxies Lakekeeper + Trino, serves the built UI as static assets. Vite/React/TS/Tailwind UI has Overview, Catalog (namespace+table tree, schema view), Query (textarea editor + results table + localStorage history), and Health (auto-refreshing Trino info). Single pod (`stardelt/nova:dev`), `kubectl port-forward svc/nova 8080:8080` to access.
- **Stage 3.5 — done**: Apache Superset added as the BI / dashboard component. Reachable two ways: dedicated app at `http://localhost:8089` (via `make superset-ui`) and embedded inside Nova at `/dashboards` (iframe). Trino warehouse pre-registered as the "Trino Warehouse" database connection.
- **Stages 4–5** (Lakehouse CRD operator, one-command demo) pending.

## Stack overview

```
                                    ┌──────────────────────┐
                                    │ Airflow (Stage 2)    │
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

## Prerequisites

WSL2 / Linux with these on `$PATH` — `make deps` verifies them:

| Tool    | Tested version |
|---------|----------------|
| docker  | 26.x (Docker Desktop on WSL2 OK) |
| kind    | 0.31.0 |
| kubectl | 1.36.x |
| helm    | 4.x |

## Bring the stack up

```bash
make up               # kind + cnpg + seaweedfs + lakekeeper + trino + airflow  (~12 min cold)
make smoke            # Stage 1 acceptance: CREATE/INSERT/SELECT through Trino
make airflow-trigger  # Stage 2: trigger the nyc_taxi_load DAG (1 year, ~3 min)
make pf               # port-forwards: 8081 Trino, 8181 Lakekeeper
make airflow-ui       # port-forward Airflow UI to localhost:8088
make down             # tear down the cluster
```

`make up` is idempotent — re-running it skips steps that already succeeded.

## What `make up` does

1. **kind cluster** (`deploy/kind-config.yaml`) — single node, host-mount `/var/lib/ozone` reserved for future persistent volumes, ports 8080/8081/8181 mapped to the host.
2. **CloudNative-PG operator** (`cnpg/cloudnative-pg` 0.28.2) in namespace `cnpg-system`. Used by Lakekeeper for its metadata Postgres.
3. **SeaweedFS** (`seaweedfs/seaweedfs` 4.25.1) in `stardelt` — master + volume + filer + S3 gateway. Values trimmed for kind: 1 replica each, emptyDir storage, replication `000`. S3 credentials pinned via `s3.credentials.admin` so they line up with the `ozone-s3-creds` Secret. The `lakehouse` bucket is auto-created on install.
4. **S3 credentials Secret** (`deploy/manifests/ozone-s3-creds.yaml`) — `access-key`, `secret-key`, `endpoint`, `bucket`, `region` consumed by Lakekeeper bootstrap and Trino's catalog config. Name still says "ozone" for historical reasons; rename TODO.
5. **Lakekeeper Postgres** (`postgresql.cnpg.io/Cluster` `lakekeeper-pg`) — single instance, 2 Gi.
6. **Lakekeeper** (`lakekeeper/lakekeeper` 0.11.0) — bundled Postgres + OpenFGA disabled, `authz.backend: allowall`, points at the CNPG Postgres via the `lakekeeper-pg-app` Secret.
7. **Lakekeeper warehouse bootstrap** (`deploy/manifests/lakekeeper-bootstrap.yaml`) — Job that POSTs `/management/v1/bootstrap` (one-time, accept ToS) and `/management/v1/warehouse` (create `warehouse` on `s3://lakehouse/warehouse`). Idempotent on re-run.
8. **Trino** (`trino/trino` 1.42.2, appVersion 480) — coordinator + 1 worker, 2 G heap each. The single catalog `warehouse` is configured with `iceberg.catalog.type=rest`, REST URI = Lakekeeper, S3 endpoint = SeaweedFS, path-style access, credentials substituted from env vars sourced from the `ozone-s3-creds` Secret.

## Stage 3.5 — Apache Superset (BI / dashboards)

Superset is the display layer. It sits beside Trino and runs SQL against the same `warehouse` catalog over Iceberg-on-SeaweedFS. The chart's bundled Postgres + Redis back it; no shared resources with the rest of the stack.

**Image** (`stardelt/superset:dev`, `superset-image/Dockerfile`): `apachesuperset:5.0.0` with `psycopg2-binary` + `trino` SQLAlchemy driver baked in via `uv pip install` inside the upstream venv (the 5.0 image ships neither). Built and `kind load`-ed by `scripts/build-images.sh`.

**Trino connection** is pre-registered through `init.extraConfigs.import_datasources.yaml`:
```
trino://stardelt-dev@trino.stardelt.svc.cluster.local:8080/warehouse
```
Database name visible in Superset: **Trino Warehouse**. Verified from inside the Superset pod that `SELECT pickup_year_month, COUNT(*) FROM nyc_taxi.yellow_trips GROUP BY 1` returns ~3M rows per month, matching what Nova's Query view shows.

**Embedded vs. dedicated**:

| Aspect | Dedicated app (`make superset-ui` → :8089) | Embedded in Nova (`/dashboards`) |
|---|---|---|
| User flow | Open Superset directly, login admin/admin | Open Nova, click *Dashboards*, login in iframe (cookie-shared on same browser) |
| Best for | Heavy chart authoring, dashboard editing | Casual viewing inside Nova's nav, deep-linking from Catalog |
| Production posture | Real auth via Keycloak SSO, dedicated DNS | Needs SSO + Superset's guest-token feature for proper unified UX |
| Cross-origin caveats | None | Browser must reach both port-forwards (8080 + 8089). Configurable via `VITE_SUPERSET_URL` in the Nova build |
| Security trade-off in MVP | Default | `TALISMAN_ENABLED = False` + `HTTP_HEADERS = {}` to allow iframe — drops CSP/X-Frame-Options. MVP-only. |

**Recommendation**: Keep both. Heavy users go directly to Superset; the embedded path is the "first impression" inside Nova so a data engineer doesn't have to context-switch. Production hardening (Stage 5+) replaces the iframe with Superset's [Embedded SDK](https://github.com/apache/superset/tree/master/superset-embedded-sdk) using guest tokens and uses Keycloak SSO for both apps.

## Stage 2 — Apache Airflow + nyc_taxi_load DAG

The data loader is a real Airflow DAG, not a one-shot Job. This costs more cluster resources (~4 extra pods) but uses the canonical Stardelt orchestration component instead of a throwaway.

**Image**: `stardelt/airflow:dev` — `apache/airflow:slim-3.2.0-python3.12` + the providers that ship outside the slim image (`postgres`, `fab`, `cncf-kubernetes`) + `pyiceberg`/`pyarrow`/`httpx` + DAGs baked in via `COPY dags/`. Built and `kind load`-ed by `scripts/build-images.sh`.

**DAG** (`dags/nyc_taxi_load.py`): dynamic task mapping over `(year, month)` pairs. Each task downloads one TLC Parquet, normalizes schema drift (TLC renamed/added columns across 2019–2023), and appends to `warehouse.nyc_taxi.yellow_trips`. Partitioned by `pickup_year_month` (int `YYYYMM`).

**Concurrency**: `max_active_tasks=1`. Iceberg REST catalog uses optimistic-concurrency commits — parallel appends to one table conflict and roll back. Serial is cheap (~3 min for 12 months) because downloads dominate.

**Idempotency**: each task checks `table.inspect.partitions()` for its own `pickup_year_month` and short-circuits if rows already present. Re-running the DAG is safe.

**Configuration** via the chart's `env` + `extraEnv` blocks:
- Plain values: `CATALOG_URI`, `CATALOG_WAREHOUSE`, `YEARS` (default `"2023"`; set to `"2019-2023"` for the full 5-year load).
- Secret refs (`extraEnv` templated string): `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION` all from the `ozone-s3-creds` Secret.

**Persistence**: SeaweedFS master/volume/filer use `persistentVolumeClaim` storage (not emptyDir) — emptyDir wipes on pod restart and leaves Iceberg metadata pointing at non-existent files (manifests as `FileNotFoundException` on Trino reads). PVC-backed storage survives across helm upgrades and Docker Desktop restarts.

## Inspecting the stack

```bash
kubectl -n stardelt get pods                     # all should be Running/Ready
kubectl -n stardelt logs deploy/trino-coordinator -f
kubectl -n stardelt logs deploy/lakekeeper -f
kubectl -n stardelt exec deploy/trino-coordinator -- trino  # interactive SQL
```

In Trino:

```sql
SHOW CATALOGS;                                  -- warehouse + system/tpch/tpcds
SHOW SCHEMAS FROM warehouse;
SELECT * FROM warehouse.smoke.t;                -- Stage 1 smoke row
SELECT COUNT(*) FROM warehouse.nyc_taxi.yellow_trips;          -- Stage 2: ~38M for 1y, ~300M for 5y
SELECT pickup_year_month, COUNT(*), ROUND(AVG(fare_amount), 2)
  FROM warehouse.nyc_taxi.yellow_trips
  GROUP BY 1 ORDER BY 1;                        -- monthly trip count + avg fare
```

Lakekeeper management API (after `make pf`):

```bash
curl http://localhost:8181/management/v1/info        # bootstrapped: true
curl http://localhost:8181/management/v1/warehouse   # one warehouse, on s3://lakehouse/warehouse
```

## Storage layer: why SeaweedFS, not Ozone

The plan called for Apache Ozone as the storage layer (`docs/COMPONENTS.md:28`). During Stage 1 implementation, Ozone's S3 Gateway on the single-datanode kind cluster turned out to send `replicationConfig: RATIS/THREE` on every `CREATE_KEY` regardless of:

- `ozone.replication=ONE|1`
- `ozone.server.default.replication=ONE`
- `ozone.client.default.replication=ONE` + `ozone.client.default.replication.type=RATIS`
- `ozone.client.replication.factor=1` + `ozone.client.replication.type=RATIS`
- `OZONE_REPLICATION_FACTOR=1`
- Per-bucket `ozone sh bucket set-replication-config /s3v/lakehouse --type RATIS --replication ONE`
- Re-creating the bucket via `ozone sh bucket create -t RATIS -r ONE`

SCM correctly refused — only 1 datanode existed, so RATIS/THREE writes could never satisfy "Required 3. Found 1." Per the plan's documented emergency fallback, we switched the storage layer to **SeaweedFS** (`docs/COMPONENTS.md:28` lists it as the Ozone alternative). SeaweedFS came up clean with `defaultReplication: "000"` and the smoke test passed.

The Ozone path is **not** abandoned — it should work on a multi-node cluster or once a working single-node-replication knob is found. For the MVP it's deferred. A future task: file an issue against `apache/ozone-helm-charts` about the S3G `CREATE_KEY` replication path.

## Stage 1 lessons learned (saved here so we don't repeat them)

1. **Helm v4's server-side apply rejects duplicate `env:` entries.** Charts that append user `env` after helper-injected env (Ozone, others) hit `duplicate entries for key` errors. Workaround: `scripts/helm-plugins/stardelt-dedupe/` — a post-renderer plugin that dedupes name-keyed lists, last-wins (restoring helm v3 behavior). Registered in `up.sh` via `ensure_helm_plugins`.

2. **Helm v4 post-renderer is a plugin, not a path.** `--post-renderer ./script.sh` errors out; you must install a plugin (`apiVersion: v1`, `type: postrenderer/v1`) and pass the plugin name. See [Helm tutorial](https://helm.sh/docs/plugins/developer/tutorial-postrenderer-plugin/).

3. **Ozone S3G's `domain.name` is a strict Host-header whitelist.** Clients connecting via FQDN (`ozone-s3g-rest.stardelt.svc.cluster.local`) get HTTP 500 unless the FQDN is in the whitelist. The chart only ships the short name.

4. **Ozone simple-auth scopes bucket ownership to the access key.** Mixing access keys mid-test orphans buckets (the owner of the old key can still see them, but a different key gets 500 on `head-bucket`). Pin one key and use it throughout.

5. **Lakekeeper warehouse bootstrap is API-only.** There's no Helm value for creating a warehouse. The pattern is a `post-install` Job that POSTs `/management/v1/bootstrap` then `/management/v1/warehouse` — see `deploy/manifests/lakekeeper-bootstrap.yaml`.

6. **Trino's `query.max-memory-per-node` is auto-derived from heap.** With heap = 1 G, the auto-derived value plus heap headroom exceeds the heap and the coordinator refuses to start with `Invalid memory configuration`. Bumping heap to ≥ 2 G fixes it.

7. **CNPG `Cluster` generates a `<name>-app` Secret** with keys `username` / `password` / `dbname`. Lakekeeper's `externalDatabase.userSecretKey` / `passwordSecretKey` default to `postgresql-user` / `postgresql-password`, so override them to `username` / `password`.

8. **Lakekeeper defaults `remote-signing-enabled: true` on new warehouses.** PyIceberg then tries to use a REST-vended STS token that we don't issue, failing with `SignError: Signer set, but token is not available`. Set `remote-signing-enabled: false` in the warehouse `storage-profile` on creation, or PATCH it via `POST /management/v1/warehouse/{id}/storage` after the fact.

9. **Iceberg REST catalog uses optimistic concurrency.** Parallel appends to the same table from multiple Airflow tasks conflict and roll back. Set `max_active_tasks=1` on DAGs that write to a single table, or implement retry-on-conflict.

10. **Apache Airflow `slim-3.x` image omits providers.** The chart assumes `postgres`, `fab`, and `cncf-kubernetes` providers; we install them in the Stardelt-owned Airflow image. Without them the migrations Job fails with `ModuleNotFoundError: psycopg2`, then `auth_manager` import errors, then `airflow.providers.cncf` missing for KubernetesExecutor.

11. **emptyDir storage in stateful pods does not survive pod restart.** SeaweedFS volume/master/filer initially ran on emptyDir; a `helm upgrade` restarted them, the data vanished, and Iceberg metadata pointed at non-existent Parquet files (`FileNotFoundException` on Trino read). All three SeaweedFS components now use `persistentVolumeClaim`.

12. **Superset 5.0 image ships in a uv-managed venv with no pip, no psycopg2, no trino driver.** Bootstrap-script `pip install` fails (`/app/.venv/bin/pip: not found`). Use `uv pip install --python /app/.venv/bin/python ...` in a custom image instead of trying to install at pod startup. Also: default Celery worker `concurrency` matches host CPU count (24+) and OOM-kills with a 1 GiB limit; cap it via the worker `command` override.

13. **Some helm-chart value keys are scalars in older docs but became objects in current charts** (Airflow `workers.enabled`, Superset `supersetNode.replicas`). When a `helm install` fails with `cannot overwrite table with non table`, the offending key in `values.yaml` needs to be an object (`{enabled: true, replicaCount: 1}`), not a number. Always `helm install --dry-run` first when adjusting a new chart.

## Next stages

| Stage | What it adds |
|---|---|
| 3 (in progress) | Stardelt Nova endpoint wiring (catalog browser, SQL editor, query history, Trino health). Scaffold landed. |
| 4 | `stardelt-operator` — minimal `Lakehouse` CRD reconciled into Trino StatefulSet via embedded templates (Rust + kube-rs) |
| 5 | One-command demo: `make up && make airflow-trigger && make pf` end-to-end in &lt;20 min |
