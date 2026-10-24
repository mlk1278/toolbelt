---
name: quorum
description: Get independent proposals from models you pick, then fold the best parts into one proposal.
disable-model-invocation: true
---

# Quorum

Your human partner started this skill themselves, with `/quorum`. They name a feature to add or an area to improve. Several models each write their own proposal for it, without seeing each other's work. You then take the best parts of each proposal, fold them into one, and talk it through with your human partner.

A quorum proposal is an opinionated view of what to add, remove, or improve. It is not an implementation plan, and it does not need file paths or line-by-line code steps. Those come later, from the spec and the plan.

<ENTRY-GATE>
Dispatch nothing until your human partner has confirmed which models write, at what effort, and the problem the writers share. Only they can change that lineup. A dispatch to the wrong model spends real money on a proposal nobody asked for.
</ENTRY-GATE>

## Settle the brief

Ask your human partner these, one question at a time, and skip any their message already answers.

1. Ask what the proposals should cover: the problem in their words, and what a good outcome looks like.
2. Ask which models should write, and at what effort. List the models you can launch from this harness, and what AGX adds, before asking.
3. Ask whether one more model should review the folded proposal before they see it.

Play the lineup and the brief back in a few lines, and wait for them to confirm. If a model they name cannot be launched from this harness, say so and ask what to use instead. Do not substitute a model on your own.

## Brief each writer

Your human partner's lineup is the route. Launch each writer the way `toolbelt:agent-routing` maps a model to an agent.

Send every writer the same brief, and run them at the same time. Keep the drafts apart. A writer who reads another draft first tends to agree with it, and the second opinion is the point of a quorum.

The brief tells each writer to:

- State a strong view of what to add, remove, or improve, and say why in plain terms a person using the product would care about. Then say which ideas you would do first, and why.
- Put ideas in freely. There are no bad ideas at this stage, and boiling the ocean is allowed.
- Look before writing. Read the relevant parts of this codebase first. Where the topic calls for it, also look at what competing products do, what people say they like and dislike about them, and what people keep asking for that no product gives them yet. If you can dispatch subagents, route codebase and web searches through `toolbelt:agent-routing`, which is required for any dispatch: send a narrow question to `lookup`, and a wide one to `explorer`. Otherwise, do the searches yourself.
- Name the sources behind a claim about competitors or users, so a reader can check it.
- Write the proposal as a short document a person can read in one sitting, in this order: the view in one paragraph, then what to add, what to remove, and what to improve, then sources. Leave out implementation steps.
- Return the proposal to the orchestrator. Do not write to the repository.

Save each draft as it arrives under `.toolbelt/quorum/<date>-<topic>/`, one file per writer, named for its model. Save the folded proposal beside them as `proposal.md`. Drafts kept only in your context are lost when the conversation is compacted, and your human partner cannot open one to read it.

## Fold the drafts into one proposal

Read every draft. Build one proposal from the best parts of each, keeping the reasoning that made those parts good. Keep each idea you keep at the strength its writer argued for. Where the writers disagree, say what each side argues and which side you would take. Where you cut an idea, say why in one line.

If your human partner picked a reviewer model, send it the folded proposal and the original drafts. Ask it to look for weak reasoning, missing ideas, and claims with no source. Fix what it finds, or say why you kept the text as it was.

Present the folded proposal to your human partner and talk it through with them. Revise it where they push back. If they want another round with different models or a narrower problem, start again from "Settle the brief".

## Hand off

Once your human partner approves the folded proposal, invoke `toolbelt:brainstorming` with it as the starting brief. If they want to keep the proposal without building it, save it and stop. Do NOT invoke any other skill.
