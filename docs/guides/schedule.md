---
title: "Schedule SQL and notebooks"
sidebar_label: "Schedule SQL and notebooks"
slug: /guides/schedule
description: "Turn a SQL statement or a pinned notebook into a pipeline on a cron, owned by a group and run as it."
---

# Schedule SQL and notebooks

A schedule is a **pipeline** on a cron: one SQL statement or one pinned notebook version, owned by one
of your groups and run as that group's service identity, so it reaches only what the group may. A SQL
editor statement becomes a pipeline without YAML; a notebook runs as a **published**, immutable copy
that a schedule pins. Runs and logs are on **Pipelines**.

## Before you start

- You are a member of at least one group (see **Profile**); otherwise publishing and scheduling answer
  `you are not a member of the group <g>`, administrators included.
- JupyterHub signs you in with your Nova account, so `stardelt.publish` already knows you.
- The group's pipeline identity `pipeline-<group>` exists; otherwise the dialog says `No principal for
  this group yet` and the group's row names what to create: a `ServicePrincipal` named
  `pipeline-<group>` with `spec.ownerGroup: <group>`. On a `make install` platform the same row also
  names `make sync-principal NAME=pipeline-<group> GROUP=<group>`
  ([Service principals](service-principals)).
- Use **fully qualified names** (`warehouse.analytics.daily_trips`): a scheduled statement has no
  default catalog or schema. One statement per schedule; a trailing `;` is fine.
- No passwords or tokens in SQL: the statement is shown to every member of the group (there is
  deliberately no secret function in SQL).

## The four words

| Word | What it is | Where you see it in Nova |
|---|---|---|
| **Notebook** | one `.ipynb` file, owned by a group | **Notebooks**, and the notebook's own page |
| **Version** | one immutable published copy, named by its `objectVersion` | the notebook's **Versions** table |
| **Schedule** | a one-task pipeline that runs one version, or a multi-step pipeline that uses it | **Pipelines**, and the Schedule dialog |
| **Run** | one execution of a schedule | **Runs** (every run in one table) and the schedule's run list |

The four are separate on purpose: publishing again never changes what an existing schedule runs, and a
run never changes the notebook.

## Publish a notebook version

Press **Publish** in the notebook's JupyterLab toolbar: it saves the notebook, prefills the name, lets
you pick the group and says that scheduled runs use the group's principal, not you.
Uncommitted Git changes warn `Uncommitted changes: the published version will not match a commit.` and
still publish. From a cell, or from a laptop after `stardelt login`:

```python
import stardelt
stardelt.publish("daily_trips.ipynb")
```

It sends the file to `PUT /api/notebooks/{group}/{name}` and prints the name, group, version, `sha256` and
parameters found; the group defaults to your only one. A version also records the repository and commit
it came from, as the publisher's unchecked claim.

The name matches `^[A-Za-z0-9][A-Za-z0-9._ -]{0,127}\.ipynb$` and the file is at most 5 MiB. Every
publish stores a **new immutable version**; the same bytes again store nothing and answer the existing
one. Each code cell's `outputs` and widgets are stripped before storing: **cell output never reaches the
object store**. The 61st publish by one person in an hour is refused with `429`: at most 60 publishes
per person per hour.

### Parameters

Tag one cell `parameters` (**Mark as parameters cell**) and write one `name = literal` line per
parameter:

```python
region = "eu"
days = "3"
dry_run = False
```

Nova reads the first cell with that tag, at most 32 lines; the first occurrence of a name wins,
comments and blanks are ignored. Defaults stay text and are never evaluated, so a default cannot run
code; quoted strings lose their quotes.

The Schedule dialog turns each line into a field prefilled with the default, and the notebook's page
lists them under **Parameters of** the version. Values arrive as strings (`days` is `"3"`), so convert
them. The platform also sets reserved `run_date` and `run_id`, which a saved parameter cannot override.

### Versions

**Notebooks** → the notebook's name opens its page: the newest version and the **Versions** table, newest
first, at most 50 rows with each version's `objectVersion`, size, time, publisher, source and short
`sha256`. **From Git** shows `commit abc1234 · host/org/repo`, linked when it
starts `https://`; without a source, `published by hand`.

A version is immutable: a correction is a new publish, and a schedule that pinned the old one keeps the
old bytes. Deleting a notebook deletes **every** version, so a schedule pinned to one fails its next run:
publish again and repoint it.

### Compare two versions

Under the preview, **Compare with** lists every other version; a **What changed** card names the pair,
`<from> → <to>`, and counts changed, added and removed cells, each by position with a line diff of its
source. Cells are matched by position, so an inserted cell shows as changed from there on, and only
the source is compared. **Move to newest** in **Where it is used** moves a schedule, marked "2 versions
behind" when it lags.

