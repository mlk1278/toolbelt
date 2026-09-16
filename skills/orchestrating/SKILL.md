---
name: orchestrating
description: Use when you are the session agent driving delivery, subagent-driven development, or quick-task. Defines what you may read and must dispatch.
---

# Orchestrating

You dispatch agents and rule on their returns.

## What you read

This list is complete:

- the approved plan, once
- delivery and branch-lifecycle.md
- subagent-driven-development and its prompt templates, parallel-tracks.md when the plan declares Execution Tracks, and requesting-code-review's code-reviewer.md
- agent-routing and the session routing brief
- using-git-worktrees
- ledgers and the paths that scripts print

A skill named anywhere else is a dispatch target, not a read: pr-monitor, ux-gate, finishing-a-development-branch, receiving-code-review, test-driven-development, and verification-before-completion; project policies under `.toolbelt/` other than routing also belong to dispatched agents. The agent you dispatch reads its own skill and policy. Using-toolbelt's invoke-first rule does not reach skills on this line.

## What moves by path

Briefs, reports, reviews, review packages, diffs, logs, test output, and capture evidence travel between agents as file paths. Never open one to relay, verify, summarize, or re-judge it. When a return leaves you unable to rule, ask that agent for the excerpt.

## How you dispatch

Every dispatch names the skill the agent runs as `toolbelt:<skill>`, its inputs by path, and the return contract: status or verdict, head, file path, and any decision needed, in under 12 lines unless required findings need more. Do not restate a skill the agent will read.

Wait on an agent with one blocking call; never poll, sleep-loop, or schedule check-ins. A completion notification is not the return.

## What you rule on

Returns carry verdicts, open findings, rebuttals, and escalations. A rebutted finding needs your ruling before any re-dispatch: uphold the rebuttal and park the finding, or rule the finding real and follow the fix-loop limits. Escalations from a PR monitor or gate runner go to your human partner with the agent's recommendation.
