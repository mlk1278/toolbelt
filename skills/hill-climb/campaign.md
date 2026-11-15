# Campaign

A multi-round climb toward a target across many inputs. The core in [SKILL.md](SKILL.md) applies throughout. Read [actor.md](actor.md) before the first actor dispatch.

## Roles

- **You, the orchestrator,** dispatch each step, pass reports and plans between steps as file paths, keep the run files, run the scoreboard, apply the stop rule, and collect owner questions. You do not read reports in detail, sort problems, assign fixes, or read or edit product code. A campaign re-reads your context on every turn for hours, so start it in a session on a mid-tier model at medium effort.
- **Actor:** uses the product and reports, one fresh dispatch per scenario run. See [actor.md](actor.md).
- **Triage:** turns the actor's report into the round's plan. Route it as `planner` through `toolbelt:agent-routing` (required).
- **Fixer:** carries one contract from the plan. Route each as `implementer` through `toolbelt:agent-routing` (required). Fixers on separate contracts run at once.
- **Integrator:** one `implementer` that runs after every fixer has reported.

## Run files

Put run files in `.toolbelt/hill-climb/<run>/` and start with `bash scripts/scoreboard init <run-dir>`:

- `loop.md`: the contract below, plus one `scorer-hash <repo-relative-path> <sha256>` line per scorer file. A scorer file is anything inside the repo that can change a score, such as checker code, answer keys, the actor brief, or the rubric.
- `decisions.md`: rulings from your human partner
- `fixes.tsv`: one row per kept fix with the round, the commit, the problem group, the problem, the scenarios that showed it, and the sample to re-test. A later row with the same group replaces the earlier one.
- `runs.tsv`: one row per actor run with the round, the scenario, the commit, the input hash, the brief version, the dispatch ID, the score, the outcome, and the problem groups it hit. The input hash covers whatever defines the scenario's input, such as its input file, its seed data, or its setup script.
- `regress/`: deterministic results per scenario, `baseline.tsv` from round 0 and one file per commit after that
- `rounds/<n>/`: evidence and the round report

The hidden set lives outside the repo.

## The contract

Write `loop.md` before round 1. It holds:

- the result the checker verifies
- the actor's rubric
- the intentional limits
- the fixer's hard rules: general fixes only, with no special case for one input; guardrails get clearer and are never removed; money, policy, and new features go to your human partner
- the ways inputs can vary
- the budget, in rounds or tokens
- a stop rule that pairs the target with a floor

One example stop rule: the target met on two fresh hidden sets in a row, zero checker failures, and every problem group verified. A duration is not a finish condition.

Your human partner approves `loop.md` once. Show it with round-0 evidence, which is the check results and one baseline actor report. This is the only blocking wait in the campaign.

## Levers

Script any action you expect to repeat. Keep scripting mid-run when you notice repetition, such as subagents redoing the same setup by hand. Examples:

- `reset` returns the environment to a known state, guarded so it runs only in test environments.
- `stage` copies each input in, marks the copy read-only, and records its hash.
- `check` verifies a resulting state, prints counts that add up, and prints `NOT RUN` when it examined nothing.
- `regress` runs every scenario through the product with no browser and no model, and records pass or fail per scenario.

A climb on a user interface usually also needs a one-command signed-in browser per role, a clock lever when the product depends on the time of day, a reset that seeds realistic messy data (long names, blanks, dense records), and sample upload files.

These are examples, not a required set. Build the ones this task repeats. When the project has `.toolbelt/ux-policy.md`, take the app launch, sign-in, and seed data from it.

<ENTRY-GATE>
No actor runs until the objective checks you planned for this task exist and are proven: they pass on a known-good state and fail on a known-wrong one. One actor run costs about as much as a fixer round; a scripted check costs minutes. Only your human partner can waive this.
</ENTRY-GATE>

At round 0, record the baseline deterministic results in `regress/baseline.tsv` and the scorer hashes in `loop.md`. A mostly subjective task may plan few objective checks. Its verification then leans on actor re-tests.

## The round

1. Run the deterministic checks at the current commit. Record them in `regress/<commit>.tsv` and compare them with the baseline. A new failure, meaning a scenario that passed before and fails now, goes to the top of the fixer's list for this round, and that scenario gets no actor this round.
2. Run a fresh actor on each scenario the scoreboard says needs a re-test, each its own dispatch with that scenario's original brief and input. Then run one actor on a new scenario, with new tasks or a new person, because rerunning old scenarios for their own sake rescores old complaints instead of finding new problems. Run actors one at a time unless the project's `.toolbelt/worktree-policy.md` proves their data is separate. Record each run in `runs.tsv` as it finishes.
3. Run `check` against each actor's resulting state.
4. Dispatch triage with the paths of the actor reports, `fixes.tsv`, `runs.tsv`, earlier rounds' plans, and the hard rules from `loop.md`. It records canonical group IDs and writes `rounds/<n>/plan.md`, as described under Triage.
5. Run `bash scripts/scoreboard <run-dir>`. Fixers run only on exit 0. Exit 1 lists each reason and what clears it. Exit 2 means the records are broken, so fix the named file, line, and column and run it again. Never skip the scoreboard. When it lists a first target the plan lacks, send it back to triage.
6. Dispatch one fixer per contract in the plan, as described under Fixers.
7. Dispatch the integrator once every fixer has reported, as described under Integration.
8. Each fix adds a deterministic check where one can prove the behavior. Judgment calls such as clutter and comprehension stay with the actor.
9. Record each fix in `fixes.tsv` once it is kept. Write a short round report in `rounds/<n>/` with the scoreboard output and any open questions in plain words.

