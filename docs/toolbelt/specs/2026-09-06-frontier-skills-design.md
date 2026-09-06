# Frontier Skills Design

**Status:** Approved in conversation on 2026-09-06 after three Fable 5.1
research passes (skill unslopping, visual verification, review cadence).
Research reports and the fsmcrm evidence they drew on are summarised in
Background; the reports themselves are session scratch and not committed.

Three changes to the toolbelt, shipped as one release, 8.0.0:

1. Rewrite every skill for frontier models: plain imperatives, the reason
   once, forceful blocks only where a failure is expensive. About 27,000
   words become about 16,500.
2. Make the UX gate catch visual glitches and design misses: mechanical
   checks first, pixel diff against a baseline, a per-task smoke pass by the
   implementer, and a two-pass vision review that is allowed to judge design
   against the project's design system.
3. Review by risk, not by task: contract and risk-class tasks keep an
   immediate reviewer; the rest self-check with evidence and batch to gates
   reviewed by one top-tier cross-harness reviewer.

## Background

**Unslopping.** Anthropic's Fable 5 prompting page says skills written for
prior models "are often too prescriptive ... and can degrade output quality"
and that a brief instruction now steers most behaviour. The prompting
best-practices page says "CRITICAL: You MUST use this tool when..." phrasing
now causes overtriggering; the fix is "dial back any aggressive language".
The Opus 5 page says explicit verify-and-recheck instructions cause
over-verification and should be removed. Claude Code re-injects the most
recent invocation of each skill after auto-compaction (5,000 tokens per
skill, 25,000 combined), so what survives compaction is now decided by
length, not phrasing. The one measured counter-signal: Superpowers v6.2.0
found that deleting test-driven-development's rebuttal rows dropped
test-first behaviour under pressure from 8/10 to 5/10.

**Visual verification.** No harness we use accepts video; Claude and OpenAI
APIs take images only. Vision models reason through nameable labels and are
documented to miss unnamed fine detail: five frontier models missed a removed
street between two maps offset by 2px. Industry practice is deterministic
diff first, a vision model only on what changed. The owner's own catches in
fsmcrm (placeholder columns and disabled controls shipped, truncating
labels, a loading skeleton that did not match the final layout, shadcn cards
mixed into a tokenised redesign, wrong focus colour, action hierarchy) are
consistency and finish problems that the current gate text tells the
reviewer not to raise ("never personal taste"). fsmcrm now has a documented
design system (`docs/FRONTEND-RULES.md`, a `/dev/design-system` catalog, a
token palette CI check) that the reviewer is never pointed at, and a
hard-won capture harness notes file that no skill reads.

**Review cadence.** Reviewer accuracy collapses on diffs above roughly 150
lines, so batched review must stay per-task inside the batch. A strong
cross-model reviewer lifts quality; a weaker one measurably harms it.
Self-judgment rubber-stamps; self-verification by exogenous evidence does
not. Of 26 load-bearing findings in the owner's last six SDD workspaces, 13
came from the brief, not the code, and one task ran seven review rounds.
The 2026-09-01 spec kept per-task review on that data; this spec trades it
for risk-tiered review and reinvests the budget in the plan reviewer and
the gate reviewer.

## Constraints

- Skills hard-code no consuming repository, provider, or model. Model names
  appear only in `skills/agent-routing/defaults.json` and agent
  definitions. Per-project values live under `.toolbelt/`.
- One skill names exactly one next skill. Handoff chains do not change.
- "Your human partner" stays.
- No new npm dependencies in the plugin. The capture script resolves
  `playwright` from `PLAYWRIGHT_MODULE` when set, else from the consuming
  project's root (`--project-root`, default the working directory), and
  fails with a one-line instruction and exit 2 when neither resolves. There
  is no global-install lookup.
- No paid products. Video is a local Playwright recording, off by default.
- Every `tests/toolbelt/*.sh` and `tests/hooks/*` assertion a change makes
  false is updated in the same commit. The Testing section lists the known
  ones.
- Frontmatter descriptions change only where this spec says so
  (brainstorming, ux-gate, verification-before-completion,
  receiving-code-review).
- Version bumps to 8.0.0 with `scripts/bump-version.sh 8.0.0`, verified by
  `scripts/bump-version.sh --check`.

## Component 1: Doctrine

Changed before any skill is rewritten, because the rewrite is done under it.

### `CLAUDE.md`

The bullet "Preserve forceful blocks verbatim" becomes:

> **Forceful blocks are gates, not decoration.** `<HARD-GATE>` and
> `<ENTRY-GATE>` mark a step whose failure is expensive or irreversible.
> Keep them to two or three sentences: the condition, who owns the
> exception, and why. Rationalization tables exist only where a brief
> instruction measurably failed under pressure; today that is
> test-driven-development alone. Re-test them when the model changes.

The bullet "Keep them short" gains one sentence: "Claude Code re-injects a
skill after compaction, up to 5,000 tokens per skill; length, not phrasing,
decides what survives."

### `skills/writing-for-agents/SKILL.md`

Rewritten to at most 750 words as rules with one example each. Keeps, in
this order: context pointers (description wording decides triggering;
front-load the trigger; one trigger per branch); the two loads; the
information hierarchy and progressive disclosure (inline what every branch
needs, disclose what only some reach); completion criteria (checkable and
exhaustive); split by sequence or by invocation; leading words and
positive-over-prohibition; pruning (single source of truth, the
environment as a source of truth, relevance, the no-op test settled by
running the document).

