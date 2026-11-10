---
title: "Table lineage"
sidebar_label: "Table lineage"
slug: /guides/lineage
---

# Table lineage

## What you see

**On a table page.** Open the table and choose the **Lineage** tab. It answers three questions at a glance: who makes this table, what it is made from, and what uses it. **Made by** names the pipeline that writes the table, with its kind, how many runs the window holds and when it last ran; when people also wrote the table with their own queries, one muted line counts them. If more than one pipeline writes the table, an amber badge says so. **Used by** counts the people who read it, names the tools that read it and counts the queries. Below that, two lists: **Made from** on the left and **Used by** on the right, one line per table — the table and the job that connects it, grouped by distance (`2 steps away` and further). Tables a query made by hand are folded away behind **＋ n tables made by hand**; a table you may not read is collapsed into one line, `n tables you cannot see`, and is not a link. Pick 7, 30 or 90 days; the default is 30.

**The graph.** **Open graph** draws the same data left to right: the tables that feed this one on the left, this table in the middle column and everything built from it on the right, one line per pair of tables. The job that moved the data appears on the lines of a hovered or selected table and nowhere else. Click a table for a panel with what made it, who reads it, **Open table** and **Center here**; Escape closes the panel. A column of more than eight tables keeps the seven with the most runs and folds the rest into **＋ n more**, which you can open. **Fit** brings the whole drawing back into view, and **Steps** (1, 2 or 3) sets how far it reaches. The steps and the window are URL parameters — for example `/lineage?catalog=warehouse&schema=sales&table=orders&depth=3&days=7`. On a phone the two lists answer instead of the graph, because the drawing needs a wider screen.

You can also open **Lineage** in the left navigation and pick a table from the **Table** field, which searches the catalogs as you type. If you have not selected a table yet, the page asks you to choose one; if a table has no recorded edges, it tells you that runs reporting OpenLineage events will appear there.

## Where the edges come from

A finished query on the platform's query engine contributes one input edge for each table it read and one output edge for each table it wrote. A query that only reads does not draw an edge: Nova counts it on that table as a reader — how many people and how many queries in the window, and when the table was last read — so browsing data in the SQL editor does not clutter the graph. OpenLineage events feed it as well: Nova answers `POST /api/v1/lineage` on its
in-cluster `internal` Service port (`8081` by default, so
`http://nova.<namespace>.svc.cluster.local:8081`), which is the path the official
OpenLineage clients append to the base URL. The endpoint takes the shared bearer
token from Secret `nova-events` and is not exposed through an Ingress; edges stay
in Nova's own database, and nothing is sent to an external service.

Edges are kept for 365 days and the raw events for 90 days by default. An installation can change this with `NOVA_LINEAGE_EDGE_RETENTION_DAYS` and `NOVA_LINEAGE_RETENTION_DAYS`; `0` turns the purge off, and an empty value keeps the default.

## What it does not show

The graph is table-level; column-level sources are shown on the table's **Columns** tab, in the **From** column. It only knows what was recorded since the feature was enabled, so a table whose queries predate it, or a table that is only ever read through an external client, stays empty. It lists only datasets in catalogs you can see; anything else is drawn unnamed. A query that failed produces no edges.
