# Reference snapshots

Do not edit these files by hand. `npm run sync:reference` rewrites them from the public repositories.

| Source | Repository | Commit | Synced |
|---|---|---|---|
| `schemas/*.json`, `examples/*.yaml` | [`stardelt/stardelt-operator`](https://github.com/stardelt/stardelt-operator) | `517a3c74495a0c02bbb42be6a018dbad335a2d91` | 2026-11-09 |
| `nova-openapi.json` | [`stardelt/stardelt-nova`](https://github.com/stardelt/stardelt-nova) | `2031d71c516c01d28760459454a83d7b4f71b621` | 2026-11-09 |

`npm run gen:reference` turns these snapshots into `docs/reference/`; CI fails when the committed pages and
the snapshots disagree. The snapshots are byte copies, but the generator drops references to internal design
notes and decision records from prose descriptions, because those do not belong on the public site.
