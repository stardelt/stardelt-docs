---
title: "Query acceleration: a table a schedule keeps fresh"
sidebar_label: "Query acceleration"
slug: /guides/query-acceleration
description: "Pre-compute a dashboard's aggregate once per schedule into a small Iceberg table the dashboard reads instead of re-running the query on every page load."
---

# Query acceleration: a table a schedule keeps fresh

A dashboard panel that takes a minute to answer usually asks the same question every time: one
aggregate over a large table, computed again for every viewer and every page load. When the answer
only changes once a day, the supported way to make it fast is a small table that a schedule rebuilds,
and a dashboard that reads that table instead of the source.

## When a dashboard is slow

The pattern to look for is a statement that reads a lot of rows and returns few: a `GROUP BY`, a
count or a sum over a day, a month or a customer, on the largest table you have. The engine does the
whole job on every request — the scan, the joins, the aggregation — and every person who opens the
page pays for it again, although the result stays the same until the source changes.

When the answer may lag behind the source — daily revenue, a monthly total, a per-customer lifetime
value — compute it once, after the source has settled, and let the dashboard read the small result.

Nova finds these statements for you. **Accelerations** in the menu lists the statements you repeat
(**Scope**: **Mine** or **My teams**) over the last 30 days, worst first by total time. Statements that
differ only in string values or spacing count as one. Each row shows the runs, the total and the average
time, and has **Copy SQL**. `stardelt query log-repeated` gives the same list.

## The pattern

The shop example in `demos/examples/shop-bundle/` does exactly this once a day. The statement is
`sql/10_daily_revenue.sql`:

```sql
-- Rebuilt on every run (the dbt version of the shop merges the last three days instead).
create or replace table gold.${params.schema}.daily_revenue as
select
    l.order_date,
    count(*) as order_lines,
    sum(l.quantity) as units,
    sum(l.quantity * p.unit_price) as revenue
from silver.${params.schema}.stg_order_lines l
join silver.${params.schema}.stg_products p on p.product_id = l.product_id
group by l.order_date
```

It is task `daily_revenue` of pipeline `shop-3-gold`, on the schedule `0 3 * * *` in `Europe/Berlin`
(`resources/3-gold.yaml`). `${params.schema}` is the bundle's schema — `shop` in production,
`shop_dev` in a development stage — so the table a dashboard reads is `gold.shop.daily_revenue`.

The rule the example keeps:

- **The source tables stay the truth.** The pipeline reads `silver.shop.stg_order_lines` and
  `silver.shop.stg_products`; every number in the small table comes from rows there.
- **The refreshed table is derived.** It holds nothing that cannot be computed from the source, so it
  can be rebuilt at any time by running the same statement in the [SQL editor](./sql-editor).
- **One name, written in place.** `create or replace table` keeps the name the dashboard reads, and
  the table only moves to the new result when the statement has finished. A failed run leaves the
  previous snapshot in place.

To do the same for your own table, run the statement once in the SQL editor and publish it on a cron
([Schedule SQL and notebooks](./schedule)).

## Materialized views are not available on this catalog

The engine cannot do this step for you. Against the Iceberg REST catalog the platform ships, a
materialized view is refused at analysis time:

```text
NOT_SUPPORTED: createMaterializedView is not supported for Iceberg REST catalog
```

The sentence comes from the query engine — Nova passes the statement on and shows the engine's error —
and no workaround is promised. The supported alternative is the pattern above: a `CREATE TABLE … AS
SELECT` statement, kept fresh by a schedule.

## Cost

The refreshed table is an ordinary Iceberg table. It is snapshotted and maintained like any other
table in the catalog: every refresh commits a new snapshot with its data files, and the catalog's
maintenance — optimizing small files, expiring snapshots — treats it as it treats the large tables
([the catalog and the table page](./catalog), "Maintenance").

So refresh it only as often as the dashboard needs. A daily figure does not need a run every five
minutes, and each run you do not need leaves a snapshot and its files behind for no reader. In return,
a dashboard reading the small table scans a few thousand rows instead of aggregating the source.

## Freshness

A refreshed table can be wrong without erroring: if the schedule stops, the table stays where it was
and the dashboard draws yesterday's numbers as if they were today's. Say when the data is expected,
and let the platform compare that with the newest commit. The promise is the Iceberg table property
`stardelt.freshness` — a deadline, its zone and a grace — and the table shows `green`, `amber`, `red`
or `grey` against it, so a reader can see whether the number in front of them is stale
([Build a data product](./data-products), "Promise a time"). Set the deadline to the time the run
usually finishes.
