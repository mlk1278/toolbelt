#!/usr/bin/env bash
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
module=${PLAYWRIGHT_MODULE:-}
if [ -z "$module" ]; then
  module=$(cd "$repo_root" && node -e "console.log(require.resolve('playwright'))" 2>/dev/null || true)
fi
if [ -z "$module" ]; then
  echo "SKIP - playwright unavailable"
  exit 0
fi

PLAYWRIGHT_MODULE="$module" node "$repo_root/tests/toolbelt/ux-capture-regressions.cjs" \
  "$repo_root/skills/ux-review/scripts/ux-capture"
