---
title: "Roadmap"
sidebar_label: "Roadmap"
slug: /roadmap
---

# stardelt Roadmap

stardelt is a multi-year vision. Each phase produces something demoable and usable on its own — not "half-built monolith until v1.0."

The MVP (Phase 0 + Phase 1) is the only milestone needed to validate the bet. Phases 2–6 are gated on community pull.

Each phase adds components only as a default behind an existing contract (the plug matrix in the architecture overview). Where a phase's component list and the plug matrix disagree, **the plug matrix wins** — a service enters a phase only as a default behind an existing contract.

## Phase 0 — Done — Research, design, branding

**Goal**: make the case strong enough to recruit collaborators.

**Deliverables (this repository):**

- [x] Design spec — product definition, plug matrix, principles, sequencing, decision record
- [x] [Architecture](architecture/overview.md)
- [x] [Services](architecture/services.md) with license verification
- [x] [License policy](architecture/licenses.md) — accepted, exception, rejected
- [x] [Sovereignty commitments](architecture/sovereignty.md)
- [x] Roadmap — this document
- [x] [README](https://github.com/stardelt) — marketing-ready
- [x] Brand: logo, wordmark

### Current stage (2026-10)

The design is done, and the platform is no longer paper. A live single-node **dev environment** exists —
Hetzner **k3s** (`cx33`, ~€10/month) running the **core** profile (CloudNativePG, SeaweedFS, Lakekeeper,
Trino) plus **Nova** and **JupyterHub**, with Let's Encrypt TLS served through the `dev/playground`
ingress-nginx. [alpha.dev.stardelt.io](https://alpha.dev.stardelt.io) is Nova; `trino.` and `jupyter.`
answer on the same domain. **Superset and Airflow are not installed** there — they need the `full` profile
and a 16 GB node.

What has moved since this page was first written:

- **The control plane reconciles.** `Tenant`, `PlatformInstance` and `Lakehouse` reconcile against the live
  cluster: namespaces are created, and each component's upstream Helm release is planned, and applied with
  `spec.dryRun: false`, behind an adopt guard that refuses to take over a release the operator did not
  create.
- **Images are built by CI.** Merge to `main` publishes `ghcr.io/stardelt/*` with an immutable tag plus a
  digest, which is what deployments pin — no more hand-built images on the node.
- **The install is values-driven.** The umbrella chart in `stardelt-platform/chart` takes the
  cluster-specific decisions as settings — domain, ingress class, TLS issuer, storage class, registry pull
  secrets — so the same chart fits a cluster other than this one. See
  [Your own cluster](getting-started/your-cluster).
- **Nova reports the platform it runs on.** Apps are probed live, and Health lists every workload with the
  image it actually runs, digests included.


## Phase 1 — Lakehouse MVP

**Goal**: `kubectl apply -f lakehouse.yaml` → 15 minutes later, you're querying an Iceberg table in Trino through stardelt Nova.

This is the wedge. A single working pillar with the composed control plane proves the differentiator.

**Scope** (✅ = running on the dev cluster today, ◐ = partial):

- L1 (substrate, minimum viable): Keycloak, **K8s Secrets** ✅ (OpenBao deferred to Phase 5), VictoriaMetrics + VictoriaLogs + Perses + Jaeger, OpenCost
- L2 (data foundation): SeaweedFS (+ BYO-S3 path) ✅, Lakekeeper ✅, Apache Iceberg ✅, OPA + OpenFGA bootstrap, OpenLineage emit-only
- L3 Pillar 1 (Lakehouse SQL only): Trino ✅, DuckDB, Apache Superset (not on the dev node — `full` profile), JupyterHub ✅
- L4 (stardelt-native): `stardelt-operator` ◐ (CRDs, reconcile planner and a Helm-backed controller for `PlatformInstance` and `Lakehouse`; no `IngestionSource` / `Pipeline` controller yet), **Nova MVP** ✅ (catalog browser, SQL editor, load & transfer, jobs, platform apps and health, Superset embed, an illustrative lineage page — SSO in progress), `stardelt` CLI

**Validation** (✅ done today, ◐ partial, — not started):

- Single-cluster, single-tenant. ✅
- Development on the Hetzner k3s cluster (`stardelt-platform/dev/hetzner-k3s`); `kind` demo for the core slice. ✅ — the k3s cluster is live; the kind path installs the same `core` profile through the platform Makefile, and a nightly workflow in the demo repository exercises it.
- Documented install path for real clusters. ◐ — `make install` / `make install-core` are documented and in use, and `make chart-install` offers the same components as one umbrella Helm chart; the install is bash or Helm, not a CRD.
- First 5 pilot users. — the dev environment is public at `alpha.dev.stardelt.io`; no pilots yet.

## Phase 2 — Batch ETL pillar

**Adds:**

- Apache Spark via Spark Operator
- Apache Airflow + Argo Workflows
- dbt-core + SQLMesh
- Apache SeaTunnel
- `Pipeline` CRD (the type and planner rules exist today; the Airflow / Spark adapters land here)
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
- Nova: the sovereign copilot (NL→SQL over the governed catalog) — v1 design in Copilot research and proposal; the plug matrix fixes its phase
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
