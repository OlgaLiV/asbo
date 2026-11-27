// Protected (locked) deployment of the live ASBO Worker, step by step. Run from the repo root, one step at a time,
// each only with Olga's approval for that step:
//   node worker/deploy/locked.mjs status            read-only: deployed version, secret NAMES, site endpoint
//   node worker/deploy/locked.mjs deploy            uploads commit 0991f6b's Worker (AI_ACCESS "closed")
//   node worker/deploy/locked.mjs check-closed      requests without a valid token must all be refused (no model, no slot)
//   node worker/deploy/locked.mjs remove-old-key    deletes the copy of the revoked ANTHROPIC_API_KEY
//   node worker/deploy/locked.mjs set-token         makes the private test token, stores it as the TEST_TOKEN secret
//   node worker/deploy/locked.mjs check-token       one request WITH the token while there is NO key: must reach the
//                                                   model step and fall back (proves the lock opens; no paid call)
//   node worker/deploy/locked.mjs kill              emergency: deletes ANTHROPIC_API_KEY and TEST_TOKEN (nothing answers)
// The token is kept only in TOKEN_FILE (outside the repo, owner-only) and the Worker secret. It is sent only in the
// x-asbo-test-token header, never in an address, a command line, the site or a log; any output is cleaned of it.
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const NAME = 'asbo-chat';
const COMMIT = '0991f6b';
const URL_CHAT = 'https://asbo-chat.asboagent.workers.dev/chat';
const ORIGIN = 'https://asboagent.com';
const TOKEN_FILE = path.join(homedir(), '.config/asbo/asbo-test-token');
const env = { ...process.env, WRANGLER_SEND_METRICS: 'false' };
delete env.ANTHROPIC_API_KEY; delete env.TEST_TOKEN;

const token = existsSync(TOKEN_FILE) ? readFileSync(TOKEN_FILE, 'utf8').trim() : '';
const clean = (s) => (token ? String(s || '').replaceAll(token, '[token]') : String(s || ''));
const wrangler = (args, input) => {
  const r = spawnSync('npx', ['wrangler', ...args], { cwd: 'worker', input, env, encoding: 'utf8' });
  return { ok: r.status === 0, out: clean(r.stdout) + clean(r.stderr) };
};
const secretNames = () => {
  const r = wrangler(['secret', 'list', '--name', NAME]);
  if (!r.ok) throw new Error('could not list secrets');
  return [...r.out.matchAll(/"name":\s*"([A-Z_]+)"/g)].map((m) => m[1]).sort();
};
const post = async (headers = {}, body = '{"message":"How much is a one-page website?"}', url = URL_CHAT) => {
  const r = await fetch(url, { method: 'POST', headers: { Origin: ORIGIN, 'content-type': 'application/json', ...headers }, body, signal: AbortSignal.timeout(20_000) });
  const text = await r.text();
  let j = {}; try { j = JSON.parse(text); } catch { /* not JSON */ }
  return { status: r.status, reason: j.reason, ok: j.ok === true, leaked: !!token && text.includes(token) };
};
const fail = (m) => { console.log(`STOP: ${m}`); process.exit(1); };

const step = process.argv[2];

