# Parallel Tracks

Read this when the plan declares a top-level `## Execution Tracks` section. It
governs how tracks fork, run, and merge.

**Wave execution.** Walk the track DAG:

1. When a fork's mainline prerequisites are complete and reviewed, create one sub-worktree per ready track from the current feature-branch head: `git worktree add <sdd-workspace>/tracks/<track-id> -b <feature-branch>--<track-id>`. Apply the project's worktree-policy setup rules. Record each track's base SHA in the ledger.
2. Dispatch every ready track's first implementer in one message. At most 3 tracks run concurrently; a lower worktree-policy limit governs. Start the largest track (by task count) first; the rest queue for free slots.
3. Inside a track the process is unchanged, with BASE/HEAD recorded per task on the track branch.
4. When a track's last task is reviewed clean, merge its branch into the feature branch with `--no-ff`, then remove the sub-worktree and branch. A textual conflict is a plan defect: stop, do not hand-resolve, and give your human partner the conflicting paths and the track declarations they contradict.
5. When every track at a fork has merged, dispatch the fork's integration task in the primary worktree as a normal task.

**Working directories.** Every track dispatch — implementer, fixer, reviewer — names the track worktree as its working directory, carried by the implementer template's `Work from:` line. Briefs, reports, review packages, and the ledger stay in the primary worktree's SDD workspace, reached by absolute path; recorded BASE/HEAD SHAs resolve from any worktree.

**Drift log.** Track implementer dispatches require a `## Decisions & drift risks` report section: assumptions about the frozen contract, gametime decisions, anything a sibling track might contradict. `None` is a valid entry. Carry one ledger line per non-empty entry, and paste all merged tracks' entries into the integration task's brief.

**Ledger.** One line per track: `Track B: in-progress (task 8/9, worktree <path>, base <sha7>)` → `Track B: merged (<sha7>, worktree removed)`. During a wave keep exactly one `Next:` line, aggregating pending events (e.g. `Next: wave — backend task 5 review; frontend task 8 report`).

**Failure semantics.** A BLOCKED track does not stop its siblings; a fork's integration task waits for every track at that fork. A `git worktree add` failure falls back to serial execution in the primary worktree for the affected tracks; report the downgrade. Surface a declaration-rule violation found at execution time like any plan defect.
