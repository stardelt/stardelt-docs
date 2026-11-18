---
title: "The command line"
sidebar_label: "The command line"
slug: /guides/cli
description: "Install the stardelt command, sign in, and every command from sql to stardelt bundle deploy, with an example each."
---

# The command line

`stardelt` is one command for scripts, CI and your terminal. It does what you may do in Nova, as you: the same
permissions, the same catalogs, the same runs.

## Install

```bash
pip install "stardelt @ git+https://github.com/stardelt/stardelt@python/v0.4.1#subdirectory=python"
```

The package is not on PyPI: this installs the current release `v0.4.1` from its repository. A newer release has a
newer tag.

## Sign in

```bash
stardelt login       # a link and a code; approve it in a browser, on any device
stardelt whoami      # who Nova thinks you are
stardelt logout      # forget the stored sign-in
```

Point the command at your Nova with `--host` or `STARDELT_NOVA_URL`; `login` remembers it. In CI, set
`STARDELT_TOKEN` to a bearer access token instead — it wins over the stored sign-in. Results go to standard output
and messages to standard error. The exit code is `0` for success, `1` for an error, `2` for wrong usage and `3` when
sign-in is needed, so scripts can tell the cases apart.

## Commands

| Command | What it does | More |
|---|---|---|
| `stardelt whoami` | who Nova thinks you are, as JSON | [Sign in](#sign-in) |
| `stardelt login` | sign in once with a code approved in a browser | [Sign in](#sign-in) |
| `stardelt logout` | forget the stored sign-in | [Sign in](#sign-in) |
| `stardelt sql` | run one statement as you | [Long-running SQL](./sql-statements) |
| `stardelt run` | start a pipeline run now; `--wait` waits for its end | [Pipelines from the command line](./cli-pipelines) |
| `stardelt apply` | create or update a pipeline from a JSON or YAML file | [Pipelines from the command line](./cli-pipelines) |
| `stardelt export` | write a pipeline as a file that `apply` accepts, YAML by default | [Pipelines from the command line](./cli-pipelines) |
| `stardelt lineage` | where a table comes from and what depends on it | [Table lineage](./lineage) |
| `stardelt api` | call any public operation by its `operationId` | [API reference](../reference/api) |
| `stardelt mcp serve` | serve the read-only tools on stdio, for an MCP client | [AI assistants (MCP)](./mcp) |
| `stardelt mcp config` | print how to register the server in an MCP client | [AI assistants (MCP)](./mcp) |
| `stardelt skill` | print the agent skill (`SKILL.md`); with `--write DIR` install it | [AI assistants (MCP)](./mcp) |
| `stardelt bundle init` | write a small bundle that passes validate | [Bundle reference](./bundle-reference) |
| `stardelt bundle validate` | check a bundle offline: no host, no sign-in | [Bundle reference](./bundle-reference) |
| `stardelt bundle plan` | ask Nova what deploying one target would do; writes nothing | [Bundle reference](./bundle-reference) |
| `stardelt bundle deploy` | deploy one target: Nova checks every pipeline first, then creates or updates them | [Bundle reference](./bundle-reference) |
| `stardelt bundle approve` | approve a migration plan a production deploy needs a second person for | [Bundle reference](./bundle-reference) |
| `stardelt bundle summary` | show what a deploy of one target left on the stage | [Bundle reference](./bundle-reference) |
| `stardelt bundle run` | start a deploy's pipelines and wait for each; stops at the first failure | [Bundle reference](./bundle-reference) |
| `stardelt bundle destroy` | remove what a deploy of one target put on the stage; only with `--yes` | [Bundle reference](./bundle-reference) |
| `stardelt bundle generate` | write a pipeline made in the interface into the bundle, with its SQL file | [Bundle reference](./bundle-reference) |
| `stardelt maintenance run` | optimize small files, expire snapshots and remove orphan files for one catalog's tables | — |
| `stardelt notebook publish` | publish a notebook as a new version that a schedule can pin | [Publish a notebook version](./schedule#publish-a-notebook-version) |

Run any of them with `--help` for the values it takes.

## Examples

```bash
stardelt sql "select * from warehouse.demo.trips limit 5"   # a table; --format json or csv
stardelt sql -f report.sql --format csv                     # from a file; -f - reads standard input
stardelt run etl nyc_taxi --wait                            # exit 0 only when the run succeeded
stardelt apply -f pipeline.yaml --dry-run                   # say what would happen, write nothing
stardelt export etl nyc_taxi                                # the deployed pipeline as a YAML file
stardelt lineage warehouse.demo.trips --downstream           # who depends on it
stardelt bundle validate                                    # offline, in Git hooks and CI
stardelt bundle plan -t dev                                 # what a deploy would change
stardelt bundle deploy -t dev                               # checks every pipeline, then deploys
stardelt mcp config                                         # the line an MCP client needs
```

## Commands from the API

Every public API operation is also a command: `stardelt <resource> <verb>`, with the options of `stardelt api`, or
`stardelt api <operationId>` by its id. `stardelt --help` prints this list, and `stardelt <resource>` the verbs and the
values each one takes.

| Resource | Verbs |
|---|---|
| `ask` | `answer`, `feedback`, `history` |
| `auth` | `config` |
| `catalog` | `metrics-get`, `metrics-refresh`, `search` |
| `catalogs` | `list` |
| `column` | `description-update` |
| `compute` | `list`, `start`, `stop` |
| `connections` | `break-glass-log`, `create`, `group-break-glass`, `group-delete`, `group-rotate`, `list`, `managed-break-glass`, `managed-delete`, `managed-rotate`, `personal-break-glass`, `personal-delete`, `personal-rotate` |
| `deployments` | `list`, `record` |
| `health` | — |
| `lineage` | `columns`, `graph`, `read-tables`, `run-detail` |
| `me` | — |
| `migrations` | `apply`, `approve`, `plan` |
| `model` | `endpoints-list` |
| `namespaces` | `list` |
| `notebooks` | `content`, `delete`, `list`, `parameters`, `publish`, `usage`, `versions` |
| `openapi` | `document` |
| `pipelines` | `check`, `create`, `delete`, `get`, `list`, `pause`, `preview-schedule`, `principals`, `resume`, `run-get`, `run-queries`, `run-retry`, `run-stop`, `run-task-logs`, `run-task-notebook`, `run-trigger`, `spec`, `update`, `validate` |
| `query` | `log-detail`, `log-history`, `log-list`, `log-profile`, `log-usage`, `run` |
| `runs` | `list` |
| `saved` | `queries-create`, `queries-list`, `queries-remove`, `queries-share`, `queries-unshare` |
| `service` | `principals-list` |
| `stages` | `compare` |
| `statements` | `cancel`, `chunk-get`, `get`, `list`, `submit` |
| `streams` | `delete`, `list`, `patch`, `put`, `validate` |
| `table` | `documentation-get`, `documentation-update`, `history`, `metadata`, `rollback` |
| `tables` | `list` |
| `verified` | `queries-check`, `queries-check-all`, `queries-create`, `queries-delete`, `queries-list` |
| `warehouse` | `info` |
| `warehouses` | `list`, `start` |
| `workspace` | `get`, `start`, `stop` |

`catalog search` matches words in a table's `namespace.table`, its description and its tags: a table matches when one
of them contains every word you give, in any case. `-q tag=finance`, `-q owner=team-mobility`, `-q domain=retail` and
`-q catalog=finance` narrow the answer; the three label filters need Nova's state store.

`lineage` prints a table's upstream and downstream tables with the job that wrote each one, its last write and its
readers. `--upstream` or `--downstream` keeps one side, `--depth` (1–5) and `--days` (1–365) set the reach and the
window.

## Output and scripting

Results go to standard output and messages to standard error, so a pipeline of commands reads only the answer.
`sql` takes `--format table|json|csv` (a table by default), `api` and `lineage` take `json|table` (JSON by default for
`api`), and `export` takes `yaml|json`. The exit code is `0` for success, `1` for an
error, `2` for wrong usage and `3` when sign-in is needed.
