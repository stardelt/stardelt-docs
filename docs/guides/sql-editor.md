---
title: "The SQL editor"
sidebar_label: "SQL editor"
slug: /guides/sql-editor
---

# The SQL editor

**SQL editor** in the left navigation (`/query`) is where you run ad-hoc SQL against the warehouse. You
type a statement, run it, read the result, and keep the statements you want to come back to.

## What it is

The page is a plain text area with a **Run** button. There is no autocomplete and no schema browser:
write the statement you mean, using the names you know from the catalog. When the platform has more
than one catalog, a **Catalog** selector sits above the editor. It sets which catalog **Sample** uses
and which catalog inserted table names are written with; it does not change the engine's session
default, so a statement that names its catalog works wherever you paste it.

## Run a query

Type a statement and press **Run**, or press `⌘/Ctrl+Enter`. The button reads **Running…** while the
statement is in flight and the result panel is cleared for the new answer.

Results appear below the editor:

- the row count and the wall-clock time, plus the query id;
- a **CSV** button that downloads the result;
- a table of the returned rows.

The table draws the first 1,000 rows. Above it a line says how many rows the table shows, and the CSV
holds every row the query returned.

If the warehouse capped the result, a banner says so: `Showing the first N rows. Add a LIMIT or
aggregate to see the rest.` The CSV then holds only those rows, and its tooltip says the same.

Before the first run the panel is empty and reads `Run a query to see results here.` Errors from the
engine are shown in place of the result, with the engine's message.

Every statement also lands in the query log; see [The query log](./query-log).

## History

The right-hand panel keeps the last 50 statements you ran in this browser. They are stored in the
browser's `localStorage`, not in Nova, so history is **per browser and per device, not per account**: a
different browser or cleared site data leaves you with an empty list.

Click an entry to put the statement back into the editor. **clear** empties the list. The empty state
is `No queries yet — run one above.`

## Saved queries

Saved queries are named statements that stay with you. They belong to the signed-in person, and they
are kept in Nova's state store, so they follow you to another browser.

- **Save query** opens a dialog with one field, **Query title**, up to 200 characters. Both the title
  and the statement must be non-empty before **Save** is enabled. A saved query is stored as it is; it
  is not run again.
- Click a saved query to open it in the editor, ready to edit or run.
- **Delete** asks `Delete “<title>”?` before it removes the query. The statement is not run or changed
  by deleting the entry. **Cancel** is focused first; `Esc` closes the dialog.

Without a state store the panel shows the API's sentence (`the state store is not configured`) in an
error box, and **Save query** is disabled.

To see what was actually run, including statements from notebooks and dashboards, use
[The query log](./query-log). To turn a statement into a pipeline that runs on a schedule, see
[Schedule a SQL statement](./schedule-sql).

## Sample and Schedule

**Sample** puts a ready-made statement into the editor: the demo table if your catalog has one,
otherwise the first table, otherwise `SELECT 1`; either way with a `LIMIT 100`. It replaces what is in
the editor.

**Schedule** turns the current statement into a pipeline. The button is disabled while the editor is
empty, and its tooltip then says `Write a statement first`. What the dialog asks for is described in
[Schedule a SQL statement](./schedule-sql).
