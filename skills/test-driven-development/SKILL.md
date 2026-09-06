---
name: test-driven-development
description: Use when implementing any feature or bugfix, before writing implementation code
---

# Test-Driven Development

**Iron Law: no production code without a failing test first.**

This covers new features, bug fixes, refactoring, and behavior changes. Throwaway prototypes, generated code, and configuration files are the exceptions, and you ask your human partner before taking one.

If you wrote the code first, delete it and start over from the test — delete means delete, not kept open as reference and not adapted while you write the test, because either way the test ends up describing what you built instead of what was required.

## Red, green, refactor

**Red.** Write one minimal test for one behavior, named for that behavior, exercising real code — mock only what you cannot otherwise run. Then run it and watch it fail. Confirm it fails rather than errors, that the message is the one you expected, and that it fails because the behavior is missing and not because of a typo or a bad import. A test that passes on the first run is testing something that already exists; fix the test. A test that errors is broken; fix it and re-run until it fails for the right reason.

**Green.** Write the simplest code that passes — no extra options, no unrelated refactoring, no improvements beyond what the test demands. Run it and confirm the test passes, the other tests still pass, and the output is clean of new errors and warnings. If the test still fails, fix the code, not the test.

**Refactor.** Once green, remove duplication, improve names, and extract helpers, changing no behavior and keeping the tests green. Then write the next failing test.

A bug is the same cycle: the failing test reproduces the bug, so it proves the fix and stops the regression from coming back.

## Common rationalizations

| Excuse | Reality |
|---|---|
| "I'll write tests after" | Tests written after pass by construction and prove nothing. |
| "I already wrote the code, it would be a waste to delete it" | Sunk cost. Delete it; the test tells you what to rebuild. |
| "I'll keep it as reference while I write the test" | Then the test is written to the code. Delete it. |
| "Too simple to test" | Simple code breaks too, and the test takes a minute. |
| "I'll test it manually" | Manual checks are not repeatable and are not evidence. |

## When Stuck

| Problem | Solution |
|---------|----------|
| Don't know how to test | Write wished-for API. Write assertion first. Ask your human partner. |
| Test too complicated | Design too complicated. Simplify interface. |
| Must mock everything | Code too coupled. Use dependency injection. |
| Test setup huge | Extract helpers. Still complex? Simplify design. |

## Writing the tests themselves

When writing or changing any test, adding mocks, or adding test-only helpers, read [writing-good-tests.md](writing-good-tests.md):

- Name the production change that would make the test fail — before writing it
- Derive expected values by hand, never with the code under test
- Assert on real behavior, never on mock behavior, and never on source text
- Keep test-only code in test utilities, out of production classes
- Run the mutation check before you call a test file done
