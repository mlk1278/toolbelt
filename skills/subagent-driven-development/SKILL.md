---
name: subagent-driven-development
description: Use when executing implementation plans with independent tasks in the current session
---

# Subagent-Driven Development

Run the plan to completion. Stop for your human partner only on an unresolvable BLOCKED status, a blocking ambiguity, or the end of the plan.

## The Process

1. Read the plan once. Create todos and the ledger.
2. Pre-flight scan, then per task: record BASE (current head), dispatch the implementer with its brief, answer its questions, build the review package on DONE, dispatch the task reviewer, run the fix loop, mark the task complete in todos and the ledger.
3. After all tasks, dispatch the final whole-branch reviewer ([code-reviewer.md](../requesting-code-review/code-reviewer.md)) before the branch is published. If it runs after PR review rounds landed commits, put those accepted findings in its brief.
4. Hand off to toolbelt:finishing-a-development-branch.

**Optional pre-final gate:** If the caller supplies a pre-final gate, run it after all task reviews and before the broad final review. The caller's role-ownership table governs who runs each gate; task briefs never reassign those roles.

**Pre-flight scan.** Before Task 1, scan the plan for tasks that contradict each other, the Global Constraints, or the review rubric. Ask about all findings in one batched question, each beside the plan text that mandates it.

## Model Selection

Caller routing takes precedence: plan route, then project route, then the session routing brief. Every role you dispatch comes from the brief; you stay the orchestrator. If no route resolves, stop and tell your human partner; do not substitute your own judgment for a missing route. The final whole-branch review gets the most capable route offered. Name the model in every dispatch; an omitted model inherits your session's model.

## Handling Implementer Status

Only the final answer carrying the Status token is the report; on an intermediate message or an interrupted wait, resume waiting on the same agent.

