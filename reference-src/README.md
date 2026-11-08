# Reference snapshots

Do not edit these files by hand. `npm run sync:reference` rewrites them from the public repositories.

| Source | Repository | Commit | Synced |
|---|---|---|---|
| `schemas/*.json`, `examples/*.yaml` | [`stardelt/stardelt-operator`](https://github.com/stardelt/stardelt-operator) | `6d4576f424cfaa8a096f52248b8a96eab5341715` | 2026-11-08 |
| `openapi/nova.json` | [`stardelt/stardelt-nova`](https://github.com/stardelt/stardelt-nova) | `a534616439af97b82d6eb59e225f384ae29571a0` | 2026-11-08 |

`npm run gen:reference` turns these snapshots into `docs/reference/`; CI fails when the committed pages and
the snapshots disagree. The snapshots are byte copies, but the generator drops references to internal design
notes and decision records from prose descriptions, because those do not belong on the public site.
