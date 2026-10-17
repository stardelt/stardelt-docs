---
title: "Nova feature-parity matrix"
sidebar_label: "Nova feature parity"
slug: /design/nova-feature-parity
---

# Nova feature-parity matrix

**Goal.** Give Nova functional coverage of the capabilities operators actually use in the
proprietary lakehouse consoles (Databricks, Dremio, Starburst) — without copying any
proprietary code, assets, or UI expression.

**Method (clean-room).** This inventory is assembled **solely from each vendor's public
product documentation** and public product material. No binaries were inspected, no app
bundles were fetched, nothing was decompiled, and no REA analysis was run against any
proprietary target. Only *features* (ideas) are catalogued here — not implementation. Any
future implementation is written from this document plus stardelt's own design, never from a
competitor artifact. This keeps Nova's provenance clean and consistent with
[licenses.md](../architecture/licenses) and [sovereignty.md](../architecture/sovereignty).

**Vendor shorthand.** `B` = Databricks Data Intelligence Platform · `D` = Dremio · `S` = Starburst (Galaxy / Enterprise).

**Phase** refers to the [roadmap](../roadmap). **Status**: ✅ shipped/partial · ◐ planned · ○ no OSS default yet (open decision) · ⛔ deliberate non-goal.

---

## 1. Experience shell

| Capability | Seen in | Nova | Backing OSS | Phase | Status |
|---|---|---|---|---|---|
| Unified workspace with persistent left nav, contextual in-app browser | B D S | Nova single shell | Nova (React) | P1 | ◐ |
| Global search across catalog objects, queries, dashboards, jobs | B S | Catalog + metadata search | Lakekeeper + OpenMetadata | P1→P2 | ◐ |
| Recently viewed / favorites / bookmarks | B D S | Nova | Postgres (CNPG) | P2 | ◐ |
| Object management via UI, CLI, and REST API | B S | `stardelt` CLI + Nova REST + operator CRDs | stardelt Operator | P1→P2 | ◐ |
| Deep-links into native UIs of every service | — (stardelt-specific) | Already core to Nova | per-service URLs | P1 | ✅ |
| Personal settings: theme, language, editor prefs | B S | Nova settings | Nova | P2 | ❌ Nova is dark-mode only today |
| Domain- / business-group browsing | B S | Nova grouping by `stardelt.io/tenant` + domain tag | OpenMetadata | P3 | ◐ |

## 2. Catalog & data discovery

| Capability | Seen in | Nova | Backing OSS | Phase | Status |
|---|---|---|---|---|---|
| Three-level namespace browser (`catalog.schema.object`) | B D S | Catalog browser in Nova MVP | Lakekeeper (Iceberg REST) + Trino | P1 | ✅ partial |
| Object detail: columns, properties, sample data, permissions | B D S | Nova object page | Lakekeeper + Trino | P1 | ✅ partial |
| Functions / views browsing | B S | Nova catalog | Trino | P2 | ◐ |
| Volumes / non-tabular objects | B ○ | — | Iceberg has no volumes | — | ○ (model gap) |
| Models registered as catalog objects | B S | Model registry object | MLflow + UC-analog | P3 | ◐ |
| Editable descriptions / comments | B D S | Wiki panel | OpenMetadata | P1→P2 | ◐ |
| Tags / labels on objects; tag-based search | B D S | Tags + faceted search | OpenMetadata | P1→P2 | ◐ |
| Metadata cards (owner, path, format, lineage count) | D S | Nova metadata panel | OpenMetadata + Lakekeeper | P2 | ◐ |
| Semantic / natural-language search across the catalog | B D | Nova search + copilot | OpenMetadata + Nova copilot | P2 | ◐ |
| Registering/linking external catalogs (Glue, Unity, Polaris, Snowflake OC, OneLake, Nessie) | B D S | `catalog` plug (Iceberg REST) | Lakekeeper + Iceberg REST spec | P1+ | ◐ |
| Governed read-only federation of external sources | B D S | Trino connectors | Trino | P1 | ✅ partial |

## 3. SQL workspace

