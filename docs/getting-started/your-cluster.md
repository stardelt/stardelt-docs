---
title: "Install on your own cluster"
sidebar_label: "Your own cluster"
slug: /getting-started/your-cluster
---

# Install on your own cluster

The dev paths ([Hetzner k3s](./hetzner-k3s), [kind](./local-kind)) install stardelt with
`make install` — a script that walks the components one at a time. That path is optimised for the
maintainer's workflow, not for yours.

For a cluster you operate, use the **umbrella Helm chart** in `stardelt-platform/chart`. One release,
one values file you keep in Git, and every cluster-specific decision is a value rather than an edit
to a script. This page is the settings reference for that path.

## What your cluster must provide

| Requirement | Notes |
|---|---|
| Kubernetes ≥ 1.27 | verified on k3s 1.37; nothing here is distribution-specific beyond the notes below |
| A default StorageClass | or set `storage.className`; check with `kubectl get storageclass` |
| `helm` ≥ 3.14 and `kubectl` | `helm dependency build` fetches the sub-charts |
| Optional: an ingress controller | only if you want the chart's Ingress objects (`ingress.enabled`) |
| Optional: cert-manager | only if you want the chart's TLS annotations (`ingress.tls.enabled`) |

No ingress, no cert-manager and no LoadBalancer is required. Without them the services stay
`ClusterIP`: `kubectl port-forward` works, and Nova still reports live status.

## Install

```bash
git clone https://github.com/stardelt/stardelt-platform
cd stardelt-platform
helm dependency build chart

cat > my-values.yaml <<'YAML'
platform:
  baseDomain: data.example.com     # Nova at data.example.com, Trino at trino.data.example.com
ingress:
  enabled: true
  className: nginx
  tls:
    enabled: true
    issuer: letsencrypt-prod       # a cert-manager ClusterIssuer in your cluster
storage:
  className: gp3                   # your StorageClass; empty = the default one
YAML

helm upgrade --install stardelt chart \
  --namespace stardelt --create-namespace \
  -f my-values.yaml --wait
```

