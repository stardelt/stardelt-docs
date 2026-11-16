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

## Verifying an image pin

A pin's verify answers two different questions: *which commit is in this image?* and *does that
commit's behavior run?* Answer the first with the image's own label, not with `grep` on a Rust
binary — rustc lowers a `match` on short strings to 8-byte compares, so the literal is not stored
contiguously and a match is a length-dependent accident (`sql_explain` and `platform_status` are
absent from an image that serves them; `catalog_search` happens to be present).

```bash
docker buildx imagetools inspect ghcr.io/stardelt/nova:dev@sha256:<digest> --format '{{json .Image}}' \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["config"]["Labels"]["org.opencontainers.image.revision"])'
# expect: the full commit sha the image was built from
```

Answer the second through the running pod — an endpoint, a served page, a tool list — never by
reading the binary. Read the `Pin it:` line that `scripts/pin-image.sh` prints for the digest; the
`Digest:` line in a build log is the export digest and is not the image manifest.

### Never retype a digest

A digest prefix typed by hand is a trap: one missing character turns a correct build into a `0`
that reads as "the pin is missing" (stardelt-platform#1569: `73aa5fae130c60da` is one `e` short
of the access-sync constant `73aa5faee130c60da`, so the grep answered 0 on the build that carries
it). Derive the literal from the constant, then match it:

```bash
l=$(git -C ../stardelt-operator show origin/main:crates/stardelt-operator/src/access_sync.rs \
    | sed -n 's/^pub const IMAGE.*sha256:\([0-9a-f]\{16\}\).*/\1/p')
kubectl -n stardelt exec deploy/stardelt-operator -- grep -ac "$l" /usr/local/bin/stardelt-operator
# expect: 1
```

Or match the whole reference and print what matched, which cannot be off by a character:

```bash
kubectl -n stardelt exec deploy/stardelt-operator -- \
  grep -ao 'python:3\.13\.16-slim-bookworm@sha256:[0-9a-f]*' /usr/local/bin/stardelt-operator
```

Say which string you counted and why it is the change's own, and use `grep -ao … | wc -l` when
the literal can occur more than once on the line `grep -c` counts.

### A frontend bundle is minified

Counting a bare string in a served asset answers nothing. `grep -c` counts *lines*, and a minified
bundle is a few hundred very long lines, so the same number can mean different code on every
build. The same literal also usually lives in more than one component. Measured 2026-11-15 on the
served bundle of a Nova pin: `grep -c` on one string gave 1, `grep -o … | wc -l` gave 3, and 3 was
right — three components in the source carry it. A pin ticket that asked for 0 could never pass.

Assert one of these instead:

- **A sentence only that change renders** — the UI text a person reads, for example
  `No questions yet`. It does not collide with another component and it is what the feature is.
- **The occurrences in both builds** — count with `grep -o`, and name both numbers in the ticket:

  ```console
  $ curl -s https://alpha.dev.stardelt.io/assets/index-<old>.js -o /tmp/old.js
  $ curl -s https://alpha.dev.stardelt.io/assets/index-<new>.js -o /tmp/new.js
  $ grep -Fo '<literal>' /tmp/old.js | wc -l   # before
  $ grep -Fo '<literal>' /tmp/new.js | wc -l   # after
  ```

Use `grep -F` when the literal carries `[`, `]`, `?` or another regular-expression character;
without it the pattern is a bracket expression and grep prints `Unmatched [`.

A count that does not move between the two builds is not evidence that the change is absent — say
which string you counted and why it is the change's own.

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
> **Pitfalls.** `chart/crds/` is generated. Helm installs CRDs on `install` only, so a *fresh*
> cluster gets them from the chart; on an existing cluster the operator applies the regenerated
> schema when its new image starts. CI enforces the regenerated file with
> `cargo run --bin crdgen && git diff --exit-code`.
>
> **Size.** Small. Branch `feat/platform-namespace`.