| Capability | Seen in | Nova | Backing OSS | Phase | Status |
|---|---|---|---|---|---|
| Multi-tab SQL editor with per-tab session state | B D S | Nova query workspace | Nova + Trino | P1 | ◐ |
| SQL autocomplete driven by catalog schema | B D S | Nova editor | Lakekeeper + Trino metadata | P1 | ◐ |
| Prettify / format, command palette, keyboard help | D S | Nova editor | Nova | P2 | ◐ |
| Catalog explorer pane beside the editor | B D S | Nova | Lakekeeper | P1 | ✅ partial |
| Results grid: filter, sort, download (CSV/JSON/Parquet), copy | B D S | Nova results grid | Nova + Trino | P1 | ◐ (Parquet export = nice differentiator) |
| Run modes: full run vs sampled **Preview**, row/byte limits | D S | Nova run options | Trino | P2 | ◐ |
| `EXPLAIN` + **visual query plan** highlighting hot nodes | D S (B) | Nova plan view | Trino `EXPLAIN` + query stats | P1→P2 | ◐ |
| Query profiling: stages, skew, memory, threads | D S | Query detail page | Trino query stats REST | P2 | ◐ |
| Query history + saved queries; share with a role (view/run vs edit) | B D S | Nova + saved queries | Postgres (CNPG) + Nova | P1→P2 | ◐ |
| Scheduled/parameterized queries; widgets | B S | Nova schedules (via `Pipeline`) | Airflow | P2 | ◐ |
| Alerts on query conditions (OK/TRIGGERED/ERROR) | B D | Nova alerts | Airflow + Nova | P2 | ○ |
| Per-user / per-team compute (warehouses, engines, clusters) | B D S | shared Trino today | Trino resource groups | P3 | ○ (resource isolation gap) |
| Workload management / queue routing | D S | Nova + Trino | Trino resource groups | P3 | ○ |

## 4. Governance & access control — **the moat**

| Capability | Seen in | Nova | Backing OSS | Phase | Status |
|---|---|---|---|---|---|
| RBAC: roles, users, groups, ownership/`GRANT` | B D S | Nova admin (identity) | Keycloak + OpenFGA + Lakekeeper | P1 | ◐ |
| **Row filters + column masks enforced at the catalog** | B D S | Nova policy editor | **OPA at Lakekeeper** | P1→P2 | ◐ **differentiator** |
| Tag-governed / attribute-based access control (ABAC) | B S | Nova policy | OPA + OpenMetadata tags | P2 | ◐ **differentiator** |
| Managed-access spaces (owner cannot self-grant) | D | Nova scoping | OpenFGA | P3 | ○ |
| One OIDC token flows UI → engine → catalog | B D S | Nova SSO | Keycloak + token passthrough | P1 | ◐ **differentiator** |
| Audit log of access + changes; searchable, exportable | B D S | Nova audit search (MVP) | Kafka `stardelt.audit.v1` → Iceberg | P1→P5 | ✅ partial |
| Auto data classification (scan for PII/financial) | B S | Nova classification (optional) | OpenMetadata classifiers | P4 | ○ no default |
| Access-request workflow (email/Slack/webhook) | B | Nova requests (optional) | Nova + notifications | P4 | ○ |
| Service principals / service accounts | B S | Nova + Keycloak clients | Keycloak | P2 | ◐ |
| SCIM / IdP sync of users & groups | B S | federated | Keycloak | P1 | ◐ |

## 5. Lineage & metadata spine

| Capability | Seen in | Nova | Backing OSS | Phase | Status |
|---|---|---|---|---|---|
| Automatic **column-level lineage** capture | B S | Nova lineage view | OpenLineage → OpenMetadata | P1 emit → P1 full | ◐ **differentiator** |
| Interactive lineage graph: expand, focus, time-filter | B D S | Nova lineage canvas | OpenMetadata API | P1→P2 | ◐ |
| Impact analysis / root-cause via descendants | B D S | Nova lineage | OpenMetadata | P2 | ◐ |
| External / ingested lineage from non-stardelt tools | B | Nova lineage ingest | OpenLineage contract | P2 | ◐ |
| Glossary / business terms / semantic layer | B S | Nova glossary | OpenMetadata | P2 | ◐ |
| Object-level lineage only (no column) | D | Nova lineage | OpenMetadata | P1 | ✅ exceeds |

## 6. Pipelines & orchestration

| Capability | Seen in | Nova | Backing OSS | Phase | Status |
|---|---|---|---|---|---|
| Multi-task DAGs, schedules, triggers, retries | B | `Pipeline` CRD + Nova pipelines view | Airflow (+ Argo Workflows) | P2 | ◐ |
| Visual DAG / run history / repair | B S | Nova pipeline view | Airflow API + Nova | P2 | ◐ |
| Transform tasks (dbt / SQL) with **quality gates** | B D | `Pipeline` + `DataContract` | dbt-core + Soda/dbt tests | P2 | ◐ |
| Declarative data-quality expectations (drop/fail/warn) | B | `DataContract` + Nova quality tab | Soda + dbt tests | P2 | ◐ |
| Ingestion: SaaS connectors / enterprise / CDC | B D S | `IngestionSource` (3 domains) | Apache SeaTunnel / NiFi / Debezium | P2 | ◐ |
| Data-quality monitoring + anomaly detection + alerts | B S | Nova quality monitors | custom + Airflow + Nova | P3 | ○ |
| Icehouse maintenance (compaction, GC, snapshot cleanup) | B S | Nova maintenance | Iceberg procedures (Trino/Spark) | P3 | ○ |
| Table-format migration (e.g. Hudi/Delta → Iceberg) | S | Nova maintenance | Spark + Iceberg | P4 | ○ |

