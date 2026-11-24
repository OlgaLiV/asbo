// The AI privacy notice: absent while AI is off (as on the live site), reachable and readable when AI is on.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { gotoReady, panel, ask, trackErrors } from './helpers.js';

const openTerminal = async (page) => {
  await page.locator('[data-open="terminal"]').first().click();
  await expect(panel(page, 'terminal')).toBeVisible();
};

test('with AI off there is no privacy line or panel @smoke', async ({ page }) => {
  await gotoReady(page);
  test.skip(!!(await page.locator('meta[name="asbo-ai-endpoint"]').getAttribute('content')), 'AI is on');
  await openTerminal(page);
  await expect(page.locator('.ai-note')).toHaveCount(0);
  await expect(panel(page, 'privacy')).toHaveCount(0);
});

test.describe('AI on', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!!process.env.BASE_URL, 'local only');
    await page.addInitScript(() => { window.ASBO_AI_ENDPOINT = 'http://127.0.0.1:8787/chat'; });
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  for (const width of [320, 375, 430, 1280]) {
    test(`notice is readable and × stays reachable at ${width}px`, async ({ page }) => {
      const errors = trackErrors(page);
      await page.setViewportSize({ width, height: width > 600 ? 800 : 640 });
      await gotoReady(page);
      await openTerminal(page);
      const link = page.locator('.ai-note button');
      await expect(link).toBeInViewport();
      const size = await link.boundingBox();
      expect(size.height).toBeGreaterThanOrEqual(44);
      expect(size.width).toBeGreaterThanOrEqual(44);
      await link.click();
      const p = panel(page, 'privacy');
      await expect(p).toBeVisible();
      const sheet = p.locator('.sheet');
      for (const l of ['ru', 'uk', 'en']) {
        await p.locator(`[data-priv-lang="${l}"]`).click();
        await expect(p.locator('.priv:visible')).toHaveCount(1);
        await expect(p.locator(`.priv[data-priv="${l}"]`)).toBeVisible();
        await expect(p.locator(`[data-priv-lang="${l}"]`)).toHaveAttribute('aria-pressed', 'true');
        expect(await sheet.evaluate((s) => s.scrollWidth - s.clientWidth)).toBeLessThanOrEqual(0);
        await sheet.evaluate((s) => { s.scrollTop = s.scrollHeight; });
        await expect(p.locator('.close')).toBeInViewport({ ratio: 1 });
        await sheet.evaluate((s) => { s.scrollTop = 0; });
      }
      expect(errors).toEqual([]);
    });
  }

  test('closing the notice (× or Escape) returns to the same conversation', async ({ page }) => {
    await gotoReady(page);
    await openTerminal(page);
    const reply = await ask(page, 'hello');
    for (const close of [() => panel(page, 'privacy').locator('.close').click(), () => page.keyboard.press('Escape')]) {
      await page.locator('.ai-note button').click();
      await expect(panel(page, 'privacy')).toBeVisible();
      await close();
      await expect(panel(page, 'privacy')).toBeHidden();
      await expect(panel(page, 'terminal')).toBeVisible();
      await expect(page.locator('.term-log .a').last()).toHaveText(reply);
      await expect(page.locator('.ai-note button')).toBeFocused();
    }
    await page.keyboard.press('Escape');
    await expect(panel(page, 'terminal')).toBeHidden();
  });

  test('/clear keeps the privacy line', async ({ page }) => {
    await gotoReady(page);
    await openTerminal(page);
    await page.locator('#q').fill('/clear');
    await page.locator('#q').press('Enter');
    await expect(page.locator('.ai-note')).toBeVisible();
  });

  test('every language states the same facts', async ({ page }) => {
    await gotoReady(page);
    for (const l of ['en', 'ru', 'uk']) {
      const t = await page.locator(`.priv[data-priv="${l}"]`).textContent();
      for (const s of ['Cloudflare', 'Anthropic', 'Claude', 'asboagent@gmail.com', '10', '30', '2']) expect(t, `${l}: ${s}`).toContain(s);
      expect(t.match(/30/g), l).toHaveLength(2);
    }
  });

  test('no accessibility violations in the notice', async ({ page }) => {
    await gotoReady(page);
    await openTerminal(page);
    await page.locator('.ai-note button').click();
    const r = await new AxeBuilder({ page }).include('[data-panel="privacy"]').withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`)).toEqual([]);
  });
});
