---
name: idea-screen
description: >-
  The cheap first cut. Runs every saved business idea through the two fastest
  Founder skills, the board vote and a quick 20-buyer consumer panel, then lines
  the results up so the user can drop the weak ideas before spending a full test
  on them. Use when the user says "which of these ideas is best", "screen my
  ideas", "narrow these down", "quick test all of them", or after idea-scout
  saved more than one idea.
argument-hint: "[slugs to screen, or leave blank for all untested ideas]"
---

# idea-screen

A full test of one idea is eleven steps and a hundred buyer agents. Do not spend
that on five ideas. Spend a board meeting and twenty buyers on each, then pick.

## Step 0: check the Founder pack is installed

This skill drives the Founder skill pack. Its skills appear as
`/founder-skill:founder-board` (installed as a plugin) or `/founder-board`
(copied into the skills folder). If neither is available, stop and tell the user
to run:

```
/plugin marketplace add Jakeschincariol/founder-skill
/plugin install founder-skill@founder-skill
```

## Step 1: list what to screen

```bash
python3 "${CLAUDE_SKILL_DIR}/../idea-gauntlet/workspace.py" status
```

Screen the slugs in the arguments, or every idea with no board result yet. Tell
the user how many ideas that is and that each costs one board meeting (three
sub-agents) and twenty buyer agents, before starting. More than five: ask which
five.

## Step 2: for each idea

1. `python3 "${CLAUDE_SKILL_DIR}/../idea-gauntlet/workspace.py" switch <slug>`
2. Run the **founder-board** skill on `founder/idea.md`.
3. Run the **founder-consumer** skill with `--quick`. Use the same `--seed` for
   every idea so the panels are dealt the same way.
4. Append to `founder/gauntlet.md`:
   `Status: screened` plus the vote and the buy rate.

Follow each Founder skill's own instructions exactly. In particular the consumer
skill has the user confirm the target customer before dealing; do not skip that,
and never answer for a buyer or for a board member yourself.

## Step 3: line them up

Write `ideas/screen.md`: one row per idea with the board vote (fund / fund if /
pass, per member), the quick-panel buy rate, the top objection in the buyers'
words, and the board's main kill risk. Take every value from the files the
Founder skills wrote; a missing value is written as "missing", never estimated.

Then recommend which one or two go to the full gauntlet and which to drop, with
the reason in one line each. The user decides. For a dropped idea, switch to it
and append `Status: dropped at screen` and the reason to its `founder/gauntlet.md`.
Nothing is deleted.

## Reading the numbers

A twenty-buyer simulated panel is noisy and leans agreeable. Treat the buy rate
as an upper bound and a tie-breaker between ideas, not as a forecast. A gap of a
few points between two ideas means nothing.

## Output

`ideas/screen.md`. Next: `/idea-gauntlet <slug>` on the survivors.
