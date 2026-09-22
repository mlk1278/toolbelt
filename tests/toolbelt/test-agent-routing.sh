#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
resolver="$repo_root/skills/agent-routing/scripts/resolve-agent"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

passes=0

assert_route() {
  local name=$1 expected=$2
  shift 2
  local actual

  if ! actual=$("$resolver" "$@" 2>"$tmp/stderr"); then
    echo "not ok - $name" >&2
    cat "$tmp/stderr" >&2
    exit 1
  fi

  python3 - "$name" "$expected" "$actual" <<'PY'
import json
import sys

name, expected_text, actual_text = sys.argv[1:]
expected = json.loads(expected_text)
actual = json.loads(actual_text)

# "instructions" is prose describing what a role is for. It churns, and pinning
# it here would make every wording change a test failure. Compare it only when
# the expectation actually asserts it.
if "instructions" not in expected:
    actual.pop("instructions", None)

if actual != expected:
    raise SystemExit(
        f"not ok - {name}\nexpected: {json.dumps(expected, sort_keys=True)}"
        f"\nactual:   {json.dumps(actual, sort_keys=True)}"
    )
PY
  echo "ok - $name"
  passes=$((passes + 1))
}

assert_failure() {
  local name=$1 diagnostic=$2
  shift 2

  if "$resolver" "$@" >"$tmp/stdout" 2>"$tmp/stderr"; then
    echo "not ok - $name (command unexpectedly succeeded)" >&2
    exit 1
  fi
  if ! grep -F -- "$diagnostic" "$tmp/stderr" >/dev/null; then
    echo "not ok - $name" >&2
    echo "expected diagnostic containing: $diagnostic" >&2
    cat "$tmp/stderr" >&2
    exit 1
  fi
  echo "ok - $name"
  passes=$((passes + 1))
}

mkdir -p "$tmp/empty" "$tmp/project/.toolbelt" "$tmp/reviewer/.toolbelt" \
  "$tmp/dependent/.toolbelt" "$tmp/filtered/.toolbelt" "$tmp/invalid/.toolbelt" \
  "$tmp/retired/.toolbelt"

cat >"$tmp/project/.toolbelt/agents.json" <<'JSON'
{
  "version": 1,
  "roles": {
    "implementer": {
      "harness": "project-harness",
      "model": "project-role",
      "effort": "low",
      "fallbacks": [
        {"harness": "fallback-a", "model": "fallback-one", "effort": "medium"},
        {"harness": "fallback-b", "model": "fallback-two", "effort": "high"}
      ]
    }
  },
  "reviewer_specialties": {
    "security": {
      "harness": "specialty-harness",
      "model": "specialty-route",
      "effort": "high",
      "fallbacks": [
        {"harness": "specialty-fallback", "model": "specialty-fallback-route", "effort": "high"}
      ]
    },
    "plan": {
      "harness": "project-plan-harness",
      "model": "project-plan-route",
      "effort": "high"
    }
  }
}
JSON

cat >"$tmp/reviewer/.toolbelt/agents.json" <<'JSON'
{
  "version": 1,
  "roles": {
    "reviewer": {
      "harness": "author-harness",
      "model": "author-model",
      "effort": "high",
      "fallbacks": [
        {"harness": "reviewer-harness", "model": "independent-model", "effort": "high"},
        {"harness": "final-harness", "model": "final-model", "effort": "medium"}
      ]
    }
  }
}
JSON

cat >"$tmp/dependent/.toolbelt/agents.json" <<'JSON'
{
  "version": 1,
  "roles": {
    "reviewer": {
      "harness": "author-harness",
      "model": "first-model",
      "effort": "high",
      "fallbacks": [
        {"harness": "AUTHOR-HARNESS", "model": "second-model", "effort": "medium"}
      ]
    }
  }
}
JSON

cat >"$tmp/filtered/.toolbelt/agents.json" <<'JSON'
{
  "version": 1,
  "roles": {
    "reviewer": {
      "harness": "reviewer-harness",
      "model": "independent-model",
      "effort": "high",
      "fallbacks": [
        {"harness": "author-harness", "model": "author-model", "effort": "high"},
        {"harness": "final-harness", "model": "final-model", "effort": "medium"}
      ]
    }
  }
}
JSON

printf '{invalid json\n' >"$tmp/invalid/.toolbelt/agents.json"

cat >"$tmp/retired/.toolbelt/agents.json" <<'JSON'
{
  "version": 1,
  "workflows": {
    "delivery": {
      "implementer": {"harness": "workflow-harness", "model": "workflow-route", "effort": "high"}
    }
  }
}
JSON

