import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/auth/refresh', (route) => route.fulfill({ status: 401, json: {} }));
});

test('the login links to password recovery and the request shows a neutral confirmation', async ({
  page,
}) => {
  let body: unknown;
  await page.route('**/api/auth/password-reset/request', (route) => {
    body = route.request().postDataJSON();
    return route.fulfill({ status: 202, json: { message: 'ok' } });
  });
  await page.goto('/login');
  await page.getByRole('link', { name: '¿Has olvidado la contraseña?' }).click();
  await expect(page).toHaveURL(/\/recuperar$/);
  await page.getByLabel('Email', { exact: true }).fill('ana@example.com');
  await page.getByRole('button', { name: 'Enviar enlace' }).click();
  await expect(page.getByRole('status')).toContainText('Si hay una cuenta con ese correo');
  expect(body).toEqual({ email: 'ana@example.com' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('the reset link sets a new password and removes the token from the address bar', async ({
  page,
}) => {
  let body: unknown;
  await page.route('**/api/auth/password-reset/confirm', (route) => {
    body = route.request().postDataJSON();
    return route.fulfill({ status: 204 });
  });
  await page.goto('/reset-password?token=token-de-prueba');
  await expect(page.getByLabel('Contraseña nueva')).toBeVisible();
  await expect(page).toHaveURL(/\/reset-password$/);
  await page.getByLabel('Contraseña nueva').fill('clave-nueva-1');
  await page.getByRole('button', { name: 'Cambiar contraseña' }).click();
  await expect(page.getByRole('heading', { name: 'Contraseña cambiada' })).toBeVisible();
  expect(body).toEqual({ token: 'token-de-prueba', newPassword: 'clave-nueva-1' });
});

test('an expired link shows the server message', async ({ page }) => {
  await page.route('**/api/auth/password-reset/confirm', (route) =>
    route.fulfill({
      status: 400,
      json: { error: 'El enlace ha caducado o ya se ha usado. Pide uno nuevo' },
    }),
  );
  await page.goto('/reset-password?token=caducado');
  await page.getByLabel('Contraseña nueva').fill('clave-nueva-1');
  await page.getByRole('button', { name: 'Cambiar contraseña' }).click();
  await expect(page.getByRole('alert')).toContainText('El enlace ha caducado');
});
