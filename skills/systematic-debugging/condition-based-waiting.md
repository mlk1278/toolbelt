# Condition-Based Waiting

Read this when a test is flaky, passes alone but fails under load or in CI, or contains a fixed `sleep`/`setTimeout` delay. A fixed delay is a guess about timing; wait for the condition you actually need instead.

```typescript
// ❌ Guessing at timing
await new Promise(r => setTimeout(r, 50));
expect(getResult()).toBeDefined();

// ✅ Waiting for the condition
await waitFor(() => getResult() !== undefined, 'result to be set');
expect(getResult()).toBeDefined();
```

Use the test framework's helper when it has one (`vi.waitFor`, `waitFor` in Testing Library, `Eventually` in Go's testify). Otherwise:

```typescript
async function waitFor<T>(
  condition: () => T | undefined | null | false,
  description: string,
  timeoutMs = 5000,
): Promise<T> {
  const start = Date.now();
  while (true) {
    const result = condition();
    if (result) return result;
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timed out after ${timeoutMs}ms waiting for ${description}`);
    }
    await new Promise(r => setTimeout(r, 10));
  }
}
```

Read fresh state inside the condition on every poll, and always keep a timeout with a message that names what you were waiting for.

A fixed delay is right only when the behavior under test is itself timed, such as a debounce or a tick interval. Then wait for the triggering condition first, derive the delay from the known interval, and comment why: `// 2 ticks at 100ms`.
