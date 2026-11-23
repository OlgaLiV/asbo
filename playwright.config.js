// Playwright setup for the ASBO site. See QA_PLAYBOOK.md for what each project and suite covers.
// Viewport projects are simulations: they do not replace the real-iPhone checklist in QA_PLAYBOOK.md.
import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}/`;
export const AI_PORT = 8787; // ASBO Worker for page tests (fake model, never a paid call)
export const API_PORT = 8788; // separate Worker for limit tests, so counters don't collide

// Local ASBO Worker with the fake model. DEV_MODE enables test-only routes and headers; never set in production.
// The page-test Worker gets high per-visitor limits (parallel browsers share one local IP); the limit Worker uses
// the production limits.
const worker = (port, dir, [site, day, minute]) => ({
  command: `cd worker && npx wrangler dev --port ${port} --ip 127.0.0.1 --var FAKE_MODEL:1 --var DEV_MODE:1 `
    + `--var ALLOWED_ORIGINS:http://localhost:${PORT} --var PRICES_URL:http://localhost:${PORT}/services.json `
    + `--var INTERNAL_TERMS:testsecretproject --var SITE_DAILY:${site} --var VISITOR_DAILY:${day} --var VISITOR_PER_MINUTE:${minute} --persist-to ../.wrangler-test/${dir}`,
  url: `http://127.0.0.1:${port}/__test/usage`,
  reuseExistingServer: !process.env.CI,
  timeout: 90_000,
  env: { WRANGLER_SEND_METRICS: 'false' },
});

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Desktop browser at a common laptop size
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    // Phone layout in Chrome's engine (Android-like)
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
    // Phone layout in WebKit, Safari's engine. Closest automated check to iPhone Safari, but not a real iPhone.
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'] } },
  ],
  // Serves the repo as a static site, like GitHub Pages, plus two local ASBO Workers. Skipped against a deployed BASE_URL.
  webServer: process.env.BASE_URL ? undefined : [
    { command: `python3 -m http.server ${PORT}`, url: `http://localhost:${PORT}/`, reuseExistingServer: true, timeout: 20_000 },
    worker(AI_PORT, 'ui', [100000, 100000, 100000]),
    worker(API_PORT, 'api', [100, 30, 10]),
  ],
});
