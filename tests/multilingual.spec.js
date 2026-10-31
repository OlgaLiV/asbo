// Multilingual: ASBO answers in the visitor's language (English, Russian, Ukrainian) with the same facts.
// These test the scripted assistant; the Claude integration must pass the same suite.
import { test, expect } from '@playwright/test';
import { gotoReady, panel, ask } from './helpers.js';

const CYRILLIC = /[Ѐ-ӿ]/;
const lang = (t) => {
  if (!CYRILLIC.test(t)) return 'en';
  if (/[іїєґІЇЄҐ]/.test(t)) return 'uk';
  return 'ru';
};
const prices = (t) => [...t.matchAll(/\$\s?([\d,]+)/g)].map((m) => m[1].replace(/,/g, '')).sort();

const Q = {
  services: { en: 'What services do you offer?', ru: 'Какие услуги предлагает студия?', uk: 'Які послуги пропонує студія?' },
  prices: { en: 'How much does a website cost?', ru: 'Сколько стоит сайт?', uk: 'Скільки коштує сайт?' },
  contact: { en: 'How can I contact Olga?', ru: 'Как связаться с Ольгой?', uk: 'Як зв\'язатися з Ольгою?' },
  projects: { en: 'What has she built?', ru: 'Какие проекты она сделала?', uk: 'Які проєкти вона зробила?' },
  unknown: { en: 'What is the capital of Peru?', ru: 'Какая столица Перу?', uk: 'Яка столиця Перу?' },
};

test.beforeEach(async ({ page }) => {
  await gotoReady(page);
  await page.locator('.pillnav [data-open="terminal"]').click();
  await expect(panel(page, 'terminal')).toBeVisible();
});

for (const l of ['en', 'ru', 'uk']) {
  test(`${l}: services question is answered in the same language`, async ({ page }) => {
    const a = await ask(page, Q.services[l]);
    expect(lang(a), `reply: ${a}`).toBe(l);
    expect(a.toLowerCase()).not.toMatch(/don't know|не знаю|не знаю/);
  });

  test(`${l}: price question gives prices in the same language`, async ({ page }) => {
    const a = await ask(page, Q.prices[l]);
    expect(lang(a), `reply: ${a}`).toBe(l);
    expect(prices(a).length, `reply: ${a}`).toBeGreaterThan(0);
  });

  test(`${l}: contact question gives the email or booking link`, async ({ page }) => {
    const a = await ask(page, Q.contact[l]);
    expect(lang(a), `reply: ${a}`).toBe(l);
    const links = await page.locator('.term-log .go').last().getAttribute('href').catch(() => '');
    expect(`${a} ${links}`).toMatch(/asboagent@gmail\.com|calendly\.com/);
  });

  test(`${l}: projects question is answered in the same language`, async ({ page }) => {
    const a = await ask(page, Q.projects[l]);
    expect(lang(a), `reply: ${a}`).toBe(l);
    expect(a).toMatch(/Enrolla/i);
  });

  test(`${l}: unknown question gets a fallback in the same language`, async ({ page }) => {
    const a = await ask(page, Q.unknown[l]);
    expect(lang(a), `reply: ${a}`).toBe(l);
  });
}

test('the same price question gives the same prices in all three languages', async ({ page }) => {
  const en = prices(await ask(page, Q.prices.en));
  const ru = prices(await ask(page, Q.prices.ru));
  const uk = prices(await ask(page, Q.prices.uk));
  expect(ru).toEqual(en);
  expect(uk).toEqual(en);
});
