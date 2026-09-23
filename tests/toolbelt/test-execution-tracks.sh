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
assert_contains "$plans" 'Without the section, tasks run in order.' \
  "tracks are declared only when parallelism pays"

# subagent-driven-development: executing tracks.
assert_contains "$sdd" '[parallel-tracks.md](parallel-tracks.md)' \
  "sdd points to parallel tracks"
assert_contains "$sdd_tracks" 'At most 3 tracks run concurrently' \
  "concurrency cap is 3"
assert_contains "$sdd_tracks" '## Decisions & drift risks' \
  "track reports carry a drift log"
assert_contains "$sdd_tracks" 'A textual conflict is a plan defect' \
  "track merge conflicts stop, never hand-resolved"
assert_contains "$sdd" 'Never run two implementers in one worktree' \
  "one implementer per worktree"
assert_contains "$sdd" "more implementers at once than the plan's declared tracks" \
  "undeclared parallelism is ruled out"
assert_not_contains "$sdd" 'Dispatch multiple implementation subagents in parallel (conflicts)' \
  "old unconditional parallel-dispatch flag is gone"

# using-git-worktrees: parallel-workspace policy rules.
assert_contains "$worktrees" 'parallel-workspace rules' \
  "policy contract covers parallel workspaces"
assert_contains "$worktrees" 'concurrency limit lower than 3' \
  "policy may lower the track cap, never raise it"

# Validate the copyable example as structured input, including task partition
# and dependency order. Phrase assertions alone cannot catch a shifted cell.
python3 - "$tracks" <<'PY_TABLE'
import re, sys
from pathlib import Path
rows = [line for line in Path(sys.argv[1]).read_text().splitlines() if line.startswith('|')]
columns = [[cell.strip() for cell in row.strip('|').split('|')] for row in rows]
assert columns and all(len(row) == 6 for row in columns), 'track table must have six cells per row'
seen_tracks, seen_tasks = set(), set()
for track, boundary, tasks, depends, files, why in columns[2:]:
    assert track not in seen_tracks and boundary.isdecimal(), (track, boundary)
    assert files and why, track
    for dependency in depends.split(', '):
        assert dependency == '—' or dependency in seen_tracks, (track, dependency)
    ends = [int(n) for n in re.split('[–-]', tasks)]
    numbers = set(range(ends[0], ends[-1] + 1))
    assert not numbers & seen_tasks, (track, 'duplicate task')
    seen_tracks.add(track)
    seen_tasks.update(numbers)
assert seen_tasks == set(range(1, 12)), 'example must assign every task exactly once'
print('ok - track example has valid columns, task partition, and dependencies')
PY_TABLE

echo "PASS"
