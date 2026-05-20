---
title: "Sovereignty commitments"
sidebar_label: "Sovereignty"
slug: /architecture/sovereignty
---

# stardelt — Sovereignty Commitments

stardelt is engineered for organizations that **must keep data inside their perimeter**. This document is the public, auditable list of commitments that make the sovereignty claim real — not marketing slogans, but architectural and operational invariants we hold ourselves to.

## Why this matters

The dominant proprietary lakehouse platforms are SaaS. Even their "Bring Your Own Cloud" (BYOC) variants — vendor-managed apps and customer-VPC deployments — keep the **control plane at the vendor**, phone home for licensing and telemetry, and operate under the vendor's terms of service. For:

- **EU companies** subject to Schrems II and GDPR Article 28: any US-headquartered vendor in the data-processing chain creates US CLOUD Act exposure regardless of where the data physically sits.
- **Regulated industries** (banking, healthcare, defense, public sector): vendor-managed control planes can fail compliance audits even when the data plane is in your network.
- **Sovereign-cloud users** (STACKIT, OVHcloud, IONOS, Hetzner, Open Telekom Cloud, Scaleway): the value proposition of "no US hyperscaler in the pipeline" is undermined if the data platform itself is US-vendor-managed.
- **Air-gapped environments** (intelligence, classified, isolated networks): SaaS is structurally incompatible.

stardelt's pitch: **everything runs inside your perimeter. Always. By design.**

## Commitments

### 1. Zero mandatory phone-home

- stardelt makes **no outbound network calls** at runtime for licensing, telemetry, support, or feature gating.
- There is no license server. There is no "stardelt cloud." There will never be one without an explicit user opt-in.
- The only optional outbound call is **anonymous usage metrics** to `metrics.stardelt.io`, which is **off by default** and toggled by a single, documented configuration value (`platform.telemetry.enabled: false`).

### 2. Documented network-egress matrix per release

Every stardelt release ships with a `NETWORK-EGRESS.md` document that lists, with no exceptions:

- Every network call stardelt's own components make at install, runtime, and upgrade.
- Every network call the bundled upstream components make.
- Every dependency that can be relocated (e.g., container registry mirroring).
- Every dependency that *cannot* be relocated (there should be none).

If you can't audit it, you can't trust it.

### 3. Air-gap installable

- All stardelt-published container images live at a single prefix (`ghcr.io/stardelt/...`) and are mirrorable to a private registry (Harbor, Zot, vendor-specific).
- A documented air-gap install profile (`platform.airgap: true`) routes every component to the local mirror.
- Each release publishes an `images.tar` bundle containing every image required for a complete install.
- No `latest` tag dependencies. Every image reference is pinned to a digest.
- Runtime has no outbound DNS requirements.

### 4. Sovereign-cloud validation

stardelt's CI matrix includes **European sovereign-cloud Kubernetes** targets alongside the hyperscalers:

- **STACKIT** (Schwarz Group)
- **OVHcloud** Managed Kubernetes
- **IONOS** Managed Kubernetes
- **Hetzner** Cloud (HKL when available; otherwise k3s on Hetzner Cloud)
- **Open Telekom Cloud**
- **Scaleway** Kapsule

For comparison: EKS, GKE, AKS, OpenShift, Rancher RKE2, k3s, kind. **Sovereign-cloud Kubernetes is a first-class target, not an afterthought.**

### 5. Open formats only at rest

stardelt persists data only in open, vendor-neutral formats:

- **Tables**: Apache Iceberg + Apache Parquet.
- **Lineage**: OpenLineage JSON.
- **Metrics**: OpenMetrics / Prometheus exposition format.
- **Traces**: OpenTelemetry / OTLP.
- **Logs**: structured JSON (no proprietary on-disk format).
- **Audit events**: structured JSON on Kafka topic `stardelt.audit.v1`; archived to Iceberg.

**Walking away from stardelt means uninstalling our operators.** Your data, dashboards, models, and notebooks remain readable by any compliant engine.

