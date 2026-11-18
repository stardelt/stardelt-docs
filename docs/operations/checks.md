---
title: "Checks to run"
sidebar_label: "Checks to run"
slug: /operations/checks
---

# Checks to run

These are read-only checks; each prints a verdict and exits non-zero when it proves something is wrong. Run them after an upgrade and nightly. Five are not strict read-only: `verify-restore` restores the catalog database into namespace `stardelt-restore` and deletes it, `verify-pgdump` restores into a scratch database and drops it, `verify-external-secrets` creates and deletes namespace `eso-verify` and `ClusterSecretStore eso-verify-fake`, and `verify-trino-graceful-shutdown` deletes one worker pod, which the Deployment replaces, and `verify-spark-cluster` creates a `SparkCluster` named `verify-spark-cluster` and deletes it and every object it owns.

## After an upgrade

`make step-verify` (the target the upgrade path runs) runs the checks below:

| Command | What it proves | A failure means |
| --- | --- | --- |
| `make verify-trino-auth` | Trino accepts authenticated sign-in. | Authentication to Trino is broken. |
| `make verify-catalog-permissions` | The live Catalog grants against the OPA bridge. | The live Catalog grants do not match expectations. |
| `make verify-backups-all` | Every volume has a backup mechanism and a recent backup, or an accepted ticketed exception. | A volume is missing a backup mechanism or has a backup older than the limit. |
| `make verify-streaming` | The Kafka broker is Ready, the Spark Operator watches the platform namespace or every namespace, every StreamApp's status is current and every one that should run is `Running`, and the Strimzi controller has not restarted inside the operator's ten-minute window (an older restart is printed with its age and stays a checkmark). A `Pending` stream is a warning (`!`), not a pass: it is reported with its last submission time and does not change the verdict; `Stopped` is a pass. | A StreamApp cannot run on this install, is `Failed`, or its status is behind its spec (see [the streaming guide](../guides/streams)). |
| `make verify-crds` | Every live stardelt CRD schema is `origin/main`'s in `operator/` (`chart/crds`). The verdict names the commit; an unversioned working tree is named as such. | A merge added a field or a kind but the operator that serves it is older than `origin/main`: the operator applies its CRDs at start, so roll the current build (`make install-operator` or `./scripts/pin-image.sh stardelt-operator`). |
| `make verify-pins` | Every live Deployment runs the digest its file pins — Nova, the operator, Spark, both Superset Deployments, Airflow, the five core services Lakekeeper, Trino, SeaweedFS S3, OpenFGA and the Airflow statsd exporter, the CNPG operator, the barman-cloud plugin, Reloader, External Secrets' three Deployments, the Spark operator's two, and the Strimzi cluster operator — and so do the objects that are not Deployments: the JupyterHub spawn image in Secret `hub` and its own hub, proxy and scheduler Deployments, Airflow's `PIPELINE_NOTEBOOK_IMAGE`, and that every Airflow container carrying the worker tag — the scheduler's and dag-processor's main containers **and their log-groomer sidecars** — carries the digest `helm-values/airflow.yaml` pins, the two group-roles CronJobs, the five helper CronJobs (`access-sync`, `demo-reset`, `lakehouse-backup`, `openbao-group-policies`, `spark-confmap-janitor`), the Keycloak Deployment, the Kafka broker pod and its two-container entity-operator Deployment, and the StatefulSets and DaemonSet the charts default: OpenBao, both Superset dependency databases, Airflow's PostgreSQL, and the JupyterHub placeholder and image puller. | A merge was pinned but never rolled out, or a hand-pinned image was changed in one place only. The failing row names the fix: `./scripts/pin-image.sh <app>`, `make openbao`, `make install-notebooks` for the JupyterHub images, `make step-airflow` for the notebook task image, the Airflow CronJob and its PostgreSQL, `make step-superset` for the two Superset Deployments, its PostgreSQL and Redis and the Superset CronJob, `make external-secrets`, `make install-spark-operator` or `make install-kafka` for the chart defaults, or `kubectl apply -f <manifest>` for a helper CronJob and the Kafka resource. A groomer carrying an older tag is the `airflow-worker-tag` row: `make step-airflow` re-renders the Airflow release (a helm upgrade does not restart a sidecar whose tag moved unless the release changes). |
| `make verify-restarts` | Every restart-prone Deployment's pods are Ready, and each one's restart count and newest container exit are printed — the platform's own (the operator, Nova), the chart controllers (the Spark operator, Strimzi, CloudNativePG, the barman plugin) and the JupyterHub scheduler, hub, proxy and Lakekeeper. A restart is printed as `!` and is never a failure; a pod that is not Ready is. The list is `rows` in `scripts/verify-restarts.sh`. | A listed Deployment has a pod that is not Ready: the row names it, and `kubectl -n stardelt get pods` plus `kubectl describe pod` say why. Several `!` rows whose last exit is `exit=255` in the same minute are the node stall (platform#554), not a component bug. |
| `make check-spark-runtimes-live` | The live Spark runtime catalogue — ConfigMap `stardelt-spark-runtimes` in the platform namespace — is the repository's catalogue in `chart/files/spark-runtimes.json` (compared normalized): image, Spark version, executor service account and the shared `sparkConf` the operator's `SparkCluster` controller reads. Before the live comparison it checks the same file against `manifests/spark.yaml` and `images/spark/Dockerfile`, so a one-file digest bump fails here too. | A Spark started through the operator would differ from one started by `make install` in a way nobody chose, or the ConfigMap was never applied: run `make install-spark` and run the check again. `UNVERIFIED` (exit 3) means there is no ConfigMap in this namespace — that is "not installed", not a drift. |
| `make verify-operator-values` | The running operator carries the golden values the pins were merged with — forty-four probes: the SeaweedFS volume block and its size, the JupyterHub home size, the Airflow `stardelt-nova-operator` role, one per digest of the thirteen shared values files, and the loader, notebook, Superset, External Secrets, Spark operator and Strimzi cluster operator images — plus eight identity-overlay probes: Trino's TLS listener, its `PASSWORD,OAUTH2` authentication, its password file, its impersonation rule and the IdP gate image, Superset's impersonated Trino host, and the OIDC client Secret for JupyterHub and for Airflow. | The operator image predates a values merge, or the Deployment was not rolled: run `./scripts/pin-image.sh stardelt-operator`. The failing row names the value. The Kafka broker's own digest is not a values field — it is the operator's `BROKER_IMAGE` constant, compared by `make check-pins` and by the operator's unit tests, not by this check. |
| `make verify-connections` | The Pipeline CRD carries `spec.tasks[].connection`, the Airflow pipeline reader may read `Connection` resources, and the DAG processor's image resolves a connection into `CONN_<NAME>_<KEY>` variables. | A merge moved one of the three links (operator CRD, platform Role, loader image) without a rollout: run `./scripts/pin-image.sh stardelt-operator` for the `crd` row, `make step-airflow` for `role` and `loader`. |
| `make verify-maintenance` | Every `Catalog` with a `pipeline-<ownerGroup>` principal has the `maint-<catalog>` CronJob the operator intends: the staggered default schedule (never `0 2 * * *`), `stardelt maintenance run --catalog <name>`, the principal's token Secret, and `MaintenanceReady=True`. Prints the newest Job and warns when two catalogs share a minute or a catalog has no principal. It also proves that every Ready `Catalog` has a `<name>.properties` key in ConfigMap `trino-catalog`: a Catalog created from Nova or `kubectl apply` and never passed to `make catalogs` has a warehouse and a maintenance job but no Trino catalog, and its run fails with `CATALOG_NOT_FOUND` (`platform#914`). | A catalog with a principal has no maintenance job, its schedule is not the staggered default, an env var or the principal reference drifted (a stale operator: `make install-operator`), or the newest run failed: the row names the job to read. Or a Ready Catalog has no Trino catalog: run `make catalogs` (it restarts the Trino coordinator when the set changes). |

