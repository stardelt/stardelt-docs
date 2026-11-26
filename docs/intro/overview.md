---
title: "What is stardelt"
sidebar_label: "What is stardelt"
slug: /intro/overview
description: "An open-source data platform on your own Kubernetes cluster, with one sign-in, one interface and one API."
---

# What is stardelt

stardelt is an open-source data platform that runs on your own Kubernetes cluster. It installs
proven open-source projects and connects them, so you get one sign-in, one interface and one API for
storing, querying, scheduling and showing data. [See a team's day in five steps](/#story).

![Nova, the Overview of a team at work](/img/nova/overview.png)

*Nova, stardelt's interface: catalogs, recent loads and queries, and the services, in one place.*

:::warning Alpha
stardelt is alpha (`0.0.x`): each release is proven on a fresh single-node cluster before it is published,
but resources, APIs and install steps can still change before `0.1.0`. Install a
[release](https://github.com/stardelt/stardelt/releases/latest), try it, and do not run your business on it yet.
:::

## What you can do with it

- **Query** Iceberg tables with SQL in the browser, from a notebook or from a script.
- **Load** files, APIs and databases into tables, and keep source credentials out of your code.
- **Schedule** SQL and notebooks, and publish pipelines from Git.
- **Show** results in dashboards, and control who sees what by group.
- **See** what ran, how long it took, why it failed and which tables it touched.
- **Automate** all of it with an API, a Python package, a command line and AI assistants.

## Why you might want it

- **Your data stays with you.** Everything runs in your cluster. stardelt's own components make no
  required outbound calls, and there is no license server. See [Sovereignty](../architecture/sovereignty).
- **You can leave.** Tables are open Iceberg and Parquet files on storage you choose.
- **No license surprises.** Permissive licenses, with every exception named. See the
  [license policy](../architecture/licenses).
- **Standard parts.** Trino, Iceberg, Airflow, Superset and JupyterHub are what they are upstream,
  so what you already know still applies.

stardelt may not suit you if you want a managed service or do not want to operate Kubernetes.

## Where to go next

| You want to | Read |
|---|---|
| See it working | [Quickstart](../getting-started/quickstart) |
| Follow one example from clone to teardown | [A complete example in 15 minutes](../guides/fifteen-minutes) |
| Understand the parts | [How it works](../architecture/how-it-works) |
| Install it for real | [Prerequisites](../getting-started/prerequisites) |
| Work with data | [Load data](../guides/load-and-transfer) |
| Run it | [Running stardelt in production](../operations/production) |
| Help build it | [Developer guide](/docs/developer) |
| Know what comes next | [Roadmap](../roadmap) |
