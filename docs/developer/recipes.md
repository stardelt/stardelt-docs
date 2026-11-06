---
title: "Recipes"
sidebar_label: "Recipes"
slug: /developer/recipes
---

# Recipes

The steps for common changes. Each one touches several repositories, and missing a step usually
shows up later somewhere else. Make one pull request per repository, in the order given.

## Change the API

1. **Nova.** Write the handler and add its route in `api_router()` in `backend/src/main.rs`. Use
   `admin_router()` for administrator routes.
2. Annotate it with `#[utoipa::path]`, tag it `public` or `internal`, derive `ToSchema` on its types, and
   register it in `backend/src/openapi.rs`.
3. Serve it in demo mode too (`backend/src/demo.rs`) if the interface uses it.
4. Regenerate and commit the contract:

   ```bash
   UPDATE_OPENAPI=1 cargo test -p stardelt-nova-backend openapi
   ```

5. A breaking change to a `public` route also bumps the version in Nova's backend crate.
6. **Python**, after the Nova change is on `main`, for `public` routes: run
   `python scripts/sync_contract.py` and commit `stardelt/operations.json`.
7. **Docs**, after the Nova change is on `main`: run
   `npm run sync:reference && npm run gen:reference`, and update the guide that describes the behaviour.

## Change a resource

1. **Operator.** Change the type in `crates/stardelt-operator/src/crd.rs`, with a doc comment on every
   field: it becomes the [reference](../reference/resources). Add a default so existing resources stay
   valid, and tests next to the type.
2. Change the controller or planner that uses it.
3. Regenerate and commit:

   ```bash
   cargo run --bin crdgen     # writes chart/crds/ and schemas/
   ```

4. **Demos**, if you changed `Pipeline` validation: keep `dags/stardelt_pipelines/plan.py` in step with
   `PipelineSpec::validate`.
5. **Docs**, after the change is on `main`: run `npm run sync:reference && npm run gen:reference`.
6. **On a running cluster:** Helm does not upgrade CRDs, so run
   `kubectl apply --server-side -f chart/crds/`.

## Add a screen

1. **Nova.** Add the route in `frontend/src/routes/`, register it in `frontend/src/App.tsx`, and add the
   navigation entry in `frontend/src/components/Shell.tsx`.
2. Back it with an API route ([Change the API](#change-the-api)), so it works from scripts too.
3. Try it with `make demo`, and check it with `npm --prefix frontend run build`.
4. **Docs.** Use the same words as the screen, because readers look for the label they see.

## Add or upgrade a service

**Before you start,** open an issue that names the published interface it sits behind and its license.
It has to pass [these criteria](../architecture/services#service-selection-criteria).

**Platform:**

1. Pin the chart in the `Makefile` as `<COMPONENT>_VERSION`.
2. Add `helm-values/<component>.yaml`, with `slim/` overrides if needed for small nodes, and a `step-<component>`
   target. Add a step to `scripts/platform.sh` if it belongs in the default install.
3. Add it to `chart/Chart.yaml` and `chart/values.yaml`, off by default unless it belongs in the core. The
   versions must match: `bash scripts/check-version-parity.sh`.
4. Add a `helm template` step to `.github/workflows/ci.yml`.
5. Generate secrets at install, with `scripts/app-secrets.sh` as the example.
6. Give each new volume a backup, or add an accepted exception: `make verify-backups-all`.

**Operator:**

7. Add the pin to `chart_version` in `planner.rs` and the values to `crates/stardelt-operator/values/`.
   Check with `bash scripts/check-platform-pins.sh`.

**Nova**, if people should see it: add it to the app list in `backend/src/apps.rs`.

**Docs:**

8. Add a page at `docs/services/<component>.md`; the sidebar picks it up. Add a row to
   [Services](../architecture/services).
9. If it signs users in, add it to [per-component sign-in](../architecture/identity-integrations).

**To upgrade only:** Renovate proposes most pins. Read the upstream license and release notes, and update
any copy that CI's version checks name.

## Fix something on both install paths

1. Fix it in `stardelt-platform`, and add a test or check if you can.
2. Look for the same logic in `stardelt-operator`. `crates/stardelt-operator/src/` has copies of scripts,
   and `values/` has copies of settings.
3. Fix the copy in a second pull request, with a test in the crate that pins the behaviour.

## Document a feature

Write the page in the pull request that ships the behaviour, or straight after it. Then:

1. **Choose the place.** Getting started for first steps, guides for working with data, operations for running
   it, architecture for how it fits, services for one component. Reference pages are generated.
2. **Lead with what the reader can do,** then the steps, then the limits. Use the labels on the screen.
3. **Check every claim** against `main` and a running install. Show commands you have run.
4. **Say what is true now.** A limit belongs in a short "Not available yet" list. Something not built belongs
   on the [roadmap](../roadmap), never in a guide.
5. **Leave these out:** issue numbers, milestones, dates of work, who built it, how a decision was made,
   other products, and any mention of internal notes.
6. **Run `npm run build`.** It fails on broken links.
