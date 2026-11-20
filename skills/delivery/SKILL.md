---
name: delivery
description: Use when an approved implementation plan is ready to be implemented and shipped.
---

# Delivery

Take an approved plan from its first PR boundary until every PR is merged and cleaned up. A **boundary** is one row of the plan's `## PR Boundaries` table. Each boundary gets one branch, one implementer, and one PR. A **chain** is a stack of dependent boundaries. Run this skill's scripts with `bash scripts/<name>`.

## What you read

Read the plan, this skill, [branch-lifecycle.md](branch-lifecycle.md), agent-routing with the routing text, using-git-worktrees with the worktree policy, the ledger, and each implementer's reply. Do not read the prompt templates, because `dispatch-prompt` fills them for you. Pass diffs, reviews, and logs by file path instead of loading them into your context. Check an implementer's claim against the diff before you raise it to your human partner.

## Start

1. Run `bash ../writing-plans/scripts/plan-check PLAN`. If it fails, go back to planning.
2. Run `bash scripts/workspace PLAN` from your starting checkout, and keep that checkout until every boundary closes. The ledger lives at `<workspace>/delivery.md`.
3. Use agent-routing to resolve the implementer, reviewer, and monitor routes. Resolve an `errand` route for the gate runner too when any boundary will run ux-gate.
4. If the ledger already has entries, recover first using the Recovery section below.

## Per boundary

You can run up to three implementers at once on independent boundaries with disjoint files, unless the worktree policy sets a lower limit. Start a dependent boundary once its predecessor's PR is recorded in the ledger.

1. **Worktree.** Branch from the base branch, or from the predecessor's head while its PR is open. Create the worktree with using-git-worktrees on branch `<plan-slug>/pr-<N>`, and record the fork SHA. If a boundary follows interactive-design, keep the prototype branch, worktree, and baseline, and use the commit before the prototype commits as its review BASE.
2. **Dispatch.** Run `bash scripts/dispatch-prompt implementer --plan PLAN --boundary N --worktree DIR`. Dispatch one implementer with "Read <printed path> and follow it", and record its agent id.
3. **Reply.** Save the reply to `<workspace>/boundary-N-report.md`.
   - For `DONE`, check that the reply is complete before moving on. Any visible change requires the shot list path and the capture folder the implementer inspected. Any pointer-sensitive change also requires a `pointer` result. Send an incomplete reply back to the implementer. Copy the capture folder into `<workspace>/boundary-N-ux/` so the images outlive the worktree.
   - For `NEEDS_DECISION`, take the question to your human partner. Append their ruling under `## Rulings` in the brief it concerns, then resume the implementer.
   - For `BLOCKED`, retry once with what the implementer asked for or with a stronger routed model. Take a second `BLOCKED` reply to your human partner.
4. **Liveness.** Keep the stall watchdog armed while any agent is running, following the Waiting on background agents section of agent-routing. If an implementer stalls or cannot be resumed, dispatch a fresh one with the prompt path, the report so far, and the current head.
5. **UX gate and Review, together.**
   - Run the Review section's rebase first when it applies.
   - Start the Review and, when ux-gate's entry condition holds, dispatch the gate runner in the same turn. Neither waits on the other.
   - Give the gate runner toolbelt:ux-gate, the changed pages, the acceptance criteria, the environment, the commit range, the shot list path, the plan's absolute path, and the prototype ledger's absolute path when the boundary follows interactive-design.
   - Send the gate's review file and the Review's findings to the same implementer in one dispatch.
   - Copy each of the gate's capture folders into `<workspace>/boundary-N-ux/` beside the implementer's folder, because a retake holds only the shots a fix touched.
6. **Publish** once the fixes and the gate's re-check finish.

## Review

- Skip the local review when the boundary has `Risk: none`.
- Otherwise, rebase an unpublished dependent boundary per [branch-lifecycle.md](branch-lifecycle.md). Run `bash scripts/review-package --plan PLAN BASE HEAD`, where BASE is the fork SHA or the new parent head after a rebase.
- Run `bash scripts/dispatch-prompt reviewer --plan PLAN --boundary N --package FILE`. Dispatch the routed reviewer at the effort set by the row's `Risk` with "Read <printed path> and follow it."
- If a diff changes more than 2,000 lines, or crosses areas one reader cannot hold at once, split it across up to three reviewers by path slice (`review-package ... -- <paths>` and `dispatch-prompt reviewer ... --slice "<paths>"`). Run them in parallel and merge their findings.
- Send every Critical and Important finding to the same implementer in one dispatch, and copy any capture folder its reply names into `<workspace>/boundary-N-ux/`. Run no local re-review, because the review providers' next round is the re-check. Take any `plan-gap` finding to your human partner.
- Record `Review: clean|fixed|skipped at <SHA>` in the ledger.

## Publish

Hand the boundary to toolbelt:pr-monitor with the worktree, the target base, which is the predecessor's branch or the base branch, the review SHA, and the ledger path. Start a background monitor for the first boundary of a chain, and resume that chain's monitor for each dependent boundary. Independent boundaries may share one monitor. Check the ledger for a live monitor before starting another, and keep delivering other boundaries while monitors run.

## On return

- **Merged.** Confirm that the PR is `MERGED` on the remote, reconcile the issue tracker if the plan links one, and clean up per [branch-lifecycle.md](branch-lifecycle.md).
- **Blocked.** Take the blocker to your human partner, and continue whatever it does not block.

You are done only when every boundary is merged and cleaned up, or blocked with your human partner informed. Waiting on a monitor is not done.

## Ledger

Append entries with `bash scripts/ledger-append LEDGER "line"` at gates only: a dispatch or reply, a ruling, a review verdict, a rebase, a PR opened or merged, or a blocker raised or cleared. Point one line at each saved report.

Before the final cleanup, append an `## Inefficiencies` section to the ledger with a plain append rather than `ledger-append`, which takes one line. List every wait, repeat, or stop the run did not need, and include that list in your closing message. Your closing message also lists each `boundary-N-ux/` folder with the commit head of its latest capture, and names any screen a later fix changed without a new capture so your human partner can inspect the screens before accepting them.

## Recovery

Read the ledger and `git log`, list the worktrees, check live agents and remote PRs, and continue from the latest `Next:` line. A recorded review counts only at the current head. Never redispatch a boundary that is already reviewed or published.

## Questions

Send only product, money, or cross-team questions to your human partner, stated in plain words. Decide everything else the money-safe way and note the choice in the ledger.
