---
title: "Contributing to the docs"
sidebar_label: "Contributing"
slug: /developer/contributing
---

# Contributing to the docs

This page documents how we organise and write the `stardelt-docs` content. New
pages should follow these conventions.

## How the docs are organised

```
docs/
├── intro/             # user-facing "what is stardelt"
├── getting-started/   # user-facing "how do I run it"
├── architecture/      # user-facing "how does it fit together"
├── design/            # user-facing canonical design spec
├── diagrams/          # Mermaid diagrams referenced from the above
├── roadmap.md         # public roadmap
└── developer/         # contributor-facing — this section
    ├── index.md
    ├── contributing.md       # you are here
    └── implementation-log.md # stage progress and lessons learned
```

The `developer/` section is collapsed in the sidebar by default and is **not**
promoted in the navbar. Casual readers shouldn't end up here by accident.

## Writing convention: human pages and impl siblings

We separate human-readable surface content from implementation / AI detail
into **separate files**. Two rules:

### Rule 1 — Human pages contain only prose, examples, and links.

No axum router internals, no cache TTLs, no struct names, no "we currently
work around X by Y". If it's a detail only a contributor needs, it does not
belong on a human-facing page.

### Rule 2 — Implementation / AI detail lives in a sibling `<topic>-impl.md`.

The human page is `architecture/nova.md`. The implementation page is
`architecture/nova-impl.md`, in the same directory. The human page links to
the impl page via a standard Docusaurus admonition near the top:

````markdown
:::info Implementation detail
Engineering depth for this page lives in [Nova — Implementation](./nova-impl).
:::
````

Impl pages are **excluded from the main sidebar** so casual readers don't see
them. They remain reachable via the in-page admonition link, direct URL, and
Docusaurus search. The [Developer section index](./) maintains a list of all
current impl pages.

## Adding a new impl sibling

1. Create `<topic>-impl.md` next to the human `<topic>.md` you're documenting.
2. Add the `:::info Implementation detail` admonition (Rule 2 above) near the
   top of the human page.
3. Do **not** add the impl page to `sidebars.ts`. It should not appear in the
   sidebar.
4. Add the impl page to the bulleted list on [`developer/index.md`](./) so
   contributors can find it.

## Local preview

If you have Node 18+ installed:

```bash
npm install
npm start
```

If you don't:

```bash
docker run --rm -it \
  -v "$(pwd)":/app -w /app -p 3000:3000 \
  node:20 sh -c "npm install --no-audit --no-fund && npm start -- --host 0.0.0.0 --no-open"
```

Open `http://localhost:3000`. Docusaurus hot-reloads on file changes.
