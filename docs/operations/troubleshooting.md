---
title: "Troubleshooting"
sidebar_label: "Troubleshooting"
slug: /operations/troubleshooting
---

# Troubleshooting

Start with the blunt checks. They catch most problems:

```bash
kubectl -n stardelt get pods                    # anything not Running or Completed?
kubectl -n stardelt get events --sort-by=.lastTimestamp | tail -20
helm list -A                                    # any release stuck in pending-upgrade?
```

Nova's **Health** page lists every workload and the image it runs.

## A pinned image will not pull

**Symptoms.** `ImagePullBackOff` / `ErrImagePull`; the pod event names the image and a registry status:
- `403 Forbidden` / `permission_denied: The token provided does not match expected scopes` — the pull credential cannot read the package (a private package with a token that lacks `read:packages`).
- `404` / `manifest unknown` on a digest — the package or that digest is gone.

**Check it.** `make verify-images`, with the real output block above (keep it verbatim, indenting it as a code block); one sentence on what each verdict means (✓ readable, ✗ not readable with the registry's code, `UNVERIFIED` exit 3 when the Secret cannot be read).

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
2. **Turn AppArmor off for containers.** In a checkout of `stardelt-platform`, run
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

This page does not cover the Kafka side (`kubectl -n <namespace> exec kafka-kafka-0 -- bin/kafka-get-offsets.sh --bootstrap-server localhost:9092 --topic <topic> --time -1` shows the topic's end offset) or a stalled node, which looks like every check failing at once — see `## A pinned image will not pull` and `docs/operations/checks.md`.

## A new CRD field is ignored

**Cause.** Helm installs CRDs on `install`, never on `upgrade`. In a checkout of `stardelt-operator`,
run `kubectl apply --server-side -f chart/crds/`.

## Sign-in fails after hours in a notebook

**Cause.** The token your notebook server received has expired. Restart your server from the hub.

## Asking for help

Open an [issue](https://github.com/stardelt/stardelt-platform/issues) with what you ran, what you
expected, and the output of `kubectl -n stardelt get pods` and `kubectl -n stardelt get events`.
Remove domains and secrets first. To report a security problem privately, use
[the security policy](https://github.com/stardelt/.github/blob/main/SECURITY.md).
