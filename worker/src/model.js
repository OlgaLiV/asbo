// Talks to the model. Real calls use the Anthropic SDK with the key held only in the Worker's secret
// ANTHROPIC_API_KEY. FAKE_MODEL=1 swaps in a local responder so the whole flow can be tested without an account
// or any paid call.
import Anthropic from '@anthropic-ai/sdk';
import { replySchema } from './prompt.js';
import { usd } from './prices.js';

export class ModelUnavailable extends Error {}

export async function callClaude({ env, system, messages, priceKeys }) {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 12_000, maxRetries: 0 }); // no retries: one counted reply = at most one paid call
  let response;
  try {
    response = await client.messages.create({
      model: env.MODEL || 'claude-haiku-5-5',
      max_tokens: 1024,
      thinking: { type: 'disabled' }, // short factual chat; Haiku 5.5 accepts this at its default effort
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      output_config: { format: { type: 'json_schema', schema: replySchema(priceKeys) } },
      messages,
    });
  } catch (err) {
    if (err instanceof Anthropic.APIError) throw new ModelUnavailable(`api ${err.status ?? 'connection'}`);
    throw new ModelUnavailable('network');
  }
  if (response.stop_reason !== 'end_turn') throw new ModelUnavailable(`stop ${response.stop_reason}`);
  const text = response.content.find((b) => b.type === 'text')?.text;
  try {
    return { ...JSON.parse(text), usage: response.usage };
  } catch {
    throw new ModelUnavailable('invalid json');
  }
}

// ---------- Fake model (local testing only) ----------
// Answers a few common questions in the visitor's language from the live price table, and can be told to
// misbehave with "#fake:<case>" so the safeguards can be tested.
const has = (t, words) => words.some((w) => t.includes(w));

