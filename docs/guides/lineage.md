---
title: "Table lineage"
sidebar_label: "Table lineage"
slug: /guides/lineage
---

# Table lineage

## What you see

Open **Lineage** in the left navigation, type `catalog.schema.table`, and press **Show lineage**. The graph draws the table, its upstream inputs, and its downstream outputs, two hops deep by default. Change the depth in the URL with the `depth` query parameter, for example `/lineage?catalog=warehouse&schema=sales&table=orders&depth=3`. Click a node to open that table's lineage.

If you have not selected a table yet, the page asks you to choose one. If a table has no recorded edges, the page tells you that runs that report OpenLineage events will appear there.

## Where the edges come from

A finished query on the platform's query engine contributes one input edge for each table it read and one output edge for each table it wrote. Nothing else feeds lineage today: Nova has no public OpenLineage ingest endpoint. Edges are stored in Nova's own database, and nothing is sent to an external service.

Edges are kept for 365 days and the raw events for 90 days by default. An installation can change this with `NOVA_LINEAGE_EDGE_RETENTION_DAYS` and `NOVA_LINEAGE_RETENTION_DAYS`; `0` turns the purge off, and an empty value keeps the default.

## What it does not show

Lineage is table-level, not column-level. It only knows what was recorded since the feature was enabled, so a table whose queries predate it, or a table that is only ever read through an external client, stays empty. It lists only datasets in catalogs you can see; anything else is drawn unnamed. A query that failed produces no edges. Because lineage is table-level, a column that a query only reads is not a separate node.
