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
      // Farther down it stays hidden, even after a small move back up near the bottom (Safari's bounce)
      if (max > 60) {
        await scrollPage(page, max);
        await scrollPage(page, max - 50);
        expect(await navShown(page), 'nav stays hidden near the bottom').toBe(false);
      }
      // Back at the top it returns and works
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

// Real-device report (iPhone Safari, 2026-11-28): after fast swipes, and near the bottom, the nav came back over the
// robot. It follows the page position, not the scroll direction: hidden once past the top area, back near the top.
// Momentum and bounce can't be produced here; they are the same small back-and-forth scroll positions tested below.
test.describe('phone nav follows the page position', () => {
  test.beforeEach(async ({}, testInfo) => { test.skip(!isMobile(testInfo), 'phone layout only'); });
  // every change of the nav's hidden state, in order
  const watch = (page) => page.evaluate(() => {
    const n = document.querySelector('.pillnav');
    window.__nav = [];
    let last = n.classList.contains('nav-away');
    new MutationObserver(() => {
      const away = n.classList.contains('nav-away');
      if (away !== last) window.__nav.push(away);
      last = away;
    }).observe(n, { attributes: true, attributeFilter: ['class'] });
  });
  const changes = (page) => page.evaluate(() => window.__nav);
  const maxScroll = (page) => page.evaluate(() => document.documentElement.scrollHeight - innerHeight);

  test('slow scroll down: hides once past the top area and stays hidden down to the bottom', async ({ page }) => {
    await gotoReady(page);
    await watch(page);
    const max = await maxScroll(page);
    for (let y = 0; y <= max; y += 12) {
      await scrollPage(page, y);
      if (y > 48) expect(await navShown(page), `shown at ${y}`).toBe(false);
    }
    await scrollPage(page, max);
    expect(await navShown(page), 'shown at the bottom').toBe(false);
    expect(await changes(page)).toEqual([true]); // hid once, never came back
  });

  test('fast swipes, momentum and bounce at the bottom never bring it back', async ({ page }) => {
    await gotoReady(page);
    await watch(page);
    const max = await maxScroll(page);
    // a flick straight to the bottom, then the overshoot settling back and forth
    for (const y of [max, max - 40, max, max - 12, max, max - 3, max]) {
      await scrollPage(page, y);
      expect(await navShown(page), `shown at ${y}`).toBe(false);
    }
    // a quick swipe back up that stops below the top area, then down again
    for (const y of [Math.min(120, max), max, Math.min(60, max), max]) {
      await scrollPage(page, y);
      expect(await navShown(page), `shown at ${y}`).toBe(false);
    }
    expect(await changes(page)).toEqual([true]);
  });

  test('returning upward: it comes back near the top, once, without flickering at the edge', async ({ page }) => {
    await gotoReady(page);
    const max = await maxScroll(page);
    await scrollPage(page, max);
    await watch(page);
    for (let y = max; y >= 30; y -= 15) {
      await scrollPage(page, y);
      expect(await navShown(page), `shown at ${y} on the way up`).toBe(false);
    }
    // hovering around the edge of the top area doesn't make it flicker
    for (const y of [40, 30, 44, 28, 36]) await scrollPage(page, y);
    expect(await changes(page)).toEqual([]);
    await scrollPage(page, 10);
    expect(await navShown(page)).toBe(true);
    await scrollPage(page, 0);
    expect(await changes(page)).toEqual([false]);
    // and it hides again on the next scroll down
    await scrollPage(page, 120);
    expect(await navShown(page)).toBe(false);
  });

  test('a reload in the middle of the page starts with the nav hidden', async ({ page }) => {
    await gotoReady(page);
    await scrollPage(page, 200);
    await page.reload();
    await page.waitForFunction(() => document.documentElement.classList.contains('robot-in'));
    await page.waitForTimeout(300);
    test.skip(await page.evaluate(() => scrollY < 100), 'this browser does not restore the scroll position on reload');
    expect(await navShown(page)).toBe(false);
  });

  test('with reduced motion it hides and returns without animating', async ({ page }) => {
    await gotoReady(page); // reduced motion
    await scrollPage(page, 200);
    const t = await page.locator('.pillnav').evaluate((n) => getComputedStyle(n).transitionDuration);
    expect(t.split(',').every((d) => parseFloat(d) === 0), t).toBe(true);
    expect(await navShown(page)).toBe(false);
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
