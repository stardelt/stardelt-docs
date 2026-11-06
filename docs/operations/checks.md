---
title: "Checks to run"
sidebar_label: "Checks to run"
slug: /operations/checks
---

# Checks to run

These are read-only checks; each prints a verdict and exits non-zero when it proves something is wrong. Run them after an upgrade and nightly. `verify-pgdump` restores into a scratch database and drops it; it is not read-only in the strictest sense.

## After an upgrade

`make step-verify` (the target the upgrade path runs) runs the three checks below:

| Command | What it proves | A failure means |
| --- | --- | --- |
| `make verify-trino-auth` | Trino accepts authenticated sign-in. | Authentication to Trino is broken. |
| `make verify-catalog-permissions` | The live Catalog grants against the OPA bridge. | The live Catalog grants do not match expectations. |
| `make verify-backups-all` | Every volume has a backup mechanism and a recent backup, or an accepted ticketed exception. | A volume is missing a backup mechanism or has a backup older than the limit. |

## Nightly

| Command | What it proves | A failure means |
| --- | --- | --- |
| `make verify-backups-all` | Every volume has a backup mechanism and a recent backup, or an accepted ticketed exception. | A volume is missing a backup mechanism or has a backup older than the limit. |
| `make verify-images` | Every pinned `ghcr.io/stardelt/*` image is readable with the cluster's pull credential. | Some pinned image is not readable with the cluster's pull credential. |
| `make verify-realm-admin` | The realm-admin Secret still signs in. | The realm-admin Secret can no longer sign in. |
| `make verify-oidc-clients` | Every confidential client's secret still authenticates. | One or more confidential client secrets no longer authenticate. |
| `make verify-pgdump PG_DUMP=all` | The pg_dump CronJobs produce restorable dumps. | A dump cannot be produced or restored successfully. |

## When you change one thing

| Situation | Command | What it proves |
| --- | --- | --- |
| After a TLS or sign-in change | `make verify-trino-tls` | The in-cluster Trino path is TLS-only and token-authenticated. |
| After a `Catalog`/role change | `make verify-catalog-permissions` | The live Catalog grants against the OPA bridge. |
| After a `Cluster` change | `make verify-backups`, `make verify-backups-nova`, `make verify-backups-identity`, or `make verify-backups-openfga` | WAL archiving per database, with a real object in the bucket. |

## How to read a failure

A `✗`/`FAIL` line names the object and the reason (paste the real `verify-images` output block from `troubleshooting.md`'s image section as the example):

```text
✓ jupyter-singleuser   ghcr.io/stardelt/jupyter-singleuser@sha256:c3d45ec4…   readable
✓ stardelt-operator   ghcr.io/stardelt/stardelt-operator@sha256:e7548851…   readable
✗ superset   ghcr.io/stardelt/superset@sha256:b9ced85d81a0c9efd2ca993f27bba5470e4815aad9d246b93e3ca5e62d26e8cd   404: the digest is gone from the registry (garbage-collected?)
✓ airflow   ghcr.io/stardelt/airflow@sha256:2d9504d1…   readable
✓ nova   ghcr.io/stardelt/nova@sha256:8562b91b…   readable
✓ spark   ghcr.io/stardelt/spark@sha256:7f9c3cbc…   readable
FAIL (1 of 6 images is not readable)
```

`UNVERIFIED` plus exit 3 means the check could not see its subject (bucket, Secret, kube context) and proved nothing — fix the access, do not treat it as a pass.

Exit 1 means the check ran and found a real problem — link to the matching anchor in [./troubleshooting](./troubleshooting) where one exists (image pull), otherwise to the component page under `../services/`.

## What runs by itself

`make install`/`make upgrade` run `verify-backup-config` and `step-verify`; everything else is manual. `verify-images` needs the cluster's pull credential, so it is never a CI job.

## Related

- [./backups](./backups)
- [./production](./production)
- [./troubleshooting](./troubleshooting)
