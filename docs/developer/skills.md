---
title: "Skills for AI assistants"
sidebar_label: "Skills for AI assistants"
slug: /developer/skills
---

# Skills for AI assistants

A *skill* is a short instruction file that tells an AI assistant how a kind of work is done here. These
skills are for **building** stardelt. To **use** a stardelt platform from an assistant, see
[Python, command line and agents](../guides/sdk-cli-mcp) instead.

They live in [`skills/`](https://github.com/stardelt/stardelt-docs/tree/main/skills) in this repository.
Each is plain Markdown, so any assistant or any person can read it.

| Skill | Use it to |
|---|---|
| `change-api` | Change a Nova API route and carry it through the contract, the Python package and the docs |
| `change-resource` | Change a resource and regenerate everything that depends on it |
| `add-service` | Add or upgrade a service across all install paths |
| `write-docs-page` | Write a page that follows this site's rules |
| `check-docs-facts` | Check a page's claims against the code and a running install |
| `write-issue` | Write an issue that someone with no context can implement |
| `write-skill` | Add a new skill to this list |

## Use them

Check out the repositories side by side, then:

- **Claude Code** finds them from a `stardelt-docs` checkout through `.claude/skills`. From another
  repository, link them: `ln -s ../../stardelt-docs/skills .claude/skills` (keep the link out of commits).
- **Other assistants** that read `AGENTS.md` are pointed to `skills/` by the file in this repository's
  root. You can also paste a skill into the conversation.

Skills do not replace your judgment: you stay [the author](./contributing#using-an-ai-assistant) of what
you submit.
