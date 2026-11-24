// Phone layout issues found on a real iPhone (2026-11-23): the nav sat on the robot while scrolling, the terminal
// slid off-screen when the keyboard opened, and panel close buttons scrolled out of reach.
// The iPhone keyboard can't be opened in these browsers, so the keyboard tests replace window.visualViewport
// with a stand-in and shrink/pan it the way iPhone Safari does. Real-device check: QA_PLAYBOOK.md.
import { test, expect } from '@playwright/test';
import { gotoReady, panel, ask, isMobile, PHONE_WIDTHS } from './helpers.js';

const rect = (page, sel) => page.locator(sel).first().evaluate((e) => {
  const r = e.getBoundingClientRect();
  return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
});
const navShown = (page) => page.locator('.pillnav').evaluate((n) => {
  const r = n.getBoundingClientRect();
  return r.bottom > 0 && getComputedStyle(n).opacity === '1' && getComputedStyle(n).pointerEvents !== 'none';
});
// Scrolls and waits until the page's own scroll handler has run (the scroll event plus a frame), instead of a fixed
// delay: on a slow machine a fixed delay can read the nav before the event arrives, or two scrolls can merge.
async function scrollPage(page, y) {
  await page.evaluate((y) => new Promise((done) => {
    if (Math.round(window.scrollY) === Math.round(Math.min(y, document.documentElement.scrollHeight - innerHeight))) return done();
    window.addEventListener('scroll', () => requestAnimationFrame(() => done()), { once: true });
    window.scrollTo(0, y);
  }), y);
}

test.describe('phone nav and the robot', () => {
  test.beforeEach(async ({}, testInfo) => { test.skip(!isMobile(testInfo), 'phone layout only'); });

  for (const [width, height] of [...PHONE_WIDTHS.map((w) => [w, 760]), [320, 568], [844, 390]]) {
    test(`at ${width}x${height} the nav never covers the robot while scrolling, and stays reachable`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await gotoReady(page);
      // Initial screen: nav shown and clear of the robot's head
      expect(await navShown(page)).toBe(true);
      expect((await rect(page, '.pillnav')).bottom).toBeLessThanOrEqual((await rect(page, '.robot-wrap')).top);
      // Scrolling down in steps: wherever the robot is, the nav is never drawn over it
      const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      for (let y = 40; y <= max; y += 60) {
        await scrollPage(page, y);
        const nav = await rect(page, '.pillnav'), robot = await rect(page, '.robot-wrap');
        const overlaps = nav.bottom > robot.top && nav.top < robot.bottom;
        if (overlaps) expect(await navShown(page), `nav drawn over the robot at scroll ${y}`).toBe(false);
      }
      // Scrolling back up brings the nav back, and it works
      if (max > 60) {
        await scrollPage(page, max);
        await scrollPage(page, max - 50);
        expect(await navShown(page), 'nav returns on scroll up').toBe(true);
      }
      await scrollPage(page, 0);
      expect(await navShown(page)).toBe(true);
      await page.locator('.pillnav [data-open="work"]').click();
      await expect(panel(page, 'work')).toBeVisible();
    });
  }

  test('a hidden nav comes back when it receives keyboard focus', async ({ page }) => {
    await gotoReady(page);
    await scrollPage(page, 100);
    await scrollPage(page, 400);
    expect(await navShown(page)).toBe(false);
    await page.locator('.pillnav [data-open="terminal"]').focus();
    expect(await navShown(page)).toBe(true);
  });
});

test('desktop: the nav never hides', async ({ page }, testInfo) => {
  test.skip(isMobile(testInfo), 'desktop only');
  await gotoReady(page);
  await page.evaluate(() => { window.scrollTo(0, 400); window.dispatchEvent(new Event('scroll')); });
  await page.waitForTimeout(80);
  expect(await navShown(page)).toBe(true);
  await expect(page.locator('.pillnav')).not.toHaveClass(/nav-away/);
});

test.describe('panel close buttons stay reachable while the panel scrolls', () => {
  for (const name of ['services', 'work', 'about', 'contact']) {
    test(`${name}: close stays in its corner at every scroll position and closes the panel`, async ({ page }, testInfo) => {
      test.slow(); // four phone widths, with every Services package and answer opened
      const widths = isMobile(testInfo) ? PHONE_WIDTHS : [1440];
      for (const width of widths) {
        await page.setViewportSize({ width, height: isMobile(testInfo) ? 700 : 900 });
        await gotoReady(page);
        await page.evaluate((n) => document.querySelector(`.pillnav [data-open="${n}"]`).click(), name);
        await expect(panel(page, name)).toBeVisible();
        if (name === 'services') { // long content: open every package and FAQ answer
          await page.$$eval('[data-panel="services"] .svc-head, [data-panel="services"] .svc-qrow', (hs) => hs.forEach((h) => { if (!h.closest('.open')) h.click(); }));
        }
        const sheet = panel(page, name).locator('.sheet');
        const corner = () => sheet.evaluate((s) => {
          const a = s.getBoundingClientRect(), c = s.querySelector('.close').getBoundingClientRect();
          const hit = document.elementFromPoint(c.left + c.width / 2, c.top + c.height / 2);
          return { top: Math.round(c.top - a.top), right: Math.round(a.right - c.right), onTop: hit === s.querySelector('.close') };
        });
        const total = await sheet.evaluate((s) => s.scrollHeight - s.clientHeight);
        for (const f of [0, 0.33, 0.66, 1]) {
          await sheet.evaluate((s, y) => { s.scrollTop = y; }, Math.round(total * f));
          await page.waitForTimeout(30);
          expect(await corner(), `${width}px, scrolled ${Math.round(f * 100)}%`).toEqual({ top: 12, right: 14, onTop: true });
        }
        await panel(page, name).locator('.close').click();
        await expect(panel(page, name)).toBeHidden();
      }
    });
  }
});