## 7. BI & dashboards

| Capability | Seen in | Nova | Backing OSS | Phase | Status |
|---|---|---|---|---|---|
| Dashboard authoring over the governed catalog | B D S | embed + deep-link (P1), embed write (P2) | Apache Superset | P1→P2 | ◐ |
| Rich viz library (maps, gauges, box, combo…) | B D | via Superset | Superset + ECharts | P1 | ✅ via Superset |
| Filters, parameters, cross-filtering, drill-through | B D | via Superset | Superset | P2 | ✅ via Superset |
| Shared/dashboards without workspace access; embedding | B | Nova embed tokens | Superset embedding | P2 | ◐ |
| Scheduled delivery (email/Slack/PDF) | B S | Superset + Nova | Superset + Airflow | P2 | ◐ |
| NL "ask the dashboard" companion | B D S | Nova copilot on dashboard | Nova copilot + `ModelEndpoint` | P3 | ◐ **differentiator** |

## 8. Notebooks & workspaces

| Capability | Seen in | Nova | Backing OSS | Phase | Status |
|---|---|---|---|---|---|
| Multi-user notebooks / workspaces | B D | `Workspace` CRD + Nova | JupyterHub | P2 | ◐ |
| Heavy compute via persistent endpoint | B D | `Workspace`/`Pipeline` | Apache Spark (Spark Connect) | P3 | ◐ |
| Version control of assets (Git) | B | Operator GitOps + Nova | Argo CD + operator CRDs | P2 | ◐ |

## 9. Streaming

| Capability | Seen in | Nova | Backing OSS | Phase | Status |
|---|---|---|---|---|---|
| Topic browse, stream apps, materialized views | B S | `StreamApp` + Nova streams view | Kafka (Strimzi) + Flink | P3 | ◐ |
| CDC ingestion into Iceberg | B S | `IngestionSource` (cdc) | Debezium + Flink | P3 | ◐ |

## 10. ML & AI

| Capability | Seen in | Nova | Backing OSS | Phase | Status |
|---|---|---|---|---|---|
| Experiment tracking, model registry, lifecycle/aliases | B D | `ModelRegistry` + Nova | MLflow | P3 | ◐ |
| Model serving endpoints (scale-to-zero) | B S | `ModelService` + Nova | KServe (+ vLLM) | P3 | ◐ |
| Feature store / point-in-time joins | B | `FeatureSet` (plug) | Feast | P4 | ○ |
| Vector store for RAG | B | Nova vector browser | Qdrant | P4 | ○ |
| **Sovereign AI copilot** (NL→SQL, pipeline authoring) against governed catalog | B D S | Nova copilot + `ModelEndpoint` | **vLLM / Ollama on-prem** | P2→P3 | ◐ **differentiator** |
| External LLM endpoint (opt-in, operator-configured) | B S | Nova setting | `ModelEndpoint` (external) | P2 | ◐ |
| MCP server so agents can query the platform | B S | **stardelt MCP server** (proposed) | Nova API surface | P3 | ○ new idea |
| AI guardrails / personas / prompt controls | S | Nova copilot config | Nova + vLLM policy | P3 | ○ |

## 11. Observability, cost & platform health

| Capability | Seen in | Nova | Backing OSS | Phase | Status |
|---|---|---|---|---|---|
| Platform health / service status | B S | Nova health (MVP) | VictoriaMetrics + K8s API | P1 | ✅ partial |
| Usage & cost attribution per tenant/query | B D S | Nova cost view (MVP simple) | **OpenCost** + VictoriaMetrics | P1 | ◐ |
| Queryable `system.*` tables (query history, billing, access) | B | via Trino over Iceberg | **audit/usage → Iceberg** | P5 | ○ |
| Metrics / logs / traces dashboards | D S | deep-link or embed | VictoriaMetrics/VictoriaLogs/Perses/Jaeger | P1→P2 | ◐ |
| FinOps dashboards (spend, savings from acceleration) | B D S | Nova cost | OpenCost | P3 | ◐ |
| Diagnostics bundle / "download logs" | D S | Nova support bundle | Nova + operator | P3 | ○ |

## 12. Admin & platform control

