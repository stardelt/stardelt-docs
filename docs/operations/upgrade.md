---
title: "Upgrade and versions"
sidebar_label: "Upgrade and versions"
slug: /operations/upgrade
description: "Which apiVersion you write, what an upgrade does to your resources, and the commands that upgrade a running platform."
---

# Upgrade and versions

Before you write your own resource files, two questions matter: which `apiVersion` do you put in
the file, and what happens to that file when you upgrade the platform? This page answers both. The
fields of each kind are on the [resource reference](../reference/resources).

## The version you write today

Every kind stardelt serves is `stardelt.io/v1alpha1`:

```yaml
apiVersion: stardelt.io/v1alpha1
kind: Lakehouse
metadata:
  name: analytics
  namespace: stardelt
spec:
  # ...
```

Twelve kinds exist:

| Kind | Scope |
| --- | --- |
| `Catalog` | namespaced |
| `Connection` | namespaced |
| `IngestionSource` | namespaced |
| `Lakehouse` | namespaced |
| `ModelEndpoint` | namespaced |
| `Pipeline` | namespaced |
| `PlatformInstance` | cluster |
| `ServicePrincipal` | namespaced |
| `SparkCluster` | namespaced |
| `SqlWarehouse` | namespaced |
| `StreamApp` | namespaced |
| `Volume` | namespaced |

Each kind has exactly one served version. There is no conversion webhook, so the API server stores
a resource in the version it was created with and cannot translate one version into another.

## Who installs the schemas

The operator applies its own CRD schemas when it starts: it server-side applies them with the
field manager `stardelt-operator` before any controller begins to watch. A running operator
therefore always carries the schema of its own build.

That behaviour exists because of how Helm treats CRDs:

- `helm install` applies `chart/crds/` before the rest of the chart, so on a fresh cluster the
  kinds exist before the operator pod starts.
- `helm upgrade` never applies `crds/`. Without the self-apply, an upgraded operator would run
  against the schema of the release before it.

An operator older than the self-applying behaviour needs the schemas applied once by hand, from
`operator/`:

```bash
kubectl apply --server-side -f chart/crds/
```

## Upgrade a running platform

```bash
cd platform
git pull
make upgrade              # moves pins, runs migrations, runs the verify targets
```

With the umbrella chart, run `helm upgrade --install stardelt chart -n stardelt -f my-values.yaml`.

- **Running it twice is safe.** `make platform-idempotence` proves that for your cluster.
- **CRDs upgrade with the operator.** See [Who installs the schemas](#who-installs-the-schemas).
- **Put digests in your values.** A moving tag can serve an old image.

Before you tag or hand over a release, run the checks in [Before a release](checks.md#before-a-release).

There is no migration guide yet, so upgrade your dev install first and prod after it has run for a
day.

## Upgrading a resource

Upgrade the platform, not the resources.

1. Upgrade the platform. This rolls the operator image.
2. Until the new operator has started, resources stay with the schema they were written against.
3. The new operator applies its schemas, and the resources you already have now follow the new
   schema.

One release upgrades from the one before it: N−1 → N. Move through the releases in order rather
than skipping one.

If a field you added seems to be ignored, the operator that serves it is not the build you expect,
or its rollout has not finished. Check the deployment:

```bash
kubectl -n <namespace> get deploy stardelt-operator
kubectl -n <namespace> rollout status deploy/stardelt-operator
```

The [troubleshooting page on an ignored CRD field](./troubleshooting#a-new-crd-field-is-ignored)
lists the fixes.

## What an upgrade promises

The seven kinds a team writes keep working across an upgrade: `PlatformInstance`, `Lakehouse`,
`Catalog`, `Pipeline`, `Connection`, `ServicePrincipal` and `SqlWarehouse`. A field of one of
those kinds is not renamed or removed within `v1alpha1`, so a resource file that applies today
still applies after an upgrade. The operator applies its own schemas at start, as
[above](#who-installs-the-schemas), so `helm upgrade` cannot leave an older schema serving your
resources.

If a change cannot be made without breaking a stored resource, a new version of that kind is
introduced, both versions are served for at least one release, and a conversion moves the stored
resources. That has not happened yet: every kind is still `stardelt.io/v1alpha1`.

The other five kinds — `IngestionSource`, `ModelEndpoint`, `SparkCluster`, `StreamApp` and
`Volume` — are `v1alpha1` too, but the promise above does not cover them yet: a field of one of
them may change between releases. The release notes name the change.

The platform is still 0.x, so a release note names every breaking change, whether it changes a
resource's schema or only what the platform does with it. Read the notes before you upgrade
production.
