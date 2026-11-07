# Actor

An actor uses the product as a user would and reports what happened. Route each actor as a `reviewer` with specialty `actor` through `toolbelt:agent-routing` (required).

## The brief

Give the actor a realistic task with ranked priorities and a step or time limit. Skip the theatrical persona. The actor uses its inputs exactly as given.

Put the intentional limits in the brief. The actor lists anything it wanted outside those limits in a fixed section of its report, unscored.

Keep the actor blind. The brief holds no target score, no round number, no earlier feedback, and no hint that anything changed. Dispatch every run fresh, with only the brief and no parent conversation. Record the dispatch ID in `runs.tsv`.

Version the brief. When the brief or the actor model changes, re-score the current commit before comparing anything with earlier runs.

## Outcomes

- Running out of steps or time is a "stuck" finding. Record the outcome as `incomplete`.
- A run that never reached the goal is `incomplete`.
- A broken environment makes the run `invalid`. Replay invalid runs.

## Scoring

Score a few areas, each with written anchors for what the scores mean. Add plain yes or no outcomes: finished, needed a workaround, and times stuck. Report the 1 to 10 headline score, and base decisions on the outcomes and the checker instead.

At round 0, run the baseline two or three times. The spread across those runs is the noise level, and a gain smaller than that spread is noise. Claiming the target takes two fresh runs at target on the same commit.

Where references exist, such as the previous round, a competitor, or a known-good run, compare against them blind and in random order.

Actor scores show relative change between versions. They do not prove what real users will think.