Two checks are deliberately not part of `step-verify`. `make verify-airflow-actions` writes: it signs
in as Nova's Airflow service user, reads one DAG, pauses and resumes it, and restores the state it found
(`DAG`, `NS` and `PORT` select the target; default `pegelonline_hourly` in `stardelt`). It is `PASS`, `FAIL`
or `UNVERIFIED` — a namespace without the `Pipelines` pillar has no `airflow-nova-api` Secret, and that is
`UNVERIFIED`, not a failure. Run it after an upgrade and whenever Nova's pipeline buttons misbehave.
`make verify-airflow-runs` only reads (it reports every unpaused DAG's newest run) and it is not in
`step-verify` yet.

`verify-streaming` also compares every running `StreamApp`'s job script with the ConfigMap the
operator wrote for it. A stream that predates the comparison, or that runs an older script, is
a warning (`!`), not a failure: the operator resubmits it on its next reconcile. After an
operator upgrade, wait one reconcile (about a minute) and run the check again before treating
it as a problem.

Nova's **Platform** page shows the same state live, including the images the cluster runs
([the Platform page](./troubleshooting#the-platform-page)).

## Nightly

| Command | What it proves | A failure means |
| --- | --- | --- |
| `make verify-backups-all` | Every volume has a backup mechanism and a recent backup, or an accepted ticketed exception. | A volume is missing a backup mechanism or has a backup older than the limit. |
| `make verify-images` | Every pinned `ghcr.io/stardelt/*` image is readable with the cluster's pull credential. | Some pinned image is not readable with the cluster's pull credential. |
| `make verify-realm-admin` | The realm-admin Secret still signs in. | The realm-admin Secret can no longer sign in. |
| `make verify-oidc-clients` | Every confidential client's secret still authenticates. | One or more confidential client secrets no longer authenticate. |
| `make verify-pgdump PG_DUMP=all` | The pg_dump CronJobs produce restorable dumps. | A dump cannot be produced or restored successfully. |
| `make verify-restore` | The catalog database restores from the barman-cloud plugin's backup into a scratch namespace, has tables, and the namespace is deleted again. | The backup finished but does not restore: a different PostgreSQL major version, a missing object, or a credential that cannot read the backup prefix. The command prints the restored cluster's logs when it does not become Ready; the guide is [Backups and restore](./backups#restore). |
| `make check-pins` | The registry's `dev`/`demo` digests against every checked-in pin, and the operator's golden values against this repository's pins: nine named images — Nova, the loader, Spark, Superset, the notebook, External Secrets, the Spark operator, the Strimzi cluster operator and the Kafka broker — Lakekeeper's catalog image (its platform file's first digest is the OPA bridge, which the operator path does not render), and the whole digest set of the thirteen values files both install paths share (26 digests: airflow 4, JupyterHub 7, Superset 4, barman-cloud 2, and one each in External Secrets, the CNPG operator, Trino, OpenBao, OpenFGA, SeaweedFS, the Spark operator, Strimzi's Kafka and the Trino identity gate), and the golden image: the digest pinned in `helm-values/operator.yaml`, resolved to its `org.opencontainers.image.revision` label, ships a `NOVA_IMAGE` equal to the Nova pin in `manifests/nova-deployment.yaml`. Needs no cluster. | A merge published an image that is not pinned (or a pin was changed in one place only). The failing row names the file. A set row prints `platform only: sha256:…` or `operator only: sha256:…` with the path to bump; run `./scripts/pin-image.sh <app>` and open a pin PR, or bump the operator's `crates/stardelt-operator/values/<component>.yaml` in `operator/` when the `✗` names that path. The golden row names the operator digest, the revision and the two Nova digests: bump `NOVA_IMAGE` in the operator, build it, then pin that operator image in `helm-values/operator.yaml`. |
| `make verify-cronjobs` | Every CronJob's newest Job succeeded, is running, is waiting (no Job yet, or a fresh install), or the CronJob is suspended. Read-only; 0.5 s on the lab. | A scheduled job's newest run failed: the row names the Job and prints `kubectl -n stardelt logs job/<job> --tail=20`. `UNVERIFIED` (exit 3) means the namespace does not exist or `kubectl` cannot list Jobs — not a failure, but not proof either. |
| `make verify-airflow-runs` | Every unpaused DAG's newest run is `success`; each row prints the state, `run_after` and the run's age. A paused DAG and a DAG with no run print `·` and never fail the check. Read-only: two reads per DAG through Nova's Airflow service user and the port-forward of `svc/airflow-api-server`, like `make verify-airflow-actions`. | The row names the DAG and prints its newest run's state and age: open the Airflow UI or read `kubectl -n stardelt logs <task pod>` for the failing task. `UNVERIFIED` (exit 3) means the check could not see its subject — an install without pipelines has no Secret `airflow-nova-api` — not a failure. |

`make check-pins` is three checks: `scripts/check_pin_freshness.py`,
`scripts/check-operator-pins.sh` and `scripts/check_golden_image.py`. The third resolves the
operator digest pinned in `helm-values/operator.yaml` to its
`org.opencontainers.image.revision` label, reads `NOVA_IMAGE` at that commit in `operator/`,
and compares it with `manifests/nova-deployment.yaml` — so an operator install cannot
render a Nova the platform does not pin. The second and third read the operator folder —
`../operator` from `platform/`, or `$OPERATOR_DIR` when it is set. Without those commits, or
when the pinned one is not there, only the second prints
`check-operator-pins: SKIP (no operator checkout at ../operator)` and exits 0; the third
prints `✗ operator <digest> revision <rev>: <rev> is not in ../operator — run git fetch there`
and exits 3, so `make check-pins` fails — fetch the operator's commits in `operator/` (or point
`OPERATOR_DIR` at the folder) before trusting a green `make check-pins`. The nightly
workflow passes `OPERATOR_DIR=../operator`.

The `dev` and `demo` tags move on **every** push to the repository that builds them, including
commits that ship nothing (a frontend test, a workflow edit), so a `✗` from the freshness half
means "a newer build exists", not "the cluster is behind". Before pinning, read the commits
between the pinned build and the tag: `<app>` needs a pin only when one of them touches a shipped
path. Measured 2026-11-17: Nova's `dev` was one end-to-end test ahead of the pin, and the airflow
`demo` tag was a rebuild after a CI-only demos commit; both rows were red and neither was a live
gap.

## When you change one thing

| Situation | Command | What it proves |
| --- | --- | --- |
| After a TLS or sign-in change | `make verify-trino-tls` | The in-cluster Trino path is TLS-only and token-authenticated. |
| After an operator install, an operator upgrade or a `PlatformInstance` delete | `make verify-fresh-node` | The operator install is a platform, not only a Deployment: the `PlatformInstance` and `Lakehouse` are Ready, the namespace carries the Pod Security floor, every Deployment is available, no pod is waiting to start, and Nova, Trino and the identity provider answer on their real ports. On a cluster installed with `make install` there is no `PlatformInstance`, so the row prints `? instance …` and the check exits `3` (`UNVERIFIED`, "not installed", not a failure). |
| After a Trino worker or shutdown change | `make verify-trino-graceful-shutdown` | A worker deleted while the engine is up logs `Shutdown requested` and a replacement becomes Ready, so the preStop drain works. It deletes one worker pod. `helm test trino` cannot prove this here: its connection pod mounts a Secret this install does not create and signs in as a user it does not have (platform#1536). |
| After a `SqlWarehouse` or a scale-setting change | `make verify-warehouse-scale` | The three writers of a class's scale state agree: the `stardelt.io/queries-in-flight` and `stardelt.io/last-query-at` annotations Nova reports, `status.scale` the access-sync job writes, and the worker Deployment's replica count. A `·` line is not a failure and names its own reason: `— pending` is a value waiting for the next access-sync tick (up to two minutes after a query), `— skipped` is a class whose `status.phase` is not `Ready`, and `no deploy/trino-worker` is an install whose engine runs on the coordinator, where only the annotations are checked. A `✗` names the class and the disagreement. Read-only. |
| After a `Catalog`/role change | `make verify-catalog-permissions` | The live Catalog grants against the OPA bridge. |
| After a `Cluster` change | `make verify-backups`, `make verify-backups-nova`, `make verify-backups-identity`, or `make verify-backups-openfga` | WAL archiving per database, with a real object in the bucket. |
| After a PostgreSQL image change | `make roll-cnpg-image` | Every primary pod runs the digest its `Cluster`'s `spec.imageName` pins and the Cluster is `Ready`; a healthy install changes nothing (four `✓` and `PASS`, no pod touched). The procedure and the drift message are on [CloudNativePG](../services/cloudnative-pg). |
| After an External Secrets or `spec.secrets` change | `make verify-external-secrets` | External Secrets Operator is installed, a Fake-provider `ClusterSecretStore` is Ready, one `ExternalSecret` syncs into the Secret it owns, and both scratch objects are deleted. `UNVERIFIED` (exit 3) when ESO is not installed — run `make external-secrets` first; that is not a failure. |
| After an Airflow RBAC or service-user change | `make verify-airflow-actions` | Nova's Airflow service user can sign in, read a DAG and pause/resume it. |
| After a Compute change (a `SparkCluster`, the Spark runtime catalogue) | `make verify-compute`, `make verify-spark-cluster` | `verify-compute` reads the existing state: every `SparkCluster` the CRD accepts is `Running`, carries `spc-<name>-ingress` admitting exactly the owner's pods, Nova and Airflow, and the runtime catalogue is the repository's. `verify-spark-cluster` creates one of its own and deletes it again. A failure means a `SparkCluster` runs without its ingress policy (Spark Connect is open to every pod), the catalogue drifted from `chart/files/spark-runtimes.json`, or the CRD rejects the fields the Compute page writes: run `make install-operator` or `make install-spark`. |
| After a Spark image, Spark version or runtime-catalogue change | `make check-spark-runtimes-live` | The live ConfigMap is the repository's catalogue, so the shared Spark Connect server and every `SparkCluster` will start the same image with the same settings. A failure names the differing key; the fix is `make install-spark`, never hand-editing the ConfigMap. |
| After a resize, a node change or a Trino upgrade | `make perf-baseline` | The engine baseline on this node: p50/p95/max per query and per concurrency level. It needs an administrator token, writes `perf/results/`, and proves nothing about permissions or Iceberg; the page is [Performance baseline](./performance). |

`make verify-compute` is not part of `make step-verify`; it is manual today and `make install-spark`
runs it after a Spark install.

`make verify-fresh-node` is not part of `make step-verify` either: it needs a cluster installed by
the operator (a `PlatformInstance`), and the lab is installed with `make install`. Run it after an
operator install or upgrade. Its `upgrade` and `delete` phases are run directly —
`scripts/verify-fresh-node.sh upgrade` and `… delete` — because they change the cluster; the make
target runs the readiness checks only.

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
| `make verify-pod-security` | Every Running pod's spec is re-admitted with a server-side dry run into a scratch namespace that enforces Pod Security `restricted`, except the Makefile's named exception (`^lakekeeper-` — the chart hardcodes the `opa` sidecar's `securityContext`). | A pod would be refused by a `restricted` namespace and is not an accepted exception: the printout names the pod and the violated field. The install's floor is `baseline` (next row), so this one is the stricter, aspirational check. |
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
registry's `dev`/`demo` digests and, against `operator/`,
`scripts/check-operator-pins.sh` for the golden values both install paths share; when either
reports a difference it files one issue (label `bug`, `P2`) with both outputs, and a run where
both pass again closes that issue with the commit it checked.
`scripts/pin-rollup.sh` pushes the `chore/pin-rollup` branch, whose PR is opened by hand while
GitHub forbids Actions from creating pull requests.

## Related

- [./backups](./backups)
- [./production](./production)
- [./troubleshooting](./troubleshooting)
