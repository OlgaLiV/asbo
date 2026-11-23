// One Durable Object holds every counter, so all requests for the site go through a single, strictly ordered
// place. take() runs as one synchronous SQLite transaction: no other request can run between the check and the
// increment, so concurrent requests can't push the daily total past the cap.
import { DurableObject } from 'cloudflare:workers';

export class Limiter extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS counts (k TEXT PRIMARY KEY, n INTEGER NOT NULL, exp INTEGER NOT NULL)');
  }

  // Reserves one AI reply if every limit allows it. Counts attempts, not successes (a failed model call still
  // used a slot), which keeps the spend ceiling conservative.
  take(visitor, limits, now = Date.now()) {
    const day = new Date(now).toISOString().slice(0, 10); // UTC day
    const minute = Math.floor(now / 60_000);
    const endOfDay = Date.parse(day + 'T00:00:00Z') + 86_400_000;
    const keys = { site: `site:${day}`, visitorDay: `v:${visitor}:${day}`, visitorMin: `m:${visitor}:${minute}` };
    return this.ctx.storage.transactionSync(() => {
      this.sql.exec('DELETE FROM counts WHERE exp < ?', now);
      const get = (k) => this.sql.exec('SELECT n FROM counts WHERE k = ?', k).toArray()[0]?.n ?? 0;
      const site = get(keys.site), vDay = get(keys.visitorDay), vMin = get(keys.visitorMin);
      if (site >= limits.siteDaily) return { ok: false, reason: 'site-daily', site };
      if (vDay >= limits.visitorDaily) return { ok: false, reason: 'visitor-daily', site };
      if (vMin >= limits.visitorPerMinute) return { ok: false, reason: 'visitor-minute', site };
      const bump = (k, exp) => this.sql.exec(
        'INSERT INTO counts (k, n, exp) VALUES (?, 1, ?) ON CONFLICT(k) DO UPDATE SET n = n + 1', k, exp);
      bump(keys.site, endOfDay); bump(keys.visitorDay, endOfDay); bump(keys.visitorMin, (minute + 2) * 60_000);
      return { ok: true, site: site + 1 };
    });
  }

  // Local testing only (the Worker exposes it only when DEV_MODE=1).
  reset() { this.sql.exec('DELETE FROM counts'); return true; }
  usage(now = Date.now()) {
    const day = new Date(now).toISOString().slice(0, 10);
    return this.sql.exec('SELECT n FROM counts WHERE k = ?', `site:${day}`).toArray()[0]?.n ?? 0;
  }
}
