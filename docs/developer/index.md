---
title: "Contribute to stardelt"
sidebar_label: "Overview"
slug: /developer
---

# Contribute to stardelt

stardelt is open source under Apache 2.0, and help is welcome: code, docs, bug reports, or telling us
what confused you. If you only want to **use** stardelt, start at the
[Quickstart](/docs/getting-started/quickstart).

## Good ways to start

- **Try the [Quickstart](/docs/getting-started/quickstart) and report what went wrong.** A fresh pair of
  eyes finds things the maintainers cannot.
- **Fix a page.** Every page has an **Edit this page** link.
- **Pick up an issue.** Issues labelled
  [`ready-to-implement`](https://github.com/search?q=org%3Astardelt+label%3Aready-to-implement+state%3Aopen&type=issues)
  list the exact files, steps and checks. Comment "claiming" so nobody builds it twice.

## The repositories

| Repository | What it is | Check before a pull request |
|---|---|---|
| [`stardelt-docs`](https://github.com/stardelt/stardelt-docs) | This site | `npm run build` |
| [`stardelt-platform`](https://github.com/stardelt/stardelt-platform) | Helm values, manifests, umbrella chart, install scripts | `make lint`, and `make chart-template` for chart changes |
| [`stardelt-nova`](https://github.com/stardelt/stardelt-nova) | The interface and API: Rust backend, React frontend | `cargo check --all-targets`, `npm --prefix frontend run build` |
| [`stardelt-operator`](https://github.com/stardelt/stardelt-operator) | The Kubernetes operator and its resources | `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, `cargo test` |
| [`stardelt-python`](https://github.com/stardelt/stardelt-python) | The Python package, command line and MCP server | `python -m pytest tests -q` |
| [`stardelt-demos`](https://github.com/stardelt/stardelt-demos) | Sample pipelines and the Airflow image | `python -m pytest -q tests` |

## Work on the interface without a cluster

```bash
git clone https://github.com/stardelt/stardelt-nova
cd stardelt-nova
make demo      # in-memory data; needs Rust and Node
```

Anything that touches a real service needs a real node: see
[Single Hetzner node](/docs/getting-started/hetzner-k3s).

## Read next

- [Contributing](./contributing.md): branches, commits, review.
- [How it is built](./how-it-is-built.md): where things live and which rules hold everywhere.
- [Recipes](./recipes.md): the steps for common changes, so nothing gets forgotten.
- [Writing a good issue](./writing-issues.md): how to describe work so that anyone can do it.
- [Skills for AI assistants](./skills.md): the same recipes, ready for an assistant to follow.
