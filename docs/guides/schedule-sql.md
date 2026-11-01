---
title: "Schedule a SQL statement"
sidebar_label: "Schedule a SQL statement"
slug: /guides/schedule-sql
---

# Schedule a SQL statement

Turn a statement from the SQL editor into a **pipeline** that runs on a schedule, without writing YAML. The pipeline belongs to
one of your groups and runs as that group's service identity, so it reaches exactly what the group may reach, not what you
personally may. Its runs, logs and state are on the **Pipelines** page.

## Before you start

- You are a member of at least one group (see **Profile**).
- An administrator has created the group's pipeline identity. If not, the dialog says
  `No principal for this group yet` and names the command the administrator runs.
- Write the statement with **fully qualified names** (`warehouse.analytics.daily_trips`): a scheduled statement has no default
  catalog or schema. One statement per schedule; a trailing `;` is fine.
- Do not put passwords or tokens in SQL. The statement is stored in the pipeline and shown to every member of the group.
  (There is deliberately no secret function in SQL.)

## Schedule it

1. Open **SQL editor**, write the statement and check it runs.
2. Press **Schedule**. The dialog **Schedule this statement** opens with your statement.
3. Fill in:
   - **Name**: 1 to 40 lower-case letters, digits and dashes, starting with a letter.
   - **Group**: the group that owns the pipeline (groups without a ready identity are disabled and say why).
   - **When**: one of *On demand only*, *Every hour*, *Every day at*, *Every weekday at*, *Every week on*, *Every month on the 1st at*,
     or *Custom schedule*.
   - **Time zone**: your browser's zone by default; the time of day is read in this zone.
   - **Statement**: editable, up to 20,000 characters.
4. **Create schedule**. The pipeline appears under **Pipelines** within a minute.

**Custom schedule** takes five fields, `minute hour day month weekday`, for example `0 3 * * *` (03:00 every day) or `30 6 * * 1-5`
(06:30 on weekdays). A schedule may run **at most once every 5 minutes**.

## Use the date of the run

A statement may contain these placeholders; they are filled in when the run starts, and an unknown placeholder fails the run
instead of reaching the engine:

| Placeholder | Value |
|---|---|
| `${run.date}` | the date of the run, `YYYY-MM-DD` |
| `${run.id}` | the id of the run |
| `${params.<name>}` | a parameter of the pipeline (set in the pipeline's YAML; the dialog does not offer parameters yet) |

```sql
INSERT INTO warehouse.analytics.daily_trips
SELECT pickup_date, count(*) AS trips
FROM warehouse.nyc_taxi.trips
WHERE pickup_date = DATE '${run.date}'
GROUP BY pickup_date
```

## What happens when it runs

- The statement runs on the query engine as the group's identity. Every run is also in your **Query log** with the source
  *Pipeline task*.
- Defaults: one run at a time, **one retry after 5 minutes**, and a limit of **2 hours** per run.
- A failed run shows the engine's error in its task log on the **Pipelines** page.

## Manage it

Open the pipeline under **Pipelines**:

- **Run now** starts a run at once (refused while the pipeline is paused or a run is already active).
- **Pause** and **Resume** stop and restart the schedule.
- **Stop run** cancels the running statement and skips what follows. A change the engine already committed is not undone.
- **Edit schedule** changes the statement and the schedule (the name and the group cannot change).
- **Show definition** shows the pipeline as the document that creates it, in YAML: the name, the group, the statement, the
  schedule, the parameters and the options with their defaults filled in. It is read only when you press the button, and it is
  read-only on the page. To keep a pipeline in Git, export it: `stardelt export NAMESPACE NAME > pipeline.yaml` writes the same
  document as a file that `stardelt apply -f` accepts (see [Python, command line and agents](sdk-cli-mcp.md)).
- **Edit definition** (next to it, for a pipeline created in Nova) turns the YAML into text you can change. While you type, the
  page tells you what is wrong with the text (a line number for a syntax error, an unknown key, a name or group that cannot
  change here) and, once the text is valid, asks Nova to check it: Nova's own sentence when it refuses, "Nothing changed." or
  "This changes: the schedule, the options." with the next runs. Nothing is saved until you press **Apply changes**, which is
  possible only when something would change. If somebody else changed the pipeline after you opened the definition, Apply is
  refused with a sentence and **Reload the definition** shows the current version (your text is discarded).
- **Delete pipeline** removes the pipeline; past runs disappear from the page.

Members of the owning group see and manage the pipeline; people outside it do not see it. Pipelines that were written in YAML
(not created from the dialog) can be run, paused and stopped here and their definition can be read, but they must be changed
where they came from; **Show definition** says so.

## Limits

- At most ten schedules created per person per hour.
- Statement: 20,000 characters, one statement.
- Not available yet: scheduling notebooks, several steps in one pipeline, notifications on failure, and triggers other than a
  clock.

## When the dialog refuses

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
| `this pipeline is managed outside Nova (kubectl or Git); change it there` | it was not created from the dialog |
| `the pipeline changed while you edited it: reload` | somebody changed it after you opened the definition: reload it and make your change again |