The final bullet becomes:

> A gate earns forceful phrasing only where the failure is expensive or
> irreversible and a brief instruction measurably failed. Keep such blocks
> short, and re-test them when the model changes.

The coined-term glossary (context pointer, legwork, sediment, cache, sprawl
as named concepts) is dropped; each idea is stated once in plain words.
`SKILL-MECHANICS.md` is unchanged.

### `skills/writing-skills/SKILL.md`

At most 1,000 words. Changes:

- The Iron Law block, its "No exceptions" list, "Untested skills have
  issues. Always.", "Overconfidence guarantees issues", and "IMPORTANT:
  Create a todo for EACH item" are removed. The scope rule (new
  behaviour-shaping guidance needs a baseline; editing existing guidance
  does not) stays as one paragraph.
- "Match the Form to the Failure" stays whole, including the table and the
  wording-test evidence.
- "Bulletproofing Against Rationalization" opens with: "Use this only after
  a baseline shows the agent skipping a known rule under pressure and a
  brief instruction has failed to stop it. Frontier models overtrigger on
  aggressive phrasing; the default form is one sentence stating the rule
  and its reason." The four techniques stay, each one sentence. The
  "letter of the rules" block is removed.
- "The Description Field" keeps the rule and its one-line reason ("a
  description that summarised the workflow caused one review instead of
  two") and drops the five-example block to two examples, one wrong and one
  right.
- RED-GREEN-REFACTOR, Micro-Testing Wording, Testing by Skill Type, the
  rationalization table for skipping testing, and the Checklist move into
  `testing-skills-with-subagents.md` under matching headings; SKILL.md
  keeps a two-sentence pointer.

## Component 2: The unslop pass

Applies to every file in the table. Rules for the rewrite:

- Plain imperatives. State the goal, the constraint, and the reason once.
- Keep every gate condition, exact command, exact path, exact file
  contract, ledger line format, handoff line, quoted user-facing message,
  and table, unless a component of this spec changes it.
- Remove: `<EXTREMELY-IMPORTANT>`; "Violating the letter of the rules is
  violating the spirit"; threat language ("lying", "you'll be replaced");
  Red Flags lists and rationalization tables except where the table below
  keeps one; "Common Mistakes", "Never/Always", and "Quick Reference"
  sections that restate steps; example transcripts; ALL-CAPS pseudo-code;
  "IMPORTANT:", "MUST", and "ALWAYS" as emphasis.
- `<HARD-GATE>` and `<ENTRY-GATE>` tags stay, shrunk to two or three
  sentences each.
- Descriptions do not shout. brainstorming's becomes: "Use before creating
  features, building components, adding functionality, or changing
  behaviour. Explores intent, requirements, and design before
  implementation."
- Before rewriting a file, list the lines `tests/toolbelt/*.sh` and
  `tests/hooks/*` assert on for that file; keep them verbatim or change the
  test in the same commit.

Word ceilings, enforced by `tests/toolbelt/test-word-counts.sh`:

| File | Today | Ceiling |
|---|---|---|
| `skills/using-toolbelt/SKILL.md` | 535 | 300 |
| `skills/verification-before-completion/SKILL.md` | 811 | 300 |
| `skills/receiving-code-review/SKILL.md` | 801 | 300 |
| `skills/writing-skills/SKILL.md` | 2211 | 1000 |
| `skills/writing-for-agents/SKILL.md` | 1618 | 750 |
| `skills/systematic-debugging/SKILL.md` | 1122 | 600 |
| `skills/test-driven-development/SKILL.md` | 1127 | 600 |
| `skills/brainstorming/SKILL.md` | 1019 | 650 |
| `skills/finishing-a-development-branch/SKILL.md` | 1389 | 850 |
| `skills/using-git-worktrees/SKILL.md` | 1259 | 750 |
| `skills/dispatching-parallel-agents/SKILL.md` | 503 | 320 |
| `skills/requesting-code-review/SKILL.md` | 584 | 350 |
| `skills/requesting-code-review/code-reviewer.md` | 622 | 500 |
| `skills/interactive-design/SKILL.md` | 1705 | 1200 |
| `skills/subagent-driven-development/SKILL.md` | 2138 | 1900 |
| `skills/subagent-driven-development/task-reviewer-prompt.md` | 851 | 650 |
| `skills/subagent-driven-development/implementer-prompt.md` | 397 | 550 |
| `skills/subagent-driven-development/re-review-prompt.md` | 418 | 420 |
| `skills/subagent-driven-development/gate-reviewer-prompt.md` | new | 700 |
| `skills/writing-plans/SKILL.md` | 2289 | 1900 |
| `skills/ux-gate/SKILL.md` | 742 | 950 |
| `skills/writing-specs/SKILL.md` | 648 | 550 |
| `skills/delivery/SKILL.md` | 936 | 900 |
| `skills/pr-monitor/SKILL.md` | 856 | 850 |
| `skills/agent-routing/SKILL.md` | 834 | 800 |
| `skills/quick-task/SKILL.md` | 194 | 200 |
| `docs/WORKFLOW.md` | 290 | 320 |
| `skills/writing-plans/execution-tracks.md` | new | 360 |
| `skills/subagent-driven-development/parallel-tracks.md` | new | 420 |
| `skills/interactive-design/iteration-mode.md` | new | 500 |
| `skills/writing-skills/testing-skills-with-subagents.md` | 2447 | 1800 |

Ceilings above today's count are files that gain rules from Components 3
and 4. The pass is a rewrite for those files, not an exemption. The four
disclosed side files carry ceilings so disclosure cannot become an escape
hatch from the table; a later disclosure adds a row in the same commit.

### Per-file keep lists

Each file keeps the items named here; everything else is subject to the
rules above.

- **using-toolbelt.** `<SUBAGENT-STOP>`; invoke a relevant skill before any
  response, including clarifying questions, with the reason (the skill sets
  the approach); brainstorming before plan mode; process skills before
  implementation skills; agent-routing before the first dispatch, fail
  closed; the Codex pointer to `references/codex-tools.md`; user
  instructions outrank skills. The 12-row Red Flags table is replaced by
  one sentence: "A question, a file check, or a small task is still a task;
  check for a skill first."
- **verification-before-completion.** Description becomes: "Use before
  claiming work is complete, fixed, or passing, and before committing or
  opening a PR." Body: "Before reporting status, audit each claim against a
  tool result from this session. A claim with no run behind it is not made.
  Scope the claim to the evidence: if you ran one package, say that package
  passed. A regression test counts once it has been seen red and then
  green. An agent's success report is a claim; read the diff." Plus the
  table of claims and their evidence, trimmed to tests, build, bug fixed,
  agent completed.
- **receiving-code-review.** Description becomes: "Use when acting on code
  review feedback from a person or an external reviewer, before
  implementing it." Keeps: verify each item against the codebase before
  implementing; an unclear item blocks the batch, ask about all unclear
  items at once; feedback from your human partner is trusted after
  understanding, external feedback is checked for correctness, breakage,
  the reason for the current code, and platform fit; a conflict with your
  human partner's earlier decision goes to them; grep for callers before
  accepting "unused"; the `gh api` reply mechanic. The Forbidden Responses
  section, the gratitude ban, and the ALL-CAPS response pattern are
  removed.
- **writing-skills, writing-for-agents.** Component 1.
- **systematic-debugging.** Root cause before any fix, with the reason;
  the four phases as one list; instrument each boundary in multi-component
  systems; one hypothesis, one change; a failing test before the fix; three
  failed fixes means question the architecture; pointers to the three
  technique files. The Iron Law block, Red Flags, rationalization table,
  and "Signals From Your Human Partner" are removed.
- **test-driven-development.** The Iron Law one-liner; "delete means
  delete" with its loophole list as one sentence; verify RED for the right
  reason; ask before taking an exception; a five-row rationalization table
  keeping the rows on tests-after, sunk cost, keep-as-reference,
  too-simple-to-test, and I'll-test-manually; the pointer to
  `writing-good-tests.md`. The Red Flags list, the four Good/Bad code
  blocks, and the completion checklist are removed.
- **brainstorming.** The HARD-GATE (shrunk); the checklist; the visual
  companion rule and file path; the frontend-first offer text and the
  own-message rule; the Claude Design variant; the After the Design
  handoff. The terminal state is stated once. Component 4 changes the
  approval rule.
- **finishing-a-development-branch.** Steps 1 to 6 with the exact-head
  evidence reuse and docs-only cases, GIT_DIR and GIT_COMMON detection, the
  exact 4- and 3-option menus, typed "discard", the squash-merge guard,
  provenance cleanup, the completion contract, and the PR handoff lines.
  Quick Reference, Common Mistakes, Never, and Always are removed.
- **using-git-worktrees.** Detection including the submodule guard; native
  tool first with the reason; the ignore check; the policy-file contract;
  the source ref; the report format; the focused baseline. The
  rationalization table is removed; the polyglot setup script becomes one
  sentence ("install dependencies the way the project's manifest says").
- **dispatching-parallel-agents.** When to parallelise, what a focused
  brief carries, how to integrate results. The ❌/✅ mistakes list is removed.
- **requesting-code-review, code-reviewer.md.** Merge-base-not-HEAD~1 with
  its reason; the review-package and DIFF_FILE contract; REVIEW-GUIDANCE is
  reviewer-only; the output format. The example transcript, the
  Mandatory/Optional lists, and "accurate praise helps the implementer
  trust" are removed. Component 4 adds the failing-input rule.
- **interactive-design.** The ENTRY-GATE rewritten as one block naming all
  three entries in two sentences; the fixture HARD-GATE; the ledger format
  and statuses; exit reconciliation; what the spec must carry. §8 moves to
  `iteration-mode.md` behind a pointer that fires on the third entry.
  Component 3 changes the exit step about screenshots.
- **subagent-driven-development.** Every contract. Parallel Tracks moves to
  `parallel-tracks.md` behind a pointer that fires when the plan declares
  `## Execution Tracks`. The "Never" list stays under the heading
  "Ownership rules". Component 4 adds gate mode.
- **writing-plans.** Every contract. The Execution Tracks declaration rules
  and example table move to `execution-tracks.md` behind a pointer in the
  section that requires them. `plan-document-reviewer-prompt.md` is
  deleted; the Plan Review Gate bullets are the reviewer's brief.
- **ux-gate.** Rewritten under Component 3.
- **delivery, pr-monitor, agent-routing, writing-specs, quick-task,
  implementer-prompt, re-review-prompt, task-reviewer-prompt.** Light pass;
  Components 3 and 4 change specific rules.
- **The docs-only carry-forward rule** (Markdown under `docs/**` or at the
  repository root, or `.toolbelt/**` scratch; never a file the application
  builds, renders, or serves) is stated once, in
  finishing-a-development-branch Step 1, and referenced by pr-monitor and
  ux-gate with the words "the docs-only rule in
  toolbelt:finishing-a-development-branch Step 1".

### `hooks/session-start`

The wrapper tag `<EXTREMELY_IMPORTANT>` becomes `<TOOLBELT>`; the text
inside it is unchanged.

## Component 3: Visual verification

### Ownership

Delivery's role table changes two rows and adds one:

| Work | Owner |
|---|---|
| UI smoke per task (mechanical checks and stills of the touched pathway) | Implementer, inside its task, before reporting DONE |
| UX capture at the boundary (full matrix, diff, filmstrips) | Gate operator (role `errand`) dispatched by the orchestrator |
| UX judgment | Reviewer routed with specialty `ux` |

The sentence "Neither the orchestrator nor the implementer captures UX
evidence" becomes "The orchestrator never captures UX evidence; the
implementer captures only its own task's smoke pass."

### The capture script

`skills/ux-gate/scripts/ux-capture` (Node, ESM, executable). Usage:

```
ux-capture <matrix.json> --out <dir> [--smoke] [--baseline <dir>] [--video] [--pathway <name>]...
```

- `--smoke`: first viewport only, every theme, mechanical checks, no axe, no
  filmstrips, no diff. Exit 1 when any mechanical finding is at or above
  `should`.
- `--baseline <dir>`: after capture, diff each PNG against the same-named
  PNG in the baseline. The diff is computed in the browser: both images
  drawn on canvases in a blank page, pixel compare with a per-channel
  tolerance of 8 and antialias-aware neighbour check, output the changed
  bounding box and changed-pixel ratio. Captures with a ratio under 0.001
  are recorded `unchanged` and excluded from the reviewer set. Changed
  captures get a crop of the changed box padded by 24px at DPR 2, saved as
  `<tag>-diff-crop.png`.
- `--video`: `recordVideo` on every context, saved under `<out>/video/`.
  Never referenced by the reviewer set.
- `--pathway <name>`: restrict to named pathways (fix rounds).

Per capture the script records in `<out>/mechanical.json` an entry:

```json
{"tag":"settings-save-error-375-dark","pathway":"settings","step":"save",
 "state":"error","width":375,"theme":"dark","dpr":2,
 "files":{"still":"settings-save-error-375-dark.png","crops":[],"filmstrip":null,"diffCrop":null},
 "diff":{"status":"changed|unchanged|new","ratio":0.012,"box":[x,y,w,h]},
 "checks":[{"check":"element-overflow","severity":"should","selector":"button.save","by":18}],
 "cls":0.02,"clsSources":["DIV.toolbar"],"console":[],"failedRequests":[],
 "fonts":"loaded","axe":[{"id":"color-contrast","impact":"serious","nodes":2}]}
```

Mechanical checks, all run in-page after `networkidle` and two animation
frames, each producing a `check` entry with a severity:

| Check | Severity | Rule |
|---|---|---|
| `page-overflow` | blocker | `documentElement.scrollWidth > clientWidth + 1` |
| `element-overflow` | should | a visible leaf's right or bottom edge exceeds its nearest sized ancestor that is not `overflow: auto|scroll`, unless the element or an ancestor matches an `allowOverflow` selector |
| `clipped-text` | should | a text-bearing leaf with `scrollWidth > clientWidth + 1`, computed `overflow-x` not `visible`, and `text-overflow` not `ellipsis` |
| `overlap` | should | two visible leaves, neither an ancestor of the other, neither `position: absolute|fixed`, whose rects intersect by more than 4px on both axes, unless either matches an `allowOverlap` selector |
| `unclickable` | blocker | for each visible `button`, `a[href]`, `[role=button]`, `input`, `select`, `textarea`: `elementFromPoint` at the centre is neither the control nor inside it nor an ancestor of it |
| `tap-target` | nit | at widths under 500, an interactive control smaller than 44×44 CSS px |
| `layout-shift` | should | cumulative `layout-shift` entries without recent input exceed 0.1 between `load` and capture; sources recorded |
| `console-error` | should | any `console` message of type `error` during the step |
| `failed-request` | should | any response with status ≥ 400 or a `requestfailed` event during the step |
| `broken-image` | should | `img.complete && naturalWidth === 0` |
| `font-fallback` | should | `document.fonts.status !== "loaded"` after 3s, or a declared family in `matrix.fonts` for which `document.fonts.check` is false |
| `theme-leak` | should | in a dark theme, a visible element whose computed background luminance exceeds 0.9 and whose area exceeds 2,000 CSS px², unless it matches an `allowLight` selector |
| `axe` | as reported | `@axe-core/playwright` violations when the module resolves from the project; otherwise the entry `"axe":"unavailable"` |

Stills: viewport-height PNG per step, `animations: 'disabled'`,
`caret: 'hide'`. Full page only when the step sets `fullPage: true`. DPR
from the viewport entry. Component crops for each selector in the step's
`crops` list at DPR 2.

Filmstrips: for a step with `motion: true`, frames at 0, 150, and 400 ms
after the action, plus one frame with `reducedMotion: 'reduce'`, stitched in
the browser onto one canvas with a label under each frame and saved as
`<tag>-filmstrip.png` at half scale.

File naming: `<pathway>-<step>-<state>-<width>-<theme>[-crop-<n>|-filmstrip|-diff-crop].png`.

The script's dependencies are `playwright` (resolved as the Constraints
say) and optionally `@axe-core/playwright`. Nothing else.

