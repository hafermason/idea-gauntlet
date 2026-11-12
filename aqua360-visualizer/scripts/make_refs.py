#!/usr/bin/env python3
"""Build refs/<slug>.png (top-down shell reference) for every shell that has a spec drawing.

Reads the site's own catalog (https://aqua360pools.com/data/fiberglass-shells.json), downloads each
model's FG-Pool-Specs drawing, crops the plan view (the first block of neutral-gray rows), and whites
out the navy dimension marks so no text leaks into renders.  Needs: pip install pillow numpy
"""
import io, json, sys, urllib.parse, urllib.request
from pathlib import Path
import numpy as np
from PIL import Image

SITE = 'https://aqua360pools.com'
OUT = Path(__file__).resolve().parent.parent / 'refs'

def get(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return r.read()

def plan_view(im):
    a = np.asarray(im.convert('RGB')).astype(int)
    mx, mn = a.max(2), a.min(2)
    gray = (mx - mn < 18) & (mx < 240)              # shell pixels: neutral gray, not white, not navy
    rows = np.where(gray.sum(1) > a.shape[1] * 0.05)[0]
    top = end = rows[0]
    for r in rows[1:]:                               # plan view = first run of rows, stop at a gap
        if r - end > 15: break
        end = r
    cols = np.where(gray[top:end + 1].sum(0) > (end - top) * 0.05)[0]
    x0, x1 = max(cols[0] - 12, 0), cols[-1] + 12
    c = a[max(top - 12, 0):end + 12, x0:x1].copy()
    blue = np.where((c[:, :, 2] - c[:, :, 0] > 25).any(0))[0]   # dimension arrows / labels
    if len(blue): c[:, max(blue.min() - 6, 0):, :] = 255
    crop = Image.fromarray(c.astype('uint8'))
    out = Image.new('RGB', (crop.width + 80, crop.height + 80), 'white'); out.paste(crop, (40, 40))
    return out

def main():
    OUT.mkdir(exist_ok=True)
    shells = json.loads(get(f'{SITE}/data/fiberglass-shells.json'))
    only = set(sys.argv[1:])
    for s in shells:
        if only and s['slug'] not in only: continue
        specs = [i for i in s['images'] if 'specs' in i.lower() or 'specification' in i.lower()]
        if not specs:
            print(f"{s['slug']}: no spec drawing on the site, skipped"); continue
        im = Image.open(io.BytesIO(get(SITE + urllib.parse.quote(specs[0]))))
        plan_view(im).save(OUT / f"{s['slug']}.png")
        print(f"{s['slug']}: ok")

if __name__ == '__main__':
    main()
