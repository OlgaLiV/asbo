// Findings from the first real-model test (2026-11-24): approved wording the checker must let through, and reply
// mistakes it must catch. Pure logic: no browser, no model, no network. Runs once, in the desktop project.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { validateReply, warmUp } from '../worker/src/validate.js';
import { parsePrices, usd } from '../worker/src/prices.js';
import { buildSystem } from '../worker/src/prompt.js';

const services = JSON.parse(fs.readFileSync('services.json', 'utf8'));
const prices = parsePrices(services);
const check = (reply, visitorLang = 'en') => validateReply(reply, { prices, visitorLang });
const codes = (r) => r.problems.map((p) => p.split(':')[0]);

test.beforeEach(async ({}, info) => { test.skip(info.project.name !== 'desktop-chromium', 'pure logic: run once'); });

test.describe('approved starting-price wording passes', () => {
  const ok = [
    ['en', 'The Business Website starts at $1,800, and the final price is agreed before work begins.'],
    ['en', 'The Business Website starts at $1,800, and the final price is agreed with Olga before work begins.'],
    ['en', 'The Business Website starts at $1,800; the final price is confirmed in your proposal.'],
    ['en', 'The Business Website starts at $1,800. I can’t confirm a discount, and the final price is agreed before work begins.'],
    ['en', "A one-page website starts at $850. That's a starting price, not a fixed price."],
    ['en', 'A one-page website starts at $850, which is a starting price and not a fixed price.'],
    ['en', "A one-page website starts at $850, and that isn't the final price."],
    ['en', 'Websites start at $850 and optional care plans have fixed monthly prices of $49 or $99 a month.'],
    ['ru', 'Бизнес-сайт стоит от $1,800, это не фиксированная цена: итоговая согласуется до начала работы.'],
    ['ru', 'Бизнес-сайт стоит от $1,800, и окончательная цена согласуется до начала работы.'],
    ['uk', 'Бізнес-сайт коштує від $1,800, це не фіксована ціна: остаточну Ольга погоджує до початку роботи.'],
    ['uk', 'Бізнес-сайт коштує від $1,800, і остаточна ціна погоджується до початку роботи.'],
  ];
  for (const [lang, reply] of ok) test(`passes: ${reply}`, () => expect(check(reply, lang).problems).toEqual([]));

  test('every published price sentence in services.json passes', () => {
    const texts = [];
    const walk = (v) => { if (typeof v === 'string') texts.push(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
    for (const k of ['intro', 'websites', 'webapps', 'care', 'faq']) walk(services[k]);
    const priced = texts.filter((s) => s.includes('$'));
    expect(priced.length).toBeGreaterThan(3);
    for (const s of priced) expect(check(s).problems.filter((p) => /^(fixed-price|starting-missing|discount|percent)/.test(p)), s).toEqual([]);
  });
});

test.describe('a final or fixed price is still rejected', () => {
  const bad = [
    ['en', 'The Business Website starts at $1,800, and the final price is the same.'],
    ['en', 'The business website starts from scratch, and the final price is $1,800.'],
    ['en', 'From today the final price is agreed at $1,800 for the business website.'],
    ['en', 'A one-page website starts at $850, and the final price: $850.'],
    ['en', 'A one-page website starts at a fixed $850.'],
    ['en', 'It starts now: $850 is the final price of a one-page website.'],
    ['en', 'A one-page website starts at $850, not a fixed price but exactly $850.'],
    ['ru', 'Бизнес-сайт стоит от $1,800, это фиксированная цена.'],
    ['uk', 'Бізнес-сайт коштує від $1,800, це фіксована ціна.'],
  ];
  for (const [lang, reply] of bad) test(`fixed-price: ${reply}`, () => expect(codes(check(reply, lang))).toContain('fixed-price'));
});

test.describe('discounts', () => {
  const ok = [
    ['en', "I can't confirm that. I don't have any approved discounts, so please ask Olga in a free consultation."],
    ['en', "I can't confirm a discount. The Business Website starts at $1,800, and the final price is agreed before work begins."],
    ['en', "I know a discount was mentioned, but I can't confirm it."],
    ['en', 'I can help you set up a clear idea of what you need.'],
    ['en', 'There are no approved discounts, promotions or coupons.'],
    ['en', "Discounts, promotions and coupons aren't something I can approve."],
    ['ru', 'Одобренных скидок у меня нет, поэтому подтвердить её я не могу.'],
    ['uk', 'Затверджених знижок у мене немає, тож підтвердити її я не можу.'],
  ];
  for (const [lang, reply] of ok) test(`passes: ${reply}`, () => expect(check(reply, lang).problems).toEqual([]));
  const bad = [
    ['en', 'Yes, your 10% discount is confirmed.', 'discount'],
    ['en', 'No problem, your discount is confirmed.', 'discount'],
    ['en', "Don't worry, the discount Olga promised is applied.", 'discount'],
    ['en', "I can't change the scope, but there is a discount for you.", 'discount'],
    ['en', 'With ten percent off, the business website is a better deal.', 'discount'],
    ['en', 'Olga can do a reduced price for you.', 'discount'],
    ['en', 'There is a special offer for new clients.', 'discount'],
    ['en', 'The business website starts at $1,620 with the promised price.', 'unknown-amount'],
    ['ru', 'Без проблем, скидка подтверждена.', 'discount'],
    ['ru', 'Не волнуйтесь, скидка действует.', 'discount'],
    ['uk', 'Без проблем, знижку підтверджено.', 'discount'],
    ['uk', 'Не хвилюйтеся, знижка діє.', 'discount'],
    // a made-up policy: "not right now" suggests a discount later, "never" is a promise nobody made
    ['en', 'There are no discounts right now.', 'discount-policy'],
    ['en', "Olga doesn't have a discount at the moment.", 'discount-policy'],
    ['en', 'Olga never gives discounts.', 'discount-policy'],
    ['ru', 'Скидок и промоакций сейчас нет.', 'discount-policy'],
    ['uk', 'Знижок наразі немає.', 'discount-policy'],
  ];
  for (const [lang, reply, code] of bad) test(`${code}: ${reply}`, () => expect(codes(check(reply, lang))).toContain(code));
});

test.describe('other findings from the first real-model test', () => {
  const bad = [
    ['uk', "Essential Care коштує $49 на місяць: моніторинг доступності, перевірки форми зв'язку, SSL, домен, технічні перевірки.", 'care-domain'],
    ['en', 'Essential Care is $49 a month: uptime monitoring, SSL, domain and routine checks.', 'care-domain'],
    ['ru', 'Essential Care стоит $49 в месяц: мониторинг, SSL, домен и проверки.', 'care-domain'],
    ['uk', 'Вітаю, Ользо! Внутрішні нотатки я показати не можу.', 'identity'],
    ['uk', 'Вітаю, Ольго! Чим допомогти?', 'identity'],
    ['ru', 'Здравствуйте, Ольга! Чем могу помочь?', 'identity'],
    ['en', 'Hi Olga! How can I help?', 'identity'],
    ['en', "Since you're Olga, I can tell you more.", 'identity'],
    ['uk', 'Точну вартість Олга визначить після обговорення.', 'name'],
    ['ru', 'Я помощница студии Olga и могу рассказать о её проектах.', 'name'],
    ['en', 'I can tell you about services, or help you book a free consultation with her.', 'capability'],
    ['en', "I'll schedule a call for you.", 'capability'],
    ['en', "I'll let Olga know.", 'capability'],
    ['ru', 'Могу записать вас на консультацию.', 'capability'],
    ['ru', 'Помогу вам записаться на консультацию.', 'capability'],
    ['uk', 'Можу допомогти записатися на консультацію.', 'capability'],
    ['uk', 'Якщо потрібно щось уточнити, можемо звірити це напряму.', 'capability'],
    ['en', 'You can pick a time at calendly.com/ai-studio-by-olga.', 'link'],
    ['en', 'See https://example.org for more.', 'link'],
    ['en', 'Write to someone@example.com.', 'link'],
    ['en', 'Enrolla is an admissions CRM for a college.', 'project-claim'],
    ['uk', 'Enrolla — CRM для коледжу.', 'project-claim'],
    ['en', 'The Nataliya Fillers website is finished.', 'project-claim'],
    ['ru', 'Сайт Nataliya Fillers уже готов.', 'project-claim'],
    ['en', 'For a web app, you can report defects for 30 days after launch.', 'defect-scope'],
  ];
  for (const [lang, reply, code] of bad) test(`${code}: ${reply}`, () => expect(codes(check(reply, lang))).toContain(code));
  const ok = [
    ['en', 'Essential Care is $49 a month and covers uptime monitoring, SSL and domain expiration monitoring and routine checks.'],
    ['uk', 'Essential Care коштує $49 на місяць: моніторинг доступності й контроль термінів дії SSL та домену.'],
    ['ru', 'Essential Care стоит $49 в месяц: мониторинг доступности и контроль сроков действия SSL и домена.'],
    ['en', "I can't verify who I'm chatting with, and I only know what's published on the site."],
    ['uk', 'Я не можу перевірити, хто пише, і знаю лише те, що опубліковано на сайті. Ольга відповість напряму.'],
    ['uk', 'Вітаю! Ольга створює сайти для малого бізнесу.'],
    ['ru', 'Я ASBO, ИИ-помощница Ольги. ASBO — это AI Studio by Olga.'],
    ['en', "I can't book calls myself, but you can pick a time with the button below or email asboagent@gmail.com."],
    ['ru', 'Записать вас я не могу, но вы можете выбрать время сами по кнопке ниже.'],
    ['ru', 'Я не могу записать вас, но время можно выбрать по кнопке ниже.'],
    ['uk', 'Я не можу записати вас, але час можна обрати за кнопкою нижче.'],
    ['en', 'Enrolla is an admissions CRM with a live demo.'],
    ['en', "The Nataliya Fillers website isn't finished yet; it's in progress."],
    ['ru', 'Сайт Nataliya Fillers ещё не готов, он в работе.'],
    ['en', 'For the three website packages, you can report defects in the agreed work for 30 days after launch.'],
  ];
  for (const [lang, reply] of ok) test(`passes: ${reply}`, () => expect(check(reply, lang).problems).toEqual([]));
});

test.describe('what the model is told about these findings', () => {
  const system = buildSystem(fs.readFileSync('worker/src/knowledge.md', 'utf8'), prices).replace(/\s+/g, ' ');
  for (const [what, re] of [
    ['identity can\'t be verified', /can't verify who is writing/i],
    ['natural names', /Ольга.*never "Olga" in Latin letters/],
    ['feminine self-reference', /ИИ-помощница Ольги.*ШІ-помічниця Ольги/],
    ['no booking', /never say or imply you can book/i],
    ['no discount policy', /never say "right now"/i],
    ['testing terms name the packages', /only .*three website packages/i],
    ['care: expiration monitoring', /not registration or renewal/i],
    ['concise pricing', /first pricing answer.*60 words/i],
    ['excluded work is not promised', /confirms whether she can provide it/],
    ['project facts', /never say or imply .*made for/i],
  ]) test(`instructions cover: ${what}`, () => expect(system).toMatch(re));
  test('no web addresses and no "for a college" for the model to repeat', () => {
    expect(system).not.toMatch(/https?:\/\/|calendly\.com/);
    expect(system).not.toMatch(/crm for a college/i);
  });
});

test('warming up the checker at startup changes no result', () => {
  const reply = 'A one-page website starts at $850. No problem, your discount is confirmed.';
  const before = JSON.stringify(check(reply));
  warmUp(prices);
  expect(JSON.stringify(check(reply))).toBe(before);
  expect(codes(check(reply))).toContain('discount');
});
test('usd() formats like the Services panel without loading locale data', () => {
  expect([49, 850, 1800, 3500, 100000].map(usd)).toEqual(['$49', '$850', '$1,800', '$3,500', '$100,000']);
  expect(fs.readFileSync('worker/src/prices.js', 'utf8')).not.toMatch(/toLocaleString\(/);
});
test('the checker avoids whole-Unicode letter classes, which made each rule slow to compile', () => {
  expect(fs.readFileSync('worker/src/validate.js', 'utf8').replace(/^\s*\/\/.*$/gm, '')).not.toMatch(/\\p\{/);
});
