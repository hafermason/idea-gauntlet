#!/usr/bin/env node
// Phase 1 render-quality test. No UI.
//   node scripts/phase1.mjs [--providers openai,gemini-pro] [--yards yard1,yard2] [--shells enl814,com1223,sta1337]
//                           [--allow-small] [--no-ref] [--dry-run]
// Inputs : yards/<id>.jpg, refs/<shell slug>.(png|jpg)  (top-down gray shell render from the site)
// Output : out/<run>/  photo, marked copy, render per case, results.json, results.csv, sheet.html
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { shell as getShell } from '../src/catalog.mjs';
import { buildPrompt } from '../src/prompt.mjs';
import { normalizePhoto, drawMarkedBox } from '../src/photo.mjs';
import { render, PROVIDERS, keyFor } from '../src/providers.mjs';
import { writeSheet } from './sheet.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : process.argv[i + 1]; };
const flag = k => process.argv.includes(`--${k}`);
const ROOT = new URL('..', import.meta.url).pathname;

// Default placements and the prototype's design picks (prototype/index.html YARDS).
const YARDS = {
  yard1: { name: 'Fenced lawn, wide angle', p: { x: 50, y: 66, size: 46, rot: -14, tilt: 66 } },
  yard2: { name: 'Narrow side yard', p: { x: 56, y: 58, size: 44, rot: 78, tilt: 64 } },
  yard3: { name: 'Flat square lot', p: { x: 50, y: 72, size: 54, rot: 0, tilt: 68 } },
  yard4: { name: 'Landscaped, slight slope', p: { x: 46, y: 70, size: 44, rot: -8, tilt: 71 } },
  yard5: { name: 'Open lawn, low resolution', p: { x: 55, y: 76, size: 46, rot: 0, tilt: 73 } },
};
const DESIGN = { colorId: 'ocean', deckId: 'travertine', addonIds: [] };

const providers = arg('providers', 'openai,gemini-pro').split(',');
const yards = arg('yards', 'yard1,yard2,yard3,yard4,yard5').split(',');
const shells = arg('shells', 'enl814,com1223,sta1337').split(',');
const dry = flag('dry-run');
for (const p of providers) {
  if (!PROVIDERS[p]) throw new Error(`unknown provider ${p}; choose from ${Object.keys(PROVIDERS)}`);
  if (!dry && !process.env[keyFor(p)]) throw new Error(`${keyFor(p)} is not set (needed for ${p}); use --dry-run to build inputs only`);
}

const run = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outDir = join(ROOT, 'out', run); mkdirSync(outDir, { recursive: true });
const findRef = slug => ['png', 'jpg', 'webp'].map(e => join(ROOT, 'refs', `${slug}.${e}`)).find(existsSync);
const results = [];
const jobs = [];
const dead = {}; // provider -> reason, after a billing/quota error

for (const y of yards) {
  const photo = await normalizePhoto(readFileSync(join(ROOT, 'yards', `${y}.jpg`)), { allowSmall: flag('allow-small') });
  if (!photo.ok) {
    console.log(`${y}: rejected (${photo.reason}${photo.width ? `, ${photo.width}x${photo.height}` : ''}) -> "${photo.message}"`);
    results.push({ yard: y, status: 'rejected', reason: photo.reason, message: photo.message });
    continue;
  }
  writeFileSync(join(outDir, `${y}.photo.jpg`), photo.buffer);
  for (const sid of shells) {
    const s = getShell(sid);
    if (!s.length_ft) { console.log(`${y}/${sid}: skipped, no confirmed size in catalog`); continue; }
    const ref = findRef(s.slug);
    if (!ref && !flag('no-ref')) throw new Error(`missing refs/${s.slug}.png (top-down shell render). Add it or pass --no-ref.`);
    const { marked, widthPct } = await drawMarkedBox(photo.buffer, photo.width, photo.height, YARDS[y].p, s);
    writeFileSync(join(outDir, `${y}.${sid}.marked.jpg`), marked);
    const prompt = buildPrompt({ shellId: sid, ...DESIGN, placement: YARDS[y].p, widthPct });
    const images = [
      { name: 'photo.jpg', mime: 'image/jpeg', buffer: photo.buffer },
      { name: 'marked.jpg', mime: 'image/jpeg', buffer: marked },
      ...(ref ? [{ name: `shell.${ref.split('.').pop()}`, mime: ref.endsWith('png') ? 'image/png' : 'image/jpeg', buffer: readFileSync(ref) }] : []),
    ];
    for (const p of providers) {
      const base = { yard: y, shell: sid, provider: p, size_status: s.size_status, used_ref: !!ref, prompt, marked: `${y}.${sid}.marked.jpg`, photo: `${y}.photo.jpg` };
      if (dry) { results.push({ ...base, status: 'dry_run' }); continue; }
      if (dead[p]) { results.push({ ...base, status: 'skipped', error: dead[p] }); continue; }
      jobs.push({ base, p, prompt, images, y, sid });
    }
  }
}

// Run renders with limited concurrency (each takes ~1-2 min).
const CONC = +arg('concurrency', 4);
let next = 0;
async function worker() {
  while (next < jobs.length) {
    const { base, p, prompt, images, y, sid } = jobs[next++];
    if (dead[p]) { results.push({ ...base, status: 'skipped', error: dead[p] }); continue; }
    const tag = `${y}/${sid}/${p}`;
    console.log(`${tag} ... started`);
    try {
      const r = await render(p, { prompt, images });
      const file = `${y}.${sid}.${p}.png`;
      writeFileSync(join(outDir, file), r.image);
      results.push({ ...base, status: 'ok', render: file, model: r.model, ms: r.ms, cost_usd: r.costUsd, usage: r.usage });
      console.log(`${tag} ok ${(r.ms / 1000).toFixed(1)}s${r.costUsd != null ? ` $${r.costUsd.toFixed(3)}` : ''}`);
    } catch (e) {
      results.push({ ...base, status: 'error', error: e.message });
      console.log(`${tag} error: ${e.message}`);
      if (/insufficient_quota|credit|billing|limit: 0/i.test(e.message)) dead[p] = `account has no credit/billing: ${e.message.slice(0, 120)}`;
    }
  }
}
await Promise.all(Array.from({ length: CONC }, worker));
const order = r => [r.yard, r.shell, r.provider].join('.');
results.sort((a, b) => order(a).localeCompare(order(b)));

writeFileSync(join(outDir, 'results.json'), JSON.stringify(results, null, 2));
const cols = ['yard', 'shell', 'provider', 'model', 'status', 'ms', 'cost_usd', 'used_ref', 'size_status', 'render', 'error'];
writeFileSync(join(outDir, 'results.csv'), [cols.join(','), ...results.map(r => cols.map(c => JSON.stringify(r[c] ?? '')).join(','))].join('\n'));
writeSheet(outDir, results);
const ok = results.filter(r => r.status === 'ok');
const cost = ok.reduce((a, r) => a + (r.cost_usd ?? 0), 0);
console.log(`\n${ok.length} renders, ${results.filter(r => r.status === 'error').length} errors${ok.some(r => r.cost_usd != null) ? `, $${cost.toFixed(2)} total` : ''}`);
console.log(`Score them: open ${join(outDir, 'sheet.html')}`);