### The matrix file

`.toolbelt/ux/matrix.json`, written by whoever runs the script, ignored
scratch:

```json
{
  "baseUrl": "http://localhost:3000",
  "storageState": ".toolbelt/ux/auth.json",
  "theme": {"mode": "class", "target": "html", "values": {"light": "", "dark": "dark"}},
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
       {"name": "save", "action": "click", "selector": "button[type=submit]", "state": "error", "motion": true, "waitFor": "text=Could not save"}
     ]}
  ]
}
```

`theme.mode` is one of `media` (emulate `prefers-color-scheme`), `class`
(set the class on `target`), `attribute` (set `data-theme` on `target`), or
`localStorage` (set `key` to the value before navigation). `waitFor` is a
Playwright selector the step waits for before capturing; a step that times
out is recorded as `{"check":"step-failed","severity":"blocker"}` with the
error, and the step's still is still taken. `referenceScreens` are two
unchanged routes captured at the first viewport in every theme and sent to
the reviewer as design-system exemplars.

### The project policy file

`.toolbelt/ux-policy.md`, optional, read by the gate operator and by an
implementer before its smoke pass. Sections, each optional:

- **Launch** — the command that serves the app and the URL.
- **Auth** — how to obtain `storageState`, or the login steps.
- **Theme** — the `theme` object for the matrix.
- **Data** — seed or fixture commands and the actors to use.
- **Viewports and themes** — the supported set; overrides the defaults
  above.
