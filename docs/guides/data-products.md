---
title: "Build a data product"
sidebar_label: "Data products"
slug: /guides/data-products
description: "A gold table others may rely on: one owning group, a versioned view, a freshness promise, checks that run, and a named way to ask for access."
---

# Build a data product

A table is rows you can query. A data product is a table someone stands behind: it has an owning group,
an interface that does not move under its readers, a time by which it is fresh, checks that run with it,
a written guide and a way to ask for access. Every piece of that already exists in the platform; this
page is the order to put them in.

## A table, or a data product?

| | A table | A data product |
|---|---|---|
| Owner | whoever may write it | one group claims it in **About this table** |
| Interface | the table name and whatever its columns are today | a view with a version suffix, `gold.water.levels_v1` |
| Freshness | unknown to the reader | a promise in `stardelt.freshness`: a deadline, its zone and a grace |
| Checks | none | a `quality` task in the pipeline that writes it, and verified queries beside the table |
| Documentation | the column list | description, tags, domain and the **How to use this table** guide |
| Access | a catalog grant | a catalog grant to a group, and a recorded request saying what is asked for and why |

## 1. One owning group

Open the table page and choose **Edit** in **About this table**. A table without an owner can be claimed
by the first editor for one of their own groups; once it has one, only that group or an administrator
changes the description, the tags, the owner, the domain and the guide. Everyone else reads the card and
sees whom to ask. One product, one group: that group answers the questions, sets the freshness promise and
writes the guide. The card and its rules are in [the catalog and the table page](./catalog.md).

## 2. Publish a view, not the table

The table below is yours to rebuild; the view above it is what other people select from. Give the view a
version suffix, so a next version can exist beside the old one and readers move when they are ready:

```sql
CREATE VIEW gold.water.levels_v1 AS
SELECT station_uuid, measured_at, measurement_value
FROM gold.water.levels;
```

When the shape changes, publish `gold.water.levels_v2` and leave `_v1` in place until its readers have
moved. A view page in Nova shows only **Preview** — it has no Profile, Columns, Details, History or
Lineage tab, and no **About this table** card, because a view holds a statement, not files and snapshots
([the catalog and the table page](./catalog.md), "Views").

## 3. Promise a time

Say when the data is there, and let the platform compare that with the newest commit. The promise is an
Iceberg table property, `stardelt.freshness`, so it travels with the table and any engine can read it:

```console
PUT /api/catalog/tables/{namespace}/{table}/health?catalog=gold
{"by": "07:00", "timezone": "Europe/Berlin", "graceMinutes": 60}
```

`by` is a 24-hour clock time in an IANA zone; `graceMinutes` is 0 to 1440 and defaults to 60. The status
the owner and the readers see is `green` when the newest commit is at or after the most recent deadline,
`amber` while the grace runs, `red` once the grace has passed, and `grey` when no promise is set. Only
the owner group and administrators may set it, which is why step 1 comes first. On the command line the
operation is `stardelt api table_freshness_update`; the body, the statuses and the errors are in the
[catalog API reference](../reference/api/catalog.md). It is set per table: a view has no property of its
own to carry it.

## 4. Check it every time it runs

Put a `quality` task at the end of the pipeline that writes the table. Each entry in its `checks` list is
one SQL assertion, and a check passes when its query returns no rows:

```yaml
    - name: checks
      kind: quality
      dependsOn: [gold]
      checks:
        - name: no_null_station
          sql: SELECT station_uuid FROM gold.water.levels_v1 WHERE station_uuid IS NULL
```

A failed check fails the run, and the run page's **Checks** card lists every check with `Passed`,
`Failed`, `Warned` or `Not run yet` and its row count. The run page is where a check is reported: the
checks belong to the run, not (yet) to the table page's status, so the last run is where to look before
trusting a table whose page looks fine. See [Publish only checked data](./checked-publishing.md) for the
task, the `checks` list and the WAP mode that gates the publish on them.

Some numbers are worth checking between runs. A verified query on the table page keeps a question, its
statement and the answer it should return; **Check now** runs it and shows the difference, and
`stardelt api verified_queries_check_all` runs every query of a table from a scheduled job and fails when
one fails. Both are described in [the catalog and the table page](./catalog.md), "Verified queries".

