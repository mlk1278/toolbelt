# Hill climb skill: design

Approved in brainstorming on 2026-11-07, section by section. Source proposal (quorum of Opus 5.5, GPT-6.1 Sol and Muse Wonder Full, reviewed by GPT-6.1 Sol): `.toolbelt/quorum/2026-11-07-hill-climb/proposal.md`, which is local scratch and not committed. Mike's import hill-climb write-up is the primary basis: `.toolbelt/quorum/2026-11-07-hill-climb/source-import-hill-climb.md`.

## Global constraints

- Nothing under `skills/` names a specific project, product, model, or harness. Models come from routing.
- Scripts are referenced relative to their own skill directory: `scripts/scoreboard`, never `skills/hill-climb/scripts/scoreboard`.
- Gate blocks (`<HARD-GATE>`, `<ENTRY-GATE>`) are at most 80 words each: the condition, who owns the exception, and why.
- No rationalization tables. `tests/toolbelt/test-doctrine.sh` allows them only in `test-driven-development`.
- The skill names exactly one next skill, `requesting-code-review`, and says "Do NOT invoke any other skill."
- Say "your human partner", not "the user".
- No word ceilings for the new files. Keep them as short as the content allows.
- The skill text stays deliberately abstract. It gives gates, principles, and examples, and leaves room for the agent to plan for its own task. It doesn't prescribe how to build harness pieces.
- Writing process: the implementer writes the skill text. Muse Wonder Full then does a final pass for concision and readability. Muse doesn't have toolbelt installed, so its prompt tells it to read the unslop skill file directly, from the Codex toolbelt cache (`~/.codex/plugins/cache/toolbelt-dev/toolbelt/<version>/skills/unslop/SKILL.md`). The pass changes wording only, never behavior, gates, or names.
- Bash scripts follow the existing style: `#!/usr/bin/env bash`, `set -euo pipefail`, a usage comment at the top, and usage errors exit 2.

## What already exists

- **Improving one screen in a few attempts:** `ui-hillclimb` already does this, with a baseline, one idea per attempt, revert to a checkpoint, a blind A/B review, and a handoff. Its behavior moves into the new skill unchanged, split between the shared core and the quick size. `ui-hillclimb` is then retired.
- **Launching, signing in to, and seeding the app for a visual check:** `ux-gate` reads this from the project's optional `.toolbelt/ux-policy.md` (Launch, Auth, Data). The actor and the campaign levers read the same file when present. Nothing new is added to it.
- **Final UX coverage of a material interface change:** `ux-gate`, through the normal review path. The hill climb doesn't replace it.
- **Choosing which model plays which part:** `agent-routing`. The reviewer role already has specialties (`code`, `spec`, `plan`, `ux`, `gate`), and a reviewer always runs on a different harness from the implementer. The actor becomes one more reviewer specialty, `actor`. The fixer is the `implementer`. Structural-change plans go to `reviewer` with specialty `plan`.
- **Watching background agents for stalls:** `agent-routing`'s `stall-watch`. Campaign actors and fixers use it as any dispatch does.
- **Which questions go to your human partner:** `delivery`'s Questions rule: product, money, or cross-team questions only, and everything else decided "the money-safe way." The campaign's owner-question rule points to this rule and adds the `decisions.md` and `capped by Q` details. It doesn't restate it.
- **Packaging a commit range for review:** `delivery`'s `review-package`. "Review as you go" in a campaign uses it.
- **Per-actor environments:** the project's optional `.toolbelt/worktree-policy.md`. Campaigns use it when it proves the data is separate. Otherwise actors run one at a time.
- **Final review:** `requesting-code-review`.
- **Scratch in consuming projects:** `.toolbelt/` (`sdd/`, `quick/`, `brainstorm/`). Campaign runs add `.toolbelt/hill-climb/<run>/`.
- **Record-and-check scripts:** `plan-check` and `ledger-append` set the pattern for a small bash script with its own `tests/toolbelt/test-*.sh`. No existing script tracks re-tests, so the scoreboard is new.

## Architecture

One skill, `skills/hill-climb/`, in two sizes. `SKILL.md` holds the shared core and picks the size. Each size lives in its own file, read only when chosen, so a polish job costs about what `ui-hillclimb` costs today.

```
skills/hill-climb/
  SKILL.md          description, pick the size, shared core, exit
  quick.md          one screen or workflow, one session (today's ui-hillclimb)
  campaign.md       multi-round loop toward a target across many inputs
  actor.md          briefing and trusting an actor; read by campaign only
  scripts/scoreboard
tests/toolbelt/test-scoreboard.sh
```

### `SKILL.md`

**Description:** "Use when asked to improve an existing screen, workflow, or product outcome through measured attempts: from polishing one screen to a multi-round climb toward a target across many inputs. Not for fixing one known bug."

