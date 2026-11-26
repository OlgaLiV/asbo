// Closed by default. Until the AI_ACCESS setting is exactly "open" (going live), only requests carrying the private
// test token are answered. The token is a Worker secret (TEST_TOKEN); if it is missing or short, nothing opens.
const MIN_LENGTH = 32;
const digest = async (s) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));

export async function accessAllowed(request, env) {
  if (env.AI_ACCESS === 'open') return true;
  const stored = env.TEST_TOKEN || '';
  const given = request.headers.get('x-asbo-test-token') || '';
  if (stored.length < MIN_LENGTH || given.length < MIN_LENGTH || given.length > 256) return false;
  // compare fixed-length digests without stopping early, so timing says nothing about the token
  const [a, b] = await Promise.all([digest(stored), digest(given)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
