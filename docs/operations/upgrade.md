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

**A release install** upgrades by applying the next release's `install.yaml` the same way:

```bash
kubectl apply --server-side \
  -f https://github.com/stardelt/stardelt/releases/download/v0.0.N/install.yaml
```

The operator applies its new CRDs at start and reconciles your `PlatformInstance` with the new
digests. Upgrade one release at a time (`v0.0.4` → `v0.0.5`, never skip one), and read the release
notes first.

**A checkout install:**

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

## The client that goes with a release

The command line and the notebook library are released with the platform: a `v0.0.N` release
ships the client that speaks to `v0.0.N`. Install it from the same release page as your Nova:

```bash
pip install "stardelt[jupyter] @ https://github.com/stardelt/stardelt/releases/download/v0.0.N/stardelt-0.0.N-py3-none-any.whl"
```

A client of another release still works for the operations both know. It warns once per command,
prints the install line with the server's release number, and fails only on an operation your
release does not serve — so a mismatch is a warning to act on, not a broken install.

An install from the retired `0.4.x` line sorts above `0.0.x` for pip. Upgrade it with
`pip install --force-reinstall` and the line above.

## Upgrading across a component's major version

A component's chart can move a major version in one release. The new chart usually renders different
objects than the old one, and Kubernetes refuses some of those changes while it accepts others
silently. Work through these five points before you upgrade:

- **Read the component chart's own upgrade notes.** They name removed values, moved templates and
  required steps; the release note of stardelt only names the version move.
- **Render the old and the new chart and diff the output.** No cluster is needed:

  ```bash
  helm template <release> <chart> --version <old> -f <values> > old.yaml
  helm template <release> <chart> --version <new> -f <values> > new.yaml
  diff -u old.yaml new.yaml
  ```

- **A changed `spec.selector.matchLabels` is not upgradeable in place.** Kubernetes forbids the
  change to a Deployment's selector, so `helm upgrade` fails on that object. Delete the Deployment
  before the upgrade; it is recreated with the new selector. `helm rollback` hits the same wall.
- **Dump the component's database first when it has one.** The upgrade runs migrations that a
  rollback does not undo.
- **Keep the old values file readable.** A rollback re-renders the old chart, and it needs the
  values that chart was installed with.

### Worked example: Superset 0.15.5 to 0.22.8

The two chart versions render the same two Deployments by name, but their selectors changed:

```text
=== 0.15.5                                  === 0.22.8
name: rel-superset-worker                   name: rel-superset-worker
  matchLabels:                                matchLabels:
    app: superset-worker                        app.kubernetes.io/name: superset
    release: rel                                app.kubernetes.io/instance: rel
                                                app.kubernetes.io/component: worker
name: rel-superset                          name: rel-superset
  matchLabels:                                matchLabels:
    app: superset                               app.kubernetes.io/name: superset
    release: rel                                app.kubernetes.io/instance: rel
                                                app.kubernetes.io/component: web
```

The umbrella chart sets `superset.fullnameOverride: superset`
(`platform/chart/values.yaml`), so its two Deployments are `superset` and `superset-worker`; an
install without that override names them `<release>-superset` and `<release>-superset-worker`. The
commands below use the umbrella chart's names.

```bash
# 1. the dump, and wait for it
kubectl -n stardelt create job --from=cronjob/superset-pg-dump superset-pg-dump-preupgrade
kubectl -n stardelt wait --for=condition=complete --timeout=600s job/superset-pg-dump-preupgrade

# 2. the two Deployments whose selectors changed (short outage starts here)
kubectl -n stardelt delete deployment superset superset-worker

# 3. the upgrade itself
helm -n stardelt upgrade superset superset/superset --version 0.22.8 -f helm-values/superset.yaml

# 4. the init Job must have run, and both Deployments must be Ready
kubectl -n stardelt get job superset-init-db
kubectl -n stardelt get deploy superset superset-worker
```

`helm rollback` needs step 2 as well: the old chart re-renders the old selectors over the
Deployments the new chart created, and the API server rejects that change just as it rejects the
forward one.

Superset 0.22.8 also ignores `init.initscript`. It renders the init Job from `init.command`, so a
values file that still sets `init.initscript` gets the chart's own script instead of yours. Move your
script to `init.command` before the upgrade; the values file in `platform/helm-values/superset.yaml`
shows the shape.

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
