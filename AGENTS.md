# stardelt-docs

The public documentation site for stardelt, built with Docusaurus.

## Rules

- The site describes what the platform does and how to use it. It holds no design discussion, research,
  product comparisons, issue numbers or internal references.
- `docs/reference/` and `reference-src/` are generated. Run `npm run sync:reference && npm run gen:reference`;
  never edit them by hand.
- Check claims against `main` of the repository concerned, and against a running install when you can.
- Run `npm run build` before a pull request. It fails on broken links.
- `npm run check:sidebars` and `npm run check:page-budget` must pass. A new page needs a
  `description:` and a row in `scripts/page-budgets.json` (`node scripts/check-page-budget.mjs --write`).
- Work on a branch and open a pull request. Never push to `main`: a merge publishes the site.

## Skills

`skills/<name>/SKILL.md` holds how recurring work is done across the stardelt repositories. Read the
matching one before you start. The skills table in `CONTRIBUTING.md` (stardelt/stardelt) lists them.

Conventions for contributors are in `project/developer/index.md`.
