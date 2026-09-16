#!/usr/bin/env bash
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
script="$repo_root/scripts/token-audit"
fixtures="$repo_root/tests/toolbelt/fixtures/token-audit"

assert_contains() {
  local haystack=$1 text=$2 description=$3
  if ! printf '%s' "$haystack" | grep -Fq -- "$text"; then
    echo "not ok - $description" >&2
    echo "missing: $text" >&2
    echo "$haystack" >&2
    exit 1
  fi
  echo "ok - $description"
}

codex=$(python3 "$script" "$fixtures/rollout-root.jsonl")
assert_contains "$codex" "/root  " "codex root row uses agent_path"
assert_contains "$codex" "  /root/fixer" "codex child rollout found by parent_thread_id"
assert_contains "$codex" "/root                                  3        4,700         2,400       100" "codex root totals: uncached = input - cached"
assert_contains "$codex" "TOTAL                                  4        4,900         2,500       300" "codex totals include the child"
assert_contains "$codex" "skill/policy" "codex exec cat of a skill is classified"
assert_contains "$codex" "wait/poll calls: 1 of 3" "wait_agent counts as a wait"
assert_contains "$codex" "2x  skills/pr-monitor/SKILL.md" "repeat cat of one path is counted"
assert_contains "$codex" "+    3,900 tokens  exec cat skills/pr-monitor/SKILL.md" "context jump names the causing command"

claude=$(python3 "$script" "$fixtures/claude-root.jsonl")
assert_contains "$claude" "root                                   2        1,050         3,000       100" "claude usage dedupes by requestId and counts cache writes as uncached"
assert_contains "$claude" "  abc " "claude subagent transcript found under session dir"
assert_contains "$claude" "review/report" "claude Read of a review file is classified"
assert_contains "$claude" "wait/poll calls: 1 of 2" "sleep/tail Bash counts as a wait"
assert_contains "$claude" "+    2,050 tokens  Read /w/docs/review.md" "claude context jump names the causing tool"

json=$(python3 "$script" --json "$fixtures/rollout-root.jsonl")
assert_contains "$json" '"name": "/root/fixer"' "json output nests children"
