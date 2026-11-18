---
title: "Access to catalogs and the network"
sidebar_label: "Catalogs and network access"
slug: /operations/access
description: "Which groups may use which catalogs, and which addresses reach the platform, as grants and one Ingress annotation."
---

# Access to catalogs and the network

Two questions decide who gets in: which group may use which catalog, and which address may reach the
platform. The **Catalogs** page answers the first, one Ingress annotation the second.

## Who can do what

Groups are the only subjects: a grant names a group from your sign-in provider, and everyone in it holds
what the grant declares. Stardelt never creates a group or a person.

Permissions are catalog-wide today: no table-level grant, no row or column policy, no "deny". A group
holds a verb on the whole catalog or it does not. The five verbs are:

| Verb | What it lets the group do |
|---|---|
| `browse` | List the catalog and its schemas and tables |
| `select` | Read rows |
| `write` | Add and change data, and replace a table or view with `CREATE OR REPLACE`; not drop or rename |
| `create` | Create schemas and tables |
| `manage` | Change who may use this catalog: grant and revoke the other verbs. It grants no access to the data itself |

`write` includes `select`, and `select` and `create` include `browse`; `manage` includes none, which is why
an owner without another grant cannot read the tables. `write` does not include **drop** or **rename**:
removing or renaming a schema, table or view is a platform-administrator action in this release.

Platform administrators can do everything in every catalog and are not listed on the page, so a catalog
with no grants is not open to everyone. [Security model](./security) describes what
the platform enforces and what an install without sign-in does not;
[the catalog and the table page](../guides/catalog) is the reader's view.

## Grant access to a group

**Catalogs** under **Admin** (`/admin/catalogs`) is for platform administrators only: **By catalog** shows one
row per catalog with its owner, the sync's **Phase** (`Ready`, `Invalid`, or `Unknown` before the first sync),
the group count and the `CatalogReady`, `GrantsReady` and `Drift` conditions, and **Matrix** one row per group
and one column per catalog, with **Filter groups or catalogs** narrowing both. Choose **Edit** on a row. The
dialog shows the whole access of that catalog; saving replaces all of it, so a group you remove loses its
access.

- **Owner** — one group name. Ownership means `manage`, not `select`: an owner without `select` cannot read
  the tables.
- **Managed access** — when it is on, the owner cannot grant on this catalog; only administrators can. It
  does not mean "everyone may read".
- **Grants** — one row per group, a checkbox per verb, `manage` labelled *(grant and revoke on this
  catalog)*. At most 50 grants are accepted. **Add group** appends a row, **Remove** removes one. Any
  group name that follows the group rule is accepted.
- A group that is not in your sign-in provider grants nothing: the row saves, the sync reports
  `UnknownGroup`, no access is given.

Saving sends the whole access with the row version it read, so a catalog changed meanwhile is refused with
`this catalog changed since you opened it; reload` and nothing is overwritten. Two changes ask for a second
click: removing every grant, which hides the catalog from non-administrators, and taking `stardelt-users` off
`warehouse`.

## After you save

An edit is a change to the `Catalog` resource, which is the record and which a sync job applies within two
minutes. The row says **Applying…** meanwhile, and the page polls for up to 3 minutes before saying `Waiting
for the sync; it runs every 2 minutes.` The three conditions say how far it got:

- **`CatalogReady`** — `Ready`: the catalog exists and can be used. Any other reason: it could not be
  created or is not valid; the tooltip carries the sync's sentence.
- **`GrantsReady`** — `Ready`: the declared grants were applied. `UnknownGroup`: a declared group is not in
  your sign-in provider, so nothing was granted. `RoleConflict`: the access already belongs to something
  the platform does not manage and is left untouched. `GrantsFailed` (or `RoleCreateFailed`,
  `AssigneesFailed`): the access could not be written.
- **`Drift`** — `Clean`: every grant is one the record declares. `ForeignGrants` with a count: the platform
  found grants it did not put there, left them in place and only counted them, so a catalog can be clean
  for the people you granted and still show drift.

Any other reason turns it amber. The resource's fields are in the
[Catalog reference](../reference/resources/catalog).

## Create a team space

**New team space** creates a team's catalogs. Give a **Team name**, a **Group** and, optionally, a
**Description** of up to 500 characters; the dialog shows what the request makes before you choose **Create**:
`<team>` (production), `<team>lab` (the sandbox) and `<team>ref` (shared reference data), the service
principal `pipeline-<group>`, kept when it exists, and the group as `Owner`, the group and `stardelt-admins`
each holding `browse`, `select`, `write` and `create` on all three.

