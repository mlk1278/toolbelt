# Writing Good Tests

A test exists to catch a specific break. Every test names the break it catches, and every test exercises the real thing.

## Name the break

Before writing the body, answer: what production change should make this test fail, and is that change a bug or a decision? A test earns its place by catching a wrong branch, a missing side effect, a wrong argument, a boundary case, or a broken contract.

**Derive expectations independently.** Use literals and hand-checked fixtures; table-driven tests with literal expected values are the preferred shape. An expectation computed by the code under test, or its helpers, passes no matter what that code does:

```typescript
// ❌ The same builder computes both sides — always true
const expected = buildSearchQuery({ tag: 'urgent' });
expect(buildSearchQuery({ tag: 'urgent' })).toBe(expected);

// ✅ Hand-derived literal
expect(buildSearchQuery({ tag: 'urgent' })).toBe('tag:"urgent"');
```

**No change detectors.** A test that only an intentional decision can fail — a constant's value, exact message wording, private structure — fires on redesign and sleeps through bugs. Test the behavior that depends on the decision: not `expect(MAX_RETRIES).toBe(5)`, but "a failing call is retried 5 times and the 6th attempt never happens."

**Behavior, not text.** Asserting that a script or config contains an exact line proves only that the source is the source. Run scripts against controlled inputs and assert outputs, side effects, or exit codes.

**An absence check must exclude its own evidence.** A test proving something is gone fails forever if its search includes places that legitimately still name it: applied migrations, lockfiles, vendored code, the spec that retires the string, the test itself. Scope the search to where the thing must not appear — no wider, or it can never pass; no narrower, or it can't fail. `git grep` exits 0 when it matches, which is the failure case.

**Test your code, not the framework.** Test the contract your code makes at its boundaries: the route you register, the query you emit, the payload you produce. Asserting that your router calls a registered handler is the framework's test. Constructors, getters, constants, and plain forwarding earn tests only when they validate, normalize, default, derive, or cause side effects; otherwise assert the first consumer-visible result that depends on them.

A test that can fail only by crashing or by a missing selector asserts nothing about behavior. Name the break or cut the test.

## Exercise the real thing

**Never assert on a mock.** A mock assertion passes when the mock is present and fails when it is absent; it says nothing about the component. Asserting a `*-mock` test ID is the usual form. Assert the real component's behavior, or unmock it.

**Mock at the right level.** Learn every side effect of the real method before replacing it. Mock the slow or external operation and keep real what the test depends on. When unsure, run the test against the real implementation first and see what actually has to happen.

```typescript
// ❌ The mock swallows the config write that duplicate detection reads
vi.mock('ToolCatalog', () => ({
  discoverAndCacheTools: vi.fn().mockResolvedValue(undefined)
}));

// ✅ Mock only the slow server startup; the config write stays real
vi.mock('MCPServerManager');
```

**Make doubles specific.** When arguments, call counts, or ordering are part of the contract, assert them; a fake that accepts anything verifies nothing. Give each branch (success, error, malformed) its own fixture, so the wrong branch cannot satisfy the expectation.

**Mirror real data completely.** A mocked response carries every documented field, not just the ones the test reads; a partial mock passes while the code that reads an omitted field breaks in production.

**Test-only code stays in test utilities.** A cleanup method that only tests call does not belong on the production class.

**Prefer real components to complex mocks.** When mock setup outgrows the test logic, or tests break whenever the mock changes, switch to an integration test with real components. A dependency you can't say why you are mocking stays real.

## How many tests

Ship the tests the behavior needs and only those. A small pure function needs a couple of boundary cases; a money path or a state machine earns the full table plus its failure paths. Match the project's existing test idioms.

## The mutation check

Before finishing, mentally mutate the production code. At least one test should fail for each realistic mutation:

- a wrong constant or argument
- a wrong branch taken
- a missing state change or side effect
- an empty or default return
- missing validation for zero, empty, nil, unauthorized, or malformed input

A mutation nothing catches marks an unprotected behavior, or a test that can't fail.
