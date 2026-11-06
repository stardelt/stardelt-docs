---
name: write-skill
description: Add or change a skill in stardelt-docs/skills, so assistants learn a recurring way of working on stardelt.
when_to_use: A kind of work keeps going wrong in the same way, or has steps across repositories that people forget.
---

# Write a skill

## Is a skill the right tool?

- **A recurring procedure across files or repositories:** yes.
- **A rule that always holds:** no. Add it to `docs/developer/how-it-is-built.md`.
- **Something a check can enforce:** no. Add the check to CI; it works for everyone.
- **A one-off:** no. Put it in the issue.

## Steps

1. Write down what went wrong or got forgotten, from a real case.
2. If the process changed, update `docs/developer/recipes.md` first. The recipe explains; the skill is its checklist.
3. Add `skills/<name>/SKILL.md`. Use a verb and a noun for the name, in lowercase with hyphens.
4. Fill the frontmatter:
   - `name`: same as the folder;
   - `description`: what it does, under 200 characters;
   - `when_to_use`: the situations that should trigger it.
5. Write the body: steps, check commands, what to watch out for. Keep it under about 60 lines.
6. Add a row to `docs/developer/skills.md`.

## Rules

- Every file, symbol and command must exist on `main`. Run the commands.
- Write for an assistant with no other context.
- This repository is public: no secrets, internal paths, private repositories or cluster names.
- These skills are for building stardelt. Skills for using the platform ship in `stardelt-python`.
