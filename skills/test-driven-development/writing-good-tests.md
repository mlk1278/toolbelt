# Writing Good Tests

A test exists to catch a specific break, and it exercises the real thing.

## Name the break

Before writing the body, name the production change that should make this test fail: a wrong branch, a missing side effect, a wrong argument, a boundary case, or a broken contract.

**Derive expectations independently.** Use literals and hand-checked fixtures. Table-driven tests with literal expected values are the preferred shape. An expectation computed by the code under test passes no matter what that code does:

```typescript
// ❌ The same builder computes both sides — always true
const expected = buildSearchQuery({ tag: 'urgent' });
expect(buildSearchQuery({ tag: 'urgent' })).toBe(expected);

// ✅ Hand-derived literal
expect(buildSearchQuery({ tag: 'urgent' })).toBe('tag:"urgent"');
```

**No change detectors.** A test that only an intentional decision can break, such as checking a constant's value or exact message wording, fails on redesign and misses bugs. Test the behavior that depends on the decision instead: not `expect(MAX_RETRIES).toBe(5)`, but that a failing call is retried 5 times and the 6th attempt never happens.

**Behavior, not text.** Run scripts against controlled inputs and assert their outputs, side effects, or exit codes. Never assert that a source file contains a particular line.

**An absence check excludes its own evidence.** Scope the search to where the forbidden pattern must not appear. If the scope is too wide, migrations, lockfiles, or the test itself will keep it failing forever; if it is too narrow, it cannot fail. With `git grep`, exit code 0 means a match, which is the failure case.

**Test your code, not the framework.** Test the contract at your code's boundaries: the route you register, the query you emit, and the payload you produce. Constructors, getters, constants, and plain forwarding earn tests only when they validate, normalize, default, derive, or cause side effects.

A test that can fail only by crashing or by a missing selector asserts nothing. Name the break or cut the test.

## Exercise the real thing

**Assert on the component, not a mock.** A mock assertion passes whenever the mock is present. Asserting a `*-mock` test ID is the usual mistake.

**Mock at the right level.** Learn every side effect of the real method before replacing it. Mock the slow or external operation, and keep real what the test depends on.

**Make doubles specific.** When arguments, call counts, or ordering are part of the contract, assert them. Give each branch, such as success, error, and malformed input, its own fixture.

**Mirror real data completely.** A mocked response must include every documented field, not just the ones the test reads.

**Keep test-only code in test utilities.** Keep it out of production classes.

**Prefer real components to complex mocks.** When mock setup outgrows the test logic, switch to an integration test.

## How many tests

Ship the tests the behavior needs, following the project's existing test idioms.

## The mutation check

For a guard or a bug fix, break the guard, watch the test fail, and then restore it.
