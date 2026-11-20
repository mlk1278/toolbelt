---
name: receiving-code-review
description: Use when acting on code review feedback from a person or an external reviewer, before implementing it.
---

# Receiving Code Review

Feedback is a claim about the code. Verify each item against the codebase before you change anything.

- Ask about every unclear item at once, before changing anything.
- Trust your human partner's feedback, and implement it once you understand it.
- For any other reviewer, verify that the suggestion fits this codebase, preserves existing behavior, and holds on every supported platform. If it fails any of those checks, push back with your reasoning and the code or test that proves it. If it conflicts with a decision from your human partner, take it to them first.
- Search for callers before accepting a claim that something is unused.
- A finding about one site is a finding about the pattern. Search for the same defect elsewhere, then fix every match in the same push, or list each remaining match and why you left it. Name the fixed siblings in your reply, or name the search that found none.

## Replying on GitHub

Reply inside the review comment's thread, not as a top-level PR comment:

```
gh api repos/{owner}/{repo}/pulls/{pr}/comments/{id}/replies -f body='...'
```
