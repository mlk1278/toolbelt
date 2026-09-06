---
name: writing-for-agents
description: Use when editing the prose of any agent-consumed document — a skill body or description, AGENTS.md or CLAUDE.md, a dispatch prompt template — to decide what to cut, where material sits, and how a trigger is worded
---

# Writing for Agents

Rules for any document an agent reads — a skill, an `AGENTS.md` or `CLAUDE.md`, a dispatch prompt, a linked doc. The packaging differs; the writing does not. The goal is the same process every run, not the same output.

When the document is a skill, read [SKILL-MECHANICS.md](SKILL-MECHANICS.md) for frontmatter, invocation choice, and router skills.

## Pointers to other material

A skill's description, or a line in `AGENTS.md` naming a doc, is a pointer: it says what the material is and when to read it. Its wording, not its target, decides whether the agent gets there. If needed material sits behind a weak pointer, sharpen the wording first; inline the material only if that fails.

- Front-load the trigger: the condition for reading goes before the contents.
- One trigger per branch. Two synonyms for one case are that case written twice; collapse them.
- Cut identity the target already states.

Example: `Use when a test is flaky, order-dependent, or times out` beats `Notes on our async test helpers`.

## The two loads

Every document spends one of two budgets. Context load is what sits in the agent's window every turn — an `AGENTS.md` line, a skill description — costing tokens and attention whether or not it fires. Cognitive load is what your human partner must remember: which documents exist and when to reach for each.

Material behind a pointer escapes context load for the price of its own line; material with no pointer rides entirely on cognitive load. Spend cognitive load where human judgement matters; remove it where it does not.

## Where material sits

Three tiers, by how immediately the agent needs the material: steps in the file, reference in the file, reference in a separate file behind a pointer.

Inline what every branch of the document needs. Put behind a pointer what only some branches reach. Push too little down and the file bloats; push too much and the agent misses what it needs.

Keep one concept's definition, rules, and caveats under one heading rather than scattered, so reading one part brings its neighbours.

Example: a review skill's four rules belong inline; the API reference they cite belongs in its own file.

## Completion criteria

Every step ends on a condition telling the agent it is done. Make it checkable and exhaustive: "every modified model accounted for" beats "produce a change list", which beats "understanding reached".

A vague bound invites the agent to stop early. Sharpen it first — cheap and local. Split the sequence only when the bound is genuinely fuzzy and you have watched the agent rush it, and only across a real context boundary such as a subagent dispatch.

## When to split

Split a run of steps when later steps tempt the agent to rush the one in front of it. Splitting by invocation is skill-specific: see [SKILL-MECHANICS.md](SKILL-MECHANICS.md).

## Word choice

One word the model already knows beats a sentence explaining it. "A fast, deterministic, low-overhead loop" becomes "a tight loop". Invented words recruit nothing: you pay in definition tokens what a familiar word gives free.

State the target behavior rather than the prohibition. Banning something puts it in context and makes it more available. "Write one-line comments" works where "don't write long comments" does not. Use a prohibition only as a guardrail you cannot phrase positively, and pair it with the positive target.

## Pruning

- Keep each rule in one place, so changing behavior is a one-place edit. The same rule in two places costs tokens and drifts.
- The environment is a source of truth: `package.json` scripts, config files, `--help` output. Restate it only when the lookup is expensive or the answer is unwritten — the convention, the reason, the gotcha no config confesses.
- Delete lines that no longer bear on what the document does.
- Delete instructions the model already follows by default. Whether a line is a no-op is settled by running the document with and without it, not by argument. Delete the whole sentence rather than trimming its words.

A gate earns forceful phrasing only where the failure is expensive or irreversible and a brief instruction measurably failed. Keep such blocks short, and re-test them when the model changes.
