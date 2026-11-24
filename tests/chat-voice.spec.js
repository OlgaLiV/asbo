// ASBO's voice in the chat (scripted answers, AI off as on the live site): normal capitalization, every part of a
// message answered, honest replies to things it can't know (weather, time), and light, varied replies to repeats.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { gotoReady, panel, ask } from './helpers.js';

const KB = (() => { const window = {}; eval(fs.readFileSync('asbo-intents.js', 'utf8')); return window.ASBO_INTENTS; })();

test.describe('copy rules (checked once)', () => {
  test.beforeEach(async ({}, info) => { test.skip(info.project.name !== 'desktop-chromium', 'pure text check: run once'); });

  // every reply ASBO can give, in every language
  const lines = [];
  const add = (where, v) => { for (const [l, x] of Object.entries(v)) for (const s of [].concat(x)) lines.push([`${where}/${l}`, s]); };
  add('fallback', KB.fallback);
  for (const [k, v] of Object.entries(KB.talk)) add(`talk.${k}`, v);
  for (const i of KB.intents) { add(i.id, i.answer); if (i.answerAI) add(`${i.id}.ai`, i.answerAI); if (i.noData) add(`${i.id}.noData`, i.noData); }

  test('every reply starts with a capital letter (or a number) and ends like a sentence', () => {
    for (const [where, s] of lines) {
      expect(s, where).toMatch(/^[\p{Lu}\d]/u);
      expect(s, where).toMatch(/[.!?:]$/);
    }
  });
  test('ASBO and Olga are always capitalized, in all three languages', () => {
    for (const [where, s] of lines) {
      expect(s, where).not.toMatch(/(?<![\p{L}@])(asbo|olga|ольг\p{L}*)(?![\p{L}.@])/u);
    }
  });
  test('no "prepared notes" wording', () => {
    for (const [where, s] of lines) expect(s.toLowerCase(), where).not.toMatch(/prepared notes|olga's notes|заметк|нотатк/);
  });
});

test.beforeEach(async ({ page }) => {
  await gotoReady(page);
  await page.locator('.pillnav [data-open="terminal"]').click();
  await expect(panel(page, 'terminal')).toBeVisible();
});

test('no styling forces chat text to lowercase, and the visitor\'s message shows exactly as typed', async ({ page }) => {
  const typed = 'HeLLo Olga, What DO you BUILD?';
  await ask(page, typed);
  const t = await page.evaluate(() => ['.term-log .a', '.term-log .q', '.term-log .dim', '[data-line]']
    .map((s) => getComputedStyle(document.querySelector(s)).textTransform));
  expect(t).toEqual(['none', 'none', 'none', 'none']);
  await expect(page.locator('.term-log .q').last()).toHaveText(typed);
  await expect(page.locator('.term-log .a').last()).toHaveText(/^[A-Z]/);
});

test('"Hi, how are you? Who are you?" gets a greeting, an answer, an introduction and an offer', async ({ page }) => {
  const a = await ask(page, 'Hi, how are you? Who are you?');
  expect(a).toMatch(/^Hi/);
  expect(a).toMatch(/doing well/i);
  expect(a).toContain("I'm ASBO");
  expect(a).toMatch(/work, services and prices/);
});

test('multi-part questions in Russian and Ukrainian are answered in full too', async ({ page }) => {
  const ru = await ask(page, 'Привет, как дела? Ты кто?');
  for (const s of ['Привет', 'всё хорошо', 'Я ASBO', 'Могу рассказать']) expect(ru).toContain(s);
  await page.locator('#q').fill('/clear');
  await page.locator('#q').press('Enter');
  const uk = await ask(page, 'Привіт! Як справи? Хто ти?');
  for (const s of ['Привіт', 'все добре', 'Я ASBO', 'Можу розповісти']) expect(uk).toContain(s);
});

test('a greeting with a question ASBO can\'t answer gets both a greeting and an honest "I don\'t know"', async ({ page }) => {
  const a = await ask(page, 'Hi! What is the capital of Peru?');
  expect(a).toMatch(/^Hi/);
  expect(a).toMatch(/I don't know that one/);
  expect(a).not.toMatch(/Lima/);
});

test('greeting plus a real question answers the question', async ({ page }) => {
  const a = await ask(page, 'Hello! How much does a website cost?');
  expect(a).toMatch(/^Hi there!/);
  expect(a).toContain('Websites start at $850');
});

for (const [lang, q, cant] of [
  ['en', 'What is the weather today?', /can't check the weather/],
  ['ru', 'Какая сегодня погода?', /проверить не могу/],
  ['uk', 'Яка сьогодні погода?', /перевірити не можу/],
]) {
  test(`weather (${lang}): says it can't check, never invents one, and offers what it can do`, async ({ page }) => {
    const a = await ask(page, q);
    expect(a).toMatch(cant);
    expect(a).not.toMatch(/°|sunny|rain(y|ing)?\b|cloudy|солнечн|дожд|сонячн|хмарн/i);
    expect(a).toMatch(/Olga|Ольг/);
    await expect(page.locator('.term-log .go').last()).toHaveText(/ask_olga_directly/);
  });
}

test('the time and the news are also out of reach, said honestly', async ({ page }) => {
  expect(await ask(page, 'What time is it?')).toMatch(/can't look up live information/);
});

test('asking "how are you" again gets a light, different reply', async ({ page }) => {
  const first = await ask(page, 'How are you?');
  const second = await ask(page, 'How are you?');
  const third = await ask(page, 'how are you');
  expect(first).toMatch(/doing well/);
  expect(second).not.toBe(first);
  expect(second).toMatch(/again/i);
  expect(third).not.toBe(second);
  for (const a of [second, third]) expect(a).toMatch(/What can I help you with\?/);
});

test('a repeated question is acknowledged and still answered, not copied word for word', async ({ page }) => {
  const first = await ask(page, 'How much does a website cost?');
  const again = await ask(page, 'how much is a website?');
  expect(again).not.toBe(first);
  expect(again).toMatch(/^(Happy to go over that again!|Sure, here's that once more\.|Of course! Here it is again\.)/);
  expect(again).toContain('Websites start at $850');
});

test('a repeated unknown question gets a gentle, different reply', async ({ page }) => {
  const first = await ask(page, 'What is the capital of Peru?');
  const again = await ask(page, 'What is the capital of Peru?');
  expect(again).not.toBe(first);
  expect(again).toMatch(/still don't know/);
});

test('/clear starts the conversation fresh', async ({ page }) => {
  await ask(page, 'How are you?');
  await page.locator('#q').fill('/clear');
  await page.locator('#q').press('Enter');
  expect(await ask(page, 'How are you?')).toMatch(/^I'm doing well, thanks for asking!/);
});

test('thanks, an "ok" and a goodbye get short, natural replies', async ({ page }) => {
  expect(await ask(page, 'Thanks!')).toMatch(/^You're welcome!/);
  expect(await ask(page, 'ok')).toBe('Anything else I can help with?');
  expect(await ask(page, 'Bye!')).toBe('Bye for now! Come back anytime.');
});

test('"How do you test websites?" is answered about testing', async ({ page }) => {
  expect(await ask(page, 'How do you test websites?')).toMatch(/QA automation/);
});
