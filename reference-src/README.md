# Reference snapshots

Do not edit these files by hand. `npm run sync:reference` rewrites them from the public repositories.

| Source | Repository | Commit | Synced |
|---|---|---|---|
| `schemas/*.json`, `examples/*.yaml` | [`stardelt/stardelt-operator`](https://github.com/stardelt/stardelt-operator) | `35acc5c10ebb4b51360cc717d9c651180191bfc5` | 2026-11-09 |
| `nova-openapi.json` | [`stardelt/stardelt-nova`](https://github.com/stardelt/stardelt-nova) | `28ba5b7ef85b1c0121ed1566711a25ef4a952afc` | 2026-11-09 |

`npm run gen:reference` turns these snapshots into `docs/reference/`; CI fails when the committed pages and
the snapshots disagree. The snapshots are byte copies, but the generator drops references to internal design
notes and decision records from prose descriptions, because those do not belong on the public site.
