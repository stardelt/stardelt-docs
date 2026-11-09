---
title: "Checks to run"
sidebar_label: "Checks to run"
slug: /operations/checks
---

# Checks to run

These are read-only checks; each prints a verdict and exits non-zero when it proves something is wrong. Run them after an upgrade and nightly. `verify-pgdump` restores into a scratch database and drops it; it is not read-only in the strictest sense.

## After an upgrade

`make step-verify` (the target the upgrade path runs) runs the seven checks below:

| Command | What it proves | A failure means |
| --- | --- | --- |
| `make verify-trino-auth` | Trino accepts authenticated sign-in. | Authentication to Trino is broken. |
| `make verify-catalog-permissions` | The live Catalog grants against the OPA bridge. | The live Catalog grants do not match expectations. |
| `make verify-backups-all` | Every volume has a backup mechanism and a recent backup, or an accepted ticketed exception. | A volume is missing a backup mechanism or has a backup older than the limit. |
| `make verify-streaming` | The Kafka broker is Ready, the Spark Operator watches the platform namespace or every namespace, every StreamApp's status is current and every one that should run is `Running`, and the Strimzi controller has not restarted inside the operator's ten-minute window (an older restart is printed with its age and stays a checkmark). A `Pending` stream is a warning (`!`), not a pass: it is reported with its last submission time and does not change the verdict; `Stopped` is a pass. | A StreamApp cannot run on this install, is `Failed`, or its status is behind its spec (see [the streaming guide](../guides/streams)). |
| `make verify-crds` | Every live stardelt CRD schema is `origin/main`'s in the operator checkout (`chart/crds`). The verdict names the commit; an unversioned working tree is named as such. | A merge added a field or a kind but the cluster's CRD schema was not updated, so the API server rejects the new field. Run `make install-operator` (or `./scripts/pin-image.sh stardelt-operator`) to apply the CRDs. |
| `make verify-pins` | Every live Deployment runs the digest its file pins (Nova, the operator, Spark, both Superset Deployments and Airflow), and so do the places that are not Deployments: the JupyterHub spawn image in Secret `hub`, Airflow's `PIPELINE_NOTEBOOK_IMAGE`, and the `airflow-group-roles` and `superset-group-roles` CronJobs. | A merge was pinned but never rolled out, or a hand-pinned image was changed in one place only. The failing row names the fix: `./scripts/pin-image.sh <app>`, `make install-notebooks` for the JupyterHub image, `make step-airflow` for the notebook task image and the Airflow CronJob, or `make step-superset` for the two Superset Deployments and the Superset CronJob. |
| `make verify-connections` | The Pipeline CRD carries `spec.tasks[].connection`, the Airflow pipeline reader may read `Connection` resources, and the DAG processor's image resolves a connection into `CONN_<NAME>_<KEY>` variables. | A merge moved one of the three links (operator CRD, platform Role, loader image) without a rollout: run `./scripts/pin-image.sh stardelt-operator` for the `crd` row, `make step-airflow` for `role` and `loader`. |

One check is deliberately not part of `step-verify` because it writes: `make verify-airflow-actions` signs
in as Nova's Airflow service user, reads one DAG, pauses and resumes it, and restores the state it found
(`DAG`, `NS` and `PORT` select the target; default `pegelonline_hourly` in `stardelt`). It is `PASS`, `FAIL`
or `UNVERIFIED` — a namespace without the `Pipelines` pillar has no `airflow-nova-api` Secret, and that is
`UNVERIFIED`, not a failure. Run it after an upgrade and whenever Nova's pipeline buttons misbehave.

`verify-streaming` also compares every running `StreamApp`'s job script with the ConfigMap the
operator wrote for it. A stream that predates the comparison, or that runs an older script, is
a warning (`!`), not a failure: the operator resubmits it on its next reconcile. After an
operator upgrade, wait one reconcile (about a minute) and run the check again before treating
it as a problem.

## Nightly

| Command | What it proves | A failure means |
| --- | --- | --- |
| `make verify-backups-all` | Every volume has a backup mechanism and a recent backup, or an accepted ticketed exception. | A volume is missing a backup mechanism or has a backup older than the limit. |
| `make verify-images` | Every pinned `ghcr.io/stardelt/*` image is readable with the cluster's pull credential. | Some pinned image is not readable with the cluster's pull credential. |
| `make verify-realm-admin` | The realm-admin Secret still signs in. | The realm-admin Secret can no longer sign in. |
| `make verify-oidc-clients` | Every confidential client's secret still authenticates. | One or more confidential client secrets no longer authenticate. |
| `make verify-pgdump PG_DUMP=all` | The pg_dump CronJobs produce restorable dumps. | A dump cannot be produced or restored successfully. |
| `make check-pins` | The registry's `dev`/`demo` digests against every checked-in pin, and the operator's golden values against this repository's pins. Needs no cluster. | A merge published an image that is not pinned (or a pin was changed in one place only). The failing row names the file; run `./scripts/pin-image.sh <app>` and open a pin PR. |

## When you change one thing

| Situation | Command | What it proves |
| --- | --- | --- |
| After a TLS or sign-in change | `make verify-trino-tls` | The in-cluster Trino path is TLS-only and token-authenticated. |
| After a `Catalog`/role change | `make verify-catalog-permissions` | The live Catalog grants against the OPA bridge. |
| After a `Cluster` change | `make verify-backups`, `make verify-backups-nova`, `make verify-backups-identity`, or `make verify-backups-openfga` | WAL archiving per database, with a real object in the bucket. |
| After an Airflow RBAC or service-user change | `make verify-airflow-actions` | Nova's Airflow service user can sign in, read a DAG and pause/resume it. |

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

A `!` line is a warning and the command still exits 0. Four warnings exist today: a stream in
`Pending` (not running now), a running stream that restarted inside the operator's ten-minute
window, a Strimzi controller whose newest restart is inside the ten-minute window, and a
SparkApplication list the check cannot read (so execution attempts are not checked). Each names
the object; the `PASS` verdict means no check failed, not that there were no warnings. The
streaming guide explains what `Restarting` means; the Kafka page explains the controller's restart
count. A controller whose newest restart is older than the ten-minute window prints a checkmark
and the age, for example `✓ strimzi-operator   7 restart(s), last 49m ago (outside the window)`;
`RESTART_WINDOW_SECS` overrides the window for a test.

`UNVERIFIED` plus exit 3 means the check could not see its subject (bucket, Secret, kube context) and proved nothing — fix the access, do not treat it as a pass.

Exit 1 means the check ran and found a real problem — link to the matching anchor in [./troubleshooting](./troubleshooting) where one exists (image pull), otherwise to the component page under `../services/`.

## What runs by itself

`make install` runs `verify-backup-config` while it creates the catalog's Postgres cluster;
`make upgrade` runs it too and then, at the end, the seven `step-verify` checks above.
Everything else is manual. `verify-images` needs the cluster's pull credential, so it is never a CI job. The daily `Pin freshness` workflow runs `scripts/check_pin_freshness.py` and files one issue (label `bug`, `P2`) while a pin is behind the registry; `scripts/pin-rollup.sh` pushes the `chore/pin-rollup` branch, whose PR is opened by hand while GitHub forbids Actions from creating pull requests.

## Related

- [./backups](./backups)
- [./production](./production)
- [./troubleshooting](./troubleshooting)
