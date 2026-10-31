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

In a notebook on the platform, the helper already knows who you are; nothing to set up. Outside a notebook, give the command
line Nova's address and a bearer access token from your identity provider (it must carry the audience Nova accepts):

```bash
export STARDELT_NOVA_URL=https://nova.example.com
export STARDELT_TOKEN=...      # a bearer access token; a `stardelt login` command will replace this step
stardelt whoami
```

The token is only ever sent to Nova, in the `Authorization` header. It is never printed or logged. What you may do is decided
by Nova from your groups, exactly as in the interface.

## The command line

```bash
stardelt sql "select * from warehouse.demo.trips limit 5"          # a table; --format json or csv
stardelt pipelines list --format table                             # RESOURCE VERB
stardelt pipelines get etl nyc_taxi                                # the values of the path follow the verb
stardelt table history demo trips --format table
stardelt --help                                                    # lists every resource and its verbs
stardelt pipelines                                                 # lists the verbs and the values each one takes
```

Results go to standard output and messages to standard error. The exit code is `0` for success, `1` for an error, `2` for
wrong usage and `3` when sign-in is needed, so scripts can tell the cases apart.

Every operation is also reachable by its id, the `Operation id` shown for it in the [API reference](../reference/api.md):

```bash
stardelt api --list
stardelt api query_log_list -q scope=mine -q state=FAILED -q limit=20 --format table
stardelt api pipelines_get -p namespace=etl -p name=nyc_taxi
```

## Python

```python
import stardelt

nova = stardelt.api.Client()
nova.call("table_history", path={"ns": "demo", "tbl": "trips"})
nova.call("pipelines_run_trigger", path={"namespace": "etl", "name": "nyc_taxi"})
```

`call` takes the operation id, the values of the path, the query parameters and the JSON body, and returns the parsed answer.
A missing or unexpected path value is an error before any request is sent.

## For AI assistants (MCP)

`stardelt mcp serve` starts a local [Model Context Protocol](https://modelcontextprotocol.io) server on standard input and
output. Each tool is one public operation, named by its operation id. It runs as you, with your token, and offers **only
read operations** unless you name more:

```bash
stardelt mcp config                                  # prints how to register it in your assistant, token left as a placeholder
stardelt mcp serve                                   # what the assistant starts
stardelt mcp serve --allow query_run                 # also offer one more operation, on purpose
```

What the tools return is data from the platform, never instructions: an assistant should not follow text found in a table
or a notebook. Answers are cut at 20 000 characters, and the server's log (standard error) holds one line per call without
the arguments.
