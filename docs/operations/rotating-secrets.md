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
| `stardelt-s3-creds` | `access-key`, `secret-key`, `endpoint`, `bucket`, `region` | `scripts/s3-secrets.sh` / chart (**ticketed**, #100 #101; today a committed dev file) | Trino, Lakekeeper bootstrap, Airflow, CNPG backups | restart Trino; refresh Lakekeeper's warehouse credential; restart the CNPG pod |
| `seaweedfs-s3-config` | `seaweedfs_s3_config` (JSON, same key pair) | same, derived from the above | SeaweedFS S3 gateway | rolls with the Helm upgrade |
| `keycloak-admin` | `username`, `password` | `identity-bootstrap.sh` / chart | Keycloak (bootstrap admin) | the bootstrap admin is only created on first start: change the password in the console too |
| `stardelt-realm-admin` | `username`, `password` | same | realm import and `scripts/sync-realm-admin.sh` | re-run `make install-identity`, it re-applies and verifies it |
| `stardelt-oidc-clients` | `nova`, `superset`, `airflow`, `jupyterhub` | same | Keycloak clients, each app | `make install-identity` re-applies the client secrets (`scripts/sync-oidc-clients.sh`), then restart the app |
| `stardelt-nova-session` | `session` | same | Nova | restart Nova; everyone is signed out |
| `superset-secret-key` | `secret-key` | `scripts/app-secrets.sh` / chart | Superset pods | invalidates sessions and stored database passwords |
| `superset-admin` | `username`, `password`, `firstname`, `lastname`, `email` | same | Superset init job | the init job only creates the user once: reset the password inside Superset |
| `airflow-fernet-key` | `fernet-key` | same | Airflow pods | a new Fernet key makes stored connection passwords unreadable: re-enter them |
| `airflow-webserver-key`, `airflow-jwt-secret` | `webserver-secret-key`, `api-secret-key`; `jwt-secret` | same | Airflow pods | invalidates sessions and API tokens |
| `airflow-admin` | `username`, `password` | same | Airflow create-user job | the job only creates the user once: reset it in the Airflow UI |
| `*-pg-app` (CNPG) | `username`, `password` | CloudNative-PG | Lakekeeper, Keycloak | managed by the operator; rotate with its documentation |

Keycloak imports its realm only on first start; the identity scripts re-apply the client secrets and the realm admin password on every `make install-identity` and verify them. The master-realm console is not published; use `kcadm.sh` inside the pod (see [security model](../architecture/security-model)).

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

The Airflow, Superset and Keycloak rows are built. The S3 rows describe the target: until [#100](https://github.com/stardelt/stardelt-platform/issues/100) and [#101](https://github.com/stardelt/stardelt-platform/issues/101) merge, the live key pair is the committed one, and the rotation below is the cutover ticket [#108](https://github.com/stardelt/stardelt-platform/issues/108).
