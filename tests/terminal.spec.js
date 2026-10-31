// Terminal: fits the screen, wraps long text, is usable on phones, and keeps its commands and chips.
import { test, expect } from '@playwright/test';
import { gotoReady, panel, ask, isMobile, PHONE_WIDTHS } from './helpers.js';

const LONG = {
  en: 'Pneumonoultramicroscopicsilicovolcanoconiosis https://example.com/a/very/long/path/without/any/spaces/at/all/1234567890',
  ru: 'Здравствуйте! Расскажитепожалуйстаподробнеепроваширазработкисайтовидляменяилимоегобизнеса?',
  uk: 'Доброгодня! Розкажітьбудьласкадокладнішепроваширозробкисайтівдлямогомалогобізнесу?',
};

async function openTerminal(page) {
  await page.locator('.pillnav [data-open="terminal"]').click();
  await expect(panel(page, 'terminal')).toBeVisible();
}

test.describe('fits phone screens', () => {
  test.beforeEach(async ({}, testInfo) => { test.skip(!isMobile(testInfo), 'phone widths only'); });
  for (const width of PHONE_WIDTHS) {
    test(`at ${width}px the terminal fits and long EN/RU/UK messages wrap`, async ({ page }) => {
      await page.setViewportSize({ width, height: 760 });
      await gotoReady(page);
      await openTerminal(page);
      for (const msg of Object.values(LONG)) await ask(page, msg);
      const m = await page.evaluate(() => {
        const t = document.querySelector('.terminal').getBoundingClientRect();
        const log = document.querySelector('.term-log');
        const input = document.querySelector('.term-input').getBoundingClientRect();
        return { left: t.left, right: t.right, vw: innerWidth, logOverflow: log.scrollWidth - log.clientWidth, inputRight: input.right, pageOverflow: document.documentElement.scrollWidth - innerWidth };
      });
      expect(m.left).toBeGreaterThanOrEqual(0);
      expect(m.right).toBeLessThanOrEqual(m.vw);
      expect(m.logOverflow, 'messages wider than the terminal (px)').toBe(0);
      expect(m.inputRight).toBeLessThanOrEqual(m.vw);
      expect(m.pageOverflow).toBe(0);
    });
  }

  // iOS Safari zooms into any text field smaller than 16px when it gets focus.
  test('input text is at least 16px so iPhone Safari does not auto-zoom', async ({ page }) => {
    await gotoReady(page);
    await openTerminal(page);
    const px = await page.locator('#q').evaluate((i) => parseFloat(getComputedStyle(i).fontSize));
    expect(px).toBeGreaterThanOrEqual(16);
  });

  test('terminal height follows the visible screen (dynamic viewport units)', async ({ page }) => {
    await gotoReady(page);
    await openTerminal(page);
    const h = await page.evaluate(() => [document.querySelector('.terminal').getBoundingClientRect().height, innerHeight]);
    expect(h[0]).toBeLessThanOrEqual(h[1]);
  });
});

test('scrolling the conversation does not scroll the page behind it', async ({ page }, testInfo) => {
  await gotoReady(page);
  await openTerminal(page);
  for (let i = 0; i < 6; i++) await ask(page, 'what has she built?');
  if (isMobile(testInfo)) {
    // Touch scrolling can't be simulated here; require the chat area to keep its scrolling to itself.
    const overscroll = await page.locator('.term-log').evaluate((l) => getComputedStyle(l).overscrollBehaviorY);
    expect(overscroll).toBe('contain');
    return;
  }
  const before = await page.evaluate(() => scrollY);
  await page.locator('.term-log').hover();
  await page.mouse.wheel(0, -600);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => scrollY)).toBe(before);
});

test('@smoke slash commands still work', async ({ page }) => {
  await gotoReady(page);
  await openTerminal(page);
  await ask(page, 'hello');
  await page.locator('#q').fill('/clear');
  await page.locator('#q').press('Enter');
  await expect(page.locator('.term-log .a')).toHaveCount(0);
  await page.locator('#q').fill('/work');
  await page.locator('#q').press('Enter');
  await expect(panel(page, 'work')).toBeVisible();
});

test('suggestion chips get an answer', async ({ page }) => {
  await gotoReady(page);
  await page.locator('.chip').first().click();
  await expect(panel(page, 'terminal')).toBeVisible();
  await expect(page.locator('.term-log .a').last()).not.toHaveText('');
});
