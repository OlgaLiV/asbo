// Shared helpers for the ASBO test suites.
import { readFileSync } from 'node:fs';

export const services = JSON.parse(readFileSync(new URL('../services.json', import.meta.url)));

// Widths from the QA playbook's viewport matrix (CSS px).
export const PHONE_WIDTHS = [320, 375, 390, 430];
export const ALL_WIDTHS = [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920];

export const isMobile = (testInfo) => testInfo.project.name.startsWith('mobile');

// Collects page errors and console errors so a test can assert there were none.
export function trackErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  return errors;
}

// Opens the site and waits until the robot is shown and Services content has loaded.
// By default reduced motion is emulated, which skips the ~7 s entrance; pass { motion: true } to run it.
export async function gotoReady(page, { motion = false } = {}) {
  if (!motion) await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await page.waitForFunction(
    () => document.documentElement.classList.contains('robot-in')
      && !document.querySelector('.intro')
      && document.querySelector('[data-services] .svc-pkg'),
    null, { timeout: 30_000 },
  );
}

// Clicks a top-navigation item, scrolling the (horizontally scrollable) phone nav to it first.
export async function navClick(page, name) {
  const btn = page.locator(`.pillnav [data-open="${name}"]`);
  await btn.evaluate((b) => b.scrollIntoView({ inline: 'center', block: 'nearest' }));
  await btn.click();
}

export const panel = (page, name) => page.locator(`[data-panel="${name}"]`);

// Sends a message through the terminal and returns the text of ASBO's reply.
export async function ask(page, text) {
  const before = await page.locator('.term-log .a').count();
  await page.locator('#q').fill(text);
  await page.locator('#q').press('Enter');
  await page.waitForFunction((n) => {
    const a = document.querySelectorAll('.term-log .a');
    return a.length > n && a[a.length - 1].textContent.length > 0
      && !document.querySelector('.robot.talking');
  }, before, { timeout: 15_000 });
  return page.locator('.term-log .a').last().textContent();
}
