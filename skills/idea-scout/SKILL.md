---
name: idea-scout
description: >-
  Generates business ideas that fit the person, not a generic list. Interviews the
  user about their skills, money, time, location and what they refuse to do, then
  produces 8 to 12 candidate businesses, each with a specific customer, product and
  price, scores them on fit, and saves the best as idea files ready for the Founder
  skill pack to test. Use when the user says "give me business ideas", "what
  business should I start", "I want to start something but don't know what",
  "side hustle ideas", "find me an idea", or starts the idea gauntlet with no idea
  in mind.
argument-hint: "[a theme, industry or constraint, or leave blank]"
---

# idea-scout

Most idea lists are useless because they ignore who is asking. This skill starts
with the founder and only then looks for businesses.

## Step 1: the founder profile

Read `ideas/founder-profile.md` if it exists and confirm it is still right.
Otherwise ask, in one message, at most five questions:

1. What are you good at, and what have people paid you (or an employer) for?
2. How much money can you put in and afford to lose, and how many hours a week?
3. Where are you, and does it need to be local, online or either?
4. How soon does it need to pay you, and how much a month would make it worth it?
5. What will you not do (sell door to door, manage staff, hold inventory...)?

Write the answers to `ideas/founder-profile.md` in the user's words. Do not fill a
blank with a guess; write "not said".

## Step 2: generate candidates

Produce 8 to 12 ideas. Each must come from at least one of these, and say which:

- **Unfair advantage**: a skill, licence, network or asset in the profile.
- **Known pain**: a problem the user has seen customers or employers pay to fix.
- **Unbundle**: one slice of a bigger business, done better for one kind of buyer.
- **Underserved place or group**: something that exists elsewhere but not here, or
  not for them.

If the user gave a theme in the arguments, stay inside it. Every idea needs a
specific customer, a specific product and a price. "An app for small businesses"
is not an idea; "weekly bookkeeping for food trucks in Tulsa at $180 a month" is.
Drop anything that breaks a constraint in the profile.

You may search the web to check that the customer exists and what similar things
cost. Link what you find. Do not invent market sizes, competitors or demand.

## Step 3: score on fit only

Score each idea 1 to 5 on four things the profile can answer:

| score | question |
| --- | --- |
| Fit | does the founder already have the skills and access? |
| Money | can it start inside the stated budget? |
| Speed | can it take a first paying customer inside the stated time? |
| Ceiling | could it reach the monthly income the founder said makes it worth it? |

This is a fit score, not a verdict on the market. Say so. Whether anyone buys is
what the testing is for.

Write `ideas/shortlist.md`: a table of every idea with its source, the four
scores and one line on the biggest unknown, sorted by total.

## Step 4: save the ones worth testing

Ask the user which to keep (suggest the top three to five). For each one, run:

```bash
python3 "${CLAUDE_SKILL_DIR}/../idea-gauntlet/workspace.py" new <slug>
```

then write `founder/idea.md` in the shape the Founder pack expects:

```markdown
# <working name>

- What it is: one sentence.
- Who it is for: the target customer, as specific as possible.
- What it sells, at what price: the core product and its price.
- Where and how: city or online, how customers find it, how it is delivered.
- Budget and constraints: from the founder profile.
```

Only one idea is in `founder/` at a time; the tool parks the others in
`ideas/<slug>/`.

## Output

`ideas/founder-profile.md`, `ideas/shortlist.md`, one saved idea per keeper. Next:
`/idea-screen` to cut the list cheaply, or `/idea-gauntlet <slug>` to test one in
full.
