---
title: "Architecture overview"
sidebar_label: "Overview"
slug: /architecture/overview
---

# stardelt Architecture

**stardelt is an opinionated collection of open-source services, shipped together as a Kubernetes-native data platform.** You bring the Kubernetes cluster; stardelt installs and wires the services that turn it into a lakehouse, a streaming platform, a notebook environment, and a BI surface — under a single UI.

This page is the high-level overview. For one picture of how everything connects, start with [How stardelt works](./how-it-works.md). Per-service detail (what each service does, upstream link, license) lives in [Services](./services).

## What's in the box

![stardelt service architecture: Kubernetes platform at the base, the always-installed stardelt core stack of data services, opt-in services that operators can enable, and stardelt Nova and the stardelt Operator on top](/img/architecture-layers.svg)

*The target architecture — it names services that are
specified but not built yet. [Services](./services) is the honest list of what an install contains
today; the [roadmap](../roadmap) carries the phasing.*

### Kubernetes — the platform you bring

stardelt is *not* a Kubernetes distribution. Any conformant cluster works: EKS, GKE, AKS, OpenShift, Rancher RKE2, k3s, or a sovereign-cloud K8s (STACKIT, OVHcloud, IONOS, Hetzner, Open Telekom Cloud, Scaleway). Supported versions: current N and N-1.

### Core profile — what an install ships today

The opinionated set that defines what stardelt *is*. `make install-core`, or the umbrella chart's
default values, installs exactly this:

- **stardelt Nova** — unified UI: catalog browser, SQL editor, load & transfer, jobs, a platform
  health view that reports the images actually running, and deep-links into every service below.
- **stardelt Operator** — CRD reconciler / control plane. Plans each component from a small
  declarative API; `PlatformInstance` and `Lakehouse` reconcile against a real cluster.
- **Apache Trino** — distributed SQL engine; fast interactive queries over Iceberg.
- **Apache Iceberg** — the table format and the spine every engine reads and writes. Not a service
  you install: it lives in the engines and the catalog.
- **Lakekeeper** — Iceberg REST catalog; vends table metadata and short-lived object-store credentials.
- **SeaweedFS** — S3-compatible object storage; the default data plane. Bring your own S3 instead.
- **CloudNativePG** — Postgres for the catalog's own metadata.

### Optional components — in the chart, off by default

Enabled per install (`make install`, or `<component>.enabled: true` in your values file):

- **Keycloak** — the default OIDC provider (`identity.mode: platform`); or point the platform at your own OIDC provider (`external`). See [Identity](./identity.md).
- **Apache Superset** — BI and dashboards over Trino.
- **Apache Airflow** — workflow orchestration for batch and scheduled jobs.
- **JupyterHub** — multi-user notebook environment.

### Planned services — specified, not built yet

These are designed but not in the install path. The [roadmap](../roadmap)
carries the sequencing and the phase each one lands in. Listing them here is a promise about direction, not about today.

- **OpenMetadata** — the metadata, lineage and quality spine.
- **Apache SeaTunnel, Apache NiFi, Debezium** — the three ingestion domains (SaaS, enterprise, CDC).
- **dbt-core + Soda** — transforms and quality gates.
- **Apache Spark (Spark Connect)** — distributed compute for heavy jobs.
- **Apache Kafka (Strimzi) + Apache Flink** — streaming and CDC processing.
- **MLflow, KServe, vLLM / Ollama** — ML lifecycle, model serving, sovereign LLM inference.
- **Observability — VictoriaMetrics, VictoriaLogs, Perses, Jaeger, OpenCost, Alertmanager** — metrics,
  logs, dashboards, traces, cost. Skip whatever your cluster already provides.
- **Open Policy Agent (OPA)** — fine-grained policy enforcement at the catalog.
- **Argo CD / Argo Workflows** — GitOps delivery.
- **OpenBao** — secrets management; **cert-manager** — TLS lifecycle (the dev playground runs it).

See [Services](./services) for the per-service description and upstream links.

## How the services connect

The canonical lakehouse read path:

```text
   client (BI / notebook / Spark job)
                │
                │  query
                ▼
   ┌──────────────────────────┐
   │  Trino  /  Spark Connect │
   └────────────┬─────────────┘
                │  Iceberg REST + OIDC token
                ▼
   ┌──────────────────────────┐
   │       Lakekeeper          │
   │  (Iceberg REST catalog)   │
   └────────────┬─────────────┘
                │  table metadata + short-lived S3 creds
                ▼
   ┌──────────────────────────┐
   │        SeaweedFS          │
   │   (or BYO S3-compatible)  │
   └────────────┬─────────────┘
                │  Parquet files
                ▼
            (read by engine)
```

