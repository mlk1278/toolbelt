---
name: brainstorming
description: "Use before creating features, building components, adding functionality, or changing behaviour. Explores intent, requirements, and design before implementation."
---

# Brainstorming Ideas Into Designs

<HARD-GATE>
Present a design and get your human partner's approval before invoking an implementation skill, writing code, or scaffolding, whatever the project's size. The one exception is an accepted frontend-first offer: invoke toolbelt:interactive-design, which authorizes prototype implementation inside that skill.
</HARD-GATE>

## Checklist

Create a todo for each item and complete them in order.

1. **Explore project context.** Read the relevant files, docs, and recent commits.
2. **Assess scope.** Split independent subsystems into sub-projects; design the first one and backlog the rest.
3. **Ask clarifying questions.** Ask one question at a time until you can state the design.
4. **Propose approaches.** When several approaches are viable, present them with trade-offs and your recommendation.
5. **Present the design.** Walk through the design in sections and get approval after each one.
6. **Hand off.** Once every section is approved, invoke `toolbelt:writing-specs`, or the skill named by an accepted frontend-first offer. Do NOT invoke any other skill.

## Asking good questions

- Ask about the problem behind any named solution.
- Challenge the assumption most likely to be wrong: who uses this, what failure looks like, and what is out of scope.
- State inferences instead of asking: "I'm assuming X — correct me."
- Stop asking once answers stop changing the design.

## Presenting the design

- Cover architecture, components, data flow, error handling, and testing, each scaled to its own complexity.
- Split the system into units with one purpose and clear interfaces. If a consumer has to read a unit's internals, the boundary is wrong.
- Follow existing patterns. Fix existing problems only where they affect this work.

## Frontend-first offer

Offer this when the feature has a user-facing UI, its frontend and API live in this repository, and the intent-level design is approved. Send this message alone and wait for a reply.

> "This feature has a real user-facing surface — we could go frontend-first: I build the
> actual frontend against fixture-backed API routes in one sitdown session, we iterate
> until the design is right, and the backend gets implemented afterward from the
> contracts we settle. Want to? Otherwise I'll write the spec as usual."

- **Accepted.** Invoke `toolbelt:interactive-design`, where UI-detail design happens.
- **Declined.** Continue as usual, and offer again only if your human partner raises it.

When `design-fidelity-prep` is available, name both paths in the offer:

> "This feature has a real user-facing surface — we could go frontend-first, two ways:
> I build the actual frontend in-repo against fixture-backed API routes and we iterate
> in one sitdown session, or I prep a Claude Design session and you design on the
> canvas first, with implementation from the handoff bundle afterward. Either way the
> backend gets implemented from the contracts we settle. Want one of these? Otherwise
> I'll write the spec as usual."

- **In-repo.** Invoke `toolbelt:interactive-design`.
- **Claude Design.** Invoke `design-fidelity-prep`. Implementation re-enters through its design-fidelity-implement skill.

## Visual companion

Offer a browser tab for mockups once a question would be clearer shown than told. Send this message alone and wait for a reply.

> "This next part might be easier if I show you — I can put together mockups, diagrams, and comparisons in a browser tab as we go. It's still new and can be token-intensive. Want me to? I'll open it for you."

If accepted, read [visual-companion.md](visual-companion.md) and start the server with `--open`. If declined, stay text-only, and offer again only if your human partner raises it.
