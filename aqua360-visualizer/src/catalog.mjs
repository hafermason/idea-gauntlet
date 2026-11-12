import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Minimal CSV reader (handles quoted fields with "" escapes). Stand-in for the
// Supabase catalog_models / catalog_options tables until Phase 2.
function parseCsv(text) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
    else if (c !== '\r') f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  const [head, ...body] = rows;
  return body.filter(r => r.length > 1).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}
const load = n => parseCsv(readFileSync(fileURLToPath(new URL(`../catalog/${n}.csv`, import.meta.url)), 'utf8'));

export const SHELLS = load('shells').map(s => ({ ...s, length_ft: s.length_ft ? +s.length_ft : null, width_ft: s.width_ft ? +s.width_ft : null }));
export const OPTIONS = load('options');
export const shell = id => SHELLS.find(s => s.id === id) ?? (() => { throw new Error(`unknown shell ${id}`); })();
export const option = id => OPTIONS.find(o => o.id === id) ?? (() => { throw new Error(`unknown option ${id}`); })();
