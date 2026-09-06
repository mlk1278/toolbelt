# Frontier Skills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use toolbelt:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship toolbelt 8.0.0: every skill rewritten for frontier models, a UX gate that catches visual glitches mechanically before a vision model judges design, and risk-tiered review with batched gates.

**Architecture:** Three PR boundaries, chained. Boundary 1 changes the writing doctrine and then rewrites every skill under it, in four concurrent tracks split by which test files they own. Boundary 2 adds a bundled Playwright capture script with mechanical checks and in-browser pixel diff, and rewrites ux-gate around it. Boundary 3 adds the `Review: immediate | gate` task class, the implementer self-check, the gate reviewer, and the release.

**Tech Stack:** Markdown skills, bash tests under `tests/toolbelt/`, Node 22 ESM for the capture script (Playwright resolved from the consuming project), `scripts/bump-version.sh`.

**Specification:** `docs/toolbelt/specs/2026-09-06-frontier-skills-design.md` (branch `spec/frontier-skills`, PR #5). Section references below (`Spec C2`) point at its components.

## Global Constraints

- Skills hard-code no consuming repository, provider, or model. Model names appear only in `skills/agent-routing/defaults.json` and `agents/*.md`. `tests/toolbelt/test-ux-gate.sh`, `test-delivery.sh`, `test-pr-monitor.sh`, and `test-quick-task.sh` fail on `gpt-[0-9]|opus-|sonnet|haiku|-sol|Sol (high|medium|low)` in their skill files.
- One skill names exactly one next skill. Handoff chains do not change.
- "Your human partner" stays; never "the user".
- No new npm dependencies in the plugin. The capture script takes `--project-root <dir>` (default `process.cwd()`, recorded in `mechanical.json` as `projectRoot`) and resolves `playwright` as: `process.env.PLAYWRIGHT_MODULE` when set (a directory or entry file, imported by `pathToFileURL`), else `createRequire(join(projectRoot, 'package.json')).resolve('playwright')`. When neither resolves: print `ux-capture: cannot resolve 'playwright'. Install it in the project (npm i -D playwright) or set PLAYWRIGHT_MODULE=/path/to/node_modules/playwright` and exit 2. There is no global-install step.
- No paid products. Video is a local Playwright recording, off by default, never sent to a reviewer.
- Every `tests/toolbelt/*.sh` and `tests/hooks/*` assertion a change makes false is updated in the same commit as the change.
- Frontmatter descriptions change only for brainstorming, ux-gate, verification-before-completion, and receiving-code-review, to the exact text in their tasks.
- Rewrite rules (Spec C2), binding on every rewrite task: plain imperatives; state the goal, the constraint, and the reason once; keep every gate condition, exact command, exact path, file contract, ledger line format, handoff line, quoted user-facing message, and table unless the task says otherwise; remove `<EXTREMELY-IMPORTANT>`, "Violating the letter of the rules is violating the spirit", threat language, Red Flags lists, rationalization tables (except the one Task 3 keeps in test-driven-development), "Common Mistakes" / "Never" / "Always" / "Quick Reference" sections that restate steps, example transcripts, ALL-CAPS pseudo-code, and "IMPORTANT:", "MUST", "ALWAYS" used as emphasis; `<HARD-GATE>` and `<ENTRY-GATE>` tags stay, each block at most 80 words.
- Word ceilings are checked with `test "$(wc -w < FILE)" -le N` and enforced repo-wide by `tests/toolbelt/test-word-counts.sh` after Task 11. A file over its ceiling is cut; the ceiling is never raised.
- Existing test needles: before editing a file, run `grep -n "<file basename>" tests/toolbelt/*.sh tests/hooks/*.sh` and read every `assert_contains` / `assert_not_contains` line for it. Keep each needle verbatim unless the task names it as changing, and change the test in the same commit when it does. A track never edits a test file another concurrent track owns (Execution Tracks table).
- Run the affected test scripts with `bash tests/toolbelt/<name>.sh`; each prints `PASS` or `not ok - ...` and exits non-zero on failure. There is no runner script.
- Version bumps only in Task 21, with `scripts/bump-version.sh 8.0.0` and `scripts/bump-version.sh --check`.

## Known Gotchas

- `tests/toolbelt/test-interactive-design.sh:72-77` extracts the `<HARD-GATE>` block of interactive-design and requires `[PENDING]` inside it. The gate's `[PENDING]` sentence stays in `SKILL.md`; only §8's body moves to `iteration-mode.md` (Task 5). This corrects Spec Testing, which listed the `[PENDING]` needle as moving; Task 5 amends that spec line.
- `tests/toolbelt/test-reviewer-context.sh` asserts on five files across two tracks (requesting-code-review, code-reviewer.md in track `delivery-chain`; SDD, task-reviewer, implementer prompts in track `orchestration`). Track `orchestration` owns the test file; track `delivery-chain` keeps its needles verbatim: `Do not read \`docs/REVIEW-GUIDANCE.md\` yourself` (requesting), and in code-reviewer.md `docs/REVIEW-GUIDANCE.md`, `This file is reviewer-only.`, `[REVIEW_NUANCE]`, `does not override requirements,`, `[SMELLS_FILE]`.
- `tests/toolbelt/test-execution-tracks.sh` asserts on writing-plans, SDD, and using-git-worktrees. Track `orchestration` owns it; track `delivery-chain` keeps the worktree needles verbatim: `parallel-workspace rules`, `concurrency limit lower than 3`.
- `tests/toolbelt/test-delivery.sh` asserts on delivery, `docs/WORKFLOW.md`, and agent-routing (`Plan-supplied routes are explicit run overrides`, `plan, project, bundled`). All three are in track `orchestration` or serial tasks.
- `tests/hooks/test-session-start.sh` checks JSON shape and the absence of legacy strings; it has no needle on `EXTREMELY_IMPORTANT`, so the tag rename in Task 2 needs no test edit. Run the test anyway.
- `scripts/task-brief` extracts a task by its `### Task N` heading through the next task heading, so the new `**Review:**` field (Task 16) is carried into briefs with no script change.
- `scripts/lint-shell.sh` lints `*.sh` and bash-shebang files only; the Node capture script with `#!/usr/bin/env node` is not linted. `tests/shell-lint/test-lint-shell.sh` stays green.
- `scripts/package-codex-plugin.sh` stages `skills/` whole, so `skills/ux-gate/scripts/ux-capture` ships to Codex without packaging changes. It must be executable (`chmod +x`) because staging preserves the executable bit.
- `tests/toolbelt/test-agent-routing.sh:162-206` pins bundled routes with `--author-harness claude`: the reviewer's Claude fallback is filtered out, so changing it from `opus-5` to `fable-5-1` leaves those expectations true. The specialty tests use `plan`, `security`, and `nonesuch`, none of which Task 15 adds. Task 15 adds new assertions for `ux` and `gate`.
- `test-word-counts.sh` today ceilings SDD at 2140 and writing-plans at 2300; the spec ceilings are lower and the files gain content in Boundary 3. Boundary 1 rewrites must land SDD at or under 1500 words and writing-plans at or under 1600 so Boundary 3 fits under 1900.
- `git grep` exits 0 on a match; absence checks in `test-doctrine.sh` (Task 11) must invert: `if git grep -q ...; then fail`.
- Playwright may be absent on the machine running the tests. `test-ux-capture.sh` (Task 12) must detect that with the script's own exit 2 and print `SKIP` with exit 0, never a false PASS. On this machine a Playwright install with Chromium exists at `/Users/mkirk/projects/fsmcrm/node_modules/playwright` (browsers under `~/Library/Caches/ms-playwright`); run the test with `PLAYWRIGHT_MODULE=/Users/mkirk/projects/fsmcrm/node_modules/playwright` to get a real PASS. The extensionless ESM entry needs Node ≥ 22.7 (syntax detection) because the Codex archive ships no `package.json`; Node 22.23 is installed.
- `tests/toolbelt/test-word-counts.sh` is red at HEAD today (`task-reviewer-prompt.md` 851/850). Task 9 clears it; tracks that run the full loop before Task 9 lands see that one failure and nothing else.
- `tests/toolbelt/test-interactive-design.sh:44` uses `sed -n '1{/^---$/!q}; 1d; /^---$/q; p'`, which BSD sed on macOS rejects ("extra characters at the end of q command"), so the test exits non-zero before any needle on this machine. Task 4 (track `design`, which owns the file) replaces it with the portable `awk 'NR==1{if($0!="---")exit; next} /^---$/{exit} {print}'`. Until Task 4 lands, every "Expected: PASS" for that test holds only on GNU sed.
- `sed -n '/<HARD-GATE>/,/<\/HARD-GATE>/p'` prints to end of file when a later line mentions the tag inline without a closing tag (writing-for-agents does today). Task 11's gate-length check anchors to whole-line tags: `/^<HARD-GATE>$/,/^<\/HARD-GATE>$/`. Skills may mention the tags inline only as backticked text on a single line.
- New `*.sh` test files are linted by `scripts/lint-shell.sh`; Tasks 11, 12, and 18 run `scripts/lint-shell.sh <new file>` in their Verify step so shellcheck findings surface there, not at Task 21. `shellcheck` is not on PATH on this machine: when `command -v shellcheck` fails, write "lint skipped: shellcheck not installed" in the report and continue; run `bash -n <file>` instead.
- `tests/toolbelt/test-quick-task.sh:52` fails if quick-task mentions `pr-monitor`, `ux-gate`, `## Global Constraints`, `toolbelt:subagent-driven-development`, or `toolbelt:finishing-a-development-branch`; `test-delivery.sh` has two `assert_before` orderings ("Fetch the predecessor's remote head" before `toolbelt:using-git-worktrees`; `ux-gate` before "broad final review is the slice gate"). Task 10 keeps both.
- `tests/toolbelt/test-workflow-summary.sh:28` requires exactly two lines matching `^- \`[a-z-]+\`:` in `docs/AGENTS-SNIPPET.md`; Task 20's new sentence must not be formatted as such a bullet.

## Data Model

Contracts every task derives from. Tasks reference them; none repeats them.

### `.toolbelt/ux/matrix.json` (read by `ux-capture`)

```json
{
  "baseUrl": "http://localhost:3000",
  "storageState": ".toolbelt/ux/auth.json",
  "theme": {"mode": "class", "target": "html", "key": "theme", "values": {"light": "", "dark": "dark"}},
  "themes": ["light", "dark"],
  "viewports": [
    {"name": "sm", "width": 375, "height": 812, "dpr": 2},
    {"name": "md", "width": 768, "height": 1024, "dpr": 1},
    {"name": "lg", "width": 1440, "height": 900, "dpr": 1}
  ],
  "fonts": ["Inter"],
  "allowOverflow": ["[data-ux-allow-overflow]"],
  "allowOverlap": ["[data-sonner-toast]"],
  "allowLight": [".redesign-light"],
  "referenceScreens": ["/r/customers", "/r/jobs"],
  "pathways": [
    {"name": "settings", "path": "/settings",
     "steps": [
       {"name": "open", "state": "default", "crops": ["form"]},
       {"name": "save", "action": "click", "selector": "button[type=submit]", "state": "error", "motion": true, "waitFor": "text=Could not save", "fullPage": false}
     ]}
  ]
}
```

- `theme.mode`: `media` (emulate `prefers-color-scheme`), `class` (add `values[theme]` as a class on `target`, when non-empty), `attribute` (set `data-theme="values[theme]"` on `target`), `localStorage` (set `key` to `values[theme]` before navigation). Optional fields: `storageState`, `fonts`, `allowOverflow`, `allowOverlap`, `allowLight`, `referenceScreens`. Defaults: `themes: ["light","dark"]`, the three viewports above.
- Step fields: `name` (required), `state` (default `default`), `action` (`click` | `hover` | `focus` | `scroll`), `selector` (required with `action`), `motion` (boolean), `waitFor` (Playwright selector, 15 s timeout), `crops` (selectors), `fullPage` (boolean).

### `<out>/mechanical.json` (written by `ux-capture`)

An array, one entry per capture:

```json
{"tag":"settings-save-error-375-dark","pathway":"settings","step":"save",
 "state":"error","width":375,"theme":"dark","dpr":2,
 "files":{"still":"settings-save-error-375-dark.png","crops":["settings-save-error-375-dark-crop-1.png"],"filmstrip":"settings-save-error-375-dark-filmstrip.png","diffCrop":null},
 "diff":{"status":"changed","ratio":0.012,"box":[0,120,375,80]},
 "checks":[{"check":"element-overflow","severity":"should","selector":"BUTTON.save","by":18}],
 "cls":0.02,"clsSources":["DIV.toolbar"],"console":[],"failedRequests":[],
 "fonts":"loaded","axe":"unavailable"}
```

`diff` is `null` without `--baseline`; `diff.status` is `changed` | `unchanged` | `new`. `axe` is an array of `{id, impact, nodes}` or the string `unavailable`. `checks[].severity` is `blocker` | `should` | `nit`.

### Mechanical checks (severity, rule)

| Check | Severity | Rule |
|---|---|---|
| `page-overflow` | blocker | `documentElement.scrollWidth > documentElement.clientWidth + 1` |
| `element-overflow` | should | a visible leaf element's `right` or `bottom` exceeds, by more than 1px, the rect of its nearest ancestor whose computed `overflow-x` (for `right`) or `overflow-y` (for `bottom`) is `hidden` or `clip`; when no such ancestor exists, only `right` is compared, against the viewport's `clientWidth` (never `bottom` against `clientHeight`, since normal pages scroll); skipped when the element or an ancestor matches an `allowOverflow` selector |
| `clipped-text` | should | a leaf with non-empty `textContent`, `scrollWidth > clientWidth + 1`, computed `overflow-x` not `visible`, and `text-overflow` not `ellipsis` |
| `overlap` | should | two visible leaves, neither an ancestor of the other, neither `position: absolute` or `fixed`, neither with computed `display` `inline` (wrapped inline boxes have misleading union rects), whose `getBoundingClientRect()` rects intersect by more than 4px on both axes, unless either matches an `allowOverlap` selector |
| `unclickable` | blocker | for each visible `button, a[href], [role=button], input, select, textarea` whose centre `(cx, cy)` lies inside the viewport, `document.elementFromPoint(cx, cy)` is neither the control, nor inside it, nor an ancestor of it; controls outside the viewport are not checked |
| `tap-target` | nit | `viewport.width < 500` and a control from the `unclickable` selector list has a rect under 44×44 CSS px |
| `layout-shift` | should | the per-step delta of the running sum of `layout-shift` entries with `hadRecentInput === false` (observer installed before navigation, sum read at each capture, `cls` = this step's delta) exceeds 0.1; `clsSources` lists each source node's selector |
| `console-error` | should | a `console` message of type `error` during the step |
| `failed-request` | should | a response with status ≥ 400 or a `requestfailed` event during the step |
| `broken-image` | should | `img.complete && img.naturalWidth === 0` |
| `font-fallback` | should | `document.fonts.status !== 'loaded'` after 3 s, or `document.fonts.check('16px "<family>"')` is false for a family in `matrix.fonts` |
| `theme-leak` | should | theme is `dark`, a visible element's computed `background-color` (gradients and images ignored) has alpha ≥ 0.99 and relative luminance > 0.9, its rect area exceeds 2000 CSS px², and neither it nor an ancestor matches an `allowLight` selector |
| `step-failed` | blocker | `waitFor` or the action timed out; entry carries `error` |
| `axe` | as reported | `@axe-core/playwright` violations when the module resolves from the project root |

"Visible" means `getBoundingClientRect()` has width and height > 0, computed `visibility` is not `hidden`, and `display` is not `none`. "Leaf" means no element children. `checks[].selector` is `TAG#id.class1.class2` (tag upper-case; `#id` and classes only when present, classes in DOM order) and every check entry also carries `text`: the element's `textContent` trimmed to 40 characters. Document-level checks (`page-overflow`, `font-fallback`, `step-failed`, `console-error`, `failed-request`) carry `selector: null` and `text: null`, plus `message` for `step-failed`, `console-error`, and `failed-request`. `clsSources` uses the same selector format. `console[]` entries are the message strings; `failedRequests[]` entries are `"<status> <url>"` or `"failed <url>"`; `fonts` is `document.fonts.status` (`loaded` | `loading` | `error`). `axe` is `"skipped"` under `--smoke`, `"unavailable"` when the module does not resolve, else the violations array. Reference-screen entries have `tag: reference-<n>-<width>-<theme>`, `state: "default"`. Paths: `storageState` resolves relative to `--project-root`; `--out` and `--baseline` resolve relative to the working directory.

Theme application: `media` sets `colorScheme` on the context; `class`, `attribute`, and `localStorage` apply in a `context.addInitScript` that runs before any page script — for `class` and `attribute`, patch `document.documentElement` as soon as it exists (immediately when present, else from a `MutationObserver` on `document`), so the first paint is already themed.

Actions: `click`, `hover`, `focus` call the Playwright locator method of that name; `scroll` calls `locator.scrollIntoViewIfNeeded()` then `element.scrollIntoView({block: 'start'})`. Each step performs its action once. Order per step: action → filmstrip frames (motion steps only, animations enabled, at 0, 150, 400 ms after the action returns) → `waitFor` (15 s) → two animation frames → still (`animations: 'disabled'`, `caret: 'hide'`) → crops → mechanical checks. A `motion` step's reduced-motion frame comes from a second context with `reducedMotion: 'reduce'` that repeats the navigation and every earlier step's action on that pathway, then this step's action, and captures one frame 400 ms after it.

Crops: captured in a dedicated DPR-2 context (same viewport width and height, same theme, same navigation and step actions replayed), never by upscaling the still. A `crops` selector uses `locator.screenshot()` (Playwright scrolls it into view). A `-diff-crop.png` uses `page.screenshot({clip})` with the page scrolled to the top and `clip = {x: box[0]/dpr, y: box[1]/dpr, width: box[2]/dpr, height: box[3]/dpr}` where `dpr` is the head still's device scale factor and the 24px padding is applied in CSS px.

Diff: `ratio` = changed pixels ÷ (max(widthA, widthB) × max(heightA, heightB)); `box` = `[x, y, w, h]` in image pixels of the head still; images of different dimensions are `changed` with `box` covering the head still.

Reference screens: captured only on full runs (not `--smoke`, not with `--pathway`), at the first viewport in every theme, with `pathway: "reference"`, `step: "<n>"`, and mechanical checks, in `mechanical.json`.

Exit codes, all modes: `0` no check at `should` or above and no `step-failed`; `1` otherwise; `2` cannot run — unreadable matrix, Playwright unresolvable, or browser launch failure (message on stderr). `--smoke` runs no axe and no filmstrips; `--baseline` is ignored under `--smoke`.

### Output file naming

`<pathway>-<step>-<state>-<width>-<theme>.png`, plus `-crop-<n>.png`, `-filmstrip.png`, `-diff-crop.png`. Reference screens: `reference-<n>-<width>-<theme>.png`. Video: `<out>/video/<context>.webm`.

### Implementer self-check table (in every task report from Task 18 on)

```markdown
| Check | Evidence |
|---|---|
| Requirements | one row per requirement in the brief → file:line or test name |
| Files | `git diff --stat BASE..HEAD` pasted; every path is in the brief's Files block |
| Seen red | per guard: command and failing line |
| Covering suite | command and last passing line |
| Produces | the implemented signatures beside the brief's `Produces:` block, or `none` |
| UI smoke | run path and stills, or `not applicable` |
| Deviations | named, or `None` |
```

### Ledger lines (SDD, from Task 19)

- `Task <N>: self-checked (commits <base7>..<head7>, gate pending)`
- `Task <N>: complete (commits <base7>..<head7>, gate <G>, route <harness>/<model>/<effort>, report <path>)`
- `Gate <G>: tasks <a>–<b>, base <sha7>, head <sha7>, <X> findings, fix wave <a7>..<b7>, verdict <clean|open>`

### Review class (writing-plans Task 16, SDD Task 19)

Task Structure field, placed after the `**Interfaces:**` block:

```markdown
**Review:** immediate | gate
```

The rule, verbatim in writing-plans Task Right-Sizing:

> **Review class.** A task is `immediate` when any of these hold: it is in a `serial-N` track before a fork, or its `Produces:` is consumed by two or more later tasks or by a task in another track; it touches auth, authorization, tenancy scoping, a migration or shared schema, secrets or crypto, payments, a destructive data operation, or CI, build, or release configuration; it deletes or weakens a test, threshold, or lint rule. Every other task is `gate`. The plan reviewer checks each stamp against these conditions.

### Severity rule (three reviewer prompts, Task 18)

> A Critical or Important finding names the input, state, or command under which the code misbehaves. A finding that cannot name one is Minor. Report everything you see and let the orchestrator filter.

### Routing defaults additions (Task 15)

```json
"reviewer_specialties": {
  "ux": {
    "harness": "codex", "model": "gpt-5.6-sol", "effort": "high",
    "instructions": "Vision review of UX captures. Must be a vision-capable route.",
    "fallbacks": [{"harness": "claude", "model": "fable-5-1", "effort": "high"}]
  },
  "gate": {
    "harness": "codex", "model": "gpt-5.6-sol", "effort": "high",
    "instructions": "Batched gate review and the boundary's final review. The most capable route on each harness.",
    "fallbacks": [{"harness": "claude", "model": "fable-5-1", "effort": "high"}]
  }
}
```

and the `reviewer` role's fallback becomes `{"harness": "claude", "model": "fable-5-1", "effort": "high"}`.

---

## PR Boundaries

| PR | Outcome | Tasks | Depends on | Independent verification |
|---|---|---|---|---|
| 1 | Doctrine changed and every skill rewritten under it; word ceilings and doctrine test enforced | 1–11 | none | `for t in tests/toolbelt/*.sh tests/hooks/*.sh; do bash "$t" || exit 1; done` passes; `git grep -l 'EXTREMELY-IMPORTANT' skills` exits 1 |
| 2 | Bundled UX capture script with mechanical checks and diff; ux-gate, implementer smoke, baseline, and routing rewritten around it | 12–15 | 1 | `PLAYWRIGHT_MODULE=/Users/mkirk/projects/fsmcrm/node_modules/playwright bash tests/toolbelt/test-ux-capture.sh` PASS; `test-ux-gate`, `test-agent-routing`, `test-delivery`, `test-interactive-design`, `test-fix-loop`, `test-reviewer-context`, `test-word-counts`, `test-doctrine` pass |
| 3 | Risk-tiered review classes, self-check, gate reviewer, docs, and the 8.0.0 release | 16–21 | 2 | `bash tests/toolbelt/test-review-classes.sh`; `scripts/bump-version.sh --check` reports 8.0.0 everywhere; full `tests/toolbelt` and `tests/hooks` pass |

Boundary 2 depends on 1 because it rewrites ux-gate, implementer-prompt, SDD, and delivery, which Boundary 1 rewrites first. Boundary 3 depends on 2 because its SDD gate section references the smoke pass and the parallel UX gate, and its self-check table carries the `UI smoke` row. Each boundary's verification passes without later boundaries. The base branch for Boundary 1 is `spec/frontier-skills` (the open spec PR), so the chain reviews as one stack.

Acceptance after the chain merges is the orchestrator's step, not a task: reinstall both plugin caches per CLAUDE.md, then in a clean session send "Let's make a react todo list" and confirm brainstorming triggers before any code in both harnesses; and in fsmcrm with its dev server running, "run the UX smoke on /r/customers" produces a `mechanical.json` and stills without the agent writing a Playwright script.

## Execution Tracks

| Track | Tasks | Depends on | Files touched (summary) | Why safe |
|---|---|---|---|---|
| serial-1 | 1 | — | CLAUDE.md, writing-for-agents, writing-skills (+ testing reference) | mainline: doctrine every rewrite follows |
| discipline | 2–3 | serial-1 | using-toolbelt, hooks/session-start, docs/porting-to-a-new-harness.md, verification-before-completion, receiving-code-review, systematic-debugging, test-driven-development | disjoint from design, delivery-chain, orchestration; owns no test file |
| design | 4–5 | serial-1 | brainstorming, writing-specs, interactive-design (+ iteration-mode.md), tests/toolbelt/test-interactive-design.sh | disjoint from the others; owns test-interactive-design.sh |
| delivery-chain | 6–7 | serial-1 | finishing-a-development-branch, dispatching-parallel-agents, using-git-worktrees, requesting-code-review (+ code-reviewer.md), tests/toolbelt/test-worktree-baseline.sh | disjoint from the others; keeps test-reviewer-context.sh and test-execution-tracks.sh needles verbatim |
| orchestration | 8–10 | serial-1 | writing-plans (+ execution-tracks.md, − plan-document-reviewer-prompt.md), SDD (+ parallel-tracks.md, three prompts), delivery, pr-monitor, agent-routing, quick-task, tests/toolbelt/test-execution-tracks.sh | disjoint from the others; owns the one test file it edits |
| serial-2 | 11 | discipline, design, delivery-chain, orchestration | test-word-counts.sh, test-doctrine.sh, README.md | integration: enforces ceilings over the merged rewrite |
| serial-3 | 12–15 | serial-2 | ux-gate script and skill, implementer-prompt, SDD, delivery, interactive-design, defaults.json, their tests | Boundary 2 is serial: 12–13 share one script file, 14–15 each touch a file 12–13 or the other touches, so no track clears the two-task threshold with disjoint files |
| planning | 16–17 | serial-3 | writing-plans, brainstorming, writing-specs, test-writing-plans.sh | disjoint from execution |
| execution | 18–19 | serial-3 | gate-reviewer-prompt.md, task-reviewer-prompt.md, code-reviewer.md, implementer-prompt.md, SDD, delivery, test-review-classes.sh, test-final-review-gate.sh, test-fix-loop.sh | disjoint from planning |
| serial-4 | 20–21 | planning, execution | WORKFLOW.md, README.md, AGENTS-SNIPPET.md, test-workflow-summary.sh, test-delivery.sh, version files, RELEASE-NOTES.md | integration and release |

Four tracks are declared for Boundary 1; SDD's cap of 3 concurrent tracks queues the fourth.

---

### Task 1: Doctrine

**Files:**
- Modify: `CLAUDE.md`
- Modify: `skills/writing-for-agents/SKILL.md`
- Modify: `skills/writing-skills/SKILL.md`
- Modify: `skills/writing-skills/testing-skills-with-subagents.md`

**Interfaces:**
- Consumes: none
- Produces: the rewrite doctrine every later task follows: CLAUDE.md's forceful-blocks bullet; writing-for-agents' closing rule "A gate earns forceful phrasing only where the failure is expensive or irreversible and a brief instruction measurably failed. Keep such blocks short, and re-test them when the model changes."

**Gotchas:**
- No test asserts on these four files today. `test-word-counts.sh` gains their ceilings in Task 11; check them here with `wc -w`.
- `writing-skills/SKILL.md` links `[anthropic-best-practices.md]`, `[persuasion-principles.md]`, `[testing-skills-with-subagents.md]`, `graphviz-conventions.dot`, `render-graphs.js`; keep every link that survives pointing at an existing file.

- [ ] **Step 1: Record the current state**

Run: `wc -w CLAUDE.md skills/writing-for-agents/SKILL.md skills/writing-skills/SKILL.md` and note the counts (1618 and 2211 for the two skills).

- [ ] **Step 2: Confirm the ceilings fail today**

Run: `test "$(wc -w < skills/writing-for-agents/SKILL.md)" -le 750; echo $?` and `test "$(wc -w < skills/writing-skills/SKILL.md)" -le 1000; echo $?`
Expected, per file:
- writing-for-agents — `1` (over ceiling)
- writing-skills — `1` (over ceiling)

- [ ] **Step 3: Edit CLAUDE.md**

Replace the bullet beginning "**Preserve forceful blocks verbatim.**" with:

> **Forceful blocks are gates, not decoration.** `<HARD-GATE>` and `<ENTRY-GATE>` mark a step whose failure is expensive or irreversible. Keep them to two or three sentences: the condition, who owns the exception, and why. Rationalization tables exist only where a brief instruction measurably failed under pressure; today that is test-driven-development alone. Re-test them when the model changes.

Append to the "**Keep them short.**" bullet: "Claude Code re-injects a skill after compaction, up to 5,000 tokens per skill; length, not phrasing, decides what survives."

- [ ] **Step 4: Rewrite writing-for-agents/SKILL.md**

At most 750 words, frontmatter unchanged. Sections in this order, each a short rule set with one example: Context pointers (the description's wording decides triggering; front-load the trigger; one trigger per branch); The two loads (context load on every turn vs the human's index of what exists); Information hierarchy (in-file steps, in-file reference, disclosed reference; inline what every branch needs, put what only some branches reach behind a pointer; keep a concept's rules under one heading); Completion criteria (checkable and exhaustive; sharpen a vague bound before splitting); When to split (by sequence, by invocation per SKILL-MECHANICS.md); Leading words (one pretrained word beats a sentence; state the positive target rather than a prohibition); Pruning (single source of truth; the environment is a source of truth, restate only what a lookup cannot find; delete lines that no longer bear on the document; the no-op test, settled by running the document). Close with the rule from Produces. Do not define coined terms; say each idea in plain words. Keep the pointer to `SKILL-MECHANICS.md`.

- [ ] **Step 5: Rewrite writing-skills/SKILL.md and move testing content**

`SKILL.md` at most 1,000 words. Remove the Iron Law block and its "No exceptions" list, "Untested skills have issues. Always.", "Overconfidence guarantees issues", "IMPORTANT: Create a todo for EACH item", and the "letter of the rules" block. Keep the scope paragraph (new behaviour-shaping guidance needs a baseline; condensing, restructuring, and rewording do not) as one paragraph. Keep "When to Create a Skill", "Structure", "Match the Form to the Failure" whole with its table and wording-test evidence, "Naming", "Cross-Referencing Other Skills", "Flowcharts", "Code Examples". "The Description Field" keeps the rule, its reason in one sentence ("a description that summarised the workflow caused one review instead of two"), and two examples (one ❌ workflow summary, one ✅ trigger). "Bulletproofing Against Rationalization" opens with: "Use this only after a baseline shows the agent skipping a known rule under pressure and a brief instruction has failed to stop it. Frontier models overtrigger on aggressive phrasing; the default form is one sentence stating the rule and its reason." then the four techniques, one sentence each, and the pointer to `persuasion-principles.md`.

Move RED-GREEN-REFACTOR, Micro-Testing Wording, Testing by Skill Type, the "Common Rationalizations for Skipping Testing" table, and the Checklist into `testing-skills-with-subagents.md` under headings of the same names, placed after that file's existing content. `SKILL.md` keeps a two-sentence pointer: "Test a new or changed behaviour-shaping skill before shipping it. The method, pressure scenarios, micro-tests, and the checklist are in [testing-skills-with-subagents.md](testing-skills-with-subagents.md)."

- [ ] **Step 6: Verify**

Run: `test "$(wc -w < skills/writing-for-agents/SKILL.md)" -le 750 && test "$(wc -w < skills/writing-skills/SKILL.md)" -le 1000 && grep -c "testing-skills-with-subagents.md" skills/writing-skills/SKILL.md && grep -q "## RED-GREEN-REFACTOR" skills/writing-skills/testing-skills-with-subagents.md && echo OK`
Expected: `OK`

- [ ] **Step 7: Commit**

```bash
git add CLAUDE.md skills/writing-for-agents/SKILL.md skills/writing-skills/SKILL.md skills/writing-skills/testing-skills-with-subagents.md
git commit -m "Doctrine: gates over shouting; writing-for-agents and writing-skills rewritten for frontier models"
```

### Task 2: using-toolbelt, the hook, verification-before-completion

**Files:**
- Modify: `skills/using-toolbelt/SKILL.md`
- Modify: `hooks/session-start`
- Modify: `skills/verification-before-completion/SKILL.md`
- Modify: `docs/porting-to-a-new-harness.md:30,61,64,107`

**Interfaces:**
- Consumes: Task 1 doctrine
- Produces: none

**Gotchas:**
- `docs/porting-to-a-new-harness.md` documents the hook contract's wrapper tag on the four lines named; rename it there in the same commit.
- `hooks/session-start` builds JSON with `printf`; the only change is the wrapper tag string in `session_context` (`<EXTREMELY_IMPORTANT>` → `<TOOLBELT>`, both open and close). Run `bash tests/hooks/test-session-start.sh` after; it checks JSON shape.
- `skills/using-toolbelt/references/codex-tools.md` is unchanged; the pointer to it must survive.

- [ ] **Step 1: Confirm ceilings fail today**

Run: `test "$(wc -w < skills/using-toolbelt/SKILL.md)" -le 300; echo $?; test "$(wc -w < skills/verification-before-completion/SKILL.md)" -le 300; echo $?`
Expected, per file: `1` and `1`.

- [ ] **Step 2: Rewrite using-toolbelt**

At most 300 words, frontmatter unchanged. Keep, in order: `<SUBAGENT-STOP>` block verbatim; "Invoke a relevant or requested skill before any response or action, including clarifying questions and exploring the codebase; the skill sets the approach. If it turns out not to fit, you need not use it."; "Before entering plan mode, brainstorm first if you have not."; the announce line "Using [skill] to [purpose]" and "If it has a checklist, create a todo per item."; Skill Priority (process skills first, then implementation skills; the two examples); one sentence replacing the Red Flags table: "A question, a file check, or a small task is still a task; check for a skill first."; Platform Adaptation (Codex reads `references/codex-tools.md`); Agent Routing (invoke agent-routing before the first dispatch, route by role, fail closed and tell your human partner); User Instructions (CLAUDE.md, AGENTS.md, direct requests outrank skills). Remove `<EXTREMELY-IMPORTANT>`, "1% chance", "not negotiable", and the table.

- [ ] **Step 3: Edit the hook tag**

In `hooks/session-start`, change `<EXTREMELY_IMPORTANT>\nYou have a toolbelt.` to `<TOOLBELT>\nYou have a toolbelt.` and `\n</EXTREMELY_IMPORTANT>` to `\n</TOOLBELT>`. In `docs/porting-to-a-new-harness.md`, replace every `EXTREMELY_IMPORTANT` with `TOOLBELT` (four lines).

- [ ] **Step 4: Rewrite verification-before-completion**

Frontmatter description becomes exactly: `Use before claiming work is complete, fixed, or passing, and before committing or opening a PR.` Body at most 300 words: one paragraph — "Before reporting status, audit each claim against a tool result from this session. A claim with no run behind it is not made. Scope the claim to the evidence: if you ran one package, say that package passed, and do not run the whole workspace to earn a broader claim. A regression test counts once it has been seen red and then green. An agent's success report is a claim; read the diff." — then a four-row table:

| Claim | Evidence |
|---|---|
| Tests pass | the test command's output, 0 failures, at the scope you name |
| Build succeeds | the build command, exit 0 |
| Bug fixed | the original symptom's test passes; the fix reverted makes it fail |
| Agent completed | the VCS diff shows the change |

Remove the Iron Law, gate function, Red Flags, Rationalization Prevention, Key Patterns, Why This Matters, When To Apply, and Bottom Line sections.

- [ ] **Step 5: Verify**

Run: `test "$(wc -w < skills/using-toolbelt/SKILL.md)" -le 300 && test "$(wc -w < skills/verification-before-completion/SKILL.md)" -le 300 && grep -q "<SUBAGENT-STOP>" skills/using-toolbelt/SKILL.md && grep -q "codex-tools.md" skills/using-toolbelt/SKILL.md && grep -q "<TOOLBELT>" hooks/session-start && ! grep -q "EXTREMELY" hooks/session-start skills/using-toolbelt/SKILL.md && bash tests/hooks/test-session-start.sh`
Expected: the hook test prints its pass lines and exits 0.

- [ ] **Step 6: Commit**

```bash
git add skills/using-toolbelt/SKILL.md hooks/session-start skills/verification-before-completion/SKILL.md docs/porting-to-a-new-harness.md
git commit -m "Unslop: using-toolbelt, session hook tag, verification-before-completion"
```

### Task 3: receiving-code-review, systematic-debugging, test-driven-development

**Files:**
- Modify: `skills/receiving-code-review/SKILL.md`
- Modify: `skills/systematic-debugging/SKILL.md`
- Modify: `skills/test-driven-development/SKILL.md`

**Interfaces:**
- Consumes: Task 1 doctrine
- Produces: none

**Gotchas:**
- systematic-debugging links `root-cause-tracing.md`, `defense-in-depth.md`, `condition-based-waiting.md`; test-driven-development links `writing-good-tests.md`. Keep those links.
- test-driven-development is the only skill allowed a rationalization table (Task 11's doctrine test checks the `| Excuse | Reality |` header appears in no other skill).

- [ ] **Step 1: Confirm ceilings fail today**

Run: `for f in receiving-code-review systematic-debugging test-driven-development; do wc -w < skills/$f/SKILL.md; done`
Expected: 801, 1122, 1127 (all over 300, 600, 600).

- [ ] **Step 2: Rewrite receiving-code-review**

Description becomes exactly: `Use when acting on code review feedback from a person or an external reviewer, before implementing it.` Body at most 300 words. Keep: verify each item against the codebase before implementing; an unclear item blocks the whole batch, ask about every unclear item at once ("I understand items 1, 2, 3, 6. Need clarification on 4 and 5 before proceeding."); feedback from your human partner is trusted after understanding, external feedback is checked for correctness in this codebase, breakage, the reason for the current code, and platform fit; a conflict with your human partner's earlier decision goes to them; grep for callers before accepting "unused"; the `gh api` reply mechanic with its command. Remove Forbidden Responses, the gratitude ban, the ALL-CAPS response pattern, and "your human partner's rule" quotes.

- [ ] **Step 3: Rewrite systematic-debugging**

At most 600 words, frontmatter unchanged. Keep: find the root cause before any fix, with the reason (a symptom fix hides the defect and breaks again); the four phases as one numbered list (investigate: read the error, reproduce, check recent changes, trace data flow; analyse: find a working example, compare, instrument each boundary in multi-component systems; hypothesise: one hypothesis, one change; implement: a failing test first, then the fix); three failed fixes mean question the architecture and talk to your human partner; the pointers to the three technique files. Remove the Iron Law block, Red Flags, the rationalization table, and "Signals From Your Human Partner".

- [ ] **Step 4: Rewrite test-driven-development**

At most 600 words, frontmatter unchanged. Keep: the one-line Iron Law "No production code without a failing test first"; the red-green-refactor cycle in three short paragraphs; "delete means delete" as one sentence covering its loopholes (no keeping as reference, no adapting while writing tests); verify RED for the right reason; ask your human partner before taking an exception; this five-row table:

| Excuse | Reality |
|---|---|
| "I'll write tests after" | Tests written after pass by construction and prove nothing. |
| "I already wrote the code, it would be a waste to delete it" | Sunk cost. Delete it; the test tells you what to rebuild. |
| "I'll keep it as reference while I write the test" | Then the test is written to the code. Delete it. |
| "Too simple to test" | Simple code breaks too, and the test takes a minute. |
| "I'll test it manually" | Manual checks are not repeatable and are not evidence. |

and the pointer to `writing-good-tests.md`. Remove the Red Flags list, the four Good/Bad code blocks, and the completion checklist.

- [ ] **Step 5: Verify**

Run: `test "$(wc -w < skills/receiving-code-review/SKILL.md)" -le 300 && test "$(wc -w < skills/systematic-debugging/SKILL.md)" -le 600 && test "$(wc -w < skills/test-driven-development/SKILL.md)" -le 600 && grep -q "| Excuse | Reality |" skills/test-driven-development/SKILL.md && ! grep -q "| Excuse | Reality |" skills/systematic-debugging/SKILL.md && grep -q "writing-good-tests.md" skills/test-driven-development/SKILL.md && echo OK`
Expected: `OK`

- [ ] **Step 6: Commit**

```bash
git add skills/receiving-code-review/SKILL.md skills/systematic-debugging/SKILL.md skills/test-driven-development/SKILL.md
git commit -m "Unslop: receiving-code-review, systematic-debugging, test-driven-development"
```

### Task 4: brainstorming and writing-specs

**Files:**
- Modify: `skills/brainstorming/SKILL.md`
- Modify: `skills/writing-specs/SKILL.md`
- Modify: `tests/toolbelt/test-interactive-design.sh:44,80-87`

**Interfaces:**
- Consumes: Task 1 doctrine
- Produces: none

**Gotchas:**
- `test-interactive-design.sh` needles on brainstorming: `inside that skill is authorized`, `we could go frontend-first`, `The offer MUST be its own message` (changes to `The offer is its own message`; edit the test), `invoke it and no other`, `or to interactive-design when they accepted`. On writing-specs: `Arriving from interactive-design with a reconciled contract ledger`.
- Task 5 also edits `test-interactive-design.sh` (the interactive-design needles); both are in track `design`, sequential.
- Component 4's approval rule and review reorder land in Task 17, not here.

- [ ] **Step 1: List needles and confirm ceilings fail**

Run: `grep -n "brainstorming\|writing_specs" tests/toolbelt/test-interactive-design.sh; wc -w < skills/brainstorming/SKILL.md; wc -w < skills/writing-specs/SKILL.md`
Expected: the needle lines above; 1019 and 648 (over 650 and 550).

- [ ] **Step 2: Rewrite brainstorming**

Description becomes exactly: `Use before creating features, building components, adding functionality, or changing behaviour. Explores intent, requirements, and design before implementation.` Body at most 650 words. `<HARD-GATE>` at most 80 words: no implementation skill, code, or scaffolding before a presented design is approved, whatever the project's size; the one exception is interactive-design after an accepted frontend-first offer, where prototype implementation inside that skill is authorized. Keep: the six-item checklist (state the terminal state once, in item 6); Asking Good Questions as four bullets; Presenting the Design as four bullets; After the Design as one paragraph naming writing-specs, or interactive-design (or design-fidelity-prep) after the offer, with "invoke it and no other"; the Frontend-First Offer with both quoted offer texts verbatim, "The offer is its own message — only the offer — and wait for the response.", the accepted/declined outcomes, and the Claude Design variant; the Visual Companion with its quoted offer verbatim, the own-message rule, and the `skills/brainstorming/visual-companion.md` path and `--open` flag. Remove restatements of the gate and the terminal state.

- [ ] **Step 3: Rewrite writing-specs**

At most 550 words. `<ENTRY-GATE>` at most 80 words, keeping "Arriving from interactive-design with a reconciled contract ledger" and that skipping brainstorming is the human's call. Keep the six-item checklist, Gathering Context, Writing the Spec bullets, Review Gates with the quoted user-gate message and the agent-routing resolver contract for the alternate-harness review, and the closing handoff to writing-plans. Replace "You MUST create a task for each of these items" with "Create a todo per item and complete them in order."

- [ ] **Step 4: Update the test**

In `tests/toolbelt/test-interactive-design.sh`, change the needle `The offer MUST be its own message` to `The offer is its own message`, and replace line 44's `sed -n '1{/^---$/!q}; 1d; /^---$/q; p' "$skill"` with `awk 'NR==1{if($0!="---")exit; next} /^---$/{exit} {print}' "$skill"` so the test runs on BSD sed.

- [ ] **Step 5: Verify**

Run: `test "$(wc -w < skills/brainstorming/SKILL.md)" -le 650 && test "$(wc -w < skills/writing-specs/SKILL.md)" -le 550 && bash tests/toolbelt/test-interactive-design.sh`
Expected: `PASS`

- [ ] **Step 6: Commit**

```bash
git add skills/brainstorming/SKILL.md skills/writing-specs/SKILL.md tests/toolbelt/test-interactive-design.sh
git commit -m "Unslop: brainstorming and writing-specs"
```

### Task 5: interactive-design

**Files:**
- Modify: `skills/interactive-design/SKILL.md`
- Create: `skills/interactive-design/iteration-mode.md`
- Modify: `tests/toolbelt/test-interactive-design.sh:60-77`

**Interfaces:**
- Consumes: Task 1 doctrine
- Produces: none

**Gotchas:**
- The test extracts the `<HARD-GATE>` block and requires `[PENDING]` inside it; the gate sentence about iteration mode stays in `SKILL.md`. Needles that stay in `SKILL.md`: `[PENDING]`, `a placeholder without`, `iterate directly on an existing feature's UI`, `the request itself is the entry`, `TOOLBELT-FIXTURE <endpoint id>`, `.toolbelt/prototype/`, `a fixture without a ledger entry is a gate violation`, `':!docs/toolbelt' ':!.toolbelt'`, `exits 1 (no matches)`, `.toolbelt/prototyping.md`, `Do NOT invoke any other skill`, `matching its endpoint id`, `Acceptance criteria`. Needles that move to `iteration-mode.md`: `before §4's reconciliation may run`, `toolbelt:quick-task`. Needle that changes: `the single route confirmed in §8` → `the route confirmed in iteration-mode.md`.
- Component 3's baseline change to §4 step 2 lands in Task 15, not here.
- §7 refers to "§8" twice ("iteration mode only, §8:" and "never survives §8's materialization"); after the move, both say "iteration-mode.md".

- [ ] **Step 1: Confirm the ceiling fails and list needles**

Run: `wc -w < skills/interactive-design/SKILL.md; sed -n 60,77p tests/toolbelt/test-interactive-design.sh`
Expected: 1705 (over 1200); the needle lines.

- [ ] **Step 2: Rewrite SKILL.md and create iteration-mode.md**

`SKILL.md` at most 1,200 words, description unchanged. `<ENTRY-GATE>` at most 80 words naming all three entries: accepted frontend-first offer, direct request, or a request to iterate on an existing surface's UI; never self-selected; approved intent-level design required for the first two; frontend and API in this repository. `<HARD-GATE>` at most 80 words keeping the fixture rule, the marker, the ledger-entry-in-the-same-edit rule, and "In iteration mode only, a datum may instead render placeholder data while a `[PENDING]` ledger entry naming it is recorded in the same edit — a placeholder without a `[PENDING]` entry is a gate violation." Keep §1–§7 with every contract, the ledger example block, and the fixture-zero command. §4 step 4 reads: "On approval, invoke the mode's terminal skill — new-feature mode: `toolbelt:writing-specs`; iteration mode: the route confirmed in iteration-mode.md. Do NOT invoke any other skill." Replace §8 with one pointer: "For the third entry — iterating on an existing surface — read [iteration-mode.md](iteration-mode.md) before §1; it changes the announce line, the gate delta, materialization, and exit routing."

`iteration-mode.md` holds the current §8 text under the heading `# Iteration mode (existing features)`, rewritten under the rewrite rules, keeping the announce line, the gate delta, materialization with its three resolutions, "The Pending subsection is empty before §4's reconciliation may run", exit routing naming `toolbelt:quick-task` and `toolbelt:writing-specs`, and the single-PR rule.

- [ ] **Step 3: Update the test**

In the test: point the `before §4's reconciliation may run` and `toolbelt:quick-task` assertions at `$repo_root/skills/interactive-design/iteration-mode.md` (add an `iteration="$repo_root/skills/interactive-design/iteration-mode.md"` variable and an existence check), and change `the single route confirmed in §8` to `the route confirmed in iteration-mode.md` against `$skill`.

- [ ] **Step 4: Verify**

Run: `test "$(wc -w < skills/interactive-design/SKILL.md)" -le 1200 && bash tests/toolbelt/test-interactive-design.sh`
Expected: `PASS`

- [ ] **Step 5: Commit**

```bash
git add skills/interactive-design/SKILL.md skills/interactive-design/iteration-mode.md tests/toolbelt/test-interactive-design.sh
git commit -m "Unslop: interactive-design; iteration mode disclosed behind a pointer"
```

### Task 6: finishing-a-development-branch and dispatching-parallel-agents

**Files:**
- Modify: `skills/finishing-a-development-branch/SKILL.md`
- Modify: `skills/dispatching-parallel-agents/SKILL.md`

**Interfaces:**
- Consumes: Task 1 doctrine
- Produces: the docs-only rule's single home: finishing-a-development-branch Step 1, "**Docs-only case:**" paragraph, referenced by Tasks 9 and 14 as "the docs-only rule in toolbelt:finishing-a-development-branch Step 1".

**Gotchas:**
- `test-completion-contract.sh` needles (keep verbatim): `**Completion contract:**`, `If the invoking prompt declared exactly one completion route`, `execute that route and its cleanup directly instead of presenting the options below`, `An undeclared or ambiguous route falls through to the normal options.`, `This changes only who chooses the option; every verification and cleanup rule still applies.`, `present exactly these 4 options`, `Type 'discard' to confirm.`, `If tests fail:`, `Without qualifying evidence, run the suite`, `Both shortcuts require a clean worktree`, `is a claim, not evidence`, `**Docs-only case:**`, `never a file the application builds, renders,`, `Satisfy Step 1's verification requirement before offering options`, `"PR is open" is not a terminal state`, `or return it to a caller that already declared it owns the monitoring`, `Never conclude from ancestry alone`. Read the full test for the exact strings; none changes.
- `test-execution-tracks.sh` has no needle on these files; `test-word-counts.sh` ceilings dispatching-parallel-agents at 510 today (drops to 320 in Task 11).

- [ ] **Step 1: List needles and confirm ceilings fail**

Run: `grep -c assert_contains tests/toolbelt/test-completion-contract.sh; wc -w < skills/finishing-a-development-branch/SKILL.md; wc -w < skills/dispatching-parallel-agents/SKILL.md`
Expected: the needle count; 1389 (over 850) and 503 (over 320).

- [ ] **Step 2: Rewrite finishing-a-development-branch**

At most 850 words, frontmatter unchanged. Keep Steps 1–6 with every needle string verbatim: Step 1's exact-head evidence reuse, docs-only case, and "run the suite" fallback; GIT_DIR / GIT_COMMON detection; the 4-option and 3-option menus; typed `discard`; the squash-merge guard; provenance cleanup (`.worktrees/` only, cd to the root first); the completion contract paragraph; the PR handoff lines. Remove Quick Reference, Common Mistakes, "Red Flags — Never", and "Always".

- [ ] **Step 3: Rewrite dispatching-parallel-agents**

At most 320 words, frontmatter unchanged. Keep: when to parallelise (2+ independent tasks with no shared state); what a focused brief carries (one task, the files, the contract, the report shape); integrate results yourself and re-verify the seams. Remove the ❌/✅ Common Mistakes list.

- [ ] **Step 4: Verify**

Run: `test "$(wc -w < skills/finishing-a-development-branch/SKILL.md)" -le 850 && test "$(wc -w < skills/dispatching-parallel-agents/SKILL.md)" -le 320 && bash tests/toolbelt/test-completion-contract.sh`
Expected: `PASS`

- [ ] **Step 5: Commit**

```bash
git add skills/finishing-a-development-branch/SKILL.md skills/dispatching-parallel-agents/SKILL.md
git commit -m "Unslop: finishing-a-development-branch, dispatching-parallel-agents"
```

### Task 7: using-git-worktrees and requesting-code-review

**Files:**
- Modify: `skills/using-git-worktrees/SKILL.md`
- Modify: `skills/requesting-code-review/SKILL.md`
- Modify: `skills/requesting-code-review/code-reviewer.md`
- Modify: `tests/toolbelt/test-worktree-baseline.sh`

**Interfaces:**
- Consumes: Task 1 doctrine
- Produces: none

**Gotchas:**
- `test-worktree-baseline.sh` needle `Satisfy Step 3 now` belongs to the rationalization table being removed: delete that assertion. Keep verbatim: `smallest focused checks that prove a clean start`, `not a workspace or package-wide`, `cite that instead of re-running`, `docs-only work`, `Baseline: <focused tests passing`, `.toolbelt/worktree-policy.md`, `non-conflicting`. `test-worktree-source-ref.sh` needles stay verbatim: `git worktree add "$path" -b "$BRANCH_NAME" "${SOURCE_REF:-HEAD}"`, `source ref`, `creates it rather than skipping creation`.
- Track `orchestration` owns `test-execution-tracks.sh` and `test-reviewer-context.sh`; keep their needles verbatim here (see Known Gotchas) and do not edit those files.
- code-reviewer.md's DIFF_FILE placeholder text references `../subagent-driven-development/scripts/review-package`; keep it.

- [ ] **Step 1: List needles and confirm ceilings fail**

Run: `grep -n "assert" tests/toolbelt/test-worktree-baseline.sh tests/toolbelt/test-worktree-source-ref.sh; grep -n "worktrees\|requesting\|final_prompt" tests/toolbelt/test-execution-tracks.sh tests/toolbelt/test-reviewer-context.sh; wc -w < skills/using-git-worktrees/SKILL.md; wc -w < skills/requesting-code-review/SKILL.md; wc -w < skills/requesting-code-review/code-reviewer.md`
Expected: needle lines; 1259, 584, 622 (over 750, 350, 500).

- [ ] **Step 2: Rewrite using-git-worktrees**

At most 750 words, frontmatter unchanged. Keep: Step 0 detection including the submodule guard; native tool first with the reason (a worktree the harness does not know about leaves phantom state); the `.gitignore` check for `.worktrees/`; the `.toolbelt/worktree-policy.md` contract (parallel-workspace rules, non-conflicting resource allocation, a concurrency limit lower than 3 governs); the source ref rule and the fallback command verbatim; the sibling-worktree rule; the focused baseline with its report line; the report format. Replace the polyglot setup script with: "Install dependencies the way the project's manifest says, then run the smallest focused checks that prove a clean start." Remove the rationalization table.

- [ ] **Step 3: Rewrite requesting-code-review and code-reviewer.md**

`SKILL.md` at most 350 words. Keep: when to request (after a task in SDD, before merge, on request); the merge-base rule with its reason ("BASE is the recorded commit before the work, never `HEAD~1`, which drops every commit but the last"); the review-package and DIFF_FILE contract; `Do not read \`docs/REVIEW-GUIDANCE.md\` yourself` verbatim; the pointer to `code-reviewer.md` and `smell-baseline.md`. Remove "Review early, review often", the Mandatory/Optional lists, the example transcript, and the Integration section.

`code-reviewer.md` at most 450 words (Task 18 adds about 60). Keep every needle string verbatim, the read-only rules, the git fallback commands, What to Check, the output format headings, and the placeholder list. Remove "Acknowledge what was done well ... helps the implementer trust". Keep Strengths as a section heading. The Calibration paragraph is replaced in Task 18; here reduce it to "Categorize issues by actual severity. Not everything is Critical."

- [ ] **Step 4: Update the worktree test**

Delete the `Satisfy Step 3 now` assertion from `tests/toolbelt/test-worktree-baseline.sh`.

- [ ] **Step 5: Verify**

Run: `test "$(wc -w < skills/using-git-worktrees/SKILL.md)" -le 750 && test "$(wc -w < skills/requesting-code-review/SKILL.md)" -le 350 && test "$(wc -w < skills/requesting-code-review/code-reviewer.md)" -le 450 && bash tests/toolbelt/test-worktree-baseline.sh && bash tests/toolbelt/test-worktree-source-ref.sh && bash tests/toolbelt/test-reviewer-context.sh && bash tests/toolbelt/test-execution-tracks.sh`
Expected: four `PASS` lines.

- [ ] **Step 6: Commit**

```bash
git add skills/using-git-worktrees/SKILL.md skills/requesting-code-review/SKILL.md skills/requesting-code-review/code-reviewer.md tests/toolbelt/test-worktree-baseline.sh
git commit -m "Unslop: using-git-worktrees, requesting-code-review"
```

### Task 8: writing-plans

**Files:**
- Modify: `skills/writing-plans/SKILL.md`
- Create: `skills/writing-plans/execution-tracks.md`
- Delete: `skills/writing-plans/plan-document-reviewer-prompt.md`
- Modify: `tests/toolbelt/test-execution-tracks.sh`

**Interfaces:**
- Consumes: Task 1 doctrine
- Produces: writing-plans at or under 1,600 words, leaving room for Task 16's Review-class rule.

**Gotchas:**
- `test-execution-tracks.sh` `$plans` needles: `No file is created or modified by two concurrent tracks`, `contract-freeze`, `Every fork closes with a mainline integration task` move to `execution-tracks.md`: add `tracks="$repo_root/skills/writing-plans/execution-tracks.md"` and point those three at it. The multi-line `$plans` needle at lines 40–42 (the "Required for every plan" sentence) stays in `SKILL.md`; read the file to confirm which is which. Task 9 edits the same test's `$sdd` needles; sequential in track `orchestration`.
- `test-writing-plans.sh` needles all stay verbatim except none; read all 36. `states in one sentence why no tasks can run concurrently` must remain in `SKILL.md` (it is the requirement, not a declaration rule).
- `git grep -n plan-document-reviewer-prompt` must return nothing after deletion; confirm nothing links it.

- [ ] **Step 1: Confirm the ceiling fails and list needles**

Run: `wc -w < skills/writing-plans/SKILL.md; grep -n "assert" tests/toolbelt/test-writing-plans.sh | wc -l; sed -n 1,25p tests/toolbelt/test-execution-tracks.sh; git grep -n plan-document-reviewer-prompt`
Expected: 2289 (over 1600); 36 assertions; the tracks needles; one grep hit (the file itself's directory listing has none; the only reference is none — confirm).

- [ ] **Step 2: Rewrite SKILL.md and create execution-tracks.md**

`SKILL.md` at most 1,600 words. Keep every section heading and contract: Overview, Scope Check, Exploration Before Drafting with the Gotcha Hunt, File Structure, Task Right-Sizing, Plan Document Header block verbatim, PR Boundaries table and rules, Execution Tracks (reduced to: "Required for every plan with more than one PR boundary or more than three tasks. A plan whose tracks are all `serial-N` states in one sentence why no tasks can run concurrently. The section follows `## PR Boundaries`; its table shape and declaration rules are in [execution-tracks.md](execution-tracks.md) — read it before declaring tracks."), Plan Altitude table, Task Structure block verbatim, No Placeholders, Self-Review, Plan Review Gate with every bullet, Execution Handoff with the quoted line. Remove restated rationale.

`execution-tracks.md` holds the example table, the structure rules, and the declaration rules (disjoint file sets, no contract-shaped work in tracks with the contract-freeze name, no cross-track interfaces, threshold, every fork closes with a mainline integration task and its brief carries drift entries) verbatim from today's section.

Delete `plan-document-reviewer-prompt.md`.

- [ ] **Step 3: Update tests**

Point the `$plans` track needles in `test-execution-tracks.sh` at `$tracks`. Leave `test-writing-plans.sh` needles as they are; run it.

- [ ] **Step 4: Verify**

Run: `test "$(wc -w < skills/writing-plans/SKILL.md)" -le 1600 && bash tests/toolbelt/test-writing-plans.sh && bash tests/toolbelt/test-execution-tracks.sh && test ! -e skills/writing-plans/plan-document-reviewer-prompt.md`
Expected: two `PASS` lines.

- [ ] **Step 5: Commit**

```bash
git add -A skills/writing-plans tests/toolbelt/test-execution-tracks.sh
git commit -m "Unslop: writing-plans; execution tracks disclosed; orphan reviewer prompt deleted"
```

### Task 9: subagent-driven-development and its prompts

**Files:**
- Modify: `skills/subagent-driven-development/SKILL.md`
- Create: `skills/subagent-driven-development/parallel-tracks.md`
- Modify: `skills/subagent-driven-development/task-reviewer-prompt.md`
- Modify: `skills/subagent-driven-development/implementer-prompt.md`
- Modify: `skills/subagent-driven-development/re-review-prompt.md`
- Modify: `tests/toolbelt/test-execution-tracks.sh`

**Interfaces:**
- Consumes: Task 8's `execution-tracks.md`. The docs-only rule already lives in finishing-a-development-branch Step 1 (`**Docs-only case:**`); reference it by that name.
- Produces: SDD at or under 1,500 words with headings `## Handling Implementer Status`, `## The Fix Loop`, `## Verification Scope`, `## Durable Progress`, `## Ownership rules`; Tasks 15 and 19 add sections to it.

**Gotchas:**
- `test-execution-tracks.sh` `$sdd` needles: `## Parallel Tracks` (line 45 — the heading stays in `SKILL.md` over the pointer sentence), `At most 3 tracks run concurrently`, `A textual conflict is a plan defect`, `## Decisions & drift risks` (line 49 — its only occurrence is in the Drift-log paragraph that moves; repoint at `$sdd_tracks`), `Dispatch multiple implementation subagents into the same worktree`, `Parallelize tracks the plan did not declare`, and `assert_not_contains 'Dispatch multiple implementation subagents in parallel (conflicts)'`. The three track-mechanics needles move to `parallel-tracks.md` (add `sdd_tracks=`); the heading and the two "Never" needles stay in `SKILL.md`, the latter under `## Ownership rules`. Read the test file; there is no multi-line `$sdd` needle.
- `test-final-review-gate.sh` needles all stay verbatim (16 `assert_contains`, four `assert_not_contains`). `test-fix-loop.sh` needles all stay verbatim. `test-reviewer-context.sh` needles all stay verbatim.
- The Red Flags heading is renamed `## Ownership rules`; its six bullets stay.

- [ ] **Step 1: Confirm the ceiling fails and list needles**

Run: `wc -w < skills/subagent-driven-development/SKILL.md; grep -n "assert" tests/toolbelt/test-execution-tracks.sh tests/toolbelt/test-final-review-gate.sh tests/toolbelt/test-fix-loop.sh tests/toolbelt/test-reviewer-context.sh | wc -l`
Expected: 2138 (over 1500); the assertion count.

- [ ] **Step 2: Rewrite SKILL.md and create parallel-tracks.md**

`SKILL.md` at most 1,500 words, frontmatter unchanged. Keep every contract in The Process, Model Selection, Handling Implementer Status, The Fix Loop (including both routes, the ledger lines, adjudication), Verification Scope, Constructing Reviewer Prompts, File Handoffs, Durable Progress, Prompt Templates, Integration, and `## Ownership rules` (the six "Never" bullets, under that heading). Under the `## Parallel Tracks` heading (kept), replace the body with: "Active only when the plan declares a top-level `## Execution Tracks` section; otherwise this skill is serial. Read [parallel-tracks.md](parallel-tracks.md) when it does." `parallel-tracks.md` holds Wave execution, Working directories, Drift log (with its `## Decisions & drift risks` report-section name), Ledger, and Failure semantics verbatim.

- [ ] **Step 3: Light pass on the three prompts**

Within the rewrite rules, keep every placeholder, section heading, and needle string. `task-reviewer-prompt.md` at most 650 words: collapse the three "does not override requirements, suppress findings, or set severity" restatements to one (the `[REVIEW_NUANCE]` section keeps `does not override requirements,`); keep Calibration as is (Task 18 replaces it). `implementer-prompt.md` at most 320 words here (Tasks 15 and 18 add about 230; the ceiling is 550): keep every placeholder, the seen-red paragraph, the fix-report table, and the report contract, and tighten the rest. `re-review-prompt.md` at most 420 words.

- [ ] **Step 4: Update tests**

In `test-execution-tracks.sh`, add `sdd_tracks="$repo_root/skills/subagent-driven-development/parallel-tracks.md"` and point `At most 3 tracks run concurrently`, `A textual conflict is a plan defect`, and `## Decisions & drift risks` at it. Run the other test files unchanged.

- [ ] **Step 5: Verify**

Run: `test "$(wc -w < skills/subagent-driven-development/SKILL.md)" -le 1500 && test "$(wc -w < skills/subagent-driven-development/task-reviewer-prompt.md)" -le 650 && test "$(wc -w < skills/subagent-driven-development/implementer-prompt.md)" -le 320 && for t in test-execution-tracks test-final-review-gate test-fix-loop test-reviewer-context; do bash tests/toolbelt/$t.sh || exit 1; done`
Expected: four `PASS` lines.

- [ ] **Step 6: Commit**

```bash
git add skills/subagent-driven-development tests/toolbelt/test-execution-tracks.sh
git commit -m "Unslop: subagent-driven-development; parallel tracks disclosed; prompts trimmed"
```

### Task 10: delivery, pr-monitor, agent-routing, quick-task

**Files:**
- Modify: `skills/delivery/SKILL.md`
- Modify: `skills/pr-monitor/SKILL.md`
- Modify: `skills/agent-routing/SKILL.md`
- Modify: `skills/quick-task/SKILL.md`

**Interfaces:**
- Consumes: none. The docs-only rule already lives in finishing-a-development-branch Step 1 (`**Docs-only case:**`); reference it by that name.
- Produces: delivery at or under 800 words; Tasks 15 and 19 add rows and a sentence.

**Gotchas:**
- All needles in the three tests stay verbatim (read every line). pr-monitor's Preflight docs-only exception becomes "the docs-only rule in toolbelt:finishing-a-development-branch Step 1 applies: such a push carries local-gate and completed-review evidence forward — record the range. CI never carries forward." — no test needle covers the old wording.
- `docs/WORKFLOW.md` is asserted by `test-delivery.sh` and `test-workflow-summary.sh` and changes in Task 20 only; do not touch it here.
- Keep `test-delivery.sh`'s two `assert_before` orderings and `test-quick-task.sh:52`'s forbidden terms (see Known Gotchas).

- [ ] **Step 1: Confirm counts and list needles**

Run: `for f in delivery pr-monitor agent-routing quick-task; do wc -w < skills/$f/SKILL.md; done; grep -c assert tests/toolbelt/test-delivery.sh tests/toolbelt/test-pr-monitor.sh tests/toolbelt/test-quick-task.sh`
Expected: 936, 856, 834, 194; the counts.

- [ ] **Step 2: Light pass**

delivery at most 800 words, pr-monitor at most 850, agent-routing at most 800, quick-task at most 200. Apply the rewrite rules; change no rule; keep every needle. In pr-monitor, replace the Preflight docs-only sentence as the gotcha says.

- [ ] **Step 3: Verify**

Run: `test "$(wc -w < skills/delivery/SKILL.md)" -le 800 && test "$(wc -w < skills/pr-monitor/SKILL.md)" -le 850 && test "$(wc -w < skills/agent-routing/SKILL.md)" -le 800 && test "$(wc -w < skills/quick-task/SKILL.md)" -le 200 && bash tests/toolbelt/test-delivery.sh && bash tests/toolbelt/test-pr-monitor.sh && bash tests/toolbelt/test-quick-task.sh && bash tests/toolbelt/test-agent-routing.sh`
Expected: four `PASS` lines.

- [ ] **Step 4: Commit**

```bash
git add skills/delivery/SKILL.md skills/pr-monitor/SKILL.md skills/agent-routing/SKILL.md skills/quick-task/SKILL.md
git commit -m "Unslop: delivery, pr-monitor, agent-routing, quick-task light pass"
```

### Task 11: Integration — ceilings and doctrine test

**Files:**
- Modify: `tests/toolbelt/test-word-counts.sh`
- Create: `tests/toolbelt/test-doctrine.sh`
- Modify: `README.md:86-104`
- Modify: `skills/writing-skills/testing-skills-with-subagents.md`

**Interfaces:**
- Consumes: every Boundary 1 rewrite; the merged tracks' `Decisions & drift risks` entries are carried in this task's brief
- Produces: the repo-wide ceiling table and doctrine test later boundaries must keep green

**Gotchas:**
- Absence checks use `git grep`, which exits 0 on a match: write `if git grep -q -e "$needle" -- skills; then fail`.
- The `| Excuse | Reality |` header appears in `skills/writing-skills/testing-skills-with-subagents.md` (moved there in Task 1); the doctrine test's exception list is `skills/test-driven-development/SKILL.md` and `skills/writing-skills/testing-skills-with-subagents.md`.
- "Iron Law" appears in test-driven-development only after Task 3; the test allows it there.

- [ ] **Step 1: Write the tests**

`tests/toolbelt/test-word-counts.sh`: replace the `ceilings` array with the spec's Component 2 table (31 entries including the four disclosed side files; `docs/WORKFLOW.md:320`; gate-reviewer-prompt.md:700 added by Task 18 — that one entry alone is optional, marked so a missing file is skipped with a printed `skip` line; every other absent file is `not ok`).

`tests/toolbelt/test-doctrine.sh`, one assertion per line — name — check:
- `no_extremely_important` — `git grep -q -e "EXTREMELY-IMPORTANT" -e "EXTREMELY_IMPORTANT" -- skills hooks` exits 1
- `no_letter_spirit` — `git grep -q "Violating the letter" -- skills` exits 1
- `no_threats` — `git grep -q -e "you'll be replaced" -e "you will be replaced" -- skills` exits 1
- `iron_law_only_tdd` — `git grep -l "Iron Law" -- skills` prints only `skills/test-driven-development/SKILL.md` or nothing
- `one_rationalization_table` — `git grep -l -e "| Excuse | Reality |" -e "| Thought | Reality |" -- skills` prints only the two allowed paths
- `gates_under_80_words` — for every `skills/*/SKILL.md`, each block extracted with `sed -n '/^<HARD-GATE>$/,/^<\/HARD-GATE>$/p' | grep -v '^<'` and the `ENTRY-GATE` equivalent has `wc -w` ≤ 80 (whole-line anchors; the tag lines are excluded from the count; an inline mention never opens a range)

- [ ] **Step 2: Run them to see the state**

Run: `bash tests/toolbelt/test-word-counts.sh; bash tests/toolbelt/test-doctrine.sh`
Expected: both pass if Tasks 1–10 landed as specified; any failure names the file to cut, and this task cuts it (its brief carries the drift entries naming any file a track left over its ceiling).

- [ ] **Step 3: README and the testing reference**

`skills/writing-skills/testing-skills-with-subagents.md` (Task 1 moved content into it; both its reviews flagged the rest): apply the rewrite rules. Remove `## Red Flags - STOP`, `## Common Mistakes`, `## Quick Reference`, `## The Bottom Line`, and `## Real-World Impact`; keep `## TDD Mapping for Skill Testing`, the three phase sections, `## Testing Checklist (TDD for Skills)`, `## Micro-Testing Wording`, `## Testing by Skill Type`, and `## Common Rationalizations for Skipping Testing` with its table; in `## REFACTOR Phase`, any advice to add rationalization-table rows or red-flag entries carries the gate "only where a brief instruction measurably failed under pressure". Target at most 1,800 words; the doctrine test's allow-list for the excuse table already names this file.


Line 86: `- **verification-before-completion** - Audit every claim against a tool result before reporting`. Line 95: `- **receiving-code-review** - Verify feedback against the code before acting on it`. Line 104 is changed in Task 14.

- [ ] **Step 4: Run every plugin test**

Run: `scripts/lint-shell.sh tests/toolbelt/test-doctrine.sh tests/toolbelt/test-word-counts.sh && for t in tests/toolbelt/*.sh tests/hooks/*.sh; do echo "== $t"; bash "$t" || exit 1; done`
Expected: every script prints `PASS` (or its own pass lines) and the loop exits 0.

- [ ] **Step 5: Commit**

```bash
git add tests/toolbelt/test-word-counts.sh tests/toolbelt/test-doctrine.sh README.md skills/writing-skills/testing-skills-with-subagents.md
git commit -m "Enforce word ceilings and doctrine across skills"
```

### Task 12: Capture script — stills, mechanical checks, smoke mode

**Files:**
- Create: `skills/ux-gate/scripts/ux-capture`
- Create: `tests/toolbelt/fixtures/ux-capture/index.html`
- Create: `tests/toolbelt/fixtures/ux-capture/matrix.json`
- Create: `tests/toolbelt/test-ux-capture.sh`

**Interfaces:**
- Consumes: Data Model (matrix, mechanical.json, checks table, naming)
- Produces: `ux-capture <matrix.json> --out <dir> [--project-root <dir>] [--smoke] [--pathway <name>]...` exit 0 clean, 1 findings at `should` or above or a `step-failed`, 2 cannot run; `mechanical.json` per the Data Model with `diff: null`, `files.filmstrip: null`, `files.diffCrop: null`; Task 13 adds `--baseline`, `--video`, filmstrips, axe

**Gotchas:**
- Playwright resolution per Global Constraints; `import(pathToFileURL(resolvedPath))`, not a bare import.
- The test serves the fixture with `node -e` using `http.createServer` and `fs` on an ephemeral port printed to stdout; no dependency. Kill it in a `trap`.
- Layout-shift observation must be installed with `context.addInitScript` before navigation, or entries before load are lost.
- Take the still after `page.waitForLoadState('networkidle')` and two `requestAnimationFrame`s; `animations: 'disabled'`, `caret: 'hide'`.
- Theme `class` mode with an empty value adds no class (light). `media` mode uses `colorScheme` on the context.
- The script must skip Playwright when `--help` is passed and print usage; the test uses `--help` to confirm the file runs before probing resolution.

- [ ] **Step 1: Write the failing test**

`tests/toolbelt/test-ux-capture.sh`:
- `help_runs` — `node skills/ux-gate/scripts/ux-capture --help` — exit 0, output contains `--smoke`
- `skip_without_playwright` — run the script on the fixture matrix with `PLAYWRIGHT_MODULE` unset and `--project-root "$tmp/empty"` (a directory holding only `{}` in `package.json`) — exit 2 and stderr contains `cannot resolve 'playwright'`; the test then decides the real run's module: `$PLAYWRIGHT_MODULE` if set, else `node -e "console.log(require.resolve('playwright'))"` from the repo root if that succeeds; if neither, print `SKIP - playwright unavailable` and exit 0
- `smoke_finds_fixture_defects` — serve `fixtures/ux-capture/`, rewrite `baseUrl` into a temp matrix, run `--smoke --out $tmp/out --project-root "$tmp/empty"` with `PLAYWRIGHT_MODULE` set to the module found above — exit 1; `mechanical.json` parses; contains a `checks[]` entry `element-overflow` with selector `SPAN.overflow-child`, `unclickable` with selector `BUTTON#covered`, and, for the dark capture, `theme-leak` with selector `DIV.hardcoded-white`; every still named per Data Model exists
- `smoke_uses_first_viewport_only` — same run — every entry has `width == 375`

The fixture `index.html`: a `<div class="card" style="width:200px;overflow:hidden">` containing a `<span class="overflow-child" style="display:inline-block;width:300px">`; a `<button id="covered">Covered</button>` in the first 300px of the page under a `position:absolute` full-width overlay `div`; a `<div class="hardcoded-white" style="background:#fff;width:200px;height:200px">`; `<html class="">` with CSS `.dark body{background:#111;color:#eee}`; a `<button id="open">Open</button>` that toggles a `<div id="panel" hidden>` (used by Task 13's motion test). `matrix.json`: `theme.mode: "class"`, `target: "html"`, both themes, the three default viewports, one pathway `home` at `/index.html` with steps `open` (default) and `panel` (`action: click`, `selector: #open`, `motion: true`, `waitFor: #panel:not([hidden])`).

- [ ] **Step 2: Run it to verify it fails**

Run: `bash tests/toolbelt/test-ux-capture.sh`
Expected, per assertion:
- `help_runs` — FAIL: script not found
- others — not reached

- [ ] **Step 3: Implement the script**

`#!/usr/bin/env node`, ESM. Structure: `parseArgs` (matrix path, `--out`, `--project-root`, `--smoke`, `--pathway` repeatable, `--help`; `--baseline` and `--video` accepted and ignored until Task 13); `resolvePlaywright(projectRoot)` per Global Constraints; browser launch wrapped so a failure prints the error and exits 2; `loadMatrix(path)` applying defaults; `applyTheme(context|page, theme, matrix.theme)` per mode; `mechanicalChecks()` — a single function serialised into `page.evaluate` returning `{checks, cls, clsSources, fonts}` implementing every row of the checks table except `axe`; the capture loop `for viewport → for theme → for pathway → newContext → addInitScript(layout-shift observer) → goto(baseUrl + path, networkidle) → for step: action, waitFor (15 s, `step-failed` on timeout), settle, still, crops, mechanical, entry`; reference screens after pathways; write `mechanical.json`; exit code from the max severity across entries. Console and request listeners are attached per page and drained per step.

- [ ] **Step 4: Run the test to verify it passes**

Run: `bash tests/toolbelt/test-ux-capture.sh`
Expected: `PASS`. If the test prints `SKIP`, rerun as `PLAYWRIGHT_MODULE=/Users/mkirk/projects/fsmcrm/node_modules/playwright bash tests/toolbelt/test-ux-capture.sh` and paste that `PASS` in the report; a report with only `SKIP` is incomplete. Then `scripts/lint-shell.sh tests/toolbelt/test-ux-capture.sh`.

- [ ] **Step 5: Commit**

```bash
chmod +x skills/ux-gate/scripts/ux-capture
git add skills/ux-gate/scripts/ux-capture tests/toolbelt/fixtures/ux-capture tests/toolbelt/test-ux-capture.sh
git commit -m "ux-capture: scripted stills with mechanical checks and smoke mode"
```

### Task 13: Capture script — baseline diff, filmstrips, video, axe

**Files:**
- Modify: `skills/ux-gate/scripts/ux-capture`
- Modify: `tests/toolbelt/test-ux-capture.sh`
- Modify: `tests/toolbelt/fixtures/ux-capture/index.html`

**Interfaces:**
- Consumes: Task 12's script and test
- Produces: `--baseline <dir>` (diff per Data Model, `-diff-crop.png` for changed captures), filmstrips for `motion` steps, `--video`, `axe` entries or `"unavailable"`

**Gotchas:**
- Pixel diff runs in a blank page: `page.setContent` with two `<img>` from `file://` paths via `data:` URLs (read the PNGs with `fs` and base64 them; `file://` is blocked from `about:blank`), draw both on canvases sized to the larger image, compare `ImageData` with per-channel tolerance 8, mark a pixel changed only when at least one 4-neighbour is also over tolerance (antialias guard), return `{ratio, box}`. Different image sizes count as changed with `box` = full.
- Filmstrip frames are taken with `page.screenshot({type:'jpeg', quality: 70})` at 0, 150, 400 ms after the action and once more in a fresh context with `reducedMotion: 'reduce'`; stitched in the browser onto one canvas at half scale with the label text under each frame, then `page.screenshot` of the canvas element.
- `@axe-core/playwright` resolves from the project root only; if `createRequire(projectPackageJson).resolve('@axe-core/playwright')` throws, write `"unavailable"`.
- Video contexts must be closed before the webm is finalised.

- [ ] **Step 1: Extend the test**

Add assertions:
- `filmstrip_for_motion_step` — a full run (`--out $tmp/full`, same `--project-root` and `PLAYWRIGHT_MODULE` as Task 12's run; exit 1 is expected because the fixture has defects, and the assertion checks only the files) — file `home-panel-default-375-light-filmstrip.png` exists and is larger than 1 KB, and no filmstrip exists under Task 12's `--smoke` output
- `baseline_unchanged` — run again with `--baseline $tmp/full --out $tmp/again` — every entry has `diff.status == "unchanged"` and no `-diff-crop.png` exists
- `baseline_changed` — edit a copy of the fixture to change the card's background colour, serve it, run with `--baseline $tmp/full` — the `home-open-default-375-light` entry has `diff.status == "changed"`, `ratio > 0.001`, and `home-open-default-375-light-diff-crop.png` exists
- `video_flag_writes_webm` — run with `--video --smoke` — `$out/video/` contains at least one `.webm`
- `axe_unavailable_recorded` — in the full run (`$tmp/full`), every entry's `axe` is `"unavailable"` or an array; in Task 12's `--smoke` output every entry's `axe` is `"skipped"`

- [ ] **Step 2: Run the test to verify the new assertions fail**

Run: `bash tests/toolbelt/test-ux-capture.sh`
Expected, per new assertion:
- `filmstrip_for_motion_step` — FAIL: file missing
- `baseline_unchanged` — FAIL: `diff` is null
- others — FAIL similarly

- [ ] **Step 3: Implement**

Add `diffAgainstBaseline(page, headPng, basePng)`; `filmstrip(page, step, tag)` and the reduced-motion context per the Data Model's order-per-step; the DPR-2 crop context; `recordVideo` on context creation when `--video`; the axe branch (full runs only); `--pathway` filtering (already parsed); reference screens (full runs only); and the `diff` and `files` fields per Data Model. `--smoke` runs no axe, no filmstrips, no reference screens, and ignores `--baseline`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `bash tests/toolbelt/test-ux-capture.sh`
Expected: `PASS`

- [ ] **Step 5: Commit**

```bash
git add skills/ux-gate/scripts/ux-capture tests/toolbelt/test-ux-capture.sh tests/toolbelt/fixtures/ux-capture/index.html
git commit -m "ux-capture: baseline diff, filmstrips, video receipt, axe"
```

### Task 14: ux-gate skill rewrite and project policy docs

**Files:**
- Modify: `skills/ux-gate/SKILL.md`
- Modify: `tests/toolbelt/test-ux-gate.sh`
- Modify: `docs/ADOPTING-IN-A-PROJECT.md`
- Modify: `README.md:104`

**Interfaces:**
- Consumes: the script's CLI from Tasks 12–13; the docs-only rule home from Task 6
- Produces: the ux-gate contract Tasks 15 and 19 reference: "run ux-gate's capture at the final gate's head"

**Gotchas:**
- `test-ux-gate.sh` needles that change: `throwaway Playwright script` → `scripts/ux-capture`; `<pathway>-<step>-<state>-<width>[-<theme>].png` → `<pathway>-<step>-<state>-<width>-<theme>.png`; `only when theme-specific styles or tokens changed or the acceptance criteria require them` → `Capture every supported theme for every changed surface`; `against the approved criteria — never personal taste` → `where would a designer wince`; `component file + visual state + viewport + specific deviation + screenshot reference` → `a severity (blocker, should, nit), the image reference`; `a shared style or token change invalidates every consuming capture` stays. All other needles stay verbatim, including `I'm running the UX gate for <surface>.`, `nothing downstream may claim UX was verified`, `.toolbelt/ux/`, `Enumerate the capture matrix`, `Resolve one \`reviewer\` with specialty \`ux\` via agent-routing`, `vision-capable model`, `without driving the browser`, `docs/REVIEW-GUIDANCE.md`, `a finding, not a skip`, `rerun the capture script on the new head`, `a new push invalidates prior evidence`, `before the final gate verdict`, `One primary UX reviewer by default`, `Do not manufacture states by editing app source`, `Record why any excluded dimension cannot vary`, `a conflict to surface, not obey`, `one nearest previously passing unchanged state for each affected component`, `pathways covered separately from raw screenshot count`, `including shared styling or layout the step consumes`, `smallest set of navigation pathways covering what this diff changed`.
- The model-name scan applies; write no model names.
- `skills/ux-gate/agents/openai.yaml` is unchanged; its `short_description` already satisfies the 25–64 character rule.

- [ ] **Step 1: List needles and confirm the current count**

Run: `grep -n assert_contains tests/toolbelt/test-ux-gate.sh; wc -w < skills/ux-gate/SKILL.md`
Expected: 30 needles; 742.

- [ ] **Step 2: Rewrite SKILL.md**

At most 950 words. Description exactly: `Use to verify changed user-visible surfaces before a boundary's final review: scripted capture, mechanical checks, pixel diff against a baseline, and a two-pass vision review. Returns Pass or Changes Required.` Sections: announce, entry and exit, ownership (operator captures, routed `ux` reviewer judges, orchestrator never captures, implementer captures only its own smoke), 0 preflight, 1 pathways from the diff, 2 capture (write `.toolbelt/ux/matrix.json` per the Data Model — read `.toolbelt/ux-policy.md` when present for Launch, Auth, Theme, Data, viewports and themes, allowed exceptions, design reference, reference screens, harness notes; infer and record when absent — then run `scripts/ux-capture` from this skill's directory with `--baseline` pointing at `.toolbelt/ux/baseline/` when it exists, otherwise at a capture of the base branch; enumerate the matrix before capturing; every supported theme for every changed surface; criteria-named states plus hover, focus, keyboard reach, one scroll past the fold, and every opening, closing, or transitioning step marked `motion`; record excluded dimensions; a plan-fixed screenshot count is a conflict to surface, not obey), 3 mechanical findings first, 4 review (the reviewer instruction from Spec C3 item 6 quoted verbatim, images first labelled `Image N: <tag>`, then criteria, mechanical report, design reference path; findings carry severity, image reference, component or file, expected, actual; the operator maps unrouted findings to files from the diff; a finding without an image reference does not count), 5 fix loop (blockers and shoulds loop, nits go in the PR description, rerun mechanical checks over the whole matrix and stills for affected pathways plus one nearest previously passing unchanged state for each affected component, diff against the previous round, two rounds then the owner), budget (at most 25 images, desktop at DPR 1, crops at DPR 2, filmstrips only where motion exists, video never), and Rules (one primary reviewer; no manufactured states; the docs-only rule in toolbelt:finishing-a-development-branch Step 1 carries evidence forward; head binding).

- [ ] **Step 3: Update the test and docs**

Update the five changed needles in the test. `docs/ADOPTING-IN-A-PROJECT.md`: add `.toolbelt/ux-policy.md` to the per-project files list with its nine section names (Launch, Auth, Theme, Data, Viewports and themes, Allowed exceptions, Design reference, Reference screens, Harness notes) and one sentence each. README line 104: `- **ux-gate** - Mechanical checks, pixel diff, and two-pass vision review for user-visible changes`.

- [ ] **Step 4: Verify**

Run: `test "$(wc -w < skills/ux-gate/SKILL.md)" -le 950 && bash tests/toolbelt/test-ux-gate.sh && bash tests/toolbelt/test-word-counts.sh && bash tests/toolbelt/test-doctrine.sh`
Expected: three passes.

- [ ] **Step 5: Commit**

```bash
git add skills/ux-gate/SKILL.md tests/toolbelt/test-ux-gate.sh docs/ADOPTING-IN-A-PROJECT.md README.md
git commit -m "ux-gate: mechanical-first capture, baseline diff, two-pass design review, project UX policy"
```

### Task 15: Implementer smoke, delivery ownership, baseline, routing

**Files:**
- Modify: `skills/subagent-driven-development/implementer-prompt.md`
- Modify: `skills/subagent-driven-development/SKILL.md` (File Handoffs)
- Modify: `skills/delivery/SKILL.md` (Role ownership)
- Modify: `skills/interactive-design/SKILL.md` (§4 step 2)
- Modify: `skills/agent-routing/defaults.json`
- Modify: `skills/agent-routing/SKILL.md` (Roles table)
- Modify: `tests/toolbelt/test-agent-routing.sh`
- Modify: `tests/toolbelt/test-delivery.sh`

**Interfaces:**
- Consumes: Task 14's ux-gate contract; Data Model routing additions
- Produces: `[UX_SMOKE_COMMAND]` placeholder in implementer-prompt; the `## UI smoke` report section; specialties `ux` and `gate` in bundled routing; delivery role rows "UI smoke per task" (implementer) and "UX capture at the boundary" (gate operator)

**Gotchas:**
- `test-agent-routing.sh:162` pins every non-reviewer bundled role's fallback as codex sol; leave those roles alone. Reviewer expectations pass `--author-harness claude`, so the new Claude fallback is filtered and `fallbacks: []` stays true.
- `test-agent-routing.sh:285` fails the brief case when `reviewer_specialties` is present at all (`if "reviewer_specialties" in brief: fail`). The resolver's `build_brief` emits that key whenever bundled defaults declare specialties, so change that check to `if set(brief.get("reviewer_specialties", {})) != {"gate", "ux"}: fail(...)`.
- For an author on the specialty's primary harness, `enforce_reviewer_independence` returns the fallback with `source` suffixed `:fallback[0]` and `fallback_reason` `"reviewer harness matches author harness"` (see the existing case at line 215). Add, copying the `assert_route` shape from line 173: `bundled gate specialty, author claude` → `{"role":"reviewer","harness":"codex","model":"gpt-5.6-sol","effort":"high","fallbacks":[],"source":"bundled:reviewer-specialty","fallback_reason":null}`; `bundled gate specialty, author codex` → `{"role":"reviewer","harness":"claude","model":"fable-5-1","effort":"high","fallbacks":[],"source":"bundled:reviewer-specialty:fallback[0]","fallback_reason":"reviewer harness matches author harness"}`; the same pair for `ux`. `assert_route` strips `instructions` before comparing.
- The reviewer role's `instructions` string ends "Codex-authored work falls through to opus-5 high"; change it to "falls through to fable-5-1 high".
- `test-delivery.sh` needles on delivery all stay; add `UI smoke per task` and `UX capture at the boundary`.
- interactive-design's ceiling is 1200; the §4 change is one sentence swap.
- `test-fix-loop.sh` and `test-reviewer-context.sh` needles on implementer-prompt stay verbatim.

- [ ] **Step 1: Write the failing tests**

Add the four `assert_route` cases above to `test-agent-routing.sh`, change the brief check as the gotcha says, and add the two needles to `test-delivery.sh`.

- [ ] **Step 2: Run them to verify they fail**

Run: `bash tests/toolbelt/test-agent-routing.sh; bash tests/toolbelt/test-delivery.sh`
Expected, per test:
- `bundled gate specialty, author claude` — FAIL: source is `bundled:role`
- `UI smoke per task` — FAIL: missing

- [ ] **Step 3: Implement**

`implementer-prompt.md`: add after `## Verification`:

```
    ## UI smoke

    If your diff touches a file the app renders — a component, template,
    style, route, or copy shown on screen — run the smoke pass before
    reporting DONE: [UX_SMOKE_COMMAND] for the pathway your task changes.
    Fix every finding it reports at `should` or above inside this task.
    Report the run's `mechanical.json` path and the still paths under
    **UI smoke** in your report; write `UI smoke: not applicable` when your
    diff renders nothing. A finding you cannot fix inside this task's Files
    block means you report DONE_WITH_CONCERNS naming it.
```

and the placeholder entry: `[UX_SMOKE_COMMAND]` — the ux-capture invocation built from `.toolbelt/ux-policy.md` Launch and Theme (`<ux-gate skill dir>/scripts/ux-capture <matrix> --smoke --pathway <name> --out .toolbelt/ux/smoke/task-N`), or `not applicable` for a plan with no user-visible surface.

SDD File Handoffs, task-brief bullet: add "the smoke command for `[UX_SMOKE_COMMAND]`, built from `.toolbelt/ux-policy.md` when the plan has a user-visible surface". (The reviewer-side rule — a missing UI smoke entry on a rendering diff is Important — lands in Task 18, which owns the reviewer prompts.)

delivery Role ownership: replace the "UX capture (scripted Playwright screenshots)" row with two rows: `| UI smoke per task (mechanical checks and stills of the touched pathway) | Implementer, inside its task, before reporting DONE |` and `| UX capture at the boundary (full matrix, diff, filmstrips) | Gate operator (role \`errand\`) dispatched by the orchestrator |`; keep the UX judgment row. Replace "Neither the orchestrator nor the implementer captures UX evidence" (in ux-gate, already rewritten) — in delivery add the sentence "The orchestrator never captures UX evidence; the implementer captures only its own task's smoke pass."

interactive-design §4 step 2: "Run `scripts/ux-capture` from the ux-gate skill against the approved prototype with the session's `.toolbelt/ux/matrix.json` and keep the output at `.toolbelt/ux/baseline/`; the gate diffs against it. Write the **Acceptance criteria** section into the ledger, recording the matrix path; the matrix lists every surface the criteria name."

`defaults.json`: the Data Model additions; reviewer fallback to `fable-5-1`; the reviewer `instructions` string updated. agent-routing Roles table: `reviewer` row lists specialties `code`, `spec`, `plan`, `ux`, or `gate`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bash tests/toolbelt/test-agent-routing.sh && bash tests/toolbelt/test-delivery.sh && bash tests/toolbelt/test-fix-loop.sh && bash tests/toolbelt/test-reviewer-context.sh && bash tests/toolbelt/test-interactive-design.sh && bash tests/toolbelt/test-word-counts.sh && bash tests/toolbelt/test-claude-agent-definitions.sh`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add skills/subagent-driven-development/implementer-prompt.md skills/subagent-driven-development/SKILL.md skills/delivery/SKILL.md skills/interactive-design/SKILL.md skills/agent-routing/defaults.json skills/agent-routing/SKILL.md tests/toolbelt/test-agent-routing.sh tests/toolbelt/test-delivery.sh
git commit -m "Per-task UI smoke by the implementer; prototype captures as baseline; ux and gate reviewer routes"
```

### Task 16: Review class in writing-plans

**Files:**
- Modify: `skills/writing-plans/SKILL.md`
- Modify: `tests/toolbelt/test-writing-plans.sh`

**Interfaces:**
- Consumes: Task 8's writing-plans; the Data Model's Review class block
- Produces: none (SDD reads the field by the name fixed in the Data Model)

**Gotchas:**
- Ceiling 1900. Task 8 landed the file at 1,804 (its 1,600 interim target was unreachable without cutting keep-listed rules; ruled: the spec ceiling governs). This task's additions are about 115 words, so it must cut elsewhere or disclose: if the file cannot fit under 1,900 with every keep-list rule intact, move the Task Structure worked example (the fenced block) to `skills/writing-plans/task-structure.md` behind a pointer in the Task Structure section, and repoint the needles that block carries (`**Gotchas:**`, `Expected, per test:`, `Produces: none`, and any other needle `grep -n` shows in that block) at the new file in `test-writing-plans.sh`, which this task owns. Add the new file to Files when you do.
- `scripts/task-brief` carries the field; no script change.

- [ ] **Step 1: Write the failing tests**

Add to `test-writing-plans.sh`: `**Review:** immediate | gate` — "task structure carries the review class"; `**Review class.**` — "review-class rule present"; `deletes or weakens a test, threshold, or lint rule` — "test-weakening is immediate"; `**Review class** — every task stamped` — "plan reviewer checks stamps".

- [ ] **Step 2: Run to verify they fail**

Run: `bash tests/toolbelt/test-writing-plans.sh`
Expected: `not ok - task structure carries the review class`.

- [ ] **Step 3: Implement**

Task Structure template: after the `**Interfaces:**` block add `**Review:** immediate | gate`. Task Right-Sizing: append the Data Model's Review class paragraph verbatim. Plan Review Gate: add the bullet `- **Review class** — every task stamped, each \`gate\` stamp consistent with the review-class rule`. Execution Handoff's closing sentence becomes: "Delivery runs toolbelt:subagent-driven-development per boundary: fresh subagent per task, immediate review or a batched gate by review class, broad whole-branch review at the end." (The spec's "unchanged" line refers to delivery's skill text, which this task does not touch.)

- [ ] **Step 4: Verify**

Run: `bash tests/toolbelt/test-writing-plans.sh && bash tests/toolbelt/test-execution-tracks.sh && test "$(wc -w < skills/writing-plans/SKILL.md)" -le 1900`
Expected: two `PASS`.

- [ ] **Step 5: Commit**

```bash
git add skills/writing-plans/SKILL.md tests/toolbelt/test-writing-plans.sh
git commit -m "writing-plans: Review class per task"
```

### Task 17: Brainstorming approval and spec review order

**Files:**
- Modify: `skills/brainstorming/SKILL.md`
- Modify: `skills/writing-specs/SKILL.md`
- Modify: `tests/toolbelt/test-interactive-design.sh`

**Interfaces:**
- Consumes: Task 4's rewrites
- Produces: none

**Gotchas:**
- Ceilings 650 and 550. The approval sentence replaces one bullet; the checklist swap changes numbering only.
- The user-gate quote is a needle nowhere; the brainstorming needles in `test-interactive-design.sh` stay.

- [ ] **Step 1: Write the failing tests**

Add to `test-interactive-design.sh` (it already loads `$brainstorming` and `$writing_specs`): `one approval when it fits three sections` on brainstorming; `Spec written, reviewed through <reviewer harness>` on writing-specs.

- [ ] **Step 2: Run to verify they fail**

Run: `bash tests/toolbelt/test-interactive-design.sh`
Expected: `not ok` on the first new needle.

- [ ] **Step 3: Implement**

brainstorming, Presenting the Design: replace "Ask after each section whether it looks right. Clarify when it doesn't land." with "When the whole design fits three sections, present them together and ask for one approval; otherwise ask after each section. Clarify when it doesn't land." Checklist item 5: `**Present the design** — one approval when it fits three sections, otherwise approval after each`.

writing-specs: checklist becomes 1 gather, 2 write, 3 self-review, 4 alternate-harness review, 5 user reviews the written spec, 6 transition. Review Gates order matches; the user-gate quote becomes: `"Spec written, reviewed through <reviewer harness> (<X> of <Y> findings applied), and committed to \`<path>\`. Please review it and let me know if you want to make any changes before we start writing out the implementation plan."` The alternate-harness paragraph adds: "Apply small technical gaps before the user gate and note the count in the gate message."

- [ ] **Step 4: Verify**

Run: `bash tests/toolbelt/test-interactive-design.sh && test "$(wc -w < skills/brainstorming/SKILL.md)" -le 650 && test "$(wc -w < skills/writing-specs/SKILL.md)" -le 550`
Expected: `PASS`.

- [ ] **Step 5: Commit**

```bash
git add skills/brainstorming/SKILL.md skills/writing-specs/SKILL.md tests/toolbelt/test-interactive-design.sh
git commit -m "One approval for small designs; machine spec review before the human gate"
```

### Task 18: Gate reviewer prompt, severity rule, implementer self-check

**Files:**
- Create: `skills/subagent-driven-development/gate-reviewer-prompt.md`
- Modify: `skills/subagent-driven-development/task-reviewer-prompt.md`
- Modify: `skills/requesting-code-review/code-reviewer.md`
- Modify: `skills/subagent-driven-development/implementer-prompt.md`
- Create: `tests/toolbelt/test-review-classes.sh`

**Interfaces:**
- Consumes: Data Model severity rule and self-check table; Task 15's UI smoke section
- Produces: `gate-reviewer-prompt.md` with placeholders `[MODEL]`, `[GLOBAL_CONSTRAINTS]`, `[KNOWN_GOTCHAS]`, `[TASKS]` (one line per task: number, brief path, report path, diff path), `[BATCH_DIFF_FILE]`, `[GATE_BASE_SHA]`, `[HEAD_SHA]`, `[SMELLS_FILE]`, `[DRIFT_ENTRIES]`, `[MINOR_FINDINGS]`; the self-check table in every implementer report

**Gotchas:**
- `test-reviewer-context.sh` requires in task-reviewer-prompt `docs/REVIEW-GUIDANCE.md`, `This file is reviewer-only.`, `[REVIEW_NUANCE]`, `does not override requirements,`, `[SMELLS_FILE]`, `This read is an explicit exception to the limits on`; and forbids `docs/REVIEW-GUIDANCE.md` and `smell-baseline` in implementer-prompt. The gate prompt carries the same reviewer-only line.
- Ceilings: gate prompt 700, task-reviewer 650, code-reviewer 450 after Task 7, implementer 550. After Task 9, task-reviewer-prompt is at exactly 650 and implementer-prompt at 316 (+ Task 15's additions): the severity rule replaces the Calibration paragraph word-for-word in budget, so cut the old Calibration entirely and add nothing else to task-reviewer-prompt; the self-check table (about 75 words) and the UI-smoke sentence must fit implementer-prompt's remaining headroom — tighten the Report Format bullets if they do not.
- The severity rule replaces Calibration in task-reviewer (keep the plan-mandated sentence) and code-reviewer (keep "If you find significant deviations from the plan, flag them").

- [ ] **Step 1: Write the failing test**

`tests/toolbelt/test-review-classes.sh` (create with the `assert_contains` helper from `test-ux-gate.sh`):
- gate prompt exists; contains `[BATCH_DIFF_FILE]`, `[TASKS]`, `Per task`, `Across the batch`, `This file is reviewer-only.`, and the severity rule's first sentence `names the input, state, or command under which the code misbehaves`
- task-reviewer-prompt and code-reviewer.md contain `names the input, state, or command under which the code misbehaves` and `let the orchestrator filter`
- implementer-prompt contains `| Check | Evidence |`, `| Requirements |`, `| Seen red |`, `| UI smoke |`, `| Deviations |`
- SDD needles (added in Task 19; guard with `[ -n "${SDD_READY:-}" ]` until then — Task 19 removes the guard)

- [ ] **Step 2: Run to verify it fails**

Run: `bash tests/toolbelt/test-review-classes.sh`
Expected: `not ok - gate prompt exists`.

- [ ] **Step 3: Implement**

`gate-reviewer-prompt.md`: the template from Spec C4 "gate-reviewer-prompt.md (new)" — header block like the other templates (`Subagent (role: reviewer)`, `description: "Gate review: tasks [A]–[B]"`, `model: [MODEL]`), body sections in order: What Binds Every Task (`[GLOBAL_CONSTRAINTS]`, `[KNOWN_GOTCHAS]`), Project Review Guidance (the reviewer-only paragraph verbatim from task-reviewer-prompt), The Tasks (`[TASKS]`), The Batch (`[GATE_BASE_SHA]`, `[HEAD_SHA]`, `[BATCH_DIFF_FILE]`, `[DRIFT_ENTRIES]`, `[MINOR_FINDINGS]`), Evidence limits (copied from task-reviewer-prompt), Output: `### Per task` (spec verdict ✅/❌/⚠️ with file:line against the brief; self-check audit — each row present and true against the diff; seen-red audit — every guard has red evidence or Important), `### Across the batch` (contract drift, duplicated logic, seams no test crosses, drift entries contradicting a sibling, tests asserting mocks), `### Findings` (Critical / Important / Minor with file:line, what is wrong, why it matters; how to fix optional), `### Verdict` (`Gate clean` | `Findings open`). Then the severity rule. Placeholder list at the end.

task-reviewer-prompt Calibration becomes the severity rule plus "If the plan or brief mandates something this rubric calls a defect, report it as Important, labeled plan-mandated. The human decides." Its Part 2 Tests bullet gains: "A diff that renders anything and reports no **UI smoke** run is Important." The gate prompt's per-task self-check audit carries the same sentence. code-reviewer Calibration becomes the severity rule plus the plan-deviation sentence.

implementer-prompt Report Format: after "What you tested and the results" add "**Self-check** — this table, every row filled; the orchestrator reads it mechanically:" followed by the Data Model table.

- [ ] **Step 4: Verify**

Run: `scripts/lint-shell.sh tests/toolbelt/test-review-classes.sh && bash tests/toolbelt/test-review-classes.sh && bash tests/toolbelt/test-reviewer-context.sh && bash tests/toolbelt/test-fix-loop.sh && bash tests/toolbelt/test-word-counts.sh`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add skills/subagent-driven-development/gate-reviewer-prompt.md skills/subagent-driven-development/task-reviewer-prompt.md skills/requesting-code-review/code-reviewer.md skills/subagent-driven-development/implementer-prompt.md tests/toolbelt/test-review-classes.sh
git commit -m "Gate reviewer prompt, failing-input severity rule, implementer self-check"
```

### Task 19: SDD gate mode and delivery step 4

**Files:**
- Modify: `skills/subagent-driven-development/SKILL.md`
- Modify: `skills/delivery/SKILL.md`
- Modify: `tests/toolbelt/test-review-classes.sh`
- Modify: `tests/toolbelt/test-final-review-gate.sh`
- Modify: `tests/toolbelt/test-fix-loop.sh`

**Interfaces:**
- Consumes: Task 18's prompt and self-check; Task 14's ux-gate contract; Data Model ledger lines. The `**Review:**` field is fixed by this plan's Data Model (Review class block), not by Task 16; SDD reads it by that name.
- Produces: SDD sections `## Self-check close` and `## Gates`

**Gotchas:**
- `test-final-review-gate.sh` needle `If the caller supplies a pre-final gate, run it after all task reviews and before the broad final review.` is replaced by `dispatch ux-gate's capture at the final gate's head in parallel with the gate reviewer`. Every other needle there stays, including `scripts/review-package --plan PLAN_FILE MERGE_BASE HEAD\` for the final review`, `**Final-review findings get ONE fix subagent**`, `Then run exactly one scoped re-review of the fix wave`, `There is no second fix wave`, `**One fix round per task.**`, `Adjudicate **only** after the re-review`.
- `test-fix-loop.sh` needles all stay; add the three Data Model ledger lines.
- SDD ceiling 1900. Task 9 landed the file at 1,680 (its 1,500 interim target was unreachable: 28 sentences are pinned verbatim by tests; ruled: the spec ceiling governs) and Task 15 adds two sentences. This task's two sections are about 300 words, so the file will not fit: move `## Constructing Reviewer Prompts` (about 177 words) to `skills/subagent-driven-development/reviewer-prompts.md` behind a one-sentence pointer in SKILL.md, and repoint its needles in `tests/toolbelt/test-reviewer-context.sh` (`Do not read it`, `while orchestrating or pass it to implementers, fixers, explorers, planners,`, `Use \`None\` when there is none.`) at the new file. Add both files to Files (seven total). If the file still exceeds 1,900, move `## File Handoffs` the same way; never cut a contract sentence.
- Remove the `SDD_READY` guard in `test-review-classes.sh` and add the SDD needles: `**Review:**`, `## Self-check close`, `## Gates`, `four \`gate\` tasks`, `1,500 changed lines`, `four or fewer tasks and no \`immediate\` task`, `Gate <G>: tasks`, `in parallel with the gate reviewer`, `presented to your human partner once, at the gate`.

- [ ] **Step 1: Write the failing tests**

Edit the three test files as the gotchas say.

- [ ] **Step 2: Run to verify they fail**

Run: `bash tests/toolbelt/test-review-classes.sh; bash tests/toolbelt/test-final-review-gate.sh; bash tests/toolbelt/test-fix-loop.sh`
Expected: each stops at its first new needle.

- [ ] **Step 3: Implement SDD**

The Process step 2 becomes: "Per task: record BASE, dispatch the implementer with its brief, answer its questions. On DONE, read the task's `**Review:**` class. An `immediate` task: build the review package, dispatch the task reviewer, run the fix loop, mark it complete. A `gate` task: run the self-check close and wait for its gate." Step 3 becomes: "After the last task, run the final gate (below); it is the broad final review. Then hand off." Replace "Optional pre-final gate" with the UX sentence in the Gates section.

`## Self-check close` (after Handling Implementer Status): the Data Model table's rules — every row present with pasted output; every Files path in the brief's Files block; a missing or claim-only row → resume the implementer once for that row; still incomplete, or a path outside the brief → the task flips to `immediate` and goes to task review; ledger `Task <N>: self-checked (commits <base7>..<head7>, gate pending)`; a task that returned `DONE_WITH_CONCERNS`, needed a re-dispatch, or whose diff stat exceeds 8 files or 400 changed lines flips to `immediate` regardless of its stamp.

`## Gates` (after The Fix Loop): triggers (last task of a named track completes; four `gate` tasks since the last gate; `git diff --shortstat GATE_BASE..HEAD` exceeds 1,500 changed lines; all tasks complete — the final gate); GATE_BASE definition; "A boundary with four or fewer tasks and no `immediate` task runs only the final gate. The final gate is the boundary's broad final review; it uses MERGE_BASE as GATE_BASE and reads the ledger's minor findings."; the reviewer dispatch (role `reviewer`, specialty `gate`, `--author-harness` the implementer's harness, `gate-reviewer-prompt.md`, inputs as files: constraints and gotchas; per task its brief, report, and `scripts/review-package --plan PLAN_FILE BASE HEAD`; the batch package `scripts/review-package --plan PLAN_FILE GATE_BASE HEAD`; the smell baseline; drift entries; the ledger's minor findings at the final gate); after the verdict exactly one fix wave (the existing final-review sentences, now applying to every gate) then exactly one scoped re-review then adjudication; "Plan-mandated findings collected across the batch are presented to your human partner once, at the gate."; ledger `Gate <G>: ...` and the per-task `complete (... gate <G> ...)` lines; "When the boundary is UX-gated, dispatch ux-gate's capture at the final gate's head in parallel with the gate reviewer; the two finding sets merge into the one fix wave; the re-review and the UX recapture run on the fixed head."

delivery Step 4: "When the boundary materially changes a user-visible surface, tell SDD the boundary is UX-gated; SDD runs ux-gate at the final gate." Keep "That broad final review is the slice gate; do not add another whole-slice review."

- [ ] **Step 4: Verify**

Run: `for t in test-review-classes test-final-review-gate test-fix-loop test-delivery test-execution-tracks test-reviewer-context test-word-counts test-doctrine; do bash tests/toolbelt/$t.sh || exit 1; done`
Expected: eight passes.

- [ ] **Step 5: Commit**

```bash
git add skills/subagent-driven-development/SKILL.md skills/delivery/SKILL.md tests/toolbelt/test-review-classes.sh tests/toolbelt/test-final-review-gate.sh tests/toolbelt/test-fix-loop.sh
git commit -m "SDD: self-check close for gate tasks, batched gates, UX gate beside the final gate"
```

### Task 20: Workflow docs

**Files:**
- Modify: `docs/WORKFLOW.md`
- Modify: `docs/AGENTS-SNIPPET.md`
- Modify: `README.md`
- Modify: `tests/toolbelt/test-workflow-summary.sh`
- Modify: `tests/toolbelt/test-delivery.sh`

**Interfaces:**
- Consumes: Tasks 16–19; merged tracks' drift entries are carried in this task's brief
- Produces: none

**Gotchas:**
- `test-delivery.sh` `$workflow` needles: `\`brainstorming\` and \`writing-plans\``, `one coherent delivery slice`, one multi-line needle (read the file), `implementation report and review-package path`, `without independently rereading the implementation or verification output`, `No separate resume state machine`, `one pr-monitor per chain`. All stay. `test-workflow-summary.sh` asserts only against `docs/AGENTS-SNIPPET.md` (`$summary`): `quick-task`, `delivery`, the planning needle, `redesign the capability, not this summary`, a forbidden-terms grep, and exactly two lines matching `^- \`[a-z-]+\`:`. The new snippet sentence must not be such a bullet.
- WORKFLOW.md ceiling 320.

- [ ] **Step 1: Write the failing tests**

Add to `test-delivery.sh` against `$workflow`: `reviewed by class` and `The UX gate runs beside the final gate`. Add to `test-workflow-summary.sh` against `$summary`: `review class`.

- [ ] **Step 2: Run to verify they fail**

Run: `bash tests/toolbelt/test-delivery.sh; bash tests/toolbelt/test-workflow-summary.sh`
Expected: `not ok` on `reviewed by class` and on `review class`.

- [ ] **Step 3: Implement**

WORKFLOW.md delivery paragraph: replace "A materially user-visible slice runs the UX gate after task reviews and before SDD's broad final review, which is the slice gate." with "Tasks are reviewed by class: `immediate` tasks get a task review on completion; `gate` tasks self-check with evidence and are reviewed together at a gate — track end, four tasks, 1,500 lines, or the boundary's final review, whichever comes first — by one top-tier cross-harness reviewer with one fix wave. The UX gate runs beside the final gate, which is the slice gate." AGENTS-SNIPPET.md: one plain sentence, not a `- \`name\`:` bullet — "Tasks carry a review class: `immediate` tasks are reviewed on completion, `gate` tasks self-check and are reviewed together at a gate." README: in the skills list, after subagent-driven-development, no new bullet; update the writing-plans bullet to mention review classes if it describes task structure, else leave.

- [ ] **Step 4: Verify**

Run: `bash tests/toolbelt/test-workflow-summary.sh && bash tests/toolbelt/test-delivery.sh && test "$(wc -w < docs/WORKFLOW.md)" -le 320`
Expected: two `PASS`.

- [ ] **Step 5: Commit**

```bash
git add docs/WORKFLOW.md docs/AGENTS-SNIPPET.md README.md tests/toolbelt/test-workflow-summary.sh tests/toolbelt/test-delivery.sh
git commit -m "Docs: review classes and the UX gate placement"
```

### Task 21: Release 8.0.0

**Files:**
- Modify: `package.json`
- Modify: `.claude-plugin/plugin.json`
- Modify: `.codex-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`
- Modify: `RELEASE-NOTES.md`

**Interfaces:**
- Consumes: everything
- Produces: none

**Gotchas:**
- Mechanical sweep: `scripts/bump-version.sh 8.0.0` edits the four files; verify with `scripts/bump-version.sh --check` and `scripts/bump-version.sh --audit`.
- RELEASE-NOTES.md entries are newest first, under `## vX.Y.Z (YYYY-MM-DD)`.

- [ ] **Step 1: Confirm the current version**

Run: `scripts/bump-version.sh --check`
Expected: every file at 7.9.1.

- [ ] **Step 2: Bump and write notes**

Run: `scripts/bump-version.sh 8.0.0`. Add `## v8.0.0 (2026-09-06)` to RELEASE-NOTES.md with one paragraph and three bullets: skills rewritten for frontier models (doctrine change, word ceilings, forceful blocks shrunk, TDD alone keeps a rationalization table); the UX gate (bundled `ux-capture`, mechanical checks, baseline diff, per-task implementer smoke, two-pass design review, `.toolbelt/ux-policy.md`); review classes (`Review: immediate | gate`, self-check, batched gates, gate reviewer, failing-input severity rule, UX gate beside the final gate, one approval for small designs, machine spec review before the human gate).

- [ ] **Step 3: Verify**

Run: `scripts/bump-version.sh --check && scripts/bump-version.sh --audit && for t in tests/toolbelt/*.sh tests/hooks/*.sh tests/shell-lint/*.sh; do bash "$t" || exit 1; done`
Expected: 8.0.0 everywhere, audit clean, every test passes (or `SKIP` for ux-capture without Playwright).

- [ ] **Step 4: Commit**

```bash
git add package.json .claude-plugin/plugin.json .codex-plugin/plugin.json .claude-plugin/marketplace.json RELEASE-NOTES.md
git commit -m "Release 8.0.0"
```
