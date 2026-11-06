---
title: "Prerequisites"
sidebar_label: "Prerequisites"
slug: /getting-started/prerequisites
---

# Prerequisites

stardelt runs on a Kubernetes cluster you provide. It needs a real node: laptop-size clusters are
not supported.

## Choose how to install

| You have | Do this |
|---|---|
| No cluster, and you want to try stardelt | [Single Hetzner node](./hetzner-k3s) |
| A cluster, and you want everything with sign-in | `IDENTITY=1 BASE_DOMAIN=<your domain> make platform` in a checkout of [`stardelt-platform`](https://github.com/stardelt/stardelt-platform) (the checks are below) |
| A cluster, and you want one Helm release and values in Git | [Install on your own cluster](./your-cluster) |

## What the cluster must provide

| Requirement | Notes |
|---|---|
| **Kubernetes** | Any conformant distribution. Verified on k3s 1.37; other distributions and versions are expected to work but are not tested yet |
| **A default StorageClass** | Volumes for the object store and the databases bind to it. Check with `kubectl get storageclass` |
| **Cluster administrator rights for the install** | The install creates namespaces, CRDs and cluster roles |
| **Outbound network access at install time** | Charts and images come from upstream registries. To install without internet access, mirror them first: see [Sovereignty](../architecture/sovereignty) |
| **An ingress controller** (optional) | Needed for hostnames in the browser. Without one, use `kubectl port-forward` |
| **cert-manager** (with sign-in only) | Issues the SQL engine's internal TLS certificate |

`kubectl config current-context` decides which cluster you install into. To refuse any other, set
`EXPECT_CONTEXT=<context>` when you run `make`.

## How big a node

| Node | Runs |
|---|---|
| 4 vCPU, 8 GB | The core: object store, catalog, SQL engine, Nova |
| 8 vCPU, 16 GB | The whole platform, with Airflow, Superset, notebooks and Spark |

These numbers say what fits, not what a production workload needs. See
[Running stardelt in production](../operations/production).

## Tools

| Tool | Version | Needed for |
|---|---|---|
| `kubectl` | 1.30 or newer | every install |
| `helm` | 3.18 or newer | every install |
| `git`, `make` | recent | every install |
| `hcloud`, [`hetzner-k3s`](https://github.com/vitobotta/hetzner-k3s/releases) | recent | the Hetzner path only |

`stardelt-platform/dev/install-tools.sh` installs `kubectl`, `helm` and `hcloud` into `~/.local/bin`.

## Check the node first

On Ubuntu with a recent kernel, AppArmor can stop PostgreSQL from starting. Run this on the node
after pods have started; the count must be `0`:

```sh
sudo journalctl -k --since "-10 min" | grep -c 'apparmor="DENIED" operation="signal"'
```

If it is not `0`, see [Troubleshooting](../operations/troubleshooting#postgresql-never-becomes-ready).
