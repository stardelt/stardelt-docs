---
title: "Monitoring and logs"
sidebar_label: "Monitoring and logs"
slug: /operations/monitoring
description: "Scrape the platform's metrics, find the log that answers your question, and measure your own node."
---

# Monitoring and logs

The components that serve Prometheus text on a Service port answer in the platform namespace
(`stardelt` in the quickstart). The four CloudNative-PG databases are the exception: their
instance manager answers on a **pod** port, described under "Database pods" below. stardelt ships
no monitoring stack of its own: your Prometheus, or any compatible system, scrapes these
endpoints, stores the samples and alerts on them.

## What answers today

| Component | Address | First series | Notes |
|---|---|---|---|
| SeaweedFS master | `seaweedfs-master:9327/metrics` | `SeaweedFS_build_info` | |
| SeaweedFS filer | `seaweedfs-filer:9327/metrics` | `SeaweedFS_build_info` | |
| SeaweedFS volume | `seaweedfs-volume:9327/metrics` | `SeaweedFS_build_info` | several disks appear as labels |
| SeaweedFS S3 gateway | `seaweedfs-s3:9327/metrics` | `SeaweedFS_build_info` | bucket object counts and sizes |
| Keycloak | `keycloak:9000/metrics` | `http_server_bytes_written_max` | the management port, not `8080`; only a scraper-labelled pod may read it (`8080` is open for sign-in) |
| Lakekeeper | `lakekeeper:9000/metrics` | `lakekeeper_cache_invalidation_changes_total` | task queue and HTTP counters |
| OpenFGA | `openfga:2112/metrics` | `go_gc_duration_seconds` | needs `telemetry.metrics.enabled` (shipped on) |
| Reloader | `reloader-reloader:9090/metrics` | `reloader_events_processed_total` | |
| Spark operator | `spark-operator-metrics:8080/metrics` | `spark_application_running_count` | |
| The operator | `stardelt-operator-metrics:8082/metrics` | `stardelt_operator_build_info` | also `stardelt_operator_leader`, `stardelt_operator_reconciles_total`, `stardelt_operator_reconcile_duration_seconds`, `stardelt_operator_status_writes_total`, `stardelt_operator_reconcile_errors_total` — see [Operator health](#operator-health) |
| Airflow's statsd exporter | `airflow-statsd:9102/metrics` | `airflow_asset_orphaned` | Airflow sends statsd here; `statsd_exporter_lines_total` counts what arrived |
| Nova | `nova:8081/metrics` | `nova_build_info` | the internal listener; `8080` is the SPA and answers HTML |
| JupyterHub's hub | `hub:8081/hub/metrics` | `python_gc_objects_collected_total` | the only unauthenticated path on 8081; the hub API still needs a token |
| Spark Connect driver | `spark-connect:4040/metrics/executors/prometheus` | `spark_info` | the driver's UI port; the body has no `# TYPE` lines |
| OpenBao | `openbao:8200/v1/sys/metrics?format=prometheus` | `vault_core_active` | opt-in (`make openbao`); the path is not `/metrics` |

A Prometheus that runs in another namespace needs the fully-qualified name,
`<service>.<namespace>.svc.cluster.local:<port>`, for example
`lakekeeper.stardelt.svc.cluster.local:9000`. All of them are HTTP `GET <address>/metrics`.

### Database pods

CloudNative-PG's instance manager answers on a **pod** port, not on a Service. Each of the four
platform databases — `lakekeeper-pg`, `openfga-pg`, `keycloak-pg`, `nova-pg` — serves Prometheus
text on `9187/metrics`; the first series are `cnpg_collector_up` and `cnpg_backends_waiting_total`.
The pods carry `cnpg.io/cluster: <name>` and the container port is named `metrics`.

A plain Prometheus has to scrape the pod IP. A Prometheus Operator selects the pods with a
`PodMonitor`; this one covers the catalog database:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: cnpg-lakekeeper-pg
  namespace: stardelt
spec:
  selector:
    matchLabels:
      cnpg.io/cluster: lakekeeper-pg
  podMetricsEndpoints:
    - port: metrics
      path: /metrics
      interval: 30s
```

Repeat it with the other three cluster names.

## Operator health

The operator reconciles seven kinds (`lakehouse`, `platform`, `connection`, `principal`, `stream_app`,
`spark_cluster`, `catalog`) and reports each one by name:

| Series | What to read it for |
|---|---|
| `stardelt_operator_reconciles_total{controller,result}` | how often each controller ran; `result="error"` is a failed reconcile |
| `stardelt_operator_reconcile_duration_seconds{controller}` | a histogram per controller, buckets from 10 ms to 30 s |
| `stardelt_operator_status_writes_total{controller}` | status patches written, by controller |
| `stardelt_operator_reconcile_errors_total` | every failed reconcile since start, all controllers |
| `stardelt_operator_leader` | `1` on the replica holding the lease, `0` on the other |
| `stardelt_operator_build_info` | the version the pod runs |

**On an idle cluster, `reconciles_total` and `status_writes_total` are almost flat.** A
`status_writes_total` that keeps rising with no change on the cluster is the failure #274 exists
to prevent: one controller writes a status it did not change. Its `controller` label names the
controller. `reconciles_total` rising without a change on the cluster means a requeue is too
short, not that a status is wrong.

`make verify-operator-quiet` in `platform/` measures the same thing over 60 s (no status write,
fewer than two reconciles per object, operator CPU under 50 m, pod traffic under 50 KB/s). It is
listed on [Checks to run](./checks).

## Who may read them

Two groups. Most endpoints accept a request from any pod in the namespace; six are closed to
everything but a pod that carries the label `app.kubernetes.io/name: prometheus`, in any namespace —
the label the Prometheus Operator puts on its own pods:

- **Open to any pod in the namespace:** Reloader `9090`, the Spark operator `8080`, the operator
  `8082`, Airflow's statsd exporter `9102`, Nova `8081`, OpenBao `8200`.
- **Only a pod labelled `app.kubernetes.io/name: prometheus`:** Keycloak `9000`, SeaweedFS `9327`,
  Lakekeeper `9000`, OpenFGA `2112`, JupyterHub's hub `8081` (`/hub/metrics`), the Spark Connect
  driver `4040` at `spark-connect:4040/metrics/executors/prometheus`.

A plain pod gets `connection refused` on those six:

```text
$ curl -s -o /dev/null -w '%{http_code}\n' http://lakekeeper:9000/metrics      # plain pod
000   (connection refused)
$ curl -s -o /dev/null -w '%{http_code}\n' http://keycloak:9000/metrics       # plain pod
000   (connection refused)
```

Run the scraper with that label (`metadata.labels: {app.kubernetes.io/name: prometheus}` on the Pod
template) or the six endpoints stay dark.

Spark Connect is the one gated endpoint whose port is also a user interface: `4040` is the driver's
Spark UI as well as its metrics path, so a scraper-labelled pod can read its jobs, stages and
environment page. The page carries no credential values (they are redacted) and no SQL tab; the
Spark Connect gRPC port `15002` stays limited to members' notebooks.

Keycloak is the one gated endpoint whose other port is deliberately open in-cluster: every platform
component and the ingress controller must reach `8080` to sign in, so the policy restricts that port
only, and `8080` answers any source.

## Turn on the scrape objects

Nothing above needs a switch: the endpoints answer, and any Prometheus can scrape them with the
job you are about to write. The objects that make a **Prometheus Operator** pick them up
automatically are opt-in, because they are custom resources: a cluster without the
`monitoring.coreos.com/v1` CRDs cannot install them.

The umbrella chart renders them with:

```yaml
monitoring:
  enabled: true
  # Added to every rendered object, so your Prometheus selects them.
  labels:
    release: kube-prometheus-stack
```

A platform managed by the operator sets the same values in the resource:

```yaml
spec:
  monitoring:
    enabled: true
    labels:
      release: kube-prometheus-stack
```

With the switch on, stardelt creates one `ServiceMonitor` for each SeaweedFS role, one
`PodMonitor` for each of the four platform databases, and one `PrometheusRule` named
`stardelt-alerts` with these starter alerts: a metrics target is down (`StardeltMetricsTargetDown`),
the operator has no leader (`StardeltOperatorNoLeader`) or is failing reconciles
(`StardeltOperatorReconcileErrors`), the object store has no master
(`StardeltSeaweedFSMasterNotLeader`), a database stopped exporting metrics
(`StardeltCnpgCollectorDown`), and a database has clients waiting
(`StardeltCnpgClientsWaiting`).

The `labels` must match your Prometheus's selector — `serviceMonitorSelector`,
`podMonitorSelector` and `ruleSelector` — or the objects are created but never read. Every rule
carries `runbook_url: https://stardelt.io/docs/operations/monitoring/`.

If `spec.monitoring.enabled` is true and the CRDs are absent, the operator renders nothing and
reports the condition `MonitoringCRDsMissing` (reason `CRDsMissing`). The umbrella chart cannot
check the CRDs: `helm install` fails when they are missing, so leave the switch off there unless
the Prometheus Operator is installed.

## Scrape with a plain Prometheus

A scraper in the platform namespace can use the short names. A `scrape_configs` for all twelve
Service endpoints:

```yaml
scrape_configs:
  - job_name: seaweedfs
    static_configs:
      - targets:
          - seaweedfs-master:9327
          - seaweedfs-filer:9327
          - seaweedfs-volume:9327
          - seaweedfs-s3:9327
  - job_name: keycloak
    static_configs:
      - targets: ['keycloak:9000']
  - job_name: lakekeeper
    static_configs:
      - targets: ['lakekeeper:9000']
  - job_name: openfga
    static_configs:
      - targets: ['openfga:2112']
  - job_name: reloader
    static_configs:
      - targets: ['reloader-reloader:9090']
  - job_name: spark-operator
    static_configs:
      - targets: ['spark-operator-metrics:8080']
  - job_name: stardelt-operator
    static_configs:
      - targets: ['stardelt-operator-metrics:8082']
  - job_name: airflow-statsd
    static_configs:
      - targets: ['airflow-statsd:9102']
  - job_name: nova
    static_configs:
      - targets: ['nova:8081']
```

Every address answers `/metrics`, so `metrics_path` stays at its default. The scraper's Pod needs the
label above, or SeaweedFS, Lakekeeper and OpenFGA are refused.

## Scrape with the Prometheus Operator

A `ServiceMonitor` selects the Service by its labels and by its named port. This one covers
Lakekeeper:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: lakekeeper
  namespace: stardelt
  labels:
    prometheus: main
spec:
  namespaceSelector:
    matchNames: ['stardelt']
  selector:
    matchLabels:
      app.kubernetes.io/name: lakekeeper
      app.kubernetes.io/component: catalog
  endpoints:
    - port: metrics
      path: /metrics
      interval: 30s
```

The labels on the monitor itself (`prometheus: main` above) must match your Prometheus's
`serviceMonitorSelector`, or the monitor is never picked up. The same shape works for every row of
the table; the Service port is named `metrics` for most of them — Reloader's is `http`, Airflow's
statsd exporter's is `statsd-scrape`, and Nova's is `internal`. The label on the scraper Pod still
decides on the six gated endpoints: a monitor for Keycloak, SeaweedFS, Lakekeeper, OpenFGA,
JupyterHub's hub or the Spark Connect driver is read only when the Prometheus Pod carries
`app.kubernetes.io/name: prometheus`.

## What has no Prometheus endpoint

Each entry is what the endpoint answered on a probe pod, and where a credential stopped the probe
the entry says so.

- **Trino** — `trino:8080/metrics` answers `403` with "Authentication over HTTP is not enabled". The
  endpoint needs a Trino user with access to system information; not measured past the refusal.
- **Superset** — no endpoint: `superset:8088/metrics` is `404`.
- **Airflow's api-server** — no Prometheus endpoint: `/metrics` returns the UI page, and Airflow's
  metrics go to the statsd exporter in the table above.
- **JupyterHub's proxy** — no endpoint: `proxy-api:8001/metrics` is `404` once a probe carries the
  label its NetworkPolicy asks for (`hub.jupyter.org/network-access-proxy-api: true`); without it the
  connection is refused.

## Check the endpoints

`NS=stardelt make verify-metrics` creates one probe pod with the scraper label, curls every
installed Service target and prints one `✓` or `✗` line per endpoint, ending with `PASS (N of N)`.
It skips a component that is not installed, and it leaves no pod behind. The four database pods are
not part of it: they are pod ports, not Service ports, which is why this page shows their
`PodMonitor` by hand.

## What stardelt does not ship

No Prometheus, Grafana, Loki, Jaeger or alertmanager, and no dashboards. The scrape objects and the
six starter alerts are configuration, not a stack: they are rendered into your cluster only when
you turn them on, and your Prometheus reads them. [The licence table](../architecture/licenses)
lists what stardelt itself ships. The endpoints above are the whole contract —
[Production](./production) lists what else an operator team owns.

## What the queries cost

The **Queries** / **Usage** switch in the query log's header changes what the same window reports. **Usage**
answers the other question: not "what ran" but "what did it cost, and who used the most". It shares the **Mine** /
**Team** / **Everyone** scopes and the time range with the list, so you can compare the two views over the same
rows: [Who sees what](../guides/query-log#who-sees-what) applies unchanged.

At the top it adds the window up: queries, CPU time, data read and failures. Below, one row per
person (per **Warehouse** under **Mine**), heaviest CPU first. Under **Team** and **Everyone** the
table is headed **Who used the most compute**; under **Mine** it is **By warehouse**. The columns:

| Column | Meaning |
|---|---|
| Person | The engine user, or the warehouse under **Mine** |
| Queries | How many ran in the window |
| CPU time | Time the engine spent on their queries, with a bar relative to the heaviest row |
| Data read | Bytes read from storage |
| Data written | Bytes written by inserts, `CREATE TABLE AS` and pipeline writes |
| Failed | Queries that ended in failure |

**Per day** draws one bar per UTC day of the window, so a spike points at the day to open in the list.
The compute rows are not links: switch back to **Queries**, keep the time range, and search for the person or
warehouse there. A storage row opens that catalog's page.

Usage is summed when you open the view and refreshed once a minute, not streamed like the list. An
empty window says **No queries in this window.** — widen the time range or switch the scope.

**Storage by catalog** lists each catalog you may browse, largest first, with its tables, records
and size. The size is what the catalog's own Iceberg metadata reports — the data files its tables
know about — not the object store's total, so a bucket that also holds backups or other files does
not inflate it. It is refreshed with the rest of the view, and a catalog whose first scan has not
finished yet is left out. A person who may browse no catalog sees no section.

## Logs

Every part of the platform writes its logs where the component already keeps them; this page says
which one to open for which question. The commands use the namespace `stardelt` — replace it with
your namespace.

### Who changed what (audit)

Nova writes one structured line per **mutating** request to its API on the `audit` target: actor,
subject, how they authenticated, method, path and status. Reads are not recorded — they are the
overwhelming majority of the traffic and would bury the signal. The line carries the action, never
its content: no query string, no request body, no secret value.

```bash
kubectl -n stardelt logs deploy/nova | grep 'target=audit'
```

```text
INFO audit: mutating request actor="admin" sub="52f3331c…" via=session method=POST path=/query status=200
```

The audit target is on at `info` in the deployed Nova, so the lines are already in its stdout. To
send them somewhere else, route the target apart from the application log with
`RUST_LOG=audit=info,info`: everything `audit` stays a separate stream a log collector can pick up.

Refusals land on the same target, from the middleware that refused: a `403` names the caller and the
path. So does opening another person's query as an administrator. Connection events are on the target
too, and they carry the *names* of the fields that changed, never a value.

**Retention.** Nothing keeps these lines beyond the container's own log on the node; a pod restart
ends them. `kubectl -n stardelt logs deploy/nova --previous` reads the last container that ended.

**What it does not contain.** No statement text (that is the query log, below), no request or
response bodies, and no value of a secret.

### Which statements ran (query log)

The **Query log** page in Nova lists the statements the engine ran — what, where it came from, how
long it took, how many rows, and why it failed — with the whole statement in the row's details. The
same data is the API `GET /api/query-log`, and `GET /api/query-log/{id}` is one query.

| `scope` | What it returns |
| --- | --- |
| `mine` (default) | The statements the caller ran, whoever sent them |
| `team` | The statements of the service principals the caller's groups own — in practice the scheduled pipelines and notebook runs of the group |
| `all` | Everyone's; administrators only, everyone else gets `403` |

The list takes `state`, `warehouse`, `q`, `from`, `to`, `limit` and `cursor` as well, which is what
the page's chips, search and paging fill in. [The query log](../guides/query-log) explains what each
column means.

**Retention.** `NOVA_QUERY_LOG_RETENTION_DAYS` days, `90` by default; Nova purges hourly, and `0`
turns the purge off so rows are kept until the database is cleaned by hand.

**Somebody else's query** is visible to an administrator only, and opening one writes an audit line
(above). With `NOVA_QUERY_LOG_REDACT_LITERALS=1`, another person's statement shows `?` in place of
every string literal; the owner always sees their own text in full.

**What it does not contain.** No result rows, and nothing at all when Nova runs without a state store
(`NOVA_DATABASE_URL` unset): the log lives in that database. The engine's events reach Nova on a
best-effort path, so a lost event costs one row and never delays a query.

### Why a run failed (pipelines and notebooks)

The **Runs** page in Nova lists every run you can see. Open one run:

- its **tasks**, each with its log — that is the task's own output from the scheduler, paged, one
  attempt at a time (`GET /api/pipelines/{namespace}/{name}/runs/{run_id}/tasks/{task_id}/logs`);
- for a notebook run, the **executed notebook** with every cell's output — that is the run's real log.

The scheduler's own UI is the other view: DAG parsing, queueing and task attempts before and around
the run. It is for administrators.

**Retention.** Nova copies nothing: a task log is the scheduler's and lives as long as it keeps the
run's task instances.

**What it does not contain.** A run that failed before its first task started — the DAG did not
parse, the scheduler is down — is only in the scheduler's UI, not on the **Runs** page.

Related guides: [Schedule SQL and notebooks](../guides/schedule).

### Table maintenance

Every Catalog in the platform runs maintenance on a schedule. To see how the last run went:

```bash
kubectl -n stardelt get catalogs
```

Each one's `status.maintenance` names the last run, its result and how many tables it handled. The
job is the CronJob `maint-<catalog>`; its newest Job's log is the run itself:

```bash
kubectl -n stardelt get jobs --sort-by=.metadata.creationTimestamp | grep 'maint-<catalog>'
kubectl -n stardelt logs job/<job-name>
```

`make verify-maintenance` proves the job, the schedule and the newest run in one go — see
[Checks to run](./checks).

**What it does not contain.** The Catalog keeps the last run only; earlier ones are their Jobs' logs,
subject to the CronJob's history limit.

### The platform's own components

The components run as ordinary workloads, so `kubectl` is the reader:

| Component | Command |
| --- | --- |
| Trino | `kubectl -n stardelt logs deploy/trino-coordinator` and `deploy/trino-worker` |
| Lakekeeper | `kubectl -n stardelt logs deploy/lakekeeper` |
| Airflow | `kubectl -n stardelt logs deploy/airflow-scheduler`, `deploy/airflow-api-server`, `deploy/airflow-dag-processor`, `deploy/airflow-triggerer` |
| Superset | `kubectl -n stardelt logs deploy/superset` and `deploy/superset-worker` |
| Keycloak | `kubectl -n stardelt logs deploy/keycloak` |
| Nova | `kubectl -n stardelt logs deploy/nova` |
| The operator | `kubectl -n stardelt logs deploy/stardelt-operator` |

`kubectl -n stardelt get pods` names the rest. Add `--tail=100` for the end of a long log, `-f` to
follow it, and `--previous` after a crash to read the container that ended.

What the cluster itself says about a workload — scheduling, image pulls, probe failures, restarts —
is an event:

```bash
kubectl -n stardelt get events --sort-by=.lastTimestamp | tail -20
```

The **Platform** page in Nova is the quickest overall view for administrators: it lists the
platform's services with their live status.

### What is not here

There is no central log store and no search across components. This page is the index and `kubectl`
is the reader, so each source is only as complete as the component that wrote it. Collecting and
searching them in one place is planned, not promised: the [roadmap](../roadmap) names the work that
is planned.

## Performance baseline

The sizing numbers on [Running stardelt in production](./production) come from this harness, and
they are node-specific: CPU, memory, disks and the network between them decide what a query costs.
Run the baseline on the node you plan to use before you choose its size, and again after you change
it.

### What it measures

Engine wall time for three fixed TPC-H queries — `q1_aggregate`, `q6_filter` and `q3_join` — on the
`tpch` connector: planning, scheduling, execution and result paging, timed on the client from the
`POST /v1/statement` to the last `nextUri` page.

It measures the engine and nothing else. It does not measure permission overhead, Iceberg or
Lakekeeper, or Spark. The `tpch` and `tpcds` catalogs are administrator-only by design
(`helm-values/trino-identity.yaml`), so a run uses an administrator token and its numbers are the
engine's alone.

### Run it

Mint an administrator token with the existing script, then run the baseline:

```bash
MINT_ONLY=1 TOKEN_FILE=/tmp/perf.token \
  ISSUER=https://id.alpha.dev.stardelt.io/realms/stardelt \
  USER=<admin user> PASSWORD=<its password> \
  CLIENT_SECRET_FILE=<(kubectl -n stardelt get secret stardelt-oidc-clients -o jsonpath='{.data.trino}' | base64 -d) \
  python3 scripts/verify-trino-auth.py
TRINO_URL=https://trino.alpha.dev.stardelt.io TRINO_TOKEN="$(cat /tmp/perf.token)" \
  python3 perf/baseline.py
```

`make perf-baseline` runs `perf/baseline.py` with `TRINO_URL` and `TRINO_TOKEN` read from the
environment (`Makefile:131-132`). Credentials are never committed: the token file is temporary and
the secret is read from the cluster at mint time.

### Settings

| Variable | Default | Effect |
|---|---|---|
| `PERF_CATALOG` | `tpch` | the catalog the three queries run in |
| `PERF_SCHEMA` | `sf1` | the schema; `sf10` needs only `PERF_SCHEMA=sf10`, no code change |
| `PERF_RUNS` | `3` | runs per query; the first run of each is discarded (cold JVM, cache, S3 listing), and `PERF_RUNS=1` reports the single run as-is |
| `PERF_CONCURRENCY` | `1,2,4,8` | one table of N people running `q6_filter` at the same moment, with p50/p95/max and errors per level; `0` skips it |
| `PERF_PER_WORKER` | `5` | statements per person at each concurrency level |

### How to read it

The single-query table reports rows, median, p95 and min in milliseconds. The concurrency table
reports p50, p95, max, errors and wall time for each level. Read the level where p95 bends upwards:
that is the concurrency this node holds before people wait, and the number to size against.

Results are written to `perf/results/<UTC timestamp>.json` and are git-ignored. Tables for a release
belong in the internal repository, not in a pull request.

### What it does not replace

This is a baseline for one node, not a benchmark suite: it runs three fixed queries, with one
administrator identity, against a synthetic catalog. Re-run it after a resize, a node change or a
Trino upgrade. A broader benchmark suite is not available yet.
