---
title: "Phase 0 design spec"
sidebar_label: "Master spec"
slug: /design/master-spec
description: "stardelt master design spec (2026-05-16). Canonical rationale for component selection and the layered architecture."
---

# stardelt — Phase 0 Design Spec

*Status: draft (2026-05-16) · Authors: martin (originator), claude (drafting)*

> A Kubernetes-native, fully open-source data platform that delivers Lakehouse SQL, Batch ETL, Streaming, and ML/AI on any cloud or on-prem cluster — under your own sovereignty, without vendor lock-in.

## 1. Vision & Positioning

### Elevator pitch

Proprietary cloud data platforms gave you SQL and ML without servers — and took your data sovereignty in exchange. **stardelt gives you the same capabilities — on your servers, in your country, under your control.**

### Four differentiating claims (the marketing core)

1. **Total sovereignty.** stardelt runs end-to-end inside your perimeter — control plane, compute, catalog, storage, identity, every single byte. The dominant proprietary lakehouse platforms are SaaS; even their BYOC offerings keep the control plane at the vendor and phone home for licensing and telemetry. With stardelt, nothing leaves your cluster unless you tell it to. EU companies escape US CLOUD Act exposure. Defense and public-sector workloads can run air-gapped. Reversible by design — your tables stay in open Iceberg format on your storage; uninstalling stardelt doesn't take your data with it.
2. **No vendor handcuffs.** 100% OSI permissive (Apache 2.0 / MIT / BSD) with one documented MPL-2.0 exception for the OpenBao secrets backend. Zero BSL, SSPL, ELv2, or AGPL components.
3. **One CRD, not 47 YAMLs.** A composed control plane (`PlatformInstance`, `Tenant`, `Lakehouse`, `Pipeline`, `StreamApp`, `MLWorkspace`) sits on top of per-component operators. This is the gap Stackable left open and the experience proprietary-SaaS lakehouse users expect.
4. **Modern stack, no Hadoop heritage.** Iceberg via Lakekeeper or Apache Polaris (REST catalogs), Trino + DuckDB for SQL, RisingWave for streaming SQL, OpenFGA for fine-grained authorization, OpenBao for secrets, VictoriaMetrics/VictoriaLogs + Perses for observability. Not Hive Metastore + Grafana + MinIO.

### Target user (v1)

Platform engineers and data engineers at mid-to-large companies who already run Kubernetes, who can't justify proprietary-SaaS per-credit pricing, and who need an answer to "but our compliance team won't let us use US hyperscalers." Strong fit for: regulated industries (banks, healthcare, public sector, defense), European companies under GDPR/Schrems II pressure, sovereign-cloud adopters (STACKIT, OVHcloud, IONOS, Hetzner, Open Telekom Cloud, Scaleway).

### Non-goals

- Not a fully managed SaaS in v1 (deferred to optional Phase 6).
- Not a beginner tool. Users must be comfortable with Kubernetes basics.
- Not an OLTP / Postgres replacement.
- Not faster than the proprietary incumbents on synthetic benchmarks. The pitch is *predictable cost, sovereignty, openness* — not raw speed.

---

## 2. Architecture

stardelt is structured as four horizontal layers plus the **stardelt Nova** UI that spans all of them.

```
┌──────────────────────────────────────────────────────────────────┐
│                         STARDELT NOVA  (UI)                       │
│   SSO landing │ tenant mgmt │ catalog browser │ lineage │ cost  │
│   audit search │ platform health │ deep-links to native UIs      │
├──────────────────────────────────────────────────────────────────┤
│  L4 │  STARDELT CONTROL PLANE  (CRDs)                            │
│     │  PlatformInstance · Tenant · Lakehouse · Pipeline ·         │
│     │  StreamApp · MLWorkspace                                    │
├──────────────────────────────────────────────────────────────────┤
│  L3 │  PILLAR ENGINES  (opt-in per tenant)                       │
│     │  Lakehouse SQL · Batch ETL · Streaming · ML/AI · BI/UX      │
├──────────────────────────────────────────────────────────────────┤
│  L2 │  DATA FOUNDATION  (always installed)                       │
│     │  Catalog · Iceberg · Object storage · Policy · Lineage      │
├──────────────────────────────────────────────────────────────────┤
│  L1 │  SUBSTRATE  (always installed)                              │
│     │  Identity · Secrets · Mesh · Observability · Cost            │
├──────────────────────────────────────────────────────────────────┤
│  L0 │  KUBERNETES  (user brings it)                               │
└──────────────────────────────────────────────────────────────────┘
```

