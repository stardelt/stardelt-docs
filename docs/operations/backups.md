---
title: "Backups and restore"
sidebar_label: "Backups and restore"
slug: /operations/backups
---

# Backups and restore

What is protected, what is not, how to verify it yourself, and how to restore.

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
bucket. That catches a re-apply without `spec.backup`, where every other signal stays green while
nothing is uploaded. Both install targets run its config-only half right after applying the Cluster
manifest.

### Is everything backed up?

`make verify-backups` checks one cluster's WAL. The coverage question is separate:

```bash
make verify-backups-all            # every volume, its mechanism and the age of its newest backup
MAX_AGE_HOURS=72 make verify-backups-all   # after a quiet week
```

The command lists every PVC in the namespace, maps it to the mechanism that protects it, and
reads the newest backup's age:

| Verdict | Meaning |
| --- | --- |
| `PASS` | the mechanism exists and its newest backup is younger than `MAX_AGE_HOURS` (default 36) |
| `FAIL` | no mechanism is mapped, a mapped mechanism is missing, or the backup is older than the limit |
| `ACCEPTED` | no mechanism by design; the reason is printed below the table |
| `UNVERIFIED` | the backup source could not be read (for example the listing pod failed), so the run proved nothing about that volume |

It exits `0` when nothing failed, `1` when a volume is `FAIL`, and `3` when any volume is
`UNVERIFIED` — a run that could not see the bucket must not report success. The last line is
the off-cluster copy: `NOT CONFIGURED` when Secret `backup-offsite` is absent, which is a
documented state and does not fail the run.

A new volume makes the command fail until it has a mechanism or an accepted exception. Run it after the
nightly window: a fresh install fails until each mechanism has completed one run.

**Not backed up today:** the SeaweedFS filer and master metadata, the JupyterHub session store and the
secret store.

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
  during an incident. Run it against a scratch namespace on a schedule you
  actually keep.

## Restore the data

The archive is a plain S3 copy, so a restore is a sync in the other direction — per prefix, or the
whole bucket by dropping the `/smoke`:

```bash
kubectl -n stardelt create job --from=cronjob/lakehouse-backup lakehouse-backup-now   # refresh first
# then, from any pod with the S3 credentials (or your own host with the same keys):
aws s3 sync s3://lakehouse-backup/smoke s3://lakehouse/smoke --endpoint-url "$AWS_ENDPOINT_URL"
```

Two properties matter in an incident:

- The job never deletes from the archive, so an object that was removed from the live bucket *after*
  a backup run is still there. Restoring a prefix can therefore bring back more than you expect —
  check what you are restoring before you sync it over live data.
- Catalog and data are restored separately, and the catalog must come first: recovering the files
  without the metadata leaves objects nobody can find.

## What still is not covered

- **Losing the cluster.** The archive is a second bucket in the *same* SeaweedFS instance. It
  survives a mistake, not a fire. For real off-site protection use SeaweedFS' own replication to a
  remote cluster, or run the sync from a host that holds off-site credentials.
- **A copy to a second endpoint needs another tool.** `aws s3 sync` takes one endpoint per run, which
  is why the default archive stays inside one store. `rclone` can copy between two endpoints: 1.68.2
  and 1.75.2 work against SeaweedFS, and 1.69.1 hangs on PUT.
- **Separate archives per tenant.** There is one archive bucket for the whole lakehouse.
