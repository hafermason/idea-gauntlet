---
name: idea-rank
description: >-
  Compares every business idea tested so far, side by side. Reads what the
  Founder skill pack wrote for each idea (board vote, buy rate, margin,
  break-even, cash needed, plan verdict) and how far each got in the gauntlet,
  then ranks them and says which one to pursue and what to do this week. Use when
  the user says "which idea should I pick", "compare my ideas", "rank them",
  "what's the best one", "scoreboard", or after more than one gauntlet run.
argument-hint: "[what matters most: profit, low cash, speed, or leave blank]"
---

# idea-rank

The point of testing several ideas is to choose one. This skill puts the evidence
in one table and makes the call.

## Step 1: gather

```bash
python3 "${CLAUDE_SKILL_DIR}/../idea-gauntlet/workspace.py" status --json
```

lists every idea, the stages it finished, its plan verdict and its gauntlet
status. The active idea is in `founder/`; the others are in `ideas/<slug>/` with
the same files. For each idea read, where they exist: `board.md`,
`panel/results.md`, `pricing.md`, `cfo.md`, `business-plan.md`, `gauntlet.md`.

Read only. Do not switch the active idea and do not re-run any test here.

## Step 2: the scoreboard

Write `ideas/scoreboard.md`, one row per idea:

| column | from |
| --- | --- |
| Stage reached, and status | the status tool, `gauntlet.md` |
| Board vote | `board.md` |
| Buy rate, and panel size | `panel/results.md` |
| Price | `pricing.md`, else `idea.md` |
| Profit margin at plan, break-even, cash needed, payback | `cfo.md` |
| Verdict | `business-plan.md` |
| Fit score | `ideas/shortlist.md` |

Copy values as written. A stage that did not run is "not tested", never a guess.
Mark any buy rate that came from a 20-buyer quick panel, since it is not
comparable with a 100-buyer one.

## Step 3: rank

Order them by this, unless the user's argument says what matters most:

1. Verdict: Profitable, then Not yet, then Incomplete, then dropped.
2. Among equals: cash needed against the budget in `ideas/founder-profile.md`,
   then payback time, then fit score.

An idea tested less cannot rank above one tested more on the strength of numbers
it does not have. If the top two were tested to different depths, say so and
recommend finishing the shallower one before deciding.

## Step 4: the call

Tell the user, in a few lines: the pick and why, the runner-up and what would
make it win instead, what was dropped and where, and one thing to do this week,
which should be the real-world test from the pick's `launch.md`.

If nothing reached Profitable, say that plainly. Offer `/idea-scout` for a new
batch, using what the panels and boards rejected as constraints.

## Output

`ideas/scoreboard.md`.
