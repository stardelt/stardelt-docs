---
title: "How a notebook reaches Spark"
sidebar_label: "How a notebook reaches Spark"
slug: /architecture/spark-connection
description: The path from the spark object in a notebook kernel to the Spark Connect driver, the Iceberg catalog and object storage, and who checks what along the way.
---

# How a notebook reaches Spark

Every notebook kernel on the platform has `spark` in it, and nothing in the notebook says where
it goes. This page follows that one object: which calls it makes, in which order, with whose
identity, and what each service on the way is allowed to decide. It is for a person who wants to
know what they are using, an administrator who has to explain it, and a reviewer who has to
accept it.

![How a notebook reaches Spark: the kernel asks Trino which catalogs the person may see, takes that person's token, and creates a new Spark Connect session at sc://spark-connect.stardelt.svc.cluster.local:15002. The session configures one Iceberg REST catalog per name pointing at Lakekeeper with the person's token. The driver checks the token and the grants with Lakekeeper and creates executors per query, which drop to zero when idle and reach object storage with the credential the catalog vends for the table. A NetworkPolicy admits members' notebook pods only on port 15002, and every call from outside the cluster passes a token-checking front that refuses a call without a valid token. A named cluster takes a side path through Nova's compute API.](/img/spark-connection.svg)

## The short version

`spark` is not a cluster the platform hands you: it is a client that builds a Spark Connect
session for you, on first use, in your own name. It asks Trino which catalogs you can see and
gives the new session one Iceberg catalog per name, each carrying your token, so the catalog
service decides what you may read. Everything past that runs on that token: the driver asks the
catalog, the executors ask the driver, and the table files are reached with a short-lived credential
the catalog vends for each table, not with a storage key of yours — which is the boundary this page
is mostly about.

## Step by step

1. **The kernel.** `spark` is `_LazySpark` (`python/stardelt/notebook.py`), pushed into every
   kernel by `%load_ext stardelt.notebook`. It holds no connection: the first attribute you touch
   calls `stardelt._session`, where all of this happens. A kernel costs nothing until a cell uses
   Spark.

2. **The catalogs.** `_session` calls `_catalog_names()`, which runs `SHOW CATALOGS` through
   Trino as you. Trino does the visibility filtering, so the list is already the set of catalogs
   your access control lets you see; engine-only names (`system`, `information_schema`, `memory`,
   `tpch`, `tpcds`, `jmx`) and anything that is not a valid platform catalog name are dropped
   before they can become a Spark setting. With Trino unreachable, the session is built with
   `warehouse` alone and says so on stderr.

3. **The token.** `_token()` returns your token, not a service account. On a hub-spawned server
   it is `TRINO_TOKEN`, which JupyterHub copies into the pod from your sign-in at spawn; within a minute
   of expiry, `_token()` re-reads your current token from the hub instead of making you restart. A pipeline pod has no hub behind it and renews through its own
   client-credentials grant instead.

4. **The session.** `_session` checks that the endpoint answers (a three-second socket probe, so
   a stopped cluster fails in seconds rather than after minutes of retries) and then calls
   `SparkSession.builder.remote(remote).create()`. `create()`, not `getOrCreate()`: the latter returns
   the process-wide session, so a second person would inherit the first one's catalogs and token.

5. **The catalog settings.** For each name from step 2, the session sets
   `spark.sql.catalog.<name>` to Iceberg's `SparkCatalog`, `type=rest`, `uri` at Lakekeeper, the
   token from step 3, `warehouse=<name>`, and `io-impl=S3FileIO` pointed at the platform's
   object storage. These are session configuration; the server's own
   configuration has no catalog at all. Each catalog is then loaded once — a catalog the
   service refuses is left out with one line on stderr — and `warehouse` becomes the default when
   it loaded.

6. **The engine.** The Connect driver runs as a single long-running Deployment with Kubernetes as
   the cluster manager. It asks Lakekeeper for the catalog, where your token
   and your grants are checked; it creates executor pods per query and releases them when the
   query is done, so an idle platform runs the driver alone. Executors read and write the table
   files through Iceberg's S3 client with the credential the catalog vends on every load, scoped to
   that table; neither the driver nor an executor receives the platform's storage key, and the
   executor admission policy refuses a pod that reads a Secret.

7. **A named cluster.** Selecting a cluster — `STARDELT_CLUSTER` in the notebook's environment —
   sends `_remote_for_cluster()` to Nova's compute API
   (`GET /api/compute`) for that cluster's phase and endpoint, and the session is built against
   the endpoint it reports. Nothing is started implicitly: a stopped or failed cluster raises
   `ClusterStopped` and names the two ways to start it, and one that is starting or stopping asks
   you to wait.

## Who checks what

| The question | Who answers it | What you get |
|---|---|---|
| Which catalogs are there for me? | Trino, through `SHOW CATALOGS`, and then Lakekeeper | A catalog you have no grant on is refused and left out of the session; the rest are listed. |
| May I read this table? | Lakekeeper, with your token | A grant, or an error — at catalog, schema and table level, per person. |
| Are rows and columns masked? | Trino, once a policy exists | No row filter or column mask can be defined in this release (stardelt/stardelt#50). When one exists it applies to `%sql`; a `spark` read is governed by the table's grants, so a masked column is readable there. |
| Which files may the engine touch? | Nobody, per person | Spark: a short-lived, table-scoped credential the catalog vends on every load; it allows the reads and writes your grant allows, and the shared Connect server's driver and executors carry no platform key. Trino: the platform's S3 key; it reaches the bucket regardless of the table grants. |
| Who may open a Connect channel at all? | Kubernetes, through a NetworkPolicy | From outside the cluster: a token-checking front (Envoy `jwt_authn`, audience `spark-connect`) on the public route `spark.<baseDomain>` over TLS, so a call without a valid token is refused `401`. Inside the cluster a notebook pod reaches the driver directly, and the NetworkPolicy admits members' notebook pods only, so a scheduled pipeline notebook's pod is still refused. |

The in-cluster NetworkPolicy applies to pods, not to the public route.

## Session life

- **A renewed token means a new session.** Spark reads `spark.sql.catalog.*` when it creates the
  session state, so an initialized catalog cannot be re-keyed; `_session` builds a fresh session
  with the new token and stops the previous one.
- **A server restart loses the session's contents.** DataFrames, temporary views and settings of
  the old session are gone, and a running job is not retried. The next call notices and opens a
  new session with one line on stderr.
- **Client and server must be on the same Spark line.** A newer client mis-reads the server's
  settings in ways that break later calls, so the pair is checked when the session arrives and a
  mismatch is refused with a sentence that names both versions.
- **Streams do not use this path.** A `StreamApp` is run by the Spark Operator as a
  `SparkApplication` with its own driver and executors, not through Spark Connect; see
  [Spark Connect and the Spark Operator](../architecture/services).

## What changes next

The remaining gaps are known and planned, not hidden. Row filters and column masks do not exist
yet; when they do, they will apply in Trino only, so a Spark read is governed by table grants and
the files the table's credential reaches, not by a policy on the rows. The batch and stream paths —
a `SparkApplication`, from the Airflow loader or a `StreamApp` — still hold the platform's storage
key (stardelt/stardelt#494); the Connect path no longer does. Until they land, use `%sql` where a
policy must apply.
