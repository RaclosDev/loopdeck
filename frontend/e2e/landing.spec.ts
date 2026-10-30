import { test, expect } from '@playwright/test';

for (const width of [320, 390, 1440]) {
  test(`public landing and example at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    await page.route('**/api/auth/refresh', (route) => route.fulfill({ status: 401, json: {} }));
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Apréndelo.');
    const sample = page.getByRole('button', { name: /Tarjeta de ejemplo/ });
    await sample.click();
    await expect(sample).toHaveAttribute('aria-pressed', 'true');
    await expect(sample).toContainText('energía');
    await page.getByRole('link', { name: 'Empezar a estudiar' }).click();
    await expect(page.getByLabel('Email', { exact: true })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (process.env.LOOPDECK_SCREENSHOTS)
      await page.screenshot({
        path: `${process.env.LOOPDECK_SCREENSHOTS}/landing-${width}.png`,
        fullPage: true,
      });
  });
}
