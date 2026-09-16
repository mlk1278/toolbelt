---
name: delivery
description: Use when an approved implementation plan is ready to be implemented and shipped.
---

# Delivery

**Announce:** "I'm using delivery to deliver this approved plan."

**Entry:** an approved implementation plan.

**Exit:** every PR boundary merged, reconciled, and cleaned up.

## 1. Read and loop

Invoke toolbelt:orchestrating first; its read list holds throughout. Read the plan. Do not redesign approved requirements; return any unresolved product decision to your human partner.

Follow `## PR Boundaries` in order through steps 2–5. Read [branch-lifecycle.md](branch-lifecycle.md) for ledger location, prepublication evidence, rebases, and cleanup; establish its delivery ledger before creating worktrees.

Each boundary is one coherent delivery slice, sized by the independent judgments a reviewer must make. Two slices you would run concurrently and that edit the same files are one PR. Sequential slices may revisit the same file once the first has merged.

## 2. Resolve routes

The optional `## Agent Routing` section may route the implementer, task reviewer, and final reviewer; the session agent remains the orchestrator, never plan-routed. Resolve the final reviewer with specialty `gate`. Resolve each role with agent-routing; precedence is plan route, then project route, then bundled default. Resolve the monitor and, for a boundary that runs ux-gate, an `errand` gate runner from project routing or the bundled default. Fail closed when either reviewer lacks an independent route, barring agent-routing's outage override.

## Role ownership

Task briefs and dispatch prompts must not reassign these roles.

| Work | Owner |
|---|---|
| Implementation, tests, commits, task report | Implementer subagent (fresh per task) |
| Task briefs, review packages, dispatch context, rulings | Orchestrator: dispatch and rulings only; never implements or captures; reads returned summaries, never artifacts |
| Review findings, fix requests, rebuttals, re-gates | Reviewer writes a file, implementer fixes or rebuts from it; the orchestrator routes the path and rules on rebuttals |
| UI smoke per task (mechanical checks and stills of the touched pathway) | Implementer, inside its task, before reporting DONE |
| UX capture at the boundary, reviewer dispatch, and verdict | Gate runner (role `errand`) dispatched with toolbelt:ux-gate |
| UX judgment | Vision-capable reviewer with specialty `ux`, dispatched by the gate runner |
| Task reviews and the broad final review | Reviewer subagents |
| Workspace suite, PR publication, review, exact-head CI, fix loops, rebases, retargets, and merge for one chain | pr-monitor, dispatched with toolbelt:pr-monitor; it reads that skill, finishing-a-development-branch, and the project PR policy |
| Issue-tracker reconciliation and cleanup | This skill, after the monitor returns |

## 3. Prepare and execute

A dependent boundary's `Depends on` may name one still-open predecessor; every other dependency must already be merged. Fetch the predecessor's remote head and branch the worktree from that SHA. If the predecessor merged, fetch and use the updated base branch. An independent boundary branches from the base branch. For an approved prototype, reuse its branch, worktree, and recorded baseline under the single-PR prototype contract.

For a new boundary worktree use toolbelt:using-git-worktrees, branch `<plan-slug>/pr-<N>`: the plan file's basename without date and extension, and the boundary number.

Execute the boundary with toolbelt:subagent-driven-development, supplying its boundary number, exact task set, starting SHA, and resolved routes. Tracks cannot span boundaries.

## 4. Gate the boundary

When the boundary meets ux-gate's entry condition (new user flows, material interaction, layout, or responsive changes, or an explicit UX-review request), supply the gate runner as SDD's optional pre-final gate, with the changed routes, base..head, acceptance criteria, and environment. Routine cosmetic changes need no model review. That broad final review is the slice gate; add no other whole-slice review.

## 5. Ship

After the final review is clean, hand the branch to the chain's pr-monitor with the worktree path, the target base (the predecessor's branch for a dependent boundary, the base branch otherwise), the final-review SHA, and the ledger path. It runs toolbelt:finishing-a-development-branch on the pull-request route, records `Boundary <N>: branch <name>, PR #<num>, base <branch>, state open` in the ledger, and owns the PR to merge.

Record per boundary in the ledger, with its SDD workspace path: `Boundary <N>: branch <name>, base <branch>, state <prepared|open|merged|blocked>`.

Once the boundary's monitor is running, start the next; any number may be open. A dependent boundary waits for its predecessor's ledger PR record.

Each chain has exactly one pr-monitor. Always run it in the background. While independent boundaries remain, keep delivering them; then block on its return with one wait. Never poll it. Resume it with a dependent boundary's branch when that boundary's final review is clean; an independent boundary starts its own chain.

Process each monitor's return: merged, run step 6; blocked or escalated, surface it to your human partner. Never report the slice complete or end the session while the monitor runs. A completion notification is not that return. A monitor that looks dead is not grounds to start a second one: check that state directly first.

A chain whose bottom PR closed without merging returns `CLOSED` and a durable blocker for every layer above: surface it and open no more boundaries in that chain.

## 6. Reconcile and clean up

Run when a layer merges. Reconcile the issue tracker only when the plan is linked to one. Confirm the remote PR state the monitor returned, never commit ancestry, then follow branch-lifecycle.md cleanup.

After interruption, recover from the plan, Git and worktree state, the ledger, and current PR state before dispatching again.
