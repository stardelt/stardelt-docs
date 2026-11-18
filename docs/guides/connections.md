---
title: "Connections"
sidebar_label: "Connections"
slug: /guides/connections
---

# Connections

A **connection** keeps the settings and the secret your code needs to reach a system outside the
platform. Create it on **Connections**, read it from a Python notebook by name; no value enters the
notebook, the image or Git.

## What a connection is

**Settings** are not secret. **Secret fields** go to the platform's secret store and are **never shown
again** — not in the page, the API, the logs or the query history; only their names appear, for example
`password, user`.

One exception: an administrator's **break-glass read** of a *group* connection, with a written reason;
the group is told.

```python
crm = stardelt.connection("crm-db")
crm.sqlalchemy_url(driver="psycopg")  # 'postgresql+psycopg://…:…@db.example.invalid:5432/crm'
```

Rotating changes the password in one place; deleting removes the value.

## Who may see and use one

> **Personal** — Only you can see and use these, from a Python notebook. They are never used by pipelines or SQL.

> **Group: &lt;group name&gt;** — Every member of the group can use and rotate these from a Python notebook.

> **Managed** — For platform services only. Nobody can read the values.

| | Personal | Group | Managed |
|---|---|---|---|
| **Who creates it** | You | Any member of the group | Administrators only |
| **Who may use it** | Only you | Every member of the group | Platform-run work only: a scheduled notebook whose pipeline names it and whose `ownerGroup` is in `usableBy`. |
| **Who sees its name and settings** | Only you | Members and administrators | Administrators |
| **Who may rotate or delete it** | You | Members rotate and delete; an administrator outside the group may delete but not create or rotate | Administrators |
| **Where it can be used today** | A Python notebook only | A Python notebook, and a scheduled notebook whose pipeline runs as that group | Platform-run work, as above |

A group connection belongs to one of your groups; with none, the dialog offers none. An administrator
outside it cannot create or rotate the connection:

```text
an administrator may delete a connection of the group `analytics` but not create or rotate one
```

**Break-glass read**, on group rows only, needs a **Reason** of 20 to 500 characters:

> The group `<group>` is told that you read this credential, with your reason.
>
> The read is recorded in the audit log.
>
> Rotate the credential afterwards.

It shows once, masked until **Show**, closes in 60 seconds; five reads per administrator per ten
minutes, a sixth refused. The group sees a banner with **Rotate now**:

> Read by &lt;administrator&gt; on &lt;date and time&gt;: &lt;reason&gt;. Consider rotating the credential.

The audit record carries administrator, group, connection, reason and outcome, never a value.

## Create a connection

1. Open **Connections**, choose **New connection**.
2. Choose the **Scope**: **Personal**, **Group** (pick an **Owner group**) or **Managed** (one to 20
   groups under **Used by**).
3. Choose the **Type**.
4. **Name**: 1 to 40 lower-case letters, digits and dashes, starting with a letter.
5. Fill **Settings** and **Secret fields**; required ones are marked, empty ones are not sent.
6. **Advanced** sets the **Refresh interval** (1m to 24h, default 15m).
7. Choose **Create connection**.

### Types and their fields

| Type | Settings | Secret fields |
|---|---|---|
| **PostgreSQL** | Host (required), Port (default 5432), Database | User (required), Password (required) |
| **MySQL** | Host (required), Port (default 3306), Database | User (required), Password (required) |
| **SQL Server** | Host (required), Port (default 1433), Database | User (required), Password (required) |
| **Oracle** | Host (required), Port (default 1521), Service | User (required), Password (required) |
| **REST API** | Base URL (required) | **Token:** Token (required). **Client credentials:** Client ID (required), Client secret (required) |
| **Object store (S3)** | Bucket (required), Endpoint, Region | Access key ID (required), Secret access key (required) |
| **Kafka** | Bootstrap servers (required) | User (required), Password (required) |
| **SFTP** | Host (required), Port (default 22) | **Password:** User (required), Password (required). **Private key:** User (required), Private key (required) |
| **Other secret (any fields)** | None fixed: you name the settings | None fixed: you name the secret fields; at least one is required |

**Other secret (any fields)** keeps any secret (API value `generic`): up to 32 settings and 16 secret
fields, named with a letter then letters, digits, dots, dashes or underscores; a secret field takes no
dot or dash. A setting named with `password`, `passwd`, `passphrase`, `secret`, `token` or `credential`
is refused: it belongs under **Secret fields**.

### If the name is taken

Names are unique within a scope; a duplicate answers `a connection with this name already exists`. A
personal and a group `crm-db` may coexist; the helper asks which. A group name is its resource name,
so two groups cannot share it.

## Rotate and delete

**Rotate** takes new values for the secret fields: a personal or group connection accepts one or more
and keeps empty fields; a managed connection cannot be read back, so a rotation sends every field, and
a partial one is refused with `a managed connection cannot be read back, so a rotation sends every
field`; no secret fields means nothing to rotate. A rotation clears a break-glass notice.

**Delete** asks once in `Delete <name>?`: for personal, that notebooks using it will fail; for group
and managed, *Notebooks that use it will fail. Pipelines and catalogs that use it will stop working.*
An administrator outside the owning group may delete a group connection; the audit record names them.

## Status

