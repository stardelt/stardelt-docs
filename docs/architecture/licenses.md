---
title: "License policy"
sidebar_label: "Licenses"
slug: /architecture/licenses
---

# Stardelt License Policy

Stardelt is licensed **Apache License 2.0**. The platform composes upstream OSS projects; their respective licenses apply to those binaries when Stardelt installs them on your cluster.

This document is the source of truth for:

1. The license policy itself (what licenses Stardelt will and will not ship).
2. The documented exception (OpenBao).
3. The hard rejection list (license-disqualified components, with reasons).
4. The verification process before any Stardelt release.

## Policy

| Decision | Licenses | Examples |
|---|---|---|
| **Accepted** | OSI permissive: Apache 2.0, MIT, BSD-2-Clause, BSD-3-Clause | Most upstream picks |
| **Documented exception** | MPL 2.0 | **OpenBao only** — see below |
| **Rejected** | AGPL, GPL (any), BSL, SSPL, ELv2, Confluent Community License, FSL, proprietary, source-available-but-not-OSI | See rejection list |

The policy is **strict on purpose**. Stardelt's "no vendor handcuffs, self-host forever" claim only holds if every component in the default install is provably free of relicensing risk.

## Documented license exceptions

### OpenBao — MPL 2.0

**Context**: Stardelt needs an HA-grade secrets and PKI backend. HashiCorp Vault relicensed from MPL 2.0 to BSL 1.1 in August 2023. **OpenBao** is the Linux Foundation–governed fork of Vault from its pre-BSL days, contributed to by IBM and a wider community. Its license is **MPL 2.0**, an OSI-approved license, but weak-copyleft *per file* — not a pure permissive license like Apache 2.0.

**Decision**: Accept MPL 2.0 for OpenBao as a single documented exception.

**Reasoning**:

1. There is no Apache/MIT/BSD HA-grade secrets manager in 2026. The alternatives are: Kubernetes Sealed Secrets (no dynamic credentials, no PKI, no rotation), or proprietary cloud-KMS services (defeats the sovereignty story).
2. MPL 2.0 is materially weaker copyleft than AGPL or GPL. It applies per-file, allows linking with proprietary or differently-licensed code, and does not impose network-use obligations. Most corporate legal teams approve MPL without escalation.
3. OpenBao is governed under the Linux Foundation, removing single-vendor relicensing risk.
4. Customers who prefer not to ship OpenBao can use the **External Secrets Operator** (Apache 2.0) to plug into their own Vault / OpenBao / cloud KMS — Stardelt does not require shipping OpenBao itself.

**Customers must be told this clearly.** The README, ARCHITECTURE doc, and install docs all surface OpenBao's MPL 2.0 status as the single non-permissive component in the default install.

## Hard rejection list

Components that look attractive and are frequently asked about, but **cannot be shipped** under Stardelt's policy:

| Component | License | Status / notes |
|---|---|---|
| **MinIO** | AGPL-3.0 | Relicensed from Apache 2.0 in 2021. Repository **archived April 25, 2026**; community edition "no longer maintained". Pushed users to commercial AIStor ($96k/yr for 400TB). Replacement: **Apache Ozone**. |
| **Grafana** | AGPL-3.0 | Since 2021. Replacement: **Perses** (CNCF Sandbox). |
| **Grafana Loki** | AGPL-3.0 | Since 2024. Replacement: **VictoriaLogs**. |
| **Grafana Tempo** | AGPL-3.0 | Since 2024. Replacement: **Jaeger**. |
| **Grafana Mimir** | AGPL-3.0 | AGPL from inception. Replacement: **VictoriaMetrics**. |
| **HashiCorp Vault** | BSL 1.1 | Since August 2023. Replacement: **OpenBao** (documented MPL exception). |
| **HashiCorp Terraform / Consul / Nomad / Boundary / Packer** | BSL 1.1 | Same relicense. Use **OpenTofu** for Terraform (MPL 2.0 — also a documented case if needed). |
| **Elasticsearch / Kibana** | ELv2 / SSPL / AGPL hybrid | Triple-licensed; none are OSI-permissive. Replacement: **OpenSearch**. |
| **Redpanda** | BSL 1.1 | Replacement: **Apache Kafka** via **Strimzi** operator. |
| **Materialize** | BSL 1.1 | Replacement: **RisingWave** (Apache 2.0, verified). |
| **Confluent Platform / ksqlDB / Confluent Schema Registry** | Confluent Community License | Source-available, not OSI. Replacement: **Apicurio Registry** + **Flink SQL**. |
| **Airbyte (platform)** | ELv2 | Connectors are MIT but platform isn't. Replacement: **Apache SeaTunnel**. |
| **Seldon Core v2** | BSL | Since 2024. Replacement: **KServe**. |
| **Metabase (Community)** | AGPL-3.0 | Replacement: **Apache Superset**. |
| **Sentry** | FSL ("Functional Source License") | Since 2023. Replacement: **GlitchTip** (verify Apache 2.0 at release time). |
| **Kubecost Enterprise** | open-core, Enterprise proprietary | Use the underlying engine **OpenCost** directly. |
| **Weights & Biases** | proprietary SaaS | Replacement: **MLflow** + Aim. |
| **Dagster Cloud / Prefect Cloud / Astronomer** | proprietary SaaS | Replacement: **Apache Airflow** + **Argo Workflows**. |
| **Garage (object store)** | AGPL-3.0 | Replacement: **Apache Ozone**, CubeFS, SeaweedFS. |
| **CockroachDB self-hosted core** | BSL 1.1 | Replacement: **PostgreSQL** via CloudNative-PG. |
| **MongoDB** | SSPL | Replacement: **PostgreSQL**. |
| **Tecton, Featureform (commercial)** | proprietary / open-core | Replacement: **Feast**. |
| **Pinecone, Weaviate Enterprise** | proprietary / open-core | Replacement: **Qdrant** + **pgvector**. |

## Pre-release verification process

Before any Stardelt release:

1. Fetch the live `LICENSE` file for every primary component listed in [COMPONENTS.md](components.md) from `github.com/<org>/<repo>/blob/main/LICENSE`.
2. Confirm exact license name; cross-reference with the OSI list (https://opensource.org/licenses).
3. For projects flagged in the *Pre-release license verifications* section of COMPONENTS.md, re-read the LICENSE in full — these are projects with known license-drift risk.
4. If a primary has drifted to an unacceptable license, demote to the listed alternative and update components.md.
5. Record the verification in a `LICENSE-VERIFICATION-<release>.md` artifact alongside the release tag.

## Reporting license issues

If you believe a component listed in components.md is not under the license stated here, open an issue with:

- Component name and version.
- Link to the offending LICENSE file or relicense announcement.
- The OSI status of the new license.

License accuracy is non-negotiable for Stardelt. We will demote or replace any component whose license has drifted out of policy.