- **Allowed exceptions** — the `allowOverflow`, `allowOverlap`, and
  `allowLight` selectors.
- **Design reference** — the design-system doc, the catalog route, and any
  token or palette check command. The reviewer reads the doc and runs
  nothing.
- **Reference screens** — two routes.
- **Harness notes** — capture gotchas learned in this project.

When the file is absent, the operator infers Launch, Auth, and Theme,
records each inference in the run manifest, and uses the default viewports
and both themes.

### `skills/ux-gate/SKILL.md`

Description becomes: "Use to verify changed user-visible surfaces before a
boundary's final review: scripted capture, mechanical checks, pixel diff
against a baseline, and a two-pass vision review. Returns Pass or Changes
Required."

The skill keeps: the announce line; the entry bundle; the verdict contract
bound to the head SHA; "The gate does not fix anything."; runtime preflight
("nothing downstream may claim UX was verified"); pathways derived from the
diff; the throwaway matrix under `.toolbelt/ux/`; the routed `ux` reviewer
that must be vision-capable and never drives the browser;
`docs/REVIEW-GUIDANCE.md` for the reviewer; "a finding, not a skip";
"rerun the capture script on the new head"; "a new push invalidates prior
evidence"; "before the final gate verdict"; "One primary UX reviewer by
default"; "Do not manufacture states by editing app source"; the
carry-forward invalidation rule; the pathways-vs-screenshot-count report.

