---
name: test-driven-development
description: Use when implementing any feature or bugfix, before writing implementation code
---

# Test-Driven Development

**Iron Law: no production code without a failing test first.**

The Iron Law covers guards, such as permission checks, tenant filters, money math, and rejection paths, as well as bug fixes, each with the mutation check. For everything else, write tests alongside the code. A plan's `Contract` may require test-first work elsewhere; any other exception belongs to your human partner. Each `Proves` line gets one focused test.

If you wrote the code first, delete it and start from the test. Do not keep it open as a reference or adapt it while writing the test, because either way the test ends up describing what you built instead of what was required.

## Red, green, refactor

**Red.** Write one minimal test for one behavior, named for that behavior, exercising real code. Mock only what you cannot otherwise run. Confirm that the test fails, rather than errors, with the expected message because the behavior is missing. If a test passes on the first run, it tests something that already exists, so fix the test.

**Green.** Write the simplest code that makes the test pass, with no extra options or unrelated refactoring. Confirm that every test passes with no new errors or warnings. If the test still fails, fix the code, not the test.

**Refactor.** With tests green, remove duplication and improve names without changing behavior. Then write the next failing test.

A bug fix follows the same cycle. The failing test reproduces the bug, proves the fix, and keeps the bug from coming back.

A guard's test must fail first against code that lacks the guard, not against a missing module. Build the happy path, write the guard's test, watch it fail, and then add the guard.

## Common rationalizations

| Excuse | Reality |
|---|---|
| "I'll write tests after" | Tests derived from the implementation repeat its mistakes. First show the test detects the missing behavior. |
| "Deleting what I wrote is waste" | Sunk cost. The test tells you what to rebuild. |
| "I'll keep it as reference while I write the test" | Then the test is written to the code. Delete it. |
| "Too simple to test" | Simple code breaks too, and the test takes a minute. |
| "I'll test it manually" | A manual check can't catch the regression next month. Automate it. |

## When stuck

- **Cannot see how to test it.** Write the call you wish existed, then write its assertion.
- **The test needs a huge setup or mocks everything.** The code is too coupled. Simplify the interface or inject the dependency.

## Writing the tests themselves

When writing or changing any test, adding mocks, or adding test-only helpers, read [writing-good-tests.md](writing-good-tests.md).
