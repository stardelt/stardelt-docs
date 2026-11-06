---
title: "Contributing"
sidebar_label: "Contributing"
slug: /developer/contributing
---

# Contributing

How a change gets from a branch to `main`. By taking part you agree to the
[Code of Conduct](https://github.com/stardelt/stardelt-docs/blob/main/CODE_OF_CONDUCT.md).

## The two rules

1. **Everything arrives as a pull request.** `main` is protected.
2. **`main` stays installable.** There are no tagged releases yet, so people install from it.

## Branches

Branch from an up-to-date `main`, and name the branch after the change:

| Branch | Use for |
|---|---|
| `feat/<slug>` | new behaviour |
| `fix/<slug>` | a bug fix |
| `docs/<slug>` | documentation only |
| `chore/<slug>` | build, dependencies, tooling |

Open a draft pull request as soon as there is something to look at. Keep it small: one change per pull
request, because small ones get reviewed and large ones stall. Do not rewrite someone else's branch.

## Commits

```text
<type>(<scope>): <what changed>

<why, if the diff does not show it>
```

`type` is `feat`, `fix`, `docs`, `chore`, `refactor` or `test`. `scope` is the area inside the repository,
such as `nova`, `operator` or `chart`. A pull request's title follows the same shape.

## Before you open a pull request

- Run the repository's check from [the table](./index.md#the-repositories), and paste the command and
  its result into the description.
- If a reader would see a difference, update the docs in the same pull request.
- Follow the [recipe](./recipes) if there is one for your change.
- Keep dependencies within the [license policy](../architecture/licenses).

## Review

Expect one maintainer review, about correctness rather than style. There is no fixed response time, so
ping a pull request that has been quiet for a week.

A reviewer asks:

1. Does it do what the description says, no more and no less?
2. Does it change something a user or operator can see? Does it say so?
3. Is there evidence that it works?
4. Does it fit the [rules](./how-it-is-built#rules-that-hold-everywhere) and the license policy?

A change to how the platform is designed starts with an issue, so the discussion happens before the
code. Breaking changes are allowed during pre-alpha, if the title says so and the docs change with them.

## Using an AI assistant

Welcome, on two conditions:

- **Name the model** in the description or with a `Model: <provider>/<model>` trailer, so a reviewer
  knows what to check more closely.
- **You are the author.** Run the checks yourself and answer the review yourself. A green transcript is
  not evidence.

[Skills for AI assistants](./skills) help an assistant follow the project's conventions.

## Writing a ticket

See [Writing a good issue](./writing-issues).

## Releases

No release has been tagged yet. When they start, each repository will tag its own with
[semantic versioning](https://semver.org), and the first tagged release creates the changelog.

CI builds every container image. Merging to `main` publishes `dev`, `main` and an immutable
`sha-<short>` tag, and the job summary prints the digest. Deployments pin the digest:

```bash
kubectl -n stardelt set image deploy/nova nova=ghcr.io/stardelt/nova@sha256:…
```
