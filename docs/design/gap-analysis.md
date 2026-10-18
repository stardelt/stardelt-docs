---
title: "Architecture gap analysis"
sidebar_label: "Gap analysis"
slug: /design/gap-analysis
---

# Architecture gap analysis: design vs. `main`

**Scope.** The canonical design (master spec, execution plan, gap decisions D8–D16,
nova-feature-parity, `architecture/*` incl. licenses and identity-integrations) against what the
code on `origin/main` actually does. Snapshot of 2026-10-18, taken after the latest merges:
operator `0ea8e6f` (#36), platform `b506110` (#46), nova `52ff511` (#47), demos `ad66561` (#12),
docs `0d7c186` (#56). Evidence is `repo:path:line` on those commits. When this page and a repo
disagree, the repo wins. Re-verify before acting on any row.

**Severity.** **Critical**: data loss or unauthenticated access today. **High**: a spec promise the
architecture cannot keep without a design change. **Medium**: a correctness or consistency gap with
a contained fix. **Low**: docs drift or hygiene.

**Totals.** 2 critical, 9 high, 8 medium, 4 low (23 gaps; §7). Issues filed 2026-10-18: 3 tracking parents, 10 `ready-to-implement` tickets, 6 RFCs; see the last column of §7.

**How to use this page.** Every row of §7 either links to a ticket that a small model can implement
without other context (label `ready-to-implement`, format in
[Contributing → Writing a ticket](../developer/contributing)), links to an `rfc` that asks a human to
decide first, or says "analysis only" (no ticket yet). Pick work from §7, not from the prose.

---

## Status update, 2026-10-18 evening

The implementation moved after the snapshot above. Re-verified against `main` and the dev cluster:

| Gap | Now |
|---|---|
| G-C1 public endpoints bypass the IdP | **Mitigated.** Trino authenticates every statement with a Keycloak token, Superset/Airflow/JupyterHub sign in through Keycloak, Keycloak publishes an allow-list. See [security model](../architecture/security-model) |
| G-M3 secrets | **Partly done.** Airflow/Superset secrets are generated, `install-core` no longer overwrites the S3 Secret. The S3 key pair is still committed: [#100](https://github.com/stardelt/stardelt-platform/issues/100), [#101](https://github.com/stardelt/stardelt-platform/issues/101), [#102](https://github.com/stardelt/stardelt-platform/issues/102), cutover [#108](https://github.com/stardelt/stardelt-platform/issues/108) |
| G-H9 any signed-in user runs any SQL under Nova's identity | **Partly done.** Trino sees the user's own token; access rules (Lakekeeper authz) are still `allowall` |
| G-H8 backups | **Partly done.** Chart path has continuous catalog backups; the backup guard exists. Off-cluster destination still open |
| Others | Unchanged at the time of writing; re-verify before acting (the register above is a snapshot) |

---

## 1. Plug matrix (master spec §5) vs. implementation

Columns: **CRD**, the field that selects the plug. **Planner**, an entry in
`planner.rs` with a chart, a repo and a version pin. **Values**, curated values: operator golden
values (`values.rs`) / platform (`helm-values/`, `chart/values.yaml`). **Install**, a path that
actually deploys it: `make`, the umbrella chart, or the operator (non-dry-run). **Probe**, a Nova
health probe in `nova:backend/src/apps.rs` `SPECS`.

| # | Plug (default) | CRD | Planner + pin | Values | Install | Nova probe | Status |
|---|---|---|---|---|---|---|---|
| 1 | Catalog (Lakekeeper) | `Lakehouse.spec.catalog.implementation` (`operator:crd.rs:198-205`) | `lakekeeper/lakekeeper` 0.11.0 (`planner.rs:48-52`, pins `:138-150`) | operator: **none**, falls to chart defaults (`values.rs:124`); platform: CNPG DB, `authz: allowall` (`platform:helm-values/lakekeeper.yaml:11-28`) | make + chart; operator path unwired (G-H1) | yes (`apps.rs:205`) | **partial** |
| 1a | Catalog alternate (Polaris) | enum value accepted by schema | `polaris/polaris`, **no repo, no pin** (`planner.rs:59`): helm fails | none | none | — | **missing**, schema still accepts it |
| 2 | Object storage (SeaweedFS) | `Lakehouse.spec.storage.{implementation,bucket}` (`crd.rs:231-237`); `bucket` read nowhere | `seaweedfs/seaweedfs` 4.25.1 | operator golden PVC + S3, but `maxVolumes: 0` (`values.rs:112`, platform fixed it to 100 in #40) and **demo profile drops the PVC type** (G-C2) | make + chart; operator broken in `demo` | **none** | **partial** |
| 2a | BYO-S3 | `storage.implementation: byoS3` | skips SeaweedFS | **no endpoint/credentials fields** | chart via `s3Credentials.create=false` only | — | **partial** |
| 3 | Identity (Keycloak) | **none**: not in `PlatformInstanceSpec` (`crd.rs:148-160`) | none | platform: `identity.*` (`chart/values.yaml:85-95`), `manifests/keycloak.yaml`, realm JSON | `make install-identity`, chart `identity.mode=platform` | **none** | **partial** (platform only) |
| 4 | Query (Trino) | none of its own; always in `plan_lakehouse` (`planner.rs:63-68`) | `trino/trino` 1.42.2 | operator: forwarded-headers only, **no `catalogs.warehouse`** (`values.rs:31-34`); platform: full catalog (`helm-values/trino.yaml:51-69`) | make + chart; operator Trino has no catalog | yes (`apps.rs:193`) | **partial** |
| 5 | BI (Superset) | — | not planned | platform full profile only | `make install`; chart, exclusive with Airflow | yes (`apps.rs:219`) | **partial** (no operator path) |
| 6 | Orchestration (Airflow 3) | `Pipeline.spec.engine` (`crd.rs:370-380`) | `apache-airflow/airflow`, no repo or pin; **no controller** | platform full profile | `make install` | yes (`apps.rs:240`) | **partial** (contract only) |
| 7 | Transform (dbt) | `StepKind::Dbt` | `chart: None` | none | none | — | **missing** |
| 8 | SaaS ingestion (SeaTunnel) | `IngestionSource.spec.domain=saas` | `seatunnel/seatunnel`, no repo or pin (`planner.rs:82-83`); no controller | none | none | — | **missing** (contract only) |
| 9 | Enterprise integration (NiFi) | `domain=enterprise` | `nifi/nifi`, no repo or pin | none | none | — | **missing** |
| 10 | CDC (Debezium + Strimzi) | `domain=cdc` | two charts, no repo or pin | none | none | — | **missing** |
| 11 | Metadata/lineage (OpenMetadata) | — | — | — | — | — (Lineage page is a static SVG) | **missing** |
| 12 | Quality (`DataContract`) | **no CRD** | `StepKind::Quality` only | — | — | — | **missing** |
| 13 | Notebooks (JupyterHub) | spec says `Workspace` CRD; code has `PlatformInstance.spec.pillars.notebooks` (`crd.rs:33-36`, op #34) | `jupyterhub/jupyterhub` 4.4.3 | operator + platform: **DummyAuthenticator, shared password** (`values.rs:43-56`, `helm-values/jupyterhub.yaml:13,30`) | `make install-notebooks`; operator into the hard-coded `stardelt` ns | yes (`apps.rs:256`) | **partial**, contract deviates from spec |
| 14 | Heavy compute (Spark) | `PipelineEngine::Spark` | `spark-operator/spark-operator`, no repo or pin | — | — | — | **missing** |
| 15–18 | Streaming, MLflow, KServe, `ModelEndpoint` | no CRDs | — | — | — | — | **missing** (P2/P3, expected) |

**Reading.** Only rows 1, 2 and 4 (plus 13) have a pinned planner entry. In each of them the
operator's golden values are a subset of the platform's, so the operator path is not a working
install yet (G-H1). Rows 6–10 and 14 are *contract-only*: a CRD and a planner rule, but no
controller, no pin and no repo. `check-platform-pins.sh` only compares charts the Makefile knows,
so it cannot catch them.

---

## 2. CRD API quality (`stardelt-operator`)

| Concern | Finding | Evidence |
|---|---|---|
| Conditions | `conditions` exists on every status type but is **always written empty** | `controller.rs:105,423,466` |
| `observedGeneration` | absent from every status; a client cannot tell whether status reflects the current spec | `crd.rs` status structs `:162-170,190-196,283-290` |
| Condition shape | `last_transition_time` / `started_at` are snake_case, against Kubernetes' `lastTransitionTime` convention; `phase` is a free string, not an enum | `crd.rs:443,412,165` |
| Readiness | `ready: !dry_run` after `helm` exits 0: readiness means "helm returned", not "the service answers" | `controller.rs:365` |
| Finalizers / deletion | **none.** No finalizer, no ownerReferences, no ownership labels. Deleting a `Lakehouse` leaves all Helm releases and PVCs; deleting a `Tenant` leaves its Namespace | `controller.rs` (no finalizer code); WP-21 tasks list it |
| Release naming | release name = component name (`seaweedfs`, `lakekeeper`, `trino`), so two `Lakehouse`s in one namespace fight over the same releases (the adopt guard only checks the owner marker) | `controller.rs:328-337`, `helm.rs:52-56` |
| Scope | `PlatformInstance` (cluster-scoped) installs into the hard-coded namespace `"stardelt"`. `Tenant` is **namespaced** yet creates a cluster-scoped Namespace named after itself, so two Tenants with one name in two namespaces collide | `controller.rs:455`; `crd.rs:177-178`; `controller.rs:75-94` |
| Validation | no CEL (`x-kubernetes-validations`); `configMapRef`/`secretRef` exclusivity and the cron syntax are checked only at runtime; schema accepts `polaris` and `byoS3` without the fields they need | `controller.rs:169-176`; `chart/crds/*` |
| Unused fields | `storage.bucket`, `TenantSpec.profile`, `displayName`, `pillars.{batch,streaming,ml}` are read nowhere | grep over `controller.rs`/`planner.rs` |
| Idempotency / drift | every reconcile runs `helm upgrade --install --wait --timeout 10m` for every component, with a 300 s requeue whether or not anything changed: a new Helm revision every 5 minutes, chart hooks re-run, up to 10 min blocking per component. No spec hash, no `generation` gate, no drift detection beyond what Helm's 3-way merge does on its own | `controller.rs:362,437,477`; `helm.rs:52-87` |
| HA of the operator | `replicaCount` is configurable, with no leader election: two replicas run concurrent `helm upgrade` against the same release | `chart/templates/operator.yaml:58`; `chart/values.yaml` |
| Liveness | when the API server is unreachable at start, `main` idles forever: no crash, no restart, no probe, no metrics | `main.rs:13-22` |
| RBAC | ClusterRole grants `*/*` the verbs get, list, watch, create, update, patch and delete: effectively cluster-admin minus `escalate`/`bind`/`impersonate`, and it includes every Secret in the cluster | `chart/templates/operator.yaml:33-35` |
| CRD upgrades | CRDs live in the chart's `crds/`, which Helm never upgrades; CI does not check `crdgen` output against `chart/crds/` | `.github/workflows/ci.yml` (no crdgen step); `docs:operations/production.md` |

---

## 3. Multi-tenancy model

| Spec / doc claim | Code | Gap |
|---|---|---|
| "Every stardelt resource carries a `stardelt.io/tenant` label" (`docs:architecture/overview.md:113`) | only the Namespace a Tenant creates is labelled (`controller.rs:80-81`) | Helm releases, Lakehouses, PVCs: unlabelled |
| "Tenant namespaces can be isolated by NetworkPolicies" (`overview.md:116`) | **no NetworkPolicy anywhere** in platform, chart or operator; `production.md:84` says "treat the namespace as flat" | the docs contradict each other |
| D8: Trino resource groups on `Tenant`/`Lakehouse` | no field | expected for P3, but `Tenant` has nothing to attach it to |
| Tenant ↔ identity realm/group | none. One realm `stardelt` per platform (`identity.md:36`); Tenant has no group or issuer mapping | per-tenant identity is undefined |
| Tenant ↔ Lakehouse | no reference either way; a Lakehouse lives in any namespace | the "isolation boundary" contains nothing |
| Quotas | no ResourceQuota / LimitRange | — |

---

## 4. Data-plane risks

| Risk | Evidence | Note |
|---|---|---|
| **Operator default profile loses SeaweedFS data on restart** | `values.rs:171-178` sets `volume.dataDirs: [{size: 5Gi}]`; `deep_merge` replaces arrays (`values.rs:198-211`), so the golden `type: persistentVolumeClaim`, `name` and `maxVolumes` (`values.rs:109-112`) are dropped. `demo` is the CRD default. The test asserts `size` only (`values.rs:333`) | Critical (G-C2) |
| Every stateful component is single-replica | SeaweedFS master/volume/filer/S3 `replicas: 1`, `defaultReplication: "000"` (`helm-values/seaweedfs.yaml:8-47`); CNPG `instances: 1` (`manifests/cnpg-postgres.yaml:10`); Keycloak `replicas: 1` + `KC_CACHE=local` | documented honestly in `production.md:38-45`; P4 HA |
| Backups share the failure domain | the catalog WAL (`s3://backups/`) and the data archive (`s3://lakehouse-backup/`) both land in the **same single SeaweedFS volume server** as the data (`cnpg-postgres.yaml:22-23`, `object-store-backup.yaml:71`) | docs state it (`backups.md:19-21`); it remains the main RPO risk. Existing issue platform#3 |
| Backups are not part of any install | no Makefile target applies `cnpg-backup-schedule.yaml` or `object-store-backup.yaml`; the umbrella chart has **no** backup config (0 matches in `chart/templates/cnpg-postgres.yaml`) and no archive CronJob | a chart install has no backups at all |
| Archive bucket not created | `createBuckets` lists `lakehouse`, `backups` only (`helm-values/seaweedfs.yaml:58-64`); the CronJob writes `lakehouse-backup` | **verify** whether SeaweedFS auto-creates on first PUT; the manifest header also points at a `lakehouse-restore-now` CronJob that does not exist (`object-store-backup.yaml:15-16`) |
| Secrets | one static S3 **admin** key, committed (`helm-values/seaweedfs.yaml:56`, `manifests/s3-credentials.dev.yaml`), shared by Trino, Lakekeeper, Airflow, CNPG backup and the archive; vended credentials off (`helm-values/trino.yaml:57`); no OpenBao or External Secrets. `install-core` re-applies the dev Secret on **every run** (`Makefile:150`), overwriting a customer's `stardelt-s3-creds` | spec §6 puts OpenBao in the foundation. Docs disagree on its phase: P4 in `services.md:186` and `production.md:82`, P5 in `roadmap.md:67,122` |
| Committed app secrets | Airflow fernet/JWT/webserver keys (`helm-values/airflow.yaml:26-27,96`), Superset `SECRET_KEY` + `admin/admin` (`superset.yaml:47,66`), JupyterHub shared password (`jupyterhub.yaml:30`) | WP-16 open |
| Network | no NetworkPolicy, no PodDisruptionBudget anywhere | — |
| Upgrade / rollback | operator: no rollback (`helm rollback` is never called; a failed `--wait` leaves the release `failed` and is retried every 30 s); CRDs never upgraded; platform: pins in Makefile + Chart.yaml + `values.rs` (three copies) | WP-13 has no CI assertion |
| Values triplicated, already drifted | `maxVolumes` 100 in platform vs 0 in operator; Superset image `ghcr.io/stardelt/superset` (`helm-values/superset.yaml:20`) vs `stardelt/superset` (`chart/values.yaml:454`); chart Postgres without backups | WP-15 "one place that owns the values" |

---

## 5. Identity architecture

**What is on `main`.** Nova is a confidential OIDC client: code + PKCE, a bearer path, admin by
group or app role, an audit line per mutating request (nova #20, #35–#45). Keycloak is a platform
component (platform #33/#35); its realm has audience mappers and `lakekeeper` as a public PKCE
client. The manifest path takes `NOVA_AUTH_MODE` and `NOVA_PUBLIC_URL` from the `stardelt-identity`
ConfigMap (platform #45). Nova forwards the caller's token when `NOVA_FORWARD_IDENTITY=1`
(nova #45).

| Concern | Finding | Evidence |
|---|---|---|
| `identity` in the CRD | **absent.** `PlatformInstanceSpec` has `profile`, `pillars`, `dryRun` and values only. identity-integrations promises "The `PlatformInstance` CRD will carry the same four fields". The operator knows nothing about Keycloak: no planner entry, no golden values, no ConfigMap | `crd.rs:148-160`; `docs:architecture/identity-integrations.md:56-66` |
| Entra vs Keycloak modes | expressed only as `identity.mode: none\|platform\|external` in the umbrella chart, plus the ConfigMap (`chart/values.yaml:85-95`, `templates/identity.yaml`); the manifest path learns it from `identity-bootstrap.sh` | two of the three install paths carry it; the operator path cannot |
| Sessions | in-memory `HashMap`; a restart logs everyone out. The chart lets `nova.replicas` be anything (`chart/templates/nova.yaml:48`) with no guard in `oidc` mode; `production.md:25,43` still calls Nova "stateless" | nova README "Limitations" |
| Forwarding correctness | the first `POST /v1/statement` carries the caller's bearer and name, but `nextUri` polling sends **neither**: it reverts to `X-Trino-User: <dev user>` and drops `Authorization` (`nova:backend/src/trino.rs:133-137`). Against an OAUTH2 Trino every multi-page query would 401 | bug |
| Trino principal | `X-Trino-User` = `display_name` (`trino.rs:71-77`), i.e. `preferred_username`/`email`, which are mutable on Entra; identity-integrations recommends `oid`/`sub` for policy matching | — |
| Forwarding wiring | `NOVA_FORWARD_IDENTITY` is set by no manifest or chart template | grep over the platform |
| Enforcement | Trino has no authenticator in any values file, Lakekeeper is `authz: allowall`. Any user the IdP signs in can run any SQL, including `DROP`, through `/api/query` (a non-admin route, `main.rs:212`) under Nova's service identity | docs#34 tracks Lakekeeper permissions |
| **Bypass of Nova's login** | the playground ingress publishes `trino.` (no authentication; any `X-Trino-User`) and `jupyter.` (DummyAuthenticator, shared password committed in the repo, which gives an in-cluster Python kernel next to the static S3 admin key) on the dev playground domain (`platform:dev/playground/ingress.yaml:46,118`); `superset.`/`airflow.` with `admin/admin` when the full profile runs | Critical (G-C1). Probed on 2026-10-18: the dev playground's Trino answers `GET /v1/info` with no credentials and the JupyterHub login page is served. Superset and Airflow were not running (503) |
| Audit | the `audit` tracing target goes to stdout only; nothing persists it. D15 assumes a Kafka `stardelt.audit.v1` topic that does not exist | docs#33 tracks the system catalog |

---

## 6. Docs vs. code

| Doc claim | Reality | Fix in |
|---|---|---|
| Master spec §6: the operator reconciles "using server-side apply"; `overview.md:108`: it reconciles "top-level CRDs into the per-service CRDs" of upstream operators | the operator shells out to the `helm` CLI (`helm.rs:125-158`); it creates no upstream CRs, not even the CNPG `Cluster` | master spec §6 / overview |
| Master spec §5 row 2 lists **MinIO** as an alternate | `licenses.md:51` bans MinIO (AGPL, archived) | master spec |
| `licenses.md:43`: OpenBao is "the single non-permissive component in the default install" | OpenBao is not installed anywhere | licenses.md |
| Execution plan §1 (`execution-plan.md:19-21`): Nova has "no OIDC login yet", platform "CI never installs" | both stale: OIDC merged (nova #20), the gate and the nightly leg exist (demos #6/#12) | execution plan §1 |
| WP-23 status (`execution-plan.md:224`): sizing "verified on the dev cluster for both profiles" | the `demo` overlay drops SeaweedFS persistence (G-C2); the dry-run verification could not show it | execution plan WP-23 |
| Master spec §5 row 13: `Workspace` CRD | `PlatformInstance.spec.pillars.notebooks` | spec, or a `Workspace` CRD |
| `overview.md:113-116` tenant labels and NetworkPolicy | §3 | overview |
| `production.md:25,43` Nova stateless | in-memory sessions in `oidc` mode | production.md |
| Principle 2: "Nova edits CRDs, the operator reconciles" | Nova reads Deployments/StatefulSets only (`cluster.rs`); no CRD read/write; no install path deploys the operator (`make install-operator` is a dev path) | WP-22/WP-36 |
| *Undocumented in code:* the adopt guard (`helm.rs:35-37`), `valuesFrom` precedence and the profile overlay are documented only in rustdoc and the operator README, not on the docs site | — | WP-14 adapter inventory |

---

## 7. Gap register (severity-ranked)

| ID | Sev | Gap | Repo · WP | Recommended next step | Issue |
|---|---|---|---|---|---|
| G-C1 | Critical | Public dev endpoints bypass the IdP: Trino unauthenticated, JupyterHub DummyAuthenticator with a committed password, Superset/Airflow `admin/admin` | platform · WP-12, WP-04, WP-16 | Remove the `trino.`/`jupyter.` ingresses, or put them behind oauth2-proxy against `stardelt-identity`, until Trino OAUTH2 and the JupyterHub OAuthenticator are wired; rotate the S3 admin key | platform#47 (children #48, #49) |
| G-C2 | Critical | Operator `demo` profile replaces SeaweedFS `dataDirs`, dropping the PVC type | operator · WP-23 | Overlay `size` without replacing the array: either the profile restates the full entry, or `dataDirs` gets merged by `name`; add a test asserting `type` under `demo` | operator#40 |
| G-H1 | High | A non-dry-run `Lakehouse` produces an unwired stack (no CNPG `Cluster`, Lakekeeper on chart-default DB/authz, no warehouse bootstrap, no S3 Secret, Trino without `warehouse` catalog), yet reports `Ready` | operator · WP-21 | Plan CNPG `Cluster`, S3 Secret and bootstrap Job as components; template endpoints from the Lakehouse name/namespace; make readiness a probe (Lakekeeper `/health`, Trino `/v1/info`, a catalog round-trip) | operator#38 (children #41, #42, RFC #43) |
| G-H2 | High | No finalizer, ownership labels or teardown; release names collide; `PlatformInstance` hard-codes namespace `stardelt` | operator · WP-21 | Finalizer that uninstalls releases in reverse plan order (PVC policy explicit), `<lakehouse>-<component>` release names, `stardelt.io/{tenant,lakehouse}` labels, `spec.namespace` on `PlatformInstance` | RFC operator#47 (namespace: operator#37) |
| G-H3 | High | Status non-conformant: empty conditions, no `observedGeneration`, snake_case fields | operator · WP-20 | `metav1.Condition` shape (`Ready`, `Progressing`, `Degraded`, `ValuesResolved`) per resource plus per component, `observedGeneration`, Events | operator#39 → #44 |
| G-H4 | High | Reconcile is not idempotent: blind `helm upgrade --wait` every 300 s; no leader election | operator · WP-20 | Hash (chart, version, effective values, set) into a status/annotation and skip unchanged; periodic drift check via `helm get manifest` + diff; leader election (kube-runtime lease) | operator#39 → #45, #46 |
| G-H5 | High | `identity` not in `PlatformInstance`; operator has no Keycloak component | operator · WP-23, WP-12 | Add `spec.identity {mode, issuerUrl, groupClaim, adminGroup}` with CEL (external ⇒ https issuer); the reconciler publishes `stardelt-identity` and, for `platform`, plans Keycloak + its CNPG `Cluster` | RFC operator#49 |
| G-H6 | High | Token forwarding drops the bearer on `nextUri`; Trino principal is a mutable display name; flag unwired | nova · WP-12 (+ platform) | Reuse the caller's headers for every poll; derive the Trino user from `sub`/`oid` (configurable); wire `NOVA_FORWARD_IDENTITY` from `stardelt-identity` | nova#52 (poll headers); principal claim + flag wiring open |
| G-H7 | High | Operator ClusterRole is cluster-admin-equivalent | operator · WP-20 | Split into a cluster role (CRDs, Namespaces, the CNPG operator install) and per-namespace Roles bound when a Tenant/Lakehouse is created; document the residual privileges | RFC operator#48 |
| G-H8 | High | All backups (catalog WAL + data archive) share one SeaweedFS volume server with the data; not applied by any install path; chart has none | platform · WP-13/P4 | Wire backups into `install*` and the chart, create `lakehouse-backup`, and make an off-cluster destination a first-class value | platform#3 (existing); chart parity platform#51 |
| G-H9 | High | Any signed-in user can run arbitrary DDL/DML via Nova under the service identity (Trino no auth, Lakekeeper `allowall`) | platform + nova · WP-12, WP-34/35 | Trino OAUTH2 + OPA bridge on Lakekeeper/OpenFGA (identity-integrations "forwarding at a glance"); until then gate mutating `/api/query`/ingest on the admin role | docs#34 (existing) |
| G-M1 | Medium | Multi-tenancy is a label on a Namespace: Tenant scoping odd, no quotas, NetworkPolicy, identity or Lakehouse link | operator + platform · gap-register #24 (P2) | Make `Tenant` cluster-scoped; add `spec.{quota, networkIsolation, adminGroup}`; default-deny NetworkPolicy + allow-list per plug | RFC operator#50 |
| G-M2 | Medium | Values triplicated (helm-values, chart, `values.rs`) and already drifted | platform + operator · WP-15 | One generated source (`plugs/<plug>/values-<profile>.yaml`) consumed by Makefile, chart and operator (embed at build time); a parity check in CI like `check-platform-pins.sh` | RFC platform#52 |
| G-M3 | Medium | `install-core` overwrites `stardelt-s3-creds` on every run; one static admin key for all consumers; secrets manager phase inconsistent | platform · WP-16 | Create the Secret only if absent (or generate it, as identity-bootstrap does); per-consumer SeaweedFS identities; Lakekeeper vended credentials; pick P4 or P5 for OpenBao/ESO | platform#50 (clobber); keys/OpenBao open |
| G-M4 | Medium | Contract-only plugs (Polaris, SeaTunnel, NiFi, Strimzi, Debezium, Airflow, Spark) have planner entries without repo/pin; schema accepts `polaris`/`byoS3` | operator · WP-30/32, WP-21 | Mark unimplemented choices `chart: None` ("no adapter yet"), or reject them via CEL until the adapter lands; extend the pin check to every planner chart | analysis only |
| G-M5 | Medium | Nova sessions in memory; chart allows >1 replica in `oidc` | nova + platform | Fail the render when `nova.auth.mode=oidc` and `replicas>1`, or move sessions to a shared store (CNPG); fix "stateless" in production.md | analysis only |
| G-M6 | Medium | CRD validation and upgrade: no CEL, no crdgen drift check, CRDs not upgraded by Helm | operator · WP-20 | CEL rules; a CI step `crdgen \| diff chart/crds`; apply CRDs from a template or a pre-upgrade hook | analysis only |
| G-M7 | Medium | Audit is stdout only; D15's Kafka topic does not exist | nova · D15 | Define the audit event schema now and ship to a sink (Iceberg table via Trino, or a log pipeline) | docs#33 (existing) |
| G-M8 | Medium | Principle 2 unmet: Nova neither reads nor edits CRDs; the operator is in no install path | nova + platform · WP-22/36 | Nova reads `Lakehouse`/`PlatformInstance` status (read-only RBAC) before editing; add the operator to `install-core` behind a flag | analysis only |
| G-L1 | Low | Docs drift (§6 table) | docs · WP-10 | Fold §6 into the docs PR that publishes this page | docs PR |
| G-L2 | Low | Operator idles on a startup connection error; no probes/metrics | operator · WP-20 | Exit non-zero, add `/healthz` + `/metrics` | analysis only |
| G-L3 | Low | Nova has no probe for SeaweedFS, Keycloak or CNPG | nova · WP-14 | Add specs (SeaweedFS S3 `/status`, Keycloak `/health/ready` on 9000, the CNPG `Cluster` condition) | analysis only |
| G-L4 | Low | `object-store-backup.yaml` refers to a nonexistent restore CronJob; `lakehouse-backup` bucket creation unverified | platform | Fix the header; add the bucket to `createBuckets` | analysis only |

---

## 8. Consistency checks requested after the latest merges

| Check | Result |
|---|---|
| Is `identity` expressed in `PlatformInstance`? | **No.** Chart values + ConfigMap `stardelt-identity` + `identity-bootstrap.sh` only (G-H5) |
| Does the operator know about Keycloak? | **No.** The only mention is a comment in the JupyterHub golden values (`values.rs:41`) |
| Profile → sizing in docs and CRDs | CRD: `profile` on `PlatformInstance`, `Lakehouse` and `Tenant`; only the first two are consumed, and `Tenant.profile` is dead. Docs (WP-23 status) match the intent but miss the persistence regression (G-C2). The platform's `SLIM=1` overrides only Trino (`Makefile:34`), while the operator's `demo` also resizes SeaweedFS (5Gi vs 20Gi), so "demo" ≠ "SLIM" |
| Notebooks pillar vs spec | the spec names a `Workspace` CRD (row 13); the code uses a pillar flag. Its golden values install DummyAuthenticator, so `pillars.notebooks: true` reproduces G-C1 on any cluster |
| Nova auth mode vs chart vs manifest | consistent: the chart sets env directly, the manifest reads `authMode`/`publicUrl` from the ConfigMap (platform #45). `NOVA_FORWARD_IDENTITY` is in neither |
| WP-02 gate vs operator | `verify.yml:26`, `nightly.yml:30` exclude the operator and OIDC: no contract tier exists for any CRD |
