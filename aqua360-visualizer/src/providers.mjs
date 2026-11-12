// One function per provider, same signature, so the app can swap models freely.
//   render({ prompt, images: [{ name, buffer, mime }] }) -> { image: Buffer, usage, costUsd, model }
// Model IDs and prices are env-configurable: verify both against the provider's
// current docs before trusting the cost column.

const num = v => (v === undefined || v === '' ? null : Number(v));

// Streams the response (stream=true, partial_images): a high-quality edit takes 60-120 s, and
// streaming keeps the connection alive through proxies and serverless timeouts (~30 s here).
async function openaiRender({ prompt, images, mask, model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2' }) {
  const form = new FormData();
  form.append('model', model);
  form.append('prompt', prompt);
  for (const im of images) form.append('image[]', new Blob([im.buffer], { type: im.mime }), im.name);
  if (mask) form.append('mask', new Blob([mask], { type: 'image/png' }), 'mask.png');
  form.append('size', process.env.OPENAI_IMAGE_SIZE || 'auto');
  form.append('quality', process.env.OPENAI_IMAGE_QUALITY || 'high');
  form.append('stream', 'true');
  form.append('partial_images', '2');
  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: form,
  });
  const text = await res.text();
  if (!res.ok) {
    let err; try { err = JSON.parse(text).error; } catch { err = text; }
    throw new Error(`openai ${res.status}: ${JSON.stringify(err).slice(0, 400)}`);
  }
  const events = text.split('\n').filter(l => l.startsWith('data:')).map(l => { try { return JSON.parse(l.slice(5)); } catch { return null; } }).filter(Boolean);
  const done = events.find(e => e.type === 'image_edit.completed');
  const fail = events.find(e => e.type === 'error' || e.error);
  if (!done) throw new Error(`openai stream ended without an image: ${JSON.stringify(fail ?? text.slice(-300)).slice(0, 400)}`);
  const usage = done.usage ?? null;
  // $ per 1M tokens, from env (OPENAI_PRICE_IN_TEXT, OPENAI_PRICE_IN_IMAGE, OPENAI_PRICE_OUT_IMAGE)
  let costUsd = null;
  // Defaults are gpt-image-2 estimates from third-party price lists (Nov 2026); confirm on OpenAI's pricing page.
  const pin = num(process.env.OPENAI_PRICE_IN_IMAGE ?? 8), pt = num(process.env.OPENAI_PRICE_IN_TEXT ?? 5), pout = num(process.env.OPENAI_PRICE_OUT_IMAGE ?? 30);
  if (usage && pin != null && pt != null && pout != null) {
    const d = usage.input_tokens_details ?? {};
    costUsd = ((d.text_tokens ?? 0) * pt + (d.image_tokens ?? 0) * pin + (usage.output_tokens ?? 0) * pout) / 1e6;
  }
  return { image: Buffer.from(done.b64_json, 'base64'), usage, costUsd, model };
}

// Gemini native API (generateContent). The key must be sent as x-goog-api-key: the native endpoint
// rejects a plain API key as a Bearer token, and Google's OpenAI-compatible endpoint cannot return
// generated images ("Unhandled generated data mime type"). Streams (alt=sse) to stay under proxy and
// serverless timeouts.
async function geminiRender({ prompt, images, model }) {
  const parts = [{ text: prompt }, ...images.map(im => ({ inline_data: { mime_type: im.mime, data: im.buffer.toString('base64') } }))];
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`, {
    method: 'POST',
    headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`gemini ${res.status}: ${text.slice(0, 400)}`);
  const chunks = text.split('\n').filter(l => l.startsWith('data:')).map(l => { try { return JSON.parse(l.slice(5)); } catch { return null; } }).filter(Boolean);
  let img = null, usage = null, finish = null;
  for (const c of chunks) {
    if (c.usageMetadata) usage = c.usageMetadata;
    const cand = c.candidates?.[0];
    if (cand?.finishReason) finish = cand.finishReason;
    for (const part of cand?.content?.parts ?? []) {
      const d = part.inlineData ?? part.inline_data;
      if (d?.data && !part.thought) img = d.data; // keep the last non-thought image
    }
  }
  if (!img) throw new Error(`gemini returned no image (finish: ${finish}): ${text.slice(-300)}`);
  // $ per 1M tokens from env (GEMINI_PRICE_IN, GEMINI_PRICE_OUT)
  let costUsd = null;
  const pin = num(process.env.GEMINI_PRICE_IN), pout = num(process.env.GEMINI_PRICE_OUT);
  if (usage && pin != null && pout != null) costUsd = ((usage.promptTokenCount ?? 0) * pin + ((usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0)) * pout) / 1e6;
  return { image: Buffer.from(img, 'base64'), usage, costUsd, model };
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
