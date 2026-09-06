#!/usr/bin/env bash
# Literal shell snippets are contract text, not expressions to expand.
# shellcheck disable=SC2016
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
plans="$repo_root/skills/writing-plans/SKILL.md"
tracks="$repo_root/skills/writing-plans/execution-tracks.md"
sdd="$repo_root/skills/subagent-driven-development/SKILL.md"
sdd_tracks="$repo_root/skills/subagent-driven-development/parallel-tracks.md"
worktrees="$repo_root/skills/using-git-worktrees/SKILL.md"

assert_contains() {
  local file=$1 text=$2 description=$3
  if ! grep -Fq -- "$text" "$file"; then
    echo "not ok - $description" >&2
    echo "missing: $text" >&2
    exit 1
  fi
  echo "ok - $description"
}

assert_not_contains() {
  local file=$1 text=$2 description=$3
  if grep -Fq -- "$text" "$file"; then
    echo "not ok - $description" >&2
    echo "unexpected: $text" >&2
    exit 1
  fi
  echo "ok - $description"
}

# writing-plans: declaring tracks.
assert_contains "$plans" '## Execution Tracks' \
  "plans may declare execution tracks"
assert_contains "$tracks" 'No file is created or modified by two concurrent tracks' \
  "concurrent tracks require disjoint file sets"
assert_contains "$tracks" 'contract-freeze' \
  "shared contracts freeze on the mainline before the fork"
assert_contains "$tracks" 'Every fork closes with a mainline integration task' \
  "every merge point gets an integration task"
assert_contains "$plans" \
  'a plan with no concurrent tracks and no one-sentence justification is a defect' \
  "plan review gate rejects an unjustified all-serial plan"

# subagent-driven-development: executing tracks.
assert_contains "$sdd" '## Parallel Tracks' \
  "sdd carries the parallel-tracks section"
assert_contains "$sdd_tracks" 'At most 3 tracks run concurrently' \
  "concurrency cap is 3"
assert_contains "$sdd_tracks" '## Decisions & drift risks' \
  "track reports carry a drift log"
assert_contains "$sdd_tracks" 'A textual conflict is a plan defect' \
  "track merge conflicts stop, never hand-resolved"
assert_contains "$sdd" 'Dispatch multiple implementation subagents into the same worktree' \
  "red flag scopes concurrency to one implementer per track worktree"
assert_contains "$sdd" 'Parallelize tracks the plan did not declare' \
  "undeclared parallelism is a red flag"
assert_not_contains "$sdd" 'Dispatch multiple implementation subagents in parallel (conflicts)' \
  "old unconditional parallel-dispatch flag is gone"

# using-git-worktrees: parallel-workspace policy rules.
assert_contains "$worktrees" 'parallel-workspace rules' \
  "policy contract covers parallel workspaces"
assert_contains "$worktrees" 'concurrency limit lower than 3' \
  "policy may lower the track cap, never raise it"

echo "PASS"
