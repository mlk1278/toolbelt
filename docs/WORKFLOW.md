# Toolbelt Workflow

New or ambiguous work goes through `brainstorming`, `writing-specs`, and `writing-plans`. A plan gives each task a contract, what proves it, and a verify command, and divides the work into PR boundaries, each with a `Risk` level. Delivery starts only from an approved plan or a decision-complete quick task.

Every role routes from the project's routing text, or the bundled default; plans carry no routing. The session agent drives `delivery` and reads the plan, the ledger, and each implementer's reply. Prompts, diffs, and reviews move by path.

`delivery` gives each PR boundary its own worktree and one implementer. The implementer receives every task brief at once, commits after each task, looks at captures of every visible change and fixes what it sees, and stops only for a behavior, contract, money, or missing layout decision. Up to three independent boundaries run at a time. New user flows and material changes to interaction, layout, responsive behavior, or the facts a screen shows run the UX gate, where a reviewer who did not write the code judges the screens. One local review follows, at the effort the boundary's `Risk` sets; the PR's review providers are the second reviewer. An unpublished branch rebases once, just before that review. `pr-monitor` then publishes the PR and owns CI, provider rounds, fixes, rebases, and merge, with one monitor per chain of stacked PRs. Whoever fixes a finding also fixes every sibling the same search finds. After merge, delivery reconciles the issue tracker when the plan links one, then removes the worktree, branch, and scratch, except the saved captures.

After an interruption, delivery recovers from its ledger, Git history, worktrees, live agents, and PR state.

`quick-task` writes a mini-plan with one task per small decision-complete fix, all in one PR, then enters the same delivery path.
