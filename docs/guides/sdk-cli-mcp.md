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

:::note Which catalog the examples use
The examples name `warehouse`, the platform's own catalog. On an install with sign-in it is
**administrators only** — use a catalog your groups were granted. The **Catalogs** page lists yours, and
`SHOW CATALOGS` answers the same question in the SQL editor.
:::

```bash
pip install "stardelt @ git+https://github.com/stardelt/stardelt-python@v0.2.0"
```

The package is not on PyPI: this installs the release `v0.2.0`, the first one that contains the `stardelt` command, straight from
its repository. A newer release has a newer tag.

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
stardelt sql -f report.sql --format csv                          # the statement from a file; -f - reads standard input
stardelt pipelines list --format table                             # RESOURCE VERB
stardelt pipelines get etl nyc_taxi                                # the values of the path follow the verb
stardelt table history demo trips --format table
stardelt lineage warehouse.demo.trips --downstream                     # who depends on it; --upstream, --depth, --days
stardelt catalog search -q q=trips --format table                  # words from a name, a description or a tag
stardelt catalog search -q q=revenue -q tag=finance --format table # narrow by tag, owner or domain
stardelt --help                                                    # lists every resource and its verbs
stardelt pipelines                                                 # lists the verbs and the values each one takes
```

`catalog search` matches words in a table's `namespace.table`, in its description and in its tags: a table matches when one of them
contains every word you give, in any case. Descriptions and tags come from Nova's state store; a deployment without one matches names
only. `-q tag=finance`, `-q owner=team-mobility` and `-q domain=retail` narrow the answer to one label, owner group or domain — those
three need the state store, and the command exits `1` with `the state store is disabled; tag, owner and domain filters need it`
without it. `-q catalog=finance` searches another catalog and `-q limit=50` asks for more than the 20 matches you get by default; the
answer says `truncated: true` when it is only a beginning, so narrow the words. Nova looks only at the tables you may browse. In
Python: `nova.ops.catalog.search(q="trips")["matches"]`.

`stardelt lineage` prints a table's upstream and downstream tables with the job that wrote each one, its last write and its readers. `--upstream` or `--downstream` keeps one side, `--depth` (1–5) and `--days` (1–365) set the reach and the window, and `--format json` prints the answer Nova's graph API returns. The guide is [Table lineage](./lineage).

Results go to standard output and messages to standard error. The exit code is `0` for success, `1` for an error, `2` for
wrong usage and `3` when sign-in is needed, so scripts can tell the cases apart.

Every operation is also reachable by its id, the `Operation id` shown for it in the [API reference](../reference/api.md):

```bash
stardelt api --list
stardelt api query_log_list -q scope=mine -q state=FAILED -q limit=20 --format table
stardelt api pipelines_get -p namespace=etl -p name=nyc_taxi
stardelt notebooks publish analytics trips.ipynb --body @trips.ipynb     # @FILE reads the body from a file, @- from standard input
```

## What next
- [Pipelines from the command line](cli-pipelines.md): deploy from a file, publish a bundle, run and wait.
- [Long-running SQL](sql-statements.md): statements that outlive one request.
- [Python in notebooks and scripts](python.md): the client.
- [AI assistants (MCP)](mcp.md): let an assistant use the platform as you.
