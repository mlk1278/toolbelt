# Visual Companion

Use the browser when the answer is a visual preference, such as mockups, layouts, look and feel, diagrams, or state machines. Use the terminal when the answer is words, such as requirements, scope, trade-offs, or API design. "Which of these wizard layouts feels right?" belongs in the browser. "What kind of wizard do you want?" belongs in the terminal.

## Start the server

```bash
scripts/start-server.sh --project-dir /path/to/project --open
```

- The script prints JSON with `url`, `screen_dir`, and `state_dir`, and writes the same JSON to `$STATE_DIR/server-info`.
- Give your human partner the complete `url`, because the server rejects requests without its `?key=` parameter. Share it even when you pass `--open`, in case they are on a headless or remote machine.
- `--project-dir` stores mockups in `.toolbelt/brainstorm/` and lets a restart reuse the port. Remind your human partner to add `.toolbelt/` to `.gitignore`.
- The server has to outlive the turn. In Claude Code and Codex, run the command as-is. On Windows, pass `run_in_background: true` and read `$STATE_DIR/server-info` on the next turn. In environments that reap detached processes, add `--foreground` and use the platform's background mechanism.
- If the URL is unreachable, such as in remote or container setups, add `--host 0.0.0.0 --url-host localhost`.

## The loop

1. Confirm that the server is alive: `$STATE_DIR/server-info` exists and `$STATE_DIR/server-stopped` does not. If it stopped, rerun `start-server.sh` with the same `--project-dir`, and the open tab will reconnect. The server exits after 4 hours idle, configurable with `--idle-timeout-minutes`.
2. Write the screen to a new file in `screen_dir` with your file-creation tool, not `cat` or a heredoc. Because the server displays the newest file, give every screen a fresh name, such as `layout.html` then `layout-v2.html`.
3. Remind your human partner of the URL, summarize the screen in one line, and ask: "Take a look and let me know what you think. Click to select an option if you'd like." Then end your turn.
4. On the next turn, read `$STATE_DIR/events` if it exists. Your human partner's terminal reply takes precedence.
5. Revise the screen until the current question is settled, then move on.
6. When the conversation returns to the terminal, push a waiting screen:

```html
<div style="display:flex;align-items:center;justify-content:center;min-height:60vh">
  <p class="subtitle">Continuing in terminal...</p>
</div>
```

## Writing screens

Write HTML fragments. The server wraps them in a frame with the theme CSS and click handling, while any file starting with `<!DOCTYPE` or `<html` is served as-is. Show two to four options per screen, state the question on the page, and use real content whenever placeholders would hide a design problem.

- `.options`: container for A/B/C choices; `data-multiselect` allows several.
- `.option`: one choice, with `data-choice` and `onclick="toggleSelect(this)"`.
- `.letter`, `.content`: an option's label and body.
- `.cards`, `.card`: visual design choices, each with `.card-image` and `.card-body`.
- `.mockup`: a preview frame with `.mockup-header` and `.mockup-body`.
- `.split`: side-by-side mockups.
- `.pros-cons`: a `.pros` and `.cons` pair.
- `.mock-nav`, `.mock-sidebar`, `.mock-content`, `.mock-button`, `.mock-input`, `.placeholder`: wireframe blocks.
- `.subtitle`, `.section`, `.label`: secondary text, a spaced block, small uppercase text.

The stylesheet lives in `scripts/frame-template.html`.

## Events

Each click appends one JSON line to `$STATE_DIR/events`. A new screen clears the file.

```jsonl
{"type":"click","choice":"a","text":"Option A - Simple Layout","timestamp":1706000101}
```

The last click is usually the final choice. Several clicks can signal hesitation worth asking about.

## Stop the server

```bash
scripts/stop-server.sh $SESSION_DIR
```

A session started without `--project-dir` lives in `/tmp` and is deleted on stop.
