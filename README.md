# Idea Gauntlet

Four Claude skills that find business ideas that fit you and test each one fully
with the [Founder skill pack](https://github.com/Jakeschincariol/founder-skill).
Free, MIT.

The Founder pack tests one business. This sits on top of it: it comes up with the
ideas, tests several cheaply, takes the survivors through all eleven Founder
skills with points where a failing idea is stopped, and ranks what is left.

## Install

In Claude Code, install the Founder pack and then this:

```
/plugin marketplace add Jakeschincariol/founder-skill
/plugin install founder-skill@founder-skill
/plugin marketplace add hafermason/idea-gauntlet
/plugin install idea-gauntlet@idea-gauntlet
```

Needs Python 3.8 or newer. Nothing to pip install.

## The four

| command | what it does |
| --- | --- |
| `/idea-gauntlet:idea-scout` | Interviews you (skills, money, time, place, what you won't do), generates 8 to 12 specific ideas, scores them on fit and saves the keepers. |
| `/idea-gauntlet:idea-screen` | Runs each saved idea through the board vote and a quick 20-buyer panel, and lines them up so you can cut the list. |
| `/idea-gauntlet:idea-gauntlet` | Takes one idea through all eleven Founder skills in order, with three kill gates and a log you can resume from. |
| `/idea-gauntlet:idea-rank` | Reads every tested idea into one scoreboard and picks one. |

```
scout -> screen -> gauntlet (per survivor) -> rank
```

Already have an idea? Skip to `/idea-gauntlet:idea-gauntlet <your idea>`.

## The gates

1. **After the consumer panel.** Board all pass, or buy rate under 25%: one
   repair through pricing and offer, then drop or continue.
2. **After the CFO.** A unit loses money, year 1 loses money or break-even is
   over capacity: one repair, then drop or continue.
3. **After the launch plan.** No real-world test with a success line: go back
   and write one.

You make the call at every gate. Nothing is deleted when an idea is dropped.

## Several ideas in one folder

The Founder skills read and write a single `founder/` folder. `workspace.py`
keeps one idea there at a time and parks the rest in `ideas/<slug>/`:

```bash
python3 skills/idea-gauntlet/workspace.py status
python3 skills/idea-gauntlet/workspace.py new mobile-detailing
python3 skills/idea-gauntlet/workspace.py switch food-truck-books
```

It only renames folders and refuses to overwrite one.

```bash
python3 -m unittest discover -s tests -v
```

## Fine print

Everything the Founder pack says about its own results applies here: the consumer
panel is simulated buyers, not customers, and its buy rate is an upper bound; the
numbers are only as good as the inputs; none of it is financial, legal or tax
advice. This project is not affiliated with the Founder skill pack or its author.

## License

MIT.
