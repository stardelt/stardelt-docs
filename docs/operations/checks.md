---
title: "Checks to run"
sidebar_label: "Checks to run"
slug: /operations/checks
description: "The checks to run after an upgrade and nightly, what each proves and what a failure means."
---

# Checks to run

These are read-only checks; each prints a verdict and exits non-zero when it proves something is wrong. Run them after an upgrade and nightly. Some create objects and delete them again: `verify-restore` restores into namespace `stardelt-restore`, `verify-pgdump` into a scratch database, `verify-external-secrets` namespace `eso-verify` and `ClusterSecretStore eso-verify-fake`, `verify-trino-graceful-shutdown` one worker pod, `verify-spark-cluster` a `SparkCluster` it owns, `verify-s3-sts` one `amazon/aws-cli` pod and two per-run prefixes in the fixed `lakehouse` bucket (`S3_STS_BUCKET` names another), each Spark session check one client pod, and `verify-release` namespace `stardelt-pss-probe`. The nightly `make demo-reset` clears `playground.scratch`.

## After an upgrade

`make step-verify` (the target the upgrade path runs) runs the checks below:

| Command | What it proves | A failure means |
| --- | --- | --- |
| `make verify-trino-auth` | Trino accepts authenticated sign-in. | Authentication to Trino is broken. |
| `make verify-catalog-permissions` | The live Catalog grants against the OPA bridge. | The live Catalog grants do not match expectations. |
| `make verify-backups-all` | Every volume has a backup mechanism and a recent backup, or an accepted ticketed exception. | A volume is missing a backup mechanism or has a backup older than the limit. |
| `make verify-streaming` | The Kafka broker is Ready, the Spark Operator watches the namespace, and every StreamApp that should run is `Running`. A `Pending` stream is a warning (`!`); `Stopped` is a pass. | A StreamApp cannot run on this install, is `Failed`, or its status is behind its spec (see [the streaming guide](../guides/streams)). |
| `make verify-crds` | Every live stardelt CRD schema is `origin/main`'s in `operator/` (`chart/crds`). | A merge added a field or kind but the operator that serves it is older than `origin/main`: it applies its CRDs at start, so roll the current build (`make install-operator` or `./scripts/pin-image.sh stardelt-operator`). |
| `make verify-pins` | Every live Deployment, StatefulSet and DaemonSet runs the digest its file pins, including Secret `hub`'s spawn image and `PIPELINE_NOTEBOOK_IMAGE`. | A merge was pinned but never rolled out, or a hand-pinned image was changed in one place only; the failing row names the fix: `./scripts/pin-image.sh <app>`, `make openbao`, `make install-notebooks`, `make step-airflow`, `make step-superset`, `make external-secrets`, `make install-spark-operator`, `make install-kafka`, or `kubectl apply -f <manifest>`. |
| `make verify-spark-config` | ConfigMap `spark-connect-config` carries the same Spark digest `manifests/spark.yaml` pins for the `spark-connect` Deployment. | The driver and its executors would run different bytes: run `make install-spark` and the check again. `UNVERIFIED` (exit 3) means the namespace or the ConfigMap does not exist — not installed, not a drift. |
| `make verify-restarts` | Every restart-prone Deployment's pods are Ready, and each restart count and newest exit is printed; `RESTART_MAX_AGE_SECONDS` (default 3600) bounds what fails. | A pod is not Ready, or a container crashed on its own inside that window: `kubectl -n stardelt get pods` and `kubectl -n stardelt logs <pod> --previous` say why. An `Error` row marked `node-caused` is the node stall; a `spark-connect` restart drops every live session. |
| `make check-spark-runtimes-live` | The live catalogue, ConfigMap `stardelt-spark-runtimes`, is the repository's `chart/files/spark-runtimes.json`, after the same file is checked against `manifests/spark.yaml` and `images/spark/Dockerfile`. | A Spark started through the operator would differ from one started by `make install`, or the ConfigMap was never applied: run `make install-spark`. `UNVERIFIED` (exit 3) means there is no ConfigMap — not installed, not a drift. |
| `make verify-operator-values` | The operator carries the golden values the pins were merged with: forty-five values and image probes plus eight identity-overlay ones (Trino's TLS and `PASSWORD,OAUTH2`, Superset's impersonated Trino host, the OIDC client Secret). | The operator image predates a values merge, or the Deployment was not rolled: run `./scripts/pin-image.sh stardelt-operator`; the failing row names the value. |
| `make verify-connections` | The Pipeline CRD carries `spec.tasks[].connection`, the Airflow pipeline reader may read `Connection` resources, and the DAG processor resolves a connection into `CONN_<NAME>_<KEY>` variables. | A merge moved one of the three links without a rollout: `./scripts/pin-image.sh stardelt-operator` for `crd`, `make step-airflow` for `role` and `loader`. |
| `make verify-maintenance` | Every `Catalog` with a `pipeline-<ownerGroup>` principal has the `maint-<catalog>` CronJob the operator intends: staggered schedule, principal token Secret, `MaintenanceReady=True`; every Ready `Catalog` also has a `<name>.properties` key in ConfigMap `trino-catalog`. | A catalog with a principal has no maintenance job, a drifted reference (a stale operator: `make install-operator`), or a failed newest run. Or a Ready Catalog has no Trino catalog: run `make catalogs`. |

