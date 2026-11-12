---
title: "Use a connection in a notebook"
sidebar_label: "Use a connection in a notebook"
slug: /guides/connections-notebooks
---

# Use a connection in a notebook

How a notebook reads a connection — the finder, one field, a SQLAlchemy URL, a requests session,
object-store options, and the scheduled-notebook case. Creating and rotating connections is on
[Connections and secrets](./connections).

## Use it in a Python notebook

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

### In a scheduled notebook

A pipeline's `notebook` task may name a connection with `connection: <name>` next to `kind` — not
inside `config`:

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

The task pod receives one environment variable per secret field of that connection, named
`CONN_<NAME>_<KEY>`: the connection name and the field name in upper case, with `-` written as `_`.
A connection `crm-db` with the fields `user` and `password` gives `CONN_CRM_DB_USER` and
`CONN_CRM_DB_PASSWORD`. Each variable refers to the Kubernetes Secret `conn-<name>`; no value
passes through the DAG or the loader.

The notebook reads them with `os.environ["CONN_CRM_DB_USER"]` and
`os.environ["CONN_CRM_DB_PASSWORD"]`; the values are the same ones the Connections page rotates.

Which connections a pipeline may use follows the three scopes:

- A personal connection belongs to a person. A pipeline runs as a service principal and is refused
  with:

  ```text
  connection `x` is personal; a pipeline runs as a service principal and may use a group or managed connection
  ```

- A group connection must belong to the pipeline's `ownerGroup`:

  ```text
  connection `x` belongs to group `y`, not to this pipeline's ownerGroup
  ```

- A managed connection must list the pipeline's `ownerGroup` under **Used by** (`usableBy`):

  ```text
  connection `x` is managed and does not list group `y` in usableBy
  ```

- Only a notebook task reads one. A `sql` task runs inside the engine:

  ```text
  sql task `x` cannot name a connection: it runs inside the engine. A connection is used by a notebook task.
  ```

- A name that is not in the pipeline's namespace is refused:

  ```text
  task `x` names connection `y`, which does not exist in namespace `z`
  ```

A pipeline that breaks one of these rules does not load as a DAG; Airflow's import warning names
the reason. A notebook task still needs `ownerGroup` and `runAs`, as before.
