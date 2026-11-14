---
title: "Long-running SQL"
sidebar_label: "Long-running SQL"
slug: /guides/sql-statements
---

# Long-running SQL

You need the stardelt package, signed in: see [Python, command line and agents](sdk-cli-mcp.md).

:::note Which catalog the examples use
The examples name `warehouse`, the platform's own catalog. On an install with sign-in it is
**administrators only** — use a catalog your groups were granted. The **Catalogs** page lists yours, and
`SHOW CATALOGS` answers the same question in the SQL editor.
:::

## Long-running SQL: statements

`stardelt sql` holds one request open until the query ends and returns at most 50 000 rows or about 64 MiB of data. For longer queries, or when you need
to cancel one from another process, submit a *statement*: you get a handle at once, poll it, read the rows in chunks of 1 000 and
cancel it by its id.

```bash
stardelt statements submit --body '{"sql": "select * from warehouse.demo.trips", "waitSeconds": 0}'   # answers with a statementId
stardelt statements get STATEMENT_ID -q waitSeconds=10     # waits up to 10 seconds for it to end, then answers with its state
stardelt statements chunk-get STATEMENT_ID 0               # rows 0 to 999; the next chunk is 1
stardelt statements cancel STATEMENT_ID                    # stops it in the query engine and forgets it
```

```python
nova = stardelt.api.Client()
statement = nova.ops.statements.submit(body={"sql": "select * from warehouse.demo.trips", "waitSeconds": 0})
while statement["state"] in ("PENDING", "RUNNING"):
    statement = nova.ops.statements.get(id=statement["statementId"], waitSeconds=10)
rows = nova.ops.statements.chunk_get(id=statement["statementId"], n=0)["rows"]
```

Over plain HTTP a chunk can also come as CSV, for a spreadsheet or a script: ask for it with `Accept: text/csv`. Chunk 0 starts with a row of the column
names and the other chunks have none, so the chunks joined in order are one file; an empty cell is a null.

```bash
curl -s -H "Authorization: Bearer $STARDELT_TOKEN" -H 'Accept: text/csv' "$STARDELT_NOVA_URL/api/statements/STATEMENT_ID/chunks/0"
```

When you just want the rows at the end, let the command or the notebook method do the submitting, polling and cancelling for you:

```bash
stardelt sql "select * from warehouse.demo.trips" --long    # table, --format json or csv; up to 100 000 rows; Ctrl-C cancels it in the engine
```

```python
nova.statement("select * from warehouse.demo.trips").to_pandas()
```

No request stays open while the query runs, and a statement that fails stops with the engine's sentence (the command exits `1`). The calls below are for
when you want the handle yourself.

The states are `PENDING`, `RUNNING`, `SUCCEEDED`, `FAILED` (with an `error` sentence) and `CANCELED`. `waitSeconds` (0 to 30, default 5 on
submit) is how long the call waits for the statement to end: when it ends in that time the answer already holds the first chunk in
`rows`, so a short query needs one call. A statement keeps at most 100 000 rows or about 64 MiB of data, whichever comes first; past that it ends `SUCCEEDED` with `truncated: true`. Add `"maxRows": 500` (1 to 100 000) to the request to keep only the first 500 rows: when the engine has more, the query is cancelled in the engine and the statement ends the same way.

Only you can read or cancel your statements, and you can hold ten at a time. While Nova holds a great many results for all people together, a new
statement is refused with `429`: read or cancel one, or try again in a few minutes. Results are kept for one hour after you last asked for
them, and Nova restarts forget them. Poll at least every five minutes: the query engine cancels a query nobody asks about, and the
statement then reads `CANCELED`.
