#!/usr/bin/env bash
# The capture tool's request guard (unit) and harness features (browser).
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
scripts="$repo_root/skills/ux-gate/scripts"
node "$repo_root/tests/toolbelt/ux-capture-guard.test.mjs" "$scripts/lib"

module=${PLAYWRIGHT_MODULE:-}
if [ -z "$module" ]; then
  module=$(cd "$repo_root" && node -e "console.log(require.resolve('playwright'))" 2>/dev/null || true)
fi
if [ -z "$module" ]; then
  echo "SKIP - playwright unavailable"
  exit 0
fi

PLAYWRIGHT_MODULE="$module" node "$repo_root/tests/toolbelt/ux-capture-harness.cjs" "$scripts/ux-capture"
