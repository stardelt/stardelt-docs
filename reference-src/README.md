# Reference snapshots

Do not edit these files by hand. `npm run sync:reference` rewrites them from the public repositories.

| Source | Repository | Commit | Synced |
|---|---|---|---|
| `schemas/*.json`, `examples/*.yaml` | [`stardelt/stardelt-operator`](https://github.com/stardelt/stardelt-operator) | `b55ac569cf6eede87c407ee99b2b900cc3353e04` | 2026-11-14 |
| `nova-openapi.json` | [`stardelt/stardelt-nova`](https://github.com/stardelt/stardelt-nova) | `8e535b9bce90d1419d7aeee7cbe660d86d4a50ba` | 2026-11-14 |

`npm run gen:reference` turns these snapshots into `docs/reference/`; CI fails when the committed pages and
the snapshots disagree. The snapshots are byte copies, but the generator drops references to internal design
notes and decision records from prose descriptions, because those do not belong on the public site.
