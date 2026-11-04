---
title: "stardelt Operator"
sidebar_label: "Operator"
slug: /services/operator
---

# stardelt Operator

**What it is.** The stardelt Kubernetes operator (kube-rs, Rust) that watches stardelt CRDs and reconciles them into upstream Helm releases.

**What it does.** The operator reconciles `PlatformInstance`, `Lakehouse`, `Catalog`, `SqlWarehouse`, `Connection`, `ServicePrincipal`, `IngestionSource`, `Pipeline`, and `Volume` resources. `PlatformInstance` owns cluster-scoped prerequisites and identity settings; other resources describe data domains, compute, and connections. New resources default to `spec.dryRun: true`, and an `adopt` guard refuses to take over a release the operator did not create.

**How you reach it.** The operator runs in the cluster as a controller (no public HTTP endpoint by default). Manage it by applying CRDs and by using its CLI subcommands where installed.

**What you can tune.** Settings from `helm-values/operator.yaml` and CRD defaults:

| Setting | Where | Key | Default | What it changes |
|---|---|---|---|---|
| Image repository | `helm-values/operator.yaml` | `image.repository` | `ghcr.io/stardelt/stardelt-operator` | Container image repository for the operator. |
| Image tag/digest | `helm-values/operator.yaml` | `image.tag` | `dev@sha256:f99ae16c68876679c259d7555ea328ee1d4ed6e81696f3bfc6d919c287d49484` | Pinned image reference (tag may include digest). |
| Image pull policy | `helm-values/operator.yaml` | `image.pullPolicy` | `IfNotPresent` | Image pull policy. |
| Dry run mode | `docs/reference/resources/platforminstance.md` | `spec.dryRun` | `true` | Plan only by default; set to `false` to apply changes. |
| Platform namespace | `docs/reference/resources/platforminstance.md` | `spec.namespace` | `stardelt` | Namespace the platform's components are installed into. |
| Deployment profile | `docs/reference/resources/platforminstance.md` | `spec.profile` | `demo` | Deployment size/profile (`demo`, `full`, `airgap`). |
| Ingress enabled | `docs/reference/resources/platforminstance.md` | `spec.ingress.enabled` | `false` | Create Ingresses for platform services when enabled. |

**Related pages.** [CRD reference](../reference/resources/), [PlatformInstance reference](../reference/resources/platforminstance), [Bundle reference](../guides/bundle-reference), [How it works](../architecture/how-it-works).

**Operating it.**

- **Install:** `make install-operator` with `helm-values/operator.yaml`. The image digest is pinned there; `scripts/check-version-parity.sh` checks it.
- **Image pinning:** Update `image.tag` to the digest printed by the Image workflow (e.g. `ghcr.io/stardelt/stardelt-operator:dev@sha256:...`).
- **Logs:** `kubectl -n stardelt logs -l app.kubernetes.io/name=stardelt-operator` (or the namespace where the operator is installed).
- **CRDs:** Cluster-scoped `platforminstances.stardelt.io` and namespaced `lakehouses`, `catalogs`, `sqlwarehouses`, `connections`, `serviceprincipals`, `ingestionsources`, `pipelines`, `volumes` (all `v1alpha1`). See [CRD reference](../reference/resources/) for fields.
- **CLI — values:** `stardelt-operator values <component> <demo|full|airgap> [--identity <baseDomain>]` prints the Helm values the controller would apply.
- **CLI — identity checklist:** `stardelt-operator identity-checklist <platforminstance.yaml>` prints the identity setup steps.
- **Safety defaults:** New resources default to `spec.dryRun: true`; `adopt` refuses to take over a release the operator did not create.
