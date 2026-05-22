---
title: "Implementation log"
sidebar_label: "Implementation log"
slug: /developer/implementation-log
---

# Implementation log

A running engineer's log of how the stardelt MVP came together. This is
contributor-facing — it captures stage progress, decisions, and lessons
learned that aren't visible from the code or git history alone.

For user-facing install steps see the [Getting Started](../getting-started/local-kind)
section.

## Stage progress

- **Stage 1 — done.** kind + SeaweedFS + Lakekeeper + Trino, smoke test passes.
- **Stage 2 — done.** Apache Airflow installed; `nyc_taxi_load` DAG loads NYC
  TLC yellow-taxi Parquet via pyiceberg into `warehouse.nyc_taxi.yellow_trips`.
- **Stage 3 — done (first draft).** stardelt Nova up. Rust + axum backend
  proxies Lakekeeper + Trino, serves the built UI as static assets. Vite /
  React / TS / Tailwind UI has Overview, Catalog (namespace + table tree,
  schema view), Query (textarea editor + results table + localStorage history),
  and Health (auto-refreshing Trino info). Single pod (`stardelt/nova:dev`),
  reach via `kubectl port-forward svc/nova 8080:8080`.
- **Stage 3.5 — done.** Apache Superset added as the BI / dashboard component.
  Reachable two ways: dedicated app at `http://localhost:8089` (via
  `make superset-ui`) and embedded inside Nova at `/dashboards` (iframe).
  Trino warehouse pre-registered as the "Trino Warehouse" database connection.
- **Stages 4–5 pending** (Lakehouse CRD operator, one-command demo).

## Stage 2 — Apache Airflow + nyc_taxi_load DAG

The data loader is a real Airflow DAG, not a one-shot Job. This costs more
cluster resources (~4 extra pods) but uses the canonical stardelt orchestration
component instead of a throwaway.

**Image:** `stardelt/airflow:dev` — `apache/airflow:slim-3.2.0-python3.12` plus
the providers that ship outside the slim image (`postgres`, `fab`,
`cncf-kubernetes`) plus `pyiceberg` / `pyarrow` / `httpx` plus DAGs baked in via
`COPY dags/`. Built and `kind load`-ed by `scripts/build-images.sh`.

**DAG** (`dags/nyc_taxi_load.py`): dynamic task mapping over `(year, month)`
pairs. Each task downloads one TLC Parquet, normalises schema drift (TLC
renamed / added columns across 2019–2023), and appends to
`warehouse.nyc_taxi.yellow_trips`. Partitioned by `pickup_year_month` (int
`YYYYMM`).

**Concurrency:** `max_active_tasks=1`. Iceberg REST catalog uses
optimistic-concurrency commits — parallel appends to one table conflict and
roll back. Serial is cheap (~3 min for 12 months) because downloads dominate.

**Idempotency:** each task checks `table.inspect.partitions()` for its own
`pickup_year_month` and short-circuits if rows already present. Re-running the
DAG is safe.

**Configuration** via the chart's `env` + `extraEnv` blocks:

- Plain values: `CATALOG_URI`, `CATALOG_WAREHOUSE`, `YEARS` (default `"2023"`;
  set to `"2019-2023"` for the full 5-year load).
- Secret refs (`extraEnv` templated string): `S3_ENDPOINT`, `S3_ACCESS_KEY`,
  `S3_SECRET_KEY`, `S3_REGION` all from the `stardelt-s3-creds` Secret.

**Persistence:** SeaweedFS master / volume / filer use `persistentVolumeClaim`
storage (not emptyDir). emptyDir wipes on pod restart and leaves Iceberg
metadata pointing at non-existent files (`FileNotFoundException` on Trino
reads). PVC-backed storage survives across helm upgrades and Docker Desktop
restarts.

## Stage 3.5 — Apache Superset

Superset is the display layer. It sits beside Trino and runs SQL against the
same `warehouse` catalog over Iceberg-on-SeaweedFS. The chart's bundled
Postgres + Redis back it; no shared resources with the rest of the stack.

**Image** (`stardelt/superset:dev`, `superset-image/Dockerfile`):
`apachesuperset:5.0.0` with `psycopg2-binary` + `trino` SQLAlchemy driver
baked in via `uv pip install` inside the upstream venv (the 5.0 image ships
neither). Built and `kind load`-ed by `scripts/build-images.sh`.

**Trino connection** is pre-registered through
`init.extraConfigs.import_datasources.yaml`:

```
trino://stardelt-dev@trino.stardelt.svc.cluster.local:8080/warehouse
```

Database name visible in Superset: **Trino Warehouse**. Verified from inside
the Superset pod that `SELECT pickup_year_month, COUNT(*) FROM nyc_taxi.yellow_trips GROUP BY 1`
returns ~3 M rows per month, matching what Nova's Query view shows.

**Embedded vs. dedicated:**

