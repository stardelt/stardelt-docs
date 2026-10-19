---
title: "Capability gap analysis against comparable platforms"
sidebar_label: "Market gap analysis"
slug: /design/market-gap-analysis
---

# Capability gap analysis against comparable platforms

**Status:** research and design, 2026-10-19. Complements the [Nova feature-parity matrix](./nova-feature-parity)
and the [feature register](./gap-decisions) (Part B), which map console features. This page goes one level
deeper: it reads the **public documentation** of five platforms, lists what each one offers that stardelt does
not, and turns every gap into a classified, designed ticket.

**Method (clean room).** Only vendor documentation pages were read (links in §7). No binaries, no UI assets, no
code. Capabilities are ideas; the designs below are stardelt's own and use only permissively licensed open-source
components. In the tickets the products are deliberately **not named**: they refer to "comparable platforms" and
to the item ids on this page.

**Sources.** `B` = Databricks · `D` = Dremio · `S` = Starburst · `K` = Stackable · `O` = OKDP.
`B`, `D`, `S` are commercial lakehouse platforms; `K` and `O` are open-source *operator-based* platforms, so they
are the reference for the **deployment and operations model**, not for features.

**Classes.** **NOW** = early features needed in the P1-P2 horizon (data engineers, analysts and admins use them
every day, or other work depends on them). **LATER** = enterprise features and the **ML and AI pillar** (roadmap
P3-P4); they are designed so that nothing built now blocks them. "Existing" = already designed elsewhere; the link
says where.