while IFS='|' read -r role effort fallback_model fallback_effort; do
  assert_route "bundled $role" \
    "{\"role\":\"$role\",\"harness\":\"claude\",\"model\":\"opus-5-5\",\"effort\":\"$effort\",\"fallbacks\":[{\"harness\":\"codex\",\"model\":\"$fallback_model\",\"effort\":\"$fallback_effort\"}],\"source\":\"bundled:role\",\"fallback_reason\":null}" \
    --project-root "$tmp/empty" --role "$role"
done <<'CASES'
explorer|medium|gpt-6-astra|medium
planner|high|gpt-6-astra|high
implementer|medium|gpt-6-sol|high
errand|low|gpt-6-luna|low
monitor|medium|gpt-6-sol|medium
CASES

assert_route "bundled reviewer" \
  '{"role":"reviewer","harness":"codex","model":"gpt-6-astra","effort":"high","fallbacks":[],"source":"bundled:role","fallback_reason":null}' \
  --project-root "$tmp/empty" --role reviewer --author-harness claude

assert_route "project role" \
  '{"role":"implementer","harness":"project-harness","model":"project-role","effort":"low","fallbacks":[{"harness":"fallback-a","model":"fallback-one","effort":"medium"},{"harness":"fallback-b","model":"fallback-two","effort":"high"}],"source":"project:role","fallback_reason":null}' \
  --project-root "$tmp/project" --role implementer

assert_route "calling harness does not change the route" \
  '{"role":"implementer","harness":"project-harness","model":"project-role","effort":"low","fallbacks":[{"harness":"fallback-a","model":"fallback-one","effort":"medium"},{"harness":"fallback-b","model":"fallback-two","effort":"high"}],"source":"project:role","fallback_reason":null}' \
  --project-root "$tmp/project" --role implementer --harness codex

assert_route "reviewer specialty" \
  '{"role":"reviewer","harness":"specialty-harness","model":"specialty-route","effort":"high","fallbacks":[{"harness":"specialty-fallback","model":"specialty-fallback-route","effort":"high"}],"source":"project:reviewer-specialty","fallback_reason":null}' \
  --project-root "$tmp/project" --role reviewer --reviewer-specialty security --author-harness author-harness

assert_route "project specialty beats bundled specialty" \
  '{"role":"reviewer","harness":"project-plan-harness","model":"project-plan-route","effort":"high","fallbacks":[],"source":"project:reviewer-specialty","fallback_reason":null}' \
  --project-root "$tmp/project" --role reviewer --reviewer-specialty plan --author-harness author-harness

assert_route "missing bundled specialty falls through to role" \
  '{"role":"reviewer","harness":"codex","model":"gpt-6-astra","effort":"high","fallbacks":[],"source":"bundled:role","fallback_reason":null}' \
  --project-root "$tmp/empty" --role reviewer --reviewer-specialty plan --author-harness claude

assert_route "unknown specialty falls through to role" \
  '{"role":"reviewer","harness":"codex","model":"gpt-6-astra","effort":"high","fallbacks":[],"source":"bundled:role","fallback_reason":null}' \
  --project-root "$tmp/empty" --role reviewer --reviewer-specialty nonesuch --author-harness claude

assert_route "bundled gate specialty, author claude" \
  '{"role":"reviewer","harness":"codex","model":"gpt-6-astra","effort":"high","fallbacks":[],"source":"bundled:reviewer-specialty","fallback_reason":null}' \
  --project-root "$tmp/empty" --role reviewer --reviewer-specialty gate --author-harness claude

assert_route "bundled gate specialty, author codex" \
  '{"role":"reviewer","harness":"claude","model":"fable-5-1","effort":"high","fallbacks":[],"source":"bundled:reviewer-specialty:fallback[0]","fallback_reason":"reviewer harness matches author harness"}' \
  --project-root "$tmp/empty" --role reviewer --reviewer-specialty gate --author-harness codex

assert_route "bundled ux specialty, author claude" \
  '{"role":"reviewer","harness":"codex","model":"gpt-6-astra","effort":"high","fallbacks":[],"source":"bundled:reviewer-specialty","fallback_reason":null}' \
  --project-root "$tmp/empty" --role reviewer --reviewer-specialty ux --author-harness claude

assert_route "bundled ux specialty, author codex" \
  '{"role":"reviewer","harness":"claude","model":"fable-5-1","effort":"high","fallbacks":[],"source":"bundled:reviewer-specialty:fallback[0]","fallback_reason":"reviewer harness matches author harness"}' \
  --project-root "$tmp/empty" --role reviewer --reviewer-specialty ux --author-harness codex

assert_route "explicit override" \
  '{"role":"implementer","harness":"run-harness","model":"run-model","effort":"medium","fallbacks":[{"harness":"run-fallback","model":"run-fallback-model","effort":"low"}],"source":"explicit","fallback_reason":null}' \
  --project-root "$tmp/project" --role implementer --override-harness run-harness \
  --override-model run-model --override-effort medium \
  --override-fallback run-fallback,run-fallback-model,low

