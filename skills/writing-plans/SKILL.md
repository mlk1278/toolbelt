---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code
---

# Writing Plans

## Overview

Write the plan for a capable engineer with **zero context for our codebase**: the files each task touches, the contracts, each test's purpose, the verification.

**The plan decides everything; the implementer writes the code.**

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

**Save plans to:** `docs/toolbelt/plans/YYYY-MM-DD-<feature-name>.md`, or your human partner's location when they name one.

## Scope Check

If the spec covers independent subsystems, propose one plan each. Every plan produces working, testable software on its own.

## Exploration Before Drafting

Read the nearest instructions for the target files. Run 2–3 targeted inline `rg` searches for the named symbols, neighboring tests, and existing pattern.

Dispatch through toolbelt:agent-routing's `explorer` role only for a completeness inventory, an invisible trap, or a plan-shaping existence question. Start with one explorer; more require unfamiliar, independent subsystems whose answers do not depend on each other.

Ask for checkable paths and pointers: line ranges, a reference implementation to copy, contracts, prerequisites, gotchas. End every brief with: **"What would a competent implementer, working only from a written plan and unable to see this code, get wrong here?"**

### The Gotcha Hunt

- **Assertions that can never pass.** An absence check must exclude its own evidence.
- **Checks that can't fail.** A guard whose setup never reaches its branch, or a precondition read from output the gated command itself produces. A gate is a separate command that exits first.
- **Coverage that leaves with the code.** Name the kept surfaces losing assertions, relocate that coverage green, then delete.
- **Tooling traps.** Inverted exit codes (`git grep` 0 = matched = FAIL), tools missing on CI.
- **Order.** Codegen, migrations, or fixtures the tests need first.
- **Shared contracts.** Other consumers of a changed signature, table, or event.
- **Environment drift.** Where local and CI disagree.

Every gotcha ends this pass **resolved** — the plan shows the code, exclusion, or ordering that handles it — or **named**, with an instruction to escalate. A gotcha that is neither is a plan defect.

## File Structure

Map the files the work creates or modifies and what each is responsible for: one responsibility and a defined interface each, following the codebase's patterns. Files that change together live together — split by responsibility, not by layer, and split only a file you already modify.

## Task Right-Sizing

A task is the smallest unit worth its own test cycle and a fresh reviewer's gate, ending in an independently testable deliverable. Fold setup, configuration, and documentation into the task whose deliverable needs them. Split only where a reviewer could reject one task and approve its neighbor. Each step is one action (2-5 minutes).

- A task's **Files:** block is closed: every file it creates or modifies. "Plus every caller" and "wherever else it is referenced" fail No Placeholders.
- A task lists at most 8 files, a hard limit; as a guide its change reads in one sitting, around 400 lines. The one exception is a mechanical sweep — one uniform, behavior-neutral transformation with one verification command. That task says "Mechanical sweep:" and names the command.
- A task changing a migration, shared schema, shared type, or shared contract owns the code that keeps it correct; fencing that into a later task is a defect. Over 8 files, split into serial tasks that each leave the contract correct.

## Plan Document Header

Every plan starts with this header:

```markdown
# [Feature Name] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use toolbelt:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

## Global Constraints

[The spec's project-wide requirements — version floors, dependency limits,
naming and copy rules, platform requirements — one line each, with exact
values copied verbatim from the spec. Every task's requirements implicitly
include this section.]

## Known Gotchas

[Cross-cutting traps exploration surfaced, one line each, with the decision
that handles each. Task-specific traps belong on their task instead. Every
task implicitly includes this section.]

## Data Model

[When the work adds or changes schema, migrations, shared types, or
contracts: the complete code, here, once. Tasks reference it instead of
repeating it. Omit the section when there is none.]

---
```

## PR Boundaries

Partition the plan into independently verifiable pull requests before writing tasks.

| PR | Outcome | Tasks | Depends on | Independent verification |
|---|---|---|---|---|
| 1 | [one reviewable outcome] | [exact task numbers] | [boundary numbers or none] | [command or observable result] |

Every task number appears in exactly one boundary; each boundary's verification passes without later boundaries. A one-PR plan states why no smaller independently verifiable outcome exists. A boundary's `Depends on` names at most one predecessor whose PR may still be open when the boundary starts; every other dependency merges first.

For shared substrate, take the core plus one representative consumer first. Later consumers share a PR only when they repeat the same reviewer judgment. Novel lifecycle, export, or rollout work stays separate.

## Execution Tracks

Required for every plan with more than one PR boundary or more than three tasks. A plan whose tracks are all `serial-N` states in one sentence why no tasks can run concurrently. The section follows `## PR Boundaries`; its table shape and declaration rules are in [execution-tracks.md](execution-tracks.md) — read it before declaring tracks.

