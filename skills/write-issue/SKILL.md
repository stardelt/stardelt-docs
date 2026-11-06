---
name: write-issue
description: Write a stardelt issue so that someone with no context can implement it without asking a question.
when_to_use: Filing an implementation ticket, or turning a bug or a plan into work someone else will do.
---

# Write an issue

Rules and a full example: `docs/developer/writing-issues.md`. Template:
`stardelt/.github`, `.github/ISSUE_TEMPLATE/implementation_ticket.md`.

## Before you write

Search for duplicates: `gh issue list --repo stardelt/<repo> --search "<words>"` and `gh pr list`.

## Sections

**Why**, **Current behaviour** (with a file, symbol and exact output), **Required change** (numbered steps),
**Do not**, **How to verify** (commands and expected output), **Acceptance criteria**, **Pitfalls**,
**Open questions**, **Size**.

Set a milestone (`v0.N`) and a priority label (`P0` to `P3`).

## Test it

- Every step names a real file and symbol on `main`. Check they exist.
- You ran every command as written and pasted the real output.
- Edits under 15 lines show before and after. New tests are code, not prose.
- Generated files name their command.
- Text from elsewhere is pasted in, not linked.
- One issue is one pull request, about 150 lines at most. Split a bigger one.
- Give it to a reader with no context and ask what they had to guess. Fix each guess.

Add `ready-to-implement` only when *Open questions* is empty.

## Public repositories

Describe the work only. Do not name other products or paste research. Never paste secrets, tokens or a Secret's value.
