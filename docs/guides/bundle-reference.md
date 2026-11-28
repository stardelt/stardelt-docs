---
title: "Bundle reference: the file and the commands"
sidebar_label: "Bundle reference"
slug: /reference/bundle
description: "Every key of bundle.yaml, the shape of a pipeline file, and what each stardelt bundle command does."
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
| `runAs` | in `production` | the pipeline identity the pipelines run as: exactly `pipeline-<ownerGroup>` (Nova writes that name itself; a suffix is refused) |
| `drift` | no | `warn` (the default), `block`, or `heal` (a `development` target only): what to do with a pipeline someone changed after its last deploy |
| `onGateFail` | no | `none` (the default) or `rollback`: what a failed `bundle deploy --smoke` gate does; `rollback` replays the newest applied deployment of the same bundle and target |

- A **`development`** target deploys every pipeline under the name `dev-<your sign-in name>-<pipeline>` (the whole name at most 40
  characters) and without its schedule and its table trigger, so two people can deploy one bundle side by side and nothing runs on its own. It needs a
  sign-in name, so `plan` and `deploy` for it require `stardelt login` (or a token).
- A **`production`** target deploys the pipelines under the names the files give, with their schedules.
- With **`drift: block`**, `plan` and `deploy` exit with `2` for every pipeline that was changed after its last deploy, and a deploy
  writes nothing, until you pass `--accept-drift`. With `warn` they only report it. With **`heal`**, allowed only on a `development`
  target, they report it and the deploy writes over the change, so an experiment made in the interface is simply replaced.

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
- In a **`production`** target a breaking file needs a **second person** as well. The first deploy is refused with the plan
  id on standard error; a colleague runs `stardelt bundle approve <plan-id>` with their own sign-in, and the next deploy
  runs the file. The author of a plan cannot approve their own plan, and an approval covers exactly the files that were
  planned: if a file changes after it was approved, the next deploy names a new id, which has to be approved too. A
  `development` target never needs an approval.
- Migrations run **before** the pipelines of the same deploy.
- A deploy carries 1 to 200 migration files; each file is at most 512 KiB and the files together at most 4 MiB.

```console
$ stardelt bundle plan shop -t prod
{"action": "migration-in-ledger", "name": "001_init.sql", "kind": "Migration"}
{"action": "would-apply-migration", "name": "002_add.sql", "class": "additive", "kind": "Migration"}
{"action": "would-create", "name": "daily", "nextRuns": ["2026-11-02T03:00:00+01:00"], "kind": "Pipeline"}

$ stardelt bundle deploy shop -t prod --allow-breaking
{"action": "migration-in-ledger", "name": "001_init.sql", "kind": "Migration"}
{"action": "migration-applied", "name": "002_add.sql", "kind": "Migration"}
{"action": "created", "name": "daily", "kind": "Pipeline"}
{"action": "recorded", "id": 7}
```

Without the flag, a breaking file stops the deploy before any pipeline is written:

```console
$ stardelt bundle deploy shop -t prod
stardelt: prod: migrations: 002_add.sql: drop column is breaking; pass allowBreaking
$ echo $?
2
```

A breaking file in a target whose `mode` is `production` needs the flag **and** a second person:

```console
$ stardelt bundle deploy shop -t prod --allow-breaking
stardelt: prod: migrations: a breaking change in a production target needs a second person: stardelt bundle approve 0f3c…
$ echo $?
2

$ stardelt bundle approve 0f3c…            # the second person, their own sign-in
{"planId": "0f3c…", "approver": "Bob", "approvedAt": 1762…}

$ stardelt bundle deploy shop -t prod --allow-breaking
{"action": "migration-in-ledger", "name": "001_init.sql"}
{"action": "migration-applied", "name": "002_drop.sql"}
```

