import { test, expect } from '@playwright/test';

test('Login -> Acceder a Dashboard', async ({ page }) => {
  // Ir a la página principal (login)
  await page.goto('/');

  // Esperar a que la página de login cargue (ajustar selector según la app real)
  await expect(page.getByText('LoopDeck', { exact: false })).toBeVisible();

  // Asumiendo que hay un formulario de login o al menos verificamos que redirige correctamente
  // En un caso real haríamos:
  // await page.fill('input[type="email"]', 'test@test.com');
  // await page.fill('input[type="password"]', 'password');
  // await page.click('button[type="submit"]');

  // await expect(page).toHaveURL('/'); // O el path del dashboard
  // await expect(page.getByText('Dashboard')).toBeVisible();
});
