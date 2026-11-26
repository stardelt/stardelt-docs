---
title: "Running stardelt in production"
sidebar_label: "Production"
slug: /operations/production
description: "What stardelt needs from you to run in production, what it gives you, and what is still missing."
---

# Running stardelt in production

:::warning stardelt is alpha
It is not ready for regulated or business-critical workloads. Releases are `0.0.x` snapshots, each proven on a
fresh single-node cluster, and an upgrade is supported one release at a time ([Upgrade and versions](./upgrade)).
This page lists what you must provide, what the platform gives you, and what is missing.
:::

## Sizing

Measured on a single node:

| Component | Footprint | Scales by |
|---|---|---|
| Trino coordinator and one worker | about 4.5 GiB together at the default settings (2 × 2.3 GiB reserved); about 3.5 GiB with `SLIM=1` | adding workers; raise the heap and `query.maxMemoryPerNode` together |
| SeaweedFS | about 200 MB when idle | more volume servers and disks |
| CloudNativePG and one PostgreSQL | about 200 MB | more instances, more storage |
| Lakekeeper | about 200 MB | more replicas (stateless) |
| stardelt Operator | about 50 m CPU and 64 Mi per replica | two replicas, one leader; the standby waits on the Lease and reconciles nothing |
| Nova | about 10 MB when idle (7 Mi measured) | one replica: the background loops (catalog scan, model probe, pipeline notices) run in every process |

