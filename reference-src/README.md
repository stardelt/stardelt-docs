# Reference snapshots

Do not edit these files by hand. `npm run sync:reference` rewrites them from the public repositories.

| Source | Repository | Commit | Synced |
|---|---|---|---|
| `schemas/*.json`, `examples/*.yaml` | [`stardelt/stardelt-operator`](https://github.com/stardelt/stardelt-operator) | `2f43c0d1830b36e866cd966f6fc7f923448cee09` | 2026-11-14 |
| `nova-openapi.json` | [`stardelt/stardelt-nova`](https://github.com/stardelt/stardelt-nova) | `310265463fab81686d74b1ff51ef1bf6d9347004` | 2026-11-14 |

`npm run gen:reference` turns these snapshots into `docs/reference/`; CI fails when the committed pages and
the snapshots disagree. The snapshots are byte copies, but the generator drops references to internal design
notes and decision records from prose descriptions, because those do not belong on the public site.
