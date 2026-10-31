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

stardelt needs a real node (about 8 vCPU and 16 GB for the full stack); laptop-size clusters are not supported.

## Cluster requirements

What stardelt needs from the cluster it installs into. The dev paths ship all of this; for your own
cluster, verify it before `make install`.

| Requirement | Why | Notes |
|---|---|---|
| **Kubernetes N or N-1** | the charts and the per-service operators target the current upstream API surface | The dev cluster pins k3s `v1.37.1+k3s1`. Any conformant cluster works — EKS, GKE, AKS, OpenShift, RKE2, k3s, sovereign-cloud K8s. stardelt is not a distribution. |
| **A default StorageClass** | the Helm values do not pin a storage class; SeaweedFS volumes and Lakekeeper's Postgres PVCs bind to whatever the cluster marks default | Hetzner k3s uses the Hetzner CSI driver; `local-path` is also available. Size for both the object store and the catalog database. |
| **An ingress controller — or port-forwards** | browser access to Nova and the service UIs needs hostnames; stardelt does not install a controller for you | Bring your own (ingress-nginx, Traefik, …). The documented dev path installs ingress-nginx host-network from `stardelt-platform/dev/playground` (no cloud load balancer). Without one, `make pf` port-forwards work fine. |
| **Cluster-admin (or equivalent) for install** | the install creates namespaces, installs CRDs (CloudNative-PG, cert-manager on the dev path) and applies cluster-scoped roles for the operators | Narrower roles are possible but untested; treat the first install as a cluster-scoped operation. |
| **Outbound network access at install time**, unless you have the air-gap bundle | charts, images and CRDs come from upstream Helm repos and registries | Air-gap packaging is a Phase 5 deliverable; see [Sovereignty](../architecture/sovereignty). Runtime egress is none. |

`kubectl config current-context` determines the target cluster — stardelt does not switch contexts for
you, so check it before installing.

### Host OS, kernel and AppArmor

The node's kernel and its AppArmor policy decide whether containers can signal their own
processes. PostgreSQL wakes its background workers with `SIGURG`; when the container's
AppArmor profile refuses that signal, the database never becomes ready — and it looks like a
database fault, not a host one.

The kernel version alone does not decide it: the same kernel works when containerd does not
apply the container profile. What matters is whether `cri-containerd.apparmor.d` is loaded
and whether its signal rule matches the container's label.

| Combination | Result |
|---|---|
| Ubuntu 26.04, kernel **7.0.0-38-generic**, `apparmor` 5.0.2, `containerd.io` 2.4.2, default container profile | works |
| Ubuntu 26.04, kernel **7.0.0-42-generic**, same packages, default container profile | **broken**: the profile denies the signal, CNPG and ingress-nginx hang |
| Ubuntu 26.04, kernel **7.0.0-42-generic**, `disable_apparmor = true` for containerd | works — containers run unconfined, which is what the dev host does today |

Check before installing — the count must be `0`:

```sh
sudo journalctl -k --since "-10 min" | grep -c 'apparmor="DENIED" operation="signal"'
```

:::warning AppArmor denies container-internal signals
Symptoms on an affected node: the CNPG pods never report ready (`Instance is still down`,
`could not establish connection`), ingress-nginx restarts in a loop with
`nginx: [alert] kill(22, 1) failed (13: Permission denied)`, and the kernel log repeats

```text
apparmor="DENIED" operation="signal" class="signal" profile="cri-containerd.apparmor.d" comm="postgres" signal=urg
```

Ways out, in the order to try them:

1. **Boot the previous kernel** and hold the new one until a fixed kernel or profile ships —
   the least invasive, and it keeps container confinement intact.
2. **Disable AppArmor for container workloads** (a k3s containerd `config.toml.tmpl` with
   `disable_apparmor = true`, then restart k3s). Works, but weakens confinement for every
   container on the node.
3. **Per-workload `securityContext.appArmorProfile: Unconfined`** for the pods that signal each
   other (PostgreSQL, ingress-nginx). Many pods, easy to miss one; not recommended.

This is a host decision, not a chart value: stardelt cannot fix it from inside the cluster.
:::

### Node sizing

Rough, measured against the Hetzner dev cluster — the shape matters more than the provider:

| Node | Runs | Cost (Hetzner, 2026) |
|---|---|---|
| **`cx33` — 4 vCPU / 8 GB** | core stack: SeaweedFS + Lakekeeper (+ CNPG Postgres) + Trino + Nova, via `make install-core SLIM=1` | ~€10/month |
| **`cx43` — 16 GB** | adds Airflow + Superset (`make install`); the full chart set does not fit comfortably in 8 GB | ~€19/month |

Production sizing depends on data volume and query concurrency; there is no HA configuration or
performance guarantee to cite yet ([roadmap](../roadmap) Phase 5). The numbers above are what fits,
not what an enterprise workload needs.

## Required tools

| Tool | Version | Needed for |
|---|---|---|
| `kubectl` | 1.30+ | both |
| `helm` | 3.18+ | both |
| `docker` | recent, usable without `sudo` | image builds |
| `hcloud` | recent | Hetzner path |
| `hetzner-k3s` | recent | Hetzner path — not installed by `install-tools.sh`; get it from [releases](https://github.com/vitobotta/hetzner-k3s/releases) or `brew install vitobotta/tap/hetzner_k3s` |
| `git`, `gh` | recent | development |
| Rust stable, Node 20+ | — | building Nova / the operator / docs |

## Hetzner path

```sh
# install the CLIs (kubectl, helm, hcloud) into ~/.local/bin
stardelt-platform/dev/install-tools.sh

# provision the dev cluster
export HCLOUD_TOKEN=...        # or put it in ~/.config/stardelt/hetzner.env
cd stardelt-platform && make dev-up
export KUBECONFIG="$HOME/.kube/stardelt-dev.yaml"

# deploy the core stack (fits the default cx33 node)
make install-core SLIM=1
# on a 16 GB node: make install   (adds Airflow + Superset)
```

See [Hetzner k3s](./hetzner-k3s) for details.

:::warning Docker access
`docker ps` must work **without sudo**. On Linux:

```sh
sudo usermod -aG docker "$USER"   # then log out and back in
```
:::
