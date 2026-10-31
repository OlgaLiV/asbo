// Navigation: every tab opens its panel, every close route works, and the nav fits phone screens.
import { test, expect } from '@playwright/test';
import { gotoReady, navClick, panel, trackErrors, PHONE_WIDTHS, ALL_WIDTHS } from './helpers.js';

for (const name of ['work', 'services', 'about', 'contact']) {
  test(`@smoke "${name}" tab opens its panel and the close button closes it`, async ({ page }) => {
    const errors = trackErrors(page);
    await gotoReady(page);
    await navClick(page, name);
    await expect(panel(page, name)).toBeVisible();
    await panel(page, name).locator('.close').click();
    await expect(panel(page, name)).toBeHidden();
    expect(errors).toEqual([]);
  });
}

test('chat icon opens the terminal', async ({ page }) => {
  await gotoReady(page);
  await page.locator('.pillnav [data-open="terminal"]').click();
  await expect(panel(page, 'terminal')).toBeVisible();
});

test('Escape and a click outside both close a panel', async ({ page }) => {
  await gotoReady(page);
  await navClick(page, 'about');
  await page.keyboard.press('Escape');
  await expect(panel(page, 'about')).toBeHidden();
  await navClick(page, 'about');
  await page.mouse.click(3, 300);
  await expect(panel(page, 'about')).toBeHidden();
});

test.describe('phone navigation stays inside the screen', () => {
  test.beforeEach(async ({}, testInfo) => { test.skip(!testInfo.project.name.startsWith('mobile'), 'phone widths only'); });
  for (const width of PHONE_WIDTHS) {
    test(`at ${width}px the nav keeps a right margin and clears the logo`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await gotoReady(page);
      const m = await page.evaluate(() => {
        const nav = document.querySelector('.pillnav').getBoundingClientRect();
        const name = document.querySelector('.id-name').getBoundingClientRect();
        return { left: nav.left, right: nav.right, vw: innerWidth, nameRight: name.right };
      });
      expect(m.right, 'nav right edge').toBeLessThanOrEqual(m.vw - 12);
      expect(m.left, 'nav must not overlap "olga."').toBeGreaterThanOrEqual(m.nameRight + 4);
      // every tab can be reached by scrolling the nav
      for (const name of ['work', 'services', 'about', 'contact']) {
        await navClick(page, name);
        await expect(panel(page, name)).toBeVisible();
        await panel(page, name).locator('.close').click();
      }
    });
  }
});

test.describe('no sideways scrolling at any width', () => {
  test.beforeEach(async ({}, testInfo) => { test.skip(testInfo.project.name !== 'desktop-chromium', 'width sweep runs once'); });
  for (const width of ALL_WIDTHS) {
    test(`home page at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await gotoReady(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    });
  }
});