Changed rules:

1. **Capture is the bundled script.** "Write a throwaway Playwright script"
   becomes "Write the matrix and run `scripts/ux-capture` from this skill's
   directory." The naming convention line becomes the script's.
2. **Every supported theme, every time.** "Themes: supported themes only,
   and only when theme-specific styles or tokens changed" becomes "Capture
   every supported theme for every changed surface; new markup with
   hard-coded colours is where dark-mode regressions come from."
3. **States beyond the criteria.** After the criteria-named states: "Also
   exercise hover, focus, and keyboard reach on each changed control, one
   scroll position past the fold when the surface scrolls, and every step
   that opens, closes, or transitions, marked `motion`."
4. **Baseline.** "Diff against the baseline: the interactive-design
   prototype captures at `.toolbelt/ux/baseline/` when they exist,
   otherwise a capture of the base branch at the same matrix. Send the
   reviewer only changed and new captures, their diff crops, filmstrips,
   and the reference screens."
5. **Mechanical findings first.** "Every mechanical finding at `should` or
   above is a finding before any image reaches the reviewer. Route them to
   the fix loop with the capture; the reviewer sees the remaining set."
6. **Two-pass review.** The reviewer dispatch carries images before text,
   each labelled `Image N: <tag>`, then the acceptance criteria, the
   mechanical report, the design reference doc's path when the policy names
   one, and this instruction:

   > Pass 1, criteria: for each acceptance criterion, met, not met, or not
   > evidenced, with the image that shows it.
   >
   > Pass 2, design: judge the changed surfaces against the project's design
   > reference and the two reference screens using these checks: spacing
   > on the project's scale (default 8pt); alignment to shared edges; type
   > scale and hierarchy; contrast; internal padding no larger than
   > external margin; one primary action per context; components composed
   > from the project's primitives rather than ad hoc equivalents; empty,
   > loading, and error states that match the loaded layout; no placeholder
   > or disabled controls shipped as final. Then answer once: where would a
   > designer wince, and why?
   >
   > Every finding carries a severity (blocker, should, nit), the image
   > reference, the component or file when you can name it, expected, and
   > actual. A finding without an image reference is not a finding.

   "against the approved criteria — never personal taste" is removed.
