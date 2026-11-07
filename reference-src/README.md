# Reference snapshots

Do not edit these files by hand. `npm run sync:reference` rewrites them from the public repositories.

| Source | Repository | Commit | Synced |
|---|---|---|---|
| `schemas/*.json`, `examples/*.yaml` | [`stardelt/stardelt-operator`](https://github.com/stardelt/stardelt-operator) | `a6bfd05b458e86728f575af8c535856d17aedadf` | 2026-11-07 |
| `openapi/nova.json` | [`stardelt/stardelt-nova`](https://github.com/stardelt/stardelt-nova) | `4462221cd972c48eb193ad339d6156651d136f44` | 2026-11-07 |

`npm run gen:reference` turns these snapshots into `docs/reference/`; CI fails when the committed pages and
the snapshots disagree. The snapshots are byte copies, but the generator drops references to internal design
notes and decision records from prose descriptions, because those do not belong on the public site.
