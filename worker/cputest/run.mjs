// CPU test of the temporary Worker. Run from the repo root:
//   node worker/cputest/run.mjs --local               rehearsal on this Mac, nothing deployed
//   node worker/cputest/run.mjs --deploy-and-remove   needs Olga's approval: deploy, measure, delete
//   node worker/cputest/run.mjs --remove              delete it, if an earlier run was interrupted
// The token is random, lives only in this process and the temporary Worker's secret, and is never printed or saved.
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { CASES } from './cases.js';

const NAME = 'asbo-chat-cputest';
const CFG = 'worker/cputest/wrangler.toml';
const HOST = `https://${NAME}.asboagent.workers.dev`;
const ORIGIN = 'https://cputest.invalid';
const ROUNDS = 3; // 15 cases x 3 = 45 requests
const mode = process.argv[2];
const token = randomBytes(32).toString('base64url');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let stop = false; // set by Ctrl+C in --deploy-and-remove
const env = { ...process.env, WRANGLER_SEND_METRICS: 'false' };
for (const k of ['ANTHROPIC_API_KEY', 'TEST_TOKEN']) delete env[k];
const clean = (s) => String(s || '').replaceAll(token, '[token]');
const wrangler = (args, input) => {
  const r = spawnSync('npx', ['wrangler', ...args], { input, env, encoding: 'utf8' });
  return { ok: r.status === 0, out: clean(r.stdout) + clean(r.stderr) };
};

const toml = readFileSync(CFG, 'utf8');
if (!toml.includes(`name = "${NAME}"`) || /ANTHROPIC_API_KEY|DEV_MODE|FAKE_MODEL|TEST_TOKEN/.test(toml)) throw new Error('unexpected config; stopping');

async function call(base, i, { withToken = true, origin = ORIGIN } = {}) {
  const started = Date.now();
  const r = await fetch(`${base}/chat`, {
    method: 'POST',
    headers: { Origin: origin, 'content-type': 'application/json', 'x-case': String(i), ...(withToken ? { 'x-asbo-test-token': token } : {}) },
    body: JSON.stringify({ message: CASES[i].q }),
    signal: AbortSignal.timeout(30_000),
  });
  const text = await r.text();
  let body = {};
  try { body = JSON.parse(text); } catch { /* not JSON: a Cloudflare error page */ }
  return { status: r.status, ok: body.ok === true, reason: body.reason, error1102: text.includes('1102'), ms: Date.now() - started, leaked: text.includes(token) };
}

// The token must not have reached Wrangler's own log files.
const began = Date.now();
function scanLogs() {
  const dir = path.join(homedir(), 'Library/Preferences/.wrangler/logs');
  const files = existsSync(dir) ? readdirSync(dir).map((f) => path.join(dir, f)).filter((f) => statSync(f).mtimeMs >= began - 1000) : [];
  const hits = files.filter((f) => readFileSync(f, 'utf8').includes(token)).length;
  console.log(`Wrangler log files from this run: ${files.length}, containing the token: ${hits}`);
  return hits === 0;
}

async function waitUntilUp(base) {
  for (let i = 0; i < 60; i++) {
    if (await fetch(`${base}/chat`).then((r) => r.status === 405, () => false)) return;
    await sleep(1000);
  }
  throw new Error('the Worker did not start');
}

// true / false / null (couldn't tell)
function exists() {
  const r = wrangler(['deployments', 'list', '--name', NAME]);
  return r.ok ? true : /10007|does not exist/i.test(r.out) ? false : null;
}

async function checkLock(base) {
  const locked = await call(base, 0, { withToken: false });
  const origin = await call(base, 0, { origin: 'https://example.com' });
  if (locked.status !== 403 || locked.reason !== 'closed' || origin.status !== 403) throw new Error('lock check failed; stopping');
  console.log('lock: refused without token (403), refused from another origin (403)');
}

