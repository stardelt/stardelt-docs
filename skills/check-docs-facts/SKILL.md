---
name: check-docs-facts
description: Check a documentation page's claims against the code on main and a running install, and report what is stale.
when_to_use: Before you state a fact in a page, when reviewing docs, or when asked to audit a page.
---

# Check the facts in a page

Docs about security and cluster state go stale within hours. Check; do not assume.

## Steps

1. Fetch first: `git -C <repo> fetch origin`. Read `origin/main`, because a local checkout may be behind.
2. List each checkable claim: a name, default, command, version, "built" or "not yet".
3. Check each one at the source:

   | Claim | Where |
   |---|---|
   | Defaults and flags | `stardelt-platform/chart/values.yaml`, `helm-values/`, `Makefile` |
   | What renders | `helm template` on the chart |
   | Resources and fields | `stardelt-operator/crates/stardelt-operator/src/crd.rs` |
   | Routes | `stardelt-nova/openapi/nova.json` |
   | Screen labels | `stardelt-nova/frontend/src/components/Shell.tsx` |
   | Python helpers | `stardelt-python/stardelt/` |
   | "Exists or not" | `git grep` across all repositories |
   | Open or fixed | the linked issue's state, then the code itself |

4. For runtime claims, use a running install and read-only commands (`kubectl get`, `helm list`). Change nothing.
5. Install paths differ. Say which path a claim holds for: `make platform`, the umbrella chart or the operator.

## Report

For each stale claim give the page and line, what it says, what is true and the evidence. Separate "verified"
from "could not verify" and never present a guess as a fact.

## Common traps

- A closed issue does not prove the code changed: read the code.
- A commit on a branch is not on `main`.
- A setting in `values.yaml` may be overridden in `helm-values/` on another path.
- Do not put a live cluster's hostnames or secrets in a page or a report.