That installs the **core** profile: SeaweedFS (S3), CloudNativePG (the catalog's Postgres),
Lakekeeper (Iceberg REST catalog), Trino (query) and Nova (UI). Superset, Airflow, JupyterHub and
the streaming/ML components are off — they are heavy, and most clusters want to decide separately.

## Settings an administrator owns

Everything lives under `chart/values.yaml`; the table lists what you are expected to change.

| Setting | Default | Effect |
|---|---|---|
| `platform.baseDomain` | `""` | hostnames for the ingresses **and** the base for Nova's deep links |
| `ingress.enabled` | `false` | render Ingress objects for the components that are enabled |
| `ingress.className` | `""` | `ingressClassName`; empty = the cluster's default class |
| `ingress.annotations` | `{}` | extra annotations for every Ingress (auth, proxy body size, …) |
| `ingress.tls.enabled` | `false` | adds per-Ingress TLS and the cert-manager issuer annotation |
| `ingress.tls.issuer` | `""` | name of your `ClusterIssuer` |
| `ingress.tls.secretNameTemplate` | `"{host}-tls"` | secret name per host; `{host}` expands with dots → dashes |
| `ingress.hosts.<service>` | `{}` | pin one service to your own hostname, e.g. `{ trino: sql.example.net }` |
| `storage.className` | `""` | StorageClass for the volumes the chart creates directly (Postgres) |
| `images.pullSecrets` | `[]` | pull secrets for Nova; use Kubernetes' own shape (`- name: …`) |
| `<component>.enabled` | core only | turn components on and off |

Sub-charts take their own storage and pull-secret keys, because Helm cannot template a values file:

```yaml
seaweedfs:
  master: { data: { storageClass: "" } }
  volume: { dataDirs: [{ name: data, type: persistentVolumeClaim, size: 20Gi, storageClass: "" }] }
  filer:  { data: { storageClass: "" } }
  imagePullSecrets:                              # SeaweedFS also reads global.imagePullSecrets
    - name: my-registry-creds
jupyterhub:
  singleuser: { storage: { dynamic: { storageClass: "" } } }
trino:
  imagePullSecrets: [{ name: my-registry-creds }]
lakekeeper:
  imagePullSecrets: [{ name: my-registry-creds }]
```

:::warning Overriding inside a list with `--set`
Helm replaces a whole array element when you target it by index. `--set
seaweedfs.volume.dataDirs[0].storageClass=fast` silently drops that entry's `name`, `type` and
`size` — the volume component then comes up without a claim. Put the whole entry in a values file
instead.
:::

## Sizing

`chart/values.yaml` is tuned for a normal cluster. For a small single node (8 GB) there is
`chart/values-slim.yaml`, which shrinks Trino's heap:

```bash
helm upgrade --install stardelt chart -n stardelt -f chart/values-slim.yaml --wait
```

Trino enforces its own arithmetic: `query.max-memory-per-node` must fit inside the JVM heap the
chart gives the coordinator and workers (the slim overlay keeps the chart's 1 GB per node inside a
1.5 GB heap). The two keys live in different places, which is easy to get wrong:

```yaml
trino:
  server:                                   # cluster-wide settings
    config:
      query:
        maxMemory: "900MB"
  coordinator:                              # per-node settings, per role
    config:
      query:
        maxMemoryPerNode: "900MB"
    jvm:
      maxHeapSize: "1500m"
  worker:
    config:
      query:
        maxMemoryPerNode: "900MB"
    jvm:
      maxHeapSize: "1500m"
```

Lower a heap without lowering `maxMemoryPerNode` and Trino refuses to start with
`Error invoking configuration method … setMaxQueryMemoryPerNode`.

## Several lakehouses in one cluster

stardelt expects more than one instance to be possible (a lakehouse per tenant is the plan). Two
things in the stack are **cluster-scoped** and therefore only exist once per cluster:

- the **CloudNative-PG operator** (a `ClusterRole`, CRDs, a webhook): for a second release set
  `cloudnative-pg.enabled: false` and let it use the one that already runs;
- **SeaweedFS's migration `ClusterRole`**: the chart's default in this repo is
  `global.seaweedfs.createClusterRole: false`, because that role is cluster-scoped and would make a
  second SeaweedFS release impossible. Turn it on only if you run a single instance and need the
  chart's data-migration hook.

Object names come from each sub-chart's `fullnameOverride`, so two releases coexist as long as they
live in **different namespaces**, which is how the chart is built (`--namespace` everywhere, no
hardcoded names). Same namespace, same release, different names: not supported.

First-class "many lakehouses, one cluster" is the operator's job — see the `Lakehouse` CRD in
[`stardelt-operator`](https://github.com/stardelt/stardelt-operator). Until it takes over, one
values file per namespace is the honest answer.

## Distribution notes

| Where you run | What to expect |
|---|---|
| **k3s, kind** | the StorageClass comes with the distribution (`local-path`); install an ingress controller yourself if you want one — the dev playground uses ingress-nginx bound to the host network, which is a single-node trick, not a requirement |
| **EKS, GKE, AKS** | set `storage.className` (`gp3`, `standard-rwo`, `managed-csi`); use the cloud load balancer or install an ingress controller; nothing in the chart assumes host networking or hostPath |
| **OpenShift** | **not verified.** Routes replace ingresses, and security context constraints may reject the upstream charts' `securityContext` blocks (several upstream images assume a fixed UID). Treat it as a porting project and report what you hit |
| **Air-gapped** | mirror `ghcr.io/stardelt/*` and every upstream image into your registry, then set `images.pullSecrets` and the sub-chart keys above. The published stardelt images are public, so no secret is needed to pull them from the internet |

The chart installs *software*; it does not create nodes, storage or DNS. If your cluster has those,
stardelt fits.

## Verify the install

```bash
kubectl -n stardelt get pods                     # everything Running/Completed
kubectl -n stardelt exec deploy/trino-coordinator -- \
  trino --execute "SELECT count(*) FROM system.runtime.nodes"
```

Then open Nova (through your ingress, or `kubectl -n stardelt port-forward svc/nova 8080:8080`).
Its **Apps** page probes every service and **Health** lists each workload with the image it actually
runs — including digests — so it is the fastest way to confirm what your cluster is running.

:::note What is verified
The chart is exercised in a namespace of its own on a single-node k3s cluster, and the settings on
this page are rendered and checked there. The cloud and OpenShift rows above are reasoned from what
the chart does and does not assume — not yet from a real install. If you try one, a bug report with
`kubectl get events -n stardelt` is the most useful thing you can send.
:::
