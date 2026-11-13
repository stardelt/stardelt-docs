---
title: "Platform"
sidebar_label: "Platform"
slug: /operations/health
---

# Platform

Nova's **Platform** page is one screen of live probes: every service grouped by category with its
status, the images the cluster is running, and the query engine's own answer. Each number comes from
the backend, which asks the cluster; the page keeps no history and stores nothing, so it shows what
is true now.

## Where it is

Open Nova as an administrator and choose **Admin → Platform** in the left navigation. The path is
`/platform` on Nova's host — the base domain of the install, such as
`https://data.example.com/platform`. The old `/health` and `/apps` paths redirect here. The page is
administrator-only: a user who is not in the administrator group does not see the
**Admin** group in the navigation, and the backend refuses the requests behind the page with `403`.

Every line on the page is read live. The services are probed every 10 seconds, the running images
and the Trino cluster every 15 seconds, and the warehouse name once when you open the page. Reload
the page to read it again from the start.

## The four numbers

The header at the top right counts `N / M services up`: `M` is the number of installed services and
`N` how many of those answer. It is green only when all of them do. Under it sit four tiles:

- **Engine state** — Trino's `state`, green at `ACTIVE`. `unreachable` means the backend could not
  ask Trino, and `…` means the answer has not arrived yet. Anything else is Trino's own word for a
  coordinator that is starting, draining or stopped: wait for the next read, and if it stays, look at
  Trino's logs ([Where the logs are](./logs)).
- **Engine version** — the `nodeVersion.version` Trino reports, and `—` while there is no answer.
  Compare it with the version you meant to run after an upgrade.
- **Services** — the same `N/M` as the header, with the hint `probing every 10s`. Green when every
  installed service is up.
- **Warehouse** — the warehouse name from Nova's warehouse endpoint, with the hint `Iceberg REST`,
  and `—` when the read failed. A `—` here points at the catalog rather than at a service: check the
  catalog and its sign-in ([Checks to run](./checks)).

## Services

Every service of the platform is one **category card**: the services are grouped by category, and a
card shows the service's name — a link to its detail page in Nova, which carries the image it runs and
its workloads — its description, one line per image, and a status badge. **App details** opens the
detail page, and **Open app ↗** appears only when the app answers: a service that is not `up` shows
`no link` instead, so a link that would land on a `503` is not offered.

The status word is one of:

- `up` — the service answered;
- `unreachable` — the probe failed or the service answered `5xx`; the service is installed and
  running the wrong thing, or not reachable from Nova;
- `not installed` — the cluster holds no workload for this service at all. This is not a fault and
  not a sign of an outage: the platform ships more services than an install turns on, and a service
  whose pillar is off was never installed. Its row stays in the list so the page is the same
  everywhere, and it is not counted as down — neither in the header nor in the **Services** tile.

So a row that says `not installed` needs nothing from you, while `unreachable` is the one to chase.
The services are re-read every 10 seconds; a row that changes while you watch is a real change, not
a stale render.

## Running images

The **Running images** table answers one question: what is the cluster running right now. Its rows
come from Nova's own namespace, one per Deployment (`deploy`) and StatefulSet (`sts`), with the
workload's name, its image and `ready/desired` replicas — green when every desired replica is ready.
The image column shows the repository name and the first eight characters of the digest; hover it to
read the full reference.

The table is read from the cluster, not from the repository. That makes it how you check a rollout:
compare the digest in this table with the digest in the pin the repository carries (`helm-values/`
for a chart install, `manifests/` for an install from the manifests). Equal digests mean the pin is
what runs; different digests mean the pin was merged but never rolled out. If this table shows a tag
instead of a digest, the cluster runs that tag — the image was not pinned where it runs. The footnote
under the table says the same in one line: a digest pin shows as the digest, not as the tag someone
meant to deploy.

Above the table, an amber notice appears when Nova could not read the cluster:

- **last known state** — "The cluster did not answer — showing the last known state, `<age>`." The
  rows are the last good read, and `<age>` says how old they are; Nova keeps asking and drops the
  notice as soon as the API server answers again.
- **cluster unreachable** — "Nova cannot read the cluster, so it has nothing to show here." There
  never was a good read: the empty table below does **not** mean nothing runs.

Both notices describe Nova's view, not the platform — the workloads may well be running. Check the
cluster directly with the commands in [Checks to run](./checks); when Nova's service account cannot
read its namespace, fix that access rather than the workloads.

When the table is empty and no notice is shown, it says so in words: either "The cluster answered —
no deployments or statefulsets in Nova's namespace." or "No cluster access — Nova lists images only
when it can read its own namespace."

## Query engine

The **Query engine** card prints the Trino cluster query's answer as JSON, exactly as the backend
received it. Read the same two values as the tiles: `state` (the coordinator's own state word) and
`nodeVersion.version`. When the query fails, the block carries the error instead, which is the
sentence to quote when Trino is the problem.

## What it does not replace

The page is a view, not monitoring: Nova refreshes every 10 to 15 seconds, keeps no history, raises
no alert and stores nothing, so it cannot tell you what happened ten minutes ago or overnight. Use
it alongside these:

- [Checks to run](./checks) — the scripted checks, each of which prints a verdict and exits non-zero
  when it proves something is wrong; that is what you run after an upgrade and nightly.
- [Where the logs are](./logs) — where each component writes what it did, for the question the page
  cannot answer: why.
- [Backups](./backups) — what is backed up and how a restore is proven.
