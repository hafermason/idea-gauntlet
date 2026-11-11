---
name: idea-gauntlet
description: >-
  Tests one business idea fully. Runs it through all eleven Founder skills in
  order (board, competitors, consumer panel, pricing, offer, CFO, marketing,
  brand, operations, launch, business plan), stopping at three kill gates where a
  failing idea is fixed once or dropped before more is spent on it, and keeps a
  log so a run can be resumed. Use when the user says "test this idea fully",
  "run the gauntlet", "take this idea all the way", "full validation", "run the
  whole founder pack on this", or picks a survivor from idea-screen.
argument-hint: "<idea slug, or the idea in a sentence> [--from <stage>]"
---

# idea-gauntlet

One idea, start to finish, with the right to stop. The Founder pack does the
testing; this skill is the conductor: it runs the stages in order, checks the
gates and writes down what happened.

## Step 0: set up

The Founder skills appear as `/founder-skill:founder-<name>` (plugin) or
`/founder-<name>` (copied). If they are not available, stop and tell the user:

```
/plugin marketplace add Jakeschincariol/founder-skill
/plugin install founder-skill@founder-skill
```

Make the idea active:

```bash
python3 "${CLAUDE_SKILL_DIR}/workspace.py" status
python3 "${CLAUDE_SKILL_DIR}/workspace.py" switch <slug>     # an idea saved earlier
python3 "${CLAUDE_SKILL_DIR}/workspace.py" new <slug>        # a new idea from the arguments
```

If a `founder/` folder exists with no `.idea-slug` file, it is work from before
this plugin: ask the user for a name and write it to `founder/.idea-slug`. Never
delete or overwrite a `founder/` folder.

Read `founder/gauntlet.md` if it exists and resume after the last finished stage
(or from `--from`). Otherwise start it:

```markdown
# Gauntlet: <idea name>

Status: running

| stage | result | date |
| --- | --- | --- |
```

Tell the user up front what a full run involves: eleven stages, a 100-buyer
panel, and three points where you will stop and ask.

## Step 1: run the stages

Run each Founder skill in this order. After each one, add a row to the log with
its one-line result, taken from the file that skill wrote.

```
board -> competitors -> consumer -> [gate 1] -> pricing -> offer -> cfo -> [gate 2]
      -> marketing -> brand -> ops -> launch -> [gate 3] -> plan
```

Follow every Founder skill's own instructions as written. Where one asks the user
something (the target customer, real costs, rent, wages), ask it; do not answer
on the user's behalf to keep the run moving. If a stage was already done in
`/idea-screen`, reuse the board result, but run the consumer panel again at full
size.

## The gates

At each gate, show the numbers, give a recommendation and let the user decide.

**Gate 1, after the consumer panel: does anyone want it?**
Fail if all three board members voted pass, or the panel buy rate is under 25%
(the bar founder-plan uses). On a fail, offer one repair: run pricing and offer,
which re-tests on a quick panel. If the buy rate is still under the bar, recommend
dropping.

**Gate 2, after the CFO: does it make money?**
Fail if a unit loses money before fixed costs, year 1 shows an operating loss, or
break-even is above capacity. On a fail, offer one repair: back to pricing or
offer with the CFO's numbers, then re-run the CFO. Do not adjust the inputs until
the result passes; a changed number needs a reason the user agrees with, written
in the log.

**Gate 3, after launch: is the real-world test defined?**
The launch skill starts with a cheap real test and a success line. If that line
is not written down, go back and write it. Simulated buyers are not customers;
the plan is not finished without a way to check it against real ones.

A dropped idea gets `Status: dropped at <gate>` and the reason in the log. Its
files stay where they are.

## Step 2: finish

Run **founder-plan**. Its verdict is computed from the numbers: Profitable, Not
yet or Incomplete. Report that verdict as it is; do not soften or upgrade it.

Set the log's last line to `Status: finished, <verdict>` and tell the user:

- the verdict and the checks that passed and failed,
- the single biggest risk the board named that is still open,
- the real-world test from the launch plan and its success line,
- where the plan is: `founder/business-plan.md` and `founder/one-pager.md`.

## Rules

- Never invent a result for a stage that did not run, a buyer, a competitor or a
  cost. Missing is reported as missing.
- One repair attempt per gate, then the user chooses: drop, continue anyway, or
  rethink the idea. Record the choice.
- Not financial, legal or tax advice. The Founder pack's own caveats apply to
  everything it produces.

## Output

`founder/gauntlet.md` plus everything the Founder skills write. Next:
`/idea-rank` to compare against other ideas, or the real-world test.
