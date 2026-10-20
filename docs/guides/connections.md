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

## 1. What a connection is

A connection is a named bundle of two kinds of field:

- **Settings** — not secret: host, port, database, bucket, endpoint, base URL, region, bootstrap
  servers. The page shows them to everyone who may see the connection.
- **Secret fields** — the values that must stay hidden: user, password, token, access key, private
  key. You write them when you create the connection; Nova stores them in the platform's secret
  store and **never shows them again** — not to you, not to another member of your group, not in the
  page, the API, the logs or the query history. The page shows only the field names, for example
  `password, user`.

There is one deliberate exception: an administrator can perform a **break-glass read** of a *group*
connection, with a written reason, and the group is told. Section 7 describes it. Personal and
managed values have no such path.

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

## 2. Three scopes

The page has one section per scope. The text under each heading is the page's own:

> **Personal** — Only you can see and use these, from a Python notebook. They are never used by pipelines or SQL.

> **Group: &lt;group name&gt;** — Every member of the group can use and rotate these from a Python notebook.

> **Managed** — For platform services only. Nobody can read the values.

| | Personal | Group | Managed |
|---|---|---|---|
| **Who creates it** | You | Any member of the group | Administrators only |
| **Who may use it** | Only you | Every member of the group | Platform services only; nothing consumes one today |
| **Who sees its name and settings** | Only you | Every member of the group; administrators also see every group's connections | Administrators |
| **Who may rotate or delete it** | You | Members rotate and delete; an administrator who is not a member may delete but not create or rotate | Administrators |
| **Where it can be used today** | A Python notebook only | A Python notebook only | Nowhere yet: the page and the store prepare it for platform services that are not built |

A group connection belongs to one group, chosen from the groups you are a member of. If you are in
no group, you cannot create one; the dialog has no group to offer.

An administrator who is not a member of the owning group sees the group section and the row, but
the API marks the row as not theirs (`member: false`). Creating or rotating it is refused with:

```text
an administrator may delete a connection of the group `analytics` but not create or rotate one
```

The page still offers **Rotate** on such a row; the dialog opens and the request is refused with that
sentence. Deleting works, and the audit record names the administrator rather than a member.

Managed connections are created by an administrator with one or more groups under **Used by**. No
platform service reads one yet: connection tests, federated catalogs and ingestion are not built.
The scope exists so those services have a place to read from when they arrive; a managed row is not
usable in a notebook.

## 3. Create a connection

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
helper then asks which one you mean (section 4). A group connection's name is also the name of the
platform resource behind it, so two groups cannot both own a connection with the same name; the
second attempt answers the same sentence.

## 4. Use it in a Python notebook

The platform's notebook image ships the `stardelt` helper. It signs in to the secret store with the
notebook's own platform token, so there is no password argument and nothing to paste into the
notebook. Values are read when you ask for them and are never kept between calls.

The examples below were run in a Python notebook on the dev platform against throwaway connections;
values are shown as `…`.

### Find a connection

```python
import stardelt

crm = stardelt.connection("crm-db")
```

The helper looks at your personal connections first, then at each of your groups. If the name exists
in more than one place, it refuses to guess:

```text
'shared-secret' exists in more than one place (personal, stardelt-users); pass group=... or scope=... to choose.
```

Pass `scope="personal"` or `group="analytics"` to choose:

```python
personal = stardelt.connection("shared-secret", scope="personal")
group = stardelt.connection("shared-secret", group="analytics")
```

A group you are not a member of is refused:

```text
you are not a member of the group 'analytics'.
```

A name that does not exist (or that you may not read) answers:

```text
no connection 'no-such-connection' that you may read. Check the name on the Connections page. Connections that administrators manage are used by the platform for you (a catalog, an ingestion template) and are not revealed to notebooks.
```

### Read one field

```python
crm = stardelt.connection("crm-db")
crm.value("password")
```

```text
'…'
```

`value(name)` reads the store on every call, so a rotation is visible on the next call. It raises
`KeyError` when the field is not one of the connection's fields, and
`stardelt.ConnectionUnavailable` when the connection was removed or you may no longer read it.

### A SQLAlchemy URL

```python
crm = stardelt.connection("crm-db")
crm.sqlalchemy_url()
```

```text
'postgresql://…:…@db.example.invalid:5432/crm'
```

