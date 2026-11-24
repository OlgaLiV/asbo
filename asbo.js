// Asbo: Olga's robot. Typed speech, cursor-following eyes, a scripted chat terminal and overlay panels.
// Scripted answers come from asbo-intents.js. When an AI endpoint is configured (meta "asbo-ai-endpoint"),
// free-text questions go to the ASBO Worker instead, and the scripted answers become the fallback.

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const robot = $('.robot');

// ---------- Speech line ----------
const lineEl = $('[data-line]');
const idleLines = [
  "Hi, I'm ASBO, Olga's AI. Ask me anything about her work.",
  'Olga has 5+ years of experience in QA automation, breaking software on purpose. Now she builds AI agents.',
  'Every website Olga builds is tested before launch, with a short report of what was checked.',
  'I speak English, Russian and Ukrainian. So do her assistants.',
];
let typing = null;
function say(text) {
  clearInterval(typing);
  robot.classList.add('talking');
  if (reduce) { lineEl.textContent = text; robot.classList.remove('talking'); return; }
  let i = 0;
  lineEl.textContent = '';
  typing = setInterval(() => {
    lineEl.textContent = text.slice(0, ++i);
    if (i >= text.length) { clearInterval(typing); robot.classList.remove('talking'); }
  }, 28);
}
let idle = 0;
function startTalking() {
  say(idleLines[0]);
  setInterval(() => { if (!openPanel && !document.hidden) say(idleLines[++idle % idleLines.length]); }, 9000);
}

