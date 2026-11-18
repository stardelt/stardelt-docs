---
title: "Contribute to stardelt"
sidebar_label: "Overview"
slug: /developer
description: "How to contribute to stardelt: good first tasks, the repositories and their checks, branches, commits, review, and the rules for AI-assisted work."
---

# Contribute to stardelt

stardelt is open source under Apache 2.0, and help is welcome: code, docs, bug reports, or telling us
what confused you. If you only want to **use** stardelt, start at the
[Quickstart](/docs/getting-started/quickstart).

By taking part you agree to the
[Code of Conduct](https://github.com/stardelt/stardelt-docs/blob/main/CODE_OF_CONDUCT.md).

## Good ways to start

- **Try the [Quickstart](/docs/getting-started/quickstart) and report what went wrong.** A fresh pair of
  eyes finds things the maintainers cannot.
- **Fix a page.** Every page has an **Edit this page** link.
- **Pick up an issue.** Issues labelled
  [`ready-to-implement`](https://github.com/search?q=org%3Astardelt+label%3Aready-to-implement+state%3Aopen&type=issues)
  list the exact files, steps and checks. Comment "claiming" so nobody builds it twice.

## The repositories

The product is one repository, [`stardelt/stardelt`](https://github.com/stardelt/stardelt), with a folder per
part. Run each check from its folder; one pull request may change several folders.

| Where | What it is | Check before a pull request |
|---|---|---|
| [`stardelt-docs`](https://github.com/stardelt/stardelt-docs) | This site (its own repository) | `npm run build` |
| [`platform/`](https://github.com/stardelt/stardelt/tree/main/platform) | Helm values, manifests, umbrella chart, install scripts | `make lint`, and `make chart-template` for chart changes |
| [`nova/`](https://github.com/stardelt/stardelt/tree/main/nova) | The interface and API: Rust backend, React frontend | `cargo check --all-targets`, `npm --prefix frontend run build` |
| [`operator/`](https://github.com/stardelt/stardelt/tree/main/operator) | The Kubernetes operator and its resources | `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, `cargo test` |
| [`python/`](https://github.com/stardelt/stardelt/tree/main/python) | The Python package, command line and MCP server | `python -m pytest tests -q` |
| [`demos/`](https://github.com/stardelt/stardelt/tree/main/demos) | Sample pipelines and the Airflow image | `python -m pytest -q tests` |

## Work on the interface without a cluster

```bash
git clone https://github.com/stardelt/stardelt
cd stardelt/nova
make demo      # in-memory data; needs Rust and Node
```

Anything that touches a real service needs a real node: see
[Single Hetzner node](/docs/getting-started/hetzner-k3s).

## The two rules

1. **Everything arrives as a pull request.** `main` is protected.
2. **`main` stays installable.** There are no tagged releases yet, so people install from it.

## Branches

Branch from an up-to-date `main`, and name the branch after the change:

| Branch | Use for |
|---|---|
| `feat/<slug>` | new behaviour |
| `fix/<slug>` | a bug fix |
| `docs/<slug>` | documentation only |
| `chore/<slug>` | build, dependencies, tooling |

Open a draft pull request as soon as there is something to look at. Keep it small: one change per pull
request, because small ones get reviewed and large ones stall. Do not rewrite someone else's branch.

## Commits

```text
<type>(<scope>): <what changed>

<why, if the diff does not show it>
```

`type` is `feat`, `fix`, `docs`, `chore`, `refactor` or `test`. `scope` is the area inside the repository,
such as `nova`, `operator` or `chart`. A pull request's title follows the same shape.

## Before you open a pull request

- Run the repository's check from [the table](#the-repositories), and paste the command and
  its result into the description.
- If a reader would see a difference, update the docs in the same pull request.
- Follow the [recipe](https://github.com/stardelt/stardelt/blob/main/CONTRIBUTING.md#recipes) if there is one for your change.
- Drawing a diagram? Start from [Diagrams](./diagrams.md) so it matches the palette and the rules.
- Keep dependencies within the [license policy](../architecture/licenses.md).

## Review

Expect one maintainer review, about correctness rather than style. There is no fixed response time, so
ping a pull request that has been quiet for a week.

A reviewer asks:

1. Does it do what the description says, no more and no less?
2. Does it change something a user or operator can see? Does it say so?
3. Is there evidence that it works?
4. Does it fit the [rules](https://github.com/stardelt/stardelt/blob/main/CONTRIBUTING.md#rules-that-hold-everywhere) and the license policy?

A change to how the platform is designed starts with an issue, so the discussion happens before the
code. Breaking changes are allowed during pre-alpha, if the title says so and the docs change with them.

## Using an AI assistant

Welcome, on two conditions:

- **Name the model** in the description or with a `Model: <provider>/<model>` trailer, so a reviewer
  knows what to check more closely.
- **You are the author.** Run the checks yourself and answer the review yourself. A green transcript is
  not evidence.

[Skills for AI assistants](https://github.com/stardelt/stardelt/blob/main/CONTRIBUTING.md#skills-for-ai-assistants) help an assistant follow the project's conventions.

## Writing a ticket

See [Writing a good issue](./writing-issues.md).

## Releases

No release has been tagged yet. When they start, each repository will tag its own with
[semantic versioning](https://semver.org), and the first tagged release creates the changelog.

CI builds every container image. Merging to `main` publishes `dev`, `main` and an immutable
`sha-<short>` tag, and the job summary prints the digest. Deployments pin the digest:

```bash
kubectl -n stardelt set image deploy/nova nova=ghcr.io/stardelt/nova@sha256:…
```

## Button and link labels

- A button is a verb plus an object, in sentence case: "Start the quickstart", not "Quickstart" or "Click here".
- `→` means the link goes elsewhere on this site, `↓` means it scrolls on this page, and `↗` means it leaves the site. No other arrows.
- One primary button per section. The same goal always uses the same label.
- Say each claim once per page, in the place that proves it.

## Read next

- [Writing a good issue](./writing-issues.md): how to describe work so that anyone can do it.
- [Contributing in the repository](https://github.com/stardelt/stardelt/blob/main/CONTRIBUTING.md): where a change goes, what is generated, the recipes for common changes, and the skills for AI assistants.