**Status of stardelt, checked 2026-10-19:** Trino with Keycloak token authentication; Iceberg tables behind
Lakekeeper; Nova (catalog, SQL editor, load, apps, activity feed, notebooks and dashboards embeds, user admin link);
Airflow 3, Superset, JupyterHub with single sign-on; Spark Connect endpoint; continuous backup of the catalog
database; an operator with `PlatformInstance` and `Lakehouse` (wiring in progress, epic
[stardelt-operator#55](https://github.com/stardelt/stardelt-operator/issues/55)). Designed, not built: scheduled jobs
([platform#118](https://github.com/stardelt/stardelt-platform/issues/118)), many catalogs and SQL warehouses
([docs#64](https://github.com/stardelt/stardelt-docs/issues/64)), permission model
([research](../architecture/permissions-research)).

---

## 1. Databricks (`B`)

| Capability (reference) | stardelt today | Gap item |
|---|---|---|
| SQL warehouses: sizes, autoscaling, auto-stop/restart, queueing | one always-on Trino coordinator and worker | [M-02](https://github.com/stardelt/stardelt-platform/issues/131) (class NOW) |
| Query history, profile, history API | in-memory feed in Nova; engine history lost on restart | [M-03](https://github.com/stardelt/stardelt-platform/issues/132) NOW; query profile page: existing (register #15) |
| Result and disk caching | none | [M-09](https://github.com/stardelt/stardelt-platform/issues/134) NOW (file cache); a result cache is not planned |
| Privileges, ownership, row filters, column masks | designed (docs#64, permission research) | existing; tag-driven policies: [L-05](https://github.com/stardelt/stardelt-platform/issues/141) |
| Data classification, lineage, system tables | planned (D10, metadata spine, D15) | existing; system tables: [M-03](https://github.com/stardelt/stardelt-platform/issues/132) |
| Incremental file ingestion, managed connectors, CDC | single-file upload; ingestion plug without controller | [L-01](https://github.com/stardelt/stardelt-platform/issues/137) LATER; CDC/SaaS: existing plug matrix |
| Declarative pipelines with data-quality expectations | `Pipeline` quality task designed | existing ([design](./scheduled-jobs)) |
| Multi-task jobs, triggers (schedule, file arrival, table update), repair run, run-as, notifications | designed, not built | existing (scheduled jobs J0-J4); repair run is a Nova action on the runs page |
| Bundles for CI/CD, git folders | none | [M-12](https://github.com/stardelt/stardelt-platform/issues/136) NOW |
| Structured streaming, Kafka | roadmap P3 | existing |
| Notebook co-editing | none (JupyterLab real-time collaboration extension exists) | not planned; revisit with demand |
| Dashboards, SQL alerts, natural-language analytics | Superset embed; no alerts | alerts: [M-04](https://github.com/stardelt/stardelt-nova/issues/103) NOW; natural language: [A-06](https://github.com/stardelt/stardelt-platform/issues/149) LATER |
| Anomaly detection, data profiling | planned (D11) | existing |
| Predictive optimisation, OPTIMIZE/VACUUM, clustering | none | [M-01](https://github.com/stardelt/stardelt-platform/issues/129) NOW; clustering = sort/partition evolution, later |
| Usage and cost tables, budgets, compute policies | none | [L-02](https://github.com/stardelt/stardelt-platform/issues/138) LATER |
| Sharing, federation, marketplace, clean rooms | none | [L-04](https://github.com/stardelt/stardelt-platform/issues/140) / [L-03](https://github.com/stardelt/stardelt-platform/issues/139) LATER; marketplace and clean rooms are non-goals |
| MLflow, feature store, model serving, vector search | none | [A-01](https://github.com/stardelt/stardelt-platform/issues/144), [A-03](https://github.com/stardelt/stardelt-platform/issues/146), [A-02](https://github.com/stardelt/stardelt-platform/issues/145), [A-04](https://github.com/stardelt/stardelt-platform/issues/147) LATER |
| AI functions in SQL, assistant, agents | none | [A-05](https://github.com/stardelt/stardelt-platform/issues/148), [A-06](https://github.com/stardelt/stardelt-platform/issues/149) LATER |
| GPU compute | none | [A-07](https://github.com/stardelt/stardelt-platform/issues/150) LATER |
| Workspace binding, SCIM, Terraform, audit logs | CRDs instead of Terraform; no SCIM; audit to stdout | [L-07](https://github.com/stardelt/stardelt-platform/issues/143) LATER; audit: [M-03](https://github.com/stardelt/stardelt-platform/issues/132) NOW |

## 2. Dremio (`D`)

| Capability (reference) | stardelt today | Gap item |
|---|---|---|
| Engines: sizes, replicas, auto-stop, routing rules by user/group/label, queues | none | [M-02](https://github.com/stardelt/stardelt-platform/issues/131) NOW |
| Pre-computed acceleration (manual and autonomous), result cache | none | [M-10](https://github.com/stardelt/stardelt-platform/issues/135) NOW (materialized views, explicit use); suggestions: [L-06](https://github.com/stardelt/stardelt-platform/issues/142) LATER; cache: [M-09](https://github.com/stardelt/stardelt-platform/issues/134) |
| Automatic optimisation, OPTIMIZE, VACUUM | none | [M-01](https://github.com/stardelt/stardelt-platform/issues/129) NOW |
| Wikis, labels, AI-drafted descriptions, semantic search | read-only catalog | [M-05](https://github.com/stardelt/stardelt-nova/issues/104) NOW (descriptions, tags, owners, text search); semantic: [A-04](https://github.com/stardelt/stardelt-platform/issues/147)/[A-06](https://github.com/stardelt/stardelt-platform/issues/149) LATER |
| Dataset lineage, audit events | planned | existing; audit: [M-03](https://github.com/stardelt/stardelt-platform/issues/132) |
| Privileges, row/column policies | designed | existing (docs#64) |
| Data products with lifecycle | none | [L-05](https://github.com/stardelt/stardelt-platform/issues/141) LATER |
| Open catalog with credential vending for external engines | Lakekeeper REST; no vending | [L-04](https://github.com/stardelt/stardelt-platform/issues/140) LATER (depends on the STS spike [platform#117](https://github.com/stardelt/stardelt-platform/issues/117)) |
| Auto-ingestion pipes, COPY INTO, upload | single-file upload | [L-01](https://github.com/stardelt/stardelt-platform/issues/137) LATER |
| dbt adapter | dbt planned through Trino | existing (scheduled jobs) |
| SQL runner, Arrow Flight SQL, JDBC/ODBC, IDE extension | Nova SQL editor; Trino JDBC | Flight SQL endpoint: not planned |
| Time travel and rollback | none in the UI | [M-11](https://github.com/stardelt/stardelt-nova/issues/105) NOW |
| Federated sources, native-dialect queries | none | [L-03](https://github.com/stardelt/stardelt-platform/issues/139) LATER |
| AI agent, AI functions, hosted tool server, model provider allow-list | none | [A-05](https://github.com/stardelt/stardelt-platform/issues/148), [A-06](https://github.com/stardelt/stardelt-platform/issues/149) LATER |
| Projects, SSO/SCIM, quotas, Kubernetes deployment | operator, OIDC | [L-07](https://github.com/stardelt/stardelt-platform/issues/143), [L-02](https://github.com/stardelt/stardelt-platform/issues/138) LATER |

Not found in the documentation read (so no gap to close, but also no proof of absence): a native scheduler for user SQL,
an official Terraform provider, a native streaming or CDC engine. The scheduled-jobs design is therefore not a catch-up item.

## 3. Starburst (`S`)

| Capability (reference) | stardelt today | Gap item |
|---|---|---|
| Role-based access control with row filters, column masks and audit; external policy engines | designed on the catalog bridge | existing (docs#64) |
| Identity breadth incl. SCIM and group providers | OIDC only | [L-07](https://github.com/stardelt/stardelt-platform/issues/143) LATER |
| Data products by domain | none | [L-05](https://github.com/stardelt/stardelt-platform/issues/141) LATER |
| Indexing and caching on worker-local disks | none | [M-09](https://github.com/stardelt/stardelt-platform/issues/134) NOW (open-source file cache); indexing is not planned |
| Query result caching | none | not planned |
| Materialized views with refresh (and substitution) | none | [M-10](https://github.com/stardelt/stardelt-platform/issues/135) NOW |
| Federation, cross-cluster links | none | [L-03](https://github.com/stardelt/stardelt-platform/issues/139) LATER |
| Workload management with live-editable resource groups | none | [M-02](https://github.com/stardelt/stardelt-platform/issues/131) NOW |
| Routing across clusters and failover | none | [M-02](https://github.com/stardelt/stardelt-platform/issues/131) step C (Apache-2.0 Trino Gateway) |
| Query insights, usage, observability integrations | none | [M-03](https://github.com/stardelt/stardelt-platform/issues/132) NOW, platform#94 |
| Autoscaling on Kubernetes | none | [M-02](https://github.com/stardelt/stardelt-platform/issues/131) NOW |
| Managed ingest from Kafka and files; lake maintenance; attribute tags | none | [L-01](https://github.com/stardelt/stardelt-platform/issues/137) LATER; [M-01](https://github.com/stardelt/stardelt-platform/issues/129) NOW; [M-05](https://github.com/stardelt/stardelt-nova/issues/104) NOW |
| AI functions, tool server, assistant, guardrails, token tracking | none | [A-05](https://github.com/stardelt/stardelt-platform/issues/148), [A-06](https://github.com/stardelt/stardelt-platform/issues/149) LATER |

## 4. Stackable (`K`) — the operator model

| Capability (reference) | stardelt today | Gap item |
|---|---|---|
| One operator and CRD per product with roles and role groups | one operator, CRDs per plug (`Lakehouse`, `PlatformInstance`, ...) | by design; no change |
| **Discovery ConfigMaps** per instance | identity only | [M-06](https://github.com/stardelt/stardelt-operator/issues/62) NOW |
| Catalog as its own resource selected by label | designed (`Catalog`, docs#64) | existing; external sources: [L-03](https://github.com/stardelt/stardelt-platform/issues/139) LATER |
| Cluster-scoped authentication class referenced by name | `spec.identity` per instance (decision D20) | by design; a shared class can be added later |
| OPA operator, user-info fetcher (groups from Keycloak/Entra), Rego row/column rules | catalog bridge designed; groups question open | existing; see the role-sync spike in docs#64 |
| Secret operator (per-pod credentials, TLS), trust stores | generated Secrets, cert-manager | not planned; in-cluster TLS: [platform#80](https://github.com/stardelt/stardelt-platform/issues/80) |
| Listener classes (service exposure presets) | ingress settings | not planned |
| **Restarter**: roll workloads when referenced config changes | manual restarts (S3 rotation runbook) | [M-07](https://github.com/stardelt/stardelt-platform/issues/133) NOW |
| `stopped` / `reconciliationPaused` switches | only `dryRun` | [M-13](https://github.com/stardelt/stardelt-operator/issues/64) NOW |
| Config/env/pod/JVM overrides | `values`, `valuesFrom`, `set` per component | covered |
| Shared S3 connection and bucket resources | `stardelt-s3-creds` | [M-06](https://github.com/stardelt/stardelt-operator/issues/62) (discovery) |
| Release / stack / demo layering and a CLI | profiles and pillars; demo repository; no CLI (decision recorded) | covered; named stacks may follow |
| Metrics sidecars, log aggregation | planned | existing (platform#94) |

## 5. OKDP (`O`) — the packaging model

| Capability (reference) | stardelt today | Gap item |
|---|---|---|
| Packages as OCI artifacts on a GitOps toolkit | operator plus Helm | by design (operator epic); OCI packaging of profiles later |
| **Typed connections** (s3, database server, catalog, trino) | none | [M-06](https://github.com/stardelt/stardelt-operator/issues/62) NOW |
| Control plane UI creating projects and services from a catalog | Nova admin zone, CRDs | covered by the operator epic |
| Project = namespace with per-project usage | tenant dropped (D21) | usage: [L-02](https://github.com/stardelt/stardelt-platform/issues/138) LATER |
| External secrets and a vault integration | generated Secrets | existing gap (security model, G-M3) |
| Spark application submission form/YAML | none | scheduled jobs J3 |
| Sandbox environment on kind | kind gate and demo repository | covered |
| Requires an S3 store **with STS** | STS unverified | confirms the importance of [platform#117](https://github.com/stardelt/stardelt-platform/issues/117) |
| Roadmap items (metadata service, MLflow, Kubeflow, model serving, quotas, observability) | same roadmap | [A-01](https://github.com/stardelt/stardelt-platform/issues/144), [A-02](https://github.com/stardelt/stardelt-platform/issues/145), [L-02](https://github.com/stardelt/stardelt-platform/issues/138) |

## 6. Consolidated items

### NOW — needed early

| Id | Item | Why now |
|---|---|---|
| [M-01](https://github.com/stardelt/stardelt-platform/issues/129) | Automatic table maintenance (compaction, snapshot expiry, orphan files) | Tables degrade without it; all commercial references automate it |
| [M-02](https://github.com/stardelt/stardelt-platform/issues/131) | SQL warehouse lifecycle: auto-stop, scale-to-zero workers, queues, routing | Frees about 1.3 GiB on the dev node; prerequisite for several warehouses |
| [M-03](https://github.com/stardelt/stardelt-platform/issues/132) | Persisted query history, usage and audit as system tables | Audit, cost, suggestions and the history page all depend on it |
| [M-04](https://github.com/stardelt/stardelt-nova/issues/103) | Nova state store (PostgreSQL): saved queries, alerts, settings, sessions | Nova has no durable state; blocks alerts and multi-replica |
| [M-05](https://github.com/stardelt/stardelt-nova/issues/104) | Catalog descriptions, tags, owners, text search | Discovery is the first thing analysts need; no new component required |
| [M-06](https://github.com/stardelt/stardelt-operator/issues/62) | Discovery ConfigMap per Lakehouse (typed connection contract) | Every consumer hard-codes endpoints today |
| [M-07](https://github.com/stardelt/stardelt-platform/issues/133) | Restart on referenced Secret/ConfigMap change | Credential rotation is manual and error-prone |
| [M-08](https://github.com/stardelt/stardelt-operator/issues/63) | `ServicePrincipal` resource for non-human identities | Jobs, maintenance and collectors need it |
| [M-09](https://github.com/stardelt/stardelt-platform/issues/134) | Trino file-system cache | Cheap speed-up for repeated scans |
| [M-10](https://github.com/stardelt/stardelt-platform/issues/135) | Materialized views with scheduled refresh | Dashboard performance |
| [M-11](https://github.com/stardelt/stardelt-nova/issues/105) | Table history, time travel and rollback in Nova | Iceberg provides it; undo is expected |
| [M-12](https://github.com/stardelt/stardelt-platform/issues/136) | Notebooks and pipelines in git | Standard engineering workflow |
| [M-13](https://github.com/stardelt/stardelt-operator/issues/64) | `stopped` and `paused` switches | Operability and cost on shared nodes |

### LATER — enterprise features

[L-01](https://github.com/stardelt/stardelt-platform/issues/137) file-drop ingestion · [L-02](https://github.com/stardelt/stardelt-platform/issues/138) usage, cost visibility, budgets and quotas · [L-03](https://github.com/stardelt/stardelt-platform/issues/139) external source catalogs · [L-04](https://github.com/stardelt/stardelt-platform/issues/140)
sharing with scoped credentials · [L-05](https://github.com/stardelt/stardelt-platform/issues/141) data products · [L-06](https://github.com/stardelt/stardelt-platform/issues/142) acceleration suggestions · [L-07](https://github.com/stardelt/stardelt-platform/issues/143) directory sync.

### LATER — ML and AI pillar

[A-01](https://github.com/stardelt/stardelt-platform/issues/144) experiment tracking and registry · [A-02](https://github.com/stardelt/stardelt-platform/issues/145) model serving · [A-03](https://github.com/stardelt/stardelt-platform/issues/146) feature store · [A-04](https://github.com/stardelt/stardelt-platform/issues/147) vector search · [A-05](https://github.com/stardelt/stardelt-platform/issues/148) AI
functions in SQL · [A-06](https://github.com/stardelt/stardelt-platform/issues/149) assistant, tool server, model gateway and guardrails · [A-07](https://github.com/stardelt/stardelt-platform/issues/150) GPU scheduling.

Epics: [now](https://github.com/stardelt/stardelt-docs/issues/75) · [later](https://github.com/stardelt/stardelt-docs/issues/76).

### Ticket index

| Id | Ticket |
|---|---|
| [M-01](https://github.com/stardelt/stardelt-platform/issues/129) | [stardelt-platform#129](https://github.com/stardelt/stardelt-platform/issues/129) |
| [M-02](https://github.com/stardelt/stardelt-platform/issues/131) | [stardelt-platform#131](https://github.com/stardelt/stardelt-platform/issues/131) |
| [M-03](https://github.com/stardelt/stardelt-platform/issues/132) | [stardelt-platform#132](https://github.com/stardelt/stardelt-platform/issues/132) |
| [M-04](https://github.com/stardelt/stardelt-nova/issues/103) | [stardelt-nova#103](https://github.com/stardelt/stardelt-nova/issues/103) |
| [M-05](https://github.com/stardelt/stardelt-nova/issues/104) | [stardelt-nova#104](https://github.com/stardelt/stardelt-nova/issues/104) |
| [M-06](https://github.com/stardelt/stardelt-operator/issues/62) | [stardelt-operator#62](https://github.com/stardelt/stardelt-operator/issues/62) |
| [M-07](https://github.com/stardelt/stardelt-platform/issues/133) | [stardelt-platform#133](https://github.com/stardelt/stardelt-platform/issues/133) |
| [M-08](https://github.com/stardelt/stardelt-operator/issues/63) | [stardelt-operator#63](https://github.com/stardelt/stardelt-operator/issues/63) |
| [M-09](https://github.com/stardelt/stardelt-platform/issues/134) | [stardelt-platform#134](https://github.com/stardelt/stardelt-platform/issues/134) |
| [M-10](https://github.com/stardelt/stardelt-platform/issues/135) | [stardelt-platform#135](https://github.com/stardelt/stardelt-platform/issues/135) |
| [M-11](https://github.com/stardelt/stardelt-nova/issues/105) | [stardelt-nova#105](https://github.com/stardelt/stardelt-nova/issues/105) |
| [M-12](https://github.com/stardelt/stardelt-platform/issues/136) | [stardelt-platform#136](https://github.com/stardelt/stardelt-platform/issues/136) |
| [L-01](https://github.com/stardelt/stardelt-platform/issues/137) | [stardelt-platform#137](https://github.com/stardelt/stardelt-platform/issues/137) |
| [L-02](https://github.com/stardelt/stardelt-platform/issues/138) | [stardelt-platform#138](https://github.com/stardelt/stardelt-platform/issues/138) |
| [L-03](https://github.com/stardelt/stardelt-platform/issues/139) | [stardelt-platform#139](https://github.com/stardelt/stardelt-platform/issues/139) |
| [L-04](https://github.com/stardelt/stardelt-platform/issues/140) | [stardelt-platform#140](https://github.com/stardelt/stardelt-platform/issues/140) |
| [L-05](https://github.com/stardelt/stardelt-platform/issues/141) | [stardelt-platform#141](https://github.com/stardelt/stardelt-platform/issues/141) |
| [L-06](https://github.com/stardelt/stardelt-platform/issues/142) | [stardelt-platform#142](https://github.com/stardelt/stardelt-platform/issues/142) |
| [L-07](https://github.com/stardelt/stardelt-platform/issues/143) | [stardelt-platform#143](https://github.com/stardelt/stardelt-platform/issues/143) |
| [A-01](https://github.com/stardelt/stardelt-platform/issues/144) | [stardelt-platform#144](https://github.com/stardelt/stardelt-platform/issues/144) |
| [A-02](https://github.com/stardelt/stardelt-platform/issues/145) | [stardelt-platform#145](https://github.com/stardelt/stardelt-platform/issues/145) |
| [A-03](https://github.com/stardelt/stardelt-platform/issues/146) | [stardelt-platform#146](https://github.com/stardelt/stardelt-platform/issues/146) |
| [A-04](https://github.com/stardelt/stardelt-platform/issues/147) | [stardelt-platform#147](https://github.com/stardelt/stardelt-platform/issues/147) |
| [A-05](https://github.com/stardelt/stardelt-platform/issues/148) | [stardelt-platform#148](https://github.com/stardelt/stardelt-platform/issues/148) |
| [A-06](https://github.com/stardelt/stardelt-platform/issues/149) | [stardelt-platform#149](https://github.com/stardelt/stardelt-platform/issues/149) |
| [A-07](https://github.com/stardelt/stardelt-platform/issues/150) | [stardelt-platform#150](https://github.com/stardelt/stardelt-platform/issues/150) |
| [M-13](https://github.com/stardelt/stardelt-operator/issues/64) | [stardelt-operator#64](https://github.com/stardelt/stardelt-operator/issues/64) |

## 7. Design principles that came out of the comparison

1. **Prefer a property of the table over a new service.** Descriptions, tags and owners live in Iceberg
   comments and properties ([M-05](https://github.com/stardelt/stardelt-nova/issues/104)); maintenance state lives in tables ([M-01](https://github.com/stardelt/stardelt-platform/issues/129), [M-03](https://github.com/stardelt/stardelt-platform/issues/132)). Every new component must
   earn its memory on a single node.
2. **Everything background runs through the scheduled-jobs engine** (maintenance, refresh, alerts,
   ingestion), under service principals, so there is one place for logs, retries, ownership and audit.
3. **Governed first.** New data paths go through the query engine so the permission model applies; direct
   storage access stays in the "trusted" class until credentials can be scoped (STS spike).
4. **Operator conventions beat custom glue**: discovery ConfigMaps, restart on change, stop/pause switches.
5. **Sovereignty:** AI features default to local model endpoints; external endpoints are an explicit opt-in.

## 8. Sources (public documentation, read 2026-10-19)

- Databricks: docs.databricks.com — SQL warehouses (compute/sql-warehouse), Unity Catalog governance and ABAC
  (data-governance), Jobs (jobs/triggers, repair, parameters, privileges, bundles), declarative pipelines (ldp),
  predictive optimization (optimizations), data classification, system tables, Open Sharing, Model Serving, Vector
  Search, AI Functions, MLflow, GPU compute, budgets and compute policies.
- Dremio: docs.dremio.com — engines and workload management, Open Catalog, privileges and row/column policies,
  wikis and labels, reflections and autonomous reflections, automatic optimization, results cache, autoingest,
  AI agent, AI functions, MCP server, model providers, projects and limits.
- Starburst: docs.starburst.io — built-in access control, data products, Warp Speed, query result caching,
  materialized views, workload management, Control Plane, Insights, AI, Galaxy lake services.
- Stackable: docs.stackable.tech — service discovery, catalogs, authentication classes, OPA and user-info-fetcher,
  secret and listener operators, restarter, overrides, stackablectl and demos.
- OKDP: okdp.io and github.com/OKDP — platform packages, control plane, connections and external secrets,
  project administration, installation requirements, roadmap.
- Upstream open-source references for the designs: Trino documentation (Iceberg connector procedures and
  metadata tables, file-system cache, `query-manager.required-workers`), Trino Gateway, Iceberg REST specification
  (`set-properties`), Lakekeeper authorization and OPA bridge.
