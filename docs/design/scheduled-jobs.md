---
title: "Scheduled jobs and pipelines"
sidebar_label: "Scheduled jobs"
slug: /design/scheduled-jobs
---

# Scheduled jobs and pipelines

**Status:** proposed design. Covers what Databricks calls Jobs and Workflows: a data engineer or analyst
defines work (SQL, Spark, a notebook, dbt), a schedule and dependencies, and the platform runs it, retries it,
shows the runs and alerts on failure. Inputs: master spec §5 rows 6, 7, 12, 14 (`Pipeline`, Airflow 3, dbt,
Spark), [multi-warehouse design](https://github.com/stardelt/stardelt-docs/issues/64) (SQL warehouses, grants),
[security model](../architecture/security-model), [docs#1](https://github.com/stardelt/stardelt-docs/issues/1)
(declarative pipelining). Facts about the running system were checked on 2026-10-18.

## 1. What exists today

| Piece | State | Consequence |
|---|---|---|
| Airflow 3.2, `KubernetesExecutor` | Running: api-server, scheduler, dag-processor, triggerer, statsd, Postgres ≈ **1.1 GiB** live | The engine is chosen (spec §5 row 6); the cost is known |
| DAG source | **Baked into the image** `ghcr.io/stardelt/airflow:demo`; git-sync is off | A user cannot add a job without an image build. This is the first blocker |
| Task logs | `remote_logging = False`, no log persistence | With `KubernetesExecutor` the pod ends and **the log is gone** |
| Task identity | The demo DAG uses the shared S3 admin key and talks to the catalog directly | No user identity, no policy, no audit |
| `Pipeline` CRD | `steps[]` (`sql`, `python`, `dbt`, `quality`), optional `schedule`, `engine: airflow \| spark`; **no controller** | The contract exists, nothing executes it |
| Spark | One always-on Spark Connect Deployment (≈ 560 MiB idle), shared identity, no authentication ([platform#90](https://github.com/stardelt/stardelt-platform/issues/90)) | Fine for notebooks; not a job runtime |
| Nova "Jobs" | An in-memory feed of queries, loads and transfers | It is an activity log, not a scheduler |
| Trino | Every statement needs a Keycloak token; tokens carry the user or service identity | A scheduled SQL task needs a *service* token |

## 2. What a user should be able to do

1. **Analyst:** in the SQL editor press *Schedule*, pick a cadence and a target table, done. (Databricks: schedule a query/notebook.)
2. **Engineer:** write a multi-task pipeline (SQL → dbt → quality gate → notify) with dependencies, retries, parameters.
3. **Engineer:** schedule a notebook or a PySpark job with a chosen size.
4. **Anyone on the team:** see every run, its tasks, durations and logs; rerun, cancel, pause.
5. **Owner:** get an alert when a run fails or is late; review who changed a definition.
6. **Platform team:** keep definitions in git, review them, deploy them with CI.

## 3. Decisions

| # | Question | Decision | Reason |
|---|---|---|---|
| 1 | Unit | One object, **`Pipeline`** (a "job" is a pipeline with one task). Replace linear `steps[]` by `tasks[]` with `dependsOn`, plus `trigger`, `params`, `retries`, `timeout`, `runAs`. v1alpha1 may break: nothing consumes it yet | Databricks does the same (a job has tasks); one concept to learn |
| 2 | Engine | **Airflow 3 executes; the `Pipeline` CR is the source of truth.** A generic loader DAG file in the Airflow image reads `Pipeline` resources through the Kubernetes API (read-only ServiceAccount) in the dag-processor and builds one DAG per resource | Airflow cannot create DAGs through an API; this keeps definitions declarative and removes image rebuilds. The "bring your own Python DAG" route stays for experts (git-sync bundle) and is labelled *trusted* |
| 3 | Who writes the CR | **Nova** (its ServiceAccount, with a Role limited to `Pipeline` in the user's tenant namespace) on behalf of an authenticated user; GitOps/`kubectl` for the platform team. Users never need `kubectl` | Spec principle 2: Nova edits CRDs, the operator reconciles |
| 4 | What the operator does | Validates (CEL), creates/links the run-as principal, mirrors run status into `status`, garbage-collects. It does **not** run tasks | Execution stays in one place (Airflow) |
| 5 | Identity of a run | `runAs` names a **service principal** (Keycloak client-credentials client, one per Tenant by default, `pipeline-<tenant>`). The creator must belong to the owner group. Grants are given to that principal, like any user | Databricks run-as service principal. A user token cannot be used: it expires and the user may leave |
| 6 | Execution classes | **Governed:** `sql`, `dbt`, `quality`, `notebook` reach data only through Trino with the run-as token, so catalog policy applies. **Trusted:** `spark-*`, `python`, `container` read object storage directly with an S3 key, so they bypass table policy until vended credentials work | Honest about the architecture: without STS (`sts-enabled: false`) an engine with an S3 key can read any table in that bucket. Trusted tasks are admin-only in v1 |
| 7 | Spark | Batch jobs: **one `SparkApplication` per run** (kubeflow `spark-operator`, as the plug matrix says), sized per task; Spark Connect stays for notebooks | Per-run isolation, no always-on cost for scheduled work. Needs the Spark operator chart pinned (row 14 is "no repo, no pin" today) |
| 8 | Notebook tasks | Run the notebook with `papermill` in a pod from the stardelt notebook image, with the run-as token in the environment exactly like the hub injects `TRINO_TOKEN`; the executed notebook is stored as the run output | Reuses the shipped identity mechanism; governed |
| 9 | Logs and history | Airflow remote logging to `s3://platform/airflow-logs/` (SeaweedFS); Nova reads runs and logs from Airflow's REST API v2 through its backend | Without remote logs nothing can be shown after a task pod exits |
| 10 | Triggers | v1: cron with timezone, manual. v2: Airflow **assets** (table updated, file arrived). No catch-up by default; backfill is an explicit action | Matches Databricks defaults; avoids surprise reruns |
| 11 | Alerts | `onFailure`, `onLate` notifications through the alerting stack ([platform#94](https://github.com/stardelt/stardelt-platform/issues/94)); until it exists, a webhook field | One alerting path |
| 12 | CLI | None. Declarative YAML + `kubectl`/GitOps; `validate` is a CI step against the CRD schema. This proposal answers [docs#17](https://github.com/stardelt/stardelt-docs/issues/17) with "declarative manifests replace the CLI" | Fewer tools |

## 4. The contract

```yaml
apiVersion: stardelt.io/v1alpha1
kind: Pipeline
metadata:
  name: daily-trips
  namespace: team-analytics
  annotations: { stardelt.io/owner-group: analytics }
spec:
  schedule: { cron: "0 3 * * *", timezone: Europe/Berlin }   # omit for manual only
  runAs: pipeline-team-analytics          # service principal; must be in the owner group's tenant
  params: { days: "1" }
  retries: { attempts: 2, backoff: 5m }
  timeout: 2h
  concurrency: Forbid                     # Allow | Forbid | Replace, like CronJob
  onFailure: { webhook: https://hooks.example/alert }
  tasks:
    - name: load
      kind: sql                           # governed
      warehouse: default                  # SqlWarehouse (multi-warehouse design)
      sql: |
        INSERT INTO warehouse.analytics.trips
        SELECT * FROM warehouse.raw.trips WHERE ds = DATE '${run.date}'
    - name: model
      kind: dbt
      dependsOn: [load]
      project: { git: "https://git.example/analytics-dbt", ref: main }
      select: "tag:daily"
    - name: check
      kind: quality                       # fails the run; blocks downstream
      dependsOn: [model]
      checks: ["row_count > 0"]
    - name: score
      kind: spark-python                  # trusted: admin-only in v1
      dependsOn: [check]
      script: { configMapRef: score-job, key: main.py }
      size: { driver: 1Gi, executors: 2, executorMemory: 2Gi }
status:
  phase: Active                           # Active | Paused | Invalid
  conditions: [ ... ]                     # operator conventions (Ready, observedGeneration)
  lastRun: { id: "scheduled__2026-10-18T03:00", state: succeeded }
```

Task kinds: `sql`, `dbt`, `quality`, `notebook`, `ingest` (references an `IngestionSource`), and the trusted
`spark-sql`, `spark-python`, `python`, `container`. Templating: `${run.date}`, `${run.id}`, `${params.x}` expand at run
time (not in the CR). Idempotency is the author's job; the docs recommend `MERGE` or partition overwrite and the
`quality` gate.

## 5. Architecture

```
 Nova (Schedule button, Pipelines page)         GitOps / kubectl (platform team)
        │ creates/edits Pipeline (Nova SA, tenant namespace)    │
        └──────────────────────────┬──────────────────────────────┘
                                   ▼
                       Pipeline CR  ──► operator: validate, run-as link, status mirror
                                   │ (read-only list/watch)
                                   ▼
        Airflow dag-processor ── loader DAG file builds one DAG per Pipeline
                                   ▼
        Airflow scheduler ──► KubernetesExecutor task pods
              ├─ sql / dbt / quality / notebook ──► Trino (run-as token) ──► Lakekeeper + S3   [governed]
              └─ spark-* / python / container ───► SparkApplication / pod (S3 key)             [trusted]
                                   ▼
              logs ► s3://platform/airflow-logs/    runs ► Airflow REST API v2 ► Nova Runs page
```

## 6. Phases (each demoable on its own)

| Phase | Content | Demo | Needs |
|---|---|---|---|
| **J0 plumbing** | Remote task logs to SeaweedFS; loader DAG + read-only ServiceAccount; a run-as principal for Trino (client credentials); `sql` task | `kubectl apply` a one-task `Pipeline`; a row appears in a table on schedule; the log survives the pod | spikes J1, J2, J3 |
| **J1 Nova** | *Schedule* in the SQL editor creates the CR; Pipelines page: list, runs, task states, logs, run now, pause | an analyst schedules a query and sees its runs | J0, Nova Role for `Pipeline`, nova ticket on the audit log |
| **J2 DAGs** | `tasks[]`/`dependsOn`, retries, params, `dbt`, `quality`, `notebook`, alerts | the example in §4 minus Spark | tenancy RFC ([operator#50](https://github.com/stardelt/stardelt-operator/issues/50)) for per-tenant principals |
| **J3 Spark** | Pinned Spark operator, `spark-*` tasks as `SparkApplication`, admin-only | a PySpark job on a schedule with its own executors | spike J4; memory (§7) |
| **J4 triggers and governance** | assets triggers, backfill action, lineage to OpenMetadata, vended credentials to retire the "trusted" class | a table update triggers a downstream pipeline | STS spike, OpenMetadata (spec P1) |

## 7. Resources on the single dev node

Airflow already costs ≈ 1.1 GiB; Spark Connect ≈ 0.56 GiB idle; the node was at 66-80 % of 7.8 GiB during this
review. J0-J2 add no always-on pods (the loader runs inside the dag-processor; task pods are short-lived and
should be capped at 512 MiB each, one at a time: `max_active_tasks=2`). Turning off the Airflow **triggerer**
(264 MiB, only needed for deferrable operators) and **statsd** (8 MiB) saves ≈ 270 MiB. J3 per-run Spark drivers
and executors (1 GiB each) fit only when no other heavy job runs; a 16 GB node is the supported baseline for Spark.

## 8. Spikes (answers needed before the J0 tickets are written)

| Spike | Question | Output |
|---|---|---|
| J1 | Can the Airflow 3.2 dag-processor list `Pipeline` resources through the Kubernetes API fast enough (parse interval, timeout), and how is a deleted CR removed? Alternative: operator renders specs into ConfigMaps mounted into the dag-processor | a working loader DAG for two sample CRs, parse time measured |
| J2 | Does Trino accept a Keycloak client-credentials token (`aud: trino`, `sub` = service client) for a task pod, and can Lakekeeper grants name that principal? | a `trino` CLI run with the service token that reads one table and is refused another |
| J3 | Does Airflow remote logging to SeaweedFS (`remote_base_log_folder=s3://…`, custom endpoint, path style) work with the shared S3 secret? | a finished task whose log is readable after the pod is gone |
| J4 | Is the kubeflow `spark-operator` chart pinnable and does Airflow's `SparkKubernetesOperator` drive its `SparkApplication`? Memory of one minimal run? | a pinned chart version and one scheduled `SparkApplication` run |
| STS | Can SeaweedFS vend scoped, short-lived credentials (STS / `AssumeRole`) through Lakekeeper? (also gates the "trusted" class, see the multi-warehouse design) | yes/no with a test |

## 9. Consequences

- Positive: users define jobs without image builds or Python; one object for jobs and pipelines; every governed task runs under an identity that policy and audit can name; the same CR works from Nova, kubectl and GitOps.
- Cost: a loader inside Airflow is custom code that must be correct and tested; the run-as principals need the tenancy and identity RFCs; remote logging adds object-store traffic.
- Risk: the trusted class is a real hole until vended credentials exist, which is why it is admin-only and visible in the UI.
- Rejected: Dagster/Prefect as a second engine (spec says one); Argo Workflows as the scheduler (no data-aware features, second engine); a stardelt-owned scheduler (large build, no benefit).
