# Hill climb: lean rounds

## Goal

A hill-climb campaign costs a fraction of what the last one did, with the same review quality. A measured 13-round climb in a consuming project re-read about 3 billion cached tokens: fixers carried 5 to 11 problems each in one context that grew to 400 to 500K tokens, a top-model orchestrator read every report itself, parallel fixers shared one checkout, and each screenshot was viewed in its own step. Loops and retries were under 5% of the cost; context size was the cost.

The campaign's text and the implementer agent definition change so that a climb runs this way by default, with nobody reminding the agents.

## Architecture

- `skills/hill-climb/campaign.md`: a Roles section (orchestrator scope; actor; triage routed as `planner`; fixers routed as `implementer`; one integrator), a round of re-test actors plus one new-scenario actor → triage → fixers → integration, Triage and Fixers and Integration sections, the UI-climb levers line, and a saturation stop signal in "Read the curve".
- `skills/hill-climb/actor.md`: actors save their report and return its path; UI scoring includes how a task felt and how the screen looks.
- `agents/opus-5-5-high.md`: `autoCompactWindow: 300000`.
- Release 10.12.0.

The drafted text for tasks 1 and 2 is already on branch `hill-climb-lean-rounds`; the implementer reviews it against these contracts, adjusts wording only where a contract is not met, and completes task 3.

## Global Constraints

- Follow `AGENTS.md`: skills stay short, no file under `skills/` names a project, scripts are referenced relative to their skill directory, "your human partner" stays.
- The scoreboard script and its records are unchanged; the round keeps its re-test gate.
- No change to `SKILL.md`, `quick.md`, or any other skill.

## Known Gotchas

- `tests/toolbelt/test-claude-agent-definitions.sh` pins each agent file's frontmatter exactly; an added field needs its expected value in that test.
- `autoCompactWindow` must be a plain integer between 100000 and 1000000; Claude Code reads `300k` in frontmatter as 300 and ignores it. `CLAUDE_CODE_AUTO_COMPACT_WINDOW`, when set, overrides it. Plugin agents support the field (Claude Code 2.1.296 and later).
- Editing this checkout changes no live session; both harnesses install a copy (`AGENTS.md` "Verifying a change").

## Risks

- **Who else reads what this changes?** `agents/opus-5-5-high.md` is loaded only when Claude Code launches a native subagent of type `toolbelt:opus-5-5-high`; those subagents, delivery implementers included, now compact at 300K instead of near 967K. A delivery implementer past 300K summarizes and continues; one implementer per PR still carries the PR. Cross-harness launches of Opus (t3code `delegate_task`, agx) start a top-level Claude session that reads no agent definition, so they keep the default window; this release changes nothing for them. `CLAUDE_CODE_AUTO_COMPACT_WINDOW`, when a user sets it, overrides the field, as documented. `campaign.md` is read only by the hill-climb skill.
- **What does the previous release still read?** A campaign run folder from 10.11 keeps working: run files and the scoreboard are unchanged.
- **Other entry points?** Projects whose routing names another implementer model are unaffected by the compaction field. The scoreboard's re-test gate is the one owner of "verified"; the new round satisfies it with one fresh dispatch per re-tested scenario and does not touch the script.
- **Files another workstream claims?** None known.

## PR Boundaries

| PR | Outcome | Tasks | Depends on | Risk | Independent verification |
|---|---|---|---|---|---|
| 1 | A campaign runs re-test actors plus one new-scenario actor, a triage plan, one-screen fixers in their own worktrees, and one integrator, on a lean orchestrator; native Opus 5.5 high subagents compact at 300K | 1, 2, 3 | none | medium | every `tests/toolbelt/test-*.sh` passes, `test-scoreboard.sh` included |

### Task 1: The campaign's round and roles

**Files:** `skills/hill-climb/campaign.md`, `skills/hill-climb/actor.md`

