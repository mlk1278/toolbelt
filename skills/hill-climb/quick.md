# Quick

One screen or workflow, improved in one session. The core in [SKILL.md](SKILL.md) applies throughout.

## Set the baseline

Run the app and do the task as its intended user. For a broad request such as "modernize this app", look over the relevant screens, name the biggest recurring problem, and pick one workflow to start with. When the request covers more than one workflow, confirm the workflow and outcome with your human partner before editing. If the app will not run or the problem will not reproduce, resolve that first.

Before editing, write down:

- **User and task:** who uses the screen, what they are trying to do, and where they get stuck.
- **Outcome:** one observable improvement and how you will check it, such as "the next action is visible without opening a menu" or "two similar records each show a field that tells them apart".
- **Must still work:** the actions, roles, and states that must survive, the files or surfaces in scope, and the existing patterns to follow.
- **Setup:** starting state, test data, role, and screen size, including one realistic case with long text or dense data.

Capture the baseline with that setup.

## Try candidates

1. State the change and what you expect the outcome check to show.
2. Make the change.
3. Repeat the task with the same setup and capture views matching the baseline's. Include a recording or repeatable interaction steps when still images cannot show the change.
4. Keep the attempt only if it passes the outcome check as well as the core's keep rule. Otherwise revert to the checkpoint.

Stop when the outcome check passes, or after three attempts unless your human partner set a different budget. If no attempt was kept, skip the blind review and hand off with the baseline unchanged.

## Blind review

Route one fresh, read-only `reviewer` through `toolbelt:agent-routing` (required). Send the task, the outcome, the references, and matching evidence from the baseline and the best version, labeled A and B in random order. The evidence covers only the views the change touched, plus the view before or after one when the reviewer needs it to follow the flow. A twelve-step workflow with one changed screen sends that screen, not all twelve. Keep which is which out of the brief, file names, and captions. Leave out the log and your reasons for each change, so the reviewer judges the screens rather than your argument.

Ask:

- Which version would you rather use for this task? A tie is allowed.
- What would you read or select first in each?
- What got harder?
- For a visual change, what improved in hierarchy, density, or consistency?

Each answer names the screen or interaction behind it. Screenshots cannot prove an action works, so replay anything the reviewer says got harder in the running app, and check it against **Must still work**.

Keep the candidate when the reviewer prefers it or calls a tie, and it passes both the outcome check and **Must still work**. Otherwise restore the baseline.

## Finish

Follow the exit in [SKILL.md](SKILL.md). Also report which label was which, the reviewer's answers, and any tradeoff worth trying in the running app. Leave merging to your human partner unless they asked you to merge.
