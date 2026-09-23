---
name: subagent-driven-development
description: Use when delivery hands you one PR boundary of an approved plan to execute task by task.
---

# Subagent-Driven Development

Execute one PR boundary of an approved plan: a fresh implementer per task, a review after each task, and a whole-branch review at the end. Invoke toolbelt:orchestrating first; its read list, path routing, and dispatch rules hold throughout.

Delivery supplies the boundary number, its task set, the starting SHA, the resolved routes, and optionally a UX gate runner. Dispatch every role on the route delivery gave you. If a role has no route, stop and tell your human partner rather than choosing a model yourself.

Scripts below live in this skill's `scripts/` directory.

## Setup

1. Run `scripts/sdd-workspace PLAN_FILE`. It prints this plan's git-ignored workspace (`<repo-root>/.toolbelt/sdd/<plan-basename>-<digest>/`), where every brief, report, review, and the ledger live.
2. Open or resume the ledger (see Ledger).
3. Read the plan if it is not already in your context. Before Task 1, look for tasks that contradict each other, the Global Constraints, or the [task-review rubric](task-reviewer-prompt.md), and ask about all of them in one message, each beside its plan text.

When the plan has an `## Execution Tracks` section, read [parallel-tracks.md](parallel-tracks.md); otherwise run tasks one at a time. Never run two implementers in one worktree, or more implementers at once than the plan's declared tracks.

## Per task

1. Record BASE, the current head.
2. Run `scripts/task-brief PLAN_FILE N`. The brief holds the plan's Global Constraints, Known Gotchas, and Data Model, then the task. Dispatch the implementer with [implementer-prompt.md](implementer-prompt.md).
3. Act on its status:
   - **DONE** — review it.
   - **DONE_WITH_CONCERNS** — resolve a correctness or scope concern before review, the same way as NEEDS_CONTEXT; log any other concern and review.
   - **NEEDS_CONTEXT** — if the plan already answers it, resume the implementer pointing at that plan text. A product or contract decision the plan doesn't make is not yours either: take it to your human partner, record their answer as a ledger ruling, and resume the implementer with its path.
   - **BLOCKED** — change something before retrying: more context or a more capable routed model. If the plan is wrong or the task is too large to finish, take it to your human partner to re-plan; don't split the task yourself.
4. Run `scripts/review-package --plan PLAN_FILE BASE HEAD`; it prints the review-package path. Dispatch the task reviewer with [task-reviewer-prompt.md](task-reviewer-prompt.md). Use the BASE you recorded, never `HEAD~1`, which drops every commit but the last.
5. A spec ❌ or any Critical or Important finding starts the fix loop, except those labeled `plan-mandated` or `plan-gap`: those need a decision the plan doesn't make, so batch them to your human partner, each beside its plan text. Minor findings and the out-of-scope count go to the ledger for the final review to triage.
6. Mark the task complete in the ledger.

Every task gets its review from a dispatched reviewer; an implementer's confidence, or a review you arranged in your own context, does not count. You never fix code yourself: a fix in your context burns it and skips review.

## Fix loop

1. Resume the original implementer with the review-file path. If your harness cannot message a finished agent, dispatch a fresh one with the brief, report, and review paths. It fixes or rebuts each Critical and Important finding and appends a findings table to its report.
2. Run `scripts/review-package --plan PLAN_FILE FIX_BASE HEAD`, where FIX_BASE is the head the previous review saw, and dispatch [re-review-prompt.md](re-review-prompt.md) with it. Findings the re-reviewer notices outside the fix diff go to the ledger as minors and never extend the loop.
3. Findings still NOT ADDRESSED, plus any new Critical or Important breakage in the fix diff, remain open. If any do, run one more round of steps 1–2. After the second round, rule on each finding still open:
   - **Wrong, or its rebuttal holds** — park it: `Task <N>: parked — <finding> — ruling: <why the code stands>`.
   - **Real, but nothing downstream builds on it** — park it the same way, ruled real and deferred.
   - **Real and load-bearing** — mark the task `Task N: blocked (<why>)` and give your human partner the finding, the plan text it collides with, and the fix history.

A finding labeled `plan-mandated` or `plan-gap`, or a rebuttal marked plan-gap, goes to your human partner at any point: show it beside the plan text and ask what governs. Their answer becomes a ledger ruling the fixer is given by path.

Log each round: `Task <N>: fix round <R> (<X> addressed, <Y> open — <one-liners>; commits <a7>..<b7>)`.

## Final review

After every task in the boundary is complete:

1. If delivery supplied a UX gate runner, dispatch it. Send its review file to one fresh implementer, with the plan path as its brief and `ux-fix-report.md` as its report, then resume the runner to recapture, until it passes or returns findings for your human partner. The whole-branch review that follows covers those fixes.
2. Run `scripts/review-package --plan PLAN_FILE START HEAD`, START being the boundary's fork point (after a rebase, the recorded new parent head), and dispatch the whole-branch reviewer on the `gate` route with [code-reviewer.md](../requesting-code-review/code-reviewer.md). `[DESCRIPTION]` names the boundary number and its task set, so later boundaries' tasks don't read as missing; point it at the ledger's minor findings to triage.
3. Critical and Important findings go through the fix loop (plan-mandated and plan-gap ones go to your human partner, as in per-task step 5), with one fresh implementer fixing the review file's complete list rather than one fixer per finding; the plan path stands in for the brief and `final-fix-report.md` for the report. Final-review Minors go to the ledger.
4. The review is clean when no Critical or Important finding is open. Record `Final review: clean at <full SHA>, route <harness/model/effort>, report <absolute path>` in the ledger and return that SHA to delivery.

## Verification scope

Run the smallest command that proves what changed:

- **While iterating:** focused tests for the code being changed.
- **Task gate:** the task's `Verify:` command, plus the suites of direct consumers when the task changes a shared contract. Risky changes (auth, tenancy, migrations, shared schemas) add targeted cross-package checks.
- **Fix rounds:** the tests covering the fix.
- **Workspace-wide suite:** once, when finishing-a-development-branch publishes the PR. Task gates never run it.

Implementers produce fresh evidence for their own claims. Reviewers read that evidence instead of re-running it, unless it leaves a real doubt.

## Filling prompts

- `[REVIEW_NUANCE]` is task-specific context or risk, or `None`. It never tells a reviewer what not to flag and never pre-rates a severity.
- One task per prompt; never the session's history.
- Report and review files sit beside the brief: `task-N-report.md` and `task-N-review.md`; the final review writes `final-review.md` and its fixer `final-fix-report.md`. Fix reports and re-reviews append to the same files.
- Fill every template placeholder; each template lists its own.

## Ledger

`<workspace>/progress.md` is the durable record; the todo list is not. After compaction or resume, tasks the ledger marks complete are done; check it and `git log`, and never re-dispatch a completed task.

- **Header:** branch, plan path, current head SHA.
- **One line per task:** `Task N: in-progress (agent <id>, route <harness>/<model>/<effort>)`, `Task N: blocked (<why>)`, or `Task N: complete (commits <base7>..<head7>, review clean, route <harness>/<model>/<effort>, report <path>)`.
- **Active agents:** one line per live dispatch, removed when its final message arrives.
- **Findings:** the minor-finding roll-up and parked findings with rulings.
- **Exactly one `Next:` line** naming the next expected event, e.g. `Next: task 4 review verdict`.

Keep the workspace until delivery confirms the PR merged or your human partner abandons the work.
