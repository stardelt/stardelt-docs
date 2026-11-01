---
title: "What is stardelt"
sidebar_label: "Overview"
slug: /intro/overview
---

# What is stardelt

stardelt is a Kubernetes-native, fully open-source data platform — an
opinionated collection of upstream OSS services shipped together as a
lakehouse, batch, streaming, notebook, and BI environment that runs on any
cloud or on-prem cluster, under your own sovereignty, without vendor lock-in.

## What makes stardelt different

- **Total sovereignty.** stardelt runs end-to-end inside your perimeter. Nothing
  leaves your cluster unless you tell it to. EU companies escape US CLOUD Act
  exposure; defense and public-sector workloads can run air-gapped. Reversible
  by design — your tables stay in open Iceberg format on your storage.
- **No vendor handcuffs.** Permissive OSI licenses (Apache 2.0 / MIT / BSD) everywhere, with
  one documented MPL 2.0 exception (OpenBao). Zero BSL, SSPL, ELv2, or AGPL components.
- **One CRD, not 47 YAMLs.** The stardelt Operator reconciles a small set of
  top-level CRDs into the per-service operators below. That's the gap left by
  the previous generation of Kubernetes data stacks.
- **Modern stack, no Hadoop heritage.** Apache Iceberg via Lakekeeper as the table
  spine, Trino for interactive SQL, SeaweedFS for object storage, JupyterHub for
  notebooks, Superset for BI, Airflow for orchestration — composed by the stardelt
  Operator and surfaced through stardelt Nova. Spark Connect for distributed
  compute and Apache Kafka (KRaft) for streaming are specified for later phases;
  [Services](../architecture/services) marks exactly what ships today and
  [Roadmap](../roadmap) says when the rest lands.

## Where to go next

The pages follow the order a person works. Start at the top, or jump to the step you need.

1. **Install it.** [Hetzner k3s](../getting-started/hetzner-k3s) for the full stack.
2. **See the whole picture.** [How stardelt works](../architecture/how-it-works): one diagram
   of the platform and how its parts connect.
3. **Get a first result.** [From source to dashboard](../guides/source-to-dashboard).
4. **Connect a system.** [Connections and secrets](../guides/connections): a database, an API or
   a token, without its secret in code.
5. **Run it on a schedule.** [Schedule a SQL statement](../guides/schedule-sql).
6. **Keep your work in Git.** [Notebooks and pipelines in git](../guides/notebooks-in-git).
7. **Ship it to a stage.** [Publish pipelines from Git](../guides/publish-pipelines).
8. **See what ran.** [The query log](../guides/query-log).
9. **Automate it.** [Python, command line and agents](../guides/sdk-cli-mcp).
10. **Understand or plan.** [Architecture overview](../architecture/overview) and the
    [Roadmap](../roadmap).

:::warning Pre-alpha
stardelt is in an MVP / vibecoding phase. APIs, manifests, and chart versions
change without notice. Not ready for production.
:::
