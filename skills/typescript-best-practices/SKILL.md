---
name: typescript-best-practices
description: Use when writing, editing, or critiquing a .ts or .tsx file, not when only reading one.
---

# TypeScript best practices

Change a type that forces a shortcut. Keep any signature the task specifies or existing callers rely on, and tell your human partner if a rule below would change it.

| Rule | Summary |
|---|---|
| Discriminated unions | Give each state its own variant with a literal discriminant, and put a field only on variants where it is always set. An optional field that depends on another field means split the type. |
| Fix the cause | Fix an error instead of adding `@ts-ignore`, `@ts-expect-error`, or `eslint-disable`, or loosening a tsconfig, lint rule, shared type, or test. A test that proves a call must not compile may use `@ts-expect-error`. If you cannot fix an error, leave it and tell your human partner. |
| Assertions | `as`, `!`, a type guard that checks less than it claims, and a generic return the body cannot prove (`parse<T>(s: string): T`) all stop the compiler checking. Change the types so it can prove the claim. `as const` is fine. Where the compiler cannot know, assert and add a comment saying why the claim holds. |
| Loose types | A `!` or a "should never happen" throw means a type is too loose. Tighten the input or return `T \| undefined`. |
| `unknown` over `any` | A value whose shape you don't know is `unknown` until narrowed. |
| Boundaries | Parse external data where it enters, into a named type, and trust that type inside. Use the repo's schema library when it has one, and infer the type from the schema. Accept only the documented format, because coercion turns bad input into valid-looking values. |
| Exhaustiveness | Make adding a variant break the build at every `switch` on it. A catch-all `default` that returns a value lets the missed variant compile. |
| `satisfies` | Check a constant against a type with `satisfies`, not `as`. It reports missing fields and keeps the inferred type. |
| One owner per shape | Import or derive a shape that already has an owner. Two shapes that only happen to match stay separate. |
| Swappable arguments | When two or more parameters share a primitive type but have different roles, take one object so a swap can't compile. |

## Examples

Open the section you need:

- A value with several states: [Discriminated unions](references/patterns.md#discriminated-unions)
- A cast or `!` you want gone: [Removing an assertion](references/patterns.md#removing-an-assertion)
- A list that must have an item: [Non-empty lists](references/patterns.md#non-empty-lists)
- JSON, a request body, or a config value: [Parsing at a boundary](references/patterns.md#parsing-at-a-boundary)
- A `switch` on a union: [Exhaustive switches](references/patterns.md#exhaustive-switches)
- A typed constant: [`satisfies`](references/patterns.md#satisfies)
- Several IDs of the same type: [IDs that can be swapped](references/patterns.md#ids-that-can-be-swapped)
