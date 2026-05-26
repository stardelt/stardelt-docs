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
- **No vendor handcuffs.** 100 % OSI-permissive (Apache 2.0 / MIT / BSD). Zero
  BSL, SSPL, ELv2, or AGPL components.
- **One CRD, not 47 YAMLs.** The stardelt Operator reconciles a small set of
  top-level CRDs into the per-service operators below. That's the gap left by
  the previous generation of Kubernetes data stacks.
- **Modern stack, no Hadoop heritage.** Apache Iceberg via Lakekeeper, Trino
  for interactive SQL, Spark Connect for distributed compute, JupyterHub for
  notebooks, Superset for BI, Apache Kafka (KRaft) for streaming, SeaweedFS
  for object storage, Airflow for orchestration — composed by the stardelt
  Operator and surfaced through stardelt Nova.

## Where to go next

- **Try it on your laptop.** [Run stardelt locally on kind](../getting-started/local-kind).
- **Understand the system first.** [Architecture overview](../architecture/overview)
  or the full [design spec](../design/master-spec).
- **See what's planned.** [Roadmap](../roadmap).

:::warning Pre-alpha
stardelt is in an MVP / vibecoding phase. APIs, manifests, and chart versions
change without notice. Not ready for production.
:::