**Contract:**
- The orchestrator dispatches, passes reports and plans as file paths, keeps run files, runs the scoreboard, applies the stop rule and collects owner questions; it does not read reports in detail, sort problems, assign fixes, or read or edit product code. A campaign starts in a session on a mid-tier model at medium effort.
- A round: deterministic checks; a fresh actor on each scenario the scoreboard says needs a re-test, each its own dispatch with that scenario's original brief and input (the gate counts a run only when its dispatch ID appears once); then one actor on a new scenario, with new tasks or a new person; actors one at a time unless the worktree policy proves their data separate; `check`; triage maps each reported problem to an existing group in `fixes.tsv` or a new ID, writes those IDs into the round's `runs.tsv` problems column, and writes `rounds/<n>/plan.md`; scoreboard (a first target missing from the plan goes back to triage); one fixer per contract; one integrator; deterministic check per fix; records.
- Triage merges duplicates, decides each problem (fix now, won't fix with a reason, ask your human partner), writes each fix's definition of done as something visible on screen with the actor's path (or, for work with no screen, what a deterministic check shows), and writes contracts: one screen each (one area of behavior for work with no screen), its problems batched, sized to finish within about 300K tokens of context, server and data-model work in its own contract, no more fixes than the next actor can re-test. A problem an earlier round's plan marked won't fix that actors report again in two rounds goes to your human partner.
- A fixer gets its contract, definitions of done, report-section paths and only the hard rules from `loop.md` (never `loop.md`, answer keys, checker code or hidden data). It works in its own worktree when the project's worktree policy gives each worktree its own running app, otherwise shares the checkout, where contracts that share no file run at once and commit with `git commit -m <message> -- <paths>` and contracts that share a file run one after another. Per problem it fixes, captures the changed states replaying the actor's path (with the project's named capture harness, else `../ux-gate/scripts/ux-capture`), opens all of a capture's images in one step, and commits. A state after a write comes from the harness's setup calls or response fixtures, so every replay starts from the same state; the fixer checks the real write in its running app and lists its capture files in its report. It runs only the tests and typecheck for what it changed and reports definitions of done met, disagreements and owner questions.
- The integrator runs the checks the project's testing rules prescribe for the combined change (full suites only when the project has no such rules), audits new exceptions and re-runs every fixer's capture from its starting state.
- Levers name what a UI climb needs (signed-in browser per role, clock, messy-data reset, upload files). "Read the curve" adds: two rounds of kept fixes with flat scores while each actor names different problems means switch the actor's model family or stop.
- Actors save the report and screenshots in a folder the orchestrator names that does not reveal the round, return the path with headline outcomes, and the orchestrator moves it into `rounds/<n>/`; UI scoring covers how each task felt and how good the screen looks.

**Reuses:** the campaign's existing contract, run files, scoreboard gate, problem groups, hidden sets, owner questions, shrink round and review-as-you-go, unchanged; `toolbelt:agent-routing` roles `planner` and `implementer` as they exist.

**Proves:**
- (guard) `tests/toolbelt/test-doctrine.sh` passes: links, script paths and skill names resolve, no all-caps emphasis or filler.
- (guard) `tests/toolbelt/test-word-counts.sh` passes.
- (guard) `tests/toolbelt/test-scoreboard.sh` passes unchanged, including its reused-dispatch case, so the round text and the gate agree.

**Verify:** `bash tests/toolbelt/test-doctrine.sh && bash tests/toolbelt/test-word-counts.sh && bash tests/toolbelt/test-scoreboard.sh`

### Task 2: Implementer agents compact at 300K

**Files:** `agents/opus-5-5-high.md`, `tests/toolbelt/test-claude-agent-definitions.sh`

**Contract:** `agents/opus-5-5-high.md` frontmatter gains `autoCompactWindow: 300000`. The definitions test expects exactly that extra field on that one file, with a one-line reason, and every other agent file stays at its four fields.

**Reuses:** the expected-fields table in `tests/toolbelt/test-claude-agent-definitions.sh`.

**Proves:**
- `opus-5-5-high` carries `autoCompactWindow: 300000`.
- (guard) Any other agent file with an extra field fails the test.

**Verify:** `bash tests/toolbelt/test-claude-agent-definitions.sh`

### Task 3: Release 10.12.0

**Files:** `.claude-plugin/marketplace.json`, `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `package.json`, `RELEASE-NOTES.md`

**Contract:** The version is `10.12.0` in all four manifests. `RELEASE-NOTES.md` gains a `## v10.12.0 (<merge date>)` entry above v10.11.1, in the existing style: a one-line summary, then bullets for the lean round (a fresh actor per scenario awaiting a re-test plus one new-scenario actor, triage plan, one-screen fixer contracts, own worktrees, one integrator), the orchestrator's scope and model, fixers capturing each fix and viewing its images in one step, integration following the project's own test rules, the saturation stop signal, and native Opus 5.5 high subagents compacting at 300K with the reason (one long fix no longer re-reads a near-1M context on every call) and its limit (cross-harness launches keep their default).

**Reuses:** the manifest and release-notes edits of commit `8dd00ec` (10.11.1) as the pattern.

**Proves:**
- (guard) The four manifests carry the same version.

**Verify:** `grep -h '"version"' .claude-plugin/marketplace.json .claude-plugin/plugin.json .codex-plugin/plugin.json package.json`
