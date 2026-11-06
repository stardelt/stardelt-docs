---
title: "Install on a single Hetzner node"
sidebar_label: "Single Hetzner node"
slug: /getting-started/hetzner-k3s
---

# Install on a single Hetzner node

If you do not have a cluster yet, this is the cheapest way to try the whole platform: one k3s node
on Hetzner Cloud, created by a script, gone again with one command.

:::caution For trying things out
One node means no high availability. Do not put data here that you cannot lose. To run stardelt on
a cluster you already operate, see [Install on your own cluster](./your-cluster).
:::

## What you get

- One node, by default **`cx33`** (4 vCPU, 8 GB, about €10 a month). Choose `NODE_TYPE=cx43`
  (16 GB, about €19 a month) for the full platform.
- A private network and a firewall: SSH and the Kubernetes API from your IP only, ports 80 and 443
  open.
- The Hetzner cloud controller and storage driver. There is no cloud load balancer, which keeps the
  bill down.
- A kubeconfig at `~/.kube/stardelt-dev.yaml`.

## 1. Create the node

You need the [tools from the prerequisites](./prerequisites#tools), an SSH key pair and a Hetzner
API token. The scripts live in
[`stardelt-platform/dev/hetzner-k3s`](https://github.com/stardelt/stardelt-platform/tree/main/dev/hetzner-k3s).

```sh
git clone https://github.com/stardelt/stardelt-platform
cd stardelt-platform

export HCLOUD_TOKEN=...          # or keep it in ~/.config/stardelt/hetzner.env
make dev-up

export KUBECONFIG="$HOME/.kube/stardelt-dev.yaml"
kubectl get nodes
```

## 2. Install stardelt

On the 8 GB node, install the core: storage, catalog, SQL engine and the Nova interface. Sign-in is
off, so keep it behind a port-forward.

```sh
make install-core SLIM=1
```

On the 16 GB node, install everything, with sign-in. Replace the domain with one you control:

```sh
IDENTITY=1 BASE_DOMAIN=data.example.com make platform
```

To reach the platform through that domain, set up ingress and TLS from
[`dev/playground`](https://github.com/stardelt/stardelt-platform/tree/main/dev/playground).

## 3. Open it

Without a domain, forward Nova to your machine and open http://localhost:8080:

```sh
kubectl -n stardelt port-forward svc/nova 8080:8080
```

Then follow [From source to dashboard](../guides/source-to-dashboard).

## Remove it

This deletes the node and everything on it:

```sh
make dev-down
```
