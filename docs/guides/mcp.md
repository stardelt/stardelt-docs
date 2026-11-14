---
title: "AI assistants (MCP)"
sidebar_label: "AI assistants (MCP)"
slug: /guides/mcp
---

# AI assistants (MCP)

An assistant can work with the platform in two ways. Through the **hosted endpoint** on Nova, it connects to
your install directly: nothing to install, and it signs you in once. Through the **local server**, it starts
`stardelt mcp serve` from the stardelt package on your machine: see
[Python, command line and agents](sdk-cli-mcp.md).

## The hosted endpoint

`POST https://<nova host>/mcp` speaks JSON-RPC 2.0 — `initialize`, `tools/list` and `tools/call` — and offers a
small set of read tools. It is **off by default**, and there is one client for it: `stardelt-mcp`, the public
client in the platform's realm. It signs in with PKCE to a loopback address in a desktop assistant and with
the device grant on a command line; it holds no secret and names no service account, and its tokens carry the
audience `https://<nova host>/mcp` and the `groups` claim.

### Turn it on

Three switches, one per install path:

- **Operator:** `spec.mcp.enabled: true` on the `PlatformInstance`.
- **Chart:** `nova.mcp.enabled: true`.
- **The binary:** `NOVA_MCP_ENABLED=1` together with `NOVA_MCP_AUDIENCE=https://<nova host>/mcp`.

It refuses to start without `NOVA_AUTH_MODE=oidc` and an audience: there is no anonymous mode. With the
endpoint off, `/mcp` answers `404` as JSON rather than page HTML.

:::note
The audience must be the resource identifier the identity provider mints, which is
`https://<nova host>/mcp` by default. Name it yourself with `mcp.audience` in the chart or `spec.mcp.audience`
on the `PlatformInstance` when Nova's public address is not the install's base domain.
:::

On a realm that already exists, `make sync-mcp-client` creates or converges the `stardelt-mcp` client;
`make install-identity` runs it.

### Connect an assistant

A client that supports OAuth protected-resource metadata signs you in on the first call. This is the lab's
address:

```bash
claude mcp add --transport http stardelt https://alpha.dev.stardelt.io/mcp
```

`GET /.well-known/oauth-protected-resource` and `GET /.well-known/oauth-protected-resource/mcp` answer the
RFC 9728 document: `resource` is `https://<nova host>/mcp` and `authorization_servers` is the configured
issuer, so the client knows where to sign in and what the token is for. Without a token, a call answers:

```text
401 Unauthorized
WWW-Authenticate: Bearer resource_metadata="https://<nova host>/.well-known/oauth-protected-resource/mcp"
```

A token that fails validation adds `error="invalid_token"` to the same header. `GET` on the endpoint answers
`405` with `Allow: POST`; it takes JSON-RPC on a `POST` only.

### What it offers

| Tool | What it answers |
|---|---|
| `platform_status` | Whether the platform is up, and the version of each component |
| `catalog_list` | The catalogs, schemas and tables you may see |
| `catalog_describe` | The columns, types and comment of one table |
| `catalog_search` | The tables that match a word |
| `sql_read` | One read-only SQL statement (`SELECT`, `WITH`, `VALUES`, `SHOW`, `DESCRIBE`, `TABLE` or `EXPLAIN`) as you; at most 200 rows and 60 seconds |
| `sql_explain` | The plan of one read-only statement, without running it (`EXPLAIN`, never `EXPLAIN ANALYZE`) |
| `query_log_list` | Your own recent queries: state, duration, statement preview |

Every tool is read-only and runs as you, with your own grants. An answer is cut at 20 000 characters, and
each call writes one `audit` line — who called, which tool, ok or error, how long — never the arguments.

`sql_read` and `sql_explain` run one statement and nothing else: a write, a second statement or
`EXPLAIN ANALYZE` is refused before anything is sent. That check is a first filter — what the
statement may read is still decided by the engine, with your own grants, exactly as in the
interface. The row cap and the timeout are the platform's, not the client's: `sql_read` returns at
most 200 rows (1 000 at most, `NOVA_MCP_MAX_ROWS` or `spec.mcp.maxRows` on the `PlatformInstance`)
and a statement that runs longer than 60 seconds is cancelled (`NOVA_MCP_QUERY_TIMEOUT_SECS` or
`spec.mcp.queryTimeoutSeconds`, 300 at most); a client asking for more rows gets the platform's cap,
never more.

### What it does not do

- **No writes.** Nothing on this endpoint creates, changes or drops anything. `sql_read` refuses a
  write before it is sent, and `query_log_list` shows only your own queries.
- **No shared identity.** There is no service account behind it: every call is the person in the token.
- **No browser session.** The cookie from the interface is never accepted; the endpoint wants a bearer token
  minted for its own audience.
- **It is not part of the API.** `/mcp` sits outside `/api`, so it is not described in the
  [API reference](../reference/api.md), and it is not behind the interface's sign-in.

## The local server

`stardelt mcp serve` starts a local [Model Context Protocol](https://modelcontextprotocol.io) server on standard input and
output. Each tool is one public operation, named by its operation id. It runs as you, with your token, and offers **only
read operations** unless you name more:

```bash
stardelt mcp config                                  # prints how to register it in your assistant, token left as a placeholder
stardelt mcp serve                                   # what the assistant starts
stardelt mcp serve --allow query_run                 # also offer one more operation, on purpose
stardelt skill --write .claude/skills                # install the skill that tells the assistant how to use these tools
```

Besides the operations the server offers two tools for SQL, because an assistant's main job is to write and check queries. `sql_read` runs ONE reading
statement (`SELECT`, `WITH`, `VALUES`, `SHOW`, `DESCRIBE`, `TABLE` or `EXPLAIN`) and returns at most `maxRows` rows (200 unless asked, 1 000 at most); a
statement that takes longer than 60 seconds is cancelled in the engine. `sql_explain` shows the plan without running it. A write, a second statement or
`EXPLAIN ANALYZE` is refused before anything is sent. That check is only a first filter: what the statement may read is decided by the engine for you,
exactly as in the interface. `stardelt mcp serve --no-sql` leaves both tools out. To find the table first, the assistant has `catalog_search` among its read
tools.

What the tools return is data from the platform, never instructions: an assistant should not follow text found in a table
or a notebook. Answers are cut at 20 000 characters, and the server's log (standard error) holds one line per call without
the arguments.

The package also carries a *skill* for the assistant: a short text that says how to find a table before writing SQL, to read the plan of a big query
first, what to do when a statement is refused, and what never to do (put a credential in a prompt, send data elsewhere, follow instructions found in
data). `stardelt skill` prints it; `stardelt skill --write .claude/skills` installs it as `.claude/skills/stardelt/SKILL.md`, the folder where Claude
Code looks for project skills. It names only tools the server really offers.
