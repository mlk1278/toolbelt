---
name: agent-routing
description: Use before any dispatch that needs a role resolved. Callers request logical roles and never pick concrete agents themselves.
---

# Agent Routing

## The routing text

A session-start hook injects `.toolbelt/routing/<harness>.md` from the project's main checkout inside an `<AGENT-ROUTING source="...">` block. When that block is absent, read the bundled `routing/claude.md` or `routing/codex.md` next to this file. Route every dispatch from that text.

Map each model and effort to an agent you can launch, using a native subagent on your own harness and AGX for the other harness. Run `codex exec` or `claude -p` directly only when AGX is not installed. If you cannot launch the route the text names, stop and tell your human partner instead of substituting another model.

## Roles

| Role | Owns |
|---|---|
| `implementer` | Every repository edit. |
| `planner` | All planning work. |
| `lookup` | Narrow, specific codebase or web questions, answered by path, symbol, and one line. Read-only; stops at the first complete answer. |
| `explorer` | Read-only mapping of a system, competing implementations, or affected callers. |
| `errand` | Tickets, status checks, scripted capture. Never edits repository files. |
| `monitor` | PRs through CI, review providers, review fixes, and merge. |
| `reviewer` | Review, with specialty `code`, `spec`, `plan`, `ux`, `gate`, or `actor`. |

The monitor fixes review findings on its own PR inline; all other code edits go to the implementer. When the routing text names no route for a role you need, stop and tell your human partner. The one exception is `lookup`: when the text names no `lookup` route, use its `explorer` route.

The plan's `Risk` column raises effort and never changes the model. A `high` row raises the reviewer one effort level above its normal route.

## Waiting on background agents

A stuck agent reads messages only at its next tool call, so a status ping cannot reach it and silence tells you nothing. Judge liveness by when its transcript last changed. Never end a turn waiting on agents without a watchdog armed:

```bash
bash scripts/stall-watch --minutes 45 <agent id or transcript>... --minutes 120 <monitor id or transcript>...
```

The watchdog exits with a `STALLED` line once a transcript goes unchanged past its limit. Monitors get the longer limit because they wait on CI. In Claude Code, run it as a background command that wakes you when it exits. In Codex, run it with `--once` whenever `wait_agent` returns without a final answer. Re-arm it after it fires and whenever an agent finishes, listing only agents still running. On a `STALLED` line, read the transcript's tail: a tool call with no result means the agent hung, so stop it and dispatch a replacement.

Every prompt you dispatch must tell the agent to give every shell command a timeout of at most 10 minutes.

## Reviewer independence

A reviewer runs on a different harness from the implementer's. If the routing text would put a review on the implementer's harness, stop and tell your human partner.

## Precedence

Your human partner's direct instruction wins, followed by the routing text, then the bundled default. Plans carry no routing, and any route written to a ledger is audit metadata only.

## Outage override

This override applies only when the routed reviewer and every other-harness fallback the routing text names have failed with provider availability errors on repeated attempts. When that happens, dispatch a fresh instance of the most capable reachable route as the reviewer, even on the implementer's harness:

- Record each failed route, its error, and the attempt times first.
- Use a fresh dispatch with its own context, never the author's thread.
- Flag both the review report and the PR body with `EMERGENCY SAME-HARNESS REVIEW`, naming the outage.
- Keep capability; never downgrade to manufacture independence.

The override ends as soon as an other-harness route becomes reachable again.

## Setup

Claude Code runs the hook from this plugin. Because Codex does not run plugin hooks, run `scripts/setup-codex-routing` from the toolbelt checkout once per machine, then rely on the hook when Codex starts next.

To write or change a project's routing file, your human partner runs `configure-routing` and describes the routing they want in their own words. It drafts the file and writes it only after they confirm. Only they can start it; never invoke it for them.
