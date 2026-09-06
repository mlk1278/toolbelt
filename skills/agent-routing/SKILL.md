---
name: agent-routing
description: Use at session start to load the project's agent routing, and before any dispatch that needs a role resolved. Callers request logical roles and never pick concrete agents themselves.
---

# Agent Routing

## Resolver path

The resolver belongs to this skill, not to the consuming project. Set
`ROUTING_SKILL_DIR` to the absolute directory containing this loaded `SKILL.md`,
using the path the harness reported when it loaded the skill. Invoke the
resolver only as `"$ROUTING_SKILL_DIR/scripts/resolve-agent"`; a consuming
project contains no `scripts/resolve-agent` of its own.

## The session brief

Once per session, before dispatching anything:

```bash
"$ROUTING_SKILL_DIR/scripts/resolve-agent" \
  --project-root <root> --brief --harness <your harness>
```

It returns every role at once — harness, model, effort, and per-role instructions — plus reviewer specialties and the project's custom instructions. Keep it for the session and route from it.

**If the script fails, stop and tell your human partner.** Never guess a route or dispatch an agent of your own choosing. The one exception is a brief that fell out of context after compaction: re-run the script once, and escalate only if that fails too.

## Roles

| Role | Owns |
|---|---|
| `explorer` | Codebase context, architecture, prior art, external research. Read-only. |
| `planner` | All planning work, however small it looks. |
| `implementer` | All code operations. Every repository edit. |
| `errand` | Tracker tickets, notifications, status checks, scripted browser capture. Never edits repository files. |
| `monitor` | A pull request through CI, review providers, inline review-finding fixes, and merge. |
| `reviewer` | Review, with optional specialty `code`, `spec`, `plan`, or `ux`. |

The boundary that matters: **planning goes to the planner, always; code goes to the implementer — except review findings on the monitor's own PR, which it fixes inline.** `errand` is cheap because its work is small, not because it is a shortcut for real work.

## Resolving a single route

When you need one route and not the whole table — most often a reviewer, whose route depends on who wrote the code:

```bash
"$ROUTING_SKILL_DIR/scripts/resolve-agent" \
  --project-root <root> --role <role> --author-harness <harness>
```

Add `--harness`, `--workflow`, `--reviewer-specialty`, or explicit `--override-*` arguments only when you have that context. `--author-harness` is required for a reviewer. Harness comparison is case-insensitive; same-harness fallbacks are removed, and resolution fails closed when no different-harness route remains.

Record the normalized JSON in the work log before dispatch. Dispatch the returned primary route and retain `fallbacks` in their returned order. Never reconstruct a route when resolution fails.

The brief carries `reviewer_by_author_harness`, which pre-resolves the same answer for every configured harness that can author work — enough for the common case without a second call.

## Provider-outage emergency override

Reviewer independence has exactly one exception. The trigger is **dispatch-time provider failure, never a resolver error**: resolution succeeded, but dispatching the resolved reviewer and each configured different-harness fallback failed with provider availability errors on repeated attempts. A `RoutingError` means no different-harness route is configured — a configuration problem to fix, never grounds for this override. When the trigger is met, the orchestrator may dispatch a **fresh instance** of the most capable reachable route as the reviewer, even on the author's harness. Constraints:

- Record the audit trail before invoking it: each failed route, the error, and the attempt times.
- Never the author's own thread or instance — always a fresh dispatch with independently constructed context.
- The review report and any resulting PR body carry an `EMERGENCY SAME-HARNESS REVIEW` flag naming the outage.
- Do not downgrade to a lower-capability route to manufacture independence; a capable same-harness review beats an incapable different-harness one.
- The override lasts only as long as the outage: resume normal resolution — including for delta re-gates of work reviewed under the override — the moment a different-harness route is reachable.
- Project routing policy may name the concrete emergency route and routes excluded from review; it governs.

## Precedence

Plan-supplied routes are explicit run overrides. For public workflow decisions, precedence is plan, project, bundled. Within project configuration, reviewer specialty, workflow, harness, and project role retain their existing resolver precedence. A plan may route implementer, task-reviewer, and final-reviewer work, but never the session orchestrator.

## Project configuration

Read optional overrides from `<project-root>/.toolbelt/agents.json`. It accepts these top-level keys:

- `version`: integer `1`.
- `instructions`: a string of project-wide dispatch guidance, surfaced in the brief.
- `roles`: default role-to-route overrides.
- `harnesses`: harness names containing role-to-route overrides.
- `workflows`: workflow names containing role-to-route overrides.
- `reviewer_specialties`: specialty-to-route overrides.

Each route requires string `harness`, `model`, and `effort` values. It may carry `instructions` describing what that role is for, and `fallbacks`, an ordered array of routes. Treat invalid JSON or an incomplete selected route as a configuration error; never guess its meaning.
