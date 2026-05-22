# Docs restructure (issue #2) — design

*Date: 2026-05-22 · Repo: `stardelt-docs` · Tracking issue: [stardelt/stardelt-docs#2](https://github.com/stardelt/stardelt-docs/issues/2)*

## Context

`stardelt-docs/docs/` today is a flat mix of marketing prose, architecture
spec, and engineering notes:

- `mvp.md` mixes user-facing install steps with engineer notes on stage
  progress and SeaweedFS/Ozone/Superset workarounds.
- No directory separates *user* content from *developer/internal* content.
- The sidebar has no hierarchy — everything sits at the same level.
- `master-spec.md` (322 lines of vision + architecture) lives under
  `design/` with no clear positioning.

Issue #2 proposes a four-layer split (intro / getting-started /
architecture / developer) and asks for the `developer/` section to be
accessible but not promoted in the main navbar.

This spec additionally formalises a **writing convention** the user asked
to persist: human-readable surface content and implementation/AI detail are
**always in separate files**, never inline.

## Goals

1. Restructure `stardelt-docs/docs/` into clear audience tiers — what a
   first-time visitor reads vs. what a contributor reads.
2. Extract the user-facing install content out of `mvp.md` into
   `getting-started/`, and move the engineer notes into
   `developer/implementation-log.md`.
3. Establish and document the sidecar-impl writing convention so every
   future page follows the same shape.
4. Demonstrate the convention with one concrete pairing
   (`architecture/components.md` ↔ `architecture/components-impl.md`).
5. Capture the SeaweedFS-over-Ozone decision as the first ADR.
6. Update sidebar and navbar to match the new structure.

## Non-goals

- Retroactively writing impl siblings for every existing `architecture/*`
  page. We add one demonstration pair; the rest can be added as those
  pages get re-touched.
- Rewriting `master-spec.md` or `roadmap.md` content.
- Adding ADRs beyond #001 in this pass.
- Touching `stardelt-platform`, `stardelt-nova`, `stardelt-operator`, or
  `stardelt-demos` (this is a `stardelt-docs`-only change).
- Building the cross-link from the user page to the impl sibling using
  anything more elaborate than a Docusaurus admonition. No frontmatter
  field, no custom React component.

## Decisions

### D1 — Writing convention: sidecar `*-impl.md`

Two rules:

1. **Human-facing pages contain only prose, examples, and links.** No
   axum router internals, no specific cache TTLs, no struct names, no
   "we currently work around X by Y". If it's a detail only a contributor
   needs, it does not belong on a human-facing page.
2. **Implementation/AI detail lives in a sibling `<topic>-impl.md`** in
   the same directory. The human page links to it via a standard
   Docusaurus admonition near the top:

   ```markdown
   :::info Implementation detail
   Engineering depth for this page lives in [Components — Implementation](./components-impl).
   :::
   ```

The impl sibling is **excluded from the main sidebar** so casual readers
don't see it. It remains reachable via the in-page callout, direct URL,
and Docusaurus search. `developer/index.md` lists every existing impl
page so contributors can browse them.

Rationale (from brainstorming): the user explicitly chose this over inline
`<details>`, two-tier `## Concept` / `## Implementation` sections, and
admonition callouts, after seeing all four rendered live in a Docusaurus
sandbox. The reason given was clean audience separation — the two
audiences shouldn't share a page at all.

### D2 — File layout: hybrid

Impl siblings live next to their human page on disk. The `developer/`
directory holds only **cross-cutting** developer content (the
contributing guide, the implementation log, ADRs) — not impl siblings
mirroring user-facing pages.

### D3 — `master-spec.md` stays put

The issue suggests "archive or repurpose under developer internals". On
reading the file it's vision + architecture, not internal engineering
content, so it stays at `design/master-spec.md` and remains visible in
the navbar. No content changes.

### D4 — One demonstration impl pair this pass

