// Asbo: Olga's robot. Typed speech, cursor-following eyes, a scripted chat terminal and overlay panels.
// Answers come only from the facts below (Olga's own notes); nothing is sent anywhere.

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const robot = $('.robot');

// ---------- Speech line ----------
const lineEl = $('[data-line]');
const idleLines = [
  "hi, i'm asbo, olga's ai. ask me anything about her work.",
  'olga spent nine years breaking software on purpose. now she builds ai agents.',
  'every assistant she builds gets a test report before launch.',
  'i speak english, russian and ukrainian. so do her assistants.',
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
const nearLines = ['oh, hello there.', 'you found me. ask me something.', "careful, i'm ticklish."];

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
  say(['boop! ask me something.', 'hehe. that tickles.', 'hi! i do a little hop when i’m happy.'][Math.floor(Math.random() * 3)]);
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
const answers = [
  { k: ['built', 'build', 'work', 'project', 'portfolio', 'made'], a: 'olga has built her own studio site and mobile app, enrolla (an admissions crm with a live demo), a website for tampa bay realtor nataliya fillers, and a real estate lead assistant prototype.', go: ['work', 'navigate_to_[work]'] },
  { k: ['enrolla', 'crm', 'college', 'admission'], a: 'enrolla puts every college enquiry in one queue and gives it to one counsellor within seconds. first replies are drafted from the programme table, and reminders stop the moment the student replies. it is checked with automated end-to-end tests.', link: ['https://enrolla-five.vercel.app', 'open_live_demo ↗'] },
  { k: ['nataliya', 'natalia', 'realtor', 'tampa'], a: "nataliya fillers is olga's first client website: a tampa bay realtor known in the russian-speaking community for being there for her clients. it's in progress now.", go: ['work', 'navigate_to_[work]'] },
  { k: ['app', 'mobile', 'studio', 'asbo', 'website'], a: 'asbo is ai studio by olga. the studio has a three-language website and an ios and android app. every lead lands in a database, her inbox and her phone.' },
  { k: ['test', 'qa', 'quality', 'launch', 'break', 'why'], a: "nine years as a qa automation engineer taught olga that 'it works on my screen' isn't good enough. every assistant is checked against your requirements, your tools and odd questions before a single client sees it, and you get the test report." },
  { k: ['price', 'cost', 'how much', 'pricing', 'package', '$'], a: 'one-time setup, in us dollars: quick-start bots from $149, ai agent packages from $399, custom automation from $249. support after launch starts at $49 a month. the exact price is agreed after a free conversation.', link: [CAL, 'book_free_consultation ↗'] },
  { k: ['help', 'business', 'salon', 'gym', 'fitness', 'real estate', 'beauty', 'hire', 'open'], a: 'probably. olga builds assistants that answer messages, qualify leads, book appointments, send reminders and follow up, for salons, studios, real estate offices and local services. the first conversation is free.', link: [CAL, 'book_free_consultation ↗'] },
  { k: ['language', 'russian', 'ukrainian', 'english', 'speak'], a: 'olga speaks english, russian and ukrainian, and so can the assistants she builds.' },
  { k: ['who', 'olga', 'about', 'background', 'experience'], a: "olga is the founder of asbo, ai studio by olga. nine years of qa automation, now building practical ai agents for small businesses. you talk to her from the first conversation to launch.", go: ['about', 'navigate_to_[about]'] },
  { k: ['contact', 'email', 'book', 'call', 'meet', 'talk'], a: 'the easiest way is a free consultation on calendly, or email asboagent@gmail.com.', link: [CAL, 'book_free_consultation ↗'] },
  { k: ['robot', 'you', 'asbo?', 'girl', 'name'], a: "i'm asbo, short for ai studio by olga. i'm a simple scripted assistant: i only answer from olga's notes, and i don't send anything anywhere." },
];
const commands = { '/work': 'work', '/about': 'about', '/contact': 'contact' };

function answer(q) {
  const t = q.toLowerCase();
  let best = null, score = 0;
  for (const item of answers) {
    const s = item.k.reduce((n, k) => n + (t.includes(k) ? k.length : 0), 0);
    if (s > score) { score = s; best = item; }
  }
  return best || { a: "i don't know that one yet. i only answer from olga's notes. try asking what she has built, how she tests, or what it costs.", link: [CAL, 'ask_olga_directly ↗'] };
}

// ---------- Terminal ----------
const log = $('[data-log]');
const input = $('#q');
function addLine(cls, text) {
  const p = document.createElement('p');
  p.className = cls;
  p.textContent = text;
  log.appendChild(p);
  log.scrollTop = log.scrollHeight;
  return p;
}
function ask(q) {
  q = q.trim();
  if (!q) return;
  addLine('q', q);
  const cmd = q.toLowerCase();
  if (cmd === '/clear') { $$('.q, .a, .state, .go', log).forEach((n) => n.remove()); return; }
  if (cmd === '/book') { addLine('a', 'opening calendly in a new tab.'); window.open(CAL, '_blank', 'noopener'); return; }
  if (cmd === '/prices') return ask('how much does it cost');
  if (commands[cmd]) { addLine('a', `opening ${cmd.slice(1)}.`); setTimeout(() => open(commands[cmd]), 350); return; }
  addLine('state', '// asbo-state · thinking');
  const res = answer(q);
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
    log.scrollTop = log.scrollHeight;
  };
  say(res.a);
  if (reduce) { a.textContent = res.a; done(); return; }
  const t = setInterval(() => {
    a.textContent = res.a.slice(0, ++i);
    log.scrollTop = log.scrollHeight;
    if (i >= res.a.length) { clearInterval(t); done(); }
  }, 14);
}
$('[data-form]').addEventListener('submit', (e) => { e.preventDefault(); ask(input.value); input.value = ''; });

// ---------- Panels ----------
let openPanel = null, lastFocus = null;
function open(name) {
  if (openPanel) close(false);
  const panel = $(`[data-panel="${name}"]`);
  if (!panel) return;
  lastFocus = document.activeElement;
  panel.hidden = false;
  openPanel = panel;
  (name === 'terminal' ? input : $('.close', panel)).focus();
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
$$('[data-q]').forEach((b) => b.addEventListener('click', () => { open('terminal'); ask(b.dataset.q); }));

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
