---
title: "Runs"
sidebar_label: "Runs"
slug: /guides/runs
---

# Runs

Open **Runs** in the left navigation to see what has run lately, without opening each schedule one by one.

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
| State | The run's outcome: **Queued**, **Running**, **Succeeded**, **Failed**, **Upstream failed**, **Skipped** or **Up for retry** |
| Started | When it started ("3 minutes ago"; hover for the exact time) |
| Duration | How long it took, for example `850 ms`, `2.3 s` or `1 m 04 s` |
| Trigger | Who or what started it: the person's name for a manual run, the scheduler's own label for a scheduled one |

The pipeline's name is a link and opens the schedule; the rest of the row is not clickable. **Upstream
failed** means an earlier task of the same run failed, so this one never ran.

## Filter the list

Three selects above the table narrow it:

- **Kind:** all kinds, **SQL**, **Notebook** or **Pipeline**.
- **State:** all states, or one of `running`, `queued`, `success`, `failed`, `skipped` and
  `upstream_failed`. **Up for retry** is a badge a row may show, not a filter of its own.
- **Group:** all groups, or one group. The list is every group you can see, not only the groups left on screen
  after the other filters, so a choice never hides its own alternatives.

The choice is in the address (`?kind=`, `?state=`, `?group=`). A reload keeps it, and a link carries it, so
`/runs?kind=notebook&state=failed` can be bookmarked or sent to a colleague.

## Watch a run

While at least one listed run is **Running** or **Queued**, the page re-reads the list every five seconds;
when none is, it stops asking and stays as it is. **Run now** on a schedule therefore shows up here within a
few seconds. A new schedule's first run appears once the scheduler has started it, not when you save the
schedule.

## Where the runs come from

- A scheduled SQL statement: [Schedule a SQL statement](/docs/guides/schedule-sql) turns a statement from the
  SQL editor into a pipeline that runs on a cron or an interval.
- A scheduled notebook: [Published notebooks](/docs/guides/published-notebooks) runs a pinned version of a
  notebook on a schedule.

Both kinds land in the same table, so a SQL pipeline and a notebook schedule are visible side by side. The
**Trigger** column says which of the two ways a run started: the schedule, or a person pressing **Run now**.

## Who sees what

You see the runs of the pipelines you may see: those of your groups' pipelines, and every pipeline if you are
an administrator. A pipeline owned by another group is not listed, and neither are its runs — not even as an
empty state, it is simply not there. The group list in the **Group** filter follows the same rule.

A notebook's own page carries a **Runs** section too, with an **All runs** link that opens this page filtered to
notebooks.

## Limits

The page shows the newest 100 runs and has no paging, so a very busy platform shows the recent past rather than
everything. For statements use the [Query log](/docs/guides/query-log), which pages and goes back 90 days by
default. For a task's log and a notebook's executed output, open the pipeline from the **Pipeline** column.
