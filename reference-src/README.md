# Reference snapshots

Do not edit these files by hand. `npm run sync:reference` rewrites them from the public repositories.

| Source | Repository | Commit | Synced |
|---|---|---|---|
| `schemas/*.json`, `examples/*.yaml` | [`stardelt/stardelt` `operator/`](https://github.com/stardelt/stardelt/tree/main/operator) | `b12a3433c6e6c669d1f3f1600fa937825e77eeec` | 2026-11-28 |
| `nova-openapi.json` | [`stardelt/stardelt` `nova/`](https://github.com/stardelt/stardelt/tree/main/nova) | `346bbf78ee3f501ff4c08afd662579c696a6b5bb` | 2026-11-28 |
| `cli.json` | [`stardelt/stardelt` `python/`](https://github.com/stardelt/stardelt/tree/main/python) | `02cec71dfed46d2f0666c840411d298ea0436334` | 2026-11-28 |

`npm run gen:reference` turns these snapshots into `docs/reference/`; CI fails when the committed pages and
the snapshots disagree. The snapshots are byte copies, but the generator drops references to internal design
notes and decision records from prose descriptions, because those do not belong on the public site.