assert_route "reviewer selects first different-harness fallback case-insensitively" \
  '{"role":"reviewer","harness":"reviewer-harness","model":"independent-model","effort":"high","fallbacks":[{"harness":"final-harness","model":"final-model","effort":"medium"}],"source":"project:role:fallback[0]","fallback_reason":"reviewer harness matches author harness"}' \
  --project-root "$tmp/reviewer" --role reviewer --author-harness AUTHOR-HARNESS

assert_route "different-harness primary is accepted even when model names match" \
  '{"role":"reviewer","harness":"author-harness","model":"author-model","effort":"high","fallbacks":[{"harness":"reviewer-harness","model":"independent-model","effort":"high"},{"harness":"final-harness","model":"final-model","effort":"medium"}],"source":"project:role","fallback_reason":null}' \
  --project-root "$tmp/reviewer" --role reviewer --author-harness different-harness

assert_route "reviewer filters same-harness fallback case-insensitively" \
  '{"role":"reviewer","harness":"reviewer-harness","model":"independent-model","effort":"high","fallbacks":[{"harness":"final-harness","model":"final-model","effort":"medium"}],"source":"project:role","fallback_reason":null}' \
  --project-root "$tmp/filtered" --role reviewer --author-harness AUTHOR-HARNESS

assert_failure "reviewer requires author identity" "reviewer role requires --author-harness" \
  --project-root "$tmp/reviewer" --role reviewer
assert_failure "reviewer requires independent route" "no independent reviewer route is available" \
  --project-root "$tmp/dependent" --role reviewer --author-harness Author-Harness
assert_failure "unknown role" "no route found for role 'unknown'" \
  --project-root "$tmp/empty" --role unknown
# The path in this diagnostic is rendered by pathlib, so it comes back
# backslashed on Windows and never matches the POSIX form built here. Assert
# the message, not the path.
assert_failure "missing project root" "project root is not a directory" \
  --project-root "$tmp/missing" --role implementer
assert_failure "incomplete explicit override" \
  "explicit override requires --override-harness, --override-model, and --override-effort" \
  --project-root "$tmp/empty" --role implementer --override-model run-model
assert_failure "specialty requires reviewer" \
  "--reviewer-specialty is valid only for the reviewer role" \
  --project-root "$tmp/empty" --role implementer --reviewer-specialty security
assert_failure "invalid project JSON" "invalid JSON" \
  --project-root "$tmp/invalid" --role implementer
assert_failure "retired routing layers fail closed" "retired key(s) workflows" \
  --project-root "$tmp/retired" --role implementer

assert_failure "brief rejects a role" "do not also pass --role" \
  --project-root "$tmp/empty" --brief --role implementer

assert_failure "role is required without brief" "--role is required" \
  --project-root "$tmp/empty"

assert_brief() {
  local name=$1
  shift
  local actual

  if ! actual=$("$resolver" "$@" 2>"$tmp/stderr"); then
    echo "not ok - $name" >&2
    cat "$tmp/stderr" >&2
    exit 1
  fi

  python3 - "$name" "$actual" <<'PY'
import json
import sys

name, actual_text = sys.argv[1:]
brief = json.loads(actual_text)


def fail(message):
    raise SystemExit(f"not ok - {name}\n{message}")


expected_roles = {"explorer", "planner", "implementer", "errand", "monitor", "reviewer"}
if set(brief["roles"]) != expected_roles:
    fail(f"roles were {sorted(brief['roles'])}")

for role, route in brief["roles"].items():
    for field in ("harness", "model", "effort", "instructions"):
        if not route.get(field):
            fail(f"{role} is missing {field}")

if set(brief.get("reviewer_specialties", {})) != {"gate", "ux"}:
    fail(f"brief specialties were {sorted(brief.get('reviewer_specialties', {}))}")

if not brief.get("instructions"):
    fail("brief is missing project-wide instructions")

# The reason the brief can replace a per-dispatch call: it answers the
# independence question for every harness the table can dispatch, so an author
# never reviews its own work.
conditional = brief["reviewer_by_author_harness"]
if set(conditional) != {"claude", "codex"}:
    fail(f"brief author harnesses were {sorted(conditional)}")
if conditional["codex"]["harness"].lower() == "codex":
    fail("brief routes the codex author's work back to codex for review")
if conditional["claude"]["harness"] != "codex":
    fail("brief should keep the primary reviewer for an independent author")
PY
  echo "ok - $name"
  passes=$((passes + 1))
}

assert_brief "session brief resolves every role" \
  --project-root "$tmp/empty" --brief

echo "$passes routing tests passed"
