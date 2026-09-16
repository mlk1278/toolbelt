#!/usr/bin/env bash
# Literal shell snippets are contract text, not expressions to expand.
# shellcheck disable=SC2016
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
skill="$repo_root/skills/subagent-driven-development/SKILL.md"

assert_contains() {
  local text=$1 description=$2
  if ! grep -Fq -- "$text" "$skill"; then
    echo "not ok - $description" >&2
    echo "missing: $text" >&2
    exit 1
  fi
  echo "ok - $description"
}

assert_not_contains() {
  local text=$1 description=$2
  if grep -Fq -- "$text" "$skill"; then
    echo "not ok - $description" >&2
    echo "unexpected: $text" >&2
    exit 1
  fi
  echo "ok - $description"
}

assert_contains 'plan route, then project route, then the session routing brief' \
  "caller routing precedence is explicit"

assert_contains 'do not substitute your own judgment for a missing route' \
  "a missing route escalates instead of being guessed"
assert_contains 'If the caller supplies a pre-final gate, run it after all task reviews and before the broad final review.' \
  "optional pre-final gate runs at the retained seam"
assert_contains 'scripts/review-package --plan PLAN_FILE MERGE_BASE HEAD` for the final review' \
  "broad final review still receives a review package"
assert_contains '**Final-review findings get ONE fix subagent**' \
  "final findings are fixed together"
assert_contains 'with the review-file path holding the complete list, not one fixer per finding.' \
  "one fixer receives the complete finding set"
assert_contains 'contains the covering tests, the command, and the output' \
  "fix verification carries evidence"
assert_contains "read the implementer's test evidence on unchanged source instead of re-running it" \
  "evidence reuse is commit-bound and actor-scoped"
assert_contains 'Implementers and fixers always produce their own fresh evidence' \
  "implementers never reuse evidence for their own claims"
assert_contains '**Workspace-wide suite:** once, at the final gate.' \
  "workspace suite is final-gate only"
assert_contains 'Then run exactly one scoped re-review of the fix wave' \
  "final fix wave is re-reviewed over its delta"
assert_contains 'There is no second fix wave' \
  "final review does not loop indefinitely"
assert_contains '**One fix round per task.**' \
  "task fix loop is bounded"
assert_contains 'Adjudicate **only** after the re-review' \
  "adjudication cannot be used to exit the loop early"
assert_contains 'out-of-scope observations go to the ledger as deferred minors and never extend the loop' \
  "re-review scope cannot grow the loop"

assert_contains 'it never carries a check that gates that command' \
  "a buffered wrapper cannot carry a gating check"

assert_not_contains '### Final whole-branch gate' "exact-head gate section removed"
assert_not_contains 'REVIEW_HEAD=$(git rev-parse HEAD)' "exact-head state removed"
assert_not_contains 'approved SHA' "approved-SHA bookkeeping removed"
assert_not_contains 'After any compaction or resume' "resume state machinery removed"

echo "PASS"
