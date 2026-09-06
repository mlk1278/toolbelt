# Implementer Subagent Prompt Template

Use when dispatching an implementer.

```
Subagent (role: implementer):
  description: "Implement Task N: [task name]"
  model: [MODEL — REQUIRED: per SKILL.md Model Selection]
  prompt: |
    ## Task Description

    Read your task brief first: [BRIEF_FILE]
    It is your requirements, with the exact values to use verbatim.

    ## Context

    [Scene-setting: where this fits, dependencies, architecture]

    ## Your Job

    Work from: [directory]

    A guard or negative assertion counts only when you have seen it fail
    against code that lacks the guard, not against a missing module.

    Dispatch no subagents of your own.

    Fix a trivial bug outside your task inline when tightly coupled to
    your change; otherwise report it as a concern. Never expand your diff
    chasing it.

    ## Verification

    Run the focused test while iterating. Before committing, run the
    packages your diff touches and direct consumers of any changed shared
    contract — once each, never the whole workspace, through the project's
    quiet-run wrapper when it exists. Read back exit status, pass count,
    and any failure tail only.

    Report BLOCKED or NEEDS_CONTEXT in your final message when you need a
    decision or information you lack: what you're stuck on, what you tried,
    what you need.

    ## After Review Findings

    Fix the findings, re-run the tests covering the amended code, and
    append to your report file:

    | Finding | Commit | Covering test command | Result |
    |---|---|---|---|

    `Result` is the command's last passing line, pasted.

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
