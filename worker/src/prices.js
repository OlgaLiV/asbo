// Prices for ASBO come from services.json, the same file the Services panel renders.
// The Worker reads the live file (cached briefly); if it can't be loaded or doesn't look right, it uses the copy
// bundled at deploy time. It never guesses a price.

export const PRICED_IDS = { starter: 'starter', business: 'business', advanced: 'advanced', essential: 'essential-care', care: 'business-care' };
export const WEBSITE_KEYS = ['starter', 'business', 'advanced'];
export const MONTHLY_KEYS = ['essential', 'care'];

// Returns { starter: {amount, name, kind}, ... } or null when the data is incomplete or implausible.
export function parsePrices(data) {
  try {
    const all = [...(data.websites?.packages || []), ...(data.care?.packages || [])];
    const out = {};
    for (const [key, id] of Object.entries(PRICED_IDS)) {
      const p = all.find((x) => x.id === id);
      if (!p || !Number.isInteger(p.price) || p.price <= 0 || p.price > 100000) return null;
      const monthly = p.billing === 'month';
      if (monthly !== MONTHLY_KEYS.includes(key)) return null;
      out[key] = { amount: p.price, name: p.name, tier: p.tier, kind: monthly ? 'monthly' : p.from ? 'starting' : 'fixed' };
    }
    return out;
  } catch {
    return null;
  }
}

export const usd = (n) => '$' + n.toLocaleString('en-US');

// The price table given to the model, one line per priced service.
export function priceTable(prices) {
  const label = { starter: 'One-Page Website', business: 'Business Website (up to five pages)', advanced: 'Advanced Custom Website', essential: 'Essential Care plan', care: 'Business Care plan' };
  return Object.entries(prices).map(([key, p]) => {
    const kind = p.kind === 'monthly' ? 'fixed monthly price, per month, optional, cancel any time'
      : p.kind === 'starting' ? 'one-time STARTING price for the agreed base scope; final price agreed before work begins'
      : 'one-time price';
    return `- ${label[key]} [${key}]: ${usd(p.amount)} (${kind})`;
  }).join('\n') + '\n- Custom web applications, mobile apps, AI assistants, additional development, one-off changes: NO published price (agreed individually).';
}

let cache = null; // { at, prices }
const TTL_MS = 10 * 60 * 1000;

export async function loadPrices(url, bundled, { fetchImpl = fetch, now = Date.now() } = {}) {
  if (cache && now - cache.at < TTL_MS) return { prices: cache.prices, source: 'live-cached' };
  try {
    const r = await fetchImpl(url, { cf: { cacheTtl: 300 } });
    if (!r.ok) throw new Error('status ' + r.status);
    const prices = parsePrices(await r.json());
    if (!prices) throw new Error('invalid');
    cache = { at: now, prices };
    return { prices, source: 'live' };
  } catch {
    const prices = parsePrices(bundled);
    if (!prices) throw new Error('bundled prices invalid');
    return { prices, source: 'bundled' };
  }
}

export function resetPriceCache() { cache = null; }
