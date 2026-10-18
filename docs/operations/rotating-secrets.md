---
title: "Rotating secrets"
sidebar_label: "Rotating secrets"
slug: /operations/rotating-secrets
---

# Rotating secrets

Secrets are generated once at install and kept. Rotating one is a deliberate act: **delete the
Secret, run the install again, restart what read the old value.** This page lists every secret and
what depends on it. Namespace `stardelt` is assumed. Never print a Secret value into a ticket, log or chat.

## Inventory

| Secret | Keys | Created by | Read by | After a rotation |
|---|---|---|---|---|
| `stardelt-s3-creds` | `access-key`, `secret-key`, `endpoint`, `bucket`, `region` | `scripts/secrets-bootstrap.sh` / chart | Trino, Lakekeeper bootstrap, Airflow, CNPG backups | restart Trino; refresh Lakekeeper's warehouse credential; restart the CNPG pod |
| `seaweedfs-s3-config` | `seaweedfs_s3_config` (JSON, same key pair) | same, derived from the above | SeaweedFS S3 gateway | rolls with the Helm upgrade |
| `keycloak-admin` | `username`, `password` | `identity-bootstrap.sh` / chart | Keycloak (bootstrap admin) | restart Keycloak; the bootstrap admin is only created on first start, so also change the password in the console |
| `stardelt-realm-admin` | `username`, `password` | same | realm import (first start only) | change it in the realm; the Secret is not re-read |
| `stardelt-oidc-clients` | `nova`, `superset`, `airflow`, `jupyterhub` | same | Keycloak realm import (first start only), each app | change the client secret in Keycloak first, then the Secret, then restart the app |
| `stardelt-nova-session` | `session` | same | Nova | restart Nova; everyone is signed out |
| `stardelt-superset` | `SUPERSET_SECRET_KEY`, `SUPERSET_ADMIN_PASSWORD` | bootstrap / chart | Superset pods | invalidates sessions and stored DB passwords; reset the admin password inside Superset |
| `stardelt-airflow` | `fernet-key`, `jwt-secret`, `webserver-secret-key`, `api-secret-key`, `admin-password` | same | Airflow pods | a new Fernet key makes stored connection passwords unreadable: re-enter them |
| `*-pg-app` (CNPG) | `username`, `password` | CloudNative-PG | Lakekeeper, Keycloak | managed by the operator; rotate with its documentation |

Keycloak imports its realm only on first start: changing `stardelt-oidc-clients` or
`stardelt-realm-admin` does not change the running realm. Change the value in Keycloak (admin
console through a port-forward, see [security model](../architecture/security-model)), then align the Secret.

## Rotating the S3 key pair

```bash
kubectl -n stardelt delete secret stardelt-s3-creds seaweedfs-s3-config
kubectl -n stardelt delete job lakekeeper-bootstrap --ignore-not-found
make install-core            # generates new Secrets, upgrades SeaweedFS, re-runs the bootstrap Job
kubectl -n stardelt rollout restart deploy/seaweedfs-s3 deploy/trino-coordinator deploy/trino-worker deploy/lakekeeper
kubectl -n stardelt delete pod lakekeeper-pg-1     # CNPG reads backup credentials at pod start
```

Why each step: the Lakekeeper warehouse stores the key (encrypted) and only the bootstrap Job's
credential refresh updates it (`POST /management/v1/warehouse/{id}/storage-credential`);
Trino and CNPG read the Secret when their pods start. Prove it with a write and a read:

```bash
kubectl -n stardelt exec deploy/trino-coordinator -- trino --execute \
  "CREATE SCHEMA IF NOT EXISTS warehouse.rotation_check"
kubectl -n stardelt exec deploy/trino-coordinator -- trino --execute \
  "CREATE TABLE warehouse.rotation_check.t AS SELECT 1 AS x"
kubectl -n stardelt exec deploy/trino-coordinator -- trino --execute "SELECT x FROM warehouse.rotation_check.t"
kubectl -n stardelt exec deploy/trino-coordinator -- trino --execute "DROP TABLE warehouse.rotation_check.t"
kubectl -n stardelt exec deploy/trino-coordinator -- trino --execute "DROP SCHEMA warehouse.rotation_check"
```

An already-committed key (the pre-generation default) is **never** rotated automatically: the
install keeps an existing Secret. Delete it as above to move to a generated one.

## Status

Generated credentials and the bootstrap script are ticketed under
[stardelt-platform#53](https://github.com/stardelt/stardelt-platform/issues/53); until they merge, the
Secrets above that hold fixed defaults can only be changed by editing the values files by hand.
