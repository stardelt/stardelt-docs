# Reference snapshots

Do not edit these files by hand. `npm run sync:reference` rewrites them from the public repositories.

| Source | Repository | Commit | Synced |
|---|---|---|---|
| `schemas/*.json`, `examples/*.yaml` | [`stardelt/stardelt` `operator/`](https://github.com/stardelt/stardelt/tree/main/operator) | `01099a7d0b9505b687528b4edfc44e7299b0637e` | 2026-11-26 |
| `nova-openapi.json` | [`stardelt/stardelt` `nova/`](https://github.com/stardelt/stardelt/tree/main/nova) | `9eb2f72286066230237c394267d49745f2d8a5cf` | 2026-11-26 |
| `cli.json` | [`stardelt/stardelt` `python/`](https://github.com/stardelt/stardelt/tree/main/python) | `80cfd1ac64c005704ad667b7fc524dca3825fb48` | 2026-11-26 |

`npm run gen:reference` turns these snapshots into `docs/reference/`; CI fails when the committed pages and
the snapshots disagree. The snapshots are byte copies, but the generator drops references to internal design
notes and decision records from prose descriptions, because those do not belong on the public site.