## Triage

Actors are blind, so they name problems in their own words. Triage maps each reported problem to an existing group in `fixes.tsv` or a new group ID, and writes those IDs into the problems column of this round's `runs.tsv` rows, so a problem that comes back reopens its group. Then it writes `rounds/<n>/plan.md` with:

- each problem once, with duplicates merged
- a decision for each: fix now, won't fix with the reason, or ask your human partner
- for each fix, a definition of done: what the user sees on screen, with the state and the path the actor took to reach it, or for work with no screen, what a deterministic check shows
- the fixer contracts: which problems each owns, and which screens and files it may touch

Give each contract one screen, with all of that screen's problems batched, or for work with no screen, one area of behavior, sized so one fixer can finish it within about 300K tokens of context. Give server and data-model work its own contract, because a fixer that does server work first carries that code through every later step. Prefer fewer, fuller contracts to many small ones. Plan no more fixes than the next round's actor can re-test.

A problem an earlier round's plan marked won't fix that actors report again in two rounds goes to your human partner.

## Fixers

Give each fixer its contract, the definitions of done, the paths of the report sections it needs, and only the hard rules from `loop.md`. It sees training failures as expected versus got. It never sees answer-key files, checker code, anything hidden, or `loop.md` itself, because `loop.md` names the scorer files. A suspected wrong key or checker bug comes back to you as a dispute.

- When the project's `.toolbelt/worktree-policy.md` gives each worktree its own running app, each fixer works in its own worktree. Otherwise fixers share the checkout: contracts that share no file run at once and commit with `git commit -m <message> -- <paths>`, and contracts that share a file run one after another, because a path-limited commit still takes another fixer's unfinished edits to a shared file.
- For each problem, the fixer fixes it, captures the changed states, looks at the capture, and commits. Work with no screen skips capture; the deterministic check the fix adds is its evidence. The capture replays the path the actor reported, not only the happy path. It uses the capture harness the project's instructions name, or else `../ux-gate/scripts/ux-capture` with a matrix in the format of `../ux-gate/matrix.md`; pass the fixer both absolute paths. It opens all of one capture's images in a single step.
- A capture harness blocks writes during its steps, so a state after a write comes from the harness's setup calls or response fixtures, and every replay starts from the same state. The fixer checks the real write in its running app. Its report lists its capture files for the integrator.
- It runs the tests and typecheck for what it changed. Wider checks run at integration.
- Its report says which definitions of done it met, where it disagrees with the plan, and any owner questions.

## Integration

The integrator brings the fixers' work together, runs the checks the project's testing rules prescribe for the combined change (its full suites when the project has no such rules), audits new lint or type exceptions, and re-runs every fixer's capture from its starting state to catch clashes between fixes. It fixes what it finds and reports what it could not.

## Problem groups

- Each fix names the problem it solves, the scenarios that showed it, and a sample to re-test. The sample holds the worst case and the one least like it. Add any scenario with a second open problem, and any scenario another fix touched.
- A group is verified when the deterministic checks pass for all its scenarios and fresh actors have re-tested the sample. The scoreboard computes this from the records.
- An actor hitting the same problem again reopens the group.

## Defect rounds, then hypothesis rounds

Batch independent fixes while deterministic checks can prove each one right. That batching is the core's one exception to one idea per attempt. Once the fixes become taste, switch to one change at a time, kept or reverted under the core rules.

## Hidden sets

A hidden set is single-use. Once its results drive a fix, it becomes training data. Keep one final unopened set for confirmation, and treat it as used up if its failures drive changes. Say how hidden a set really is whenever you report its results.

## Owner questions

Follow the Questions rule in `toolbelt:delivery`. This section adds the campaign details:

- Each question carries a recommendation, the tradeoff, and a safe default the loop uses while it waits.
- Quote rulings word for word in `decisions.md`, and never widen them.
- An open question never shrinks scope. The round report shows `capped by Q<n>` beside each score the question holds down.
- When all useful work waits on an answer, stop with the best verified version and the exact question.

## Read the curve

When each new input fails on a new value of the same input dimension, stop patching. Plan a structural fix instead, and route the plan to a `reviewer` with specialty `plan` through `toolbelt:agent-routing` (required) before building it. A plateau gets a bounded investigation, with the limit set before it starts.

When two rounds of kept fixes leave the scores flat and each actor names a different set of problems, the actor has stopped telling you anything new. Switch the actor to a model from another family, or stop.

## Shrink round

Once the run is at target, give the fixer one round where it may only remove, merge, or hide. Keep the result only if the deterministic checks hold and a blind A/B review prefers it or ties.

## Review as you go

Every few rounds, and after any structural change, review the commit range. Build the package with `bash ../delivery/scripts/review-package BASE HEAD`, route a `reviewer` with specialty `code` through `toolbelt:agent-routing` (required) on the package output, and pass its findings to the next fixer. The final review at the exit in [SKILL.md](SKILL.md) still happens.

## Stop

When the stop rule is met or the budget runs out, follow the exit in [SKILL.md](SKILL.md).
