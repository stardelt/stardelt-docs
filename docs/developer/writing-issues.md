---
title: "Writing a good issue"
sidebar_label: "Writing a good issue"
slug: /developer/writing-issues
---

# Writing a good issue

An issue is ready when someone who has never seen the repository, whether a new contributor or an AI
assistant with no other context, can do the work **without asking a question**. The
[implementation ticket template](https://github.com/stardelt/.github/blob/main/.github/ISSUE_TEMPLATE/implementation_ticket.md)
gives the shape. Label a finished one `ready-to-implement`. If you cannot fill a section, list the gap
under *Open questions* and leave the label off.

A bug report does not need all this: what you ran, what you expected and what happened is enough.

## What makes it implementable

| Rule | Why |
|---|---|
| Name the **file, symbol and line**, never "the controller" | Nobody can search for what you did not name |
| Give **before and after** for any edit under about 15 lines | Removes interpretation |
| Say what **not** to touch, and "no new dependencies" unless one is needed | Keeps the change reviewable |
| Give the **exact command and expected output** to verify | "It works" cannot be checked |
| Make acceptance criteria **observable** | Each one maps to a test or a command |
| Name **generated files** and what regenerates them | The most common silent breakage |
| One issue is one pull request, up to about 150 lines | Small changes get merged |
| **Run every command yourself** first | A command that fails as written teaches people to improvise |
| **Paste, don't point:** copy text from other repositories into the issue; give tests as code | A pointer forces a guess |
| Say **where** an addition goes, and give concrete output (`2 passed; 0 failed`) | A loose test filter can match something else |
| **Try it out:** give the issue to someone or something with no context, and ask what they had to guess | It finds the gaps before an implementer does |

Public issues describe the work and do not compare products.

## Example

> **operator/crd: make the platform install namespace configurable**
>
> **Why.** `PlatformInstance` always installs into the namespace `stardelt`, because the value is
> hard-coded in the reconciler. A second platform on the same cluster cannot be expressed.
>
> **Current behaviour.** `reconcile_platform` passes the literal `"stardelt"` to `apply_plan`
> (`crates/stardelt-operator/src/controller.rs`, the second argument of `apply_plan(&ctx, "stardelt", …)`).
> `PlatformInstanceSpec` (`crd.rs`) has no namespace field.
>
> **Required change.**
>
> 1. `crd.rs`: add to `PlatformInstanceSpec`
>    ```rust
>    /// Namespace the platform's own components are installed into.
>    #[serde(default = "default_namespace")]
>    pub namespace: String,
>    ```
>    and, next to `default_true`, `fn default_namespace() -> String { "stardelt".into() }`.
> 2. `controller.rs`, `reconcile_platform`: replace the literal `"stardelt"` with `&instance.spec.namespace`.
> 3. Regenerate the CRDs: `cargo run --bin crdgen`, and commit `chart/crds/stardelt.io_platforminstances.yaml`.
> 4. `crd.rs` tests: add `platform_instance_namespace_defaults_to_stardelt`, which deserializes a
>    `PlatformInstance` without `spec.namespace` and asserts `"stardelt"`, and one that sets
>    `spec.namespace: lab` and asserts `"lab"`.
>
> **Do not.** Touch `Lakehouse`; validate or create the namespace; rename existing fields.
>
> **Verify.**
> ```bash
> cargo fmt --check && cargo clippy --all-targets -- -D warnings
> cargo test platform_instance_namespace      # expect: 2 passed
> git diff --stat chart/crds                  # expect: only stardelt.io_platforminstances.yaml changed
> ```
>
> **Acceptance.** ☐ both tests pass ☐ an unmodified `PlatformInstance` still reconciles into `stardelt`
> ☐ the generated CRD lists `spec.namespace` with default `stardelt`.
>
> **Pitfalls.** `chart/crds/` is generated. Helm installs CRDs on `install` only, so an existing cluster
> needs `kubectl apply --server-side -f chart/crds/`.
>
> **Size.** Small. Branch `feat/platform-namespace`.
