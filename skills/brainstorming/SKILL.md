---
name: brainstorming
description: "Use before creating features, building components, adding functionality, or changing behaviour. Explores intent, requirements, and design before implementation."
---

# Brainstorming Ideas Into Designs

<HARD-GATE>
Present a design and get your human partner's approval before invoking an implementation skill, writing code, or scaffolding, whatever the project's size. The exception: after an accepted frontend-first offer, invoke toolbelt:interactive-design, where prototype implementation inside that skill is authorized.
</HARD-GATE>

## Checklist

Create a todo per item and complete them in order.

1. **Explore project context** — files, docs, recent commits
2. **Assess scope** — decompose independent subsystems into sub-projects; plan the first, backlog the rest
3. **Ask clarifying questions** — one at a time, until you can state the design
4. **Propose approaches** — trade-offs and your recommendation, when several are viable
5. **Present the design** — in sections, approval after each
6. **Hand off** — the terminal state: to writing-specs, or to interactive-design when they accepted the frontend-first offer

## Asking Good Questions

- **Ask about the problem, not the solution.** A named solution hides a problem; find it.
- **Chase the assumption you are most likely to get wrong.** Who uses this, what failure looks like, what is out of scope.
- **State inferences instead of asking.** "I'm assuming X — correct me."
- **Stop when questions stop changing the design.**

## Presenting the Design

- Scale each section to its complexity: architecture, components, data flow, error handling, testing.
- Ask whether each section looks right.
- Break the system into units with one purpose and defined interfaces: what each does, what it depends on. A consumer that must read the internals means the boundary is wrong.
- Follow existing patterns; fix existing problems only where they affect this work.

## After the Design

Once every section is approved, invoke writing-specs, or the skill an accepted frontend-first offer names below — invoke it and no other.

## Frontend-First Offer

Offer this path when the feature has a user-facing surface, its frontend and API live in this repository, and the intent-level design is approved.

The offer is its own message — only the offer — and wait.

> "This feature has a real user-facing surface — we could go frontend-first: I build the
> actual frontend against fixture-backed API routes in one sitdown session, we iterate
> until the design is right, and the backend gets implemented afterward from the
> contracts we settle. Want to? Otherwise I'll write the spec as usual."

- **Accepted** — invoke `toolbelt:interactive-design`; UI-detail design happens there.
- **Declined** — continue as usual; do not offer again unless they raise it.

### Claude Design variant

When `design-fidelity-prep` is available, the offer names both paths:

> "This feature has a real user-facing surface — we could go frontend-first, two ways:
> I build the actual frontend in-repo against fixture-backed API routes and we iterate
> in one sitdown session, or I prep a Claude Design session and you design on the
> canvas first, with implementation from the handoff bundle afterward. Either way the
> backend gets implemented from the contracts we settle. Want one of these? Otherwise
> I'll write the spec as usual."

- **In-repo** — invoke `toolbelt:interactive-design`.
- **Claude Design** — invoke `design-fidelity-prep`; implementation re-enters through its design-fidelity-implement skill.

## Visual Companion

A browser tab for mockups and diagrams. Do not offer upfront: wait until a question would be clearer shown than told.

> "This next part might be easier if I show you — I can put together mockups, diagrams, and comparisons in a browser tab as we go. It's still new and can be token-intensive. Want me to? I'll open it for you."

This offer is its own message — only the offer — and wait. If accepted, read `skills/brainstorming/visual-companion.md` and start the server with `--open`. If they decline, continue text-only and do not offer again unless they raise it.