### 6. No US-vendor dependency in the default install

stardelt's primary components are governed by:

- The **Apache Software Foundation** (Iceberg, Kafka, Spark, Flink, Airflow, Ozone, Polaris, Superset, SeaTunnel, Kyuubi, ...)
- The **Cloud Native Computing Foundation** (Cilium, OpenFGA, OpenCost, OpenLineage, Perses, ...)
- The **Linux Foundation** (OpenBao, Delta Lake, ...)
- **Vendor-neutral or non-US projects** where applicable (Lakekeeper, VictoriaMetrics, Keycloak)

No single US-headquartered for-profit vendor controls the default install. This is checked at every release.

### 7. Reversibility by design

stardelt is reversible at three levels:

| Level | What happens when you walk away |
|---|---|
| **Platform** | Uninstall stardelt operators. The K8s cluster remains. Your namespaces remain. |
| **Engines** | Native components (Trino, Spark, Kafka, etc.) keep running standalone after stardelt removal, since stardelt is a composition layer, not a replacement. |
| **Data** | Iceberg tables on your object storage remain readable by any Iceberg-compatible engine. Iceberg metadata is self-describing — you don't need Lakekeeper to read the data. |

**A vendor whose data is hostage is not a sovereign vendor.** stardelt's data is yours.

### 8. License sovereignty

See [LICENSES.md](licenses.md). Strict OSI permissive (Apache 2.0 / MIT / BSD) with one documented MPL 2.0 exception for OpenBao. No BSL, SSPL, ELv2, or AGPL.

**A vendor whose license can flip from open to "source-available" overnight is not a sovereign vendor.** stardelt's license stance is locked in: Apache 2.0 for the project itself; the policy in [LICENSES.md](licenses.md) for components.

### 9. Compliance-friendly evidence collection

stardelt is *evidence-gathering infrastructure*, not a certified product. Phase 5 ships starter kits that map stardelt's controls to:

- **SOC2 Type II** (control mapping, audit log retention, change management evidence)
- **ISO 27001** Annex A controls
- **BSI C5** (German federal cloud security catalog)
- **FedRAMP-on-your-own-cluster** (the customer's own ATO inherits stardelt's controls)
- **DORA / NIS2** for European financial services and critical infrastructure

Certifications remain the customer's responsibility. stardelt provides the evidence trail. The customer's auditor does the audit.

### 10. Operational sovereignty: keys, identities, and audit logs

- **Encryption keys** never leave the customer's KMS / OpenBao. stardelt has no access path to plaintext key material.
- **Identities** are issued and revoked by the customer's IdP via Keycloak federation. stardelt has no shadow identity store.
- **Audit logs** are written to the customer's Kafka and Iceberg. stardelt operators do not have privileged read access — operator credentials are scoped to the namespaces they manage.

## What sovereignty is *not*

We avoid overclaiming. Sovereignty in stardelt's sense means **vendor-neutrality, location control, and reversibility** — not legal isolation from any jurisdiction.

- stardelt does **not** confer immunity from your local laws. If your jurisdiction can compel access to your servers, it can compel access to your data on those servers.
- stardelt does **not** itself perform encryption-at-rest. Use the underlying object store's KMS-backed encryption and document it.
- stardelt's contributors are international. The project itself is licensed under US copyright law (Apache 2.0 is a US legal instrument). Project governance will move to a vendor-neutral foundation as stardelt matures.

## How we keep these commitments

- Every commitment in this document is mirrored by a **test or audit** in CI by Phase 1 GA. Network-egress matrix is generated, not authored; sovereign-cloud CI is automated; license verification is automated.
- This document is versioned with each release. Any weakening of a commitment is highlighted in release notes and discussed with the community before merging.
- If we cannot back a sovereignty claim with an architectural or operational mechanism, we remove the claim — not the mechanism.

> *Sovereignty is a property of the system, not of the marketing page.*