- **DONE:** run `scripts/review-package --plan PLAN_FILE BASE HEAD` (from this skill's directory; it prints the path it wrote) and dispatch the task reviewer with that path. BASE is the commit you recorded before dispatching, never `HEAD~1`.
- **DONE_WITH_CONCERNS:** address correctness and scope concerns before review; note observations and proceed.
- **NEEDS_CONTEXT:** supply what was missing and re-dispatch.
- **BLOCKED:** change something before retrying — more context, a more capable routed model, a smaller task, or escalation if the plan is wrong.

Resolve every reviewer "⚠️ Cannot verify from diff" item yourself before marking the task complete; a confirmed gap enters the fix loop.

## The Fix Loop

Trigger: spec ❌, any Critical or Important finding, or a ⚠️ item you confirmed. Two routes leave first:

- **Minor findings** go to the ledger roll-up.
- **Plan-mandated findings** are the human's decision: present the finding beside the plan text and ask which governs.

**One fix round per task.** Resume the original implementer with the open findings verbatim; if your harness cannot message a live subagent, dispatch a fresh one with the brief path, the report-file path, and the findings.

**Re-review** when the task's `Interfaces: Produces:` value is anything other than exactly `none`, or when any open finding was Critical. Dispatch [re-review-prompt.md](re-review-prompt.md) over the fix delta: `scripts/review-package --plan PLAN_FILE FIX_BASE HEAD`, FIX_BASE being the head the previous review saw. It verdicts each finding ADDRESSED or NOT ADDRESSED and flags new breakage **in the fix diff only**; Critical or Important breakage there joins the open findings, and out-of-scope observations go to the ledger as deferred minors and never extend the loop. Append `Task <N>: fix round (<X> addressed, <Y> open — <one-liners>; commits <a7>..<b7>)`.

**Orchestrator close** otherwise — the plan template writes `Produces: none` when nothing downstream depends on the task. The fix report's findings table must hold exactly one complete row per open finding, naming the finding, the commit, the covering test command, and its passing output. Every row complete, and the task is complete. Resume the implementer once for a row that is missing, or whose result is a claim without the command's output; if it is still incomplete, escalate to your human partner as a BLOCKED task. Append `Task <N>: fix round closed by orchestrator (<X> findings, commits <a7>..<b7>)`.

Adjudicate **only** after the re-review or the orchestrator close, ruling on each finding still open yourself:

- **Wrong, or contestable** — park it: `Task <N>: parked — <finding> — ruling: <why the code stands>`.
- **Real, but nothing downstream builds on it** — park it the same way, ruled real and deferred.
- **Real and load-bearing** — stop. Append `Task <N>: BLOCKED — <reason>` and give your human partner the finding, the plan text it collides with, and the fix history.

Every adjudication is a ledger entry.

## Verification Scope

Run the smallest command that proves what the diff touched.

- **Iterating:** focused tests for the code being changed.
- **Task gate:** the affected package suite(s) once — packages the diff touches, plus direct consumers of a changed shared contract. High-risk changes (auth, tenancy, migrations, shared schemas, cross-package behavior) add targeted cross-package checks, never a workspace run.
- **Fix rounds:** covering tests only.
- **Workspace-wide suite:** once, at the final gate. Its evidence, its reuse, and the docs-only rule belong to toolbelt:finishing-a-development-branch Step 1. Task gates never run it, and nobody reruns it because a PR opened.

Reviewers and orchestrators read the implementer's test evidence on unchanged source instead of re-running it. Implementers and fixers always produce their own fresh evidence.

Run suites through the project's quiet-run wrapper when it has one, reading back exit status, pass count, and failure tail only. A buffered wrapper releases nothing until the command exits, so it never carries a check that gates that command — run the gate first, as its own command.

Surface any plan or brief mandating broader verification than this policy; neither obey nor override it yourself.

## Constructing Reviewer Prompts

- Never tell a reviewer what not to flag, and never pre-rate a severity.
- Copy binding requirements verbatim from the plan's Global Constraints or the spec: exact values, formats, and stated relationships.
- `[REVIEW_NUANCE]` takes task-specific context and risks, and never overrides requirements, suppresses findings, or pre-judges severity. Use `None` when there is none.
- `docs/REVIEW-GUIDANCE.md` is reviewer-only. Do not read it while orchestrating or pass it to implementers, fixers, explorers, planners, errands, or monitors.
- Describe one task per dispatch prompt, never the session's history.
- Fix dispatches carry the implementer contract. Before ending the round, confirm the fix report contains the covering tests, the command, and the output.
- Point the final review at the ledger's minor findings, to triage before merge.
- **Final-review findings get ONE fix subagent** with the complete list — not one fixer per finding. Then run exactly one scoped re-review of the fix wave, and adjudicate residual findings as at the task loop. There is no second fix wave; residual load-bearing findings go to your human partner at finishing-a-development-branch.

## File Handoffs

- **Task brief:** run `scripts/task-brief PLAN_FILE N`. The dispatch carries: where the task fits, in one line; the brief path, introduced as "read this first — it is your requirements, with the exact values to use verbatim"; interfaces and decisions from earlier tasks; the plan's Global Constraints and Known Gotchas; your resolution of any ambiguity you spotted; the report-file path and report contract. Exact values appear only in the brief.
- **Report file:** named after the brief (`…/task-N-brief.md` → `…/task-N-report.md`). The implementer writes its full report there and returns status, commits, a one-line test summary, and concerns.
- **Reviewer inputs:** the brief, the report, the review package, the smell baseline (`../requesting-code-review/smell-baseline.md`), and the constraints binding the task.
- **Review package:** `scripts/review-package --plan PLAN_FILE BASE HEAD` for tasks, `scripts/review-package --plan PLAN_FILE MERGE_BASE HEAD` for the final review (MERGE_BASE = `git merge-base main HEAD`). Pass the printed path as `[DIFF_FILE]`.
- Fix dispatches append their fix report to the same report file; re-reviews read it.

## Durable Progress

At skill start run `scripts/sdd-workspace PLAN_FILE`; it prints this plan's git-ignored directory (`<repo-root>/.toolbelt/sdd/<plan-basename>-<digest>/`), holding every artifact for THIS plan. Another plan's directory is never yours to read or write.

This plan's ledger is `<workspace>/progress.md`. Tasks marked complete there are DONE; resume at the first task not marked complete. A ledger whose header names a different plan file belongs to that plan: leave it and start your own.

The ledger, not the todo list, is the durable record:

- **Header:** branch, plan path, current exact head SHA. The plan path is the ledger's identity.
- **One line per task:** `Task N: in-progress (agent <id>, route <harness>/<model>/<effort>)`, `Task N: blocked (<why>)`, or `Task N: complete (commits <base7>..<head7>, review clean, route <harness>/<model>/<effort>, report <path>)`. The route is the resolved one from agent-routing, copied from the dispatch.
- **Active agents:** one line per live dispatch; remove it when that agent's final answer arrives.
- **Minor findings:** the running roll-up the final review triages, plus findings parked with rulings.
- **Exactly one `Next:` line** naming the next expected event (e.g. `Next: task 4 review verdict`).

When the final review is clean and its fixes are merged, delete this plan's workspace.

## Parallel Tracks

Active only when the plan declares a top-level `## Execution Tracks` section; otherwise this skill is serial. Read [parallel-tracks.md](parallel-tracks.md) when it does.

## Prompt Templates

[implementer-prompt.md](implementer-prompt.md), [task-reviewer-prompt.md](task-reviewer-prompt.md), [re-review-prompt.md](re-review-prompt.md), [code-reviewer.md](../requesting-code-review/code-reviewer.md).

## Ownership rules

**Never:**

- Start implementation on main/master without your human partner's explicit consent
- Dispatch multiple implementation subagents into the same worktree —
  concurrent implementers are only ever one-per-track-worktree, declared by
  the plan's Execution Tracks section
- Parallelize tracks the plan did not declare — opportunistic parallelism at
  execution time is forbidden, however independent two tasks look
- Skip the task review, or take an implementer's confidence in place of one; a self-arranged review does not count
- Fix findings yourself instead of dispatching a fixer — controller fixes pollute context and skip review
- Re-dispatch a task the ledger already marks complete — check the ledger and `git log` after compaction or resume

