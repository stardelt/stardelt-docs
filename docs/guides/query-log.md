---
title: "Lineage and the query log"
sidebar_label: "Lineage and the query log"
slug: /guides/query-log
description: "See what wrote and read a table, and every statement the query engine ran with its origin, time and rows."
---

# Lineage and the query log

Every statement that runs on the platform's query engine is kept in Nova with where it came from, how long it took, how many rows it returned and why it failed; open **Query log** in the left navigation. A table's page shows the other side of the same picture: what writes it and what reads it.

## On a table page

**On a table page.** Open the table and choose the **Lineage** tab. It answers three questions at a glance: who makes this table, what it is made from, and what uses it. **Made by** names the pipeline that writes the table, with its kind, how many runs the window holds and when it last ran; when people also wrote the table with their own queries, one muted line counts them. If more than one pipeline writes the table, an amber badge says so. **Used by** counts the people who read it, names the tools that read it and counts the queries. Below that, two lists: **Made from** on the left and **Used by** on the right, one line per table — the table and the job that connects it, grouped by distance (`2 steps away` and further). When more tables are reachable downstream than the list draws, its heading says so — `3 tables at every step · 2 drawn` — because a change to this table can reach all of them. Tables a query made by hand are folded away behind **＋ n tables made by hand**; a table you may not read is collapsed into one line, `n tables you cannot see`, and is not a link. Pick 7, 30 or 90 days; the default is 30.

You can also open **Lineage** from the left navigation and pick a table in the **Table** field, which searches the catalogs as you type; a table with no recorded edges says that runs reporting events will appear there.

## The graph

**Open graph** draws it left to right: the tables that feed this one on the left, this table in the middle, and everything built from it on the right, one line per pair of tables. The job that moved the data appears on the lines of a hovered or selected table only. Click a table for a panel with what made it, who reads it, **Open table** and **Center here**; Escape closes it. A column of more than eight tables keeps the seven with the most runs and folds the rest into **＋ n more**, which opens. **Fit** brings the whole drawing back into view, and **Steps** (1, 2 or 3) sets how far it reaches. A table carries a small dot when a pipeline last wrote it: green when that pipeline's newest run succeeded, red when it failed (or a task before it failed), pulsing while a run is going. Hovering says which — `Last run: succeeded · 2 h ago`, `Last run: failed · …` or `Running now`. A table written by a person in the SQL editor or a notebook has no dot, nor does a run state you cannot act on. The steps and the window are URL parameters — for example `/lineage?catalog=warehouse&schema=sales&table=orders&depth=3&days=7`. On a phone the two lists answer instead of the graph, which needs a wider screen.

## Where the edges come from

A finished query contributes one input edge per table it read and one output edge per table it wrote. A query that only reads draws no edge: Nova counts it on that table as a reader, so browsing in the SQL editor does not clutter the graph. OpenLineage events feed it as well: Nova answers `POST /api/v1/lineage` on its in-cluster `internal` Service port (`8081` by default, so `http://nova.<namespace>.svc.cluster.local:8081`), the path the official clients append to the base URL. It takes the bearer token from Secret `nova-events`, is not exposed through an Ingress, and edges stay in Nova's own database.

Edges are kept 365 days and the raw events 90 by default; `NOVA_LINEAGE_EDGE_RETENTION_DAYS` and `NOVA_LINEAGE_RETENTION_DAYS` change that, `0` turns the purge off and an empty value keeps the default.

## From the command line

`stardelt lineage CATALOG.SCHEMA.TABLE` answers the same question as the **Lineage** tab, so a shell or a CI job can do an impact check. Off the platform it needs `stardelt login`; on a notebook server it reuses the server's sign-in ([the command line](./cli)).

`--depth` sets how many hops each way (`1` to `5`, default `2`) and `--days` the window (`1` to `365`, default `30`). `--upstream` or `--downstream` keeps one side of the graph; the two cannot be combined. `--format table` is the default; `--format json` prints the answer Nova's graph API returns.

```bash
stardelt lineage mobility.gold.kpis --downstream --depth 3 --days 7
stardelt lineage mobility.gold.kpis --format json
```

## The query log

Simple by default: one row per query with six columns.

| Column | Meaning |
|---|---|
| Status | **In progress**, **Succeeded**, **Failed** or **Canceled** |
| Query | The first line of the statement; hover for more |
| Warehouse | The compute class the query ran in |
| Started | When it started ("3 minutes ago"; hover for the exact time) |
| Duration | Wall-clock time from start to finish |
| Rows | Rows the query returned |

Click a row for its details, grouped and collapsed so you read only what you need:

- **Statement:** the whole statement, with **Copy** and **Open in SQL editor** buttons.
- **Facts:** query id, start time, source and the catalog and schema the session used.
- **Timing:** time waiting in the queue, planning and executing, and the CPU time used.
- **Data:** rows and bytes read from storage, rows and bytes returned, rows and bytes written.
- **Memory:** the peak memory the query used.
- **Profile:** where the time went — the five operators that used the most CPU (input, finish and
  output time), the rows each read and produced, the peak memory the engine reported, and the
  engine's plan behind a collapsed **Plan**. It is kept for finished queries the engine sent a
  profile for; a running, expired or profile-less query says so instead. The group also carries
  the hints read from these numbers and the same statement's recent runs, both below.
- **Tables:** which tables it read and which it wrote.
- For a failed query: the engine's error name and message.

The **Columns** menu adds more columns to the list: user, source, statement type, error and query id. Your choice is remembered in your browser.

## Finding a query

- **Status** chips filter by outcome, for example only the failures.
- **Time range** limits the list to the last hour, 24 hours, 7 days, 30 days or all time.
- **Search** looks in the statement text and in query ids.
- The list loads in pages: **Load more** fetches the next, and a small header indicator shows it is live and updating.