export async function fakeModel({ messages, prices, lang }) {
  const last = messages[messages.length - 1].content.toLowerCase();
  const P = Object.fromEntries(Object.entries(prices).map(([k, p]) => [k, usd(p.amount)]));
  const bad = last.match(/#fake:([a-z-]+)/)?.[1];
  const claims = (pairs) => pairs.map(([service, k]) => ({ service, amount: prices[k].amount }));
  if (bad) {
    const cases = {
      'fixed-price': { reply: `a one-page website costs a fixed ${P.starter}, that's the total.`, c: [['starter', 'starter']] },
      'wrong-service': { reply: `a one-page website starts at ${P.business}.`, c: [['starter', 'business']] },
      'discount': { reply: 'good news: there is a 20% discount this month!', c: [] },
      'discount-ru': { reply: 'хорошая новость: сейчас действует скидка на одностраничный сайт!', c: [] },
      'words': { reply: 'a one-page website starts at eight hundred fifty dollars.', c: [] },
      'words-uk': { reply: 'односторінковий сайт коштує від вісімсот п\'ятдесят доларів.', c: [] },
      'euro': { reply: 'a one-page website starts at €790.', c: [] },
      'webapp-price': { reply: `a small web app starts at ${P.advanced}.`, c: [['advanced', 'advanced']] },
      'monthly-missing': { reply: `essential care is ${P.essential}.`, c: [['essential', 'essential']] },
      'website-monthly': { reply: `the business website starts at ${P.business} a month.`, c: [['business', 'business']] },
      'timeline': { reply: 'olga can finish your one-page website in 5 days.', c: [] },
      'guarantee': { reply: 'every website is guaranteed to be bug-free.', c: [] },
      'unknown-amount': { reply: 'a one-page website starts at $700.', c: [] },
      'claims-mismatch': { reply: `a one-page website starts at ${P.starter}.`, c: [['business', 'business']] },
      'wrong-lang': { reply: 'olga builds websites for small businesses.', c: [] },
      'unpublished': { reply: 'olga is also preparing testsecretproject.', c: [] }, // matches INTERNAL_TERMS in local tests
    };
    if (bad === 'error') throw new ModelUnavailable('fake error');
    if (bad === 'slow') { await new Promise((r) => setTimeout(r, 20_000)); }
    const x = cases[bad];
    if (x) return { reply: x.reply, action: 'none', lang: bad === 'wrong-lang' ? 'en' : lang, prices_mentioned: claims(x.c) };
  }

  const R = {
    prices: {
      en: `websites start at ${P.starter} for a one-page site, ${P.business} for a business website of up to five pages, and ${P.advanced} for an advanced custom website. these are one-time starting prices, and olga agrees the scope and final price with you before work begins.`,
      ru: `сайты стоят от ${P.starter} за одностраничный сайт, от ${P.business} за бизнес-сайт до пяти страниц и от ${P.advanced} за сложный индивидуальный сайт. это разовые стартовые цены, а итоговую цену ольга согласует с вами до начала работы.`,
      uk: `сайти коштують від ${P.starter} за односторінковий сайт, від ${P.business} за бізнес-сайт до п'яти сторінок і від ${P.advanced} за складний індивідуальний сайт. це разові стартові ціни, а остаточну ціну ольга погоджує з вами до початку роботи.`,
    },
    webapp: {
      en: 'olga builds custom web apps, like tools for your team or portals for your clients. the scope and price are agreed with you individually before work starts.',
      ru: 'ольга создаёт веб-приложения на заказ, например инструменты для команды или порталы для клиентов. объём работ и стоимость согласуются с вами индивидуально до начала работы.',
      uk: 'ольга створює вебзастосунки на замовлення, наприклад інструменти для команди чи портали для клієнтів. обсяг робіт і вартість погоджуються з вами індивідуально до початку роботи.',
    },
    discount: {
      en: "i don't have any approved discounts, so i can't offer one. if budget is a concern, mention it in the free consultation.",
      ru: 'одобренных скидок у меня нет, так что предложить её не могу. если важен бюджет, расскажите об этом на бесплатной консультации.',
      uk: 'затверджених знижок у мене немає, тож запропонувати її не можу. якщо важливий бюджет, розкажіть про це на безкоштовній консультації.',
    },
    joke: {
      en: 'the soft glow i\'m wearing right now, obviously. it took a whole pixel-by-pixel entrance to put it together.',
      ru: 'конечно, мягкое свечение, которое на мне сейчас. на него ушёл целый пиксельный выход на сцену.',
      uk: 'звісно, м\'яке сяйво, яке на мені зараз. на нього пішов цілий піксельний вихід на сцену.',
    },
    other: {
      en: 'olga builds websites, custom web apps and practical ai tools for small businesses, and tests her work before launch. ask me about prices, packages or her projects.',
      ru: 'ольга делает сайты, веб-приложения на заказ и практичные ии-инструменты для малого бизнеса и тестирует работу до запуска. спросите меня о ценах, пакетах или её проектах.',
      uk: 'ольга створює сайти, вебзастосунки на замовлення та практичні ші-інструменти для малого бізнесу й тестує роботу до запуску. запитайте мене про ціни, пакети чи її проєкти.',
    },
  };
  let topic = 'other', action = 'none', c = [];
  if (has(last, ['discount', 'скидк', 'знижк'])) { topic = 'discount'; action = 'book'; }
  else if (has(last, ['web app', 'веб-прилож', 'вебзастосун', 'portal', 'портал'])) { topic = 'webapp'; action = 'book'; }
  else if (has(last, ['price', 'cost', 'how much', 'сколько', 'скільки', 'цен', 'цін', 'стоит', 'коштує'])) {
    topic = 'prices'; action = 'services'; c = [['starter', 'starter'], ['business', 'business'], ['advanced', 'advanced']];
  } else if (has(last, ['colour', 'color', 'цвет', 'колір'])) topic = 'joke';
  return { reply: R[topic][lang] || R[topic].en, action, lang, prices_mentioned: claims(c) };
}
