// The closed-by-default lock: until AI_ACCESS is exactly "open", the Worker answers only requests that carry the
// private test token. Local Workers, fake model, throwaway token made for this run (playwright.config.js).
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { accessAllowed } from '../worker/src/lock.js';
import { CASES } from '../worker/cputest/cases.js';
import { parsePrices } from '../worker/src/prices.js';
import { validateReply, detectLang } from '../worker/src/validate.js';
import { gotoReady, panel, ask } from './helpers.js';

const W = 'http://127.0.0.1:8789'; // locked Worker
const ORIGIN = 'http://localhost:4173';
const TOKEN = process.env.ASBO_TEST_TOKEN;
const post = (request, headers = {}, body = { message: 'how much is a website?' }) => request.post(`${W}/chat`, {
  headers: { Origin: ORIGIN, 'content-type': 'application/json', ...headers }, data: JSON.stringify(body),
});
const req = (token) => new Request('https://w/chat', { method: 'POST', headers: token === undefined ? {} : { 'x-asbo-test-token': token } });
const once = (info) => test.skip(info.project.name !== 'desktop-chromium', 'run once');
const good = 'k'.repeat(43);

test.beforeEach(() => { test.skip(!!process.env.BASE_URL, 'local only'); });

test.describe('lock rules', () => {
  test.beforeEach(({}, info) => once(info));
  test('closed when nothing is configured, and for any value except exactly "open"', async () => {
    for (const AI_ACCESS of [undefined, '', 'closed', 'OPEN', 'open ', 'true', '1']) expect(await accessAllowed(req(), { AI_ACCESS }), String(AI_ACCESS)).toBe(false);
    expect(await accessAllowed(req(), { AI_ACCESS: 'open' })).toBe(true);
  });
  test('a token never works if none is stored, or the stored one is short', async () => {
    for (const TEST_TOKEN of [undefined, '', 'short', 'k'.repeat(31)]) {
      for (const t of [undefined, '', 'short', 'undefined', 'k'.repeat(31)]) expect(await accessAllowed(req(t), { TEST_TOKEN })).toBe(false);
    }
  });
  test('only the exact token opens it', async () => {
    const env = { AI_ACCESS: 'closed', TEST_TOKEN: good };
    expect(await accessAllowed(req(good), env)).toBe(true);
    for (const t of [undefined, '', good.slice(1), good + 'k', good.toUpperCase(), 'x' + good.slice(1), 'k'.repeat(5000)]) expect(await accessAllowed(req(t), env)).toBe(false);
  });
  test('the token in the address does not open it', async () => {
    // not sent over HTTP: addresses end up in logs, which is why only the header counts
    expect(await accessAllowed(new Request(`https://w/chat?x-asbo-test-token=${good}`), { AI_ACCESS: 'closed', TEST_TOKEN: good })).toBe(false);
  });
  test('launch config: open to asboagent.com only, the site points at the Worker, and no token is written anywhere', () => {
    const toml = fs.readFileSync('worker/wrangler.toml', 'utf8');
    expect(toml).toMatch(/^AI_ACCESS = "open"$/m);
    expect(toml).toMatch(/^ALLOWED_ORIGINS = "https:\/\/asboagent\.com"$/m);
    expect(toml).toMatch(/\[observability\]\s+enabled = false/);
    expect(toml).not.toMatch(/^\s*TEST_TOKEN\s*=/m);
    for (const f of ['index.html', 'asbo.js', 'asbo-intents.js', 'services.js', 'services.json']) {
      expect(fs.readFileSync(f, 'utf8'), f).not.toMatch(/x-asbo-test-token|TEST_TOKEN/i);
    }
    expect(fs.readFileSync('index.html', 'utf8')).toContain('name="asbo-ai-endpoint" content="https://asbo-chat.asboagent.workers.dev/chat"');
  });
});