**Pick the size:**
- **Campaign:** the target spans many inputs or scenarios, or the work needs more than one session. Read `campaign.md`.
- **Quick:** everything else. Read `quick.md`.
- **Unclear:** start quick. Move to campaign only if the quick run shows the problem spans inputs.

**Shared core**, which applies to both sizes:
1. Capture a baseline before editing, and use the same setup for every attempt.
2. Each attempt starts from a checkpoint, such as a commit, of the best version so far, so a failed attempt reverts cleanly.
3. One idea per attempt. A coherent redesign counts as one idea. The only exception is a campaign defect round, which may batch independent fixes that deterministic checks prove.
4. Keep an attempt only if it beats the best version so far and everything on the must-still-work list still works. Otherwise revert.
5. Log every attempt, including reverted and invalid ones, one line each: the idea, the result, and kept or reverted.
6. Judges stay blind. A reviewer or actor never learns the target score, the attempt's rationale, or which version is supposed to win. Blind A/B review uses random labels, goes through `agent-routing`, and runs on a vision-capable model for visual work.
7. Exit: report the before and after evidence, the attempt log, and the checks. Then invoke `requesting-code-review` on the final commit. Do NOT invoke any other skill.

### `quick.md`

Today's `ui-hillclimb` body, sections 1 to 4, with anything the shared core now covers removed. It keeps:
- the baseline write-down (user and task, outcome, must-still-work, setup with one realistic dense case)
- confirming the workflow when the request covers several workflows
- the three-attempt default budget
- the blind-review evidence rules: only the views the change touched, labeled A and B, with the log and reasons left out
- the review questions
- replaying in the running app anything the reviewer says got harder
- the tie rule: a tie keeps the candidate

The only behavior change is the exit, which now goes through the core's exit. Merging is still left to your human partner.

### `campaign.md`

Written as gates, principles, and examples, in loop order:

1. **The contract.** Write `loop.md` in the run folder. It holds:
   - the result the checker verifies
   - the actor's rubric
   - the intentional limits
   - the fixer's hard rules: general fixes only; guardrails get clearer, never removed; money, policy, and new features go to your human partner
   - the ways inputs can vary
   - the budget in rounds or tokens
   - a stop rule pairing the target with a floor

   Example stop rule: target met on two fresh hidden sets in a row, zero checker failures, and every problem group verified. Your human partner approves `loop.md` once, shown alongside round-0 evidence: the harness check results and one baseline actor report. This is the only blocking wait. "A duration is not a finish condition."
2. **Levers.** Build the lever: script any action you expect to repeat, or notice repeating mid-run, such as subagents redoing the same setup. Examples: `reset` (guarded to test environments), `stage` (inputs copied read-only and hashed), `check` (prints counts that add up, and `NOT RUN` when it examined nothing), and `regress` (every scenario through the product with no browser and no model). These are examples, not a required set.
3. **Entry gate:**
   ```
   <ENTRY-GATE>
   No actor runs until the objective checks you planned for this task exist and are proven: they pass on a known-good state and fail on a known-wrong one. One actor run costs about as much as a fixer round; a scripted check costs minutes. Only your human partner can waive this.
   </ENTRY-GATE>
   ```
   At round 0, also record the baseline failure list (`regress/baseline.tsv`) and the scorer hashes (`scorer-hash` lines in `loop.md`). For a mostly subjective task, the planned checks may be few, and verification leans on actor re-tests.
4. **The round:**
   - Run deterministic checks at the current commit and compare them with the baseline. A new failure (passed before, fails now) is fixed first, and that scenario gets no actor this round.
   - Run actors on the scenarios the scoreboard says need a re-test, plus one or two unseen scenarios.
   - Run `check` against each actor's resulting state.
   - Run `scripts/scoreboard <run>`. The fixer runs only on exit 0.
   - The fixer works a capped list of problem groups, sized to the re-tests the next round can afford. It sees training failures as expected vs. got. It doesn't see answer-key files, checker code, or anything hidden. A suspected wrong key or checker bug goes to the orchestrator as a dispute.
   - Each fix adds a deterministic check where one can prove the behavior. Judgment calls such as clutter and comprehension stay with the actor.
   - The orchestrator records each fix and each actor run in the record files, then writes a short round report: the scoreboard output plus open questions in plain words.
5. **Problem groups.**
   - Each fix names the problem it solves, the scenarios that showed it, and a sample to re-test: the worst case plus the one least like it. Any scenario with a second open problem, or touched by another fix, also goes in the sample.
   - A group is verified when deterministic checks pass for all its scenarios and fresh actors have re-tested the sample.
   - An actor hitting the same problem again reopens the group.
