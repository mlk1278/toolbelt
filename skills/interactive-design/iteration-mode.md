# Iteration mode (existing features)

Read this when the entry was a request to iterate on an existing surface's UI. Section numbers below are SKILL.md's; everything it says holds except where this file states a delta.

**Announce:** "I'm using interactive-design to iterate on this UI with ledger-tracked data changes." In this mode, this announcement replaces the top-level one.

## The gate delta

§2's HARD-GATE authorizes the `[PENDING]` deferral itself: a datum may render placeholder data only while a `[PENDING]` entry naming it — surface, data needed, expected shape — is recorded in the ledger's Pending subsection, with a stable id, in the same edit. Everything else about the gate holds: backend-owned data only, the exemption list, the marker format for actual fixtures. Creating a real fixture immediately instead of a `[PENDING]` entry is always allowed.

## Materialization

Runs when the design is declared nailed, before §4's reconciliation. For each pending id, inspect the real API surface and map it to an endpoint entry — several pending ids may coalesce into one endpoint entry — resolving each endpoint to:

- `[EXISTING]` — an endpoint already serves the data: wire the frontend to it, delete the placeholder.
- `[EXISTING — EXTENDED]` — an endpoint needs a delta: create the fixture for the delta with its marker, record the delta.
- `[FIXTURE]` — no endpoint fits: create the fixture route with its marker.

Then delete the emptied Pending subsection. Materialization may change what renders: re-exercise each affected surface — including the empty and error variants of anything newly fixture-backed — and return visible changes to the loop for your human partner's approval. The Pending subsection is empty before §4's reconciliation may run. A pending id that cannot be resolved — the data has no plausible source — goes to your human partner as a design question, never a silent deletion. From reconciliation on, the exit is §4's: same marker/ledger checks, same acceptance criteria, same contract-inventory presentation.

## Exit routing

This section decides the route §4 step 4 invokes for this mode. With the inventory presented, recommend a route and let your human partner confirm:

- **Small and decision-complete** — the delta fits quick-task's own entry bar (one coherent outcome, one PR, no product shaping): invoke `toolbelt:quick-task`. The request carries every applicable §5 delivery obligation as its requirements: implement each `[FIXTURE]` / `[EXISTING — EXTENDED]` shape exactly, remove markers, flip entries to `[IMPLEMENTED]`, meet the acceptance criteria, add frontend tests per project conventions, handle loading and slow responses, and satisfy §5's fixture-zero check before the PR merges.
- **Substantial** — anything above that bar: invoke `toolbelt:writing-specs`, exactly as new-feature mode does; §5 applies as written.

If quick-task later discovers the change needs product shaping after all, its own escalation applies — it routes to brainstorming and writing-plans, per its own text.

**Single PR, unchanged:** fixtures never reach the base branch, so the session's UI changes and their backend delta ship together in one PR whichever route is taken.
