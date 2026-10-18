---
title: "Security model"
sidebar_label: "Security model"
slug: /architecture/security-model
---

# Security model

What stardelt exposes, what it trusts, and where credentials come from. Status of each rule is
marked **built**, **ticketed** (a ready-to-implement ticket exists) or **open** (decision pending).
The gap analysis ([G-C1, G-M3](../design/gap-analysis)) records where `main` still differs; the
tracking issue is [stardelt-platform#53](https://github.com/stardelt/stardelt-platform/issues/53).

## Trust boundaries

| Zone | Contains | Rule |
|---|---|---|
| **Edge** (internet) | Ingress controller, TLS | Publishes only components that authenticate users. Default: Nova and the identity provider |
| **Identity plane** | Keycloak (platform IdP) or an external IdP | One realm/tenant; every block validates tokens issued by it ([identity](./identity), [per-block SSO](./identity-integrations)) |
| **Application plane** | Nova, Superset, Airflow, JupyterHub | Sign in through the IdP; never published without it |
| **Data plane** | Trino, Lakekeeper, SeaweedFS, Postgres | Cluster-internal. Reached through Nova or a port-forward |
| **Control plane** | Operator, Helm releases | Cluster-admin-equivalent today ([operator RBAC RFC](https://github.com/stardelt/stardelt-operator/issues/48)) |

## Publishing rules

1. **Default-deny publishing.** A component gets a public Ingress only if it authenticates users
   against the platform identity. Components without sign-in (Trino, Lakekeeper, today Superset/Airflow/JupyterHub)
   are reachable by port-forward, or through an explicit opt-in file/value that says why it is unsafe
   (**ticketed**: [#48](https://github.com/stardelt/stardelt-platform/issues/48), [#49](https://github.com/stardelt/stardelt-platform/issues/49)).
2. **Keycloak publishes only what a browser or client needs**, following Keycloak's own
   [reverse-proxy guide](https://www.keycloak.org/server/reverseproxy): `/realms`, `/resources`
   and `/.well-known` are public; `/`, `/admin`, `/metrics`, `/health` are not; `/realms/master`
   (the administrative realm) is internal. The admin console is reached through
   `kubectl port-forward svc/keycloak 8080:8080` with `KC_HOSTNAME_ADMIN=http://localhost:8080`
   (**ticketed**: [#97](https://github.com/stardelt/stardelt-platform/issues/97),
   [#98](https://github.com/stardelt/stardelt-platform/issues/98),
   [#99](https://github.com/stardelt/stardelt-platform/issues/99)). The path layout was exercised on
   the dev cluster's ingress-nginx: unlisted paths answer 404, `/realms/master` answers 403.
3. **Trino is never published by default.** Humans use Nova's SQL editor; tools use a port-forward.
   Native OAuth2 (coordinator TLS, confidential client, token forwarding) is the target for
   per-user identity (**open**: [RFC #106](https://github.com/stardelt/stardelt-platform/issues/106)).
   An edge-proxy gate (oauth2-proxy) is rejected: it adds a component for a UI most users do not need.

## Credentials contract

**No credential is committed, and none is a fixed default.** Every secret is generated at install
time, once, and never rotated implicitly.

| Path | How it is generated | Where |
|---|---|---|
| Helm chart | `randAlphaNum` + `lookup` (kept across `helm upgrade`), `helm.sh/resource-policy: keep` | `chart/templates/*.yaml` |
| Makefile install | `openssl rand`, mode-0600 temp files, never on a command line or in a log, skipped if the Secret exists | `scripts/identity-bootstrap.sh`, `scripts/secrets-bootstrap.sh` |
| Guard | CI fails when a known default string is committed | `scripts/check-no-default-secrets.sh` (**ticketed**: [#107](https://github.com/stardelt/stardelt-platform/issues/107)) |

The inventory of every secret (who creates it, who reads it, how it rotates) is in
[rotating secrets](../operations/rotating-secrets).

## Open items

- Network isolation: no `NetworkPolicy` exists anywhere; the namespace is flat
  ([tenancy RFC](https://github.com/stardelt/stardelt-operator/issues/50)).
- Per-user authorization: Lakekeeper runs `allowall` and Trino has no authenticator, so any signed-in user
  can run any SQL through Nova under Nova's identity ([docs#34](https://github.com/stardelt/stardelt-docs/issues/34)).
- A secrets manager (OpenBao / External Secrets) is in the design but in no install path
  ([licenses](./licenses), gap G-M3).
