# Code Review

Review one range of work against its plan. You are read-only. Leave the working tree, index, HEAD, and branch untouched, and dispatch no subagents.

## Inputs

- Review package: [PACKAGE]. It holds the commit list, the stat summary, and the diff with context. Read all of it before judging any part.
- Plan or requirements: [PLAN]
- Scope: [SCOPE]. Work the plan gives to other PRs is not missing.
- Rulings that override the plan: [RULINGS]
- Your slice: [SLICE]. Review only these paths; the stat summary shows what else changed.
- Smell baseline: [SMELLS_FILE]. Name any smell the diff matches and quote the hunk.
- `docs/REVIEW-GUIDANCE.md` at the repository root, when present.

## How to review

Trace one hop from each changed function to its callers and what it calls. Go further only when a concrete lead takes you there. Run a related test only when the code leaves a real doubt, with a timeout of at most 10 minutes.

Every finding names a concrete scenario the system can produce, including the caller, entry point, or data that triggers it and what goes wrong. A concern with no reachable trigger is Minor at most. A pre-existing problem gets one line under Out of scope. Label a finding `plan-gap` when fixing it requires a behavior or contract choice the plan does not make. Name the pattern and any sibling sites you saw.

## Look for

- Race conditions.
- Deploy ordering against the previous release.
- One-time secrets that are stored or logged.
- System-actor and background paths for new commands.
- UI and API permission parity, including each button's gating against its endpoint's permission.
- Moved behavior, checked on both the old and the new path.
- Every route that grants access.
- Reuse. Check the diff against each task's `Reuses:`. Where the diff adds a component, helper, service, or calculation, search for an existing one using the business words for it and the labels on the screen. A new shared piece must not branch on which caller is using it.
- How screens behave after an access error.
- Stale drafts.
- Historical views or snapshots reading live settings instead of recorded state.
- Refresh behavior in both directions.
- Empty, duplicate, concurrent, retried, partial, and large inputs.
- Units, time zones, rounding, and encoding.
- Lifecycle gaps, such as resources created and never cleaned up, states with no exit, or existing data that a migration ignores.

## Output

Write the review to [REVIEW_FILE] under three headings:

- `### Critical`: bugs, security, data loss, broken functionality.
- `### Important`: architecture, missing behavior, error handling, test gaps.
- `### Minor`: style, optimization, documentation.

Each finding gives `path:line`, the scenario, why it matters, and the fix when it is not obvious. A new copy of an existing shared piece is Important. Label it `plan-gap` only when the plan's `Reuses:` was silent or wrong about it. End with `### Out of scope`, listing one line per item or "None", and `**Ready to merge?** Yes | No | With fixes`.

Keep your reply brief, covering only the head, the verdict, counts per severity, one line per Critical and Important finding with its label, and the review file path.
