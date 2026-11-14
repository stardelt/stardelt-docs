---
title: "The SQL editor"
sidebar_label: "SQL editor"
slug: /guides/sql-editor
---

# The SQL editor

**SQL editor** in the left navigation (`/query`) is where you run ad-hoc SQL against the warehouse. You
type a statement, run it, read the result, and keep the statements you want to come back to.

:::note Which catalog the examples use
The examples name `warehouse`, the platform's own catalog. On an install with sign-in it is
**administrators only** — use a catalog your groups were granted. The **Catalogs** page lists yours, and
`SHOW CATALOGS` answers the same question in the SQL editor.
:::

## What it is

The page has three columns: a **Tables** pane on the left, the editor and its result in the middle, and
a **History** pane on the right. Click a pane's title to collapse it to a narrow rail, and click the rail
to open it again; Nova remembers the choice for your next visit. On a narrow screen both panes start
collapsed, so the editor keeps the width.

The catalog a statement is written against comes from the page's URL, `/query?catalog=<name>`, and the
Tables pane sets it when you click a catalog. It names the catalog the **Sample** statement is generated
from and the one written into table names inserted from the pane. It does not change the engine's session
default, so a statement that names its catalog works wherever you paste it. The pane lists the catalogs your
groups were granted; `warehouse`, the one the examples use, is reserved for administrators.

## The editor

Line numbers sit in a gutter to the left of the text. They follow what the editor shows, including the
sample before you have typed anything, and they scroll with the statement.

Keywords, strings, comments and numbers are coloured. The colours are drawn behind the text: the
statement itself is unchanged, and it is sent to the engine exactly as you wrote it.

`⌘/Ctrl+Enter` does the same as **Run**: it runs the statement the cursor is in, or the text you selected.

## The Tables pane

The pane browses catalogs, then their schemas, then the tables and views inside a schema. Clicking a
catalog puts it in the page's URL; clicking a schema opens it.

The `Search tables…` box above the tree narrows it to the tables whose `schema.table` contains the text.
A schema with no matching table is hidden while the filter is set.

Click a table to insert its fully qualified name, `catalog.schema.table`, at the caret; the `⊕` button on
the row does the same. Either way the caret lands after the name, so typing continues the statement.

Press ⌘K (Ctrl+K on Windows and Linux) to jump to any page, table or saved query — see
[Find anything with ⌘K](./command-palette).

## From a link

The catalog's **Query table** button (and **Query view** for a view) opens the editor with a statement
for that table through the `sql` URL parameter, for example
`/query?sql=SELECT%20*%20FROM%20catalog.schema.table%20LIMIT%20100`. A hand-written link can do the same,
and a second tab can open the same statement. Links from the query log and the command palette use the
same parameter.

## Run a query

Type a statement and press **Run**, or press `⌘/Ctrl+Enter`. The button reads **Running…** while the
statement is in flight and the result panel is cleared for the new answer.

The editor can hold several statements, each ending in `;`. **Run** runs one of them: the selected text
if you selected some, else the statement the cursor is in (on a blank line between two, the one above).
The statement that ran is selected, so you can see which. A selection with two or more statements is
refused: select one, or put the cursor in it. **Schedule** takes the same statement.

At the right of the toolbar a muted line names the SQL warehouse — the compute class the engine puts this
person's queries in — as `Warehouse: <name> (<size>)`. A statement does not set it.

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

The right-hand pane keeps the last 50 statements you ran in this browser. They are stored in the
browser's `localStorage`, not in Nova, so history is **per browser and per device, not per account**: a
different browser or cleared site data leaves you with an empty list.

Click an entry to put the statement back into the editor. **clear** empties the list. The empty state
is `No queries yet — run one above.`

## Saved queries

Saved queries are named statements that stay with you. They are kept in Nova's state store, so they
follow you to another browser.

- **Save query** opens a dialog with one field, **Query title**, up to 200 characters. Both the title
  and the statement must be non-empty before **Save** is enabled. A saved query is stored as it is; it
  is not run again.
- Click a saved query to open it in the editor, ready to edit or run.
- **Share** on a query you own opens a dialog headed `Share “<title>”` with a **Share with group** field.
  It offers the groups you are in that do not have the query yet. Pressing **Share** puts the query in
  those people's saved queries, and they can open it and run it there. Only you can delete it.
- A shared query shows its groups under its title (`shared with analysts`). **Unshare** next to a group
  stops sharing with that group, and a query shared with you is marked `shared with you`.
- **Delete** asks `Delete “<title>”?` before it removes the query. The statement is not run or changed
  by deleting the entry. **Cancel** is focused first; `Esc` closes the dialog.

A failed share or delete shows the API's sentence in the dialog, and the list stays as it was.

Without a state store the pane shows the API's sentence (`the state store is not configured`) in an
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
