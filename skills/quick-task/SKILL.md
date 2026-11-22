---
name: quick-task
description: Use when one or more small, decision-complete changes can ship together in one pull request without product shaping.
---

# Quick Task

**Entry:** one or more small, decision-complete requests where the asks themselves are the spec.
**Exit:** the shared delivery path returns merged and cleaned up, or the request moves to planning.

## 1. Scope check

Confirm that each change has an established owner in the codebase, has no unresolved product decisions, and fits with the rest inside one PR. Several small fixes may share that PR as one task each. Explore only enough to name the owning files and any binding repository rules. If any of these conditions fail, use `brainstorming` and `writing-plans` instead. A quick task may reference an existing tracker ticket, but never creates one to mirror a small local change.

## 2. Mini-plan

Write a git-ignored plan at `.toolbelt/quick/<slug>-plan.md` with one task per fix in a single PR boundary and `Risk` set. Follow writing-plans' task fields and include a `## Risks` section, as shown in [mini-plan-example.md](mini-plan-example.md). Run `bash ../writing-plans/scripts/plan-check PLAN` and fix anything it reports. Keep the mini-plan as scratch and never commit it.

## 3. Deliver

Invoke toolbelt:delivery with the mini-plan's absolute path so it stays reachable after delivery enters the worktree. Delivery owns the worktree, routing, implementer, review, optional UX review, PR, merge, and cleanup. Do NOT invoke any other skill.