| Capability | Seen in | Nova | Backing OSS | Phase | Status |
|---|---|---|---|---|---|
| Declarative platform config (what's installed) | — | `PlatformInstance` CRD + Nova | stardelt Operator | P1 | ◐ |
| Compute policy / guardrails (limits, quotas) | B S | Nova policy + Trino K8s limits | operator + K8s | P3 | ○ |
| Multi-tenant isolation (namespaces, network policy) | B D S | `Tenant` CRD + Nova | K8s NetPol + OpenFGA realms | P1 primitives | ◐ |
| Secrets / PKI management | B S | Nova admin | OpenBao (P5) / K8s Secrets (P1) | P1→P5 | ◐ |
| SSO / IdP federation config | B S | Nova/Keycloak admin | Keycloak | P1 | ◐ |

## 13. Sharing, federation & marketplace

| Capability | Seen in | Nova | Backing OSS | Phase | Status |
|---|---|---|---|---|---|
| Open sharing protocol (Delta Sharing / Iceberg) | B D | Iceberg REST share | Lakekeeper + Iceberg spec | P2 | ◐ |
| Cross-engine / cross-platform table sharing | B D S | Iceberg as the contract | Iceberg + REST catalog | P1 | ✅ via Iceberg |
| Governed federation to external DBs/catalogs | B D S | Trino + `catalog` plug | Trino connectors | P1 | ✅ partial |
| Data marketplace / private exchanges | B | — | — | — | ⛔ non-goal |

---

## Where stardelt should win (lean into these)

1. **Identity + policy enforced at the catalog.** The OIDC token that logs you into Nova is the
   token your notebook runs under, your Trino query carries, and Lakekeeper/OPA enforces.
   Row/column rules apply identically to dashboards, pipelines, and notebooks. *(Databricks:
   Unity Catalog. Dremio/Starburst: partial. The open world: nobody ships this by default.)*
2. **Sovereign AI.** The Nova copilot runs against an air-gapped `ModelEndpoint`; no data
   leaves the perimeter unless the operator configures it. Competitors' assistants are
   cloud-only.
3. **Captured, not declared, governance.** Because everything flows through one catalog and one
   lineage contract, schema/lineage/quality are byproducts of running — not forms.
4. **Reversibility.** Iceberg + open formats mean uninstalling stardelt leaves readable data
   (see [sovereignty.md](../architecture/sovereignty)).

## Gaps with no OSS default (open decisions)

> The decisions for these gaps live in the **[gap decision record & feature register](./gap-decisions)**
> (decision IDs `D8–D16`), along with the full register of what the platform does not ship yet.

| Gap | Why it matters | Candidate direction |
|---|---|---|
| Per-user/per-team **compute isolation** (warehouses/engines) | Competitors sell this; stardelt v1 is one shared Trino | Trino resource groups / multiple Trino clusters via `Lakehouse` |
| **Volumes / non-tabular objects** in the catalog | Iceberg's model has no "volume" | Represent as a `Volume` CRD over S3 prefixes, or defer |
| **Auto data classification** (PII discovery) | Needed for ABAC story | OpenMetadata classifiers / custom scan job |
| **Data-quality monitoring + anomaly detection** service | Competitors ship monitors | Extend `DataContract` + a monitor runner (Soda/GE) |
| **Access-request workflow** | Enterprise nicety | Nova feature + notification integration |
| **Stardelt MCP server** | Both B and S now expose MCP to agents | Thin MCP over Nova's API (catalog + query) |
| **Table maintenance / compaction UI** | Iceberg hygiene at scale | Surface Iceberg procedures through Nova |
| **Queryable system tables** (billing/access/query history) | Power-user + compliance need | Audit/usage events → Iceberg (P5) |

## Deliberate non-goals (per [master-spec.md](master-spec.md) §9)

⛔ No proprietary query engine · ⛔ no connector marketplace · ⛔ no SaaS-only surfaces ·
⛔ no data-mesh multi-cluster federation in v1 · ⛔ no "beat them on TPC-DS" speed claims.

## Provenance

Feature inventories were derived from public documentation only:

- **Databricks:** docs.databricks.com — workspace/navigation, SQL editor, alerts, Unity Catalog
  (access control, filters & masks, lineage, tags, catalog explorer), Jobs/`ldp`, expectations,
  Lakeflow Connect, AI/BI concepts, Genie One, ML lifecycle/model serving/feature store,
  system tables, admin, marketplace, query federation, Genie Code.
- **Dremio:** docs.dremio.com — quick tour, key concepts, data sources, data products
  (develop/discover/metadata/AI agent/govern/lineage/wikis-tags/row-column policies),
  acceleration & reflections, jobs/monitoring, RBAC privileges & roles, project/engine concepts,
  subscription usage.
- **Starburst:** docs.starburst.io — SEP UI & query editor; Galaxy nav/UI, clusters, Warp Speed,
  data products & domains, policies, query insights, data lineage, catalog explorer, AIDA,
  Context Studio, release notes.

Re-verify against current docs at implementation time; "preview" labels shift.
