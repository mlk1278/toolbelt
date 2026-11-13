---
name: ux-gate
description: "Use before final review of new user flows or material changes to interaction, layout, responsive behavior, or the facts a screen shows, or when UX review is explicitly requested. A typo fix or an isolated color or spacing adjustment does not trigger this review on its own."
---

# UX Gate

**Entry:** changed routes, the base..head range, approved acceptance criteria, the plan path, any prototype ledger path, the implementer's shot list path when there is one, and a running isolated environment. Judge the rendered effect, not line count.
**Exit:** `Pass` bound to the reviewed head SHA, or `Changes Required` with component-level findings. The gate fixes nothing.

A gate runner (role `errand`) runs this skill and returns the verdict to its caller, which sends the review file to the owning implementer. Give every shell command a timeout of at most 10 minutes.

## 0. Preflight

The environment must serve the changed routes with queryable data. Without that, the gate cannot run and nothing may claim UX was verified.

## 1. Coverage

Start from the implementer's shot list when given; it already names routes, targets, states, and fixtures. Pick the smallest set of pathways covering the diff and the acceptance criteria's entry points and states. Read `.toolbelt/ux-policy.md` when present for launch, auth, theme, data, viewports, exceptions, and design references; infer and record what it lacks. Read the `Reuses:` lines for this boundary's tasks in the plan, and the prototype ledger's header when a ledger path was supplied; they name any screen the changed surface has to match.

- Use the relevant breakpoints for changed markup, copy, or layout, or one width when presentation cannot vary.
- Capture each changed surface as its whole screen once per width, and in the narrowest container it appears in, such as a side panel. A viewport width is not a container width.
- Include the hardest data each surface can meet: the longest realistic text, and every notice that can show together.
- Capture every supported theme for every changed surface.
- Reach the criteria's states (empty, loading, error, dense data, overlays) with the matrix's `fixtures` or `setup`, never by editing app source or a hand-written browser script.
- Check changed hover or focus, keyboard reach for changed interactions, and scrolling past the fold. Prove Tab reach with `press` and `expectFocus`; a direct `focus` does not. Use `capture: false` for assertion-only steps, and `motion: true` for changed motion.
- When the plan's `Reuses:` or the prototype ledger names a screen to match, capture that screen as its own pathway (see [matrix.md](matrix.md)). Give it whatever steps reach the matching state, such as opening the slide-out panel, at the same viewports and themes as the changed surface. Then check the components, styles, tokens, and other shared code that decide what that screen renders, such as a shared formatter, data hook, or fixture, the same way §4 checks whether evidence can carry to a new head. If the diff changes any of it, that screen is also a changed surface. Capture it under a plain pathway name. Its mechanical results count, and the reviewer reviews its stills as changed. If the diff changes none of it, treat the screen as a reference. Name its pathway with the `match-` prefix, send its stills to the reviewer as references, and ignore its mechanical results, so a problem that was already on that screen never fails the gate for the changed one.

Record why any dimension is omitted.

## 2. Capture

Read [matrix.md](matrix.md) and write `.toolbelt/ux/matrix.json`, extending the shot list. Capture only through the script: it guards every request, signs in from `.toolbelt/ux-capture.json`, and refuses a shot whose target it cannot reach. Set `UX_SKILL_DIR` to this skill's absolute directory and run from the project root:

```bash
"$UX_SKILL_DIR/scripts/ux-capture" .toolbelt/ux/matrix.json \
  --project-root "$PWD" --out .toolbelt/ux/head/ --base-ref <BASE>
```

Use `--base-url` instead when the base is already served, or `--baseline` with the prototype ledger's absolute baseline path when present. With no base at all, review every still as `new` and record why. A shot not reached or a failed step is a finding; fix the matrix and retake it, never substitute another image. Exit 2 means capture did not run.

Run any token or palette check the policy names. A mechanical finding at `should` or above joins the review's findings, except on a reference-only `match-` pathway, whose mechanical results you ignore. A matching screen captured as a changed pathway gets no exception.

## 3. Review

Route one `reviewer` with specialty `ux` through agent-routing, on a vision-capable model. Send the capture's `brief.md`: its numbered images first, as `Image N: <tag>`, then criteria, findings, measurements, the request log, and the review file path. Add any unchanged capture a criterion needs, the design-reference path, and each task's `Layout:` from the plan, which says who uses the surface and what they decide there. When you captured a screen to match, send its stills beside the changed surface they match, and say whether that screen is a reference or is itself changed by this diff. Send each surface's whole-screen `<tag>.png` for each reviewed width before its target and detail crops; `brief.md` numbers only the crops, so add the whole-screen stills yourself. Keep each review to twelve images. Split a larger set by screen, then by groups of states and widths within a screen, give each batch its context images and the criteria it covers, and merge the batch verdicts into one before you return it. The reviewer reads `docs/REVIEW-GUIDANCE.md` when present and judges without driving the browser:

> Review the rendered screens for the task they serve. The criteria are a floor: report a clear usability or hierarchy defect even when no criterion names it. Keep the approved design direction and the required behavior, and leave your own style preferences out.
>
> Pass 1: mark each criterion met, not met, or not evidenced, citing the evidence.
>
> Pass 2: look at each whole screen first, then its crops, and answer for each surface. Can the reader find at once the facts this surface exists to give? Is anything said twice? Is a fact the reader needs for the decision shown as minor text? Do related facts and their actions sit together? Does anything collide, clip, or turn ambiguous at this width? When a matching screen or an approved mockup was sent, does the changed surface match its hierarchy, spacing, information order, and actions, apart from what the criteria explain?
>
> Return at most five findings per review, ranked by what they cost the user, one per cause. None is a valid answer. Each finding names a severity, the image and region, what you see, the consequence for the user, and what a fix has to achieve, with the component file when known. A blocker or a should is a defect a user would hit. A nit is a preference and never blocks. Use the supplied interaction results and measurements for behavior, contrast ratios, and tap sizes, because screenshots alone do not establish them. Mark a claim not evidenced when the evidence it needs is absent; missing evidence can block a criterion. Component imports belong to code review.
>
> Write the report to the review file. Reply with only the verdict, one line per blocker and should, the nit count, and the path.

Return that reply, with the head, to your caller.

## 4. Fixes and the re-check

The owning implementer fixes every blocker and should, and takes or declines each nit with a one-line reason. Retake the shots the fix touched with `--shot <pathway/step>` into a new folder, `.toolbelt/ux/head-2/` for the first fix and `.toolbelt/ux/head-3/` for the second, because the script refuses a folder that already holds a capture. Keep the earlier folders for the before images. Send the new brief to the same reviewer thread with each finding beside its before and after images, as separate images. The re-check answers only whether each finding is fixed and whether the fix broke a neighboring state; it opens no new review. Allow two fix rounds. A blocker or should still open after the second goes to your human partner with its images, at the severity the reviewer gave it.

Every capture binds to the head it was taken at. Carry a pathway's evidence to a new head only while its rendered dependencies and fixtures are unchanged, and record the source head; a shared style or token change touches every consuming pathway. A docs-only push carries everything forward. Report pathways covered separately from the screenshot count.
