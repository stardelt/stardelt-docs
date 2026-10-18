---
title: "Prerequisites"
sidebar_label: "Prerequisites"
slug: /getting-started/prerequisites
---

# Prerequisites

stardelt needs a conformant Kubernetes cluster. There are two development paths:

| Path | Use it for | Where |
|---|---|---|
| **Your own cluster** | a cluster you operate — values-driven, nothing distribution-specific | [Your own cluster](./your-cluster) |
| **Hetzner k3s** (primary dev path) | the core stack on a cheap node; the full stack on 16 GB | [Hetzner k3s](./hetzner-k3s) |
| **kind** (fallback) | the core lakehouse slice / laptop work | [Local (kind)](./local-kind) |

## Cluster requirements

What stardelt needs from the cluster it installs into. The dev paths ship all of this; for your own
cluster, verify it before `make install`.

| Requirement | Why | Notes |
|---|---|---|
| **Kubernetes N or N-1** | the charts and the per-service operators target the current upstream API surface | The dev cluster pins k3s `v1.37.1+k3s1`. Any conformant cluster works — EKS, GKE, AKS, OpenShift, RKE2, k3s, kind, sovereign-cloud K8s. stardelt is not a distribution. |
| **A default StorageClass** | the Helm values do not pin a storage class; SeaweedFS volumes and Lakekeeper's Postgres PVCs bind to whatever the cluster marks default | kind ships `local-path`; Hetzner k3s uses the Hetzner CSI driver. Size for both the object store and the catalog database. |
| **An ingress controller — or port-forwards** | browser access to Nova and the service UIs needs hostnames; stardelt does not install a controller for you | Bring your own (ingress-nginx, Traefik, …). The documented dev path installs ingress-nginx host-network from `stardelt-platform/dev/playground` (no cloud load balancer). Without one, `make pf` port-forwards work fine. |
| **Cluster-admin (or equivalent) for install** | the install creates namespaces, installs CRDs (CloudNative-PG, cert-manager on the dev path) and applies cluster-scoped roles for the operators | Narrower roles are possible but untested; treat the first install as a cluster-scoped operation. |
| **Outbound network access at install time**, unless you have the air-gap bundle | charts, images and CRDs come from upstream Helm repos and registries | Air-gap packaging is a Phase 5 deliverable; see [Sovereignty](../architecture/sovereignty). Runtime egress is none. |

`kubectl config current-context` determines the target cluster — stardelt does not switch contexts for
you, so check it before installing.

### Node sizing

Rough, measured against the Hetzner dev cluster — the shape matters more than the provider:

| Node | Runs | Cost (Hetzner, 2026) |
|---|---|---|
| **`cx33` — 4 vCPU / 8 GB** | core stack: SeaweedFS + Lakekeeper (+ CNPG Postgres) + Trino + Nova, via `make install-core SLIM=1` | ~€10/month |
| **`cx43` — 16 GB** | adds Airflow + Superset (`make install`); the full chart set does not fit comfortably in 8 GB | ~€19/month |
| a laptop | the core slice as a kind demo (`make up` in `stardelt-demos`) | — |

Production sizing depends on data volume and query concurrency; there is no HA configuration or
performance guarantee to cite yet ([roadmap](../roadmap) Phase 5). The numbers above are what fits,
not what an enterprise workload needs.

## Required tools

| Tool | Version | Needed for |
|---|---|---|
| `kubectl` | 1.30+ | both |
| `helm` | 3.18+ | both |
| `docker` | recent, usable without `sudo` | kind, image builds |
| `kind` | 0.32+ | kind path |
| `hcloud` | recent | Hetzner path |
| `hetzner-k3s` | recent | Hetzner path — not installed by `install-tools.sh`; get it from [releases](https://github.com/vitobotta/hetzner-k3s/releases) or `brew install vitobotta/tap/hetzner_k3s` |
| `git`, `gh` | recent | development |
| Rust stable, Node 20+ | — | building Nova / the operator / docs |

## Hetzner path

```sh
# install the CLIs (kubectl, helm, kind, hcloud) into ~/.local/bin
stardelt-platform/dev/install-tools.sh

# provision the dev cluster
export HCLOUD_TOKEN=...        # or: hcloud context create stardelt
cd stardelt-platform && make dev-up
export KUBECONFIG="$HOME/.kube/stardelt-dev.yaml"

# deploy the core stack (fits the default cx33 node)
make install-core SLIM=1
# on a 16 GB node: make install   (adds Airflow + Superset)
```

See [Hetzner k3s](./hetzner-k3s) for details.

## kind path

```sh
cd stardelt-demos
make up
make smoke
```

See [Local (kind)](./local-kind).

:::warning Docker access
`docker ps` must work **without sudo**. On Linux:

```sh
sudo usermod -aG docker "$USER"   # then log out and back in
```
:::
