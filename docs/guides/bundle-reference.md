---
title: "Bundle reference: the file and the commands"
sidebar_label: "Bundle reference"
slug: /guides/bundle-reference
---

# Bundle reference: the file and the commands

Every key of `bundle.yaml`, the shape of a pipeline file, what each `stardelt bundle` command does and what it prints. The
guide [Publish pipelines from Git](publish-pipelines.md) walks one example; this page is for looking things up. The checks listed
here are the ones `stardelt bundle validate` runs without a host or a sign-in; Nova adds its own rules when you plan or deploy.

## The directory

```text
shop/
  bundle.yaml            # what the team publishes (this page, next section)
  resources/daily.yaml   # one pipeline per file, found through `include`
  sql/daily.sql          # files the pipelines read, found through `files`
  sql/migrations/001_init.sql   # optional: table changes, run once per stage (see Migrations)
```

## `bundle.yaml`

```yaml
bundle: {name: shop-etl, ownerGroup: shop}
variables:
  catalog: {default: warehouse, description: the catalog the pipelines read}
include: [resources/*.yaml]
files: [sql/*.sql]
migrations:
  catalog: warehouse
  files: [sql/migrations/*.sql]
requires: {connections: [crm-db]}
targets:
  dev:  {mode: development, variables: {catalog: warehouse}}
  prod: {mode: production,  variables: {catalog: warehouse}, runAs: pipeline-shop, drift: block}
```

