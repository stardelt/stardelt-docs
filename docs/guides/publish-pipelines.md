---
title: "Publish pipelines from Git"
sidebar_label: "Publish from Git"
slug: /guides/publish-pipelines
---

# Publish pipelines from Git

A team keeps its pipelines as files in Git and publishes them to a stage with one command. This page walks one example end to
end: a *bundle* with one SQL pipeline that you describe, try in your own development stage, check in a pull request and publish to
production, and keep in step with Git afterwards. Everything on this page is built; the last section says what is not.

You need the `stardelt` package ([install and sign in](sdk-cli-mcp.md)) and, for everything except `init` and `validate`, a host
and a sign-in: `stardelt login`, or `STARDELT_TOKEN` in a CI job.

## 1. Describe what you publish

A bundle is a directory in Git that says what a team publishes: the pipeline files, the notebooks and SQL they run, and one target
per stage (`dev`, `test`, `prod`). `init` writes a small one that passes `validate`; neither command needs a host or a sign-in, so a
pull request can run them:

```bash
stardelt bundle init shop --name shop-etl --group shop       # writes bundle.yaml, resources/daily.yaml, sql/daily.sql
stardelt bundle validate shop                                # checks every target
stardelt bundle validate shop -t prod                        # checks one
```

```text
dev (development): daily
prod (production): daily
```

`bundle.yaml` names the bundle and its owner group, the variables (`${var.catalog}` in a pipeline file is replaced per target),
the pipeline files (`include`), the files they read (`files`), the connections the stage must have (names only, never values) and
the targets (shown here in short form; `init` writes the same
in longer form):

```yaml
bundle: {name: shop-etl, ownerGroup: shop}
variables: {catalog: {default: warehouse}}
include: [resources/*.yaml]       # one pipeline per file, the shape `stardelt apply -f` reads
files: [sql/*.sql]
targets:
  dev:  {mode: development, variables: {catalog: warehouse}}
  prod: {mode: production,  variables: {catalog: warehouse}, runAs: pipeline-shop}
```

`resources/daily.yaml` is one pipeline. Its statement lives in a file of the bundle and is read in when you deploy:

```yaml
name: daily
sqlFile: sql/daily.sql
params:
  catalog: "${var.catalog}"
schedule:
  cron: "0 3 * * *"
  timezone: UTC
```

`validate` prints one sentence per problem and exits `2`: an unknown key, a variable without a value in some target, a pipeline file
that is not a pipeline or has none (or two) of `sql`, `sqlFile` and `notebook`, a `sqlFile` that is not among the bundle's files, a
`schedule` without both `cron` and `timezone`, a `production` target without `runAs: pipeline-<group>`, a path that leaves the
bundle, a symbolic link, a file over 5 MiB. It checks what needs no cluster; whether the group's pipeline identity is ready is for
Nova to say when you plan or deploy.

## 2. Try it in your own development stage

`plan` asks Nova what deploying one target would do, and writes nothing. `deploy` does it:

```bash
stardelt bundle plan shop -t dev
stardelt bundle deploy shop -t dev
```

```text
{"action": "would-create", "name": "dev-alice-daily"}
{"action": "created", "name": "dev-alice-daily"}
```

