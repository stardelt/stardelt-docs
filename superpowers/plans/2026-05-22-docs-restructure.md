# Docs Restructure (issue #2) Implementation Plan

> **SUPERSESSION (2026-05-22, mid-execution):** Task 8 (ADR 001 — SeaweedFS over Ozone) is **dropped**. Per user decision while executing this plan, Ozone is removed from the project entirely (we're at the start of the project, no real backward compatibility to preserve). Effects on this plan:
> - **Task 8 is skipped**; the placeholder file at `docs/developer/decisions/001-seaweedfs-over-ozone.md` is deleted along with the empty `decisions/` directory.
> - **Task 4 (local-kind.md)** drops the "Secret name is `ozone-s3-creds` for backward compatibility" callout. The Secret is renamed `stardelt-s3-creds`.
> - **Task 6 (implementation-log.md)** drops the "Storage layer" section and the Ozone-specific lessons (originally lessons 3 and 4); other lessons renumber.
> - **Task 7 (contributing.md)** drops the "Adding a new ADR" sub-section.
> - **Task 9 (developer/index.md)** drops the ADR listing.
> - **Task 10 (components-impl.md)** drops the "Component decisions captured as ADRs" section.
> - **Task 11 (sidebars.ts wiring + final verify)** drops the `decisions/001-seaweedfs-over-ozone` sidebar entry and curl check.
> - A parallel cross-repo refactor in `stardelt-platform`, `stardelt-demos`, and the parent `CLAUDE.md` renames `ozone-s3-creds` → `stardelt-s3-creds`, `OZONE_ACCESS_KEY` → `S3_ACCESS_KEY`, `OZONE_SECRET_KEY` → `S3_SECRET_KEY`, and deletes the `/var/lib/ozone` kind hostMount (SeaweedFS uses PVCs, the mount was dead).
> - Already-shipped architecture docs (`docs/architecture/*`, `docs/design/master-spec.md`, `docs/diagrams/*`, `docs/roadmap.md`) are rewritten to make SeaweedFS the primary storage component; Ozone is no longer mentioned.
>
> Below is the original plan text. The corrected content for each remaining task is applied at execution time; refer to the resulting commits, not the blocks below, for what shipped.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure `stardelt-docs/docs/` into audience tiers (intro / getting-started / architecture / developer), extract user-facing install content out of `mvp.md`, and formalise the sidecar `*-impl.md` writing convention with one demonstration pair.

**Architecture:** Per the spec at `superpowers/specs/2026-05-22-docs-restructure-design.md`. Human-facing prose lives in section directories; implementation/AI detail lives in sibling `*-impl.md` files in the same directory. Cross-cutting developer content (contributing guide, implementation log, ADRs) lives under `developer/`, which is collapsed in the sidebar and not promoted in the navbar.

**Tech Stack:** Docusaurus 3.10.1 (no Node installed locally → dev server runs in a `node:20` Docker container). Plain Markdown / MDX content. No new dependencies.

**Conventions used throughout this plan:**

- All file paths are relative to `stardelt-docs/` unless absolute.
- All `git` and `docker` commands run from `stardelt-docs/`.
- Each task ends with a commit. The execution skill may squash these at the end.
- "Verify the dev server" means: docker container is running, page renders at the documented URL, no `[ERROR]` lines in `docker logs --tail 50 stardelt-docs-dev`. Docusaurus hot-reloads on file changes, so the container does not need restarting between tasks.

---

## Task 0: Start the dev server in Docker

**Files:**
- No file changes.

- [ ] **Step 1: Confirm `stardelt-docs` is the working directory and clean**

Run: `pwd && git status --short`
Expected: working directory ends in `stardelt-docs`; `git status --short` shows nothing (the only previous change — the spec — was already committed).

- [ ] **Step 2: Start the dev server**

Run:

```bash
docker rm -f stardelt-docs-dev 2>/dev/null
docker run -d --name stardelt-docs-dev \
  -v "$(pwd)":/app -w /app -p 3000:3000 \
  node:20 sh -c "npm install --no-audit --no-fund && npm start -- --host 0.0.0.0 --no-open"
```

Expected: container ID printed, no error.

- [ ] **Step 3: Wait for compile and verify**

Wait until `docker logs stardelt-docs-dev 2>&1 | grep -q "client.*compiled successfully"` returns true. Then:

Run: `curl -sf http://localhost:3000/docs/architecture/overview > /dev/null && echo OK`
Expected: `OK`

- [ ] **Step 4: No commit (no file changes).**

---

## Task 1: Create the new directory skeleton with placeholder index pages

**Files:**
- Create: `docs/intro/overview.md` (placeholder)
- Create: `docs/getting-started/prerequisites.md` (placeholder)
- Create: `docs/getting-started/local-kind.md` (placeholder)
- Create: `docs/getting-started/smoke-test.md` (placeholder)
- Create: `docs/developer/index.md` (placeholder)
- Create: `docs/developer/contributing.md` (placeholder)
- Create: `docs/developer/implementation-log.md` (placeholder)
- Create: `docs/developer/decisions/001-seaweedfs-over-ozone.md` (placeholder)
- Create: `docs/architecture/components-impl.md` (placeholder)

The placeholders are filled in by subsequent tasks. Creating them up front lets us add the sidebar wiring in Task 10 without intermediate broken states. Docusaurus will warn that these docs aren't in any sidebar until Task 10 wires them up — that's expected.

- [ ] **Step 1: Create `docs/intro/overview.md`**

```markdown
---
title: "What is stardelt"
sidebar_label: "Overview"
slug: /intro/overview
---

# What is stardelt

_Placeholder — content lands in Task 2._
```

- [ ] **Step 2: Create `docs/getting-started/prerequisites.md`**

```markdown
---
title: "Prerequisites"
sidebar_label: "Prerequisites"
slug: /getting-started/prerequisites
---

# Prerequisites

_Placeholder — content lands in Task 3._
```

- [ ] **Step 3: Create `docs/getting-started/local-kind.md`**

```markdown
---
title: "Run stardelt locally on kind"
sidebar_label: "Local (kind)"
slug: /getting-started/local-kind
---

# Run stardelt locally on kind

_Placeholder — content lands in Task 4._
```

- [ ] **Step 4: Create `docs/getting-started/smoke-test.md`**

```markdown
---
title: "Verify the stack with a smoke test"
sidebar_label: "Smoke test"
slug: /getting-started/smoke-test
---

# Verify the stack with a smoke test

_Placeholder — content lands in Task 5._
```

- [ ] **Step 5: Create `docs/developer/index.md`**

```markdown
---
title: "Developer section"
sidebar_label: "Developer"
slug: /developer
---

# Developer section

_Placeholder — content lands in Task 9._
```

- [ ] **Step 6: Create `docs/developer/contributing.md`**

```markdown
---
title: "Contributing to the docs"
sidebar_label: "Contributing"
slug: /developer/contributing
---

# Contributing to the docs

_Placeholder — content lands in Task 7._
```

- [ ] **Step 7: Create `docs/developer/implementation-log.md`**

```markdown
---
title: "Implementation log"
sidebar_label: "Implementation log"
slug: /developer/implementation-log
---

# Implementation log

_Placeholder — content lands in Task 6._
```

- [ ] **Step 8: Create `docs/developer/decisions/001-seaweedfs-over-ozone.md`**

```markdown
---
title: "ADR 001 — SeaweedFS over Apache Ozone"
sidebar_label: "001 — SeaweedFS over Ozone"
slug: /developer/decisions/001-seaweedfs-over-ozone
---

# ADR 001 — SeaweedFS over Apache Ozone

_Placeholder — content lands in Task 8._
```

- [ ] **Step 9: Create `docs/architecture/components-impl.md`**

```markdown
---
title: "Components — implementation detail"
sidebar_label: "Components — impl"
slug: /architecture/components-impl
---

# Components — implementation detail

_Placeholder — content lands in Task 10._
```

- [ ] **Step 10: Verify dev server still healthy**

Run: `docker logs --tail 30 stardelt-docs-dev 2>&1 | grep -i "error\|fail" || echo "no errors"`
Expected: `no errors` (Docusaurus may emit `[WARNING]` about docs not in sidebar — that's fine; only `[ERROR]` blocks compilation).

- [ ] **Step 11: Commit**

```bash
git add docs/intro/ docs/getting-started/ docs/developer/ docs/architecture/components-impl.md
git commit -m "docs(issue-2): add empty skeleton for new doc tree"
```

---

## Task 2: Fill `docs/intro/overview.md`

**Files:**
- Modify: `docs/intro/overview.md`

- [ ] **Step 1: Write the file**

Replace the placeholder contents with:

```markdown
---
title: "What is stardelt"
sidebar_label: "Overview"
slug: /intro/overview
---

# What is stardelt

stardelt is a Kubernetes-native, fully open-source data platform that delivers
Lakehouse SQL, Batch ETL, Streaming, and ML/AI on any cloud or on-prem cluster —
under your own sovereignty, without vendor lock-in.

## What makes stardelt different

- **Total sovereignty.** stardelt runs end-to-end inside your perimeter. Nothing
  leaves your cluster unless you tell it to. EU companies escape US CLOUD Act
  exposure; defense and public-sector workloads can run air-gapped. Reversible
  by design — your tables stay in open Iceberg format on your storage.
- **No vendor handcuffs.** 100 % OSI-permissive (Apache 2.0 / MIT / BSD) with
  one documented MPL-2.0 exception for the OpenBao secrets backend. Zero BSL,
  SSPL, ELv2, or AGPL components.
- **One CRD, not 47 YAMLs.** A composed control plane (`PlatformInstance`,
  `Tenant`, `Lakehouse`, `Pipeline`, `StreamApp`, `MLWorkspace`) sits on top of
  per-component operators. That's the gap left by the previous generation of
  Kubernetes data stacks.
- **Modern stack, no Hadoop heritage.** Iceberg via Lakekeeper, Trino + DuckDB
  for SQL, RisingWave for streaming SQL, OpenFGA for fine-grained authorization,
  OpenBao for secrets, VictoriaMetrics / VictoriaLogs + Perses for observability.

## Where to go next

- **Try it on your laptop.** [Run stardelt locally on kind](../getting-started/local-kind).
- **Understand the system first.** [Architecture overview](../architecture/overview)
  or the full [design spec](../design/master-spec).
- **See what's planned.** [Roadmap](../roadmap).

:::warning Pre-alpha
stardelt is in an MVP / vibecoding phase. APIs, manifests, and chart versions
change without notice. Not ready for production.
:::
```

- [ ] **Step 2: Verify**

Run: `curl -sf http://localhost:3000/docs/intro/overview | grep -q "What is stardelt" && echo OK`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add docs/intro/overview.md
git commit -m "docs(issue-2): write intro/overview"
```

---

## Task 3: Fill `docs/getting-started/prerequisites.md`

**Files:**
- Modify: `docs/getting-started/prerequisites.md`

Source: lines 49–58 of the soon-to-be-removed `docs/mvp.md`.

- [ ] **Step 1: Write the file**

```markdown
---
title: "Prerequisites"
sidebar_label: "Prerequisites"
slug: /getting-started/prerequisites
---

# Prerequisites

To run the stardelt MVP locally you need WSL2 or Linux with the following tools
on `$PATH`. `make deps` (in `stardelt-demos`) verifies these for you.

| Tool    | Tested version |
|---------|----------------|
| docker  | 26.x (Docker Desktop on WSL2 OK) |
| kind    | 0.31.0 |
| kubectl | 1.36.x |
| helm    | 4.x |

Hardware: roughly 8 GiB RAM and 4 CPUs free for the kind cluster; cold bring-up
takes about 12 minutes.

Next: [Run stardelt locally on kind](./local-kind).
```

- [ ] **Step 2: Verify**

Run: `curl -sf http://localhost:3000/docs/getting-started/prerequisites | grep -q "Tested version" && echo OK`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add docs/getting-started/prerequisites.md
git commit -m "docs(issue-2): extract prerequisites from mvp.md"
```

---

## Task 4: Fill `docs/getting-started/local-kind.md`

**Files:**
- Modify: `docs/getting-started/local-kind.md`

Source: the stack diagram (mvp.md lines 18–47), bring-up commands (lines 60–71), and what-make-up-does (lines 73–82).

- [ ] **Step 1: Write the file**

```markdown
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
4. **S3 credentials Secret** (`deploy/manifests/ozone-s3-creds.yaml`) — `access-key`, `secret-key`, `endpoint`, `bucket`, `region` consumed by Lakekeeper bootstrap and Trino's catalog config. The Secret name is `ozone-s3-creds` for backward compatibility — see [ADR 001](../developer/decisions/001-seaweedfs-over-ozone).
5. **Lakekeeper Postgres** (`postgresql.cnpg.io/Cluster` `lakekeeper-pg`) — single instance, 2 GiB.
6. **Lakekeeper** — bundled Postgres + OpenFGA disabled, `authz.backend: allowall`, points at the CNPG Postgres via the `lakekeeper-pg-app` Secret.
7. **Lakekeeper warehouse bootstrap** (`deploy/manifests/lakekeeper-bootstrap.yaml`) — a Job that POSTs `/management/v1/bootstrap` and `/management/v1/warehouse` (creating `warehouse` on `s3://lakehouse/warehouse`). Idempotent.
8. **Trino** — coordinator + 1 worker, 2 GiB heap each. The catalog `warehouse` is configured with `iceberg.catalog.type=rest`, REST URI = Lakekeeper, S3 endpoint = SeaweedFS, path-style access, credentials from `ozone-s3-creds`.
9. **Apache Airflow** — slim image plus the `postgres`, `fab`, and `cncf-kubernetes` providers; KubernetesExecutor; ships the `nyc_taxi_load` DAG that loads NYC TLC yellow-taxi Parquet into `warehouse.nyc_taxi.yellow_trips` via pyiceberg.

When this finishes, verify with the [smoke test](./smoke-test).

## Inspecting the stack

```bash
kubectl -n stardelt get pods                     # all should be Running/Ready
kubectl -n stardelt logs deploy/trino-coordinator -f
kubectl -n stardelt logs deploy/lakekeeper -f
kubectl -n stardelt exec deploy/trino-coordinator -- trino  # interactive SQL
```
```

- [ ] **Step 2: Verify**

Run: `curl -sf http://localhost:3000/docs/getting-started/local-kind | grep -q "make up" && echo OK`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add docs/getting-started/local-kind.md
git commit -m "docs(issue-2): extract local-kind bring-up from mvp.md"
```

---

## Task 5: Fill `docs/getting-started/smoke-test.md`

**Files:**
- Modify: `docs/getting-started/smoke-test.md`

Source: the inspecting / SQL examples in mvp.md (lines 126–152).

- [ ] **Step 1: Write the file**

```markdown
---
title: "Verify the stack with a smoke test"
sidebar_label: "Smoke test"
slug: /getting-started/smoke-test
---

# Verify the stack with a smoke test

Once `make up` is done and pods are `Running`, this page gives you the queries
to confirm the lakehouse slice is wired up correctly.

## Stage 1 — basic SQL works

The `make smoke` target runs Stage 1 acceptance: `CREATE`, `INSERT`, and
`SELECT` through Trino on an Iceberg table backed by SeaweedFS.

Run it from `stardelt-demos`:

```bash
make smoke
```

Or do it manually inside the Trino coordinator:

```bash
kubectl -n stardelt exec -it deploy/trino-coordinator -- trino
```

In the Trino shell:

```sql
SHOW CATALOGS;                                  -- warehouse + system/tpch/tpcds
SHOW SCHEMAS FROM warehouse;
SELECT * FROM warehouse.smoke.t;                -- Stage 1 smoke row
```

## Stage 2 — NYC taxi data

After `make airflow-trigger` has finished, you should see ~38 M rows for one
year of yellow-taxi data:

```sql
SELECT COUNT(*) FROM warehouse.nyc_taxi.yellow_trips;
SELECT pickup_year_month, COUNT(*), ROUND(AVG(fare_amount), 2)
  FROM warehouse.nyc_taxi.yellow_trips
  GROUP BY 1 ORDER BY 1;
```

## Lakekeeper management API

After `make pf` you can hit the Lakekeeper management API directly:

```bash
curl http://localhost:8181/management/v1/info        # bootstrapped: true
curl http://localhost:8181/management/v1/warehouse   # one warehouse, on s3://lakehouse/warehouse
```

If any of these queries fail or return unexpected results, check the engineer
notes in the [implementation log](../developer/implementation-log) — it
captures the gotchas we hit while wiring this up.
```

- [ ] **Step 2: Verify**

Run: `curl -sf http://localhost:3000/docs/getting-started/smoke-test | grep -q "SHOW CATALOGS" && echo OK`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add docs/getting-started/smoke-test.md
git commit -m "docs(issue-2): extract smoke test from mvp.md"
```

---

## Task 6: Fill `docs/developer/implementation-log.md`

**Files:**
- Modify: `docs/developer/implementation-log.md`

Source: the stage status header (mvp.md lines 9–16), the Stage 2 / 3 / 3.5 narrative paragraphs (lines 84–124), the Storage layer rationale (lines 154–168), the lessons-learned list (lines 170–196), and the next-stages table (lines 198–204).

The Storage-layer rationale is moved into [ADR 001](decisions/001-seaweedfs-over-ozone.md). This page links to it instead of restating the workaround list.

- [ ] **Step 1: Write the file**

```markdown
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
section. For an architectural decision record see
[`decisions/`](./decisions/001-seaweedfs-over-ozone).

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
  `S3_SECRET_KEY`, `S3_REGION` all from the `ozone-s3-creds` Secret.

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

## Storage layer

The plan called for Apache Ozone. We hit Ratis replication issues on a
single-node kind cluster and switched to SeaweedFS — see
[ADR 001 — SeaweedFS over Apache Ozone](./decisions/001-seaweedfs-over-ozone).
The S3 credentials Secret is still named `ozone-s3-creds` for backward
compatibility.

## Lessons learned

These are gotchas we hit so the next contributor doesn't have to.

1. **Helm v4's server-side apply rejects duplicate `env:` entries.** Charts
   that append user `env` after helper-injected env (Ozone, others) hit
   `duplicate entries for key` errors. Workaround:
   `scripts/helm-plugins/stardelt-dedupe/` — a post-renderer plugin that
   dedupes name-keyed lists, last-wins (restoring helm v3 behaviour).
   Registered in `up.sh` via `ensure_helm_plugins`.

2. **Helm v4 post-renderer is a plugin, not a path.**
   `--post-renderer ./script.sh` errors out; you must install a plugin
   (`apiVersion: v1`, `type: postrenderer/v1`) and pass the plugin name.

3. **Ozone S3G's `domain.name` is a strict Host-header whitelist.** Clients
   connecting via FQDN
   (`ozone-s3g-rest.stardelt.svc.cluster.local`) get HTTP 500 unless the FQDN
   is in the whitelist. The chart only ships the short name.

4. **Ozone simple-auth scopes bucket ownership to the access key.** Mixing
   access keys mid-test orphans buckets. Pin one key and use it throughout.

5. **Lakekeeper warehouse bootstrap is API-only.** There's no Helm value for
   creating a warehouse. The pattern is a `post-install` Job that POSTs
   `/management/v1/bootstrap` then `/management/v1/warehouse` — see
   `deploy/manifests/lakekeeper-bootstrap.yaml`.

6. **Trino's `query.max-memory-per-node` is auto-derived from heap.** With
   heap = 1 GiB, the auto-derived value plus heap headroom exceeds the heap
   and the coordinator refuses to start with `Invalid memory configuration`.
   Bumping heap to ≥ 2 GiB fixes it.

7. **CNPG `Cluster` generates a `<name>-app` Secret** with keys `username` /
   `password` / `dbname`. Lakekeeper's `externalDatabase.userSecretKey` /
   `passwordSecretKey` default to `postgresql-user` / `postgresql-password`,
   so override them to `username` / `password`.

8. **Lakekeeper defaults `remote-signing-enabled: true` on new warehouses.**
   PyIceberg then tries to use a REST-vended STS token that we don't issue,
   failing with `SignError: Signer set, but token is not available`. Set
   `remote-signing-enabled: false` in the warehouse `storage-profile` on
   creation, or PATCH it via `POST /management/v1/warehouse/{id}/storage`
   after the fact.

9. **Iceberg REST catalog uses optimistic concurrency.** Parallel appends to
   the same table from multiple Airflow tasks conflict and roll back. Set
   `max_active_tasks=1` on DAGs that write to a single table, or implement
   retry-on-conflict.

10. **Apache Airflow `slim-3.x` image omits providers.** The chart assumes
    `postgres`, `fab`, and `cncf-kubernetes` providers; we install them in
    the stardelt-owned Airflow image. Without them the migrations Job fails
    with `ModuleNotFoundError: psycopg2`, then `auth_manager` import errors,
    then `airflow.providers.cncf` missing for KubernetesExecutor.

11. **emptyDir storage in stateful pods does not survive pod restart.**
    SeaweedFS volume / master / filer initially ran on emptyDir; a
    `helm upgrade` restarted them, the data vanished, and Iceberg metadata
    pointed at non-existent Parquet files. All three SeaweedFS components
    now use `persistentVolumeClaim`.

12. **Superset 5.0 image ships in a uv-managed venv with no pip, no
    psycopg2, no trino driver.** Bootstrap-script `pip install` fails
    (`/app/.venv/bin/pip: not found`). Use
    `uv pip install --python /app/.venv/bin/python ...` in a custom image
    instead of trying to install at pod startup. Default Celery worker
    `concurrency` matches host CPU count (24+) and OOM-kills with a 1 GiB
    limit; cap it via the worker `command` override.

13. **Some helm-chart value keys are scalars in older docs but became objects
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
```

- [ ] **Step 2: Verify**

Run: `curl -sf http://localhost:3000/docs/developer/implementation-log | grep -q "Lessons learned" && echo OK`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add docs/developer/implementation-log.md
git commit -m "docs(issue-2): move engineer notes from mvp.md to implementation-log"
```

---

## Task 7: Fill `docs/developer/contributing.md` (the canonical writing convention)

**Files:**
- Modify: `docs/developer/contributing.md`

This is the canonical home of the writing convention. It must be self-contained — someone landing on this page directly should understand both rules and how to apply them.

- [ ] **Step 1: Write the file**

```markdown
---
title: "Contributing to the docs"
sidebar_label: "Contributing"
slug: /developer/contributing
---

# Contributing to the docs

This page documents how we organise and write the `stardelt-docs` content. New
pages should follow these conventions.

## How the docs are organised

```
docs/
├── intro/             # user-facing "what is stardelt"
├── getting-started/   # user-facing "how do I run it"
├── architecture/      # user-facing "how does it fit together"
├── design/            # user-facing canonical design spec
├── diagrams/          # Mermaid diagrams referenced from the above
├── roadmap.md         # public roadmap
└── developer/         # contributor-facing — this section
    ├── index.md
    ├── contributing.md       # you are here
    ├── implementation-log.md # stage progress and lessons learned
    └── decisions/            # ADRs
```

The `developer/` section is collapsed in the sidebar by default and is **not**
promoted in the navbar. Casual readers shouldn't end up here by accident.

## Writing convention: human pages and impl siblings

We separate human-readable surface content from implementation / AI detail
into **separate files**. Two rules:

### Rule 1 — Human pages contain only prose, examples, and links.

No axum router internals, no cache TTLs, no struct names, no "we currently
work around X by Y". If it's a detail only a contributor needs, it does not
belong on a human-facing page.

### Rule 2 — Implementation / AI detail lives in a sibling `<topic>-impl.md`.

The human page is `architecture/nova.md`. The implementation page is
`architecture/nova-impl.md`, in the same directory. The human page links to
the impl page via a standard Docusaurus admonition near the top:

````markdown
:::info Implementation detail
Engineering depth for this page lives in [Nova — Implementation](./nova-impl).
:::
````

Impl pages are **excluded from the main sidebar** so casual readers don't see
them. They remain reachable via the in-page admonition link, direct URL, and
Docusaurus search. The [Developer section index](./) maintains a list of all
current impl pages.

## Adding a new impl sibling

1. Create `<topic>-impl.md` next to the human `<topic>.md` you're documenting.
2. Add the `:::info Implementation detail` admonition (Rule 2 above) near the
   top of the human page.
3. Do **not** add the impl page to `sidebars.ts`. It should not appear in the
   sidebar.
4. Add the impl page to the bulleted list on [`developer/index.md`](./) so
   contributors can find it.

## Adding a new ADR

1. Copy `decisions/001-seaweedfs-over-ozone.md` as a template.
2. Increment the number; keep the `NNN-kebab-case-title` filename pattern.
3. Status should be `Accepted`, `Proposed`, or `Superseded by <link>`.
4. Add a sidebar entry under the `Decisions` category in `sidebars.ts`.

## Local preview

If you have Node 18+ installed:

```bash
npm install
npm start
```

If you don't:

```bash
docker run --rm -it \
  -v "$(pwd)":/app -w /app -p 3000:3000 \
  node:20 sh -c "npm install --no-audit --no-fund && npm start -- --host 0.0.0.0 --no-open"
```

Open <http://localhost:3000>. Docusaurus hot-reloads on file changes.
```

- [ ] **Step 2: Verify**

Run: `curl -sf http://localhost:3000/docs/developer/contributing | grep -q "Writing convention" && echo OK`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add docs/developer/contributing.md
git commit -m "docs(issue-2): add contributing guide with sidecar-impl convention"
```

---

## Task 8: Fill `docs/developer/decisions/001-seaweedfs-over-ozone.md`

**Files:**
- Modify: `docs/developer/decisions/001-seaweedfs-over-ozone.md`

Source: mvp.md "Storage layer: why SeaweedFS, not Ozone" (lines 154–168), the `ozone-s3-creds` note in `CLAUDE.md`, and the components doc which lists Ozone as primary with SeaweedFS as an alternative.

- [ ] **Step 1: Write the file**

```markdown
---
title: "ADR 001 — SeaweedFS over Apache Ozone"
sidebar_label: "001 — SeaweedFS over Ozone"
slug: /developer/decisions/001-seaweedfs-over-ozone
---

# ADR 001 — SeaweedFS over Apache Ozone

- **Status:** Accepted
- **Date:** 2026-04 (during Phase 0 / Stage 1 implementation)
- **Deciders:** stardelt maintainers

## Context

The Phase 0 design called for Apache Ozone as the S3-compatible object store
underneath Iceberg (see [components — L2 Data Foundation](../../architecture/components#l2--data-foundation)).
Ozone is Apache 2.0, well-known to operate at scale, and gives stardelt a
"Hadoop-free but enterprise-credible" object store story.

During Stage 1 implementation on a single-node `kind` cluster, Ozone's S3
Gateway sent `replicationConfig: RATIS/THREE` on every `CREATE_KEY` regardless
of every replication-factor knob we tried — `ozone.replication=ONE`,
`ozone.server.default.replication`, `ozone.client.default.replication{,.type}`,
`OZONE_REPLICATION_FACTOR`, per-bucket
`ozone sh bucket set-replication-config /s3v/lakehouse --type RATIS --replication ONE`,
and re-creating the bucket via `ozone sh bucket create -t RATIS -r ONE`.

SCM correctly refused the writes — with one datanode, RATIS/THREE could never
satisfy "Required 3. Found 1." The Phase 0 design documents SeaweedFS as the
Ozone alternative for exactly this kind of scenario.

## Decision

Replace Apache Ozone with **SeaweedFS** as the S3 layer for the Phase 0
lakehouse slice. SeaweedFS came up clean with `defaultReplication: "000"` and
the Stage 1 smoke test passed immediately.

## Consequences

- Smaller, simpler runtime footprint suitable for laptop demos and small
  production clusters.
- **The Kubernetes Secret holding the S3 credentials is still named
  `ozone-s3-creds`** to avoid churning every chart and manifest that
  references it (`stardelt-platform`, `stardelt-demos`, the Lakekeeper
  bootstrap Job, the Trino catalog config, the Airflow DAG env). A future
  rename to `s3-creds` is tracked separately and is not blocking.
- SeaweedFS is the path the platform continues to validate against. Ozone is
  not currently supported by stardelt manifests or charts.
- Ozone is **not** abandoned in principle — it should work on a multi-node
  cluster or once a working single-node-replication knob is found. Returning
  to Ozone would require: (a) an upstream fix or documented workaround for
  the S3G `CREATE_KEY` replication path, (b) re-introducing the Ozone Helm
  chart wiring, (c) re-validating the Lakekeeper + Trino catalog path
  end-to-end.

## Related

- Implementation log: [Storage layer](../implementation-log#storage-layer)
- Components: [L2 — Data Foundation](../../architecture/components#l2--data-foundation)
```

- [ ] **Step 2: Verify**

Run: `curl -sf http://localhost:3000/docs/developer/decisions/001-seaweedfs-over-ozone | grep -q "RATIS/THREE" && echo OK`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add docs/developer/decisions/001-seaweedfs-over-ozone.md
git commit -m "docs(issue-2): add ADR 001 — SeaweedFS over Ozone"
```

---

## Task 9: Fill `docs/developer/index.md` (section landing)

**Files:**
- Modify: `docs/developer/index.md`

This is the page a contributor lands on when they click the `Developer`
category in the sidebar. It indexes the impl pages so they remain
discoverable despite being excluded from the sidebar.

- [ ] **Step 1: Write the file**

```markdown
---
title: "Developer section"
sidebar_label: "Overview"
slug: /developer
---

# Developer section

You've reached the contributor-facing section of the stardelt docs. The
content here documents how the codebase is wired together, why we made
certain decisions, and what gotchas we hit along the way. If you just want
to **use** stardelt, you probably want the [Getting Started](../getting-started/local-kind)
section instead.

## Start here

- [**Contributing to the docs**](./contributing) — how the docs are
  organised, the human-page / impl-sibling writing convention, how to
  preview the site locally.
- [**Implementation log**](./implementation-log) — running engineer's log
  of how the MVP came together, including stage progress and lessons
  learned.

## Architectural Decision Records (ADRs)

- [**001 — SeaweedFS over Apache Ozone**](./decisions/001-seaweedfs-over-ozone)

## Implementation pages (sidecar `*-impl.md`)

These pages carry the engineering depth for a corresponding human-facing
page. They aren't listed in the main sidebar — link them from their human
sibling and from here.

- [`architecture/components-impl`](../architecture/components-impl) — sibling of [Components](../architecture/components)
```

- [ ] **Step 2: Verify**

Run: `curl -sf http://localhost:3000/docs/developer | grep -q "Developer section" && echo OK`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add docs/developer/index.md
git commit -m "docs(issue-2): add developer section landing + impl-pages index"
```

---

## Task 10: Fill `architecture/components-impl.md` and add callout to `architecture/components.md`

**Files:**
- Modify: `docs/architecture/components-impl.md`
- Modify: `docs/architecture/components.md`

This task demonstrates the convention end-to-end with the first real
human ↔ impl pairing.

- [ ] **Step 1: Write `docs/architecture/components-impl.md`**

```markdown
---
title: "Components — implementation detail"
sidebar_label: "Components — impl"
slug: /architecture/components-impl
---

# Components — implementation detail

Sidecar of [Components](./components). This page captures the engineering
detail that doesn't belong on the human-facing components page — what's
actually pinned in MVP charts, what's only a "verified live in Phase 0
research" mark vs. running in the current MVP, and where decisions are
recorded.

## What's actually pinned in MVP

The components table on the human page is the **target** inventory. The MVP
running on a kind cluster pins a much smaller subset:

| Slot | Component | Chart / image version | Notes |
|---|---|---|---|
| Object storage | SeaweedFS | `seaweedfs/seaweedfs` 4.25.1 | Replacing Ozone — see [ADR 001](../developer/decisions/001-seaweedfs-over-ozone) |
| Catalog | Lakekeeper | `lakekeeper/lakekeeper` 0.11.0 | Bundled OpenFGA disabled (`authz.backend: allowall`) |
| Lakekeeper DB | CNPG | `cnpg/cloudnative-pg` 0.28.2 | Single-instance Postgres for Lakekeeper metadata |
| MPP SQL | Trino | `trino/trino` 1.42.2 (appVersion 480) | Coordinator + 1 worker, 2 GiB heap each |
| Orchestration | Airflow | `stardelt/airflow:dev` from `slim-3.2.0-python3.12` | KubernetesExecutor; providers baked in |
| BI | Superset | `stardelt/superset:dev` from `apachesuperset:5.0.0` | Trino + psycopg2 baked in |

Chart versions are pinned in two places (`stardelt-platform/Makefile` and
`stardelt-demos/kind/up.sh`) and must be kept in sync.

## Verification status

The `✓` (verified live during Phase 0 research) vs. `◯` (from research; re-verify
before release) symbols on the human page describe **license**-verification
status, not "currently running" status. The two are independent:

- Lakekeeper, RisingWave, OpenBao, SeaweedFS, Trino-via-chart are live in MVP.
- Most other entries are inventory we plan to compose; license re-verification
  happens at release time per the matrix on the human page.

## Component decisions captured as ADRs

- [001 — SeaweedFS over Apache Ozone](../developer/decisions/001-seaweedfs-over-ozone)

(More ADRs will land here as the platform Helm chart matures — Trino vs.
StarRocks, Lakekeeper vs. Polaris, Airflow vs. Argo as the orchestration
default.)
```

- [ ] **Step 2: Add the impl callout to `docs/architecture/components.md`**

Open `docs/architecture/components.md`. Find the first paragraph (after the
frontmatter and `# stardelt Component Map` heading, starting with "The full
inventory of upstream OSS projects..."). Insert the following admonition
**above** that paragraph (i.e., the first thing after the heading):

```markdown
:::info Implementation detail
Engineering depth for this page lives in [Components — Implementation](./components-impl).
:::

```

The resulting top of the file should look like:

```markdown
# stardelt Component Map

:::info Implementation detail
Engineering depth for this page lives in [Components — Implementation](./components-impl).
:::

The full inventory of upstream OSS projects stardelt composes, organized by architectural layer. License legend: ...
```

- [ ] **Step 3: Verify both pages render and the link resolves**

Run:

```bash
curl -sf http://localhost:3000/docs/architecture/components-impl | grep -q "What's actually pinned" && echo OK1
curl -sf http://localhost:3000/docs/architecture/components | grep -q "Implementation detail" && echo OK2
```

Expected: `OK1` and `OK2`.

- [ ] **Step 4: Commit**

```bash
git add docs/architecture/components.md docs/architecture/components-impl.md
git commit -m "docs(issue-2): add components-impl sibling, demonstrating sidecar convention"
```

---

## Task 11: Wire sidebars, update navbar, and delete `mvp.md`

**Files:**
- Modify: `sidebars.ts`
- Modify: `docusaurus.config.ts`
- Delete: `docs/mvp.md`

This is the single atomic-ish wire-up: sidebar order changes, navbar drops
MVP and adds Getting Started, and `mvp.md` is removed (its content already
lives in the new structure). Doing these in one task avoids broken
intermediate states.

- [ ] **Step 1: Replace `sidebars.ts` contents**

Replace the whole file with:

```typescript
import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    {
      type: 'category',
      label: 'Intro',
      collapsed: false,
      items: ['intro/overview'],
    },
    {
      type: 'category',
      label: 'Getting started',
      collapsed: false,
      items: [
        'getting-started/prerequisites',
        'getting-started/local-kind',
        'getting-started/smoke-test',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      collapsed: false,
      items: [
        'architecture/overview',
        'architecture/components',
        'architecture/licenses',
        'architecture/sovereignty',
      ],
    },
    {
      type: 'category',
      label: 'Diagrams',
      collapsed: true,
      items: ['diagrams/layers', 'diagrams/control-plane', 'diagrams/data-flow'],
    },
    'roadmap',
    {
      type: 'category',
      label: 'Design',
      collapsed: true,
      items: ['design/master-spec'],
    },
    {
      type: 'category',
      label: 'Developer',
      collapsed: true,
      link: { type: 'doc', id: 'developer/index' },
      items: [
        'developer/contributing',
        'developer/implementation-log',
        {
          type: 'category',
          label: 'Decisions',
          collapsed: true,
          items: ['developer/decisions/001-seaweedfs-over-ozone'],
        },
      ],
    },
  ],
};

export default sidebars;
```

Note that `architecture/components-impl` is intentionally **not** listed.
Impl pages stay out of the sidebar by convention.

- [ ] **Step 2: Update the navbar in `docusaurus.config.ts`**

Find the `navbar.items` array (currently lines 57–63). Replace:

```typescript
      items: [
        { to: '/docs/architecture/overview', label: 'Architecture', position: 'left' },
        { to: '/docs/roadmap', label: 'Roadmap', position: 'left' },
        { to: '/docs/design/master-spec', label: 'Design', position: 'left' },
        { to: '/docs/mvp', label: 'MVP', position: 'left' },
        { href: 'https://github.com/stardelt', label: 'GitHub', position: 'right' },
      ],
```

with:

```typescript
      items: [
        { to: '/docs/intro/overview', label: 'Overview', position: 'left' },
        { to: '/docs/getting-started/local-kind', label: 'Getting started', position: 'left' },
        { to: '/docs/architecture/overview', label: 'Architecture', position: 'left' },
        { to: '/docs/roadmap', label: 'Roadmap', position: 'left' },
        { to: '/docs/design/master-spec', label: 'Design', position: 'left' },
        { href: 'https://github.com/stardelt', label: 'GitHub', position: 'right' },
      ],
```

`MVP` is removed; `Overview` (intro) and `Getting started` are added. The
`Developer` section is **not** in the navbar.

- [ ] **Step 3: Delete `docs/mvp.md`**

Run: `git rm docs/mvp.md`
Expected: file removed.

- [ ] **Step 4: Verify the dev server reloads cleanly**

Wait a few seconds, then run:

```bash
docker logs --tail 80 stardelt-docs-dev 2>&1 | tail -40
```

Expected: a fresh `client (...) compiled successfully` line at the bottom; no
`[ERROR]` lines after the most recent compile start.

- [ ] **Step 5: Spot-check the new structure end-to-end**

Run:

```bash
for u in \
  /docs/intro/overview \
  /docs/getting-started/prerequisites \
  /docs/getting-started/local-kind \
  /docs/getting-started/smoke-test \
  /docs/architecture/overview \
  /docs/architecture/components \
  /docs/architecture/components-impl \
  /docs/design/master-spec \
  /docs/roadmap \
  /docs/developer \
  /docs/developer/contributing \
  /docs/developer/implementation-log \
  /docs/developer/decisions/001-seaweedfs-over-ozone \
  ; do
    code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:3000$u")
    echo "$code $u"
done
```

Expected: every line prints `200`.

Then check that `/docs/mvp` no longer resolves:

Run: `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/docs/mvp`
Expected: `404`.

- [ ] **Step 6: Commit**

```bash
git add sidebars.ts docusaurus.config.ts
git commit -m "docs(issue-2): wire new sidebar + navbar; remove mvp.md"
```

(The `git rm` from Step 3 should already be staged; `git status` to confirm
before committing.)

---

## Task 12: Final verification — broken-link warnings and content sanity

**Files:**
- No file changes.

- [ ] **Step 1: Trigger a full build to catch broken-link warnings**

Docusaurus only enforces broken-link checks on `build`, not `start`. Run:

```bash
docker exec stardelt-docs-dev sh -c "cd /app && npx docusaurus build 2>&1 | tail -60"
```

Expected: `[SUCCESS] Generated static files in "build".` at the end. **No
`[ERROR] Docusaurus found broken links`** lines anywhere in the output.

- [ ] **Step 2: If broken links are reported, fix them**

The most likely offenders:

- A relative link that worked when the file was at a different depth — recompute the relative path.
- A link from the new pages pointing at `/docs/mvp` — rewrite to point at
  `getting-started/local-kind` or `developer/implementation-log` as
  appropriate.

Re-run Step 1 until it passes.

- [ ] **Step 3: Eyeball the new pages in a browser**

(Manual.) Open <http://localhost:3000>. Check that:

- The navbar shows `Overview` · `Getting started` · `Architecture` · `Roadmap` · `Design` · `GitHub`. No `MVP`. No `Developer`.
- The sidebar shows `Intro` (expanded), `Getting started` (expanded), `Architecture` (expanded), `Diagrams` (collapsed), `Roadmap`, `Design` (collapsed), `Developer` (collapsed).
- The `Developer` category in the sidebar expands to show `Overview` (landing), `Contributing`, `Implementation log`, `Decisions/001-...`.
- `Architecture > Components` shows the `:::info Implementation detail` callout near the top and the link to `components-impl` resolves.
- `architecture/components-impl` is **not** in the sidebar but **is** reachable via the callout link.

- [ ] **Step 4: Stop the dev container**

```bash
docker rm -f stardelt-docs-dev
```

- [ ] **Step 5: Confirm git state is clean and ready for the issue**

```bash
git status --short
git log --oneline main -15
```

Expected: working tree clean. Commit log shows the spec commit (`3416bc0`)
followed by the task commits from this plan.

- [ ] **Step 6: No commit (verification-only task).**

If you fixed broken links in Step 2, those should have been committed as
part of the fix, not as part of this task.

---

## Out of scope (do not do as part of this plan)

The following are explicitly deferred to follow-up work (per the spec's
"Out of scope / follow-ups" section):

- Filling `*-impl.md` for the remaining `architecture/*` pages.
- Additional ADRs (Trino vs. StarRocks; Lakekeeper vs. Polaris; Airflow vs. Argo; ingress strategy).
- Renaming the `ozone-s3-creds` Secret across `stardelt-platform` charts.
- Cross-repo developer docs (e.g., Nova internals referencing Nova source).
- Theme / navbar styling / homepage changes.

If the executing agent notices one of these would be trivial to add, **do not
add it**. File a follow-up issue instead and reference it from the PR.
