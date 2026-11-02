# Reference snapshots

Do not edit these files by hand. `npm run sync:reference` rewrites them from the public repositories.

| Source | Repository | Commit | Synced |
|---|---|---|---|
| `schemas/*.json`, `examples/*.yaml` | [`stardelt/stardelt-operator`](https://github.com/stardelt/stardelt-operator) | `6ff217782adec95cee381d2e1848a1411a71b157` | 2026-11-02 |
| `openapi/nova.json` | [`stardelt/stardelt-nova`](https://github.com/stardelt/stardelt-nova) | `a5de91f6ce76a8ee73af66e62f88e1f204c3d0db` | 2026-11-02 |

`npm run gen:reference` turns these snapshots into `docs/reference/`; CI fails when the committed pages and
the snapshots disagree. The snapshots are byte copies, but the generator drops references to internal design
notes and decision records from prose descriptions, because those do not belong on the public site.
