---
title: "From source to dashboard"
sidebar_label: "From source to dashboard"
slug: /guides/source-to-dashboard
---

# From source to dashboard

How you work with data on the platform, in five steps. Each step says what works **today** and what is
**coming**. Screenshots will follow; the diagrams show the idea.

![From source to dashboard](/img/guides/workflow-overview.svg)

## 1. Get data in

| You have | Do this | Status |
|---|---|---|
| A CSV or JSON file | Nova → **Load data** → choose file, schema and table | today |
| Data already in the platform | `CREATE TABLE AS SELECT` or `INSERT INTO … SELECT` in the SQL editor or a notebook | today |
| A REST API | Python in a notebook (`requests` → DataFrame), then write the table (step 2) | today; scheduled runs coming |
| A SQL server (SQL Server, Oracle, PostgreSQL, MySQL) | A *connection* plus a database-to-bronze pipeline | coming |
| Files arriving in a bucket | File-drop ingestion | coming |

Write raw data into a **bronze** schema, for example `bronze_crm`. Never change raw data in place.

## 2. Connect a source system

**Today:** keep credentials out of the notebook file. Ask for them at run time:

```python
import getpass, requests, pandas as pd
token = getpass.getpass("API token")          # typed once, never saved in the notebook
rows = requests.get("https://api.example.com/accounts",
                    headers={"Authorization": f"Bearer {token}"}, timeout=30).json()
df = pd.DataFrame(rows)
```

Write the DataFrame with Spark (needs Spark installed on your platform):

```python
import os
from pyspark.sql import SparkSession
spark = SparkSession.builder.remote(os.environ["SPARK_REMOTE"]).getOrCreate()
spark.createDataFrame(df).writeTo("warehouse.bronze_crm.accounts").createOrReplace()
```

Spark uses the platform's storage credential, so tables it writes are not covered by table permissions yet.
A governed helper, `stardelt.write_df(df, "bronze_crm.accounts")`, is coming.

**Connections.** Create one on **Connections** in Nova: type, settings, owner group and secret. The
settings stay visible; the password is written once and never shown again. A Python notebook reads
it with `stardelt.connection("name")`; SQL and pipelines cannot use one yet. See
[Connections and secrets](connections).

The value lives in the platform's secret store, not in the notebook, an image or Git.

## 3. Model: bronze, silver, gold

![Layers](/img/guides/medallion-layers.svg)

Build each layer from the one before, in SQL:

```sql
CREATE SCHEMA IF NOT EXISTS warehouse.silver_crm;
CREATE TABLE warehouse.silver_crm.accounts AS
SELECT id, lower(email) AS email, max(_ingested_at) AS updated_at
FROM warehouse.bronze_crm.accounts
GROUP BY id, lower(email);

CREATE SCHEMA IF NOT EXISTS warehouse.gold_sales;
CREATE TABLE warehouse.gold_sales.accounts_per_domain AS
SELECT split_part(email, '@', 2) AS domain, count(*) AS accounts
FROM warehouse.silver_crm.accounts GROUP BY 1;
```

Run these in Nova's SQL editor or a notebook. **Coming:** SQL models in Git with tests (dbt), run on a schedule
as a pipeline, and layer tags in the catalog.

## 4. Show it

1. Open Superset (Nova → **Dashboards**) and sign in with your platform account.
2. **Datasets → New**: database *Trino Warehouse*, schema `gold_sales`, table `accounts_per_domain`.
3. Build a chart, add it to a dashboard. Point dashboards at `gold_*` tables only.

## 5. Work every day

- **Notebooks** on the platform (Nova → **Notebooks**), or in [VS Code](../developer/vscode) against your server.
  Your notebook queries as you: `SELECT current_user` prints your name.
- **Trino or Spark?** Start with Trino. Use Spark when SQL no longer fits or one machine is not enough.

![Trino or Spark](/img/guides/compute-choice.svg)

- **Schedule it:** pipelines on a schedule are coming; until then ask your platform admin to run a job for you.

## What is coming

Scheduled pipelines and ingestion templates · SQL models with tests · layer tags in the catalog · a
Python helper for governed writes · query history and table history in Nova.
