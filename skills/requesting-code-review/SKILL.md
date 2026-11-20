---
name: requesting-code-review
description: Use when completing tasks, implementing major features, or before merging to verify work meets requirements
---

# Requesting Code Review

Get an independent review of finished work when working outside delivery, because delivery runs its own review. Give the reviewer only the context you build, never your session history.

1. **Pick the range.** BASE is the commit recorded before the work began, or `git merge-base origin/main HEAD`, never `HEAD~1`. Use `git rev-parse HEAD` as HEAD.
2. **Build the package.** Run `bash ../delivery/scripts/review-package BASE HEAD`. The script prints the package path.
3. **Dispatch the reviewer.** Run `bash ../delivery/scripts/dispatch-prompt reviewer --package FILE --requirements "<plan or spec path, or what the work should do>"`. Route a `reviewer` with specialty `code` through agent-routing on a harness other than the author's, and dispatch "Read <printed path> and follow it."
4. **Act on the verdict.** Whoever makes the fixes reads the review file. Fix every Critical and Important finding, note Minor ones, and push back with evidence where the reviewer is wrong.
