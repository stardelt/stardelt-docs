---
title: "Roadmap"
sidebar_label: "Roadmap"
slug: /roadmap
---

# Roadmap

stardelt is **pre-alpha**: there are no tagged releases yet, you install from `main`, and things
change without notice. Work is grouped into milestones, and each one has a goal you can check.
Versions are `0.0.x` until the first official release, `0.1.0`; until then nothing has a stability promise.

Open work is in the issues of [`stardelt/stardelt`](https://github.com/stardelt/stardelt/milestones), under the
milestone of the same name.
This page changes through pull requests, and a large change of scope starts with an issue.

## Milestones

| Milestone | Goal | You can tell it is done when |
|---|---|---|
| **0.0.1** Secure foundation | Sign-in and TLS everywhere, no committed secrets | A stranger can install a cluster and nothing is exposed that should not be |
| **0.0.2** Operator install | One resource and your values install the whole platform | A single manifest installs the platform on a fresh node and answers a query |
| **0.0.3** Data engineer workflow | Ingest, model, schedule, query log, connections, catalog documentation, developer sign-in | [From source to dashboard](guides/source-to-dashboard) works end to end by hand |
| **0.0.4** Install and run | The first release: one operator and one resource install the platform, upgrades in place, backups, isolated Spark, a public demo | One release file and one resource install a working platform on a fresh server, and the next release upgrades it |
| **0.0.5** Agents write, people approve | Tool server for agents, bundles from Git, plan and apply, stages, history and rollback | An agent writes a pipeline, a person approves it, it runs in production and can be rolled back |
| **0.0.6** Fits the enterprise | Managed Kubernetes and OpenShift, your gateway, your sign-in provider and groups, your secret store, row and column policies, usage and cost | It runs on your cluster with your sign-in, secrets and gateway, and administrators see usage and cost per group |
| **0.0.7** A real project, end to end | The shop example as a dbt project, a preview per pull request, approvals, the run page, backfill | A person goes from clone to a scheduled, tested, published project with a dashboard in 15 minutes |
| **0.0.8** Data in and out | Volumes, ingestion, sharing, external catalogs, streams | A group lands files and a stream as tables and shares a data product with an outside consumer |
| **0.0.9** Ask and AI | Your own model endpoint, the assistant, evals, AI functions in SQL | Every model call is budgeted and audited, and evals check the assistant after every change |

Later milestones may split or move. Exact component choices for work that has not started are not
promises: a component is named on this site when it is built.

## What works today

- **Install:** `make platform` installs everything in one command, and `make upgrade` upgrades it. The
  operator installs a growing part of the platform from `PlatformInstance` and `Lakehouse` resources.
- **Query and store:** Trino over Iceberg tables, the Lakekeeper catalog, SeaweedFS or your own S3.
- **Work:** the Nova interface (catalog with table guides and verified queries, SQL editor, loads,
  connections, pipelines, query log and its usage view, lineage, warehouse states with Start now),
  notebooks, dashboards, scheduled pipelines, Spark Connect.
- **Ask and models:** [Admin → Models](guides/models) connects a model endpoint by URL and key,
  shows the probe's checks and each group's monthly token budget, and lists the last calls. With an
  endpoint connected, the [assistant](guides/ask) answers a question as checked SQL, with history.
- **Automate:** an API, a Python package, a command line and a local MCP server.
- **Access:** sign-in through your OIDC provider (Keycloak, deployed by stardelt, or your own), and table permissions by group.
- **Keep it running:** backups of the databases and the data, with commands that check them.

The [services page](architecture/services) lists what an install contains, and each guide says what is
not available yet.

## What stardelt will not be

- **A hosted service first.** Self-hosting is the main path, and it will stay so.
- **A new query engine or storage format.** stardelt composes upstream projects, and fixes go upstream.
- **A Kubernetes distribution.** You bring the cluster.
- **An OLTP database.**
- **A benchmark contest.** The goal is predictable cost, openness and sovereignty.

## How decisions are made

The maintainers decide, using the [license policy](architecture/licenses), the
[sovereignty goals](architecture/sovereignty) and this roadmap. To propose a change,
[open an issue](https://github.com/stardelt/stardelt-docs/issues/new/choose) that says what you
need and why. A formal governance model will come once the project has more than one active
organization behind it.