| Aspect | Dedicated app (`make superset-ui` → :8089) | Embedded in Nova (`/dashboards`) |
|---|---|---|
| User flow | Open Superset directly, login admin/admin | Open Nova, click *Dashboards*, login in iframe |
| Best for | Heavy chart authoring, dashboard editing | Casual viewing inside Nova's nav |
| Production posture | Real auth via Keycloak SSO, dedicated DNS | Needs Superset's guest-token feature |
| Cross-origin caveats | None | Browser must reach both port-forwards (8080 + 8089) |
| Security trade-off in MVP | Default | `TALISMAN_ENABLED = False` + `HTTP_HEADERS = {}` to allow iframe — drops CSP / X-Frame-Options. MVP-only |

**Recommendation:** keep both. Heavy users go directly to Superset; the
embedded path is the "first impression" inside Nova so a data engineer doesn't
have to context-switch. Production hardening (Stage 5+) replaces the iframe
with Superset's Embedded SDK using guest tokens and uses Keycloak SSO for both
apps.

## Lessons learned

These are gotchas we hit so the next contributor doesn't have to.

1. **Helm v4's server-side apply rejects duplicate `env:` entries.** Charts
   that append user `env` after helper-injected env hit
   `duplicate entries for key` errors. Workaround:
   `scripts/helm-plugins/stardelt-dedupe/` — a post-renderer plugin that
   dedupes name-keyed lists, last-wins (restoring helm v3 behaviour).
   Registered in `up.sh` via `ensure_helm_plugins`.

2. **Helm v4 post-renderer is a plugin, not a path.**
   `--post-renderer ./script.sh` errors out; you must install a plugin
   (`apiVersion: v1`, `type: postrenderer/v1`) and pass the plugin name.

3. **Lakekeeper warehouse bootstrap is API-only.** There's no Helm value for
   creating a warehouse. The pattern is a `post-install` Job that POSTs
   `/management/v1/bootstrap` then `/management/v1/warehouse` — see
   `deploy/manifests/lakekeeper-bootstrap.yaml`.

4. **Trino's `query.max-memory-per-node` is auto-derived from heap.** With
   heap = 1 GiB, the auto-derived value plus heap headroom exceeds the heap
   and the coordinator refuses to start with `Invalid memory configuration`.
   Bumping heap to ≥ 2 GiB fixes it.

5. **CNPG `Cluster` generates a `<name>-app` Secret** with keys `username` /
   `password` / `dbname`. Lakekeeper's `externalDatabase.userSecretKey` /
   `passwordSecretKey` default to `postgresql-user` / `postgresql-password`,
   so override them to `username` / `password`.

6. **Lakekeeper defaults `remote-signing-enabled: true` on new warehouses.**
   PyIceberg then tries to use a REST-vended STS token that we don't issue,
   failing with `SignError: Signer set, but token is not available`. Set
   `remote-signing-enabled: false` in the warehouse `storage-profile` on
   creation, or PATCH it via `POST /management/v1/warehouse/{id}/storage`
   after the fact.

7. **Iceberg REST catalog uses optimistic concurrency.** Parallel appends to
   the same table from multiple Airflow tasks conflict and roll back. Set
   `max_active_tasks=1` on DAGs that write to a single table, or implement
   retry-on-conflict.

8. **Apache Airflow `slim-3.x` image omits providers.** The chart assumes
   `postgres`, `fab`, and `cncf-kubernetes` providers; we install them in
   the stardelt-owned Airflow image. Without them the migrations Job fails
   with `ModuleNotFoundError: psycopg2`, then `auth_manager` import errors,
   then `airflow.providers.cncf` missing for KubernetesExecutor.

9. **emptyDir storage in stateful pods does not survive pod restart.**
   SeaweedFS volume / master / filer initially ran on emptyDir; a
   `helm upgrade` restarted them, the data vanished, and Iceberg metadata
   pointed at non-existent Parquet files. All three SeaweedFS components
   now use `persistentVolumeClaim`.

10. **Superset 5.0 image ships in a uv-managed venv with no pip, no
    psycopg2, no trino driver.** Bootstrap-script `pip install` fails
    (`/app/.venv/bin/pip: not found`). Use
    `uv pip install --python /app/.venv/bin/python ...` in a custom image
    instead of trying to install at pod startup. Default Celery worker
    `concurrency` matches host CPU count (24+) and OOM-kills with a 1 GiB
    limit; cap it via the worker `command` override.

11. **Some helm-chart value keys are scalars in older docs but became objects
    in current charts** (Airflow `workers.enabled`, Superset
    `supersetNode.replicas`). When a `helm install` fails with
    `cannot overwrite table with non table`, the offending key in
    `values.yaml` needs to be an object (`{enabled: true, replicaCount: 1}`),
    not a number. Always `helm install --dry-run` first when adjusting a new
    chart.

## Next stages

| Stage | What it adds |
|---|---|
| 4 | `stardelt-operator` — minimal `Lakehouse` CRD reconciled into Trino StatefulSet via embedded templates (Rust + kube-rs) |
| 5 | One-command demo: `make up && make airflow-trigger && make pf` end-to-end in &lt; 20 min |
