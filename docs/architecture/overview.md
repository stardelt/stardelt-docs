---
title: "Architecture overview"
sidebar_label: "Overview"
slug: /architecture/overview
---

# stardelt Architecture

stardelt is a Kubernetes-native data platform structured as four horizontal layers plus the **stardelt Nova** UI. This document describes the layered model, the operating model, the control-plane CRDs, and the cross-cutting concerns.

For the full design rationale see [`docs/superpowers/specs/2026-05-16-stardelt-design.md`](../design/master-spec.md).

## Layered model

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

See [diagrams/01-layers.mmd](../diagrams/layers) for the Mermaid version.

### L0 — Kubernetes (user-provided)

stardelt is *not* a Kubernetes distribution. Users bring any conformant cluster: EKS, GKE, AKS, OpenShift, Rancher RKE2, k3s, kind, kubeadm, or a sovereign-cloud K8s (STACKIT, OVHcloud, IONOS, Hetzner, Open Telekom Cloud, Scaleway). Supported Kubernetes versions: current N and N-1.

### L1 — Substrate (always installed)

Cluster-wide services every stardelt deployment depends on:

- **Identity**: Keycloak — SAML/OIDC/LDAP broker. Federates customer IdPs.
- **Secrets**: OpenBao (MPL-2.0, [documented exception](licenses.md#documented-license-exceptions)). PKI, dynamic credentials, KV store. Customers may BYO an existing Vault/OpenBao via External Secrets Operator.
- **Service mesh**: Cilium with Cilium Service Mesh — mTLS east-west, Hubble for audit-grade flow visibility.
- **Observability**: VictoriaMetrics (metrics), VictoriaLogs (logs), Jaeger (traces), Perses (dashboards). All Apache 2.0. Replaces the AGPL Grafana stack.
- **Cost attribution**: OpenCost with stardelt label-relabeling.
- **Optional**: Harbor (container registry mirror, required for air-gap installs); Envoy Gateway (north-south ingress).

### L2 — Data Foundation (always installed)

Shared services every pillar consumes:

- **Object storage**: SeaweedFS (primary, Apache 2.0, S3-compatible) or BYO-S3 (AWS S3, GCS, Azure Blob via S3, external Ceph, NetApp, etc.). CubeFS (CNCF Graduated) is a documented alternative.
- **Catalog (Iceberg REST)**: Lakekeeper (primary, Rust, first-class OpenFGA authz) or Apache Polaris (alternative, vendor-donated, ASF incubating).
- **Table format**: Apache Iceberg as default; Polaris's "generic tables" allow Hudi, Paimon, and Delta to coexist.
- **Policy**: OPA (admission-tier policy-as-code) + OpenFGA (relationship-based fine-grained authz at catalog/engine layer).
- **Lineage**: OpenLineage wire protocol + Marquez collector.
- **Data quality**: Soda Core (primary), Great Expectations and dbt tests as alternatives.

### L3 — Pillar engines (opt-in per tenant)

Tenants opt into pillars via the stardelt CRDs. Each pillar reuses the L1/L2 substrate.

| Pillar | Components |
|---|---|
| **Lakehouse SQL** | Trino · DuckDB · Apache Kyuubi (SQL gateway) · Apache Superset (BI) · JupyterHub |
| **Batch ETL** | Apache Spark (Spark Operator) · Apache Airflow · Argo Workflows · dbt-core · SQLMesh · Apache SeaTunnel |
| **Streaming** | Apache Kafka (Strimzi) · Apicurio Registry · Apache Flink · RisingWave · Debezium |
| **ML / AI** | KubeRay · Kubeflow Pipelines · MLflow · Feast · KServe · vLLM · Qdrant · Envoy AI Gateway |

### L4 — stardelt Control Plane

The differentiator. A single declarative CRD set composes the underlying components.

| CRD | Scope | Purpose |
|---|---|---|
| `PlatformInstance` | cluster singleton | What's enabled — pillars on, shared identity/storage/catalog config |
| `Tenant` | namespace | Logical tenant: Keycloak group binding, quotas, network policies, catalog namespace, OpenFGA realm |
| `Lakehouse` | per tenant | Catalog namespace + storage credentials + engines (Trino, DuckDB) |
| `Pipeline` | per tenant | EL (SeaTunnel) + transformation (dbt/SQLMesh) + orchestration (Airflow/Argo) |
| `StreamApp` | per tenant | Kafka topic + Flink job or RisingWave materialized view + sink |
| `MLWorkspace` | per tenant | Jupyter + Ray cluster + MLflow + Feast + KServe |

The **`stardelt-platform-operator`** reconciles these into per-component CRDs (`TrinoCluster`, `SparkApplication`, `KafkaCluster`, `RayCluster`, etc.). See [diagrams/02-control-plane.mmd](../diagrams/control-plane).

### stardelt Nova (spans all layers)

A first-class web UI that fixes the "every component has its own UI" problem.

- **Single SSO landing** via Keycloak. Authenticate once.
- **Native screens** for cross-cutting concerns: tenant/workspace management, unified catalog browser (Iceberg tables across Lakekeeper namespaces), lineage graph (OpenLineage), audit search, cost-per-tenant view (OpenCost), platform health.
- **Embeds / deep-links** to each tool's native UI with SSO tokens carried through (Trino UI, Superset, Airflow UI, JupyterHub, MLflow, Lakekeeper UI, etc.). We do not re-implement query editors or notebook UIs.
- Stack: TypeScript + React + Tailwind (front-end), Rust + axum (back-end). Apache 2.0.

## Operating model

stardelt follows the **operator-per-component pattern**, with a thin **control plane operator** on top.

- **Per-component operators** are Rust on `kube-rs` where stardelt writes them, or adopted upstream (Strimzi, KubeRay, Spark Operator, CloudNative-PG, etc.) where mature.
- **Cross-cutting operators** borrowed conceptually from Stackable: `stardelt-secret-operator` (CSI-mounted ephemeral creds from OpenBao) and `stardelt-listener-operator` (uniform exposure abstraction).
- **`stardelt-platform-operator`** is the new layer: reconciles top-level CRDs into per-component CRDs.

## Data flow

The canonical lakehouse read path:

```
                    ┌────────────────────┐
   client (BI,      │ stardelt Nova /     │
   notebook,    ──▶ │ Trino / DuckDB /   │
   Spark job)       │ Spark              │
                    └─────────┬──────────┘
                              │ OIDC token (Keycloak)
                              │ + Iceberg REST query
                              ▼
                    ┌────────────────────┐
                    │ Lakekeeper          │
                    │ (Iceberg REST       │
                    │  Catalog)           │
                    └─────────┬──────────┘
                              │ table metadata +
                              │ vended object-store creds
                              ▼
                    ┌────────────────────┐
                    │ SeaweedFS           │
                    │ (or BYO S3)         │
                    └────────────────────┘
                              │ Parquet files
                              ▼
                          (read by engine)
```

OpenFGA is consulted by Lakekeeper on every metadata operation; OPA is consulted by the K8s API server on every CRD mutation. OpenLineage events are emitted by engines and the catalog into Marquez. Audit events flow to Kafka topic `stardelt.audit.v1` → VictoriaLogs (short-term) + Iceberg `stardelt_audit.events` (long-term).

See [diagrams/03-data-flow.mmd](../diagrams/data-flow).

## Multi-tenancy

Multi-tenancy primitives exist in v1 even though MVP deployments are single-tenant. This avoids a rewrite when the optional hosted stardelt arrives in Phase 6.

- `Tenant` CRD is real on day one.
- Every stardelt resource carries a `stardelt.io/tenant` label.
- Audit events carry `tenant_id`.
- OpenCost groups costs by tenant label.
- OpenFGA has a realm or namespace per tenant.
- Cilium NetworkPolicies isolate tenant namespaces by default.

## Sovereignty architecture

[Full commitments in SOVEREIGNTY.md.](sovereignty.md) Architectural enforcement:

- **No mandatory outbound calls.** Documented network-egress matrix per release.
- **Air-gap install profile.** All images at `ghcr.io/stardelt/...` plus mirrors; `images.tar` bundle ships with each release.
- **No license server.** There isn't one. There will never be one.
- **Opt-in telemetry only.** Off by default.

## Compliance

stardelt is *evidence-gathering infrastructure*, not a certified product. Phase 5 ships control-mapping starter kits for SOC2, ISO27001, BSI C5, and FedRAMP-on-your-own-cluster. Certifications remain the customer's responsibility.

## What this document does not cover

- Detailed CRD schemas — Phase 1 implementation plan.
- Engine-specific tuning — Phase 1+ operator docs.
- Migration playbooks from proprietary SaaS lakehouse platforms — Phase 5+ guide.
- Multi-cluster federation — Phase 5+ at earliest.
