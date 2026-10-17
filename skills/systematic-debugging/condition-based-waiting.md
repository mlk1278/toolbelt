# Condition-Based Waiting

A fixed delay guesses at timing. Wait for the condition instead, with the framework's helper when it has one (`vi.waitFor`, Testing Library's `waitFor`, testify's `Eventually`). Otherwise write a helper that re-reads fresh state every few milliseconds and throws on a timeout with a message naming the condition.

```typescript
await waitFor(() => getResult() !== undefined, 'result to be set');
```

A fixed delay is right only when the behavior under test is itself timed, such as a debounce. Then wait for the triggering condition first, derive the delay from the known interval, and comment why: `// 2 ticks at 100ms`.
