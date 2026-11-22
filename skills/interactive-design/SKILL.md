---
name: interactive-design
description: "Use when your human partner accepts the frontend-first offer or asks to prototype the frontend before backend work — after brainstorming approves the intent-level design — or asks to iterate directly on an existing feature's UI, changing what information it shows. Direct UI iteration needs no prior design or spec."
---

# Interactive Design

You and your human partner design by iterating on the real frontend, backed by real API routes that return fixture data. The output is frontend code and a ledger of the API contracts to implement.

<ENTRY-GATE>
Three ways in: your human partner accepted brainstorming's frontend-first offer, asked directly, or asked to iterate on an existing UI. Never select this path yourself. The first two require brainstorming's approved intent-level design, with UI detail deferred here. For the third, the request itself is the entry. The feature's frontend and the API it consumes must live in this repository or its workspace; otherwise stop and tell your human partner this path does not apply.
</ENTRY-GATE>

For the third entry, read [iteration-mode.md](iteration-mode.md) first.

## 1. Setup

1. Work in an isolated worktree, invoking `toolbelt:using-git-worktrees` if you are not already in one. The backend plan executes on this branch later.
2. Read `.toolbelt/prototyping.md` if it exists to learn where fixture routes live, how to run the dev server, and what seed-data conventions apply. If it is absent, infer those conventions and record your inferences in the ledger header.
3. Before the first edit, find the existing screens that show the same information and the shared pieces they use. Delegate the search through agent-routing when you do not already know them. Use or extend a shared piece instead of building a second one beside it.
4. Create the ledger described in Section 7 and start the dev server. In the ledger header, record the screen each changed area matches and any difference you intend.

## 2. The fixture gate

<HARD-GATE>
Backend-owned data comes from real API routes in this repo. Any missing route becomes a real handler returning fixture data, tagged `TOOLBELT-FIXTURE <endpoint id>` and recorded in the ledger in the same edit. In iteration mode only, you may render placeholder data instead, if a `[PENDING]` ledger entry naming it is recorded in the same edit. A fixture without a ledger entry, or a placeholder without a `[PENDING]` entry, is a gate violation.
</HARD-GATE>

Backend-owned means the frontend would fetch the data from the backend in production, so inline mock data and frontend stub layers break the gate. UI copy, labels, icons, layout constants, and client-derived values are exempt. The `<endpoint id>` is the ledger entry's identifier, such as `GET /api/projects/:id/insights`.

## 3. The loop

Edit directly in this session, with no subagents and no per-iteration review. Commit checkpoints often. Update the fixture and its ledger entry together on every shape change. Before calling the design complete, exercise the empty and error responses on every fixture-backed screen.

## 4. Exit

1. Reconcile the code and the ledger: confirm that every marker has a matching ledger entry, every `[FIXTURE]` or `[EXISTING — EXTENDED]` entry has a marker, and the recorded shapes match the fixtures. Delete any dead routes.
2. Write `.toolbelt/ux/matrix.json` following `../ux-review/matrix.md` for every screen the criteria name. Run `../ux-review/scripts/ux-capture` against the prototype into `.toolbelt/ux/baseline/`. Under the ledger's **Acceptance criteria**, record the prototype's visual and interaction criteria, including the empty and error states, both absolute paths, and the prototype commit SHA. For each screen with an existing match, include "matches <screen> in hierarchy, spacing, information order, and actions" and name any intended difference. Stop the dev server.
3. Present the contract inventory to your human partner.
4. On approval, invoke `toolbelt:writing-specs`, or in iteration mode the route that [iteration-mode.md](iteration-mode.md) confirms. Do NOT invoke any other skill.

## 5. What the spec carries

- The API section, taken from the ledger.
- For each `[FIXTURE]` or `[EXISTING — EXTENDED]` entry, implement the recorded shape exactly, remove the marker, and flip the entry to `[IMPLEMENTED]`.
- Frontend tests per project conventions, along with loading and slow-response handling.
- The ledger's Acceptance criteria as the ux-review criteria.
- Any contract changes accepted during spec or plan review go back into the ledger and fixture in the same round.
- The hardening tasks and delivery's review cover the prototype commits.
- Ship everything in one PR, because fixtures must never reach the base branch.
- At delivery's review, this command exits 1 with no matches:

```
git grep TOOLBELT-FIXTURE -- ':!docs/toolbelt' ':!.toolbelt'
```

If a project keeps fixtures on purpose, such as for tests or storybook, record the exception in the ledger and add those paths to the exclusions.

## 6. When a contract turns out infeasible

During delivery, the implementer stops with `NEEDS_DECISION`. Once your human partner approves a resolution, amend the spec, the ledger, the fixture, and the affected plan tasks, including a frontend adaptation task, before work resumes.

## 7. The ledger

`.toolbelt/prototype/<feature-slug>/contracts.md` starts with a header naming the feature, branch, marker, and the screen each changed area matches with any intended difference. After the header, add one entry per endpoint, GraphQL operation, or RPC procedure with its request shape, response shape, and error statuses. Each marker's endpoint id resolves to exactly one entry.

| Status | Fields |
|---|---|
| `[FIXTURE]` | New route: fixture `path:line`, shapes, errors, `Notes` for UI-derived semantics |
| `[EXISTING — EXTENDED]` | The delta and fixture location |
| `[EXISTING]` | Used as-is; no marker |
| `[IMPLEMENTED]` | Fixture replaced during delivery; marker removed |
| `[PENDING]` | Iteration mode only |

The ledger is git-ignored scratch that delivery's cleanup removes; its content lives on in the spec or the quick-task PR.
