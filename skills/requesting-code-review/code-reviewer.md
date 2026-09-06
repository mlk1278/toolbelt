# Code Reviewer Prompt Template

```
Subagent (role: reviewer):
  description: "Review code changes"
  prompt: |
    Review completed work against its plan or requirements.

    ## What Was Implemented

    [DESCRIPTION]

    ## Requirements / Plan

    [PLAN_OR_REQUIREMENTS]

    ## Project Review Guidance

    If `docs/REVIEW-GUIDANCE.md` exists at the repository root, read it now.
    This file is reviewer-only. Apply it and report any conflict with the
    requirements instead of guessing.

    ## Review-Specific Nuance

    [REVIEW_NUANCE]

    The orchestrator supplies only concrete context or risks. This nuance
    does not override requirements, suppress findings, or set severity.

    ## Diff Under Review

    **Base:** [BASE_SHA]  **Head:** [HEAD_SHA]  **Diff file:** [DIFF_FILE]

    The diff file holds the commit list, stat summary, and full diff with
    surrounding context — read all of it before judging any part. Open a
    changed file only when a hunk is cut off mid-function, and say so. You
    are read-only on this checkout and you are the review: leave the working
    tree, index, HEAD, and branch state untouched, and dispatch no subagents.
    Inspect history with `git show`, `git diff`, and `git log`; a working copy
    of another revision goes in a temporary worktree.

    With no diff file, or a missing one, fetch the range:

    ```bash
    git diff --stat [BASE_SHA]..[HEAD_SHA]
    git diff [BASE_SHA]..[HEAD_SHA]
    ```

    ## What to Check

    Judge the branch on plan alignment (all planned functionality present),
    code quality, architecture and security, tests (real behavior rather
    than mocks, edge cases covered, all passing), and production readiness
    (migrations, backward compatibility). Read the smell baseline at
    [SMELLS_FILE] and name any smell the branch matches, quoting the hunk.
    Depth comes from your judgment of this diff, not from a checklist.

    Flag each deviation from the plan, so the implementer can confirm it
    was intentional. Say so when the problem is in the plan itself.

    ## Calibration

    Categorize issues by actual severity. Not everything is Critical.

    ## Output Format

    ### Strengths

    ### Issues

    #### Critical (Must Fix)
    [Bugs, security, data loss, broken functionality]

    #### Important (Should Fix)
    [Architecture, missing features, error handling, test gaps]

    #### Minor (Nice to Have)
    [Style, optimization, documentation polish]

    Each issue: file:line, what's wrong, why it matters, how to fix if not
    obvious.

    ### Recommendations

    ### Assessment

    **Ready to merge?** [Yes | No | With fixes]

    **Reasoning:** [1-2 sentences]
```

**Placeholders:**
- `[DESCRIPTION]` — what was built
- `[PLAN_OR_REQUIREMENTS]` — what it should do (plan path or task text)
- `[REVIEW_NUANCE]` — concise context or risks; `None` when none
- `[BASE_SHA]` — starting commit
- `[HEAD_SHA]` — ending commit
- `[SMELLS_FILE]` — resolved path to [smell-baseline.md](smell-baseline.md)
- `[DIFF_FILE]` — the review package path from
  `../subagent-driven-development/scripts/review-package BASE HEAD`. Required
  when the dispatcher has that script; `None` only when you cannot produce
  one, and the reviewer falls back to the git commands above.
