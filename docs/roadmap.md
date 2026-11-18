---
title: "Roadmap"
description: "What is built, what comes next and in which milestone, and what is explicitly not planned."
sidebar_label: "Roadmap"
slug: /roadmap
---

# Roadmap

stardelt is **pre-alpha**: there is no release yet, you install from `main`, and things change
without notice. Versions are `0.0.x` until the first official release, `0.1.0`; until then nothing
has a stability promise.

**[The milestones on GitHub](https://github.com/stardelt/stardelt/milestones?direction=asc&sort=title&state=open)**
are the plan: each one names its theme, what is in it, and how you can tell it is done. Its issues
are the open work.

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
[sovereignty goals](architecture/sovereignty) and the milestones. To propose a change,
[open an issue](https://github.com/stardelt/stardelt-docs/issues/new/choose) that says what you
need and why. A formal governance model will come once the project has more than one active
organization behind it.
