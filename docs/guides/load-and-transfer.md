---
title: "Load data"
sidebar_label: "Load data"
slug: /guides/load-and-transfer
description: "Load a CSV or JSON file into Iceberg, or copy one table into another, and follow the job afterwards."
pagination_next: guides/schedule
---

# Load data

Open **Load & transfer** in the left navigation to bring a file into Iceberg, or to move the rows of
one table into another. The page has two tabs. **Load data** reads a CSV or JSON file and writes it
into a table. **Transfer table** copies one table into another, either replacing the target or
appending to it. Both write through the platform's engine into Iceberg, so the result is an ordinary
table that the catalog, the SQL editor and the lineage graph see like any other. Every operation is
recorded as a job, so you can see afterwards what was loaded, how many rows it wrote and whether it
succeeded.

The page is for one-off loads. When the same file has to arrive again and again, put the load in a
pipeline instead. The page ends with the whole path from a source to a dashboard.

## Load a file

The **Load data** tab shows a form and a content box:

- **Catalog**: the catalog to write to. It is **Default (first writable)** until you choose one.
- **Schema**: the schema that holds the table, `nyc_taxi` in the sample.
- **Table**: the name of the table, `yellow_trips_copy` in the sample.
- **Format**: **CSV** or **JSON**. Switching the toggle replaces the sample in the content box with
  one for that format.
- **Content**: the file itself. Choose a `.csv` or `.json` file with **Choose file**, or paste the
  text into the box.
- **Load into table**: sends the content. The hint next to it says what it will do:
  `Creates or replaces <schema>.<table>`.

