#!/usr/bin/env bash
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
script="$repo_root/skills/ux-gate/scripts/ux-capture"
fixtures="$repo_root/tests/toolbelt/fixtures/ux-capture"

tmp=$(mktemp -d)
server_pid=""
cleanup() {
  if [ -n "$server_pid" ]; then
    kill "$server_pid" 2>/dev/null || true
    wait "$server_pid" 2>/dev/null || true
  fi
  rm -rf "$tmp"
}
trap cleanup EXIT

fail() {
  echo "not ok - $1" >&2
  shift
  [ "$#" -gt 0 ] && printf '%s\n' "$@" >&2
  exit 1
}

[ -f "$script" ] || fail "capture script missing: $script"
[ -x "$script" ] || fail "capture script is not executable: $script"

# --- help_runs -------------------------------------------------------------
help_out=$(node "$script" --help 2>&1) || fail "--help exited non-zero" "$help_out"
case "$help_out" in
  *--smoke*) : ;;
  *) fail "--help output does not mention --smoke" "$help_out" ;;
esac
case "$help_out" in
  *--baseline*) : ;;
  *) fail "--help output does not mention --baseline" "$help_out" ;;
esac
echo "ok - help_runs"

# --- skip_without_playwright ----------------------------------------------
mkdir -p "$tmp/empty"
echo '{}' > "$tmp/empty/package.json"
set +e
skip_err=$(env -u PLAYWRIGHT_MODULE node "$script" "$fixtures/matrix.json" \
  --out "$tmp/unresolved" --project-root "$tmp/empty" 2>&1 >/dev/null)
skip_code=$?
set -e
[ "$skip_code" -eq 2 ] || fail "expected exit 2 without playwright, got $skip_code" "$skip_err"
case "$skip_err" in
  *"cannot resolve 'playwright'"*) : ;;
  *) fail "exit-2 stderr lacks the resolution message" "$skip_err" ;;
esac
echo "ok - skip_without_playwright"

# Decide the module for the real run.
module="${PLAYWRIGHT_MODULE:-}"
if [ -z "$module" ]; then
  module=$(cd "$repo_root" && node -e "console.log(require.resolve('playwright'))" 2>/dev/null || true)
fi
if [ -z "$module" ]; then
  echo "SKIP - playwright unavailable"
  exit 0
fi