A few checks are deliberately not part of `step-verify`. `make verify-airflow-actions` writes: it signs in
as Nova's Airflow service user, pauses and resumes one DAG, and restores the state it found
(`DAG`, `NS` and `PORT` select the target); a namespace without the `Pipelines` pillar prints
`UNVERIFIED`, not a failure. `make verify-access-sync-script` proves the live ConfigMap
`access-sync-script` (key `job.py`) is the repository's job byte for byte; run `make access-sync` or
`make install-operator` when it is older.

Seven more run by hand, each needing something a converged cluster does not promise:
`make verify-spark-query` runs two jobs through the shared Spark Connect server; `make verify-spark-auth`
proves the front at `spark.<baseDomain>` (a signed query returns 10 rows, an unsigned call is refused
with `Jwt is missing`, and so is a token without the `spark-connect` audience);
`make verify-spark-janitor` runs the ConfigMap janitor's dry run with `JANITOR_MAX_AGE_SECONDS=1`;
`make verify-spark-group-read` proves a session against the permanent demo `SparkCluster` reads
`gold.shop.daily_revenue`.

The public demo's sandbox has three checks. `make verify-spark-demo-sandbox` reads what it contains: the
namespace enforces `restricted`, its ServiceAccount cannot create pods, the driver carries no
ServiceAccount token, `example.com:443` is unreachable while `seaweedfs-s3:8333` answers, and it runs the
digest `manifests/spark.yaml` pins. `make verify-spark-demo-query` runs `range(10)` through
`spark-demo.stardelt-demo-spark.svc.cluster.local:15002` and must count 10.
`make verify-spark-demo-security` runs four probes that must all refuse. `make verify-demo-visitor`
signs in as the public `demo` person and checks every page a visitor should see.

`verify-streaming` also compares each `StreamApp`'s script with its ConfigMap; an older one is a warning
(`!`).

