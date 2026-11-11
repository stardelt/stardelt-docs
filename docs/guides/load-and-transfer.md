---
title: "Load & transfer"
sidebar_label: "Load & transfer"
slug: /guides/load-and-transfer
---

# Load & transfer

Open **Load & transfer** in the left navigation to bring a file into Iceberg, or to move the rows of
one table into another. Every operation is recorded as a job, so you can see afterwards what was
loaded, how many rows it wrote and whether it succeeded.

## What the page is for

The page has two tabs. **Load data** reads a CSV or JSON file and writes it into a table.
**Transfer table** copies one table into another, either replacing the target or appending to it.
Both write through the platform's engine into Iceberg, so the result is an ordinary table that the
catalog, the SQL editor and the lineage graph see like any other.

The page is for one-off loads. When the same file has to arrive again and again, put the load in a
pipeline instead; [From source to dashboard](/docs/guides/source-to-dashboard) shows the way.

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
two links: **Open in catalog →** to the new table, and **View job →** to the job in Activity. If the
schema does not exist yet, it is created.

## What loading does

The **How it works** aside lists the four steps:

1. The file is parsed and column types are inferred.
2. A table is created, or replaced, in the selected schema; the schema is created if it does not
   exist.
3. Rows are written through the engine into Iceberg.
4. The load appears under Activity with a row count.

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
links to the job with **View job →**.

## Where the result is

- The table is in the catalog you chose, under the schema and name you typed. Find it in
  **Catalog**, or follow **Open in catalog →** from the success line.
- The operation is in **Activity** as a job with its row count and its outcome. Follow **View job →**
  to open it.
- The statement the engine ran is in your [query log](/docs/guides/query-log), with source
  **Nova**.

## For developers

`POST /api/ingest/upload` and `POST /api/transfer` back the two forms.
