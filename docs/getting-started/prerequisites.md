---
title: "Prerequisites"
sidebar_label: "Prerequisites"
slug: /getting-started/prerequisites
---

# Prerequisites

stardelt needs a conformant Kubernetes cluster. There are two development paths:

| Path | Use it for | Where |
|---|---|---|
| **Hetzner k3s** (primary) | the full stack — all charts fit | [Hetzner k3s](./hetzner-k3s) |
| **kind** (fallback) | the core lakehouse slice / laptop work | [Local (kind)](./local-kind) |

## Required tools

| Tool | Version | Needed for |
|---|---|---|
| `kubectl` | 1.30+ | both |
| `helm` | 3.18+ | both |
| `docker` | recent, usable without `sudo` | kind, image builds |
| `kind` | 0.32+ | kind path |
| `hcloud` | recent | Hetzner path |
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

# deploy the platform
make install
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
