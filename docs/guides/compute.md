---
title: "Compute"
sidebar_label: "Compute"
slug: /guides/compute
---

# Compute

## What the page is for

Open **Compute** in the left navigation to see the Spark clusters you may use. A Spark cluster is compute a
team starts when it needs it and stops when it is done — for a notebook that needs more memory, a job that
takes longer than a statement should, or a set of experiments. It sits next to the SQL warehouse, which
answers the statements you run by hand and on a schedule
([Schedule a SQL statement](/docs/guides/schedule-sql)). One cluster, the shared one, is always on and belongs
to everyone; the others belong to a group or to one person.

## A cluster's card

Each cluster is one card. The top line is its display name, or its name when it has no display name, next to a
phase badge: **Starting**, **Running**, **Stopping**, **Stopped** or **Failed**. The badge says what the
platform reports; a phase it does not know is printed as it came.

The next line says who may use the cluster — its group, else its person, else `—` — and then its size
(**small**, **medium** or **large**) and its runtime, for example `spark-4.1-py3.11`.

Below that, a shared cluster says `Shared · always on · for everyone` and offers no Start or Stop. Any other
cluster says `Stops after <N> min idle`, with `Running since <time>` in front while it runs.

## Start and stop

**Start** appears on a cluster that is **Stopped** or **Failed**; **Stop** appears on one that is
**Running**. The badge changes first, to **Starting** or **Stopping**, and the card follows the cluster to
**Running** or **Stopped** by itself: the page re-reads every 15 seconds, so you do not reload it. A stopped
cluster keeps its definition — the same size, runtime and settings — and starts again from it.

## Create and change a cluster

Administrators have a **New cluster** button at the top right, which opens the same dialog as **Edit** on a
card. The fields, in the order the dialog shows them:

- **Name** — lower-case letters, digits and dashes; fixed once the cluster exists.
- **Display name** — optional; shown on the card instead of the name.
- **Owner** — a group or a person, and which of the two.
- **Size** — **small**, **medium** or **large**: the preset of driver, executor and executor count.
- **Driver** — cores and memory; blank means the size preset.
- **Executor** — cores and memory; blank means the size preset.
- **Max executors** — optional; blank means the size preset.
- **Runtime** — like `spark-4.1-py3.11`.
- **Image** — optional: an image built from a runtime image, pinned by digest.
- **Idle minutes** — when the cluster stops itself after no use; `0` means never, and only the shared cluster
  may have it.
- **Environment** — variables that appear in the driver and the executors.
- **Spark settings** — the ones the platform does not own; its own defaults apply where you set nothing.

## Who sees what

A cluster belongs to a group or to a person. Only they see it in the list, and only they and administrators
may start or stop it. The shared cluster is the exception: everyone sees it and uses it, and only an
administrator edits it.

## For developers

The page is a thin view over `GET /api/compute`, `POST /api/compute/{name}/start` and
`POST /api/compute/{name}/stop`, and the resource behind it is documented in
[SparkCluster](/docs/reference/resources/sparkcluster).
