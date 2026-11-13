---
title: "The Overview page"
sidebar_label: "Overview"
slug: /guides/overview
---

# The Overview page

The **Overview** is the first page after you sign in. It answers four questions at once: is the
platform working, what is in my catalogs, what did my team run, and are the tables I read fresh. Two
buttons at the top lead out of it: **Load data** opens the page that loads a file, and **New query**
opens the SQL editor.

## What it answers

Each card on the page covers one of those questions, and the page keeps the numbers and the timeline
apart: the four cards at the top count what exists, the two charts show your own last two weeks, the
**Freshness** card says when the tables you read last changed, the **Catalogs** card lists each catalog
with its numbers, and **Recent activity** merges runs, queries and loads into one list.

## The numbers

Four cards sit at the top of the page.

- **Catalogs** — how many catalogs you can see, and the number of schemas inside them.
- **Tables** — how many tables you can see, with their total size and row count.
- **Engine** — the warehouse engine's state, with a green dot while it is active. This is an
  administrator's card; other people do not see it.
- **Activity** — how many recent queries, loads and transfers were recorded.

A number that has not been read yet shows as `…`, and one the page could not read shows as `—` with
the reason underneath.

## Your last two weeks

**The last two weeks** holds two charts side by side.

- **Queries per day** draws the queries you ran on each of the last 14 days, with the day's count.
- **Runs per day** stacks the last 7 days of pipeline runs you can see by how they ended: finished,
  failed, still running, or another state.

Each chart counts only what you are allowed to read — your own queries and the runs of pipelines you can
see — and an instance with nothing to draw says `No queries or runs yet`.

Hover a day, or tab to it and leave focus there, and the chart names it: `Wed 12 Nov · 26 queries` or
`Wed 12 Nov · 3 ok · 1 failed · 0 running · 0 other`. Under the plot the oldest and the newest day are
labelled, `max` above it is the largest day in the window, and the runs chart's legend names its four
colours. A screen reader reads the same window as a table of 14 (or 7) days.

Each chart reads its own source. If one of them fails, its side says `Could not read queries.` or
`Could not read runs.` with a **Retry** button, and the other chart still draws. The queries chart reads
every page of its fourteen-day window, up to 4,000 queries, so a busy window is not drawn short; beyond
that it says `Showing the newest 4,000 queries.` underneath. The runs chart reads its newest 200 runs and
says `Showing the latest 200 runs.` when there are more.

## Freshness

**Freshness** lists the five tables you read most over the last 30 days, one line each: the table and
how many queries read it, then when it last changed — for example `changed 2 h ago`.

The line turns amber when the newest write to the table is older than seven days, and it says
`No write in 30 days` when nothing in the window wrote it at all. That is the answer the card exists
for: a table you use every day that nothing has refreshed.

Click a table to open its page. Before you have read anything, the card says `No tables read yet`.

## Catalogs

The **Catalogs** card has one row per catalog you can see: its name, then **Schemas**, **Tables**,
**Size**, **Rows** and **Last change**. **Updated …** above the table says how old the numbers are, and
**Browse all →** opens the catalog.

A catalog whose numbers are still being counted says `calculating…` in place of a number rather than
`0` — nothing has been read yet, and a zero would be a wrong answer. A catalog whose count stopped at
its first 200 tables says `first 200 tables counted` under the table.

An administrator also has **Refresh**, which starts a new count of every catalog in the background. The
numbers follow within a few seconds, and the button is disabled while a count is already running.

## Recent activity

**Recent activity** merges the newest runs, queries and loads into one list, newest first, each row with
a badge naming its kind and how long ago it happened. A run opens its pipeline, a query opens that entry
in the query log, and a load opens the jobs page. **All runs →** opens the full run list.

The three sources are read separately, so one that cannot be read does not blank the list: the rows that
arrived still show, and the failed source keeps its own line — `Could not read runs.`, `Could not read
queries.` or `Could not read loads.` — with **Retry**. An instance where nothing has run yet says
`Nothing has happened yet`.

An administrator also sees a **Platform apps** card — one line per service with a status dot and its
status word, **All apps →** opens the **Platform** page — and a **Platform** shortcut card next to the
other two shortcuts.

## Your first pipeline

While the instance has no tables at all, a card titled **Publish your first pipeline from Git** sits at
the top of the page. It holds the five `stardelt` commands that publish a first pipeline from Git, with
this instance's address and your own group already filled in. **Dismiss** hides the card for good; it is
a setting on your account, so it stays hidden for you in every browser. The card also disappears on its
own as soon as the instance has a table.

The commands are explained in [Publish pipelines from Git](./publish-pipelines).

## Demo mode

In a demo instance the page header says `Demo data is in memory.` The numbers and the timeline are the
sample data that ships with the demo, nothing you do there is stored, and the instance goes back to
how it started when it restarts.

## Where to go next

- [The catalog and the table page](./catalog) — browse what the numbers count.
- [Table lineage](./lineage) — follow a table's sources and its readers.
- [The SQL editor](./sql-editor) — write and run your own statements.