When the load succeeds, the page says `Loaded <N> rows into <catalog>.<schema>.<table>` and offers
**Open in catalog →** to the new table. The load itself appears under **Recent activity** on the
[Overview](/docs/guides/tour-of-nova#recent-activity), with its row count. If the schema does not exist
yet, it is created.

## What loading does

The **How it works** aside lists the four steps:

1. The file is parsed and column types are inferred.
2. A table is created, or replaced, in the selected schema; the schema is created if it does not
   exist.
3. Rows are written through the engine into Iceberg.
4. The load appears under **Recent activity** on the Overview, with a row count.

CSV and JSON arrays of objects are supported. The whole file is sent in one request, so keep it
small.

## Transfer a table

The **Transfer table** tab copies rows from one table into another:

- **Catalog**: the catalog both ends live in. It is **Default (first writable)** until you choose
  one.
- **Source table**: a list of the tables you can see; pick the one to copy.
- **Target schema** and **Target table**: where the rows go.
- **Mode**: **overwrite** or **append**.
- **Transfer table**: runs the copy.

`overwrite` recreates the target from the source with `CREATE TABLE AS SELECT`. `append` inserts
the source rows into the existing target. Cross-schema copies stay inside the same catalog, so
lineage and policy apply to both ends.

When the transfer succeeds, the page says `Transferred <N> rows → <catalog>.<schema>.<table>` and
offers **Open in catalog →** to the target table. The transfer appears under **Recent activity** on
the Overview.

## Where the result is

- The table is in the catalog you chose, under the schema and name you typed. Find it in
  **Catalog**, or follow **Open in catalog →** from the success line.
- The operation appears under **Recent activity** on the [Overview](/docs/guides/tour-of-nova#recent-activity)
  with its row count and outcome; the row opens the Load data page.
- The statement the engine ran is in your [query log](/docs/guides/query-log), with source
  **Nova**.

## From a file to a dashboard

How you work with data on the platform, in five steps. You need a platform with sign-in, Airflow and
Superset: see [Prerequisites](../getting-started/prerequisites).

![From a file to a dashboard](/img/guides/workflow-overview.svg)

### 1. Get data in

| You have | Do this |
|---|---|
| A CSV or JSON file | Nova → **Load & transfer** → choose file, schema and table |
| Data already in the platform | `CREATE TABLE AS SELECT` or `INSERT INTO … SELECT` in the SQL editor or a notebook |
| A REST API | Python in a notebook (`requests` → DataFrame), then write the table (step 2) |
| A database | Read it from a notebook with a [connection](connections), then write the table |

A complete example that keeps itself up to date is [the PEGELONLINE demo](pegelonline-demo).

Write raw data into the **bronze** schema of your domain catalog, for example `mobility.bronze`.
Never change raw data in place. **Load & transfer** writes to the first catalog you may write — your
group's catalog, otherwise `shared`; `warehouse` is the platform's technical catalog and
administrators only.

### 2. Connect a source system

Keep credentials out of the notebook file. The simplest way is to ask for them at run time:

```python
import getpass, requests, pandas as pd
token = getpass.getpass("API token")          # typed once, never saved in the notebook
rows = requests.get("https://api.example.com/accounts",
                    headers={"Authorization": f"Bearer {token}"}, timeout=30).json()
df = pd.DataFrame(rows)
```

Write the DataFrame as a table. `spark` is already in every notebook and writes as you:

```python
from pyspark.sql import functions as F
(spark.createDataFrame(df)
     .withColumn("_ingested_at", F.current_timestamp())
     .writeTo("mobility.bronze.accounts").createOrReplace())   # .append() for the next batch
```

Spark checks your catalog permissions with your token. Row and column masks are not available in this
release; see [Security](../operations/security). Reading, transforming and upserting from a notebook
is in [Spark in notebooks](spark).

**Connections.** Create one on **Connections** in Nova: type, settings, owner group and secret. The
settings stay visible; the password is written once and never shown again. A Python notebook reads
it with `stardelt.connection("name")`, and a scheduled notebook whose pipeline names the connection
receives its secret fields as environment variables; SQL cannot use one yet. See
[Connections and secrets](connections).

The value lives in the platform's secret store, not in the notebook, an image or Git.

### 3. Model: bronze, silver, gold

![Layers](/img/guides/medallion-layers.svg)

The three layers are **schemas inside your domain catalog** — there are no default `bronze`,
`silver` or `gold` catalogs. Build each layer from the one before, in SQL:

```sql
CREATE SCHEMA IF NOT EXISTS mobility.silver;
CREATE TABLE mobility.silver.accounts AS
SELECT id, lower(email) AS email, max(_ingested_at) AS updated_at
FROM mobility.bronze.accounts
GROUP BY id, lower(email);

CREATE SCHEMA IF NOT EXISTS mobility.gold;
CREATE TABLE mobility.gold.accounts_per_domain AS
SELECT split_part(email, '@', 2) AS domain, count(*) AS accounts
FROM mobility.silver.accounts GROUP BY 1;
```

Run these in Nova's SQL editor or a notebook. The catalog is yours because your group owns it; a
colleague in another group cannot read or write it. Every catalog page names the group that owns
it (`Owned by <group>`) and lists, per group, what that group may do there — browse, select, write,
create or manage. If you may not write, the page says so and names whom to ask: `To write here,
ask <owner> or an administrator to add your group.`

#### Query with %sql in a notebook

The notebook image already loads JupySQL (`stardelt.sqlmagic`): no install cell, and the
connection is called `warehouse`. One line does it:

```sql
%sql select count(*) from mobility.bronze.accounts
```

A whole cell with `%%sql`:

```sql
%%sql
select split_part(email, '@', 2) as domain, count(*) as accounts
from mobility.silver.accounts
group by 1
order by accounts desc
```

The token is read again on every request, so a kernel that stays open keeps working after your
access token rotates. A Python variable of that name binds as `:name` in the statement, and
JupySQL's own `%sql --connections`, `%sqlcmd tables`, `%sqlcmd columns -t <table>` and
`%sqlplot` work too. The query runs as you.

### 4. Show it

1. Open Superset (Nova → **Dashboards**) and sign in with your platform account.
2. **Datasets → New**: database *Trino Mobility* (each catalog gets its own Superset database),
   schema `gold`, table `accounts_per_domain`.
3. Build a chart, add it to a dashboard. Point dashboards at the `gold` schema only.

A **published** dashboard is visible only to the groups whose catalogs its charts use (and to
administrators). A dashboard that spans two catalogs is administrators-only until it is split.

### 5. Work every day

- **Notebooks** on the platform (Nova → **Notebooks**), or in [VS Code](./develop) against your server.
  Your notebook queries as you: `SELECT current_user` prints your name.
- **Trino or Spark?** Start with Trino. Use Spark when SQL no longer fits or one machine is not enough.

![Trino or Spark](/img/guides/compute-choice.svg)

- **Schedule it:** publish the notebook or SQL as a pipeline (Nova → **Pipelines**); the schedule runs
  in Airflow, and **Graph in Airflow ↗** opens the graph, Gantt view and task logs. Run now, Pause,
  Resume and Stop are on the pipeline page in Nova, checked against your group.

- **Maintenance runs on its own** every night. The catalog page shows when it last ran. Administrators: see the [operator page](../architecture/services).

### Not available yet

Ingestion templates, SQL models with tests, and layer tags in the catalog.

## For developers

`POST /api/ingest/upload` and `POST /api/transfer` back the two forms.

<NextStep to="/docs/guides/schedule" title="Schedule SQL and notebooks">
  Turn the notebook from step 3 into a pipeline that runs every night, and see each run.
</NextStep>