## Where a query came from

The **Source** column and the detail view say which tool sent the statement, so you can tell your own work apart:
**SQL editor**, **Pipeline task**, **Superset**, **Python client**, **JDBC client**, **Trino CLI**, or **Nova** for
statements Nova runs for itself, such as loads and transfers. A tool that does not identify itself shows its own name or
a dash.

## Who sees what

**Mine** (the default): the queries you ran, whoever sent them — the SQL editor, a notebook, a dashboard. A scheduled
pipeline's tasks run as a service principal, so they do **not** appear under your name.

**Team**: the queries of the service principals your groups own — in practice the scheduled pipelines and notebook runs of
your group (`pipeline-<group>`), including their failures. This is the scope that answers "did last night's run read that
table?". A person who is in no group with a principal sees an empty list, not an error.

**Everyone** (administrators only): every query on the platform.

Somebody else's statement reaches you only through **Team** or **Everyone**, and an administrator can hide its string
literals. The engine's own web interface is for administrators only; this page is the view for everybody else.

## What is kept, and for how long

Nova stores the statement text, who ran it, the timing and the counters above in its own database. Statements longer than
about 100 KB are cut. In catalog-management statements, which carry connection credentials, those values become `***`
before storage; nothing else is rewritten by default, so do not put secrets into SQL text.

An administrator can hide string literals from everybody but the query's owner: with
`NOVA_QUERY_LOG_REDACT_LITERALS=1` on Nova, somebody else's statement shows every string literal as `'?'`, in the list and
in the detail view, while the owner always sees the text they ran. It is off by default, does not touch numbers or
identifiers, and belongs on where a team reads the log — a team scope is exactly that case.

Rows are removed after 90 days by default; `NOVA_QUERY_LOG_RETENTION_DAYS` changes this (`0` keeps everything).
To keep usage longer, an administrator can read every row with `GET /api/admin/query-log/export`. Rows come
oldest first, up to 1,000 a page (500 by default), and `from` sets an epoch-millisecond start. Each page's
`nextCursor` continues the read after a restart and is `null` on the last page. Hidden literals stay hidden.

A finished query also keeps its **profile**: the engine's plan, the per-operator statistics, spilled bytes, split counts
and the connector's input counts. Profiles are large, so they are kept **14 days** by default — shorter than the log's
90 — and `NOVA_QUERY_PROFILE_RETENTION_DAYS` changes that (`0` keeps everything). A query whose profile has been removed
keeps its log row, and its Profile group says so.

A profile is cut at **512 KB**: above that it loses its operator list first, then the plan is cut to half the cap
(256 KB). The answer then carries `"truncated": true`, and the Profile group says the list is from the part
that was kept. The profile follows its log row's scopes: **Mine**, **Team** and **Everyone**.

## Hints in the profile

When a finished query's numbers show a known cause, the **Profile** group lists a hint: what to change, the numbers it
was read from, and a link to this section. Hints come from the profile and the query's timing only — the same profile
always gives the same hints, and no model is involved. No evidence for any cause below means no hint, the normal case
for a healthy query.

The API carries the same list: `GET /api/query-log/<query id>/profile` answers `hints`, an array of objects with
`code`, `title`, `evidence` and `docsUrl`. Match on `code`; the five codes are the headings below.

### Spill

The query needed more memory than its warehouse gave it, so the engine wrote intermediate data to disk and read it
back ("spilled"). It still finished, but the round-trip through disk costs time. Read less data before the wide
operator — filter earlier, select fewer columns, aggregate before the join — or run it on a larger warehouse.
Evidence: the number of bytes spilled.

### Queue-bound

The query waited in the queue longer than it took to execute: the warehouse was busy with other statements, so this
one was not slow — it was waiting for a slot. Run fewer statements at once, schedule the heavy ones apart, or lower
`spec.concurrency` on the warehouse; a larger size gives the work more slots. Evidence: the queue time and the
execution time.

### Join explosion

A join produced more than ten times its input rows. That is almost always a join condition that matches more rows
than intended: a missing condition, or keys that are not as unique as assumed. Check the join keys and whether the
smaller side is unique on them before changing anything else. Evidence: the output and input row counts.

### Skew

One task of a stage did most of the work while its siblings finished quickly: the rows are not spread evenly
over the workers, so most of the stage's time is one task's time. It happens
when a join or an aggregation groups by a key whose values are uneven — a few large tenants, one huge partition.
Salt the key (append a random suffix and group again), repartition before the wide operator, or filter out the
dominant value if the query does not need it. Evidence: the stage number, the slowest task's CPU time, the median
task's CPU time and how many times slower it was.

### Small files

The table was read as many splits of a small average size: every split costs a file open and a metadata read, so the
query pays for the table's layout rather than for its data. Compact the table with the engine's `optimize` procedure;
the **Maintenance** card on the table's page shows the file count and how many files are small. Evidence: the split
count and the average bytes per split.

## The same statement over time

A statement you run again and again gets slower for reasons one run cannot show. The
**Profile** group lists the last runs of the *same statement* beside this one: each run's state, when it ended, its
wall time and the bytes it read, with the median wall time in the heading, and it says when this run took more than
twice it. The statement is compared by its hash, not its query id, so a reworded statement is a different statement,
and another person's runs are never compared.

## What it does not show

The graph is table-level; column-level sources are shown on the table's **Columns** tab, in the **From** column. It only knows what was recorded since the feature was enabled, so a table whose queries predate it, or a table that is only ever read through an external client, stays empty. It lists only datasets in catalogs you can see; anything else is drawn unnamed. A query that failed produces no edges.