| Status | Meaning |
|---|---|
| **Stored** | A personal connection; the value is in the store, no sync to report. |
| **Ready** | Synced into the Kubernetes Secret the platform uses. |
| **Not ready** | No usable Secret yet; the page shows the operator's sentence. |
| **Unknown** | No sync status yet; the next reconcile fills it. |

A new group or managed connection starts as **Not ready** (*waiting for the first sync from the secret
store*). A missing Secret shows *the value does not exist in the secret store yet: create the
connection in Nova or write the value first*; a store that cannot supply it shows *could not get secret
data from provider*.

## Use a connection in a notebook

`stardelt` signs in with the notebook's own platform token: nothing to paste. It looks at your
personal connections, then your groups; an ambiguous name refuses:

```text
'shared-secret' exists in more than one place (personal, stardelt-users); pass group=... or scope=... to choose.
```

A group you are not in is refused with `you are not a member of the group 'analytics'.`; an unknown
name:

```text
no connection 'no-such-connection' that you may read. Check the name on the Connections page. Connections that administrators manage are used by the platform for you (a catalog, an ingestion template) and are not revealed to notebooks.
```

**`value(name)`** reads the store on every call; `KeyError` for an unknown field,
`stardelt.ConnectionUnavailable` when it is gone.

```python
crm.value("password")  # '…'
```

**`sqlalchemy_url(driver=None)`** builds a quoted database URL; a driver goes after a `+`.

```python
crm.sqlalchemy_url(driver="psycopg")  # 'postgresql+psycopg://…'
```

**`requests_session()`** returns a `requests.Session` with `Authorization` from the `token` field and
`base_url` from **Base URL**.

```python
session = stardelt.connection("crm-api").requests_session()
session.headers["Authorization"]  # 'Bearer …'
```

**`s3_options()`** gives `s3fs`/`storage_options`: `key`, `secret` and `client_kwargs` (endpoint,
region).

```python
stardelt.connection("bucket-scratch").s3_options()
# {'key': '…', 'secret': '…', 'client_kwargs': {'endpoint_url': 'https://s3.example.invalid', 'region_name': 'eu-central-1'}}
```

Printing shows name, scope, type and field *names*, never a value: `Connection('shared-secret', scope=personal, type='generic', keys=['token'])`

Managed connections have no reader: `scope must be 'personal' or 'group' (managed connections are not
revealed).`

### In a scheduled notebook

A `notebook` task names one with `connection: <name>` next to `kind`, not inside `config`:

```yaml
spec:
  ownerGroup: analytics
  runAs: pipeline-analytics
  tasks:
    - name: ingest
      kind: notebook
      connection: crm-db
      config:
        notebook: ingest.ipynb
        objectVersion: v7
```

The pod gets one variable per secret field, `CONN_<NAME>_<KEY>` (upper case, `-` as `_`): `crm-db`
with `user` and `password` gives `CONN_CRM_DB_USER` and `CONN_CRM_DB_PASSWORD` from the Secret
`conn-<name>`.

A personal connection is refused (a pipeline is a service principal); a group connection must be its
`ownerGroup`, a managed one must list it under **Used by** (`usableBy`).

## When it does not work

| Message | Where | What it means | What to do |
|---|---|---|---|
| `the secret store is not configured` | Nova, Connections page and API (503) | This installation has no secret store. | Ask an administrator to set it up. |
| `the secret store is unavailable: …` | Nova (502) | Nova could not reach the store. | Retry. If it persists, ask an administrator to check the store. |
| `the secret store refused the request: …` | Nova (502) | The store refused the operation, usually a policy or permission. | Check that you are in the owning group and that the connection still exists; ask an administrator if it persists. |
| ``you are not a member of the group `…` `` | Nova (403) | You tried to create, rotate or delete a connection of a group you are not in. | Use a connection of your own group, or ask a member of that group. |
| `a connection with this name already exists` | Nova (409) | The name is taken in that scope. | Choose another name, or rotate or delete the existing connection. |
| `no such connection` | Nova (404) | The connection was deleted, or the scope/group in the request is wrong. | Refresh the page. |
| `could not record the notice; nothing was returned` | Nova, break-glass (502) | Nova could not write the notice that tells the group, so it returned no value. | Retry. If it persists, ask an administrator to check the cluster. |
| `the secret store is not reachable (ConnectionError)` | Notebook | The notebook cannot reach the store. | Restart the server from the hub. If it persists, ask an administrator. |
| `the secret store refused your sign-in (…) — restart this server from the hub to get a fresh token.` | Notebook | The notebook's platform token is no longer accepted. | Restart the server from the hub. |
| `no connection '…' that you may read.` | Notebook | The name is wrong, the connection is not yours, or it is managed. | Check the name on the Connections page. |
| `'…' exists in more than one place (…); pass group=... or scope=... to choose.` | Notebook | The same name exists in your personal connections and in a group. | Pass `scope="personal"` or `group="<group>"`. |
| `scope must be 'personal' or 'group' (managed connections are not revealed).` | Notebook | You asked for a managed connection; notebooks cannot read one. | Use a personal or group connection. |

## Not available yet

- **SQL tasks and other task kinds.** No `sql` task names a connection (it runs inside the engine), and
  `python`, `dbt` and `quality` have no runtime; only a `notebook` task receives the variables.
- **SQL.** No secret function in SQL: statements are logged.
- **Spark notebooks.** A Spark session receives no values; `stardelt.connection()` is for the Python
  kernel.
- **Managed connections.** Connection tests, federated catalogs and a catalog-backed ingestion template
  are not built.
