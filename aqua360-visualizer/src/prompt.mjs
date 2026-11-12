import { shell as getShell, option } from './catalog.mjs';

// The brief's prompt template, ported from prototype/index.html result().
// size_pct is the pool's actual on-screen width (from geometry), not the raw slider value:
// the prototype's slider is scaled to a 23.5 ft pool, so the raw value overstates small shells.
export function buildPrompt({ shellId, colorId, deckId, addonIds = [], placement, widthPct }) {
  const s = getShell(shellId), c = option(colorId), d = option(deckId);
  const size = s.size_label ? `, ${s.size_label.replace(/ x /g, ' by ')}` : '';
  return [
    `Edit the attached backyard photo. Add one inground fiberglass pool: Liberty ${s.name}${size}, rectangular, ${c.name} shell finish.`,
    `Place it inside the marked box: center at ${Math.round(placement.x)}% from the left and ${Math.round(placement.y)}% from the top, about ${widthPct}% of the photo width, long side turned ${placement.rot} degrees.`,
    `Surround it with about 4 feet of ${d.name.toLowerCase()} decking and light coping.`,
    `In the marked copy, the solid magenta outline is the exact edge of the pool water and the dashed outline is the outer edge of the decking. Match both outlines in size and position; do not make the pool or deck larger. Do not draw the magenta lines in the result.`,
    ...addonIds.map(id => option(id).prompt_sentence),
    `Use the attached shell reference image for the exact shape, steps and benches.`,
    `Match the photo's camera angle, lens distortion, lighting and shadows. Keep the house, fence, trees, sky and everything outside the box unchanged. Photorealistic, no people, no text.`,
  ].join('\n');
}
