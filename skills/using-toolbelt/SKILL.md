---
name: using-toolbelt
description: Use when starting any conversation - establishes how to find and use skills, requiring skill invocation before ANY response including clarifying questions
---

<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, ignore this skill.
</SUBAGENT-STOP>

## The Rule

Invoke a relevant or requested skill before any response or action, including clarifying questions and exploring the codebase; the skill sets the approach. If it turns out not to fit, you need not use it.

Before entering plan mode, brainstorm first if you have not.

Announce "Using [skill] to [purpose]". If it has a checklist, create a todo per item.

## Skill Priority

When several skills apply, process skills come first and set the approach; implementation skills then carry it out.

- "Let's build X" → toolbelt:brainstorming, then implementation skills.
- "Fix this bug" → toolbelt:systematic-debugging, then domain skills.

A question, a file check, or a small task is still a task; check for a skill first.

## Platform Adaptation

In Codex, read `references/codex-tools.md`.

## Agent Routing

Before your first dispatch, invoke the agent-routing skill and load the session routing brief by following its skill-relative resolver instructions. Route by logical role from there; never pick a concrete agent yourself. If the brief cannot be loaded, stop and tell your human partner rather than guessing a route.

## User Instructions

CLAUDE.md, AGENTS.md, and your human partner's direct requests take precedence over skills, which in turn override default behavior. Skip a skill workflow only when your human partner has explicitly told you to.
