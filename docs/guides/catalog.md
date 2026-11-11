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
It can only change when an administrator grants you a catalog. With no table, schema or catalog selected, the right
pane says **Select a table to inspect it.** and offers **Load data**.

## The table page

The header names the schema in small capitals and the table below it, with a **View** badge when the object is a
view. For a table it also shows the table's location in the object store, and — when the table has them — **Owner**
and **Last changed**. Beside the name are the buttons that start the work:

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

- [The SQL editor](./sql-editor) — write and run your own statements.
- [Table lineage](./lineage) — follow a table's sources and its readers.