if (step === 'status') {
  console.log(wrangler(['deployments', 'list', '--name', NAME]).out.split('\n').filter((l) => /Created|Version|Source/.test(l)).slice(-3).join('\n'));
  console.log('secret names:', secretNames().join(', '));
  console.log('site AI endpoint:', /name="asbo-ai-endpoint" content=""/.test(readFileSync('index.html', 'utf8')) ? 'empty (AI off on the site)' : 'NOT EMPTY');
  console.log('local token file:', existsSync(TOKEN_FILE) ? 'present' : 'none');
} else if (step === 'deploy') {
  // the files that make up the Worker must be exactly as reviewed in COMMIT (later commits may add scripts or docs)
  const same = spawnSync('git', ['diff', '--quiet', COMMIT, '--', 'worker/src', 'worker/wrangler.toml', 'services.json'], { encoding: 'utf8' }).status === 0;
  if (!same) fail(`the Worker files differ from ${COMMIT}; review the changes first`);
  if (!/^AI_ACCESS = "closed"$/m.test(readFileSync('worker/wrangler.toml', 'utf8'))) fail('wrangler.toml is not closed');
  const d = wrangler(['deploy', '--message', `locked deploy of ${COMMIT}`]);
  console.log(d.out.split('\n').filter((l) => /Uploaded|Deployed|Version ID|AI_ACCESS|https:/.test(l)).join('\n'));
  if (!d.ok) fail('deploy failed (the previous version stays live)');
  console.log('next: check-closed');
} else if (step === 'check-closed') {
  const rand = randomBytes(32).toString('base64url');
  const cases = [
    ['no token', {}],
    ['empty token', { 'x-asbo-test-token': '' }],
    ['random token', { 'x-asbo-test-token': rand }],
    ['token-like value as a bearer header', { authorization: `Bearer ${rand}` }],
    ['other website, no token', { Origin: 'https://example.com' }],
  ];
  if (token) {
    cases.push(['real token from another website', { Origin: 'https://example.com', 'x-asbo-test-token': token }]);
    cases.push(['real token minus one character', { 'x-asbo-test-token': token.slice(0, -1) }]);
  }
  let bad = 0;
  for (const [label, h] of cases) {
    const r = await post(h);
    const good = r.status === 403 && !r.ok && !r.leaked;
    if (!good) bad++;
    console.log(`${good ? 'refused' : 'NOT REFUSED'}  ${label}: ${r.status} ${r.reason ?? ''}`);
  }
  const query = await post({}, '{"message":"hi"}', `${URL_CHAT}?x-asbo-test-token=${rand}`); // a random value: never the real token in an address
  if (query.status !== 403) bad++;
  console.log(`${query.status === 403 ? 'refused' : 'NOT REFUSED'}  value in the address: ${query.status}`);
  const big = await post({}, 'x'.repeat(20_000));
  if (big.status !== 403) bad++;
  console.log(`${big.status === 403 ? 'refused' : 'NOT REFUSED'}  20 KB body without token (refused before reading): ${big.status}`);
  const pre = await fetch(URL_CHAT, { method: 'OPTIONS', headers: { Origin: ORIGIN, 'access-control-request-headers': 'x-asbo-test-token' } });
  const allow = pre.headers.get('access-control-allow-headers');
  if (allow !== 'content-type') bad++;
  console.log(`${allow === 'content-type' ? 'ok' : 'PROBLEM'}  browsers may not send the token header (allowed: ${allow})`);
  for (const p of ['/__test/usage', '/__test/reset']) {
    const s = (await fetch(URL_CHAT.replace('/chat', p), { method: p.endsWith('reset') ? 'POST' : 'GET' })).status;
    if (s !== 404) bad++;
    console.log(`${s === 404 ? 'ok' : 'PROBLEM'}  test-only route ${p}: ${s}`);
  }
  console.log(bad ? `FAILED: ${bad} check(s)` : 'all refused: nothing without the token reached the limits or the model');
  process.exitCode = bad ? 1 : 0;
} else if (step === 'remove-old-key') {
  if (!secretNames().includes('ANTHROPIC_API_KEY')) { console.log('no ANTHROPIC_API_KEY stored; nothing to do'); process.exit(0); }
  const r = wrangler(['secret', 'delete', 'ANTHROPIC_API_KEY', '--name', NAME], 'y\n');
  console.log(r.ok ? 'deleted' : `FAILED\n${r.out}`);
  console.log('secret names now:', secretNames().join(', '));
} else if (step === 'set-token') {
  if (existsSync(TOKEN_FILE)) fail(`${TOKEN_FILE} already exists; reuse it, or delete it yourself first to make a new one`);
  const t = randomBytes(32).toString('base64url'); // 43 characters
  mkdirSync(path.dirname(TOKEN_FILE), { recursive: true, mode: 0o700 });
  writeFileSync(TOKEN_FILE, t + '\n', { mode: 0o600 });
  if ((statSync(TOKEN_FILE).mode & 0o077) !== 0) fail('token file is readable by others');
  const r = spawnSync('npx', ['wrangler', 'secret', 'put', 'TEST_TOKEN', '--name', NAME], { cwd: 'worker', input: t, env, encoding: 'utf8' });
  const out = (r.stdout + r.stderr).replaceAll(t, '[token]');
  console.log(r.status === 0 ? 'TEST_TOKEN stored (value not shown)' : `FAILED\n${out}`);
  console.log('secret names now:', secretNames().join(', '));
} else if (step === 'check-token') {
  if (!token) fail('no token file; run set-token first');
  const names = secretNames();
  if (names.includes('ANTHROPIC_API_KEY')) fail('a key is stored, so this request could be paid; this check is only for the keyless stage');
  if (!names.includes('TEST_TOKEN')) fail('TEST_TOKEN is not stored');
  const r = await post({ 'x-asbo-test-token': token });
  const good = r.status === 200 && r.reason === 'unavailable' && !r.leaked;
  console.log(`${good ? 'ok' : 'PROBLEM'}  with the token and no key: ${r.status} ${r.reason ?? ''} (the lock opened, then the missing key gave the scripted fallback; one of today's 100 slots used, no paid call)`);
  process.exitCode = good ? 0 : 1;
} else if (step === 'kill') {
  for (const s of ['ANTHROPIC_API_KEY', 'TEST_TOKEN']) {
    if (!secretNames().includes(s)) { console.log(`${s}: not stored`); continue; }
    const r = wrangler(['secret', 'delete', s, '--name', NAME], 'y\n');
    console.log(`${s}: ${r.ok ? 'deleted' : 'FAILED, delete it in the Cloudflare dashboard'}`);
  }
  console.log('secret names now:', secretNames().join(', '), '| also disable the key in the Anthropic Console');
} else {
  console.log('Steps: status, deploy, check-closed, remove-old-key, set-token, check-token, kill (see the top of this file)');
  process.exitCode = 1;
}