Nova's **Platform** page shows the same state live, including the images the cluster runs
([the Platform page](./troubleshooting#the-platform-page)).

## Before a release

Run these before a tag, and take the 0.0.4 exit list as the answer the tag starts from:

| Command | What it proves | A failure means |
| --- | --- | --- |
| `make verify-release` | The checks a release depends on, one line each: it runs each even after a failure and writes a log per check under `verify-release.<stamp>/` in `$TMPDIR`; one that cannot see its subject prints `? unverified`, not `✗`. | A release check proved something false: the failing line names the check and its log. A `?` row is not a failure but not proof either — the log says what the check could not reach. |
| `make exit-status` | The 0.0.4 exit list, one row per line, as `✓`, `✗`, `?` or `·`. The `·` rows are the maintainer's manual lines, such as the fresh-node run. Exit 0 means every line holds and nothing was unverified, 1 means at least one `✗`, and 3 means a probe could not reach its subject. | A red line is a release blocker; `?` means the probe could not see its subject (no `gh`, or `gh` not signed in) and nothing was checked. |
| `make verify-catalog-workload-auth` | The catalog accepts a workload's ServiceAccount token (audience `stardelt-catalog-workload`) and refuses the OIDC and API-server audiences; `404 UserNotFound` before any grant is expected. | The workload login is off, the audience split is broken, or the token-review binding is missing: a workload cannot sign in, or one that must be refused is admitted. |
| `make verify-workload-identity` | Every `ServicePrincipal` has ServiceAccount `sp-<name>` that automounts no token, `status.workloadIdentity` is its uid (`kubernetes~<uid>`), and the catalog accepts a token minted with audience `stardelt-catalog-workload`; read-only, `whoami` only. | A workload's catalog identity and ServiceAccount disagree, or the ServiceAccount automounts a token; the row names the principal. Re-run `make install-operator`; never re-grant by hand. `UNVERIFIED` (exit 3) means no `ServicePrincipal` or no port-forward, not a failure. |
| `make verify-secret-annotations` | No Secret carries a credential in `kubectl.kubernetes.io/last-applied-configuration`; a hit prints the `kubectl annotate … -` that heals it. | A credential sits in an annotation every reader of the Secret can see: run the printed `kubectl annotate` command and apply the Secret with `create` or `--server-side`. |
| `make verify-wap` | Write-audit-publish in three runs of a temporary pipeline: `publish: direct` creates the table, a passing `publish: wap` check moves `main` and leaves no audit branch, a failing one keeps an `audit_<16 hex>` branch. | A row did not hold: `FAIL publish` means the audit branch was not where the run wrote, or `main` did not move; `FAIL refusal` means a failing check let rows through or left an audit branch behind. |

## Nightly

| Command | What it proves | A failure means |
| --- | --- | --- |
| `make verify-backups-all` | Every volume has a backup mechanism and a recent backup, or an accepted ticketed exception. | A volume is missing a backup mechanism or has a backup older than the limit. |
| `make verify-images` | Every pinned `ghcr.io/stardelt/*` image is readable with the cluster's pull credential. | Some pinned image is not readable with the cluster's pull credential. |
| `make verify-realm-admin` | The realm-admin Secret still signs in. | The realm-admin Secret can no longer sign in. |
| `make verify-oidc-clients` | Every confidential client's secret still authenticates. | One or more confidential client secrets no longer authenticate. |
| `make verify-pgdump PG_DUMP=all` | The pg_dump CronJobs produce restorable dumps. | A dump cannot be produced or restored successfully. |
| `make verify-restore` | The catalog database restores from the barman-cloud backup into a scratch namespace, has relations, warehouses and tabulars, then the namespace is deleted. | A backup that does not restore: a different PostgreSQL major version, a missing object, or a credential that cannot read the backup prefix; see [Backups and restore](./backups#restore). |
| `make check-pins` | The registry's `dev`/`demo` digests against every checked-in pin, and the operator's golden values against this repository's pins: nine named images, the thirteen shared values files, and the golden image's `NOVA_IMAGE`. | A merge published an image that is not pinned, or a pin was changed in one place only; the failing row names the file. Run `./scripts/pin-image.sh <app>` and open a pin PR. |
| `make verify-cronjobs` | Every CronJob's newest Job succeeded, is running, is waiting or the CronJob is suspended. | A scheduled job's newest run failed: the row names the Job and prints `kubectl -n stardelt logs job/<job> --tail=20`. `UNVERIFIED` (exit 3) means the namespace does not exist or `kubectl` cannot list Jobs — not a failure, but not proof either. |
| `make verify-cron-schedule` | Every CronJob's newest Job is younger than its schedule plus a grace window, so one that stopped after a last success is named. | The row names the CronJob and its newest Job's age: read `kubectl -n stardelt get jobs` and `kubectl -n stardelt get cronjob <name> -o yaml` for a suspended one. `UNVERIFIED` (exit 3) means `kubectl` could not list the Jobs — not a failure. |
| `make verify-airflow-runs` | Every unpaused DAG's newest run is `success`; each row prints the state, `run_after` and the age. A paused DAG or one with no run prints `·`. | The row names the DAG and its newest run's state and age: open the Airflow UI or read `kubectl -n stardelt logs <task pod>`. `UNVERIFIED` (exit 3) means it could not see its subject — no Secret `airflow-nova-api` without pipelines, not a failure. |
| `make verify-operator-quiet` | Over 60 s with no change: no status write, fewer than two reconciles per object, under 50 m CPU and 50 KB/s of traffic. | A `controller` label in `stardelt_operator_status_writes_total` names the controller writing when nothing changed; a rising `reconciles_total` means a requeue is too short. `UNVERIFIED` (exit 3) is a rollout in progress: re-run it. |
| `make verify-trusted-engine` | Trino is Lakekeeper's trusted engine, and only Trino: a `SECURITY DEFINER` view is created as the public `demo` person and read back, and Nova's token cannot set `trino.run-as-owner`. | Trino is not the trusted engine (a view-creating dbt run fails with `ProtectedPropertyModification`), or a second client is trusted — check the `svc-catalog-trino` audience `lakekeeper-trino`. |
| `make verify-trino-system-catalog` | What a signed-in person reads in Trino's `system` catalog: `system.metadata.*` works, `system.runtime.*` and `CALL` are denied, and unreadable catalogs are filtered out. | A grant moved the wrong way: `system.metadata` is denied (dbt fails before a model runs), or `system.runtime` answers (a policy plane regression). |

`make check-pins` is three checks: `scripts/check_pin_freshness.py`,
`scripts/check_operator-pins.sh` and `scripts/check_golden_image.py`; the last two read `../operator`, or
`$OPERATOR_DIR`.

The `dev` and `demo` tags move on **every** push, including commits that ship nothing, so a `✗` from the
freshness half means a newer build exists: pin `<app>` only when a commit touches a shipped path.

## When you change one thing

| Situation | Command | What it proves |
| --- | --- | --- |
| After a TLS or sign-in change | `make verify-trino-tls` | The in-cluster Trino path is TLS-only and token-authenticated. |
| After an operator install or upgrade | `make verify-fresh-node` | `PlatformInstance` and `Lakehouse` Ready, the Pod Security floor, every Deployment available, Nova, Trino and the IdP answering (on `make install`, `? instance …` and exit `3`). |
| After a fresh node, before a tag | `make verify-fresh-node-product` | The readiness checks plus Airflow, Superset, Lakekeeper and Nova's sign-in answering. |
| After a Trino worker or shutdown change | `make verify-trino-graceful-shutdown` | A deleted worker logs `Shutdown requested` and a replacement becomes Ready; it deletes one worker pod. |
| After a `SqlWarehouse` or scale change | `make verify-warehouse-scale` | Nova's `stardelt.io/queries-in-flight` and `stardelt.io/last-query-at` annotations, `status.scale` and the worker replicas must agree. |
| After a `Catalog`/role change | `make verify-catalog-permissions` | Live Catalog grants against the OPA bridge. |
| After a `Cluster` change | `make verify-backups`, `make verify-backups-nova`, `make verify-backups-identity`, or `make verify-backups-openfga` | WAL archiving per database, with a real object in the bucket. |
| After a PostgreSQL image change | `make roll-cnpg-image` | Every primary runs the digest its `spec.imageName` pins and the Cluster is `Ready`. |
| After an External Secrets or `spec.secrets` change | `make verify-external-secrets` | ESO is installed, a Fake-provider `ClusterSecretStore` is Ready and one `ExternalSecret` syncs; run `make external-secrets` when ESO is absent. |
| After an Airflow RBAC or service-user change | `make verify-airflow-actions` | Nova's Airflow service user can sign in, read and pause a DAG. |
| After a Compute change | `make verify-compute`, `make verify-spark-cluster` | `verify-compute` reads the existing state (every `SparkCluster` `Running` with its `spc-<name>-ingress` policy); `verify-spark-cluster` creates one and deletes it. A failure means `make install-operator` or `make install-spark` is due. |
| After a Spark image, version or catalogue change | `make check-spark-runtimes-live` | The live ConfigMap is the repository's catalogue; the fix is `make install-spark`, never hand-editing the ConfigMap. |
| After a resize, a node change or a Trino upgrade | `make perf-baseline` | The engine baseline on this node: p50/p95/max per query and concurrency level, written to `perf/results/`. |

`make verify-fresh-node` needs an operator-installed cluster; its `upgrade` and `delete` phases run as
`scripts/verify-fresh-node.sh upgrade`.

## Security and exposure

None of these is part of `make step-verify`; they are manual. `verify-seaweedfs-ports`, `verify-metrics`
and `verify-s3-sts` create and delete their probe pods, the pod-security pair creates namespace
`stardelt-pss-probe`; the rest read only.

| Command | What it proves | A failure means |
| --- | --- | --- |
| `make verify-pod-security` | Every Running pod's spec is re-admitted with a server-side dry run into a scratch namespace that enforces `restricted`, except the Makefile's named exception (`^lakekeeper-`). | A pod would be refused by a `restricted` namespace and is not an accepted exception: the printout names the pod and field, and the install's own namespace enforces `restricted`, so a restart would refuse it. |
| `make verify-pod-security-baseline` | The same pods against `baseline`: which would also pass the weaker level. | A pod is refused at `baseline`, so the namespace's own admission would refuse it after a restart: name the pod in the issue and fix its `securityContext`, do not lower the level. |
| `make verify-seaweedfs-ports` | Only SeaweedFS's own pods reach the filer (8888), master (9333) and volume (8080) ports; the S3 gateway (8333) keeps working. | A foreign pod can open one of the unsigned ports — the NetworkPolicy was removed or a new label matches it. Re-apply `manifests/seaweedfs-network-policy.yaml` (or `make step-storage`). |
| `make verify-s3-sts` | The S3 gateway serves STS from its configuration document: the platform identity creates a bucket and object, an `AssumeRole` session scoped to `warehouse/ns/t` and `warehouse/ns/t/*` writes inside that prefix, and the same write under `warehouse/ns/t2` is refused. | The gateway did not load the IAM half: Secret `seaweedfs-s3-config` has no `sts` key, or the Deployment lacks `-iam.config=/etc/sw/seaweedfs_s3_config`; re-run `make step-storage` and read `kubectl -n <namespace> logs deploy/seaweedfs-s3 \| grep -i 'IAM configuration'`. |
| `make verify-spark-guard` | The admission policy on a Spark Connect driver: it may create executor pods only, with the executor ServiceAccount and the chart's labels. | A driver can create a pod the policy was meant to stop, or the policy or its binding is gone: run `make install-spark`. |
| `make verify-spark-no-platform-key` | The platform storage key (`stardelt-s3-creds`) is absent from four carriers: the driver environment, the executor configuration, the UDF a session runs, and `spark-connect-executor-pods`. | The shared server can read every bucket again: a manifest or an operator render brought the Secret back. Read the carrier the row names; `make install-spark` re-applies the manifests and `make install-operator` the operator's copy. |
| `make verify-metrics` | Every metrics endpoint a scraper can reach answers Prometheus text; the NetworkPolicy admits a pod labelled `app.kubernetes.io/name: prometheus` and nothing else. | A scrape target is unreachable from the scraper's namespace or answers non-Prometheus text: the row names the endpoint; see [Monitoring](./monitoring). |

## How to read a failure

A `✗`/`FAIL` line names the object and the reason:

```text
✓ stardelt-operator   ghcr.io/stardelt/stardelt-operator@sha256:e7548851…   readable
✗ superset   ghcr.io/stardelt/superset@sha256:b9ced85d…   404: the digest is gone from the registry
FAIL (1 of 6 images is not readable)
```

A `!` line is a warning and the command still exits 0: a `Pending` stream, a stream that restarted
inside the operator's ten-minute window, a Strimzi controller restarted inside it, or a
`SparkApplication` list the check cannot read. `RESTART_WINDOW_SECS` overrides the window for a test.

`UNVERIFIED` plus exit 3 means the check could not see its subject (bucket, Secret, kube context) and proved nothing — fix the access, do not treat it as a pass.

Exit 1 means the check ran and found a real problem — see [./troubleshooting](./troubleshooting) or `../architecture/services`.

## What runs by itself

`make install` runs `verify-backup-config` while it creates the catalog's Postgres cluster;
`make upgrade` runs it too and then, at the end, the `step-verify` checks above.
Everything else is manual. `verify-images` needs the cluster's pull credential, so it is never a
CI job. The daily `Pin freshness` workflow runs `scripts/check_pin_freshness.py` and
`scripts/check-operator-pins.sh`; when either reports a difference it files one issue (label `bug`,
`P2`) with both outputs, and a run where both pass again closes that issue.
`scripts/pin-rollup.sh` pushes the `chore/pin-rollup` branch, whose PR is opened by hand while
GitHub forbids Actions from creating pull requests.

## Related

- [./backups](./backups)
- [./production](./production)
- [./troubleshooting](./troubleshooting)
