---
title: "Install on your own cluster"
sidebar_label: "Your own cluster"
slug: /getting-started/your-cluster
description: "Install the umbrella Helm chart on a cluster you operate, with every cluster-specific decision as a value."
pagination_next: guides/load-and-transfer
---

# Install on your own cluster

For a cluster you operate, use the **umbrella Helm chart** in `platform/chart`: one release,
one values file you keep in Git, and every cluster-specific decision is a value.

:::caution The chart's default has no sign-in and no permissions
The chart installs the core with `identity.mode: none`, and Lakekeeper runs with `allowall`. Everyone
who reaches it can do everything. Set `identity.mode` before you expose it. The chart does not include
the permission store (OpenFGA) or Spark. For table permissions by group, install with
`IDENTITY=1 BASE_DOMAIN=<your domain> make platform` instead.
The chart renders no `access-sync` job and no permission store; group-derived table permissions are
part of the `make platform` and operator installs.
An external OIDC provider signs people in, but group-derived table permissions need the platform's
own Keycloak: see [what does not follow the token](../architecture/identity#bring-your-own-oidc-provider).
:::

## What your cluster must provide

| Requirement | Notes |
|---|---|
| Kubernetes | verified on k3s 1.37; nothing here is distribution-specific beyond the notes below |
| A default StorageClass | or set `storage.className`; check with `kubectl get storageclass` |
| `helm` 3.18 or newer and `kubectl` | `helm dependency update` fetches the sub-charts |
| Optional: an ingress controller | only if you want the chart's Ingress objects (`ingress.enabled`) |
| **cert-manager** | the chart's Postgres backup plugin (`plugin-barman-cloud`) renders a self-signed `Issuer` and two `Certificate`s; without cert-manager the release cannot install. With `postgres.backup.enabled: false` the plugin is not installed and cert-manager is not needed |

No ingress controller and no LoadBalancer are required. Without them the services stay
`ClusterIP`: `kubectl port-forward` works, and Nova still reports live status. cert-manager is a
different matter: the default install needs it, because the Postgres backup plugin gets its webhook
and client certificates from it. Turning the backup off is the one way to install without it —
`postgres.backup.enabled: false` means no WAL archive and no base backup, so the databases have no
recovery point.

## Install a release

A release installs the operator, which installs the rest of the platform from one
`PlatformInstance`. Your cluster needs an ingress controller and cert-manager (see above).

```bash
kubectl apply --server-side \
  -f https://github.com/stardelt/stardelt/releases/download/@tag@/install.yaml

curl -fsSLO https://github.com/stardelt/stardelt/releases/download/@tag@/platform-minimal.yaml
# set spec.baseDomain, spec.ingress.className and spec.ingress.tls.issuer, then:
kubectl apply -f platform-minimal.yaml
kubectl -n stardelt wait --for=condition=Ready platforminstance/cluster --timeout=25m
kubectl -n stardelt wait --for=condition=Ready lakehouse/main --timeout=25m
```

`--server-side` is needed because the operator owns its CRDs by server-side apply. Every release
lists its image digests in `versions.yaml` on the
[release page](https://github.com/stardelt/stardelt/releases).

:::danger Do not delete install.yaml to uninstall
`kubectl delete -f install.yaml` deletes the CRDs, and with them every PlatformInstance, Catalog and
Pipeline in the cluster. To remove stardelt, delete your `PlatformInstance` first and wait until it
is gone; delete the CRDs only when you mean to lose every stardelt resource.
:::

### Sign in the first time

With `identity.mode: platform`, the operator creates the first person, `admin`, in the group
`stardelt-admins`. Its password is in a Secret in the platform namespace:

```bash
kubectl -n stardelt get secret stardelt-realm-admin -o jsonpath='{.data.password}' | base64 -d; echo
```

Open `https://<baseDomain>` and sign in as `admin` with that password. With `identity.mode: external`,
your own provider signs people in, and this section and the next do not apply.

### Add your team

stardelt never creates people or groups. With the platform's own identity provider, `admin` adds
them in the provider's console:

1. Open `https://id.<baseDomain>/admin/stardelt/console/` and sign in as `admin`.
2. Choose **Users**, then **Add user**. Fill in **Username** and **Email**, choose **Join groups**,
   pick `stardelt-users`, and choose **Create**.
3. On the **Credentials** tab, choose **Set password** and leave **Temporary** on, so the person
   picks their own password at the first sign-in.

Groups decide what people may read and write: grant a group a catalog in
[Access to catalogs](../operations/access#grant-access-to-a-group).

## Install from a checkout (development)

Check that cert-manager is working before the chart is built — the release cannot be installed
without it:

```bash
kubectl get crd certificates.cert-manager.io     # must answer; otherwise install cert-manager first
```

```bash
git clone https://github.com/stardelt/stardelt
cd stardelt/platform
helm dependency update chart

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

Everything lives under `chart/values.yaml`; the table lists what you are expected to change. With
`ingress.mode: gateway` the chart needs the Gateway API v1 CRDs and a `Gateway` in the cluster;
`ingress.className`, `ingress.annotations` and `ingress.tls` do not apply.

| Setting | Default | Effect |
|---|---|---|
| `platform.baseDomain` | `""` | hostnames for the ingresses **and** the base for Nova's deep links |
| `ingress.enabled` | `false` | render Ingress objects for the components that are enabled |
| `ingress.mode` | `ingress` | `ingress` renders Ingress objects; `gateway` renders Gateway API `HTTPRoute` objects instead, for a cluster whose Gateway owns TLS and source filtering |
| `ingress.gateway.name` | `""` | the Gateway the HTTPRoutes attach to; required when `mode` is `gateway`, ignored otherwise (`ingress.gateway.namespace` defaults to the release namespace) |
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
  singleuser: { storage: { dynamic: { storageClass: fast } } }
trino:
  imagePullSecrets: [{ name: my-registry-creds }]
lakekeeper:
  imagePullSecrets: [{ name: my-registry-creds }]
```

The JupyterHub line must name a StorageClass. KubeSpawner writes `storageClassName` verbatim, so an
empty value means *no class* — not the cluster default — and `claim-<user>` stays `Pending` with
`no persistent volumes available for this claim and no storage class is set`. The SeaweedFS entries
above behave differently: that chart renders an empty value as a null `storageClassName`, which does
fall back to the default class.

:::warning Overriding inside a list with `--set`
Helm replaces a whole array element when you target it by index. `--set
seaweedfs.volume.dataDirs[0].storageClass=fast` silently drops that entry's `name`, `type` and
`size` — the volume component then comes up without a claim. Put the whole entry in a values file
instead.
:::

### High availability

Two settings change how a failure behaves, and both default to `1`.

| Setting | Default | Effect |
|---|---|---|
| `postgres.instances` | `1` | CloudNativePG instances behind the catalog's database; `3` keeps the catalog writable when one pod is gone |
| `lakekeeper.catalog.replicas` | `1` | the catalog is stateless; a second replica keeps engines resolving tables through a pod restart |

**Nova stays at one replica while sign-in is on.** Its sessions live in memory, so a second
replica signs people out at random.

**The chart renders no PodDisruptionBudget and no affinity or anti-affinity rule.** On one node
neither can help; with three or more nodes a rolling drain is still a short maintenance window,
not a zero-downtime operation.

**The operator sets its own availability** with `replicaCount: 2` in
`helm-values/operator.yaml` — one leader, one standby. What a failure of each component means is in
[Going to production](../operations/production).

## Sizing

`chart/values.yaml` is tuned for a normal cluster. For a small single node (8 GB) there is
`chart/values-slim.yaml`, which shrinks Trino's heap:

```bash
helm upgrade --install stardelt chart -n stardelt -f chart/values-slim.yaml --wait
```

Trino enforces its own arithmetic: `query.max-memory-per-node` plus
`memory.heap-headroom-per-node` must fit inside the JVM heap the chart gives the coordinator and
workers. The defaults are 800 MB + 600 MB in a 2G heap; `chart/values-slim.yaml` sets 600 MB + 450 MB
in a 1500m heap. The two keys live in different places, which is easy to get wrong:

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

Two things in the stack are **cluster-scoped** and therefore only exist once per cluster:

- the **CloudNative-PG operator** (a `ClusterRole`, CRDs, a webhook): for a second release set
  `cloudnative-pg.enabled: false` and let it use the one that already runs;
- **SeaweedFS's migration `ClusterRole`**: the chart's default in this repo is
  `global.seaweedfs.createClusterRole: false`, because that role is cluster-scoped and would make a
  second SeaweedFS release impossible. Turn it on only if you run a single instance and need the
  chart's data-migration hook.

Object names come from each sub-chart's `fullnameOverride`, so two releases coexist as long as they
live in **different namespaces**, which is how the chart is built (`--namespace` everywhere, no
hardcoded names). Same namespace, same release, different names: not supported. Use one values file
per namespace.

## Distribution notes

| Where you run | What to expect |
|---|---|
| **k3s** | the StorageClass comes with the distribution (`local-path`); install an ingress controller yourself if you want one — nothing in the chart needs host networking |
| **EKS, GKE, AKS** | set `storage.className` (`gp3`, `standard-rwo`, `managed-csi`); use the cloud load balancer or install an ingress controller; nothing in the chart assumes host networking or hostPath |
| **OpenShift** | **not verified.** Routes replace ingresses, and security context constraints may reject the upstream charts' `securityContext` blocks (several upstream images assume a fixed UID). Treat it as a porting project and report what you hit |
| **Air-gapped** | mirror `ghcr.io/stardelt/*` and every upstream image into your registry, then set `images.pullSecrets` and the sub-chart keys above. The published stardelt images are public, so no secret is needed to pull them from the internet |

The chart installs *software*; it does not create nodes, storage or DNS. If your cluster has those,
stardelt fits.

## Verify the install

```bash
kubectl -n stardelt get pods                     # everything Running/Completed
```

```console
$ kubectl -n stardelt port-forward svc/trino 8080:8080
$ trino --server http://localhost:8080
trino> SELECT count(*) FROM system.runtime.nodes;
```

That is the chart's default, `identity.mode: none`: Trino takes plain HTTP and no sign-in. A release install
has sign-in: forward `svc/trino 8443:8443` and run
`trino --server https://localhost:8443 --insecure --external-authentication`. The browser hands the token to
the CLI and you sign in with the same account as in Nova; there `8080` answers `403` on purpose.

Then open Nova (through your ingress, or run `kubectl -n stardelt port-forward svc/nova 8080:8080` and open http://localhost:8080).
Its **Platform** page probes every service and lists each workload with the image it runs.

:::note What has been tested
The chart has been tested on single-node k3s. The cloud and OpenShift rows above are based on what the
chart assumes, not on a real install. If you try one, an
[issue](https://github.com/stardelt/stardelt/issues) with the output of
`kubectl get events -n stardelt` helps a lot.
:::

<NextStep to="/docs/guides/load-and-transfer" title="Load data and the path to a dashboard">
  Load data, model it in bronze, silver and gold, and show it in a dashboard.
</NextStep>
