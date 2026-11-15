---
title: "The catalog and the table page"
sidebar_label: "Catalog and tables"
slug: /guides/catalog
---

# The catalog and the table page

**Catalog** in the left navigation is where you look things up before you query them: every catalog you may see,
the schemas inside it and the tables in each schema. Clicking a table opens its page, with its columns, a sample of
its rows, its history and the people and jobs that read it.

## Browse the catalog

The tree on the left lists every catalog open to you, then its schemas, then the tables in each schema. The
**Search tables…** box filters the tree as you type, so a table can be found by name without opening every schema.
Clicking a schema opens its page: the tables and views in it, each row saying which of the two it is, and a row
opens that table's page. Clicking a table in the tree opens the table page directly.

When no catalog is open to you, the tree says `no catalog is open to you yet; ask an administrator for access`.
It can only change when an administrator grants you a catalog
([Catalogs and access](../operations/catalogs-access)). With no table, schema or catalog selected, the right
pane says **Select a table to inspect it.** and offers **Load data**.

## The table page

The header names the schema in small capitals and the table below it, with a **View** badge when the object is a
view. For a table it also shows the table's location in the object store, and — when the table has them — **Owner**
and **Last changed**. When the table has a current snapshot, one more line gives its exact size:
`12,480 rows · 2.4 MB`. A table with no snapshot — or metadata without those counters — shows no line rather than a
zero. Beside the name are the buttons that start the work:

- **Query table** opens the SQL editor with `SELECT * FROM <catalog>.<schema>.<table> LIMIT 100`. A view's button
  reads **Query view**.
- **Show lineage** opens the Lineage page for the table.
- **Use in a notebook** copies the two lines that run the same query from a notebook: `import stardelt` and a
  `stardelt.sql("SELECT * FROM … LIMIT 100")` call.
- **Copy for the CLI** copies `stardelt sql "SELECT * FROM … LIMIT 100"`.
- **Load data** opens the page that loads a file into a new table.

A copy button answers **Copied**; when the browser refuses access to the clipboard it says **Could not copy.** and
copies nothing.

Below the buttons the header reports the catalog's maintenance: how many tables the last run optimized, or that it
failed, and how long ago.

### About this table

**About this table** holds the table's description, its tags, its owner and its domain. The owner is a group: a
table without one can be claimed by the first editor for one of their own groups, and a table that has an owner is
edited by that group or by an administrator. Everyone else reads the card, and it says whom to ask. Tags are
lower-case letters, digits, dashes and underscores, at most 32 characters each and 20 in total; the domain is a
short lower-case name such as `sales`. An empty description, tag list, owner or domain is shown as absent, not as an
error. To edit, choose **Edit**, change the fields and choose **Save**.

Below the description the card also holds the table's guide, under the heading **How to use this table**; it is
absent until someone writes one, and an owner who has not written it yet sees the hint `Add a guide: which columns
join, which rows to leave out, what the numbers mean. People and agents read it.`. A guide says how to use the table
rather than what it is: how to join it, which rows to leave out, and what the numbers mean. It is edited with the
description under the same owner rule — a table without an owner can be claimed by the first editor, and a table that
has one is edited by that group or by an administrator — as plain text or Markdown whose line breaks are kept, at
most 16,000 characters; **Edit** shows it in a textarea labelled **How to use this table** with a character counter,
and clearing it removes the guide. The guide travels as the Iceberg table property `stardelt.guide`, so any Iceberg
client sees it, and an agent reads it through the [`table_documentation`](./mcp.md) tool.

### Verified queries

A verified query is a question the table answers, with the one statement that answers it, kept beside the table
together with who verified it and when. The card lists up to 50 of them, newest first; each row shows the question,
the statement in a monospace block and `Verified by <sub> · <time>`.

An administrator or the table's owner group adds and removes one — the same people who edit the description and
the guide. Everyone else reads the card. **+ Add a verified query** opens a form with **Question** and **SQL**;
**Add verified query** keeps it, and **Delete** beside a row removes it. A verified query is one read-only
statement, and the API accepts nothing else.

Reading a row never runs the statement: the card shows it as text, to read or to copy into the SQL editor.

An agent on the hosted endpoint reads the same list through the `verified_queries` tool, which tells it to prefer
these over writing new SQL.

While the list is empty and someone may add one, the card reads `No verified queries yet. Add the question the
table answers, and the SQL that answers it.`. Everyone else sees no card at all until the first query exists.

### Maintenance

The **Maintenance** card counts the table's files in the object store: how many there are, how many are smaller than
128 MB and how much they weigh in total, then how many snapshots exist and when the last one was committed. When
files are small it says so and names the engine's `optimize` procedure, which compacts them. The card stays away for
a view, for a table without Iceberg metadata, or when the engine does not answer, so a table that works never
carries a red error beside it. For what runs maintenance on a schedule and how to check it, see
[the checks page](../operations/checks).

## The tabs

The tabs below the cards each answer one question about the same table:

- **Preview** runs `SELECT * FROM <catalog>.<schema>.<table> LIMIT 50` on the query engine and shows the rows. The
  bar above the table names the row count and the query's id.
- **Profile** runs one statement over the first 10,000 rows and gives each column its type, its share of nulls, how
  many distinct values it holds and its range. The card says what it sampled: *Profiled from the first 10,000 rows ·
  null % and distinct values*. A nested column has no counts and no range, and a type the engine cannot order has no
  range; the table shows `—`.
- **Columns** lists each column with its type and its description; choose **Edit** beside a description to change
  it and **Save** to keep it. The **From** column names the columns of other tables this one was built from,
  following each name to its table's lineage page; a source you may not read is one muted line instead of a name.
- **Details** shows the table's identity and layout: UUID, location, when it was last updated, the metadata file,
  the partitioning (or that it is unpartitioned) and the table properties.
- **History** lists the table's snapshots with their time, operation and summary. **Preview** shows the table as it
  was at that snapshot, and **Roll back…** moves the table to it — after typing the table's name to confirm. A
  rollback moves the current pointer only: no snapshot and no file is deleted, and the rollback itself appears in
  the history.
- **Lineage** answers who makes the table and who reads it, over a window of 7, 30 or 90 days, and lists what it is
  made from and what uses it. **Open graph** draws the same data.

When you may not do something — edit a description, roll back a snapshot, read a table that feeds this one — the
tab says so in a muted line or leaves the value out, rather than with a red error.

## Views

A view shows only **Preview**. It has no Profile, Columns, Details, History or Lineage tab, and no **About this
table** or **Maintenance** card: a view holds a statement, not files and snapshots. The header still names it and
still copies a query for a notebook or the CLI.

## Next

- [The Overview page](./overview) — the numbers, the timeline and the freshness of your tables.
- [The SQL editor](./sql-editor) — write and run your own statements.
- [Table lineage](./lineage) — follow a table's sources and its readers.
