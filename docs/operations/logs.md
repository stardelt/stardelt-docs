---
title: "Where the logs are"
sidebar_label: "Where the logs are"
slug: /operations/logs
---

# Where the logs are

Every part of the platform writes its logs where the component already keeps them; this page says
which one to open for which question. The commands use the namespace `stardelt` — replace it with
your namespace.

## Who changed what (audit)

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

## Which statements ran (query log)

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

## Why a run failed (pipelines and notebooks)

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

Related guides: [Schedule a SQL pipeline](../guides/schedule-sql), [Published notebooks](../guides/published-notebooks).

## Table maintenance

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

## The platform's own components

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

## What is not here

There is no central log store and no search across components. This page is the index and `kubectl`
is the reader, so each source is only as complete as the component that wrote it. Collecting and
searching them in one place is planned, not promised: the [roadmap](../roadmap) names the work that
is planned.