## 5. Write down how to use it

Fill **About this table**: a description, tags, a domain and the **How to use this table** guide. The
guide is the part a new reader needs — which columns join, which rows to leave out, what the numbers
mean — and it is edited under the same owner rule as the rest of the card. It travels as the Iceberg
property `stardelt.guide` and is read by people and by agents through the `table_documentation` tool
([the MCP and agent guide](./mcp.md)). A view has no **About this table** card, so write this on the
table the view selects from ([the catalog and the table page](./catalog.md)).

## 6. Say who may read it, and how to ask

Access is granted to groups, per catalog: `browse`, `select`, `write`, `create` and `manage`, with
`write` including `select` and `select` and `create` including `browse`. There is no table-level grant in
this release, so publishing a table in a catalog also means deciding which group may read that catalog
([access to catalogs and the network](../operations/access.md)).

A person asks for access with a request that names the catalog, the group, what is asked for and a reason
of at most 500 characters. `POST /api/access-requests` records it; the requester lists their own requests
with `GET /api/access-requests` and withdraws one with `DELETE /api/access-requests/{id}`, which marks it
`withdrawn` and deletes nothing. The request changes no grant: an administrator grants the verbs on the
Catalogs page ([the access-request routes](../reference/api/access-requests.md)). Nova does not approve
a request itself yet.

## 7. Publish it, and retire it with a successor

In **About this table**, set **Data product** to `draft` while you build it and to `published` when it is ready.
Nova refuses `published` until the table has an owner, a description and a domain, and while one of its
verified queries failed its last check (step 4). The refusal names the question and the difference, for example
`a published table may not have a failed check: "How many orders in March?" — the result differs: expected 1284, got 1279`.
Fix the table or the query, run **Check now**, and publish again. A draft row on **Share → Data products** has its
own **Publish** button; it stays disabled until the table has an owner, a description and a domain, and any other
refusal appears above the list in Nova's words. A table that is a data product
appears on **Share → Data products**, grouped by domain, with its owner and a state badge.
`GET /api/catalog/products` and `stardelt api catalog_products` give the same list.

A row shows the table, its description, its owning group, its **Freshness**, its **Readers** (the people and
services that read it in the last 30 days, from the query log) and its **State**.
Freshness is the promise the table's owner set in step 3 — `Fresh`, `Late (grace)`, `Late`, or
`—` when the table promises no time — read from the same catalog-health answer the Overview
uses; point at the badge to see the promise in words.

To retire a data product, set it to `deprecated` and name its successor in **Replaced by**
(`catalog.schema.table`); a deprecated table must name one. The table page and the list then say
`replaced by` that table, so readers know where to move.

## The checklist

- [ ] Does the table page name one owning group?
- [ ] Does anyone read a versioned view (`…_v1`) rather than the table itself?
- [ ] Does the table promise a time, with a timezone and a grace, and does it show `green`?
- [ ] Does the pipeline that writes it have a `quality` task whose failed check fails the run?
- [ ] Does **About this table** hold a description, tags, a domain and a **How to use this table** guide?
- [ ] Can a reader find the group to ask and record a request that says what and why?
- [ ] Is the table `published` on **Data products**, and does a retired one name its replacement?

## A worked example

[A demo that updates itself: PEGELONLINE](./pegelonline-demo.md) is the example to follow.
`demos/examples/pegelonline/pipeline.yaml` in `stardelt/stardelt` deduplicates the bronze rows into
`shared.silver.pegelonline_measurements`, builds two gold tables from them —
`pegelonline_station_latest` and `pegelonline_station_hourly` — and ends in a `checks` task with three
checks: `station_uuid_present`, `one_row_per_measurement` and `value_in_range`. It has no versioned view
yet; that is the next step for it.

## Next

- [Publish pipelines from Git](./publish-pipelines.md) — the bundle a team keeps in Git.
- [Bundle reference](./bundle-reference.md) — every key of that bundle.
- [Publish only checked data](./checked-publishing.md) — the `quality` task and the publish gate.
