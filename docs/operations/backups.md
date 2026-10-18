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
| **The data itself** (Iceberg/Parquet files in SeaweedFS or your S3) | **not backed up yet** | — |

The second row is the important caveat and it is deliberate: see [the gap](#the-gap-that-remains).
Everything else in the platform is reproducible from Git — the install is values and charts, not
state.

## How it works

CloudNativePG runs `barman-cloud` inside the Postgres cluster. It streams every WAL segment into the
object store as it is written and takes a base backup on the schedule in
`manifests/cnpg-backup-schedule.yaml` (daily at 02:30, CloudNativePG cron with seconds first).
Together they give point-in-time recovery: restore to the last base backup and replay the WAL up to
the moment you choose.

Configuration lives in `manifests/cnpg-postgres.yaml` under `spec.backup`. By default both the
backup bucket and the credentials come from the in-cluster SeaweedFS — a backup that needs an
external service is a backup that is not there after a fire.

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

## The gap that remains

**The Iceberg data files are not backed up.** The catalog can be fully restored and still point at
Parquet files that no longer exist — the metadata is the map, not the territory. Closing this needs
one of:

- S3 replication from SeaweedFS to a second bucket or a remote cluster (SeaweedFS supports
  replication and `weed backup`; the chart does not wire it yet), or
- an object-store-level snapshot/mirror at whatever you use for production storage.

Until then, treat the object store as the component that needs your own backup policy, and do not
read this page as saying the platform is fully protected.
