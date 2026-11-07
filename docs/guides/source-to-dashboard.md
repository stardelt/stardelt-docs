---
title: "From source to dashboard"
sidebar_label: "From source to dashboard"
slug: /guides/source-to-dashboard
---

# From source to dashboard

How you work with data on the platform, in five steps. You need a platform with sign-in, Airflow and
Superset: see [Prerequisites](../getting-started/prerequisites).

![From source to dashboard](/img/guides/workflow-overview.svg)

## 1. Get data in

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

## 2. Connect a source system

Keep credentials out of the notebook file. The simplest way is to ask for them at run time:

```python
import getpass, requests, pandas as pd
token = getpass.getpass("API token")          # typed once, never saved in the notebook
rows = requests.get("https://api.example.com/accounts",
                    headers={"Authorization": f"Bearer {token}"}, timeout=30).json()
df = pd.DataFrame(rows)
```

Write the DataFrame with the `stardelt` package. It writes as you, so your table permissions apply:

```python
import stardelt
stardelt.write_df(df, "mobility.bronze.accounts", bronze=True)   # adds _ingested_at, _source, _batch_id
```

Above 200,000 rows it refuses and points you to `stardelt.spark()`, which needs Spark on your platform.
Spark checks your catalog permissions with your token, but row and column masks apply only in Trino, and
it writes files with the platform's storage key. See [Known limits](../architecture/security-model#known-limits).

**Connections.** Create one on **Connections** in Nova: type, settings, owner group and secret. The
settings stay visible; the password is written once and never shown again. A Python notebook reads
it with `stardelt.connection("name")`; SQL and pipelines cannot use one yet. See
[Connections and secrets](connections).

The value lives in the platform's secret store, not in the notebook, an image or Git.

## 3. Model: bronze, silver, gold

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
colleague in another group cannot read or write it.

## 4. Show it

1. Open Superset (Nova → **Dashboards**) and sign in with your platform account.
2. **Datasets → New**: database *Trino Mobility* (each catalog gets its own Superset database),
   schema `gold`, table `accounts_per_domain`.
3. Build a chart, add it to a dashboard. Point dashboards at the `gold` schema only.

A **published** dashboard is visible only to the groups whose catalogs its charts use (and to
administrators). A dashboard that spans two catalogs is administrators-only until it is split.

## 5. Work every day

- **Notebooks** on the platform (Nova → **Notebooks**), or in [VS Code](../developer/vscode) against your server.
  Your notebook queries as you: `SELECT current_user` prints your name.
- **Trino or Spark?** Start with Trino. Use Spark when SQL no longer fits or one machine is not enough.

![Trino or Spark](/img/guides/compute-choice.svg)

- **Schedule it:** publish the notebook or SQL as a pipeline (Nova → **Pipelines**); the schedule runs
  in Airflow, and **Open in Airflow** takes you to the run, task and log view. Group members may run
  and pause their group's DAGs there.

## Not available yet

Ingestion templates, SQL models with tests, and layer tags in the catalog.
