# Root Cause Tracing

Read this when an error surfaces deep in a call chain and it's unclear where the bad value came from. The place an error appears is rarely the place to fix it.

1. **Name the symptom exactly.** `git init failed in ~/project/packages/core`
2. **Find the line that directly causes it.** `execFileAsync('git', ['init'], { cwd: projectDir })`
3. **Ask what called it, and with what value.** Walk up one caller at a time, noting the value at each level: `projectDir = ''`, and an empty `cwd` falls back to `process.cwd()`, the source tree.
4. **Keep going until you reach where the value was born.** Here, a test read `context.tempDir` at module load, before `beforeEach` set it.
5. **Fix it there.** Here, `tempDir` became a getter that throws if read before setup.

## When you can't trace by reading

Log just before the suspect operation, not after it fails, with the value, the environment, and the call stack:

```typescript
console.error('DEBUG git init', { directory, cwd: process.cwd(), stack: new Error().stack });
```

Use `console.error` in tests, since loggers are often silenced there. Run the tests, filter for the marker, and read the stacks for which test file and line trigger it.

## When a test leaves pollution behind

If a file or directory appears during a test run and you don't know which test creates it, `find-polluter.sh` in this directory runs test files one by one and stops at the first one that creates it:

```bash
./find-polluter.sh '.git' 'src/**/*.test.ts'
```
