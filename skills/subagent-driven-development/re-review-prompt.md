# Re-Review Prompt Template

```
Subagent (role: reviewer):
  description: "Re-review Task N fixes"
  model: [MODEL — from the resolved route]
  prompt: |
    Check whether the fixes for Task N's review findings worked.

    - Task brief: [BRIEF_FILE]
    - Findings under verification: the Critical and Important findings and
      spec gaps in the latest round of [REVIEW_FILE]
    - Fix results: the findings table appended to [REPORT_FILE]
    - Fix diff: [DIFF_FILE], covering [FIX_BASE_SHA]..[HEAD_SHA]. If it is
      missing, run `git diff [FIX_BASE_SHA]..[HEAD_SHA]`.
    - Project review guidance: `docs/REVIEW-GUIDANCE.md` at the repository
      root, if it exists.

    Read whatever else you need, and run a test when a row's evidence
    leaves a real doubt. You are read-only: leave the working tree
    untouched and dispatch no subagents.

    For each finding, in order: ADDRESSED or NOT ADDRESSED, with file:line
    evidence. The defect must be gone; an attempt is not enough.
    A `REBUTTED` row is ADDRESSED when its reasoning holds against the
    code; otherwise NOT ADDRESSED, saying why.

    Then report anything the fix broke or introduced, with severity
    (Critical, Important, Minor) and file:line. Problems outside the fix
    diff go under Out of scope: they are logged for the final review and
    never extend the fix loop.

    Append to [REVIEW_FILE] under `## Re-review <head7>`: the per-finding
    verdicts, new breakage or "None", out-of-scope notes or "None", and
    the verdict — all findings addressed with no new Critical or Important
    breakage, or findings remain open.

    Reply with only: the head SHA, the verdict, one line per open finding
    and per new Critical or Important breakage, the out-of-scope count, and
    the review file path, in under 12 lines unless the findings need more.
```

**Placeholders:**
- `[MODEL]` — the route of the review being re-checked (task reviewer, or `gate` for the final review)
- `[BRIEF_FILE]` — the task brief the implementer worked from; for final-review fixes, the plan path
- `[REVIEW_FILE]` — the task's review file, or `final-review.md`
- `[REPORT_FILE]` — the implementer's report, fix tables appended
- `[FIX_BASE_SHA]` — the head the previous review saw
- `[HEAD_SHA]` — the current commit
- `[DIFF_FILE]` — the path `scripts/review-package --plan PLAN_FILE FIX_BASE HEAD` printed
