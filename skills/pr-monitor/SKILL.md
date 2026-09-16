---
name: pr-monitor
description: Publish and own one pull request, or a chain of dependent pull requests, through CI, configured review providers, fix loops, rebases, and merge or a durable blocker. Internal helper dispatched by delivery once a branch's final review is clean.
---

# PR Monitor

Own one chain through merge: one PR, or PRs targeting their predecessors. Fix valid findings yourself as feedback arrives. This skill is the sole source of PR review, CI, fix-loop, and merge mechanics; the project policy names the providers and the wait command.

## Project policy

Read `.toolbelt/pr-policy.md` at the repository root if present. It names the review providers, how to request them, the wait command, lanes, and timeouts; it overrides this skill. Without it, the conditions are exact-head green CI, zero unresolved review threads, and no requested-changes review. Never hard-code a provider this file does not name.

## Preflight

Publish an unpublished branch first: run toolbelt:finishing-a-development-branch on the pull-request route with the caller's target base; it runs the workspace suite and opens the PR. Append `Boundary <N>: branch <name>, PR #<num>, base <branch>, state open` to the caller's delivery ledger.

Record every layer's **layer record**: PR number, branch, full head SHA, base branch, and local-gate SHA. The local final gate must have approved this exact head before monitoring begins. Bind all evidence to the current head; any push starts a new evidence cycle, except a docs-only push under toolbelt:finishing-a-development-branch Step 1, which carries local-gate and completed-review evidence forward; record the range. CI never carries forward.

## Chain rules

**Lowest first.** The lowest unmerged PR gets all attention until it merges. Batch higher layers' review threads; fix none until the bottom is merge-ready.

**Fix in the owner.** A finding lands in the lowest PR whose diff contains the code. After pushing the owner, rebase the layers above one at a time, upward, recording each layer's old head first. Run `git rebase --onto <parent-new-head> <parent-old-head> <layer-branch>`, where the parent is the layer directly below. Push each with `--force-with-lease`. Every rebased head starts a new evidence cycle. Outside monitor fix rounds, local review repeats only when a layer's `git patch-id --stable` changed.

**One topology writer.** Only the monitor rebases, retargets, or force-pushes a published branch.

**Merge bottom-up.** Squash-merge the bottom layer and delete its branch. GitHub then retargets the next layer to the deleted branch's base; confirm with `gh pr view --json baseRefName`, or set it with `gh pr edit --base`. Rebase the next layer with `git rebase --onto <base-branch> <merged-layer-old-head> <layer-branch>` so the squashed commits are not replayed. Propagate upward through every higher layer, using each immediate parent's recorded old and new heads. Push each with `--force-with-lease`. Every moved layer starts a new evidence cycle. Re-run the merge preflight and continue, stopping at the first layer that is not merge-ready.

A rebase conflict stops the operation: run `git rebase --abort` and return that layer as blocked with the conflicting paths.

## Monitor loop

1. Refresh the PR head, merge state, and unresolved threads. A conflicting PR schedules no CI: resolve the conflict first.
2. Refresh exact-head CI with the policy file's command, or `gh pr checks` without a policy. Distinguish failed, pending, and unavailable; fail closed on unavailable.
3. Await, and at most once per head request each policy-named provider. Completion means a review object or authenticated completion naming the current head, or a review object naming the recorded docs-only predecessor head.
4. Once every awaited provider has completed on the current head, verify each finding against the code and judge it yourself: fix what is real, inline in your own session, and rebut what is not on the thread with the code evidence. Each fix carries fresh passing covering-test evidence; never rerun a local workspace suite. Push all fixes as one batch; the awaited providers' next round on the new head is the re-review: request no local review of a fix round and dispatch no fixer. Escalate to the caller only when a finding would substantially change the design or the PR has diverged from its plan; send the decision needed, your recommendation, and minimal code evidence.
5. If no action is ready, wait with one call: the policy's wait command (foreground, timeout above its ceiling) or one bounded interval (default 180 seconds). Between waits, never poll, sleep-loop, tail logs, or emit keep-alive commands. Do not nest another watcher.

## Fallback

A provider that reaches the policy timeout on one head (default 20 minutes), or explicitly fails, skips, or rate-limits, drops out of the awaited set for that head. Record the fallback reason in the PR body before merging and in your return; the policy file decides whether a recorded fallback blocks. Every other condition still applies; never switch to an unnamed provider.

## Merge and return

Just before merging a layer, re-verify on the expected head (or a recorded docs-only carry-forward head): policy-named providers or the recorded fallback, exact-head green CI, mergeability, and zero unresolved threads. Merge when all pass, then confirm the remote PR is `MERGED`.

Return when every layer is merged or one is durably blocked, never on a round count or elapsed time. Return one entry per layer: PR number, final head SHA, remote state (`MERGED`, `OPEN`, `CLOSED`), merge commit OID when merged, target branch, and blocker reason. A bottom PR closed without merging returns `CLOSED` and a durable blocker for every layer above. The caller owns post-merge reconciliation.
