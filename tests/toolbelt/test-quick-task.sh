#!/usr/bin/env bash
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
skill="$repo_root/skills/quick-task/SKILL.md"
metadata="$repo_root/skills/quick-task/agents/openai.yaml"

assert_contains() {
  local file=$1 text=$2 description=$3
  if ! grep -Fq "$text" "$file"; then
    echo "not ok - $description" >&2
    echo "missing: $text" >&2
    exit 1
  fi
  echo "ok - $description"
}

assert_no_model_names() {
  local file=$1
  if grep -Eq 'gpt-[0-9]|opus-|sonnet|haiku|-sol|Sol (high|medium|low)' "$file"; then
    echo "not ok - concrete model identifiers in $file" >&2
    exit 1
  fi
  echo "ok - no concrete model identifiers in $file"
}

assert_before() {
  local file=$1 first=$2 second=$3 description=$4
  local first_line second_line
  first_line=$(grep -Fn "$first" "$file" | head -1 | cut -d: -f1)
  second_line=$(grep -Fn "$second" "$file" | head -1 | cut -d: -f1)
  if [[ -z "$first_line" || -z "$second_line" || "$first_line" -ge "$second_line" ]]; then
    echo "not ok - $description" >&2
    exit 1
  fi
  echo "ok - $description"
}

[ -f "$skill" ] || { echo "not ok - skill file missing: $skill" >&2; exit 1; }

assert_contains "$skill" "name: quick-task" "frontmatter name"
assert_contains "$skill" "the ask itself is the spec" "entry condition"
assert_contains "$skill" 'use `brainstorming` and `writing-plans`' "ambiguous work goes to planning"
assert_contains "$skill" "never creates one to mirror a tiny local change" "no ticket mirroring"
assert_contains "$skill" ".toolbelt/quick/" "ignored mini-plan location"
assert_contains "$skill" "one-task implementation plan" "mini-plan shape"
assert_contains "$skill" "Invoke \`delivery\` with the mini-plan path" "shared delivery path"
assert_contains "$skill" "Delivery owns the worktree, routing, SDD, optional UX gate, PR, merge, and cleanup." "delivery owns downstream workflow"
assert_before "$skill" "## 1. Scope check" "## 2. Mini-plan" "scope check precedes the mini-plan"
assert_before "$skill" "## 2. Mini-plan" "## 3. Deliver" "mini-plan precedes delivery"
if grep -Eq 'workstack-(start|resume|spec-review|slice-gate)|## Global Constraints|toolbelt:subagent-driven-development|toolbelt:finishing-a-development-branch|pr-monitor|ux-gate' "$skill"; then
  echo "not ok - quick task duplicates or references superseded delivery machinery" >&2
  exit 1
fi
echo "ok - quick task delegates delivery machinery"
assert_no_model_names "$skill"

[ -f "$metadata" ] || { echo "not ok - committed OpenAI metadata missing" >&2; exit 1; }
grep -Fq "display_name" "$metadata" || { echo "not ok - metadata lacks display_name" >&2; exit 1; }
echo "ok - committed OpenAI metadata present"

echo "PASS"
