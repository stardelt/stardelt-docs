---
title: "Backups and restore"
sidebar_label: "Backups and restore"
slug: /operations/backups
---

# Backups and restore

A self-hosted platform is only yours if you can get it back. This page is the honest state of
backups in stardelt: what is protected, what is not, how to verify it yourself, and how to restore.

## What is protected

| Data | Protection | Where it lives |
|---|---|---|
| **Catalog metadata** (Lakekeeper's Postgres: warehouses, namespaces, table metadata, permissions) | continuous WAL archiving + a daily base backup, retention 14 days | the platform's object store, `s3://backups/lakekeeper-pg/` |
| **The data itself** (Iceberg/Parquet files in SeaweedFS or your S3) | a daily `aws s3 sync` into an archive bucket; deletions are not mirrored | `s3://lakehouse-backup/` |

The archive covers the accidents that actually happen — a dropped bucket, a bad lifecycle rule,
`aws s3 rm --recursive` — and not the loss of the whole cluster, because it lives in the same
SeaweedFS instance. See [the limits](#what-still-is-not-covered). Everything else in the platform is
reproducible from Git: an install is values and charts, not state.

## How it works

CloudNativePG runs `barman-cloud` inside the Postgres cluster. It streams every WAL segment into the
object store as it is written and takes a base backup on the schedule in
`manifests/cnpg-backup-schedule.yaml` (daily at 02:30, CloudNativePG cron with seconds first).
Together they give point-in-time recovery: restore to the last base backup and replay the WAL up to
the moment you choose.

The data archive is a CronJob (`manifests/object-store-backup.yaml`): `aws s3 sync` from the
lakehouse bucket into `s3://lakehouse-backup/` at 03:15, after the catalog's 02:30 base backup — so a
restore always finds a catalog that describes what is present. No `--delete`: the archive keeps
objects the live bucket no longer has.

Configuration lives in `manifests/cnpg-postgres.yaml` under `spec.backup`. By default both buckets and
the credentials come from the in-cluster SeaweedFS — a backup that needs an external service is a
backup that is not there after a fire.

## Verify it yourself

```bash
kubectl -n stardelt get backups              # phase completed, with a timestamp
kubectl -n stardelt get scheduledbackups     # the schedule and its last run
```

Then look inside the bucket — a `Backup` object saying `completed` is not evidence that bytes exist:

```bash
kubectl -n stardelt run s3ls --rm -it --restart=Never --image=amazon/aws-cli:2.17.0 \
  --env=AWS_ACCESS_KEY_ID --env=AWS_SECRET_ACCESS_KEY --env=AWS_DEFAULT_REGION \
  --command -- aws --endpoint-url http://seaweedfs-s3:8333 s3 ls --recursive s3://backups/
```

(Set those three environment variables from your S3 credentials; `kubectl run` does not read the
Secret for you.) You should see a `base/<timestamp>/data.tar.gz` and a growing `wals/` tree.

Those checks are also automated, from a checkout of
[stardelt-platform](https://github.com/stardelt/stardelt-platform):

```bash
make verify-backups                # spec.backup + a fresh WAL object + agreement with pg_stat_archiver
make verify-backups SKIP_OBJECTS=1 # config only, for a machine without S3 access
```

`make verify-backups` is the check `kubectl get backups` cannot be: it compares the *bucket* against
the *database*, so it fails when the newest object under `wals/` is older than 15 minutes
(`MAX_AGE_SECONDS`, default 900) or when `pg_stat_archiver.last_archived_wal` is not present in the
bucket. That is precisely the state a re-apply without `spec.backup` leaves behind — every
operator-visible signal green while nothing is uploaded
([stardelt-platform#59](https://github.com/stardelt/stardelt-platform/issues/59)). Both install
targets run its config-only half right after applying the Cluster manifest, so the drift fails the
install instead of surfacing at restore time.

## Restore

A restore is a **new cluster**, not an in-place operation — the source keeps serving while you
recover into a namespace of its own, check the result, and only then decide to cut over.
`manifests/cnpg-restore-proof.yaml` is the recipe, and it is also the platform's restore test:

1. copy the S3 credentials Secret into the target namespace;
2. apply a `Cluster` whose `spec.bootstrap.recovery.source` points at an `externalClusters` entry for
   the object store;
3. wait for `Cluster in healthy state`, then query the data.

Three details that silently matter:

- **`serverName`** must be the *source* cluster's name (`lakekeeper-pg`). It is the folder in the
  bucket, and it does not follow the restored cluster's name — get it wrong and recovery finds an
  empty path and looks like data loss.
- Recovery defaults to the **latest** WAL, which is what you want when you are recovering from
  hardware failure and *not* what you want after a bad migration — use
  `bootstrap.recovery.recoveryTarget.targetTime` to stop before it.
- The restored cluster is a different `Cluster` object; nothing re-points Lakekeeper at it
  automatically. Cutting over means updating `lakekeeper`'s database connection (or renaming the
  cluster), and it is a deliberate, visible step on purpose.

**This was tested, not just written down.** A restore into a scratch namespace came up with 44
tables, the same table names as the source, and identical row counts on `warehouse` and `namespace`.

## Production notes

- **Use your own bucket.** Point `spec.backup.barmanObjectStore.endpointURL` and `destinationPath` at
  S3/GCS/Azure Blob/Ceph, and give the backup credentials write-only access to that prefix — a
  compromised database pod should not be able to delete its own backup history.
- **Keep a copy off the cluster.** A bucket inside the cluster you are backing up survives a bad
  migration but not a lost node. Object-store replication to a second location is the cheapest way to
  satisfy that.
- **Encryption**: the WAL and base backups are compressed, not encrypted by barman itself. Rely on
  bucket-side encryption (SSE) at your provider, or `AGE` recipient keys via
  `spec.backup.barmanObjectStore.data.encryption` — pick one deliberately before you put real data
  in.
- **Retention is a policy, not a number.** `retentionPolicy: "14d"` in the manifest is a starting
  point: what matters is the longest outage or the slowest mistake you have to survive.
- **Test the restore.** The manifest in this repo exists so a restore is a command someone can run
  during an incident, not a design exercise. Run it against a scratch namespace on a schedule you
  actually keep.

## Restore the data

The archive is a plain S3 copy, so a restore is a sync in the other direction — per prefix, or the
whole bucket by dropping the `/smoke`:

```bash
kubectl -n stardelt create job --from=cronjob/lakehouse-backup lakehouse-backup-now   # refresh first
# then, from any pod with the S3 credentials (or your own host with the same keys):
aws s3 sync s3://lakehouse-backup/smoke s3://lakehouse/smoke --endpoint-url "$AWS_ENDPOINT_URL"
```

**This was tested, not just written:** an object was deleted from the live bucket and pulled back
from the archive, byte for byte. Two properties matter in an incident:

- The job never deletes from the archive, so an object that was removed from the live bucket *after*
  a backup run is still there. Restoring a prefix can therefore bring back more than you expect —
  check what you are restoring before you sync it over live data.
- Catalog and data are restored separately, and the catalog must come first: recovering the files
  without the metadata leaves objects nobody can find.

## What still is not covered

- **Losing the cluster.** The archive is a second bucket in the *same* SeaweedFS instance. It
  survives a mistake, not a fire. For real off-site protection use SeaweedFS' own replication to a
  remote cluster, or run the sync from a host that holds off-site credentials.
- **A two-endpoint copy needs a tool that can hold two S3 endpoints at once.** `aws s3 sync` — the
  tool the shipped job uses — takes one `--endpoint-url` and one credential set per invocation,
  which is why the default archive stays inside one store. `rclone` can do the two-endpoint copy and
  is not blocked by this endpoint: a hang reported here earlier was version-specific — re-tested
  2026-10-18 ([stardelt-docs#61](https://github.com/stardelt/stardelt-docs/issues/61)), **rclone
  1.68.2 and 1.75.2 both work** against it (small PUTs in 3–5 s, multipart included), while the
  hanging PUT was observed with **rclone 1.69.1**. The shipped sync job uses `aws s3 sync`, so the
  question is moot for the default path.
- **Per-tenant granularity.** One archive bucket for the whole lakehouse. Once several tenants share
  a cluster, their archives should be separated too.
