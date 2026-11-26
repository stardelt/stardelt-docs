---
title: "Runs and notifications"
sidebar_label: "Runs and notifications"
slug: /guides/runs
description: "One table of every recent run of your groups' pipelines, and the destinations a pipeline can notify."
---

# Runs and notifications

Open **Runs** in the left navigation to see what has run lately, without opening each schedule one by one. When a run
ends, the pipeline's group can also be told at a destination; that part is at the end of this page.

## One table for every run

Every run of the notebooks and pipelines your groups own, newest first: that is the sentence on the page, and it
is the whole idea — one table for the platform instead of a hunt through schedules.

A run is one execution of a pipeline. The pipeline may be a SQL statement you scheduled, a one-task SQL
pipeline, or a pipeline that runs a notebook, and each execution is its own row with its own state, start,
duration and trigger. A run that fails keeps its row: a failure is what this page is for.

This is not the **Query log**. The log holds statements — the ones you type in the SQL editor, the ones a
notebook sends, the ones a schedule's task runs — with their rows and bytes. Runs holds executions of
pipelines, one row per execution however many statements it contains; open the pipeline for the task log and
the executed notebook.

It is also not a schedule's own page. The schedule's page (under **Pipelines**) is about one pipeline over its
whole life: its definition, its next run, its recent runs. This page is about one picture of every pipeline at
once.

## The columns

| Column | Meaning |
|---|---|
| Pipeline | The pipeline's name; its owner group underneath, or `administrators` when it has none |
| Kind | **SQL**, **Notebook** or **Pipeline** |
| State | The run's outcome: **Queued**, **Running**, **Succeeded**, **Failed**, **Not run (an earlier task failed)**, **Skipped** or **Retrying** |
| Started | When it started ("3 minutes ago"; hover for the exact time) |
| Duration | How long it took, for example `850 ms`, `2.3 s` or `1 m 04 s` |
| Trigger | Who or what started it: the person's name for a manual run, the scheduler's own label for a scheduled one |

The pipeline's name is a link and opens the schedule, and the started time opens the run's own page; the
rest of the row is not clickable. **Not run (an earlier task failed)** means an earlier task of the same run
failed, so this one never ran.

## Filter the list

Three selects above the table narrow it:

- **Kind:** all kinds, **SQL**, **Notebook** or **Pipeline**.
- **State:** all states, or one of `running`, `queued`, `success`, `failed`, `skipped` and
  `upstream_failed`. **Retrying** is a badge a row may show, not a filter of its own.
- **Group:** all groups, or one group. The list is every group you can see, not only the groups left on screen
  after the other filters, so a choice never hides its own alternatives.

The choice is in the address (`?kind=`, `?state=`, `?group=`). A reload keeps it, and a link carries it, so
`/runs?kind=notebook&state=failed` can be bookmarked or sent to a colleague.

## Watch a run

While at least one listed run is **Running** or **Queued**, the page re-reads the list every five seconds;
when none is, it stops asking and stays as it is. **Run now** on a schedule therefore shows up here within a
few seconds. A new schedule's first run appears once the scheduler has started it, not when you save the
schedule.

## Open one run

Click the started time of a row to open that run on its own page, or follow the run link on the pipeline's
page. The address is `/pipelines/<group>/<pipeline>/runs/<run id>`.

The page repeats the run's state, trigger and duration, and gives three views of the same execution:

- **Timeline** — one bar per task on the run's own span, so the slow task and the waiting time are visible.
- **Task graph** — the tasks as boxes laid out left to right from their dependencies, each coloured by its
  state. Below 700 px the graph is dropped and the task table answers: a graph of boxes is a smear on a
  phone.
- **Tasks** — one row per task with its state, the attempt (`Try`), start, duration and kind, a **log**
  button per attempt, and the notebook when the task ran one; below it, the statements the run sent,
  slowest first, with their wall time and bytes read.

A run that is still **Queued** or **Running** re-reads itself every five seconds. A run or pipeline that no
longer exists answers a **Not found** card with the way back to the pipeline.

## Where the runs come from

