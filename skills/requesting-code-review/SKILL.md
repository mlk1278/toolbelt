---
name: requesting-code-review
description: Use when completing tasks, implementing major features, or before merging to verify work meets requirements
---

# Requesting Code Review

Dispatch a code reviewer subagent after each task in subagent-driven development, after a major feature, before merging to main, or whenever your human partner asks. The reviewer gets crafted context, never your session's history: that keeps it on the work product rather than your thought process.

## How to Request

**1. Get git SHAs:**

```bash
BASE_SHA=$(git merge-base origin/main HEAD)  # or the base you recorded before the work began
HEAD_SHA=$(git rev-parse HEAD)
```

BASE is the recorded commit before the work, never `HEAD~1`, which drops every commit but the last, leaving the reviewer to approve a diff that isn't the work.

**2. Build the review package** with `review-package` from the subagent-driven-development skill's `scripts/` directory:

```bash
../subagent-driven-development/scripts/review-package $BASE_SHA $HEAD_SHA
```

It writes the commit list, stat summary, and the diff with extended context to one file and prints the path. Pass that path as `{DIFF_FILE}` — the reviewer reads one file instead of re-deriving the diff, and the diff never enters your context. Skip this step only if the script isn't reachable; pass `None` and the reviewer falls back to git commands.

**3. Dispatch the reviewer** on the `reviewer` route (specialty `code`) from the session routing brief, filling the template at [code-reviewer.md](code-reviewer.md). Pass the author's model for reviewer independence.

Do not read `docs/REVIEW-GUIDANCE.md` yourself. The reviewer template loads it when it exists. Fill `{SMELLS_FILE}` with the resolved path of [smell-baseline.md](smell-baseline.md). Supply only concise nuance from the approved requirements and concrete risks; use `None` if none.

**Placeholders:**
- `{DESCRIPTION}` - Brief summary of what you built
- `{PLAN_OR_REQUIREMENTS}` - What it should do
- `{REVIEW_NUANCE}` - Review-specific context or concrete risks
- `{BASE_SHA}` - Starting commit
- `{HEAD_SHA}` - Ending commit
- `{DIFF_FILE}` - Review package path from step 2 (`None` if unavailable)
- `{SMELLS_FILE}` - Resolved path of `smell-baseline.md`

**4. Act on feedback:** fix Critical and Important issues before proceeding, note Minor ones for later, and push back with technical reasoning where the reviewer is wrong.
