---
title: "Identity"
sidebar_label: "Identity"
slug: /architecture/identity
---

# Identity and access

**One identity, from the login page to the table.** The token that signs you in to Nova is the token
your query carries to the SQL engine.

## The shape

```text
   browser ──login──▶ Nova ──OIDC authorization code + PKCE──▶ identity provider
                       │                                        (Keycloak or your own)
                       │  session cookie (HttpOnly, Secure)
                       ▼
                  Nova backend ──your access token──▶ Trino ──▶ permission check
                                                        │
                                                        ▼
                                                   Lakekeeper (as a service)
```

Nova holds no passwords and no user store. Keycloak ships as the default. Any standards-compliant OIDC
provider, such as Entra ID, Okta or your own Keycloak, can take its place.

Trino authenticates you and asks the permission store whether you may do what you asked. Trino then
talks to the catalog as a trusted service, not as you. [Per-component sign-in](./identity-integrations)
explains each hop.

## Choose a mode

| `identity.mode` | What happens |
|---|---|
| `none` (chart default) | No sign-in. Everyone is treated the same. For trying things out behind a port-forward |
| `platform` | stardelt deploys Keycloak at `id.<baseDomain>` with the `stardelt` realm and its clients |
| `external` | You bring the OIDC provider and register the clients yourself |

Switching a running install to sign-in is a values change and a rollout, with no data migration.

## Names

| Thing | Value | Notes |
|---|---|---|
| Realm | `stardelt` | users, groups and clients; one per platform |
| Issuer URL | `https://id.<baseDomain>/realms/stardelt` | what every component validates against |
| Nova client | `nova`, confidential | authorization code with PKCE, redirect `https://<nova-host>/api/auth/callback` |
| Trino client | `trino`, public | bearer tokens for queries |
| Admin | a member of `stardelt-admins` | group membership is the role |

## Nova's settings

| Variable | Meaning |
|---|---|
| `NOVA_AUTH_MODE` | `dev` (no login, the default) or `oidc` |
| `NOVA_OIDC_ISSUER` | Issuer URL; discovery is `/.well-known/openid-configuration` |
| `NOVA_OIDC_CLIENT_ID`, `NOVA_OIDC_CLIENT_SECRET` | Registered client credentials |
| `NOVA_OIDC_SCOPES` | Default `openid profile email` |
| `NOVA_SESSION_SECRET` | Signs the session cookie; generated per install |
| `NOVA_OIDC_GROUP_CLAIM` | Claim that carries groups, default `groups` |
| `NOVA_OIDC_ADMIN_GROUP` | Group that maps to Nova admin, default `stardelt-admins` |
| `NOVA_FORWARD_IDENTITY` | Sends the caller's token to Trino, so queries run as that person |

## How you sign in

- **Browser.** Nova sends you to the identity provider, exchanges the returned code for tokens, verifies
  them, and sets a session cookie. The cookie holds a reference, and tokens stay on the server.
- **Scripts and tools.** Send `Authorization: Bearer <access token>` on any `/api/*` route. `stardelt
  login` gets a token with the device code flow. See
  [Python, command line and agents](../guides/sdk-cli-mcp).
- **Check yourself.** `GET /api/me` returns your claims and whether your identity is forwarded
  (`identity_forwarding`).

## Claims Nova reads

| Claim | Used for |
|---|---|
| `sub` | The stable user identifier |
| `preferred_username`, `email` | Display |
| `groups` (configurable) | Administrator or not, and which groups you belong to |
| `exp`, `aud`, `iss` | Validation only |

## Rules

- Tokens never appear in a URL, a log line or an error message.
- The session cookie is `HttpOnly`, `SameSite=Lax`, and `Secure` on HTTPS.
- Logging out ends the session in Nova and at the identity provider.
- Group membership is the role. There are no per-user special cases.
- A failed identity provider is a failed login. Nova never falls back to `dev` at runtime.
