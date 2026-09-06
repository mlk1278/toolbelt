---
name: delivery
description: Use when an approved implementation plan is ready to be implemented and shipped.
---

# Delivery

**Announce:** "I'm using delivery to deliver this approved plan."

**Entry:** an approved implementation plan.

**Exit:** every PR boundary merged, reconciled, and cleaned up.

## 1. Read and loop

Read the plan. Do not redesign approved requirements; return any unresolved product decision to your human partner.

Loop over the plan's `## PR Boundaries` table in order, running steps 2–5 for each.

Each boundary is one coherent delivery slice, bounded by the independent judgements a reviewer must make, not by lines changed. Two slices you would run concurrently and that edit the same files are one PR. Sequential slices may revisit the same file once the first has merged.

## 2. Resolve routes

The optional `## Agent Routing` section may route the implementer, task reviewer, and final reviewer; the session agent remains the orchestrator and is never plan-routed. Resolve each role with agent-routing; precedence is plan route, then project route, then bundled default. Resolve the monitor and, for a UX-gated boundary, an `errand` gate operator from project routing or the bundled default. Fail closed when either reviewer lacks an independent route; agent-routing's outage override is the only exception.

## Role ownership

Task briefs and dispatch prompts must not reassign these roles.

| Work | Owner |
|---|---|
| Implementation, tests, commits, task report | Implementer subagent (fresh per task) |
| Task briefs, review packages, dispatch context, verdicts | Orchestrator (session agent) — dispatch and synthesis only; never implements or captures |
| UX capture (scripted screenshots) | A gate operator (role `errand`) dispatched to run ux-gate — never the orchestrator or the implementer |
| UX judgment | Vision-capable reviewer routed with specialty `ux` |
| Task reviews and the broad final review | Reviewer subagents |
| PR publication | finishing-a-development-branch (step 5) |
| Review, exact-head CI, fix loops, rebases, retargets, and merge for one published chain | pr-monitor |
| Issue-tracker reconciliation and cleanup | This skill, after the monitor returns |

## 3. Prepare and execute

A dependent boundary's `Depends on` may name one still-open predecessor; every other dependency must be merged first. Fetch the predecessor's remote head and branch the worktree from that SHA. An independent boundary branches from the base branch.

Create the worktree with toolbelt:using-git-worktrees, branch `<plan-slug>/pr-<N>` — `<plan-slug>` is the plan file's basename without date and extension, `<N>` the boundary number.

Execute the boundary with toolbelt:subagent-driven-development, supplying the resolved routes.

## 4. Gate the boundary

When the boundary materially changes a user-visible surface, supply ux-gate as SDD's optional pre-final gate. That broad final review is the slice gate; add no other whole-slice review.

## 5. Ship

After approval, invoke toolbelt:finishing-a-development-branch with the pull-request completion route and the target base branch declared: the predecessor's branch for a dependent boundary, the base branch otherwise. The chain is manual, not GitHub's native stack.

Record per boundary in the SDD ledger: `Boundary <N>: branch <name>, PR #<num>, base <branch>, state <open|merged|blocked>`.

Once the boundary's broad final review is clean and its PR is open, start the next boundary; any number may be open.

Each chain has exactly one pr-monitor. Start it when its bottom PR opens, passing that layer's record — PR number, branch, full head SHA, base branch, and local-gate SHA. Always run it in the background. Resume it with the new layer's record when a dependent boundary's PR opens; an independent boundary starts its own chain.

Process each monitor's return: merged, run step 6; blocked, surface it to your human partner. Never report the slice complete or end the session while the monitor runs. A completion notification is not that return.

A monitor that looks dead is not grounds to start a second one: before re-dispatching any agent that owns external state, check that state directly.

A chain whose bottom PR closed without merging returns `CLOSED` and a durable blocker for every layer above: surface it and open no further boundaries in that chain.

## Who rebases

Ownership follows publication. Delivery owns a boundary's branch until its PR opens: when a lower PR's branch moves, it rebases the unpublished branch at its next task boundary — always before that lane's broad final review — and appends `Boundary <N>: rebased <old7> → <new7>` to the ledger. Afterwards only the monitor moves the branch; implementers and fixers never rebase.

## 6. Reconcile and clean up

Run when the monitor returns a layer merged. Reconcile the issue tracker only when the plan is linked to one. Confirm the remote PR state the monitor returned — never commit ancestry — then remove the worktree, branch, and ignored scratch.

After an interruption, recover from the approved plan, git history, branch and worktree state, SDD scratch, and current PR state; keep no separate resume bookkeeping.