test.describe('temporary CPU-test Worker', () => {
  test.beforeEach(({}, info) => once(info));
  test('is separate from the live Worker: own name, closed, no key, no test modes, no storage, no logs', () => {
    const toml = fs.readFileSync('worker/cputest/wrangler.toml', 'utf8').replace(/^#.*$/gm, '');
    expect(toml).toMatch(/^name = "asbo-chat-cputest"$/m);
    expect(toml).toMatch(/^AI_ACCESS = "closed"$/m);
    expect(toml).toMatch(/\[observability\]\s+enabled = false/);
    expect(toml).not.toMatch(/ANTHROPIC|TEST_TOKEN|DEV_MODE|FAKE_MODEL|durable_objects|routes|asboagent\.com"\]/);
    expect(fs.readFileSync('worker/wrangler.toml', 'utf8')).not.toMatch(/cputest/);
    for (const f of ['index.html', 'asbo.js']) expect(fs.readFileSync(f, 'utf8')).not.toMatch(/cputest/);
    expect(fs.readFileSync('index.html', 'utf8').match(/[\w.-]+\.workers\.dev[^"]*/g)).toEqual(['asbo-chat.asboagent.workers.dev/chat']);
  });
  test('its canned replies pass or fail the checker as marked', () => {
    const prices = parsePrices(JSON.parse(fs.readFileSync('services.json', 'utf8')));
    for (const k of CASES) {
      expect(detectLang(k.q), k.q).toBe(k.lang);
      expect(validateReply(k.reply, { prices, visitorLang: k.lang, claims: k.prices }).ok, k.reply).toBe(!k.reject);
    }
  });
});

test.describe('protected-deploy scripts', () => {
  test.beforeEach(({}, info) => once(info));
  const files = ['worker/deploy/locked.mjs', 'worker/deploy/realtest.mjs'];
  test('keep the token outside the repo and send it only in the header or to wrangler on stdin', () => {
    for (const f of files) {
      const s = fs.readFileSync(f, 'utf8');
      expect(s, f).toContain("path.join(homedir(), '.config/asbo/asbo-test-token')");
      expect(s, f).not.toMatch(/\?[^'"`]*\$\{token\}/); // never in an address
      expect(s, f).not.toMatch(/\[[^\]]*'secret', 'put'[^\]]*\$\{?t(oken)?\}?[^\]]*\]/); // never on a command line
      expect(s, f).not.toMatch(/console\.log\([^)]*\$\{token\}/);
      expect(s, f).not.toMatch(/sk-ant-/);
    }
    expect(fs.readFileSync('worker/deploy/locked.mjs', 'utf8')).toContain("input: t, env");
  });
  test('deploy only the reviewed commit with the closed config; the keyless token check refuses to run once a key exists', () => {
    const s = fs.readFileSync('worker/deploy/locked.mjs', 'utf8');
    expect(s).toContain("const COMMIT = 'c402bf9'");
    expect(s).toContain("const checkFiles = (commit = COMMIT, access = 'closed')");
    for (const v of ['SITE_DAILY = "100"', 'VISITOR_DAILY = "30"', 'VISITOR_PER_MINUTE = "10"', 'ALLOWED_ORIGINS = "https://asboagent.com"']) expect(s).toContain(v);
    expect(s).toContain("'Workers Logs must stay off'");
    expect(s).toMatch(/before !== after\) fail\(/); // the deploy keeps the stored secrets
    expect(s).toMatch(/'--dry-run'/);
    expect(s).toMatch(/names\.includes\('ANTHROPIC_API_KEY'\)\) fail\(/);
    // going live: the reviewed launch commit, open only through `open`, test token removed, a free check and a rollback
    expect(s).toContain("const LAUNCH_COMMIT = '81caa6b'");
    expect(s).toContain("checkFiles(LAUNCH_COMMIT, 'open')");
    expect(s).toContain("'secret', 'delete', 'TEST_TOKEN'");
    expect(s).toContain("rmSync(TOKEN_FILE)");
    expect(s).toContain("withClosedConfig(['deploy', '--message', 'rollback: closed'])");
    expect(s).toContain(`toml.replace(/^AI_ACCESS = "open"$/m, 'AI_ACCESS = "closed"')`);
    expect(s).toContain("'{\"message\":\"\"}'"); // check-open sends only empty questions: no model call
    const rt = fs.readFileSync('worker/deploy/realtest.mjs', 'utf8');
    expect(rt).toMatch(/if \(Q\.length !== 25\)/);
    expect(rt).toMatch(/if \(T\.length !== 10\)/);
  });
});

test.describe('locked Worker over HTTP', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(async ({ request }, info) => { once(info); await request.post(`${W}/__test/reset`); });
  const usage = async (request) => (await (await request.get(`${W}/__test/usage`)).json()).site;

  test('refuses without the token, even from the right origin, and uses no reply slot', async ({ request }) => {
    for (const h of [{}, { 'x-asbo-test-token': '' }, { 'x-asbo-test-token': 'wrong' }, { 'x-asbo-test-token': TOKEN.slice(0, -1) }, { authorization: `Bearer ${TOKEN}` }]) {
      const r = await post(request, h);
      expect(r.status()).toBe(403);
      expect(await r.json()).toEqual({ fallback: true, reason: 'closed' });
    }
    expect(await usage(request)).toBe(0);
  });
  test('a locked request is refused before its body is read', async ({ request }) => {
    const r = await request.post(`${W}/chat`, { headers: { Origin: ORIGIN }, data: 'x'.repeat(20_000) });
    expect(r.status()).toBe(403);
  });
  test('the token in the body does not open it', async ({ request }) => {
    expect((await post(request, {}, { message: 'hi', token: TOKEN, TEST_TOKEN: TOKEN })).status()).toBe(403);
  });
  test('the token does not replace the origin check or the limits', async ({ request }) => {
    expect((await post(request, { Origin: 'https://evil.example', 'x-asbo-test-token': TOKEN })).status()).toBe(403);
    const s = [];
    for (let i = 0; i < 12; i++) s.push((await post(request, { 'x-asbo-test-token': TOKEN, 'x-test-visitor': 'lock' })).status());
    expect(s).toEqual([...Array(10).fill(200), 429, 429]);
    expect(await usage(request)).toBe(10);
  });
  test('with the token it answers normally, and the token is never sent back', async ({ request }) => {
    const r = await post(request, { 'x-asbo-test-token': TOKEN, 'x-test-visitor': 'ok' });
    expect(r.status()).toBe(200);
    const text = (await r.text()) + JSON.stringify(r.headers());
    expect(JSON.parse(await r.text()).ok).toBe(true);
    expect(text).not.toContain(TOKEN);
  });
  test('browsers are not allowed to send the token header from a page', async ({ request }) => {
    const pre = await request.fetch(`${W}/chat`, { method: 'OPTIONS', headers: { Origin: ORIGIN, 'access-control-request-headers': 'x-asbo-test-token' } });
    expect(pre.headers()['access-control-allow-headers']).toBe('content-type');
  });
  test('the token and the question are not logged', async ({ request }) => {
    const marker = `lock-marker-${Date.now()}`;
    await post(request, {}, { message: marker });
    await post(request, { 'x-asbo-test-token': TOKEN, 'x-test-visitor': 'log' }, { message: marker });
    const q = await request.post(`${W}/cdn-cgi/local/explorer/api/local/observability/query`, {
      headers: { 'content-type': 'application/json' }, data: JSON.stringify({ sql: 'SELECT message FROM logs ORDER BY ts_ms DESC LIMIT 200' }),
    });
    test.skip(!q.ok(), 'local log explorer not available in this wrangler version');
    const text = await q.text();
    expect(text).toContain('locked');
    for (const s of [TOKEN, marker]) expect(text.includes(s)).toBe(false);
  });
});

test('if a page ever reaches a locked Worker, the visitor still gets the scripted answer', async ({ page }) => {
  await page.addInitScript((url) => { window.ASBO_AI_ENDPOINT = url; }, `${W}/chat`);
  await gotoReady(page);
  await page.locator('[data-open="terminal"]').first().click();
  await expect(panel(page, 'terminal')).toBeVisible();
  expect(await ask(page, 'How much does a website cost?')).toContain('Websites start at $850');
});
