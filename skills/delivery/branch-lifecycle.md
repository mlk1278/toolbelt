# Branch lifecycle

## Ledger

The ledger lives at `<workspace>/delivery.md`, and its first line is the plan path. It is append-only, and every gate line ends with `Next: <event>`. Use these line formats:

- Boundary state, appended when the boundary is prepared and whenever its state changes, with the latest line winning: `Boundary <N>: branch <name>, base <branch>, fork <sha7>, worktree <path>, PR <#num|none>, state <prepared|open|merged|blocked>`
- `Boundary <N>: implementer <agent id>, route <harness>/<model>/<effort>`
- `Boundary <N>: <status>, report <path>`
- `Boundary <N>: ruling — <decision>`
- `Boundary <N>: Review: clean|fixed|skipped at <SHA>`
- `Boundary <N>: rebased <old SHA> → <new SHA>`, appended by whoever moved the branch so a later rebase can find the old head.

## Rebases

Delivery rebases an unpublished branch once, right before its review. Once the PR exists, only its monitor moves the branch. Implementers never rebase. A behavior-neutral PR does not wait on another workstream; whichever PR merges second rebases.

With the predecessor's branch as the parent:

- **Parent moved.** Run `git rebase --onto <parent-new> <parent-old> <branch>`.
- **Parent merged.** Run `git rebase --onto <base-branch> <parent-old> <branch>`, using `<parent-old>` from the ledger, then retarget the boundary's base to the base branch.

If a rebase hits a conflict, run `git rebase --abort` and report the conflicting paths to your human partner. After a clean rebase of a boundary with a visible change, the implementer reruns the final capture before the first UX review, per ux-review.

## Cleanup

After confirming that the PR is merged:

1. Append the boundary's `merged` record.
2. Confirm that the local branch head matches the final head SHA the monitor returned. Anything beyond it is unpublished work, so stop and ask your human partner.
3. Run any teardown that `.toolbelt/worktree-policy.md` defines. From the main repo root, run `git worktree remove <path>`, `git worktree prune`, and `git branch -D <branch>`. Use `-D` because a squash merge leaves the branch's commits unmerged by ancestry.

Never remove a worktree that still has live agents or holds evidence another open boundary needs. Keep prototype baselines until every boundary that uses them closes. After every boundary closes, delete the workspace's scratch files, and leave the workspace directory and its `boundary-N-ux/` folders for your human partner to inspect and delete. Abandon a boundary only on your human partner's explicit instruction.
