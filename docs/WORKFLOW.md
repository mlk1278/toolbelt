# Toolbelt Workflow

New or ambiguous work goes through `brainstorming`, `writing-specs`, and `writing-plans`. A plan gives each task a contract, what proves it, and a verify command, and divides the work into PR boundaries, each with a `Risk` level. Delivery starts only from an approved plan or a decision-complete quick task.

Every role routes from the project's routing text or the bundled default; plans carry no routing. The session agent drives `delivery` and reads the plan, the ledger, and each implementer's reply. It passes prompts, diffs, and reviews by file path.

`delivery` gives each PR boundary its own worktree and one implementer, running up to three independent boundaries at a time. The implementer receives all of its task briefs at once, commits after each task, captures and inspects every visible change and fixes what it sees, and stops only for a behavior, contract, money, or missing layout decision.

New user flows and material changes to interaction, layout, responsive behavior, or the facts a screen shows run `ux-review`, where the author's final capture goes to one routed reviewer per changed piece, and anyone can also ask for screens to be checked. One local code review runs alongside it at the effort set by the boundary's `Risk`; the PR's review providers act as the second reviewer. An unpublished branch rebases once right before both run.

`pr-monitor` then publishes the PR and owns CI, provider rounds, fixes, rebases, and merge, with one monitor per chain of stacked PRs. Whoever fixes a finding also fixes every sibling found by the same search. After merge, delivery reconciles the issue tracker when the plan links one, then removes the worktree, branch, and scratch files, keeping the saved captures.

After an interruption, delivery recovers from its ledger, Git history, worktrees, live agents, and PR state.

`quick-task` writes a mini-plan with one task per small, decision-complete fix in a single PR, then enters the same delivery path.
