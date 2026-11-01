# TypeScript patterns

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

Find out why the compiler can't see the fact, then fix that. A missing discriminant needs a union. A wide source type needs a parse. With the `Job` union above, every `finishedAt` here is a `Date`, so no `!` is needed:

```ts
type FailedJob = Extract<Job, { status: "failed" }>;

function failures(jobs: Job[]): FailedJob[] {
  return jobs.filter((job) => job.status === "failed");
}
```

## Non-empty lists

```ts
type NonEmpty<T> = [T, ...T[]];

const isNonEmpty = <T>(items: T[]): items is NonEmpty<T> => items.length > 0;

function newest<T>(items: NonEmpty<T>): T {
  return items[0];
}
```

Narrow once where a plain `T[]` arrives. `map` and `slice` return `T[]`, not `NonEmpty<T>`. Keep `T[]` when an empty list is a normal input, as in a sum.

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

## IDs that can be swapped

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
