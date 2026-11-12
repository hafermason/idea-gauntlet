import sharp from 'sharp';
import { footprint } from './geometry.mjs';

export const MIN_LONG_SIDE = 1000, MAX_LONG_SIDE = 2048;
export const TOO_SMALL_MSG = 'This photo is too small for a good picture. Please use a photo at least 1000 pixels on the long side, such as one taken straight from your phone camera.';

// Validate + normalize an uploaded photo: reject non-images and small photos,
// apply EXIF orientation, downscale to 2048 px, and drop all metadata (incl. GPS).
export async function normalizePhoto(buf, { allowSmall = false } = {}) {
  let meta;
  try { meta = await sharp(buf).metadata(); } catch { return { ok: false, reason: 'not_image', message: 'That file is not a photo. Please upload a JPG, PNG or HEIC image.' }; }
  if (!['jpeg', 'png', 'webp', 'heif'].includes(meta.format)) return { ok: false, reason: 'not_image', message: 'That file is not a photo. Please upload a JPG, PNG or HEIC image.' };
  const swap = (meta.orientation ?? 1) >= 5;
  const w = swap ? meta.height : meta.width, h = swap ? meta.width : meta.height;
  if (Math.max(w, h) < MIN_LONG_SIDE && !allowSmall) return { ok: false, reason: 'too_small', message: TOO_SMALL_MSG, width: w, height: h };
  const out = await sharp(buf).rotate().resize({ width: MAX_LONG_SIDE, height: MAX_LONG_SIDE, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90 }).toBuffer({ resolveWithObject: true }); // sharp writes no EXIF unless asked
  return { ok: true, buffer: out.data, width: out.info.width, height: out.info.height };
}

// The "marked box": pool outline (solid) and deck ring (dashed) drawn on a copy of the photo.
export async function drawMarkedBox(photo, width, height, placement, shell) {
  const { pool, deck, widthPct } = footprint(placement, shell, width, height);
  const pts = q => q.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ');
  const sw = Math.max(3, Math.round(width / 300));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <polygon points="${pts(deck)}" fill="none" stroke="#FF00FF" stroke-width="${sw}" stroke-dasharray="${sw * 4},${sw * 3}"/>
    <polygon points="${pts(pool)}" fill="rgba(255,0,255,0.12)" stroke="#FF00FF" stroke-width="${sw}"/>
  </svg>`;
  const marked = await sharp(photo).composite([{ input: Buffer.from(svg) }]).jpeg({ quality: 90 }).toBuffer();
  return { marked, widthPct, deck };
}

// Edit mask for providers that support one (OpenAI): opaque everywhere except the deck area,
// grown by `growPct` of the photo width so coping and shadows have room. PNG, same size as the photo.
export async function editMask(width, height, deck, growPct = 3) {
  const cx = deck.reduce((a, p) => a + p[0], 0) / 4, cy = deck.reduce((a, p) => a + p[1], 0) / 4;
  const g = width * growPct / 100;
  const grown = deck.map(([x, y]) => { const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1; return [x + dx / d * g, y + dy / d * g]; });
  const hole = grown.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') + ' Z';
  // white everywhere, deck area cut out (evenodd) so it is fully transparent = editable
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><path fill="#fff" fill-rule="evenodd" d="M0,0 H${width} V${height} H0 Z ${hole}"/></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}
