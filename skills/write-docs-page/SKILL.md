---
name: write-docs-page
description: Write or edit a page on the public stardelt documentation site, following its rules for readers.
when_to_use: Adding or changing anything under stardelt-docs/docs, outside the generated reference.
---

# Write a docs page

## Where it goes

| The reader wants to | Folder |
|---|---|
| Install or try it | `docs/getting-started/` |
| Work with data | `docs/guides/` |
| Keep it running | `docs/operations/` |
| Understand how it fits | `docs/architecture/` |
| Know one component | `docs/services/` |
| Contribute | `docs/developer/` |

`docs/reference/` is generated, so never edit it. List a new page in `sidebars.ts` (service pages are automatic).

## How to write it

1. Start with what the reader can do. Then give the steps, then the limits.
2. Use the words on the screen. Check the labels in `stardelt-nova/frontend/src/components/Shell.tsx`.
3. Show commands you have run, with `<your-domain>` style placeholders.
4. Write in the present tense about what is true today. A limit goes in a short "Not available yet" list.
   Something not built goes on the roadmap, never in a guide.
5. Put sharp edges in an admonition: sign-in off, data loss, a command that deletes.

## Leave out

- Issue or pull request numbers, milestones, dates of work
- Who built it, how it was decided, what was tried before
- Other products and comparisons
- References to internal notes or private repositories
- Development clusters, personal paths, agents or how the work is organized
- Words like "honest", "simply" and "just"

## Check

- Run the `check-docs-facts` skill on anything you state as fact.
- `npm run build`: it fails on broken links. In MDX, write a bare URL or `[text](url)`, not `<https://…>`.
