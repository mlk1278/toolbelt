---
name: verification-before-completion
description: Use before claiming work is complete, fixed, or passing, and before committing or opening a PR.
---

# Verification Before Completion

Before reporting status, check every claim against a tool result from this session, and drop any claim that no run backs. An agent's success report is only a claim; read the diff yourself.

Run the tests related to your changes using the project's related-tests command as printed, without widening its scope, plus an incremental typecheck and lint of the touched packages. One run like this at the end of the PR is the local gate; the full suite belongs to CI. A regression test counts only after you see it fail and then pass.

| Claim | Evidence |
|---|---|
| Tests pass | the test command's output, 0 failures, at the scope you name |
| Build succeeds | the build command, exit 0 |
| Bug fixed | the symptom's test failed before the fix and passes now |
| Agent completed | the diff shows the change |

Before your final report, stop every long-running process you started. If you leave one running on purpose, name it and who stops it.
