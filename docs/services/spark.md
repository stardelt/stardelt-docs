---
title: "Spark Connect"
sidebar_label: "Spark Connect"
slug: /services/spark
---

# Spark Connect

**What it is.** Spark Connect is the platform's second query engine for heavy compute over the same Iceberg tables Trino reads: one long-running driver Deployment in namespace `stardelt`, Kubernetes as the cluster manager, executors created per query and released when it finishes.

**How it fits.** The endpoint is `sc://spark-connect.<namespace>.svc.cluster.local:15002`, **in-cluster only**: there is no Ingress, because Spark Connect has no built-in client authentication and the platform does not publish an unauthenticated endpoint. Notebooks reach it from inside the cluster; the catalog a session uses is configured per person with that person's token.

**What happens when it is down.** Notebooks that use Spark fail to open a session and say so; Trino and the catalog are unaffected, because the endpoint is not in their path.

**What you can tune.**

| Setting | Where | Key / field | Default | What it changes |
|---|---|---|---|---|
| Driver resources | `manifests/spark.yaml` | `resources.requests` / `resources.limits` (container `spark-connect`) | `250m` / `1Gi` request, `1` / `3Gi` limit | CPU and memory envelope for the long-running driver pod. |
| Driver memory | `manifests/spark.yaml` (ConfigMap `spark-connect-config`) | `spark.driver.memory` | `1g` | Driver JVM heap. |
| Driver max result size | `manifests/spark.yaml` (ConfigMap `spark-connect-config`) | `spark.driver.maxResultSize` | `512m` | Largest result a `collect()`/`toPandas()` may return before failing instead of filling the driver heap. |
| Executor defaults (dynamic allocation) | `manifests/spark.yaml` (ConfigMap `spark-connect-config`) | `spark.executor.memory`, `spark.executor.memoryOverhead`, `spark.executor.cores`, `spark.dynamicAllocation.*` | `1g` heap, `384m` overhead, `1` core; dynamic allocation on, `min/initial/max` `0/0/2`, idle timeout `60s`, shuffle tracking timeout `180s` | Executor size and how many executor pods run per query; executors scale to zero when idle. |
| Shuffle partitions | `manifests/spark.yaml` (ConfigMap `spark-connect-config`) | `spark.sql.shuffle.partitions` | `8` | Partitions used for shuffles on a small cluster. |
| Iceberg catalog block | `manifests/spark.yaml` (ConfigMap `spark-connect-config`) | `spark.sql.extensions` (static); catalogs and token are session configuration | Iceberg Spark session extensions enabled; no static catalog | Only the Iceberg extensions are static; the per-person catalog and token are configured when the client creates the session. |
| Platform S3 client (Iceberg S3FileIO) | `manifests/spark.yaml` (ConfigMap `spark-connect-config`, Deployment env/Secret refs) | `spark.kubernetes.executor.secretKeyRef.AWS_*` | `stardelt-s3-creds:access-key` / `secret-key` (executor Secret refs) | Credentials for reading the platform's own storage through Iceberg's S3FileIO; passed to executors by Secret reference. |
| Public S3 client (Hadoop S3A) | `manifests/spark.yaml` (ConfigMap `spark-connect-config`) | `spark.hadoop.fs.s3a.aws.credentials.provider` and related `fs.s3a.*` / `fs.s3.*` keys | Anonymous provider, SSL on, path-style off; no fixed endpoint | Reads public buckets only with anonymous S3A (also for `s3://`); the platform key is never used to sign S3A requests. Public datasets only, not the lakehouse. |

**Operating it.**

- **Install:** Opt-in, not part of `make install`. Run `make install-spark`; it applies `manifests/spark.yaml` and restarts `deploy/spark-connect` when `ConfigMap spark-connect-config` (`spark-defaults.conf`) changes. The endpoint is `sc://spark-connect.<namespace>.svc.cluster.local:15002` (in-cluster only).
- **Health check:** The driver Deployment and its pods report health; the container exposes TCP readiness and liveness probes on port `15002`.
- **Backup:** No backup of its own; its state is the Iceberg catalog.
- **Logs:** Driver logs come from the `spark-connect` pod; executor logs come from the executor pods created per query in the same namespace.
