---
name: finishing-a-development-branch
description: Use when implementation is complete, all tests pass, and you need to decide how to integrate the work
---

# Finishing a Development Branch

**Declared route.** When the invoking prompt names a route, and optionally a target base, run Step 1 and then that route and its cleanup without showing the menu. Otherwise show the menu.

## Step 1: Verify tests

Skip this step when delivery or pr-monitor calls this skill. Otherwise, run the tests related to the changed files along with an incremental typecheck and lint of the touched packages, unless the worktree is clean and one of these holds:

- **Exact-head evidence.** The caller supplies the command, its passing output, and the head SHA it ran against. Read the output yourself; without all three it is a claim, not evidence.
- **Docs-only.** Every changed file is Markdown under `docs/**` or at the repository root, or `.toolbelt/**` scratch, and none is built, rendered, or served by the application or executed by CI.

If tests fail, stop and report the failures.

## Step 2: Base branch

Use the base the caller named. Otherwise find the branch this one split from and confirm it: "This branch split from main — is that correct?"

## Step 3: Options

Show exactly this, with no added explanation:

```
Implementation complete. What would you like to do?

1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)
4. Discard this work

Which option?
```

On a detached HEAD, offer only options 2–4 and push as a new branch.

## Step 4: Execute

**Merge locally.** From the main repo root, run `git checkout <base-branch>`, `git pull`, `git merge <feature-branch>`, and Step 1's checks against the merged result; the full suite belongs to CI. If those checks fail, stop and report. Otherwise clean up per Step 5, then run `git branch -d <feature-branch>`.

**Pull request.**

```bash
git push -u origin <feature-branch>
gh pr create --base <base-branch> --title <title> --body <body>
```

Include a ticket-closing reference in the body only on the workstream's last PR. Hand the PR to toolbelt:pr-monitor, or return it when pr-monitor invokes this skill. Never force-push when publishing, and keep the worktree.

**Keep.** Report: "Keeping branch <name>. Worktree preserved at <path>."

**Discard.** Confirm first and wait for the exact word:

```
This will permanently delete:
- Branch <name>
- All commits: <commit-list>
- Worktree at <path>

Type 'discard' to confirm.
```

Then clean up per Step 5 and run `git branch -D <feature-branch>`.

## Step 5: Clean up the worktree

This step applies only to a linked worktree. Run any teardown that `.toolbelt/worktree-policy.md` defines. Remove the worktree only when it lives under `.worktrees/` or `worktrees/`, because any other path belongs to the host harness. Run the removal from the main repo root:

```bash
WORKTREE_PATH=$(git rev-parse --show-toplevel)
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"
git worktree remove "$WORKTREE_PATH"
git worktree prune
```
