# Porting Toolbelt to a New Harness

Toolbelt ships for two harnesses: Claude Code and Codex. This document is the
contract a third harness would have to satisfy — what it must be able to do, what
the bootstrap emits, and how to prove a port works.

The content in `skills/` is harness-agnostic and never changes for a port. What a
port adds is the thin layer that gets `using-toolbelt` in front of the model every
session and translates the skills' action vocabulary into the harness's tool names.

When this document and the code disagree, the code wins. Fix the document.

---

## What a harness must be able to do

### Hard requirement: automatic session-start injection or native skill discovery

The model must learn that skills exist, every session, with no per-session opt-in
from your human partner. There are exactly two ways that happens:

- **Injection.** The harness runs a session-start hook (or an in-process
  lifecycle callback) whose output lands in the model's context. This is Claude
  Code's path.
- **Native skill discovery.** The harness scans a skills directory and surfaces
  each skill's name and `description` at session start. `using-toolbelt`'s
  description ("Use when starting any conversation…") is then what triggers the
  model to load it. This is Codex's path.

Native discovery is weaker: nothing wraps the content in `<TOOLBELT>`,
nothing re-injects after compaction, and firing depends on the model acting on a
description. It works, but the acceptance test matters more there, not less.

If the only way to get Toolbelt in front of the model is for your human partner to
paste a prompt or enable a mode each session, the harness cannot be supported.

### The rest of the checklist

| Capability | Why | If absent |
|---|---|---|
| Load a skill's full content on demand | Every skill body has to reach the model | With no skill tool, the fallback is reading `SKILL.md` with the file-read tool. Say so explicitly in the tool mapping. Neither one available means no port. |
| File read / write / edit | Nearly every skill manipulates files | Essential. No workaround. |
| Run shell commands | TDD, verification, git workflows | Essential. |
| Subagent dispatch | `dispatching-parallel-agents`, `subagent-driven-development` | Degradable. Some harnesses gate it behind config — Codex needs `multi_agent = true` in `~/.codex/config.toml`. |
| Todo / task tracking | Progress tracking in several skills | Degradable — fall back to a plan file. |
| Web fetch / search | A few skills | Degradable. |

"Degradable" means the skill already carries fallback wording. Point the mapping at
the real tool when it exists; reuse the fallback wording when it doesn't. Never
invent a tool name the harness doesn't have.

---

## The bootstrap contract

`hooks/session-start` is the whole injection mechanism. It:

1. Derives the plugin root from its own path (`dirname`), so it does not depend on
   any harness-provided root variable.
2. Reads `skills/using-toolbelt/SKILL.md` verbatim — frontmatter included.
3. Wraps it: `<TOOLBELT>`, the line "You have a toolbelt.", a preamble
   saying this is the full content of the `toolbelt:using-toolbelt` skill and that
   all other skills load via the `Skill` tool, then the skill body, then
   `</TOOLBELT>`.
4. JSON-escapes the whole thing and prints one of two shapes, branching on
   `CLAUDE_PLUGIN_ROOT`.

### The two output shapes

