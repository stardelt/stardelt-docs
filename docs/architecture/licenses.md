---
title: "License policy"
sidebar_label: "Licenses"
slug: /architecture/licenses
---

# License policy

stardelt's own code is licensed under **Apache 2.0**. The platform installs upstream open-source
projects, and their own licenses apply to them.

## Policy

| Decision | Licenses |
|---|---|
| **Accepted** | OSI-approved permissive licenses: Apache 2.0, MIT, BSD-2-Clause, BSD-3-Clause |
| **Documented exception** | MPL 2.0, for OpenBao only |
| **Rejected** | AGPL, GPL, BSL, SSPL, ELv2, FSL, Confluent Community License, proprietary, and anything source-available that is not OSI-approved |

The policy is strict because "self-host forever" only holds if nothing in the default install can
be relicensed out from under you. It applies to everything stardelt ships or installs, and to the
dependencies of stardelt's own code.

## The exception: OpenBao

OpenBao stores secrets for connections. It is licensed under MPL 2.0, which is OSI-approved but
copyleft per file, so it is not purely permissive. It is accepted as the one exception because:

- no permissive secrets manager with comparable features exists;
- MPL 2.0 applies per file and has no network-use obligations;
- OpenBao is governed by the Linux Foundation, so no single vendor can relicense it.

OpenBao is **optional**. It is installed only if you run `make openbao` or turn it on in your
`PlatformInstance`. Without it, the install contains nothing under MPL 2.0.

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