A team name is 2 to 21 lower-case letters and digits, starting with a letter; the group must exist in your
sign-in provider. All three names must be free: if one exists, nothing is created. If one create fails after
the others, the answer names what exists now and nothing is rolled back, so finish the space by hand in **By
catalog**.

## A catalog owned by Git

When a GitOps tool owns a catalog, **Edit** is disabled and pointing at it says
`Managed by <tool>. Change the grants in Git.` An edit made here would be reverted on the tool's next sync.
**New team space** is unaffected: what it creates belongs to Nova until a GitOps tool takes it over.

## Restrict who can reach the platform

An install with `ingress.enabled` publishes a host per component: Nova on the base domain itself, the
identity provider on `id.<baseDomain>` when the platform runs it, and Trino, Superset, Airflow and
JupyterHub on `trino.`, `superset.`, `airflow.` and `jupyter.<baseDomain>` when they are enabled and
published. Beyond Nova and the identity provider the chart publishes a component only when it is listed in
`ingress.exposeUnauthenticated`, and the operator with the pillar or identity setting that enables it.
Every published host is reachable at first: any address that can connect may try to sign in. The
allow-list makes the ingress controller refuse every other source with `403` before the request reaches a
service.

The list is not authentication and not a firewall for the cluster: it is one annotation on the Ingress
objects, and everything that carries its own Ingress is outside its reach. Keep the platform's sign-in in
place.

### Chart installs

```yaml
ingress:
  allowedCidrs:
    - 203.0.113.0/24
    - 2001:db8::/32
```

Or with `--set 'ingress.allowedCidrs={203.0.113.0/24}'`. A non-empty list renders
`nginx.ingress.kubernetes.io/whitelist-source-range` on every Ingress the chart renders; an empty one
removes the annotation on the next `helm upgrade`. Entries are CIDRs, at most 64, and anything else makes
`helm template` fail. The annotation means something only on ingress-nginx; another controller ignores it.
Do not also set it under `ingress.annotations`.

### Operator installs

The same list as a field of the `PlatformInstance`:

```yaml
apiVersion: stardelt.io/v1alpha1
kind: PlatformInstance
metadata:
  name: platform
spec:
  baseDomain: data.example.com
  ingress:
    enabled: true
    allowedCidrs:
      - 203.0.113.0/24
      - 2001:db8::/32
```

`spec.ingress.allowedCidrs` has the same shape and bounds: CIDRs, at most 64, empty means open. The
operator applies the annotation to every Ingress it creates for the instance. The field is in the
[PlatformInstance reference](../reference/resources/platforminstance).

### What must keep working

**The cluster's own egress address.** Pods that call the platform's public names — a pipeline posting to
Nova's API, a notebook calling `trino.<baseDomain>` — leave through the node's egress address, so those calls
get a `403` unless that address is in the list — the failure people hit first. Read it from a pod:

```console
$ kubectl -n stardelt run egress --rm -it --restart=Never \
    --image=curlimages/curl -- curl -s https://ifconfig.me
203.0.113.17
```

Then allow that address, or the cluster's NAT range.

**Certificate renewal.** A cert-manager HTTP-01 challenge is served by the solver's own Ingress, which
carries no annotation, so renewal keeps working. DNS-01 needs no inbound path at all.

**A load balancer or proxy in front.** The controller sees the load balancer's address, not the client's.
`use-forwarded-headers` plus the load balancer's ranges in `proxy-real-ip-cidr` makes the list mean client
addresses; without it a list allows the load balancer and blocks everyone else.

**IPv6.** An IPv4-only list does not restrict IPv6 clients on a dual-stack install; name both families.

### Prove it

Read back the annotation:

```console
$ kubectl -n stardelt get ingress \
    -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.metadata.annotations.nginx\.ingress\.kubernetes\.io/whitelist-source-range}{"\n"}{end}'
nova	203.0.113.0/24
trino	203.0.113.0/24
keycloak	203.0.113.0/24
```

Then request from outside and from a pod:

```console
$ curl -s -o /dev/null -w '%{http_code}\n' https://nova.example.com/api/health
403
```

From a pod it answers `200`. [Checks to run](./checks) has the read-only checks for after an
upgrade.

### Turning it off

Empty the list, or remove the field, and the annotation goes away on the next `helm upgrade` or reconcile:
the endpoints are open to every address again.