A deploy that finishes is recorded once in Nova's deployment record: the bundle, the stage, the
commit and repository, the person, and the pipelines it wrote or removed. The last line of a
successful deploy says so (`{"action": "recorded", "id": 7}`). A deploy whose record cannot be
written still succeeds — the pipelines are what matter — and its last line is
`{"action": "not-recorded", "reason": "…"}`. The Deployments page lists the record under
[Recorded deployments](/docs/guides/publish-pipelines#recorded-deployments).

### Table context

A table's **guide** is the knowledge an agent needs: which columns join, which rows to leave out. A bundle carries the
guides of its tables, so they are reviewed in a pull request instead of edited only in the interface. `context.tables`
lists 1 to 50 rows; `table` is `catalog.namespace.table` and `guide` is literal text or Markdown (at most 16 000
characters, trimmed at its ends; `${var.x}` is not substituted):

```yaml
context:
  tables:
    - table: bronze.shop.customers
      guide: |
        One row per customer id. Join orders on customer_id; leave out rows with deleted_at set.
      metrics:
        - name: active_customers
          description: Customers with an order in the period
          expression: count(DISTINCT customer_id)
          timeColumn: ordered_at
          dimensions: [country]
```

A row needs `table` and a `guide`, `metrics` or both. `metrics` holds 1 to 20
[metric definitions](/docs/guides/catalog#verified-queries), with the same fields as on the table page. A
definition whose words differ is deleted and created again (Nova never edits one), and a metric the bundle does not
name is left alone.

- Only the table's owner (or an administrator) may write its guide. A table with no owner is claimed for the bundle's
  `ownerGroup` in the same write, so `bundle.ownerGroup` is required; without it the command refuses with
  `bundle.ownerGroup: must be a group name, so a table with no owner can be claimed`.
- `stardelt bundle context DIR` sets every guide that differs and prints one `unchanged` or `set` row per table, and
  one `unchanged`, `created` or `replaced` row per metric; `--check` writes nothing, prints `would-set`,
  `would-create` or `would-replace` and exits `1`: the form a CI job runs. It is not part of `bundle deploy`,
  because a documentation write has no document to record or replay.

### Eval questions

`evals:` names one `catalog` and 1 to 50 `questions`, each with `question` (1 to 500 characters) and `expected`,
one of the three shapes in [Evals](/docs/guides/evals#the-three-answers). `stardelt bundle evals` stores them in that
catalog under the bundle's `ownerGroup`, matching each question by its text. A question that another group owns,
or one the catalog holds twice, is a problem.

### Editor completion

[`python/stardelt/bundle.schema.json`](https://github.com/stardelt/stardelt/blob/@ref@/python/stardelt/bundle.schema.json) is a
JSON Schema (draft 2020-12) of this file. One modeline at the top of `bundle.yaml` gives an editor that speaks the YAML language
server the keys, the modes and the patterns, so a typo such as `targts:` is marked while you type:

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/stardelt/stardelt/@ref@/python/stardelt/bundle.schema.json
```

The schema is structural only: it cannot see whether the files exist, whether every `${var.x}` resolves or whether a production
target's `runAs` matches the group. `stardelt bundle validate` checks those too, and the schema never refuses a file `validate`
accepts.

## A pipeline file

The same shape that `stardelt apply -f` reads, plus `sqlFile`. A pipeline file gives one statement (or a notebook) for the
whole pipeline, or a `tasks` list in which every task has its own statement. `stardelt apply -f` sends a
`tasks` list as Nova's body and Nova checks the per-task rules and the dependency graph when it creates or updates the
pipeline:

```yaml
name: daily
sqlFile: sql/daily.sql          # one of sql, sqlFile or notebook — or a tasks list
params:
  catalog: "${var.catalog}"
schedule:
  cron: "0 3 * * *"             # a schedule needs both cron and timezone
  timezone: UTC
```

- `name` is required and must be unique among the pipeline files of the bundle.
- `ownerGroup` is optional; when it is there it must be the bundle's group.
- **One of** `sql` (the statement), `sqlFile` (a file named under `files`, read into `sql` when you plan or
  deploy), `notebook` (a published notebook and its version, or a file of the bundle: see below), `dbt` (a dbt project
  that runs as a task), `quality` (SQL assertions for a run) or `spark-pipeline` (a declared Spark graph — see
  [Declarative Spark pipelines](spark-pipelines.md)), **or** a `tasks` list giving each task its own statement, which
  may hold a `dbt`, `quality` or `spark-pipeline` task ([A pipeline with several tasks](#a-pipeline-with-several-tasks)).
- `schedule` needs both `cron` and `timezone` (an IANA zone such as `Europe/Berlin`); leave it out for an on-demand pipeline.
- `triggers` starts a run when a table is updated: exactly one entry with `tablesUpdated` (1 to 10
  tables, each `catalog.schema.table`) and `mode` (`all`, the default, or `any`). It cannot come with
  `schedule`. A `development` target and a `--preview` deploy drop it, like the schedule.
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

### A task that runs dbt

A task may build a dbt project instead of running a statement or a notebook. The project travels in the dbt
tool image, at `/opt/dbt/projects/<project>`; a bundle names it and nothing else — no `files:` entry, no
version to pin.

```yaml
name: shop-dbt
schedule: {cron: "0 4 * * *", timezone: Europe/Berlin}
tasks:
  - name: build
    dbt: {project: shop, select: "tag:marts", threads: 4}
```

- `project` is a directory name under `/opt/dbt/projects`: `^[a-z][a-z0-9-]{0,38}$`.
- Exactly one of `select` (one selector) and `batches` (a list of 1 to 8 selectors, run in order as
  `build-1` … `build-N`) — `batches` is how a pipeline runs `tag:load` before `tag:marts`.
- `threads` is a whole number from 1 to 16 (omitted: 4); `vars` is a mapping of string values, passed as
  dbt's `--vars`.
- No other key is accepted, and `dbt:` cannot appear at the top of a file: "a dbt run is a task: put it
  under tasks: with a name".
- The pod holds no storage credential: the task mints a fresh engine token for the pipeline's principal on
  every run, so the warehouse sees the pipeline's own identity, not a platform key.

### A task that runs a declared Spark graph

A task may run a [Spark pipeline](https://spark.apache.org/docs/latest/declarative-pipelines/) — a directory with
`spark-pipeline.yml` and its SQL or Python files — instead of a statement:

```yaml
name: shop-gold
tasks:
  - name: build
    spark-pipeline: {project: spark/shop, refresh: full}
```

- `project` is a directory in the bundle that holds `spark-pipeline.yml`; it is not a `files:` entry.
- `refresh` is `incremental` (the default) or `full`; `fullRefresh` names datasets to rebuild. Both at once is refused.
- stardelt sets `catalog`, `database` and `storage` of the graph at run time; a `spark-pipeline.yml` that sets them
  itself is refused when the bundle is validated.
- Before the graph runs, the task runs `spark-pipelines dry-run` on it in the same pod; a graph the dry run rejects fails the task without writing anything.
- The bundle file says `spark-pipeline`; `stardelt apply -f` and the API take the same task as `sparkPipeline`.
  Both spellings are accepted, and the command line sends the one Nova takes.
- stardelt runs the graph: the task gets a pod of the platform's Spark image, runs `spark-pipelines dry-run` on it, then
  `spark-pipelines run` against the shared Spark Connect server, as the group's pipeline principal. `catalog`, `database`
  and `storage` still come from the task's `writes` and the group's bucket, never from the file.
- A `spark-pipeline` task can be the writer of a `publish: wap` pipeline: the run puts `spark.wap.branch` into the graph's
  session and the checks read the branch. See [Publish only checked data](/docs/guides/checked-publishing).

### A pipeline with several tasks

A file may give a `tasks` list instead of `sql`/`sqlFile`/`notebook`, when a pipeline is several statements that depend on one
another. All tasks of the file run in one pipeline, and `dependsOn` gives the order:

```yaml
name: shop-gold
schedule: {cron: "0 4 * * *", timezone: Europe/Berlin}
tasks:
  - {name: daily_revenue, sqlFile: sql/10_daily_revenue.sql}
  - {name: customer_ltv,  sqlFile: sql/11_customer_ltv.sql}
  - {name: product_mix,   sqlFile: sql/12_product_mix.sql, dependsOn: [daily_revenue]}
```

- At most 30 tasks in one file.
- A task name matches `^[a-z0-9][a-z0-9_-]{0,62}$` and is unique in the file.
- Each task gives exactly one of `sql`, `sqlFile`, `notebook`, `dbt`, `quality` and `spark-pipeline`. A `sqlFile` must be
  among the bundle's `files` (its text is read into `sql` when you plan or deploy); a `notebook` follows the notebook
  rules above; a `dbt` task follows the rules below; a `spark-pipeline` task follows the rules above.
- `dependsOn` is a list of at most 8 task names from the same file, with no cycle.
- A problem is printed with the file, the target and the task: `resources/gold.yaml (prod), task 'customer_ltv': …`.
- `tasks` and `sql`/`sqlFile`/`notebook` cannot appear in one file together.
- `bundle generate` writes one `sql/<pipeline>-<task>.sql` per task.

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
- `--prune` and `destroy` remove the pipelines and the stream apps of this bundle and this target: `--prune` the ones the
  bundle no longer names, `destroy` every one the target deployed. A pipeline or a stream made by hand or by another bundle is
  never touched.

```console
$ stardelt bundle plan shop -t prod
{"action": "would-create", "name": "measurements", "kind": "StreamApp"}
$ stardelt bundle deploy shop -t prod
{"action": "created", "name": "measurements", "kind": "StreamApp"}
{"action": "recorded", "id": 7}
$ stardelt bundle summary shop -t prod
{"name": "measurements", "kind": "StreamApp", "revision": "0123abc", "deployedBy": "ada", "deployedAt": "2026-11-01T08:00:02Z"}
```

The stream's row appears among the bundle's pipeline rows; each block above shows only that row.

## A dashboard folder

A bundle may name folders under `dashboards:`, each an unzipped Superset export (for example `dashboards/shop/`).
`bundle plan` shows one `would-import-dashboards` row per folder, `bundle deploy` imports them, and `--prune` removes
the dashboards the bundle no longer names — never a dashboard without this bundle's stamp. See
[Dashboards](/docs/guides/dashboards) for the whole flow.

The manual path runs the two commands without a bundle deploy:

```bash
stardelt dashboards export 12 -o dashboards/shop
stardelt dashboards import dashboards/shop --bundle shop --owner-group shop-team --target prod
```

- `export` runs inside the bundle and reads `bundle.name` and `bundle.ownerGroup` from `bundle.yaml`. You must be
  a member of the owner group. Nova drops the export's `databases/` folder, so the bundle never holds a connection
  address.
- `import` points every dataset at the target's own `Trino <catalog>` database and stamps each dashboard
  `certified_by: stardelt bundle <bundle>` and `certification_details: <target> @ <commit> by <ownerGroup>`.
  `--commit SHA` provides the commit in that stamp, and `--overwrite` replaces a dashboard of the same name.
  An import is refused when a dashboard in the archive already exists certified by another bundle or owner
  group, so a bundle can never take over another group's dashboard.

`bundle summary` adds one `Dashboard` row per dashboard this bundle and owner group imported for the target,
with the commit its import stamp recorded. A bundle without a `dashboards:` block makes no request for
dashboards and adds no such row.

## The commands

All take the bundle directory as an optional argument (the current directory by default). The first two need no host and no
sign-in; the others talk to Nova.

| Command | What it does | Writes to Nova |
|---|---|---|
| `bundle init [DIR] --name NAME --group GROUP` | writes a small bundle that passes `validate` | no |
| `bundle validate [DIR] [-t TARGET] [--format text\|json]` | checks the bundle offline (every target, or one): the same checks the schema describes, plus the ones that need the files | no |
| `bundle plan [DIR] -t TARGET [--prune] [--accept-drift] [--diff] [--adopt NAME]` | plans the target's new migrations first, then asks Nova what deploying the target would do | no |
| `bundle deploy [DIR] -t TARGET [--dry-run] [--prune] [--accept-drift] [--diff] [--smoke NAME [--smoke-timeout SECONDS]] [--adopt NAME] [--preview ID [--ttl DAYS]]` | applies the target's new migrations first, then checks every pipeline with Nova and creates or updates them, imports the target's `dashboards:` folders and records one row in Nova's deployment record; `--dry-run` is `plan`; `--smoke NAME` then runs that pipeline of the bundle and fails the deploy unless the run succeeds; with `onGateFail: rollback` on the target, a failed gate replays the newest applied deployment and the problem names both ids; `--preview ID` deploys a development target as `<ID>-<name>` with no schedule and no table trigger, for a pull request (1 to 20 lower-case letters, digits and dashes; `--ttl` 1 to 30 days, default 7), and records its expiry so Nova removes the copy | yes |
| `bundle approve PLAN-ID` | approves a migration plan that a production deploy needs a second person for | yes |
| `bundle context [DIR] [--check]` | sets the guides of the bundle's `context:` block on their tables; `--check` answers what would change, writes nothing and exits `1` on drift | without `--check` |
| `bundle dashboards [DIR] -t TARGET [--overwrite]` | imports the `dashboards:` folders for one target: each dataset is remapped to the target's `Trino <catalog>` database and each dashboard is stamped; `--overwrite` replaces a dashboard of the same name | yes |
| `bundle evals [DIR] [--check]` | creates or corrects the `evals:` questions in their catalog; `--check` answers what would change, writes nothing and exits `1` on drift | without `--check` |
| `bundle summary [DIR] -t TARGET` | shows what a deploy of the target left on the stage (pipelines, stream apps and dashboards) | no |
| `bundle run [DIR] -t TARGET [--only NAME] [--timeout SECONDS] [--interval SECONDS]` | starts the pipelines a deploy of the target left on the stage, one after the other, and waits for each; stops at the first that does not succeed | starts runs |
| `bundle destroy [DIR] -t TARGET [--yes] [--preview ID]` | lists, and with `--yes` removes, what a deploy of the target left on the stage; with `--preview ID` only that preview's pipelines and streams | with `--yes` |
| `bundle generate NAMESPACE NAME [DIR]` | writes a pipeline made in the interface into the bundle (its file, and its SQL or notebook file); never overwrites | no |
| `bundle rollback --deployment ID [--yes]` | lists, and with `--yes` replays, the documents one recorded deployment applied (the ID is in `stardelt deployments list`) | with `--yes` |

`--prune` also handles the pipelines and stream apps that this bundle and this target deployed earlier and the bundle no longer
names (`would-delete` in a plan, removed after everything else succeeded in a deploy; a stream row carries `"kind": "StreamApp"`),
and the dashboards the bundle no longer names (`would-delete-dashboards` in a plan, `deleted-dashboards` in a deploy).
`destroy` and `--prune` only ever touch objects stamped with this bundle's name and this target; in a `development` target only
your own `dev-<your name>-` ones.

## What the commands print

Results are JSON lines on standard output; messages, warnings and problems go to standard error.

`validate` prints one line per target on standard output (`dev (development): daily`); `--format json` prints one object
instead, with nothing on standard error, for the `bundle init` bundle:

```json
{"ok": true, "problems": [], "warnings": [], "targets": [{"name": "dev", "mode": "development", "pipelines": ["daily"]}, {"name": "prod", "mode": "production", "pipelines": ["daily"]}]}
```

`ok` is false when `problems` is non-empty (exit code `2`); warnings never fail the run; `--format text` is the default and
prints what it printed before.

- `plan`, `deploy`: one line per object, `{"action": ..., "kind": "Pipeline" | "StreamApp" | "Migration", "name": ...}`, with
  `action` one of `would-create`, `would-update`, `would-delete` (a plan) or `created`, `updated`, `deleted` (a deploy). An
  update lists `changes` (which of `statement`, `notebook` or `tasks`, `schedule`, `triggers`, `description`, `params`, `options` and `deployment` change), a scheduled pipeline
  lists `nextRuns`, and `"modified": true` marks a pipeline someone changed after its last deploy (one warning per such
  pipeline goes to standard error). `--format markdown` prints the same rows as a table whose `Kind` column shows that kind.
- Both also list the bundle's new migrations first, in name order: `{"action": "migration-in-ledger", "name": ..., "kind":
  "Migration"}` for a file already applied, `{"action": "would-apply-migration", "name": ..., "class": "additive", "kind":
  "Migration"}` for a new one, and in a deploy `{"action": "migration-applied", "name": ..., "kind": "Migration"}` for each
  file it ran. A breaking file without `--allow-breaking` is a
  refusal: one sentence on standard error (`prod: migrations: 002_add.sql: drop column is breaking; pass allowBreaking`),
  exit code `2`, and no pipeline written. `plan` works out the same plan id for the same files as a deploy would, but it
  does not print it: in a `production` target, copy the id to approve from the refused deploy's sentence.
- A stream app of the bundle prints `would-create` or `would-update` in a plan and `created` or `updated` in a deploy, after
  the pipelines, with `"kind": "StreamApp"`; `summary` prints its row with `"kind": "StreamApp"` too.
- A pipeline whose notebook is a file adds one thing to this: when the file differs from the newest published version, `plan` prints
  `{"action": "would-publish", "name": ..., "notebook": "<group>/<file name>", "kind": "Pipeline"}` instead of `would-create` or `would-update` (Nova can
  check the pipeline only after the new version exists), and `deploy` prints `{"action": "published", "name": ..., "notebook": ...,
  "objectVersion": ..., "kind": "Pipeline"}` before the pipeline's own line. A refusal after the publish keeps the published version.
- With `--diff`, `plan` and `deploy` also print, on standard error after the JSON lines, a unified diff for every update: one per
  field Nova names in `changes` (`statement` is compared line by line, `schedule`, `triggers`, `description`, `params` and `options` as YAML), headed
  `--- load sql (deployed)` and `+++ load sql (bundle)`. A change of the stamp alone (`deployment`) shows nothing, and a deployed
  document that cannot be read is one sentence instead of a diff.
- `run` prints one line per run, `{"action": "ran", "name": ..., "runId": ..., "state": ...}`, with `failedTasks` (the ids of the failed
  tasks) when tasks failed. It runs what `summary` lists, in name order, and stops at the first run that does not end `success`
  (exit code `1`); `--only NAME` runs one pipeline (in a `development` target without the `dev-<your name>-` prefix), and
  `--timeout` stops waiting after that many seconds without stopping the run (a problem sentence, exit code `2`). It deploys nothing.
- `destroy` prints `would-delete` or `deleted` lines; `summary` prints one line per pipeline, stream app or dashboard with `name` and, when
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
