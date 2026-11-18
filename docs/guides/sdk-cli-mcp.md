---
title: "Python, command line and agents"
sidebar_label: "Python, CLI and agents"
slug: /guides/sdk-cli-mcp
---

# Python, command line and agents

Everything you can do in Nova's interface is also a call to its public API. One Python package, `stardelt`, wraps that API
three ways: a client for notebooks and scripts, a `stardelt` command for shells and CI, and a local MCP server so an
AI assistant can use the platform as you. All three read the same list of operations, so a new Nova route is available in
all of them as soon as the package is refreshed.

:::note Which catalog the examples use
The examples name `warehouse`, the platform's own catalog. On an install with sign-in it is
**administrators only** — use a catalog your groups were granted. The **Catalogs** page lists yours, and
`SHOW CATALOGS` answers the same question in the SQL editor.
:::

```bash
pip install "stardelt @ git+https://github.com/stardelt/stardelt@python/v0.4.1#subdirectory=python"
```

The package is not on PyPI: this installs the current release `v0.4.1`, straight from
its repository. A newer release has a newer tag.

## Sign in

In a notebook on the platform, the helper already knows who you are; nothing to set up. Outside a notebook, sign in once with a
code you approve in a browser (the device flow of your identity provider):

```bash
export STARDELT_NOVA_URL=https://nova.example.com
stardelt login
stardelt whoami
```

`stardelt login` asks Nova which identity provider to use, so the Nova address is all it needs. It prints a link and a short
code; open the link on any device, check the code and approve. If you want to name the provider yourself, pass its realm address
with `--issuer` (or set `STARDELT_ISSUER`) and Nova is not asked; `--client-id` names another public client. The command keeps the
sign-in in `~/.config/stardelt/credentials.json` (readable only by you), renews it shortly before it expires and remembers the
Nova address you gave. `stardelt logout` deletes the file. In CI, where nobody can approve a code, set `STARDELT_TOKEN` to a
bearer access token instead (it must carry the audience Nova accepts); when it is set it wins over the stored sign-in.

The token is only ever sent to Nova, in the `Authorization` header. It is never printed or logged. What you may do is decided
by Nova from your groups, exactly as in the interface.

## The command line

Every command, with an example each, is on [The command line](./cli).

## What next
- [Pipelines from the command line](cli-pipelines.md): deploy from a file, publish a bundle, run and wait.
- [Long-running SQL](sql-statements.md): statements that outlive one request.
- [Python in notebooks and scripts](python.md): the client.
- [AI assistants (MCP)](mcp.md): let an assistant use the platform as you.
