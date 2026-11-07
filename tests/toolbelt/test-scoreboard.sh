#!/usr/bin/env bash
# Runs hill-climb's scoreboard against a throwaway git repo and fixture records.
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
script="$repo_root/skills/hill-climb/scripts/scoreboard"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
failures=0

fail() { echo "not ok - $1" >&2; failures=$((failures + 1)); }
ok() { echo "ok - $1"; }

[ -x "$script" ] || { echo "not ok - scoreboard exists and is executable" >&2; exit 1; }

repo="$tmp/repo"
mkdir -p "$repo"
git -C "$repo" init -q
git -C "$repo" config user.email test@example.com
git -C "$repo" config user.name Test
echo scorer >"$repo/scorer.txt"
git -C "$repo" add scorer.txt
git -C "$repo" commit -qm c0
c0=$(git -C "$repo" rev-parse HEAD)
echo fix >"$repo/fix.txt"
git -C "$repo" add fix.txt
git -C "$repo" commit -qm c1
c1=$(git -C "$repo" rev-parse HEAD)
echo more >"$repo/more.txt"
git -C "$repo" add more.txt
git -C "$repo" commit -qm c2
c2=$(git -C "$repo" rev-parse HEAD)
head_short=$(git -C "$repo" rev-parse --short HEAD)

if command -v sha256sum >/dev/null 2>&1; then
  scorer_hash=$(sha256sum "$repo/scorer.txt" | awk '{print $1}')
else
  scorer_hash=$(shasum -a 256 "$repo/scorer.txt" | awk '{print $1}')
fi

run="$repo/run"
out=""
code=0

new_run() {
  rm -rf "$run"
  (cd "$repo" && "$script" init "$run" >/dev/null)
}

fix() { printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$1" "$2" "$3" "$4" "$5" "$6" >>"$run/fixes.tsv"; }
act() { printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$1" "$2" "$3" "$4" "$5" "$6" "$7" "$8" "$9" >>"$run/runs.tsv"; }

write_regress() {
  local file="$run/regress/$1" pair
  shift
  mkdir -p "$run/regress"
  printf 'scenario\tresult\tnote\n' >"$file"
  for pair in "$@"; do
    printf '%s\t%s\t-\n' "${pair%%:*}" "${pair##*:}" >>"$file"
  done
}

board() {
  if out=$(cd "$repo" && "$script" "$run" 2>&1); then code=0; else code=$?; fi
}

expect() {
  if [ "$code" -ne "$2" ]; then
    fail "$1: exit $code, want $2: $out"
    return
  fi
  case "$out" in
    *"$3"*) ok "$1" ;;
    *) fail "$1: output lacks [$3]: $out" ;;
  esac
}

expect_absent() {
  case "$out" in
    *"$2"*) fail "$1: output should not contain [$2]: $out" ;;
    *) ok "$1" ;;
  esac
}

# init writes both headers and refuses to overwrite.
initdir="$tmp/initrun"
(cd "$repo" && "$script" init "$initdir" >/dev/null)
if [ "$(head -1 "$initdir/fixes.tsv")" = "$(printf 'round\tcommit\tgroup\tproblem\tscenarios\tsample')" ] &&
  [ "$(head -1 "$initdir/runs.tsv")" = "$(printf 'round\tscenario\tcommit\tinput_hash\tbrief\tdispatch\tscore\toutcome\tproblems')" ]; then
  ok "init writes both headers"
else
  fail "init writes both headers"
fi
if out=$(cd "$repo" && "$script" init "$initdir" 2>&1); then code=0; else code=$?; fi
if [ "$code" -eq 2 ] && [ "$(wc -l <"$initdir/fixes.tsv")" -eq 1 ] && [ "$(wc -l <"$initdir/runs.tsv")" -eq 1 ]; then
  ok "init refuses to overwrite"
else
  fail "init refuses to overwrite: exit $code: $out"
fi

# No records yet is a clear board.
new_run
board
expect "empty records are clear" 0 "CLEAR: fixer may run"

verified_records() {
  new_run
  fix 1 "$c1" G1 "broken widget" "s1,s2" "s1,s2"
  act 0 s1 "$c0" hashA v1 d0 5 finished G1
  act 0 s2 "$c0" hashB v1 d1 4 finished G1
  act 1 s1 "$c2" hashA v1 d2 8 finished -
  act 1 s2 "$c1" hashB v1 d3 9 incomplete -
  printf 'scorer-hash scorer.txt %s\n' "$scorer_hash" >"$run/loop.md"
}

# No regress/ folder: fresh actor re-tests alone verify a group. The s2
# re-test is incomplete, and incomplete counts.
verified_records
board
expect "verified group is clear" 0 "G1: VERIFIED"
expect "verified group is clear: last line" 0 "CLEAR: fixer may run"
expect "verified group is clear: scorer ok" 0 "Scorer hashes: ok"
expect "verified group is clear: latest s2 run" 0 "$(printf 's2\t1\t9\tincomplete\t-\tG1')"

# A missing sample re-test blocks.
new_run
fix 1 "$c1" G1 "broken widget" "s1,s2" "s1,s2"
act 0 s1 "$c0" hashA v1 d0 5 finished G1
act 0 s2 "$c0" hashB v1 d1 4 finished G1
act 1 s1 "$c2" hashA v1 d2 8 finished -
board
expect "missing re-test blocks" 1 "G1: NEEDS RETEST s2"
expect "missing re-test blocks: count" 1 "BLOCKED: 1 reason(s)"

