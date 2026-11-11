---
title: "Find anything with ⌘K"
sidebar_label: "Command palette"
slug: /guides/command-palette
---

# Find anything with ⌘K

The command palette is the keyboard route through Nova. It opens from any page, searches the pages,
tables, pipelines and queries you may open, and takes you there without a trip through the navigation.

## Open it

Press `⌘K` on macOS, or `Ctrl+K` on Windows and Linux. It works on every page of the app. Press `Escape`
to close it; focus goes back to where you were before it opened. The search field starts empty every
time, so a search from five minutes ago does not come back.

## What it searches

Results are grouped, and the groups always appear in this order. Typing filters the rows; a row you
press `Enter` on does the one thing named below.

- **Pages** — the pages in the left navigation. Matched on their label or their path, and only the
  pages you may see: an administrator also gets the admin pages, nobody else does. At most eight rows
  per navigation group.
- **Tables** — tables and views the catalog knows, from two characters onwards, searched a moment after
  you stop typing. `Enter` opens the catalog explorer with that table selected.
- **Pipelines** — the pipelines you may see, matched on their name. `Enter` opens the pipeline's page.
- **Queries** — your own recent queries, the newest twenty. Matched on the statement or the query type,
  from two characters onwards; a row shows the first part of the statement. `Enter` opens the query log
  with that query expanded.
- **Saved queries** — the queries you saved, matched on the title or the statement. `Enter` puts the
  statement in the SQL editor, ready to run.
- **Actions** — `New query`, `Load data`, `Query log`, `Preferences` and `Switch theme`. The first four
  open their page; `Switch theme` flips the theme in place.

## Keyboard

`↑` and `↓` move the highlight, `Enter` opens the highlighted row, and `Escape` closes the palette.
The mouse works too: click a row to open it, or hover to move the highlight there.

## Empty result

When nothing matches, the palette says so and names what you typed:

> Nothing matches “&lt;query&gt;”.

## What it does not do

- It does not run SQL. There is no free-text statement box; use the SQL editor for that.
- It does not search other people's saved queries, and **Queries** covers only what you ran yourself.
- None of its actions change data. `Load data` takes you to the load page; nothing runs, uploads or
  deletes from the palette itself.
