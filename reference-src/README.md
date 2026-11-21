# Reference snapshots

Do not edit these files by hand. `npm run sync:reference` rewrites them from the public repositories.

| Source | Repository | Commit | Synced |
|---|---|---|---|
| `schemas/*.json`, `examples/*.yaml` | [`stardelt/stardelt` `operator/`](https://github.com/stardelt/stardelt/tree/main/operator) | `36ce29c74ea5e820e4dbdc51f1efc49df0eb9021` | 2026-11-21 |
| `nova-openapi.json` | [`stardelt/stardelt` `nova/`](https://github.com/stardelt/stardelt/tree/main/nova) | `a95706178d211c1e17e772282ca04c1072d6ebbc` | 2026-11-21 |

`npm run gen:reference` turns these snapshots into `docs/reference/`; CI fails when the committed pages and
the snapshots disagree. The snapshots are byte copies, but the generator drops references to internal design
notes and decision records from prose descriptions, because those do not belong on the public site.