# Re-tests that do not count: wrong input, before the fix, a reused
# dispatch, and an invalid run.
bad_retest() {
  new_run
  fix 1 "$c1" G1 "broken widget" "s1,s2" "s2"
  act 0 s1 "$c0" hashA v1 d0 5 finished G1
  act 0 s2 "$c0" hashB v1 d1 4 finished G1
  act 1 s2 "$1" "$2" v1 "$3" 9 "$4" -
  board
}
bad_retest "$c1" hashX d3 finished
expect "wrong input hash does not count" 1 "G1: NEEDS RETEST s2"
bad_retest "$c0" hashB d3 finished
expect "run before the fix does not count" 1 "G1: NEEDS RETEST s2"
bad_retest "$c1" hashB d0 finished
expect "reused dispatch does not count" 1 "G1: NEEDS RETEST s2"
bad_retest "$c1" hashB d3 invalid
expect "invalid run does not count" 1 "G1: NEEDS RETEST s2"

# A relapse reopens the group. That is fixer work, so it does not block.
verified_records
act 2 s1 "$c2" hashA v1 d9 6 finished G1
board
expect "relapse reopens without blocking" 0 "G1: REOPENED by runs.tsv:6"
expect_absent "relapse reopens without blocking: no blocked line" "BLOCKED"

# A later fix row for the same group replaces the earlier one. A relapse
# against the first fix does not reopen the group once the second fix lands.
new_run
fix 1 "$c1" G1 "broken widget" "s1,s2" "s1"
act 0 s1 "$c0" hashA v1 d0 5 finished G1
act 0 s2 "$c0" hashB v1 d1 4 finished G1
act 1 s1 "$c1" hashA v1 d2 6 finished G1
fix 2 "$c2" G1 "broken widget, second fix" "s1,s2" "s1"
act 2 s1 "$c2" hashA v1 d3 9 finished -
board
expect "later fix row replaces the earlier one" 0 "G1: VERIFIED"
expect_absent "later fix row replaces the earlier one: not reopened" "REOPENED"

# A regress failure on a group scenario is fixer work, not a block. Failing
# at HEAD while passing in the baseline is a new regress failure.
verified_records
write_regress baseline.tsv s1:pass s2:pass
write_regress "$head_short.tsv" s1:fail s2:pass
board
expect "regress fail without blocking" 0 "G1: REGRESS FAIL s1"
expect "new regress failure is a first target" 0 "new regress failure: s1"
expect "new regress failure shows in the table" 0 "$(printf 's1\t1\t8\tfinished\tfail\tG1')"
expect_absent "regress fail without blocking: no blocked line" "BLOCKED"

# Failing in the baseline too is a known failure.
verified_records
write_regress baseline.tsv s1:fail s2:pass
write_regress "$head_short.tsv" s1:fail s2:pass
board
expect "baseline failure is known-fail" 0 "$(printf 's1\t1\t8\tfinished\tknown-fail\tG1')"
expect_absent "baseline failure is not new" "new regress failure: s1"

# regress/ with no file for HEAD blocks.
verified_records
write_regress baseline.tsv s1:pass s2:pass
board
expect "regress not run at HEAD blocks" 1 "regress not run at HEAD"
expect "regress not run at HEAD blocks: count" 1 "BLOCKED: 1 reason(s)"

# A changed or missing scorer file blocks.
verified_records
printf 'scorer-hash scorer.txt %064d\n' 0 >"$run/loop.md"
board
expect "changed scorer file blocks" 1 "scorer hash mismatch: scorer.txt"
verified_records
printf 'scorer-hash nope.txt %s\n' "$scorer_hash" >"$run/loop.md"
board
expect "missing scorer file blocks" 1 "scorer file missing: nope.txt"

# Malformed records exit 2 and name the file, line, and column.
new_run
act 0 s1 "$c0" hashA v1 d0 5 done -
board
expect "bad outcome is malformed" 2 "runs.tsv:2: column outcome:"

new_run
printf '0\ts1\t%s\thashA\tv1\td0\t5\tfinished\n' "$c0" >>"$run/runs.tsv"
board
expect "short row is malformed" 2 "expected 9 columns, got 8"

new_run
printf 'round\tcommit\tgroup\tproblem\tscenarios\twrong\n' >"$run/fixes.tsv"
board
expect "wrong header is malformed" 2 "fixes.tsv:1: column sample:"

new_run
fix 1 ffffffffffffffffffffffffffffffffffffffff G1 "broken widget" "s1" "s1"
board
expect "unknown commit is malformed" 2 "fixes.tsv:2: column commit:"

new_run
fix 1 "$c1" G1 "broken widget" "s1,s2" "s3"
board
expect "sample outside scenarios is malformed" 2 "fixes.tsv:2: column sample:"

mkdir -p "$repo/empty"
if out=$(cd "$repo" && "$script" "$repo/empty" 2>&1); then code=0; else code=$?; fi
expect "missing record files are malformed" 2 "fixes.tsv:1: column round:"

nogit="$tmp/nogit"
mkdir -p "$nogit"
(cd "$nogit" && "$script" init run >/dev/null)
if out=$(cd "$nogit" && "$script" run 2>&1); then code=0; else code=$?; fi
expect "outside a git repository is malformed" 2 "not inside a git repository"

if out=$("$script" 2>&1); then code=0; else code=$?; fi
expect "no arguments is a usage error" 2 "usage: scoreboard"

if [ "$failures" -gt 0 ]; then
  exit 1
fi
echo "PASS"
