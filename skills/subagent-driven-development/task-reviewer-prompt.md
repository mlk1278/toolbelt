# Task Reviewer Prompt Template

Use when dispatching a task reviewer.

```
Subagent (role: reviewer):
  description: "Review Task N (spec + quality)"
  model: [MODEL — REQUIRED: per SKILL.md Model Selection]
  prompt: |
    Review one task's implementation: its requirements, and its quality.

    ## What Was Requested

    Read the task brief: [BRIEF_FILE]

    Constraints binding this task:
    [GLOBAL_CONSTRAINTS]

    ## Project Review Guidance

    Read `docs/REVIEW-GUIDANCE.md` if it exists at the repository root.
    This file is reviewer-only. Report conflicts with the task requirements
    instead of guessing. This read is an explicit exception to the limits on
    evidence below.

    ## Task-Specific Review Nuance

    [REVIEW_NUANCE]

    Concrete context or risk only. It does not override requirements,
    suppress findings, or set severity.

    ## What the Implementer Claims They Built

    Read the implementer's report: [REPORT_FILE]

    Verify every claim against the diff.

    ## Diff Under Review

    **Base:** [BASE_SHA]  **Head:** [HEAD_SHA]  **Diff file:** [DIFF_FILE]

    Your evidence: the brief, the report, the review guidance, the smell
    baseline, and the diff file, each read once, plus one targeted read per
    suspected finding, named with the finding it served. A judgment needing
    wider context is a ⚠️ item for the controller. Leave the working tree
    untouched; dispatch no subagents. If the diff file is missing,
    reconstruct it with `git diff [BASE_SHA]..[HEAD_SHA]`.

    The reported runs are the test evidence; take at most one focused run
    on a doubt they leave open. Noise in that output is a finding.

    ## Part 1: Spec Compliance

    Against the requirements:

    - **Missing:** skipped, or claimed but not implemented
    - **Extra:** unrequested features, over-engineering
    - **Misunderstood:** right feature built wrong, wrong problem solved

    A requirement you cannot verify from this diff is a ⚠️ item.

    ## Part 2: Code Quality

    - **Code:** name any smell in the baseline at [SMELLS_FILE] this diff
      matches, quoting the hunk.
    - **Tests:** every guard, absence, or negative assertion must be **seen
      red** in the report — its TDD RED, or a recorded mutate-and-revert; a
      guard without that evidence is Important whatever the report claims.
      Do new and changed tests verify real behavior, not mocks? Are the
      task's edge cases covered? When the diff deletes tests, name the
      surfaces that lose assertions and where that coverage moved.
    - **Structure:** does it follow the plan's file structure? judge what
      this change added, not pre-existing file sizes.

    ## Calibration

    Categorize by severity. **Important** means this task cannot be
    trusted until it is fixed: incorrect or fragile behavior, a missed
    requirement, or maintainability damage you would block a merge over —
    verbatim duplication of a logic block, swallowed errors, tests that
    assert nothing. "Coverage could be broader" and polish are **Minor**.

    If the plan or brief mandates something this rubric calls a defect,
    report it as Important, labeled plan-mandated. The human decides.

    ## Output Format

    Your final message is the report, beginning with the spec-compliance
    verdict. Every line is a verdict, a finding with file:line, or a check
    you ran — never a bare "yes."

    ### Spec Compliance

    - ✅ Spec compliant | ❌ Issues found: [missing/extra/misunderstood, with
      file:line]
    - ⚠️ Cannot verify from diff: [what you could not verify and what the
      controller should check — alongside the verdict]

    ### Strengths
    [What's well done?]

    ### Issues

    #### Critical (Must Fix)
    #### Important (Should Fix)
    #### Minor (Nice to Have)

    For each: file:line, what's wrong, why it matters, the fix.

    ### Assessment

    **Task quality:** [Approved | Needs fixes]

    **Reasoning:** [1-2 sentences]
```

**Placeholders**, all required:
- `[MODEL]` — reviewer model per SKILL.md Model Selection
- `[BRIEF_FILE]` — the task brief, from `scripts/task-brief PLAN N`
- `[GLOBAL_CONSTRAINTS]` — requirements copied verbatim from the plan or spec
- `[REVIEW_NUANCE]` — task-specific context or risks; `None` if none
- `[REPORT_FILE]` — the implementer's report
- `[BASE_SHA]` / `[HEAD_SHA]` — commit before this task / current commit
- `[DIFF_FILE]` — the `scripts/review-package BASE HEAD` path; the package
  never enters the controller's context
- `[SMELLS_FILE]` — resolved path to
  `../requesting-code-review/smell-baseline.md`