// ---------- Motion: Asbo follows the mouse or finger ----------
const part = (s) => robot.querySelector(s);
const P = {
  all: part('.rb-all'), head: part('.rb-head'), eyes: part('.rb-eyes'), tail: part('.rb-tail'), body: part('.rb-body'),
  armL: part('.rb-arm-l'), armR: part('.rb-arm-r'), floor: part('.floor'), eyeL: part('.rb-eye-l'), eyeR: part('.rb-eye-r'),
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
let tracking = true, paused = false, near = false, nearLineAt = 0, happyUntil = 0;
let lastMove = -1e9, prevX = 0, tailAngle = 0, tailVel = 0;
let blinkAt = performance.now() + 2200, blinkStart = -1, jumpStart = -1, waveStart = -1;
let revealAt = -1; // she holds the resting pose the pixels formed, then eases into motion
const nearLines = ['Oh, hello there!', 'You found me! Ask me something.', "Careful, I'm ticklish."];

function setNear(v) {
  if (v === near) return;
  near = v;
  if (v && performance.now() - nearLineAt > 20000 && !openPanel) {
    nearLineAt = performance.now();
    say(nearLines[Math.floor(Math.random() * nearLines.length)]);
  }
}
function point(x, y) {
  if (!tracking) return;
  const r = robot.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height * 0.38;
  target.x = clamp((x - cx) / (window.innerWidth * 0.42), -1, 1);
  target.y = clamp((y - cy) / (window.innerHeight * 0.5), -1, 1);
  lastMove = performance.now();
  setNear(Math.hypot(x - cx, y - cy) < r.width * 0.6);
}
window.addEventListener('pointermove', (e) => point(e.clientX, e.clientY), { passive: true });
window.addEventListener('pointerdown', (e) => point(e.clientX, e.clientY), { passive: true });
document.documentElement.addEventListener('pointerleave', () => { target.x = target.y = 0; setNear(false); });

robot.addEventListener('click', () => {
  jumpStart = performance.now();
  happyUntil = jumpStart + 1400;
  say(['Boop! Ask me something.', 'Hehe, that tickles.', 'Hi! I do a little hop when I’m happy.'][Math.floor(Math.random() * 3)]);
});

function pose(el, t) { el.setAttribute('transform', t); }
function frame(t) {
  const still = paused || reduce;
  if (!tracking) { target.x = target.y = 0; }
  else if (!still && t - lastMove > 4000) {
    // nobody is moving the mouse: look around on her own
    target.x = Math.sin(t / 1700) * 0.55;
    target.y = Math.sin(t / 2300) * 0.3;
    setNear(false);
  }
  const ease = still ? 0.25 : 0.085;
  cur.x += (target.x - cur.x) * ease;
  cur.y += (target.y - cur.y) * ease;

  const r = revealAt < 0 ? 0 : clamp((t - revealAt) / 1800, 0, 1);
  const m = r * r * (3 - 2 * r);
  const mx = cur.x * m, my = cur.y * m;
  const bob = still ? 0 : Math.sin(t / 700) * 10 * m;
  let hop = 0;
  if (jumpStart > 0 && !reduce) {
    const k = (t - jumpStart) / 650;
    if (k < 1) hop = -Math.sin(k * Math.PI) * 48; else jumpStart = -1;
  }
  const lift = bob + hop;

  pose(P.all, `translate(${mx * 20} ${lift})`);
  pose(P.body, `rotate(${mx * 5} 200 372)`);
  pose(P.head, `translate(${mx * 16} ${my * 12}) rotate(${mx * 12} 200 292)`);
  pose(P.eyes, `translate(${mx * 17} ${my * 11})`);

  // blink every few seconds
  let s = 1;
  if (!still && t > blinkAt) { blinkStart = t; blinkAt = t + 2400 + Math.random() * 3200; }
  if (blinkStart > 0) {
    const k = (t - blinkStart) / 170;
    if (k < 1) s = 1 - Math.sin(k * Math.PI) * 0.9; else blinkStart = -1;
  }
  pose(P.eyeL, `translate(0 ${204 * (1 - s)}) scale(1 ${s})`);
  pose(P.eyeR, `translate(0 ${204 * (1 - s)}) scale(1 ${s})`);

  // ponytail on a spring: it lags behind and swings
  const want = -mx * 16 - my * 6;
  tailVel = (tailVel + (want - tailAngle) * 0.05 - (mx - prevX) * 60) * 0.88;
  tailAngle += tailVel;
  prevX = mx;
  pose(P.tail, `rotate(${clamp(tailAngle, -40, 40)} 298 150)`);

  // arms: sway, and a wave hello when the page opens
  const sway = still ? 0 : Math.sin(t / 700) * 3 * m;
  pose(P.armL, `rotate(${8 * m + mx * 8 + sway} 118 324)`);
  let armR = -8 * m + mx * 8 - sway;
  if (waveStart > 0 && !reduce) {
    const k = (t - waveStart) / 1800;
    if (k >= 1) waveStart = -1;
    else if (k > 0) {
      const env = k < 0.2 ? k / 0.2 : k > 0.8 ? (1 - k) / 0.2 : 1;
      armR = armR * (1 - env) + env * (-150 + Math.sin(k * Math.PI * 8) * 16);
    }
  }
  pose(P.armR, `rotate(${armR} 282 324)`);

  const fs = 1 + lift / 140;
  pose(P.floor, `translate(${200 + mx * 20} 474) scale(${fs}) translate(-200 -474)`);
  P.floor.style.opacity = String(clamp(0.55 + fs * 0.45, 0, 1));

  robot.classList.toggle('near', near || t < happyUntil);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

$('[data-toggle="track"]').addEventListener('click', (e) => {
  tracking = !tracking;
  const b = e.currentTarget;
  b.setAttribute('aria-pressed', tracking);
  b.setAttribute('aria-label', tracking ? 'Turn off cursor tracking' : 'Turn on cursor tracking');
  b.title = b.getAttribute('aria-label');
  if (!tracking) setNear(false);
});
$('[data-toggle="motion"]').addEventListener('click', (e) => {
  paused = document.body.classList.toggle('paused');
  const b = e.currentTarget;
  b.setAttribute('aria-pressed', !paused);
  b.setAttribute('aria-label', paused ? 'Play animations' : 'Pause animations');
  b.title = b.getAttribute('aria-label');
});

// ---------- Knowledge ----------
const CAL = 'https://calendly.com/ai-studio-by-olga';
// Questions and answers in English, Russian and Ukrainian live in asbo-intents.js.
const KB = window.ASBO_INTENTS || { fallback: {}, intents: [] };
const commands = { '/work': 'work', '/services': 'services', '/about': 'about', '/contact': 'contact' };

// Prices come from services.json, the same file the Services panel uses.
let PRICES = null;
fetch('services.json').then((r) => r.json()).then((d) => {
  const all = [...d.websites.packages, ...d.care.packages];
  const usd = (id) => { const p = all.find((x) => x.id === id); return p ? '$' + p.price.toLocaleString('en-US') : null; };
  PRICES = { starter: usd('starter'), business: usd('business'), advanced: usd('advanced'), essential: usd('essential-care'), care: usd('business-care') };
}).catch(() => {});

// Language: Cyrillic means Russian or Ukrainian, told apart by letters and common words unique to each.
const UK_WORDS = new Set(['яка', 'який', 'які', 'що', 'чи', 'як', 'де', 'хто', 'ви', 'вона', 'він', 'це', 'або', 'мені', 'скільки', 'коли', 'чому', 'та', 'й']);
const RU_WORDS = new Set(['какая', 'какой', 'какие', 'что', 'ли', 'как', 'где', 'кто', 'вы', 'она', 'он', 'это', 'или', 'мне', 'сколько', 'когда', 'почему', 'и']);
function detectLang(text) {
  if (!/[Ѐ-ӿ]/.test(text)) return 'en';
  const t = text.toLowerCase();
  let uk = (t.match(/[іїєґ]/g) || []).length * 2;
  let ru = (t.match(/[ыэъё]/g) || []).length * 2;
  for (const w of t.split(/[^a-zа-яёіїєґ']+/)) { if (UK_WORDS.has(w)) uk++; if (RU_WORDS.has(w)) ru++; }
  return uk > ru ? 'uk' : 'ru';
}

const LABELS = { work: 'navigate_to_[work]', services: 'navigate_to_[services]', about: 'navigate_to_[about]' };
function resolve(intent, lang) {
  const answers = (AI_URL && intent.answerAI) || intent.answer; // e.g. "self" says "olga's ai assistant" only with AI on
  let a = answers[lang] || answers.en;
  if (/\{\w+\}/.test(a)) a = PRICES ? a.replace(/\{(\w+)\}/g, (m, k) => PRICES[k] || m) : (intent.noData[lang] || intent.noData.en);
  const res = { lang, a };
  if (intent.go) res.go = [intent.go, LABELS[intent.go]];
  if (intent.link) res.link = intent.link === 'calendly' ? [CAL, 'book_free_consultation ↗'] : [intent.link, intent.linkLabel || 'open ↗'];
  return res;
}
// Best topic for one piece of a message (longest matching stems win), or null.
function bestIntent(t) {
  let best = null, score = 0;
  for (const intent of KB.intents) {
    const keys = new Set([...(intent.keys.en || []), ...(intent.keys.ru || []), ...(intent.keys.uk || [])]);
    let s = 0;
    for (const k of keys) if (t.includes(k)) s += k.length;
    if (s > score) { score = s; best = intent; }
  }
  return best;
}

// Small talk and things ASBO can't know. Each pattern is removed from the message before topics are matched, so
// "how are you" doesn't get mistaken for a question about Olga.
const B = '(?<![\\p{L}\\p{N}])', E = '(?![\\p{L}\\p{N}])';
const rx = (s) => new RegExp(s.replace(/\\b</g, B).replace(/\\b>/g, E), 'giu');
const TALK_PATTERNS = {
  how: rx("\\b<(how are (you|u)|how're you|how('?s| is) it going|how do you do|how have you been|how('?s| is) your day|как (дела|поживаете|поживаешь|у (вас|тебя) дела|ты(?=\\s*[?!.,]|\\s*$))|як (справи|поживаєте|поживаєш|у (вас|тебе) справи|ти(?=\\s*[?!.,]|\\s*$)))\\b>"),
  self: rx("\\b<(who are (you|u)|what are you|what'?s your name|your name|are you (a |an )?(robot|bot|ai|human|real)|кто ты|ты кто|кто вы такая|как тебя зовут|как вас зовут|ты робот|хто ти|ти хто|хто ви така|як тебе звати|як вас звати|ти робот)\\b>"),
  greet: rx('\\b<(hi|hello|hey|hiya|howdy|good (morning|afternoon|evening)|(nice|pleased|glad) to meet you|приятно познакомиться|приємно познайомитися|привет|здравствуй(те)?|добрый (день|вечер)|доброе утро|привіт|вітаю|добрий (день|вечір)|доброго (дня|ранку|вечора))\\b>'),
  ack: rx('^\\s*(ok|okay|cool|great|got it|nice|i see|понятно|хорошо|ясно|ок|зрозуміло|добре|ясно)[\\s!.]*$'),
  thanks: rx('\\b<(thanks|thank you|thx|ty|спасибо|благодарю|дякую|спасибі)\\b>'),
  bye: rx('\\b<(bye|goodbye|see you|see ya|до свидания|до встречи|бувай(те)?|до побачення|до зустрічі)\\b>|^\\s*пока[\\s!.]*$'),
  weather: rx('\\b<(weather|forecast|temperature|погод\\p{L}*|прогноз\\p{L}*|температур\\p{L}*)\\b>'),
  live: rx("\\b<(what time is it|what'?s the time|today'?s date|what day is it|the news|latest news|который час|какое сегодня число|котра година|яке сьогодні число|новост\\p{L}*|новин\\p{L}*)\\b>"),
};

// What this chat has already covered, so a repeated question gets a light, varied acknowledgement instead of the
// exact same reply. Cleared by /clear and by reloading the page.
const covered = new Map();
const once = (key) => { const n = covered.get(key) || 0; covered.set(key, n + 1); return n; };
const pick = (list, n) => (Array.isArray(list) ? list[n % list.length] : list);

// Words that carry no question on their own ("hi there", "hello again", "hey ASBO").
const FILLER = new Set(['there', 'again', 'asbo', 'асбо', 'you', 'u', 'too', 'so', 'well', 'ok', 'okay', 'oh', 'and', 'friend', 'everyone', 'all', 'и', 'і', 'та', 'а', 'ну', 'тебе', 'вам', 'тобі']);
const words = (s) => (s.match(/[\p{L}\p{N}$]+/gu) || []).filter((w) => !FILLER.has(w));

// Answers every part of a message: small talk, things ASBO can't know, and each topic asked about.
function answer(q, lang = detectLang(q)) {
  const T = KB.talk || {};
  const line = (k, n = 0) => { const v = T[k] || {}; return pick(v[lang] || v.en, n); };
  let t = q.toLowerCase().replace(/[’ʼ`]/g, "'");
  const asked = {};
  for (const [k, re] of Object.entries(TALK_PATTERNS)) {
    re.lastIndex = 0;
    asked[k] = re.test(t);
    t = t.replace(re, ' ');
  }
  const outOfScope = asked.weather || asked.live;
  // the topics asked about, piece by piece, in order and without repeats; a piece of three or more words that
  // matches no topic is a question ASBO can't answer, and gets the honest "I don't know" instead of being ignored
  const topics = [];
  let unknown = false;
  for (const piece of t.split(/[.?!;\n]+|,\s*(?:and|и|і|та)\s+|\s+(?:and also|а также|а ще)\s+/)) {
    const w = words(piece);
    if (!w.length) continue;
    const intent = bestIntent(piece);
    if (intent && intent.id !== 'self') { if (!topics.includes(intent)) topics.push(intent); }
    else if (w.length >= 3) unknown = true;
  }

  const parts = [], res = { lang };
  if (asked.greet) parts.push(line(once('greet') ? 'greetAgain' : 'greet'));
  if (asked.how) { const n = once('how'); parts.push(n ? line('howAgain', n - 1) : line('how')); }
  if (asked.self) { const n = once('self'); parts.push(n ? line('selfAgain', n - 1) : line(AI_URL ? 'selfAI' : 'self')); }
  if (asked.thanks) parts.push(line('thanks', once('thanks')));
  let outFirst = false;
  for (const k of ['weather', 'live']) {
    if (!asked[k]) continue;
    const n = once(k);
    if (!n) outFirst = true;
    parts.push(n ? line(k + 'Again', n - 1) : line(k));
  }
  for (const intent of topics) {
    const n = once('topic:' + intent.id);
    if (n) parts.push(line('again', n - 1));
    const r = resolve(intent, lang);
    parts.push(r.a);
    if (r.go && !res.go) res.go = r.go;
    if (r.link && !res.link) res.link = r.link;
  }
  if (unknown && !outOfScope) {
    const n = once('fallback');
    parts.push(n ? line('fallbackAgain', n - 1) : (KB.fallback[lang] || KB.fallback.en));
    if (!res.link) res.link = [CAL, 'ask_olga_directly ↗'];
  }

  if (!topics.length && (!unknown || outOfScope)) {
    if (outOfScope) {
      if (outFirst) parts.push(line('offerOut'));
      res.link = [CAL, 'ask_olga_directly ↗'];
    } else if (asked.greet || asked.how || asked.self) {
      // first time: introduce ASBO and say what it can help with; later: just ask how to help
      if (once('intro') === 0) { if (!asked.self) parts.push(line(AI_URL ? 'selfAI' : 'self')); parts.push(line('offer')); }
      else if (!asked.bye) parts.push(line('ask'));
    } else if ((asked.thanks || asked.ack) && !asked.bye) {
      parts.push(line('anythingElse'));
    } else if (!asked.bye) {
      parts.push(KB.fallback[lang] || KB.fallback.en);
      res.link = [CAL, 'ask_olga_directly ↗'];
    }
  }
  if (asked.bye) parts.push(line('bye'));

  res.a = parts.join(' ');
  return res;
}
const scripted = (id, lang) => resolve(KB.intents.find((i) => i.id === id), lang);

// ---------- AI (optional) ----------
// Free-text questions go to the ASBO Worker when an endpoint is configured; anything else (no endpoint, network
// error, timeout, limit, a rejected reply) falls back to the approved scripted answers above.
const AI_URL = (window.ASBO_AI_ENDPOINT ?? $('meta[name="asbo-ai-endpoint"]')?.content ?? '').trim();
const AI_TIMEOUT_MS = 16000;
const MAX_QUESTION = 500;
const chatHistory = []; // text only, last 10 turns
const NOTE = {
  busy: {
    en: "My AI brain is taking a short break, so here's my standard answer:",
    ru: 'Мой ИИ-мозг взял короткий перерыв, поэтому вот мой стандартный ответ:',
    uk: 'Мій ШІ-мозок узяв коротку перерву, тож ось моя стандартна відповідь:',
  },
  limit: {
    en: "I've used up my AI answers for now, so here's my standard answer:",
    ru: 'Мои ИИ-ответы пока закончились, поэтому вот мой стандартный ответ:',
    uk: 'Мої ШІ-відповіді наразі закінчилися, тож ось моя стандартна відповідь:',
  },
  tooLong: {
    en: "That's a long one! Please keep questions under 500 characters.",
    ru: 'Длинновато! Пожалуйста, уложитесь в 500 символов.',
    uk: 'Трохи задовго! Будь ласка, вкладіться в 500 символів.',
  },
};
const ACTION = {
  work: { go: ['work', LABELS.work] }, services: { go: ['services', LABELS.services] }, about: { go: ['about', LABELS.about] },
  book: { link: [CAL, 'book_free_consultation ↗'] },
};
async function askAI(q, lang) {
  if (q.length > MAX_QUESTION) return { lang, a: NOTE.tooLong[lang] };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), AI_TIMEOUT_MS);
  let data = null;
  try {
    const r = await fetch(AI_URL, {
      method: 'POST', headers: { 'content-type': 'application/json' }, signal: ctrl.signal,
      body: JSON.stringify({ message: q, history: chatHistory.slice(-10) }),
    });
    data = await r.json();
  } catch { data = null; } finally { clearTimeout(timer); }
  if (data && data.ok && typeof data.reply === 'string') {
    chatHistory.push({ role: 'user', text: q }, { role: 'assistant', text: data.reply });
    return { lang: data.lang || lang, a: data.reply, source: 'ai', ...(ACTION[data.action] || {}) };
  }
  if (data && data.reason === 'too_long') return { lang, a: NOTE.tooLong[lang] };
  const base = data && data.fallbackIntent ? scripted(data.fallbackIntent, lang) : answer(q, lang);
  return { ...base, note: NOTE[data && data.reason === 'limit' ? 'limit' : 'busy'][lang] };
}

// ---------- Terminal ----------
const log = $('[data-log]');
const input = $('#q');
// Phones: the on-screen keyboard shrinks only the *visible* viewport; fixed elements still fill the larger layout
// viewport, and iPhone Safari pans the page to reveal the input. So the terminal's overlay is pinned to the visible
// viewport (its height and its offset), which keeps the header, close button, conversation and input on screen.
// Keep the latest message and its button in view when the chat area changes size (keyboard opening, rotation),
// unless the visitor has scrolled up to read earlier messages. A scroll that comes with a change in the chat area's
// size (keyboard, rotation, new text) is the browser re-laying it out, not the visitor, so it doesn't count.
let logAtEnd = true, logBox = '';
const box = () => `${log.clientWidth}x${log.clientHeight}x${log.scrollHeight}`;
const keepLogAtEnd = () => { if (logAtEnd) log.scrollTop = log.scrollHeight; logBox = box(); };
// The site scrolling the chat to its newest line (new message, typing): remember the size it scrolled at, so the
// resulting scroll event is not taken for a layout change, and a visitor scrolling up at that moment still counts.
const logToEnd = () => { log.scrollTop = log.scrollHeight; logAtEnd = true; logBox = box(); };
log.addEventListener('scroll', () => {
  if (box() !== logBox) { keepLogAtEnd(); return; }
  logAtEnd = log.scrollHeight - log.scrollTop - log.clientHeight < 24;
}, { passive: true });
if (window.ResizeObserver) new ResizeObserver(keepLogAtEnd).observe(log);
if (window.visualViewport) {
  const vv = window.visualViewport;
  const setVv = () => {
    const html = document.documentElement;
    html.style.setProperty('--vvh', `${Math.round(vv.height)}px`);
    html.style.setProperty('--vvtop', `${Math.round(vv.offsetTop)}px`);
    html.classList.toggle('kb-open', window.innerHeight - vv.height > 150);
    requestAnimationFrame(keepLogAtEnd);
  };
  vv.addEventListener('resize', setVv);
  vv.addEventListener('scroll', setVv);
  setVv();
}
function addLine(cls, text) {
  const p = document.createElement('p');
  p.className = cls;
  p.textContent = text;
  log.appendChild(p);
  logToEnd();
  return p;
}
function ask(q) {
  q = q.trim();
  if (!q) return;
  addLine('q', q);
  const cmd = q.toLowerCase();
  if (cmd === '/clear') { $$('.q, .a, .state, .go, .note', log).forEach((n) => n.remove()); covered.clear(); chatHistory.length = 0; return; }
  if (cmd === '/book') { addLine('a', 'Opening Calendly in a new tab.'); window.open(CAL, '_blank', 'noopener'); return; }
  if (cmd === '/prices') { addLine('state', '// asbo-state · thinking'); reply(scripted('prices', 'en')); return; }
  if (commands[cmd]) { addLine('a', `Opening ${cmd.slice(1)}.`); setTimeout(() => open(commands[cmd]), 350); return; }
  const state = addLine('state', '// asbo-state · thinking');
  if (!AI_URL) { reply(answer(q)); return; }
  let dots = 0;
  const pulse = reduce ? null : setInterval(() => { state.textContent = '// asbo-state · thinking' + '.'.repeat(++dots % 4); }, 400);
  askAI(q, detectLang(q)).then((res) => { clearInterval(pulse); state.textContent = '// asbo-state · thinking'; reply(res); });
}
// Types an answer into the terminal (same speed and buttons for scripted and AI answers).
function reply(res) {
  if (res.note) addLine('dim note', res.note);
  const a = addLine('a', '');
  let i = 0;
  const done = () => {
    if (res.go) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'go'; b.textContent = res.go[1] + ' →';
      b.addEventListener('click', () => open(res.go[0]));
      log.appendChild(b);
    }
    if (res.link) {
      const l = document.createElement('a');
      l.className = 'go'; l.href = res.link[0]; l.target = '_blank'; l.rel = 'noopener'; l.textContent = res.link[1];
      log.appendChild(l);
    }
    logToEnd();
  };
  // The speech line next to the robot shows a short version of AI answers (first sentence).
  say(res.source === 'ai' ? (res.a.match(/^.{1,160}?[.!?…](?=\s|$)/)?.[0] || res.a.slice(0, 160)) : res.a);
  if (reduce) { a.textContent = res.a; done(); return; }
  const t = setInterval(() => {
    a.textContent = res.a.slice(0, ++i);
    logToEnd();
    if (i >= res.a.length) { clearInterval(t); done(); }
  }, 14);
}
$('[data-form]').addEventListener('submit', (e) => { e.preventDefault(); ask(input.value); input.value = ''; });

// ---------- Panels ----------
let openPanel = null, lastFocus = null;
// typing: put the cursor in the terminal input. A suggested question on a touch screen asks without it, so the
// keyboard doesn't jump up over the answer; the visitor taps the input when they want to type.
function open(name, { typing = true } = {}) {
  if (openPanel) close(false);
  const panel = $(`[data-panel="${name}"]`);
  if (!panel) return;
  lastFocus = document.activeElement;
  panel.hidden = false;
  openPanel = panel;
  // Panels always open at the top (browsers would otherwise restore where the visitor left off)
  const sheet = $('.sheet', panel);
  if (sheet) sheet.scrollTop = 0;
  (name === 'terminal' && typing ? input : $('.close', panel)).focus();
}
function close(restore = true) {
  if (!openPanel) return;
  openPanel.hidden = true;
  openPanel = null;
  if (restore && lastFocus) lastFocus.focus();
}
$$('[data-open]').forEach((b) => b.addEventListener('click', () => open(b.dataset.open)));
$$('[data-close]').forEach((b) => b.addEventListener('click', () => close()));
$$('.overlay').forEach((o) => o.addEventListener('click', (e) => { if (e.target === o) close(); }));
const touch = matchMedia('(hover: none) and (pointer: coarse)');
$$('[data-q]').forEach((b) => b.addEventListener('click', () => { open('terminal', { typing: !touch.matches }); ask(b.dataset.q); }));

// Phones: the fixed nav slides up out of the way while the visitor scrolls down (so it never sits on the robot)
// and comes back as soon as they scroll up, reach the top, or tab into it.
const nav = $('.pillnav');
const phone = matchMedia('(max-width: 860px)');
let navY = window.scrollY;
window.addEventListener('scroll', () => {
  const y = window.scrollY, dy = y - navY;
  nav.classList.add('nav-auto');
  if (!phone.matches || y < 40) { nav.classList.remove('nav-away'); navY = y; return; }
  if (Math.abs(dy) < 8) return;
  nav.classList.toggle('nav-away', dy > 0);
  navY = y;
}, { passive: true });
nav.addEventListener('focusin', () => nav.classList.remove('nav-away'));

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && openPanel) { e.preventDefault(); close(); return; }
  if (e.key === '/' && !openPanel && !/input|textarea/i.test(e.target.tagName)) { e.preventDefault(); open('terminal'); }
  if (e.key === 'Tab' && openPanel) {
    const f = $$('button, a[href], input', openPanel).filter((n) => n.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

// ---------- Entrance: logo loader, then Asbo assembles from pixels ----------
const root = document.documentElement;
const fx = $('.fx');
const ctx = fx.getContext('2d');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const DYNAMIC = '.rb-all, .rb-head, .rb-eyes, .rb-tail, .rb-body, .rb-arm-l, .rb-arm-r, .floor, .rb-eye-l, .rb-eye-r';
const SPARKS = ['#00e3f8', '#5e6da8', '#e0643a', '#b21f71', '#ffffff', '#94a0dc'];

// Size the canvas to its real on-screen box (on phones this can differ from innerHeight while the
// browser toolbar shows or hides), and always clear the whole pixel buffer, not just the visible part.
function sizeFx() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  fx.width = Math.round((fx.clientWidth || innerWidth) * dpr);
  fx.height = Math.round((fx.clientHeight || innerHeight) * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function clearFx() {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, fx.width, fx.height);
  ctx.restore();
}
sizeFx();
window.addEventListener('resize', sizeFx);

// Draw the robot (in her resting pose) to an offscreen canvas and read its pixels
async function snapshot() {
  const rect = robot.getBoundingClientRect();
  const clone = robot.cloneNode(true);
  clone.querySelectorAll(DYNAMIC).forEach((n) => n.removeAttribute('transform'));
  clone.querySelectorAll('.happy').forEach((n) => n.remove());
  clone.querySelectorAll('.rb-cheek').forEach((n) => n.setAttribute('opacity', '0.35'));
  clone.setAttribute('width', rect.width);
  clone.setAttribute('height', rect.height);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
  await img.decode();
  const w = Math.round(rect.width), h = Math.round(rect.height);
  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  const o = off.getContext('2d', { willReadFrequently: true });
  o.drawImage(img, 0, 0, w, h);
  return { data: o.getImageData(0, 0, w, h).data, w, h, rect };
}

function assemble({ data, w, h, rect }, onLanding) {
  const step = Math.max(4, Math.round(w / 88));
  const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
  const spread = Math.max(innerWidth, innerHeight);
  const parts = [];
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4;
      if (data[i + 3] < 120) continue;
      const a = Math.random() * Math.PI * 2, d = (0.3 + Math.random() ** 0.7) * spread * 0.55;
      const sx = cx + Math.cos(a) * d, sy = cy + Math.sin(a) * d * 0.7;
      const tx = rect.left + x, ty = rect.top + y;
      const len = Math.hypot(tx - sx, ty - sy) || 1;
      parts.push({
        tx, ty, sx, sy,
        // unit vector across the flight path, for a gentle curve
        nx: -(ty - sy) / len, ny: (tx - sx) / len,
        curve: (Math.random() - 0.5) * 0.35 * len,
        color: `rgb(${data[i]},${data[i + 1]},${data[i + 2]})`,
        spark: SPARKS[(Math.random() * SPARKS.length) | 0],
        settle: 0.55 + Math.random() * 0.35, // when it takes its real colour
        delay: Math.random() * 700 + (y / h) * 600,
        dur: 2000 + Math.random() * 600,
        big: 1 + Math.random() * 1.6,
      });
    }
  }
  const size = step - 1;
  const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const start = performance.now();
  const end = Math.max(...parts.map((p) => p.delay + p.dur));
  return new Promise((resolve) => {
    function tick(now) {
      const el = now - start;
      clearFx();
      for (const p of parts) {
        const k = clamp((el - p.delay) / p.dur, 0, 1);
        const e = easeInOut(k);
        const bend = Math.sin(e * Math.PI) * p.curve;
        const x = p.sx + (p.tx - p.sx) * e + p.nx * bend;
        const y = p.sy + (p.ty - p.sy) * e + p.ny * bend;
        const s = (size + (k > 0.9 ? (k - 0.9) * 10 : 0)) * (p.big + (1 - p.big) * e);
        ctx.globalAlpha = Math.min(1, 0.15 + k * 2.2);
        ctx.fillStyle = k < p.settle ? p.spark : p.color;
        ctx.fillRect(x, y, s, s);
      }
      ctx.globalAlpha = 1;
      if (onLanding && el > end - 1100) { onLanding(); onLanding = null; }
      if (el < end) requestAnimationFrame(tick); else resolve();
    }
    requestAnimationFrame(tick);
  });
}

function fadeFx(ms) {
  fx.style.transition = `opacity ${ms}ms ease`;
  fx.style.opacity = '0';
  // the canvas is only used for the entrance, so remove it once the pixels have dissolved
  return wait(ms).then(() => { clearFx(); window.removeEventListener('resize', sizeFx); fx.remove(); });
}

function ready() {
  root.classList.add('ui-in', 'robot-in');
  root.classList.remove('js-intro');
  if (revealAt < 0) revealAt = performance.now();
  waveStart = performance.now() + 1400;
  startTalking();
}

async function runIntro() {
  const intro = $('.intro');
  if (reduce) { intro.remove(); ready(); return; }
  const count = $('[data-count]');
  const t0 = performance.now();
  await new Promise((done) => {
    (function c(now) {
      const k = clamp((now - t0) / 2000, 0, 1);
      const e = 1 - Math.pow(1 - k, 2);
      count.textContent = String(Math.round(e * 100)).padStart(3, '0');
      if (k < 1) requestAnimationFrame(c); else done();
    })(t0);
  });
  await wait(350);
  intro.classList.add('out');
  root.classList.add('ui-in');
  let snap = null;
  try { snap = await snapshot(); } catch (err) { snap = null; } // some browsers block reading SVG pixels; fall back to a fade
  await wait(250);
  if (snap) {
    // the real robot fades in under the last landing pixels, then the pixels dissolve
    await assemble(snap, () => { root.classList.add('robot-in'); revealAt = performance.now() + 1400; });
    await fadeFx(1400);
  } else {
    root.classList.add('robot-in');
    await wait(1000);
  }
  intro.remove();
  ready();
}
runIntro();
