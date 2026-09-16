# Implementer Subagent Prompt Template

Use when dispatching an implementer.

```
Subagent (role: implementer):
  description: "Implement Task N: [task name]"
  model: [MODEL — REQUIRED: per SKILL.md Model Selection]
  prompt: |
    ## Task Description

    Read your task brief first: [BRIEF_FILE]. It holds your requirements
    and the exact values to use verbatim.

    ## Context

    [Scene-setting: where this fits, dependencies, architecture]

    ## Your Job

    Work from: [directory]

    A guard or negative assertion counts only after you have seen it fail
    against code that lacks the guard, not against a missing module.

    Dispatch no subagents of your own.

    Wait for a background command with one blocking call (Monitor with an
    until-loop on its output file, or a foreground command with a timeout);
    never poll, sleep-loop, or tail logs between waits.

    Fix a trivial bug outside your task inline only when tightly coupled
    to your change; otherwise report it.

    ## Verification

    Run the focused test while iterating. Before committing, run the
    packages your diff touches and direct consumers of any changed shared
    contract once each, never the whole workspace, through the project's
    quiet-run wrapper when it exists, reading back only exit status, pass
    count, and any failure tail.

    Report BLOCKED or NEEDS_CONTEXT when you need a decision or
    information: what you're stuck on, what you tried, and what you need.

    ## UI smoke

    If your diff touches a file the app renders — a component, template,
    style, route, or copy shown on screen — run the smoke pass before
    reporting DONE: [UX_SMOKE]. Read `matrix.md` there and the policy,
    write the matrix for your task's pathway, start the server, and run
    `scripts/ux-capture <matrix> --smoke --pathway <name>
    --out .toolbelt/ux/smoke/task-N --project-root <repo root>`. No UX
    reviewer is involved.
    Fix every finding it reports at `should` or above inside this task.
    Report the run's `mechanical.json` path and the still paths under
    **UI smoke** in your report; write `UI smoke: not applicable` when your
    diff renders nothing. A finding you cannot fix inside this task's Files
    block means you report DONE_WITH_CONCERNS naming it.

    ## After Review Findings

    Fix the Critical and Important findings and spec gaps in the review
    file named in the fix request, re-run the tests covering the amended
    code, and append to your report file:

    | Finding | Commit | Covering test command | Result |
    |---|---|---|---|

    `Result` is the command's last passing line, pasted. A finding that is
    wrong for this codebase gets no code change: its Result is `REBUTTED:`
    plus technical reasoning and code/test evidence. Return rebuttals;
    never rebut for convenience.

    ## Report Format

    Write your full report to [REPORT_FILE]:
    - What you implemented (or attempted, if blocked)
    - What you tested and the results
    - **TDD Evidence** (when required): RED — command, failing output, why
      that failure was expected; GREEN — command and passing output; per
      guard, its seen-red command and output

    Report back with ONLY (under 15 lines):
    - **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
    - Commits created (short SHA + subject)
    - One-line test summary
    - Your concerns, if any
    - The report file path
```

**Placeholders:**
- `[UX_SMOKE]` — the ux-gate skill's absolute directory and the
  `.toolbelt/ux-policy.md` path when it exists, or `not applicable` for a
  task that renders nothing.
- `[BRIEF_FILE]` — path to this task's brief.
- `[REPORT_FILE]` — path the task report is written to.
