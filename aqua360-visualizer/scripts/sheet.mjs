// Scoring sheet: one card per render (photo | marked | render) with the brief's five
// criteria plus "Ben would show this". Scores persist in localStorage and export to CSV.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CRITERIA = [
  ['flat', 'Sits flat, follows camera angle'],
  ['shape', 'Shape matches shell (steps, benches, proportions)'],
  ['unchanged', 'Outside the box unchanged (house, fence)'],
  ['scale', 'Scale believable for the yard'],
  ['show', 'Ben would show this to a customer'],
];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function writeSheet(dir, results) {
  const cards = results.filter(r => r.status === 'ok' || r.status === 'dry_run').map((r, i) => {
    const key = `${r.yard}.${r.shell}.${r.provider}`;
    return `<section class="card" data-key="${esc(key)}" data-provider="${esc(r.provider)}">
  <h2>${esc(r.yard)} · ${esc(r.shell)} · ${esc(r.provider)}${r.model ? ` <small>${esc(r.model)}</small>` : ''}${r.size_status !== 'confirmed' ? ' <em>size unconfirmed</em>' : ''}${!r.used_ref ? ' <em>no shell ref</em>' : ''}</h2>
  <div class="imgs"><figure><img src="${esc(r.photo)}"><figcaption>Photo</figcaption></figure><figure><img src="${esc(r.marked)}"><figcaption>Marked box</figcaption></figure><figure>${r.render ? `<img src="${esc(r.render)}">` : '<div class="none">not rendered (dry run)</div>'}<figcaption>Render${r.ms ? ` · ${(r.ms / 1000).toFixed(1)}s` : ''}${r.cost_usd != null ? ` · $${r.cost_usd.toFixed(3)}` : ''}</figcaption></figure></div>
  <div class="checks">${CRITERIA.map(([k, l]) => `<label><input type="checkbox" data-c="${k}"> ${esc(l)}</label>`).join('')}</div>
  <input class="note" placeholder="Notes" data-c="note">
  <details><summary>Prompt</summary><pre>${esc(r.prompt)}</pre></details>
</section>`;
  }).join('\n');
  const rejected = results.filter(r => r.status === 'rejected').map(r => `<li>${esc(r.yard)}: ${esc(r.reason)} — “${esc(r.message)}”</li>`).join('');
  const errors = results.filter(r => r.status === 'error').map(r => `<li>${esc(r.yard)}/${esc(r.shell)}/${esc(r.provider)}: ${esc(r.error)}</li>`).join('');
  writeFileSync(join(dir, 'sheet.html'), `<!doctype html><meta charset="utf-8"><title>Phase 1 render scoring</title>
<style>body{font:15px system-ui;margin:24px;max-width:1500px}.card{border:1px solid #ccc;border-radius:8px;padding:12px;margin:16px 0}
.imgs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}img{width:100%;border-radius:4px}figure{margin:0}.none{aspect-ratio:4/3;background:#eee;display:grid;place-items:center}
.checks{display:flex;flex-wrap:wrap;gap:6px 18px;margin:10px 0}.note{width:100%;padding:6px}em{color:#b45309;font-size:.8em}h2{font-size:1rem}
#tally{position:sticky;top:0;background:#fff;padding:8px 0;border-bottom:1px solid #ddd}</style>
<h1>Phase 1 render scoring</h1>
<p>Pass bar: at least 12 of 15 renders per model checked “Ben would show this”. Scores save in this browser.</p>
<div id="tally"></div><button id="csv">Download scores CSV</button>
${rejected ? `<h3>Rejected photos</h3><ul>${rejected}</ul>` : ''}${errors ? `<h3>Errors</h3><ul>${errors}</ul>` : ''}
${cards}
<script>
const K='phase1:'+location.pathname;const S=JSON.parse(localStorage.getItem(K)||'{}');
document.querySelectorAll('.card').forEach(c=>{const k=c.dataset.key;S[k]=S[k]||{};
 c.querySelectorAll('[data-c]').forEach(i=>{const f=i.dataset.c;if(i.type==='checkbox')i.checked=!!S[k][f];else i.value=S[k][f]||'';
  i.addEventListener('input',()=>{S[k][f]=i.type==='checkbox'?i.checked:i.value;localStorage.setItem(K,JSON.stringify(S));tally()})})});
function tally(){const t={};document.querySelectorAll('.card').forEach(c=>{const p=c.dataset.provider;t[p]=t[p]||[0,0];t[p][1]++;if(S[c.dataset.key].show)t[p][0]++});
 document.getElementById('tally').textContent=Object.entries(t).map(([p,[a,b]])=>p+': '+a+'/'+b+' showable').join('   ·   ')}
tally();
document.getElementById('csv').onclick=()=>{const cols=${JSON.stringify(CRITERIA.map(c => c[0]).concat('note'))};
 const rows=[['case',...cols].join(',')].concat(Object.entries(S).map(([k,v])=>[k,...cols.map(c=>JSON.stringify(v[c]??''))].join(',')));
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([rows.join('\\n')],{type:'text/csv'}));a.download='phase1-scores.csv';a.click()};
</script>`);
}
