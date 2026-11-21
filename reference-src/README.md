# Reference snapshots

Do not edit these files by hand. `npm run sync:reference` rewrites them from the public repositories.

| Source | Repository | Commit | Synced |
|---|---|---|---|
| `schemas/*.json`, `examples/*.yaml` | [`stardelt/stardelt` `operator/`](https://github.com/stardelt/stardelt/tree/main/operator) | `85b1765805e9a511cfacd7fa7280c704147750a0` | 2026-11-21 |
| `nova-openapi.json` | [`stardelt/stardelt` `nova/`](https://github.com/stardelt/stardelt/tree/main/nova) | `5c991347f1f0a86ab015c395482b0c1f94cc66a8` | 2026-11-21 |

`npm run gen:reference` turns these snapshots into `docs/reference/`; CI fails when the committed pages and
the snapshots disagree. The snapshots are byte copies, but the generator drops references to internal design
notes and decision records from prose descriptions, because those do not belong on the public site.
