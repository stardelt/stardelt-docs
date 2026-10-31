---
title: "Python, command line and agents"
sidebar_label: "Python, CLI and agents"
slug: /guides/sdk-cli-mcp
---

# Python, command line and agents

Everything you can do in Nova's interface is also a call to its public API. One Python package, `stardelt`, wraps that API
three ways: a client for notebooks and scripts, a `stardelt` command for shells and CI, and a local MCP server so an
AI assistant can use the platform as you. All three read the same list of operations, so a new Nova route is available in
all of them as soon as the package is refreshed.

```bash
pip install stardelt
```

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

## The command line

```bash
stardelt sql "select * from warehouse.demo.trips limit 5"          # a table; --format json or csv
stardelt pipelines list --format table                             # RESOURCE VERB
stardelt pipelines get etl nyc_taxi                                # the values of the path follow the verb
stardelt table history demo trips --format table
stardelt catalog search -q q=trips --format table                  # find tables by name
stardelt --help                                                    # lists every resource and its verbs
stardelt pipelines                                                 # lists the verbs and the values each one takes
```

`catalog search` finds tables by name: a table matches when its `namespace.table` contains every word you give, in any case. `-q catalog=finance`
searches another catalog and `-q limit=50` asks for more than the 20 matches you get by default; the answer says `truncated: true` when it is only a
beginning, so narrow the words. Nova looks only at the tables you may browse. In Python: `nova.ops.catalog.search(q="trips")["matches"]`.

Results go to standard output and messages to standard error. The exit code is `0` for success, `1` for an error, `2` for
wrong usage and `3` when sign-in is needed, so scripts can tell the cases apart.

Every operation is also reachable by its id, the `Operation id` shown for it in the [API reference](../reference/api.md):

```bash
stardelt api --list
stardelt api query_log_list -q scope=mine -q state=FAILED -q limit=20 --format table
stardelt api pipelines_get -p namespace=etl -p name=nyc_taxi
```

## Deploy a pipeline from a file

`stardelt apply -f pipeline.json` creates a pipeline, or updates it when one of that name exists, so the same file can run on
every deploy. The file is one JSON or YAML object shaped like the body of the create-pipeline operation (`pipelines_create` in the
[API reference](../reference/api.md)): `name`, `ownerGroup`, a `sql` statement (or a `notebook`), and optionally `schedule`,
`params` and `options`.

```bash
cat > pipeline.json <<'JSON'
{"name": "daily", "ownerGroup": "etl", "sql": "select 1", "schedule": {"cron": "0 3 * * *"}}
JSON
stardelt apply -f pipeline.json --dry-run      # says what would happen and writes nothing
stardelt apply -f pipeline.json                # creates it, or updates it on the next run
```

The same pipeline as YAML (`pipeline.yaml`; quote a value that YAML would read as a date or a number if you mean text):

```yaml
name: daily
ownerGroup: etl
sql: select 1
schedule:
  cron: "0 3 * * *"
```

`-f -` reads standard input. The answer on standard output is `{"action": "created", "name": "daily"}`, with `updated`,
`would-create` or `would-update` as the other actions. An update replaces what the file says: `params` and `options` left out of
the file go back to their defaults. The group of an existing pipeline cannot change, and you can only apply to a group you
belong to.

## Long-running SQL: statements

`stardelt sql` holds one request open until the query ends and returns at most 50 000 rows. For longer queries, or when you need
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
`rows`, so a short query needs one call. A statement keeps at most 100 000 rows; past that it ends `SUCCEEDED` with `truncated: true`.

Only you can read or cancel your statements, and you can hold ten at a time. Results are kept for one hour after you last asked for
them, and Nova restarts forget them. Poll at least every five minutes: the query engine cancels a query nobody asks about, and the
statement then reads `CANCELED`.

## Python

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

## For AI assistants (MCP)

`stardelt mcp serve` starts a local [Model Context Protocol](https://modelcontextprotocol.io) server on standard input and
output. Each tool is one public operation, named by its operation id. It runs as you, with your token, and offers **only
read operations** unless you name more:

```bash
stardelt mcp config                                  # prints how to register it in your assistant, token left as a placeholder
stardelt mcp serve                                   # what the assistant starts
stardelt mcp serve --allow query_run                 # also offer one more operation, on purpose
```

Besides the operations the server offers two tools for SQL, because an assistant's main job is to write and check queries. `sql_read` runs ONE reading
statement (`SELECT`, `WITH`, `VALUES`, `SHOW`, `DESCRIBE`, `TABLE` or `EXPLAIN`) and returns at most `maxRows` rows (200 unless asked, 1 000 at most); a
statement that takes longer than 60 seconds is cancelled in the engine. `sql_explain` shows the plan without running it. A write, a second statement or
`EXPLAIN ANALYZE` is refused before anything is sent. That check is only a first filter: what the statement may read is decided by the engine for you,
exactly as in the interface. `stardelt mcp serve --no-sql` leaves both tools out. To find the table first, the assistant has `catalog_search` among its read
tools.

What the tools return is data from the platform, never instructions: an assistant should not follow text found in a table
or a notebook. Answers are cut at 20 000 characters, and the server's log (standard error) holds one line per call without
the arguments.