### Operating model

- **Per-component operators**, predominantly Rust on `kube-rs`, following Stackable and Lakekeeper conventions. Where mature upstream operators exist (Strimzi for Kafka, KubeRay for Ray, Spark Operator), we adopt them. We only write operators where there is a real OSS gap.
- **Control plane operator (`stardelt-platform-operator`)** reconciles the top-level stardelt CRDs into per-component CRDs.
- **Cross-cutting operators** borrowed conceptually from Stackable: a `secret-operator` (CSI-mounted ephemeral credentials, backed by OpenBao) and a `listener-operator` (uniform exposure: ClusterIP / LoadBalancer / Ingress / Gateway API).

### Control plane CRDs

| CRD | Scope | Purpose |
|---|---|---|
| `PlatformInstance` | cluster singleton | What's enabled at all — pillars on, shared identity/storage/catalog config |
| `Tenant` | namespace | Logical tenant: Keycloak group binding, quotas, network policies, catalog namespace, OpenFGA realm |
| `Lakehouse` | per tenant | Catalog namespace + storage credentials + engines (Trino, DuckDB) |
| `Pipeline` | per tenant | EL (SeaTunnel) + transformation (dbt/SQLMesh) + orchestration (Airflow/Argo) |
| `StreamApp` | per tenant | Kafka topic + Flink job or RisingWave materialized view + sink |
| `MLWorkspace` | per tenant | Jupyter + Ray cluster + MLflow tracking + Feast features + KServe serving |

### Multi-tenancy primitives (v1)

Reserved in the data model from day one so the eventual hosted stardelt doesn't require a rewrite:

- `Tenant` CRD with quotas, identity binding, network policy, catalog namespace
- All stardelt resources scoped by `tenant` label; audit events carry `tenant_id`
- OpenFGA realm per tenant (or shared realm with tenant-scoped relations)
- Cost attribution by tenant label (OpenCost relabeling rules)
- Nova UI tenant-aware (MVP: one tenant; later: tenant switcher)

### Sovereignty commitments (architectural, not marketing)

- **Zero mandatory phone-home.** No telemetry, no license server, no usage callbacks. Optional opt-in anonymous metrics off by default.
- **Air-gap installable.** Helm/OLM bundles ship all images. Harbor mirror path documented. No runtime outbound DNS required.
- **Mirrorable container registry.** All images at a single prefix (`ghcr.io/stardelt/...`), with sovereign-cloud mirror guidance.
- **Validated on sovereign clouds.** CI matrix targets STACKIT, OVHcloud, IONOS, Hetzner, Open Telekom Cloud, Scaleway alongside EKS/GKE/AKS.
- **Open formats only at rest.** Iceberg + Parquet for tables, OpenLineage JSON for lineage, OpenMetrics for metrics.

---

## 3. Component Map

License legend: ✓ verified live during Phase 0 · ◯ from research (re-verify before release).

### L1 — Substrate

| Slot | Primary | Alternative | License |
|---|---|---|---|
| Identity (SAML/OIDC/LDAP) | Keycloak | Dex, Zitadel | Apache 2.0 ◯ |
| Secrets / PKI / dynamic creds | **OpenBao** | External Secrets Operator (BYO) | **MPL 2.0** ✓ — documented exception |
| Service mesh (mTLS + audit) | Cilium | Istio | Apache 2.0 ◯ |
| Metrics | VictoriaMetrics | Prometheus + Thanos | Apache 2.0 ◯ |
| Logs | VictoriaLogs | OpenSearch | Apache 2.0 ◯ |
| Traces | Jaeger | — | Apache 2.0 ◯ |
| Dashboards | Perses | OpenSearch Dashboards | Apache 2.0 ◯ |
| Cost attribution | OpenCost | — | Apache 2.0 ◯ |
| Container registry (optional) | Harbor | Zot | Apache 2.0 ◯ |
| Ingress / Gateway | Envoy Gateway | Contour | Apache 2.0 ◯ |

### L2 — Data Foundation

