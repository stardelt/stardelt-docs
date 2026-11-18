---
title: "Troubleshooting"
sidebar_label: "Troubleshooting"
slug: /operations/troubleshooting
description: "Read Nova's Platform page and the logs behind it to find why a service or the query engine is not working."
---

# Troubleshooting

## The Platform page

Nova's **Platform** page is one screen of live probes: every service with its status, the images
the cluster is running, and the query engine's own answer. Each number comes from the backend,
which asks the cluster; the page keeps no history and stores nothing, so it shows what is true now.

**Where it is.** Open Nova as an administrator and choose **Admin → Platform**. The path is
`/platform` on Nova's host — the base domain of the install, such as
`https://data.example.com/platform`; the old `/health` and `/apps` paths redirect here. The page is
administrator-only: a user who is not in the administrator group does not see the **Admin** group
in the navigation, and the backend refuses the requests behind the page with `403`.

**How fresh it is.** Every line is read live: the services every 10 seconds, the running images and
the Trino cluster every 15 seconds, and the warehouse name once when you open the page.

**The four numbers.** The header at the top right counts `N / M services up`: `M` is the number of
installed services and `N` how many of those answer. It is green only when all of them do. Under it
sit four tiles:

- **Engine state** — Trino's `state`, green at `ACTIVE`. `unreachable` means the backend could not
  ask Trino; anything else is Trino's own word for a coordinator that is starting, draining or
  stopped.
- **Engine version** — the `nodeVersion.version` Trino reports; compare it with the version you
  meant to run.
- **Services** — the same `N/M` as the header, with the hint `probing every 10s`.
- **Warehouse** — the warehouse name, with the hint `Iceberg REST`. A `—` here points at the
  catalog rather than at a service: check the catalog and its sign-in
  ([Checks to run](./checks)).

A dash in **Engine state** or **Engine version** means Trino has not answered yet: wait for the
next read and, if it stays, read Trino's logs ([Where the logs are](./monitoring#logs)).

**The three status words.** Each service row is one of:

- `up` — the service answered;
- `unreachable` — the probe failed or the service answered `5xx`: it is installed and running the
  wrong thing, or not reachable from Nova;
- `not installed` — the cluster holds no workload for this service at all. This is not a fault:
  the platform ships more services than an install turns on, so a row for a pillar that is off is
  expected, and it is not counted as down — neither in the header nor in the **Services** tile.

So `unreachable` is the one to chase, and a row that says `not installed` needs nothing from you.

**Running images.** The table answers what the cluster runs right now: one row per Deployment
(`deploy`) and StatefulSet (`sts`) in Nova's namespace, with the workload's name, its image and
`ready/desired` replicas — green when every desired replica is ready. The image column shows the
repository name and the first eight characters of the digest; hover it to read the full reference.
Because the table is read from the cluster and not from the repository, it is how you check a
rollout: compare its digest with the digest in the pin the repository carries (`helm-values/` for a
chart install, `manifests/` for an install from the manifests). Equal digests mean the pin is what
runs; different digests mean the pin was merged but never rolled out; a tag instead of a digest
means the image was not pinned where it runs.

## Where to look first

