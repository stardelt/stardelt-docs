---
title: "Dashboards: build in dev, promote to prod"
sidebar_label: "Dashboards"
slug: /guides/dashboards
description: "Build a Superset dashboard in dev, export it into a bundle, and let a deploy put the same dashboard in prod with the certified badge."
---

# Dashboards: build in dev, promote to prod

Superset is the BI starter: every stage has its own instance, and a dashboard is charts over the
tables of that stage's catalogs. A dashboard the team relies on belongs in its bundle, as an
unzipped Superset export, so Git holds it beside the pipelines and a pull request shows what changed.
A `production` target is read-only by design: the dashboard's only owner there is Nova's service
user, so people edit in dev and promote the result through the bundle.

## Build it in dev

Open Superset in the dev stage (Nova → **Dashboards**) and sign in with your platform account. Build
the charts and the dashboard on the dev catalog's tables, as in
[Load, transform, and show the result](./load-and-transfer.md). A dashboard is exported by its
Superset id: the number in its URL, `…/dashboard/12/`.

## Export it into the bundle

Run the command inside the bundle directory, from a signed-in session:

```console
$ stardelt dashboards export 12 -o dashboards/shop
stardelt: wrote 8 file(s) to dashboards/shop; databases/ is not stored
```

The command reads the bundle's name and owner group from `bundle.yaml`, and Nova exports only for a
member of that owner group. The result is Superset's own unzipped export (`metadata.yaml`,
`dashboards/`, `charts/`, `datasets/`) with one difference: Nova drops the archive's `databases/`
folder, which holds the stage's connection URI, so no connection address ever reaches Git.

Name the folder under `dashboards:` in `bundle.yaml`:

```yaml
dashboards: [dashboards/shop]
```

Then commit the folder and open a pull request: the export is plain YAML, so the diff shows which
chart, dataset and dashboard changed.

## Deploy it

`plan` and `deploy` import the `dashboards:` folders along with the pipelines. A plan shows one row
per folder:

```console
$ stardelt bundle plan . -t prod
{"action": "would-import-dashboards", "name": "dashboards/shop", "dashboards": 1, "kind": "Dashboard"}
```

`deploy` imports the folders after the pipelines and names the target's databases it mapped:

```console
$ stardelt bundle deploy . -t prod
{"action": "created", "name": "daily", "kind": "Pipeline"}
{"action": "imported-dashboards", "name": "dashboards/shop", "dashboards": 1, "databases": ["Trino_Gold"], "kind": "Dashboard"}
{"action": "recorded", "id": 7}
```

Each dataset is remapped to the target's `Trino <catalog>` database, the target's own connection, so
the dashboard reads the prod catalog of the same name; catalog and schema names stay as exported.

With `--prune`, the deploy also removes the dashboards this bundle and target imported that no folder
names any more: `would-delete-dashboards` in a plan, `deleted-dashboards` in a deploy. A dashboard
without this bundle's stamp is never pruned.

## The certified badge

Every imported dashboard is stamped with where it came from: `certified_by: stardelt bundle
<bundle>` and `certification_details: <target> @ <commit> by <ownerGroup>`. Superset shows that stamp
as its **certified** badge on the dashboard, so a person in prod sees which dashboards are the
bundle's official ones and which commit they came from. A dashboard without this stamp is never
pruned or replaced by a deploy.

## One dashboard by hand

For a dashboard outside a bundle, the two standalone commands do the same work:

```console
$ stardelt dashboards export 12 -o dashboards/shop
$ stardelt dashboards import dashboards/shop --bundle shop --owner-group shop-team --target prod
stardelt: imported 1 dashboard file(s) for prod; databases: Trino_Gold
```

`export` has the same owner-group rule; `import` points every dataset at the target's database and
stamps each dashboard the same way. `--commit SHA` adds the commit to the stamp, and `--overwrite`
replaces a dashboard of the same name.
