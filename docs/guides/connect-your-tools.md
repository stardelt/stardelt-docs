---
title: "Use your own SQL client and BI tool"
sidebar_label: "Your own SQL client and BI tool"
slug: /guides/connect-your-tools
---

# Use your own SQL client and BI tool

The platform's query engine speaks Trino's HTTP protocol, so a desktop SQL client, a BI tool, a Python
script or anything else that speaks Trino connects to it from your own machine. The engine applies *your*
grants — the catalogs, schemas and tables your account and groups may read — and the
[query log](/docs/guides/query-log) shows the query with the kind of client that sent it.

## What you need

- **The address:** `https://trino.<baseDomain>`. An install with `baseDomain: data.example.com` answers on
  `https://trino.data.example.com`. The lab runs at `https://trino.alpha.dev.stardelt.io`.
- **Your stardelt account** — the one you sign in to Nova with. Any client signs in as you.
- **The CA's PEM file** if the site's certificate is not publicly trusted (an install with its own
  certificate authority). A JDBC tool reads the JVM's truststore; a Python client takes the file as `verify=`.

## Your sign-in, three ways

The engine has no password login. It accepts a token from your identity provider, and it is the token that
decides who you are. Pick the way that matches the tool.

### 1. A desktop tool with Trino's external authentication

For a JDBC tool that can open a browser — a desktop client or a BI tool that accepts a JDBC URL and
driver properties:

```text
jdbc:trino://trino.<baseDomain>/warehouse?SSL=true&externalAuthentication=true
```

Set the user property to your address (`you@example.com`); it is required by the protocol and the engine
does not use it. On connect the driver gets `401` with a `www-authenticate` challenge that carries two URLs,
opens a browser at the first, and polls the second until you have signed in once. The sign-in is the same one
you use for Nova, and the driver keeps the token for the session.

`current_user` in the engine is the person in the token, not the user property — the platform sets
`principal-field=sub`, so the engine's `current_user` is the token's `sub`: the id your identity provider
gave you, which the engine's group rules match on. `SELECT current_user` therefore prints an id rather than
your address.

### 2. A tool that takes only a token

For a client that can send an `Authorization` header but cannot open a browser — a Python script, a
command-line tool, a worksheet plugin:

```bash
stardelt login --host https://<baseDomain>
```

`stardelt login` runs the device flow: it prints an address and a short code, you approve them in a browser,
and it writes the sign-in to `~/.config/stardelt/credentials.json` (mode 0600) with `access_token`,
`refresh_token`, `expires_at`, `token_endpoint` and `client_id`. Read `access_token` from that file and send
it as `Authorization: Bearer <token>`, or as the JDBC `accessToken=` property.

The token is short-lived. The CLI renews it from the refresh token while that is valid, so run the command
again when a client starts answering `401`. There is no page in Nova that hands out a token: the file the
CLI writes is how a person holds one.

Do not commit the file or paste the token into a script that others can read; it acts as you until it expires.

### 3. An unattended tool

For a scheduled export, a server-side dashboard refresh or anything that runs without a person: a
[service principal](/docs/guides/service-principals) with client credentials. It signs in with its own client
id and secret, never with a person's password, and its grants are the principal's owner group — not yours.

## Settings

| What you are connecting | Driver or property | Value |
|---|---|---|
| A JDBC tool | URL | `jdbc:trino://trino.<baseDomain>/warehouse?SSL=true` |
| A JDBC tool | driver class | `io.trino.jdbc.TrinoDriver` |
| A JDBC tool | `SSL` | `true` |
| A JDBC tool, browser sign-in | `externalAuthentication` | `true` |
| A JDBC tool, token | `accessToken` | the `access_token` from `~/.config/stardelt/credentials.json` |
| Python, `trino` client, token | `trino.dbapi.connect` | `trino.dbapi.connect(host="trino.<baseDomain>", port=443, http_scheme="https", auth=trino.auth.JWTAuthentication(token))` |
| Python, `trino` client, browser | `trino.auth.OAuth2Authentication` | the driver's own browser flow; see its documentation |
| The CLI | `trino` | `trino --server https://trino.<baseDomain> --external-authentication` |
| Raw HTTP | request | `POST https://trino.<baseDomain>/v1/statement` with `Authorization: Bearer <token>` |

A tool that only speaks ODBC is not supported: the engine publishes a JDBC driver, a Python client, an
HTTP protocol and a CLI, and no ODBC driver. A spreadsheet reaches the warehouse through its JDBC connector
or through a BI tool in front of it, not through ODBC.

## What applies

- **Your grants.** Statements run as the identity in the token, so a catalog or table you cannot open in the
  SQL editor fails the same way from your own client — with the engine's error, not with a login error.
- **Your groups.** The catalog decides which tables the token may use, and the engine applies masks and row
  filters, so your client reads the same columns and rows as the SQL editor.
- **The query log.** Every statement is recorded under the user in the token, with **Source** naming the kind
  of client: **JDBC client**, **Python client**, **Trino CLI**, or the tool's own name when it identifies
  itself ([where a query came from](/docs/guides/query-log#where-a-query-came-from)).

## Not available yet

- **ODBC.** An ODBC-only tool cannot connect, and the platform does not publish a driver for one.
- **A copy of the token in Nova.** There is no button that mints or shows a token; use `stardelt login`.
- **An expired token.** A client that holds a token past its lifetime gets `401` and must sign in again; it
  cannot renew the token on its own without the refresh token.

## What the endpoint answers

An unauthenticated statement shows the challenge a client uses. Reproduced against the lab install
(`https://trino.alpha.dev.stardelt.io`), with the URLs shortened:

```console
$ curl -sk -D- -o /dev/null -X POST https://trino.alpha.dev.stardelt.io/v1/statement -d 'select 1'
HTTP/2 401
www-authenticate: Basic realm="Trino"
www-authenticate: Bearer x_redirect_server="https://trino.alpha.dev.stardelt.io/oauth2/token/initiate/8aa4…",
                  x_token_server="https://trino.alpha.dev.stardelt.io/oauth2/token/f28c…",
                  x_token_endpoint="https://id.alpha.dev.stardelt.io/realms/stardelt/protocol/openid-connect/token",
                  scope="openid"
```

`x_redirect_server` is the address a browser opens; `x_token_server` is what the client polls until the
sign-in is complete. Both sit on the same host as the statement endpoint, so a network policy or an ingress
allow-list between your client and the engine must keep `/oauth2/` reachable — otherwise only token
authentication works.

`GET /` and `GET /ui` on that host answer `404`: the endpoint serves the client protocol, not a web
interface. Use Nova for the UI.
