---
title: "Spark in notebooks"
sidebar_label: "Spark in notebooks"
slug: /guides/spark
description: Read, transform and write Iceberg tables from a notebook with Spark, and know when Trino's SQL is the better engine.
---

# Spark in notebooks

Every notebook kernel on the platform already has `spark`, `display` and `%sql`: there is nothing to
install and no connection string to paste. `spark` opens a Spark Connect session as **you** the first time a
cell touches it, and the session sees the catalogs your account and groups may read.

:::note Which catalog the examples use
The examples name `shared`. Use a catalog your groups were granted to: the **Catalogs** page lists yours,
and `SHOW CATALOGS` answers the same question in a cell.
:::

## When to use Spark, when SQL

| | `%sql` (Trino) | `spark` (Spark Connect) |
|---|---|---|
| Best for | queries, exploration, dashboards, one statement over any size | transforms in Python, writing a table from a DataFrame, joins that need a cluster |
| Row and column masks | applied | not applied |
| A scheduled notebook | works | refused; use `%sql` |
| A large result | streamed to the client | `collect()` stops at 512 MB |

The rule of thumb: start with `%sql`. Move a step to `spark` when the work is Python, when a result becomes
a table of its own, or when one statement no longer fits the cluster behind Trino.

## Your first cells

A notebook is a Python kernel, so `%sql` and `spark` live in the same file. Start by looking around:

```sql
%sql SHOW CATALOGS
```

Then read a table. `spark.table` reads the Iceberg table through the catalog, with your token; nothing runs
until a cell asks for rows, and `display` shows the first 1,000 of them as a table:

```python
measurements = spark.table("shared.bronze.pegelonline_measurements")
display(measurements.select("station_name", "water", "measured_at", "measurement_value").limit(10))
```

## Transform and write

`pyspark.sql.functions` is the usual toolbox. A `groupBy` with two aggregates is one job, not one per
column:

```python
from pyspark.sql import functions as F

per_station = (
    measurements
    .groupBy("station_name", "water")
    .agg(F.count("*").alias("readings"),
         F.round(F.avg("measurement_value"), 2).alias("avg_value"),
         F.max("measured_at").alias("last_reading"))
)
display(per_station.orderBy(F.desc("readings")).limit(10))
```

A DataFrame becomes a table with `writeTo`. Create the schema once, then write: `createOrReplace()`
replaces the table and its data, `append()` adds this run's rows to the ones already there.

```python
spark.sql("CREATE NAMESPACE IF NOT EXISTS shared.scratch")
per_station.writeTo("shared.scratch.readings_per_station").createOrReplace()
```

```python
per_station.writeTo("shared.scratch.readings_per_station").append()
```

Small lookup data can come from pandas: `createDataFrame` turns a pandas DataFrame into a Spark
DataFrame, which you write like any other.

```python
import pandas as pd

thresholds = pd.DataFrame({"water": ["ELBE", "RHEIN"], "warning_cm": [500, 400]})
spark.createDataFrame(thresholds).writeTo("shared.scratch.thresholds").createOrReplace()
```

Each write is a commit on the table, so a reader that queries Trino sees the previous version until the
write finishes and the new one afterwards. There is no lock to take.

## Upsert, history and time travel

An upsert is one `MERGE INTO` statement. Take the new rows from a temporary view, so the statement is a
single job:

```python
thresholds.loc[0, "warning_cm"] = 550
spark.createDataFrame(thresholds).createOrReplaceTempView("thresholds")
spark.sql("""
    MERGE INTO shared.scratch.thresholds AS t
    USING thresholds AS s
    ON t.water = s.water
    WHEN MATCHED THEN UPDATE SET t.warning_cm = s.warning_cm
    WHEN NOT MATCHED THEN INSERT (water, warning_cm) VALUES (s.water, s.warning_cm)
""")
```

Every commit is a snapshot, and the table lists them:

```python
spark.sql("SELECT snapshot_id, committed_at, operation FROM shared.scratch.thresholds.snapshots").show(truncate=False)
```

Read a table as it was at a snapshot, or at a time, by naming it in the query:

```python
first = spark.sql(
    "SELECT snapshot_id AS id, committed_at AS at "
    "FROM shared.scratch.thresholds.snapshots ORDER BY committed_at").first()
spark.sql(f"SELECT * FROM shared.scratch.thresholds VERSION AS OF {first.id}").show()
spark.sql(f"SELECT * FROM shared.scratch.thresholds TIMESTAMP AS OF '{str(first.at)[:23]}'").show()
```

The older version answers, and the table keeps the newer one. Nothing is restored by reading it; write the
old rows back with `writeTo` if the table should return to them.

Read what Spark wrote from SQL, in the same notebook:

```sql
%sql SELECT station_name, water, readings, avg_value
FROM shared.scratch.readings_per_station ORDER BY readings DESC LIMIT 5
```

## A bigger cluster

