---
title: "Identity"
sidebar_label: "Identity"
slug: /architecture/identity
---

# Identity and access

**One identity, from the login page to the table.** This is the platform's central integration: the
token that authenticates you in Nova is the token your query carries and the catalog
enforces. Everything below is the contract the components implement — the values, environment
variables and flows are stable enough to build against; the implementation lands in phases.

## The shape

```text
   browser ──login──▶ Nova ──OIDC authorization code + PKCE──▶ IdP (Keycloak, or your own)
                       │                                          │
                       │  session cookie (HttpOnly, Secure)        │  ID + access token
                       ▼                                          ▼
                  Nova backend ──Bearer access token──▶ Trino / Lakekeeper
                                                                  │
                                                                  ▼  (later)
                                                        OPA: row/column policy
```

Nova is a *client*, never an identity store: it holds no passwords and no user database. The
identity provider is a plug like every other component — Keycloak ships as the default, and any
standards-compliant OIDC provider (Entra ID, Okta, Auth0, a corporate Keycloak) drops in behind the
same environment variables.

## Naming

| Thing | Value | Notes |
|---|---|---|
| Realm | `stardelt` | the tenant of users, groups and clients; one per platform instance |
| Issuer URL | `https://id.<baseDomain>/realms/stardelt` | what everything validates against |
| Nova client | `nova`, confidential | authorization code + PKCE, redirect `https://<nova-host>/api/auth/callback` |
| Trino client | `trino`, public | bearer tokens for the query path (phase 2) |
| Admin | `admin` in the `stardelt-admins` group | group membership is the role here, not a flag on the user |

## Nova's environment

| Variable | Meaning |
|---|---|
| `NOVA_AUTH_MODE` | `dev` (default) or `oidc`. `dev` keeps the no-login development behaviour. |
| `NOVA_OIDC_ISSUER` | issuer URL; discovery is `/.well-known/openid-configuration` |
| `NOVA_OIDC_CLIENT_ID` / `NOVA_OIDC_CLIENT_SECRET` | registered client credentials |
| `NOVA_OIDC_SCOPES` | default `openid profile email` |
| `NOVA_SESSION_SECRET` | signs the session cookie; generated per install |
| `NOVA_OIDC_GROUP_CLAIM` | claim carrying groups, default `groups` |
| `NOVA_OIDC_ADMIN_GROUP` | group that maps to Nova admin, default `stardelt-admins` |

`NOVA_AUTH_MODE=dev` must keep working forever: it is what CI, the kind gate and `make demo` use, and
a misconfigured IdP must never lock an operator out of their own platform. Switching a running
install to `oidc` is a values change plus a rollout — no data migration.

## Flows

**Interactive (browser).** `GET /api/auth/login` → 302 to the IdP with a PKCE challenge and a `state`
value; the IdP redirects back to `/api/auth/callback`; Nova exchanges the code for tokens, verifies
the ID token (issuer, audience, signature via the IdP's JWKS, `nonce`), and sets a session cookie
holding the *server-side* session reference, never the raw token in the browser's reach.
`POST /api/auth/logout` clears the session and redirects to the IdP's end-session endpoint.

**Programmatic (API).** `Authorization: Bearer <access token>` on any `/api/*` route, validated the
same way. This is the same token a notebook or a pipeline would carry.

**Forwarding (phase 2).** Requests Nova makes to Trino and Lakekeeper carry the user's access token
rather than a service credential, so the catalog sees the real identity and can enforce policy. Until
that lands, Nova uses its service connection and says so: `/api/me` reports
`identity_forwarding: false` rather than implying an enforcement that is not happening.

## Claims Nova reads

| Claim | Used for |
|---|---|
| `sub` | stable user identifier, the only one that should be persisted |
| `preferred_username` / `email` | display |
| `groups` (configurable) | admin vs user; later, catalog policy subjects |
| `exp`, `aud`, `iss` | validation, never display |

## Rules

- Tokens never appear in a URL, a log line, or an error message; `/api/me` returns claims, not tokens.
- The session cookie is `HttpOnly`, `SameSite=Lax`, and `Secure` whenever the base domain is HTTPS.
- Logout is local *and* at the IdP, otherwise the next login silently reuses the old session.
- Group membership is the role. No per-user special cases in the platform.
- A failed IdP is a failed login, not a bypass: no fallback to `dev` at runtime, ever.

## Phases

| Phase | What lands | Where |
|---|---|---|
| 1 | Keycloak as an optional chart component; realm/client bootstrap; Nova login/logout | this page + the install guide |
| 2 | Token passthrough to Trino and Lakekeeper, so the catalog sees the user | tracked on the project board |
| 3 | Policy at the catalog: OPA row/column rules keyed on the same identity | planned |

The vocabulary phase 3 needs — which verbs exist, who owns an object, where row and column policy is
evaluated, and which layer is authoritative for each check — is part of the design work for that
phase and will be documented here when it lands.

The same rule governs the AI surfaces: the copilot runs under the signed-in user's token, so its
context can only be what that subject may see, and the SQL it proposes is executed by a human
through this same path. What that means for the prompt, the model endpoint and the audit record is
in Copilot research and proposal.
