---
title: "Running stardelt in production"
sidebar_label: "Production"
slug: /operations/production
---

# Running stardelt in production

:::warning stardelt is pre-alpha
It is not ready for regulated or business-critical workloads. There are no tagged releases and no
upgrade guarantee. This page lists what you must provide, what the platform gives you, and what is
missing.
:::

## Sizing

Measured on a single node:

| Component | Footprint | Scales by |
|---|---|---|
| Trino coordinator and one worker | about 1.9 GB together, with the slim settings | adding workers; raise the heap and `query.maxMemoryPerNode` together |
| SeaweedFS | about 200 MB when idle | more volume servers and disks |
| CloudNativePG and one PostgreSQL | about 200 MB | more instances, more storage |
| Lakekeeper | about 200 MB | more replicas (stateless) |
| Nova | about 80 MB | one replica only with sign-in on, because sessions live in memory |

The core fits an 8 GB node. The whole platform needs about 16 GB, and Airflow is the largest consumer.

A single node is for trying things out. For anything real, run at least **three** nodes and use a
StorageClass whose volumes can follow a pod to another node. `local-path` cannot.

## What happens when something fails

| Component | When it fails | What to do |
|---|---|---|
| PostgreSQL | One instance by default: catalog writes stop | Raise `instances` and keep [backups](./backups) working |
| OpenFGA | Permission checks fail closed: reads of real tables answer 503 until it is back | Run more than one replica and give it room; it depends on its own PostgreSQL |
| SeaweedFS volume | One volume server holds the data: losing its disk loses the files | More volume servers with replication, or your own S3 |
| Trino coordinator | Queries stop, and nothing is lost | It reschedules; run two workers so one can drain |
| Lakekeeper | Engines cannot resolve tables | More replicas and a PodDisruptionBudget |
| Nova | With sign-in on, a restart signs everyone out | Keep one replica |
| A whole node | Everything on it | Three or more nodes, anti-affinity, a tested restore |

The charts do not set these up by default. The settings are in
[Install on your own cluster](../getting-started/your-cluster).

## Upgrades

```bash
git -C stardelt-platform pull
make upgrade              # moves pins, runs migrations, runs the verify targets
```

With the umbrella chart, run `helm upgrade --install stardelt chart -n stardelt -f my-values.yaml`.

- **Running it twice is safe.** `make platform-idempotence` proves that for your cluster.
- **Helm does not upgrade CRDs.** Apply `chart/crds/` from the operator repository yourself.
- **Put digests in your values.** A moving tag can serve an old image.

There is no migration guide or compatibility promise before the first tagged release, so try each
upgrade on a copy first.

## Security

Read the [security model](../architecture/security-model), and its known limits in particular.

- **Turn sign-in on.** Without it there is no access control, so never expose such an install.
- **Images:** mirror `ghcr.io/stardelt/*` into your own registry and pin digests.
- **Secrets:** generated at install as Kubernetes Secrets, so encrypt etcd. OpenBao is optional and
  holds connection secrets. See [Rotating secrets](./rotating-secrets).
- **Network:** add NetworkPolicies for your own cluster, because only some components have one.

## What to watch

stardelt has no bundled monitoring. Watch these with your own tools:

| Signal | Why it matters |
|---|---|
| Pods not `Running` or `Completed` | Catches most breakage |
| `make verify-backups-all` | A backup that stopped looks exactly like one that works |
| Failed queries and memory pressure in Trino | The first sign of undersized heaps |
| Node disk and memory | SeaweedFS and Trino are the main consumers; a full disk fails writes |
| Certificate expiry (`kubectl get certificates -A`) | An expired certificate is a silent outage |
| The `audit` target in Nova's log (`RUST_LOG=audit=info`) | One line per changing request and per refusal, with the caller |
| `helm list -A` | Shows a release stuck in `pending-upgrade` |

## Not available yet

Do not count on these today: high-availability defaults, NetworkPolicies for every component, a
monitoring and alerting stack, an upgrade and migration framework, or strict isolation between tenants.
