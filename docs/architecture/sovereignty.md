---
title: "Sovereignty"
sidebar_label: "Sovereignty"
slug: /architecture/sovereignty
---

# Sovereignty

stardelt is for organizations that must keep their data inside their own perimeter. This page says
what holds today and what is still a goal, so you can check it yourself.

Sovereignty here means **vendor neutrality, control over location, and reversibility**. It does not
mean legal isolation: if a jurisdiction can compel access to your servers, it can compel access to
your data on them.

## What holds today

| Property | How you can check it |
|---|---|
| **No required outbound calls from stardelt's own components.** There is no license server, no telemetry and no "stardelt cloud" | Read the code: [Nova](https://github.com/stardelt/stardelt-nova), [Operator](https://github.com/stardelt/stardelt-operator). Upstream components keep their own behaviour |
| **Open formats for your data.** Tables are Apache Iceberg with Parquet files, on storage you choose | Read a table with any Iceberg engine |
| **You can leave.** Uninstall stardelt and your tables stay on your object store. Iceberg metadata describes itself | [How it works](./how-it-works) |
| **Permissive licenses.** Apache 2.0, MIT or BSD, with one documented MPL 2.0 exception | [License policy](./licenses) |
| **Your identity provider.** Users and groups can come from your own OIDC provider. Nova keeps no passwords | [Identity](./identity) |
| **Your storage.** Use the bundled SeaweedFS, or point the platform at your own S3-compatible store | [Install on your own cluster](../getting-started/your-cluster) |
| **Mirrorable images.** stardelt's own images live under `ghcr.io/stardelt/*` and deployments pin digests | [Install on your own cluster](../getting-started/your-cluster#distribution-notes) |

## Not there yet

These are goals, not features. Do not rely on them today.

| Goal | State today |
|---|---|
| **Air-gapped install** | You can mirror images by hand and set pull secrets, but there is no tested profile or image bundle |
| **Network-egress list per release** | Not published. stardelt has no tagged releases yet |
| **Tests on sovereign-cloud Kubernetes** | Verified on k3s on a single node only |
| **Pinned digests for every upstream image** | stardelt's own images are pinned. Upstream components are pinned by chart version |
| **Evidence kits for audits** (such as ISO 27001, BSI C5, SOC 2) | Not started. Certifying remains your responsibility |
| **Short-lived storage credentials per person** | Not built: see [Security model](./security-model#known-limits) |

## What stardelt does not do

- It does not encrypt data at rest. Use your object store's encryption, backed by your key management.
- It does not certify you. stardelt can help you gather evidence, and your auditor does the audit.
- It does not replace your Kubernetes security. Node, network and cluster access stay yours.

If a claim on this page is wrong, [open an issue](https://github.com/stardelt/stardelt-docs/issues).
