# Reference snapshots

Do not edit these files by hand. `npm run sync:reference` rewrites them from the public repositories.

| Source | Repository | Commit | Synced |
|---|---|---|---|
| `schemas/*.json`, `examples/*.yaml` | [`stardelt/stardelt` `operator/`](https://github.com/stardelt/stardelt/tree/main/operator) | `25ec49011a210399fb8ec690d0eed6115b8d6111` | 2026-11-26 |
| `nova-openapi.json` | [`stardelt/stardelt` `nova/`](https://github.com/stardelt/stardelt/tree/main/nova) | `e42ae09b6d77c20c6608552950d8efe81d3c6947` | 2026-11-26 |
| `cli.json` | [`stardelt/stardelt` `python/`](https://github.com/stardelt/stardelt/tree/main/python) | `a1908efdb4323f14de2187dbc76cbb6defb113e4` | 2026-11-26 |

`npm run gen:reference` turns these snapshots into `docs/reference/`; CI fails when the committed pages and
the snapshots disagree. The snapshots are byte copies, but the generator drops references to internal design
notes and decision records from prose descriptions, because those do not belong on the public site.