| Slot | Primary | Alternative | License |
|---|---|---|---|
| Object storage | **Apache Ozone** | BYO-S3, CubeFS (CNCF Graduated), SeaweedFS | Apache 2.0 ✓ |
| Catalog (Iceberg REST) | **Lakekeeper** | Apache Polaris 1.3.0-incubating | Apache 2.0 ✓ |
| Table format | Apache Iceberg | Hudi, Paimon, Delta (via Polaris generic tables) | Apache 2.0 ◯ |
| Policy engine | OPA + OpenFGA | — | Apache 2.0 ◯ |
| Lineage | OpenLineage + Marquez | DataHub, OpenMetadata | Apache 2.0 ◯ |
| Data quality | Soda Core | Great Expectations, dbt tests | Apache 2.0 ◯ |

### L3 — Pillar 1: Lakehouse / SQL

| Slot | Primary | Alternative | License |
|---|---|---|---|
| Interactive MPP SQL | Trino | StarRocks, Doris | Apache 2.0 ◯ |
| Embedded / notebook SQL | DuckDB | ClickHouse | MIT ◯ |
| Multi-tenant SQL gateway | Apache Kyuubi | — | Apache 2.0 ◯ |

### L3 — Pillar 2: Batch ETL

| Slot | Primary | Alternative | License |
|---|---|---|---|
| Distributed compute | Apache Spark (Spark Operator) | Ray | Apache 2.0 ◯ |
| Orchestration | Apache Airflow | Argo Workflows, DolphinScheduler | Apache 2.0 ◯ |
| SQL transformation | dbt-core + SQLMesh | — | Apache 2.0 ◯ |
| Ingestion / EL connectors | Apache SeaTunnel | Meltano | Apache 2.0 ◯ |

### L3 — Pillar 3: Streaming

| Slot | Primary | Alternative | License |
|---|---|---|---|
| Stream broker | Apache Kafka via Strimzi | Apache Pulsar | Apache 2.0 ◯ |
| Schema registry | Apicurio Registry | Karapace | Apache 2.0 ◯ |
| Stream processing | Apache Flink | Apache Beam | Apache 2.0 ◯ |
| Streaming SQL / mat. views | RisingWave | Flink SQL, Pinot, Druid | Apache 2.0 ✓ |
| CDC | Debezium | Flink CDC | Apache 2.0 ◯ |

### L3 — Pillar 4: ML / AI

| Slot | Primary | Alternative | License |
|---|---|---|---|
| Distributed training | Ray (KubeRay) | Kubeflow Training Operator | Apache 2.0 ◯ |
| ML pipelines | Kubeflow Pipelines | Argo Workflows, Metaflow | Apache 2.0 ◯ |
| Experiment tracking | MLflow | Aim | Apache 2.0 ◯ |
| Feature store | Feast | — | Apache 2.0 ◯ |
| Model serving | KServe + vLLM | BentoML, Ray Serve | Apache 2.0 ◯ |
| Vector DB | Qdrant | Milvus, pgvector | Apache 2.0 ◯ |
| Notebooks | JupyterHub (Z2JH) | code-server | BSD-3 / MIT ◯ |
| LLM gateway | Envoy AI Gateway | LiteLLM | Apache 2.0 ◯ |

### L3 — BI / User-facing

| Slot | Primary | Alternative | License |
|---|---|---|---|
| BI / dashboards | Apache Superset | Lightdash (verify OSS posture) | Apache 2.0 ◯ |
| Error tracking | GlitchTip | — | Apache 2.0 ◯ |

### L4 — stardelt-native (we build)

| Component | Purpose | Stack |
|---|---|---|
| `stardelt-platform-operator` | Reconciles top-level CRDs | Rust + kube-rs |
| `stardelt-secret-operator` | CSI-mounted ephemeral creds | Rust + kube-rs |
| `stardelt-listener-operator` | Uniform exposure abstraction | Rust + kube-rs |
| **stardelt Nova** | Unified UI: SSO, tenants, catalog, lineage, cost, audit | TypeScript + React (front), Rust + axum (back) |
| `stardelt` CLI | Day-1 install + Day-2 ops + demos | Rust |

### Hard rejection list (license-disqualified)

