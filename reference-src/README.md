# Reference snapshots

Do not edit these files by hand. `npm run sync:reference` rewrites them from the public repositories.

| Source | Repository | Commit | Synced |
|---|---|---|---|
| `schemas/*.json`, `examples/*.yaml` | [`stardelt/stardelt` `operator/`](https://github.com/stardelt/stardelt/tree/main/operator) | `d85a7506f3780a0d08ab590ba8c10b3f4fe9e5a2` | 2026-11-21 |
| `nova-openapi.json` | [`stardelt/stardelt` `nova/`](https://github.com/stardelt/stardelt/tree/main/nova) | `cb825d092ad29a8570b2932d6733eb0782c0bc2c` | 2026-11-21 |

`npm run gen:reference` turns these snapshots into `docs/reference/`; CI fails when the committed pages and
the snapshots disagree. The snapshots are byte copies, but the generator drops references to internal design
notes and decision records from prose descriptions, because those do not belong on the public site.
