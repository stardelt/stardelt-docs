---
title: "Deployments"
sidebar_label: "Deployments"
slug: /guides/deployments
---

# Deployments

The **Deployments** page answers one question for the whole stage: what did `stardelt bundle deploy`
publish, and does it still match Git? It groups the pipelines by bundle and stage and shows the commit
each one runs, who deployed it, when, and whether anyone changed it afterwards.

The page is for administrators: it is in the **Admin** group of the navigation, and only someone with
administrator rights sees that group.

## What the page shows

Every pipeline that a bundle deploy stamped, one section per bundle and stage. The sections are sorted
by bundle name and then by target, and the pipelines inside a section by name. A pipeline made in the
interface or with `stardelt apply` carries no stamp, so it is not in a section; the **Not in Git** card
above the sections names it instead.

The page re-reads the pipeline list every 30 seconds, so a deploy from a terminal shows up without a
reload.

## A stage

A section is headed `<bundle> · <target>`, for example `shop · prod`. Under the heading one line
summarises the section: how many pipelines it holds and which commit they run, as `N pipelines · commit
<short sha>`. When the pipelines in a section run different commits, the line says `N different commits`
instead, and when none of them recorded a commit it says `no commit recorded`.

Six columns follow. Hovering a cell gives the full value where the page shortens it.

- **Pipeline** — the pipeline's name, a link to its page.
- **State** — the same state badge the Pipelines page uses.
- **Commit** — the short commit that was deployed, the full one in the tooltip. A dash means the deploy
  recorded no commit, which happens when the bundle directory was outside a Git checkout.
- **Deployed by** — who ran the deploy.
- **Deployed** — how long ago, the exact time in the tooltip.
- **Since then** — **Changed since deploy** when someone edited the pipeline in Nova after the deploy, and
  a dash otherwise. That badge means Git holds the older version, so the next deploy of the bundle
  overwrites the edit.

## Not in Git

The **Not in Git** card is a warning, and it appears only when it has something to say. Its sentence is
`A rebuild of this stage from Git would not bring these back. Add them to a bundle, or export them with
stardelt export.` Below it the card lists two things:

- the pipelines with no bundle stamp, each linked to its page — they were made in the interface or with
  `stardelt apply`;
- how many deployed pipelines were changed since deploy.

To keep them, add them to a bundle with `stardelt bundle generate`, or export them with
`stardelt export` and commit the result. The page of a pipeline changed after its deploy says
**Changed since the last deploy** under **Deployed from**.

## Compare two stages

When the install is configured with peer stages, a row of **Compare with** buttons sits above the
sections, one per peer, named as the configuration names it. Choose one and the page asks that stage for
its pipelines, using your own sign-in there, and shows the two side by side. Choose the same button
again to close the comparison.

The comparison table has five columns: `Bundle · stage`, `Pipeline`, `Here`, a column named after the
peer, and `Status`. `Here` and the peer column show the short commit, `—` when none was recorded, and
`· changed` after a commit when that pipeline was edited after its deploy. The status is one of:

- `only here` — this stage has the pipeline, the peer does not.
- `only in <peer>` — the peer has it, this stage does not.
- `changed in <peer>` — both have it, and the peer's copy was edited after its deploy.
- `same` — both run the same commit.
- `different commit` — both have the pipeline and run different commits.

When a row's commit differs and the stage has a repository URL, the row also carries a **Promote via
pull request** link. It opens your forge's compare page from the peer's commit to this stage's commit, so
you can open a merge request that brings the change across. Nova compares commits only; it reads nothing
about Git ancestry and deploys nothing to the peer.

## When nothing has been deployed

A stage where no deploy has run shows this card: `Nothing was deployed from a bundle yet. Pipelines made
here or with stardelt apply are on the Pipelines page.` The link takes you to the **Pipelines** page,
which lists every pipeline on the stage whether it came from Git or not.

## For developers

`GET /api/pipelines` is the whole answer behind the page: each pipeline carries a `deployment` stamp
with `bundle`, `target`, `revision`, `deployedBy`, `deployedAt` and `modified`, and the stamp is written
by `stardelt bundle deploy` as described in [Publish pipelines from
Git](/docs/guides/publish-pipelines). `GET /api/stages/compare?peer=<name>` answers one comparison,
forwarding your own token to the peer, and returns `status: ok`, `unauthorized` or `unreachable`.
