---
title: "Component map"
sidebar_label: "Components"
slug: /architecture/components
---

# stardelt Component Map

:::info Implementation detail
Engineering depth for this page lives in [Components — Implementation](./components-impl).
:::

The full inventory of upstream OSS projects stardelt composes, organized by architectural layer. License legend: **✓** verified live during Phase 0 research · **◯** from research; re-verify the live `LICENSE` file before any stardelt release.

For the *why* (signature picks, rationale), see the [Architecture doc](overview.md) and [the design spec](../design/master-spec.md).

For the rejection list (BSL / SSPL / AGPL components that look attractive but we cannot ship), see [LICENSES.md](licenses.md).

## L1 — Substrate

| Slot | Primary | Alternative | License |
|---|---|---|---|
| Identity (SAML / OIDC / LDAP) | **Keycloak** | Dex, Zitadel | Apache 2.0 ◯ |
| Secrets / PKI / dynamic creds | **OpenBao** | External Secrets Operator (BYO Vault/KMS) | **MPL 2.0** ✓ — [documented exception](licenses.md#documented-license-exceptions) |
| Service mesh (mTLS + audit) | **Cilium** + Cilium Service Mesh | Istio | Apache 2.0 ◯ |
| Metrics | **VictoriaMetrics** | Prometheus + Thanos | Apache 2.0 ◯ |
| Logs | **VictoriaLogs** | OpenSearch | Apache 2.0 ◯ |
| Traces | **Jaeger** | — | Apache 2.0 ◯ |
| Dashboards | **Perses** (CNCF Sandbox) | OpenSearch Dashboards | Apache 2.0 ◯ |
| Cost attribution | **OpenCost** (CNCF) | — | Apache 2.0 ◯ |
| Container registry (optional, for air-gap) | **Harbor** (CNCF Graduated) | Zot | Apache 2.0 ◯ |
| Ingress / Gateway | **Envoy Gateway** | Contour | Apache 2.0 ◯ |

## L2 — Data Foundation

| Slot | Primary | Alternative | License |
|---|---|---|---|
| Object storage (S3-compatible) | **Apache Ozone** | BYO-S3 (AWS, GCS, Azure Blob, Ceph), CubeFS (CNCF Graduated), SeaweedFS | Apache 2.0 ✓ |
| Catalog (Iceberg REST) | **Lakekeeper** (Rust) | **Apache Polaris** (Java, 1.3.0-incubating Jan 2026) | Apache 2.0 ✓ |
| Table format | **Apache Iceberg** | Hudi, Paimon, Delta (via Polaris generic tables) | Apache 2.0 ◯ |
| Policy engine | **OPA** (admission-tier) + **OpenFGA** (data-tier) | — | Apache 2.0 ◯ |
| Lineage | **OpenLineage** + **Marquez** | DataHub, OpenMetadata | Apache 2.0 ◯ |
| Data quality | **Soda Core** | Great Expectations, dbt tests | Apache 2.0 ◯ |

## L3 — Pillar 1: Lakehouse / SQL

| Slot | Primary | Alternative | License |
|---|---|---|---|
| Interactive MPP SQL | **Trino** | StarRocks (verify ELv2 modules), Doris | Apache 2.0 ◯ |
| Embedded / notebook SQL | **DuckDB** | ClickHouse (single-node) | MIT ◯ |
| Federation | Trino connectors | Apache Calcite | Apache 2.0 ◯ |
| Multi-tenant SQL gateway | **Apache Kyuubi** | — | Apache 2.0 ◯ |
| BI / dashboards | **Apache Superset** | Lightdash (verify open-core posture) | Apache 2.0 ◯ |
| Notebooks | **JupyterHub** (Z2JH) | code-server | BSD-3 / MIT ◯ |

## L3 — Pillar 2: Batch ETL

| Slot | Primary | Alternative | License |
|---|---|---|---|
| Distributed compute | **Apache Spark** (Spark Operator) | Ray (for Python-native batch) | Apache 2.0 ◯ |
| Orchestration | **Apache Airflow** | Argo Workflows, DolphinScheduler | Apache 2.0 ◯ |
| SQL transformation | **dbt-core** + **SQLMesh** | — | Apache 2.0 ◯ |
| Ingestion / EL connectors | **Apache SeaTunnel** | Meltano | Apache 2.0 ◯ |

## L3 — Pillar 3: Streaming

| Slot | Primary | Alternative | License |
|---|---|---|---|
| Stream broker | **Apache Kafka** via **Strimzi** operator | Apache Pulsar | Apache 2.0 ◯ |
| Schema registry | **Apicurio Registry** | Karapace | Apache 2.0 ◯ |
| Stream processing | **Apache Flink** | Apache Beam, Bytewax | Apache 2.0 ◯ |
| Streaming SQL / materialized views | **RisingWave** | Flink SQL, Apache Pinot, Apache Druid | Apache 2.0 ✓ |
| CDC | **Debezium** | Flink CDC | Apache 2.0 ◯ |

## L3 — Pillar 4: ML / AI

| Slot | Primary | Alternative | License |
|---|---|---|---|
| Distributed training | **Ray (KubeRay)** | Kubeflow Training Operator | Apache 2.0 ◯ |
| ML pipelines | **Kubeflow Pipelines** | Argo Workflows, Metaflow | Apache 2.0 ◯ |
| Experiment tracking | **MLflow** | Aim | Apache 2.0 ◯ |
| Feature store | **Feast** | — | Apache 2.0 ◯ |
| Model serving | **KServe** + **vLLM** | BentoML, Ray Serve | Apache 2.0 ◯ |
| Vector DB | **Qdrant** | Milvus, pgvector | Apache 2.0 ◯ |
| LLM gateway | **Envoy AI Gateway** | LiteLLM (verify) | Apache 2.0 ◯ |

## Cross-cutting

| Slot | Primary | Alternative | License |
|---|---|---|---|
| Error tracking | **GlitchTip** | — | Apache 2.0 ◯ |
| Backup of K8s resources | **Velero** | — | Apache 2.0 ◯ |
| Database operator (Postgres for Lakekeeper, Keycloak, MLflow) | **CloudNative-PG** | — | Apache 2.0 ◯ |

## L4 — stardelt-native (we build)

| Component | Purpose | Stack |
|---|---|---|
| `stardelt-platform-operator` | Reconciles top-level CRDs (`PlatformInstance`, `Tenant`, `Lakehouse`, `Pipeline`, `StreamApp`, `MLWorkspace`) into per-component CRDs | Rust + kube-rs |
| `stardelt-secret-operator` | CSI-driven ephemeral credentials backed by OpenBao (Stackable-pattern) | Rust + kube-rs |
| `stardelt-listener-operator` | Uniform exposure abstraction (ClusterIP / LoadBalancer / Ingress / Gateway API) | Rust + kube-rs |
| **stardelt Nova** | Unified UI: SSO landing · tenant mgmt · catalog browser · lineage · cost view · audit search · deep-links | TypeScript + React + Tailwind (front); Rust + axum (back) |
| `stardelt` CLI | Day-1 install, Day-2 ops, demos | Rust |

## Pre-release license verifications

The following components are believed Apache/MIT/BSD as of Phase 0 research but have either had recent license drift, open-core arrangements, or ambiguity. **Re-verify the live `LICENSE` file before any stardelt release** and demote to alternative if drifted:

- StarRocks (dual Apache 2.0 / ELv2 modules — check which features land in which)
- Authentik (enterprise modules separately licensed)
- SQLMesh (Tobiko Data commercial product launch)
- Prefect (Cloud features pushing into OSS repo)
- Kestra (EE tier exists)
- Bytewax (platform pieces separately licensed)
- Karapace (Aiven-maintained, commercial repositioning)
- Quickwit (was AGPL briefly; verify post-Datadog acquisition status)
- SigNoz (open-core; verify community edition LICENSE)
- LiteLLM (Enterprise features added)
- Weaviate (BSD core; modules separately licensed)
- Lightdash (open-core moves)
- Featureform (likely open-core)
- GlitchTip (verify Apache 2.0)
- ClearML (commercial offering exists)
- Infisical (verify backend LICENSE)

## Component decision criteria

stardelt picks components by:

1. **License**: OSI permissive (Apache 2.0 / MIT / BSD). Single MPL-2.0 exception. No BSL / SSPL / ELv2 / AGPL — no exceptions.
2. **Production maturity in 2026**: real users, active commits, recent releases.
3. **Kubernetes nativeness**: clean K8s deployment, ideally with a maintained operator.
4. **Modern architecture**: 2020+ design choices, not Hadoop/HDFS heritage.
5. **Sovereignty compatibility**: no required outbound calls at runtime.
6. **Integration with adjacent picks**: e.g., Lakekeeper + OpenFGA + Iceberg + Trino is a known-good combination.

When two components score equally, stardelt prefers:

- CNCF or ASF projects over vendor-led ones (governance, sustainability).
- Rust or Go components over JVM where K8s controller-pattern fits (cold-start, footprint).
- Projects with explicit cloud-agnostic posture over those tightly coupled to one hyperscaler.
