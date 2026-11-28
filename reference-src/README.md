# Reference snapshots

Do not edit these files by hand. `npm run sync:reference` rewrites them from the public repositories.

| Source | Repository | Commit | Synced |
|---|---|---|---|
| `schemas/*.json`, `examples/*.yaml` | [`stardelt/stardelt` `operator/`](https://github.com/stardelt/stardelt/tree/main/operator) | `b12a3433c6e6c669d1f3f1600fa937825e77eeec` | 2026-11-28 |
| `nova-openapi.json` | [`stardelt/stardelt` `nova/`](https://github.com/stardelt/stardelt/tree/main/nova) | `3d31c65876175171837d38b58e6eadb1d3ef5ae0` | 2026-11-28 |
| `cli.json` | [`stardelt/stardelt` `python/`](https://github.com/stardelt/stardelt/tree/main/python) | `b6b5af24a65c4d22bed4bfc425a54ef77faecdfc` | 2026-11-28 |

`npm run gen:reference` turns these snapshots into `docs/reference/`; CI fails when the committed pages and
the snapshots disagree. The snapshots are byte copies, but the generator drops references to internal design
notes and decision records from prose descriptions, because those do not belong on the public site.
