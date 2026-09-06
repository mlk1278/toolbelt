---
name: writing-skills
description: Use when creating new skills, editing existing skills, or verifying skills work before deployment
---

# Writing Skills

A skill is a reference guide for a proven technique, pattern, or tool, not a story about solving something once. Skills are behavior-shaping code; write them under TDD.

**REQUIRED BACKGROUND:** `toolbelt:test-driven-development` defines the RED-GREEN-REFACTOR cycle this adapts; `toolbelt:writing-for-agents` holds the editorial rules every skill edit applies. Anthropic's authoring guidance: [anthropic-best-practices.md](anthropic-best-practices.md).

**Scope.** New behavior-shaping guidance — a new skill, rule, or gate — needs a baseline first: watch an agent fail without it, write against that failure, then close the loopholes it finds next. Editing what exists does not: condensing, restructuring, fixing a link, or rewording a rule whose behavior you are not changing needs only to be *correct*. Can't tell? Ask whether an agent would behave differently after the edit. Yes → baseline first.

## Testing

Test a new or changed behavior-shaping skill before shipping it. The method, pressure scenarios, micro-tests, and the checklist are in [testing-skills-with-subagents.md](testing-skills-with-subagents.md).

## When to Create a Skill

**Create when** the technique wasn't obvious, you'd use it again across projects, and it applies broadly.

**Don't create for** one-off solutions, standard practices documented elsewhere, project-specific conventions (those belong in the consuming project's instructions file), or constraints a regex or validator can enforce. Automate those; document judgment calls.

**Split by trigger, not by size.** A distinct entry condition earns its own skill and description, however short the body; one description straddling two degrades both.

## Structure

```
skills/skill-name/
  SKILL.md              # required
  supporting-file.*     # heavy reference (100+ lines) or reusable tools
```

Flat namespace; all skills are searchable together. Keep principles, concepts, and code patterns under ~50 lines inline; split out API references, full syntax, and scripts, loaded only when needed.

Frontmatter is exactly `name` and `description`, max 1024 characters ([full spec](https://agentskills.io/specification)); names use letters, numbers, hyphens.

## The Description Field

**The highest-leverage line in any skill.** It answers one question for an agent choosing what to load: "should I read this now?"

**Describe when to use it. Never summarize what it does.** A description that summarized the workflow caused one review instead of two: the agent followed it and never read the body.

```yaml
# ❌ Summarizes workflow
description: Use when executing plans - dispatches subagent per task with code review between tasks

# ✅ Triggering conditions only
description: Use when executing implementation plans with independent tasks in the current session
```

Write in third person (it lands in the system prompt). Use triggers, symptoms, and error strings an agent would search for — "Hook timed out", "ENOTEMPTY", "flaky". Name the *problem* (race conditions), not a language-specific symptom (`setTimeout`), unless the skill is technology-specific.

## Match the Form to the Failure

Classify the baseline failure first: the form that bulletproofs one failure measurably backfires on another.

| Baseline failure | Right form | Wrong form |
|---|---|---|
| Skips a rule under pressure (knows better, does it anyway) | One-sentence rule + reason; after that measurably fails, prohibition + rationalization table | Soft guidance ("prefer", "consider") |
| Output has the wrong shape (bloated prompt, buried verdict, restated spec) | Recipe: what the output IS, its parts in order | Prohibitions ("don't restate") |
| Omits an element from what they already produce | Structural: a REQUIRED slot in the template | Prose reminders near the template |
| Behavior should depend on a condition | Conditional on an observable predicate ("if the brief exists, reference it") | Unconditional rule + exemptions |

**Why prohibitions backfire on shaping problems:** under a competing incentive, agents negotiate with "don't X". In wording tests on dispatch prompts, the prohibition arm produced more unwanted content than the recipe arm (fully separated distributions), and trended worse than the no-guidance control. A recipe leaves nothing to negotiate. Micro-test your own case.

**Whichever form you pick:**
- **No nuance clauses.** "Don't X unless it matters" reopens the negotiation — one appended to a winning recipe degraded it from consistent to noisy in the same tests. Express a real exception as a conditional on an observable predicate.
- **Exemption clauses don't scope.** "This limit doesn't apply to code blocks" still suppresses them; restructure so the rule can't reach the exempt part.

## Bulletproofing Against Rationalization

Use this only after a baseline shows the agent skipping a known rule under pressure and a brief instruction has failed to stop it. Frontier models overtrigger on aggressive phrasing; the default form is one sentence stating the rule and its reason.

- **Close every loophole.** Name the workarounds the baseline produced, not just the rule.
- **Build a rationalization table.** Each baseline excuse gets a row and a one-line reality, quoted verbatim rather than paraphrased.
- **List the red-flag thoughts,** so an agent mid-rationalization can self-check, ending with what to do instead.
- **Cut off spirit-versus-letter arguments** by saying the rule binds as written.

Why these work: [persuasion-principles.md](persuasion-principles.md) (Cialdini 2021; Meincke et al. 2025).

## Naming

Name by what you DO or the core insight — verb-first, gerunds for processes:

- ✅ `condition-based-waiting` > `async-test-helpers`
- ✅ `root-cause-tracing` > `debugging-techniques`
- ✅ `creating-skills` > `skill-creation`

## Cross-Referencing Other Skills

Name the skill with a requirement marker — `**REQUIRED BACKGROUND:** You MUST understand toolbelt:systematic-debugging`. A bare `See skills/testing/test-driven-development` leaves it unclear whether it's required.

**Never use `@` links.** `@skills/.../SKILL.md` force-loads the file, burning context before you need it.

## Flowcharts

Use one only for a non-obvious decision point, a loop where you'd stop early, or an A-vs-B choice. Use tables for reference, markdown blocks for code, numbered lists for linear steps. Labels carry meaning: `helper1` and `step3` are useless.

Style rules are in `graphviz-conventions.dot`. Show diagrams to your human partner with `./render-graphs.js ../some-skill` (`--combine` for one SVG).

## Code Examples

**One excellent example beats many mediocre ones.** Complete, runnable, from a real scenario, commented to explain WHY, in the language that fits the domain — no fill-in templates. One is enough.
