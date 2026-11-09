# Reference snapshots

Do not edit these files by hand. `npm run sync:reference` rewrites them from the public repositories.

| Source | Repository | Commit | Synced |
|---|---|---|---|
| `schemas/*.json`, `examples/*.yaml` | [`stardelt/stardelt-operator`](https://github.com/stardelt/stardelt-operator) | `9a57e159e1a768dc950de8fe41918c7dfb5e1573` | 2026-11-09 |
| `nova-openapi.json` | [`stardelt/stardelt-nova`](https://github.com/stardelt/stardelt-nova) | `6b5a28e80892f13270097c07d63bdac3c42faa68` | 2026-11-09 |

`npm run gen:reference` turns these snapshots into `docs/reference/`; CI fails when the committed pages and
the snapshots disagree. The snapshots are byte copies, but the generator drops references to internal design
notes and decision records from prose descriptions, because those do not belong on the public site.
