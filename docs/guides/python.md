---
title: "Python in notebooks and scripts"
sidebar_label: "Python"
slug: /guides/python
description: "Use the stardelt Python package to call the same API as Nova from a notebook, a script or CI."
---

# Python in notebooks and scripts

Everything you can do in Nova's interface is also a call to its public API. One Python package, `stardelt`, wraps that
API for notebooks and scripts; the same operations are the commands on [The command line](./cli) and the tools of
[AI assistants (MCP)](./mcp), so a new Nova route is available in all of them as soon as the package is refreshed.

## Install

```bash
pip install "stardelt @ https://github.com/stardelt/stardelt/releases/download/v0.0.4/stardelt-0.0.4-py3-none-any.whl"
```

The package is not on PyPI: this installs the current release, `v0.0.4`, from its
[release page](https://github.com/stardelt/stardelt/releases). A newer release has a newer file.

Use the command from the same release as your Nova: a release ships the client that speaks to it,
and a client of another release warns once per command with the install line for the server's
version. See [the client that goes with a release](../operations/upgrade#the-client-that-goes-with-a-release).

## Sign in

In a notebook on the platform, the helper already knows who you are; nothing to set up. Outside a notebook, sign in once with a
code you approve in a browser (the device flow of your identity provider):

```bash
export STARDELT_NOVA_URL=https://nova.example.com
stardelt login
stardelt whoami
```

`stardelt login` asks Nova which identity provider to use, so the Nova address is all it needs. It prints a link and a short
code; open the link on any device, check the code and approve. If you want to name the provider yourself, pass its realm address
with `--issuer` (or set `STARDELT_ISSUER`) and Nova is not asked; `--client-id` names another public client. The command keeps the
sign-in in `~/.config/stardelt/credentials.json` (readable only by you), renews it shortly before it expires and remembers the
Nova address you gave. `stardelt logout` deletes the file. In CI, where nobody can approve a code, set `STARDELT_TOKEN` to a
bearer access token instead (it must carry the audience Nova accepts); when it is set it wins over the stored sign-in.

The token is only ever sent to Nova, in the `Authorization` header. It is never printed or logged. What you may do is decided
by Nova from your groups, exactly as in the interface.

## The client

```python
import stardelt

nova = stardelt.api.Client()
nova.call("table_history", path={"ns": "demo", "tbl": "trips"})
nova.call("pipelines_run_trigger", path={"namespace": "etl", "name": "nyc_taxi"})
```

`call` takes the operation id, the values of the path, the query parameters and the JSON body, and returns the parsed answer.
A missing or unexpected path value is an error before any request is sent.

Every operation is also a method, grouped by resource, so a notebook can complete the names with the Tab key:

```python
nova.ops.pipelines.list()
nova.ops.pipelines.get(namespace="etl", name="nyc_taxi")
nova.ops.query.log_list(scope="mine", state="FAILED", limit=20)
dir(nova.ops)                    # the resources; dir(nova.ops.pipelines) lists the verbs
```

The keyword arguments are the path and query parameters of the operation, `body=` is the JSON body, and a wrong name is an
error that lists the accepted ones before any request is sent.

## Long-running SQL

:::note Which catalog the examples use
The examples name `warehouse`, the platform's own catalog. On an install with sign-in it is
**administrators only** — use a catalog your groups were granted. The **Catalogs** page lists yours, and
`SHOW CATALOGS` answers the same question in the SQL editor.
:::

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

No request stays open while the query runs, and a statement that fails stops with the engine's sentence (the command exits `1`). The calls above are for
when you want the handle yourself.

The states are `PENDING`, `RUNNING`, `SUCCEEDED`, `FAILED` (with an `error` sentence) and `CANCELED`. `waitSeconds` (0 to 30, default 5 on
submit) is how long the call waits for the statement to end: when it ends in that time the answer already holds the first chunk in
`rows`, so a short query needs one call. A statement keeps at most 100 000 rows or about 64 MiB of data, whichever comes first; past that it ends `SUCCEEDED` with `truncated: true`. Add `"maxRows": 500` (1 to 100 000) to the request to keep only the first 500 rows: when the engine has more, the query is cancelled in the engine and the statement ends the same way.

Only you can read or cancel your statements, and you can hold ten at a time. While Nova holds a great many results for all people together, a new
statement is refused with `429`: read or cancel one, or try again in a few minutes. Results are kept for one hour after you last asked for
them, and Nova restarts forget them. Poll at least every five minutes: the query engine cancels a query nobody asks about, and the
statement then reads `CANCELED`.

## What next

- [The command line](./cli): every command, with an example each.
- [Pipelines from the command line](cli.md#pipelines-from-the-command-line): deploy from a file, publish a bundle, run and wait.
- [AI assistants (MCP)](mcp.md): let an assistant use the platform as you.
