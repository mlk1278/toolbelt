#!/usr/bin/env bash
#
# Word-count ceilings, repo-wide.
#
# Prints every count and fails on the first file over its ceiling.
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)

ceilings=(
  "skills/using-toolbelt/SKILL.md:300"
  "skills/verification-before-completion/SKILL.md:300"
  "skills/receiving-code-review/SKILL.md:300"
  "skills/writing-skills/SKILL.md:1000"
  "skills/writing-skills/testing-skills-with-subagents.md:1800"
  "skills/writing-for-agents/SKILL.md:750"
  "skills/systematic-debugging/SKILL.md:600"
  "skills/test-driven-development/SKILL.md:600"
  "skills/brainstorming/SKILL.md:650"
  "skills/finishing-a-development-branch/SKILL.md:850"
  "skills/using-git-worktrees/SKILL.md:750"
  "skills/dispatching-parallel-agents/SKILL.md:320"
  "skills/requesting-code-review/SKILL.md:350"
  "skills/requesting-code-review/code-reviewer.md:500"
  "skills/interactive-design/SKILL.md:1200"
  "skills/interactive-design/iteration-mode.md:500"
  "skills/subagent-driven-development/SKILL.md:1900"
  "skills/subagent-driven-development/task-reviewer-prompt.md:650"
  "skills/subagent-driven-development/implementer-prompt.md:550"
  "skills/subagent-driven-development/re-review-prompt.md:420"
  "skills/subagent-driven-development/gate-reviewer-prompt.md:700:optional"
  "skills/subagent-driven-development/parallel-tracks.md:420"
  "skills/writing-plans/SKILL.md:1900"
  "skills/writing-plans/execution-tracks.md:360"
  "skills/ux-gate/SKILL.md:950"
  "skills/writing-specs/SKILL.md:550"
  "skills/delivery/SKILL.md:900"
  "skills/pr-monitor/SKILL.md:850"
  "skills/agent-routing/SKILL.md:800"
  "skills/quick-task/SKILL.md:200"
  "docs/WORKFLOW.md:320"
)

for entry in "${ceilings[@]}"; do
  optional=0
  if [[ "$entry" == *:optional ]]; then
    optional=1
    entry=${entry%:optional}
  fi
  path=${entry%:*}
  ceiling=${entry##*:}
  file="$repo_root/$path"

  if [ ! -f "$file" ]; then
    if [[ "$optional" -eq 1 ]]; then
      echo "skip - $path (absent)"
      continue
    fi
    echo "not ok - $path missing" >&2
    exit 1
  fi

  count=$(wc -w <"$file")
  echo "$count/$ceiling $path"

  if [[ "$count" -gt "$ceiling" ]]; then
    echo "not ok - $path exceeds ceiling" >&2
    exit 1
  fi
done
