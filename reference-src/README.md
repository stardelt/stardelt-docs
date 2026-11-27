# Reference snapshots

Do not edit these files by hand. `npm run sync:reference` rewrites them from the public repositories.

| Source | Repository | Commit | Synced |
|---|---|---|---|
| `schemas/*.json`, `examples/*.yaml` | [`stardelt/stardelt` `operator/`](https://github.com/stardelt/stardelt/tree/main/operator) | `712bdfd4dcae218a632c9e0215617ea5cc6b4c97` | 2026-11-27 |
| `nova-openapi.json` | [`stardelt/stardelt` `nova/`](https://github.com/stardelt/stardelt/tree/main/nova) | `eec8e0b3633ae9c8110ac0ea5545d62e4b9e6c1b` | 2026-11-27 |
| `cli.json` | [`stardelt/stardelt` `python/`](https://github.com/stardelt/stardelt/tree/main/python) | `80cfd1ac64c005704ad667b7fc524dca3825fb48` | 2026-11-26 |

`npm run gen:reference` turns these snapshots into `docs/reference/`; CI fails when the committed pages and
the snapshots disagree. The snapshots are byte copies, but the generator drops references to internal design
notes and decision records from prose descriptions, because those do not belong on the public site.
