# Scoped Re-Review Prompt Template

Use when dispatching the re-review after the fix round.

```
Subagent (role: reviewer):
  description: "Re-review Task N fixes"
  model: [MODEL — REQUIRED: per SKILL.md Model Selection]
  prompt: |
    Mark each finding addressed or not and inspect the fix diff.

    ## The Task

    Task brief: [BRIEF_FILE]

    ## Project Review Guidance

    Read `docs/REVIEW-GUIDANCE.md` if it exists at the repository root;
    it is reviewer-only. Report conflicts with the task requirements.

    ## The Findings Under Verification

    The Critical and Important findings and spec gaps in the previous
    review, [REVIEW_FILE].

    ## The Fix

    Implementer's report: [REPORT_FILE]

    **Fix base:** [FIX_BASE_SHA]  **Head:** [HEAD_SHA]
    **Diff file:** [DIFF_FILE]

    Read the review file, the report's fix results, and the diff file once
    each. Leave the working tree untouched; dispatch no subagents. If the
    diff file is missing, rebuild it with `git diff [FIX_BASE_SHA]..[HEAD_SHA]`.

    Findings outside the fix diff go to the ledger and never extend the loop;
    report them under Out-of-Scope Observations.

    The report's fix results are the test evidence: confirm each row names
    the covering test command and its output, and check the claims against
    the diff. Run at most one focused check for remaining doubt.

    ## Output Format

    Append your report to [REVIEW_FILE] under `## Re-review <head7>`,
    starting with the first verdict. Every line is a verdict, a finding
    with file:line, or a check you ran.

    ### Finding Verdicts

    For each finding, in order:
    - **[finding one-liner]** — ADDRESSED | NOT ADDRESSED, with file:line
      evidence. "Attempted" is not addressed: the defect must no longer
      exist. A `REBUTTED` row is ADDRESSED when its reasoning holds
      against the code; otherwise NOT ADDRESSED, stating why.

    ### New Breakage in the Fix Diff

    Anything the fix broke or introduced, with severity
    (Critical/Important/Minor) and file:line. "None" if clean.

    ### Out-of-Scope Observations

    "None" if none.

    ### Verdict

    **Fix round:** [All findings addressed, no new Critical/Important
    breakage | Findings remain open] — list the open ones.

    Return: head, fix-round verdict, one line per open finding, rebuttal
    (with judgment), and new Critical/Important breakage, out-of-scope count,
    and review path. Use under 12 lines unless findings need more.
```

**Placeholders:**
- `[MODEL]` — REQUIRED: per SKILL.md Model Selection; small fix diffs take
  a cheap-to-mid tier
- `[BRIEF_FILE]` — the task brief (the same file the implementer worked from)
- `[REVIEW_FILE]` — the previous review's file
- `[REPORT_FILE]` — the implementer's report file, fix reports appended
- `[FIX_BASE_SHA]` — the head the previous review saw
- `[HEAD_SHA]` — current commit
- `[DIFF_FILE]` — the path printed by
  `scripts/review-package --plan PLAN_FILE FIX_BASE HEAD`
