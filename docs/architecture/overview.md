---
title: "Architecture overview"
sidebar_label: "Overview"
slug: /architecture/overview
---

# stardelt Architecture

**stardelt is an opinionated collection of open-source services, shipped together as a Kubernetes-native data platform.** You bring the Kubernetes cluster; stardelt installs and wires the services that turn it into a lakehouse, a streaming platform, a notebook environment, and a BI surface — under a single UI.

This page is the high-level overview. Per-service detail (what each service does, upstream link, license) lives in [Services](./services).

## What's in the box

![stardelt service architecture: Kubernetes platform at the base, the always-installed stardelt core stack of data services, opt-in services that operators can enable, and stardelt Nova and the stardelt Operator on top](/img/architecture-layers.svg)

### Kubernetes — the platform you bring

stardelt is *not* a Kubernetes distribution. Any conformant cluster works: EKS, GKE, AKS, OpenShift, Rancher RKE2, k3s, kind, or a sovereign-cloud K8s (STACKIT, OVHcloud, IONOS, Hetzner, Open Telekom Cloud, Scaleway). Supported versions: current N and N-1.

### stardelt core stack — always installed

The opinionated set that defines what stardelt *is*. Every install ships these services:

- **stardelt Nova** — unified UI. SSO landing, catalog browser, lineage view, audit search, platform health, and deep-links into the native UI of every service below.
- **stardelt Operator** — CRD reconciler / control plane. Composes the services below from a small declarative API.
- **Apache Trino** — distributed SQL engine; fast interactive queries over Iceberg.
- **Apache Spark (Spark Connect)** — distributed compute. Spark Connect exposes a persistent remote endpoint so notebooks and other clients connect without spawning their own driver.
- **Apache Airflow** — workflow orchestration for batch and scheduled jobs.
- **JupyterHub** — multi-user notebook environment; the front door for interactive analysis.
- **Apache Superset** — BI and dashboards over Trino.
- **Apache Iceberg** — open table format; the storage abstraction every engine reads and writes.
- **Lakekeeper** — Iceberg REST catalog; vends table metadata and short-lived object-store credentials.
- **SeaweedFS** — S3-compatible object storage; the default data plane.
- **Apache Kafka (KRaft)** — event-streaming backbone for ingest, CDC, and audit events.

### Opt-in services — enabled per operator choice

These extend stardelt but aren't required. Operators often have existing equivalents already in the cluster:

- **Keycloak** — OIDC / SAML / LDAP provider. Skip if your cluster already federates an IdP.
- **VictoriaMetrics + VictoriaLogs + Perses + Jaeger** — metrics, logs, dashboards and traces. Skip if your cluster already has an observability stack.
- **OpenCost** — cost attribution per tenant, namespace and workload.
- **Alertmanager** — alert routing, paired with VictoriaMetrics.
- **cert-manager** — TLS certificate lifecycle.
- **Argo CI** — GitOps delivery.
- **Apache SeaTunnel** — data integration / EL connectors.
- **Apache Flink** — stream processing for event-driven pipelines and CDC.
- **Open Policy Agent (OPA)** — fine-grained policy enforcement.

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

Apache Kafka carries audit events and (when ingest pipelines are wired up) source-of-truth events that Airflow batches or Flink processes into Iceberg tables. JupyterHub talks to Trino for SQL and to Spark Connect for heavier compute; Superset talks to Trino for dashboards.

## Operating model

stardelt follows the **operator-per-service pattern**: each service is managed by its own well-maintained upstream operator (Strimzi for Kafka, Spark Operator for Spark, CloudNative-PG for Postgres backing Lakekeeper, etc.). On top sits the **stardelt Operator**, which reconciles a small set of top-level CRDs into the per-service CRDs underneath. Operators run as standard Kubernetes controllers — no SaaS side, no phone-home.

## Multi-tenancy

Multi-tenancy primitives exist in v1 even though MVP deployments are single-tenant. This avoids a rewrite later:

- Every stardelt resource carries a `stardelt.io/tenant` label.
- Audit events carry `tenant_id`.
- Tenant namespaces can be isolated by Kubernetes NetworkPolicies.

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
The master spec's [§9 "What stardelt is not"](../design/master-spec.md#9-what-stardelt-is-not) is
authoritative; this is the concrete consequence for service selection.

**Hadoop-era services are out of scope for the stardelt core stack:**

| Not included | Instead | Why |
|---|---|---|
| **HDFS** | SeaweedFS (S3 API), or your own S3-compatible store | The data plane is object storage behind the S3 API; Iceberg tables live on it. A block-oriented filesystem with NameNode semantics adds a stateful failure domain and a second storage abstraction for no benefit. |
| **Hive Metastore as the primary catalog** | **Lakekeeper** (Iceberg REST); the plug matrix lists Apache Polaris and Gravitino as alternates | The catalog contract is the Iceberg REST spec. A Hive Metastore-backed catalog is neither the default nor an alternate in the [plug matrix](../design/master-spec.md#5-the-plug-matrix), and nothing in the stack depends on one. |
| **YARN** | Kubernetes (scheduling), Trino and Spark Connect (execution) | stardelt runs on a cluster you already operate. Adding a second scheduler means two places to enforce policy, quota, and identity — the exact fragmentation the platform exists to remove. |
| **ZooKeeper** | Kafka in KRaft mode (via Strimzi) | Kafka has not needed ZooKeeper for metadata since KRaft. See [Services](./services). |

Two qualifications, so this is not read as a ban on interoperability:

- **Reading old data.** Iceberg's own migration paths, and engines that can attach an external
  metastore, are a customer decision. stardelt does not ship, wire, or support HDFS or a Hive
  Metastore as part of the platform.
- **Consuming upstream services.** If a legacy system speaks S3 or the Iceberg REST protocol, it can
  read the lakehouse like any other client. That is a property of the [contracts](../design/master-spec.md#3-the-core-insight-contracts--defaults--glue),
  not a stardelt feature.

This follows from the two principles that decide service selection: **Iceberg is the spine**, and
services must be *modern architecture — not Hadoop/HDFS heritage* (see [Service selection
criteria](./services.md#service-selection-criteria)). A component that cannot be described as a plug
behind a CRD or a published spec does not enter the core stack, whichever era it comes from.
