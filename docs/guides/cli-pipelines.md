---
title: "Pipelines from the command line"
sidebar_label: "Pipelines from the CLI"
slug: /guides/cli-pipelines
---

# Pipelines from the command line

You need the stardelt package, signed in: see [Python, command line and agents](sdk-cli-mcp.md).

## Deploy a pipeline from a file

`stardelt apply -f pipeline.json` creates a pipeline, or updates it when one of that name exists, so the same file can run on
every deploy. The file is one JSON or YAML object shaped like the body of the create-pipeline operation (`pipelines_create` in the
[API reference](../reference/api.md)): `name`, `ownerGroup`, a `sql` statement (or a `notebook`) — or a `tasks` list, one
statement per task — and optionally `schedule`, `params` and `options`. A `tasks` list is passed through unchanged and Nova checks
the per-task rules and the dependency graph; the shape is the one in
[A pipeline with several tasks](bundle-reference.md#a-pipeline-with-several-tasks).

```bash
cat > pipeline.json <<'JSON'
{"name": "daily", "ownerGroup": "etl", "sql": "select 1", "schedule": {"cron": "0 3 * * *", "timezone": "Europe/Berlin"}}
JSON
stardelt apply -f pipeline.json --dry-run      # asks Nova to check the file and writes nothing
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
refuses ends the command with Nova's own sentence and exit code 2, so a check on a pull request can run
`stardelt apply -f pipelines/ --dry-run` and fail on a file that a real run would refuse.

To start from a pipeline that was made in the interface, export it: `stardelt export NAMESPACE NAME > pipeline.yaml` writes its
document (the same one **Show definition** shows) as a file `stardelt apply -f` accepts; `--format json` writes JSON. A pipeline
that was written outside Nova, or has a shape the form does not edit, is still exported, with a note that `apply` cannot change it.

`-f` can also name a directory: every `.json`, `.yaml` and `.yml` file directly inside it is applied in name order, one answer line per file, so a
folder of pipelines in your repository deploys with one command (`stardelt apply -f pipelines/`). All files are read before anything is applied: a
file that is not a pipeline (the message names it), a folder without any pipeline file, or two files with one pipeline name write nothing.

## Publish a bundle from Git

`stardelt bundle init`, `validate`, `plan` and `deploy` publish a directory of pipeline files to a stage, the way a team ships
code, and stamp each pipeline with the commit it came from. The whole path, with an example, is its own guide:
[Publish pipelines from Git](publish-pipelines.md).

## Run a pipeline and wait for it

`stardelt run NAMESPACE NAME` starts a run now and prints it. With `--wait` it looks at the run until it is no longer `queued` or `running`, prints the
run with its tasks and exits `0` only when the run succeeded, so a CI job can use it as a step:

```bash
stardelt run etl nyc_taxi --wait --timeout 3600     # exit 0: the run succeeded; exit 1: it failed, was refused, or the time ran out
```

A failed run names its failed tasks on standard error. `--interval` sets the seconds between two looks (5 unless you change it). When `--timeout` runs out the
run is NOT stopped and keeps going; `stardelt pipelines run-stop etl nyc_taxi RUN_ID` marks it failed, but work already in flight can still finish. Nova
refuses to start a run of a paused pipeline, or of a `Forbid` or `Replace` pipeline that already has an active run, and allows ten starts per person per
minute; the refusal is exit `1` with Nova's sentence. In Python:

```python
from stardelt import runs

run, tasks = runs.start(nova, "etl", "nyc_taxi", wait=True)     # run["state"] is "success" or the state it ended in
```
