// TEMPORARY CPU-TEST WORKER (asbo-chat-cputest). Never the live Worker, never a real model, no Anthropic key.
// Runs the real request code and reply checker, but every call to Anthropic is answered here with a canned reply
// and any other address except the public price file is refused. Locked by TEST_TOKEN. Nothing is stored.
import worker from '../src/index.js';
import { CASES } from './cases.js';

const realFetch = globalThis.fetch;
let current = null; // canned reply for the request in progress (the test sends one request at a time)

globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input.url ?? String(input));
  if (url.hostname === 'api.anthropic.com') {
    if (!current) throw new Error('no canned reply');
    const { reply, action, lang, prices } = current;
    return Response.json({
      id: 'canned', type: 'message', role: 'assistant', model: 'canned', stop_reason: 'end_turn', stop_sequence: null,
      content: [{ type: 'text', text: JSON.stringify({ reply, action, lang, prices_mentioned: prices }) }],
      usage: { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0 },
    });
  }
  if (url.href === 'https://asboagent.com/services.json') return realFetch(input, init);
  throw new Error('blocked');
};

// In-memory stand-in for the shared counter, so no Durable Object or stored data is left behind.
let used = 0;
// Which requests ran in a fresh copy of the Worker: a random copy id (made on its first request, since Workers allow no
// randomness at start-up) and how many requests this copy has served. Only these numbers are logged.
let copy = null, served = 0;
const LIMITER = { idFromName: () => 'cputest', get: () => ({ take: async (v, limits) => (used < limits.siteDaily ? { ok: true, site: ++used } : { ok: false, reason: 'site-daily', site: used }) }) };

export default {
  async fetch(request, env) {
    // fail closed if this is ever given a real key, test mode, or an open lock
    if (env.ANTHROPIC_API_KEY || env.DEV_MODE || env.FAKE_MODEL || env.AI_ACCESS !== 'closed') return new Response('misconfigured', { status: 503 });
    copy ??= [...crypto.getRandomValues(new Uint8Array(4))].map((b) => b.toString(16).padStart(2, '0')).join('');
    const n = Number(request.headers.get('x-case'));
    console.log(JSON.stringify({ cputest: { copy, nth: ++served, case: Number.isInteger(n) ? n : null } }));
    current = CASES[n] ?? null;
    return worker.fetch(request, { ...env, LIMITER, ANTHROPIC_API_KEY: 'placeholder-not-a-key' });
  },
};
