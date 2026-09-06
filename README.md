# Toolbelt

A software development methodology for coding agents, built from composable skills plus a bootstrap that makes sure the agent actually uses them.

Short skills written for current models, two harnesses, and a delivery pipeline that carries work from an idea through a merged PR. It installs globally and assumes nothing about the project it lands in.

## How it works

It starts the moment you fire up your coding agent. As soon as it sees you're building something, it *doesn't* jump into writing code — it steps back and asks what you're actually trying to do.

Once the conversation has produced a design you've approved, it writes that into a spec, gates the spec with you and a reviewer from a different model family, then turns it into an implementation plan detailed enough that a subagent with no project context can execute it.

Then it runs the plan: a fresh subagent per task, each one reviewed before the next begins, with a broad review gating the whole slice before it becomes a pull request. It's not unusual for this to run autonomously for a couple of hours without drifting from the plan.

The skills trigger themselves, so there's nothing to remember.

## Installation

Install once per harness; the plugin is global and every project picks it up.

### Claude Code

```bash
/plugin marketplace add mlk1278/toolbelt
/plugin install toolbelt@toolbelt-dev
```

Start a fresh session afterward — the session-start hook registers on load.

### Codex

```bash
/plugins
```

Search for `toolbelt` and select `Install Plugin`. Subagent dispatch needs multi-agent support, so make sure `~/.codex/config.toml` has:

```toml
[features]
multi_agent = true
```

## Per-project configuration

Nothing is required. Each is optional and read only when present:

| File | Purpose |
|---|---|
| `.toolbelt/agents.json` | Agent routes — harness, model, effort, custom instructions per role |
| `.toolbelt/pr-policy.md` | Which review providers to await, complexity lanes, timeouts |
| `.toolbelt/worktree-policy.md` | Port ranges, sidecar containers, and per-worktree resources so parallel worktrees don't collide |
| `docs/REVIEW-GUIDANCE.md` | Project review conventions, given to reviewer subagents |
| `AGENTS.md` | Entry-point summary — copy from [docs/AGENTS-SNIPPET.md](docs/AGENTS-SNIPPET.md) |

Scratch lands in `.toolbelt/`; add it to `.gitignore`. See [docs/ADOPTING-IN-A-PROJECT.md](docs/ADOPTING-IN-A-PROJECT.md) for the adoption checklist and how to verify a project resolves its routes.

## The Basic Workflow

1. **brainstorming** - Activates before writing code. Refines rough ideas through questions, explores alternatives, presents design in sections for validation.

2. **writing-specs** - Activates with an approved design, or directly when you ask for a spec. Writes and commits the spec document, then gates it with your review and an alternate-family model review.

3. **using-git-worktrees** - Activates after spec approval. Creates isolated workspace on new branch, runs project setup, verifies clean test baseline.

4. **writing-plans** - Activates with an approved spec. Breaks work into bite-sized tasks (2-5 minutes each). Every task has exact file paths, complete code, verification steps.

5. **subagent-driven-development** - Activates with plan. Dispatches fresh subagent per task with two-stage review (spec compliance, then code quality).

6. **test-driven-development** - Activates during implementation. Enforces RED-GREEN-REFACTOR: write failing test, watch it fail, write minimal code, watch it pass, commit. Deletes code written before tests.

7. **requesting-code-review** - Activates between tasks. Reviews against plan, reports issues by severity. Critical issues block progress.

8. **finishing-a-development-branch** - Activates when tasks complete. Verifies tests, presents options (merge/PR/keep/discard), cleans up worktree.

**The agent checks for relevant skills before any task.** Mandatory workflows, not suggestions.

## What's Inside

### Skills Library

**Testing**
- **test-driven-development** - RED-GREEN-REFACTOR cycle (includes testing anti-patterns reference)

**Debugging**
- **systematic-debugging** - 4-phase root cause process (includes root-cause-tracing, defense-in-depth, condition-based-waiting techniques)
- **verification-before-completion** - Audit every claim against a tool result before reporting

**Collaboration** 
- **brainstorming** - Socratic design refinement
- **writing-specs** - Spec documents and their review gates
- **interactive-design** - Frontend-first prototyping against fixture-backed API contracts
- **writing-plans** - Detailed implementation plans
- **dispatching-parallel-agents** - Concurrent subagent workflows
- **requesting-code-review** - Pre-review checklist
- **receiving-code-review** - Verify feedback against the code before acting on it
- **using-git-worktrees** - Parallel development branches
- **finishing-a-development-branch** - Merge/PR decision workflow
- **subagent-driven-development** - Fast iteration with two-stage review (spec compliance, then code quality)

**Delivery**
- **quick-task** - Small decision-complete changes, straight to one merged PR
- **delivery** - An approved plan through one coherent slice to a merged PR
- **agent-routing** - Resolves logical roles to concrete agent routes
- **ux-gate** - Screenshot capture and vision review for user-visible changes
- **pr-monitor** - CI, review providers, fix loops, and merge

**Meta**
- **writing-skills** - Create new skills following best practices (includes testing methodology)
- **writing-for-agents** - Editorial rules for any agent-consumed document
- **using-toolbelt** - Introduction to the skills system

## Philosophy

- **Test-Driven Development** - Write tests first, always
- **Systematic over ad-hoc** - Process over guessing
- **Complexity reduction** - Simplicity as primary goal
- **Evidence over claims** - Verify before declaring success

## Working on this

See [CLAUDE.md](CLAUDE.md) for how skills are structured and what not to break, and `skills/writing-skills/SKILL.md` for the full guide to writing them.

Plugin-infrastructure tests live in `tests/` and run via the relevant `run-*.sh`. Skill-behavior evals use an external drill harness cloned into `evals/`, which is gitignored and not included here.

## Credit

Toolbelt began as a fork of [Superpowers](https://github.com/obra/superpowers) by [Jesse Vincent](https://blog.fsck.com) and [Prime Radiant](https://primeradiant.com). The methodology and much of the original skill content came from there. It has since diverged and is maintained independently.

The `writing-for-agents` skill and the review smell baseline are adapted from [Matt Pocock's skills](https://github.com/mattpocock/skills) (MIT).

## License

MIT License - see LICENSE file for details
