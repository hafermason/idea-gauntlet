# Aqua360 visualizer: Phase 1 render test

Script-only test of render quality, as the brief requires before any app work.

## Status (2026-11-12)

| Piece | State |
|---|---|
| Photo checks, marked box, prompt, scoring sheet | Working (dry run verified) |
| Shell references | All 18 models with a spec drawing on the site: `python3 scripts/make_refs.py` |
| Catalog sizes and depths | 18 of 20 read from the site's spec drawings. Tradition and Virtuous have no drawing: ask Ben |
| OpenAI (`gpt-image-2`) | Wired and reaching the API. **Blocked: account has no credits** |
| Gemini (`gemini-3-pro-image`, `gemini-3.1-flash-image`) | Wired via Google's OpenAI-compatible endpoint. **Blocked: free tier allows 0 image calls; enable billing** |
| Test photos | Bundled copies are 365-638 px. Run with `--allow-small` until the originals arrive |

## Run

```bash
npm install
python3 scripts/make_refs.py               # downloads + crops shell references into refs/
npm run phase1:dry                         # marked boxes + prompts only, no API calls
npm run phase1 -- --allow-small            # full matrix: 4 yards x 3 shells x providers
```

`npm run phase1` sets `NODE_USE_ENV_PROXY=1` and placeholder keys, because in the Claude cloud
environment the keys live in the network proxy, not in env vars. Elsewhere, set `OPENAI_API_KEY`
and `GEMINI_API_KEY` yourself.

Then open `out/<run>/sheet.html`, tick the five criteria per render, and download the scores CSV.

Flags: `--providers openai,gemini-pro,gemini-flash`, `--yards yard1,yard3`, `--shells enl814`,
`--allow-small`, `--no-ref`. A provider is skipped for the rest of the run after a billing error.

## Inputs

- `yards/yard1-5.jpg`: test backyards (not committed). yard5 exists to test the "too small" message.
- `refs/<slug>.png`: built by `make_refs.py` from the live site (not committed: Liberty's images).

## Layout (reused by Phase 2)

- `catalog/*.csv`: shells and options; these become the `catalog_models` / `catalog_options` tables.
- `src/photo.mjs`: upload validation (non-image, under 1000 px), downscale to 2048 px, EXIF strip, marked box.
- `src/geometry.mjs`: placement (x, y, size, turn, **tilt**) -> pool and deck corners, same math as the prototype.
- `src/prompt.mjs`: the brief's prompt template.
- `src/providers.mjs`: `render(provider, {prompt, images})`, one function per provider so it can be swapped.
  Model IDs and $/token prices come from env vars (see the file).

## Findings for the brief

- The live site is static files on Netlify, so the visualizer should be its own Next.js app on Vercel
  (subdomain such as `design.aqua360pools.com`, or a Netlify proxy rewrite for a subpath).
- Pass bar: yard5 is excluded, so the matrix is 12 renders per model, not 15.
- The prototype's size slider is scaled to a 23.5 ft pool; the prompt now states the pool's real
  on-screen width instead of the raw slider value.
- `POST /api/render` must also receive `tilt`, or the server cannot draw the box in perspective.
- The site's Anthem images are all named "providence-14"; worth checking they show the right shell.
