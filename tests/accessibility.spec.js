// Accessibility basics: automated axe scan (a supplement, not a substitute for manual review),
// keyboard reachability, accessible names, and touch-target size on phones.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { gotoReady, navClick, panel, isMobile } from './helpers.js';

// Colour contrast is checked separately below: it is a known, accepted issue (D5 in QA_PLAYBOOK.md),
// so it must not hide any other violation in these blocking scans.
const scan = (page, include, { contrast = false } = {}) => {
  let b = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']);
  b = contrast ? b.withRules(['color-contrast']) : b.disableRules(['color-contrast']);
  return (include ? b.include(include) : b).analyze();
};
const summary = (r) => r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} element(s) - ${v.help}`);

test.describe('axe scan', () => {
  test.beforeEach(async ({}, testInfo) => { test.skip(testInfo.project.name === 'mobile-chromium', 'scanned on desktop and WebKit'); });
  test('home page', async ({ page }) => {
    await gotoReady(page);
    const r = await scan(page);
    expect(summary(r)).toEqual([]);
  });
  test('Services panel', async ({ page }) => {
    await gotoReady(page);
    await navClick(page, 'services');
    const r = await scan(page, '[data-panel="services"]');
    expect(summary(r)).toEqual([]);
  });
  test('terminal', async ({ page }) => {
    await gotoReady(page);
    await page.locator('.pillnav [data-open="terminal"]').click();
    const r = await scan(page, '[data-panel="terminal"]');
    expect(summary(r)).toEqual([]);
  });

  // Known issue D5 (accepted, non-blocking): pale labels are below WCAG AA contrast.
  // Reported on every run; if it starts passing, Playwright flags it so this marker can be removed.
  test('known issue D5: colour contrast meets WCAG AA', async ({ page }) => {
    test.fail(true, 'D5: accepted for now, see QA_PLAYBOOK.md');
    await gotoReady(page);
    await navClick(page, 'services');
    const r = await scan(page, undefined, { contrast: true });
    expect(summary(r)).toEqual([]);
  });
});

test('every nav control has an accessible name', async ({ page }) => {
  await gotoReady(page);
  const unnamed = await page.$$eval('.pillnav a, .pillnav button', (els) => els
    .filter((e) => !(e.getAttribute('aria-label') || e.textContent.trim())).map((e) => e.outerHTML.slice(0, 80)));
  expect(unnamed).toEqual([]);
});

test('keyboard can reach and open Services', async ({ page }) => {
  await gotoReady(page);
  await page.locator('.pillnav [data-open="services"]').focus();
  await page.keyboard.press('Enter');
  await expect(panel(page, 'services')).toBeVisible();
  await expect(page.locator(':focus')).toBeVisible();
});

test.describe('touch targets on phones', () => {
  test.beforeEach(async ({}, testInfo) => { test.skip(!isMobile(testInfo), 'phones only'); });
  // Known issue D6 (accepted, non-blocking): reported on every run, flagged if it starts passing.
  test('known issue D6: nav buttons are at least 44x44 px (playbook target)', async ({ page }) => {
    test.fail(true, 'D6: accepted for now, see QA_PLAYBOOK.md');
    await gotoReady(page);
    const small = await page.$$eval('.pillnav a, .pillnav button', (els) => els.map((e) => {
      const r = e.getBoundingClientRect();
      return `${(e.getAttribute('aria-label') || e.textContent).trim()} ${Math.round(r.width)}x${Math.round(r.height)}`;
    }).filter((s) => { const [w, h] = s.split(' ').pop().split('x').map(Number); return w < 44 || h < 44; }));
    expect(small).toEqual([]);
  });
});
