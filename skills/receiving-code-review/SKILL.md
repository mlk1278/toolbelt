---
name: receiving-code-review
description: Use when acting on code review feedback from a person or an external reviewer, before implementing it.
---

# Receiving Code Review

Feedback is a claim about the code. Verify each item against the codebase before implementing it.

If any item is unclear, ask about every unclear item at once before changing anything; items are often related, and a partial understanding produces the wrong change. "I understand 1, 2, 3, and 6. I need clarification on 4 and 5."

**From your human partner:** trusted. Implement once you understand it.

**From any other reviewer** — an agent, a bot, a colleague: before implementing, check that the suggestion is correct for this codebase, doesn't break existing behavior, accounts for why the code is the way it is, and holds on every platform and version the project supports. If it fails any of those, push back with the technical reasoning and the code or test that shows it. If you can't verify it, say what you would need. If it conflicts with a decision your human partner made, take it to them first.

Before accepting "this is unused" or "implement it properly", search for callers. None: propose removal. Some: implement it properly.

Work in order: clarifications, then breakage and security, then simple fixes, then complex ones. Test each fix on its own.

## Replying on GitHub

Reply inside the review comment's thread, not as a top-level PR comment:

```
gh api repos/{owner}/{repo}/pulls/{pr}/comments/{id}/replies -f body='...'
```
