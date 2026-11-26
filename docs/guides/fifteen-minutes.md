---
title: "A complete example in 15 minutes"
sidebar_label: "A complete example in 15 minutes"
slug: /guides/fifteen-minutes
description: "Clone the shop bundle, deploy it into your own development stage, run it, change it and tear it down, with every command and its output."
---

# A complete example in 15 minutes

One path through the platform, with nothing left out: clone a bundle from Git, deploy three pipelines
into a stage of your own, run them, query what they wrote, change a file and read the plan, then remove
the pipelines again. Every command below and every line it printed was measured on 2026-11-25 against
the project's development install (one Kubernetes node, 32 GiB of memory, Kubernetes 1.37, `stardelt`
0.4.3). It takes about four minutes of commands, nearly two of them the three pipeline runs.

**Have ready:** an install with sign-in, the `stardelt` command line ([install and sign in](./python)),
and the catalogs `bronze`, `silver` and `gold`. The bundle names the group `demo` as its owner, so you
are a member of that group, and the group has its pipeline principal: in the platform checkout,
`make demo-access YES=1 GROUP=demo MEMBERS=<your sign-in name>` creates both and checks the catalogs.
[Trying it in your own stage](./publish-pipelines#2-try-it-in-your-own-development-stage) is the same
step for another group.

## 1. Get the bundle

```console
$ git clone https://github.com/stardelt/stardelt
Cloning into 'stardelt'...
$ cd stardelt
```

`demos/examples/shop-bundle/` holds the example. Three kinds of file matter:

- `bundle.yaml` — the bundle's name and owner group, its variables (`schema`, `scale`) and one entry per
  stage. `dev` is `mode: development` with `schema: shop_dev`; `prod` is production, with
  `schema: shop` and `runAs: pipeline-demo`.
- `resources/1-bronze.yaml`, `2-silver.yaml`, `3-gold.yaml` — one pipeline per catalog layer, each a
  list of SQL tasks. `4-graph.yaml` (`shop-4-graph`) is a fourth pipeline, a
  [declarative Spark graph](./spark-pipelines) that runs on the group's Spark Connect server. It was
  added after the outputs below were measured, so on `main` each list of pipelines has a fourth line.
- `sql/*.sql` — the statements those tasks run. `01_schema_bronze.sql` opens with
  `create schema if not exists bronze.${params.schema}`, which is how the target's `schema` becomes a
  schema name.

## 2. Deploy it into your own stage

```console
$ export STARDELT_NOVA_URL=https://alpha.dev.stardelt.io
$ stardelt login
stardelt: Open https://id.alpha.dev.stardelt.io/realms/stardelt/device?user_code=PNCX-LDGA in a browser and approve the code PNCX-LDGA
stardelt: signed in; the sign-in is kept in ~/.config/stardelt/credentials.json
```

Open the link on any device and approve the code; the command waits for it. (Paths here are shortened to
`~`.) `validate` needs no cluster and no sign-in:

```console
$ stardelt bundle validate demos/examples/shop-bundle
dev (development): shop-1-bronze, shop-2-silver, shop-3-gold, shop-4-graph
prod (production): shop-1-bronze, shop-2-silver, shop-3-gold, shop-4-graph
$ stardelt bundle plan demos/examples/shop-bundle -t dev
{"action": "would-create", "name": "dev-product-path-shop-1-bronze", "kind": "Pipeline"}
{"action": "would-create", "name": "dev-product-path-shop-2-silver", "kind": "Pipeline"}
{"action": "would-create", "name": "dev-product-path-shop-3-gold", "kind": "Pipeline"}
$ stardelt bundle deploy demos/examples/shop-bundle -t dev
{"action": "created", "name": "dev-product-path-shop-1-bronze", "kind": "Pipeline"}
{"action": "created", "name": "dev-product-path-shop-2-silver", "kind": "Pipeline"}
{"action": "created", "name": "dev-product-path-shop-3-gold", "kind": "Pipeline"}
{"action": "recorded", "id": 2}
```

Two things in those names come from the target. The prefix is `dev-<your sign-in name>-` — `product-path`
here, yours in your run — because `dev` is `mode: development`: two people can deploy one bundle at the
same time without touching each other's pipelines, and the development deploy drops every schedule, so
nothing starts on its own. The schema is `shop_dev` rather than `shop` because `targets.dev.variables`
says so, so the tables land in `bronze.shop_dev`, `silver.shop_dev` and `gold.shop_dev` while the live
`shop-*` pipelines keep `shop`. The pipeline files say `viewers: [visitors]`, and a development deploy
keeps that: your three pipelines are visible to visitors while they exist. The last step removes them.

## 3. Run it and look

```console
$ stardelt bundle run demos/examples/shop-bundle -t dev
{"action": "ran", "name": "dev-product-path-shop-1-bronze", "runId": "manual__2026-11-25T04:29:48.155803+00:00", "state": "success"}
{"action": "ran", "name": "dev-product-path-shop-2-silver", "runId": "manual__2026-11-25T04:30:29.207997+00:00", "state": "success"}
{"action": "ran", "name": "dev-product-path-shop-3-gold", "runId": "manual__2026-11-25T04:31:00.292233+00:00", "state": "success"}
```

The three run in name order and each line appears when its run ends: about 30 to 45 seconds each, because
the bronze pipeline generates 200 000 order lines inside the query engine. Run it within a minute of the
deploy and it may answer `the scheduler has not loaded this pipeline yet (HTTP 409)`; wait a minute and
run it again.

```console
$ stardelt bundle summary demos/examples/shop-bundle -t dev
{"name": "dev-product-path-shop-1-bronze", "kind": "Pipeline", "revision": "fcb1c0f910ee1dd488cfacb357250cb6ed5189fd", "deployedBy": "product-path", "deployedAt": "2026-11-25T04:28:44Z"}
{"name": "dev-product-path-shop-2-silver", "kind": "Pipeline", "revision": "fcb1c0f910ee1dd488cfacb357250cb6ed5189fd", "deployedBy": "product-path", "deployedAt": "2026-11-25T04:28:45Z"}
{"name": "dev-product-path-shop-3-gold", "kind": "Pipeline", "revision": "fcb1c0f910ee1dd488cfacb357250cb6ed5189fd", "deployedBy": "product-path", "deployedAt": "2026-11-25T04:28:45Z"}
$ stardelt sql "SELECT count(*) FROM bronze.shop_dev.order_lines"
_col0
200000
```

`summary` reads only: each pipeline, the Git revision it was deployed from, who deployed it and when.
The number is the `scale` the `dev` target sets. In Nova, the [catalog](./catalog) page lists
`bronze.shop_dev` with its tables and columns, and the [query log](./query-log) shows the statements the
runs and this query sent.

## 4. Open a notebook

JupyterHub ships a notebook that is already wired to the platform:
`platform/images/jupyter/notebooks/warehouse-quickstart.ipynb`. It queries Trino as the person signed in
to the hub — `SELECT current_user` and the claim behind it — and writes a small table back through the
same grant. Open it from JupyterLab and run the cells; the schema of the shop is there to query in the
same way. One thing to keep in mind: every notebook on the install shares one Spark driver, so read
[Limits](./spark#limits) before you hand a large job to `spark`.

## 5. Change something and see the plan

Add a column to `sql/10_daily_revenue.sql` (after `revenue`, `count(distinct l.customer_id) as
customers`), then ask what a deploy would change:

```console
$ stardelt bundle plan demos/examples/shop-bundle -t dev --diff
--- dev-product-path-shop-3-gold tasks (deployed)
+++ dev-product-path-shop-3-gold tasks (bundle)
@@ -1,6 +1,9 @@
 - name: schema
-  sql: create schema if not exists gold.${params.schema}
+  sql: |
+    create schema if not exists gold.${params.schema}
 - name: daily_revenue
-  sql: |-
+  dependsOn:
+  - schema
+  sql: |
     -- Rebuilt on every run (the dbt version of the shop merges the last three days instead).
     create or replace table gold.${params.schema}.daily_revenue as
@@ -9,12 +12,13 @@
         count(*) as order_lines,
         sum(l.quantity) as units,
-        sum(l.quantity * p.unit_price) as revenue
+        sum(l.quantity * p.unit_price) as revenue,
+        count(distinct l.customer_id) as customers
     from silver.${params.schema}.stg_order_lines l
     join silver.${params.schema}.stg_products p on p.product_id = l.product_id
     group by l.order_date
+- name: customer_ltv
   dependsOn:
   - schema
-- name: customer_ltv
-  sql: |-
+  sql: |
     -- Window functions: each customer's lifetime value, their rank, and the share of revenue the best customers make up.
     create or replace table gold.${params.schema}.customer_ltv as
@@ -44,8 +48,8 @@
     from silver.${params.schema}.stg_customers c
     join per_customer pc on pc.customer_id = c.customer_id
+- name: product_mix
   dependsOn:
   - schema
-- name: product_mix
-  sql: |-
+  sql: |
     create or replace table gold.${params.schema}.product_mix as
     select
@@ -60,4 +64,2 @@
     join silver.${params.schema}.stg_products p on p.product_id = l.product_id
     group by p.product_id, p.product_name, p.category
-  dependsOn:
-  - schema
{"action": "would-update", "name": "dev-product-path-shop-1-bronze", "changes": ["deployment"], "kind": "Pipeline"}
{"action": "would-update", "name": "dev-product-path-shop-2-silver", "changes": ["deployment"], "kind": "Pipeline"}
{"action": "would-update", "name": "dev-product-path-shop-3-gold", "changes": ["tasks", "deployment"], "kind": "Pipeline"}
```

The whole `tasks` field is printed, so the diff is longer than the change; the line that carries it is
`customers`. All three pipelines are `would-update` because the deployment stamp carries the Git
revision, and an uncommitted file makes it differ. A pipeline changed by hand after its deploy is refused
instead where the bundle sets `drift: block`, unless the deploy passes `--accept-drift`; see
[Keep Git and the stage in step](./publish-pipelines#5-keep-git-and-the-stage-in-step). Undo the edit
before the next step.

## 6. Tear it down

```console
$ stardelt bundle destroy demos/examples/shop-bundle -t dev --yes
{"action": "deleted", "name": "dev-product-path-shop-1-bronze", "kind": "Pipeline"}
{"action": "deleted", "name": "dev-product-path-shop-2-silver", "kind": "Pipeline"}
{"action": "deleted", "name": "dev-product-path-shop-3-gold", "kind": "Pipeline"}
$ stardelt bundle summary demos/examples/shop-bundle -t dev
stardelt: nothing is deployed from this bundle target
```

`destroy` removes exactly the pipelines stamped with this bundle, this target and your own prefix — not
anything else, and not the files of the bundle. The tables the runs wrote stay: `bronze.shop_dev` still
answered 200 000 rows after the tear-down. A `write` grant lets you create and replace tables, not drop
them (`PERMISSION_DENIED: Cannot drop table bronze.shop_dev.order_lines` was measured), so an
administrator removes the three `shop_dev` schemas when the space is needed.

## What this example does not show

- **The assistant.** Ask needs a `ModelEndpoint` ([connect a model endpoint](./models)), and the
  development install has none, so no AI feature is on.
- **A scheduled run.** The `dev` target has no schedule and the development deploy drops the one in the
  pipeline files; schedules are what the `prod` target is for ([Schedule and run](./schedule)).
- **The public demo's own data.** This deploys its own copy of the shop, under `shop_dev`, with its own
  pipelines; it never touches the live `shop-*` ones.
