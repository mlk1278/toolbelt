#!/usr/bin/env bash
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
skill="$repo_root/skills/using-git-worktrees/SKILL.md"

assert_contains() {
  local text=$1 description=$2
  if ! grep -Fq -- "$text" "$skill"; then
    echo "not ok - $description" >&2
    echo "missing: $text" >&2
    exit 1
  fi
  echo "ok - $description"
}

[ -f "$skill" ] || { echo "not ok - skill file missing: $skill" >&2; exit 1; }

# shellcheck disable=SC2016
assert_contains 'git worktree add "$LOCATION/$BRANCH_NAME" -b "$BRANCH_NAME" "${SOURCE_REF:-HEAD}"' "fallback command honors a caller-named source ref"
assert_contains "source ref" "the skill names the source ref concept"
assert_contains "always gets one: skip Step 0" "a sibling worktree is created from inside a linked worktree"

echo "PASS"
