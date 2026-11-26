---
title: "The catalog and the table page"
sidebar_label: "Catalog and tables"
slug: /guides/catalog
description: "Browse the catalogs, schemas and tables you may see, and read a table page with its columns, history and lineage."
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
([Access to catalogs and the network](../operations/access.md)). With no table, schema or catalog selected, the right
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
  `%sql SELECT * FROM … LIMIT 100` cell.
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

### Freshness: a promise the table's owner keeps

The **Freshness** card answers "can I trust this table today?". The owner sets a promise — a
wall-clock deadline in a timezone, plus a grace period — and the card shows a badge for the moment
you look:

| Badge | What it means |
|---|---|
| `No promise` | nobody has promised a time; the card says only when the table last changed |
| `Fresh` | the newest write (or the moment the promise was set, if nothing was written since) is at or after the most recent deadline |
| `Late (grace)` | the deadline has passed, but the grace period has not |
| `Late` | the deadline and the grace have both passed |

To set one, choose the deadline, the timezone (for example `Europe/Berlin`) and the grace in minutes
(0 to 1440), then choose **Set**; **Remove** takes the promise away. Only the table's owner group or
an administrator sees the form. The promise travels as the Iceberg property `stardelt.freshness`,
so another engine can read it, and Nova evaluates the status each time the card is read. The same
read and write are the routes [`table_freshness_get` and `table_freshness_update`](../reference/api/catalog).

A promise can also **tell** someone. Under **Tell**, pick up to five destinations of the table's
owner group (a table with no owner cannot name one). Nova sends one message when the table turns
`Late` and one when it is `Fresh` again; nothing repeats while it stays `Late`, and `Late (grace)`
sends nothing. Every attempt is recorded as a delivery of the table it is about. Only webhook
destinations deliver today: an email destination is recorded as a failed attempt, because the
platform's SMTP relay is not configured.

### Verified queries

A verified query is a question the table answers, with the one statement that answers it, kept beside the table
together with who verified it and when. The card lists up to 50 of them, newest first; each row shows the question,
the statement in a monospace block and `Verified by <sub> · <time>`.

An administrator or the table's owner group adds and removes one — the same people who edit the description and
the guide. Everyone else reads the card. **+ Add a verified query** opens a form with **Question** and **SQL**;
**Add verified query** keeps it, and **Delete** beside a row removes it. A verified query is one read-only
statement, and the API accepts nothing else.

A verified query may also carry the answer it should return. **Check now** beside a row runs the statement as
you and compares the result with the **expected answer** stored with the query. The row then reads `✓ Checked
<when>`, or `✕` followed by the difference — `row 2 differs: expected [2,"b"], got [2,"c"]` — or `Not checked
yet` when it has never been checked. A query saved without an expected answer answers `ran, no expected result
to compare`.

Anyone who may see the table may check a query, not only the people who added it, and a check changes neither
the statement nor the expected answer. **Check all** above the list runs every verified query of the table one
after another, as you, and says how many passed — for example `1 of 2 passed · 1 failed`. Nothing runs a check on
its own; to check every night, run the same call from a scheduled job (below).

**Open in SQL editor** opens the SQL editor with the statement filled in, ready to run.

Reading a row never runs the statement: the card shows it as text, to read or to copy into the SQL editor.

An agent on the hosted endpoint reads the same list through the `verified_queries` tool, which tells it to prefer
these over writing new SQL.

While the list is empty and someone may add one, the card reads `No verified queries yet. Add the question the
table answers, and the SQL that answers it.`. Everyone else sees no card at all until the first query exists.

#### Check your trusted numbers every night

A scheduled CI job can run the same check with the `stardelt` command. The job signs in with a token of a
service identity that may read the table (`STARDELT_TOKEN`, see [the CLI guide](./cli.md)), and fails when
any query fails:

```bash
stardelt api verified_queries_check_all -p ns=shop -p tbl=daily_revenue -q catalog=gold --format json \
  | python3 -c 'import json,sys; r=json.load(sys.stdin); print("%d of %d passed" % (r["passed"], r["checked"])); sys.exit(1 if r["failed"] else 0)'
```

Each run updates the rows on the table page, so the next reader sees `✓ Checked <when>` or the difference.

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

- [A tour of Nova](./tour-of-nova) — the numbers, the timeline, the freshness of your tables and ⌘K.
- [The SQL editor](./sql-editor) — write and run your own statements.
- [Table lineage](./query-log#on-a-table-page) — follow a table's sources and its readers.
