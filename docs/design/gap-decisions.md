---
title: "Gap decision record & feature register"
sidebar_label: "Gap decisions"
slug: /design/gap-decisions
---

# Gap decision record & feature register

**Companion to the [Nova feature-parity matrix](./nova-feature-parity) and the
[master spec](./master-spec).** The parity matrix says *what* competitors' consoles do and
how Nova maps onto stardelt's stack. This document decides the cases where **stardelt ships
no default yet**, and registers the concrete capability delta — what the platform does not
have today.

:::info Status
**Proposed.** These are maintainer proposals, not ratified spec. Per
[master-spec.md §9](./master-spec) and its governance rule, changes to the spec's decision
record require a pull request and a discussion period. Decision IDs continue the master
spec's `D1–D7` sequence.
:::

Method note: decisions are made against the master spec's **build / integrate / never-build**
boundary (§3) and the **license policy** ([licenses.md](../architecture/licenses)). A gap is
resolved by *integrating* an existing permissive project whenever possible; building stardelt
code is a last resort, and the list of things stardelt deliberately never builds is unchanged.

---

## Part A — Decision record (D8–D16)

### D8 — Per-tenant compute isolation
- **Status:** Proposed · target **P3**
- **Gap:** Competitors sell first-class compute isolation — Databricks SQL warehouses / clusters, Dremio engines & projects, Starburst clusters. stardelt v1 ships **one shared Trino** for everyone.
- **Decision:** Adopt **Trino resource groups** as the isolation mechanism, declared on the `Tenant` / `Lakehouse` CRDs and surfaced in Nova. Do **not** run one Trino cluster per tenant in v1.
- **Rationale:** resource groups deliver queueing, concurrency caps, and CPU/memory limits without the cost and operational weight of N engines. Stays inside "integrate, don't build."
- **Alternates:** multiple `Lakehouse`-scoped Trino clusters for hard isolation (P4+). The `Lakehouse` contract already permits this without an architecture change.
- **Contract touched:** `Tenant` (resource-group policy), `Lakehouse` (engine).
- **Non-goal:** a proprietary engine; per-query GPU scheduling.

### D9 — `Volume` (non-tabular objects in the catalog)
- **Status:** Proposed · target **P3**
- **Gap:** Databricks catalogs first-class **volumes** for files (notebooks, models, raw files). Iceberg has no such object; Nova's catalog can only show tables/views/schemas.
- **Decision:** Ship a minimal **`Volume`** concept — a namespaced object-store prefix (SeaweedFS or BYO S3) plus grants/policy — surfaced in the Nova catalog. Keep Iceberg as the *table* contract; volumes are a separate, explicitly non-Iceberg object.
- **Rationale:** file-based workflows (ML artifacts, uploads, notebook assets) are a real need, but folding volumes into the Iceberg model would corrupt the spine. A thin CRD + OPA policy is enough.
- **Alternates:** defer to P4; or expose volumes only as "S3 prefixes" with no catalog entry.
- **Contract touched:** new `Volume` CRD.
- **Non-goal:** making volumes a table format or an Iceberg extension.

### D10 — Automatic data classification (PII / sensitive discovery)
- **Status:** Proposed · target **P4**
- **Gap:** Databricks and Starburst **auto-classify** columns (PII, financial, credentials) to drive attribute-based access control. stardelt has tags but no scanner.
- **Decision:** **Integrate, don't build.** Use OpenMetadata classification capability plus a scheduled stardelt scan job whose results land as OpenMetadata tags, consumed by OPA for ABAC.
- **Rationale:** classification is a solved metadata problem; building a classifier is out of scope and would duplicate the metadata spine's job.
- **Alternates:** a Trino-based sampling scanner emitting tags directly if OpenMetadata coverage is insufficient.
- **Contract touched:** metadata spine (OpenMetadata tags) → OPA policy.

### D11 — Data-quality monitoring & anomaly detection
- **Status:** Proposed · target **P3**
- **Gap:** Competitors ship continuous **data-quality monitors** with anomaly detection and alerting. stardelt has declarative tests planned (`DataContract`) but no monitoring service.
- **Decision:** Ship a **`DataContract`-driven monitor runner** using Soda Core + dbt tests, executed via Airflow, with results written to the metadata spine and surfaced in Nova. Treat statistical anomaly detection as a **later plug**, not a v1 build.
- **Rationale:** quality is table stakes for the "trust" milestone (P1 corporate feature); but a from-scratch ML anomaly detector is not.
- **Alternates:** Great Expectations instead of Soda; anomaly detection deferred indefinitely.
- **Contract touched:** `DataContract`, `Pipeline` (quality-gate step).
- **Non-goal:** a proprietary ML monitoring engine.

