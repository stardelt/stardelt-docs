---
title: "Running stardelt in production"
sidebar_label: "Production"
slug: /operations/production
---

# Running stardelt in production

**Start here: stardelt is pre-alpha.** This page is not a promise that it is ready for your
regulated workload — it is the honest list of what an operator has to provide, what the platform
gives you, and what is still missing. The install itself is [documented](../getting-started/your-cluster);
this page is what happens after.

## Sizing

The platform is a set of upstream services, so sizing is mostly theirs. Measured on the dev cluster
(single node, 8 GB) with the **core** profile:

| Component | Observed footprint | Scales by |
|---|---|---|
| Trino coordinator + 1 worker | ~1.9 GB together (with the slim heap settings) | adding workers, raising `maxHeapSize` **and** `query.maxMemoryPerNode` together |
| SeaweedFS (master, volume, filer, S3) | ~200 MB for an idle cluster | volume replicas, more nodes for more disks |
| CloudNativePG + Postgres | ~200 MB for one instance | instance count, storage size |
| Lakekeeper | ~200 MB | replicas (stateless) |
| Nova | ~80 MB | replicas (stateless) |
| **Total core** | **~2.6 GB usable on an 8 GB node with room for the OS** | — |

Superset and Airflow are a different class (`full` profile): budget 16 GB together with the core
stack, and expect Airflow's scheduler/workers to be the largest consumer. The dev cluster does not
run them — that is why `make install-core` exists.

A single node is a development shape. For anything real, run at least **three** nodes so a node
failure is a reschedule rather than an outage, and make sure your StorageClass can bind volumes on
another node (node-local `local-path` cannot follow a pod; cloud block storage can).

## Availability: what fails today

| Component | Failure mode | What to do |
|---|---|---|
| Postgres (catalog metadata) | single instance in the default install — a pod or node loss stops catalog writes | raise `instances` (CloudNativePG does streaming replication), and keep the [backups](./backups) working |
| SeaweedFS volume | single volume server holds the data; losing its disk loses the files | more volume servers + replication, and the object-store backup on the board |
| Trino coordinator | queries stop; nothing is lost | it is stateless — restart/reschedule; run 2 workers minimum so one can drain |
| Lakekeeper, Nova | stateless | more replicas + a PodDisruptionBudget |
| A whole node | everything on it | 3+ nodes, anti-affinity, tested restore |

None of this is wired into the charts as defaults yet; the values are where the knobs are (see
[Your own cluster](../getting-started/your-cluster)), and this table is the honest map.

## Upgrades

The platform is installed from **pinned chart versions in one place** (`Makefile` for the script
path, `Chart.yaml` + `values.yaml` for the chart path), plus container images that CI builds and
deployments that pin **digests**.

The procedure that works:

```bash
git -C stardelt-platform pull            # the pins moved
make install-core SLIM=1                 # or: helm upgrade --install stardelt chart -n stardelt -f my-values.yaml
make pin APP=nova                        # re-resolve and re-pin the image digest
kubectl -n stardelt get pods             # wait for rollouts, then look
```

Two things to know before you run it, both measured rather than assumed:

- **Re-running the installer is safe but not a no-op.** Every release gets a new Helm revision even
  when nothing changed (Helm's behaviour, and it keeps ten by default), so a cluster that is
  re-installed daily accumulates release history. That is noise, not drift: the objects themselves
  are unchanged.
- **A mutable tag can silently serve an old image.** `manifests/nova-deployment.yaml` uses `:dev`,
  and a node that already has layers for that tag may keep using them after a rollout — the reason
  `make pin` exists, and why production installs should put a digest in their values.

There is no migration framework yet, because nothing has been released. When CRD fields change,
`chart/crds/` must be applied explicitly: Helm installs CRDs on `install`, never on `upgrade`.

## Security posture

- **Images**: published by CI to `ghcr.io/stardelt/*`, pinned by digest in deployments. Mirror them
  into your own registry and set the pull secrets for an air-gapped install.
- **Secrets**: the install needs S3 credentials, and a registry pull secret for private mirrors.
  They are Kubernetes Secrets; there is no secrets manager yet (OpenBao is Phase 4).
- **Network**: everything is in-cluster ClusterIP by default; the ingress is opt-in and TLS comes
  from cert-manager. **There is no NetworkPolicy yet** — treat the namespace as flat.
- **Identity**: [the SSO work](../architecture/identity) is what turns the platform from
  "no login" into "one identity from the browser to the catalog". Until it lands, do not expose Nova
  to a network you do not trust.
- **Least privilege**: Nova holds a namespaced, read-only role (deployments/statefulsets) and nothing
  else; the operator holds cluster-wide apply rights because installing charts requires them.

## Monitoring: what to watch

There is no bundled observability stack yet (Phase 5). Until then, watch these by hand or with your
own tooling — they are the signals that actually predict trouble here:

| Signal | Why it matters |
|---|---|
| `kubectl get pods` for anything not `Running`/`Completed` | the blunt one, catches most breakage |
| `kubectl get backups` age | a backup that stopped running looks exactly like one that works |
| Trino `query.max-memory` pressure and failed queries in its UI | the first symptom of undersized heaps |
| Node disk and memory | SeaweedFS and Trino are the consumers; a full disk fails writes |
| Certificate expiry (`kubectl get certificates -A`) | an expired ingress cert is a silent outage |
| Helm release status (`helm list -A`) | catches a release stuck in `pending-upgrade` before an upgrade does |
| Writes to a **new** bucket hanging | SeaweedFS' volume server ran out of volume slots: the master cannot create a volume for a new collection and the client just blocks (`failed to find writable volumes … Not enough data nodes found` in the master log). The chart sets `maxVolumes: 100`; the upstream default (0 → auto-configure, **7** on Linux) runs out on a real install |

## The honest "not yet" list

Do not run stardelt in production expecting any of these today: high availability defaults, network
policies, a bundled observability/alerting stack, secrets management, an upgrade/migration framework,
multi-tenancy with enforced isolation, or an audit trail. Each is tracked in the
[execution plan](../design/execution-plan) and on the project board — and the ones that matter most
(identity, isolation) are the next work, not a wishlist.
