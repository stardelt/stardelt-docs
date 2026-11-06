---
name: change-resource
description: Change a stardelt custom resource (Pipeline, Catalog, Lakehouse and others) and regenerate what depends on it.
when_to_use: Changing a type or field in stardelt-operator's crd.rs, or its validation.
---

# Change a resource

Full recipe: `docs/developer/recipes.md`, "Change a resource".

## Steps

1. In `stardelt-operator`, change the type in `crates/stardelt-operator/src/crd.rs`. Write a doc comment on every
   field, for readers: it becomes the public reference. Add a default so existing resources stay valid.
2. Add tests next to the type: the default, and the new value.
3. Change the controller or planner that uses the field.
4. Regenerate: `cargo run --bin crdgen`. Commit `chart/crds/` and `schemas/`. Never edit them by hand.
5. If `Pipeline` validation changed, keep `dags/stardelt_pipelines/plan.py` in `stardelt-demos` in step with
   `PipelineSpec::validate`.
6. After it reaches `main`, in `stardelt-docs`, run `npm run sync:reference && npm run gen:reference`.

## Check

```bash
cargo fmt --check && cargo clippy --all-targets -- -D warnings
cargo test
cargo run --bin crdgen && git diff --exit-code chart/crds schemas
```

## Watch out

- Helm does not upgrade CRDs. A running cluster needs `kubectl apply --server-side -f chart/crds/`.
- The resources are the product's public surface. A breaking change needs an issue first.
- Do not mention issue numbers or internal notes in doc comments.
