---
name: ux-review
description: "Use before final review of a change that alters a user flow, interaction, layout, responsive behavior, or the facts a screen shows, or when asked to check, review, or critique screens or screenshots; a typo fix or an isolated color or spacing adjustment does not trigger it on its own."
---

# UX Review

A top-level session runs this skill: an orchestrator, or the session your human partner is talking to. A subagent that wants a review asks for one in its report. The session running this skill never opens the images or the capture brief; it passes their paths.

When the app will not run or nothing can be captured, the review cannot run and nothing may claim UX was verified.

## At a gate

**Entry:** the author's final capture folder; the finished-capture check's output line, or the capture's commit when the project has no check; the plan path; and for each changed piece, its page, its review shots, each one's focus, and the task numbers that cover it.
**Exit:** `Pass` with the capture commit only when every changed piece passes; else `Changes Required` with the review files. This skill fixes nothing.

Read the design reference path from the project's UX policy (`.toolbelt/ux-policy.md`). Route one `reviewer` with specialty `ux` through agent-routing per changed piece in one turn. Send each:

- The capture brief's path, that piece's review shots, and each one's focus: the changed component or the whole screen. Say that the reviewer reads only those shots and ignores the rest of the brief, because a reviewer handed more shots than these finds the large problems and misses the fine ones.
- The plan path and the task numbers whose acceptance criteria and `Layout:` notes cover that piece.
- The design reference path, and [reviewer-prompt.md](reviewer-prompt.md) as an absolute path for the reviewer to follow.
- A review file of its own in the capture folder. Say that this path replaces the one the brief prints, because several reviewers share one brief.

The author captures any screen the plan names to match as a reference, and the dispatch marks it as one.

## Asked to check screens

Use the images supplied. When none are, capture the named pages with the project's capture command, as its UX policy describes. When the project has no capture command, review the images supplied and say that nothing could be captured.

Route a `reviewer` with specialty `ux`. Send the image paths, the design reference path when the project has one, and the absolute path of [reviewer-prompt.md](reviewer-prompt.md). Say that no criteria were supplied, so the reviewer skips its criteria pass and returns findings with no verdict. No plan or branch is needed, and partial evidence is fine.

## Fixes and the re-check

At a gate, the review files go to the author, who fixes every blocker and should, and takes or declines each nit with a one-line reason. The author retakes only the shots the fix touched, into a new folder, and keeps the earlier folders for the before images.

Send the new brief to the same reviewer with separate before and after images per finding. The re-check answers only whether each finding is fixed and whether the fix broke a neighboring state; it does not open a new review. Repeat while each re-check closes findings. If a blocker or should stays open after the author calls it fixed, take both images to your human partner at the reviewer's severity.

## Evidence across commits

The first review needs a full capture at the reviewed commit. After a fix, retake touched shots at the fix commit; a shared style or token fix retakes every screen using it. A branch rebased after its final capture needs a new final capture before the first review.
