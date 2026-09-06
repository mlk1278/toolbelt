---
name: quick-task
description: Use when a small, decision-complete change has one coherent outcome and can ship in one pull request without product shaping.
---

# Quick Task

**Announce:** "I'm using quick-task to ship this."

**Entry:** a small, decision-complete request — the ask itself is the spec.
**Exit:** the shared delivery path returns merged and cleaned up, or the request is redirected to planning.

## 1. Scope check

Confirm the work has one coherent outcome, an established owner surface, no unresolved product decision, and no need for multiple PRs. Explore only enough to name the owning files and binding repository rules. If any condition fails, use `brainstorming` and `writing-plans`. A quick task may reference an existing tracker ticket but never creates one to mirror a tiny local change.

## 2. Mini-plan

Write a git-ignored one-task implementation plan at `.toolbelt/quick/<slug>-plan.md` in writing-plans format. Include the request, exact files, TDD steps, and verification commands. It is scratch; never commit it.

## 3. Deliver

Invoke `delivery` with the mini-plan path, absolute so it survives the move into the delivery worktree. Delivery owns the worktree, routing, SDD, optional UX gate, PR, merge, and cleanup.
