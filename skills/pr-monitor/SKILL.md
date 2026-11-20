---
name: pr-monitor
description: Use when a reviewed branch needs its pull request, or a chain of dependent pull requests, published and carried through CI, review providers, and fixes to merge.
---

# PR Monitor

Carry one chain of stacked PRs, or a set of independent PRs, to merge. A chain has exactly one monitor. Run this skill's scripts with `bash scripts/<name>`.

## Policy

Read `.toolbelt/pr-policy.md` at the repository root when present; it overrides this skill. That file names the review providers, the PR-state and wait commands, and the timeouts. Without a policy file, a PR is ready to merge when CI is green at the exact head, no review thread is unresolved, and no review requests changes. Request only the providers the policy names.

## Publish

For an unpublished branch, run finishing-a-development-branch on the pull-request route with the caller's target base. Do not run local tests, because the `Review:` record at head is the gate evidence and CI is the merge gate. When there is a ledger, append the boundary's state record with the PR number and `state open` using `bash ../delivery/scripts/ledger-append`.

## Each round

1. Check PR state with `bash scripts/pr-state <PR>`, or the policy's command. Exit code 2 or 3 means the state is unknown, never clean. Resolve any merge conflict first, because a conflicting PR does not schedule CI.
2. Evidence belongs to one head. Request each policy provider once per head: when the PR opens, and after every push, fix, or rebase. A docs-only push, as defined in Step 1 of finishing-a-development-branch, carries completed provider reviews forward.
3. A provider has completed once its review covers the current head. If a provider passes the policy timeout, which defaults to 20 minutes, or fails, skips, or rate-limits, it drops out for that head. Record the fallback in the PR body.
4. Read a failing check's log before rerunning it, and rerun it only when the cause is outside the PR.
5. Once every awaited provider has completed, fix every real finding along with its siblings, following toolbelt:receiving-code-review, and run only the tests that cover the fix. Push the fixes as one batch, and rebut any remaining comments on their threads with code evidence. The providers' next round is the re-review.
6. After two provider rounds, move a finding to a `## Follow-ups` list in the PR body and resolve its thread when the provider rates it below its top two severities and it touches no data, security, or money. Skip this when the policy forbids it.
7. A finding that would change the design, or a PR that has diverged from its plan, blocks that PR. Record the reason in the ledger and keep carrying the other PRs.
8. When nothing is actionable, make one wait call: the policy's wait command, or a 180-second wait. Waiting on a provider or CI is not a reason to return; wait again in the same turn. Give every shell command, including waits, a timeout of at most 10 minutes.

## Chains

- Give all attention to the lowest unmerged PR, and fix nothing above it until it merges.
- Fix a finding in the lowest PR whose diff contains the code. Then rebase each PR above it upward, one at a time, with `git rebase --onto <parent-new-head> <parent-old-head> <branch>`, and push with `--force-with-lease`.
- Only the monitor moves a published branch. Append `Boundary <N>: rebased <old SHA> → <new SHA>` to the ledger after each rebase.
- Merge bottom-up: squash-merge the bottom PR and delete its branch. Confirm the next PR's base with `gh pr view --json baseRefName`, or update it with `gh pr edit --base`. Rebase it with `git rebase --onto <base-branch> <merged-pr-old-head> <branch>`, then propagate upward.
- If a rebase hits a conflict, run `git rebase --abort` and mark that PR blocked with the conflicting paths.
- A blocked or closed-unmerged PR blocks every PR above it in its chain.

## Merge and return

Merge a PR when its head has every provider completed or recorded as a fallback, green CI, a mergeable state, and no unresolved threads. Confirm that the remote PR state is `MERGED`.

Return once every PR is merged or blocked, with one entry per PR naming its number, final head SHA, remote state, merge commit, target branch, and any blocker.
