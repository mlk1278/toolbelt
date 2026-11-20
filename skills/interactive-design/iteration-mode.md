# Iteration mode (existing features)

SKILL.md applies except where this file differs.

**Announce:** "I'm using interactive-design to iterate on this UI with ledger-tracked data changes."

## Pending data

Place each `[PENDING]` entry in the ledger's **Pending** subsection with a stable id (`P1`, `P2`), the affected screen, the data needed, and the expected shape. You are always free to create a real fixture instead.

When the design is complete, before running Section 4 of SKILL.md, map each pending id to an endpoint entry. Several ids may share one endpoint.

- `[EXISTING]`: wire the frontend to the endpoint and delete the placeholder.
- `[EXISTING — EXTENDED]`: create a marked fixture for the delta and record the delta.
- `[FIXTURE]`: create a marked fixture route.

Delete the empty Pending subsection before running Section 4. Re-exercise the affected screens, including new empty and error states, and bring any visible changes back to the loop for your human partner's approval. If a pending id has no plausible data source, take it to your human partner as a design question.

## Exit routing

Recommend a route and wait for your human partner to confirm:

- **Small and decision-complete.** When the work is one outcome, fits in one PR, and needs no product shaping, invoke `toolbelt:quick-task`. Carry every obligation from Section 5 of SKILL.md that applies, and confirm the fixture-zero check passes before merge.
- **Otherwise.** Invoke `toolbelt:writing-specs`.

Either route ships the UI changes and backend delta in one PR.
