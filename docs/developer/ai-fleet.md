---
title: "AI development fleet (build plane)"
sidebar_label: "AI development fleet"
slug: /developer/ai-fleet
---

# AI development fleet (build plane)

**This is not part of stardelt.** It is the maintainer's AI workforce that architects and
implements the platform. Customers never see it.

## The split, stated once

| Plane | What it is | Runs where | Shipped? |
|---|---|---|---|
| **Product** | the Enterprise data platform (Kubernetes, Trino, Iceberg, Lakekeeper, SeaweedFS, Airflow, Superset, JupyterHub, Nova, Operator) | customer's cluster; dev on Hetzner k3s | **yes** |
| **Build** | agents that design, code, test, and document the product | maintainer's laptop, kept on | **no** |

The product contains **no AI agents and no agent runtime**. There is no kagent in stardelt.
Any previous design that put an agent control plane in the product was wrong and is removed.

## What the fleet is

- **Portal** — [OpenHands Agent Canvas](https://docs.openhands.dev) in Docker. You chat, steer,
  and approve; it runs automations on a schedule or webhook (GitHub issues, Slack).
- **Workers** — the OpenCode agents in `.opencode/agents/`:

  | Agent | Role | Edits? |
  |---|---|---|
  | `nova-ui` | React/TS frontend | yes |
  | `nova-api` | Rust axum backend | yes |
  | `operator` | kube-rs CRDs | yes |
  | `docs` | Docusaurus docs | yes |
  | `research` | public-docs / OSS research | no |
  | `reviewer` | correctness review | no |
  | `spec-keeper` | enforces the master spec | no |

  Commands: `/next`, `/gap D9`, `/review`, `/ship`.

- **Dev cluster** — Hetzner k3s (`stardelt-platform/dev/hetzner-k3s`). This is the *product's*
  dev environment so the full chart set fits; it is not where agents run.

```
laptop (build plane)                     product plane
├── .agents/   OpenHands portal          ┌──────────────────────────┐
├── .opencode/ agents + commands   ────▶ │ Hetzner k3s (dev)        │
└── stardelt_*/ product repos            │ customer cluster (prod)  │
                                         └──────────────────────────┘
```

## Run it

```sh
cd .agents
cp .env.example .env          # PROJECTS_PATH = directory containing stardelt_io
docker compose up -d          # http://localhost:8000
```

In the Canvas, add the local **OpenCode** agent as an ACP backend so the portal drives the same
workers the CLI does.

## Human-in-the-loop

- The portal shows conversations; you steer and approve.
- Mutating actions are gated by approvals; the durable guard is **branch + PR**, not prompt
  text.
- Agents never push to `main`. GitHub branch protection on `main` enforces it: a pull request is required and force-push and
  deletion are blocked (see [WP-01](../design/execution-plan)). Required status checks are not set yet, so a green CI run is a
  convention the fleet follows, not a server rule.

## Rules for the fleet

1. One work package at a time from the [execution plan](../design/execution-plan).
2. Branch `wp/<id>-slug`; open a **draft** PR.
3. Read the [master spec](../design/master-spec) and `AGENTS.md` before starting.
4. Never read credential files; they live in `~/.config/stardelt/`.
5. Product changes that alter the spec go through a PR and a human merge.

## What this replaced

An earlier draft proposed **kagent** as an in-cluster agent control plane. That confused the
build plane with the product plane and is discarded. The build plane needs only a portal and
workers on the maintainer's machine.
