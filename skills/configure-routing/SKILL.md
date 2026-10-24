---
name: configure-routing
description: Write or update this project's agent routing file from a plain-language description.
disable-model-invocation: true
---

# Configure Routing

Your human partner started this skill themselves, by name. They will tell you, in their own words, which model should do each job in this project. Turn what they say into the project's routing file. Show them the whole file first, and write it only when they say it looks right.

## Where the file goes

Sessions run from Claude Code read `.toolbelt/routing/claude.md`. Sessions run from Codex read `.toolbelt/routing/codex.md`. Both are read from the project's main checkout, so one file reaches every worktree — and a copy written inside a worktree is never read. Write to the main checkout. If you are in a worktree and unsure which checkout is the main one, it is the first entry in `git worktree list`.

If their description does not say which harness the file is for, ask: Claude Code, Codex, or both.

## The jobs

The file has one line for each of these jobs, spelled exactly this way:

- `implementer`
- `planner`
- `lookup`
- `explorer`
- `errand`
- `monitor`
- `reviewer`

Each line says which model does the job, at what effort, and which model to use when the first one is unavailable. One line can hold conditions: reviewer, for example, may name one model for code review and another for UX review, or a different model depending on who wrote the work. Any extra detail your human partner gives for a job goes on that job's line, in their words where you can keep them.

The bundled defaults show the shape of a line. They are `routing/claude.md` and `routing/codex.md` in the agent-routing skill, beside this one. Read the default for the harness you are writing before you draft: it is the starting point for a new file, and where a left-out job's line comes from when the project has no file yet.

## What to do

1. Read the project's current routing file for that harness, if one exists. Everything it routes today should still route the same way, unless their description changes it.
2. If the current file is not already one line per job, work out what it says before you draft. Go through it line by line and decide which job or jobs each line covers. Existing files often use other names for jobs, put two jobs on one line, or spread one job over several lines. When one line covers two jobs and their description changes only one of them, split the line: the changed job takes only its new assignment, and the other job keeps the old assignment on a line of its own. Anything that is not about one job — how to dispatch, rules that apply on both harnesses, advice about keeping context small — goes in a short Notes section after the job lines, in its original words.
3. Build the new file. For each job their description covers, write the line with the model, effort, and fallback they asked for. For each job they leave out, keep its current assignment on its own line: the same model, effort, and fallback, and the same conditions, such as a reviewer specialty or who wrote the work under review. When there is no current file, or it never mentions that job, copy the bundled default's line instead. If they name a job but leave its model or effort unclear, ask one short question instead of guessing.
4. Keep the reviewer on a different harness from the implementer, as the default does. If their description puts both on the same harness, say so plainly and ask whether they mean it before you keep that line.
5. Show them the whole new file. Tell them which jobs kept the assignment they already had, or the bundled default's, so nothing changes silently. If you converted a free-form file, show alongside it which old line became which new line, so they can confirm that nothing was lost and no job ended up with two assignments. Write nothing yet.
6. When they confirm, write the file. If they ask for changes, change the draft and show it again.
7. After writing, tell them two things. A new session picks up the file; this session keeps the routing it started with. And if you wrote the Codex file, Codex reads routing files only after `scripts/setup-codex-routing` has been run once on this machine, from the toolbelt checkout.