async function runCases(base) {
  let wrong = 0, errors = 0, leaked = 0, n = 0;
  for (let round = 0; round < ROUNDS; round++) {
    for (let i = 0; i < CASES.length; i++) {
      if (stop) { console.log('stopped early'); return false; }
      const r = await call(base, i);
      n++;
      if (r.status >= 500 || r.error1102) errors++;
      if (r.leaked) leaked++;
      const expected = CASES[i].reject ? r.reason === 'validation' : r.ok;
      if (!expected) { wrong++; console.log(`  unexpected: case ${i} status ${r.status} reason ${r.reason}`); }
      await sleep(mode === '--local' ? 20 : 4_000); // spaced out, like the first real-model test, to include fresh starts
    }
  }
  console.log(`requests ${n}, unexpected results ${wrong}, server/CPU errors ${errors}, token seen in replies ${leaked}`);
  return wrong + errors + leaked === 0;
}

// Keeps only numbers and outcomes from the live monitor; headers, addresses and text are dropped at once.
function monitor() {
  const p = spawn('npx', ['wrangler', 'tail', NAME, '--config', CFG, '--format', 'json'], { env, detached: true });
  const events = [];
  let buf = '', depth = 0, start = -1, inStr = false, esc = false, pos = 0;
  p.stdout.setEncoding('utf8');
  p.stdout.on('data', (d) => {
    buf += d;
    for (; pos < buf.length; pos++) {
      const ch = buf[pos];
      if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
      if (ch === '"') inStr = depth > 0;
      else if (ch === '{') { if (depth++ === 0) start = pos; }
      else if (ch === '}' && depth && --depth === 0) {
        try {
          const o = JSON.parse(buf.slice(start, pos + 1));
          const log = JSON.stringify(o.logs ?? '');
          const kind = /locked|forbidden/.test(log) ? 'refused' : /rejected/.test(log) ? 'rejected' : /\bok\b/.test(log) ? 'answered' : 'other';
          const tag = log.match(/copy\\":\\"([0-9a-f]{8})\\",\\"nth\\":(\d+),\\"case\\":(\d+|null)/);
          events.push({ cpu: o.cpuTime, outcome: o.outcome, kind, copy: tag?.[1], nth: tag ? Number(tag[2]) : null, case: tag?.[3] === 'null' ? null : tag ? Number(tag[3]) : null });
        } catch { /* ignore */ }
        buf = buf.slice(pos + 1); pos = -1;
      }
    }
  });
  return { events, alive: () => p.exitCode === null, stop: () => { try { process.kill(-p.pid, 'SIGINT'); } catch { /* already stopped */ } } };
}

function report(events) {
  for (const kind of ['answered', 'rejected', 'refused', 'other']) {
    const a = events.filter((e) => e.kind === kind).map((e) => e.cpu).sort((x, y) => x - y);
    if (!a.length) continue;
    const at = (q) => a[Math.min(a.length - 1, Math.ceil(q * a.length) - 1)];
    console.log(`Cloudflare CPU ms, ${kind}: n ${a.length}, min ${a[0]}, median ${at(0.5)}, p95 ${at(0.95)}, max ${a.at(-1)}, over 10 ms: ${a.filter((x) => x > 10).length}`);
  }
  // A copy's first full request (refused ones are cheap and don't count) versus its later ones
  const full = events.filter((e) => e.kind !== 'refused');
  const firstNth = {};
  for (const e of full) if (e.copy && !(firstNth[e.copy] <= e.nth)) firstNth[e.copy] = e.nth;
  for (const e of full) e.first = e.copy ? e.nth === firstNth[e.copy] : null;
  for (const [label, test] of [['first full request in a fresh copy', (e) => e.first === true], ['later requests in a copy', (e) => e.first === false], ['unlabelled', (e) => e.first == null]]) {
    const a = full.filter(test).map((e) => e.cpu).sort((x, y) => x - y);
    if (a.length) console.log(`${label}: n ${a.length}, median ${a[Math.ceil(a.length / 2) - 1]}, max ${a.at(-1)}, over 10 ms: ${a.filter((x) => x > 10).length}`);
  }
  console.log(`copies of the Worker seen: ${new Set(events.map((e) => e.copy).filter(Boolean)).size}`);
  const over = events.filter((e) => e.cpu > 10).map((e) => `case ${e.case} (${e.first ? 'first in a fresh copy' : `request ${e.nth} in its copy`}) ${e.cpu} ms`);
  if (over.length) console.log('over 10 ms:', over.join('; '));
  console.log('outcomes:', JSON.stringify(events.reduce((m, e) => ({ ...m, [e.outcome]: (m[e.outcome] || 0) + 1 }), {})));
}

async function remove() {
  const r = wrangler(['delete', NAME, '--config', CFG, '--force']);
  console.log(r.ok ? 'delete: done' : `delete: FAILED\n${r.out}`);
  let gone = false;
  for (let i = 0; i < 12 && !gone; i++) {
    const res = await fetch(`${HOST}/chat`).then((x) => x.status, () => 0);
    gone = res === 404; // the Worker itself answers 405 here
    if (!gone) await sleep(5000);
  }
  const still = exists();
  console.log(`removed: address ${gone ? 'answers 404' : 'STILL RESPONDS'}, Cloudflare listing ${still === false ? 'finds no such Worker' : still ? 'STILL EXISTS' : 'could not be checked'}`);
  return r.ok && gone && still === false;
}

if (mode === '--local') {
  const port = 8795;
  // the token reaches the local Worker through the environment, not the command line
  const p = spawn('npx', ['wrangler', 'dev', '--config', CFG, '--port', String(port), '--ip', '127.0.0.1'], {
    env: { ...env, CLOUDFLARE_INCLUDE_PROCESS_ENV: 'true', TEST_TOKEN: token }, detached: true, stdio: 'ignore',
  });
  try {
    const base = `http://127.0.0.1:${port}`;
    await waitUntilUp(base);
    await checkLock(base);
    process.exitCode = (await runCases(base)) ? 0 : 1;
  } finally {
    try { process.kill(-p.pid, 'SIGINT'); } catch { /* already stopped */ }
    await sleep(1500);
    if (!scanLogs()) process.exitCode = 1;
  }
} else if (mode === '--deploy-and-remove') {
  let mon, deployed = false;
  // Ctrl+C: stop asking questions and go straight to the cleanup below, so the Worker isn't left behind
  process.on('SIGINT', () => { stop = true; console.log('stopping: finishing the current question, then deleting'); });
  // keep the Mac awake for as long as this script runs (a sleeping Mac stretched the last run from 5 to 18 minutes)
  if (process.platform === 'darwin') spawn('caffeinate', ['-i', '-w', String(process.pid)], { stdio: 'ignore' }).unref();
  try {
    if (exists() !== false) throw new Error('a Worker with this name exists, or Cloudflare could not be checked; nothing deployed');
    deployed = true; // from here on, always try to delete
    const d = wrangler(['deploy', '--config', CFG]);
    if (!d.ok) throw new Error(`deploy failed\n${d.out}`);
    // no token stored yet: the Worker must refuse everyone
    await waitUntilUp(HOST);
    await checkLock(HOST);
    if ((await call(HOST, 0)).status !== 403) throw new Error('open before the token was stored; stopping');
    const s = wrangler(['secret', 'put', 'TEST_TOKEN', '--config', CFG], token);
    if (!s.ok) throw new Error('could not store the token');
    const names = wrangler(['secret', 'list', '--config', CFG]);
    if (!names.ok || names.out.includes('ANTHROPIC')) throw new Error('unexpected secrets; stopping');
    mon = monitor();
    await sleep(15_000);
    if (!mon.alive()) throw new Error('monitor did not start');
    await checkLock(HOST);
    if (!stop) process.exitCode = (await runCases(HOST)) ? 0 : 1;
    if (!stop) await sleep(8000);
    report(mon.events);
  } catch (e) { console.log(clean(e.message)); process.exitCode = 1; } finally {
    mon?.stop();
    if (!scanLogs()) process.exitCode = 1;
    if (deployed && !(await remove())) { process.exitCode = 1; console.log('CHECK: remove it by hand in the Cloudflare dashboard'); }
  }
} else if (mode === '--remove') {
  process.exitCode = (await remove()) ? 0 : 1;
} else {
  console.log('Use --local, --deploy-and-remove (needs approval) or --remove');
  process.exitCode = 1;
}
