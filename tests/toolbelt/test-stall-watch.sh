#!/usr/bin/env bash
# stall-watch wakes on a transcript that stopped changing and stays quiet otherwise.
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
watch="$repo_root/skills/agent-routing/scripts/stall-watch"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

fail() {
  echo "not ok - $1" >&2
  [ $# -gt 1 ] && printf '%s\n' "$2" >&2
  exit 1
}

touch "$tmp/fresh.jsonl"
touch -d '-50 minutes' "$tmp/stale.jsonl" 2>/dev/null || touch -t "$(date -v-50M +%Y%m%d%H%M)" "$tmp/stale.jsonl"

out=$("$watch" --once --minutes 45 "$tmp/fresh.jsonl")
[ -z "$out" ] || fail "a fresh transcript was reported" "$out"
echo "ok - quiet while transcripts change"

out=$("$watch" --once --minutes 45 "$tmp/fresh.jsonl" "$tmp/stale.jsonl")
case $out in
  "STALLED $tmp/stale.jsonl idle 50m (limit 45m)") : ;;
  *) fail "the stale transcript was not reported alone" "$out" ;;
esac
echo "ok - reports only the stale transcript"

out=$("$watch" --once --minutes 45 "$tmp/fresh.jsonl" --minutes 120 "$tmp/stale.jsonl")
[ -z "$out" ] || fail "a longer limit for a monitor was ignored" "$out"
echo "ok - each --minutes applies to the transcripts after it"

out=$(timeout 10 "$watch" --every 1 --minutes 45 "$tmp/fresh.jsonl" "$tmp/stale.jsonl") || fail "watch mode did not exit on a stall"
case $out in STALLED*) : ;; *) fail "watch mode exited without a STALLED line" "$out" ;; esac
echo "ok - watch mode exits on the first stall"

set +e
timeout 3 "$watch" --every 1 --minutes 45 "$tmp/fresh.jsonl" >/dev/null
code=$?
set -e
[ "$code" -eq 124 ] || fail "watch mode exited ($code) with nothing stalled"
echo "ok - watch mode keeps waiting while agents work"

mkdir -p "$tmp/claude/projects/p/s/subagents" "$tmp/codex/sessions/2026/11/01"
touch -d '-50 minutes' "$tmp/claude/projects/p/s/subagents/agent-abc123.jsonl" 2>/dev/null ||
  touch -t "$(date -v-50M +%Y%m%d%H%M)" "$tmp/claude/projects/p/s/subagents/agent-abc123.jsonl"
touch "$tmp/codex/sessions/2026/11/01/rollout-2026-11-01T10-00-00-0199aaaa-bbbb.jsonl"
out=$(CLAUDE_CONFIG_DIR="$tmp/claude" CODEX_HOME="$tmp/codex" "$watch" --once --minutes 45 abc123 0199aaaa-bbbb)
case $out in
  "STALLED $tmp/claude/projects/p/s/subagents/agent-abc123.jsonl idle 50m (limit 45m)") : ;;
  *) fail "agent ids did not resolve to their transcripts" "$out" ;;
esac
echo "ok - Claude Code agent ids and Codex session ids resolve"

set +e
CLAUDE_CONFIG_DIR="$tmp/claude" CODEX_HOME="$tmp/codex" "$watch" --once --minutes 45 nope 2>/dev/null
code=$?
set -e
[ "$code" -eq 2 ] || fail "an unknown id exited $code, not 2"
echo "ok - an unknown id is an error"
echo PASS
