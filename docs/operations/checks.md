---
title: "Checks to run"
sidebar_label: "Checks to run"
slug: /operations/checks
---

# Checks to run

These are read-only checks; each prints a verdict and exits non-zero when it proves something is wrong. Run them after an upgrade and nightly. Four are not strict read-only: `verify-restore` restores the catalog database into namespace `stardelt-restore` and deletes it, `verify-pgdump` restores into a scratch database and drops it, `verify-external-secrets` creates and deletes namespace `eso-verify` and `ClusterSecretStore eso-verify-fake`, and `verify-trino-graceful-shutdown` deletes one worker pod, which the Deployment replaces.

## After an upgrade

`make step-verify` (the target the upgrade path runs) runs the checks below:

| Command | What it proves | A failure means |
| --- | --- | --- |
| `make verify-trino-auth` | Trino accepts authenticated sign-in. | Authentication to Trino is broken. |
| `make verify-catalog-permissions` | The live Catalog grants against the OPA bridge. | The live Catalog grants do not match expectations. |
| `make verify-backups-all` | Every volume has a backup mechanism and a recent backup, or an accepted ticketed exception. | A volume is missing a backup mechanism or has a backup older than the limit. |
| `make verify-streaming` | The Kafka broker is Ready, the Spark Operator watches the platform namespace or every namespace, every StreamApp's status is current and every one that should run is `Running`, and the Strimzi controller has not restarted inside the operator's ten-minute window (an older restart is printed with its age and stays a checkmark). A `Pending` stream is a warning (`!`), not a pass: it is reported with its last submission time and does not change the verdict; `Stopped` is a pass. | A StreamApp cannot run on this install, is `Failed`, or its status is behind its spec (see [the streaming guide](../guides/streams)). |
| `make verify-crds` | Every live stardelt CRD schema is `origin/main`'s in the operator checkout (`chart/crds`). The verdict names the commit; an unversioned working tree is named as such. | A merge added a field or a kind but the operator that serves it is older than `origin/main`: the operator applies its CRDs at start, so roll the current build (`make install-operator` or `./scripts/pin-image.sh stardelt-operator`). |
| `make verify-pins` | Every live Deployment runs the digest its file pins (Nova, the operator, Spark, both Superset Deployments and Airflow), and so do the places that are not Deployments: the JupyterHub spawn image in Secret `hub`, Airflow's `PIPELINE_NOTEBOOK_IMAGE`, the `airflow-group-roles` and `superset-group-roles` CronJobs, and the three helper CronJobs `access-sync`, `demo-reset` and `lakehouse-backup` (every container of each, against its manifest). | A merge was pinned but never rolled out, or a hand-pinned image was changed in one place only. The failing row names the fix: `./scripts/pin-image.sh <app>`, `make install-notebooks` for the JupyterHub image, `make step-airflow` for the notebook task image and the Airflow CronJob, `make step-superset` for the two Superset Deployments and the Superset CronJob, or `kubectl apply -f <manifest>` for a helper CronJob. |
| `make check-spark-runtimes-live` | The live Spark runtime catalogue — ConfigMap `stardelt-spark-runtimes` in the platform namespace — is the repository's catalogue in `chart/files/spark-runtimes.json` (compared normalized): image, Spark version, executor service account and the shared `sparkConf` the operator's `SparkCluster` controller reads. Before the live comparison it checks the same file against `manifests/spark.yaml` and `images/spark/Dockerfile`, so a one-file digest bump fails here too. | A Spark started through the operator would differ from one started by `make install` in a way nobody chose, or the ConfigMap was never applied: run `make install-spark` and run the check again. `UNVERIFIED` (exit 3) means there is no ConfigMap in this namespace — that is "not installed", not a drift. |
| `make verify-operator-values` | The running operator carries the golden values the pins were merged with: the SeaweedFS volume size, the JupyterHub home size, the Airflow `stardelt-nova-operator` role, and the loader, notebook and Superset digests. | The operator image predates a values merge, or the Deployment was not rolled: run `./scripts/pin-image.sh stardelt-operator`. The failing row names the value. |
| `make verify-connections` | The Pipeline CRD carries `spec.tasks[].connection`, the Airflow pipeline reader may read `Connection` resources, and the DAG processor's image resolves a connection into `CONN_<NAME>_<KEY>` variables. | A merge moved one of the three links (operator CRD, platform Role, loader image) without a rollout: run `./scripts/pin-image.sh stardelt-operator` for the `crd` row, `make step-airflow` for `role` and `loader`. |
| `make verify-maintenance` | Every `Catalog` with a `pipeline-<ownerGroup>` principal has the `maint-<catalog>` CronJob the operator intends: the staggered default schedule (never `0 2 * * *`), `stardelt maintenance run --catalog <name>`, the principal's token Secret, and `MaintenanceReady=True`. Prints the newest Job and warns when two catalogs share a minute or a catalog has no principal. It also proves that every Ready `Catalog` has a `<name>.properties` key in ConfigMap `trino-catalog`: a Catalog created from Nova or `kubectl apply` and never passed to `make catalogs` has a warehouse and a maintenance job but no Trino catalog, and its run fails with `CATALOG_NOT_FOUND` (`platform#914`). | A catalog with a principal has no maintenance job, its schedule is not the staggered default, an env var or the principal reference drifted (a stale operator: `make install-operator`), or the newest run failed: the row names the job to read. Or a Ready Catalog has no Trino catalog: run `make catalogs` (it restarts the Trino coordinator when the set changes). |

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