| Key | Needed | What it holds | Checked |
|---|---|---|---|
| `bundle.name` | yes | the bundle's name | 3 to 40 characters: lower-case letters, digits and dashes |
| `bundle.ownerGroup` | yes | the group that owns every pipeline of the bundle | a group name: letters, digits, `.`, `_` and `-`, at most 64 characters |
| `variables` | no | each variable by name, with `default` and `description` (both optional) | names start with a lower-case letter and use lower-case letters, digits and `_` (at most 40) |
| `include` | yes | patterns of the resource files: one pipeline or one stream app per file | every pattern matches a file; no absolute path and no `..` |
| `files` | no | patterns of the files the pipelines read (the SQL files) | same rules; at most 100 files, each at most 5 MiB; no symbolic link; nothing inside `.git` |
| `migrations` | no | the catalog and the patterns of the SQL files that change tables, see [Migrations](#migrations) | a catalog name; each pattern matches a file; each file is named `NNN_<words>.sql`; a deploy takes 1 to 200 files, each at most 512 KiB and 4 MiB in total |
| `requires.connections` | no | names of the connections the stage must have (names only, never values) | each name is lower-case letters, digits and dashes |
| `targets` | yes | at least one target, see below | see below |

A top-level key that is not in this table is a problem (`unknown key`).

### Targets

A target is one stage: `dev`, `test`, `prod` or any name you choose.

| Key | Needed | What it holds |
|---|---|---|
| `mode` | yes | `development` or `production` |
| `variables` | no | a value for each variable you want to set for this stage; a variable must be declared under `variables` |
| `runAs` | in `production` | the pipeline identity the pipelines run as: `pipeline-<ownerGroup>`, or that name with a suffix (`pipeline-shop-nightly`) |
| `drift` | no | `warn` (the default) or `block`: what to do with a pipeline someone changed after its last deploy |

- A **`development`** target deploys every pipeline under the name `dev-<your sign-in name>-<pipeline>` (the whole name at most 40
  characters) and without its schedule, so two people can deploy one bundle side by side and nothing runs on its own. It needs a
  sign-in name, so `plan` and `deploy` for it require `stardelt login` (or a token).
- A **`production`** target deploys the pipelines under the names the files give, with their schedules.
- With **`drift: block`**, `plan` and `deploy` exit with `2` for every pipeline that was changed after its last deploy, and a deploy
  writes nothing, until you pass `--accept-drift`. With `warn` they only report it.

### Variables

`${var.name}` in a pipeline file is replaced before the file is read: the target's value wins over the `default`. A variable that
has no value in some target (`${var.name} has no value`) and a variable a target sets without declaring it are problems; a variable
that is declared and never used is a warning.

### Migrations

A bundle can carry table changes beside its pipelines. `migrations` names the catalog and the patterns of the SQL files; the
patterns are relative to the bundle directory and must stay inside it, as for `files`. `migrations.files` is its own pattern
list: a pattern does not have to be repeated under `files`.

- A migration file is named `NNN_<words>.sql`: three digits, an underscore, then lower-case letters, digits and underscores.
  The three digits give the order.
- `plan` and `deploy` run the files that are new for the target, in name order, **once per target**. What ran is recorded in
  `stardelt_meta.migrations` inside the `migrations.catalog`; the ledger is created on the first apply. A file whose bytes
  changed after it was applied is refused, never re-run; a new file that sorts before an applied one is refused too.
- A file is **additive** when every statement is `CREATE TABLE`, `CREATE TABLE AS`, `ALTER TABLE … ADD COLUMN` or
  `CREATE [OR REPLACE] VIEW`; anything else is **breaking** (`DROP`, `DELETE`, `RENAME`, …). Breaking files need
  `--allow-breaking`; without it the deploy writes nothing and exits `2`.
- Migrations run **before** the pipelines of the same deploy.
- A deploy carries 1 to 200 migration files; each file is at most 512 KiB and the files together at most 4 MiB.

```console
$ stardelt bundle plan shop -t prod
{"action": "migration-in-ledger", "name": "001_init.sql"}
{"action": "would-apply-migration", "name": "002_add.sql", "class": "additive"}
{"action": "would-create", "name": "daily", "nextRuns": ["2026-11-02T03:00:00+01:00"]}

$ stardelt bundle deploy shop -t prod --allow-breaking
{"action": "migration-in-ledger", "name": "001_init.sql"}
{"action": "migration-applied", "name": "002_add.sql"}
{"action": "created", "name": "daily"}
```

Without the flag, a breaking file stops the deploy before any pipeline is written:

```console
$ stardelt bundle deploy shop -t prod
stardelt: prod: migrations: 002_add.sql: drop column is breaking; pass allowBreaking
$ echo $?
2
```

## A pipeline file

The same shape that `stardelt apply -f` reads, plus `sqlFile`:

```yaml
name: daily
sqlFile: sql/daily.sql          # exactly one of sql, sqlFile and notebook
params:
  catalog: "${var.catalog}"
schedule:
  cron: "0 3 * * *"             # a schedule needs both cron and timezone
  timezone: UTC
```

- `name` is required and must be unique among the pipeline files of the bundle.
- `ownerGroup` is optional; when it is there it must be the bundle's group.
- **Exactly one** of `sql` (the statement), `sqlFile` (a file named under `files`; its text is read into `sql` when you plan or
  deploy) and `notebook` (a published notebook and its version, or a file of the bundle: see below).
- `schedule` needs both `cron` and `timezone` (an IANA zone such as `Europe/Berlin`); leave it out for an on-demand pipeline.
- `params` and `options` are the pipeline's parameters and advanced options, as in `stardelt apply`.

### A notebook that is a file of the bundle

```yaml
name: explore
notebook:
  file: notebooks/explore.ipynb   # a file named under `files`
  params:
    rows: "5"
```

`file` must be among the bundle's `files`, be valid JSON (a Jupyter notebook) and have a name that ends in `.ipynb`, starts with a
letter or a digit and uses only letters, digits, `.`, `_`, `-` and spaces (at most 128 characters before `.ipynb`). Give no `name` or `objectVersion`
beside it: `deploy` publishes the file to the bundle's group under its file name and pins the version Nova answers. Publishing bytes
that equal the newest version stores nothing, so a repeated deploy does not create versions. A notebook is never deleted by `prune`
or `destroy`: its versions are immutable.

### A stream app that is a file of the bundle

A file with `kind: StreamApp` is not a pipeline: it has no `sql`, `sqlFile`, `notebook`, `schedule` or `params`, and `validate`
refuses them with "a StreamApp is not a pipeline: remove …".

```yaml
kind: StreamApp
name: measurements
ownerGroup: sales
source: {topic: pegelonline.measurements}
sink: {catalog: "${var.catalog}", table: bronze.measurements, mode: merge, mergeKeys: [station]}
```

- Required: `name`, `source.topic`, `sink.catalog` and `sink.table` (`schema.table`). Optional: `ownerGroup` (must be the
  bundle's group), `source.connectionRef` (a `Connection` name for an external Kafka; without it the platform's own bus is
  read), `sink.mode` (`merge` or `append`), `sink.mergeKeys` (the key columns of a `merge` sink) and `restartPolicy` (`always`
  or `on-failure`).
- A `development` target deploys it under `dev-<your sign-in name>-<name>`; a `production` target under its own name. It
  carries the same stamp as a pipeline (bundle, target and revision — the commit when the directory is a Git checkout), and
  `bundle summary` lists it with `"kind": "StreamApp"`.
- `--prune` and `destroy` remove pipelines only today: a stream app is left in place, and a stream made by hand or by another
  bundle is never touched.

```console
$ stardelt bundle plan shop -t prod
{"action": "would-create", "name": "measurements"}
$ stardelt bundle deploy shop -t prod
{"action": "created", "name": "measurements"}
$ stardelt bundle summary shop -t prod
{"name": "measurements", "kind": "StreamApp", "revision": "0123abc", "deployedBy": "ada", "deployedAt": "2026-11-01T08:00:02Z"}
```

The stream's row appears among the bundle's pipeline rows; each block above shows only that row.

## The commands

All take the bundle directory as an optional argument (the current directory by default). The first two need no host and no
sign-in; the others talk to Nova.

| Command | What it does | Writes to Nova |
|---|---|---|
| `bundle init [DIR] --name NAME --group GROUP` | writes a small bundle that passes `validate` | no |
| `bundle validate [DIR] [-t TARGET]` | checks the bundle offline (every target, or one) | no |
| `bundle plan [DIR] -t TARGET [--prune] [--accept-drift] [--diff]` | plans the target's new migrations first, then asks Nova what deploying the target would do | no |
| `bundle deploy [DIR] -t TARGET [--dry-run] [--prune] [--accept-drift] [--diff]` | applies the target's new migrations first, then checks every pipeline with Nova and creates or updates them; `--dry-run` is `plan` | yes |
| `bundle summary [DIR] -t TARGET` | shows what a deploy of the target left on the stage (pipelines and stream apps) | no |
| `bundle run [DIR] -t TARGET [--only NAME] [--timeout SECONDS] [--interval SECONDS]` | starts the pipelines a deploy of the target left on the stage, one after the other, and waits for each; stops at the first that does not succeed | starts runs |
| `bundle destroy [DIR] -t TARGET [--yes]` | lists, and with `--yes` removes, what a deploy of the target left on the stage | with `--yes` |
| `bundle generate NAMESPACE NAME [DIR]` | writes a pipeline made in the interface into the bundle (its file and its SQL file); never overwrites | no |

`--prune` also handles the pipelines that this bundle and this target deployed earlier and the bundle no longer names (`would-delete`
in a plan, removed after everything else succeeded in a deploy). `destroy` and `--prune` only ever touch pipelines stamped with
this bundle's name and this target; in a `development` target only your own `dev-<your name>-` pipelines.

## What the commands print

Results are JSON lines on standard output; messages, warnings and problems go to standard error.

- `plan`, `deploy`: one line per pipeline, `{"action": ..., "name": ...}` with `action` one of `would-create`, `would-update`,
  `would-delete` (a plan) or `created`, `updated`, `deleted` (a deploy). An update lists `changes` (which of `statement`,
  `schedule`, `params`, `options` and `deployment` change), a scheduled pipeline lists `nextRuns`, and `"modified": true` marks a
  pipeline someone changed after its last deploy (one warning per such pipeline goes to standard error).
- Both also list the bundle's new migrations first, in name order: `{"action": "migration-in-ledger", "name": ...}` for a file
  already applied, `{"action": "would-apply-migration", "name": ..., "class": "additive"}` for a new one, and in a deploy
  `{"action": "migration-applied", "name": ...}` for each file it ran. A breaking file without `--allow-breaking` is a
  refusal: one sentence on standard error (`prod: migrations: 002_add.sql: drop column is breaking; pass allowBreaking`),
  exit code `2`, and no pipeline written.
- A stream app of the bundle prints `would-create` or `would-update` in a plan and `created` or `updated` in a deploy, after
  the pipelines; `summary` prints its row with `"kind": "StreamApp"`.
- A pipeline whose notebook is a file adds one thing to this: when the file differs from the newest published version, `plan` prints
  `{"action": "would-publish", "name": ..., "notebook": "<group>/<file name>"}` instead of `would-create` or `would-update` (Nova can
  check the pipeline only after the new version exists), and `deploy` prints `{"action": "published", "name": ..., "notebook": ...,
  "objectVersion": ...}` before the pipeline's own line. A refusal after the publish keeps the published version.
- With `--diff`, `plan` and `deploy` also print, on standard error after the JSON lines, a unified diff for every update: one per
  field Nova names in `changes` (`statement` is compared line by line, `schedule`, `params` and `options` as YAML), headed
  `--- load sql (deployed)` and `+++ load sql (bundle)`. A change of the stamp alone (`deployment`) shows nothing, and a deployed
  document that cannot be read is one sentence instead of a diff.
- `run` prints one line per run, `{"action": "ran", "name": ..., "runId": ..., "state": ...}`, with `failedTasks` (the ids of the failed
  tasks) when tasks failed. It runs what `summary` lists, in name order, and stops at the first run that does not end `success`
  (exit code `1`); `--only NAME` runs one pipeline (in a `development` target without the `dev-<your name>-` prefix), and
  `--timeout` stops waiting after that many seconds without stopping the run (a problem sentence, exit code `2`). It deploys nothing.
- `destroy` prints `would-delete` or `deleted` lines; `summary` prints one line per pipeline or stream app with `name` and, when
  Nova knows them, `revision`, `deployedBy`, `deployedAt` and `modified` (a stream app's row also carries `"kind": "StreamApp"`).
- If Nova refuses any pipeline, nothing is written, the sentences are shown (`prod: daily: you are not a member of the group
  shop`, or `prod: daily: No principal for this group yet: …` when the group has no ready pipeline identity), the pipelines that
  passed are still listed, and the command exits `2`.

| Exit code | Meaning |
|---|---|
| `0` | success |
| `1` | an error, for example the platform cannot be reached, or a run started by `bundle run` did not succeed |
| `2` | wrong usage, a problem in the bundle, a refusal by Nova, or `drift: block` |
| `3` | authentication is needed: run `stardelt login` or set `STARDELT_TOKEN` |

## Every pipeline carries where it came from

A deploy sends, with each pipeline and stream app, the bundle's name, the target and the Git commit of the bundle directory
(`-dirty` is appended when files are uncommitted; outside a Git checkout there is no commit). Nova stamps that on the pipeline:
the pipeline page shows it under **Deployed from**, the Pipelines list shows it in its **Source** column
(`Git · shop-etl/prod @ 0123abc`, or `Nova` for a pipeline made in the interface, with a **changed by hand** badge once someone
edited a deployed one), the page **Deployments** (under **Admin**) groups it by bundle and stage, and `summary`, `--prune` and
`destroy` use it to find what a bundle owns. A stream app carries the same stamp; the Streams page does not show it yet. A
pipeline made in the interface or with `stardelt apply` has no stamp.
