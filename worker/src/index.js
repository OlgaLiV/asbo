// ASBO chat Worker: receives a visitor's question from the asboagent.com terminal, applies the limits, asks the
// model with Olga's approved knowledge and the live prices, checks the reply, and returns either the reply or a
// fallback signal (the terminal then shows the approved scripted answer).
// Never logs message text or the API key; logs only outcomes and counts.
import knowledge from './knowledge.md';
import bundledServices from '../../services.json';
import { Limiter } from './limiter.js';
import { loadPrices, PRICED_IDS } from './prices.js';
import { buildSystem, ACTIONS } from './prompt.js';
import { callClaude, fakeModel, ModelUnavailable } from './model.js';
import { validateReply, detectLang } from './validate.js';

export { Limiter };

const MAX_MESSAGE = 500;
const MAX_TURNS = 10;
const MAX_TURN_TEXT = 1500;
const MAX_BODY = 16_384;
const MODEL_TIMEOUT_MS = 14_000;

// Test-only routes and headers work only together with the fake model, so they can never coexist with real,
// paid model calls, even if DEV_MODE were set by mistake in production.
const devMode = (env) => env.DEV_MODE === '1' && env.FAKE_MODEL === '1';

const json = (body, status, cors) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...cors } });
const log = (o) => console.log(JSON.stringify({ event: 'asbo-chat', ...o }));

function corsFor(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const ok = allowed.includes(origin);
  return { ok, headers: ok ? { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', vary: 'Origin' } : {} };
}

async function visitorId(request, env) {
  const dev = devMode(env);
  const raw = (dev && request.headers.get('x-test-visitor')) || request.headers.get('CF-Connecting-IP') || 'unknown';
  const day = new Date().toISOString().slice(0, 10);
  const data = new TextEncoder().encode(`${env.VISITOR_SALT || 'dev-salt'}|${day}|${raw}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function cleanHistory(history) {
  if (!Array.isArray(history)) return null;
  const turns = history.slice(-MAX_TURNS);
  const out = [];
  for (const h of turns) {
    if (!h || (h.role !== 'user' && h.role !== 'assistant') || typeof h.text !== 'string') return null;
    const text = h.text.trim().slice(0, MAX_TURN_TEXT);
    if (text) out.push({ role: h.role, content: text });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new ModelUnavailable('timeout')), ms))]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsFor(request, env);
    const limiter = env.LIMITER.get(env.LIMITER.idFromName('site'));

    if (devMode(env) && url.pathname === '/__test/reset') { await limiter.reset(); return json({ ok: true }, 200, {}); }
    if (devMode(env) && url.pathname === '/__test/usage') return json({ site: await limiter.usage() }, 200, {});

    if (url.pathname !== '/chat') return json({ error: 'not found' }, 404, {});
    if (request.method === 'OPTIONS') return new Response(null, { status: cors.ok ? 204 : 403, headers: cors.headers });
    if (request.method !== 'POST') return json({ error: 'method' }, 405, cors.headers);
    if (!cors.ok) { log({ outcome: 'forbidden-origin' }); return json({ fallback: true, reason: 'forbidden' }, 403, {}); }

    const raw = await request.text();
    if (raw.length > MAX_BODY) return json({ fallback: true, reason: 'too_long' }, 413, cors.headers);
    let body;
    try { body = JSON.parse(raw); } catch { return json({ error: 'bad json' }, 400, cors.headers); }
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) return json({ error: 'empty' }, 400, cors.headers);
    if (message.length > MAX_MESSAGE) return json({ fallback: true, reason: 'too_long' }, 413, cors.headers);
    const history = cleanHistory(body.history ?? []);
    if (!history) return json({ error: 'bad history' }, 400, cors.headers);
    const lang = detectLang(message);

    const limits = { siteDaily: Number(env.SITE_DAILY || 100), visitorDaily: Number(env.VISITOR_DAILY || 30), visitorPerMinute: Number(env.VISITOR_PER_MINUTE || 10) };
    const testNow = devMode(env) ? Number(request.headers.get('x-test-now')) || undefined : undefined;
    const slot = await limiter.take(await visitorId(request, env), limits, testNow);
    if (!slot.ok) { log({ outcome: 'limit', reason: slot.reason }); return json({ fallback: true, reason: 'limit', lang }, 429, cors.headers); }

    let prices;
    try {
      const pricesUrl = (devMode(env) && request.headers.get('x-test-prices-url')) || env.PRICES_URL;
      ({ prices } = await loadPrices(pricesUrl, bundledServices));
    } catch {
      log({ outcome: 'prices-unavailable' });
      return json({ fallback: true, reason: 'unavailable', lang }, 200, cors.headers);
    }

    const messages = [...history, { role: 'user', content: message }];
    const system = buildSystem(knowledge, prices);
    let out;
    try {
      if (env.FAKE_MODEL === '1') out = await withTimeout(fakeModel({ messages, prices, lang }), MODEL_TIMEOUT_MS);
      else if (!env.ANTHROPIC_API_KEY) throw new ModelUnavailable('no key');
      else out = await withTimeout(callClaude({ env, system, messages, priceKeys: Object.keys(PRICED_IDS) }), MODEL_TIMEOUT_MS);
    } catch (err) {
      log({ outcome: 'model-unavailable', reason: err instanceof ModelUnavailable ? err.message : 'error', site: slot.site });
      return json({ fallback: true, reason: 'unavailable', lang }, 200, cors.headers);
    }

    const internalTerms = (env.INTERNAL_TERMS || '').split(',').map((w) => w.trim()).filter(Boolean);
    const check = validateReply(out.reply, { prices, visitorLang: lang, claims: out.prices_mentioned, internalTerms });
    if (!check.ok || !ACTIONS.includes(out.action)) {
      log({ outcome: 'rejected', codes: check.problems.map((p) => p.split(':')[0]), site: slot.site });
      return json({ fallback: true, reason: 'validation', lang, fallbackIntent: check.priceRelated ? 'prices' : null }, 200, cors.headers);
    }
    log({ outcome: 'ok', site: slot.site, tokens: out.usage ? { in: out.usage.input_tokens, out: out.usage.output_tokens, cached: out.usage.cache_read_input_tokens } : undefined });
    return json({ ok: true, reply: out.reply, action: out.action, lang }, 200, cors.headers);
  },
};
