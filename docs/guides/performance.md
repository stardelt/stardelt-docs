---
title: "Performance: habits that keep a shared platform fast"
sidebar_label: "Performance"
slug: /guides/performance
description: "Seven habits that keep the shared Spark driver and the cluster fast — a bounded result, one job instead of one per item, a released cache — with the limits they come from."
---

# Performance: habits that keep a shared platform fast

Every notebook and every scheduled job on the platform shares one small cluster: one Spark driver and
at most two executors. A pattern that is fine on a laptop — reading a whole table into pandas, one job
per item of a loop, a cache nobody releases — is expensive when ten people do it at the same time, and
it is the driver of everyone's session that pays. This page is the rules; [Sizing](../operations/production#sizing)
is what the node under them can carry.

:::note Which catalog the examples use
The examples name `shared`. Use a catalog your groups were granted to: the **Catalogs** page lists yours.
:::

## The limits you are working inside

| Limit | Value | Consequence |
|---|---|---|
| the shared driver's heap | 1 GiB (`spark.driver.memory`), in a 3 GiB pod | a result that lands in the driver competes with the platform |
| one result's maximum size | 512 MiB (`spark.driver.maxResultSize`) | above it the call fails, it does not slow down |
| each executor | 1 core and 1 GiB (`spark.executor.cores`, `spark.executor.memory`) plus 384 MiB overhead (`spark.executor.memoryOverhead`) | one task at a time per executor |
| executors at once | 2 executors (`spark.dynamicAllocation.maxExecutors`) | concurrency comes from the SQL, not more tasks |

Measured on 2026-10-21: chunks of 250 000 rows made tasks of 11 MiB, produced 305 warnings in three
hours and ended with the driver OOMKilled. Chunks of at most 20 000 rows — about 1 MiB per task — and a
table that records finished chunks do not.

## The seven habits

These are the same seven rules the notebook helper prints with `stardelt.spark_tips()`, each with the
limit it comes from.

### 1. Bound a result before it crosses into the driver

A `toPandas()` or `collect()` moves the entire result into the driver's 1 GiB heap, and above 512 MiB
the call fails outright rather than slowing down.

*Instead of*

```python
df = spark.table("shared.bronze.pegelonline_measurements")
rows = df.toPandas()                    # the whole table crosses into the driver
```

*Do this*

```python
df = spark.table("shared.bronze.pegelonline_measurements")

df.limit(10_000).toPandas()             # a look at the data, bounded
df.groupBy("station").count()           # or let the engine aggregate

# or make it a table and read it with SQL, one page at a time
df.writeTo("shared.silver.measurements").createOrReplace()
spark.sql("SELECT * FROM shared.silver.measurements LIMIT 100").show()
```

### 2. Create a DataFrame from a table, not from a local object

A DataFrame built from a local list or pandas object carries that object inside every task of every
job that uses it, so a table that is read once from a file is shipped again on each run.

*Instead of*

```python
import pandas as pd

stations = spark.createDataFrame(pd.read_csv("stations.csv"))
big.join(stations, "station")           # stations travels with every task
```

*Do this*

```python
import pandas as pd

spark.createDataFrame(pd.read_csv("stations.csv")) \
     .writeTo("shared.silver.stations").createOrReplace()

# now, and in every later cell or session, with no local data involved
stations = spark.table("shared.silver.stations")
big.join(stations, "station")
```

### 3. Run one job, not one per item

Every action starts a job, and every job adds a plan and a broadcast to the driver: a loop over 300
stations is 300 jobs for one answer.

*Instead of*

```python
for station in stations:                # one job per station
    print(station, spark.table(T).where(f"station = '{station}'").count())
```

*Do this*

```python
spark.table(T).groupBy("station").count()               # one job, all stations

# when the body of the loop is Python rather than SQL, hand it to the executors
spark.table(T).repartition(8).mapInPandas(per_station, schema)
```

### 4. Broadcast a small table once, outside the loop

A join against a small table broadcasts it; done inside a loop it broadcasts the same table once per
iteration, and each broadcast stays in the driver until it is cleaned up.

