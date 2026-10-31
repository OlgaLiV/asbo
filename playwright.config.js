// Playwright setup for the ASBO site. See QA_PLAYBOOK.md for what each project and suite covers.
// Viewport projects are simulations: they do not replace the real-iPhone checklist in QA_PLAYBOOK.md.
import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}/`;

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
  // Serves the repo as a static site, like GitHub Pages. Skipped when testing a deployed BASE_URL.
  webServer: process.env.BASE_URL ? undefined : {
    command: `python3 -m http.server ${PORT}`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: true,
    timeout: 20_000,
  },
});
