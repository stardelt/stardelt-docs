---
title: "Hetzner k3s (development cluster)"
sidebar_label: "Hetzner k3s"
slug: /getting-started/hetzner-k3s
---

# Hetzner k3s — the development cluster

The full stardelt chart set (Airflow, Superset, Trino, SeaweedFS, Lakekeeper, …) does not fit
comfortably on a laptop. Development therefore runs against a real single-node **k3s** cluster
on Hetzner Cloud.

Provisioning artifacts live in
[`stardelt-platform/dev/hetzner-k3s`](https://github.com/stardelt/stardelt-platform/tree/main/dev/hetzner-k3s).

## What you get

- One node, default **`cx33`** (4 vCPU / 8 GB, ~€10/month); workloads are scheduled on it.
- A private network, a firewall (SSH + Kubernetes API from your IP only, 80/443 open), and the
  Hetzner CCM + CSI driver.
- **No cloud load balancer** and **no bundled ingress controller** — ingress comes from
  [`dev/playground`](https://github.com/stardelt/stardelt-platform/tree/main/dev/playground)
  (ingress-nginx, host-network), which keeps the cost off the bill.
- A kubeconfig at `~/.kube/stardelt-dev.yaml`.
- Playground DNS (A + wildcard A) for `$INGRESS_HOST`, when Cloudflare credentials exist.

## Bring it up

Needs the [`hetzner-k3s`](https://github.com/vitobotta/hetzner-k3s) binary, an SSH keypair, and
`HCLOUD_TOKEN` (in `~/.config/stardelt/hetzner.env` or `dev/hetzner-k3s/.env`).

```sh
# hetzner-k3s itself: `brew install vitobotta/tap/hetzner_k3s`, or the release binary
# from github.com/vitobotta/hetzner-k3s/releases
set -a; . ~/.config/stardelt/hetzner.env; set +a
cd stardelt-platform
make dev-up

export KUBECONFIG="$HOME/.kube/stardelt-dev.yaml"
kubectl get nodes
```

## Deploy stardelt onto it

```sh
make install-core SLIM=1   # core: storage + catalog + query + Nova — fits cx33
# or, on a 16 GB node (NODE_TYPE=cx43, ~€19/month):
make install               # full: + Airflow + Superset

make install-notebooks     # JupyterHub; fits next to the core stack
```

Then set up ingress and TLS from `dev/playground`.

A cluster provisioned exactly this way is already running: Nova at
[alpha.dev.stardelt.io](https://alpha.dev.stardelt.io), with `trino.` and `jupyter.` under the
same wildcard host. It serves the `core` profile (`make install-core SLIM=1`) plus JupyterHub
(`make install-notebooks`) — SeaweedFS, Lakekeeper, Trino, Nova and JupyterHub; Superset and
Airflow need the `full` profile and a 16 GB node.

## Tear it down

```sh
make dev-down
```

## Notes

- Single node, no HA — a development environment, not production.
- **Do not put real data here.**
- The build-plane AI fleet runs on the maintainer's laptop, **not** on this cluster. See
  [AI development fleet](../developer/ai-fleet).