6. **Defect rounds, then hypothesis rounds.** Batch fixes while they're provably right. Switch to one change at a time, kept or reverted, once the fixes become taste.
7. **Hidden sets.** A hidden set is single-use: once its results drive a fix, it becomes training. Keep one final unopened set for confirmation. If its failures drive changes, it's used up. Be honest about how hidden a set really is.
8. **Owner questions.**
   - Follow `delivery`'s Questions rule. Each question carries a recommendation, the tradeoff, and a safe default the loop uses meanwhile.
   - Quote rulings word for word in `decisions.md`, and never widen them.
   - An open question never shrinks scope. The scoreboard shows `capped by Q<n>` beside the scores it holds down.
   - When all useful work waits on an answer, stop with the best verified version and the exact question.
9. **Read the curve.** When each new input fails on a new value of the same input dimension, stop patching. Plan a structural fix and route the plan to `reviewer` with specialty `plan` before building it. A plateau gets a bounded investigation.
10. **Shrink round.** Once at target, the fixer may only remove, merge, or hide. Keep the result only if the deterministic checks hold and a blind A/B prefers it or ties.
11. **Review as you go.** Every few rounds, or after a structural change, review the range with `review-package` and pass the findings to the next fixer. The final review at exit still happens.

Run files live in `.toolbelt/hill-climb/<run>/`: `loop.md`, `decisions.md`, `fixes.tsv`, `runs.tsv`, `regress/`, and `rounds/<n>/`. The hidden set lives outside the repo.

### `actor.md`

- A realistic task with ranked priorities and a step or time limit, not a theatrical persona.
- Inputs are used exactly as given. Running out of steps or time is a "stuck" finding, and the run records outcome `incomplete`. A run that never reached the goal is `incomplete`. A broken environment makes the run `invalid`, and it gets replayed.
- Blind: no target score, no round number, no earlier feedback, and no hint that anything changed. Every run is a fresh dispatch with only the brief and no parent conversation. Record its dispatch ID.
- A few scored areas, each with written anchors, plus yes/no outcomes: finished, needed a workaround, times stuck. The 1–10 headline is reported, but decisions rest on the outcomes and the checker.
- Intentional limits go in the brief. The actor lists out-of-scope wants in a fixed section, unscored.
- Noise check: at round 0, run the baseline two or three times. A gain smaller than that spread is noise. Claiming the target needs two fresh runs at target on the same commit.
- Version the brief. A change to the brief or the actor model re-scores the current commit before anything is compared.
- Where references exist (the previous round, a competitor, a known-good run), compare against them blind and in random order.
- Actor scores show relative change. They don't prove what real users will think.

### Routing change

- Add `actor` to the reviewer specialties in `skills/agent-routing/SKILL.md` (roles table), `skills/agent-routing/routing/claude.md`, `skills/agent-routing/routing/codex.md`, and `docs/ADOPTING-IN-A-PROJECT.md` (the reviewer specialties sentence).
- Each routing file's reviewer line adds that an actor for a visual task needs a vision-capable model.

## Scoreboard

### Interface

```
scripts/scoreboard init <run-dir>    create fixes.tsv and runs.tsv with headers
scripts/scoreboard <run-dir>         check the records and print the board
```

Run from inside the git repository that holds the product commits.

### Record files

All files are tab-separated, with a header row. Lists inside a column are comma-separated, and `-` means empty.

`fixes.tsv`:

| Column | Meaning |
|---|---|
| `round` | round number |
| `commit` | commit containing the fix |
| `group` | problem group ID, such as `G7` |
| `problem` | one-line description |
| `scenarios` | every scenario that showed the problem |
| `sample` | scenarios that need a fresh actor re-test; must be a subset of `scenarios` |

A later row with the same `group` replaces the earlier one. That's how a reopened group gets a new fix.

`runs.tsv`:

| Column | Meaning |
|---|---|
| `round` | round number |
| `scenario` | scenario name |
| `commit` | commit the actor ran against |
| `input_hash` | hash of the staged input |
| `brief` | actor brief version |
| `dispatch` | the actor dispatch's ID |
| `score` | headline 1–10, or `-` |
| `outcome` | `finished`, `incomplete`, or `invalid` |
| `problems` | group IDs this run hit, or `-` |

`regress/baseline.tsv` and `regress/<commit>.tsv`, both optional: `scenario`, `result` (`pass` or `fail`), `note`. A commit file is named by its full or abbreviated hash.

`loop.md`, optional lines: `scorer-hash <repo-relative-path> <sha256>`.

### Rules

- **Re-test.** For a group whose latest fix is commit `C`, a run counts as a re-test of a sample scenario when all of these hold:
  - its scenario matches
  - `C` is an ancestor of, or equal to, the run's commit
  - its `input_hash` equals that scenario's first row in `runs.tsv`
  - its `dispatch` appears on no other row
  - its outcome isn't `invalid`. `incomplete` counts.
