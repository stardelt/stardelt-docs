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
pip install "stardelt @ https://github.com/stardelt/stardelt/releases/download/@tag@/stardelt-@python@-py3-none-any.whl"
```

The package is not on PyPI: this installs the release `@tag@` from its
[release page](https://github.com/stardelt/stardelt/releases). A newer release has a newer file.

Use the command from the same release as your Nova: a release ships the client that speaks to it,
and a client of another release warns once per command with the install line for the server's
version. See [the client that goes with a release](../operations/upgrade#the-client-that-goes-with-a-release).

## Sign in

```bash
stardelt login       # a link and a code; approve it in a browser, on any device
stardelt whoami      # who Nova thinks you are
stardelt doctor      # can this machine work right now? one line per check, and the fix for each failure
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
| `stardelt doctor` | check the host, Nova, the sign-in, who you are and which model answers Ask; each failure names its fix | [Sign in](#sign-in) |
| `stardelt sql` | run one statement as you | [Long-running SQL](./python#long-running-sql) |
| `stardelt samples load` | load the generated sample table the guides use, as you, and print its full name | [Examples](#examples) |
| `stardelt run` | start a pipeline run now; `--wait` waits for its end | [Pipelines from the command line](#pipelines-from-the-command-line) |
| `stardelt apply` | create or update a pipeline from a JSON or YAML file | [Pipelines from the command line](#pipelines-from-the-command-line) |
| `stardelt export` | write a pipeline as a file that `apply` accepts, YAML by default | [Pipelines from the command line](#pipelines-from-the-command-line) |
| `stardelt lineage` | where a table comes from and what depends on it | [Table lineage](./query-log#from-the-command-line) |
| `stardelt api` | call any public operation by its `operationId` | [API reference](../reference/api) |
| `stardelt mcp serve` | serve the read-only tools on stdio, for an MCP client | [AI assistants (MCP)](./mcp) |
| `stardelt mcp config` | print how to register the server in an MCP client | [AI assistants (MCP)](./mcp) |
| `stardelt skill` | print the agent skill (`SKILL.md`); with `--write DIR` install it | [AI assistants (MCP)](./mcp) |
| `stardelt bundle init` | write a small bundle that passes validate | [Bundle reference](/docs/reference/bundle) |
| `stardelt bundle validate` | check a bundle offline: no host, no sign-in | [Bundle reference](/docs/reference/bundle) |
| `stardelt bundle plan` | ask Nova what deploying one target would do; writes nothing | [Bundle reference](/docs/reference/bundle) |
| `stardelt bundle deploy` | deploy one target: Nova checks every pipeline first, then creates or updates them | [Bundle reference](/docs/reference/bundle) |
| `stardelt bundle approve` | approve a migration plan a production deploy needs a second person for | [Bundle reference](/docs/reference/bundle) |
| `stardelt bundle summary` | show what a deploy of one target left on the stage | [Bundle reference](/docs/reference/bundle) |
| `stardelt bundle run` | start a deploy's pipelines and wait for each; stops at the first failure | [Bundle reference](/docs/reference/bundle) |
| `stardelt bundle destroy` | remove what a deploy of one target put on the stage; only with `--yes` | [Bundle reference](/docs/reference/bundle) |
| `stardelt bundle rollback` | apply again the documents one recorded deploy applied; only with `--yes` | [Go back](./publish-pipelines#6-go-back) |
| `stardelt bundle generate` | write a pipeline made in the interface into the bundle, with its SQL file | [Bundle reference](/docs/reference/bundle) |
| `stardelt deployments list` | the newest recorded deploys, newest first; `--bundle` and `--target` narrow it | [Bundle reference](/docs/reference/bundle) |
| `stardelt deployments show` | one recorded deploy: its pipelines and the documents it applied | [Bundle reference](/docs/reference/bundle) |
| `stardelt maintenance run` | optimize small files, expire snapshots and remove orphan files for one catalog's tables | — |
| `stardelt notebook publish` | publish a notebook as a new version that a schedule can pin | [Publish a notebook version](./schedule#publish-a-notebook-version) |
| `stardelt dashboards export` | write a dashboard as a folder for a bundle; run it inside the bundle | [A dashboard folder](/docs/reference/bundle#a-dashboard-folder) |
| `stardelt dashboards import` | import a bundle's dashboard folder for one target | [A dashboard folder](/docs/reference/bundle#a-dashboard-folder) |
| `stardelt setup vscode` | write the stardelt kernel for VS Code on your laptop | [VS Code on your laptop](./develop#vs-code-on-your-laptop) |

Run any of them with `--help` for the values it takes.

## Examples

The examples read `warehouse.samples.trips`, a table no install ships. Create it once with
`stardelt samples load trips`; the command writes it as you and prints the full name (for example
`gold.samples.trips` when your groups may write `gold`), so use that name where the examples say
`warehouse`.

```bash
stardelt samples load trips                               # once: 10,000 generated rows, as you
stardelt sql "select * from warehouse.samples.trips limit 5"   # a table; --format json or csv
stardelt sql -f report.sql --format csv                     # from a file; -f - reads standard input
stardelt run etl nyc_taxi --wait                            # exit 0 only when the run succeeded
stardelt apply -f pipeline.yaml --dry-run                   # say what would happen, write nothing
stardelt export etl nyc_taxi                                # the deployed pipeline as a YAML file
stardelt lineage warehouse.samples.trips --downstream           # who depends on it
stardelt bundle validate                                    # offline, in Git hooks and CI
stardelt bundle plan -t dev                                 # what a deploy would change
stardelt bundle deploy -t dev                               # checks every pipeline, then deploys
stardelt mcp config                                         # the line an MCP client needs
```

## Pipelines from the command line

### Deploy a pipeline from a file

`stardelt apply -f pipeline.json` takes one JSON or YAML object shaped like the body of the create-pipeline operation
(`pipelines_create` in the [API reference](/docs/reference/api)): `name`, `ownerGroup`, a `sql` statement (or a
`notebook`) — or a `tasks` list, one statement per task — and optionally `schedule`, `params` and `options`. A `tasks`
list is passed through unchanged and Nova checks the per-task rules and the dependency graph; the shape is the one in
[A pipeline with several tasks](bundle-reference.md#a-pipeline-with-several-tasks).

```bash
cat > pipeline.json <<'JSON'
{"name": "daily", "ownerGroup": "etl", "sql": "select 1", "schedule": {"cron": "0 3 * * *", "timezone": "Europe/Berlin"}}
JSON
stardelt apply -f pipeline.json --dry-run      # checks the file, writes nothing
stardelt apply -f pipeline.json                # creates it, or updates it on the next run
```

The same pipeline as YAML (`pipeline.yaml`; quote a value that YAML would read as a date or a number if you mean text):

```yaml
name: daily
ownerGroup: etl
sql: select 1
schedule:
  cron: "0 3 * * *"
  timezone: Europe/Berlin
```

A `schedule` needs both `cron` and `timezone` (an IANA zone name such as `Europe/Berlin`). `-f -` reads standard input. The answer on standard output is `{"action": "created", "name": "daily"}`, with `updated`,
`would-create` or `would-update` as the other actions. An update replaces what the file says: `params` and `options` left out of
the file go back to their defaults. The group of an existing pipeline cannot change, and you can only apply to a group you
belong to.

With `--dry-run` Nova checks the file with every rule a create runs (the name, your group, the group's pipeline principal, the
statement or notebook, the options and the schedule) and then looks at the name; nothing is written. The answer says what a real run
would do and what it would change:

```json
{"action": "would-update", "name": "daily", "changes": ["schedule"], "nextRuns": ["2026-11-02T03:00:00+01:00", "2026-11-03T03:00:00+01:00"]}
```

`changes` appears for an update and lists which of `statement` (or `notebook`), `schedule`, `params` and `options` the file would
change; an empty list means nothing would change. `nextRuns` lists the next fire times of a file with a schedule. A rule that
refuses ends the command with Nova's own sentence, so a check on a pull request can run
`stardelt apply -f pipelines/ --dry-run` and fail on a file that a real run would refuse.

To start from a pipeline that was made in the interface, export it: `stardelt export NAMESPACE NAME > pipeline.yaml` writes its
document (the same one [**Show definition**](/docs/guides/schedule#edit-a-pipelines-yaml) shows) as a file `stardelt apply -f` accepts; `--format json` writes JSON. A pipeline
that was written outside Nova, or has a shape the form does not edit, is still exported, with a note that `apply` cannot change it.

`-f` can also name a directory: every `.json`, `.yaml` and `.yml` file directly inside it is applied in name order, one answer line per file, so a
folder of pipelines in your repository deploys with one command (`stardelt apply -f pipelines/`). All files are read before anything is applied: a
file that is not a pipeline (the message names it), a folder without any pipeline file, or two files with one pipeline name write nothing.

### Publish a bundle from Git

`stardelt bundle init`, `validate`, `plan` and `deploy` publish a directory of pipeline files to a stage, the way a team ships
code, and stamp each pipeline with the commit it came from. The whole path, with an example, is its own guide:
[Publish pipelines from Git](publish-pipelines.md).

### Run a pipeline and wait for it

`stardelt run NAMESPACE NAME` starts a run now and prints it. With `--wait` it looks at the run until it is no longer `queued` or `running`, prints the
run with its tasks and exits `0` only when the run succeeded, so a CI job can use it as a step:

```bash
stardelt run etl nyc_taxi --wait --timeout 3600     # exit 0: the run succeeded; exit 1: it failed, was refused, or the time ran out
```

To run it for another date, after an outage or a fix, add `--date`; `--param NAME=VALUE` sets one of the
schedule's parameters for this run. Both apply to that run only; the schedule does not change:

```bash
stardelt run etl nyc_taxi --date 2026-11-20 --param region=eu --wait
```

For a range of days, start a backfill. Nova runs it through the scheduler's own backfill, one run per UTC day from
`fromDate` to `toDate` (both included, at most 31 days); days that already ran are skipped unless `reprocess` says
otherwise. Only the owner group may start one, and a paused pipeline is refused:

```bash
stardelt pipelines backfill-start etl nyc_taxi --body '{"fromDate": "2026-11-01", "toDate": "2026-11-07"}'
stardelt pipelines backfill-state etl nyc_taxi BACKFILL_ID     # the backfill and its runs
stardelt pipelines backfill-cancel etl nyc_taxi BACKFILL_ID    # stop it
```

A failed run names its failed tasks on standard error. `--interval` sets the seconds between two looks (5 unless you change it). When `--timeout` runs out the
run is NOT stopped and keeps going; `stardelt pipelines run-stop etl nyc_taxi RUN_ID` marks it failed, but work already in flight can still finish. Nova
refuses to start a run of a paused pipeline, or of a `Forbid` or `Replace` pipeline that already has an active run, and allows ten starts per person per
minute; the refusal is exit `1` with Nova's sentence. In Python:

```python
from stardelt import runs

run, tasks = runs.start(nova, "etl", "nyc_taxi", wait=True)     # run["state"] is "success" or the state it ended in
```

## Commands from the API

Every public API operation is also a command: `stardelt <resource> <verb>`, with the options of `stardelt api`, or
`stardelt api <operationId>` by its id. `stardelt --help` prints this list, and `stardelt <resource>` the verbs and the
values each one takes.

| Resource | Verbs |
|---|---|
| `access` | `requests-create`, `requests-list`, `requests-read`, `requests-withdraw` |
| `ask` | `answer`, `feedback`, `history` |
| `auth` | `config` |
| `catalog` | `health-list`, `metrics-get`, `metrics-refresh`, `search` |
| `catalogs` | `list` |
| `column` | `description-update` |
| `compute` | `ensure`, `list`, `start`, `stop` |
| `connections` | `break-glass-log`, `create`, `group-break-glass`, `group-delete`, `group-rotate`, `list`, `managed-break-glass`, `managed-delete`, `managed-rotate`, `personal-break-glass`, `personal-delete`, `personal-rotate` |
| `deployments` | `get`, `list`, `plan`, `record`, `rollback` |
| `destinations` | `create`, `list`, `remove`, `test` |
| `health` | — |
| `lineage` | `columns`, `graph`, `read-tables`, `run-detail` |
| `me` | — |
| `migrations` | `apply`, `approve`, `plan` |
| `model` | `endpoints-list` |
| `namespaces` | `list` |
| `notebooks` | `content`, `delete`, `list`, `parameters`, `publish`, `usage`, `versions` |
| `nova` | `version` |
| `openapi` | `document` |
| `pipelines` | `check`, `create`, `delete`, `get`, `list`, `pause`, `preview-schedule`, `principals`, `resume`, `run-checks`, `run-get`, `run-queries`, `run-retry`, `run-stop`, `run-task-logs`, `run-task-notebook`, `run-trigger`, `spec`, `update`, `validate` |
| `query` | `log-detail`, `log-history`, `log-list`, `log-profile`, `log-usage`, `run` |
| `runs` | `list` |
| `saved` | `queries-create`, `queries-list`, `queries-remove`, `queries-share`, `queries-unshare` |
| `service` | `principals-list` |
| `stages` | `compare` |
| `statements` | `cancel`, `chunk-get`, `get`, `list`, `submit` |
| `streams` | `delete`, `list`, `patch`, `put`, `validate` |
| `table` | `documentation-get`, `documentation-update`, `freshness-get`, `freshness-update`, `history`, `metadata`, `rollback` |
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
