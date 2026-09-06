---
name: pr-monitor
description: Own one pull request, or a chain of dependent pull requests, from current heads through CI, configured review providers, fix loops, rebases, and merge or a durable blocker. Internal helper started by delivery after a PR opens.
---

# PR Monitor

Own one chain: one PR, or PRs each targeting the one below it. This skill is the sole source of PR review, CI, fix-loop, and merge mechanics. Fix and merge yourself; dispatch no fixers.

## Project policy

Read `.toolbelt/pr-policy.md` at the repository root if present. It names the review providers to await, how to request them, complexity lanes, and timeouts, and it overrides this skill. Without it, the required conditions are exact-head green CI, zero unresolved review threads, and no requested-changes review. Never hard-code a provider this file does not name.

## Preflight

Record every layer's **layer record**: PR number, branch, full head SHA, base branch, and local-gate SHA. The local final gate must have approved this exact head before monitoring begins. A resume carrying a new layer appends its record to the chain. Bind all evidence to the current head; any push starts a new evidence cycle. Exception — the docs-only rule in toolbelt:finishing-a-development-branch Step 1 applies: such a push carries local-gate and completed-review evidence forward — record the range. CI never carries forward.

## Chain rules

**Lowest first.** The lowest unmerged PR gets all attention until it merges. Read and batch review threads on higher layers, but fix none while the bottom is not merge-ready.

**Fix in the owner.** A finding lands in the lowest PR whose diff contains the code. After pushing the owner, rebase the layers above one at a time, working upward. Record each layer's old head before rebasing it. Run `git rebase --onto <parent-new-head> <parent-old-head> <layer-branch>`, where the parent is the layer directly below. Push each with `--force-with-lease`. Every rebased head starts a new evidence cycle: exact-head CI, provider review, mergeability, threads. Local review repeats only when a layer's `git patch-id --stable` changed.

**One topology writer.** Only the monitor rebases, retargets, or force-pushes a published branch.

**Merge bottom-up.** Squash-merge the bottom layer and delete its branch. GitHub then retargets the next layer to the deleted branch's base. Confirm with `gh pr view --json baseRefName`. Set it with `gh pr edit --base` if it did not happen. Rebase the next layer with `git rebase --onto <base-branch> <merged-layer-old-head> <layer-branch>` so the squashed commits are not replayed. Propagate upward through every higher layer, using each immediate parent's recorded old and new heads. Push each with `--force-with-lease`. Every moved layer starts a new evidence cycle. Re-run the merge preflight and continue. Stop at the first layer that is not merge-ready and keep monitoring it.

A rebase conflict stops the operation. Run `git rebase --abort`. Return that layer as blocked with the conflicting paths.

## Monitor loop

1. Refresh the PR head, merge state, and unresolved threads. A conflicting PR schedules no CI; resolve the conflict first.
2. Refresh exact-head CI (`gh pr checks` or the policy file's command). Distinguish failed from pending from unavailable, and fail closed on unavailable.
3. Await, and at most once per head request each policy-named provider. Only a current-head review object or an authenticated completion naming the current commit counts as completion. Exception: a review object naming the recorded docs-only predecessor head counts as current-head completion.
4. Once every awaited provider has completed on the current head, verify each finding against the code and judge it yourself: fix what is real inline, rebut what is not on the thread with the code evidence. Each fix carries fresh passing covering-test evidence; never rerun a local workspace suite. Push all fixes as one batch. The awaited providers' next round on the new head is the re-review. A genuinely entangled finding — colliding with the plan, another in-flight lane, or a decision above this PR — goes to the caller with the code evidence.
5. If no action is ready, wait one bounded interval (default 180 seconds; policy may override) and refresh. Do not nest another watcher.

## Fallback

A provider that reaches the policy timeout on one head (default 20 minutes), or explicitly fails, skips, or rate-limits, drops out of the awaited set for that head. Record the fallback reason in the PR body before merging and in your return; the policy file decides whether a recorded fallback blocks. Every remaining condition still applies. Do not switch to a provider the policy does not name.

## Merge and return

Immediately before merging a layer, re-verify on the expected head (or a recorded docs-only carry-forward head): policy-named providers or the recorded fallback, exact-head green CI, mergeability, and zero unresolved threads. Merge when all pass, then confirm the remote PR is `MERGED`.

Return one entry per layer: PR number, final head SHA, remote state (`MERGED`, `OPEN`, `CLOSED`), merge commit OID when merged, target branch, and blocker reason when not merged. A bottom PR closed without merging returns `CLOSED` for it and a durable blocker for every layer above. The caller owns post-merge reconciliation.
