---
title: "What is stardelt"
sidebar_label: "Overview"
slug: /intro/overview
---

# What is stardelt

stardelt is a Kubernetes-native, fully open-source data platform that delivers
Lakehouse SQL, Batch ETL, Streaming, and ML/AI on any cloud or on-prem cluster —
under your own sovereignty, without vendor lock-in.

## What makes stardelt different

- **Total sovereignty.** stardelt runs end-to-end inside your perimeter. Nothing
  leaves your cluster unless you tell it to. EU companies escape US CLOUD Act
  exposure; defense and public-sector workloads can run air-gapped. Reversible
  by design — your tables stay in open Iceberg format on your storage.
- **No vendor handcuffs.** 100 % OSI-permissive (Apache 2.0 / MIT / BSD) with
  one documented MPL-2.0 exception for the OpenBao secrets backend. Zero BSL,
  SSPL, ELv2, or AGPL components.
- **One CRD, not 47 YAMLs.** A composed control plane (`PlatformInstance`,
  `Tenant`, `Lakehouse`, `Pipeline`, `StreamApp`, `MLWorkspace`) sits on top of
  per-component operators. That's the gap left by the previous generation of
  Kubernetes data stacks.
- **Modern stack, no Hadoop heritage.** Iceberg via Lakekeeper, Trino + DuckDB
  for SQL, RisingWave for streaming SQL, OpenFGA for fine-grained authorization,
  OpenBao for secrets, VictoriaMetrics / VictoriaLogs + Perses for observability.

## Where to go next

- **Try it on your laptop.** [Run stardelt locally on kind](../getting-started/local-kind).
- **Understand the system first.** [Architecture overview](../architecture/overview)
  or the full [design spec](../design/master-spec).
- **See what's planned.** [Roadmap](../roadmap).

:::warning Pre-alpha
stardelt is in an MVP / vibecoding phase. APIs, manifests, and chart versions
change without notice. Not ready for production.
:::
