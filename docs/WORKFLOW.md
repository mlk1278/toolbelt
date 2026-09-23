# Toolbelt Workflow

New or ambiguous work uses `brainstorming` and `writing-plans`. Planning decides behavior and divides work into coherent delivery slices, each fitting one pull request. Delivery begins only when a decision-complete quick task or an approved implementation plan exists.

An approved plan may route the implementer, task reviewer, and final reviewer under `## Agent Routing`; plan routes override project routing, which overrides bundled defaults. The session agent remains the orchestrator, reading only what `orchestrating` lists, and is never selected by the plan.

`delivery` loops over the plan's PR boundaries. Each boundary is one coherent delivery slice with its own worktree, routes, and subagent-driven development. New user flows, material interaction/layout/responsive changes, or an explicit request run the UX gate after task reviews and before SDD's broad final review, which is the slice gate. The PR monitor publishes the PR and owns CI, configured review, fixes, and merge. The next boundary starts once the monitor runs; a dependent one waits for its predecessor's PR record. Dependent boundaries run as PR chains, each PR branched from and targeting its predecessor, with one pr-monitor per chain. Unpublished lanes rebase after active tracks merge and primary-worktree agents finish, before final review; once a PR opens only its monitor moves that branch. The issue tracker is reconciled only when the plan is linked to one, then the worktree, branch, and scratch are removed.

The orchestrator passes the implementation report and review-package path to the reviewer, which writes its findings to a review file and returns a short verdict; the implementer fixes from that file. The orchestrator reads return messages only, never reports, reviews, diffs, or logs.

Normal continuation stays in the current session. After interruption, recover from the approved plan, Git history, branch and worktree state, SDD scratch, and current PR state. No separate resume state machine is required.

`quick-task` creates a one-task mini-plan for a small decision-complete change, then enters the same delivery path.
