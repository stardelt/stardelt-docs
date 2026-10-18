---
title: "Execution plan"
sidebar_label: "Execution plan"
slug: /design/execution-plan
---

# stardelt Execution Plan

**The how: the [master spec](master-spec.md) defines the product; this document chunks it into handover-ready work packages (WPs).** Each WP is self-contained — its section can be pasted into a GitHub issue or an agent prompt as-is, with no further context required beyond the master spec and the repo's `AGENTS.md`.

This is a living queue, not a contract: WPs get added, split, and reordered. The master spec is the contract.

## 1. State of the code (start here, handover agents)

Verified against the sibling repos' `main` branches on 2026-10-18. "Real" means it runs today; "missing" means the next agent's work.

| Repo | What's real | What's missing / wrong |
|---|---|---|
| `stardelt-platform` | Chart versions pinned in the root Makefile (the source of truth; `chart/Chart.yaml` and CI carry mirrored copies), with Renovate reading those pins; `make lint` + CI (yamllint, ShellCheck, `helm template`); three install paths — `install` (full), `install-core` (`SLIM=1`, the cheap-node core stack) and `install-notebooks` (JupyterHub); an umbrella Helm chart (`chart/`, `make chart-install`) with the same components, versions and values; `make install-operator` (dev path, from the sibling `stardelt-operator` checkout); `dev/hetzner-k3s` creates a real single-node k3s cluster; `dev/playground` adds ingress-nginx (host-network) + cert-manager + ingresses for nova, trino, superset, airflow and jupyterhub; `dev/cloudflare-dns.sh`; `ghcr.io/stardelt/*` images, pulled with a `ghcr-creds` secret | The Makefile path is bash-orchestrated, and the operator is not part of `install` / `install-core`; in the umbrella chart Superset and Airflow cannot both be enabled in one release; Airflow and Superset exist only in the `full` profile (they do not fit the 8 GB dev node); CI lints and templates but never installs, so nothing proves the stack end to end (WP-02); `helm-values/airflow.yaml` still carries kind-only pinned secrets (WP-16) |
| `stardelt-nova` | axum backend — `/api/me`, `/api/health`, `/api/trino/cluster`, `/api/catalog/*`, `/api/query`, `/api/jobs`, `/api/apps` (+ `/api/apps/:id`), `/api/workloads`, `/api/ingest/upload`, `/api/transfer`; React SPA with Overview, Catalog (preview, columns, details), SQL editor, Load & transfer (CSV/JSON upload, table copy), Jobs, Lineage, Dashboards, Platform apps (live status probe, per-app detail pages, deep links), Platform health and a light/dark theme; `NOVA_DEMO=1` runs the whole UI with no cluster; deployed on the dev cluster behind TLS | `auth_mode: static-dev` — no OIDC login yet (WP-18, WP-12); Dashboards is an iframe to Superset (the deployed app URL from `/api/apps`, else a configurable port-forward), not a gateway route (WP-11); Lineage is a static illustration of the demo schema — nothing is captured yet (WP-34); there is no audit search; Trino and Lakekeeper are the only real data backends |
| `stardelt-operator` | CRDs `PlatformInstance`, `Tenant`, `Lakehouse`, `IngestionSource`, `Pipeline`, with generated `chart/crds/`; a pure, unit-tested reconcile planner with the golden chart pins; a Helm adapter (`helm.rs`) and a controller that reconciles `Tenant` → Namespace, `PlatformInstance` → the CloudNative-PG operator and `Lakehouse` → SeaweedFS + Lakekeeper + Trino (plan-only unless `dryRun: false`, with an `adopt` guard and per-Lakehouse value overrides); the operator chart and a CI-built image; 43 unit tests; `cargo` CI (fmt, clippy, check, test, and a check that its chart pins match the platform's) | **No controller for `IngestionSource` or `Pipeline`** (WP-30/31/32); a non-dry-run `Lakehouse` install end to end, the warehouse bootstrap and the CNPG `Cluster` are still open (WP-21); the operator is not part of `make install` (`make install-operator` is a dev path) |
| `stardelt-demos` | `kind/up.sh` is a thin wrapper over the platform Makefile (`APP_PROFILE=core` by default, `full` adds Airflow + Superset, `SLIM` forwarded); `smoke.sh`, the NYC-taxi DAG, kind-loaded images; `kind/gate.sh` + `.github/workflows/verify.yml` install the core profile and smoke it on every PR and push to `main` (WP-02) | The gate's scope stops at the data path: Nova, Airflow, Superset, the taxi DAG, a nightly schedule and the operator contract tier are still open; the Airflow and Superset targets only make sense with `APP_PROFILE=full` |
| `stardelt-docs` | Live site, master spec, execution plan, roadmap, license policy, architecture pages | Status text rots faster than the code: this table, the [roadmap](../roadmap) and the `Status` lines below are dated snapshots — when they disagree with a repo, the repo wins. The docs build also runs on pull requests, and a broken link fails it |

**Deployed today.** The Hetzner dev cluster is live: one `cx33` k3s node running the **core** profile — CloudNative-PG, SeaweedFS, Lakekeeper, Trino — plus **Nova** and **JupyterHub**, with Let's Encrypt TLS from `dev/playground`. Nova answers at `alpha.dev.stardelt.io`; Trino and JupyterHub at `trino.` and `jupyter.` on the same domain. **Superset and Airflow are not installed** — they need the `full` profile and a 16 GB node. Nova's Apps page probes each service and shows what is actually up, not what is merely configured.

## 2. Conventions

### WP format

Every WP below specifies: **Context** (why), **Tasks** (what, ordered), **Acceptance** (must be true when done), **Verification** (command a CI runner or agent runs — no vibes), **Depends** (WPs that must merge first), **Size** (S ≤ half a session, M ≤ one session, L ≤ three sessions).

A WP that has been started carries a **Status** line: what exists and what remains, verified against the repos, never against this document. Read it before writing the first line of code for that WP.

### Definition of done (every WP, no exceptions)

1. Verification command passes in CI, not just locally.
2. Docs updated if the WP changes anything a reader would see.
3. No new service without a contract (master spec §5 plug matrix).
4. PR ≤ ~400 lines, or split into slices that each satisfy 1–3.

### Verification tiers (WP-02 builds these; later WPs use them)

| Tier | Where | Trigger | What |
|---|---|---|---|
| unit | no cluster | every PR | cargo/npm tests, lint, docs build |
| contract | kind in Actions | every PR | CRDs apply, operator reconciles, status goes ready |
| integration | kind in Actions | nightly on `main` | full install + smoke + taxi DAG |
| full-matrix | kind in Actions | labeled / weekly | `demo`-profile heavy plugs (Spark, Apache SeaTunnel, OpenMetadata, Keycloak) as they ship |
| stage | demo VPS | probe every 15 min | `demo.stardelt.io` alive, data present, failure files an issue |

**Profiles** are a product feature that doubles as the test trick: `PlatformInstance.spec.profile: demo | full | airgap`. CI and the stage run `demo` (tiny resources, heavy plugs skipped or mini-sized). The test never needs a "full cluster" — it tests the *adapter*, never the engine.

## 3. Track 0 — Foundations and stage (do first; everything queues behind this)

### WP-01 — CI backbone (M)

**Context.** Agentic development without headless verification is impossible. Every repo gets lint+build+test, and docs get a build check.
**Tasks.** GitHub Actions per repo: `stardelt-docs` → `npm ci && npm run build`; `stardelt-nova` → `cargo fmt --check && cargo clippy && cargo test` + frontend `npm run build`; `stardelt-platform` / `stardelt-demos` → `shellcheck` on scripts, `helm lint` on values, image builds dry-run; branch protection on `main` requiring green CI.
**Acceptance.** All five repos have a passing CI run on `main`; red CI blocks merge.
**Verification.** CI status on every PR.
**Depends.** —.
**Size.** M.
**Status.** Mostly done. `ci.yml` in `stardelt-platform`, `stardelt-nova`, `stardelt-operator` and `stardelt-demos` runs lint/build/test on push and on pull request. `stardelt-docs` builds on pull requests too, and broken links fail that build. Remaining: `main` is not branch-protected in any repo, so red CI still does not block a merge.

### WP-02 — The verification gate (L)

**Context.** The keystone: prove the whole platform headlessly. If CI can't install and smoke the stack, no agent (and no laptop-off workflow) can ever verify anything end-to-end.
**Tasks.** Actions workflow in `stardelt-demos`: job with `helm` + `kind` + `kubectl` → reuse `kind/up.sh` → run `smoke.sh` → trigger the taxi DAG (`make airflow-trigger`) → assert rows in the Iceberg table via Trino. Split into `ci` (PR, contract tier) and `nightly` (integration tier) schedules. Introduce the `demo` profile (WP-15) once it exists; before that, run values as-is.
**Acceptance.** A green nightly run on GitHub-hosted runners installs the full stack, loads data, and queries it back — with zero human input.
**Verification.** `gh run watch` on the nightly workflow; job must end with the smoke assertion passing.
**Depends.** WP-01.
**Size.** L.
**Status.** Partially done. `stardelt-demos/kind/gate.sh` — driven by `.github/workflows/verify.yml` on pull requests, pushes to `main` and `workflow_dispatch` (with a selectable `stardelt-platform` ref) — installs the **core** profile on a kind cluster and proves the data path end to end: kind → `make install-core SLIM=1` → CNPG + SeaweedFS + Lakekeeper + Trino → `kind/smoke.sh` round-trip, plus an Iceberg-snapshot assertion and a re-read after the object store restarts; it is bounded (30-minute in-gate budget, 45-minute job timeout) and dumps diagnostics (`kind/diagnostics.sh`) on failure. Scope exclusions are stated in the workflow header and the README: Nova (its image is built locally, not in CI), Airflow + Superset (`APP_PROFILE=full`, 16 GB node), JupyterHub, ingress/TLS, OIDC login. Remaining: **the integration tier is done** — `stardelt-demos` #12 ships `kind/demo.sh` + `.github/workflows/nightly.yml` (build the Airflow/Superset images, install the **full** profile, trigger `nyc_taxi_load`, assert the Iceberg table through Trino), green on a clean platform `main` in run 39116044349: 11m59s, DAG run `nyc_taxi_load/nightly-20261018T093722Z` succeeded in 145s, and Trino read back 38,310,226 rows in 12 monthly partitions (2,824,209–3,526,854 each) with 12 Iceberg snapshots and the 20 canonical columns; reaching that point cost three real defects — helm `--wait` vs the Airflow chart's post-install migration hook (stardelt-platform#37), Superset's `imagePullSecrets` shape (stardelt-platform#41) and a demo image that silently carried Airflow 3.1.8 (stardelt-demos#11) — leaving the `demo` profile (WP-15) once it exists, and the operator/CRD contract tier.

### WP-03 — Repo hygiene and handover kit (M)

**Context.** Other models will pick WPs up cold. Every repo needs standing instructions.
**Tasks.** `AGENTS.md` per repo: commands (build/test/run), conventions, definition of done, "read `stardelt-docs/docs/design/master-spec.md` first". Issue templates: WP format from §2. GitHub project board with one column per track; paste every WP from this document into an issue labeled by track.
**Acceptance.** A fresh agent cloning any repo finds `AGENTS.md`; the board lists all WPs with dependencies noted.
**Verification.** `ls AGENTS.md` per repo; board URL returns the issues.
**Depends.** —.
**Size.** M.
**Status.** Partially done. `AGENTS.md` exists in `stardelt-platform`, `stardelt-nova`, `stardelt-operator` and `stardelt-demos`. Remaining: `stardelt-docs` has none (its working agreement lives in the workspace-root `AGENTS.md` and the [developer section](../developer/index.md)), no repo has issue templates, and this document is still the WP list.

### WP-04 — Demo stage: `demo.stardelt.io` (L)

**Context.** The stage to show people: Nova as the shop window, alive with real data, healing itself. Also the first dogfood consumer of the operator (WP-22) and the tier-`stage` probe target.
**Tasks.** k3s on the VPS (reuse the `stardelt-demos/k3s` stub as the real k3s path); deploy via a `deploy-stage` Actions workflow (GitOps: merge to `main` → deploy); Nova guest login (read-only OIDC user via WP-12, or read-only static user until then); weekly taxi refresh + demo-reset job; health probe workflow (query via Nova API every 15 min → failure files an issue automatically); TLS + the "synthetic public data" banner.
**Acceptance.** A stranger with the URL can click through catalog → query → dashboard; a killed pod self-heals; a failed probe files an issue.
**Verification.** Probe job history green; issue auto-filed in a chaos test.
**Depends.** WP-02, WP-16 (no dev secrets on a public box), WP-12 (guest login). **Human: provision the Hetzner k3s dev cluster (`make dev-up`), point DNS `demo.stardelt.io`.**
**Size.** L.
**Status.** Partially done, under a different hostname. The human part is done and the `dev/playground` path ships the cluster, DNS and TLS: Nova is publicly reachable at `alpha.dev.stardelt.io`, with the other service UIs under the same wildcard. Remaining: a guest read-only identity (WP-12), a Superset dashboard to click into on this node, the 15-minute probe workflow, and the killed-pod self-heal check.

## 4. Track A — P0 spine hardening and refactors (make the existing stack the substrate the operator will drive)

### WP-10 — Docs convergence (S)

**Context.** `architecture/overview.md` and `services.md` predate the plug matrix; the footer links to nonexistent `architecture/components`.
**Tasks.** Rewrite the two pages to speak contracts/defaults/alternates and reference the plug matrix; fix the footer link in `docusaurus.config.ts`; make `docs/design/` the canonical home page pointer.
**Acceptance.** Docs build with zero broken links; no page contradicts the master spec.
**Verification.** `npm run build` (broken-links list empty).
**Depends.** WP-01.
**Size.** S.
**Status.** Partially done. The footer link is fixed (`Components` now points at `/docs/architecture/services`) and the overview references the plug matrix in its non-goals section. Remaining: `services.md` still describes services rather than contracts, defaults and alternates.

### WP-14 — Adapter inventory (S)

**Context.** The operator will reconcile into *upstream* operators/charts. Nobody has written the target list yet.
**Tasks.** One docs page (or table in `architecture/services`): per plug — upstream chart/operator, install method (Helm vs CRD), health signal, version pin. Verify each entry actually installs on the Hetzner dev cluster (kind for the core subset).
**Acceptance.** Every current default (SeaweedFS, CNPG, Lakekeeper, Trino, Airflow, Superset, Nova, Keycloak) has a verified row.
**Verification.** Documented `helm repo`/chart refs; spot-check install of the two not yet in the stack (CNPG is; Keycloak isn't).
**Depends.** WP-02.
**Size.** S.
**Status.** Not started. The pins this WP must inventory live in the root Makefile of `stardelt-platform` (Renovate reads them there), and `dev/playground/README.md` + `docs/getting-started/prerequisites.md` say where each service is reached — but there is still no per-plug inventory page (upstream chart or operator, install method, health signal, version pin).

### WP-15 — Platform profiles and per-plug values (M)

**Context.** `helm-values/` is one flat set; no `demo` sizing; CI and the stage need profiles. This is the biggest refactor toward operator-readiness.
**Tasks.** Restructure to `plugs/<plug>/values-{base,demo,full}.yaml` (`plugs/storage-seaweedfs`, `plugs/catalog-lakekeeper` + CNPG, `plugs/query-trino`, `plugs/orchestration-airflow`, `plugs/bi-superset`, `plugs/experience-nova`); `Makefile` gains `install PROFILE=demo|full` and iterates plugs via a manifest list; keep `make install` as the `full` default.
**Acceptance.** `make install PROFILE=demo` yields a working stack with reduced resources; per-plug files are exactly what WP-B21 will template into CRDs.
**Verification.** Install on the Hetzner dev cluster (or kind for the core subset) with `PROFILE=demo` + `smoke.sh` passes.
**Depends.** WP-02 (CI proves it).
**Size.** M.
**Status.** Partially done, by a different mechanism. `helm-values/slim/` holds the small-node overrides and `make install-core SLIM=1` is the working cheap-node path, with `install` as the full one, and the umbrella chart now takes the cluster-specific decisions as settings (`platform.baseDomain`, `ingress.*` incl. per-host TLS, `storage.className`, `images.pullSecrets`) — verified by installing a second, independent lakehouse in a fresh namespace and round-tripping a write through its own Trino → Lakekeeper → SeaweedFS. The operator also carries per-plug golden values now (WP-21). Remaining: the `plugs/<plug>/values-<profile>.yaml` layout, a `PROFILE=` argument, one place that owns the values (today the chart and the operator each carry a copy), and anyone honouring `PlatformInstance.spec.profile` (WP-23).

### WP-16 — Secrets out of version control (S)

**Context.** `airflow.yaml` carries pinned "kind-only" fernet/JWT secrets — unacceptable on a public stage, bad practice everywhere.
**Tasks.** Generate on first install (`openssl rand`), store as a namespace Secret, reference from values; `s3-credentials.example.yaml` pattern extended; docs note.
**Acceptance.** `grep -r "do-not-use\|fernetKey:" helm-values/` finds no literal secrets; install still works on a fresh cluster.
**Verification.** Fresh-cluster install + smoke.
**Depends.** WP-15 (touches the same files).
**Size.** S.

### WP-13 — Install idempotency and upgrade test (M)

**Context.** The operator story presumes declarative convergence; the bash path must already converge.
**Tasks.** Make `install` strictly idempotent (bootstrap Job → Job/ConfigMap pattern that detects completion); add a CI job: install → install again → assert no diff (`kubectl diff`-style check); document upgrade path (chart version bumps).
**Acceptance.** Double install produces zero changes; upgrade test pinned in CI.
**Verification.** The CI double-install job is green.
**Depends.** WP-02, WP-15.
**Size.** M.
**Status.** Partially verified by hand, no CI assertion yet. A second `make install-core SLIM=1` against the live dev cluster exited 0 with every release still `deployed`, no renamed or missing workloads, and all pods healthy — the installer converges instead of duplicating. Two behaviours were measured rather than assumed, and both are now in the production page: each release gains a Helm revision on every re-run even when nothing changed (Helm's behaviour, ten revisions kept by default), and re-applying `manifests/nova-deployment.yaml` resets Nova's image to the mutable `:dev` tag, which is why `make pin` exists. Remaining: a double-install assertion in CI (`kubectl diff`-style, since "exit 0" is weaker than "no changes"), the bootstrap Jobs using a completion pattern rather than relying on Helm's hook semantics, and a real chart-version bump exercised end to end.

### WP-11 — Nova dashboards through the gateway (M)

**Context.** The Dashboards page iframes a port-forwarded Superset — broken by design, not "one place."
**Tasks.** Backend: add a Superset proxy to the existing axum proxy layer (pattern of `catalog.rs`/`trino.rs` — generalize while there, see WP-18); embed via the gateway with the guest/SSO identity; kill the port-forward dependency.
**Acceptance.** Dashboards render in Nova served entirely through the backend, from a cluster URL, no local port-forward.
**Verification.** Playwright/curl check: `/api/dashboards/...` returns Superset content through the gateway.
**Depends.** WP-01.
**Size.** M.
**Status.** Partly mitigated. The page now embeds the deployed Superset URL reported by `/api/apps` and only falls back to a port-forward when none is deployed. It is still a direct iframe: there is no Superset proxy in the backend and no `/api/dashboards/...` route.

### WP-18 — Nova auth abstraction (S)

**Context.** `auth_mode: static-dev` is hardcoded. SSO (WP-12) needs a seam.
**Tasks.** Extract an auth-provider trait (static-dev | oidc); `/api/me` behind it; frontend login flow stubbed for oidc; config via env/CRD-shaped settings.
**Acceptance.** Same behavior with `static-dev`; adding a provider = one new impl, no handler rewrites.
**Verification.** `cargo test` unit tests on the provider trait; manual login unchanged.
**Depends.** WP-01.
**Size.** S.

### WP-12 — SSO: Keycloak into the platform, Nova OIDC login (L)

**Context.** Principle 3: one identity everywhere — starts with the user's login actually being an OIDC login. Also unblocks the stage's guest user.
**Tasks.** Keycloak as an opt-in plug (`plugs/identity-keycloak`); Nova OIDC provider behind WP-18's trait (PKCE flow); token passthrough from Nova → Trino; realm + `demo` and `guest` users bootstrapped declaratively.
**Acceptance.** Login via Keycloak; `/api/me` returns the OIDC user; a Trino query carries the token.
**Verification.** CI integration tier with Keycloak enabled (full-matrix label).
**Depends.** WP-18, WP-15.
**Size.** L.

### WP-17 — Demos unified with platform (M)

**Context.** `stardelt-demos` duplicates platform wiring and diverges; the k3s stub must become real (the stage VPS runs k3s).
**Tasks.** `kind/up.sh` consumes `stardelt-platform` profiles directly (no duplicated releases); the Hetzner k3s dev path is `stardelt-platform/dev/hetzner-k3s`; point it at the unified installer; image builds move behind a shared Make target.
**Acceptance.** One wiring source of truth; k3s script provisions the stage from scratch.
**Verification.** kind demo green in CI (WP-02 uses the unified path).
**Depends.** WP-15, WP-04 (k3s target motivated by stage).
**Size.** M.
**Status.** Done for the wiring. `stardelt-demos/kind/up.sh` owns only the kind-specific steps and delegates the install to the platform Makefile (`APP_PROFILE=core` by default, `SLIM` forwarded), so there is one wiring source of truth. Remaining: image build and load still live in the demos repo rather than behind a shared Make target, and the k3s path is `dev/hetzner-k3s` + `dev/playground` run by hand, not a one-command stage recipe.

## 5. Track B — Operator first blood (the differentiator; start as soon as WP-02 exists)

### WP-20 — Operator skeleton (L)

**Context.** The repo needs to become a real controller: reconcile loop, status, leader election, metrics — the shape WP-21/WP-23 plug into.
**Tasks.** Replace `main.rs` with kube-rs controller-runtime wiring: CRD type scaffolding (schemars-derived spec/status), controller manager, events, `? metric` server, leader election, graceful shutdown; operator Helm chart (fill the TODO `chart/`); `cargo test` with a mocked kube client; CI integration via WP-02's contract tier.
**Acceptance.** Operator deploys into kind via its chart, logs a real (no-op) reconcile for a stub CRD, `/metrics` serves.
**Verification.** Contract-tier CI job: install operator → apply stub CR → status transitions in logs.
**Depends.** WP-02.
**Size.** L.
**Status.** Partially done. In place: the five CRD types with generated `chart/crds/`, a pure reconcile planner, a Helm adapter, a controller that watches `PlatformInstance`, `Tenant` and `Lakehouse` and writes status, the operator chart and image, and 43 unit tests; the operator's own `AGENTS.md` reports `Tenant`, `PlatformInstance` and `Lakehouse` reconciled against the dev cluster. Remaining: no controller for `IngestionSource` or `Pipeline`; no leader election, metrics endpoint or events; the operator is not deployed by `make install` (`make install-operator` is a dev path); and no CI job runs it against a cluster (that needs the contract tier from WP-02).

### WP-21 — `Lakehouse` CRD reconciles the real stack (L)

**Context.** First real plug: `Lakehouse` (catalog + storage, per the plug matrix) → applies WP-15's per-plug values via server-side apply / Helm, with profile support.
**Tasks.** `Lakehouse` spec: `{catalog: {implementation: lakekeeper|polaris}, storage: {implementation: seaweedfs|byoS3}, profile}`; reconciler applies SeaweedFS + CNPG + Lakekeeper (+ bootstrap) from `plugs/` values; status reports readiness per component; ownership labels; finalizer-based uninstall.
**Acceptance.** `kubectl apply` of one `Lakehouse` in a fresh kind produces a working catalog; delete tears it down; status is truthful.
**Verification.** Contract-tier CI: apply → wait ready → `smoke.sh` catalog portion passes → delete → gone.
**Depends.** WP-20, WP-15, WP-14.
**Size.** L.
**Status.** Substantially working. The reconciler plans and applies upstream releases from golden values plus per-Lakehouse overrides (`spec.values`, `spec.valuesFrom` for a ConfigMap/Secret document, per-component `spec.set`), with the merge order golden < valuesFrom < values < set, `dryRun: true` by default and an adopt guard. `plan_lakehouse` now covers storage, catalog *and* query. Verified against the live cluster: a second `Lakehouse` in a scratch namespace planned three components, a missing value source produced `Degraded` with the offending reference named while the other components still planned, and the golden values were corrected twice by what that run exposed (cluster-scoped CNPG belongs to `PlatformInstance`; SeaweedFS's migration ClusterRole must stay off). Remaining: a full non-dry-run install of a `Lakehouse` end to end, the warehouse bootstrap step, ownership labels/finalizer teardown, and the values currently duplicated out of `stardelt-platform/helm-values/`.

### WP-22 — Demo and stage switch to the operator (M)

**Context.** Dogfood: bash steps for the lakehouse slice are deleted; the stage becomes the operator's first production consumer. "stardelt deploys stardelt."
**Tasks.** `kind/up.sh` (and stage deploy) install operator + apply `PlatformInstance`/`Lakehouse` instead of steps 1–4 of `make install`; delete those Makefile steps; blog-post-ready docs page on the flow.
**Acceptance.** Demo works with the operator path; the replaced bash is gone from the repo.
**Verification.** WP-02 integration tier green end-to-end on the operator path.
**Depends.** WP-21, WP-04.
**Size.** M.

### WP-23 — `PlatformInstance` and profiles in the operator (M)

**Context.** `PlatformInstance` (cluster-scoped) becomes the root: selects implementations and the profile that sizes/skips everything.
**Tasks.** `PlatformInstance` spec: `{profile: demo|full|airgap, pillars: {...}}`; reconciler fans out to child CRDs; `demo` sizing table documented; the stage runs `profile: demo`.
**Acceptance.** One `PlatformInstance` with `demo` drives the whole install; CI uses it; no per-plug manual sizing left.
**Verification.** Integration-tier CI with `profile: demo` (should now be *the* install path).
**Depends.** WP-21, WP-15.
**Size.** M.
**Status.** Partially done. `PlatformInstance` owns the cluster-scoped prerequisites — it plans the CNPG operator, which keeps two Lakehouses from fighting over the same ClusterRole — and `spec.dryRun` is honoured. Remaining: `spec.profile` still does not drive per-plug sizing, and nothing consumes `pillars` yet.

## 6. Track C — Governed lakehouse (P1; one contract per WP, only after Track A)

### WP-30 — `IngestionSource` contract (M)

The CRD schema + adapter framework for all three ingestion domains (`saas` / `enterprise` / `cdc`), with one fake adapter for tests. No engine yet. **Acceptance:** apply a fake source → adapter framework dispatches → status truthfully reports "no impl configured." **Status.** The `IngestionSource` CRD and the domain-to-component planner rule exist; there is no controller or adapter framework yet.
### WP-31 — Apache SeaTunnel adapter (M)

`domain: saas` → Apache SeaTunnel plug + one connector (e.g. GA4 or a public API) landing in Iceberg. **Acceptance:** demo dataset appears in the catalog via the CRD, no manual steps.
### WP-32 — `Pipeline` contract + Airflow adapter (L)

`Pipeline` CRD (steps, schedule, engine ref) → Airflow adapter; port `nyc_taxi_load.py` to a declarative `Pipeline`. **Acceptance:** taxi load runs from a `kubectl apply`, status surfaces run state. **Status.** The `Pipeline` CRD (with `status.runs`) and the engine-to-component planner rule exist; there is no controller or Airflow adapter yet.
### WP-33 — dbt + Soda quality gates (M)

dbt plug as a transform step; Soda/dbt tests as a gate step; failing gate = red pipeline + surfaced state. **Acceptance:** a deliberately failing test turns the `Pipeline` status red and blocks downstream.
### WP-34 — OpenMetadata spine + lineage emission (L)

Deploy OpenMetadata as the governance plug; Airflow (OpenLineage) + dbt emit lineage automatically. **Acceptance:** the taxi pipeline's table-to-table lineage renders without any manual registration.
### WP-35 — `DataContract` CRD (S)

Schema + quality + ownership as code; wired to WP-33 gates and WP-34 glossary. **Acceptance:** breaking a contract in CI blocks a pipeline.
### WP-36 — Nova pipelines view (M)

Pipelines page: runs, status, quality badges, lineage link — all via the Airflow API through the gateway. **Acceptance:** the taxi pipeline is fully observable from Nova.

*Verification for all of Track C: the WP-02 integration/full-matrix tiers with the new plug enabled; each WP also adds its own unit tests.*

## 7. Track D — AI (after C; schema awareness already exists via the catalog)

### WP-40 — `ModelEndpoint` CRD + vLLM/Ollama (M)

Sovereign AI plug: a `ModelEndpoint` reconciles a tiny on-prem inference endpoint (Ollama single-model for `demo`, vLLM for `full`). **Acceptance:** an in-cluster API answers a completion request; external-API mode is opt-in config only.
### WP-41 — Copilot v0 in Nova (M)

NL→SQL in the Query editor: schema context from the Lakekeeper proxy, prompts to the `ModelEndpoint`, generated SQL always lands in the editor for human review — never auto-executed. **Acceptance:** "top 5 pickup boroughs by tip" produces valid SQL against the taxi schema, visible on the stage.

## 8. Waves (what to run in parallel)

| Wave | WPs | Note |
|---|---|---|
| 1 | 01, 03 | CI + hygiene; anything goes after this |
| 2 | 02, 10, 14 | the gate; then Track B can start |
| 3 | 15, 18, 20, 04 (human-unblocked) | profiles, auth seam, operator skeleton, stage |
| 4 | 16, 13, 11, 21, 23 | spine hardening + first real reconcile |
| 5 | 12, 17, 22 | SSO, unified demos, dogfooding on stage |
| 6 | 30 → 31 / 32 → 33 → 34 → 35 → 36 | Track C, strictly ordered |
| 7 | 40, 41 | AI |

Waves 1 and 5 are partly done: CI exists in every repo (WP-01), the demos are unified (WP-17) and a public dev cluster is live. Still missing from wave 1: `AGENTS.md` in `stardelt-docs` and issue templates (WP-03). Wave 2 — the verification gate — is the open blocker, and Track B waits on it.

## 9. Human actions (the only things that need you)

1. **Wave 1, once:** review/merge the CI PRs — done, except branch protection on `main`, `AGENTS.md` in `stardelt-docs` and the issue-template pass (WP-03).
2. **Before WP-04:** ~~rent the VPS, point DNS~~ **done** — the dev cluster runs (Hetzner `cx33`, ~€10/mo) with DNS and TLS at `alpha.dev.stardelt.io`. A separate public `demo.stardelt.io` stage with a guest identity is still WP-04.
3. **Weekly, ~30 min:** triage the board, reorder WPs, review PRs (phone-sized PRs are enforced by convention).
4. **On scope changes:** edit the master spec via PR — never let the plan and the spec drift.

## 10. Handover protocol (agent working agreement)

1. An agent only works on **one WP issue at a time**, branch `wp/<id>-slug`.
2. Before starting: read the master spec, the repo's `AGENTS.md`, and the full WP issue (context, tasks, acceptance, verification).
3. Scope discipline: if the WP needs more than ~400 changed lines, stop and split — comment on the issue with the split proposal instead of pushing a mega-PR.
4. A PR is only ready when: verification passes in CI, acceptance criteria are all visibly true, docs are updated, and the PR description lists each acceptance criterion with how it was met.
5. Never merge your own PR. Never force-push. Human review is the loop.
6. If blocked for more than ~30 min of effort: comment the blocker on the issue and pick another WP from the current wave.
