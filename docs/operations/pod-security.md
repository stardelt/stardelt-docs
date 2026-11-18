---
title: "Pod security"
sidebar_label: "Pod security"
slug: /operations/pod-security
---

# Pod security

A cluster that enforces the `restricted` [Pod Security Standard](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
admits a pod only when its spec declares the fields the standard asks for. stardelt's workloads
declare them, with one measured exception named below, so a namespace labelled
`pod-security.kubernetes.io/enforce=restricted` admits the platform's pods. `make verify-pod-security`
in the platform repository re-admits every running pod and tells you whether your own cluster does.

The install's own floor is `baseline`, not `restricted`: `manifests/namespace.yaml` labels the
namespace `pod-security.kubernetes.io/enforce=baseline` with `warn` and `audit` at `restricted`, and
`make install` applies it first through `step-namespace`. A fresh install therefore admits its own
pods; the sweep below says what a `restricted` floor would still refuse.

## What stardelt runs as

Every pod the platform installs declares the fields a `restricted` namespace checks:
`runAsNonRoot: true` on the pod, a `seccompProfile` of `RuntimeDefault` on the pod or the container,
and — on each container — `allowPrivilegeEscalation: false` with `capabilities.drop: ["ALL"]`. Most
pods also pin the user by number instead of leaving it to the image: Spark and the StreamApp driver
185, Trino and Superset 1000, Airflow 50000, Nova, the operator and OpenFGA 65532, OpenBao 100,
Reloader 65534.

Measured on 2026-11-18 with `NS=stardelt make verify-pod-security` against a full lab install:

| Component | Pods | Declared by | `restricted` |
|---|---|---|---|
| Nova | `nova-…` (1) | both | yes |
| JupyterHub hub | `hub-…` (1) | chart default | yes |
| JupyterHub proxy | `proxy-…` (1) | chart default | yes |
| JupyterHub image puller, user scheduler | `continuous-image-puller-…`, `user-scheduler-…` (3) | chart default | yes |
| JupyterHub single user | `jupyter-<user>` (0) | — | — |
| Spark Connect driver | `spark-connect-…` (1) | `make platform` | yes |
| Spark Connect executors | `stardelt-spark-exec-…` (0) | `make platform` | yes (template) |
| StreamApp driver | `pegelonline-driver` (1) | the operator | yes |
| StreamApp executors | `…-exec-…` (0) | the operator | — |
| Trino coordinator | `trino-coordinator-…` (1) | `make platform` | yes |
| Trino worker | `trino-worker-…` (1) | `make platform` | yes |
| Superset web, worker, redis | `superset-…`, `superset-worker-…`, `superset-redis-master-0` (3) | `make platform` | yes |
| Superset init | `superset-init-db-…` (0) | `make platform` | — |
| Airflow api-server, scheduler, dag-processor, triggerer, statsd | one pod each (5) | `make platform` | yes |
| Airflow worker | `airflow-worker-…` (0) | `make platform` | — |
| Keycloak | `keycloak-…` (1) | both | yes |
| Lakekeeper catalog | `lakekeeper-…` (1) | `make platform` | exception (see below) |
| Lakekeeper init containers, migration Job | `lakekeeper-db-migration-…` (0) | `make platform` | — |
| OpenFGA | `openfga-…` (1) | `make platform` | yes |
| OpenBao | `openbao-0` (1) | `make platform` | yes |
| SeaweedFS master, volume, filer, s3, admin | `seaweedfs-master-0`, `-volume-0`, `-filer-0`, `seaweedfs-s3-…`, `seaweedfs-admin-0` (5) | `make platform` | yes |
| Reloader | `reloader-reloader-…` (1) | `make platform` | yes |
| Kafka broker | `kafka-kafka-0` (1) | `make platform` | yes |
| Kafka entity operator | `kafka-entity-operator-…` (1) | `make platform` | yes |
| The operator | `stardelt-operator-…` (1) | the operator chart | yes |
| Postgres `nova-pg` | `nova-pg-1` (1) | chart default | yes |
| Postgres `keycloak-pg` | `keycloak-pg-1` (1) | chart default | yes |
| Postgres `lakekeeper-pg` | `lakekeeper-pg-1` (1) | chart default | yes |
| Postgres `openfga-pg` | `openfga-pg-1` (1) | chart default | yes |
| Postgres `airflow-postgresql` | `airflow-postgresql-0` (1) | chart default | yes |
| Postgres `superset-postgresql` | `superset-postgresql-0` (1) | chart default | yes |
| CloudNative-PG, Strimzi, Spark operator (controller and webhook), External Secrets | seven pods (7) | chart default | yes |
| Jobs: group-roles, backups, maintenance | `airflow-group-roles-…`, `lakehouse-backup-…`, `maint-…` (0) | `make platform`, the operator | yes |

`Declared by` names where the fields come from: `make platform` is the platform repository's
`helm-values/` and `manifests/`, `umbrella chart` is the umbrella chart's templates, `both` is the
two, `chart default` is a pinned upstream chart or operator that declares the fields itself and
stardelt sets no value for them, and `the operator` means the workload's pod template is built by
the stardelt Operator.

The counts are the pods that were running at that moment: a notebook, a Spark query and a Job come
and go, and the sweep admits what exists when it runs. A `—` in `restricted` marks a row the sweep
did not see — no single-user notebook was open, no StreamApp executor was running, and no Job pod.
Where the pod template is in the repository it was admitted with the same server-side dry run
instead: the Spark Connect executor template (`(template)` above) and all 24 CronJob templates of
that install pass. A single-user notebook pod is not covered here: stardelt sets no security context
of its own for it, so check that row after a notebook has run.

## The exceptions

One pod is refused: the `opa` sidecar of the Lakekeeper catalog pod. The row is what the API server
answers when the live pod's spec is re-admitted into a `restricted` namespace.

| Group | Pods | Why it cannot pass | Where the setting lives |
|---|---|---|---|
| Lakekeeper's policy sidecar | the `opa` container of `lakekeeper-…` | `allowPrivilegeEscalation != false` and `unrestricted capabilities` on the `opa` sidecar; the chart hardcodes its `securityContext` and exposes no value key for it | the `opa` sidecar only. The catalog container and its init containers, in the same pod, declare the fields and pass |

The five SeaweedFS pods are admitted. `helm-values/seaweedfs.yaml` sets each component's
`podSecurityContext` and `containerSecurityContext` (uid/gid 65534, `RuntimeDefault` seccomp, all
capabilities dropped) and its log volume to `emptyDir`, so no `hostPath` remains; measured on the lab
2026-11-18 with the same server-side dry run (platform#1758). The operator path renders the same
blocks from `crates/stardelt-operator/values/seaweedfs.yaml` for `master`, `volume`, `filer` and
`s3`; its `admin` stays at the chart default (`enabled: false`).

A cluster that enforces `restricted` must admit this pod under `baseline`, or run it with values that
declare the fields. The sweep names it so a cluster operator sees it before the install does.

The StreamApp driver used to be a third exception: an operator build older than the one the platform
pins submitted the driver without the container fields. The pinned build declares them, and a driver
pod started by it is admitted — a cluster still on an older operator shows the refusal until the
driver pod is replaced.

## Check your own cluster

From the platform repository, with the namespace the platform runs in:

```console
$ NS=<your-namespace> make verify-pod-security
…
PASS (46 of 47 pods admitted by restricted, 1 known exception)
```

The count follows the pods your install runs; the one exception is the pod named above.

The target runs `scripts/verify-pod-security.sh`. For every running pod it takes the spec as the
API server sees it, strips only what a scratch namespace cannot carry (its name, its node, its
priority class), and creates it with `--dry-run=server` in a namespace labelled
`pod-security.kubernetes.io/enforce=restricted`, which is deleted afterwards. Nothing in the
platform's namespace is changed. A refusal that no `--allow` pattern matches fails the run; a
`--allow` pattern that matches no refusal is reported so it can be dropped.

`--allow <regex>` names a known exception. Today the target passes one:

```make
verify-pod-security: _context ## Every running pod is admitted by a `restricted` Pod Security namespace (#1096)
	@NS=$(NAMESPACE) bash scripts/verify-pod-security.sh \
	  --allow '^lakekeeper-'
```

Each pattern has its reason beside it in the `Makefile`. The StreamApp driver was the second; it
declares the `restricted` fields on its own pinned operator build and is admitted, so its pattern was
dropped (platform#1211). A pattern that matches no refusal is still reported so it can be dropped.

## If a pod is refused

- Read the reason in the output: it names the container and the field (`container "opa" must set
  securityContext.allowPrivilegeEscalation=false`), so there is nothing to guess.
- The sweep admits the spec the API server holds. A pod that has just been replaced still shows the
  old spec until the new one is up; compare the pod's `metadata.creationTimestamp` with the change
  before you look for a cause.
- A refusal in a rollout usually means the workload's values did not reach the pod template. Init
  containers inherit nothing from the chart's pod or container keys, so they need their own block.
- The operator path builds its pod templates itself, so its defaults live in the operator's own
  `crates/stardelt-operator/values/*.yaml` and code, not in the platform's `helm-values/`. A fix
  that only lands in one of the two install paths leaves the other one refused.
