---
title: "Ask about your data"
sidebar_label: "Ask about your data"
slug: /guides/ask
description: "Turn a question in words into one read-only SQL statement that Nova checks as you before you run it."
---

# Ask about your data

## What Ask is

Ask turns a question in words into one read-only SQL statement. Nova finds the tables you may see that
match the question, a model endpoint connected by your administrator writes the statement, and Nova
checks it with `EXPLAIN` **as you** before it answers — with the tables the statement reads. Nova never
runs the statement: you do, from the SQL editor.

- **What it sends** — your question, and the name, description, tags, owner, domain, **How to use this table**
  guide and column names and descriptions of at most five candidate tables. The model is told to follow a guide.
- **What it never sends** — a row, a result, or the endpoint's key.

After a model, a guide or a schema changes, [an eval](/docs/guides/evals) asks the questions whose answers you know and says whether they still pass.

## What it needs

An administrator connects a [model endpoint](./models.md) with `purposes: [ask]` and waits until its
probe answers `Ready`. That is the whole switch: there is no separate setting for Ask.

When no endpoint is both `Ready` and asked for the `ask` purpose, Nova does not show the button. Nova
gives the question to the first such endpoint in name order. An administrator sees each endpoint's probe
result on **Admin → Models**; a change of readiness needs nothing more than the endpoint — the button
appears and disappears with it.

## Ask a question

**Ask** (`✦ Ask`) sits in the top bar, left of **Apps**, and `⌘J` / `Ctrl+J` opens and closes it from any
page. The panel takes 420 px on a wide screen and the whole screen on a phone.

Type the question in the box at the bottom and press `↵`, or pick one of the example questions the
panel offers for the tables you read. While it works, the panel names the step it is in:
**Finding tables…**, then **Writing SQL…**, then **Checking as you…**.

`↑` in an empty box recalls your last question. `Escape` closes the panel.

## History

**History** in the panel's header lists your last 20 questions, newest first: the question, and the check
line when the answer had one (`✓ checked`, `✕ not runnable`).

Click one to see the answer again. It is kept as text — opening it does not ask the model and does not run
SQL.

The list is yours: another person does not see your questions. An installation without a state store shows
the API's sentence instead of a list.

Empty, the list says `No questions yet.`

## What comes back

Each answer is one card:

- **The sentence** — what the statement answers, written by the model.
- **The statement** — one `SELECT` or `WITH` query, with **Copy**.
- **The check** — `✓ Checked: EXPLAIN passed as you` in green, or `✕ Not runnable: <engine error>. The
  model tried twice.` in red. Nova asks the model for one correction before it reports a failure; the
  statement from the second attempt is shown either way.
- **Sources** — the tables the model was given for the question, each a link into the catalog. With each
  table, the model also gets up to five of its [verified queries](/docs/guides/catalog#verified-queries) and is told
  to copy a matching one's shape, so a table whose owners wrote verified queries gets answers in their words.
  It also gets the table's metric definitions (name, description, expression, time column and dimensions).
- **Open in SQL editor** — takes the statement to `/query` with the `sql` parameter, filled in and
  **not run**. `⌘`/`Ctrl+Enter` does the same for the last answer.
- **👍 / 👎** — one vote per answer. A vote writes to the `model_call` row the answer's model call
  recorded, and you can read it on **Admin → Models** → **Last calls**.

## Where your prompts go

The bottom of the panel names the endpoint's model and where its prompts go:

- `<model> · on-premise · prompts stay here` — the endpoint runs inside your infrastructure.
- `<model> · cloud · prompts leave your cluster`, in the warning colour — the endpoint is outside it.

The endpoint is named as an administrator configured it, and the endpoint's URL and key stay with the
call: the key never reaches Nova's API and never appears in an answer, a log line or a recorded call
(see [Where the key goes](./models.md#where-the-key-goes)).

## Limits

- **Visibility** — Ask searches the catalog as you. It offers the model only tables your groups may see,
  and it answers about no other table.
- **Five candidates** — one question considers at most five tables, from the catalog search for your
  question.
- **Budget** — the question is a model call, so your group's monthly token budget applies. When the
  budget is spent the answer is a `429` and the panel shows its sentence as a calm notice, not as a
  failure of your question.
- **Length** — a question is 1 to 2000 characters.
- **Kept: 20** — the last 20 questions per person; older ones are dropped.

## What it does not do

- It does not run the statement, and it does not read a row: the only statement Nova sends to the engine
  is the `EXPLAIN` of the model's statement.
- It does not write. A statement that is not a reading statement (`SELECT`, `WITH`, `VALUES`, `SHOW`,
  `DESCRIBE`, `TABLE`) is refused before the check, and `EXPLAIN ANALYZE` is refused with it.
- It does not answer about a table you cannot see, and it does not see a row of the tables it can.

## When it does not work

| What you see | What it means |
|---|---|
| No **Ask** button | No endpoint with the `ask` purpose is `Ready`. An administrator connects one; see [Connect a model endpoint](./models.md). |
| "I found no table you can see that matches. Try the table's name, or browse the Catalog." | The catalog search found no table for your question. Name the table, or look it up in **Catalog**. |
| `✕ Not runnable: …` after two attempts | The model wrote a statement the engine would not run as you. The statement is still shown, with **Open in SQL editor**, so you can fix it there. |
| The `429` sentence about your group's budget | The month's token budget is spent. Ask an administrator to raise the quota. |

A model endpoint that is unreachable or answers in the wrong shape reaches you as the sentence of the
refusal, and the endpoint's own probe message says what is missing — see
[When it does not work](./models.md#when-it-does-not-work).
