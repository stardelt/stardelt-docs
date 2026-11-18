---
title: "AI assistants (MCP)"
sidebar_label: "AI assistants (MCP)"
slug: /guides/mcp
description: "Connect an AI assistant to your install, through the hosted Nova endpoint or the local MCP server."
---

# AI assistants (MCP)

An assistant can work with the platform in two ways. Through the **hosted endpoint** on Nova, it connects to
your install directly: nothing to install, and it signs you in once. Through the **local server**, it starts
`stardelt mcp serve` from the stardelt package on your machine: see
[Python](python.md).

## The hosted endpoint

`POST https://<nova host>/mcp` speaks JSON-RPC 2.0 — `initialize`, `tools/list` and `tools/call` — and offers a
small set of read tools. It is **off by default**, and there is one client for it: `stardelt-mcp`, the public
client in the platform's realm. It signs in with PKCE to a loopback address in a desktop assistant and with
the device grant on a command line; it holds no secret and names no service account, and its tokens carry the
audience `https://<nova host>/mcp` and the `groups` claim.

The assistant's model is its own, not the platform's. A model that Nova itself may call is a
[model endpoint](./models.md).

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
WWW-Authenticate: Bearer resource_metadata="https://<nova host>/.well-known/oauth-protected-resource/mcp", scope="stardelt:read"
```

The metadata document names `stardelt:read` in `scopes_supported`, so a client asks for it in the
same sign-in. A token that fails validation adds `error="invalid_token"` to the header. A token
that is valid but carries no `stardelt:read` answers `403` with
`{"error":"insufficient_scope","required_scope":"stardelt:read"}` and a header naming the scope;
the client asks the identity provider again with that scope. The realm client `stardelt-mcp`
grants it by default — a client you registered yourself must request it.

The write tool `pipeline_start` needs a second scope, `stardelt:write`. The metadata document lists
both in `scopes_supported`, but `stardelt:write` is **optional**: the realm client `stardelt-mcp` does
not put it in a default token, so a client asks for it in the authorization request when it is meant to
start runs. A call without it answers `403` with
`{"error":"insufficient_scope","required_scope":"stardelt:write"}` and a header naming the scope; the
client asks the identity provider again with `stardelt:write` included.

`GET` on the endpoint answers `405` with `Allow: POST`; it takes JSON-RPC on a `POST` only.

### What it offers

| Tool | What it answers |
|---|---|
| `platform_status` | Whether the platform is up, and the version of each component |
| `catalog_list` | The catalogs, schemas and tables you may see |
| `catalog_describe` | The columns, types and comment of one table |
| `table_documentation` | What a table means: its description, owner group, domain, tags and every column's description, as the table's owners wrote them, and the guide its owners wrote on how to use it; takes `namespace` and `table` (`catalog` when the name is ambiguous) |
| `catalog_search` | The tables that match a word |
| `sql_read` | One read-only SQL statement (`SELECT`, `WITH`, `VALUES`, `SHOW`, `DESCRIBE`, `TABLE` or `EXPLAIN`) as you; at most 200 rows and 60 seconds |
| `sql_explain` | The plan of one read-only statement, without running it (`EXPLAIN`, never `EXPLAIN ANALYZE`) |
| `query_log_list` | Your own recent queries: state, duration, statement preview |
| `query_log_profile` | Where a finished query spent its time: the plan, the operator statistics, the bytes spilled and the hints that name what to change; takes the query `id` from `query_log_list` |
| `query_log_history` | The last 20 runs of the same statement by the same person, with the median wall time and whether this run is slower; takes the query `id` |
| `pipeline_list` | The pipelines you may see: owner group, schedule, state and last run |
| `pipeline_runs` | Recent runs of those pipelines, newest first; narrow with `pipeline` (`<namespace>/<name>`), `state` (for example `failed`) and `limit` (at most 100) |
| `pipeline_run` | One run with its tasks and their states — find the task that failed; takes `pipeline` (`<namespace>/<name>`) and `run_id` |
| `pipeline_task_log` | One page of a task's log, the error and stack frames included; pass `next_token` from the previous answer to read on |
| `lineage_get` | Where a table's data comes from and what is made from it, up to `depth` steps each way (`1`–`5`) and `days` back (`1`–`365`); takes `catalog`, `schema` and `table` |
| `pipeline_start` | Start one run of a pipeline now, as you — the interface's **Run now**. Needs the `stardelt:write` scope and a `reason` in one sentence (written to the audit line); takes `pipeline` (`<namespace>/<name>`) and returns the new run |

Every tool runs as you, with your own grants; all but `pipeline_start` are read-only. Read `table_documentation` before writing SQL against a table: the description, owner group, domain and tags tell you what the table is for, and its guide says how to use it. An answer is cut at 20 000 characters, and
each call writes one `audit` line — who called, which client, which tool, ok or error, how long and a
SHA-256 of the arguments — never the arguments themselves. With a state store, Nova also keeps one row
per call for an administrator's audit: when, who, which client, which tool, the status, the duration and
the same hash, for 30 days (`NOVA_MCP_AUDIT_RETENTION_DAYS`, or `spec.mcp.auditRetentionDays` on the
`PlatformInstance`).

`sql_read` and `sql_explain` run one statement and nothing else: a write, a second statement or
`EXPLAIN ANALYZE` is refused before anything is sent. That check is a first filter — what the
statement may read is still decided by the engine, with your own grants, exactly as in the
interface. The row cap and the timeout are the platform's, not the client's: `sql_read` returns at
most 200 rows (1 000 at most, `NOVA_MCP_MAX_ROWS` or `spec.mcp.maxRows` on the `PlatformInstance`)
and a statement that runs longer than 60 seconds is cancelled (`NOVA_MCP_QUERY_TIMEOUT_SECS` or
`spec.mcp.queryTimeoutSeconds`, 300 at most); a client asking for more rows gets the platform's cap,
never more.

The endpoint also limits how often one person may call it: 60 `tools/call`s a minute. A call past that
is refused with `429`, a `Retry-After: 60` header and `{"error": "too_many_requests"}`, and the refusal
is written to the same audit line as every other call. `NOVA_MCP_CALLS_PER_MINUTE` moves the limit (at
most 600). `initialize` and `tools/list` never count, so a client may reconnect and list its tools freely.

Writes have their own budget: 20 write calls an hour per person. A write costs compute and changes
data, so `pipeline_start` does not share the read limit — a write past the budget is refused with
`429`, a `Retry-After: 3600` header and
`{"error": "too_many_requests", "limit": 20, "window_seconds": 3600, "scope": "stardelt:write"}`,
and it is audited like every other refusal (`status = "rate_limited"`). `NOVA_MCP_WRITES_PER_HOUR`
moves the budget (1 to 600). Reads are not affected by it, and `initialize`/`tools/list` count
against neither limit.

### Why a run failed

An assistant walks the same path a person does in the interface:

1. `pipeline_runs` with `state: "failed"` lists the runs that failed, newest first.
2. `pipeline_run` with the `pipeline` (`<namespace>/<name>`) and `run_id` shows the run's tasks and their
   states — the one marked failed is the one to read.
3. `pipeline_task_log` with the `task_id` of that task reads its log, the error and the stack frames
   included. The answer is one page; pass the `next_token` it carries to read on. `try` picks a retry
   when a task ran more than once.

Each answer is cut at 20 000 characters like every other tool, and each call lands in the audit line.

### Starting a run

`pipeline_start` starts one run of a pipeline — the same action as **Run now** in the interface,
with the same rules. It needs the `stardelt:write` scope and a `reason`: one sentence saying why
this run should start, which is written to the endpoint's audit line with the call. The tool is
annotated `destructiveHint`, so a client that honours the annotation asks the person before it
calls it.

It refuses rather than starting something that looks like it worked:

- `the scheduler has not loaded this pipeline yet` — the pipeline exists but Airflow has no DAG for
  it yet;
- `the pipeline is paused: resume it first`;
- `a run is already active: wait for it or stop it` — unless the pipeline's concurrency is `Allow`;
- `too many runs started; wait a minute` — the per-person run-start limit, answered as `429`.

The audit line carries who, which client, `pipeline_start`, the status, how long it took and the
reason. The `mcp_call` row keeps the SHA-256 of the arguments, not the reason's text. It starts one
run; it does not stop one, change a schedule or edit a pipeline.

### Where a query spent its time, and what a change to a table touches

Two questions the interface answers, the endpoint answers the same way:

1. `query_log_list` finds the query — state, duration and a preview of the statement.
2. `query_log_profile` with that `id` shows where it spent its time: the plan, the operators that
   used the most CPU, the bytes spilled and the deterministic hints that name what to change.
   `query_log_history` with the same `id` shows the last 20 runs of that statement by that person,
   with the median wall time and whether this run is slower than the median.
3. `lineage_get` with `catalog`, `schema` and `table` shows what the table is made from and what is
   made from it, plus the jobs that write it — read it before changing a table. `depth` (1 to 5)
   sets how many steps each way, `days` (1 to 365) how far back to look.

The hints are computed from the profile, not written by a model: a plan that spills, a stage whose
slowest task is much slower than the median and a join that explodes all have their own hint.

### What it does not do

- **One write, and no data changes.** The only tool that changes state is `pipeline_start`, which
  starts a run of a pipeline you may already run in the interface. Nothing here writes tables or
  creates, changes or drops objects: `sql_read` refuses a write before it is sent, and
  `query_log_list` shows only your own queries.
- **No shared identity.** There is no service account behind it: every call is the person in the token.
- **No browser session.** The cookie from the interface is never accepted; the endpoint wants a bearer token
  minted for its own audience.
- **No unscoped token.** Every call needs `stardelt:read`, and `pipeline_start` also needs
  `stardelt:write`. A token minted without it is refused
  before any tool runs; that is not an error in the client's configuration, it is the scope
  missing from the sign-in request.
- **It is not part of the API.** `/mcp` sits outside `/api`, so it is not described in the
  [API reference](/docs/reference/api), and it is not behind the interface's sign-in.

### Who may call, and who can see the calls

Two allowlists narrow who may call `/mcp`, and both are empty by default. `spec.mcp.allowedClients`
names the client ids the token's `azp` must match, and `spec.mcp.allowedGroups` the group names its
`groups` claim must include; an empty list accepts every client or group the audience accepts. A caller
outside a list that is set is refused **before any tool runs**, with `403` and
`{"error":"client not allowed"}` or `{"error":"group not allowed"}`. They render as
`NOVA_MCP_ALLOWED_CLIENTS` and `NOVA_MCP_ALLOWED_GROUPS`; on a manifest install the values live in the
`stardelt-identity` ConfigMap as `mcpAllowedClients` and `mcpAllowedGroups`, and a Nova restart applies
them.

An administrator reads the calls in Nova's interface, under **Admin → Agent calls**. Only an
administrator sees that entry, and a non-administrator's `GET /api/admin/mcp-audit` answers `403`. The
page lists the calls newest first, filterable by person and by tool, 50 rows by default and at most 500;
each row carries when, the person (`sub`), the client (`azp`), the tool, the status, the duration and a
SHA-256 of the arguments — never the arguments and never a result.

They are kept for 30 days by default. `spec.mcp.auditRetentionDays` on the `PlatformInstance` sets 0 to
3650 days, and `0` keeps the rows and switches the purge off; the binary's variable is
`NOVA_MCP_AUDIT_RETENTION_DAYS`.

### Turn it off, and revoke a client

The switches that turn the endpoint on turn it off: `spec.mcp.enabled: false` on the
`PlatformInstance`, `nova.mcp.enabled: false` in the chart, or `NOVA_MCP_ENABLED=0` on the binary.
Nova restarts with the new value, and after it `/mcp` and the two `/.well-known/oauth-protected-resource`
documents answer `404` as JSON — a client that tries to sign in finds no metadata to sign in to.

To revoke one assistant without switching the endpoint off, disable its client in the identity
provider. On the platform's Keycloak that is `stardelt-mcp` in the `stardelt` realm:

- **Console:** Clients → `stardelt-mcp` → Settings → Enabled off.
- **Admin API:** `kcadm.sh update clients -r stardelt -q clientId=stardelt-mcp -s enabled=false`.

On another provider, disable or delete the equivalent client. A new sign-in or a token refresh after
that is refused. An access token that was already issued keeps working until it expires — five minutes
unless the realm sets another lifespan — so revoking a client is not a way to end a session in
progress. `stardelt-mcp` holds no secret, so there is no secret to rotate or delete.

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
