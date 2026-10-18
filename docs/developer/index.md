---
title: "Developer section"
sidebar_label: "Overview"
slug: /developer
---

# Developer section

Contributor-facing material: how the repos fit together, how to build and verify, and how the
AI development fleet works.

If you just want to **use** stardelt, start at [Getting Started](/docs/getting-started/prerequisites).

## Start here

- [**AI development fleet**](/docs/developer/ai-fleet) — the build plane: portal, workers, guardrails. Not
  part of the product.
- [**Execution plan**](/docs/design/execution-plan) — the work packages an agent or human picks up.
- [**Master spec**](/docs/design/master-spec) — the source of truth for what stardelt is.

## Repo map

| Repo | Role | Build |
|---|---|---|
| `stardelt-docs` | Docusaurus site + design docs | `npm install && npm run build` |
| `stardelt-platform` | Helm values, manifests, umbrella chart, install, Hetzner dev cluster | `make deps`, `make lint`, `helm lint` |
| `stardelt-nova` | Rust axum backend + React UI | `cargo check`, `npm --prefix frontend run build` |
| `stardelt-operator` | kube-rs operator: CRDs, reconcile planner, Helm-backed controller (pre-alpha) | `cargo check`, `cargo test` |
| `stardelt-demos` | kind demo (NYC taxi) | `make up`, `make smoke` |

## Conventions

- One work package at a time; branch `wp/<id>-slug`.
- **Never push to `main`** — open a draft PR.
- Keep PRs small; split rather than push a mega-change.
- Update docs when behavior a reader sees changes.
- Dependencies must be OSI-permissive ([license policy](/docs/architecture/licenses)); one
  documented MPL exception (OpenBao).

## Local docs preview

```bash
npm install
npm start          # http://localhost:3000
```
