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

Administrators grant catalog access, catalog-wide, on the **Catalogs** page
([Catalogs and access](../operations/catalogs-access)).

## Credentials

**No credential is committed, and none is a fixed default.** Every secret is generated once at install
and kept. It is never rotated implicitly. CI fails when a known default string is committed
(`scripts/check-no-default-secrets.sh`). [Rotating secrets](../operations/rotating-secrets) lists every
secret, who reads it and how to rotate it.

## AI assistants

Nova can serve a hosted endpoint for AI assistants at `POST /mcp` ([AI assistants](../guides/mcp)).
It is **off by default**, and an administrator turns it on per install with `spec.mcp.enabled`,
`nova.mcp.enabled` or `NOVA_MCP_ENABLED`.

An assistant is treated as untrusted code acting for a trusted person:

- **It acts as the person.** Every call carries that person's token; the engine and the catalog
  authorize the person, with their groups and grants. There is no service account behind the
  endpoint. Its tools are read-only, and `sql_read` accepts one reading statement and nothing else.
- **The token is bound to the endpoint.** It must carry the endpoint's audience and the
  `stardelt:read` scope, and the browser's session cookie is never accepted. A token without the
  scope is refused before any tool runs.
- **Answers are limited and audited.** A row cap, a 60-second limit with cancel in the engine, a
  per-person limit of 60 calls a minute, and 20 000 characters per answer. Every call writes one
  audit line (person, client, tool, status, duration and a hash of the arguments) and, with a state
  store, one database row an administrator can read.
- **Answers are data, never instructions.** The endpoint says so in its `initialize` answer and in
  every tool description, and no tool returns a secret value.
- **An administrator can switch it off** and can limit it to named client ids
  (`spec.mcp.allowedClients`).

## Your own model endpoint

stardelt ships no model and runs no inference. A model is an external, OpenAI-compatible endpoint
that an administrator connects with a [`ModelEndpoint`](../reference/resources/modelendpoint); Nova
is the only component that calls it, and today the probe is the only caller.

- **A prompt goes to the endpoint an administrator named, and nowhere else.** The resource carries
  the base URL and the model id. When a feature sends a prompt to an endpoint with
  `location: cloud`, that prompt leaves your cluster. `sendRows` is `false` by default, so query
  results are not sent to a model unless an administrator turns it on for that endpoint.
- **The key does not pass through an API.** `spec.keyRef` names a key of a `Connection` in the
  platform namespace. The operator projects that connection's synced secret into Nova's pod as one
  file per endpoint — `/var/run/stardelt/models/<endpoint>/key`, mode `0440`, read-only — and Nova
  never reads the Secret or the key reference through the Kubernetes API. The key is not in a Nova
  log line, an API answer or the browser.
- **The read path hides the address.** `GET /api/model-endpoints` answers an endpoint's name, its
  model, its location, its purposes and the probe's result — never its URL and never its key
  reference.
- **The probe sends four fixed requests, never your data.** Best-effort `/models` (for the context
  window), one chat with the fixed sentence *"Reply with one short sentence about lakes."*, the same
  with one tool definition, and the same asking for a JSON object. Its result is the endpoint's
  `status`: an endpoint that does not answer, cannot call a tool or cannot return JSON is marked
  unusable before a feature relies on it.

## Known limits

- **One storage key.** Trino, Spark Connect and the catalog read object storage with one platform
  key. Anything that holds that key can read every file, whatever the table permissions say.
- **Spark has weaker protection than Trino.** `spark` in a notebook passes your token, so the catalog decides
  which tables you may use. But row and column masks apply only in Trino, Spark writes files with the shared
  key, and Spark Connect has no authentication of its own, so it stays inside the cluster. Use `%sql` when
  a table has row or column masks. The plan to close these gaps is stardelt-platform#1670.
- **Network isolation is partial.** NetworkPolicies protect Lakekeeper, OpenFGA, JupyterHub and
  Superset's database on a `make` install. The rest of the namespace is flat, and the umbrella chart's
  core renders none.
- **The operator has broad rights.** Treat access to its namespace like cluster administrator access.
- **SeaweedFS sign-in stays off.** The pinned version must not use its own OIDC path (CVE-2026-77298,
  fixed in 4.40). stardelt uses static keys there. See
  [per-component sign-in](./identity-integrations).
- **An AI assistant's token reaches the engine directly.** The endpoint forwards the caller's token
  to Trino rather than exchanging it, and the engine checks no engine-specific audience today, so the
  same token authenticates against Trino's published endpoint. What bounds it is the person's own
  grants, not the read-only tool surface. A token exchange that mints an engine-bound token is
  planned.
- **The endpoint cannot see an assistant's own tools.** It bounds what an assistant reads through
  the platform; it cannot stop the assistant's client from sending that data elsewhere, and it cannot
  stop an assistant from following instructions hidden in a table. Read the tool descriptions and the
  [guide](../guides/mcp) as the contract, and treat every answer as untrusted text.
- **A model endpoint is software outside the platform's control.** stardelt decides what it sends —
  the prompt, and query results only with `sendRows: true` on a `cloud`-marked endpoint — and the
  endpoint's operator decides what it keeps. Treat a model's answer as untrusted text, like an
  assistant's, and prefer an endpoint in your own network when the prompt carries sensitive data.