## Schedule a SQL statement

1. Open **SQL editor**, write the statement and check it runs.
2. Press **Schedule**; the dialog **Schedule this statement** opens with your statement.
3. Fill in **Name** (1 to 40 lower-case letters, digits and dashes, starting with a letter), **Group**
   (groups without a ready identity are disabled and say why), **When** (*On demand only*, *Every hour*,
   *Every day at*, *Every weekday at*, *Every week on*, *Every month on the 1st at* or *Custom
   schedule*), **Time zone** (your browser's; the time of day is read there) and **Statement** (editable,
   up to 20,000 characters).
4. **Create schedule**; the pipeline appears under **Pipelines** within a minute.

**Custom schedule** takes five fields, `minute hour day month weekday`: `0 3 * * *` is 03:00 every day,
`30 6 * * 1-5` is 06:30 on weekdays. A schedule runs **at most once every 5 minutes**.

### Use the date of the run

These placeholders are filled in when the run starts; an unknown one fails the run instead of reaching
the engine:

| Placeholder | Value |
|---|---|
| `${run.date}` | the date of the run, `YYYY-MM-DD` |
| `${run.id}` | the id of the run |
| `${params.<name>}` | a parameter of the pipeline (set in its YAML; the dialog offers none yet) |

The schedule dialog offers no parameters; the pipeline page's **Run now** form does, for one run.

```sql
INSERT INTO warehouse.analytics.daily_trips
SELECT pickup_date, count(*) AS trips
FROM warehouse.nyc_taxi.trips
WHERE pickup_date = DATE '${run.date}'
GROUP BY pickup_date
```

## Schedule a notebook version

Two ways in: **Schedule** on a **Notebooks** row (or **Schedule latest** on the notebook page) schedules
the newest version; **Schedule this version** pins that one. It is the dialog above with **Notebook**
and **Version** instead of **Statement**, one **Parameters** field per parameter, and **Advanced** for
retries, their wait, the time limit and overlapping runs; the group's principal `pipeline-<group>` runs
it.

The schedule **pins** the version it was created with: publishing again does not change what it runs. An
edit can pin another; in edit mode the Version list also offers *Use newest version*.

**Production.** Where the stage's mode is production, a schedule for a notebook that no bundle deploy
stamped is refused with `In production a notebook comes from Git. Deploy it with a bundle.`, checked on
save; an existing schedule keeps running, with **Deployed from** saying `Not from Git — this notebook
was published by hand.`

## Manage a schedule

A run is also in your **Query log** with the source *Pipeline task*; the defaults are one run at a time,
**one retry after 5 minutes** and **2 hours** per run.

- **Run now** on the pipeline page asks for the run date and parameters, for that run only; on a
  **Pipelines** row it runs for today. Both are refused while the pipeline is paused or a run is active.
- **Pause** and **Resume** stop and restart the schedule; **Stop run** cancels the running statement and
  skips what follows (a committed change is not undone). **Retry failed tasks** re-runs only the tasks
  that failed.