We create `architecture/components-impl.md` as the first concrete example
of the convention. Other architecture pages get impl siblings only when
their human content is next touched. This avoids fabricating impl detail
just to fill the structure.

### D5 — Sandbox removed before commit

The `docs/sandbox/doc-style-options*.mdx` pages and their sidebar entries
exist only to support the brainstorming. They're deleted before this
work is committed.

## Final docs tree

```
stardelt-docs/docs/
├── intro/
│   └── overview.md                  # NEW — user-facing "what is stardelt"
├── getting-started/
│   ├── prerequisites.md             # extracted from mvp.md
│   ├── local-kind.md                # extracted from mvp.md (bring-up)
│   └── smoke-test.md                # extracted from mvp.md (verification)
├── architecture/
│   ├── overview.md                  # unchanged
│   ├── components.md                # add top-of-page impl callout
│   ├── components-impl.md           # NEW — demonstrates the convention
│   ├── licenses.md                  # unchanged
│   └── sovereignty.md               # unchanged
├── design/
│   └── master-spec.md               # unchanged
├── diagrams/                        # unchanged
│   ├── control-plane.md
│   ├── data-flow.md
│   └── layers.md
├── roadmap.md                       # unchanged
└── developer/                       # collapsed in sidebar; not in navbar
    ├── index.md                     # NEW — section landing + impl-pages index
    ├── contributing.md              # NEW — canonical writing convention
    ├── implementation-log.md        # NEW — engineer notes from mvp.md
    └── decisions/
        └── 001-seaweedfs-over-ozone.md  # NEW — first ADR
```

`docs/mvp.md` is removed (content distributed to `getting-started/` and
`developer/implementation-log.md`).

## Sidebar + navbar

### `sidebars.ts`

- Reordered into the audience-tier sequence:
  1. Intro (single-item or category)
  2. Getting started (category, expanded)
  3. Architecture (category, collapsed by default after restructure)
  4. Diagrams (category, collapsed)
  5. Roadmap
  6. Design (category, collapsed)
  7. Developer (category, **collapsed**, contains contributing, log, decisions/)
- Impl pages excluded from the sidebar entries. Easiest mechanism: list
  pages explicitly in the architecture category rather than using
  autogenerated, so `components-impl` simply isn't listed.
- The sandbox category is removed.

### `docusaurus.config.ts` navbar

- Remove the `MVP` entry.
- Add `Getting started` pointing to `/docs/getting-started/local-kind`
  (the page a new user most likely wants).
- Keep `Architecture`, `Roadmap`, `Design`, `GitHub`.
- Do **not** add a `Developer` navbar entry — the section is reachable
  via sidebar and search only.

## ADR 001 content sketch

`developer/decisions/001-seaweedfs-over-ozone.md`:

- **Status:** Accepted
- **Date:** ~2026-04 (first commit when SeaweedFS was wired in — confirm
  via `git log` during implementation)
- **Context:** Original platform design specified Apache Ozone as the
  S3-compatible object store layer underneath Iceberg. Ozone proved to be
  heavyweight to operate on a kind cluster and was substantially more
  complex than the lakehouse demo required.
- **Decision:** Replace Apache Ozone with SeaweedFS as the S3 layer for
  the Phase 0 lakehouse slice.
- **Consequences:**
  - Smaller, simpler runtime footprint suitable for laptop demos and
    small production clusters.
  - **The S3 credentials Secret remains named `ozone-s3-creds`** to
    avoid churning every chart and manifest that references it. Future
    rename is tracked as a follow-up.
  - SeaweedFS is the path the platform continues to validate against;
    Ozone is not currently supported.

The implementation log links to this ADR from its "Storage" section.

## `developer/contributing.md` content sketch

Sections:

1. **How the docs are organised** — pointer to this restructure and the
   four sections (intro / getting-started / architecture / developer +
   design and diagrams).
2. **Writing convention: human pages and impl siblings** — the two rules
   from D1, the standard callout template, naming convention, where impl
   pages live, why they're not in the sidebar.
