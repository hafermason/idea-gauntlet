#!/usr/bin/env python3
"""Keep several business ideas in one project.

The Founder skills read and write one folder, ./founder. This tool lets that
folder hold one idea at a time (the active one) and parks the others under
./ideas/<slug>/. It only renames folders; it never deletes or overwrites.

    python3 workspace.py status            # every idea, its stage and verdict
    python3 workspace.py new <slug>        # park the active idea, start an empty one
    python3 workspace.py switch <slug>     # park the active idea, bring <slug> back
    python3 workspace.py park              # park the active idea, leave none active
"""
import argparse
import json
import os
import re
import sys

ACTIVE = "founder"
PARKED = "ideas"
MARK = ".idea-slug"

# (file inside the idea folder, the Founder skill that writes it), in run order
STAGES = [
    ("board.md", "board"),
    ("competitors.md", "competitors"),
    (os.path.join("panel", "results.md"), "consumer"),
    ("pricing.md", "pricing"),
    ("offer.md", "offer"),
    ("cfo.md", "cfo"),
    ("marketing.md", "marketing"),
    ("brand.md", "brand"),
    ("ops.md", "ops"),
    ("launch.md", "launch"),
    ("business-plan.md", "plan"),
]


def die(msg):
    print("error: " + msg, file=sys.stderr)
    sys.exit(1)


def check_slug(slug):
    if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", slug):
        die("slug must be lowercase letters, digits and hyphens, e.g. mobile-detailing")
    return slug


def active_slug(root):
    try:
        with open(os.path.join(root, ACTIVE, MARK)) as f:
            return f.read().strip() or None
    except OSError:
        return None


def park(root):
    """Move ./founder to ./ideas/<slug>/. Returns the slug, or None if nothing was active."""
    src = os.path.join(root, ACTIVE)
    if not os.path.isdir(src):
        return None
    slug = active_slug(root)
    if not slug:
        die("./%s exists but has no %s file, so it has no name. Name it first:\n"
            "  echo <slug> > %s/%s" % (ACTIVE, MARK, ACTIVE, MARK))
    dst = os.path.join(root, PARKED, slug)
    if os.path.exists(dst):
        die("%s already exists; refusing to overwrite it" % dst)
    os.makedirs(os.path.join(root, PARKED), exist_ok=True)
    os.rename(src, dst)
    return slug


def new(root, slug):
    check_slug(slug)
    if slug == active_slug(root) or os.path.exists(os.path.join(root, PARKED, slug)):
        die("an idea called %s already exists" % slug)
    park(root)
    os.makedirs(os.path.join(root, ACTIVE))
    with open(os.path.join(root, ACTIVE, MARK), "w") as f:
        f.write(slug + "\n")


def switch(root, slug):
    check_slug(slug)
    if slug == active_slug(root):
        return
    src = os.path.join(root, PARKED, slug)
    if not os.path.isdir(src):
        die("no parked idea called %s" % slug)
    park(root)
    os.rename(src, os.path.join(root, ACTIVE))


def describe(folder):
    """What the files in one idea folder say about how far it got."""
    done = [name for path, name in STAGES if os.path.isfile(os.path.join(folder, path))]
    verdict = None
    try:
        with open(os.path.join(folder, "business-plan.md")) as f:
            for line in f:
                m = re.search(r"verdict\W+\s*(Profitable|Not yet|Incomplete)", line, re.I)
                if m:
                    verdict = m.group(1)
                    break
    except OSError:
        pass
    status = None
    try:
        with open(os.path.join(folder, "gauntlet.md")) as f:
            for line in f:
                m = re.match(r"\s*Status:\s*(.+)", line)
                if m:
                    status = m.group(1).strip()
    except OSError:
        pass
    return {"stages_done": done, "last_stage": done[-1] if done else None,
            "verdict": verdict, "status": status,
            "has_idea": os.path.isfile(os.path.join(folder, "idea.md"))}


def status(root):
    rows = []
    cur = active_slug(root)
    if os.path.isdir(os.path.join(root, ACTIVE)):
        row = describe(os.path.join(root, ACTIVE))
        row.update(slug=cur or "(unnamed)", active=True)
        rows.append(row)
    parked = os.path.join(root, PARKED)
    if os.path.isdir(parked):
        for slug in sorted(os.listdir(parked)):
            folder = os.path.join(parked, slug)
            if os.path.isdir(folder) and not slug.startswith("."):
                row = describe(folder)
                row.update(slug=slug, active=False)
                rows.append(row)
    return rows


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--root", default=".", help="the project folder (default: here)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("status")
    s.add_argument("--json", action="store_true")
    sub.add_parser("new").add_argument("slug")
    sub.add_parser("switch").add_argument("slug")
    sub.add_parser("park")
    a = ap.parse_args(argv)

    if a.cmd == "new":
        new(a.root, a.slug)
        print("Active idea: %s (empty ./%s)" % (a.slug, ACTIVE))
    elif a.cmd == "switch":
        switch(a.root, a.slug)
        print("Active idea: %s" % a.slug)
    elif a.cmd == "park":
        slug = park(a.root)
        print("Parked %s" % slug if slug else "Nothing active")
    else:
        rows = status(a.root)
        if a.json:
            print(json.dumps(rows, indent=2))
        elif not rows:
            print("No ideas yet.")
        else:
            for r in rows:
                print("%s %-28s %2d/%d  last: %-11s verdict: %-10s %s" % (
                    "*" if r["active"] else " ", r["slug"], len(r["stages_done"]), len(STAGES),
                    r["last_stage"] or "-", r["verdict"] or "-", r["status"] or ""))


if __name__ == "__main__":
    main()
