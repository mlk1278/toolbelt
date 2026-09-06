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

assert_contains "smallest focused checks that prove a clean start" "baseline is focused, not workspace-wide"
assert_contains "not a workspace or package-wide" "workspace baseline is named and excluded"
assert_contains "cite that instead of re-running" "base evidence can replace a baseline run"
assert_contains "docs-only work" "docs-only work needs no baseline suite"
assert_contains "Baseline: <focused tests passing" "report names the baseline path used"
assert_contains ".toolbelt/worktree-policy.md" "project worktree policy is consulted"
assert_contains "non-conflicting" "policy governs shared-resource allocation"

echo "PASS"
