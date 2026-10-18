---
title: "Services"
sidebar_label: "Services"
slug: /architecture/services
---

# stardelt Services

What stardelt installs, what it can install, and what it has specified but not built. The tiers match
the [master spec](../design/master-spec) §5 plug matrix — when the two disagree, the spec wins. For
how the services connect, see the [Overview](./overview); for licensing, [Licenses](./licenses).

| Tier | Meaning |
|---|---|
| **Core profile** | installed by `make install-core`, or the umbrella chart's default values |
| **Optional** | in the chart, off by default — enable per install |
| **Planned** | specified with a phase in the plug matrix; not in the install path |

## Core profile

### stardelt Nova

Unified web UI and API gateway: catalog browser over Iceberg tables (preview, columns, details), SQL
editor, load & transfer (CSV/JSON upload, table copy), jobs, lineage view, dashboards, platform health
that lists every workload with the image it actually runs, and live app status with deep-links into
the native UI of each service below. An offline demo mode (`NOVA_DEMO=1`) runs with no cluster. Single
SSO landing and audit search are planned. TypeScript + React front-end, Rust + axum back-end. Apache 2.0.

- Repo: [github.com/stardelt/stardelt-nova](https://github.com/stardelt/stardelt-nova)

### stardelt Operator

The control plane: it watches the stardelt CRDs (`PlatformInstance`, `Tenant`, `Lakehouse`,
`IngestionSource`, `Pipeline`; `StreamApp` planned at P3) and reconciles them into upstream Helm
releases. `Tenant` creates its namespace, `PlatformInstance` owns the cluster-scoped prerequisites,
`Lakehouse` plans storage + catalog per instance. New resources default to `spec.dryRun: true`, and an
`adopt` guard refuses to take over a release the operator did not create. Rust + `kube-rs`. Apache 2.0.

- Repo: [github.com/stardelt/stardelt-operator](https://github.com/stardelt/stardelt-operator)

### Apache Trino

Distributed MPP SQL engine — fast interactive queries over Iceberg, and what Nova's SQL editor and
Superset speak to. Apache 2.0.

- Site: [trino.io](https://trino.io)
- Repo: [github.com/trinodb/trino](https://github.com/trinodb/trino)

### Apache Iceberg

The open table format and the spine of the platform: every engine reads and writes the same tables
through the catalog below. It is not a service you install — it lives inside the engines. Apache 2.0.

- Site: [iceberg.apache.org](https://iceberg.apache.org)
- Repo: [github.com/apache/iceberg](https://github.com/apache/iceberg)

### Lakekeeper

Iceberg REST catalog. Vends table metadata and short-lived object-store credentials to engines, which
is where row/column policy and the single audit point attach. Apache Polaris and Gravitino are the
alternates behind the same contract. Apache 2.0.

- Site: [lakekeeper.io](https://lakekeeper.io)
- Repo: [github.com/lakekeeper/lakekeeper](https://github.com/lakekeeper/lakekeeper)

### SeaweedFS

S3-compatible distributed object store; the default data plane for Iceberg files. Bring your own
S3-compatible storage instead (AWS S3, GCS via S3 interop, Azure Blob, Ceph, NetApp) — the
[your-cluster](../getting-started/your-cluster) page covers the settings. Apache 2.0.

- Repo: [github.com/seaweedfs/seaweedfs](https://github.com/seaweedfs/seaweedfs)

### CloudNativePG

Postgres operator and the cluster that holds Lakekeeper's own metadata. It is a platform prerequisite
rather than per-lakehouse component: the operator is cluster-scoped, so several lakehouses share one.
Apache 2.0.

- Site: [cloudnative-pg.io](https://cloudnative-pg.io)
- Repo: [github.com/cloudnative-pg/cloudnative-pg](https://github.com/cloudnative-pg/cloudnative-pg)

## Optional components — in the chart, off by default

### Apache Superset

BI and dashboards over Trino; Nova deep-links into it and can embed it. Apache 2.0.

- Site: [superset.apache.org](https://superset.apache.org)
- Repo: [github.com/apache/superset](https://github.com/apache/superset)

### Apache Airflow

Workflow orchestration for batch and scheduled jobs, with the KubernetesExecutor so each task runs as
its own pod. Apache 2.0.

- Site: [airflow.apache.org](https://airflow.apache.org)
- Repo: [github.com/apache/airflow](https://github.com/apache/airflow)

### JupyterHub

Multi-user notebook environment: the front door for interactive analysis. Notebooks reach Trino
directly and, once heavy compute lands, Spark through Spark Connect. BSD-3. Shipped ahead of the
roadmap, which places workspaces in P2.

- Site: [jupyter.org/hub](https://jupyter.org/hub)
- Repo: [github.com/jupyterhub/jupyterhub](https://github.com/jupyterhub/jupyterhub)

## Planned services

Each entry names the phase from the plug matrix. None of these are installed by any profile today.

### Keycloak — P0

OIDC / SAML / LDAP identity provider, federating an upstream corporate IdP into stardelt. Skip it if
your cluster already has an OIDC provider: the contract is the protocol, not the product. Apache 2.0.

- Site: [keycloak.org](https://www.keycloak.org)

### Open Policy Agent — P0/P1

Policy enforcement for row/column security and platform resources, evaluated at the catalog so the
same rules apply to a dashboard, a pipeline and a notebook. Apache 2.0.

- Site: [openpolicyagent.org](https://www.openpolicyagent.org)

### OpenMetadata — P1

The metadata, lineage, glossary and quality spine. Lineage is *captured* from pipelines rather than
declared by hand, which is why it belongs in the control plane. Apache 2.0. DataHub is the alternate.

- Site: [open-metadata.org](https://open-metadata.org)

### Ingestion — Apache SeaTunnel, Apache NiFi, Debezium — P1

Three domains behind one `IngestionSource` contract: SaaS connectors (SeaTunnel), enterprise and edge
integration (NiFi), and change data capture (Debezium). Apache 2.0 for all three.

- [seatunnel.apache.org](https://seatunnel.apache.org) · [nifi.apache.org](https://nifi.apache.org) ·
  [debezium.io](https://debezium.io)

### Transforms and quality — dbt-core, Soda — P1

dbt models as the transform step of a `Pipeline`, with Soda and dbt tests as the quality gate, wired
into a `DataContract`. Apache 2.0 / Apache 2.0.

- [getdbt.com](https://www.getdbt.com) · [soda.io](https://soda.io)

### Apache Spark (Spark Connect) — P2

Distributed compute for jobs that outgrow Trino. Spark Connect exposes a persistent remote endpoint
(`sc://spark-connect-svc:15002`) so notebooks and clients connect without spawning a driver. Apache 2.0.

- Site: [spark.apache.org](https://spark.apache.org)

### Streaming — Apache Kafka (Strimzi) + Apache Flink — P3

Kafka as the event backbone (KRaft mode, no ZooKeeper), Flink for event-driven pipelines and CDC off
those topics, behind a `StreamApp` contract. RisingWave is the alternate. Apache 2.0.

- [kafka.apache.org](https://kafka.apache.org) · [strimzi.io](https://strimzi.io) ·
  [flink.apache.org](https://flink.apache.org)

### ML and sovereign AI — MLflow, KServe, vLLM/Ollama — P3

Model registry (`ModelRegistry`), model serving (`ModelService`, KServe-native) and on-prem LLM
inference for the Nova copilot (`ModelEndpoint`). AI runs on-prem by default; an external API is an
explicit operator choice. Apache 2.0.

- [mlflow.org](https://mlflow.org) · [kserve.github.io](https://kserve.github.io) ·
  [docs.vllm.ai](https://docs.vllm.ai)

### Observability — VictoriaMetrics, VictoriaLogs, Perses, Jaeger, OpenCost, Alertmanager — P5

Metrics, logs, dashboards, traces and cost attribution, so a self-hosted platform can be operated
without a SaaS. Apache 2.0. **Grafana is not used** — AGPL-3.0, rejected by the
[license policy](./licenses); Perses covers dashboards. Skip whatever your cluster already provides.

### Argo CD and Argo Workflows — P2

GitOps delivery and workflow pipelines, so an installation is driven from a Git repository rather
than out-of-band `kubectl`. Apache 2.0.

- [argoproj.github.io](https://argoproj.github.io)

### OpenBao — P4

Secrets management for the platform's own credentials. MPL-2.0 — the one documented exception in the
[license policy](./licenses).

- Site: [openbao.org](https://openbao.org)

### cert-manager — development prerequisite

TLS certificate lifecycle. The dev playground installs it; a production cluster usually already has
it, and the platform's charts only need a `ClusterIssuer` if you want their TLS annotations. Apache 2.0.

- Site: [cert-manager.io](https://cert-manager.io)

## Service selection criteria

stardelt picks services by:

1. **License**: OSI permissive (Apache 2.0 / MIT / BSD). No BSL / SSPL / ELv2 / AGPL.
2. **Production maturity in 2026**: real users, active commits, recent releases.
3. **Kubernetes nativeness**: clean K8s deployment, ideally with a maintained operator.
4. **Modern architecture**: 2020+ design choices, not Hadoop/HDFS heritage.
5. **Sovereignty compatibility**: no required outbound calls at runtime.
6. **Integration with the rest of the stack**: e.g., Lakekeeper + Iceberg + Trino is a known-good combination.

When two candidates score equally, stardelt prefers CNCF or ASF projects over vendor-led ones, Rust or
Go services over JVM where the K8s controller pattern fits, and projects with a cloud-agnostic posture
over those tightly coupled to one hyperscaler.
