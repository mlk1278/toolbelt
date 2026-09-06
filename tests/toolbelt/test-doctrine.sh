#!/usr/bin/env bash
#
# Writing doctrine, enforced repo-wide across skills/.
#
# Absence checks invert git grep: it exits 0 on a match, which is the failure.
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"

failures=0

fail() {
  echo "not ok - $1" >&2
  failures=$((failures + 1))
}

ok() {
  echo "ok - $1"
}

# no_extremely_important
if git grep -q -e "EXTREMELY-IMPORTANT" -e "EXTREMELY_IMPORTANT" -- skills hooks; then
  git grep -n -e "EXTREMELY-IMPORTANT" -e "EXTREMELY_IMPORTANT" -- skills hooks >&2
  fail "no_extremely_important: the EXTREMELY-IMPORTANT tag is gone from skills and hooks"
else
  ok "no_extremely_important"
fi

# no_letter_spirit
if git grep -q "Violating the letter" -- skills; then
  git grep -n "Violating the letter" -- skills >&2
  fail "no_letter_spirit: letter-and-spirit boilerplate is gone from skills"
else
  ok "no_letter_spirit"
fi

# no_threats
if git grep -q -e "you'll be replaced" -e "you will be replaced" -- skills; then
  git grep -n -e "you'll be replaced" -e "you will be replaced" -- skills >&2
  fail "no_threats: threat language is gone from skills"
else
  ok "no_threats"
fi

# iron_law_only_tdd
iron=$(git grep -l "Iron Law" -- skills || true)
if [ -n "$iron" ] && [ "$iron" != "skills/test-driven-development/SKILL.md" ]; then
  echo "$iron" >&2
  fail "iron_law_only_tdd: \"Iron Law\" appears outside test-driven-development"
else
  ok "iron_law_only_tdd"
fi

# one_rationalization_table
expected_tables="skills/test-driven-development/SKILL.md
skills/writing-skills/testing-skills-with-subagents.md"
tables=$(git grep -l -e "| Excuse | Reality |" -e "| Thought | Reality |" -- skills || true)
unexpected=$(comm -23 <(echo "$tables" | grep -v '^$' | sort) <(echo "$expected_tables" | sort) || true)
if [ -n "$unexpected" ]; then
  echo "$unexpected" >&2
  fail "one_rationalization_table: a rationalization table appears outside the allowed files"
else
  ok "one_rationalization_table"
fi

# gates_under_80_words
gate_failures=0
for file in skills/*/SKILL.md; do
  for tag in HARD-GATE ENTRY-GATE; do
    # Whole-line anchors only: an inline mention never opens a range.
    # The tag lines themselves are excluded from the count.
    while read -r words; do
      [ -n "$words" ] || continue
      if [ "$words" -gt 80 ]; then
        echo "$file <$tag> block is $words words (max 80)" >&2
        gate_failures=$((gate_failures + 1))
      fi
    done < <(awk -v tag="$tag" '
      $0 == "<" tag ">" { inblock = 1; n = 0; next }
      $0 == "</" tag ">" { if (inblock) print n; inblock = 0; next }
      inblock && $0 !~ /^</ { n += NF }
      END { if (inblock) print n }
    ' "$file")
  done
done
if [ "$gate_failures" -gt 0 ]; then
  fail "gates_under_80_words: $gate_failures gate block(s) over 80 words"
else
  ok "gates_under_80_words"
fi

if [ "$failures" -gt 0 ]; then
  exit 1
fi

echo "PASS"