Before you guess: the audit trail, the query log, run logs and component logs are indexed in
[Where the logs are](./monitoring#logs).

Start with the blunt checks. They catch most problems:

```bash
kubectl -n stardelt get pods                    # anything not Running or Completed?
kubectl -n stardelt get events --sort-by=.lastTimestamp | tail -20
helm list -A                                    # any release stuck in pending-upgrade?
```

Nova's **Platform** page lists every workload and the image it runs
([the Platform page](#the-platform-page)).

## A pinned image will not pull

**Symptoms.** `ImagePullBackOff` / `ErrImagePull`; the pod event names the image and a registry status:
- `403 Forbidden` / `permission_denied: The token provided does not match expected scopes` — the pull credential cannot read the package (a private package with a token that lacks `read:packages`).
- `404` / `manifest unknown` on a digest — the package or that digest is gone.

**Check it.** Run `make verify-images`. ✓ is readable, ✗ is not readable with the registry's code,
and `UNVERIFIED` (exit 3) means the Secret cannot be read.

```text
✓ jupyter-singleuser   ghcr.io/stardelt/jupyter-singleuser@sha256:c3d45ec4…   readable
✓ stardelt-operator   ghcr.io/stardelt/stardelt-operator@sha256:e7548851…   readable
✗ superset   ghcr.io/stardelt/superset@sha256:b9ced85d81a0c9efd2ca993f27bba5470e4815aad9d246b93e3ca5e62d26e8cd   404: the digest is gone from the registry (garbage-collected?)
✓ airflow   ghcr.io/stardelt/airflow@sha256:2d9504d1…   readable
✓ nova   ghcr.io/stardelt/nova@sha256:8562b91b…   readable
✓ spark   ghcr.io/stardelt/spark@sha256:7f9c3cbc…   readable
FAIL (1 of 6 images is not readable)
```

**Fix it.**
1. If the package must be readable by the cluster: make it public (GitHub → the `stardelt` org → Packages → the package → Package settings → Change visibility), matching the other `ghcr.io/stardelt/*` packages; or give the pull Secret a token with `read:packages` (and rotate it wherever it is stored).
2. Re-run `make verify-images`; expect `PASS (N of N images readable)` and exit 0.
3. If the digest itself is gone (404), re-pin: take the `Pin it:` line from the image's build log (`gh run view <run> --log | grep 'Pin it'`) and update `tag:` in the matching `helm-values/*.yaml`; `./scripts/pin-image.sh <component>` moves the cluster and the line together on the dev cluster.
4. Restart the consumers: `kubectl -n stardelt rollout restart deploy/<name>` (or `make step-<component>`), then `kubectl -n stardelt get pods`.

**Do not** conclude the platform is healthy from a Running pod with a locally imported image; check `imageID` as above. Detect it with `kubectl -n stardelt get pod <pod> -o jsonpath='{.spec.containers[0].image}{" "}{.spec.containers[0].imagePullPolicy}{" "}{.status.containerStatuses[0].imageID}'` — an `imageID` that is not the pinned digest means that image was never pulled from the registry.

## PostgreSQL never becomes ready

**Symptoms.** The CloudNativePG pods never report ready (`Instance is still down`,
`could not establish connection`). ingress-nginx restarts in a loop with
`nginx: [alert] kill(22, 1) failed (13: Permission denied)`. The kernel log repeats:

```text
apparmor="DENIED" operation="signal" class="signal" profile="cri-containerd.apparmor.d" comm="postgres" signal=urg
```

**Cause.** PostgreSQL wakes its workers with a signal, and the node's AppArmor container profile
refuses it. It looks like a database fault but is a host problem, and no chart value can fix it.

| Node | Result |
|---|---|
| Ubuntu 26.04, kernel 7.0.0-38-generic, default container profile | works |
| Ubuntu 26.04, kernel 7.0.0-42-generic, default container profile | **broken** |
| Ubuntu 26.04, kernel 7.0.0-42-generic, `disable_apparmor = true` for containerd | works; containers run unconfined |

**Fix.** Try these in order:

1. **Boot the previous kernel** and hold the new one until a fixed kernel or profile ships. This
   keeps container confinement.
2. **Turn AppArmor off for containers.** From `platform/`, run
   `sudo scripts/enable-apparmor.sh --apply --restart`. This weakens confinement for every container
   on the node. The host's AppArmor service stays on.
3. **Set `securityContext.appArmorProfile: Unconfined`** on each pod that signals itself
   (PostgreSQL, ingress-nginx). It is easy to miss one, so this is not recommended.

## Trino refuses to start

**Symptom.** `Error invoking configuration method … setMaxQueryMemoryPerNode`.

**Cause.** `query.maxMemoryPerNode` does not fit inside the JVM heap. Lower or raise both together:
see [Sizing](../getting-started/your-cluster#sizing).

## Writes to a new bucket hang

**Symptom.** The client blocks, and the SeaweedFS master log says
`failed to find writable volumes … Not enough data nodes found`.

**Cause.** The volume server is out of volume slots. The chart sets `maxVolumes: 100`, while the
upstream default can be as low as 7. Raise the value and restart the volume server.

## A volume comes up without a claim

**Cause.** You overrode an element of a list with `--set`, for example
`seaweedfs.volume.dataDirs[0].storageClass=fast`. Helm replaces the whole element and drops its
`name`, `type` and `size`. Put the whole entry in a values file.

## A pod still runs the old image after an upgrade

**Cause.** A moving tag such as `:dev` can be served from layers the node already has. Pin the digest
with `make pin APP=nova`, or put a digest in your values.

## A stream is Running but the table stops growing

A `StreamApp` can be `Running` while its Spark job is not writing: the phase comes from the
`SparkApplication` status, and a job that crashes is resubmitted by the Spark operator while the
`StreamApp` stays `Running`. Three checks, in this order, tell you where it stopped.

**1. Is the job still running, or restarting?** Ask the `StreamApp` — the operator copies Spark's
own counters into its status:

```bash
kubectl -n <namespace> get streamapp <stream-name> \
  -o jsonpath='{.status.phase} attempts={.status.attempts} last={.status.lastSubmittedAt}{"\n"}'
```

Expected on the dev cluster:

```text
Running attempts=27 last=2026-11-08T05:11:35Z
```

`attempts` counts every submission since the application was created, so a recovered stream keeps a
number above 1 — but it must **stop growing**. Read it, wait five minutes, read it again: a number
that grew means Spark keeps resubmitting the driver. `last` is when it last submitted; a `last` that
moves while the table does not grow is the same signal. Both fields are absent (`attempts=`) on an
operator older than `3169db2`; then read the `SparkApplication` directly:

```bash
kubectl -n <namespace> get sparkapplication <stream-name> \
  -o jsonpath='{.status.applicationState.state} attempts={.status.executionAttempts} last={.status.lastSubmissionAttemptTime}{"\n"}'
```

Capture the log *before* the pod is deleted (the Spark operator deletes it on resubmission) and read
the exception at the end:

```bash
kubectl -n <namespace> logs -f <stream-name>-driver > /tmp/driver.log
```

The process ending is `SparkContext: Successfully stopped SparkContext (Uptime: …)`; the useful line
is the last `ERROR` above it. `OutOfMemoryError` in the driver means the merge has outgrown its
memory; an `org.apache.iceberg.exceptions.NotAuthorizedException` means the catalog session died
(see check 2). `PENDING_RERUN` or `FAILED` with no live driver is the same situation, one step on.

**2. Is the sink table committing?** Every commit in an Iceberg table is one snapshot. Read the
metadata table — it needs no storage credentials and is the source of truth for "is it writing":

```sql
SELECT committed_at, snapshot_id, summary['added-records'] AS added_records
FROM "mobility"."bronze"."pegelonline_continuous$snapshots"
ORDER BY committed_at DESC
LIMIT 3;
```

Replace catalog, schema and table with the `StreamApp`'s `spec.sink.catalog` and `spec.sink.table`.
Expected on the dev cluster, run in the SQL editor as a member of the catalog's owner group:

```text
committed_at                      snapshot_id            added_records
2026-11-08 04:15:03.865 UTC       8749505033172463698    3
2026-11-08 04:14:55.641 UTC       7518155263491559790    6
2026-11-08 04:14:48.075 UTC       8116118513819513870    6
```

A new `committed_at` within the stream's trigger interval means writes are landing. The table name
is three parts and the `$snapshots` suffix sits **inside** the quoted last part; a two-part name
fails with `Catalog must be specified when session catalog is not set`.

If `attempts` (check 1) grows and the newest `committed_at` is older than the trigger interval, the
stream writes for a while and then loses its catalog session: search the driver log for
`NotAuthorizedException` and the timestamp of the first one.

**3. Is the operator reporting it?** The `Ready` condition carries the operator's one-word reason:

```bash
kubectl -n <namespace> get streamapp <stream-name> \
  -o jsonpath='{.status.phase} / {.status.conditions[0].type}={.status.conditions[0].reason} lastError={.status.lastError} attempts={.status.attempts} last={.status.lastSubmittedAt}{"\n"}'
kubectl -n <namespace> logs deploy/stardelt-operator --tail=5 | grep stream=
```

Expected on a healthy stream:

```text
Running / Ready=Running lastError= attempts=27 last=2026-11-08T05:11:35Z
```

`Ready=Restarting` means Spark resubmitted the application inside the last ten minutes; if the table
is growing, the stream recovered and the reason clears on its own. `phase=Failed` with a
`lastError` is the Spark error message, and is the case to act on.

`Ready=ExecutorsUnschedulable` means the driver is running but Spark cannot place an executor:
the application is healthy and processes nothing. The executor pod's `PodScheduled` message
carries the scheduler's sentence (`0/1 nodes are available: 1 Insufficient cpu. …`), and
`lastError` repeats it when the operator reports it. Confirm the pod is the one waiting:

```bash
kubectl -n <namespace> get pods \
  -l sparkoperator.k8s.io/app-name=<stream-name>,spark-role=executor
```

A `Pending` executor with a `PodScheduled=False` condition is the cause. Free CPU on the node
(stop another stream) and the pod schedules; the checkpoint makes the stream continue.

This page does not cover the Kafka side (`kubectl -n <namespace> exec kafka-kafka-0 -- bin/kafka-get-offsets.sh --bootstrap-server localhost:9092 --topic <topic> --time -1` shows the topic's end offset) or a stalled node, which looks like every check failing at once — see [a pinned image will not pull](#a-pinned-image-will-not-pull) and [checks to run](./checks).

## A new CRD field is ignored

**Cause.** The operator that serves the field is not the build you think, or its rollout has
not finished: the CRD schema is applied by the operator at start. Check
`kubectl -n <namespace> get deploy stardelt-operator -o jsonpath='{.spec.template.spec.containers[0].image}'`
and `kubectl -n <namespace> rollout status deploy/stardelt-operator`.

**Fix.** Roll the operator image that carries the schema (`helm upgrade` with the pinned
digest, or `./scripts/pin-image.sh stardelt-operator` from `platform/`). If your
operator predates the self-applying behaviour, apply the schemas once:
`kubectl apply --server-side -f chart/crds/` in `operator/`.

## Sign-in fails after hours in a notebook

**Cause.** The token your notebook server received has expired. Restart your server from the hub.

## Asking for help

Open an [issue](https://github.com/stardelt/stardelt/issues) with what you ran, what you
expected, and the output of `kubectl -n stardelt get pods` and `kubectl -n stardelt get events`.
Remove domains and secrets first. To report a security problem privately, use
[the security policy](https://github.com/stardelt/.github/blob/main/SECURITY.md).
