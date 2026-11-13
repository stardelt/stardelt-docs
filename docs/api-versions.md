---
title: "API versions and upgrades"
sidebar_label: "API versions and upgrades"
---

# API versions and upgrades

Before you write your own resource files, two questions matter: which `apiVersion` do you put in
the file, and what happens to that file when you upgrade the platform? This page answers both. The
fields of each kind are on the [resource reference](reference/resources).

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

Eleven kinds exist:

| Kind | Scope |
| --- | --- |
| `Catalog` | namespaced |
| `Connection` | namespaced |
| `IngestionSource` | namespaced |
| `Lakehouse` | namespaced |
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

An operator older than the self-applying behaviour needs the schemas applied once by hand, in the
`stardelt-operator` checkout:

```bash
kubectl apply --server-side -f chart/crds/
```

## Upgrading a resource

Upgrade the platform, not the resources. The
[Upgrades section of the production guide](operations/production#upgrades) has the commands.

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

The [troubleshooting page on an ignored CRD field](operations/troubleshooting#a-new-crd-field-is-ignored)
lists the fixes.

## What is not promised yet

`v1alpha1` carries no compatibility promise:

- A field may be renamed or removed between releases without a migration for existing resources.
- Because there is no conversion, a resource written for one version of a field is not rewritten
  for you. Re-read the [resource reference](reference/resources) after an upgrade and update
  your files when a field changes.

There is no `v1beta1` yet, and no guarantee about when one arrives. When it does, this page is
where the move is described.