7. **Routing findings.** "A finding the reviewer could not attach to a file
   is mapped by the operator from the diff, not discarded." The line
   "findings missing a screenshot or component file are unroutable and do
   not count" becomes "a finding without a screenshot reference does not
   count".
8. **Fix loop.** Blockers and shoulds enter the fix loop; nits are listed in
   the PR description. Rerun mechanical checks over the whole matrix and
   stills for affected pathways plus the nearest unchanged neighbour, diff
   against the previous round's captures, send only changed images. Two
   rounds, then the owner gets the receipts.
9. **Budget.** "Per round: at most 25 images, desktop at DPR 1, crops at
   DPR 2, filmstrips only where motion exists, video never."
10. **Placement.** Component 4 runs the gate in parallel with the
    boundary's final code gate over the same head.

### Per-task smoke

`implementer-prompt.md` gains a section after Verification:

> ## UI smoke
>
> If your diff touches a file the app renders — a component, template,
> style, route, or copy shown on screen — run the smoke pass before
> reporting DONE: [UX_SMOKE_COMMAND] for the pathway your task changes.
> Fix every finding it reports at `should` or above inside this task.
> Report the run's `mechanical.json` path and the still paths under
> **UI smoke** in your report; write `UI smoke: not applicable` when your
> diff renders nothing.

The orchestrator fills `[UX_SMOKE_COMMAND]` from the ux-policy Launch and
Theme sections and the script path, and writes `not applicable` for a plan
with no user-visible surface. The task reviewer and gate reviewer treat a
missing UI smoke entry on a rendering diff as an Important finding.

### Baseline from interactive-design

§4 step 2 changes from "keep no prototype screenshots" to: "Run
`scripts/ux-capture` from the ux-gate skill against the approved prototype
with the session's `.toolbelt/ux/matrix.json` and keep the output at
`.toolbelt/ux/baseline/`. The gate diffs against it." The ledger's
Acceptance criteria section records the matrix path, and the matrix lists
every surface the acceptance criteria name.

### Routing

`skills/agent-routing/defaults.json` adds:

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

The `reviewer` role's fallback changes from `opus-5`/`high` to
`fable-5-1`/`high`. The agent-routing Roles table lists specialty `gate`.

## Component 4: Review cadence

### `skills/writing-plans/SKILL.md`

Task Structure gains a field after `**Interfaces:**`:

```markdown
**Review:** immediate | gate
```

Rule, added to Task Right-Sizing:

> **Review class.** A task is `immediate` when any of these hold: it is in a
> `serial-N` track before a fork, or its `Produces:` is consumed by two or
> more later tasks or by a task in another track; it touches auth,
> authorization, tenancy scoping, a migration or shared schema, secrets or
> crypto, payments, a destructive data operation, or CI, build, or release
> configuration; it deletes or weakens a test, threshold, or lint rule. Every
> other task is `gate`. The plan reviewer checks each stamp against these
> conditions.

The Plan Review Gate gains the bullet: "**Review class** — every task
stamped, each `gate` stamp consistent with the review-class rule."

Delivery's skill text for the handoff is unchanged; writing-plans'
Execution Handoff closing sentence becomes "fresh subagent per task,
immediate review or a batched gate by review class, broad whole-branch
review at the end."

### `skills/subagent-driven-development/SKILL.md`

The Process step 2 becomes: "Per task: record BASE, dispatch the
implementer with its brief, answer its questions. On DONE, an `immediate`
task goes to task review as before. A `gate` task goes through the
self-check close and waits for its gate."

**Self-check close** (new section). Read the report's self-check table:

| Check | Evidence |
|---|---|
| Requirements | one row per requirement in the brief → file:line or test name |
| Files | `git diff --stat BASE..HEAD` pasted; every path is in the brief's Files block |
| Seen red | per guard: command and failing line |
| Covering suite | command and last passing line |
| Produces | the implemented signatures beside the brief's `Produces:` block, or `none` |
| UI smoke | run path and stills, or `not applicable` |
| Deviations | named, or `None` |

Every row must be present with pasted output, and every path in the Files
row must appear in the brief's Files block. If a row is missing or is a
claim without output, resume the implementer once for that row. If it is
still incomplete, or a path is outside the brief, the task flips to
`immediate` and goes to task review. Ledger line:
`Task <N>: self-checked (commits <base7>..<head7>, gate pending)`.

A task that returned `DONE_WITH_CONCERNS`, needed a re-dispatch, or whose
diff stat exceeds 8 files or 400 changed lines flips to `immediate`
regardless of its stamp.

**Gates** (new section). A gate runs when the first of these occurs: the
last task of a named track completes; four `gate` tasks have accumulated
since the last gate; `git diff --shortstat GATE_BASE..HEAD` exceeds 1,500
changed lines; or the boundary's tasks are all complete (the final gate).
GATE_BASE is the head the previous gate reviewed, or the boundary's start.

A boundary with four or fewer tasks and no `immediate` task runs only the
final gate. The final gate is the boundary's broad final review; it uses
MERGE_BASE as GATE_BASE and reads the ledger's minor findings.

