// Services & Pricing: content matches services.json, accordion rules, reset on leaving, auto-scroll to the opened package.
import { test, expect } from '@playwright/test';
import { gotoReady, navClick, panel, services } from './helpers.js';

const allPackages = [...services.websites.packages, ...(services.additional?.packages || []), ...services.care.packages];

async function openServices(page) {
  await navClick(page, 'services');
  await expect(panel(page, 'services')).toBeVisible();
}
const openCount = (page) => page.locator('[data-panel="services"] .svc-pkg.open').count();

test('@smoke panel shows every package and price from services.json', async ({ page }) => {
  await gotoReady(page);
  await openServices(page);
  const rows = panel(page, 'services').locator('.svc-pkg');
  await expect(rows).toHaveCount(allPackages.length);
  for (const [i, p] of allPackages.entries()) {
    const row = rows.nth(i);
    await expect(row.locator('.svc-name')).toHaveText(p.name);
    const price = p.quote ? 'Custom quote' : '$' + p.price.toLocaleString('en-US');
    await expect(row.locator('.svc-price')).toContainText(price);
  }
  await expect(panel(page, 'services').locator('.svc-q')).toHaveCount(services.faq.length);
});

test('only one package and one FAQ answer are open at a time', async ({ page }) => {
  await gotoReady(page);
  await openServices(page);
  const heads = panel(page, 'services').locator('.svc-pkg .svc-head');
  await heads.nth(0).click();
  await heads.nth(2).click();
  expect(await openCount(page)).toBe(1);
  await expect(heads.nth(2)).toHaveAttribute('aria-expanded', 'true');
  await expect(heads.nth(0)).toHaveAttribute('aria-expanded', 'false');
  const faq = panel(page, 'services').locator('.svc-q .svc-head');
  await faq.nth(0).click();
  await faq.nth(1).click();
  expect(await panel(page, 'services').locator('.svc-q.open').count()).toBe(1);
  // clicking the open package again collapses it
  await heads.nth(2).click();
  expect(await openCount(page)).toBe(0);
});

const leaveRoutes = {
  'close button': async (page) => panel(page, 'services').locator('.close').click(),
  'Escape key': async (page) => { for (let i = 0; i < 4 && await panel(page, 'services').isVisible(); i++) await page.keyboard.press('Escape'); },
  'click outside': async (page) => page.mouse.click(3, 300),
  'switching to Work and back': async (page) => {
    await panel(page, 'services').locator('.close').click();
    await navClick(page, 'work');
    await panel(page, 'work').locator('.close').click();
  },
};
for (const [route, leave] of Object.entries(leaveRoutes)) {
  test(`reopens fully collapsed after leaving by ${route}`, async ({ page }) => {
    await gotoReady(page);
    await openServices(page);
    await panel(page, 'services').locator('.svc-pkg .svc-head').nth(1).click();
    await panel(page, 'services').locator('.svc-q .svc-head').first().click();
    await leave(page);
    await expect(panel(page, 'services')).toBeHidden();
    await openServices(page);
    expect(await panel(page, 'services').locator('[data-svc-item].open').count()).toBe(0);
    expect(await panel(page, 'services').locator('.sheet').evaluate((s) => s.scrollTop)).toBe(0);
  });
}

// Opening a package moves it near the top of the panel's own scroll area, without scrolling the page behind.
for (const [label, index] of [['first', 0], ['middle', 2], ['near the bottom', allPackages.length - 1]]) {
  test(`opened package (${label}) scrolls to the top of the panel`, async ({ page }) => {
    await gotoReady(page);
    await openServices(page);
    const pageScroll = await page.evaluate(() => scrollY);
    const head = panel(page, 'services').locator('.svc-pkg .svc-head').nth(index);
    await head.click();
    await page.waitForTimeout(900);
    const gap = await head.evaluate((h) => h.getBoundingClientRect().top - h.closest('.sheet').getBoundingClientRect().top);
    expect(gap, 'package top distance from panel top (px)').toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThanOrEqual(120);
    expect(await page.evaluate(() => scrollY)).toBe(pageScroll);
  });
}

test('switching straight from one open package to another lands the new one at the top', async ({ page }) => {
  await gotoReady(page);
  await openServices(page);
  const heads = panel(page, 'services').locator('.svc-pkg .svc-head');
  await heads.nth(0).click();
  await page.waitForTimeout(700);
  await heads.nth(3).click();
  await page.waitForTimeout(900);
  expect(await openCount(page)).toBe(1);
  const gap = await heads.nth(3).evaluate((h) => h.getBoundingClientRect().top - h.closest('.sheet').getBoundingClientRect().top);
  expect(gap).toBeGreaterThanOrEqual(0);
  expect(gap).toBeLessThanOrEqual(120);
});

test('keyboard: Enter opens a package, Escape closes it before the panel', async ({ page }) => {
  await gotoReady(page);
  await openServices(page);
  // Focus the first package directly: Safari's default Tab key skips buttons (it needs Option+Tab).
  await panel(page, 'services').locator('.svc-pkg .svc-head').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.locator(':focus')).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  expect(await openCount(page)).toBe(0);
  await expect(panel(page, 'services')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(panel(page, 'services')).toBeHidden();
});

// Real-device report (iPhone, 2026-10-31): open Starter, scroll down without closing it, open Business —
// the panel jumped. The tapped row must only move smoothly upward to its final place, never jump.
test('switching after scrolling down: the tapped package glides without jumping', async ({ page }) => {
  await gotoReady(page, { motion: true });
  await openServices(page);
  const heads = panel(page, 'services').locator('.svc-pkg .svc-head');
  await heads.nth(0).click();
  await page.waitForTimeout(900);
  // scroll the panel so Business sits around the middle of the visible panel, Starter still open above
  await heads.nth(1).evaluate((h) => {
    const s = h.closest('.sheet');
    s.scrollTop += h.getBoundingClientRect().top - s.getBoundingClientRect().top - s.clientHeight / 2;
  });
  await page.waitForTimeout(200);
  // sample every rendered frame with its timestamp, so the check works at any frame rate
  const frames = await heads.nth(1).evaluate((h) => new Promise((resolve) => {
    const s = h.closest('.sheet');
    const gap = () => h.getBoundingClientRect().top - s.getBoundingClientRect().top;
    const out = [[performance.now(), gap()]];
    h.click();
    const t0 = performance.now();
    (function tick(now) {
      out.push([now, gap()]);
      if (now - t0 < 1000) requestAnimationFrame(tick); else resolve(out);
    })(t0);
  }));
  const gaps = frames.map((f) => Math.round(f[1]));
  let maxSpeed = 0, maxDown = 0;
  for (let i = 1; i < frames.length; i++) {
    const d = frames[i][1] - frames[i - 1][1];
    const dt = Math.max(16, frames[i][0] - frames[i - 1][0]);
    maxDown = Math.max(maxDown, d);
    maxSpeed = Math.max(maxSpeed, -d / dt);
  }
  expect(maxDown, `row moved down at some point: ${gaps}`).toBeLessThanOrEqual(1);
  // a smooth glide stays under ~2.5 px/ms; an instant jump is far faster
  expect(maxSpeed, `row jumped (px/ms): ${gaps}`).toBeLessThanOrEqual(2.5);
  expect(gaps.at(-1)).toBeGreaterThanOrEqual(0);
  expect(gaps.at(-1)).toBeLessThanOrEqual(120);
  expect(await page.locator('[data-panel="services"] .svc-pkg.open').count()).toBe(1);
});
