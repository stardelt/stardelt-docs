---
title: "Security model"
sidebar_label: "Security model"
slug: /architecture/security-model
---

# Security model

What stardelt exposes, what it trusts, and where credentials come from. Each rule is
marked **built**, **ticketed** (a ready-to-implement ticket exists) or **open**.
The tracking issue (with current status) is [stardelt-platform#53](https://github.com/stardelt/stardelt-platform/issues/53).

## Trust boundaries

| Zone | Contains | Rule |
|---|---|---|
| **Edge** (internet) | Ingress controller, TLS | Publishes only components that authenticate users. Default: Nova and the identity provider |
| **Identity plane** | Keycloak (platform IdP) or an external IdP | One realm/tenant; every block validates tokens issued by it ([identity](./identity), [per-block SSO](./identity-integrations)) |
| **Application plane** | Nova, Superset, Airflow, JupyterHub | Sign in through the IdP; never published without it |
| **Data plane** | Trino, Lakekeeper, SeaweedFS, Postgres | Cluster-internal. Reached through Nova or a port-forward |
| **Control plane** | Operator, Helm releases | Cluster-admin-equivalent today ([operator RBAC RFC](https://github.com/stardelt/stardelt-operator/issues/48)) |

## Publishing rules

1. **A component is published only if it authenticates users against the platform identity.**
   Built: Nova (OIDC), Superset and Airflow (Keycloak SSO), JupyterHub (Keycloak, group-gated) and
   Trino (every statement needs a Keycloak token; an unauthenticated `POST /v1/statement` is answered 401).
   Lakekeeper is not published. The umbrella chart renders an Ingress for a component without sign-in
   only when asked (`ingress.exposeUnauthenticated`).
2. **Keycloak publishes an allow-list, not the whole host.** Built in the playground Ingress and in
   `chart/templates/ingress.yaml` as ingress-nginx regexes, following Keycloak's
   [reverse-proxy guide](https://www.keycloak.org/server/reverseproxy): `/realms/stardelt`, `/resources`,
   `/robots.txt`, and the `stardelt` realm's console (`/admin/stardelt`, `/admin/realms/stardelt`,
   `/admin/serverinfo`) so platform admins can manage users. The master realm (`/realms/master`,
   `/admin/master`), `/health` and `/metrics` fall through to 404. For master-realm work use
   `kubectl -n stardelt exec -it deploy/keycloak -- /opt/keycloak/bin/kcadm.sh` (break-glass).
3. **Trino accepts authenticated HTTPS only, inside the cluster too.** The coordinator serves TLS from an internal certificate authority; plain HTTP answers `Authentication over HTTP is not enabled`, so a pod cannot claim another user's name. Clients (Nova, Superset, notebooks) trust the platform CA bundle.

## Credentials contract

**No credential is committed, and none is a fixed default.** Every secret is generated at install
time, once, and never rotated implicitly.

| Path | How it is generated | Where |
|---|---|---|
| Helm chart | `randAlphaNum` + `lookup` (kept across `helm upgrade`), `helm.sh/resource-policy: keep` | `chart/templates/*.yaml` |
| Makefile install | `openssl rand`, mode-0600 temp files, never on a command line or in a log, skipped if the Secret exists | `scripts/identity-bootstrap.sh` (Keycloak, OIDC clients, Nova session), `scripts/app-secrets.sh` (Airflow, Superset) |
| **Still committed** | the SeaweedFS S3 key pair (`chart/values.yaml`, `helm-values/seaweedfs.yaml`, `manifests/s3-credentials.dev.yaml`) | generation is ticketed: [#100](https://github.com/stardelt/stardelt-platform/issues/100), [#101](https://github.com/stardelt/stardelt-platform/issues/101), [#102](https://github.com/stardelt/stardelt-platform/issues/102); rotation of the live cluster: [#108](https://github.com/stardelt/stardelt-platform/issues/108) |
| Guard | CI fails when a known default string is committed | `scripts/check-no-default-secrets.sh`, ticketed: [#107](https://github.com/stardelt/stardelt-platform/issues/107) |

The inventory of every secret (who creates it, who reads it, how it rotates) is in
[rotating secrets](../operations/rotating-secrets).

## Open items

- Network isolation: no `NetworkPolicy` exists anywhere; the namespace is flat
  ([tenancy RFC](https://github.com/stardelt/stardelt-operator/issues/50)).
- Per-user authorization: Lakekeeper runs `allowall` and Trino has no authenticator, so any signed-in user
  can run any DDL/DML their token allows (Trino now sees the user, but has no access rules yet) ([docs#34](https://github.com/stardelt/stardelt-docs/issues/34)).
- A secrets manager (OpenBao / External Secrets) is in the design but in no install path
  (see [licenses](./licenses)).