Each pipeline file gets the target's variables, its `sqlFile` is read into `sql`, and the bundle's group is its `ownerGroup` when the
file names none. Then Nova checks every pipeline with the rules of a create (your group, the group's pipeline identity, the
statement, the schedule). A `development` target deploys under `dev-<your sign-in name>-<pipeline>` and without a schedule, so two
people can deploy one bundle side by side and nothing runs on its own. Start it yourself and wait for it
([Run a pipeline and wait for it](sdk-cli-mcp.md#run-a-pipeline-and-wait-for-it)):

```bash
stardelt run NAMESPACE dev-alice-daily --wait
```

## 3. Check a change in a pull request

A pull request job needs two commands. The first needs nothing from the cluster; the second asks Nova and writes nothing:

```bash
stardelt bundle validate pipelines/            # no host, no sign-in
stardelt bundle plan pipelines/ -t prod        # STARDELT_NOVA_URL and STARDELT_TOKEN set
```

`plan` prints one line per pipeline, the same lines as `stardelt apply --dry-run`: `would-create` or `would-update`, with
`changes` (which of `statement`, `schedule`, `params`, `options` and `deployment` would change) and, for a scheduled pipeline, the
next runs. A pipeline someone changed by hand after its last deploy also carries `"modified": true`, with one warning on standard
error, so the reviewer sees that the deploy would overwrite that change. If Nova refuses any pipeline, **nothing would be written**: the sentences are shown
(`prod: daily: you are not a member of the group shop`), what passed is still listed, and the command exits `2`, so the job fails.
The token is one Nova accepts for a member of the bundle's owner group; keep it in the CI system's secret store, never in a file
of the repository.

## 4. Publish to production

```bash
stardelt bundle deploy shop -t prod
```

```text
{"action": "created", "name": "daily"}
```

`deploy` runs the same check as `plan` first. Only when Nova accepts every pipeline does it create or update them; a refusal
anywhere means nothing is written. A `production` target deploys the pipelines under the names the files give, with their
schedules.

Every pipeline is sent with where it came from: the bundle's name, the target and the Git commit of the bundle directory (`-dirty`
is appended when files are uncommitted; outside a Git checkout there is no commit). Nova stamps that on the pipeline, and the
pipeline page shows it under **Deployed from**, with who deployed it and when. A pipeline made in the interface or with
`stardelt apply` has no such stamp. To go back to an earlier state, check out the earlier commit and deploy again.

## 5. Keep Git and the stage in step

**Remove what the bundle dropped.** `--prune` (on `plan` and `deploy`) also handles the pipelines an earlier deploy of this bundle
target stamped and the bundle no longer names: `plan` lists them as `would-delete`, and `deploy` removes them (`deleted`) only
after every create and update succeeded. A pipeline made by hand, or stamped by another bundle or target, is never touched, and a
development target removes only your own `dev-<your name>-` pipelines.

**Bring in what was made in the interface.** `stardelt bundle generate NAMESPACE NAME shop` writes a pipeline made on the
Pipelines page into the bundle in `shop`: `resources/<name>.yaml`, and for a statement `sql/<name>.sql` with `sqlFile` pointing at
it (the bundle's group stands in for `ownerGroup`). It never overwrites a file, and when it writes nothing it says why in one
sentence: the pipeline belongs to another group than the bundle, cannot be changed from a file, or the bundle's `include`
or `files` would not pick the new file up. Run `stardelt bundle validate shop`, commit, and the next `deploy -t prod` updates that pipeline
and stamps it, so **Deployed from** appears and the next change goes through Git. To look at a pipeline without putting it in a
bundle, `stardelt export NAMESPACE NAME` prints it as a file that `stardelt apply -f` accepts (see
[Python, command line and agents](sdk-cli-mcp.md)).

**See what was changed by hand.** When someone changes a deployed pipeline after its deploy, with the form, the YAML editor or
`kubectl`, its page says **Changed since the last deploy** under **Deployed from**. The next deploy of the bundle overwrites that
change, so the page tells you whether a deploy would lose work; `bundle plan` and `bundle deploy` say the same with `"modified": true`
and a warning on standard error, and `deploy` still goes ahead. It compares the statement or notebook, the schedule, the
parameters and the options; the pause state and the group are not part of it. A pipeline that was deployed before this check
existed shows nothing until its next deploy.

## What is not there yet

- A notebook that is a file of the bundle: publish the notebook and name its version in the pipeline file.
- A record of what was deployed when, and a rollback button: the stamp on each pipeline says which commit it runs; to go back,
  deploy the earlier commit.
- A temporary stage per pull request, and a way to make a deploy stop instead of overwriting a change made by hand.