## Plan Altitude: Contracts, Not Implementations

Specify each artifact at the altitude where its decision lives:

| Artifact | The plan writes |
|---|---|
| Data model — schema, migrations, shared types | Complete code, once, in `## Data Model`; tasks derive from it |
| Constants, config, fixtures | Exact values |
| Functions and services | Signature stubs: name, parameters, return type, error behavior. A load-bearing line only when it is itself the decision |
| Endpoints | Method, path, request/response shape, status codes, capability |
| Tests | One line per test: name — setup — assertion. Full code only where the harness is a trap with no in-repo precedent |
| UI components | Name, props contract, states, primitives to compose |
| Anything with in-repo precedent | The decision plus the reference to copy: `path:line` |

**The altitude test:** a step is fully specified when two capable implementers working from it independently produce behaviorally interchangeable code.

## Task Structure

A guard or negative assertion (a permission check, a tenant filter, a rejection path) lists its red as the failure seen when the guard is absent, not when the module is absent.

````markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**Interfaces:**
- Consumes: [what this task uses from earlier tasks — exact signatures]
- Produces: [what later tasks rely on — exact function names, parameter
  and return types. A task's implementer sees only their own task; this
  block is how they learn the names and types neighboring tasks use.
  Write `Produces: none` when nothing downstream depends on this task.]

**Gotchas:**
- [Traps in this task's code, each with the decision that handles it, or
  the constraint and an instruction to escalate. Omit the field if none.]

- [ ] **Step 1: Write the failing tests**

In `tests/exact/path/to/test.py`, one line per test — name — setup — assertion:
- `test_rejects_duplicate_key` — org already has a definition with key `size` — `create_definition` raises `DuplicateKeyError`
- `test_defaults_type_to_text` — input omits `type` — created row has `type == "TEXT"`

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/path/test.py -v`
Expected, per test:
- `test_rejects_duplicate_key` — FAIL: `create_definition` not defined
- `test_defaults_type_to_text` — FAIL: `create_definition` not defined

- [ ] **Step 3: Implement to the contract**

```python
def create_definition(org_id: str, input: CreateDefinitionInput) -> Definition:
    """Raises DuplicateKeyError (-> 409 DUPLICATE_KEY) when org already has input.key."""
```

Decisions the stub can't carry, one line each: [take the definition locks
before the entity row; copy the tenancy filter from `definitions/service.py:88`]

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/path/test.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
```
````

## No Placeholders

A placeholder is an **undecided decision**, not unwritten code. Never write:
- "TBD", "TODO", "implement later", "fill in details"
- "Add error handling" / "add validation" / "handle edge cases" — name the exact behavior
- "Write tests for the above" — enumerate each test: name — setup — assertion
- "Similar to Task N" — restate this task's contract in full
- References to types, functions, or methods no task defines

## Self-Review

Check the plan against the spec yourself, not with a subagent. Fix findings inline; add a task for any spec requirement with none. Run every Plan Review Gate judgment below against your own plan. A plan with no `## Execution Tracks` section, one PR boundary, and three or fewer tasks is valid.

## Plan Review Gate

**Required.** After self-review, save the plan and have a different harness review it.

Resolve the reviewer through toolbelt:agent-routing with role `reviewer`, specialty `plan`, and the writing harness as `author-harness`, following that skill's resolver-path contract. `--author-harness` drops same-harness routes case-insensitively and fails closed if none remain; if resolution fails, stop and tell your human partner. Never pick a reviewer yourself.

Dispatch the reviewer with the plan and spec paths. It may fan out its own explorers. Ask it to judge:

- **Spec coverage** — every requirement traceable to a task, nothing extra
- **Task decomposition** — independently testable, within the 8-file limit, workable order
- **Interface consistency** — types, signatures, and names agree across tasks
- **Placeholders** — any step that defers a decision
- **Altitude** — implementation code where a contract belongs; a Data Model missing or repeated
- **Unflagged gotchas** — traps the plan does not warn about
- **Global Constraints** — present, with exact values from the spec
- **PR boundaries** — missing, horizontal, overlapping, or unjustified boundaries are defects; every task appears once, each independently verifiable
- **Execution tracks** — the declaration rules; a plan with no concurrent tracks and no one-sentence justification is a defect

Handle findings the way writing-specs does: small technical gaps — fix and proceed; a rework large enough to change the approach — bring it to your human partner; unsure — ask.

## Execution Handoff

After the review is clean, hand your human partner the whole plan; delivery owns boundary order.

> "Plan complete and saved to `docs/toolbelt/plans/<filename>.md`, reviewed through <reviewer harness>. Handing the plan to delivery."

Delivery runs toolbelt:subagent-driven-development per boundary: fresh subagent per task, task review after each, broad whole-branch review at the end.
