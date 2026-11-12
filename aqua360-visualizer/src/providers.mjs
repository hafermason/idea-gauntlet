// One function per provider, same signature, so the app can swap models freely.
//   render({ prompt, images: [{ name, buffer, mime }] }) -> { image: Buffer, usage, costUsd, model }
// Model IDs and prices are env-configurable: verify both against the provider's
// current docs before trusting the cost column.

const num = v => (v === undefined || v === '' ? null : Number(v));

async function openaiRender({ prompt, images, model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2' }) {
  const form = new FormData();
  form.append('model', model);
  form.append('prompt', prompt);
  for (const im of images) form.append('image[]', new Blob([im.buffer], { type: im.mime }), im.name);
  form.append('size', process.env.OPENAI_IMAGE_SIZE || 'auto');
  form.append('quality', process.env.OPENAI_IMAGE_QUALITY || 'high');
  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: form,
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`openai ${res.status}: ${JSON.stringify(body.error ?? body).slice(0, 400)}`);
  const usage = body.usage ?? null;
  // $ per 1M tokens, from env (OPENAI_PRICE_IN_TEXT, OPENAI_PRICE_IN_IMAGE, OPENAI_PRICE_OUT_IMAGE)
  let costUsd = null;
  const pin = num(process.env.OPENAI_PRICE_IN_IMAGE), pt = num(process.env.OPENAI_PRICE_IN_TEXT), pout = num(process.env.OPENAI_PRICE_OUT_IMAGE);
  if (usage && pin != null && pt != null && pout != null) {
    const d = usage.input_tokens_details ?? {};
    costUsd = ((d.text_tokens ?? 0) * pt + (d.image_tokens ?? 0) * pin + (usage.output_tokens ?? 0) * pout) / 1e6;
  }
  return { image: Buffer.from(body.data[0].b64_json, 'base64'), usage, costUsd, model };
}

// Gemini through Google's OpenAI-compatible endpoint. The proxy-held key is a plain API key,
// which Google's native endpoint only accepts as x-goog-api-key; the compatible endpoint takes
// it as a Bearer token. Image parts are searched for in every shape the endpoint may use.
// NOTE: unverified end to end until the Google account has billing (free tier allows 0 image calls).
async function geminiRender({ prompt, images, model }) {
  const content = [{ type: 'text', text: prompt }, ...images.map(im => ({ type: 'image_url', image_url: { url: `data:${im.mime};base64,${im.buffer.toString('base64')}` } }))];
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GEMINI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model, messages: [{ role: 'user', content }] }),
  });
  let body = await res.json();
  if (Array.isArray(body)) body = body[0];
  if (!res.ok) throw new Error(`gemini ${res.status}: ${JSON.stringify(body.error ?? body).slice(0, 400)}`);
  const msg = body.choices?.[0]?.message ?? {};
  const urls = [];
  const walk = o => { if (!o || typeof o !== 'object') { if (typeof o === 'string') { const m = o.match(/data:image\/[a-z]+;base64,([A-Za-z0-9+/=]+)/); if (m) urls.push(m[1]); } return; } for (const v of Object.values(o)) walk(v); };
  walk(msg);
  if (!urls.length) throw new Error(`gemini returned no image: ${JSON.stringify(msg).slice(0, 300)}`);
  const usage = body.usage ?? null;
  // $ per 1M tokens from env (GEMINI_PRICE_IN, GEMINI_PRICE_OUT)
  let costUsd = null;
  const pin = num(process.env.GEMINI_PRICE_IN), pout = num(process.env.GEMINI_PRICE_OUT);
  if (usage && pin != null && pout != null) costUsd = ((usage.prompt_tokens ?? 0) * pin + (usage.completion_tokens ?? 0) * pout) / 1e6;
  return { image: Buffer.from(urls[0], 'base64'), usage, costUsd, model };
}

export const PROVIDERS = {
  'openai': a => openaiRender(a),
  'gemini-pro': a => geminiRender({ ...a, model: process.env.GEMINI_PRO_MODEL || 'gemini-3-pro-image' }),
  'gemini-flash': a => geminiRender({ ...a, model: process.env.GEMINI_FLASH_MODEL || 'gemini-3.1-flash-image' }),
};
export const keyFor = p => (p === 'openai' ? 'OPENAI_API_KEY' : 'GEMINI_API_KEY');

export async function render(provider, args, { retries = 2 } = {}) {
  const fn = PROVIDERS[provider];
  if (!fn) throw new Error(`unknown provider ${provider}`);
  for (let i = 0; ; i++) {
    const t0 = Date.now();
    try { return { ...(await fn(args)), ms: Date.now() - t0 }; }
    catch (e) { if (i >= retries || !/ (429|5\d\d)[: ]/.test(e.message) || /insufficient_quota|credit|billing|RESOURCE_EXHAUSTED.*free_tier|limit: 0/i.test(e.message)) throw e; await new Promise(r => setTimeout(r, 4000 * 2 ** i)); }
  }
}
