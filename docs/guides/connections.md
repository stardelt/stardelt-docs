---
title: "Connections and secrets"
sidebar_label: "Connections and secrets"
slug: /guides/connections
---

# Connections and secrets

A **connection** keeps the settings and the secret your code needs to reach a system outside the
platform: a database, an API, an object store, a message broker, an SFTP server, or just a token
you want out of a notebook. Create it once on **Connections** in Nova, then read it from a Python
notebook by name. The value never enters the notebook file, the image or Git.

Open **Connections** in the left navigation. The page lists what you may see, grouped by scope,
with the settings and the names of the secret fields. It records names and settings, not values:
Nova does not return a secret value to the page or to the API.

## What a connection is

A connection is a named bundle of two kinds of field:

- **Settings** — not secret: host, port, database, bucket, endpoint, base URL, region, bootstrap
  servers. The page shows them to everyone who may see the connection.
- **Secret fields** — the values that must stay hidden: user, password, token, access key, private
  key. You write them when you create the connection; Nova stores them in the platform's secret
  store and **never shows them again** — not to you, not to another member of your group, not in the
  page, the API, the logs or the query history. The page shows only the field names, for example
  `password, user`.

There is one deliberate exception: an administrator can perform a **break-glass read** of a *group*
connection, with a written reason, and the group is told.
[What administrators can do](./connections-access#what-administrators-can-and-cannot-do) describes
it. Personal and managed values have no such path.

Keeping the value in the store means a notebook contains a name, not a password:

```python
import sqlalchemy
import stardelt

crm = stardelt.connection("crm-db")
engine = sqlalchemy.create_engine(crm.sqlalchemy_url(driver="psycopg"))
```

Rotating the password changes it in one place; the next `crm.value(...)` or `crm.sqlalchemy_url()`
reads the new value. Nothing secret is copied into a repository, and deleting the connection
removes the value from the store.

A connection is personal, for a group, or managed by administrators. [Who may see and use a
connection](./connections-access) explains the three scopes.

## Create a connection

1. Open **Connections** and choose **New connection**.
2. Choose the **Scope**: **Personal**, **Group** or **Managed**.
   - For **Group**, pick the **Owner group**.
   - For **Managed**, type a group under **Used by** and press Enter. At least one group is required;
     at most 20 are accepted.
3. Choose the **Type**. The form changes to that type's settings and secret fields.
4. Choose a **Name**. It is 1 to 40 lower-case letters, digits and dashes, starting with a letter;
   the dialog repeats the rule under the field.
5. Fill the **Settings** and the **Secret fields**. Required fields are marked; a field left empty
   is not sent.
6. For a group or managed connection, **Advanced** sets the **Refresh interval** (1m to 24h, default
   15m). It is how often the operator refreshes the synced Kubernetes Secret.
7. Choose **Create connection**.

### Types and their fields

The labels and required fields are the dialog's. A field without "required" is optional.

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

**Other secret (any fields)** is the type for "I just need to keep a secret". Its API value is
`generic`; the dialog shows the hint *For any secret that is not one of the types above: name the
settings and secret fields yourself.* Name up to 32 settings and up to 16 secret fields. A setting
name starts with a letter and uses letters, digits, dots, dashes or underscores; a secret field name
starts with a letter and uses letters, digits or underscores. A setting whose name contains
`password`, `passwd`, `passphrase`, `secret`, `token` or `credential` is refused — it belongs under
**Secret fields**.

### If the name is taken

Names are unique within a scope. A second connection with the same name in the same place answers:

```text
a connection with this name already exists
```

Choose another name, or open the existing connection and rotate or delete it. The same name in
different scopes is allowed: a personal `crm-db` and a group `crm-db` can coexist, and the notebook
helper then asks which one you mean (see
[Use a connection in a notebook](./connections-notebooks)). A group connection's name is also the
name of the platform resource behind it, so two groups cannot both own a connection with the same
name; the second attempt answers the same sentence.

## Rotate and delete

**Rotate** opens a dialog named after the connection. It lists the connection's secret fields and
takes new values:

- A personal or group connection accepts one or more fields; the fields you leave empty keep their
  current value. The dialog asks for the new value of at least one field.
- A managed connection cannot be read back, so every field is required. A partial request is
  refused with `a managed connection cannot be read back, so a rotation sends every field`.
- A connection with no secret fields has nothing to rotate.

A successful rotation clears a break-glass notice on a group connection
([what administrators can do](./connections-access#what-administrators-can-and-cannot-do)).

**Delete** asks once, in a dialog titled `Delete <name>?`. It names the connection and says what
stops working:

- Personal: that notebooks using it will fail.
- Group and managed: *Notebooks that use it will fail. Pipelines and catalogs that use it will stop
  working.*

Catalogs do not consume connections yet ([not available yet](#not-available-yet)); notebooks and
pipelines do. Deleting removes the value from the secret store and, for a group or managed
connection, the `Connection` resource.
An administrator who is not a member of the owning group can delete a group connection; the audit
record names the administrator.

## Status

The **Status** column says whether the platform has a usable copy of the connection:

| Status | Meaning |
|---|---|
| **Stored** | A personal connection. The value is in the secret store; there is no Kubernetes sync to report. |
| **Ready** | A group or managed connection whose secret has been synced into the Kubernetes Secret the platform uses. |
| **Not ready** | The resource exists but the sync has not produced a usable Secret. The page shows the operator's sentence under the status. |
| **Unknown** | The platform has no sync status for the row yet; the next reconcile fills it. |

A newly created group or managed connection typically starts as **Not ready** with *waiting for the
first sync from the secret store*, then becomes **Ready**. When a Secret is missing, the page shows
*the value does not exist in the secret store yet: create the connection in Nova or write the value
first*. When the store cannot supply the value, it shows *could not get secret data from provider*;
in the checked installation this happened for a group that has no secret store configured yet. Ask
an administrator to check the store for that group.

The **Changed** column is when the connection or its value last changed; hover for the exact time.

## Not available yet

- **SQL tasks and other task kinds.** A `sql` task cannot name a connection (it runs inside the
  engine), and `python`, `dbt` and `quality` tasks have no runtime yet. Only a `notebook` task
  receives the variables.
- **SQL.** There is deliberately no secret function in SQL: statements are logged, here and in the
  engine. A database or API source will become a catalog that an administrator sets up from a
  managed connection, not a value a query can read.
- **Spark notebooks.** A Spark session does not receive connection values. `stardelt.connection()`
  is for the Python kernel; use it to fetch a value and pass what the job needs explicitly.
- **Managed connections.** A scheduled notebook whose pipeline names one and whose `ownerGroup` is
  in `usableBy` uses it (see [Use a connection in a notebook](./connections-notebooks)). Connection
  tests, federated catalogs and a catalog-backed ingestion template are not built.

  The pod reads `CONN_<NAME>_<KEY>` from the Kubernetes Secret `conn-<name>`, which the External
  Secrets Operator syncs when it is installed (`make external-secrets`, then wait for the next sync —
  the ExternalSecret refreshes every 15 minutes by default). A connection whose `status.ready` is
  false has no Secret yet; the pipeline is then refused with the sync's own sentence instead of a pod
  that never starts.

The remaining consumers are not built yet; the page and the notebook helper say what exists today.

## Where the rest is

- [Who may see and use a connection](./connections-access)
- [Use a connection in a notebook](./connections-notebooks)
- [An enterprise secret store](./connections-secret-stores)
- [Troubleshooting connections](./connections-troubleshooting)