To measure your own node, run the baseline in [Performance baseline](./monitoring#performance-baseline).

The core fits an 8 GB node. The whole platform needs about 16 GB, and Airflow is the largest consumer.

A single node is for trying things out. For anything real, run at least **three** nodes and use a
StorageClass whose volumes can follow a pod to another node. `local-path` cannot.

### What the lab measures

One node with **8 CPU** and 31.2 GiB of memory, measured on 2026-11-25 at commit `e64334c6`. Every
workload runs as the public `demo` person through Nova, and every number is client wall-clock on
that node, so it moves with the node's load.

**Interactive statements** (`make perf-smoke`, three repeats per statement):

| Statement | p50 | p95 |
|---|---|---|
| `scan` — `count(*)` over the demo's bronze table | 833 ms | 1179 ms |
| `cpu` — an expression over a generated 1 000 × 1 000 cross join | 737 ms | 1594 ms |
| `shuffle` — a grouped aggregate over the same cross join | 649 ms | 815 ms |
| `nodepage` — `count(*)` over `system.runtime.nodes` | 481 ms | 490 ms |
| `metadata` — `DESCRIBE` of the bronze table, five rows | 780 ms | 2190 ms |

**Pipelines started at once** (`make perf-pipelines`): one run takes 21.4 s (p50 and p95 of one
run); two different pipelines at once both succeed, p50 21.5 s and p95 23.6 s.

**Ingest into Iceberg** (`make perf-ingest`, Trino statements as `demo`): 3 389 rows/s for 10 000
rows (p50 2 933 ms for the single statement) and 11 431 rows/s for 50 000 rows in five statements
(p50 488 ms).

**Spark Connect** (`make perf-spark`, 5 000 000 generated rows): session 1 479 ms; aggregate
8 755 ms; shuffle 1 746 ms; join 1 451 ms over 100 000 rows; write 2 108 ms for 1 000 000 rows.

**Memory high-water** (`make perf-highwater`, while one pipeline run executes):

| Pod | CPU peak | Memory peak |
|---|---|---|
| trino-worker | 87 m | 2 443 MiB |
| trino-coordinator | 73 m | 2 320 MiB |
| spc-demo-server | 6 m | 1 094 MiB |
| kafka-kafka-0 | 126 m | 957 MiB |
| pegelonline-driver | 121 m | 686 MiB |

No pod was OOM-killed. A pod whose restart count is above zero is marked `(!)` in
`make perf-report`; on this node those counts are days old.

Larger sizes — the 8 GB single-node trial and a three-node department install — are **not
measured yet**: every number above is the lab node's on the date shown, not a promise for another
node. To measure your own, run the five workloads on it ([Performance baseline](./monitoring#performance-baseline)).

## What happens when something fails

| Component | When it fails | What to do |
|---|---|---|
| PostgreSQL | One instance by default: catalog writes stop | Raise `instances` and keep [backups](./backups) working |
| OpenFGA | Permission checks fail closed: reads of real tables answer 503 until it is back | Run more than one replica and give it room; it depends on its own PostgreSQL |
| SeaweedFS volume | One volume server holds the data: losing its disk loses the files | More volume servers with replication, or your own S3 |
| Trino coordinator | Queries stop, and nothing is lost | It reschedules; run two workers so one can drain |
| Lakekeeper | Engines cannot resolve tables | Raise `lakekeeper.catalog.replicas`; a PodDisruptionBudget is not rendered yet |
| Nova | A restart keeps people signed in: sessions are rows in the `browser_session` table, sealed and keyed by the cookie's hash | One replica, because the background loops run in every process |
| stardelt Operator | The leader's pod goes away or stops renewing | The second replica takes over in about 15 s. The old leader stands down and waits for the Lease; it does not restart. A restarting pod means the API server was unreachable — `make verify-restarts` prints the count and fails only on a container whose own exit inside the window was not the node's (`RESTART_MAX_AGE_SECONDS`, default 3600) |
| A whole node | Everything on it | Three or more nodes and a tested restore; the chart renders no anti-affinity |

Nova keeps each signed-in browser as a row in `browser_session` since migration 0015, sealed and
keyed by the SHA-256 of the cookie's id (`session_store`), so a restart reads the row back
(`Auth::load_session`) instead of signing everyone out and a rollout is not a sign-in stampede. The
loops that make one replica the right number are `catalog_metrics::spawn_refresher` (a full scan of
every catalog every five minutes), `model_probe::spawn_loop` (one `model_call` row per probe) and
`pipeline_notice::spawn`; each runs in every process, so scaling Nova out needs them to become a
single-writer job first.

The stardelt Operator is the one workload in the platform that already runs two replicas with a
single writer: the replica that holds the `stardelt-operator-leader` Lease reconciles, the other
waits. The [operator page](../architecture/services) describes the takeover and what a restart means.

The values that exist, and what the chart does not render, are in
[Install on your own cluster](../getting-started/your-cluster#high-availability).

## Stages: dev and prod

Run **one stardelt install per stage**: dev and prod, and test if you need one. Put each on its own cluster, or at least in its own namespace. A broken upgrade or a runaway job then stays in its stage, and dev always upgrades before prod.

![Git carries pipelines, notebooks, SQL and stream apps from the dev install to the prod install; data, runs and secret values never move between stages, and dev may read prod's gold catalog read-only.](/img/guides/stages.svg)

| Moves from dev to prod | Stays in each stage |
|---|---|
| pipelines, notebooks, SQL and stream apps, through Git | data, runs and query history |
| the platform's own settings, through your GitOps tool | secret values: each stage has its own behind the same `Connection` name |
| | service principals: each stage has its own |

Group names come from your sign-in provider, so they are the same in every stage.

**Small installs** can run a single install with one catalog per stage (for example `mobility` for production and `mobilitylab` for work in progress). Upgrades then have no dev stage to go first, so move to two installs before production data depends on it.

## Upgrades

Upgrade the platform and then your resources. The commands, the version rules and what is not
promised yet are on [Upgrade and versions](./upgrade).

## Security

Read the [security model](./security), and its known limits in particular.

- **Turn sign-in on.** Without it there is no access control, so never expose such an install.
- **Images:** mirror `ghcr.io/stardelt/*` into your own registry and pin digests.
- **Secrets:** generated at install as Kubernetes Secrets, so encrypt etcd. OpenBao is optional and
  holds connection secrets. See [Rotating secrets](./security#rotating-secrets).
- **Network:** add NetworkPolicies for your own cluster, because only some components have one.

## What to watch

stardelt has no bundled monitoring. Watch these with your own tools. See [Checks to run](./checks) for read-only verification after upgrades and on a schedule:

| Signal | Why it matters |
|---|---|
| Pods not `Running` or `Completed` | Catches most breakage |
| `make verify-restarts` | A pod that restarts is `Running` again within seconds, so no other check sees it; the restart count and the last exit are the only signal |
| `make verify-backups-all` | A backup that stopped looks exactly like one that works |
| `make verify-images` | A pin can name a digest the registry stopped serving, or a package your pull credential cannot read |
| Failed queries and memory pressure in Trino | The first sign of undersized heaps |
| Node disk and memory | SeaweedFS and Trino are the main consumers; a full disk fails writes |
| Certificate expiry (`kubectl get certificates -A`) | An expired certificate is a silent outage |
| The `audit` target in Nova's log (`RUST_LOG=audit=info`) | One line per changing request and per refusal, with the caller |
| `helm list -A` | Shows a release stuck in `pending-upgrade` |

## Not available yet

Do not count on these today: high-availability defaults, NetworkPolicies for every component, a
monitoring and alerting stack, an upgrade and migration framework, or strict isolation between tenants.
