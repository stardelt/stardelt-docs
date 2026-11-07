---
title: "Security model"
sidebar_label: "Security model"
slug: /architecture/security-model
---

# Security model

What stardelt exposes, what it trusts, and where credentials come from. [Known limits](#known-limits)
says what is not protected yet, so read it before you put real data on the platform.

To report a vulnerability, follow [the security policy](https://github.com/stardelt/.github/blob/main/SECURITY.md).

## Trust boundaries

| Zone | Contains | Rule |
|---|---|---|
| **Edge** | Ingress controller, TLS | Publishes only components that sign users in |
| **Identity** | Your OIDC provider (Keycloak, deployed by stardelt, or your own) | Every component validates tokens from one issuer ([Identity](./identity)) |
| **Applications** | Nova, Superset, Airflow, JupyterHub | Sign in through the identity provider; never published without it |
| **Data** | Trino, Lakekeeper, SeaweedFS, PostgreSQL | Inside the cluster. Trino can be published because it requires a token; the others are reached through Nova or a port-forward |
| **Control** | Operator, Helm releases | Holds cluster-wide rights, because installing charts requires them |

## Publishing rules

1. **A component is published only if it authenticates users against the platform's identity
   provider.** That covers Nova, Superset, Airflow, JupyterHub and Trino. Lakekeeper is not published.
   The umbrella chart renders an Ingress for a component without sign-in only if you ask for it with
   `ingress.exposeUnauthenticated`.
2. **Keycloak publishes an allow-list, not the whole host.** `/realms/stardelt`, `/resources`,
   `/robots.txt` and the `stardelt` realm's console are reachable. The master realm, `/health` and
   `/metrics` answer 404. For master-realm work, use
   `kubectl -n stardelt exec -it deploy/keycloak -- /opt/keycloak/bin/kcadm.sh`.
3. **With sign-in on, Trino accepts authenticated HTTPS only, inside the cluster too.** A pod cannot
   claim another user's name. Clients trust the platform's CA bundle.

## Who may read what

Groups in the identity provider are the only source of roles. What enforces them depends on how you
installed:

| | `make platform` with `IDENTITY=1` | Umbrella chart or `make install-core`, defaults |
|---|---|---|
| Sign-in | Keycloak | none (development mode) |
| SQL as the signed-in person | yes | no |
| Table permissions | OpenFGA, through Lakekeeper and its OPA bridge | none (`allowall`): everyone can do everything |

:::danger Without sign-in there is no access control
The default chart and core installs have no sign-in and no permissions. Use them only behind a
port-forward, with data you do not mind everyone on the cluster reading.
:::

## Credentials

**No credential is committed, and none is a fixed default.** Every secret is generated once at install
and kept. It is never rotated implicitly. CI fails when a known default string is committed
(`scripts/check-no-default-secrets.sh`). [Rotating secrets](../operations/rotating-secrets) lists every
secret, who reads it and how to rotate it.

## Known limits

- **One storage key.** Trino, Spark Connect and the catalog read object storage with one platform
  key. Anything that holds that key can read every file, whatever the table permissions say.
- **Spark has weaker protection than Trino.** `stardelt.spark()` passes your token, so the catalog decides
  which tables you may use. But row and column masks apply only in Trino, Spark writes files with the shared
  key, and Spark Connect has no authentication of its own, so it stays inside the cluster. Prefer the SQL
  engine or `stardelt.write_df` when permissions matter.
- **Network isolation is partial.** NetworkPolicies protect Lakekeeper, OpenFGA, JupyterHub and
  Superset's database on a `make` install. The rest of the namespace is flat, and the umbrella chart's
  core renders none.
- **The operator has broad rights.** Treat access to its namespace like cluster administrator access.
- **SeaweedFS sign-in stays off.** The pinned version must not use its own OIDC path (CVE-2026-77298,
  fixed in 4.40). stardelt uses static keys there. See
  [per-component sign-in](./identity-integrations).