- A scheduled SQL statement: [Schedule SQL and notebooks](/docs/guides/schedule#schedule-a-sql-statement)
  turns a statement from the SQL editor into a pipeline that runs on a cron or an interval.
- A scheduled notebook: [Schedule a notebook version](/docs/guides/schedule#schedule-a-notebook-version)
  runs a pinned version of a notebook on a schedule.

Both kinds land in the same table, so a SQL pipeline and a notebook schedule are visible side by side. The
**Trigger** column says which of the two ways a run started: the schedule, or a person pressing **Run now**.

A person's run may also name the date it runs for and values for the pipeline's parameters — the
pipeline page's **Run now** form, or `stardelt run` with `--date` and `--param`; the date and the values
apply to that run only.

## Who sees what

You see the runs of the pipelines you may see: those of your groups' pipelines, and every pipeline if you are
an administrator. A pipeline owned by another group is not listed, and neither are its runs — not even as an
empty state, it is simply not there. The group list in the **Group** filter follows the same rule.

A notebook's own page carries a **Runs** section too, with an **All runs** link that opens this page filtered to
notebooks.

A destination follows the same idea: the owner group decides. A member of the group sees the destination and can
create, test and delete it; an administrator sees and changes every group's destinations. A destination of
another group is not listed for you, and asking for its id directly answers `404`, exactly as if it did not
exist.

## Limits

The page shows the newest 100 runs and has no paging, so a very busy platform shows the recent past rather than
everything. For statements use the [Query log](/docs/guides/query-log), which pages and goes back 90 days by
default. For a task's log and a notebook's executed output, open the pipeline from the **Pipeline** column.

## Notification destinations

A destination is a named webhook or email address that your group can be told about something at. Create it once,
then point the things that should notify the group at its name. A destination belongs to one group and holds one
address: an HTTP endpoint that receives a small JSON message, or a list of email recipients. One
name, one address, means you change a webhook's URL in a single place: everything that sends to that name follows. A
name is unique within its group, so `on-call` in two different groups can be two different addresses.

### The page

Open **Build → Destinations** in the left navigation. The page shows one card per group you belong to, headed
`Group: <name>`. Each card holds a table with three columns:

| Column | What it shows |
|---|---|
| Name | The destination's name, as the things that send to it call it |
| Kind | `webhook` or `email` |
| Address | The webhook's URL, or the recipients separated by commas |

The rows are in name order, so a card does not reshuffle between two visits. If you are in no group, the page still
opens, the list is empty and the page says `You are not in a group, so you cannot add a destination.`

### Create a destination

Choose **New destination**. A form opens above the list, so the existing destinations stay in view, and it asks, in this
order:

1. **Owner group** — one of the groups you belong to. This decides who sees and changes the destination.
2. **Name** — 1 to 64 characters. The name must not already be used in that group.
3. **Kind** — `webhook` or `email`.
4. **URL** for a webhook, or **Recipients** for an email.

A webhook's **URL** starts with `http://` or `https://` and points at something that accepts a `POST` of JSON. For an
email destination, **Recipients** is one or more addresses separated by commas.

**Create destination** stores it and shows `Created “<name>”.` **Cancel** closes the form without saving anything.

### Test a webhook

Choose **Test** on a webhook row. It sends one fixed test message to the address and records the attempt. The row then
says what happened:

- `Delivered.` — the endpoint answered `2xx`.
- `HTTP 502 Bad Gateway` — the endpoint answered, but not with a success. The page prints the endpoint's status.
- `the webhook did not answer within 5 seconds` — the endpoint accepted the connection and stayed silent.
- `the webhook was unreachable` — the connection failed; the address is wrong, the host is down, or a firewall blocks it.

An **email** destination has no **Test** button. The page prints `Email needs the platform’s SMTP relay; it is not
configured yet.` above the rows of a group that has one.

### Delete a destination

Choose **Delete “…”** on the row; the button names the destination in the quotes, for example `Delete “on-call”`. A
dialog asks you to confirm by name and tells you that anything that sends to this destination will stop. **Delete**
removes it for the whole group; **Cancel** leaves it in place.

The name and its address stop being usable, and a name you delete can be used again.

### What is not built yet

A pipeline's notices use a destination: the dialog's **Tell … when a run ends** block ticks the group's destinations for
a failed run, a successful run and a recovery, one message each (see [Schedule SQL and notebooks](schedule.md#manage-a-schedule)). Alert
rules and access requests still do not use a destination, so a destination receives the **Test** message and a pipeline's
failure, success and recovery notices.

A notice is delivered to a **webhook** only. An email destination can be created now and cannot deliver until the
platform's SMTP relay is configured, when it becomes usable.

A webhook's header secrets — a token or signature the receiving end checks — are not supported: a destination stores its
URL as you typed it and adds no authentication header.

### For developers

The API has four routes, all under `/api/destinations`:

| Route | What it does |
|---|---|
| `GET /api/destinations` | The destinations of the caller's groups |
| `POST /api/destinations` | Create one; the body holds `owner_group`, `name`, `kind` and `config` |
| `DELETE /api/destinations/{id}` | Delete one; answers `204` |
| `POST /api/destinations/{id}/test` | Send one test message to a webhook |

A destination is stored as `{id, owner_group, name, kind, config}`, where `config` is `{"url": …}` for a webhook or
`{"recipients": […]}` for an email. Names are unique per group; a duplicate answers `409`, a name outside 1
to 64 characters or an address that breaks the rule above answers `400`.