*Instead of*

```python
for day in days:                        # one broadcast per iteration
    df.join(stations, "station").where(f"day = '{day}'").count()
```

*Do this*

```python
from pyspark.sql.functions import broadcast

stations = broadcast(spark.table("shared.silver.stations"))   # once, outside the loop
for day in days:
    df.join(stations, "station").where(f"day = '{day}'").count()
```

### 5. Release a cache when you are done with it

Cached blocks take up executor memory — 1 GiB per executor here — and nothing frees them on its own,
so a cache that outlives its use shrinks the cluster for every job that follows.

*Instead of*

```python
df = spark.table(T).cache()             # held until the session ends
df.count()
df.groupBy("station").count()
```

*Do this*

```python
df = spark.table(T).cache()
try:
    df.count()
    df.groupBy("station").count()
finally:
    df.unpersist()                      # cache only what several actions reuse
```

### 6. Load a file in chunks you can resume

One `append` per large chunk gives a task of many megabytes, warns the engine, and leaves no record of
what is already in the table — so a restart starts from the first row again.

*Instead of*

```python
import pandas as pd

for chunk in pd.read_csv("measures.csv", chunksize=250_000):
    spark.createDataFrame(chunk).writeTo(T).append()    # 11 MiB tasks, nothing to resume from
```

*Do this*

```python
import pandas as pd

spark.createDataFrame([], "number int").writeTo(DONE).createOrReplace()
done = {row[0] for row in spark.table(DONE).collect()}   # a handful of rows

for number, chunk in enumerate(pd.read_csv("measures.csv", chunksize=20_000)):
    if number in done:
        continue
    spark.createDataFrame(chunk).writeTo(T).append()
    spark.createDataFrame([(number,)], "number int").writeTo(DONE).append()
```

A file that fits in one request is simpler still: **Load & transfer** writes it into a table without a
loop ([Load data](./load-and-transfer)).

### 7. Count once and keep the number

Every `count()` is a job over the whole table; repeating it to check the same thing, or to print it,
multiplies the work for one number.

*Instead of*

```python
for _ in range(3):
    print(spark.table(T).count())       # three jobs, one number
```

*Do this*

```python
n = spark.table(T).count()              # one job
print(n)
if n > 0:
    ...
```

## SQL is usually the cheaper path

`%sql` runs on Trino, where a statement costs the warehouse and not the shared driver, and the engine
does the filtering, the joins and the aggregation before anything comes back. Filter early and name the
columns — `SELECT *` on a wide table reads every column of every file — aggregate in the engine rather
than in Python, and add a `LIMIT` while you are exploring instead of asking for the whole result. In the
[SQL editor](./sql-editor) and in a cell, `EXPLAIN` shows the plan without running the statement.

The [query log](./query-log) points at the same problems from the other side: it records what each
statement read and how long it waited, and its profile hints — spill, queue-bound, join explosion, skew,
small files — name what to change in the query or the table.

## Give your assistant the same rules

`stardelt skill` prints the Skill the platform ships for AI assistants, and `stardelt skill --write
.claude/skills` installs it where an assistant looks for project skills
([install it](./mcp#the-local-server)). On performance it says: run `sql_explain` before a query
on a table that may be large, name the columns, filter early, aggregate in SQL and add a `LIMIT` — never
`SELECT *` on a big table — and when an answer comes back `truncated` or with a hint, narrow the question
instead of asking for more rows. It also tells the assistant to read a slow query's profile before
proposing a faster one, so the suggestion is about the statement that was slow and not a guess. If your
assistant does not already have these rules, install the Skill and ask it to read the page.

## Where to go next

- [Sizing](../operations/production#sizing) — what one node carries and how a component scales.
- [Spark in notebooks](./spark) — the workspace, its limits and the messages it prints.
- The notebook helper's [README](https://github.com/stardelt/stardelt/blob/@ref@/python/stardelt/README.md#keeping-the-shared-driver-healthy)
  — the table the seven habits come from, with the same numbers.
