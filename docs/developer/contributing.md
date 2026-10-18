---
title: "Contributing & workflow"
sidebar_label: "Contributing"
slug: /developer/contributing
---

# Contributing & workflow

How changes get from a branch to `main` in the stardelt repos: branching, commits, review,
releases, changelog, and upgrades. Read the [master spec](../design/master-spec) first — it is
the source of truth for what stardelt is, and this page only describes *process* around it.

The two invariants everything else follows from:

1. **Nothing is pushed to `main` directly.** Every change arrives as a pull request. (GitHub branch
   protection is not enabled on the repos yet — see [WP-01](../design/execution-plan) — so today this is a
   rule you follow and reviewers check, not one the server enforces.)
2. **`main` is always installable.** If your branch does not build (see [checks](#before-you-open-a-pr)), it does not merge.

## Branching model

Branch from an up-to-date `main`, keep the branch short-lived, name it after the change:

| Branch | Use for | Example |
|---|---|---|
| `feat/<slug>` | new behavior in a product repo | `feat/notebooks-jupyterhub-plug` |
| `fix/<slug>` | bug fix | `fix/navbar-mobile-sidebar-clip` |
| `docs/<slug>` | documentation only | `docs/community-and-gaps` |
| `chore/<slug>` | build, deps, tooling, cleanup | `chore/drop-ozone-refs` |
| `wp/<id>-slug` | a numbered work package from the [execution plan](../design/execution-plan) | `wp/13-install-idempotency` |

Rules:

- **PR-only.** "Never push to `main`" is a hard rule, not etiquette; branch protection is the planned
  enforcement.
- **Draft PRs are welcome.** Open one as soon as there is something to look at; it is the cheapest
  way to get early feedback and it reserves the branch name.
- **One work package at a time.** Small PRs get reviewed; mega-changes stall. Split rather than push
  a 40-file diff.
- **Never rewrite someone else's branch**, including an agent's. Push a follow-up commit or open your
  own PR.
- Delete the branch after merge.

## Commit style

Conventional-ish, one logical change per commit:

```text
<type>(<scope>): <what changed>

<why, if it is not obvious from the diff>
```

| `type` | Meaning |
|---|---|
| `feat` | new behavior |
| `fix` | bug fix |
| `docs` | documentation |
| `chore` | build, dependencies, tooling, cleanup |
| `refactor` / `test` | no behavior change / tests only |

`scope` is the area inside the repo — `nova`, `operator`, `dev`, `playground`, `navbar`. Real
examples from the repos: `feat(operator): CRD types, reconcile planner, controller, chart`,
`chore(nova): type-check only; stop emitting JS artifacts beside sources`,
`docs: reconcile architecture with license policy; add Hetzner dev env`.

- The **PR title** carries the same convention; it becomes the merge commit subject.
- Say **why** in the body when the diff does not explain itself. "What" is in the code.
- If the change came from a model, add a trailer — `Model: <provider>/<model>` — and keep the
  author accountable for it. See the [Code of Conduct](https://github.com/stardelt/stardelt-docs/blob/main/CODE_OF_CONDUCT.md).
- Do not squash history for its own sake; do keep noise commits (`wip`, `typo`) out of the final PR.

## Review expectations

stardelt is early-stage: expect **one maintainer review**, not a committee, and expect the review to
be about correctness rather than style preferences.

What a reviewer looks for:

1. Does it do what the description says — no more, no less?
2. Does it break behavior a reader or operator can see? If so, is that called out?
3. Is there evidence it works (a command, a smoke test, a build)?
4. Does it contradict the [master spec](../design/master-spec) or the [license policy](../architecture/licenses)?
5. Are new dependencies OSI-permissive? (`licenses.md` is authoritative; OpenBao is the single
   documented MPL exception.)

Conventions:

- **No SLA.** Reviews are asynchronous, best-effort. Ping a PR that has gone quiet for a week; that is
  not rude, it is useful.
- **Spec conflicts are resolved in favor of the master spec.** A change that alters the spec needs a PR
  against the spec itself and a discussion period — not a silent divergence in code.
- **Breaking changes are allowed pre-alpha.** Announce them in the PR title/description and in the
  release notes, and update the docs that describe the old behavior in the same PR.
- Write review comments about the change, never about the contributor. The
  [Code of Conduct](https://github.com/stardelt/stardelt-docs/blob/main/CODE_OF_CONDUCT.md) applies to
  review threads.

## Releases and versioning

- **Semantic versioning** (`v<major>.<minor>.<patch>`) and **per-repo tags** — `stardelt-platform`,
  `stardelt-nova`, `stardelt-operator`, `stardelt-demos`, `stardelt-docs` version and release
  independently. A docs fix does not bump the operator.
- **`main` is the delivery channel today.** No release tags have been cut; the project is pre-alpha
  and installs from `main` (`make install`, `make up` for the kind demo). See the
  [roadmap](../roadmap) for the phase gates.
- **`main` is always deployable.** Nothing merges that fails its repo's build check.
- **One deliverable, moved together:** the platform repo pins chart versions in its `Makefile`; a
  version bump there is what changes what an operator installs. This is the install-script path — the
  operator takes over as the control plane in P2 (master spec [§8](../design/master-spec.md#8-sequencing)).
- **Patches flow upstream; no vendored forks** of upstream services (master spec §5). stardelt's own
  images publish to `ghcr.io/stardelt/...`.

## Container images

**CI builds them — a laptop or a cluster node does not.** Each repo that ships an image
(`stardelt-nova`, `stardelt-operator`, `stardelt-platform`) has an `Image` workflow:

| Event | Result |
|---|---|
| Pull request touching the image | image is built, not pushed — a broken Dockerfile fails the PR |
| Merge to `main` | pushed as `dev`, `main` and an immutable `sha-<short>` |
| Tag `v*` | pushed under the tag as well |

The job summary prints the digest. **Deployments pin the digest**, never the moving tag:

```bash
kubectl -n stardelt set image deploy/nova nova=ghcr.io/stardelt/nova@sha256:…
```

A mutable tag is not an upgrade path: the kubelet may keep serving a cached layer, so "the tag moved"
and "the cluster changed" are different events. `make image` in `stardelt-nova` (or `make build-superset-image` in
`stardelt-platform`) still works for local iteration, but nothing in the platform install depends on it.

## Changelog strategy

Two artifacts, different audiences — do not merge them:

| Artifact | Audience | Contents |
|---|---|---|
| **Release notes** (GitHub Releases, one per repo tag) | anyone tracking the repo | breaking / added / changed / fixed / docs, plus a link to the PRs |
| **User-facing changelog** (operator-facing, ships with the release) | someone running stardelt | only what changes for them: install/upgrade commands, CRD fields, chart and image versions, defaults, removed components |

Rules:

- Internals do not belong in the user-facing changelog. Nobody running stardelt cares that a controller
  function was renamed.
- A reader-visible change updates the docs page that describes it **in the same PR** — the docs are part
  of the release, not a follow-up ticket.
- There is no `CHANGELOG.md` yet: the first tagged release creates the user-facing changelog. Until then,
  the commit log and PR descriptions are the changelog.

## Upgrade and migration notes

Where upgrade guidance lives, in order of authority:

1. **Release notes** of the tag you are moving to — an explicit *Upgrade notes* section whenever an
   upgrade is not mechanical.
2. **The docs page of the affected component** ([Services](../architecture/services),
   [Prerequisites](../getting-started/prerequisites)) when the change alters what an operator must
   provide — a new default StorageClass requirement, an ingress change, a renamed Secret.
3. **The [execution plan](../design/execution-plan)** for the work that makes the path trustworthy
   (idempotent install, upgrade test in CI).

How upgrades work today:

- **Platform:** `make upgrade` is `make install` re-run — Helm's `upgrade --install` is idempotent, so
  re-running is the supported path.
- **kind demo:** `make up` is idempotent and skips steps that already succeeded.

Policy:

- Write a **migration guide** only when there is a non-mechanical step: a renamed or restructured CRD
  field, a changed default, a removed component, a data-location change. It is a short, numbered
  procedure with the rollback path, not an essay.
- A chart version bump with no behavior change gets a **one-line upgrade note**, not a guide.
- Never ship an upgrade note that has not been executed against the dev cluster.

## AI-assisted contributions

The maintainer runs an [AI development fleet](./ai-fleet) that implements work packages in these same
repos. Agents follow this page exactly, with one extra guardrail: they never merge, and they never push
to `main`.

If you contribute with a model:

- **Tag the model** (PR description or commit trailer) — the reviewer calibrates verification effort
  based on what produced the change.
- **Verify before you open the PR** — run the repo's build check yourself. A green agent transcript is
  not evidence.
- **Answer the review yourself.** The model does not read the review thread; you do.

## Before you open a PR

| Repo | Check |
|---|---|
| `stardelt-docs` | `npm run build` (zero broken links) |
| `stardelt-nova` | `cargo check`, then `npm --prefix frontend run build` |
| `stardelt-operator` | `cargo check` |
| `stardelt-platform` | `make lint` (`bash -n` + ShellCheck on the scripts); `helm template` / `make chart-template` for changed values or chart |
| `stardelt-demos` | `make up && make smoke` |

Paste the command and its result in the PR description. That one line is what turns a draft into
something a maintainer can merge.