Nova's **Platform** page shows the same state live, including the images the cluster runs
([the Platform page](./health)).

## Nightly

| Command | What it proves | A failure means |
| --- | --- | --- |
| `make verify-backups-all` | Every volume has a backup mechanism and a recent backup, or an accepted ticketed exception. | A volume is missing a backup mechanism or has a backup older than the limit. |
| `make verify-images` | Every pinned `ghcr.io/stardelt/*` image is readable with the cluster's pull credential. | Some pinned image is not readable with the cluster's pull credential. |
| `make verify-realm-admin` | The realm-admin Secret still signs in. | The realm-admin Secret can no longer sign in. |
| `make verify-oidc-clients` | Every confidential client's secret still authenticates. | One or more confidential client secrets no longer authenticate. |
| `make verify-pgdump PG_DUMP=all` | The pg_dump CronJobs produce restorable dumps. | A dump cannot be produced or restored successfully. |
| `make verify-restore` | The catalog database restores from the barman-cloud plugin's backup into a scratch namespace, has tables, and the namespace is deleted again. | The backup finished but does not restore: a different PostgreSQL major version, a missing object, or a credential that cannot read the backup prefix. The command prints the restored cluster's logs when it does not become Ready; the guide is [Backups and restore](./backups#restore). |
| `make check-pins` | The registry's `dev`/`demo` digests against every checked-in pin, and the operator's golden values against this repository's pins. Needs no cluster. | A merge published an image that is not pinned (or a pin was changed in one place only). The failing row names the file; run `./scripts/pin-image.sh <app>` and open a pin PR. |
| `make verify-cronjobs` | Every CronJob's newest Job succeeded, is running, is waiting (no Job yet, or a fresh install), or the CronJob is suspended. Read-only; 0.5 s on the lab. | A scheduled job's newest run failed: the row names the Job and prints `kubectl -n stardelt logs job/<job> --tail=20`. `UNVERIFIED` (exit 3) means the namespace does not exist or `kubectl` cannot list Jobs — not a failure, but not proof either. |

## When you change one thing

| Situation | Command | What it proves |
| --- | --- | --- |
| After a TLS or sign-in change | `make verify-trino-tls` | The in-cluster Trino path is TLS-only and token-authenticated. |
| After a Trino worker or shutdown change | `make verify-trino-graceful-shutdown` | A worker deleted while the engine is up logs `Shutdown requested` and a replacement becomes Ready, so the preStop drain works. It deletes one worker pod. `helm test trino` cannot prove this here: its connection pod mounts a Secret this install does not create and signs in as a user it does not have (platform#1536). |
| After a `SqlWarehouse` or a scale-setting change | `make verify-warehouse-scale` | The three writers of a class's scale state agree: the `stardelt.io/queries-in-flight` and `stardelt.io/last-query-at` annotations Nova reports, `status.scale` the access-sync job writes, and the worker Deployment's replica count. A `·` line is not a failure and names its own reason: `— pending` is a value waiting for the next access-sync tick (up to two minutes after a query), `— skipped` is a class whose `status.phase` is not `Ready`, and `no deploy/trino-worker` is an install whose engine runs on the coordinator, where only the annotations are checked. A `✗` names the class and the disagreement. Read-only. |
| After a `Catalog`/role change | `make verify-catalog-permissions` | The live Catalog grants against the OPA bridge. |
| After a `Cluster` change | `make verify-backups`, `make verify-backups-nova`, `make verify-backups-identity`, or `make verify-backups-openfga` | WAL archiving per database, with a real object in the bucket. |
| After an External Secrets or `spec.secrets` change | `make verify-external-secrets` | External Secrets Operator is installed, a Fake-provider `ClusterSecretStore` is Ready, one `ExternalSecret` syncs into the Secret it owns, and both scratch objects are deleted. `UNVERIFIED` (exit 3) when ESO is not installed — run `make external-secrets` first; that is not a failure. |
| After an Airflow RBAC or service-user change | `make verify-airflow-actions` | Nova's Airflow service user can sign in, read a DAG and pause/resume it. |
| After a Compute change (a `SparkCluster`, the Spark runtime catalogue) | `make verify-compute`, `make verify-spark-cluster` | `verify-compute` reads the existing state: every `SparkCluster` the CRD accepts is `Running`, carries `spc-<name>-ingress` admitting exactly the owner's pods, Nova and Airflow, and the runtime catalogue is the repository's. `verify-spark-cluster` creates one of its own and deletes it again. A failure means a `SparkCluster` runs without its ingress policy (Spark Connect is open to every pod), the catalogue drifted from `chart/files/spark-runtimes.json`, or the CRD rejects the fields the Compute page writes: run `make install-operator` or `make install-spark`. |
| After a Spark image, Spark version or runtime-catalogue change | `make check-spark-runtimes-live` | The live ConfigMap is the repository's catalogue, so the shared Spark Connect server and every `SparkCluster` will start the same image with the same settings. A failure names the differing key; the fix is `make install-spark`, never hand-editing the ConfigMap. |
| After a resize, a node change or a Trino upgrade | `make perf-baseline` | The engine baseline on this node: p50/p95/max per query and per concurrency level. It needs an administrator token, writes `perf/results/`, and proves nothing about permissions or Iceberg; the page is [Performance baseline](./performance). |

`make verify-compute` is not part of `make step-verify`; it is manual today and `make install-spark`
runs it after a Spark install.

`make verify-spark-cluster` is the deeper check: it creates a `small` SparkCluster named
`verify-spark-cluster`, waits for `Running`, asserts ten things — the endpoint, the server pod's
readiness and identity, the driver's ServiceAccount/Role/RoleBinding, the two admission
policies with their bindings, the group's ingress policy, a TLS-clean log, the executor path on
7078/7079 and the driver's reach of the catalog on `lakekeeper:8181` — and deletes the CR and
every object it owns on every exit path. It takes about a minute and is manual.

## Security and exposure

None of these is part of `make step-verify`; they are manual. `verify-seaweedfs-ports` and
`verify-metrics` create and delete their probe pods, and the pod-security pair creates and deletes
namespace `stardelt-pss-probe`; the rest read the cluster only.

| Command | What it proves | A failure means |
| --- | --- | --- |
| `make verify-pod-security` | Every Running pod's spec is re-admitted with a server-side dry run into a scratch namespace that enforces Pod Security `restricted`, except the Makefile's named exceptions (`^seaweedfs-`, `^lakekeeper-` — the chart's defaults declare no `securityContext`). | A pod would be refused by a `restricted` namespace and is not an accepted exception: the printout names the pod and the violated field. The install's floor is `baseline` (next row), so this one is the stricter, aspirational check. |
| `make verify-pod-security-baseline` | The same for `baseline`, the level the install's namespace enforces (#1096). | A pod is refused at `baseline`, so the namespace's own admission would refuse it after a restart: name the pod in the issue and fix its `securityContext`, do not lower the level. |
| `make verify-seaweedfs-ports` | Only SeaweedFS's own pods reach the filer (8888), master (9333) and volume (8080) ports; the S3 gateway (8333) and the bucket hook keep working (#1100). | A foreign pod can open one of the unsigned ports — the NetworkPolicy was removed or a new label matches it. Re-apply `manifests/seaweedfs-network-policy.yaml` (or `make step-storage`). |
| `make verify-spark-guard` | The admission policy on a Spark Connect driver: it may create executor pods only, with the executor ServiceAccount and the chart's labels (#1096). | A driver can create a pod the policy was meant to stop, or the policy/binding is gone: run `make install-spark` and read the policy's name in the printout. |
| `make verify-metrics` | Every metrics endpoint a scraper can reach answers Prometheus text; the NetworkPolicy admits a pod labelled `app.kubernetes.io/name: prometheus` and nothing else (#607). | A scrape target is unreachable from the scraper's namespace or answers non-Prometheus text: the row names the endpoint; see [Monitoring](./monitoring). |

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
`make upgrade` runs it too and then, at the end, the `step-verify` checks above.
Everything else is manual. `verify-images` needs the cluster's pull credential, so it is never a
CI job. The daily `Pin freshness` workflow runs `scripts/check_pin_freshness.py` for the
registry's `dev`/`demo` digests and, against a checkout of `stardelt-operator`,
`scripts/check-operator-pins.sh` for the golden values both install paths share; when either
reports a difference it files one issue (label `bug`, `P2`) with both outputs, and a run where
both pass again closes that issue with the commit it checked.
`scripts/pin-rollup.sh` pushes the `chore/pin-rollup` branch, whose PR is opened by hand while
GitHub forbids Actions from creating pull requests.

## Related

- [./backups](./backups)
- [./production](./production)
- [./troubleshooting](./troubleshooting)
