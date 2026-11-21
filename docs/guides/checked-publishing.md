---
title: "Publish only checked data"
sidebar_label: "Publish only checked data"
slug: /guides/checked-publishing
description: "Write-Audit-Publish on Iceberg branches: a pipeline writes a branch, its checks gate the publish, and a failed run leaves production untouched."
---

# Publish only checked data

A pipeline that writes straight to its tables puts every row in front of its readers, checked or not. Write-Audit-Publish
(WAP) changes that: the run writes an Iceberg branch, its checks read the branch, and the tables people read move only when
every check passes. You turn it on with one key, `spec.publish: wap`.

## What a WAP run does

1. **Before any writer runs**, the run creates an audit branch on every table the pipeline writes and sets the table property
   `write.wap.enabled=true`. Without that property Spark writes `main` and says nothing.
2. **The writer writes the branch.** The writing notebook pod receives `STARDELT_WAP_BRANCH`, and the library sets
   `spark.wap.branch` from it, so the Spark session writes the branch instead of `main`.
3. **The checks read the branch.** Each `quality` check runs on Trino as the pipeline's principal, and `${table}` becomes
   `<table> FOR VERSION AS OF <the branch's snapshot id>`.
4. **The publish.** When every `error` check returns zero rows, `main` moves to the branch's snapshot, guarded by an
   `assert-ref-snapshot-id` requirement, and the branch is dropped.

## A failed check

`main` stays where it was, the run fails, and the branch stays on the table for 7 days, after which the catalog expires it.
The run page's **Checks** card lists each check with `Passed`, `Failed`, `Warned` or `Not run yet` and its row count, and a
failed WAP run says `Not published: N checks failed. Production data is unchanged.` (`1 check failed` for one). A `warn` check
records its rows and does not block the publish.

## The pipeline file

```yaml
apiVersion: stardelt.io/v1alpha1
kind: Pipeline
metadata:
  name: daily-revenue
spec:
  ownerGroup: shop
  runAs: pipeline-shop
  publish: wap
  schedule:
    cron: "0 3 * * *"
    timezone: UTC
  tasks:
    - name: write
      kind: notebook
      config:
        notebook: daily_revenue.ipynb
        objectVersion: v7
      writes:
        - gold.shop.daily_revenue
    - name: checks
      kind: quality
      dependsOn: [write]
      checks:
        - name: no_missing_revenue
          sql: SELECT * FROM ${table} WHERE revenue IS NULL
```

The notebook must be a published notebook version (`config.objectVersion`) and must write through the platform's Spark
session, which is what carries `spark.wap.branch` into the writes.

## Rules and limits

- `publish: wap` needs at least one `quality` task with a check, and at least one task that declares `writes`; the API refuses
  the pipeline otherwise.
- `writes` is a `notebook` or `spark-pipeline` task's field; a Trino `sql` task cannot write an Iceberg branch, so it cannot
  be a WAP writer.
- A `notebook` task is the writer that runs today; `spark-pipeline` tasks are accepted by the API but the loader does not run
  them yet.
- A check that names `${table}` needs exactly one written table in the pipeline, because the placeholder can only name one;
  several written tables and `${table}` is refused at plan time.
- Publishing is per table, in sequence: Iceberg has no transaction across tables, so a failure on a later table leaves the
  earlier ones published, and the run reports the failure.
- A `warn` check never blocks; `error` is the default severity.

## In a bundle

The same keys go in a pipeline file under the bundle's `resources/`, `publish` at the top of the file and `writes` and
`checks` under `tasks`, and `stardelt bundle validate` checks them offline — see [Bundle reference](bundle-reference.md).

The `publish`, `writes` and `checks` rows are in the [`Pipeline` field reference](../reference/resources/pipeline.md).