### D12 — Access-request workflow
- **Status:** Proposed · target **P4**
- **Gap:** Databricks supports **access requests** (email/Slack/Teams/webhook). stardelt grants are applied directly.
- **Decision:** Implement the workflow as a **GitOps approval** — Nova's request form produces a pull request against the CRDs; merging applies the grant via OpenFGA/Keycloak. Optional notification connectors later.
- **Rationale:** uniquely on-brand: CRDs are the source of truth and the platform is GitOps-able, so approvals *are* code review. Avoids building a bespoke approval engine.
- **Alternates:** a Nova-native approval store + notification integrations, if operators want approvals outside Git.
- **Contract touched:** Nova (request form), Argo CD, OpenFGA.

### D13 — stardelt MCP server
- **Status:** Proposed · target **P3**
- **Gap:** Both Databricks and Starburst now expose **MCP** so external agents can query the governed platform. stardelt has none.
- **Decision:** **Ship** a thin MCP server over Nova's REST API, exposing catalog browse and governed query, authenticated by the caller's OIDC token and enforcing OPA policy exactly as the UI does.
- **Rationale:** cheap, high-signal, and directly reinforces the sovereign-AI differentiator — agents get the *same* governed surface as humans, on-prem, with no data egress.
- **Alternates:** none needed; MCP is an adapter over an existing contract.
- **Contract touched:** Nova REST API (the contract); MCP is a client of it.

### D14 — Iceberg table maintenance UI
- **Status:** Proposed · target **P3**
- **Gap:** Competitors surface **maintenance** — compaction, garbage collection, snapshot/file cleanup. stardelt has no UI and no schedule for it.
- **Decision:** **Ship** by surfacing standard **Iceberg maintenance procedures** (`rewrite_data_files`, `rewrite_manifests`, `expire_snapshots`, `remove_orphan_files`) as scheduled jobs through Trino/Spark, driven from Nova.
- **Rationale:** zero new services — these are Iceberg procedures run by engines stardelt already ships. Without it, table health degrades silently.
- **Alternates:** operator-managed cron outside Nova.
- **Contract touched:** `Lakehouse` (maintenance policy), `Pipeline` (job).

### D15 — Queryable system tables
- **Status:** Proposed · target **P5**
- **Gap:** Databricks exposes `system.*` tables (query history, billing, access) that are themselves queryable via SQL. stardelt's audit is searchable in Nova but not SQL-queryable.
- **Decision:** **Ship** by persisting audit/usage/query-history events into **Iceberg** tables (from the existing Kafka `stardelt.audit.v1` topic) and exposing them through Trino, so operators can join platform events to their own data.
- **Rationale:** already on the P5 roadmap and consistent with the sovereignty commitment to keep audit in the customer's Iceberg. No new store.
- **Alternates:** none; this is the planned path.
- **Contract touched:** audit event schema; Iceberg tables.

### D16 — Nova personal settings & theming
- **Status:** Proposed · target **P2**
- **Gap:** Competitors offer light/dark themes, org branding, per-user editor preferences. Nova shipped **dark-only** with fixed branding; a light/dark toggle now exists (dark remains the default).
- **Decision:** Keep a **single opinionated dark theme** as the default and add *per-user* preferences (theme toggle, editor prefs) at P2; add *org branding* only if an operator asks, and keep it config-on-CRD rather than a build-your-own-UI toolkit.
- **Rationale:** a curated look is part of the product, not a gap to close; over-configurable UI undermines the "opinionated defaults" principle.
- **Alternates:** ignore permanently.
- **Non-goal:** a full white-label/theming engine in v1.

---

## Part B — Feature register: what the platform does not ship yet

Scope: capabilities that competitors' consoles expose and that stardelt has **no shipping
default** for today. Items already covered by the plug matrix (catalog, SQL, BI via Superset,
lineage, pipelines, streaming, ML) are tracked in the [parity matrix](./nova-feature-parity)
and are **not** repeated here unless the delta is a genuine build.

**Today** = what exists right now (pre-alpha). **Decision** = the D-number from Part A, or
`plug` when the plug matrix already covers it. `—` = nothing shipped, need named.

