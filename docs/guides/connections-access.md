---
title: "Who may see and use a connection"
sidebar_label: "Who may use a connection"
slug: /guides/connections-access
---

# Who may see and use a connection

## Three scopes

The page has one section per scope. The text under each heading is the page's own:

> **Personal** — Only you can see and use these, from a Python notebook. They are never used by pipelines or SQL.

> **Group: &lt;group name&gt;** — Every member of the group can use and rotate these from a Python notebook.

> **Managed** — For platform services only. Nobody can read the values.

| | Personal | Group | Managed |
|---|---|---|---|
| **Who creates it** | You | Any member of the group | Administrators only |
| **Who may use it** | Only you | Every member of the group | Platform-run work only: a scheduled notebook whose pipeline names it and whose `ownerGroup` is in `usableBy`, reading the Secret `conn-<name>`. Nobody reads the values directly. |
| **Who sees its name and settings** | Only you | Every member of the group; administrators also see every group's connections | Administrators |
| **Who may rotate or delete it** | You | Members rotate and delete; an administrator who is not a member may delete but not create or rotate | Administrators |
| **Where it can be used today** | A Python notebook only | A Python notebook, and a scheduled notebook whose pipeline runs as that group | Platform-run work: a scheduled notebook whose pipeline names it and whose `ownerGroup` is in `usableBy` |

A group connection belongs to one group, chosen from the groups you are a member of. If you are in
no group, you cannot create one; the dialog has no group to offer.

An administrator who is not a member of the owning group sees the group section and the row, but
the API marks the row as not theirs (`member: false`). Creating or rotating it is refused with:

```text
an administrator may delete a connection of the group `analytics` but not create or rotate one
```

The page still offers **Rotate** on such a row; the dialog opens and the request is refused with that
sentence. Deleting works, and the audit record names the administrator rather than a member.

Managed connections are created by an administrator with one or more groups under **Used by**. A
scheduled notebook whose pipeline names a managed connection and whose `ownerGroup` is in
**Used by** receives its secret fields (see
[Use a connection in a notebook](./connections-notebooks)). Connection tests, federated catalogs
and a catalog-backed ingestion template are not built. A managed value is still not usable in a
notebook you run yourself.

The task pod reads `CONN_<NAME>_<KEY>` from the Kubernetes Secret `conn-<name>`, which the External
Secrets Operator syncs when it is installed (`make external-secrets`, then wait for the next sync —
the ExternalSecret refreshes every 15 minutes by default). A connection whose `status.ready` is
false has no Secret yet; the pipeline is then refused with the sync's own sentence instead of a pod
that never starts.

## What administrators can and cannot do

An administrator sees:

- their own personal connections;
- every group's connections, including groups they are not a member of;
- the **Managed** section, including managed connections they did not create.

They see names, settings and secret field names. They do **not** see personal or managed values.
The break-glass action refuses those scopes with `break-glass covers group connections only`.
No administrative request returns a personal or managed value; the owner of a personal connection
reads it in their own notebook, as in
[Use a connection in a notebook](./connections-notebooks).

For a **group** connection, an administrator has one emergency action: **Break-glass read**. It is
offered on group rows only and asks for a **Reason** of at least 20 characters (at most 500). The
dialog says:

> The group `<group>` is told that you read this credential, with your reason.
>
> The read is recorded in the audit log.
>
> Rotate the credential afterwards.

The answer is shown once, masked until **Show**, and the window closes itself in 60 seconds. Closing
it, or leaving the tab hidden for more than ten seconds, drops the values. Five reads per
administrator are accepted in ten minutes; a sixth is refused and asks you to wait ten minutes.

The owner group sees a banner above its table:

> Read by &lt;administrator&gt; on &lt;date and time&gt;: &lt;reason&gt;. Consider rotating the credential.

with a **Rotate now** button. A rotation clears the banner. The read is recorded in the audit log and
the notice is stored on the group's connection; the audit record carries the administrator, the
group, the connection, the reason and the outcome, and never a value.

An administrator can create, rotate and delete managed connections, and create and rotate group
connections of groups they belong to. For a group they do not belong to they can delete only: the
page marks the row **Not your group** and offers **Delete** and **Break-glass read** without
**Rotate** (a request that sends it anyway is refused with the sentence in
[Three scopes](#three-scopes)), and the audit record marks a successful delete as an
administrator's action.
