---
title: "Schedule SQL and notebooks"
sidebar_label: "Schedule SQL and notebooks"
slug: /guides/schedule
---

# Schedule SQL and notebooks

A schedule is a **pipeline** that runs on a cron. It runs a SQL statement from the SQL editor, or a pinned version of a notebook, as one of your groups: the pipeline runs as the group's service identity, so it reaches exactly what the group may reach, not what you personally may. A published notebook is an immutable copy, and a schedule pins one version of it. Runs, logs and state are on the **Pipelines** page.

:::note Which catalog the examples use
The examples name `warehouse`, the platform's own catalog. On an install with sign-in it is **administrators only**: use a catalog your groups were granted. The **Catalogs** page lists yours, and `SHOW CATALOGS` answers the same question in the SQL editor.
:::

## Before you start

- You are a member of at least one group (see **Profile**). Publishing and scheduling answer `you are not a member of the group <g>` otherwise, administrators included.
- The group's pipeline identity `pipeline-<group>` exists. If not, the dialog says `No principal for this group yet`, and the group's row names the command an administrator runs: `make sync-principal NAME=pipeline-<group> GROUP=<group>`. See [Service principals](service-principals).
- Write SQL with **fully qualified names** (`warehouse.analytics.daily_trips`): a scheduled statement has no default catalog or schema. One statement per schedule; a trailing `;` is fine.
- Do not put passwords or tokens in SQL. The statement is stored in the pipeline and shown to every member of the group.

## The four words

| Word | What it is | Where you see it in Nova |
|---|---|---|
| **Notebook** | one `.ipynb` file, owned by a group | **Notebooks**, and the notebook's own page |
| **Version** | one immutable published copy, named by its `objectVersion` | the notebook's **Versions** table |
| **Schedule** | a one-task pipeline that runs one version, or a multi-step pipeline that uses it | **Pipelines**, and the Schedule dialog |
| **Run** | one execution of a schedule | **Runs** (every run in one table) and the run list on the schedule's pipeline page |

The four are separate on purpose: publishing again never changes what an existing schedule runs, and a run never changes the notebook.

## Publish a notebook version

**Publish.** In JupyterLab, open the notebook and press **Publish** in its toolbar. The dialog saves the notebook, prefills the name and lets you pick the group. From a cell, in the file's directory, use `stardelt.publish`:

```python
import stardelt
stardelt.publish("daily_trips.ipynb")
```

The group defaults to your only group; if you belong to several, name it: `stardelt.publish("daily_trips.ipynb", group="analytics")`. From a laptop, after `stardelt login`: `stardelt notebook publish daily_trips.ipynb --group analytics`.

- The name must match `^[A-Za-z0-9][A-Za-z0-9._ -]{0,127}\.ipynb$` and the file must be at most 5 MiB.
- Before storing, every code cell's `outputs` is emptied and the notebook's widget metadata is removed, so cell output never reaches the object store.
- One person may publish at most 60 notebooks an hour; the 61st is refused with `429`.
- Inside a Git checkout, a version records the repository, commit, path and whether the file was clean. Nova stores that as the publisher's claim and does not check it against a Git server.

**Parameters.** Tag one cell `parameters` (right-click the cell and choose **Mark as parameters cell**) and write one `name = literal` line per parameter:

```python
region = "eu"
days = "3"
dry_run = False
```

Nova reads the lines of the first tagged cell, at most 32. Defaults stay text and are never evaluated. The Schedule dialog shows one field per parameter, and the values a schedule sends are strings: `days` arrives as `"3"`, so convert them where you use them. A scheduled notebook also receives `run_date` (`YYYY-MM-DD`) and `run_id`, which are reserved names.

**Versions.** **Notebooks**, then the notebook's name, shows its **Versions** table: newest first, at most 50, each row with its `objectVersion`, size, publisher, source (`commit abc1234 · host/org/repo`, or `published by hand`) and the start of the `sha256`. Every publish of different bytes stores a new immutable version; the old one stays, so a schedule that pinned it keeps running the old bytes. Deleting a notebook deletes every version, and a schedule that pinned one fails its next run.

**Compare two versions.** Under a version's preview, **Compare with** lists the other versions. Choose one and **What changed** shows the changed, added and removed cells, each with a line diff of its source. Cells are matched by position, so a cell inserted in the middle shows as changed from that point on. Comparing changes nothing.

## Schedule a SQL statement

1. Open **SQL editor**, write the statement and check it runs.
2. Press **Schedule**. The dialog **Schedule this statement** opens with your statement.
3. Fill in:
   - **Name**: 1 to 40 lower-case letters, digits and dashes, starting with a letter.
   - **Group**: the group that owns the pipeline; groups without a ready identity are disabled and say why.
   - **When**: *On demand only*, *Every hour*, *Every day at*, *Every weekday at*, *Every week on*, *Every month on the 1st at*, or *Custom schedule*.
   - **Time zone**: your browser's zone by default; the time of day is read in it.
   - **Statement**: editable, up to 20,000 characters.
4. **Create schedule**. The pipeline appears under **Pipelines** within a minute.

**Custom schedule** takes five fields, `minute hour day month weekday`, for example `0 3 * * *` (03:00 every day) or `30 6 * * 1-5` (06:30 on weekdays). A schedule may run **at most once every 5 minutes**.

### Use the date of the run

A statement may contain these placeholders, filled in when the run starts; an unknown placeholder fails the run instead of reaching the engine:

