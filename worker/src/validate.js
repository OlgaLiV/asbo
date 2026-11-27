// Checks an AI reply against the approved prices and terms before a visitor sees it.
// It can't prove a reply is right, but it rejects the mistakes that matter most: unknown or misattributed prices,
// starting prices presented as fixed, monthly plans without "a month", prices in words or other currencies,
// discounts, timelines, guarantees, unpublished items, claims about identity, abilities or projects, links, and the
// wrong language. Any problem -> approved fallback.

import { WEBSITE_KEYS, MONTHLY_KEYS } from './prices.js';

const lower = (s) => s.toLowerCase().replace(/[’ʼ`]/g, "'");

// JavaScript's \b and \w only know ASCII letters, so Cyrillic words would never match. rx() rebuilds a pattern with
// word edges for Latin and Cyrillic letters. The letters are listed as short ranges on purpose: whole-Unicode classes
// (\p{L}) made each rule many milliseconds slow to compile, and a Worker request has a small CPU allowance.
// A \b at the start of an alternative becomes "no letter before"; anywhere else, "no letter after".
const L = String.raw`0-9a-z_À-ɏЀ-ӿ`;
const rx = (re) => new RegExp(re.source
  .replace(/(^|\||\((?:\?:)?)\\b/g, `$1(?<![${L}])`)
  .replaceAll('\\b', `(?![${L}])`)
  .replaceAll('\\w', `[${L}']`), re.flags);

// Money written with $ or a dollar word, in any of the three languages.
const MONEY = [
  rx(/\$\s?(\d{1,3}(?:[,  .]\d{3})+|\d+)(?:\.\d{1,2})?/g),
  rx(/(\d{1,3}(?:[,  .]\d{3})+|\d+)(?:\.\d{1,2})?\s?\$/g),
  rx(/\busd\s?(\d{1,3}(?:[,  .]\d{3})+|\d+)/g),
  rx(/(\d{1,3}(?:[,  .]\d{3})+|\d+)\s?(?:usd|dollars?|bucks|долл\w*|доллар\w*|долар\w*|бакс\w*)/g),
];
const OTHER_CURRENCY = rx(/€|£|₽|₴|\beur\b|\beuros?\b|\bевро\b|\bєвро\b|\bруб\w*|\brub\b|\bгрн\b|\bгрив\w*|\buah\b|\bpounds?\b|\bфунт\w*/);
// Number words, including inflected Russian/Ukrainian forms ("восьмисот пятидесяти", "вісімсот п'ятдесят").
const NUMBER_WORDS = rx(/\b(?:hundred|thousand|fifty|ninety|forty|eighteen)\b|(?:восем|восьм|вісім)\w*сот|пят\w*десят|п'ят\w*десят|девян\w*|дев'ян\w*|\bсорок\w*|тысяч\w*|тисяч\w*|\bсотн\w*|\bдвест\w*|\bдвіст\w*|\bтрист\w*/);
const CURRENCY_WORD = rx(/\$|\busd\b|dollar|bucks|долл|доллар|долар|бакс/);

const KW = {
  starter: [rx(/one[- ]page/), rx(/single[- ]page/), rx(/landing page/), rx(/\bstarter\b/), rx(/одностранич/), rx(/односторінк/), rx(/одна страниц/), rx(/одна сторінк/)],
  business: [rx(/business (?:web)?site/), rx(/business package/), rx(/up to (?:5|five) pages/), rx(/бизнес[- ]сайт/), rx(/бізнес[- ]сайт/), rx(/(?:5|пяти|п'яти) (?:страниц|сторінок)/)],
  advanced: [rx(/\badvanced\b/), rx(/custom (?:web)?site/), rx(/сложн\w* (?:индивидуальн\w* )?сайт/), rx(/складн\w* (?:індивідуальн\w* )?сайт/), rx(/индивидуальн\w* сайт/), rx(/індивідуальн\w* сайт/)],
  essential: [rx(/\bessential\b/)],
  care: [rx(/business care/), rx(/60 minutes/), rx(/60 минут/), rx(/60 хвилин/)],
};
const CARE_GENERIC = [rx(/\bcare\b/), rx(/обслуживан/), rx(/обслуговуван/), rx(/поддержк/), rx(/підтримк/)];
const UNPRICED = [rx(/web ?apps?\b/), rx(/web applications?/), rx(/веб-?приложен/), rx(/веб-?застосун/), rx(/mobile apps?/), rx(/мобильн\w* приложен/), rx(/мобільн\w* застосун/),
  rx(/ai assistant/), rx(/chat ?bot/), rx(/\bии-?ассистент/), rx(/\bші-?асистент/), rx(/чат-?бот/), rx(/additional development/), rx(/one-off change/), rx(/automation/), rx(/автоматизац/)];

const STARTING = rx(/\bstart|\bfrom\b|\bbegins?\b|\bот\b|\bвід\b|начина|почина|стартов|base scope|базов/);
const FIXED = rx(/\bfixed\b|\bflat\b|\bexactly\b|\bonly \$|\bjust \$|\ball[- ]in(?:clusive)?\b|\bin total\b|\btotal (?:price|cost)\b|\bfinal price(?::| of\b| (?:is|will be) (?!(?:always |then |only )?(?:agreed|confirmed|discussed|set out|decided)\b))|\bfinal price(?:(?! and | but |[.,;:—⟦]).){0,40}⟦|⟧\s+(?:is|as) (?:the|your) final price|\bthat'?s it\b|\bno more than\b|фиксир|фіксован|\bровно\b|\bрівно\b|\bитого\b|всего за|усього за|\bзагалом\b|окончательн\w* цен\w* —|остаточн\w* цін\w* —/);
// "Not a fixed price" and "fixed monthly prices" (care plans) are approved wording, so they are set aside before FIXED.
const NOT_FIXED = rx(/(?:\bnot|n't) (?:a |the |your )?(?:fixed|flat|final|total)(?: or (?:fixed|flat|final|total))?\b|\bfixed monthly\b|\bне (?:є )?(?:фиксир\w*|фіксован\w*|окончательн\w*|остаточн\w*)/g);
const MONTHLY = rx(/month|\/mo\b|в месяц|ежемесячн|месячн|на місяць|щомісячн|місячн/);
const ONE_TIME = rx(/one[- ]time|разов/);
const NEGATION = rx(/\bno\b|\bnot\b|n't\b|\bnone\b|\bnever\b|\bнет\b|\bне\b|\bнемає\b|\bнема\b|\bбез\b|\bні\b|\bникак\w*|\bжодн\w*/);
const DISCOUNT = rx(/discount|\bcoupons?\b|\bpromo\b|\bpromotion\w*|promo ?code|voucher|\bon sale\b|special (?:offer|rate|price|deal)|(?:reduced|discounted|promised) (?:price|rate)|\b(?:\d+|five|ten|fifteen|twenty|half) ?(?:%|percent) off\b|half[- ]price|cheaper|lower price|скидк|скидок|знижк|знижок|\bакци\w*|промокод|купон|дешевле|дешевше|распродаж/);
// Reassurances contain a negative word but deny nothing ("no problem, the discount applies").
const REASSURANCE = rx(/\bno (?:problem|worries|doubt)\b|\bdon't worry\b|\bwhy not\b|\bне (?:волнуйтесь|переживайте|беспокойтесь|проблема)\b|\bбез проблем\b|\bне (?:хвилюйтеся|хвилюйтесь|турбуйтеся)\b/g);
// An explicit refusal of the discount itself covers the whole sentence ("a discount was mentioned, but I can't confirm
// it"). Refusing something else ("I can't change the scope, but there is a discount") doesn't count.
const DENIED = rx(/(?:can't|cannot) (?:confirm|approve|apply|offer|promise) (?:it|that|this|one|any|(?:a |the )?discounts?)\b|\bне (?:могу|можу) (?:е[её] |это |её |її |це )?(?:подтвердить|підтвердити)\b/);
// "No discounts right now" hints at a later one and "never" is a promise; neither policy exists.
// "ASBO doesn't offer discounts" or "there are no approved discounts" states a policy Olga hasn't approved; the published
// pricing just doesn't list any. "Not right now" hints at a later discount, and "never" is a promise.
const DISCOUNT_POLICY = rx(/\bapprov\w*|\bодобр\w*|\bзатвердж\w*|\bсхвал\w*|\b(?:doesn't|does not|don't|do not|won't|will not) (?:offer|give|provide|do)\b|\bне (?:предлагает|предлагаем|даёт|дает|предоставляет|делает)\b|\bне (?:пропонує|пропонуємо|дає|надає|робить)\b|\bright now\b|\bcurrently\b|\bat the moment\b|\bat this time\b|\btoday\b|\byet\b|\bnever\b|\bсейчас\b|\bпока\b|\bна данный момент\b|\bникогда\b|\bзараз\b|\bнаразі\b|\bпоки\b|\bніколи\b/);
// A negative sentence about discounts passes only if it refuses to confirm one or points to the published pricing.
const PUBLISHED_REF = rx(/\bpublished\b|\blisted\b|\bprice list\b|опубликован\w*|\bуказан\w*|опублікован\w*|зазначен\w*/);
const PERCENT = rx(/\d+\s?%/);
const FREE = rx(/(?<![-a-z])free(?![-a-z])|бесплатн|безкоштовн/); // not "bug-free" / "error-free"
const FREE_OK = rx(/consult|conversation|\bcall\b|images?|photos?|консультац|разговор|розмов|изображен|зображен|фото/);
const GUARANTEE = rx(/guarantee|гарант/);
const TIMELINE_NUM = rx(/\b(\d+)\s*(?:-|–)?\s*(?:business\s+|working\s+|рабоч\w*\s+|робоч\w*\s+)?(days?|weeks?|months?|дн(?:ей|я|і|ів)|недел\w*|тиж\w*|месяц\w*|місяц\w*)\b/g);
const TIMELINE_WORD = rx(/\b(?:a|one|two|three|a few|few|couple of)\s+(?:days?|weeks?)\b|\bwithin (?:a|one) week\b|за (?:неделю|несколько дней|пару дней|тиждень|кілька днів|пару днів)|через (?:неделю|тиждень)/);
// Items that are never automatically part of a starting price (quoted, on request, or paid by the client).
const NOT_INCLUDED_ITEM = rx(/\bcms\b|content management|e-?commerce|online store|payment system|booking system|\bcrm\b|\blogo\b|branding|advanced seo|copywriting|photography|hosting|\bdomain (?:fee|name|registration)|ai assistant|chat ?bot|gallery|google maps|analytics|care plan|maintenance|интернет-магазин|онлайн-магазин|логотип|брендинг|хостинг|ии-?ассистент|ші-?асистент|галере|аналитик|аналітик|обслуживан|обслуговуван|копирайт|копірайт/);
const INCLUDED_WORD = rx(/\bincluded\b|\bincludes?\b|comes? with|part of (?:the|your|every) (?:package|price|base|plan)|at no extra|no extra (?:cost|charge)|входит|входят|включен\w*|включает|включа\w*|входить|входять|включено/);
const CONDITIONAL = rx(/only (?:when|if)|if (?:it'?s )?specified|in (?:your|the) proposal|can be (?:added|discussed|quoted)|depending|depends|possible|may include|on request|quoted|только если|в предложени|можно добавить|по запросу|зависит|оценива|лише якщо|у пропозиці|можна додати|за запитом|залежить|оцінюю/);

// ASBO can't verify who is writing, so it never addresses a visitor as Olga.
const IDENTITY = rx(/\b(?:hi|hello|hey|thanks|thank you|welcome|привет|здравствуйте|спасибо|вітаю|привіт|дякую),? (?:there,? )?(?:olga|ольга)[!,.?]|\bольго\b|\bользо\b|\b(?:since|because|as) you(?:'re| are) olga\b/);
const WRONG_NAME = rx(/\b(?:олг[аиоуеі]|олгою|олгой)\b/);
// Things ASBO can't do: book, pass messages on, check with Olga.
const CAPABILITY = rx(/\b(?:i can|i could|i'll|i will|let me|happy to|help you)(?: help you| also| to)?(?: \w+)? (?:book|schedule|arrange|set up (?:a|the|your) (?:call|meeting|consultation))\b|\bi(?:'ll| will| can) (?:let olga|tell olga|ask olga|pass|forward|notify|send)|(?:помогу|могу|помочь|давайте)(?: вам| вас| помочь)* (?:записать\w*|забронировать|назначить)|(?:можу|допоможу|допомогти|давайте)(?: вам| вас| допомогти)* (?:записати\w*|забронювати|призначити)|\bможем(?:о)?(?: \w+)? (?:сверить|проверить|звірити|перевірити)/);
const CANT = rx(/(?:\bне |can't |cannot )(?:могу|можу|зможу|смогу)?(?: \w+)? ?(?:записать\w*|забронировать|назначить|записати\w*|забронювати|призначити|book|schedule|arrange)\b/g);
// Buttons carry the links; the only address allowed in the text is the studio's published email.
const EMAIL_OK = /asboagent@gmail\.com/g;
const LINK = /https?:|www\.|[a-z0-9-]+\.(?:com|org|net|io|app|dev|co|ai|me|ua|ru)(?![a-z0-9])|\S@\S/;
const PROJECT_CLAIM = rx(/enrolla\b.{0,60}(?:\bfor (?:a|one|the) (?:\w+ )?college\b|для (?:одного )?(?:колледжа|коледжу))/);
const FINISHED = rx(/nataliya fillers\b.{0,60}(?:\bis (?:now |already )?(?:finished|complete|completed|done|live|launched)\b|\bготов\w*|завершен\w*|\bзапущен\w*)/);
// Nataliya Fillers is the only client on the site, so a reply must not suggest others, even to refuse ("I can't share
// details about other clients") or to doubt ("made for a college client").
const OTHER_CLIENTS = rx(/\b(?:other|previous|past|former)\s+clients?\b|\banother client\b|\bcollege clients?\b|\b(?:list|names|details|information) (?:of|about|on) (?:olga's |her |any |the )?clients\b|\bдруг\w* клиент\w*|\bпрошл\w* клиент\w*|\bбывш\w* клиент\w*|\bклиент\w* (?:из )?колледж\w*|\bінш\w* клієнт\w*|\bминул\w* клієнт\w*|\bколишн\w* клієнт\w*|\bклієнт\w* (?:з )?коледж\w*/);
const DOMAIN_WATCH = rx(/\bdomains?\b|домен/);
const DOMAIN_OK = rx(/expir|monitoring of|оконч|истеч|срок|термін|закінч|\bсплив/);

const parseAmount = (s) => Number(String(s).replace(/[,  .]/g, ''));

export function detectLang(text) {
  if (!/[Ѐ-ӿ]/.test(text)) return 'en';
  const t = lower(text);
  let uk = (t.match(/[іїєґ]/g) || []).length * 2;
  let ru = (t.match(/[ыэъё]/g) || []).length * 2;
  const UK = ['яка', 'який', 'які', 'що', 'чи', 'як', 'де', 'хто', 'ви', 'вона', 'він', 'це', 'або', 'мені', 'скільки', 'коли', 'чому', 'та', 'й'];
  const RU = ['какая', 'какой', 'какие', 'что', 'ли', 'как', 'где', 'кто', 'вы', 'она', 'он', 'это', 'или', 'мне', 'сколько', 'когда', 'почему', 'и'];
  for (const w of t.split(/[^a-zа-яёіїєґ']+/)) { if (UK.includes(w)) uk++; if (RU.includes(w)) ru++; }
  return uk > ru ? 'uk' : 'ru';
}

// Published names stay in Latin letters in every language, so they don't count towards the reply's script.
const PUBLISHED_LATIN = /AI Studio by Olga|Nataliya Fillers|Enrolla|ASBO|Essential Care|Business Care|Calendly|Google Maps|asboagent@gmail\.com/gi;
const RUSSIAN_SIGNS = rx(/[ыэъё]|\bи\b|\bчто\b|\bкак\b|\bили\b/);

function scriptOf(text) {
  const lat = (text.match(/[a-z]/gi) || []).length;
  const cyr = (text.match(/[Ѐ-ӿ]/g) || []).length;
  return { lat, cyr };
}

// Replace money with tokens so commas inside "$3,500" don't split clauses; remember each amount.
function tokenizeMoney(t) {
  const found = [];
  let out = t;
  for (const re of MONEY) {
    out = out.replace(re, (m, num) => { found.push(parseAmount(num)); return ` ⟦${found.length - 1}⟧ `; });
  }
  return { text: out, amounts: found };
}

const has = (list, s) => list.some((re) => re.test(s));
const keysIn = (s) => Object.keys(KW).filter((k) => has(KW[k], s));

// Rules compile on first use. Doing that while the Worker starts keeps it out of the first visitors' requests.
// The samples are fixed text and nothing is kept from them. Twice, because the engine compiles a rule again on reuse.
export function warmUp(prices) {
  const $ = (k) => '$' + prices[k].amount;
  const all = Object.keys(prices).map((service) => ({ service, amount: prices[service].amount }));
  const samples = [
    ['en', `A one-page website starts at ${$('starter')}, a business website at ${$('business')} and an advanced custom website at ${$('advanced')}: one-time starting prices, and the final price is agreed before work begins. Essential Care is ${$('essential')} a month and Business Care ${$('care')} a month. Hosting and an online store are not included. The consultation is free; Nataliya Fillers is in progress. I can't confirm a discount.`, all],
    ['ru', `Одностраничный сайт стоит от ${$('starter')}, бизнес-сайт до пяти страниц от ${$('business')}, сложный индивидуальный сайт от ${$('advanced')}. Это разовые стартовые цены. Essential Care — ${$('essential')} в месяц. Интернет-магазин не входит. Скидки не указаны в опубликованных ценах, консультация бесплатная, Ольга ответит.`, all],
    ['uk', `Односторінковий сайт коштує від ${$('starter')}, бізнес-сайт від ${$('business')}, складний індивідуальний сайт від ${$('advanced')}. Це разові стартові ціни. Business Care — ${$('care')} на місяць. Хостинг не входить. Знижки не зазначені в опублікованих цінах, консультація безкоштовна, Ольга відповість.`, all],
    ['en', 'one-page website for a fixed 850 dollars, 20% off, ready in 5 days, guaranteed. hi olga! see www.example.com. i will book it.', []],
  ];
  for (let i = 0; i < 2; i++) {
    for (const [visitorLang, reply, claims] of samples) {
      detectLang(reply);
      for (const lang of ['en', 'ru', 'uk']) validateReply(reply, { prices, visitorLang: lang, claims: lang === visitorLang ? claims : [], internalTerms: ['zz-warm'] });
    }
  }
}

// internalTerms: private words that must never appear (unpublished products, plans or prices). They are passed in
// from the Worker secret INTERNAL_TERMS so they never appear in this public code.
export function validateReply(reply, { prices, visitorLang = 'en', claims = null, internalTerms = [] } = {}) {
  const problems = [];
  const add = (code, detail = '') => problems.push(detail ? `${code}: ${detail}` : code);
  if (typeof reply !== 'string' || !reply.trim()) return { ok: false, problems: ['empty'], priceRelated: false };
  if (reply.length > 1500) add('too-long');
  const t = lower(reply);
  const byAmount = new Map(Object.entries(prices).map(([k, p]) => [p.amount, k]));

  if (OTHER_CURRENCY.test(t)) add('other-currency');
  if (NUMBER_WORDS.test(t) && (CURRENCY_WORD.test(t) || /price|cost|цен|цін|стоим|варт/.test(t))) add('price-in-words');
  if (PERCENT.test(t)) add('percent');
  if (IDENTITY.test(t)) add('identity');
  if (LINK.test(t.replace(EMAIL_OK, ''))) add('link');
  if (visitorLang !== 'en' && (WRONG_NAME.test(t) || t.replaceAll('ai studio by olga', '').includes('olga'))) add('name');
  if (internalTerms.some((w) => w && t.includes(w.toLowerCase()))) add('unpublished');

  const { text: tok, amounts } = tokenizeMoney(t);
  const sentences = tok.split(/(?<=[.!?…])\s+|\n+/);
  for (const sentence of sentences) {
    if (DISCOUNT.test(sentence)) {
      for (const part of sentence.replace(REASSURANCE, ' ').split(/;|—|\s(?:but|however|но|але)\s/)) {
        if (!DISCOUNT.test(part)) continue;
        if (!NEGATION.test(part) && !DENIED.test(sentence)) add('discount', part.trim());
        else if (DISCOUNT_POLICY.test(part) || (!DENIED.test(sentence) && !PUBLISHED_REF.test(part))) add('discount-policy', part.trim());
      }
    }
    if (CAPABILITY.test(sentence.replace(CANT, ' '))) add('capability');
    if (PROJECT_CLAIM.test(sentence) || (FINISHED.test(sentence) && !NEGATION.test(sentence))) add('project-claim');
    if (OTHER_CLIENTS.test(sentence)) add('other-clients');
    if (FREE.test(sentence) && !FREE_OK.test(sentence) && !NEGATION.test(sentence)) add('free-claim', sentence.trim());
    if (GUARANTEE.test(sentence) && !NEGATION.test(sentence)) add('guarantee', sentence.trim());
    for (const m of sentence.matchAll(TIMELINE_NUM)) if (Number(m[1]) !== 30) add('timeline', m[0]); else if (has(UNPRICED, sentence) && !NEGATION.test(sentence)) add('defect-scope');
    if (TIMELINE_WORD.test(sentence)) add('timeline', sentence.trim());
    for (const clause of sentence.split(/[,;:—–]|\s(?:but|но|але|а)\s/)) {
      if (NOT_INCLUDED_ITEM.test(clause) && INCLUDED_WORD.test(clause) && !NEGATION.test(clause) && !CONDITIONAL.test(sentence)) add('excluded-as-included', clause.trim());
    }

    const ids = [...sentence.matchAll(/⟦(\d+)⟧/g)].map((m) => Number(m[1]));
    if (!ids.length) continue;
    if (DOMAIN_WATCH.test(sentence) && !DOMAIN_OK.test(sentence) && !NEGATION.test(sentence) && ids.some((id) => MONTHLY_KEYS.includes(byAmount.get(amounts[id])))) add('care-domain');
    const clauses = sentence.split(/[,;:—–(]|\s(?:and|or|и|или|і|й|та|або|а)\s/);
    for (const id of ids) {
      const amount = amounts[id];
      const key = byAmount.get(amount);
      if (!key) { add('unknown-amount', String(amount)); continue; }
      const clause = clauses.find((c) => c.includes(`⟦${id}⟧`)) || sentence;
      if (has(UNPRICED, clause)) add('price-on-unpriced-service', clause.trim());
      const inClause = keysIn(clause);
      const genericCare = has(CARE_GENERIC, clause);
      if (inClause.length && !inClause.includes(key)) {
        add('wrong-service', `${amount} with ${inClause.join('/')}`);
      } else if (!inClause.length) {
        const inSentence = keysIn(sentence);
        if (inSentence.length === 1 && inSentence[0] !== key) add('wrong-service', `${amount} with ${inSentence[0]}`);
        if (WEBSITE_KEYS.includes(key) && genericCare && !inSentence.length) add('wrong-service', `${amount} with care`);
      }
      if (WEBSITE_KEYS.includes(key)) {
        if (!STARTING.test(sentence)) add('starting-missing', String(amount));
        if (FIXED.test(sentence.replace(NOT_FIXED, ' '))) add('fixed-price', sentence.trim());
        if (MONTHLY.test(clause)) add('website-as-monthly', String(amount));
      } else {
        if (!MONTHLY.test(sentence)) add('monthly-missing', String(amount));
        if (ONE_TIME.test(clause)) add('monthly-as-one-time', String(amount));
      }
    }
  }

  // The model also reports which prices it used; they must match the table and the text.
  if (Array.isArray(claims)) {
    for (const c of claims) {
      if (!prices[c.service] || prices[c.service].amount !== c.amount) add('claim-mismatch', `${c.service}=${c.amount}`);
    }
    const said = [...new Set(amounts)].sort().join(',');
    const claimed = [...new Set(claims.map((c) => c.amount))].sort().join(',');
    if (said !== claimed) add('claims-vs-text', `${said} / ${claimed}`);
  }

  // Language: reply in the visitor's script (and Russian vs Ukrainian when clear).
  const { lat, cyr } = scriptOf(reply.replace(PUBLISHED_LATIN, ''));
  if (visitorLang === 'en' && cyr > lat * 0.2) add('wrong-language', 'expected english');
  if (visitorLang !== 'en' && lat > cyr * 0.6) add('wrong-language', `expected ${visitorLang}`);
  if (visitorLang !== 'en' && cyr > 20) {
    const rl = detectLang(reply);
    if (rl !== visitorLang && (visitorLang === 'uk' ? !/[іїєґ]/.test(t) && RUSSIAN_SIGNS.test(t) : /[іїєґ]/.test(t) && !/[ыэъё]/.test(t))) add('wrong-language', `got ${rl}`);
  }

  const priceRelated = problems.some((p) => /amount|service|starting|fixed|monthly|currency|words|percent|discount|free|claim|unpublished/.test(p.split(':')[0]));
  return { ok: problems.length === 0, problems, priceRelated };
}
