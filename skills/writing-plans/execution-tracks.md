# Execution Tracks

Read this before declaring tracks in a plan. Tracks are chains of tasks run concurrently, each in its own sub-worktree, merged at a declared integration point.

```markdown
## Execution Tracks

| Track | Tasks | Depends on | Files touched (summary) | Why safe |
|---|---|---|---|---|
| serial-1 | 1–2 | — | shared types, API contract | mainline (contract freeze) |
| backend | 3–6 | serial-1 | src/server/** | disjoint from frontend, e2e-specs |
| frontend | 7–9 | serial-1 | src/app/settings/** | disjoint from backend, e2e-specs |
| e2e-specs | 10 | serial-1 | e2e/** | disjoint from backend, frontend |
| serial-2 | 11 | backend, frontend, e2e-specs | (integration) | merge point |
```

Structure rules:

- Track ids are kebab-case slugs, used as branch and worktree directory names. `serial-N` tracks run in the primary worktree, named tracks in sub-worktrees.
- Every task number appears in exactly one track, in numeric order within it.
- `Depends on` names tracks, forming a DAG. Tracks with identical satisfied dependencies run concurrently.

Declaration rules:

- **Disjoint file sets.** No file is created or modified by two concurrent tracks. Test files, fixtures, and generated-file sources count.
- **No contract-shaped work in tracks.** Migrations, shared schema, shared types, and shared API contracts belong in a mainline task before the fork — the **contract-freeze** pattern. A track consumes the frozen contract; it never changes it.
- **No cross-track interfaces.** No track's task may list another concurrent track's `Produces:` in its `Consumes:`. Anything consumed across tracks comes from a mainline task before the fork.
- **Threshold.** A track must beat roughly 2–5 minutes of per-worktree setup: at least 2 tasks, or one large task. Less stays in the mainline.
- **Every fork closes with a mainline integration task.** The orchestrator merges; the task does not. It runs the integration scope — targeted cross-package checks and E2E over the merged tracks' seams, within SDD's Verification Scope policy, never workspace-wide — and fixes what breaks. Its text states that its brief carries each merged track's `Decisions & drift risks` entries.