| # | Capability | Competitors | Today | Decision | Target |
|---|---|---|---|---|---|
| 1 | Per-user/team compute isolation | B D S | one shared Trino | **D8** | P3 |
| 2 | Non-tabular objects (volumes) | B | none | **D9** | P3 |
| 3 | Auto data classification (PII) | B S | tags only, no scan | **D10** | P4 |
| 4 | Data-quality monitoring + anomaly detection | B S | none | **D11** | P3 |
| 5 | Access-request workflow | B | direct grants | **D12** | P4 |
| 6 | MCP server for agents | B S | none | **D13** | P3 |
| 7 | Iceberg maintenance UI (compaction/GC) | B S | none | **D14** | P3 |
| 8 | Queryable system tables | B | none (Nova audit search is planned) | **D15** | P5 |
| 9 | Personal settings / theming | B S | toggle shipped; branding fixed | **D16** | P2 |
| 10 | Saved-queries store & sharing | B D S | none | build in Nova | P2 |
| 11 | Alerts on query conditions | B D | none | build + Airflow | P2 |
| 12 | Per-object "wiki"/docs editing | D S | OpenMetadata (planned) | plug | P1→P2 |
| 13 | Semantic search over catalog | B D | basic browse | plug + Nova | P2 |
| 14 | Query plan visualization | D S | Trino `EXPLAIN` only | build in Nova | P2 |
| 15 | Query profiling page | D S | none | build in Nova | P2 |
| 16 | Notebook → scheduled-job promotion | B S | none | `Pipeline` + JupyterHub | P2 |
| 17 | Diagnostics / support bundle | D S | none | build in Nova | P3 |
| 18 | Workload management (queues) | D S | none | **D8** (resource groups) | P3 |
| 19 | Schema discovery / auto-register new tables | S | none | plug (Lakekeeper) | P2 |
| 20 | Table-format migration (→ Iceberg) | S | none | plug (Spark) | P4 |
| 21 | Cross-cluster federation | D | Trino connectors (single) | plug (Trino) | P4+ |
| 22 | Data sharing to external consumers | B D | Iceberg tables readable | plug (Iceberg REST) | P2 |
| 23 | FinOps / cost dashboards | B D S | none (no cost view in Nova; OpenCost not installed) | plug (OpenCost) | P3 |
| 24 | Multi-tenant network isolation | B D S | primitives only | `Tenant` + NetPol | P2 |
| 25 | Service-account / service-principal management | B S | Keycloak clients (manual) | plug (Keycloak) | P2 |
| 26 | HA / RTO-RPO guarantees | B S | none | roadmap P5 | P5 |
| 27 | Air-gap install profile | — (differentiator) | designed, unshipped | roadmap P5 | P5 |
| 28 | Compliance starter kits (SOC2/ISO/C5) | — | none | roadmap P5 | P5 |

> Items 10–24 are **glue and UI** over components stardelt already ships — they are work, not
> new architecture. Items 1–9 are the true decisions (Part A). Items 25–28 are roadmap
> hardening already committed in [roadmap.md](../roadmap).

---

## Part C — Sequencing summary

```text
P1 (now)   catalog browser · SQL · lineage(emit) · audit search · cost view · SSO
           + decisions surfaced: D16 theming (P2 start)
P2         pipelines · quality gates · workspaces · saved queries/alerts
           D16 settings · items 10–16, 19, 24, 25
P3         scale: compute isolation (D8) · volumes (D9) · MCP (D13)
           maintenance (D14) · quality monitors (D11) · ML/streaming pillars · items 17–18
P4         classification (D10) · access requests (D12) · ML serving · streaming ·
           items 20–21
P5         hardening: system tables (D15) · HA · air-gap · compliance kits · items 26–28
```

**Guard on sequencing (from master spec §8):** none of the P3+ decisions may pull effort
from proving the **P0/P1 deep integration** (identity + catalog + one policy model). The
strategic bet is one governed integration over two domains *before* any breadth.

---

## Open items needing maintainer input

1. **D8** — is per-tenant isolation a P3 must, or can it wait behind community pull?
2. **D9** — do volumes ship as a catalog object, or stay "S3 prefixes" with no CRD?
3. **D11** — Soda vs Great Expectations as the quality default (license + maturity check).
4. **D12** — GitOps approval vs a Nova-native approval store (operator preference).
5. **D13** — MCP server scope: catalog-search only, or full governed query?
6. Ownership: who owns the metadata spine default, OpenMetadata vs DataHub (master spec §11 D4)?

Anything ratified here should be folded back into [master-spec.md §11](./master-spec) as
`D8…D16` and reflected in the [execution plan](./execution-plan).