Dispatch one reviewer resolved with role `reviewer`, specialty `gate`, and
the implementer's harness as `--author-harness`, using
`gate-reviewer-prompt.md`. Inputs, as files: the plan's Global Constraints
and Known Gotchas; per task in the batch its brief, report, and
`scripts/review-package --plan PLAN_FILE BASE HEAD` package; the batch
package `scripts/review-package --plan PLAN_FILE GATE_BASE HEAD`; the smell
baseline; the track's drift-log entries; the ledger's minor findings at the
final gate. The existing line "`scripts/review-package --plan PLAN_FILE
MERGE_BASE HEAD` for the final review" stays.

After the verdict: exactly one fix wave — one fixer with the complete list
of Critical and Important findings and spec gaps — then exactly one scoped
re-review of the fix wave with `re-review-prompt.md`, then adjudication as
at the task loop. Plan-mandated findings collected across the batch are
presented to your human partner once, at the gate. Ledger line:
`Gate <G>: tasks <a>–<b>, base <sha7>, head <sha7>, <X> findings, fix wave
<a7>..<b7>, verdict <clean|open>`. When a gate closes clean, every task in its batch
gets its `Task <N>: complete (commits <base7>..<head7>, gate <G>, route
<harness>/<model>/<effort>, report <path>)` line.

When the boundary is UX-gated, dispatch ux-gate's capture at the final
gate's head in parallel with the gate reviewer; the two finding sets merge
into the one fix wave; the re-review and the UX recapture run on the fixed
head. The existing "Optional pre-final gate" paragraph is replaced by this.

The task fix loop is unchanged for `immediate` tasks.

Verification Scope is unchanged.

### `gate-reviewer-prompt.md` (new)

A template in the SDD directory. Its body, in order: the plan's constraints;
the per-task list with brief, report, and diff paths; the batch diff path;
the reviewer-only guidance line and the smell baseline; the evidence limits
from the task-reviewer prompt (read each input once, one targeted read per
suspected finding, at most one focused test run, working tree untouched,
no subagents); then the required output:

1. **Per task**: spec verdict ✅ / ❌ / ⚠️ with file:line, reading that
   task's diff against its brief; a self-check audit (each row present and
   true against the diff); a seen-red audit (every guard has red evidence or
   the task gets an Important).
2. **Across the batch**: contract drift between tasks, duplicated logic
   across tasks, a seam no test crosses, drift-log entries that contradict
   a sibling, tests that assert mocks rather than behaviour.
3. **Findings** under Critical, Important, Minor, each with file:line,
   what is wrong, and why it matters. "How to fix" is optional.

The severity rule, also added to `task-reviewer-prompt.md` and
`code-reviewer.md` in place of their Calibration text:

> A Critical or Important finding names the input, state, or command under
> which the code misbehaves. A finding that cannot name one is Minor. Report
> everything you see and let the orchestrator filter.

### `implementer-prompt.md`

Report Format gains the self-check table above, required for every task
("the orchestrator reads it mechanically"). The After Review Findings
table is unchanged.

### `skills/delivery/SKILL.md`

Step 4 becomes: "When the boundary materially changes a user-visible
surface, tell SDD the boundary is UX-gated; SDD runs ux-gate at the final
gate." The role table gains the Component 3 rows. "That broad final review
is the slice gate; do not add another whole-slice review." stays.

### `skills/brainstorming/SKILL.md`

Presenting the Design, the bullet "Ask after each section whether it looks
right" becomes: "When the whole design fits three sections, present them
together and ask for one approval; otherwise ask after each section."
Checklist item 5 reads "Present the design — one approval when it fits
three sections, otherwise approval after each."

### `skills/writing-specs/SKILL.md`

Checklist items 4 and 5 swap: alternate-harness review runs after
self-review, and the user review gate runs on the reviewed spec. The user
gate message becomes:

> "Spec written, reviewed through <reviewer harness> (<X> of <Y> findings
> applied), and committed to `<path>`. Please review it and let me know if
> you want to make any changes before we start writing out the
> implementation plan."

The ENTRY-GATE is unchanged in meaning; the prose rules of Component 2
apply.

### `docs/WORKFLOW.md`

The delivery paragraph adds: "Tasks are reviewed by class: `immediate`
tasks get a task review on completion; `gate` tasks self-check with
evidence and are reviewed together at a gate — track end, four tasks, 1,500
lines, or the boundary's final review, whichever comes first — by one
top-tier cross-harness reviewer with one fix wave. The UX gate runs beside
the final gate." The sentence "A materially user-visible slice runs the UX
gate after task reviews and before SDD's broad final review" is replaced by
that.

## Component 5: Docs and release

- `README.md`: the ux-gate line becomes "Mechanical checks, pixel diff, and
  two-pass vision review for user-visible changes"; the
  verification-before-completion and receiving-code-review lines match
  their new descriptions.
- `docs/ADOPTING-IN-A-PROJECT.md` gains `.toolbelt/ux-policy.md` in the
  per-project files list with its section names.
- `docs/AGENTS-SNIPPET.md` gains one line naming the review classes.
- Version 8.0.0.

## Error handling

- Capture script cannot resolve `playwright`: exit 2 with the one-line
  install instruction; the gate records "cannot run" and no downstream step
  may claim UX was verified (the existing preflight rule).
- A step's `waitFor` times out: `step-failed` blocker recorded, still taken,
  run continues.
- `--baseline` given but a capture has no baseline file: `diff.status:
  "new"`, included in the reviewer set.
- `@axe-core/playwright` absent: `"axe":"unavailable"`, no failure.
- Self-check row incomplete after one resume: task flips to `immediate`.
- Gate reviewer route fails to resolve: stop and tell your human partner
  (agent-routing's existing fail-closed rule).
- Smoke pass reports findings the implementer cannot fix within the task's
  Files block: `DONE_WITH_CONCERNS`, which flips the task to `immediate`.
- Word-count ceiling exceeded: the test fails; the file is cut, never the
  ceiling raised, except by a later spec.

## Testing

Existing assertions that become false, each replaced in the same commit:

- `tests/toolbelt/test-ux-gate.sh`: "throwaway Playwright script",
  "`<pathway>-<step>-<state>-<width>[-<theme>].png`", "only when
  theme-specific styles or tokens changed or the acceptance criteria require
  them", "against the approved criteria — never personal taste", "component
  file + visual state + viewport + specific deviation + screenshot
  reference", "a shared style or token change invalidates every consuming
  capture" (kept if the sentence survives the rewrite, else replaced).
- `tests/toolbelt/test-final-review-gate.sh`: "If the caller supplies a
  pre-final gate, run it after all task reviews and before the broad final
  review." → the gate-mode sentence.
- `tests/toolbelt/test-fix-loop.sh`: needles stay; add the self-check and
  gate ledger lines.
- `tests/toolbelt/test-delivery.sh`: "ux-gate" and "broad final review is
  the slice gate" stay; check the role-table needles.
- `tests/toolbelt/test-interactive-design.sh`: "Acceptance criteria" stays;
  brainstorming's "The offer MUST be its own message" → "The offer is its
  own message"; "[PENDING]" and "a placeholder without" stay in `SKILL.md`
  (the test requires "[PENDING]" inside the HARD-GATE block); "before §4's
  reconciliation may run" and "toolbelt:quick-task" point at
  `iteration-mode.md`; "the single route confirmed in §8" → "the route
  confirmed in iteration-mode.md", which is also §4 step 4's new wording.
  The test's frontmatter `sed` expression is replaced with a portable `awk`
  so it runs on BSD sed.
- `tests/toolbelt/test-writing-plans.sh`: needles stay; the Execution
  Tracks needles in `test-execution-tracks.sh` point at
  `execution-tracks.md`.
- `tests/toolbelt/test-worktree-baseline.sh`: "Satisfy Step 3 now"
  (rationalization table) → removed.
- `tests/toolbelt/test-word-counts.sh`: the Component 2 table replaces the
  current one.
- `tests/hooks/test-session-start.sh`: any needle on `EXTREMELY_IMPORTANT`
  → `TOOLBELT`.
- `tests/toolbelt/test-agent-routing.sh`: the bundled-defaults expectations
  gain the two specialties and the new reviewer fallback.

New assertions:

- `tests/toolbelt/test-ux-capture.sh`: with a fixture HTML page served from
  a temp directory by a Node static server, a matrix naming one pathway with
  an element overflowing its card, a covered button, a dark theme with a
  hard-coded white block, and a `motion` step: the script exits 1 in
  `--smoke`, `mechanical.json` contains `element-overflow`, `unclickable`,
  and `theme-leak` entries with the expected selectors, a filmstrip file
  exists, and a second run with `--baseline` over an unchanged page marks
  every capture `unchanged`. Skipped with a clear message when `playwright`
  does not resolve on the machine.
- `tests/toolbelt/test-review-classes.sh`: writing-plans carries
  `**Review:** immediate | gate` and the review-class rule; SDD carries the
  self-check table headers, the four gate triggers, the `Gate <G>:` ledger
  line, and the parallel UX rule; `gate-reviewer-prompt.md` exists and
  carries the severity rule; the same severity rule is in
  `task-reviewer-prompt.md` and `code-reviewer.md`.
- `tests/toolbelt/test-doctrine.sh`: no skill file contains
  `EXTREMELY-IMPORTANT`, "Violating the letter", "you'll be replaced", or
  "Iron Law" outside `test-driven-development`; every `<HARD-GATE>` and
  `<ENTRY-GATE>` block is at most 80 words; only
  `test-driven-development/SKILL.md` and
  `writing-skills/testing-skills-with-subagents.md` (the testing reference
  Component 1 moves the skipping-tests table into) contain a table whose
  header is `| Excuse | Reality |` or `| Thought | Reality |`.
- `tests/toolbelt/test-word-counts.sh` covers every file in the Component 2
  table.

Acceptance, run after reinstalling both plugin caches:

- Clean session, "Let's make a react todo list": brainstorming triggers
  before any code, in both harnesses.
- Clean session in fsmcrm with the dev server running: "run the UX smoke on
  /r/customers" produces a `mechanical.json` and stills without the agent
  writing a Playwright script.

## Out of scope

- fsmcrm project files: the UX paragraph of `docs/REVIEW-GUIDANCE.md`,
  creating `.toolbelt/ux-policy.md` from the existing harness notes, and
  the overlap between its AGENTS.md self-UAT line and the smoke pass. A
  follow-up quick task in that repository.
- Micro-testing the stripped rationalization tables under pressure. The
  acceptance test above is the gate; if test-first behaviour regresses in
  practice, restore rows verbatim from git history.
- Pressure-scenario suites under `tests/claude-code/`.
