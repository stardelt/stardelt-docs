---
title: "Evals: questions with known answers"
sidebar_label: "Evals"
slug: /guides/evals
description: "Keep a catalog's questions with their known answers, run them after a model, a guide or a schema changes, and read the verdict."
---

# Evals: questions with known answers

## What an eval is

An **eval** is one question and the answer it must produce, kept with the catalog it belongs to. It
is catalog context like a [guide](/docs/guides/catalog): reading it takes what browsing the catalog
takes. But the eval is a test for people, not a capability of the model — the expected answer is
never sent to a model, and a run only compares what came back with it.

Each eval holds the question (1 to 500 characters), the expected answer, the owner group and the
catalog. Reading a catalog's evals needs what browsing the catalog needs. Writing, removing one and
posting a run need a member of the eval's owner group or an administrator.

## The three answers

`expected` is exactly one of three shapes. Anything else is refused with a sentence.

| Shape | Example | Passes when |
|---|---|---|
| one value | `{"kind":"value","value":1284}` | the answer is one row of one cell equal to the value; two numbers are equal by value |
| a small table | `{"kind":"rows","rows":[[1,"north"],[2,"south"]]}` | the answer's rows are the same as a multiset: the same rows, in any order, numbers equal by value (`10` and `10.0`) |
| the tables a statement uses | `{"kind":"uses","tables":["shop.orders","shop.regions"]}` | the answer's SQL names every expected `namespace.table`, quoted (`"shop"."orders"`) or with its catalog in front |

A `rows` answer holds 1 to 100 rows of 1 to 50 values, each a number, a boolean, null or a string of
at most 500 characters. A `uses` answer holds 1 to 10 `namespace.table` names.

## Add a question

The **Evals** page in **Explore** lists a catalog's questions in id order, with their owner group,
the expected answer in words and who wrote each one. The catalog picker at the top chooses the
catalog.

**Add eval** opens the form: **Question**, **Owner group** (it suggests the groups you belong to)
and **Expected answer**, which takes the JSON of one of the three shapes above. **Add eval** saves
it; **Cancel** closes the form. **Remove** in a row deletes that eval. To correct a question or its expected
answer and keep the eval's runs, use `stardelt eval update ID` (`PUT /api/evals/{id}`); both fields are sent and
checked as on create, and the catalog and the owner group stay.

Only a member of the owner group or an administrator may add or remove one. A refused save shows the
API's sentence in red, and nothing is stored.

## Run a catalog's evals

On the Evals page, **Run** in a row runs that question and **Run all** runs every question you may run, one after
the other. You may run a question if you are an administrator or a member of its owner group. The page asks Ask,
runs the answer as you and records it, so the verdict appears in **Last run**.

From the command line, `stardelt evals run` asks every question of a catalog, runs the answer and records the
verdict:

```console
$ stardelt evals run --catalog gold
Q                            Verdict  Reason
How many orders are there?   PASS
Which region sold the most?  FAIL     the answer's rows differ from the expected rows
What is the newest order?    FAIL     the answer carried no SQL
```

For each question the command asks Ask, runs the SQL the answer carried **read-only as you**, and
posts the result to Nova, which compares it with the expected answer and prints `PASS` or `FAIL` with
the reason. The rows are compared **in Nova**: they never go to the model.

The exit code is the result: `0` when every eval passed, `1` when at least one failed, `2` when the
API answered an error. `--only <id>` runs one eval. An answer that carried no SQL, or whose SQL the
engine refused, is recorded as an error, and that eval fails with the sentence that says why.

`stardelt evals list` prints the stored evals:

```console
$ stardelt evals list --catalog gold
id  question                     expected
1   How many orders are there?   {"kind":"value","value":1284}
2   Which region sold the most?  {"kind":"rows","rows":[["north",3281],["south",2904]]}
```

Without `--catalog`, both commands use your default catalog.

## The verdict

The Evals page's **Last run** column shows each question's newest run: `passed`, `failed — <reason>`,
or `not run yet` when the question has not been run since it was written. Above the list,
`<n> of <m> passed` counts the questions that have a run, passed over run; the line is absent until
one has run.

A failure is a finding, not a block: nothing stops because an eval failed today. When a run fails, Nova
sends one message per failing run to **every notification destination the eval's owner group has** — the
webhooks and addresses on [Destinations](runs.md#notification-destinations); a group with none hears nothing, so
add one if the answers must be watched. A gate on a model change, a guide promotion or a publication is
not in this release.

## From a bundle

A bundle can carry its catalog's questions in an `evals:` block of `bundle.yaml`, so they are reviewed in Git:

```yaml
evals:
  catalog: gold
  questions:
    - question: How many orders are there?
      expected: {"kind":"value","value":1284}
```

`stardelt bundle evals` creates each new question with the bundle's `ownerGroup` and corrects a differing expected
answer in place, so runs are kept. It prints `unchanged`, `created` or `corrected` per question. With
`--check` it writes nothing, prints `would-create` or `would-update` and exits `1`. A question that another group
owns is refused. See the [bundle reference](/docs/reference/bundle#eval-questions).

## In CI

A run's exit code is all a pipeline needs, so a step can run the catalog's evals on a schedule or
before a change goes out:

```console
$ stardelt evals run --catalog gold
Q                            Verdict  Reason
How many orders are there?   PASS
Which region sold the most?  FAIL     the answer's rows differ from the expected rows
$ echo $?
1
```

The exit code is what fails the step: `1` when an eval failed, `2` when the API answered an error,
and a green build only at `0`. Give the step the same credentials and endpoint that a person uses:
the run asks Ask with your identity and executes the answer as you.
