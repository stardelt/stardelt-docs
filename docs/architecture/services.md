---
title: "Services"
sidebar_label: "Services"
slug: /architecture/services
---

# stardelt Services

The full set of services stardelt installs, split into the always-on **core stack** and the **opt-in services** that operators enable when they need them.
For the architectural picture (what connects to what), see the [Overview](./overview).

## Core stack — always installed

The opinionated set every stardelt install ships. These services define what stardelt is.

### stardelt Nova

Unified web UI: single SSO landing, catalog browser over Iceberg tables, lineage view, audit search, platform health, and deep-links into the native UI of every service below. TypeScript + React (front-end), Rust + axum (back-end). Apache 2.0.

- Repo: [github.com/stardelt/stardelt-nova](https://github.com/stardelt/stardelt-nova)

### stardelt Operator

The platform's CRD reconciler. Composes the services below from a small declarative API (`PlatformInstance`, `Lakehouse`, `Pipeline`, `StreamApp`). Rust + `kube-rs`. Apache 2.0.

- Repo: [github.com/stardelt/stardelt-operator](https://github.com/stardelt/stardelt-operator)

### Apache Trino

Distributed MPP SQL engine — fast interactive queries over Iceberg tables. Apache 2.0.

- Site: [trino.io](https://trino.io)
- Repo: [github.com/trinodb/trino](https://github.com/trinodb/trino)

### Apache Spark (Spark Connect)

Distributed compute engine. Deployed via the Spark Kubernetes Operator. **Spark Connect** exposes a persistent remote endpoint (`sc://spark-connect-svc:15002`) so notebooks and other clients connect without spawning their own driver. Apache 2.0.

- Site: [spark.apache.org](https://spark.apache.org)
- Spark Connect: [docs](https://spark.apache.org/docs/latest/spark-connect-overview.html)
- Operator: [github.com/kubeflow/spark-operator](https://github.com/kubeflow/spark-operator)

### Apache Airflow

Workflow orchestration for batch and scheduled jobs. KubernetesExecutor under the hood, so each task runs as its own pod. Apache 2.0.

- Site: [airflow.apache.org](https://airflow.apache.org)
- Repo: [github.com/apache/airflow](https://github.com/apache/airflow)

### JupyterHub

Multi-user notebook environment — the front door for interactive analysis. Notebooks reach Trino directly (Python client), Spark heavy-lifting via Spark Connect, and (when enabled) Airflow via its REST API to promote interactive work into scheduled jobs. BSD-3.

- Site: [jupyter.org/hub](https://jupyter.org/hub)
- Repo: [github.com/jupyterhub/jupyterhub](https://github.com/jupyterhub/jupyterhub)

### Apache Superset

BI and dashboarding over Trino. Apache 2.0.

- Site: [superset.apache.org](https://superset.apache.org)
- Repo: [github.com/apache/superset](https://github.com/apache/superset)

### Apache Iceberg

Open table format on object storage. The shared storage abstraction every engine reads and writes. Apache 2.0.

- Site: [iceberg.apache.org](https://iceberg.apache.org)
- Repo: [github.com/apache/iceberg](https://github.com/apache/iceberg)

### Lakekeeper

Iceberg REST catalog implementation in Rust. Vends table metadata and short-lived object-store credentials to engines. Apache 2.0.

- Site: [lakekeeper.io](https://lakekeeper.io)
- Repo: [github.com/lakekeeper/lakekeeper](https://github.com/lakekeeper/lakekeeper)

### SeaweedFS

S3-compatible distributed object store; the default data plane for Iceberg files. Operators may BYO any S3-compatible storage (AWS S3, GCS via S3 interop, Azure Blob, Ceph, NetApp) instead. Apache 2.0.

- Repo: [github.com/seaweedfs/seaweedfs](https://github.com/seaweedfs/seaweedfs)

### Apache Kafka (KRaft)

Event-streaming backbone. Used for ingest, CDC events, and the platform's audit-event topic. KRaft mode (no ZooKeeper). Deployed via the Strimzi operator. Apache 2.0.

- Site: [kafka.apache.org](https://kafka.apache.org)
- Strimzi: [strimzi.io](https://strimzi.io)

## Opt-in services — enabled per operator choice

These extend stardelt but are not required. Operators often have existing equivalents already in the cluster; stardelt installs these only when asked.

### Keycloak

OIDC / SAML / LDAP identity provider — federates an upstream corporate IdP into stardelt. Skip if the cluster already has an OIDC provider. Apache 2.0.

- Site: [keycloak.org](https://www.keycloak.org)
- Repo: [github.com/keycloak/keycloak](https://github.com/keycloak/keycloak)

### Prometheus + Grafana

Metrics collection and dashboards. Skip if the cluster already has a monitoring stack. Apache 2.0.

- Prometheus: [prometheus.io](https://prometheus.io)
- Grafana: [github.com/grafana/grafana](https://github.com/grafana/grafana)

### Alertmanager

Alert routing and grouping, paired with Prometheus. Apache 2.0.

- Repo: [github.com/prometheus/alertmanager](https://github.com/prometheus/alertmanager)

### cert-manager

TLS certificate lifecycle for in-cluster and external endpoints. Apache 2.0.

- Site: [cert-manager.io](https://cert-manager.io)
- Repo: [github.com/cert-manager/cert-manager](https://github.com/cert-manager/cert-manager)

### Argo CI

GitOps delivery (Argo CD) and pipelines (Argo Workflows) — drives stardelt installations from a Git repository instead of out-of-band kubectl. Apache 2.0.

- Site: [argoproj.github.io](https://argoproj.github.io)
- Repo: [github.com/argoproj](https://github.com/argoproj)

### Apache SeaTunnel

Data integration / EL connectors — pulls data from operational systems (databases, queues, SaaS APIs) into Iceberg. Apache 2.0.

- Site: [seatunnel.apache.org](https://seatunnel.apache.org)
- Repo: [github.com/apache/seatunnel](https://github.com/apache/seatunnel)

### Apache Flink

Stream processing — event-driven pipelines, CDC, real-time transformations off Kafka topics. Apache 2.0.

- Site: [flink.apache.org](https://flink.apache.org)
- Repo: [github.com/apache/flink](https://github.com/apache/flink)

### Open Policy Agent (OPA)

Fine-grained policy enforcement for data and platform resources. Apache 2.0.

- Site: [openpolicyagent.org](https://www.openpolicyagent.org)
- Repo: [github.com/open-policy-agent/opa](https://github.com/open-policy-agent/opa)

## Service selection criteria

stardelt picks services by:

1. **License**: OSI permissive (Apache 2.0 / MIT / BSD). No BSL / SSPL / ELv2 / AGPL.
2. **Production maturity in 2026**: real users, active commits, recent releases.
3. **Kubernetes nativeness**: clean K8s deployment, ideally with a maintained operator.
4. **Modern architecture**: 2020+ design choices, not Hadoop/HDFS heritage.
5. **Sovereignty compatibility**: no required outbound calls at runtime.
6. **Integration with the rest of the stack**: e.g., Lakekeeper + Iceberg + Trino is a known-good combination.

When two candidates score equally, stardelt prefers CNCF or ASF projects over vendor-led ones, Rust or Go services over JVM where K8s controller-pattern fits, and projects with cloud-agnostic posture over those tightly coupled to one hyperscaler.