Claude Code (`CLAUDE_PLUGIN_ROOT` set) — nested:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "…"
  }
}
```

Everything else — SDK standard, top-level:

```json
{
  "additionalContext": "…"
}
```

**Emit exactly one.** Claude Code reads both `additional_context` and
`hookSpecificOutput` without deduplicating, so emitting both double-injects the
bootstrap. Emitting the wrong one injects nothing, silently. `tests/hooks/test-session-start.sh`
asserts both shapes and asserts the other fields are absent.

A new harness that consumes hook stdout either matches one of these shapes or gets
a third branch in `hooks/session-start`. If it also sets `CLAUDE_PLUGIN_ROOT`,
order its branch first or the Claude Code branch shadows it.

### Compaction re-injection

The bootstrap has to survive long sessions. `hooks/hooks.json` registers
`SessionStart` with matcher `startup|clear|compact` — the same hook re-runs after
compaction, so the skill content is re-injected once the summarizer has dropped it.
Without this, long sessions silently lose skill triggering partway through.

A harness with no compaction event needs an equivalent: re-inject on whatever
event follows summarization, or inject per turn with a dedup guard that checks for
the `TOOLBELT` marker already in context. Per-turn injection without a
guard bloats context; injection without re-injection dies at the first compact.

If you inject a message rather than hook output, inject it as a **user** message,
not a system message. Repeated system messages bloat tokens and break some models.

### Zero runtime dependencies

Toolbelt is a zero-dependency plugin. The bootstrap is one bash script plus a
polyglot `.cmd` wrapper; the tests use `node -e` and `python3` inline. A port does
not get to add a runtime package. If a harness cannot be integrated without one,
that is a finding to raise, not a dependency to add.

### Windows

`hooks/run-hook.cmd` is a polyglot: valid Windows batch and valid shell script. On
Windows `cmd.exe` runs the batch block, which locates bash (Git for Windows, then
`bash` on PATH) and dispatches the named hook script, exiting cleanly if no bash
exists so the plugin still loads without injection. On Unix the leading `:` makes
the batch block a no-op heredoc and the shell execs the script.

Two rules this enforces:

- **Hook scripts are extensionless** (`session-start`, not `session-start.sh`).
  Claude Code's Windows handling prepends `bash` to any command containing `.sh`,
  which double-invokes.
- Don't write per-OS variants. One bash script plus the wrapper covers all three
  platforms.

Background: `docs/windows/polyglot-hooks.md`.

---

## Skill discovery vs. injection

These are two separate questions and a harness can answer them differently.

**Discovery** is how the harness finds `skills/`. It varies: a manifest path field
(`"skills": "./skills/"`), a co-located directory the harness auto-scans, or a
registration API. A path field is not portable — confirm your harness's convention
empirically by asking the running model to list its available skills after wiring.

**Injection** is how `using-toolbelt` reaches the model at session start. A harness
with native discovery may not need injection at all; a harness without it needs
injection or the skills sit on disk and never load.

Both must ride the harness's own install mechanism. A port must never write into
the user's global or personal config to bridge a gap. If the install mechanism
genuinely cannot carry the bootstrap, that is a limitation to surface.

---

## Tool mapping

Skills describe *actions* — "read a file", "dispatch a subagent", "create a todo" —
and never name a specific tool. That is what lets one skill body run everywhere. A
port translates the action vocabulary into real tool names; it does not edit skill
bodies. If you find yourself editing a `SKILL.md` to make a port work, the fix
belongs in the mapping.

The mapping lives in `skills/using-toolbelt/references/<harness>-tools.md`, and
`SKILL.md`'s Platform Adaptation section points at it. See
`references/codex-tools.md` for the shape: it covers the config flag that enables
subagent dispatch, the semantics of the harness's wait/dispatch calls, and
environment detection. Cover every action a skill can name, and omit only what
genuinely doesn't apply.

Get real tool names from the harness, never from memory: in a live session, ask the
model to list the exact machine names of every tool it can call.

---

## The two supported harnesses

| | Claude Code | Codex |
|---|---|---|
| Manifest | `.claude-plugin/plugin.json` (+ `marketplace.json`) | `.codex-plugin/plugin.json` |
| Skill discovery | auto-discovers `skills/` by convention | manifest `"skills": "./skills/"` |
| Bootstrap | `hooks/hooks.json` `SessionStart` (`startup\|clear\|compact`) → `run-hook.cmd session-start` → nested `hookSpecificOutput.additionalContext` | native skill discovery surfaces `using-toolbelt`; no session-start hook |
| Hooks field | none — auto-discovers `hooks/hooks.json` | `"hooks": {}` |
| Tool mapping | native `Skill` tool; no reference file needed | `references/codex-tools.md` |
| Tests | `tests/hooks/`, `tests/claude-code/` | `tests/codex/` |
| Distribution | `/plugin marketplace add` + `/plugin install` | portal archive from `scripts/package-codex-plugin.sh`, installed via `/plugins` |

Codex's `"hooks": {}` is load-bearing. Codex falls back to a hardcoded
`hooks/hooks.json` when the manifest has no `hooks` field, which would register the
Claude Code SessionStart hook and its install-time trust prompt. An empty inline
object parses as an empty hook set and suppresses that. `tests/codex/test-marketplace-manifest.sh`
asserts it. The Codex archive doesn't ship `hooks/` at all.

Versioned manifests are kept in lockstep by `.version-bump.json` /
`scripts/bump-version.sh`. A new manifest not registered there ships a stale
version.

---

## Verifying a port

Reading code does not tell you whether a port works. Run the harness.

**Acceptance test.** Clean session, send exactly:

> Let's make a react todo list

`brainstorming` must auto-trigger before any code is written. That is the only
check that matters. If it fails, the bootstrap isn't loading and nothing else about
the port is worth debugging.

**Smoke check first.** Before the acceptance test, confirm the bootstrap loaded at
all: start a session and ask the model what skills it has available and how it
loads one. If it can't answer, injection or discovery is broken — fix that before
running the acceptance test. A harness that writes startup logs may let you grep
for the bootstrap marker instead (note that logs usually go to stderr).

**Driving an interactive harness.** Most harnesses are TUIs that can't be driven by
piping stdin, so run one in a detached tmux session and control it with `send-keys`
/ `capture-pane`. Practical notes:

- Clear first-run onboarding, trust prompts, and sandbox gates before typing a
  prompt — keystrokes sent during a modal select menu items instead of typing.
  A detached session waiting on a modal just sits there with no error.
- Send prompt text and `Enter` as separate `send-keys` calls with a short sleep
  between them; sending them together races on some TUIs. `Enter` is a key name,
  not `\n`.
- Poll `capture-pane` in a loop rather than capturing once. It shows only the
  visible pane, so use the harness's own transcript file for a long session.
- Reinstall and restart after each change — the bootstrap loads at startup.
- `kill-session` when done.

**Automated tests.** For a hook-based harness, assert the hook's stdout shape and
that it contains the bootstrap — extend `tests/hooks/test-session-start.sh`, which
already validates the nested and SDK shapes. For an in-process integration, fake
the harness's plugin API and assert the handlers register, the bootstrap injects
once, the dedup guard holds, and compaction re-injection fires. Automated tests
cover wiring; only the live run proves skills actually trigger.

---

## Gotchas

- **Opt-in isn't a port.** Anything your human partner has to do per session fails
  the acceptance test.
- **A hook *system* is not a session-start *event*.** A harness can have hooks, and
  even carry the string `SessionStart` in its binary, with no event that fires at
  session start and writes to context. Confirm the specific event exists.
- **A fork does not inherit its parent's behavior.** A harness derived from another
  may accept the parent's manifest fields and include syntax and not honor them the
  same way. Prove every assumption with a unique-marker test: inject a nonsense
  token, start a fresh session, confirm it reached the model without a tool call.
- **Wrong JSON field.** Silent no-injection, or double injection on Claude Code.
- **Hook-config schema varies.** Matcher strings, key casing, and whether the
  command uses a plugin-root variable or a relative path are all per-harness. Wrong
  matchers mean the hook silently never fires.
- **Callback frequency varies.** Per-step callbacks need a per-call dedup guard;
  per-turn callbacks need a lifecycle flag. Copying one strategy onto the other's
  frequency breaks injection.
- **Message-object shapes are per-harness.** Discover yours; copying a literal from
  elsewhere fails silently.
- **"Never read skill files" means "don't bypass the skill-loading mechanism."**
  On a harness with no skill tool, reading `SKILL.md` *is* the mechanism. Say that
  in the mapping so the model doesn't think it's breaking a rule.
- **`.sh` on Windows.** Keep hook scripts extensionless.
- **Editing skills to fit the harness.** Never. The fix goes in the tool mapping.
