---
title: "SeaweedFS"
sidebar_label: "SeaweedFS"
slug: /services/seaweedfs
---

# SeaweedFS

**What it is.** SeaweedFS is an S3-compatible distributed object store (chart `seaweedfs/seaweedfs` 4.25.1, appVersion 4.25).

**Why stardelt uses it.** SeaweedFS provides the default object store for the lakehouse. Iceberg tables store Parquet data files in S3-compatible storage, and SeaweedFS serves that role in the platform.

**How it fits.** SeaweedFS runs in the data plane and is used by Trino (via S3) and Lakekeeper as the storage backend. It is the default object store; organizations can bring their own S3-compatible storage. See [Services](../architecture/services) and [How it works](../architecture/how-it-works).

**What you can tune.** Key settings from `stardelt-platform/helm-values/seaweedfs.yaml`:

| Setting | Values file | Key | Default | What it changes |
|---|---|---|---|---|
| Master replicas/resources | `helm-values/seaweedfs.yaml` | `master.replicas`, `master.resources` | `1`, `requests: {cpu: "50m", memory: "128Mi"}, limits: {cpu: "1", memory: "256Mi"}` | Master node configuration. |
| Volume PVC size/slots | `helm-values/seaweedfs.yaml` | `volume.dataDirs[0].size`, `volume.dataDirs[0].maxVolumes` | `20Gi`, `100` | Volume storage size and max volume slots. |
| Filer resources | `helm-values/seaweedfs.yaml` | `filer.resources` | `requests: {cpu: "50m", memory: "128Mi"}, limits: {cpu: "1", memory: "512Mi"}` | Filer resources. |
| S3 enabled/auth | `helm-values/seaweedfs.yaml` | `s3.enabled`, `s3.enableAuth` | `true`, `true` | Enables S3 API with authentication. |
| S3 port/buckets | `helm-values/seaweedfs.yaml` | `s3.port`, `s3.createBuckets` | `8333`, `[{"name": "lakehouse", "anonymousRead": false}, {"name": "backups", "anonymousRead": false}]` | S3 endpoint port and buckets created by the chart. |
| Admin UI | `helm-values/seaweedfs.yaml` | `admin.enabled` | `true` | Enables the cluster-internal SeaweedFS admin UI. |

**What it replaces.** SeaweedFS replaces HDFS as the default object store for this platform.

**Operating it.**

- **Health check:** Check SeaweedFS pods in the cluster (e.g. `kubectl -n stardelt get pods -l app.kubernetes.io/name=seaweedfs`).
- **Logs:** View logs by component (master/volume/filer/s3) with `kubectl -n stardelt logs -l app.kubernetes.io/name=seaweedfs`.
- **Install step:** `make step-storage` (see `stardelt-platform/Makefile`) installs SeaweedFS and creates buckets.
- **Buckets:** The notebooks bucket is created by `stardelt-platform/scripts/create-notebooks-bucket.sh` (versioned). The backup bucket is created by `stardelt-platform/scripts/create-backup-bucket.sh`.
- **Backup:** Object store data is archived by `manifests/object-store-backup.yaml` (daily `aws s3 sync` to `lakehouse-backup`). See [Backups](../operations/backups).
- **Admin UI:** Cluster-internal admin UI is available (see `helm-values/seaweedfs.yaml`); access via `make seaweedfs-admin`.
