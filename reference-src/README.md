# Reference snapshots

Do not edit these files by hand. `npm run sync:reference` rewrites them from the public repositories.

| Source | Repository | Commit | Synced |
|---|---|---|---|
| `schemas/*.json`, `examples/*.yaml` | [`stardelt/stardelt-operator`](https://github.com/stardelt/stardelt-operator) | `19c7f65513559292f4a34b3bb88b9b74d2e8178e` | 2026-11-08 |
| `openapi/nova.json` | [`stardelt/stardelt-nova`](https://github.com/stardelt/stardelt-nova) | `5bc8f16067d14326fc634e016f4a545726b69392` | 2026-11-08 |

`npm run gen:reference` turns these snapshots into `docs/reference/`; CI fails when the committed pages and
the snapshots disagree. The snapshots are byte copies, but the generator drops references to internal design
notes and decision records from prose descriptions, because those do not belong on the public site.
