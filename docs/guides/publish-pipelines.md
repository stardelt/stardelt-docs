---
title: "Publish pipelines from Git"
sidebar_label: "Publish from Git"
slug: /guides/publish-pipelines
description: "Walk one bundle from a file in Git through a development stage, a pull request and production."
---

# Publish pipelines from Git

A team keeps its pipelines as files in Git and publishes them to a stage with one command. This page walks one example: a *bundle*
with one SQL pipeline that you describe, try in your own development stage, check in a pull request, publish to
production and keep in step with Git.

You need the `stardelt` package ([install and sign in](python.md#sign-in)) and, for everything except `init` and `validate`, a host
and a sign-in: `stardelt login`, or `STARDELT_TOKEN` in a CI job. In CI, sign in without a stored secret: see [Deploy from CI](/docs/guides/ci-deploys).

Your group also needs a *pipeline identity*: the service identity `pipeline-<group>` that its pipelines run as, which an
administrator creates once per group: a `ServicePrincipal` named `pipeline-<group>` with `spec.ownerGroup: <group>`. Until it is
ready, `plan` and `deploy` refuse with `No principal for this group yet` and name what to create (a
`ServicePrincipal` named `pipeline-<group>` with `spec.ownerGroup: <group>`; on a `make install` platform,
`make sync-principal NAME=pipeline-<group> GROUP=<group>`). In the platform checkout, `make demo-access` does all of it for the
group `demo` (`GROUP=` names another one) and also checks that the Catalogs `bronze`, `silver` and `gold` exist.

## 1. Describe what you publish

Every key and every command is listed on [Bundle reference](bundle-reference.md); this section shows the ones you need first.

A bundle is a directory in Git that says what a team publishes: the pipeline files, the notebooks and SQL they run, the
[dashboards](/docs/guides/dashboards) it promotes, and one target
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

A pipeline can run a notebook instead of SQL: give `notebook: {file: notebooks/explore.ipynb}` (a file named under `files`);
see [Bundle reference](bundle-reference.md#a-notebook-that-is-a-file-of-the-bundle).

`validate` prints one sentence per problem and exits `2`: an unknown key, a variable without a value in some target, a pipeline file
with none (or two) of `sql`, `sqlFile` and `notebook`, a `schedule` without both `cron` and `timezone`, a `production` target without
`runAs: pipeline-<group>`, a path that leaves the bundle, a symbolic link, a file over 5 MiB. It checks what needs no cluster.

## 2. Try it in your own development stage

`plan` asks Nova what deploying one target would do, and writes nothing. `deploy` does it:

```bash
stardelt bundle plan shop -t dev
stardelt bundle deploy shop -t dev
```

```text
{"action": "would-create", "name": "dev-alice-daily", "kind": "Pipeline"}
{"action": "created", "name": "dev-alice-daily", "kind": "Pipeline"}
{"action": "recorded", "id": 7}
```

A deploy asks Nova for the plan before it writes anything and records the plan's `planId` in the deployment row, so the row says which checked set was applied.

Each pipeline file gets the target's variables, its `sqlFile` is read into `sql`, and the bundle's group is its `ownerGroup` when the
file names none. A `development` target deploys under `dev-<your sign-in name>-<pipeline>` and without a schedule, so two
people can deploy one bundle side by side and nothing runs on its own. Start it yourself and wait for it:

```bash
stardelt bundle run shop -t dev
```

```text
{"action": "ran", "name": "dev-alice-daily", "runId": "manual__2026-11-01T08:00:00.000000+00:00", "state": "success"}
```

`bundle run` starts every pipeline the deploy left in your stage in turn and stops at the first that does not succeed
(exit code `1`); `--only daily` runs one, written without the `dev-alice-` prefix; to start any
pipeline, see [Run a pipeline and wait for it](cli.md#run-a-pipeline-and-wait-for-it).

## 3. Check a change in a pull request

A pull request job needs two commands. The first needs nothing from the cluster; the second asks Nova and writes nothing:

```bash
stardelt bundle validate pipelines/            # no host, no sign-in
stardelt bundle plan pipelines/ -t prod        # STARDELT_NOVA_URL and STARDELT_TOKEN set
```

`plan` prints one line per pipeline, the same lines as `stardelt apply --dry-run`: `would-create` or `would-update`, with
`changes` (which of `statement`, `schedule`, `params`, `options` and `deployment` would change) and, for a scheduled pipeline, the
next runs. If Nova refuses any pipeline, **nothing would be written**: the sentences are shown
(`prod: daily: you are not a member of the group shop`) and the command exits `2`, so the job fails.
The token is one Nova accepts for a member of the bundle's owner group; keep it in the CI system's secret store.

`plan` names the field that changes; add `--diff` to see the change itself: a unified diff of each changed field on standard error,
after the JSON lines, which stay as they are.

### A preview of the pull request

A reviewer should see the change run, not only read it. `--preview` deploys the bundle as a copy whose names carry the pull request's id and whose schedules are removed, so nothing fires and nothing touches the stage's own pipelines:

```bash
stardelt bundle deploy shop -t dev --preview pr-123          # pr-123-<pipeline>, no schedule
stardelt bundle deploy shop -t dev --preview pr-123 --ttl 3  # how many days it lives (1 to 30, default 7)
```

A preview is allowed on a **development** target only, and it creates or updates only the objects of this bundle and target: `pr-123-shop-1-bronze` is not the `shop-1-bronze` a merge deploys. The deploy records the id and the expiry on every pipeline and stream it writes (`stardelt.io/preview` and `stardelt.io/expires-at`); the pipeline page shows `preview pr-123 · expires …` under **Deployed from**, and Nova removes an expired copy within ten minutes, with one audit line per object.

A preview whose target has **pending migrations** is refused: a migration changes tables outside the copy. Deploy the target without `--preview` once, then deploy the preview. At most **five** previews of one bundle per person and **twenty** preview copies per stage exist at once; the refusal names the copies to remove.

`stardelt bundle destroy shop -t dev --preview pr-123 --yes` removes the copy at once. Run it when the pull request closes, so the copy does not wait for its expiry.

## 4. Publish to production

```bash
stardelt bundle deploy shop -t prod
```

```text
{"action": "created", "name": "daily", "kind": "Pipeline"}
{"action": "recorded", "id": 7}
```

`deploy` runs the same check as `plan` first, and a refusal anywhere means nothing is written. A `production` target uses the names the files give, with their schedules.

Every pipeline is sent with where it came from: the bundle's name, the target and the Git commit of the bundle directory (`-dirty`
is appended when files are uncommitted; outside a Git checkout there is no commit). Nova stamps that on the pipeline, and its
page shows it under **Deployed from**, with who deployed it and when. The Pipelines page shows it in its **Source** column
(`Git · shop-etl/prod @ 0123abc`; `Nova` for a pipeline made in the interface). Each deploy is also recorded (the bundle, the stage, the commit, who ran it and what it touched); [what the page shows](#the-deployments-page).

To read it for the whole bundle at once, `stardelt bundle summary shop -t prod` prints one line per object the target left on the
stage — a pipeline, a stream app or a dashboard: its `name`, the Git `revision`, `deployedBy`, `deployedAt` and `"modified": true` when someone changed
it after the deploy. The command only reads.

## 5. Keep Git and the stage in step

**Remove what the bundle dropped.** `--prune` (on `plan` and `deploy`) handles the pipelines and stream apps an earlier deploy
of this bundle target stamped and the bundle no longer names: `plan` lists them as `would-delete`, and `deploy` removes them
(`deleted`) only after every create and update succeeded. A pipeline or stream made by hand, or stamped by another bundle or
target, is never touched.

**Empty a stage.** `stardelt bundle destroy shop -t dev` lists, as `would-delete`, every pipeline an earlier deploy of this bundle
target put on the stage, and `--yes` removes them (`deleted`). In a development target it removes only your own
`dev-<your name>-` pipelines. Pipelines made by hand or stamped by another bundle or target stay, and so do the files of the bundle.

**Bring in what was made in the interface.** `stardelt bundle generate NAMESPACE NAME shop` writes a pipeline made on the
Pipelines page into the bundle in `shop`: `resources/<name>.yaml`, and for a statement `sql/<name>.sql` with `sqlFile` pointing at
it (the bundle's group stands in for `ownerGroup`). It never overwrites a file, and when it writes nothing it says why in one
sentence. Run `stardelt bundle validate shop`, commit, and the next `deploy -t prod` updates and stamps that pipeline. To look at a pipeline without putting it in a
bundle, `stardelt export NAMESPACE NAME` prints it as a file that `stardelt apply -f` accepts (see
[Python](python.md)).

**See what was changed by hand.** When someone changes a deployed pipeline after its deploy, its page says **Changed since the last deploy** under **Deployed from**, and `bundle plan` and `bundle deploy` print `"modified": true` with a warning; the next deploy overwrites that change, and `deploy` still goes ahead.

For a production stage you usually want more than a warning. Put `drift: block` on the target in `bundle.yaml`
(`prod: {mode: production, runAs: pipeline-shop, drift: block}`; the default is `drift: warn`): then `bundle plan` and
`bundle deploy` exit with `2` and name every pipeline that was changed after its deploy, and a deploy writes nothing. Keep the change
in the bundle if it is right, and pass `--accept-drift` to overwrite what is left.

## 6. Go back

**From the page.** Open **Deployments**, choose the bundle and stage, and open the row you want to return to under
[**Recorded deployments**](#recorded-deployments). Its detail has a **Roll back** action: it asks you to confirm, naming the
bundle and stage and the deployment number (`Roll back shop-etl · prod to deployment #12?`), and then replays the documents
that row recorded. It is offered to administrators and to members of the group that owns the pipelines, the bundle's
`ownerGroup`.

**From the command line.** `stardelt bundle rollback --deployment 12` reads the row and checks every stored document without
writing; add `--yes` to create and update the pipelines. The number comes from `stardelt deployments list`, which prints the
newest recorded deploys first in the columns `id bundle target commit status by when`, or from the page:

```console
$ stardelt deployments list --bundle shop-etl --target prod
id  bundle    target  commit   status   by    when
12  shop-etl  prod    9f3c2a1  applied  alex  2026-11-20T18:12:04Z
$ stardelt bundle rollback --deployment 12
stardelt: nothing was written; add --yes to replay deployment 12
```

`stardelt deployments show 12` prints that row's facts, one line per pipeline it wrote or removed and per bundle file it
read; `--resources` adds the stored documents as JSON. The commit is the first seven characters of the revision, and `—`
stands in for a deploy whose bundle directory was outside a Git checkout.

**What a rollback is not.** It does not read Git and does not need the repository: the documents are the ones recorded with
that deploy. It records a **new** deployment whose row links to the one it replayed, and whose **Deployed by** is the person
who ran it. Pipelines the recorded deploy deleted are not brought back.

**When it refuses.** A row whose status is not **Applied** has nothing to replay (`deployment 12 is failed: there is nothing
to roll back to`), and neither has a row recorded before the deployment record kept its documents (`deployment 12 recorded no
rendered resources (recorded before migration 0027): deploy it again and roll that back`). Both sentences are the CLI's.

## The Deployments page

The **Deployments** page answers one question for the whole stage: what did `stardelt bundle deploy` publish, and does it still match Git? It is for administrators (the **Admin** group of the navigation) and re-reads every 30 seconds. It has one section per bundle and stage; a pipeline made in the interface or with `stardelt apply` carries no stamp and is not in one.

### A stage

A section is headed `<bundle> · <target>`, for example `shop · prod`. A line under it reads `N pipelines · commit <short sha>`; when the pipelines run different commits it says `N different commits`, and when none recorded a commit, `no commit recorded`. Six columns follow:

- **Pipeline**: the name, linked to its page.
- **State**: the Pipelines page's badge.
- **Commit**: the short commit; a dash means the bundle directory was outside a Git checkout.
- **Deployed by**: who ran the deploy.
- **Deployed**: how long ago.
- **Since then**: **Changed since deploy** when someone edited the pipeline in Nova after the deploy, a dash otherwise. Git holds the older version, so the next deploy overwrites the edit.

### Recorded deployments

Below the sections is the deploy record: one row per finished `stardelt bundle deploy`, newest first, at most 50. A row is kept for at least ten days even when newer ones push it past 50. Six columns:

- **When**: how long ago.
- **Bundle · stage**: the bundle and the target.
- **Commit**: the short commit, `(uncommitted changes)` for a dirty tree, a dash outside a Git checkout.
- **Deployed by**: the name the sign-in provided, or the sign-in subject for a row recorded before Nova stored the name.
- **Status**: **Applied** for a finished deploy, or **Failed** for a row a writer recorded for a failed one.
- **Pipelines**: how many pipelines the deploy wrote or removed.

The record lives in Nova's database; an install without one shows a sentence saying so in place of the table.

### Not in Git

The **Not in Git** card is a warning and appears only when it has something to say: `A rebuild of this stage from Git would not bring these back. Add them to a bundle, or export them with stardelt export.` It lists the unstamped pipelines, each linked, and how many deployed ones were changed since deploy. To keep them, run `stardelt bundle generate` or `stardelt export` and commit the result.

### Compare two stages

When the install is configured with peer stages, a row of **Compare with** buttons sits above the sections, one per peer. Choose one and the page asks that stage for its pipelines with your own sign-in and shows the two side by side. The table has five columns: `Bundle · stage`, `Pipeline`, `Here`, a column named after the peer, and `Status`, which is one of:

- `only here`: this stage has the pipeline, the peer does not.
- `only in <peer>`: the peer has it, this stage does not.
- `changed in <peer>`: both have it, and the peer's copy was edited after its deploy.
- `same`: both run the same commit.
- `different commit`: both have it and run different commits.

When a row's commit differs and the stage has a repository URL, the row carries a **Promote via pull request** link to your forge's compare page, from the peer's commit to this stage's. Nova compares commits only and deploys nothing to the peer.

### When nothing has been deployed

A stage where no deploy has run shows `Nothing was deployed from a bundle yet. Pipelines made here or with stardelt apply are on the Pipelines page.` The link goes to the **Pipelines** page.

The page is built on `GET /api/pipelines` (the `deployment` stamp), `GET /api/stages/compare?peer=<name>` (`status: ok`, `unauthorized` or `unreachable`) and `GET /api/deployments`; [the API reference](/docs/reference/api) lists the fields.

## What is not there yet

- Publishing only the data whose checks passed: [Publish only checked data](checked-publishing.md).
- A comment on the pull request that links the preview's pipelines; today the deploy prints their names.
