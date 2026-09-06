---
name: using-git-worktrees
description: Use when starting feature work that needs isolation from current workspace or before executing implementation plans - ensures an isolated workspace exists via native tools or git worktree fallback
---

# Using Git Worktrees

**Announce at start:** "I'm using the using-git-worktrees skill to set up an isolated workspace."

## Step 0: Detect Existing Isolation

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

`GIT_DIR != GIT_COMMON` is also true inside a submodule, so check:

```bash
# If this returns a path, you're in a submodule, not a worktree — treat as normal repo
git rev-parse --show-superproject-working-tree 2>/dev/null
```

**`GIT_DIR != GIT_COMMON` and not a submodule:** already in a linked worktree. Skip to Step 2. Report:

- On a branch: "Already in isolated workspace at `<path>` on branch `<name>`."
- Detached HEAD: "Already in isolated workspace at `<path>` (detached HEAD, externally managed). Branch creation needed at finish time."

Asked for a new sibling worktree, this skill creates it rather than skipping creation.

**`GIT_DIR == GIT_COMMON` or in a submodule:** normal repo checkout. Honor any worktree preference in your instructions. Otherwise ask:

> "Would you like me to set up an isolated worktree? It protects your current branch from changes."

If your human partner declines, work in place and skip to Step 2.

## Project Worktree Policy

Read `<repo-root>/.toolbelt/worktree-policy.md` when it exists and follow it for the rest of this skill: port ranges and how to pick a non-conflicting set, sidecar containers and their naming, per-worktree data directories, environment files to derive rather than copy, and what to tear down at finish. Report the set you claimed. With no policy file, use project defaults; an invented scheme collides with the next worktree.

A policy may also declare **parallel-workspace rules** for worktrees that run concurrently:

- How to derive a per-workspace database name (or equivalent) from the branch name.
- Which resources are per-workspace and which are shared.
- Setup commands to run per workspace (codegen, migrations, and the like).
- An optional concurrency limit lower than 3 when the machine cannot support three concurrent setups; subagent-driven-development honors the lower number.

subagent-driven-development applies them per track worktree and reports the resources claimed. A track needing isolated stateful resources with no policy declaring how is a gap to report, not improvise around.

## Step 1: Create Isolated Workspace

A caller may name a **source ref** — the SHA or branch the worktree starts from. Otherwise use `HEAD`.

### 1a. Native Worktree Tools

Look for a tool named like `EnterWorktree` or `WorktreeCreate`, or a `/worktree` command. If one exists, use it and skip to Step 2: it owns placement, branching, and cleanup, and `git worktree add` in its place creates phantom state your harness can't see or manage.

Use Step 1b only with no native tool, or a source ref that tool cannot take.

### 1b. Git Worktree Fallback

Pick the directory in this order: a preference in your instructions; an existing `.worktrees/` or `worktrees/`, `.worktrees` winning if both exist; otherwise `.worktrees/` at the project root.

Verify it is ignored first; an unignored worktree directory commits the whole tree into the repo:

```bash
git check-ignore -q .worktrees 2>/dev/null || git check-ignore -q worktrees 2>/dev/null
```

**If NOT ignored:** add to .gitignore, commit, then proceed.

```bash
path="$LOCATION/$BRANCH_NAME"

git worktree add "$path" -b "$BRANCH_NAME" "${SOURCE_REF:-HEAD}"
cd "$path"
```

**Sandbox fallback:** if `git worktree add` fails with a permission error (sandbox denial), tell your human partner the sandbox blocked creation and you're working in the current directory instead, then run setup and baseline in place.

## Step 2: Project Setup

Apply the policy's setup rules first — allocated ports, sidecar containers, per-worktree data directories — then install dependencies the way the project's manifest says.

## Step 3: Verify Clean Baseline

Run the smallest focused checks that prove a clean start: the tests the work will rely on, not a workspace or package-wide baseline. When the base commit already has qualifying test evidence or authoritative green CI, cite that instead of re-running; docs-only work needs no baseline suite.

**If tests fail:** report them and ask whether to proceed or investigate. Otherwise report ready.

### Report

```
Worktree ready at <full-path>
Baseline: <focused tests passing (N tests, 0 failures) | cited base CI/evidence <ref> | docs-only, no suite required>
Resources: <ports/containers claimed per worktree policy, or "project defaults, no policy file">
Ready to implement <feature-name>
```
