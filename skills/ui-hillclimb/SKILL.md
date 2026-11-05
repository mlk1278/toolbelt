---
name: ui-hillclimb
description: Use when asked to improve an existing screen or workflow, from polish to redesign, while it keeps showing the same information.
---

# UI Hill Climb

Improve an existing interface in a few bounded attempts. Each attempt tests one idea against the best version so far, on the same task with the same setup.

## 1. Set the baseline

Run the app and do the task as its intended user. For a broad request such as "modernize this app", look over the relevant screens, name the biggest recurring problem, and pick one workflow to start with. When the request covers more than one workflow, confirm the workflow and outcome with your human partner before editing.

Before editing, write down:

- **User and task:** who uses the screen, what they are trying to do, and where they get stuck.
- **Outcome:** one observable improvement and how you will check it, such as "the next action is visible without opening a menu" or "two similar records each show a field that tells them apart".
- **Must still work:** the actions, roles, and states that must survive, the files or surfaces in scope, and the existing patterns to follow.
- **Setup:** starting state, test data, role, and screen size, including one realistic case with long text or dense data.

Capture the baseline with that setup, and use the same setup for every attempt. If the app will not run or the problem will not reproduce, resolve that first.

## 2. Try candidates

Start each attempt from a checkpoint of the best version so far, such as a commit, so a failed attempt reverts cleanly. Test one idea per attempt. A whole new layout counts as one idea when every change in it serves that idea.

1. State the change and what you expect the outcome check to show.
2. Make the change.
3. Repeat the task with the same setup and capture views matching the baseline's. Include a recording or repeatable interaction steps when still images cannot show the change.
4. Keep the attempt only if it passes the outcome check, beats the best version so far, and everything under **Must still work** still works. Otherwise revert to the checkpoint.
5. Log one line: the idea, what happened, kept or reverted.

Stop when the outcome check passes, or after three attempts unless your human partner set a different budget. If no attempt was kept, skip the blind review and hand off with the baseline unchanged.

## 3. Blind review

Route one fresh, read-only `reviewer` through `toolbelt:agent-routing` (required), on a vision-capable model. Send the task, the outcome, the references, and matching evidence from the baseline and the best version, labeled A and B in random order. The evidence covers only the views the change touched, plus the view before or after one when the reviewer needs it to follow the flow. A twelve-step workflow with one changed screen sends that screen, not all twelve. Keep which is which out of the brief, file names, and captions, and leave out the log and your reasons for each change, so the reviewer judges the screens rather than your argument.

Ask:

- Which version would you rather use for this task? A tie is allowed.
- What would you read or select first in each?
- What got harder?
- For a visual change: what improved in hierarchy, density, or consistency?

Each answer names the screen or interaction behind it. Screenshots cannot prove an action works, so replay anything the reviewer says got harder in the running app, and check it against **Must still work**.

Keep the candidate when the reviewer prefers it or calls a tie, and it passes both the outcome check and **Must still work**. Otherwise restore the baseline.

## 4. Hand off

Report to your human partner:

- Before and after evidence, and which label was which.
- The results of the outcome check and the **Must still work** checks.
- The attempt log and the reviewer's answers.
- Any tradeoff worth trying in the running app.

Leave merging to your human partner unless they asked you to merge. Do NOT invoke any other skill.
