---
title: "Declarative Spark pipelines"
sidebar_label: "Spark pipelines"
slug: /guides/spark-pipelines
description: "Write a Spark pipeline graph as a task: the spark-pipeline.yml spec, what stardelt fills in, and how a run refreshes it."
---

# Declarative Spark pipelines

A graph is worth a task of its own when several tables feed each other and Spark can work out the order, when a run should
refresh only what changed, or when one task should replace a chain of `sql` tasks that exists only to sequence them. A graph
is a directory in the bundle: `spark-pipeline.yml` and the SQL or Python sources its libraries match. The platform runs it on
the group's Spark Connect server, as the group's pipeline principal.

## A first graph

```text
<bundle>/
  bundle.yaml
  pipelines/        the pipeline documents, one file per pipeline
  spark/daily/      the graph directory named by the task's project
    spark-pipeline.yml
    sql/            the sources the graph's libraries match
```

The graph's `spark-pipeline.yml` names the graph, configures the one catalog it writes and lists its sources. `gold` here is
a placeholder: use the catalog your group writes into.

```yaml
name: daily-revenue
configuration:
  spark.sql.catalog.gold: org.apache.iceberg.spark.SparkCatalog
  spark.sql.catalog.gold.type: rest
  spark.sql.catalog.gold.uri: https://<your-catalog-host>/catalog
  spark.sql.catalog.gold.warehouse: gold
  spark.sql.catalog.gold.io-impl: org.apache.iceberg.aws.s3.S3FileIO
  spark.sql.catalog.gold.s3.endpoint: https://<your-object-store>
  spark.sql.catalog.gold.s3.path-style-access: "true"
libraries:
  - glob:
      include: "sql/**"
```

One source file, `sql/daily_revenue.sql`, which the `libraries` entry matches:

```sql
CREATE MATERIALIZED VIEW gold.shop.daily_revenue AS
SELECT order_day, sum(amount) AS revenue
FROM gold.shop.orders
GROUP BY order_day;
```

The pipeline document under `pipelines/` gives the graph one task:

```yaml
name: daily
ownerGroup: shop
runAs: pipeline-shop
publish: direct
tasks:
  - name: daily
    spark-pipeline: {project: spark/daily, refresh: incremental}
    writes: [gold.shop.daily_revenue]
```

`project` is a directory of the bundle, `spark/daily` here. It is not listed under the bundle's `files:`: the deploy reads
every file of the directory itself. A document you apply with `stardelt apply -f` spells the same task flat instead —
`kind: spark-pipeline`, with `project`, `files`, `refresh`, `fullRefresh` and `writes` beside it.

## The commands

```bash
stardelt bundle validate .        # every target, with no host
stardelt bundle plan . -t dev     # what a deploy would create or update
stardelt bundle deploy . -t dev   # create or update the pipelines
```

A deploy does not run the graph. A run starts a pod of the platform's Spark image: the pod copies the graph, writes what the
platform owns into its `spark-pipeline.yml`, runs `spark-pipelines dry-run` on it — the graph is checked without reading or
writing data — and then runs it against the group's Spark Connect server. The graph's import, flow and table steps appear in
the task's log, and the run's page shows that log.

## The task's fields

The graph keys sit inside the task's `spark-pipeline:` mapping; `writes` is the task's own key.

| Field | What it says |
|---|---|
| `project` | The graph's directory in the bundle, `spark/daily` here. Not a `files:` entry. |
| `files` | Only for a document applied with `stardelt apply -f`: a map of relative path to text, with `spark-pipeline.yml` at the root. A bundle deploy fills it from `project`. |
| `refresh` | `incremental`, the default — only what changed — or `full`, which rebuilds everything. |
| `fullRefresh` | A list of dataset names to rebuild; it cannot be combined with `refresh: full`. |
| `writes` | 1 to 16 `catalog.schema.table` entries, all in one catalog and schema. |

## What the platform sets

- **Catalog and database**, from `writes`: the pod puts them into the graph's copy of `spark-pipeline.yml`, so a SQL source
  can name its table in the catalog and schema the task writes.
- **The checkpoint location**, under the group's bucket, one folder per pipeline and task.
- **The catalog credential**: the pod holds a token for the pipeline principal, so the graph itself holds no storage key.

A `spark-pipeline.yml` that sets `catalog`, `database` or `storage` is refused. So is a `configuration:` without
`spark.sql.catalog.<catalog>.type` for the catalog `writes` names, because the Connect session would not know the catalog.

## Libraries

`libraries` has one entry per source set, each `- glob: {include: …}`. The include is a single file path or a folder ending
in `/**`, and no other `*`:

```text
spark-pipeline task `daily` libraries glob.include must be a file path or a folder ending in /**: sql/*.sql
```

`include: "sql/**"` takes every file below `sql/`; `include: "sql/daily_revenue.sql"` takes one.

## Checks and publishing

`writes` is also what a `publish: wap` run audits: the run writes an Iceberg branch on each written table and the pipeline's
`quality` checks read that branch. A check that names `${table}` needs exactly one written table. See
[Publish only checked data](checked-publishing.md).

## When it fails

A graph that breaks a rule is refused with one sentence. `stardelt bundle validate` catches most of these before a deploy,
naming the pipeline file and the task; a deploy or a run says the sentences below.

| The sentence | What to change |
|---|---|
| ``spark-pipeline task `daily` needs writes: the catalog and schema the graph writes, as catalog.schema.table — stardelt sets the graph's catalog and database from it`` | Give the task `writes`. |
| ``spark-pipeline task `daily` writes into more than one catalog/schema (gold.shop, silver.ops): a graph has one target; split the task`` | Keep one catalog and schema, or split the graph into two tasks. |
| ``spark-pipeline task `daily`: spark-pipeline.yml must not set catalog, database or storage — the task's writes and the group's bucket set them at run time`` | Remove the three keys from the file. |
| ``spark-pipeline task `daily`: catalog `gold` has no `spark.sql.catalog.gold.type` under `configuration:` — the Connect session would not know the catalog`` | Add that key to `configuration:`. |
| ``spark-pipeline task `daily` libraries glob.include must be a file path or a folder ending in /**: sql/*.sql`` | Name one file or a folder ending in `/**`. |
| `a spark-pipeline task needs the pipeline's ownerGroup and runAs: the graph's catalog token is the principal's` | Set `ownerGroup` and `runAs` in the pipeline document. |

## Limits

- One catalog and one schema per graph.
- 1 to 16 written tables per task.
- `fullRefresh` names at most 32 datasets, each at most 128 characters.
- The graph runs in the pipeline principal's session, so it can read and write what that principal may.
