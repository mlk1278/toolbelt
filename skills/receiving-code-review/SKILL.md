---
name: receiving-code-review
description: Use when acting on code review feedback from a person or an external reviewer, before implementing it.
---

# Receiving Code Review

Feedback is a claim about the code. Verify each item against the codebase before implementing it.

An unclear item blocks the whole batch: items are often related, and partial understanding produces the wrong change. Ask about every unclear item at once, then wait — "I understand items 1, 2, 3, 6. Need clarification on 4 and 5 before proceeding."

**From your human partner:** trusted. Implement once you understand it; ask if the scope is unclear.

**From an external reviewer:** before implementing, check whether the suggestion is correct for this codebase, whether it breaks existing behavior, why the current code is the way it is, and whether it holds on every platform and version this project supports. Wrong on any of those, push back with the technical reasoning and the test or code that shows it. Unable to verify, say what you need: "I can't verify this without X. Should I investigate, ask, or proceed?" Conflicts with a decision your human partner already made, take it to them before implementing.

Before accepting "this is unused" or "implement it properly", grep for callers. None, propose removal. Some, implement it properly.

Pushed back and turned out wrong? State the correction and move on: "You were right — I checked X and it does Y. Implementing now."

Order the work: clarify everything first, then breakage and security, then simple fixes, then complex ones. Test each fix on its own.

## Replying on GitHub

Reply inside the review comment thread, not as a top-level PR comment:

```
gh api repos/{owner}/{repo}/pulls/{pr}/comments/{id}/replies
```
