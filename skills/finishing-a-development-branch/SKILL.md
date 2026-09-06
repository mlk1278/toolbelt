---
name: finishing-a-development-branch
description: Use when implementation is complete, all tests pass, and you need to decide how to integrate the work
---

# Finishing a Development Branch

**Announce at start:** "I'm using the finishing-a-development-branch skill to complete this work."

**Completion contract:** If the invoking prompt declared exactly one completion route (optionally naming the target base branch) before this skill was invoked, run the Step 1 test verification, then execute that route and its cleanup directly instead of presenting the options below. An undeclared or ambiguous route falls through to the normal options. This changes only who chooses the option; every verification and cleanup rule still applies.

## Step 1: Verify Tests

**Exact-head evidence reuse:** If the caller supplies evidence of a full-suite run at the exact current head SHA — the command, its passing output (with the final pass/exit state visible), and the head SHA it ran against — read that output yourself and treat this step as satisfied, an exception to toolbelt:verification-before-completion's run-it-yourself rule. A report missing the command, the output, or the SHA is a claim, not evidence. Without qualifying evidence, run the suite.

**Docs-only case:** if every file the branch changes is Markdown under `docs/**` or at the repository root, or `.toolbelt/**` scratch, no suite is required — never a file the application builds, renders, or serves, or that CI executes, regardless of path.

Both shortcuts require a clean worktree.

**If tests fail:** stop here.

```
Tests failing (<N> failures). Must fix before completing:

[Show failures]

Cannot proceed with merge/PR until tests pass.
```

## Step 2: Detect Environment

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
```

| State | Menu | Cleanup |
|-------|------|---------|
| `GIT_DIR == GIT_COMMON` (normal repo) | Standard 4 options | No worktree to clean up |
| `GIT_DIR != GIT_COMMON`, named branch | Standard 4 options | Provenance-based (see Step 6) |
| `GIT_DIR != GIT_COMMON`, detached HEAD | Reduced 3 options (no merge) | No cleanup (externally managed) |

## Step 3: Determine Base Branch

```bash
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null
```

Or ask: "This branch split from main - is that correct?"

## Step 4: Present Options

Satisfy Step 1's verification requirement before offering options.

**Normal repo and named-branch worktree — present exactly these 4 options:**

```
Implementation complete. What would you like to do?

1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)
4. Discard this work

Which option?
```

**Detached HEAD — present exactly these 3 options:**

```
Implementation complete. You're on a detached HEAD (externally managed workspace).

1. Push as new branch and create a Pull Request
2. Keep as-is (I'll handle it later)
3. Discard this work

Which option?
```

No added explanation.

## Step 5: Execute Choice

### Option 1: Merge Locally

From the main repo root (Step 6):

```bash
git checkout <base-branch>
git pull
git merge <feature-branch>
<test command>
```

Then clean up the worktree (Step 6) — a checked-out branch cannot be deleted — then `git branch -d <feature-branch>`.

### Option 2: Push and Create PR

```bash
git push -u origin <feature-branch>
gh pr create --base <base-branch> --title <title> --body <body>
```

End in a named owner: hand the PR to toolbelt:pr-monitor, or return it to a caller that already declared it owns the monitoring (delivery does — don't start a second monitor on top of it). "PR is open" is not a terminal state. Reviews are the owner's to request; requesting here asks providers twice for the same head.

Never force-push without your human partner's explicit request. The worktree stays for PR feedback.

### Option 3: Keep As-Is

Report: "Keeping branch <name>. Worktree preserved at <path>."

### Option 4: Discard

Confirm first and wait for the exact word:

```
This will permanently delete:
- Branch <name>
- All commits: <commit-list>
- Worktree at <path>

Type 'discard' to confirm.
```

If confirmed, clean up the worktree (Step 6) from the main repo root, then `git branch -D <feature-branch>`.

## Step 6: Cleanup Workspace

Runs for Options 1 and 4 only.

Reuse Step 2's `GIT_DIR` and `GIT_COMMON`; equal means a normal repo, nothing to clean up. Otherwise `WORKTREE_PATH=$(git rev-parse --show-toplevel)`.

If `.toolbelt/worktree-policy.md` defines teardown — sidecar containers, allocated ports, per-worktree data — release those first.

**Squash-merge guard:** after a squash merge, `git log <base>..HEAD` lists every branch commit as unmerged — none is an ancestor of the squash commit. Never conclude from ancestry alone that work did or didn't land. Before removing anything, compare the branch's files against the base for content equality and check `git rev-list --left-right --count <base>...HEAD`.

Remove the worktree only when its path is under `.worktrees/` or `worktrees/` — toolbelt created those. Run removal from the main repo root; it fails from inside.

```bash
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"
git worktree remove "$WORKTREE_PATH"
git worktree prune
```

Any other path belongs to the host harness: leave it in place, or use your platform's workspace-exit tool.