# --- static fixture server on an ephemeral port ----------------------------
# Served from a copy so one assertion can perturb the page and restore it.
site="$tmp/site"
mkdir -p "$site"
cp "$fixtures"/*.html "$site/"

node -e '
const http = require("http"), fs = require("fs"), path = require("path");
const root = process.argv[1];
http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(root, rel);
  if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, {"Content-Type": "text/plain"}); res.end("not found"); return; }
    res.writeHead(200, {"Content-Type": file.endsWith(".html") ? "text/html; charset=utf-8" : "text/plain"});
    res.end(data);
  });
}).listen(0, "127.0.0.1", function () { console.log(this.address().port); });
' "$site" > "$tmp/port.txt" &
server_pid=$!

port=""
for _ in $(seq 1 50); do
  port=$(head -n 1 "$tmp/port.txt" 2>/dev/null || true)
  [ -n "$port" ] && break
  perl -e 'select(undef,undef,undef,0.1)'
done
[ -n "$port" ] || fail "fixture server did not report a port"
base="http://127.0.0.1:$port"

rewrite_matrix() {
  node -e '
    const fs = require("fs");
    const m = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    m.baseUrl = process.argv[2];
    fs.writeFileSync(process.argv[3], JSON.stringify(m, null, 2));
  ' "$1" "$base" "$2"
}
rewrite_matrix "$fixtures/matrix.json" "$tmp/matrix.json"
rewrite_matrix "$fixtures/matrix-clean.json" "$tmp/matrix-clean.json"
rewrite_matrix "$fixtures/matrix-healthy.json" "$tmp/matrix-healthy.json"
rewrite_matrix "$fixtures/matrix-closed-modal.json" "$tmp/matrix-closed-modal.json"

# --- smoke_finds_fixture_defects ------------------------------------------
set +e
run_out=$(PLAYWRIGHT_MODULE="$module" node "$script" "$tmp/matrix.json" \
  --smoke --out "$tmp/out" --project-root "$tmp/empty" 2>&1)
run_code=$?
set -e
[ "$run_code" -eq 1 ] || fail "expected exit 1 on the defective fixture, got $run_code" "$run_out"

mech="$tmp/out/mechanical.json"
[ -f "$mech" ] || fail "mechanical.json not written" "$run_out"

query() { node -e "$1" "$mech"; }

parses=$(query 'const d=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); if(typeof d.projectRoot!=="string"||!d.projectRoot) throw new Error("no projectRoot"); if(!Array.isArray(d.captures)||!d.captures.length) throw new Error("captures is not a non-empty array"); console.log("ok")' 2>/dev/null || true)
[ "$parses" = "ok" ] || fail "mechanical.json is not {projectRoot, captures[]}"
echo "ok - mechanical.json is an object with projectRoot and captures"

assert_check() {
  local check=$1 selector=$2 theme=$3 desc=$4 found
  found=$(node -e '
    const fs = require("fs");
    const entries = JSON.parse(fs.readFileSync(process.argv[1], "utf8")).captures;
    const [check, selector, theme] = process.argv.slice(2);
    const hit = entries.some((e) => (theme === "any" || e.theme === theme) &&
      (e.checks || []).some((c) => c.check === check && c.selector === selector));
    console.log(hit ? "yes" : "no");
  ' "$mech" "$check" "$selector" "$theme")
  [ "$found" = "yes" ] || fail "$desc" "no $check on $selector (theme $theme) in mechanical.json"
  echo "ok - $desc"
}

assert_check element-overflow "SPAN.overflow-child" any "element-overflow on the clipped span"
assert_check unclickable "BUTTON#covered" any "unclickable on the covered button"
assert_check theme-leak "DIV.hardcoded-white" dark "theme-leak on the hardcoded white block in dark"
assert_check theme-leak "HTML.dark" dark "theme-leak on the root element in dark"

for name in home-open-default-375-light home-open-default-375-dark \
            home-panel-default-375-light home-panel-default-375-dark \
            home-route-default-375-light home-route-default-375-dark \
            home-away-default-375-light home-away-default-375-dark; do
  [ -f "$tmp/out/$name.png" ] || fail "still missing: $name.png" "$(ls "$tmp/out")"
done
echo "ok - stills named per the Data Model"

# --- smoke_uses_first_viewport_only ---------------------------------------
widths=$(node -e '
  const fs = require("fs");
  const entries = JSON.parse(fs.readFileSync(process.argv[1], "utf8")).captures;
  console.log([...new Set(entries.map((e) => e.width))].join(","));
' "$mech")
[ "$widths" = "375" ] || fail "smoke captured widths other than 375" "widths: $widths"
echo "ok - smoke_uses_first_viewport_only"

recorded=$(node -e '
  const fs = require("fs");
  const entries = JSON.parse(fs.readFileSync(process.argv[1], "utf8")).captures;
  console.log(entries.map((e) => e.files.still).sort().join(","));
' "$mech")
expected="home-away-default-375-dark.png,home-away-default-375-light.png,home-open-default-375-dark.png,home-open-default-375-light.png,home-panel-default-375-dark.png,home-panel-default-375-light.png,home-route-default-375-dark.png,home-route-default-375-light.png"
[ "$recorded" = "$expected" ] || fail "recorded stills differ from expectation" "got: $recorded"
echo "ok - smoke_finds_fixture_defects"

# --- cls deltas survive an in-pathway navigation ---------------------------
negative=$(node -e '
  const fs = require("fs");
  const entries = JSON.parse(fs.readFileSync(process.argv[1], "utf8")).captures;
  const bad = entries.filter((e) => e.cls < 0).map((e) => e.tag + " cls=" + e.cls);
  console.log(bad.length ? bad.join("; ") : "none");
' "$mech")
[ "$negative" = "none" ] || fail "negative cls delta after an in-pathway navigation" "$negative"
echo "ok - cls delta stays non-negative across a navigating step"

# --- cls after a same-document navigation is that step's own delta ----------
same_doc=$(node -e '
  const fs = require("fs");
  const entries = JSON.parse(fs.readFileSync(process.argv[1], "utf8")).captures;
  const bad = [];
  for (const theme of ["light", "dark"]) {
    const open = entries.find((e) => e.tag === "home-open-default-375-" + theme);
    const route = entries.find((e) => e.tag === "home-route-default-375-" + theme);
    if (!open || !route) { bad.push("missing entries for " + theme); continue; }
    if (!(route.cls > 0)) bad.push(route.tag + " recorded no shift (cls=" + route.cls + ")");
    else if (!(route.cls < open.cls)) {
      bad.push(route.tag + " cls=" + route.cls + " is not below the pathway total (open cls=" + open.cls + ")");
    }
  }
  console.log(bad.length ? bad.join("; ") : "none");
' "$mech")
[ "$same_doc" = "none" ] || fail "pushState step reports the pathway total, not its own delta" "$same_doc"
echo "ok - cls after a pushState step is that step's own delta"

# --- deferred Task 13 fields ----------------------------------------------
deferred=$(node -e '
  const fs = require("fs");
  const entries = JSON.parse(fs.readFileSync(process.argv[1], "utf8")).captures;
  const bad = entries.filter((e) => e.diff !== null || e.files.filmstrip !== null ||
    e.files.diffCrop !== null || e.axe !== "skipped");
  console.log(bad.length ? JSON.stringify(bad[0]) : "ok");
' "$mech")
[ "$deferred" = "ok" ] || fail "smoke entry does not defer Task 13 fields" "$deferred"
echo "ok - smoke defers diff, filmstrip, diffCrop and axe"

# --- a stubbed @axe-core/playwright in the project root ---------------------
# The tsc shape the real package ships: a CJS exports object carrying AxeBuilder,
# with exports.default aliasing it. It must not be mistaken for the constructor.
stub="$tmp/empty/node_modules/@axe-core/playwright"
mkdir -p "$stub"
cat > "$stub/package.json" <<'JSON'
{"name": "@axe-core/playwright", "version": "0.0.0-stub", "main": "index.js"}
JSON
cat > "$stub/index.js" <<'JS'
exports.AxeBuilder = class {
  constructor() {}
  include() { return this; }
  async analyze() {
    return { violations: [{
      id: 'color-contrast',
      impact: 'serious',
      help: 'Elements must have sufficient color contrast',
      nodes: [{ target: ['#covered'] }],
    }] };
  }
};
exports.default = exports.AxeBuilder;
JS

# --- full run: the baseline for every diff assertion ------------------------
# The fixture is defective by design, so the run exits 1; these assertions read
# the files and the JSON, never the exit code.
set +e
full_out=$(PLAYWRIGHT_MODULE="$module" node "$script" "$tmp/matrix.json" \
  --out "$tmp/full" --project-root "$tmp/empty" 2>&1)
set -e
[ -f "$tmp/full/mechanical.json" ] || fail "full run wrote no mechanical.json" "$full_out"

# each() runs a node snippet over the captures of $1 and prints its own output.
each() { node -e "const fs=require('fs');const entries=JSON.parse(fs.readFileSync(process.argv[1],'utf8')).captures;$2" "$1"; }

# --- filmstrip_for_motion_step ---------------------------------------------
strip="$tmp/full/home-panel-default-375-light-filmstrip.png"
[ -f "$strip" ] || fail "no filmstrip for the motion step" "$(ls "$tmp/full")"
strip_bytes=$(wc -c < "$strip" | tr -d ' ')
[ "$strip_bytes" -gt 1024 ] || fail "filmstrip is under 1 KB" "$strip_bytes bytes"
recorded_strip=$(each "$tmp/full/mechanical.json" '
  const e = entries.find((e) => e.tag === "home-panel-default-375-light");
  console.log(e ? String(e.files.filmstrip) : "no entry");')
[ "$recorded_strip" = "home-panel-default-375-light-filmstrip.png" ] ||
  fail "the motion entry does not record its filmstrip" "$recorded_strip"
if ls "$tmp/out" | grep -q -- '-filmstrip'; then
  fail "the smoke run wrote a filmstrip" "$(ls "$tmp/out")"
fi
echo "ok - filmstrip_for_motion_step"

# --- reference screens on the full run only --------------------------------
for name in reference-1-375-light reference-1-375-dark; do
  [ -f "$tmp/full/$name.png" ] || fail "reference still missing: $name.png" "$(ls "$tmp/full")"
done
echo "ok - reference_screens_on_full_run"

# --- axe_violations_recorded -----------------------------------------------
axe_full=$(each "$tmp/full/mechanical.json" '
  const bad = [];
  for (const e of entries) {
    if (!Array.isArray(e.axe)) { bad.push(e.tag + " axe=" + JSON.stringify(e.axe)); continue; }
    const v = e.axe.find((v) => v.id === "color-contrast");
    if (!v || v.impact !== "serious") { bad.push(e.tag + " violations=" + JSON.stringify(e.axe)); continue; }
    const c = (e.checks || []).find((c) => c.check === "axe:color-contrast");
    if (!c) { bad.push(e.tag + " has no axe:color-contrast check"); continue; }
    if (c.severity !== "should" || c.selector !== "#covered" || c.nodes !== 1 ||
        c.impact !== "serious" || !c.text) {
      bad.push(e.tag + " check=" + JSON.stringify(c));
    }
  }
  console.log(bad.length ? bad.slice(0, 3).join("; ") : "none");')
[ "$axe_full" = "none" ] || fail "the full run did not record the stubbed axe violation" "$axe_full"
axe_smoke=$(each "$mech" '
  const bad = entries.filter((e) => e.axe !== "skipped").map((e) => e.tag + " axe=" + JSON.stringify(e.axe));
  console.log(bad.length ? bad.join("; ") : "none");')
[ "$axe_smoke" = "none" ] || fail "smoke run did not skip axe" "$axe_smoke"
echo "ok - axe_violations_recorded"

# --- axe_unavailable_without_the_module -------------------------------------
# A second project root, with no @axe-core/playwright to resolve.
mkdir -p "$tmp/noaxe"
echo '{}' > "$tmp/noaxe/package.json"
node -e '
  const fs = require("fs");
  const m = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  m.themes = ["light"];
  m.viewports = m.viewports.slice(0, 1);
  fs.writeFileSync(process.argv[2], JSON.stringify(m, null, 2));
' "$tmp/matrix-clean.json" "$tmp/matrix-one.json"
set +e
noaxe_out=$(PLAYWRIGHT_MODULE="$module" node "$script" "$tmp/matrix-one.json" \
  --pathway clean --out "$tmp/noaxe-out" --project-root "$tmp/noaxe" 2>&1)
set -e
[ -f "$tmp/noaxe-out/mechanical.json" ] || fail "the no-axe run wrote no mechanical.json" "$noaxe_out"
unavailable=$(each "$tmp/noaxe-out/mechanical.json" '
  const bad = entries.filter((e) => e.axe !== "unavailable")
    .map((e) => e.tag + " axe=" + JSON.stringify(e.axe));
  console.log(bad.length ? bad.join("; ") : "none");')
[ "$unavailable" = "none" ] || fail "an unresolvable axe module was not recorded as unavailable" "$unavailable"
echo "ok - axe_unavailable_without_the_module"

# --- steps_after_a_failure_are_recorded ------------------------------------
# One viewport, one theme, a second step whose waitFor never matches: the third
# step is never run, and must still appear as a blocker rather than vanish.
node -e '
  const fs = require("fs");
  const m = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  m.themes = ["light"];
  m.viewports = m.viewports.slice(0, 1);
  m.pathways = [{ name: "clean", path: "/clean.html", steps: [
    { name: "open", target: "body" },
    { name: "stuck", waitFor: "#never-appears", target: "body" },
    { name: "later", target: "body" },
  ] }];
  fs.writeFileSync(process.argv[2], JSON.stringify(m, null, 2));
' "$tmp/matrix-clean.json" "$tmp/matrix-fail.json"
set +e
PLAYWRIGHT_MODULE="$module" node "$script" "$tmp/matrix-fail.json" \
  --smoke --out "$tmp/failout" --project-root "$tmp/noaxe" > "$tmp/failout.log" 2>&1
set -e
[ -f "$tmp/failout/mechanical.json" ] || fail "the failing run wrote no mechanical.json" "$(cat "$tmp/failout.log")"
after_failure=$(each "$tmp/failout/mechanical.json" '
  const e = entries.find((e) => e.step === "later");
  if (!e) { console.log("the step after the failure was dropped"); }
  else {
    const c = (e.checks || []).find((c) => c.check === "not-reached");
    if (!c) console.log("no not-reached check on the skipped shot");
    else if (c.severity !== "blocker") console.log("severity " + c.severity);
    else if (c.message !== "skipped after failure of step stuck") console.log("message " + c.message);
    else console.log("ok");
  }')
[ "$after_failure" = "ok" ] || fail "a step after a step-failed was not recorded" "$after_failure"
echo "ok - steps_after_a_failure_are_recorded"

# --- baseline_unchanged ----------------------------------------------------
set +e
again_out=$(PLAYWRIGHT_MODULE="$module" node "$script" "$tmp/matrix.json" \
  --out "$tmp/again" --baseline "$tmp/full" --project-root "$tmp/empty" 2>&1)
set -e
[ -f "$tmp/again/mechanical.json" ] || fail "baseline run wrote no mechanical.json" "$again_out"
unchanged=$(each "$tmp/again/mechanical.json" '
  const bad = entries.filter((e) => !e.diff || e.diff.status !== "unchanged")
    .map((e) => e.tag + " " + JSON.stringify(e.diff));
  console.log(bad.length ? bad.join("; ") : "none");')
[ "$unchanged" = "none" ] || fail "an unchanged capture did not diff as unchanged" "$unchanged"
if ls "$tmp/again" | grep -q -- '-diff-crop'; then
  fail "an unchanged run wrote a diff crop" "$(ls "$tmp/again")"
fi
echo "ok - baseline_unchanged"

# --- baseline_changed ------------------------------------------------------
cp "$site/index.html" "$tmp/index.html.orig"
node -e '
  const fs = require("fs");
  const p = process.argv[1];
  const html = fs.readFileSync(p, "utf8")
    .replace("#panel { border", ".below { background: #c00; }\n  #panel { border");
  if (!html.includes(".below { background: #c00; }")) throw new Error("fixture perturbation failed");
  fs.writeFileSync(p, html);
' "$site/index.html"
set +e
changed_out=$(PLAYWRIGHT_MODULE="$module" node "$script" "$tmp/matrix.json" \
  --out "$tmp/changed" --baseline "$tmp/full" --project-root "$tmp/empty" 2>&1)
set -e
cp "$tmp/index.html.orig" "$site/index.html"
[ -f "$tmp/changed/mechanical.json" ] || fail "changed run wrote no mechanical.json" "$changed_out"
changed=$(each "$tmp/changed/mechanical.json" '
  const e = entries.find((e) => e.tag === "home-open-default-375-light");
  if (!e) { console.log("no entry"); }
  else if (!e.diff) { console.log("diff is null"); }
  else if (e.diff.status !== "changed") { console.log("status " + e.diff.status); }
  else if (!(e.diff.ratio > 0.001)) { console.log("ratio " + e.diff.ratio); }
  else if (!Array.isArray(e.diff.box) || e.diff.box.length !== 4) { console.log("box " + JSON.stringify(e.diff.box)); }
  else { console.log("ok"); }')
[ "$changed" = "ok" ] || fail "the recoloured card did not diff as changed" "$changed"
[ -f "$tmp/changed/home-open-default-375-light-diff-crop.png" ] ||
  fail "no diff crop for the changed capture" "$(ls "$tmp/changed")"
echo "ok - baseline_changed"

# --- diff_crop_of_a_full_page_still ----------------------------------------
# .below sits past the fold: the box is outside the viewport, so the crop only
# exists if the screenshot is taken with fullPage.
below_fold=$(each "$tmp/changed/mechanical.json" '
  const e = entries.find((e) => e.tag === "home-open-default-375-light");
  const box = e && e.diff && e.diff.box;
  if (!box) { console.log("no box"); }
  else if (!(box[1] + box[3] > 812 * 2)) { console.log("box within the viewport: " + JSON.stringify(box)); }
  else { console.log("ok"); }')
[ "$below_fold" = "ok" ] || fail "the below-the-fold change did not land outside the viewport" "$below_fold"
crop_bytes=$(wc -c < "$tmp/changed/home-open-default-375-light-diff-crop.png" | tr -d ' ')
[ "$crop_bytes" -gt 0 ] || fail "the full-page diff crop is empty"
echo "ok - diff_crop_of_a_full_page_still"

# --- video_flag_writes_webm ------------------------------------------------
set +e
video_out=$(PLAYWRIGHT_MODULE="$module" node "$script" "$tmp/matrix.json" \
  --video --smoke --out "$tmp/vid" --project-root "$tmp/empty" 2>&1)
set -e
webms=$(ls "$tmp/vid/video" 2>/dev/null | grep -c '\.webm$' || true)
[ "$webms" -ge 1 ] || fail "--video wrote no webm" "$video_out"
echo "ok - video_flag_writes_webm"

# --- clean_page_has_no_findings -------------------------------------------
set +e
clean_out=$(PLAYWRIGHT_MODULE="$module" node "$script" "$tmp/matrix-clean.json" \
  --smoke --out "$tmp/clean" --project-root "$tmp/empty" 2>&1)
clean_code=$?
set -e
findings=$(node -e '
  const fs = require("fs");
  const entries = JSON.parse(fs.readFileSync(process.argv[1], "utf8")).captures;
  const bad = entries.flatMap((e) => (e.checks || [])
    .filter((c) => c.severity === "blocker" || c.severity === "should")
    .map((c) => e.tag + " " + c.check + " " + c.selector));
  console.log(bad.length ? bad.join("; ") : "none");
' "$tmp/clean/mechanical.json")
[ "$findings" = "none" ] || fail "clean fixture produced should-or-above findings" "$findings"
[ "$clean_code" -eq 0 ] || fail "expected exit 0 on the clean fixture, got $clean_code" "$clean_out"
echo "ok - clean_page_has_no_findings"

# --- healthy_patterns_clean ------------------------------------------------
# Healthy layout patterns a reviewer's scratch pages exposed as false findings:
# a scrolling app shell, a sticky header, an open modal over the page, a wide
# table in an overflow-x container, an sr-only checkbox, a fixed dropdown.
# A full run: all three widths, both themes, no axe module in this project root.
set +e
healthy_out=$(PLAYWRIGHT_MODULE="$module" node "$script" "$tmp/matrix-healthy.json" \
  --out "$tmp/healthy" --project-root "$tmp/noaxe" 2>&1)
healthy_code=$?
set -e
[ -f "$tmp/healthy/mechanical.json" ] || fail "healthy run wrote no mechanical.json" "$healthy_out"
healthy_findings=$(each "$tmp/healthy/mechanical.json" '
  const bad = entries.flatMap((e) => (e.checks || [])
    .filter((c) => c.severity === "blocker" || c.severity === "should")
    .map((c) => e.tag + " " + c.check + " " + c.selector));
  console.log(bad.length ? bad.slice(0, 10).join("; ") : "none");')
[ "$healthy_findings" = "none" ] || fail "healthy patterns produced should-or-above findings" "$healthy_findings"
healthy_matrix=$(each "$tmp/healthy/mechanical.json" '
  const widths = [...new Set(entries.map((e) => e.width))].sort((a, b) => a - b).join(",");
  const themes = [...new Set(entries.map((e) => e.theme))].sort().join(",");
  console.log(widths + " / " + themes);')
[ "$healthy_matrix" = "375,768,1440 / dark,light" ] ||
  fail "the healthy run did not cover three widths and both themes" "$healthy_matrix"
[ "$healthy_code" -eq 0 ] || fail "expected exit 0 on the healthy fixture, got $healthy_code" "$healthy_out"
echo "ok - healthy_patterns_clean"

# --- unclickable_survives_closed_aria_modal --------------------------------
# A closed <dialog aria-modal="true"> matches the modal selector but owns
# nothing; it must not silence unclickable on the covered button page-wide.
set +e
closed_out=$(PLAYWRIGHT_MODULE="$module" node "$script" "$tmp/matrix-closed-modal.json" \
  --out "$tmp/closed-modal" --project-root "$tmp/noaxe" 2>&1)
closed_code=$?
set -e
[ -f "$tmp/closed-modal/mechanical.json" ] || fail "closed-modal run wrote no mechanical.json" "$closed_out"
closed_hit=$(each "$tmp/closed-modal/mechanical.json" '
  const hit = entries.some((e) => (e.checks || [])
    .some((c) => c.check === "unclickable" && c.selector === "BUTTON#buy"));
  console.log(hit ? "yes" : "no");')
[ "$closed_hit" = "yes" ] || fail "a closed aria-modal dialog silenced unclickable on BUTTON#buy" "$closed_out"
[ "$closed_code" -eq 1 ] || fail "expected exit 1 on the closed-modal fixture, got $closed_code" "$closed_out"
echo "ok - unclickable_survives_closed_aria_modal"

echo "PASS"