The shared Spark driver is small: at most two executors of one core and 1 GiB each. When a job needs
more, use a **named cluster**. Create and start one in Nova → **Compute**, or from a cell:

```python
import stardelt

stardelt.compute.start("<cluster-name>")
```

Then name it and use `spark` as before; the next use of `spark` connects to that cluster instead of the
shared one:

```python
import os
os.environ["STARDELT_CLUSTER"] = "<cluster-name>"
spark.table("shared.bronze.pegelonline_measurements").count()
```

A named cluster is its **owner group's** compute. Its driver runs as
`spark-cluster-driver-<group>`, and the catalog sees that ServiceAccount's principal
(`kubernetes~<id>`) — so a job on the cluster reads and writes with the owner group's grants,
not with yours, and the group's storage access is the one it uses. A cluster another group
shares with you through its viewers is on your Compute page but cannot be used: the platform
gives a viewer no endpoint and no Start or Stop. The Compute card says both, under **runs as**
and **catalog identity**
([Your own tools](/docs/guides/connect-your-tools#a-clusters-card)).

A cluster you may not use, or one that is stopped, is refused rather than started behind your back; see
[Your own tools](/docs/guides/connect-your-tools#your-own-spark-clusters) for the Compute page itself.

## Limits

- Row and column masks apply in `%sql` only: a masked column arrives unmasked through Spark. Read a
  masked table through `%sql`.
- A table written through Spark goes through the catalog: the session asks the catalog for a
  credential scoped to that table (Spark asks for it on every load), so no storage key of yours is
  used. The identity behind the request is the signed-in person's on the shared server and the
  owner group's on a named cluster. Use Spark where Trino cannot do the work, not to work around a
  policy.
- `collect()` and `toPandas()` stop at 512 MB (`spark.driver.maxResultSize`); aggregate first, or write the
  result to a table and read it with SQL.
- There is no RDD API and no `sparkContext`: the plan runs on the server, so `df.rdd` fails. Use
  `DataFrame` calls, `mapInPandas` or `applyInPandas`.
- Every call from outside the cluster is checked. Connect itself authenticates nobody, so the public
  route `spark.<your-domain>` sits behind a token-checking front over TLS: a call without a valid token
  is refused. Inside the cluster a notebook pod reaches the driver directly, and the network policy
  admits members' notebook pods only.
- Public S3 buckets can be read anonymously (`s3a://bucket/path`); private buckets and the platform's own
  storage are not readable that way.
- The notebook's Spark client and the platform's Spark server must be on the same Spark line; the session
  refuses with a sentence when they are not.
- A restart of the Spark server ends the session: DataFrames and temporary views are gone, a running job is
  not retried, and the next cell opens a new session.
- A kernel on your own machine reaches Spark Connect too: `stardelt setup vscode` writes a kernel that
  sends `spark` through the platform's external front, `spark.<your-domain>`, with your `stardelt login`
  token. Install `stardelt[spark,jupyter]` on the laptop first (the Connect client must be on the same
  Spark line as the server, which the extra pins). See
  [Notebooks in VS Code](/docs/guides/develop#vs-code-on-your-laptop).
- A pipeline's notebook task still cannot reach Spark Connect: the network policy refuses its pod, so
  a scheduled notebook uses `%sql`. (The public demo has its own sandbox server.)

The full list of what the platform does and does not protect is under
[Known limits](../operations/security#known-limits).

## When it fails

| What the cell says | What to do |
|---|---|
| `TRINO_URL is not set — this notebook is not running on the platform.` | The cell ran outside a notebook pod. Run it in a notebook on the platform. |
| `no Spark cluster named '<name>' that you may use` | The name is wrong, or your groups were not granted the cluster. Check the name in Nova → Compute. |
| `<name> is stopped; start it with stardelt.compute.start('<name>') or in Nova → Compute` | Nothing starts a cluster implicitly. Start it, then run the cell again. |
| `<name> is Starting; wait until it is Running` | The cluster is still coming up. Retry once Nova → Compute says Running. |
| `stardelt.spark: the catalog refused <catalogs> for this token — not loading it.` | A warning on stderr, not an error: that catalog is not loaded and the session continues with the rest. Ask the owner for a grant if you need it. |
| `stardelt.spark failed: <one line>` | The session could not be opened; the line names the cause. Fix it and run the cell again. |
| `the notebook's Spark client is <a> but the platform's Spark server is <b>: they must be on the same Spark line` | An image mismatch on the platform, not in your code. Report it; the session is not usable. |

## How it works

The first touch of `spark` asks Trino which catalogs you may see, then opens a new Spark Connect session
with one Iceberg catalog per name, each carrying your token, so the catalog itself decides what you may
read. [How a notebook reaches Spark](../architecture/spark-connection) follows every step; the endpoint,
its network policy and its sizing are on [Spark Connect](../architecture/services#spark-connect).
