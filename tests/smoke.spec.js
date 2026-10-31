// Smoke: the site loads, the robot appears, and nothing errors. Tagged @smoke so it also runs against the live URL.
import { test, expect } from '@playwright/test';
import { gotoReady, trackErrors } from './helpers.js';

test('@smoke home page loads with the robot and no errors', async ({ page }) => {
  const errors = trackErrors(page);
  await gotoReady(page);
  await expect(page).toHaveTitle(/ASBO/);
  await expect(page.locator('.wordmark')).toBeVisible();
  await expect(page.locator('.robot')).toBeVisible();
  await expect(page.locator('.pillnav')).toBeVisible();
  expect(errors).toEqual([]);
});

test('@smoke entrance animation finishes and reveals the robot', async ({ page }) => {
  const errors = trackErrors(page);
  await gotoReady(page, { motion: true });
  await expect(page.locator('.intro')).toHaveCount(0);
  await expect(page.locator('.fx')).toHaveCount(0); // pixel layer removed after the entrance
  await expect(page.locator('.robot')).toHaveCSS('opacity', '1');
  expect(errors).toEqual([]);
});

test('@smoke logo has no background container', async ({ page }) => {
  await gotoReady(page);
  const img = page.locator('.id-logo img');
  await expect(img).toHaveCSS('box-shadow', 'none');
  await expect(img).toHaveCSS('border-radius', '0px');
  await expect(img).toHaveCSS('object-fit', 'contain');
});
