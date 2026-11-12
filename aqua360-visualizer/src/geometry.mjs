// Pool footprint in photo pixels, matching the prototype's CSS:
//   perspective(900px) rotateX(tilt) rotateZ(rot), on a ~600px-wide stage,
//   pool length px = stageWidth * size/100 * len/23.5
// Returns the four corners of the pool and of the deck ring (4 ft wider each side).
const STAGE = 600, PERSP = 900, REF_LEN = 23.5;

export function footprint({ x, y, size, rot, tilt }, shell, imgW, imgH, deckFt = 4) {
  const k = imgW / STAGE;                        // prototype px -> photo px
  const ftPx = (STAGE * size / 100 / REF_LEN) * k; // pixels per foot on the ground plane (before perspective)
  const cx = imgW * x / 100, cy = imgH * y / 100, d = PERSP * k;
  const r = rot * Math.PI / 180, t = tilt * Math.PI / 180;
  const quad = (L, W) => [[-L / 2, -W / 2], [L / 2, -W / 2], [L / 2, W / 2], [-L / 2, W / 2]].map(([px, py]) => {
    const X = px * Math.cos(r) - py * Math.sin(r), Y = px * Math.sin(r) + py * Math.cos(r); // rotateZ
    const Y2 = Y * Math.cos(t), Z = Y * Math.sin(t);                                        // rotateX
    const s = d / (d - Z);                                                                   // perspective
    return [cx + X * s, cy + Y2 * s];
  });
  const L = shell.length_ft * ftPx, W = shell.width_ft * ftPx, D = deckFt * ftPx;
  const pool = quad(L, W), deck = quad(L + 2 * D, W + 2 * D);
  const xs = pool.map(p => p[0]);
  return { pool, deck, widthPct: Math.round((Math.max(...xs) - Math.min(...xs)) / imgW * 100) };
}