When the streaming service (P3) is enabled, Apache Kafka carries event topics that Flink processes into Iceberg tables; the base install needs no Kafka — Airflow writes batch results straight to Iceberg. JupyterHub talks to Trino for SQL and to Spark Connect for heavier compute; Superset talks to Trino for dashboards.

Sign-in is a plug per install. With `identity.mode: platform` the chart deploys Keycloak and Nova and Trino sign people in through it; `external` points them at your own OIDC provider; `none` (the chart default) keeps the development authentication. The vended-credential step in the diagram is the target design: today Trino reads and writes S3 with the static credentials from the `stardelt-s3-creds` Secret (`vended-credentials-enabled=false` in `helm-values/trino.yaml`).

## Operating model

stardelt follows the **operator-per-service pattern**: each service is managed by its own well-maintained upstream operator (Strimzi for Kafka, Spark Operator for Spark, CloudNative-PG for Postgres backing Lakekeeper, etc.). On top sits the **stardelt Operator**, which reconciles a small set of top-level CRDs into the per-service CRDs underneath. Operators run as standard Kubernetes controllers — no SaaS side, no phone-home.

## Multi-tenancy

One `PlatformInstance` per platform. Data domains and compute are segregated by `Catalog` and `SqlWarehouse` resources with owner groups; audit events carry the acting identity. No `NetworkPolicy` is installed yet: treat the namespace as flat.

## Sovereignty

[Full commitments in SOVEREIGNTY.md.](sovereignty.md) Architectural enforcement:

- **No mandatory outbound calls.** Every release ships a documented network-egress matrix.
- **Air-gap install profile.** All images at `ghcr.io/stardelt/...` plus mirrors; `images.tar` bundle ships with each release.
- **No license server.** There isn't one. There will never be one.
- **Opt-in telemetry only.** Off by default.

## Compliance

stardelt is *evidence-gathering infrastructure*, not a certified product. Later phases ship control-mapping starter kits for SOC2, ISO27001, BSI C5, and FedRAMP-on-your-own-cluster. Certifications remain the operator's responsibility.

## Out of scope / non-goals

Being explicit about what the core stack will *not* contain saves everyone a design debate later.
What stardelt is not is a deliberate choice; this is the concrete consequence for service selection.

**Hadoop-era services are out of scope for the stardelt core stack:**

| Not included | Instead | Why |
|---|---|---|
| **HDFS** | SeaweedFS (S3 API), or your own S3-compatible store | The data plane is object storage behind the S3 API; Iceberg tables live on it. A block-oriented filesystem with NameNode semantics adds a stateful failure domain and a second storage abstraction for no benefit. |
| **Hive Metastore as the primary catalog** | **Lakekeeper** (Iceberg REST); the plug matrix lists Apache Polaris and Gravitino as alternates | The catalog contract is the Iceberg REST spec. A Hive Metastore-backed catalog is neither the default nor an alternate in the plug matrix, and nothing in the stack depends on one. |
| **YARN** | Kubernetes (scheduling), Trino and Spark Connect (execution) | stardelt runs on a cluster you already operate. Adding a second scheduler means two places to enforce policy, quota, and identity — the exact fragmentation the platform exists to remove. |
| **ZooKeeper** | Kafka in KRaft mode (via Strimzi) | Kafka has not needed ZooKeeper for metadata since KRaft. See [Services](./services). |

Two qualifications, so this is not read as a ban on interoperability:

- **Reading old data.** Iceberg's own migration paths, and engines that can attach an external
  metastore, are a customer decision. stardelt does not ship, wire, or support HDFS or a Hive
  Metastore as part of the platform.
- **Consuming upstream services.** If a legacy system speaks S3 or the Iceberg REST protocol, it can
  read the lakehouse like any other client. That is a property of the contracts,
  not a stardelt feature.

This follows from the two principles that decide service selection: **Iceberg is the spine**, and
services must be *modern architecture — not Hadoop/HDFS heritage* (see [Service selection
criteria](./services.md#service-selection-criteria)). A component that cannot be described as a plug
behind a CRD or a published spec does not enter the core stack, whichever era it comes from.
