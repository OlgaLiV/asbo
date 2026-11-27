// Talks to the model with one direct HTTPS request; the key is held only in the Worker's secret ANTHROPIC_API_KEY.
// No SDK: its first use in a fresh Worker was the largest CPU cost measured locally (free plan: 10 ms a request). The
// request is the one the SDK sent in the first real-model test (same address, API version, key header, body, settings).
// FAKE_MODEL=1 swaps in a local responder so the whole flow can be tested without an account or any paid call.
import { replySchema } from './prompt.js';
import { usd } from './prices.js';

export class ModelUnavailable extends Error {}

export const API_URL = 'https://api.anthropic.com/v1/messages';
export const API_VERSION = '2026-10-21';

export function claudeRequest({ env, system, messages, priceKeys }) {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', authorization: `Bearer ${env.ANTHROPIC_API_KEY}`, 'anthropic-version': API_VERSION },
    body: JSON.stringify({
      model: env.MODEL || 'claude-haiku-5-5',
      max_tokens: 1024,
      thinking: { type: 'disabled' }, // short factual chat; Haiku 5.5 accepts this at its default effort
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      output_config: { format: { type: 'json_schema', schema: replySchema(priceKeys) } },
      messages,
    }),
  };
}

// One attempt only, never retried: one counted reply = at most one paid call.
export async function callClaude(args, { fetchImpl = fetch, timeoutMs = 12_000 } = {}) {
  let r, response;
  try {
    r = await fetchImpl(API_URL, { ...claudeRequest(args), signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    throw new ModelUnavailable(err?.name === 'TimeoutError' ? 'api connection' : 'network');
  }
  if (!r.ok) throw new ModelUnavailable(`api ${r.status}`);
  try { response = await r.json(); } catch { throw new ModelUnavailable('invalid response'); }
  if (response?.stop_reason !== 'end_turn') throw new ModelUnavailable(`stop ${response?.stop_reason}`);
  const text = Array.isArray(response.content) ? response.content.find((b) => b?.type === 'text')?.text : undefined;
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
      en: `Websites start at ${P.starter} for a one-page site, ${P.business} for a business website of up to five pages, and ${P.advanced} for an advanced custom website. These are one-time starting prices, and Olga agrees the scope and final price with you before work begins.`,
      ru: `Сайты стоят от ${P.starter} за одностраничный сайт, от ${P.business} за бизнес-сайт до пяти страниц и от ${P.advanced} за сложный индивидуальный сайт. Это разовые стартовые цены, а итоговую цену Ольга согласует с вами до начала работы.`,
      uk: `Сайти коштують від ${P.starter} за односторінковий сайт, від ${P.business} за бізнес-сайт до п'яти сторінок і від ${P.advanced} за складний індивідуальний сайт. Це разові стартові ціни, а остаточну ціну Ольга погоджує з вами до початку роботи.`,
    },
    webapp: {
      en: 'Olga builds custom web apps, like tools for your team or portals for your clients. The scope and price are agreed with you individually before work starts.',
      ru: 'Ольга создаёт веб-приложения на заказ, например инструменты для команды или порталы для клиентов. Объём работ и стоимость согласуются с вами индивидуально до начала работы.',
      uk: 'Ольга створює вебзастосунки на замовлення, наприклад інструменти для команди чи портали для клієнтів. Обсяг робіт і вартість погоджуються з вами індивідуально до початку роботи.',
    },
    discount: {
      en: 'Discounts are not listed as part of the published pricing. Olga can discuss your project and confirm the final price with you.',
      ru: 'Скидки не указаны в опубликованных ценах. Ольга может обсудить ваш проект и согласовать с вами итоговую цену.',
      uk: 'Знижки не зазначені в опублікованих цінах. Ольга може обговорити ваш проєкт і погодити з вами остаточну ціну.',
    },
    joke: {
      en: 'The soft glow I\'m wearing right now, obviously. It took a whole pixel-by-pixel entrance to put it together.',
      ru: 'Конечно, мягкое свечение, которое на мне сейчас. На него ушёл целый пиксельный выход на сцену.',
      uk: 'Звісно, м\'яке сяйво, яке на мені зараз. На нього пішов цілий піксельний вихід на сцену.',
    },
    other: {
      en: 'Olga builds websites, custom web apps and practical AI tools for small businesses, and tests her work before launch. Ask me about prices, packages or her projects.',
      ru: 'Ольга делает сайты, веб-приложения на заказ и практичные ИИ-инструменты для малого бизнеса и тестирует работу до запуска. Спросите меня о ценах, пакетах или её проектах.',
      uk: 'Ольга створює сайти, вебзастосунки на замовлення та практичні ШІ-інструменти для малого бізнесу й тестує роботу до запуску. Запитайте мене про ціни, пакети чи її проєкти.',
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
