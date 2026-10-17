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

- One Ubuntu 24.04 VM running k3s (Traefik ingress, ServiceLB, local-path storage).
- A firewall allowing SSH + the Kubernetes API only from your current public IP.
- A standalone kubeconfig at `~/.kube/stardelt-dev.yaml`.
- Roughly **€30/month** (`cpx41`, 8 vCPU / 16 GB). Destroy it when idle.

## Bring it up

```sh
# prerequisites: hcloud CLI, an SSH key, HCLOUD_TOKEN (or `hcloud context create`)
cd stardelt-platform
make dev-up

export KUBECONFIG="$HOME/.kube/stardelt-dev.yaml"
kubectl get nodes
```

## Deploy stardelt onto it

```sh
cd stardelt-platform
make install
make pf
```

## Tear it down

```sh
make dev-down
```

## Notes

- Single node, no HA — a development environment, not production.
- **Do not put real data here.**
- The build-plane AI fleet runs on the maintainer's laptop, **not** on this cluster. See
  [AI development fleet](../developer/ai-fleet).
