---
name: ux-gate
description: "Use before final review of new user flows or material changes to interaction, layout, responsive behavior, or the facts a screen shows, or when UX review is explicitly requested. A typo fix or an isolated color or spacing adjustment does not trigger this review on its own."
---

# UX Gate

**Entry:** changed routes, the base..head range, approved acceptance criteria, the plan path, any prototype ledger path, the implementer's shot list path when there is one, and a running isolated environment. Judge the rendered effect, not the line count.
**Exit:** `Pass` bound to the reviewed head SHA, or `Changes Required` with component-level findings. The gate fixes nothing.

A gate runner routed as `errand` runs this skill and returns the verdict to its caller, which sends the review file to the owning implementer. Give every shell command a timeout of at most 10 minutes.

## 0. Preflight

The environment must serve the changed routes with queryable data. Without that, the gate cannot run and nothing may claim UX was verified.

## 1. Coverage

Start from the implementer's shot list when one is given, because it already names routes, targets, states, and fixtures. Pick the smallest set of pathways that covers the diff and every entry point and state in the acceptance criteria. Read `.toolbelt/ux-policy.md` when present for launch, auth, theme, data, viewports, exceptions, and design references; infer and record anything it leaves out. Read the `Reuses:` lines for this boundary's tasks in the plan, and read the prototype ledger's header when a ledger path was supplied, because they name any screen the changed surface has to match.

- Use the relevant breakpoints for changed markup, copy, or layout, or a single width when presentation cannot vary.
- Capture each changed surface as its whole screen once per width, and also in the narrowest container it appears in, such as a side panel. A viewport width is not a container width.
- Capture each surface in its tidy state and with the hardest data it can meet: the longest realistic text, and every notice that can appear together.
- Capture every supported theme for every changed surface.
- Reach the criteria's states, such as empty, loading, error, dense data, and overlays, using seeded data first, then the matrix's `setup`, and then a `fixtures` entry for what neither can produce, reusing an existing body. Never edit app source or write a hand-written browser script to reach a state.
- Check changed hover or focus, keyboard reach for changed interactions, and scrolling past the fold. Prove Tab reach with `press` and `expectFocus`, because a direct `focus` does not prove it. Use `capture: false` for assertion-only steps, and `motion: true` for changed motion.
- When the plan's `Reuses:` or the prototype ledger names a screen to match, capture that screen as its own pathway as described in [matrix.md](matrix.md). Give it whatever steps reach the matching state, such as opening a slide-out panel, at the same viewports and themes as the changed surface.
- Next, check whether the diff touches anything that decides what that matching screen renders, including components, styles, tokens, or shared code like a formatter, data hook, or fixture. Use the same dependency check Section 4 uses for carry-forward. If the diff changes any of those, treat the matching screen as a changed surface too: capture it under a plain pathway name, count its mechanical results, and have the reviewer review its stills as changed. If the diff changes none of them, treat the screen as a reference. Name its pathway with the `match-` prefix, send its stills to the reviewer as references, and ignore its mechanical results so a pre-existing issue on that screen never fails the gate.

Record why any dimension is omitted.

## 2. Capture

Read [matrix.md](matrix.md) and write `.toolbelt/ux/matrix.json`, extending the shot list. Capture only through the script, which guards every request, signs in using `.toolbelt/ux-capture.json`, and refuses any shot whose target it cannot reach. Set `UX_SKILL_DIR` to this skill's absolute directory and run from the project root:

```bash
"$UX_SKILL_DIR/scripts/ux-capture" .toolbelt/ux/matrix.json \
  --project-root "$PWD" --out .toolbelt/ux/head/ --base-ref <BASE>
```

Use `--base-url` instead when the base is already served, or `--baseline` with the prototype ledger's absolute baseline path when present. With no base at all, review every still as `new` and record why. A shot not reached or a failed step is a finding; fix the matrix and retake it, never substitute another image. Exit code 2 means capture did not run.

Run any token or palette check the policy names. Any mechanical finding at `should` or above joins the review's findings, except on a reference-only `match-` pathway, whose mechanical results you ignore. A matching screen captured as a changed pathway gets no exception.

## 3. Review

Route one `reviewer` with specialty `ux` through agent-routing on a vision-capable model. Send the capture's `brief.md` with its numbered images first, formatted as `Image N: <tag>`, followed by the acceptance criteria, findings, measurements, request log, and review file path.

Include any unchanged capture a criterion needs, the design-reference path, and each surface's focus, whether that is the changed component or the whole screen. Also include each task's `Layout:` from the plan, which explains who uses the surface and what they decide there. When you captured a screen to match, send its stills beside the changed surface they match, and state whether that screen is a reference or is itself changed by this diff. Because `brief.md` numbers only the crops, add each surface's whole-screen `<tag>.png` for every reviewed width before its target and detail crops.

Give one reviewer one changed page with all of its surfaces, states, and widths together so it can compare them. When the boundary changes several pages, dispatch one reviewer per page in the same turn, each with the criteria its page covers, and merge their verdicts into one before you return it. The reviewer follows [reviewer-prompt.md](reviewer-prompt.md), sent as its absolute path, and reads `docs/REVIEW-GUIDANCE.md` when present.

Return the verdict, along with the reviewed head, to your caller.

## 4. Fixes and the re-check

The owning implementer fixes every blocker and should, and takes or declines each nit with a one-line reason. Retake only the shots the fix touched using `--shot <pathway/step>` into a new folder, `.toolbelt/ux/head-2/` for the first fix and `.toolbelt/ux/head-3/` for the second, because the script refuses a folder that already holds a capture. Keep the earlier folders for the before images.

Send the new brief to the same reviewer thread with each finding beside its before and after images, sent as separate images. The re-check answers only whether each finding is fixed and whether the fix broke a neighboring state; it does not open a new review. Repeat while each re-check closes findings. If the implementer reports a blocker or should fixed and the reviewer still finds it open, take it to your human partner with its before and after images at the severity the reviewer gave it.

Every capture binds to the head it was taken at. Carry a pathway's evidence to a new head only while its rendered dependencies and fixtures remain unchanged, and record the source head; a shared style or token change touches every consuming pathway. A docs-only push carries everything forward. Report pathways covered separately from the screenshot count.
