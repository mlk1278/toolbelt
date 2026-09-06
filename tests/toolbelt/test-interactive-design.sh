#!/usr/bin/env bash
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
skill="$repo_root/skills/interactive-design/SKILL.md"
metadata="$repo_root/skills/interactive-design/agents/openai.yaml"
iteration="$repo_root/skills/interactive-design/iteration-mode.md"

assert_contains() {
  local file=$1 text=$2 description=$3
  if ! grep -Fq "$text" "$file"; then
    echo "not ok - $description" >&2
    echo "missing: $text" >&2
    exit 1
  fi
  echo "ok - $description"
}

[ -f "$skill" ] || { echo "not ok - skill file missing: $skill" >&2; exit 1; }
[ -f "$iteration" ] || { echo "not ok - iteration mode file missing: $iteration" >&2; exit 1; }

assert_contains "$skill" "name: interactive-design" "frontmatter name"
assert_contains "$skill" "accepts the frontend-first offer" "description trigger"
assert_contains "$skill" "TOOLBELT-FIXTURE <endpoint id>" "marker format with endpoint id"
assert_contains "$skill" ".toolbelt/prototype/" "ledger path"
assert_contains "$skill" "a fixture without a ledger entry is a gate violation" "hard gate teeth"
assert_contains "$skill" "':!docs/toolbelt' ':!.toolbelt'" "fixture-zero exclusions"
assert_contains "$skill" "exits 1 (no matches)" "grep inversion stated"
assert_contains "$skill" ".toolbelt/prototyping.md" "per-project convention documented"
assert_contains "$skill" "Do NOT invoke any other skill" "single next skill"
assert_contains "$skill" "matching its endpoint id" "reconciliation requirement"
assert_contains "$skill" "Acceptance criteria" "criteria written at exit"

[ -f "$metadata" ] || { echo "not ok - committed OpenAI metadata missing" >&2; exit 1; }
assert_contains "$metadata" 'display_name: "Interactive Design"' "Codex metadata"

short_description=$(sed -n 's/^ *short_description: "\(.*\)"$/\1/p' "$metadata")
short_description_len=$(printf %s "$short_description" | wc -c)
if [ "$short_description_len" -lt 25 ] || [ "$short_description_len" -gt 64 ]; then
  echo "not ok - short_description within 25-64 characters" >&2
  echo "length: $short_description_len" >&2
  exit 1
fi
echo "ok - short_description within 25-64 characters"

frontmatter=$(awk 'NR==1{if($0!="---")exit; next} /^---$/{exit} {print}' "$skill")
frontmatter_keys=$(printf '%s\n' "$frontmatter" | sed -n 's/^\([a-zA-Z0-9_-]*\):.*/\1/p' | sort | tr '\n' ' ')
if [ "$frontmatter_keys" != "description name " ]; then
  echo "not ok - frontmatter has exactly the keys name and description" >&2
  echo "keys: $frontmatter_keys" >&2
  exit 1
fi
echo "ok - frontmatter has exactly the keys name and description"

frontmatter_len=$(printf %s "$frontmatter" | wc -c)
if [ "$frontmatter_len" -gt 1024 ]; then
  echo "not ok - frontmatter block within 1024 characters" >&2
  echo "length: $frontmatter_len" >&2
  exit 1
fi
echo "ok - frontmatter block within 1024 characters"

assert_contains "$skill" "iterate directly on an existing feature's UI" "second trigger in description"
assert_contains "$skill" "the request itself is the entry" "ENTRY-GATE third way in"
assert_contains "$skill" "[PENDING]" "pending status documented"
assert_contains "$skill" "a placeholder without" "placeholder gate teeth"
assert_contains "$iteration" "before §4's reconciliation may run" "materialization is a gate"
assert_contains "$iteration" "toolbelt:quick-task" "small-delta route named"
assert_contains "$skill" "the route confirmed in iteration-mode.md" "exit step mode-scoped at source"

hard_gate=$(sed -n '/<HARD-GATE>/,/<\/HARD-GATE>/p' "$skill")
if ! printf '%s' "$hard_gate" | grep -Fq "[PENDING]"; then
  echo "not ok - PENDING deferral lives inside the HARD-GATE block" >&2
  exit 1
fi
echo "ok - PENDING deferral lives inside the HARD-GATE block"

brainstorming="$repo_root/skills/brainstorming/SKILL.md"
writing_specs="$repo_root/skills/writing-specs/SKILL.md"

assert_contains "$brainstorming" "inside that skill is authorized" "HARD-GATE exception present"
assert_contains "$brainstorming" "we could go frontend-first" "offer text present"
assert_contains "$brainstorming" "The offer is its own message" "own-message rule"
assert_contains "$brainstorming" "invoke it and no other" "After-the-Design fork"
assert_contains "$brainstorming" "or to interactive-design when they accepted" "checklist item 6 conditional"

assert_contains "$writing_specs" "Arriving from interactive-design with a reconciled contract ledger" "entry gate acknowledges the path"

echo "PASS"
