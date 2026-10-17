---
title: "Roadmap"
sidebar_label: "Roadmap"
slug: /roadmap
---

# stardelt Roadmap

stardelt is a multi-year vision. Each phase produces something demoable and usable on its own — not "half-built monolith until v1.0."

The MVP (Phase 0 + Phase 1) is the only milestone needed to validate the bet. Phases 2–6 are gated on community pull.

The [master spec](design/master-spec.md) is the single source of truth for what stardelt is, the plug matrix (contracts, defaults, alternates per domain), and the build/integrate/never-build boundary. The [execution plan](design/execution-plan.md) chunks the phases into handover-ready work packages — where a phase's component list and the plug matrix disagree, **the plug matrix wins** — a service enters a phase only as a default behind an existing contract.

## Phase 0 — Done — Research, design, branding

**Goal**: make the case strong enough to recruit collaborators.

**Deliverables (this repository):**

- [x] [Design spec](design/master-spec.md) — product definition, plug matrix, principles, sequencing, decision record
- [x] [Architecture](architecture/overview.md)
- [x] [Services](architecture/services.md) with license verification
- [x] [License policy](architecture/licenses.md) — accepted, exception, rejected
- [x] [Sovereignty commitments](architecture/sovereignty.md)
- [x] [Execution plan](design/execution-plan.md) — the work packages, and the verified state of each repo
- [x] Roadmap — this document
- [x] [README](https://github.com/stardelt) — marketing-ready
- [x] Brand: logo, wordmark

### Current stage (2026-10)

The design is done, and the platform is no longer paper. A live single-node **dev environment**
exists — Hetzner **k3s** (`cx33`, ~€10/month) running the **core** stack (**CloudNative-PG,
SeaweedFS, Lakekeeper, Trino**) plus **Nova** and **JupyterHub**, with Let's Encrypt TLS served
through the `dev/playground` ingress-nginx. [alpha.dev.stardelt.io](https://alpha.dev.stardelt.io) is Nova; `trino.` and
`jupyter.` answer on the same domain. **Superset and Airflow are not installed** there — they need
the `full` profile and a 16 GB node. The operator's CRDs, reconcile planner and controller
skeleton exist and are unit-tested, but no adapter installs an upstream chart from a CRD yet, and
nothing proves the stack headlessly. Both are what the
[execution plan](design/execution-plan.md) queues next.

## Phase 1 — Lakehouse MVP

**Goal**: `kubectl apply -f lakehouse.yaml` → 15 minutes later, you're querying an Iceberg table in Trino through stardelt Nova.

This is the wedge. A single working pillar with the composed control plane proves the differentiator over Stackable.

**Scope** (✅ = running on the dev cluster today, ◐ = partial):

- L1 (substrate, minimum viable): Keycloak, **K8s Secrets** ✅ (OpenBao deferred to Phase 5), VictoriaMetrics + VictoriaLogs + Perses + Jaeger, OpenCost
- L2 (data foundation): SeaweedFS (+ BYO-S3 path) ✅, Lakekeeper ✅, Apache Iceberg ✅, OPA + OpenFGA bootstrap, OpenLineage emit-only
- L3 Pillar 1 (Lakehouse SQL only): Trino ✅, DuckDB, Apache Superset (not on the dev node — `full` profile), JupyterHub ✅
- L4 (stardelt-native): `stardelt-operator` ◐ (CRDs, reconcile planner and controller skeleton; adapters not yet), **Nova MVP** ✅ (catalog browser, SQL editor, load & transfer, jobs, lineage, platform apps — SSO still pending, [WP-18/WP-12](design/execution-plan.md)), `stardelt` CLI

**Validation** (✅ done today, ◐ partial, — not started):

- Single-cluster, single-tenant. ✅
- Development on the Hetzner k3s cluster (`stardelt-platform/dev/hetzner-k3s`); `kind` demo for the core slice. ✅ — the k3s cluster is live; the kind path installs the same `core` profile through the platform Makefile, but nothing runs it automatically yet ([WP-02](design/execution-plan.md)).
- Documented install path for real clusters. ◐ — `make install` / `make install-core` are documented and in use; the install is bash, not a CRD.
- First 5 pilot users. — the dev environment is public at `alpha.dev.stardelt.io`; no pilots yet.

## Phase 2 — Batch ETL pillar

**Adds:**

- Apache Spark via Spark Operator
- Apache Airflow + Argo Workflows
- dbt-core + SQLMesh
- Apache SeaTunnel
- `Pipeline` CRD
- Nova: pipelines view, DAG visualization, run history

## Phase 3 — Streaming pillar

**Adds:**

- Apache Kafka via Strimzi
- Apicurio Registry
- Apache Flink
- RisingWave
- Debezium (CDC)
- `StreamApp` CRD
- Nova: streams view, topic browser, materialized-view explorer

## Phase 4 — ML / AI pillar

**Adds:**

- Ray via KubeRay
- Kubeflow Pipelines
- MLflow
- Feast (feature store)
- KServe + vLLM (model + LLM serving)
- Qdrant (vector DB)
- Envoy AI Gateway (LLM gateway)
- `MLWorkspace` CRD
- Nova: ML workspace view, model registry, serving endpoints, vector-DB browser

## Phase 5 — Production hardening

This is where stardelt earns the "battle-tested" claim.

**Adds:**

- **OpenBao** replaces the K8s Secrets path
- **Multi-AZ HA**, documented RTO ≤ 1h / RPO ≤ 15min
- **Air-gap install profile** (Harbor mirror bundle, `images.tar`)
- **Sovereign-cloud CI matrix**: STACKIT, OVHcloud, IONOS, Hetzner, Open Telekom Cloud, Scaleway alongside EKS / GKE / AKS / OpenShift
- **Audit retention into Iceberg** (long-term, queryable via Trino)
- **Compliance starter kits**: SOC2, ISO27001, BSI C5, FedRAMP-on-your-own-cluster control mappings
- **Performance track — Apache Gluten + Velox** for Spark/Trino native vectorized execution (the OSS answer to proprietary vectorized engines)
- **First 10 documented production references**

## Phase 6 — Hosted stardelt (optional, commercial)

Only happens if community pull justifies it. The multi-tenancy primitives from Phase 1 already exist (`Tenant` CRD, OpenFGA realms per tenant, cost attribution by tenant), so the work is operational, not architectural:

- Managed control plane
- Self-service onboarding
- Billing
- Support tier

The hosted version remains optional. Self-hosting will always be the canonical path.

## What we are *not* doing in v1

- No fully managed SaaS (Phase 6 only, optional).
- No proprietary query engine. Trino + DuckDB are good enough for ~95% of real workloads.
- No OLTP / Postgres replacement.
- No replacement for the underlying Kubernetes cluster. Bring your own.
- No "we beat the proprietary incumbents on TPC-DS" claims. The pitch is **predictable cost, sovereignty, openness** — not raw speed. Performance work in Phase 5.
- No multi-cluster federation in v1. Phase 5+ at earliest.
- No edge / small-footprint mode in v1. Interesting future; out of scope today.

## How decisions are made

Until governance is formalized (target: end of Phase 1), decisions are made by consensus of active maintainers, anchored in:

1. This roadmap and the design spec.
2. The license policy in [LICENSES.md](architecture/licenses.md).
3. The sovereignty commitments in [SOVEREIGNTY.md](architecture/sovereignty.md).

Roadmap changes are made via pull request to this document. Significant scope changes require an issue and a discussion period.
