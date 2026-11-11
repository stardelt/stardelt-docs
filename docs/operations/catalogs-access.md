---
title: "Catalogs and access"
sidebar_label: "Catalogs and access"
slug: /operations/catalogs-access
---

# Catalogs and access

As a platform administrator you decide who may use a catalog. This page describes the
**Catalogs** page, the grants behind it, what happens after you save, and how a team space is created.

## Who can do what

Groups are the only subjects. They come from your sign-in provider, and stardelt never creates a group
or a person: a grant names a group, and everyone in that group holds what the grant declares.

Permissions are catalog-wide today. There is no table-level grant, no row or column policy and no
"deny": a group either holds a verb on the whole catalog or it does not hold it. The five verbs are:

| Verb | What it lets the group do |
|---|---|
| `browse` | List the catalog and its schemas and tables |
| `select` | Read rows |
| `write` | Add and change data |
| `create` | Create schemas and tables |
| `manage` | Change who may use this catalog: grant and revoke the other verbs. It grants no access to the data itself |

A grant also carries the weaker ones: `write` includes `select`, and `select` and `create`
include `browse`. `manage` includes none of them, which is why an owner without another grant cannot
read the tables.

Platform administrators can do everything in every catalog and are not listed anywhere on the page, so a
catalog with no grants is not open to everyone — administrators still reach it.

[Security model](../architecture/security-model) describes what the platform enforces and which parts an
install without sign-in does not. [The catalog and the table page](../guides/catalog) is the reader's
view of the same catalogs.

## The Catalogs page

**Catalogs** under **Admin** in the left navigation is at `/admin/catalogs` and only a platform
administrator can open it. Its heading is **Catalogs**, and the sentence under it says that platform administrators can do
everything in every catalog and are not listed, and that permissions are catalog-wide today.

The same rows are shown two ways, chosen with **By catalog** and **Matrix** at the top:

- **By catalog** answers what one catalog allows and how its last sync went, one row per catalog:
  - **Catalog** — the name, its layer badge and its display name.
  - **Owner** — the one owning group, or a dash.
  - **Phase** — `Ready` or `Invalid`, `Unknown` before the sync has seen the catalog. Pointing at the
    badge shows the reason the sync gave.
  - **Access** — `1 group` or `N groups`, a **Managed access** badge when the catalog has it, a
    **Grants** disclosure that lists `group: verb, verb` per group, and the state of your last save.
  - **Conditions** — `CatalogReady`, `GrantsReady` and `Drift` with their reason, green or amber.
  - **Browse catalog →** opens the catalog page, and **Edit** opens the dialog below.
- **Matrix** answers who holds what, one row per group and one column per catalog. A cell lists `owner`
  when the group owns that catalog, then the verbs it holds, or a dash. The **Filter groups or
  catalogs** field narrows both the rows and the columns as you type; a filter that names neither says
  `No group or catalog matches that filter.`

## Grant access to a group

Choose **Edit** on a catalog's row. The dialog shows the whole access of that catalog; saving replaces
all of it, so a group you remove from the dialog loses its access.

- **Owner** — one group name. Ownership means `manage`, not `select`: an owner that holds no `select`
  grant cannot read the tables.
- **Managed access** — when it is on, the owner cannot grant on this catalog; only administrators can.
  It does not mean "everyone may read".
- **Grants** — one row per group, with a checkbox for each of the five verbs. `manage` is labelled
  *(grant and revoke on this catalog)*. At most 50 grants are accepted. **Add group** appends a row;
  **Remove** takes one away. The group field offers the groups the page already knows as suggestions,
  but any name that follows the group rule is accepted.
- A group that does not exist in your sign-in provider grants nothing. The row still saves; the sync
  reports it as `UnknownGroup` and no access is given.

Saving sends the owner, managed access and the whole grant list together with the version of the row the
page read. If someone else changed the catalog in the meantime, the save is refused with
`this catalog changed since you opened it; reload` and nothing is overwritten — reload the page, make the
change again.

Two changes ask for a second click before they are saved: removing every grant (which hides the catalog
from everyone who is not an administrator) and taking `stardelt-users` off the `warehouse` catalog.

## After you save

An edit is a change to the `Catalog` resource. The resource is the record; a sync job reads it and applies
it within about two minutes. The row says **Applying…** meanwhile, the page asks again every 5 seconds for
up to 3 minutes, and then stops and says `Waiting for the sync; it runs every 2 minutes.` — that is the
honest answer, not a failure. Reload the page to look again.

The three conditions say how far the sync got:

- **`CatalogReady`** — `Ready` means the catalog exists and can be used. A bad reason means it could not
  be created or is not valid; the badge's tooltip carries the sync's own sentence.
- **`GrantsReady`** — `Ready` means the declared grants were applied. `UnknownGroup` means a declared group
  is not in your sign-in provider, so nothing was granted for it. `RoleConflict` means the access for that
  group already belongs to something the platform does not manage, and it is left untouched. `GrantsFailed`
  (or `RoleCreateFailed`, `AssigneesFailed`)
  means the platform could not write the access; the tooltip says what failed.
- **`Drift`** — `Clean` means every grant on the catalog is one the record declares. `ForeignGrants` with
  a count means the platform found grants that it did not put there and does not manage; they are left in
  place and only counted, so a catalog can be clean for the people you granted and still show drift.

Any reason other than the good one turns the badge amber. The `Catalog` resource's own fields are listed in
the [Catalog reference](../reference/resources/catalog).

## Create a team space

**New team space** at the top of the page creates a team's catalogs in one step. Give a **Team name**, a
**Group** and, optionally, a **Description** of up to 500 characters; the dialog shows what the request
makes before you choose **Create**:

- Three catalogs: `<team>` (production), `<team>lab` (the team's sandbox) and `<team>ref` (shared
  reference data).
- The service principal `pipeline-<group>`, which is kept when it already exists.
- `Owner` is the group, and the group and `stardelt-admins` each hold `browse`, `select`, `write` and
  `create` on all three catalogs.

A team name is 2 to 21 lower-case letters and digits, starting with a letter. The group must already
exist in your sign-in provider. The three names must all be free: if one of the catalogs already exists,
nothing is created. When one create fails after the others succeeded, the answer names what exists now;
nothing is rolled back, so finish the space by hand in the **By catalog** view.

## A catalog owned by Git

When a GitOps tool owns a catalog, its **Edit** button is disabled. Pointing at it says
`Managed by <tool>. Change the grants in Git.` and the tool's name is shown under the button. An edit made
here would be reverted on the tool's next sync, so the change belongs in the GitOps repository.

The **New team space** dialog is unaffected: it creates new catalogs, and those belong to Nova until a
GitOps tool takes them over.