`sqlalchemy_url(driver=None)` is for the database types (PostgreSQL, MySQL, SQL Server, Oracle). It
quotes the user and password, and adds the driver after a `+` when you pass one, for example
`sqlalchemy_url(driver="psycopg")` → `postgresql+psycopg://…`. It refuses a non-database connection.

### A requests session with the token

```python
api = stardelt.connection("crm-api")
session = api.requests_session()
session.headers["Authorization"]
```

```text
'Bearer …'
```

`requests_session()` is for a REST API connection with a `token` field. It returns a
`requests.Session` with the `Authorization` header set and `base_url` from the connection's **Base
URL**. For the client-credentials variant, read `clientId` and `clientSecret` with `value()` and
obtain the token yourself.

### Object-store options

```python
bucket = stardelt.connection("bucket-scratch")
bucket.s3_options()
```

```text
{'key': '…', 'secret': '…', 'client_kwargs': {'endpoint_url': 'https://s3.example.invalid', 'region_name': 'eu-central-1'}}
```

`s3_options()` is for an S3 connection. Pass the result to `s3fs` or as `storage_options` to pandas
or PyArrow. `key` and `secret` are the access key pair; `client_kwargs` carries the endpoint and
region when you set them.

### Printing a connection

Printing the object shows its name, scope, type and the *names* of its fields, never a value:

```python
print(stardelt.connection("shared-secret", scope="personal"))
```

```text
Connection('shared-secret', scope=personal, type='generic', keys=['token'])
```

### Managed connections are not readable

A managed connection has no reader in a notebook, on purpose:

```python
stardelt.connection("platform-s3", scope="managed")
```

```text
scope must be 'personal' or 'group' (managed connections are not revealed).
```

If the only connection with a name is managed, the helper says so in the no-connection error. The
page's **Use in a notebook** disclosure appears for personal and group rows only; a managed row has
no snippet.

## 5. Rotate and delete

**Rotate** opens a dialog named after the connection. It lists the connection's secret fields and
takes new values:

- A personal or group connection accepts one or more fields; the fields you leave empty keep their
  current value. The dialog asks for the new value of at least one field.
- A managed connection cannot be read back, so every field is required. A partial request is
  refused with `a managed connection cannot be read back, so a rotation sends every field`.
- A connection with no secret fields has nothing to rotate.

A successful rotation clears a break-glass notice on a group connection (section 7).

**Delete** asks once, in a dialog titled `Delete <name>?`. It names the connection and says what
stops working:

- Personal: that notebooks using it will fail.
- Group and managed: *Notebooks that use it will fail. Pipelines and catalogs that use it will stop
  working.*

Pipelines and catalogs do not consume connections yet (section 8), so today only the notebook part
applies. Deleting removes the value from the secret store and, for a group or managed
connection, the `Connection` resource. An administrator who is not a member of the owning group can
delete a group connection; the audit record names the administrator.

## 6. Status

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

## 7. What administrators can and cannot do

An administrator sees:

- their own personal connections;
- every group's connections, including groups they are not a member of;
- the **Managed** section, including managed connections they did not create.

They see names, settings and secret field names. They do **not** see personal or managed values.
The break-glass action refuses those scopes with `break-glass covers group connections only`.
No administrative request returns a personal or managed value; the owner of a personal connection
reads it in their own notebook, as in section 4.

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
connections of groups they belong to. For a group they do not belong to they can delete only; the
page still shows **Rotate**, but the request is refused with the sentence in section 2, and the
audit record marks a successful delete as an administrator's action.

## 8. Not available yet

- **Scheduled pipelines.** No pipeline task kind consumes a connection. A pipeline cannot read a
  personal, group or managed connection today.
- **SQL.** There is deliberately no secret function in SQL: statements are logged, here and in the
  engine. A database or API source will become a catalog that an administrator sets up from a
  managed connection, not a value a query can read.
- **Spark notebooks.** A Spark session does not receive connection values. `stardelt.connection()`
  is for the Python kernel; use it to fetch a value and pass what the job needs explicitly.
- **Managed connections.** No platform service reads one yet. Connection tests, federated catalogs
  and ingestion are not built.

These consumers are not built yet; the page and the notebook helper say what exists today.

## 9. Troubleshooting

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
