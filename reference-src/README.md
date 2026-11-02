# Reference snapshots

Do not edit these files by hand. `npm run sync:reference` rewrites them from the public repositories.

| Source | Repository | Commit | Synced |
|---|---|---|---|
| `schemas/*.json`, `examples/*.yaml` | [`stardelt/stardelt-operator`](https://github.com/stardelt/stardelt-operator) | `dddabbe4b7abcf183ad850a5f7e6a04729e44ceb` | 2026-11-02 |
| `openapi/nova.json` | [`stardelt/stardelt-nova`](https://github.com/stardelt/stardelt-nova) | `c204344073eb85751f1b09621b4001cf8bd447fe` | 2026-11-01 |

`npm run gen:reference` turns these snapshots into `docs/reference/`; CI fails when the committed pages and
the snapshots disagree. The snapshots are byte copies, but the generator drops references to internal design
notes and decision records from prose descriptions, because those do not belong on the public site.
