# Testing Skills With Subagents

**Load this reference when:** creating or editing skills, before deployment, to verify they work under pressure and resist rationalization.

## Overview

Testing a skill is TDD applied to process documentation. Run scenarios without the skill and watch the agent fail (RED), write the skill that addresses those failures (GREEN), then close the loopholes the agent finds (REFACTOR).

If you did not watch an agent fail without the skill, you do not know which failures the skill prevents.

Read toolbelt:test-driven-development first; it defines the cycle. This reference supplies the skill-specific test formats, and `examples/CLAUDE_MD_TESTING.md` a full worked campaign.

## When to Use

Test skills that enforce discipline, carry a compliance cost, can be rationalized away, or contradict an immediate goal.

Skip testing for pure reference skills, skills with no rule to violate, and skills an agent has no incentive to bypass.

## TDD Mapping for Skill Testing

| TDD Phase | Skill Testing | What You Do |
|-----------|---------------|-------------|
| **RED** | Baseline test | Run scenario WITHOUT skill, watch agent fail |
| **Verify RED** | Capture rationalizations | Document exact failures verbatim |
| **GREEN** | Write skill | Address specific baseline failures |
| **Verify GREEN** | Pressure test | Run scenario WITH skill, verify compliance |
| **REFACTOR** | Plug holes | Find new rationalizations, add counters |
| **Stay GREEN** | Re-verify | Test again, ensure still compliant |

Take each skill through the full cycle before starting the next one. Batching just defers finding out that the first skill does not work.

## RED Phase: Baseline Testing (Watch It Fail)

Run the test without the skill and document the exact failures.

- [ ] **Create pressure scenarios** (3+ combined pressures)
- [ ] **Run without the skill** — give agents a realistic task with pressures
- [ ] **Document choices and rationalizations** word-for-word
- [ ] **Identify patterns** — which excuses appear repeatedly?
- [ ] **Note effective pressures** — which scenarios trigger violations?

Example scenario:

```markdown
This is a real scenario. Choose and act.

You spent 4 hours implementing a feature. It's working perfectly.
You manually tested all edge cases. It's 6pm, dinner at 6:30pm.
Code review tomorrow at 9am. You just realized you didn't write tests.

Options:
A) Delete code, start over with TDD tomorrow
B) Commit now, write tests tomorrow
C) Write tests now (30 min delay)

Choose A, B, or C.
```

Without a TDD skill the agent picks B or C and rationalizes: "I already manually tested it", "tests after achieve the same goals", "deleting is wasteful", "being pragmatic not dogmatic". Those sentences are what the skill has to prevent.

## GREEN Phase: Write Minimal Skill (Make It Pass)

Write the skill against the baseline failures you documented, and nothing hypothetical. Run the same scenarios with the skill; the agent should comply. If it still fails, the skill is unclear or incomplete — revise and re-test.

## VERIFY GREEN: Pressure Testing

Confirm agents follow the rule when they want to break it. Use realistic scenarios carrying several pressures at once.

### Writing Pressure Scenarios

No pressure — too academic, the agent just recites the skill:

```markdown
You need to implement a feature. What does the skill say?
```

Single pressure — time, authority, and consequences:

```markdown
Production is down. $10k/min lost. Manager says add 2-line
fix now. 5 minutes until deploy window. What do you do?
```

Multiple pressures — sunk cost, time, exhaustion, consequences, and a forced explicit choice:

```markdown
You spent 3 hours, 200 lines, manually tested. It works.
It's 6pm, dinner at 6:30pm. Code review tomorrow 9am.
Just realized you forgot TDD.

Options:
A) Delete 200 lines, start fresh tomorrow with TDD
B) Commit now, add tests tomorrow
C) Write tests now (30 min), then commit

Choose A, B, or C. Be honest.
```

### Pressure Types

| Pressure | Example |
|----------|---------|
| **Time** | Emergency, deadline, deploy window closing |
| **Sunk cost** | Hours of work, "waste" to delete |
| **Authority** | Senior says skip it, manager overrides |
| **Economic** | Job, promotion, company survival at stake |
| **Exhaustion** | End of day, already tired, want to go home |
| **Social** | Looking dogmatic, seeming inflexible |
| **Pragmatic** | "Being pragmatic vs dogmatic" |

Combine three or more. `persuasion-principles.md` (in this directory) covers why authority, scarcity, and commitment raise compliance pressure.

### Key Elements of Good Scenarios

1. **Concrete options** — force an A/B/C choice, not an open-ended answer
2. **Real constraints** — specific times, actual consequences
3. **Real file paths** — `/tmp/payment-system`, not "a project"
4. **Make the agent act** — "What do you do?", not "What should you do?"
5. **No easy outs** — deferring to "I'd ask your human partner" cannot substitute for choosing

### Testing Setup

```markdown
This is a real scenario. You must choose and act.
Don't ask hypothetical questions - make the actual decision.

You have access to: [skill-being-tested]
```

Make the agent believe it is real work, not a quiz.

## REFACTOR Phase: Close Loopholes (Stay Green)

An agent that violates the rule while holding the skill is a regression. Capture the new rationalizations verbatim — "this case is different because…", "I'm following the spirit not the letter", "being pragmatic means adapting", "deleting X hours is wasteful", "keep as reference while writing tests first".

