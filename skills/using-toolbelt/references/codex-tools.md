## Subagent dispatch requires multi-agent support

Add to your Codex config (`~/.codex/config.toml`):

```toml
[features]
multi_agent = true
```

This enables `spawn_agent`, `wait_agent`, and `close_agent` for delivery and the review skills. Close each subagent once nothing will resume it, such as an implementer after its boundary is published.

`wait_agent` may return an intermediate agent MESSAGE before the agent's final answer. A MESSAGE is progress, not completion, so call `wait_agent` again until the final answer carrying the agent's status and report arrives. Likewise, a wait interrupted by an unrelated event, such as a new user message, does not mean the agent failed; resume waiting on the same agent.

## Codex App Finishing

When the sandbox blocks branch or push operations on a detached HEAD in an externally managed worktree, commit all work and tell your human partner to use the App's native controls:

- **"Create branch".** Names the branch so they can commit, push, and open a PR through the App UI.
- **"Hand off to local".** Transfers the work to their local checkout.

You can still run tests, stage files, and print suggested branch names, commit messages, and PR descriptions for your human partner to copy.
