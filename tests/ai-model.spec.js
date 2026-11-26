// The direct request to Anthropic that replaced the SDK (2026-11-26): same request as the SDK sent in the first
// real-model test, one attempt only, and every failure becomes ModelUnavailable (the visitor gets the scripted answer).
// Pure logic with a stand-in for the network: no key, no model, no paid call. Runs once, in the desktop project.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { callClaude, claudeRequest, ModelUnavailable, API_URL, API_VERSION } from '../worker/src/model.js';
import { replySchema } from '../worker/src/prompt.js';
import { warmUp } from '../worker/src/validate.js';
import { parsePrices } from '../worker/src/prices.js';

const env = { ANTHROPIC_API_KEY: 'test-placeholder' };
const args = { env, system: 'SYSTEM', messages: [{ role: 'user', content: 'hi' }], priceKeys: ['starter', 'business'] };
const reply = { reply: 'Hello!', action: 'none', lang: 'en', prices_mentioned: [] };
const message = (over = {}) => ({ id: 'm', type: 'message', role: 'assistant', stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(reply) }], usage: { input_tokens: 5, output_tokens: 7 }, ...over });
const failure = async (fetchImpl, opts = {}) => {
  try { await callClaude(args, { fetchImpl, ...opts }); return 'no error'; } catch (e) { return e instanceof ModelUnavailable ? e.message : `other: ${e}`; }
};

test.beforeEach(async ({}, info) => { test.skip(info.project.name !== 'desktop-chromium', 'pure logic: run once'); });

test('sends the same request the SDK sent in the first real-model test', async () => {
  const calls = [];
  const out = await callClaude(args, { fetchImpl: async (url, init) => { calls.push({ url, init }); return Response.json(message()); } });
  expect(calls).toHaveLength(1);
  const { url, init } = calls[0];
  expect(url).toBe('https://api.anthropic.com/v1/messages');
  expect(API_URL).toBe(url);
  expect(init.method).toBe('POST');
  expect(init.headers).toEqual({ 'content-type': 'application/json', accept: 'application/json', authorization: 'Bearer test-placeholder', 'anthropic-version': '2026-10-21' });
  expect(API_VERSION).toBe('2026-10-21');
  expect(init.signal).toBeInstanceOf(AbortSignal);
  expect(JSON.parse(init.body)).toEqual({
    model: 'claude-haiku-5-5', max_tokens: 1024, thinking: { type: 'disabled' },
    system: [{ type: 'text', text: 'SYSTEM', cache_control: { type: 'ephemeral' } }],
    output_config: { format: { type: 'json_schema', schema: replySchema(['starter', 'business']) } },
    messages: [{ role: 'user', content: 'hi' }],
  });
  expect(out).toEqual({ ...reply, usage: { input_tokens: 5, output_tokens: 7 } });
});

test('the MODEL setting changes only the model name', () => {
  expect(JSON.parse(claudeRequest({ ...args, env: { ...env, MODEL: 'other-model' } }).body).model).toBe('other-model');
});

test('every failure becomes a fallback, and nothing is retried', async () => {
  let n = 0;
  const count = (f) => async (...a) => { n++; return f(...a); };
  expect(await failure(count(async () => new Response('{}', { status: 429 })))).toBe('api 429');
  expect(await failure(count(async () => new Response('{}', { status: 529 })))).toBe('api 529');
  expect(await failure(count(async () => new Response('{}', { status: 401 })))).toBe('api 401');
  expect(n).toBe(3); // one attempt each
  expect(await failure(async () => { throw new TypeError('connection refused'); })).toBe('network');
  expect(await failure((u, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason))), { timeoutMs: 30 })).toBe('api connection');
  expect(await failure(async () => new Response('<html>error</html>'))).toBe('invalid response');
  expect(await failure(async () => Response.json(message({ stop_reason: 'max_tokens' })))).toBe('stop max_tokens');
  expect(await failure(async () => Response.json(message({ stop_reason: 'refusal' })))).toBe('stop refusal');
  expect(await failure(async () => Response.json(message({ content: [{ type: 'text', text: 'not json' }] })))).toBe('invalid json');
  expect(await failure(async () => Response.json(message({ content: [] })))).toBe('invalid json');
  expect(await failure(async () => Response.json(message({ content: null })))).toBe('invalid json');
  expect(await failure(async () => Response.json(null))).toBe('stop undefined');
});

test('the key is sent only in the header, never in the address or the body', () => {
  const r = claudeRequest({ ...args, env: { ANTHROPIC_API_KEY: 'k'.repeat(40) } });
  expect(API_URL).not.toContain('k'.repeat(40));
  expect(r.body).not.toContain('k'.repeat(40));
});

test('the Worker no longer uses the SDK, and the warm-up runs on the bundled prices without errors', () => {
  for (const f of fs.readdirSync('worker/src').filter((f) => f.endsWith('.js'))) expect(fs.readFileSync(`worker/src/${f}`, 'utf8'), f).not.toMatch(/@anthropic-ai\/sdk/);
  expect(JSON.parse(fs.readFileSync('package.json', 'utf8')).dependencies?.['@anthropic-ai/sdk']).toBeUndefined();
  expect(() => warmUp(parsePrices(JSON.parse(fs.readFileSync('services.json', 'utf8'))))).not.toThrow();
});