test.describe('terminal with the on-screen keyboard', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo), 'phones only');
    // Stand-in for window.visualViewport that the test can shrink and pan like iPhone Safari's keyboard does
    await page.addInitScript(() => {
      // innerHeight isn't final this early in page load, so the size is read live until the test sets one
      const vv = new EventTarget();
      let kbHeight = null;
      Object.defineProperties(vv, {
        height: { get: () => kbHeight ?? window.innerHeight },
        width: { get: () => window.innerWidth },
      });
      Object.assign(vv, { offsetTop: 0, offsetLeft: 0, scale: 1 });
      Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true });
      window.__kb = (h, top) => { kbHeight = h; vv.offsetTop = top; vv.dispatchEvent(new Event('resize')); };
    });
  });

  for (const width of PHONE_WIDTHS) {
    test(`at ${width}px the header, close, latest answer and input stay on screen, then restore`, async ({ page }) => {
      await page.setViewportSize({ width, height: 760 });
      await gotoReady(page);
      const closedRect = async () => { await page.locator('.pillnav [data-open="terminal"]').click(); return rect(page, '.terminal'); };
      const before = await closedRect();
      for (let i = 0; i < 4; i++) await ask(page, 'can she help my business?'); // long conversation; answers end with a button
      // keyboard opens: the visible area is 330px tall and iOS has panned the page 320px down
      const vis = { top: 320, bottom: 650 };
      await page.evaluate(() => window.__kb(330, 320));
      // the chat re-scrolls one frame after the resize; give a slow machine time instead of a fixed wait
      await expect.poll(async () => {
        const go = await page.locator('.term-log .go').last().evaluate((e) => e.getBoundingClientRect().toJSON()), log = await rect(page, '.term-log');
        return go.bottom <= log.bottom + 1 && go.top >= log.top;
      }, { message: 'latest answer button is above the input, not under it', timeout: 10_000 }).toBe(true);
      const term = await rect(page, '.terminal'), close = await rect(page, '.terminal .close'), input = await rect(page, '.term-input');
      for (const [n, r] of Object.entries({ terminal: term, close, input })) {
        expect(r.top, `${n} top`).toBeGreaterThanOrEqual(vis.top);
        expect(r.bottom, `${n} bottom`).toBeLessThanOrEqual(vis.bottom);
      }
      // the close button still works with the keyboard open
      expect(await page.locator('.terminal .close').evaluate((c) => {
        const r = c.getBoundingClientRect();
        return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === c;
      })).toBe(true);
      // keyboard closes: back to the original size and place
      await page.evaluate(() => window.__kb(null, 0));
      await page.waitForTimeout(100);
      const after = await rect(page, '.terminal');
      expect(after.top).toBeCloseTo(before.top, 0);
      expect(after.bottom).toBeCloseTo(before.bottom, 0);
      await expect(page.locator('html')).not.toHaveClass(/kb-open/);
    });
  }

  test('a visitor reading earlier messages is not pulled down when the keyboard opens', async ({ page }) => {
    await gotoReady(page);
    await page.locator('.pillnav [data-open="terminal"]').click();
    for (let i = 0; i < 4; i++) await ask(page, 'can she help my business?');
    await page.locator('.term-log').evaluate((l) => new Promise((done) => {
      l.addEventListener('scroll', () => requestAnimationFrame(() => done()), { once: true });
      l.scrollTop = 0;
    }));
    await page.evaluate(() => window.__kb(330, 320));
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    expect(await page.locator('.term-log').evaluate((l) => l.scrollTop)).toBeLessThan(40);
  });

  test('a suggested question opens the answer without popping up the keyboard', async ({ page }) => {
    await gotoReady(page);
    await page.locator('.chip').first().click();
    await expect(panel(page, 'terminal')).toBeVisible();
    await expect(page.locator('#q')).not.toBeFocused();
    await expect(page.locator('.terminal .close')).toBeFocused();
    await page.locator('#q').tap();
    await expect(page.locator('#q')).toBeFocused();
  });
});

test('desktop: a suggested question still puts the cursor in the terminal input', async ({ page }, testInfo) => {
  test.skip(isMobile(testInfo), 'desktop only');
  await gotoReady(page);
  await page.locator('.chip').first().click();
  await expect(page.locator('#q')).toBeFocused();
});
