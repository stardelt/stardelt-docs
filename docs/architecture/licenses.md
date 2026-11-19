---
title: "License policy"
sidebar_label: "Licenses"
slug: /architecture/licenses
description: "The permissive-only license policy, what a component may use, the two documented exceptions, and how to report a problem."
---

# License policy

stardelt's own code is licensed under **Apache 2.0**. The platform installs upstream open-source
projects, and their own licenses apply to them.

## Policy

| Decision | Licenses |
|---|---|
| **Accepted** | OSI-approved permissive licenses: Apache 2.0, MIT, BSD-2-Clause, BSD-3-Clause |
| **Documented exception** | MPL 2.0, Artistic-1.0 and GPL-3.0, each listed under [Documented exceptions](#documented-exceptions) |
| **Rejected** | AGPL, BSL, SSPL, ELv2, FSL, Confluent Community License, proprietary, and anything source-available that is not OSI-approved — and GPL, except where listed below |

The policy is strict because "self-host forever" only holds if nothing in the default install can
be relicensed out from under you. It applies to everything stardelt ships or installs, and to the
dependencies of stardelt's own code.

## The exception: OpenBao

OpenBao stores secrets for connections. It is licensed under MPL 2.0, which is OSI-approved but
copyleft per file, so it is not purely permissive. It is accepted as a documented exception because:

- no permissive secrets manager with comparable features exists;
- MPL 2.0 applies per file and has no network-use obligations;
- OpenBao is governed by the Linux Foundation, so no single vendor can relicense it.

OpenBao is **optional**. It is installed only if you run `make openbao` or turn it on in your
`PlatformInstance`. Without it, the install contains nothing under MPL 2.0.

## Documented exceptions

Every component outside the accepted licenses is listed here. A row is a maintainer decision; the
policy stays "permissive only, plus this table".

| Component | License | How it is used | Why | Source |
|---|---|---|---|---|
| OpenBao | MPL 2.0 | Optional secrets store for connections | See [above](#the-exception-openbao) | [openbao/openbao](https://github.com/openbao/openbao) |
| Barman Cloud (the CloudNativePG plugin) | GPL-3.0 | The default install's backup path: continuous WAL archiving and daily base backups of every PostgreSQL cluster, installed by both install paths | CloudNativePG 1.32 removed the in-tree `barmanObjectStore` and names this plugin instead; no permissively licensed PostgreSQL backup plugin with WAL archiving exists for it. Consumed as the unmodified upstream image, by digest | [cloudnative-pg/plugin-barman-cloud](https://github.com/cloudnative-pg/plugin-barman-cloud) |
| pathspec | MPL 2.0 | The dbt tool image (an optional tool image that runs a customer's own dbt models; never linked into a stardelt binary) | A direct dependency of `dbt-core`; no replacement exists. Shipped as the unmodified wheel | [cpburnz/python-pathspec](https://github.com/cpburnz/python-pathspec) |
| text-unidecode | Artistic-1.0 (dual with GPL) | The same dbt tool image | A dependency of `dbt-core` through `agate`; of the two licenses, Artistic-1.0 is elected | [kmike/text-unidecode](https://github.com/kmike/text-unidecode) |
| certifi | MPL 2.0 | The same dbt tool image (through `dbt-trino` → `requests`) | The Mozilla CA bundle: every HTTPS client in the image needs it, and no replacement exists. Shipped as the unmodified wheel | [certifi/python-certifi](https://github.com/certifi/python-certifi) |
| orjson | MPL 2.0 AND (Apache-2.0 OR MIT) | The same dbt tool image | A dual-licensed wheel of `dbt-core`; its MPL arm is the same license already accepted for `pathspec`. Shipped as the unmodified wheel | [ijl/orjson](https://github.com/ijl/orjson) |

The dbt tool image's build fails on any package that is not permissively licensed and not in this
table: `demos/images/dbt/check-licenses.py` reads `demos/images/dbt/license-exceptions.txt`, and
those four lines are the `pathspec`, `certifi`, `orjson` and `text-unidecode` rows above.

Every exception carries the same compliance conditions:

- **Unmodified.** No build or deploy step patches the binary, its code or its image. The image is
  consumed by digest.
- **Notices kept.** The license text and copyright notices in the image stay intact. The image is not
  stripped or flattened.
- **Source available.** Where the image is redistributed (a mirror, an air-gapped bundle), this page
  links the exact upstream source tag of the pinned version.

## Common questions

Components people often ask about that the policy excludes, and what stardelt uses instead:

| Component | License | stardelt uses |
|---|---|---|
| MinIO, Garage | AGPL-3.0 | SeaweedFS, or your own S3-compatible store |
| Metabase (community edition) | AGPL-3.0 | Apache Superset |
| HashiCorp Vault | BSL 1.1 | OpenBao |
| Grafana | AGPL-3.0 | Nothing bundled; bring your own monitoring |
| Airbyte (platform) | ELv2 | Nothing bundled yet: see the [roadmap](../roadmap) |

A license can change. Check the upstream license for the version you run if this matters to you.

## Checking a component

Before stardelt adds or upgrades a component:

1. Read its `LICENSE` file for the exact version, not just the repository's front page.
2. Confirm that the license is on the [OSI list](https://opensource.org/licenses) and accepted above.
3. If a component has moved outside the policy, stay on the last compliant version and replace it.

## Reporting a license problem

If a component is not under the license stated in these docs,
[open an issue](https://github.com/stardelt/stardelt-docs/issues) with the component and version, a
link to the license file or announcement, and the new license's OSI status.

A component also has to pass the [current-generation test](current-generation).
