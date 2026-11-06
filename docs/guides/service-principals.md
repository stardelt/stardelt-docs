---
title: "Service principals"
sidebar_label: "Service principals"
slug: /guides/service-principals
---

## What a service principal is

A non-human identity with an owner group; jobs and automation sign in with it instead of with a person's token. The token carries the owner group, so the catalog's group rules apply to it exactly as to a person.

## Create it

Two paths, both shown:

- **Operator** (a `PlatformInstance` with `identity.mode: platform`): create a `ServicePrincipal` with `spec.ownerGroup`, `spec.audiences` (default `["trino","lakekeeper"]`), `spec.purpose` (`pipeline`, `maintenance` or `collector`). Then check its status:

  ```bash
  kubectl -n stardelt get serviceprincipal pipeline-analytics -o jsonpath='{.status.ready} {.status.clientId}'
  ```
- **Platform install** (`make install`): use the helper script:

  ```bash
  make sync-principal NAME=pipeline-analytics GROUP=analytics AUDIENCES="trino lakekeeper"
  ```
- **External IdP:** the registration is made in the IdP and `spec.existingSecretRef` points at the Secret holding `client-id`/`client-secret`.

## Use it

Read the credentials from the Secret and request a token; do not print the secret:

```bash
NS=stardelt
ISSUER=$(kubectl -n "$NS" get configmap stardelt-identity -o jsonpath='{.data.issuerUrl}')
CID=$(kubectl -n "$NS" get secret sp-pipeline-analytics -o jsonpath='{.data.client-id}' | base64 -d)
CSECRET=$(kubectl -n "$NS" get secret sp-pipeline-analytics -o jsonpath='{.data.client-secret}' | base64 -d)
curl -fsS "$ISSUER/protocol/openid-connect/token" \
  -d grant_type=client_credentials -d client_id="$CID" -d client_secret="$CSECRET" \
  | jq -r .access_token | head -c 20
```

Expected: a 20-character prefix of a JWT (e.g. `eyJhbGciOiJSUzI1NiIs`).

Pass it as `Authorization: Bearer …` to Trino or Lakekeeper; the audiences decide which of the two accepts it; `spec.purpose` decides nothing by itself — grants do.

## Who may use it, who may read it

Members of `spec.ownerGroup` may use the principal; nobody reads the secret through Nova, and the Secret is not mounted into notebooks. Rotating it is deleting the Secret (operator path) or `ROTATE=1` (platform path); the old secret stops working immediately.

## Delete it

```bash
kubectl delete serviceprincipal pipeline-analytics
```
or
```bash
make delete-principal NAME=pipeline-analytics YES=1
```
The client and its Secret go with it.

## Check it

```bash
kubectl -n stardelt get serviceprincipals
```
Expect one row per principal, with `READY` true.

## Related

- [ServicePrincipal reference](../reference/resources/serviceprincipal)
- [Airflow](./airflow)
- [Identity integrations](../architecture/identity-integrations)
- [Schedule SQL](./schedule-sql)
