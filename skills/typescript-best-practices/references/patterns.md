# TypeScript patterns

Contents: [Discriminated unions](#discriminated-unions), [Removing an assertion](#removing-an-assertion), [Type guards](#type-guards), [Non-empty lists](#non-empty-lists), [Simplest total type](#simplest-total-type), [Parsing at a boundary](#parsing-at-a-boundary), [Exhaustive switches](#exhaustive-switches), [`satisfies`](#satisfies), [Object args](#object-args).

## Discriminated unions

```ts
// Bad: allows a failed job with no reason and a scheduled job with a finish date.
type LooseJob = { status: Job["status"]; finishedAt?: Date; failureReason?: string };

// Good: each state carries exactly its own fields.
type Job =
  | { status: "scheduled" }
  | { status: "done"; finishedAt: Date }
  | { status: "failed"; finishedAt: Date; failureReason: string };
```

## Removing an assertion

When refactoring an `as` out of existing code, identify why TypeScript can't infer:

- Missing discriminant: add one, switch to a discriminated union.
- Overly wide source type (e.g. `Record<string, unknown>`): narrow it.
- Untyped boundary: parse with the schema that owns the shape. Add a schema only where none exists.
- Genuinely inexpressible: use a branded type, or assert with a comment saying why the claim holds.

With the `Job` union above, every `finishedAt` here is a `Date`, so no `!` is needed:

```ts
type FailedJob = Extract<Job, { status: "failed" }>;

function failures(jobs: Job[]): FailedJob[] {
  return jobs.filter((job) => job.status === "failed");
}
```

## Type guards

A guard must actually verify the claim. A lying guard is worse than `as`.

```ts
// Don't: claims a full User after checking only for id.
function isUser(data: unknown): data is User {
  return typeof data === "object" && data !== null && "id" in data;
}
```

Prefer discriminant narrowing when possible.

## Non-empty lists

```ts
type NonEmpty<T> = [T, ...T[]];

const isNonEmpty = <T>(items: T[]): items is NonEmpty<T> => items.length > 0;
```

Narrow once where a plain `T[]` arrives. `map` and `slice` return `T[]`, not `NonEmpty<T>`.

## Simplest total type

Don't strengthen everything. Keep `T[]` when every operation on it is total:

```ts
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0); // [] is 0, fine
```

Strengthen when the loose type forces a lie at a use site. The tells are `!`, `arr[0] as T`, and a "should never happen" throw:

```ts
// Don't: partiality smuggled past the compiler
function newestSession(sessions: Session[]): Session {
  return sessions.at(0)!;
}

// Do: strengthen the input; the assertion disappears
function newestSession(sessions: NonEmpty<Session>): Session {
  return sessions[0];
}
```

Weakening the result to `Session | undefined` is the other total signature.

## Parsing at a boundary

```ts
const UserSchema = z.object({ id: z.string(), role: z.enum(["admin", "member"]) });
type User = z.infer<typeof UserSchema>;

function parseUser(input: unknown): User {
  return UserSchema.parse(input);
}
```

Use `safeParse` when you expect bad input. Don't add a schema library for one guard. `z.coerce.date()` accepts `null` and returns 1970, so use the library's date-time validator, then convert the string.

## Exhaustive switches

With `strictNullChecks` on, a value switch with no `default` and a declared return type that excludes `undefined` fails to compile when a variant is missed (TS2366). A void switch needs the default arm:

```ts
function notify(job: Job): void {
  switch (job.status) {
    case "scheduled":
    case "done":
      break;
    case "failed":
      alert(job.failureReason);
      break;
    default:
      job satisfies never;
  }
}
```

## `satisfies`

```ts
type Config = { theme: "dark" | "light"; cols: number };

const config = { theme: "dark", cols: 3 } satisfies Config; // config.theme is "dark"
const missing = { theme: "dark" } as Config; // compiles with cols missing
```

## Object args

```ts
// Bad: with (jobId: string, customerId: string, invoiceId: string), a swap compiles.
// Good: each value is named at the call.
function linkInvoice(ids: { jobId: string; customerId: string; invoiceId: string }): string {
  return `job ${ids.jobId} for ${ids.customerId} billed on ${ids.invoiceId}`;
}
```

If many functions take the same ID, a branded type catches swaps at every call. Create it in one verifying guard, never with `as`:

```ts
type JobId = string & { readonly __brand: "JobId" };

const isJobId = (input: string): input is JobId => /^job_[a-z0-9]+$/.test(input);
```
