---
title: "AI assistants (MCP)"
sidebar_label: "AI assistants (MCP)"
slug: /guides/mcp
---

# AI assistants (MCP)

You need the stardelt package, signed in: see [Python, command line and agents](sdk-cli-mcp.md).

## For AI assistants (MCP)

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