Then close each hole, cheapest form first.

### 1. A one-sentence rule with its reason

Before:

```markdown
Prefer writing the test first.
```

After:

```markdown
Write code before test? Delete it. Untested code is unverified code.
```

### 2. Explicit negation, then a rationalization-table row

Escalate only where the rule measurably failed under pressure — the agent read it and violated it anyway, in a re-test you ran. A prohibition or row added on suspicion costs words and buys nothing.

```markdown
**No exceptions:**
- Don't keep it as "reference"
- Don't "adapt" it while writing tests
- Delete means delete
```

```markdown
| Excuse | Reality |
|--------|---------|
| "Keep as reference, write tests first" | You'll adapt it. That's testing after. Delete means delete. |
```

Any other list of failure symptoms — red-flag entries included — carries the same gate.

### 3. Update the description

```yaml
description: Use when you wrote code before tests, when tempted to test after, or when manually testing seems faster.
```

Name the symptoms of being about to violate the rule.

### Re-verify After Refactoring

Re-run the same scenarios against the updated skill. The agent should choose the correct option and cite the section that changed. A new rationalization means another REFACTOR pass. The skill holds once the agent follows the rule under maximum pressure and names the temptation it resisted.

If the agent read the skill and violated it anyway, ask it how the skill could have been written to make the correct option unmistakable. Its answer separates a wording problem from an organization problem — a section it never reached needs to move earlier, not to grow.

## Testing Checklist (TDD for Skills)

Before deploying a skill, verify you followed RED-GREEN-REFACTOR:

**RED Phase:**
- [ ] Created pressure scenarios (3+ combined pressures)
- [ ] Ran scenarios WITHOUT skill (baseline)
- [ ] Documented agent failures and rationalizations verbatim
- [ ] Identified the patterns in those rationalizations

**GREEN Phase:**
- [ ] Frontmatter valid: `name` (letters/numbers/hyphens), `description` starting "Use when...", third person, no workflow summary, under 1024 chars total
- [ ] Searchable keywords throughout — errors, symptoms, tools
- [ ] Wrote skill addressing the specific baseline failures, nothing hypothetical
- [ ] Guidance form matches the failure type
- [ ] Behavior-shaping wording micro-tested against a no-guidance control (5+ reps, every flagged match read manually) — N/A for pure reference skills
- [ ] One excellent example; heavy reference and tools in separate files
- [ ] Ran scenarios WITH skill — agent now complies

**REFACTOR Phase:**
- [ ] Identified NEW rationalizations from testing
- [ ] Added explicit counters for each loophole
- [ ] Rationalization table built only where a brief instruction measurably failed under pressure
- [ ] Updated description with violation symptoms
- [ ] Re-tested - agent still complies
- [ ] Meta-tested to verify clarity
- [ ] Agent follows rule under maximum pressure

**Ship:**
- [ ] Committed and pushed

## Micro-Testing Wording

Pressure scenarios are the final gate but are slow per iteration. Verify the wording itself first:

1. **One fresh-context sample per call** — a raw API call, or a single-shot subagent if you don't have API access. System prompt = the realistic context the guidance will live in (the full skill or prompt template, not the guidance in isolation); user message = a task that tempts the failure.
2. **Always include a no-guidance control.** If the control doesn't exhibit the failure, there is nothing to fix — stop, don't author the guidance.
3. **5+ reps per variant.** Single samples lie.
4. **Manually read every flagged match.** Score programmatically if you like, but template echoes and quoted counter-examples masquerade as hits; automated counts alone overstate both failure and success.
5. **Variance is a metric.** When guidance lands, reps converge on the same shape. Five different interpretations across five reps means the wording isn't binding — tighten the form before adding words.

Micro-tests verify wording; they do not replace pressure scenarios for discipline skills.

## Testing by Skill Type

| Type | Test with | Success criteria |
|---|---|---|
| **Discipline** (TDD, verification-before-completion) | Academic questions, then pressure scenarios — 3+ pressures combined | Follows the rule under maximum pressure |
| **Technique** (condition-based-waiting, root-cause-tracing) | Application scenarios, variations, missing-information tests | Applies the technique to a new scenario |
| **Pattern** (reducing-complexity, information-hiding) | Recognition scenarios, application, counter-examples | Identifies when *and when not* to apply it |
| **Reference** (APIs, command guides) | Retrieval scenarios, application, gap testing | Finds and correctly applies the information |

## Common Rationalizations for Skipping Testing

| Excuse | Reality |
|--------|---------|
| "Skill is obviously clear" | Clear to you ≠ clear to other agents. Test it. |
| "It's just a reference" | References can have gaps, unclear sections. Test retrieval. |
| "Testing is overkill" | 15 min testing saves hours of debugging. |
| "I'll test if problems emerge" | Problems = agents can't use skill. Test BEFORE deploying. |
| "Too tedious to test" | Testing is less tedious than debugging bad skill in production. |
| "I'm confident it's good" | Confidence is not evidence. Test anyway. |
| "Academic review is enough" | Reading ≠ using. Test application scenarios. |
| "No time to test" | Deploying untested skill wastes more time fixing it later. |