| Placeholder | Value |
|---|---|
| `${run.date}` | the date of the run, `YYYY-MM-DD` |
| `${run.id}` | the id of the run |
| `${params.<name>}` | a parameter of the pipeline (set in its YAML; the dialog does not offer parameters, the **Run now** form does, for one run) |

```sql
INSERT INTO warehouse.analytics.daily_trips
SELECT pickup_date, count(*) AS trips
FROM warehouse.nyc_taxi.trips
WHERE pickup_date = DATE '${run.date}'
GROUP BY pickup_date
```

## Schedule a notebook version

It is the same dialog, **Schedule this notebook**: switch the run kind to *Notebook*, or press **Schedule** on a row of **Notebooks** (**Schedule latest** on the notebook page schedules the newest version, **Schedule this version** on a version's row pins that one). It adds **Notebook** and **Version** and one field per parameter, prefilled with its default; **Advanced** holds retries, the wait between them, the time limit and whether runs may overlap. Under the fields the dialog states the identity that runs it, `pipeline-<group>`. The schedule pins the version it was created with, and in edit mode the Version list also offers *Use newest version*.

On the notebook page, **Where it is used** marks a schedule that runs an older version (“2 versions behind”); **Move to newest** opens its edit dialog on the newest version.

In a production stage, creating or editing a schedule for a notebook that no bundle deploy stamped is refused with `In production a notebook comes from Git. Deploy it with a bundle.` A schedule that already exists keeps running.

## Manage a schedule

Open the pipeline under **Pipelines**; members of the owning group see and manage it.

- **Run now** starts one run for a chosen date and parameters, without changing the schedule. It is refused while the pipeline is paused or a run is active.
- **Pause** and **Resume** stop and restart the schedule. **Stop run** cancels the running statement; a change the engine already committed is not undone.
- **Edit schedule** changes the statement and the schedule, not the name or the group. Its **Tell … when a run ends** block offers the [destinations](destinations.md) of the group for failure, success and recovery.
- **Delete pipeline** removes it, and its past runs disappear from the page.
- Defaults: one run at a time, **one retry after 5 minutes**, **2 hours** per run. At most ten schedules may be created per person per hour.

A pipeline written in YAML can be run, paused and stopped here, but must be changed where it came from; **Show definition** says so.

**Watch it run.** Every run of every schedule is on [Runs](runs.md). One schedule's runs are in its **Runs** table; open a run to see its tasks and **View log**. A failed run shows the engine's error, and **Retry failed tasks** re-runs only the tasks that failed. For a notebook task, **Open notebook** opens the executed copy with every cell's output, drawn in a sandboxed frame, opened at the failed cell with the exception named; **Traceback** unfolds it, and **Download** gives the file. Executed copies are kept for 30 days by default.

## When it refuses

| Sentence | What it means |
|---|---|
| `No principal for this group yet…` | the group has no pipeline identity: ask an administrator |
| `you are not a member of the group <g>` | pick one of your own groups |
| `a pipeline with this name already exists` | choose another name |
| `at most one run every 5 minutes` | the schedule is too frequent |
| `a schedule has five fields: minute hour day month weekday` | the custom schedule is malformed |
| `unknown timezone` | pick a zone from the list |
| `the pipeline is paused: resume it first` | **Run now** on a paused pipeline |
| `a run is already active: wait for it or stop it` | one run at a time |
| `this pipeline is managed outside Nova (kubectl or Git); change it there` | it was not created from the dialog |
| `the pipeline changed while you edited it: reload` | somebody changed it after you opened the definition: reload it and make your change again |
| `notebook storage is not configured` | the platform has no notebooks bucket. Every notebook call answers with this and `503`: an administrator installs JupyterHub with its notebook storage. |
| `that notebook version does not exist in group <g>` | the schedule pins a version that is not in the store: it was deleted, or it belongs to another group. Publish again and point the schedule at the new version. |
| `too many notebooks published this hour; wait before publishing another` | the publish limit, `429`: at most 60 publishes per person per hour. |
| `No notebook is published in this group yet.` | the Schedule dialog has no version to pin in this group. Publish one first. |

## Keep notebooks in Git

Clone once, then work from the Git panel. Open a terminal in JupyterLab and clone with your own access token:

```bash
git clone https://github.com/your-org/your-analysis.git ~/your-analysis
```

The token is yours and stays in your notebook environment: typed at the prompt, stored in the `git` credential helper, or exported as `GITHUB_TOKEN` for the session. It never enters the image and is never committed. Day to day, the **Git panel** (`jupyterlab-git`) on JupyterLab's left shows changed files, diffs, branches and history; stage, commit, pull and push from there. A database or API credential belongs in a connection, read with `stardelt.connection()`; see [Connections and secrets](connections).

`nbgitpuller` turns a repository into a link that clones (or fast-forwards) into whoever clicks it, for a training session. Build it with the [nbgitpuller link generator](https://nbgitpuller.readthedocs.io/en/latest/link.html); it looks like this:

```text
https://<your-hub>/hub/user-redirect/git-pull?repo=https://github.com/your-org/training-day
    &urlpath=lab/tree/training-day/exercise-01.ipynb
    &branch=main
```

Public hosts work out of the box. A self-hosted server inside your company network needs its address ranges listed by whoever runs the platform: private addresses stay denied except for an explicit, HTTPS-only grant (`notebooks.gitHosts`). If `git clone` hangs against your internal server, ask for that grant.

Pipelines as files come from a bundle; see [Publish pipelines from Git](./publish-pipelines).