MinIO (AGPL + archived April 2026), Grafana / Loki / Tempo / Mimir (AGPL since 2021–2024), HashiCorp Vault / Terraform / Consul / Nomad / Boundary / Packer (BSL since 2023), Elasticsearch / Kibana (Elastic License / SSPL / AGPL hybrid), Redpanda (BSL), Materialize (BSL), Confluent Platform / ksqlDB / Confluent Schema Registry (Confluent Community License), Airbyte platform (ELv2), Seldon Core v2 (BSL), Metabase (AGPL), Sentry (FSL), Kubecost Enterprise (open-core), Garage (AGPL), Dagster Cloud / Prefect Cloud / Astronomer (proprietary), MongoDB (SSPL).

### Pre-release license verifications

Re-verify the live `LICENSE` file for these before any v1 release: StarRocks (dual-license modules), Authentik (enterprise modules), SQLMesh, Prefect, Kestra, Bytewax, Karapace, Quickwit, SigNoz, LiteLLM, Weaviate, Lightdash, Featureform, GlitchTip, ClearML, Infisical.

---

## 4. Enterprise, Governance, Multi-Tenancy

### Identity & SSO

Keycloak is the only IdP stardelt cares about. Customer IdPs (Okta, Entra ID, Google Workspace, on-prem AD/LDAP) federate into Keycloak via SAML or OIDC; Keycloak is the broker. One realm per stardelt cluster; tenants map to Keycloak groups. All stardelt components consume OIDC tokens from Keycloak: Trino, Lakekeeper, Superset, JupyterHub, Airflow, Nova UI. Users authenticate once at Nova; deep-link tokens carry through to native component UIs. Optional: customer brings their own Keycloak/Authentik/Dex and stardelt accepts an external OIDC issuer URL.

### Authorization (two-layer)

- **OPA (Open Policy Agent)** — coarse-grained policy-as-code at Kubernetes admission and API-gateway layers. "Can this user create a `Lakehouse`?" "Is this Spark job allowed on this node pool?"
- **OpenFGA** — fine-grained, relationship-based (Google Zanzibar model) behind the catalog. "Can user X read column Y of table Z?"
- Column/row policies expressed as OpenFGA tuples + Iceberg view definitions, engine-enforced via Trino/Spark filters.

### Audit

- Single audit pipeline: every stardelt component emits structured JSON to Kafka topic `stardelt.audit.v1`.
- A stardelt-shipped Flink job tees the topic into: (a) VictoriaLogs for short-term operator search, (b) Iceberg table `stardelt_audit.events` for long-term retention and analytics.
- Nova UI ships an Audit Search screen over (a). Security teams query (b) via Trino.
- Event schema is OpenTelemetry-compatible with stardelt extensions for tenant/principal context.

### Lineage

OpenLineage is the wire protocol — Spark, Airflow, dbt, Flink, Trino, SQLMesh emit it natively in 2026. Marquez collects and persists. Catalog mutations (Lakekeeper) also emit OpenLineage events so DDL is captured, not just queries. Nova UI ships the lineage graph view over Marquez's API.

### Cost transparency

OpenCost scrapes K8s usage and attributes by namespace and label. stardelt-shipped Prometheus relabeling rules attach `stardelt.io/tenant` and `stardelt.io/pillar` labels to every workload. Nova UI ships per-tenant and per-pillar cost views. Pitch: *Proprietary platforms hide credits. stardelt shows you exactly which team's Spark job spent the GPU hour.*

### Backup, DR, HA

| Concern | Mechanism |
|---|---|
| Iceberg tables | Object-store-level replication (Ozone multi-site; BYO-S3 vendor replication) |
| Catalog (Lakekeeper) metadata | CloudNative-PG with WAL archival to object store |
| Keycloak | CloudNative-PG + Velero of K8s resources |
| Kafka | Strimzi MirrorMaker 2 for cross-cluster replication |
| Stateful operator data | Velero + per-component data backup hooks |
| Documented RTO/RPO | Target: RTO ≤ 1h control plane, RPO ≤ 15min catalog (tunable) |

### Compliance posture

stardelt is *evidence-gathering infrastructure*, not a certified product. Customers pursuing SOC2, ISO27001, BSI C5, FedRAMP-on-your-own-cloud, etc. inherit stardelt's controls; certifications are theirs to obtain. stardelt ships control-mapping starter kits in Phase 5.

---

## 5. Roadmap

### Phase 0 — Now — Research, design, branding

This document, the docs scaffolding, the README, the logo, the LICENSES.md, the diagrams. No code. Goal: recruit collaborators.

### Phase 1 — Lakehouse MVP — the control-plane proof point

