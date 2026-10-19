---
title: "The query log"
sidebar_label: "The query log"
slug: /guides/query-log
---

# The query log

Every statement that runs on the platform's query engine is kept in a per-person log in Nova: what you ran, where it came
from, how long it took, how many rows it returned and why it failed. It covers queries from the SQL editor, from notebooks,
from dashboards and from scheduled pipelines, so you do not have to remember where you ran something. Open **Query log** in
the left navigation.

## What you see

Simple by default: one row per query with six columns.

| Column | Meaning |
|---|---|
| Status | **In progress**, **Succeeded**, **Failed** or **Canceled** |
| Query | The first line of the statement; hover for more |
| Warehouse | The compute class the query ran in |
| Started | When it started ("3 minutes ago"; hover for the exact time) |
| Duration | Wall-clock time from start to finish |
| Rows | Rows the query returned |

Click a row to open its details. They are grouped and collapsed, so you read only what you need:

- **Statement:** the whole statement, with **Copy** and **Open in SQL editor** buttons.
- **Facts:** query id, start time, source and the catalog and schema the session used.
- **Timing:** time waiting in the queue, planning and executing, and the CPU time used.
- **Data:** rows and bytes read from storage, rows and bytes returned, rows and bytes written.
- **Memory:** the peak memory the query used.
- **Tables:** which tables it read and which it wrote.
- For a failed query: the engine's error name and message.

The **Columns** menu adds more columns to the list: user, source, statement type, error and query id. Your choice is
remembered in your browser.

## Finding a query

- **Status** chips filter by outcome, for example only the failures.
- **Time range** limits the list to the last hour, 24 hours, 7 days, 30 days or all time.
- **Search** looks in the statement text and in query ids.
- The list loads in pages; **Load more** at the end fetches the next page. A small indicator in the header says the list is live and updating.

## Where a query came from

The **Source** column (and the detail view) says which tool sent the statement, so you can tell your own work apart:
**SQL editor**, **Pipeline task**, **Superset**, **Python client**, **JDBC client**, **Trino CLI**, or **Nova** for
statements Nova runs for itself, such as loads and transfers. Tools that do not identify themselves show their own name or
a dash.

## Who sees what

You see **your own queries**. A scheduled pipeline's tasks run as a service principal, so their queries appear under the
principal's name, not under yours. Administrators can switch to **Everyone** to see every query on the platform. Nobody
else's statements are visible to you, including in the engine's own web interface: that interface is for administrators
only, and this page is the view for everybody else.

## What is kept, and for how long

Nova stores the statement text, who ran it, the timing and the counters above, in its own database. Statements longer than about
100 KB are cut. The text of catalog-management statements, which carry connection credentials, has those values
replaced by `***` before it is stored. Nothing else is rewritten, so do not put secrets into SQL text.

Rows are removed after 90 days by default. An administrator changes this with the environment variable
`NOVA_QUERY_LOG_RETENTION_DAYS` on Nova (`0` keeps everything).

## For developers

The page is a thin view over the API, which you can call with a bearer token of your own:

```bash
curl -H "Authorization: Bearer $TOKEN" "https://nova.<your-domain>/api/query-log?limit=20"
curl -H "Authorization: Bearer $TOKEN" "https://nova.<your-domain>/api/query-log/<query id>"
```

The list is keyset-paged: a response carries `nextCursor`; pass it as `cursor` to get the next page. It accepts the filters the
page uses (`scope` = `mine` or `all`, `state`, `q`, `warehouse` and `limit`). The detail endpoint returns the same groups as the
page. The API description is at `/api/openapi.json` on your Nova.