- **Edit schedule** changes the statement and the schedule; name and group cannot change. Its **Tell …
  when a run ends** block offers **When it fails**, **When it succeeds** and **When it recovers**, each
  with the [destinations](runs.md#notification-destinations) of the pipeline's group only.
- **Delete pipeline** removes it; past runs disappear from the page.

Only members of the owning group see and manage it; a pipeline written in YAML is changed where it came
from ([Publish pipelines from Git](publish-pipelines.md)). A pipeline Nova owns is edited in place: see
[Edit a pipeline's YAML](#edit-a-pipelines-yaml). Every run is also in **Build** →
[**Runs**](runs.md); the schedule's **Runs** table shows state, trigger, start and duration, and a run
opens to its tasks, **View log** and **Open notebook**, the executed copy in a sandboxed frame. A failed
one opens at the failing cell with the exception and **Traceback**; copies are kept 30 days.

## When a scheduled run is missed

A pipeline does not catch up after the scheduler was down. Airflow creates a run only for a
fire time it was up for (`catchup=False` in the pipeline loader); a fire time that passed
while the scheduler was stopped gets no run, and the next fire time runs as usual. Nothing
is queued in secret, and no later run silently takes yesterday's date.

The run is therefore **missing**, not late: the runs list has no row for that date. If the
date's result matters, run it yourself with **Run now** on the pipeline page and pick the
missing date in the form, or from a terminal:

```console
$ stardelt run sales/orders --date 2026-11-25
```

The date applies to that run only; the stored schedule and its parameters do not change. For
several dates in a row use **Run for a range** on the same page (one run per date, oldest
first), which stops at the first failure.

## Edit a pipeline's YAML

A pipeline page has a **Definition** section, *"The pipeline as the document that creates it."* **Show definition** and **Hide definition** show it as YAML — the same document `stardelt export <group> <name>` prints and `stardelt apply -f` accepts.

Every pipeline you may see is readable. **Edit definition** appears only when Nova owns the pipeline; otherwise the panel says `This pipeline is managed outside Nova (kubectl or GitOps); change it where it comes from.` (created elsewhere) or `This pipeline has a shape the form cannot edit.` A pipeline deployed from a bundle carries `Deployed from <bundle> · <target> — the next deploy overwrites changes made here.`

Editing parses the text in the browser and, once it rests, asks Nova (`pipelines_validate`, which writes nothing). While it waits the panel says `Checking…`. A parse error reads `Line <N>: <sentence>`; Nova's refusals are a list under the editor. If the pipeline disappeared meanwhile: `This pipeline no longer exists. Reload the definition.` A passing check says `This changes: <fields>.` and `Next runs: <times>`. **Apply changes** is disabled until the check passes **and** something changes, or reads `Nothing changed.`; **Cancel** leaves the pipeline as it was. Applying an edit made against an older version answers a conflict with **Reload the definition** — the edit is never silently overwritten.

Only a member of the pipeline's owning group sees or changes it; the group cannot be changed from the
editor, and neither can the name and the owner group.

The schedule dialog still creates one-task pipelines; the YAML view is where a multi-task pipeline
(`dependsOn`) is read and edited.

### Limits

- At most ten schedules created per person per hour.
- Statement: 20,000 characters, one statement.
- The dialog creates **one task**. A pipeline written in YAML can have several steps with `dependsOn`;
  see the [Pipeline reference](../reference/resources/pipeline).
- Not available yet: triggers other than a clock.

## When it refuses

| Message | Meaning |
|---|---|
| `No principal for this group yet…` | the group has no pipeline identity: ask an administrator |
| `you are not a member of the group <g>` | pick one of your own groups |
| `a pipeline with this name already exists` | choose another name |
| `at most one run every 5 minutes` | the schedule is too frequent |
| `a schedule has five fields: minute hour day month weekday` | the custom schedule is malformed |
| `unknown timezone` | pick a zone from the list |
| `the pipeline is paused: resume it first` | **Run now** on a paused pipeline |
| `a run is already active: wait for it or stop it` | one run at a time |
| `this pipeline is managed outside Nova (kubectl or Git); change it there` | not created from the dialog |
| `the pipeline changed while you edited it: reload` | reload and edit again |
| `notebook storage is not configured` | no notebooks bucket: every notebook call answers this and `503` |
| `that notebook version does not exist in group <g>` | it was deleted, or is another group's: publish again and repoint |
| `too many notebooks published this hour; wait before publishing another` | the publish limit, `429` |
| `No notebook is published in this group yet.` | no version to pin here: publish one first |

## Keep notebooks in Git

Your analysis lives in version control, not in a pod's home directory: the notebook image ships `git`,
a **Git panel** in JupyterLab (`jupyterlab-git`) and a one-click cloner (`nbgitpuller`). Clone once with
your own access token, from a terminal in JupyterLab:

```bash
git clone https://github.com/your-org/your-analysis.git ~/your-analysis
```

The token is yours and stays in your notebook environment — typed at the prompt, stored in the `git`
credential helper, or exported as `GITHUB_TOKEN` — never in the image and never committed; the token that
clones a private repository is the one that pushes to it.

Day to day the **Git panel** shows changed files, diffs, branches and history: stage, commit, pull and
push there.

### Training sessions: share a link, not a clone command

`nbgitpuller` turns a repository into a link that clones or fast-forwards into whoever clicks it, in
their own home directory. Build it with the
[nbgitpuller link generator](https://nbgitpuller.readthedocs.io/en/latest/link.html):

```text
https://<your-hub>/hub/user-redirect/git-pull?repo=https://github.com/your-org/training-day
    &urlpath=lab/tree/training-day/exercise-01.ipynb
    &branch=main
```

Everyone lands with the same notebooks and their edits stay theirs; re-clicking pulls the latest
`main`.

### Reaching your git server

Public hosts work out of the box. A self-hosted server inside your network needs its addresses listed by
whoever runs the platform: single-user pods may egress to the public internet, but
private addresses stay denied except for an explicit, HTTPS-only grant (`notebooks.gitHosts`). If `git
clone` hangs, ask for that grant, not a token.

Pipelines as files come from a bundle: see [Publish pipelines from Git](./publish-pipelines).
