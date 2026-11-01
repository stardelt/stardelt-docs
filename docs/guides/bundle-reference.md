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
```

## `bundle.yaml`

```yaml
bundle: {name: shop-etl, ownerGroup: shop}
variables:
  catalog: {default: warehouse, description: the catalog the pipelines read}
include: [resources/*.yaml]
files: [sql/*.sql]
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
| `include` | yes | patterns of the pipeline files, one pipeline per file | every pattern matches a file; no absolute path and no `..` |
| `files` | no | patterns of the files the pipelines read (the SQL files) | same rules; at most 100 files, each at most 5 MiB; no symbolic link; nothing inside `.git` |
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
  deploy) and `notebook` (a published notebook and its version). A `notebook` given as a file of the bundle cannot be deployed yet.
- `schedule` needs both `cron` and `timezone` (an IANA zone such as `Europe/Berlin`); leave it out for an on-demand pipeline.
- `params` and `options` are the pipeline's parameters and advanced options, as in `stardelt apply`.

## The commands

All take the bundle directory as an optional argument (the current directory by default). The first two need no host and no
sign-in; the others talk to Nova.

| Command | What it does | Writes to Nova |
|---|---|---|
| `bundle init [DIR] --name NAME --group GROUP` | writes a small bundle that passes `validate` | no |
| `bundle validate [DIR] [-t TARGET]` | checks the bundle offline (every target, or one) | no |
| `bundle plan [DIR] -t TARGET [--prune] [--accept-drift] [--diff]` | asks Nova what deploying the target would do | no |
| `bundle deploy [DIR] -t TARGET [--dry-run] [--prune] [--accept-drift] [--diff]` | checks every pipeline with Nova, then creates or updates them; `--dry-run` is `plan` | yes |
| `bundle summary [DIR] -t TARGET` | shows what a deploy of the target left on the stage | no |
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
- With `--diff`, `plan` and `deploy` also print, on standard error after the JSON lines, a unified diff for every update: one per
  field Nova names in `changes` (`statement` is compared line by line, `schedule`, `params` and `options` as YAML), headed
  `--- load sql (deployed)` and `+++ load sql (bundle)`. A change of the stamp alone (`deployment`) shows nothing, and a deployed
  document that cannot be read is one sentence instead of a diff.
- `destroy` prints `would-delete` or `deleted` lines; `summary` prints one line per pipeline with `name` and, when Nova knows them,
  `revision`, `deployedBy`, `deployedAt` and `modified`.
- If Nova refuses any pipeline, nothing is written, the sentences are shown (`prod: daily: you are not a member of the group
  shop`), the pipelines that passed are still listed, and the command exits `2`.

| Exit code | Meaning |
|---|---|
| `0` | success |
| `1` | an error, for example the platform cannot be reached |
| `2` | wrong usage, a problem in the bundle, a refusal by Nova, or `drift: block` |
| `3` | authentication is needed: run `stardelt login` or set `STARDELT_TOKEN` |

## Every pipeline carries where it came from

A deploy sends, with each pipeline, the bundle's name, the target and the Git commit of the bundle directory (`-dirty` is appended
when files are uncommitted; outside a Git checkout there is no commit). Nova stamps that on the pipeline: the pipeline page shows it
under **Deployed from**, the page **Deployments** groups it by bundle and stage, and `summary`, `--prune` and `destroy` use it to
find what a bundle owns. A pipeline made in the interface or with `stardelt apply` has no stamp.
