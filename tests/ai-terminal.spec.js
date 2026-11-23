// The ASBO terminal with the AI switched on, against the local Worker and its fake model (no paid calls).
// Runs on desktop and both phone projects. Skipped against the deployed site, where AI is off.
import { test, expect } from '@playwright/test';
import { gotoReady, panel, ask } from './helpers.js';

const ENDPOINT = 'http://127.0.0.1:8787/chat';
const NOTE = { busy: "my ai brain is taking a short break", limit: "i've used up my ai answers for now", ru_limit: 'мои ии-ответы пока закончились' };

async function openTerminal(page) {
  await page.locator('[data-open="terminal"]').first().click();
  await expect(panel(page, 'terminal')).toBeVisible();
}
async function start(page, { ai = true, motion = false } = {}) {
  if (ai) await page.addInitScript((url) => { window.ASBO_AI_ENDPOINT = url; }, ENDPOINT);
  const calls = [];
  page.on('request', (r) => { if (r.url().includes('/chat')) calls.push(r); });
  await gotoReady(page, { motion });
  await openTerminal(page);
  return calls;
}
const lastNote = (page) => page.locator('.term-log .note').last();

test.beforeEach(async ({}, info) => { test.skip(!!process.env.BASE_URL, 'needs the local Worker'); });

test('a natural question gets an AI answer with the published starting prices and a working button', async ({ page }) => {
  const calls = await start(page);
  const reply = await ask(page, 'hi! what would a small website cost me?');
  expect(calls).toHaveLength(1);
  expect(reply).toContain('these are one-time starting prices');
  for (const p of ['$850', '$1,800', '$3,500']) expect(reply).toContain(p);
  await expect(page.locator('.term-log .note')).toHaveCount(0);
  const go = page.locator('.term-log .go').last();
  await expect(go).toHaveText('navigate_to_[services] →');
  await go.click();
  await expect(panel(page, 'services')).toBeVisible();
});

test('answers in Russian and Ukrainian', async ({ page }) => {
  await start(page);
  const ru = await ask(page, 'сколько стоит сайт для салона?');
  expect(ru).toContain('сайты стоят от $850');
  const uk = await ask(page, 'скільки коштує сайт для салону?');
  expect(uk).toContain('сайти коштують від $850');
});

test('playful off-topic questions get a light answer', async ({ page }) => {
  await start(page);
  expect(await ask(page, "what's your favorite color?")).toContain('pixel-by-pixel');
});

test('the conversation is sent as short text history', async ({ page }) => {
  const calls = await start(page);
  await ask(page, 'how much is a website?');
  await ask(page, 'and is there a discount?');
  const body = JSON.parse(calls[1].postData());
  expect(body.message).toBe('and is there a discount?');
  expect(body.history).toEqual([
    { role: 'user', text: 'how much is a website?' },
    { role: 'assistant', text: expect.stringContaining('starting prices') },
  ]);
});

test('a rejected AI reply is replaced by the approved scripted price answer', async ({ page }) => {
  await start(page);
  const reply = await ask(page, 'price please #fake:fixed-price');
  expect(reply).not.toContain('fixed');
  expect(reply).toContain('websites start at $850 for a one-page site');
  expect(reply).toContain('optional care plans are $49 or $99 a month');
  await expect(lastNote(page)).toContainText(NOTE.busy);
});

test('when the daily limit is reached, the visitor gets the scripted answer in their language', async ({ page }) => {
  await page.route('**/chat', (route) => route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ fallback: true, reason: 'limit', lang: 'ru' }) }));
  await start(page);
  const reply = await ask(page, 'сколько стоит сайт?');
  expect(reply).toContain('сайты стоят от $850');
  await expect(lastNote(page)).toContainText(NOTE.ru_limit);
});

test('when the Worker is unreachable, the scripted answer appears without an error', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/chat', (route) => route.abort('connectionrefused'));
  await start(page);
  const reply = await ask(page, 'what has she built?');
  expect(reply).toContain('enrolla');
  await expect(lastNote(page)).toContainText(NOTE.busy);
  expect(errors).toEqual([]);
});

test('a hanging Worker times out into the scripted answer', async ({ page }) => {
  test.setTimeout(60_000);
  await page.route('**/chat', () => { /* never answers */ });
  await start(page);
  await page.locator('#q').fill('how much is a website?');
  await page.locator('#q').press('Enter');
  await expect(page.locator('.term-log .a').last()).toContainText('websites start at $850', { timeout: 25_000 });
  await expect(lastNote(page)).toContainText(NOTE.busy);
});

test('questions are capped at 500 characters in the input', async ({ page }) => {
  await start(page);
  await page.locator('#q').fill('a'.repeat(700));
  expect((await page.locator('#q').inputValue()).length).toBe(500);
});

test('commands stay local and never call the AI', async ({ page }) => {
  const calls = await start(page);
  const prices = await ask(page, '/prices');
  expect(prices).toContain('websites start at $850');
  await page.locator('#q').fill('/clear');
  await page.locator('#q').press('Enter');
  await expect(page.locator('.term-log .a')).toHaveCount(0);
  await page.locator('#q').fill('/work');
  await page.locator('#q').press('Enter');
  await expect(panel(page, 'work')).toBeVisible();
  expect(calls).toHaveLength(0);
});

test('with no endpoint configured (as on the live site today), no AI request is made', async ({ page }) => {
  const calls = await start(page, { ai: false });
  expect(await ask(page, 'how much is a website?')).toContain('websites start at $850');
  expect(calls).toHaveLength(0);
});

test('"who are you" never claims a live AI when the AI is off', async ({ page }) => {
  await start(page, { ai: false });
  const reply = await ask(page, 'who are you?');
  expect(reply).toContain("olga's robot helper");
  expect(reply).not.toContain('ai assistant');
});

test('"who are you" falls back to the AI-enabled wording when the AI is on but unavailable', async ({ page }) => {
  await page.route('**/chat', (route) => route.abort('connectionrefused'));
  await start(page);
  expect(await ask(page, 'who are you?')).toContain('olga’s ai assistant');
});

test('the thinking line, typing effect and short speech line still work', async ({ page }) => {
  test.setTimeout(60_000);
  await start(page, { motion: true });
  await page.locator('#q').fill('how much is a website?');
  await page.locator('#q').press('Enter');
  await expect(page.locator('.term-log .state').last()).toContainText('// asbo-state · thinking');
  const a = page.locator('.term-log .a').last();
  await expect(a).not.toHaveText('', { timeout: 10_000 });
  const early = (await a.textContent()).length;
  await expect(a).toContainText('before work begins', { timeout: 15_000 });
  expect(early).toBeLessThan((await a.textContent()).length); // typed out, not shown at once
  const line = await page.locator('[data-line]').textContent({ timeout: 10_000 });
  expect(line.length).toBeLessThanOrEqual(160);
});

test('an AI answer does not cause sideways scrolling on any screen', async ({ page }) => {
  await start(page);
  await ask(page, 'how much is a website?');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  const box = await page.locator('.term-log').evaluate((l) => l.scrollWidth - l.clientWidth);
  expect(box).toBeLessThanOrEqual(1);
});
