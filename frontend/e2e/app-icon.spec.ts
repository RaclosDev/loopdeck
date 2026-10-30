import { test, expect } from '@playwright/test';

test('installation uses one manifest and correctly sized paper icons', async ({
  page,
  request,
}) => {
  await page.route('**/api/auth/refresh', (route) => route.fulfill({ status: 401, json: {} }));
  await page.goto('/');
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = await (await request.get(href!)).json();
  expect(manifest.name).toBe('LoopDeck');
  expect(manifest.theme_color).toBe('#0f172a');
  for (const icon of manifest.icons) {
    const response = await request.get(icon.src);
    expect(response.ok()).toBe(true);
    const png = await response.body();
    const size = Number(icon.sizes.split('x')[0]);
    expect(png.readUInt32BE(16)).toBe(size);
    expect(png.readUInt32BE(20)).toBe(size);
  }
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    'href',
    '/apple-touch-icon-paper.png',
  );
  await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute(
    'href',
    '/app-icon.svg',
  );
});
