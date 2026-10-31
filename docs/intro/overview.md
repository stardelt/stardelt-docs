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

- **Try it on the dev cluster.** [Hetzner k3s](../getting-started/hetzner-k3s) for the full
  stack.
- **See the whole picture.** [How stardelt works](../architecture/how-it-works): one diagram
  of the platform and how its parts connect.
- **Understand the system first.** [Architecture overview](../architecture/overview)
  or the full design spec.
- **See what's planned.** [Roadmap](../roadmap).

:::warning Pre-alpha
stardelt is in an MVP / vibecoding phase. APIs, manifests, and chart versions
change without notice. Not ready for production.
:::
