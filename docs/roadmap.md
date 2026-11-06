---
title: "Roadmap"
sidebar_label: "Roadmap"
slug: /roadmap
---

# Roadmap

stardelt is **pre-alpha**: there are no tagged releases yet, you install from `main`, and things
change without notice. Work is grouped into milestones, and each one has a goal you can check. The
platform will stay on `0.x` for a long time.

Open work is in each repository's issues under the milestone of the same name, such as
[`stardelt-platform`](https://github.com/stardelt/stardelt-platform/milestones).
This page changes through pull requests, and a large change of scope starts with an issue.

## Milestones

| Milestone | Goal | You can tell it is done when |
|---|---|---|
| **v0.1** Secure foundation | Sign-in and TLS everywhere, no committed secrets | A stranger can install a cluster and nothing is exposed that should not be |
| **v0.2** Operator install | One resource and your values install the whole platform | A single manifest installs the platform on a fresh node and answers a query |
| **v0.3** Data engineer workflow | Ingest, model, schedule, query log, connections, catalog documentation, developer sign-in | [From source to dashboard](guides/source-to-dashboard) works end to end by hand |
| **v0.4** Operate and govern | Warehouse lifecycle, backups, alerting, permissions, upgrades, usage views | An operations team can run and upgrade a production install |
| **v0.5** Agents and extensions | Hosted tool server, command line, VS Code extension | A local AI assistant works on the platform as the signed-in person |
| **v0.6** Governance and sharing | Data products, federation, external sharing, file-drop ingestion, acceleration | |
| **v0.7** AI and ML | Assistant, AI functions in SQL, vector search, feature store, tracking, serving, GPU | A model goes from a notebook to a served endpoint |

Later milestones may split or move. Exact component choices for work that has not started are not
promises: a component is named on this site when it is built.

## What works today

- **Install:** `make platform` installs everything in one command, and `make upgrade` upgrades it. The
  operator installs a growing part of the platform from `PlatformInstance` and `Lakehouse` resources.
- **Query and store:** Trino over Iceberg tables, the Lakekeeper catalog, SeaweedFS or your own S3.
- **Work:** the Nova interface (catalog, SQL editor, loads, connections, pipelines, query log,
  lineage), notebooks, dashboards, scheduled pipelines, Spark Connect.
- **Automate:** an API, a Python package, a command line and a local MCP server.
- **Access:** sign-in through Keycloak or your own OIDC provider, and table permissions by group.
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