End-to-end `kubectl apply -f lakehouse.yaml` → 15 minutes later, query an Iceberg table in Trino via stardelt Nova.

- L1 minimum: Keycloak, K8s Secrets (OpenBao deferred to P5), VictoriaMetrics + VictoriaLogs + Perses, OpenCost
- L2: Apache Ozone (+ BYO-S3 path), Lakekeeper, Iceberg, OPA + OpenFGA bootstrap, OpenLineage emit-only
- L3 Pillar 1 only: Trino, DuckDB, Superset, JupyterHub
- L4: `stardelt-platform-operator` (only `PlatformInstance`, `Tenant`, `Lakehouse`), basic secret-operator, basic listener-operator, **Nova MVP** (SSO landing + catalog browser + simple cost view + audit search), `stardelt` CLI
- Validation: single-cluster, single-tenant; kind/k3d demo + real-cluster install guide

### Phase 2 — Batch ETL pillar

Spark (Spark Operator), Airflow, Argo Workflows, dbt-core, SQLMesh, SeaTunnel. `Pipeline` CRD. Nova adds pipelines view, DAG visualization, run history.

### Phase 3 — Streaming pillar

Kafka via Strimzi, Apicurio Registry, Flink, RisingWave, Debezium. `StreamApp` CRD. Nova adds streams view, topic browser, materialized-view explorer.

### Phase 4 — ML/AI pillar

KubeRay, Kubeflow Pipelines, MLflow, Feast, KServe, vLLM, Qdrant. `MLWorkspace` CRD. Nova adds ML workspace view, model registry, serving endpoints, vector-DB browser.

### Phase 5 — Production hardening

- OpenBao replaces K8s Secrets path
- Multi-AZ HA + documented RTO ≤ 1h / RPO ≤ 15min
- Air-gap install profile (Harbor mirror bundle, `images.tar`)
- Sovereign-cloud CI matrix: STACKIT, OVHcloud, IONOS, Hetzner, Open Telekom Cloud, Scaleway alongside EKS/GKE/AKS
- Audit retention into Iceberg long-term
- Compliance starter kits (SOC2, ISO27001, BSI C5, FedRAMP control mappings)
- **Performance track: Apache Gluten + Velox** for Spark/Trino native vectorized execution (the OSS answer to proprietary vectorized engines)
- First 10 documented production references

### Phase 6 — Hosted stardelt (optional commercial spin-out)

Only happens if community pull justifies it. Multi-tenancy primitives from Phase 1 are already real, so the work is: managed control plane, self-service onboarding, billing, support tier.

### Effort sizing (rough, not commitments)

| Phase | Small team (3–5 eng) | Single maintainer + contribs |
|---|---|---|
| Phase 0 | done in this conversation | done in this conversation |
| Phase 1 — Lakehouse MVP | 6–9 months | 12–18 months |
| Phase 2 — Batch | 3–4 months | 6–9 months |
| Phase 3 — Streaming | 4–6 months | 9–12 months |
| Phase 4 — ML/AI | 4–6 months | 9–12 months |
| Phase 5 — Hardening | 6–9 months | 12+ months |
| Phase 6 — Hosted | 12+ months | unrealistic solo |

---

## 6. Out of scope (v1)

- Fully managed SaaS
- OLTP / Postgres replacement
- A proprietary query engine (we ship Trino + DuckDB)
- Replacing the user's Kubernetes cluster (we run *on* K8s, we don't install it)
- Multi-cluster federation (Phase 5+ at earliest)
- Edge-only mode (small-footprint stardelt — interesting future, out of scope for v1)

## 7. Open questions / pre-release verifications

1. Live `LICENSE` file re-verification for the components listed in §3's "Pre-release license verifications" line.
2. Trademark and domain claim for "stardelt" and "stardelt Nova" (USPTO, EUIPO, .io / .dev / .com).
3. GitHub organization claim: `stardelt`.
4. Governance model: BDFL-style (single maintainer) vs. lightweight steering committee from day one. Reserve trademark to a future foundation entity.
5. Code of Conduct, CONTRIBUTING, GOVERNANCE — deferred to Phase 1 start.
6. License of the project itself: **Apache 2.0** — locked in.

## 8. Out of this spec — handed to writing-plans next

Phase 0 deliverables are complete in this conversation. Phase 1 implementation is *not* planned in this document; that's the next session's job (writing-plans skill), using this spec as input.