3. **Adding a new impl sibling** — quick how-to:
   - Create `<topic>-impl.md` next to `<topic>.md`.
   - Add the `:::info Implementation detail` callout at the top of the
     human page.
   - Add the impl page to the `developer/index.md` index.
4. **Adding a new ADR** — copy `decisions/001-...` as template, increment
   number, set status to Accepted/Proposed/Superseded.
5. **Local preview** — `docker run … node:20 npm start` recipe matching
   what's used in this session, plus `npm start` for users with node
   installed.

## `intro/overview.md` content sketch

Short (½–1 page) user-facing answer to "what is stardelt":

- One-sentence pitch (lifted from `README.md` / `master-spec.md`
  positioning).
- The four differentiating claims (sovereignty / no vendor handcuffs /
  one CRD / modern stack) as a bullet list, condensed to 1–2 lines each.
- A pointer to `getting-started/local-kind.md` for readers who want to
  try it now, and to `architecture/overview.md` for readers who want to
  understand the system first.
- A note that the project is in pre-alpha MVP / vibecoding phase.

No new content — everything cited above already exists in
`master-spec.md` and `README.md` and is being summarised, not authored.

## `developer/index.md` content sketch

This page is the landing slug for the `developer/` sidebar category
(via the category's `link.type: doc` or by being named `index.md` and
referenced from the sidebar — implementation chooses).

- One-paragraph "you've reached the developer section; this is for
  contributors, not first-time users".
- List of impl pages currently in the docs (at MVP, just
  `architecture/components-impl`). Maintained by hand; the contributing
  guide says: when you add an impl sibling, add it here.
- Link to contributing, implementation-log, decisions/.

## Content migration from `mvp.md`

Working from current `mvp.md` (204 lines):

| Source section | Destination |
|---|---|
| Title + intro stage table | `developer/implementation-log.md` (full stage breakdown is engineer-facing) — `intro/overview.md` only mentions "pre-alpha MVP" status in prose |
| Stack overview diagram | `getting-started/local-kind.md` (it's how you build a mental model before running) |
| Prerequisites table | `getting-started/prerequisites.md` |
| Bring the stack up (`make` commands) | `getting-started/local-kind.md` |
| Smoke test / verification queries | `getting-started/smoke-test.md` |
| Stage-by-stage engineer notes, Ozone→SeaweedFS notes, Superset iframe caveats | `developer/implementation-log.md` |

`developer/implementation-log.md` keeps the stage-by-stage chronology
verbatim where possible — it's a useful record of what was tried, what
broke, and how it was resolved.

## Acceptance criteria

1. The directory layout under `stardelt-docs/docs/` matches the tree
   above.
2. `mvp.md` no longer exists; nothing in the new tree references it.
3. `sidebars.ts` produces the audience-tier ordering above, with the
   sandbox removed and impl pages excluded.
4. `docusaurus.config.ts` navbar drops `MVP` and adds `Getting started`;
   no `Developer` entry.
5. `architecture/components.md` carries the standard impl callout
   linking to `components-impl`.
6. `developer/contributing.md` documents the convention as defined in D1.
7. `developer/decisions/001-seaweedfs-over-ozone.md` exists and reads as
   a coherent ADR.
8. The Docusaurus dev server starts without errors and serves every page
   in the tree without broken-link warnings.
9. All work happens in a single commit (or a small, ordered series) on
   the `stardelt-docs` repo and references issue #2.

## Out of scope / follow-ups

- Filling in `*-impl.md` for the other `architecture/*` pages.
- Additional ADRs (Trino/DuckDB choice, Lakekeeper/Polaris choice,
  Airflow/Argo choice, ingress strategy from stardelt-platform#2).
- Renaming the `ozone-s3-creds` Secret across the platform charts.
- Cross-repo docs (e.g., a Nova internals page referencing Nova source).
- Touching the docusaurus theme, navbar styling, or homepage.