- **Regress at the current commit.** When `regress/` exists, the file for the current commit is the one whose name resolves to `HEAD`. If `regress/` exists and no file resolves to `HEAD`, the board is blocked with "regress not run at HEAD". When `regress/` is absent, all regress rules are skipped, and groups are verified on actor re-tests alone.
- **New regress failure:** a scenario that fails at `HEAD` and either passes in the baseline or is missing from it.
- **Group status,** first match wins:
  1. `REOPENED by runs.tsv:<line>`: a run whose commit includes `C` lists the group in `problems`.
  2. `REGRESS FAIL <scenarios>`: one of the group's scenarios fails at `HEAD`.
  3. `NEEDS RETEST <scenarios>`: a sample scenario has no counting re-test.
  4. `VERIFIED`.
- **Blocked (exit 1)** when any of these hold:
  - a group is `NEEDS RETEST`
  - a `scorer-hash` file is missing or its hash differs
  - `regress/` exists without a file for `HEAD`

  `REOPENED`, `REGRESS FAIL`, and new regress failures are fixer work, so they're listed at the top of the board as first targets and don't block. Blocking them would deadlock the loop, because a scenario failing regress gets no actor.
- **Malformed records (exit 2),** each reported as `file:line: column <name>: <problem>`:
  - a missing file after `init`
  - a wrong header or column count
  - a commit that doesn't resolve
  - an `outcome` or `result` outside the allowed values
  - a `sample` that isn't a subset of `scenarios`
  - not being inside a git repository

  `init` exits 2 if either file already exists. Group IDs in `problems` that aren't in `fixes.tsv` are allowed, because actors report problems before they're fixed.

### Output

1. A per-scenario table: scenario, latest run (round, score, outcome), regress at `HEAD` (`pass`, `fail`, `known-fail`, or `-`), and the groups it belongs to.
2. **First targets:** reopened groups, regress-failing groups, and new regress failures.
3. One status line per group.
4. Scorer-hash mismatches.
5. A last line, either `CLEAR: fixer may run` or `BLOCKED: <n> reason(s)`, with the reasons above it.

`capped by Q<n>` lives in the orchestrator's round report, not in the script.

## Error handling

- The scoreboard never passes on broken input. Malformed records exit 2, with the exact file, line, and column.
- Exit 1 always prints each blocking reason, along with what clears it: which scenarios need a fresh actor run, or which scorer file changed.
- The skill text tells the orchestrator to treat an exit 2 as a records problem to fix, not as a reason to skip the scoreboard.

## Testing

- **`tests/toolbelt/test-scoreboard.sh`** builds a throwaway git repo with a few commits and fixture records, then checks each rule's exit code and key output line:
  - `init` creates both headers, and refuses to overwrite
  - a verified group gives exit 0
  - a missing sample re-test gives `NEEDS RETEST` and exit 1
  - a re-test with the wrong input hash doesn't count
  - a run on a commit from before the fix doesn't count
  - a reused dispatch ID doesn't count
  - an `invalid` run doesn't count, and an `incomplete` run does
  - a relapse gives `REOPENED` without blocking
  - a regress failure on a group scenario gives `REGRESS FAIL` without blocking
  - a new regress failure compared with the baseline is listed as a first target
  - `regress/` without a `HEAD` file is blocked
  - a changed or missing scorer file is blocked
  - with no `regress/` folder, a group verifies on actor re-tests alone
  - a malformed row, an unknown commit, and a bad sample subset each exit 2 with `file:line`
- **`tests/toolbelt/test-word-counts.sh`:** remove the `ui-hillclimb` entry. No new entries.
- **`tests/toolbelt/test-doctrine.sh`** passes: links, script paths, skill names, gate length, no rationalization table.
- **Pressure test with `writing-skills`** on two scenarios that mirror how the import run slipped:
  - The fixer just finished, the budget is tight, and a fresh hidden set is ready. Does the orchestrator run the scoreboard and re-test first?
  - It's round 1, actors are ready, and no objective checks exist yet. Does the entry gate hold?
- **Trigger check, after refreshing the plugin cache in a fresh session:** all four of these prompts must fire `hill-climb`. "Get the import to 9/10" and "make onboarding work for any CSV" must pick campaign. "This settings page is cluttered" and "modernize this screen" must pick quick.
- `tests/toolbelt/` and `tests/hooks/` stay green.

## Release

- Remove `skills/ui-hillclimb/`.
- Replace its line in `README.md` with one for `hill-climb`.
- Add a `RELEASE-NOTES.md` entry: hill-climb skill, quick and campaign sizes, scoreboard script, `actor` reviewer specialty, `ui-hillclimb` folded in.
- Bump the version to 10.9.0 in `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, and `.codex-plugin/plugin.json`.
