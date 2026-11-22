import { test, expect } from '@playwright/test';

for (const width of [320, 390, 1440]) {
  test(`public landing and demo phone at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    await page.route('**/api/auth/refresh', (route) => route.fulfill({ status: 401, json: {} }));
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Tus apuntes,');
    await expect(page.locator('.ld-live__poster')).toBeVisible();
    await page.getByRole('link', { name: 'Empezar a estudiar' }).click();
    await expect(page).toHaveURL(/\/registro$/);
    await expect(page.getByLabel('Tu nombre')).toBeVisible();
    await expect(page.getByLabel('Email', { exact: true })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByRole('link', { name: /Volver/ }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Tus apuntes,');
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

test('Iniciar sesión opens /login and the browser back button returns to the landing', async ({
  page,
}) => {
  await page.route('**/api/auth/refresh', (route) => route.fulfill({ status: 401, json: {} }));
  await page.goto('/');
  await page.getByRole('link', { name: 'Iniciar sesión', exact: true }).first().click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Inicia sesión');
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Tus apuntes,');
  await page.goto('/login');
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
});

test('a private route without a session opens /login and returns there after signing in', async ({
  page,
}) => {
  await page.route('**/api/auth/refresh', (route) => route.fulfill({ status: 401, json: {} }));
  await page.goto('/stats');
  await expect(page).toHaveURL(/\/login\?next=%2Fstats$/);
  await expect(page.getByLabel('Email', { exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Crea una gratis' }).click();
  await expect(page).toHaveURL(/\/registro\?next=%2Fstats$/);
  await expect(page.getByLabel('Tu nombre')).toBeVisible();
});
