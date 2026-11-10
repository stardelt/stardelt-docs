---
title: "stardelt Operator"
sidebar_label: "Operator"
slug: /services/operator
---

# stardelt Operator

**What it is.** The stardelt Kubernetes operator (kube-rs, Rust) that watches stardelt CRDs and reconciles them into upstream Helm releases.

**What it does.** The operator reconciles `PlatformInstance`, `Lakehouse`, `Connection`, `ServicePrincipal` and `StreamApp` resources. Five more kinds are served but have no controller of their own: `Pipeline` is read by the Airflow pipeline loader (one DAG per resource, with `sql` and `notebook` tasks running today), `Catalog` and `SqlWarehouse` are read by the `access-sync` CronJob the operator applies (each Catalog becomes a Lakekeeper warehouse with its grants, each SqlWarehouse a Trino resource group), and `IngestionSource` and `Volume` have schemas and admission rules only, with no runtime yet. `PlatformInstance` owns cluster-scoped prerequisites and identity settings; other resources describe data domains, compute, and connections. New resources default to `spec.dryRun: true`, and an `adopt` guard refuses to take over a release the operator did not create.

That includes `Catalog.spec.maintenance`: the operator reconciles one `CronJob` per `Catalog`,
named `maint-<catalog>`, that runs `stardelt maintenance run --catalog <name>` as the team's
pipeline principal (`ServicePrincipal pipeline-<ownerGroup>`). It compacts tables with at least
`spec.maintenance.optimize.minSmallFiles` small files, expires snapshots and removes orphan
files, once a day. A catalog that sets no schedule runs at a minute staggered from 02:00, so
several catalogs do not compact at the same second.

The condition says whether the job can run:

```console
$ kubectl -n stardelt get catalogs -o jsonpath='{range .items[*]}{.metadata.name}{" "}{range .status.conditions[?(@.type=="MaintenanceReady")]}{.status}{" "}{.reason}{" "}{.message}{"\n"}{end}{end}'
mobility True Scheduled maint-mobility on 44 2 * * *
shared False NoRunner create ServicePrincipal pipeline-stardelt-admins to run maintenance
```

`MaintenanceReady=False NoRunner` means the owner group has no `pipeline-<ownerGroup>`
principal; the operator never invents one. Create it (the [service principals
guide](../guides/service-principals) shows how) and the catalog is scheduled on the next
reconcile. `make verify-maintenance` checks every catalog's job, its schedule, its principal's
token Secret and the newest run's verdict.

**How you reach it.** The operator runs in the cluster as a controller (no public HTTP endpoint by default). Manage it by applying CRDs and by using its CLI subcommands where installed.

**What you can tune.** Settings from `helm-values/operator.yaml` and CRD defaults:

| Setting | Where | Key | Default | What it changes |
|---|---|---|---|---|
| Image repository | `helm-values/operator.yaml` | `image.repository` | `ghcr.io/stardelt/stardelt-operator` | Container image repository for the operator. |
| Image tag/digest | `helm-values/operator.yaml` | `image.tag` | a digest, moved by the install | Pinned image reference (tag may include digest). |
| Image pull policy | `helm-values/operator.yaml` | `image.pullPolicy` | `IfNotPresent` | Image pull policy. |
| Dry run mode | `docs/reference/resources/platforminstance.md` | `spec.dryRun` | `true` | Plan only by default; set to `false` to apply changes. |
| Platform namespace | `docs/reference/resources/platforminstance.md` | `spec.namespace` | `stardelt` | Namespace the platform's components are installed into. |
| Deployment profile | `docs/reference/resources/platforminstance.md` | `spec.profile` | `demo` | Deployment size/profile (`demo`, `full`, `airgap`). |
| Ingress enabled | `docs/reference/resources/platforminstance.md` | `spec.ingress.enabled` | `false` | Create Ingresses for platform services when enabled. |
| Pause reconciliation | `docs/reference/resources/lakehouse.md`, `docs/reference/resources/platforminstance.md` | `spec.clusterOperation.reconciliationPaused` | `false` | Freeze a `Lakehouse` or a `PlatformInstance`: the operator reports phase `Paused`, Ready `False` reason `Paused`, and applies nothing until the field is `false` again. |
| Stop the workloads | `docs/reference/resources/lakehouse.md`, `docs/reference/resources/platforminstance.md` | `spec.clusterOperation.stopped` | `false` | Scale every rendered Deployment and StatefulSet to zero, hibernate the resource's CNPG databases, and report `Stopped`. Data, PVCs and Secrets stay; CronJobs keep running. `false` restores the recorded replica counts. |

**Related pages.** [CRD reference](../reference/resources/), [PlatformInstance reference](../reference/resources/platforminstance), [Bundle reference](../guides/bundle-reference), [How it works](../architecture/how-it-works).

**Operating it.**

- **Install:** `make install-operator` with `helm-values/operator.yaml`. The image digest is pinned there; `scripts/check-version-parity.sh` checks it.
- **Image pinning:** Update `image.tag` to the digest printed by the Image workflow (e.g. `ghcr.io/stardelt/stardelt-operator:dev@sha256:...`).
- **Logs:** `kubectl -n stardelt logs deploy/stardelt-operator` (the Deployment, so the selector cannot go stale; or the namespace where the operator is installed).
- **CRDs:** Cluster-scoped `platforminstances.stardelt.io` and namespaced `lakehouses`, `catalogs`, `sqlwarehouses`, `streamapps`, `connections`, `serviceprincipals`, `ingestionsources`, `pipelines`, `volumes` (all `v1alpha1`). See [CRD reference](../reference/resources/) for fields.
- **Pause a resource:** set `spec.clusterOperation.reconciliationPaused: true` and the operator applies nothing
  for it and reports `Paused`; set it back to `false` to resume. Deleting a paused resource still uninstalls its
  releases (data follows `spec.deletionPolicy`).

  ```console
  $ kubectl -n <namespace> patch lakehouse <name> --type=merge \
      -p '{"spec":{"clusterOperation":{"reconciliationPaused":true}}}'
  $ kubectl -n <namespace> get lakehouse <name> \
      -o jsonpath='{.status.phase}{" "}{.status.conditions[?(@.type=="Ready")].status}{"\n"}'
  Paused False
  ```

  The same field on a `PlatformInstance` freezes the whole platform install. A paused resource does not pick up
  `spec` changes until it is un-paused; `kubectl get` keeps showing the last status it wrote.
- **Stop a resource:** set `spec.clusterOperation.stopped: true` to scale the workloads to zero and hibernate the
  databases; the operator records the replica counts on the resource and restores them when the field is `false`.
  Backups and the access-sync job keep running; a paused resource stays `Paused`.

  ```console
  $ kubectl -n <namespace> patch lakehouse <name> --type=merge \
      -p '{"spec":{"clusterOperation":{"stopped":true}}}'
  $ kubectl -n <namespace> get lakehouse <name> \
      -o jsonpath='{.status.phase}{" "}{.status.conditions[?(@.type=="Ready")].status}{"\n"}'
  Stopped False
  ```
- **CLI — values:** `stardelt-operator values <component> <demo|full|airgap> [--identity <baseDomain>]` prints the Helm values the controller would apply.
- **CLI — identity checklist:** `stardelt-operator identity-checklist <platforminstance.yaml>` prints the identity setup steps.
- **Safety defaults:** New resources default to `spec.dryRun: true`; `adopt` refuses to take over a release the operator did not create.
