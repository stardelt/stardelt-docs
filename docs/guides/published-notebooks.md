---
title: "Publish, schedule and watch a notebook"
sidebar_label: "Published notebooks"
slug: /guides/published-notebooks
---

# Publish, schedule and watch a notebook

A notebook you write in JupyterHub lives in your own home directory. The platform runs nothing from
there: it runs a **published** copy, which is immutable and pinned by a schedule. This page follows one
notebook from the publish call to its runs, and explains the four words Nova uses for it.

## The four words

| Word | What it is | Where you see it in Nova |
|---|---|---|
| **Notebook** | one `.ipynb` file, owned by a group | **Notebooks**, and the notebook's own page |
| **Version** | one immutable published copy, named by its `objectVersion` | the notebook's **Versions** table |
| **Schedule** | a one-task pipeline that runs one version, or a multi-step pipeline that uses it | **Pipelines**, and the Schedule dialog |
| **Run** | one execution of a schedule | **Runs** (every run in one table) and the run list on the schedule's pipeline page |

The four are separate on purpose: publishing again never changes what an existing schedule runs, and a
run never changes the notebook.

## Before you start

- A JupyterHub server. It signs you in with the same Keycloak account as Nova, so `stardelt.publish`
  already knows who you are.
- Membership of the group that will own the notebook. Publishing and scheduling answer
  `you are not a member of the group <g>` otherwise, administrators included.
- For scheduling, the group's pipeline principal `pipeline-<group>`. Without it the group's row on
  **Notebooks** says so and names the command an administrator runs, and the Schedule dialog disables
  that group in its list: `make sync-principal NAME=pipeline-<group> GROUP=<group>`. See
  [Service principals](service-principals).

## Publish

In JupyterLab, in a notebook in the file's directory, run a cell:

```python
import stardelt
stardelt.publish("daily_trips.ipynb")
```

The call sends the file to `PUT /api/notebooks/{group}/{name}` and prints what was stored: the name,
the group, the version, its `sha256` and the parameters it found. The group defaults to your only
group; if your account belongs to several, name it: `stardelt.publish("daily_trips.ipynb",
group="analytics")`.

The rules:

- The name must match `^[A-Za-z0-9][A-Za-z0-9._ -]{0,127}\.ipynb$` and the file must be at most
  5 MiB.
- Every publish stores a **new immutable version**. Publishing the same bytes again stores nothing and
  answers the existing version.
- Before storing, every code cell's `outputs` is emptied and its `execution_count` set to null, and the
  notebook's widget metadata is removed. **Cell output never reaches the object store** — the executed
  copy of a run is uploaded separately and is not part of the published version.
- The 61st publish by one person in an hour is refused with `429`: one person may publish 60
  notebooks an hour.

## Parameters

Tag one cell `parameters` (in JupyterLab, the cell's tag list in the right-hand property inspector) and
write one `name = literal` line per parameter:

```python
region = "eu"
days = "3"
dry_run = False
```

Nova reads the lines of the first cell carrying that tag, in order, at most 32; the first occurrence of
a name wins, and comments and blank lines are ignored. Defaults stay text and are never evaluated, so a
default cannot run code. Quoted strings lose their quotes (`"eu"` becomes `eu`); every other literal
is kept as written.

The Schedule dialog turns those lines into one field per parameter, filled with the default, and the
notebook's page lists them under **Parameters of** the chosen version. The values a schedule sends are
strings: `days` arrives in the notebook as `"3"`, and `dry_run` as `"False"` — convert them where you
use them.

A scheduled notebook also receives two parameters the platform sets: `run_date` (`YYYY-MM-DD`, the date
of the run) and `run_id` (the id of the run). Both are reserved: a saved parameter of the same name
cannot date the run differently from the run the scheduler started.

## Versions

**Notebooks** → the notebook's name opens its page: the newest version, its publisher and time, and
the **Versions** table. Versions are listed newest first, at most 50, and each row carries its
`objectVersion`, size, publish time, publisher and the first 12 characters of the `sha256` of the
stored bytes.

A version is immutable. A correction is a new publish, which becomes a new version — the old one stays
as it was, so a schedule that pinned it keeps running the old bytes. Pick a version's row to see that
version's parameters.

Deleting a notebook deletes **every** version of it. A schedule that pinned a deleted version fails its
next run; publish again and point the schedule at the new version.

## Schedule a version

Two ways in:

- **Notebooks**, the **Schedule** button on a row (or **Schedule latest** on the notebook page):
  it schedules the newest version.
- **Schedule this version** on a version's row on the notebook page: it pins that version.

The dialog **Schedule this notebook** then asks for:

- **Name** and **Group** — the pipeline and the group that owns it.
- **Notebook** and **Version** — the file and the immutable version to run.
- **Parameters** — one field per parameter of that version, prefilled with its default.
- **When** and **Time zone** — the clock the schedule follows.
- **Advanced** — retries, the wait between them, the time limit and whether runs may overlap.

Under the fields the dialog states which identity runs the schedule: the group's principal
`pipeline-<group>`, so the run reaches exactly what the group may reach — not what you personally may.
It is not you who runs when the clock fires.

The schedule **pins** the version it was created with: publishing again does not change what it runs.
Each edit can pin another version; in edit mode the Version list also offers *Use newest version*.

For the timing presets, the custom cron and the advanced options see
[Schedule a SQL statement](schedule-sql); the same dialog and the same limits apply. For the identity
behind the run see [Service principals](service-principals).

## Watch it run

### All runs in one place

**Build** → **Runs** lists every run of the notebooks and pipelines your groups own, newest first, at
most 100. The columns are Pipeline, Kind, State, Started, Duration and Trigger; the pipeline name opens
the schedule. Filter by kind (SQL, Notebook, Pipeline), by state (`running`, `queued`, `success`,
`failed`, `skipped`, `upstream_failed`) and by group; the filters are kept in the address bar, so
`/runs?kind=notebook&state=failed` can be bookmarked or sent to a colleague. While a listed run is
running or queued the page refreshes itself every five seconds; otherwise reload it.

### One schedule's runs

Open **Pipelines**, then the schedule, then its **Runs** table. Each row shows the run's state, how it
was triggered, when it started and how long it took. Open a run to see its tasks; **View log** shows the
task's technical log, and **Open notebook** on a notebook task opens the run's executed notebook — the
copy the run wrote, with every cell's output. The pipeline's facts at the top also show the pinned
notebook and the parameter values the schedule stores.

A run that fails is `failed`. Its executed notebook opens at the cell that failed, and the page names
the exception above the notebook; **Traceback** unfolds the full trace. **Download** gives the executed
notebook as a file, and **Run again** starts a new run of the schedule. Cell output is not trusted: it
is drawn inside a sandboxed frame that cannot reach Nova, your session or the network, so an output that
carries a chart, HTML or a script cannot touch the page around it. A run whose executed copy was never
written, or has expired, says so and points at the task log instead.

## When it does not work

| Sentence | What it means |
|---|---|
| `notebook storage is not configured` | the platform has no notebooks bucket. Every notebook call answers with this and `503`: an administrator installs JupyterHub with its notebook storage. |
| `you are not a member of the group <g>` | the group you publish to or schedule in is not one of your groups. |
| `that notebook version does not exist in group <g>` | the schedule pins a version that is not in the store: it was deleted, or it belongs to another group. Publish again and point the schedule at the new version. |
| `too many notebooks published this hour; wait before publishing another` | the publish limit, `429`: at most 60 publishes per person per hour. |
| `No notebook is published in this group yet.` | the Schedule dialog has no version to pin in this group. Publish one first. |
