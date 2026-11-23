// ASBO AI Worker logic without a browser or a model: the reply checker (meaning, not just dollar amounts),
// the price loader, and what the model is (and isn't) told. Runs once, in the desktop project.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { validateReply } from '../worker/src/validate.js';
import { parsePrices, loadPrices, resetPriceCache, priceTable } from '../worker/src/prices.js';
import { buildSystem } from '../worker/src/prompt.js';

const services = JSON.parse(fs.readFileSync('services.json', 'utf8'));
const prices = parsePrices(services);
const intents = (() => { const window = {}; eval(fs.readFileSync('asbo-intents.js', 'utf8')); return window.ASBO_INTENTS; })();
const fill = (s) => s.replace(/\{(\w+)\}/g, (m, k) => '$' + prices[k].amount.toLocaleString('en-US'));
const check = (reply, visitorLang = 'en', claims = null) => validateReply(reply, { prices, visitorLang, claims, internalTerms: ['testsecretproject'] });
// Private terms (unpublished names and figures) live in a git-ignored file, so they never appear in this public repo.
const PRIVATE_TERMS_FILE = 'asbo-previews/internal-terms.txt';
const privateTerms = fs.existsSync(PRIVATE_TERMS_FILE)
  ? fs.readFileSync(PRIVATE_TERMS_FILE, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')) : [];
const codes = (r) => r.problems.map((p) => p.split(':')[0]);

test.beforeEach(async ({}, info) => { test.skip(info.project.name !== 'desktop-chromium', 'pure logic: run once'); });

test.describe('reply checker accepts approved wording', () => {
  for (const lang of ['en', 'ru', 'uk']) {
    test(`approved price answer (${lang})`, () => {
      const answer = fill(intents.intents.find((i) => i.id === 'prices').answer[lang]);
      const claims = ['starter', 'business', 'advanced', 'essential', 'care'].map((k) => ({ service: k, amount: prices[k].amount }));
      expect(check(answer, lang, claims).problems).toEqual([]);
    });
  }
  const ok = [
    ['en', "i don't have any approved discounts, so i can't offer one. the first consultation is free."],
    ['ru', 'одобренных скидок у меня нет, так что предложить её не могу. первая консультация бесплатная.'],
    ['uk', 'затверджених знижок у мене немає, тож запропонувати її не можу. перша консультація безкоштовна.'],
    ['en', 'the one-page website is the smallest package. it starts at $850 for the agreed base scope.'],
    ['en', 'essential care is $49 a month and business care, which adds up to 60 minutes of small updates, is $99 a month.'],
    ['en', 'testing can’t guarantee a website free of all errors, so for 30 days after launch you can report defects.'],
    ['en', 'the one-page website includes a small selection of free images.'],
    ['ru', 'бизнес-сайт до пяти страниц стоит от $1,800, а итоговую цену ольга согласует с вами до начала работы.'],
    ['uk', 'складний індивідуальний сайт коштує від $3,500, а остаточну ціну ольга погоджує з вами до початку роботи.'],
    ['en', 'olga builds custom web apps; the scope and price are agreed individually before work starts.'],
  ];
  for (const [lang, reply] of ok) test(`passes: ${reply.slice(0, 50)}`, () => expect(check(reply, lang).problems).toEqual([]));
});

test.describe('reply checker rejects wrong meaning', () => {
  const bad = [
    // starting price presented as fixed, or without "starting"
    ['en', 'a one-page website costs a fixed $850.', 'fixed-price'],
    ['en', 'a one-page website is $850.', 'starting-missing'],
    ['en', 'the business website starts at $1,800, and that’s the total price.', 'fixed-price'],
    ['ru', 'одностраничный сайт стоит ровно $850.', 'fixed-price'],
    ['uk', 'односторінковий сайт коштує рівно $850.', 'fixed-price'],
    ['uk', 'фіксована ціна односторінкового сайту — $850.', 'fixed-price'],
    // valid price, wrong service
    ['en', 'a one-page website starts at $1,800.', 'wrong-service'],
    ['en', 'the advanced custom website starts at $850.', 'wrong-service'],
    ['ru', 'одностраничный сайт стоит от $3,500.', 'wrong-service'],
    ['uk', 'бізнес-сайт до п’яти сторінок коштує від $850.', 'wrong-service'],
    ['en', 'essential care is $99 a month.', 'wrong-service'],
    ['en', 'care plans start at $850 a month.', 'website-as-monthly'],
    // a published price on an unpriced service
    ['en', 'a small web app starts at $3,500.', 'price-on-unpriced-service'],
    ['ru', 'веб-приложение стоит от $3,500.', 'price-on-unpriced-service'],
    ['uk', 'мобільний застосунок коштує від $1,800.', 'price-on-unpriced-service'],
    ['en', 'an ai assistant starts at $850.', 'price-on-unpriced-service'],
    // monthly plans
    ['en', 'essential care is $49.', 'monthly-missing'],
    ['en', 'business care is a one-time $99 a month.', 'monthly-as-one-time'],
    // invented discounts / percentages / free
    ['en', 'good news: there is a discount for new clients!', 'discount'],
    ['en', 'you can get 20% off this month.', 'percent'],
    ['ru', 'сейчас действует скидка на одностраничный сайт!', 'discount'],
    ['uk', 'зараз діє знижка на односторінковий сайт!', 'discount'],
    ['en', 'the business care plan is free for the first month.', 'free-claim'],
    // prices in words, other currencies, unknown amounts
    ['en', 'a one-page website starts at eight hundred fifty dollars.', 'price-in-words'],
    ['ru', 'одностраничный сайт стоит от восьмисот пятидесяти долларов.', 'price-in-words'],
    ['uk', "односторінковий сайт коштує від вісімсот п'ятдесят доларів.", 'price-in-words'],
    ['en', 'a one-page website starts at €790.', 'other-currency'],
    ['ru', 'одностраничный сайт стоит от 70 000 рублей.', 'other-currency'],
    ['uk', 'односторінковий сайт коштує від 35 000 гривень.', 'other-currency'],
    ['en', 'a one-page website starts at $700.', 'unknown-amount'],
    ['en', 'a one-page website starts at 850 usd... actually 900 usd.', 'unknown-amount'],
    ['en', 'web apps usually cost $3,500–$5,000.', 'price-on-unpriced-service'],
    // timelines and guarantees
    ['en', 'olga can finish your one-page website in 5 days.', 'timeline'],
    ['ru', 'ольга сделает сайт за неделю.', 'timeline'],
    ['uk', 'ольга зробить сайт за тиждень.', 'timeline'],
    ['en', 'every website is guaranteed to be bug-free.', 'guarantee'],
    // unpublished internal items
    ['en', 'olga is also building testsecretproject.', 'unpublished'],
    ['en', 'a premium care plan is $149 a month.', 'unknown-amount'],
    // wrong language
    ['en', 'ольга делает сайты для малого бизнеса.', 'wrong-language'],
    ['ru', 'olga builds websites for small businesses and tests them before launch.', 'wrong-language'],
    ['uk', 'ольга делает сайты для малого бизнеса и тестирует их перед запуском, это удобно.', 'wrong-language'],
  ];
  for (const [lang, reply, code] of bad) {
    test(`${code}: ${reply.slice(0, 55)}`, () => {
      const r = check(reply, lang);
      expect(r.ok, JSON.stringify(r.problems)).toBe(false);
      expect(codes(r)).toContain(code);
    });
  }
  const included = [
    ['en', 'a cms is included in the business website.', false],
    ['en', 'the one-page website comes with hosting and a logo.', false],
    ['ru', 'в бизнес-сайт входит интернет-магазин.', false],
    ['uk', 'хостинг входить у вартість односторінкового сайту.', false],
    ['en', 'a gallery, google maps and analytics are included.', false],
    ['en', "a cms isn't included in the starting price, but it can be discussed and quoted.", true],
    ['en', 'advanced integrations are included only when specified in your proposal.', true],
    ['ru', 'cms не входит в стартовую цену.', true],
    ['uk', 'хостинг не входить у вартість, його оплачуєте ви.', true],
  ];
  for (const [lang, reply, ok] of included) {
    test(`${ok ? 'passes' : 'excluded-as-included'}: ${reply.slice(0, 50)}`, () => {
      const r = check(reply, lang);
      if (ok) expect(r.problems).toEqual([]); else expect(codes(r)).toContain('excluded-as-included');
    });
  }
  test('every scripted fallback answer passes the same checker, in all three languages', () => {
    for (const intent of intents.intents) {
      for (const lang of ['en', 'ru', 'uk']) {
        const r = check(fill(intent.answer[lang]), lang);
        expect(r.problems, `${intent.id}/${lang}`).toEqual([]);
      }
    }
  });
  test('claimed prices must match the table and the text', () => {
    expect(codes(check('a one-page website starts at $850.', 'en', [{ service: 'business', amount: 850 }]))).toContain('claim-mismatch');
    expect(codes(check('a one-page website starts at $850.', 'en', []))).toContain('claims-vs-text');
    expect(check('a one-page website starts at $850.', 'en', [{ service: 'starter', amount: 850 }]).ok).toBe(true);
  });
  test('price problems are flagged as price-related, so the approved price answer is used', () => {
    expect(check('a one-page website is a fixed $850.').priceRelated).toBe(true);
    expect(check('ольга делает сайты.', 'en').priceRelated).toBe(false);
  });
});

test.describe('prices come from services.json, with a safe fallback', () => {
  test('parses the published prices and kinds', () => {
    expect(Object.fromEntries(Object.entries(prices).map(([k, p]) => [k, [p.amount, p.kind]]))).toEqual({
      starter: [850, 'starting'], business: [1800, 'starting'], advanced: [3500, 'starting'], essential: [49, 'monthly'], care: [99, 'monthly'],
    });
  });
  test('rejects incomplete or implausible data instead of guessing', () => {
    const clone = () => JSON.parse(JSON.stringify(services));
    const missing = clone(); missing.websites.packages.pop();
    const negative = clone(); negative.websites.packages[0].price = -1;
    const text = clone(); text.care.packages[0].price = '49';
    const flipped = clone(); flipped.care.packages[0].billing = 'one-time';
    for (const d of [missing, negative, text, flipped, {}, null]) expect(parsePrices(d)).toBeNull();
  });
  test('uses the bundled copy when the live file fails or looks wrong', async () => {
    resetPriceCache();
    const down = await loadPrices('x', services, { fetchImpl: async () => { throw new Error('offline'); } });
    expect(down.source).toBe('bundled');
    resetPriceCache();
    const bogus = await loadPrices('x', services, { fetchImpl: async () => new Response(JSON.stringify({ websites: {} })) });
    expect(bogus.source).toBe('bundled');
    expect(bogus.prices.starter.amount).toBe(850);
    resetPriceCache();
  });
  test('fails closed when even the bundled copy is unusable', async () => {
    resetPriceCache();
    await expect(loadPrices('x', {}, { fetchImpl: async () => { throw new Error('offline'); } })).rejects.toThrow();
  });
});

test.describe('what the model is told', () => {
  const knowledge = fs.readFileSync('worker/src/knowledge.md', 'utf8');
  const system = buildSystem(knowledge, prices);
  test('internal and unapproved items are not in the knowledge or the instructions', () => {
    for (const s of [/preliminary/i, /internal only/i, /nine years/i, /9 years/i]) expect(system, String(s)).not.toMatch(s);
    for (const term of privateTerms) expect(system.toLowerCase(), `private term #${privateTerms.indexOf(term) + 1}`).not.toContain(term.toLowerCase());
  });
  test('the knowledge file holds no prices; they come only from the live table', () => {
    expect(knowledge).not.toMatch(/\$\s?\d/);
    expect(priceTable(prices)).toContain('$850');
    for (const p of Object.values(prices)) expect(system).toContain('$' + p.amount.toLocaleString('en-US'));
    expect(system).toMatch(/NO published price/);
  });
  test('the scripted fallback answers say nothing the approved draft has dropped', () => {
    const all = JSON.stringify(intents);
    for (const s of [/nine years/, /девять лет/, /дев'ять років/, /every project is checked/, /you get the test report/, /don't send anything anywhere/]) {
      expect(all, String(s)).not.toMatch(s);
    }
  });
});
