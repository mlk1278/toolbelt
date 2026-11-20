---
name: using-toolbelt
description: Use when starting any conversation - establishes how to find and use skills, requiring skill invocation before ANY response including clarifying questions
---

<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, ignore this skill.
</SUBAGENT-STOP>

## The Rule

Invoke any relevant or requested skill before responding or taking action, including asking clarifying questions or exploring the codebase, because the skill sets the approach. If a skill turns out not to fit, drop it.

Before entering plan mode, brainstorm first if you have not already.

Announce "Using [skill] to [purpose]". If the skill has a checklist, create a todo for each item.

## Skill Priority

When several skills apply, process skills come first to set the approach, and implementation skills carry it out:

- For a request like "Let's build X", start with toolbelt:brainstorming, then use implementation skills.
- For a request like "Fix this bug", start with toolbelt:systematic-debugging, then use domain skills.

A question, a file check, or a small request is still a task, so check for a relevant skill first.

## Platform Adaptation

In Codex, read `references/codex-tools.md`.

## Agent Routing

Before your first dispatch, invoke the agent-routing skill. Route by logical role using the AGENT-ROUTING text injected at session start, or the skill's bundled default when none was injected; never pick a concrete agent yourself.

Dispatch a discretionary subagent only for large, independent work, never to double-check your own work. The roles that delivery, quick-task, and review require are not discretionary.

## User Instructions

CLAUDE.md, AGENTS.md, and your human partner's direct requests take precedence over skills, which in turn override default behavior. Skip a skill workflow only when your human partner explicitly tells you to.
