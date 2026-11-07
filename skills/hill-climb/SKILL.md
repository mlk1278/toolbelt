---
name: hill-climb
description: Use when asked to improve an existing screen, workflow, or product outcome through measured attempts, from polishing one screen to a multi-round climb toward a target across many inputs. Not for fixing one known bug. Not for changing what information a screen shows.
---

# Hill climb

Improve something that exists through measured attempts. Each attempt starts from the best version so far and stays only if it beats that version.

## Pick the size

- **Campaign.** The target spans many inputs or scenarios, or the work needs more than one session. Read [campaign.md](campaign.md).
- **Quick.** Everything else. Read [quick.md](quick.md).
- **Unclear.** Start quick. Move to a campaign only if the quick run shows the problem spans inputs.

Read only the file for the size you pick. The core below applies to both sizes.

## Core

1. Capture a baseline before editing. Use the same setup for every attempt.
2. Start each attempt from a checkpoint of the best version so far, such as a commit. A failed attempt then reverts cleanly.
3. Test one idea per attempt. A coherent redesign counts as one idea when every change in it serves that idea. The campaign size has one exception, for defect rounds.
4. Keep an attempt only if it beats the best version so far and everything on the must-still-work list still works. Otherwise revert it.
5. Log every attempt, including reverted and invalid ones. Give each attempt one line with the idea, the result, and kept or reverted.
6. Keep judges blind. A reviewer or actor never learns the target score, the attempt's rationale, or which version should win. Blind review uses random labels, runs through `toolbelt:agent-routing` (required), and uses a vision-capable model for visual work.

## Exit

Report the before and after evidence, the attempt log, and the check results. If the run kept an attempt, invoke `toolbelt:requesting-code-review` on the final commit. Do NOT invoke any other skill.
