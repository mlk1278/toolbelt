---
name: verification-before-completion
description: Use before claiming work is complete, fixed, or passing, and before committing or opening a PR.
---

# Verification Before Completion

Before reporting status, audit each claim against a tool result from this session. A claim with no run behind it is not made. Scope the claim to the evidence: if you ran one package, say that package passed, and do not run the whole workspace to earn a broader claim. A regression test counts once it has been seen red and then green. An agent's success report is a claim; read the diff.

| Claim | Evidence |
|---|---|
| Tests pass | the test command's output, 0 failures, at the scope you name |
| Build succeeds | the build command, exit 0 |
| Bug fixed | the original symptom's test passes; the fix reverted makes it fail |
| Agent completed | the VCS diff shows the change |
