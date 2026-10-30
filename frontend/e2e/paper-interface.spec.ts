import { test, expect, type Page } from '@playwright/test';

const deck = {
  id: 'paper-deck',
  userId: 'fixture',
  name: 'Biología · Cuaderno de repaso',
  description: 'Datos locales de prueba',
  parentId: null,
  presetId: null,
  createdAt: '2026-10-30',
};
const notes = Array.from({ length: 4 }, (_, index) => ({
  id: `note-${index}`,
  deckId: deck.id,
  userId: 'fixture',
  noteType: 'basic',
  fieldsJson: JSON.stringify({
    front: `Concepto ${index + 1}`,
    back: `Explicación del concepto ${index + 1}`,
  }),
  tags: 'biología',
  createdAt: '2026-10-30',
  updatedAt: '2026-10-30',
}));

async function fixture(page: Page, authenticated = true) {
  const decks = [deck];
  if (authenticated)
    await page.addInitScript(() => {
      const token = `e30.${btoa(JSON.stringify({ sub: 'fixture', name: 'Prueba local', email: 'fixture@example.invalid', exp: 4102444800 }))}.fixture`;
      localStorage.setItem('loopdeck_jwt_token', token);
    });
  await page.route(/^http:\/\/[^/]+\/api\//, async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api', '');
    let body: unknown = {};
    let status = 200;
    if (path === '/auth/refresh' || path === '/auth/login' || path === '/auth/register') {
      status = 401;
      body = {};
    } else if (path === '/version') body = { version: 'fixture' };
    else if (path === '/decks') {
      if (route.request().method() === 'POST') {
        const created = { ...deck, id: 'created', ...route.request().postDataJSON() };
        decks.push(created);
        body = created;
      } else body = decks;
    } else if (path === '/decks/stats')
      body = {
        [deck.id]: { newCount: 4, learningCount: 2, reviewCount: 3, totalCount: 9, noteCount: 4 },
      };
    else if (path.endsWith('/notes')) body = notes;
    else if (path.endsWith('/card-states')) body = {};
    else if (path.endsWith('/study'))
      body = notes.map((note, index) => ({
        note,
        card: {
          id: `card-${index}`,
          noteId: note.id,
          state: 'new',
          intervalDays: 0,
          easeFactor: 2.5,
        },
      }));
    else if (path.endsWith('/document/info')) body = { hasDocument: false };
    else if (path === '/templates')
      body = [
        { id: 'biology', name: 'Biología', description: 'Plantilla local de prueba', cardCount: 4 },
      ];
    await route.fulfill({ status, json: body });
  });
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

async function textContrast(page: Page) {
  await page.locator('.fade-in').evaluateAll(async (elements) => {
    await Promise.all(
      elements.flatMap((element) => element.getAnimations()).map((animation) => animation.finished),
    );
  });
  const failures = await page.evaluate(() => {
    const rgb = (color: string) => {
      const values = color.match(/[\d.]+/g)?.map(Number) || [0, 0, 0, 0];
      return [values[0], values[1], values[2], values[3] ?? 1];
    };
    const blend = (front: number[], back: number[]) =>
      front.slice(0, 3).map((value, i) => value * front[3] + back[i] * (1 - front[3]));
    const luminance = (color: number[]) =>
      color
        .map((value) => value / 255)
        .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
        .reduce((total, value, i) => total + value * [0.2126, 0.7152, 0.0722][i], 0);
    return [...document.querySelectorAll<HTMLElement>('body *')].flatMap((element) => {
      if (
        !element.checkVisibility() ||
        ![...element.childNodes].some(
          (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
        )
      )
        return [];
      const style = getComputedStyle(element);
      if (
        ['SCRIPT', 'STYLE', 'OPTION'].includes(element.tagName) ||
        element.closest('[aria-hidden="true"], :disabled')
      )
        return [];
      const chain: Element[] = [];
      for (let parent: Element | null = element; parent; parent = parent.parentElement)
        chain.unshift(parent);
      let background = [255, 255, 255];
      let opacity = 1;
      for (const parent of chain) {
        const parentStyle = getComputedStyle(parent);
        background = blend(rgb(parentStyle.backgroundColor), background);
        opacity *= Number(parentStyle.opacity);
      }
      const foreground = rgb(style.color);
      foreground[3] *= opacity;
      const a = luminance(blend(foreground, background));
      const b = luminance(background);
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      const large =
        parseFloat(style.fontSize) >= 24 ||
        (parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700);
      return ratio + 0.01 < (large ? 3 : 4.5)
        ? [{ text: element.textContent?.trim().slice(0, 45), ratio: ratio.toFixed(2) }]
        : [];
    });
  });
  expect(failures).toEqual([]);
}

for (const width of [390, 1440]) {
  test(`all paper surfaces at ${width}px`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width, height: 960 });
    await fixture(page);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const path of [
      '/',
      '/hub',
      '/add',
      '/add/paper-deck',
      '/stats',
      '/browser',
      '/templates',
      '/settings',
      '/hub/paper-deck',
      '/hub/paper-deck/guide',
      '/hub/paper-deck/explore',
      '/hub/paper-deck/quiz',
      '/hub/paper-deck/chunked',
      '/hub/paper-deck/tutor',
      '/study/paper-deck',
    ]) {
      await page.goto(path);
      await expect(page.locator('.main-content-inner')).toBeVisible();
      await expect(page.locator('.spinner')).toHaveCount(0);
      await noOverflow(page);
      await textContrast(page);
      expect(errors, path).toEqual([]);
      expect(
        await page
          .locator('.main-content-inner')
          .evaluate((el) => getComputedStyle(el).backgroundColor),
      ).toBe('rgb(243, 236, 220)');
      if (process.env.LOOPDECK_SCREENSHOTS)
        await page.screenshot({
          path: `${process.env.LOOPDECK_SCREENSHOTS}/${width}-${path.replaceAll('/', '_') || 'dashboard'}.png`,
          fullPage: true,
          animations: 'disabled',
        });
    }
  });
}

test('login, registration and safe errors', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixture(page, false);
  await page.goto('/');
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await expect(page.getByLabel('Tu nombre')).toBeVisible();
  await page.getByLabel('Tu nombre').fill('Prueba');
  await page.getByLabel('Email', { exact: true }).fill('fixture@example.invalid');
  await page.getByLabel('Contraseña', { exact: true }).fill('fixture-only');
  await page.locator('button[type=submit]').click();
  await expect(page.getByRole('alert')).toContainText('No se ha podido crear la cuenta');
  await noOverflow(page);
  if (process.env.LOOPDECK_SCREENSHOTS)
    await page.screenshot({
      path: `${process.env.LOOPDECK_SCREENSHOTS}/login-mobile.png`,
      fullPage: true,
    });
});

test('dialog keyboard, centered stable tape, themes and reduced motion', async ({ page }) => {
  await fixture(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Nuevo Mazo' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Nuevo Mazo' })).toBeFocused();
  const tape = page.locator('.main-content-inner');
  const angle = await tape.evaluate((el) => el.style.getPropertyValue('--tape-angle'));
  expect(Math.abs(parseFloat(angle))).toBeLessThanOrEqual(6);
  const centered = await tape.evaluate((el) =>
    Math.abs(
      parseFloat(getComputedStyle(el, '::after').left) - el.getBoundingClientRect().width / 2,
    ),
  );
  expect(centered).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: 'Configuración', exact: true }).click();
  await page.getByRole('button', { name: 'Apariencia', exact: true }).click();
  await page.getByRole('button', { name: /Claro/ }).click();
  await expect(page.locator('body')).toHaveClass('light-mode');
  expect(await tape.evaluate((el) => el.style.getPropertyValue('--tape-angle'))).toBe(angle);
  await page.getByRole('button', { name: /Oscuro/ }).click();
  await expect(page.locator('body')).toHaveClass('dark-mode');
  await noOverflow(page);
});

test('mobile menu traps focus, closes with Escape, and navigates', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixture(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Más opciones' }).click();
  const menu = page.getByRole('dialog');
  await expect(menu).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  expect(await menu.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Más opciones' })).toBeFocused();
  await page.getByRole('button', { name: 'Más opciones' }).click();
  await menu.getByRole('button', { name: 'Explorar Tarjetas' }).click();
  await expect(page).toHaveURL(/\/browser$/);
  await noOverflow(page);
});

test('study cards retain readable dimensions and keyboard interaction', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await fixture(page);
  await page.goto('/hub/paper-deck/explore');
  const card = page.getByRole('button', { name: 'Voltear tarjeta', exact: true });
  await expect(card).toBeVisible();
  const bounds = await card.boundingBox();
  expect(bounds!.width).toBeGreaterThanOrEqual(250);
  expect(bounds!.height).toBeGreaterThanOrEqual(300);
  expect(
    await card
      .locator('.card')
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration)),
  ).toBeLessThanOrEqual(0.01);
  await card.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Tarjeta volteada' })).toBeVisible();
  await page.getByRole('button', { name: 'Tarjeta siguiente' }).click();
  await expect(page.getByRole('button', { name: 'Voltear tarjeta', exact: true })).toBeVisible();
  await noOverflow(page);
});

test('loading, empty and error surfaces remain usable', async ({ page }) => {
  await fixture(page);
  let release = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/decks', async (route) => {
    await pending;
    await route.fulfill({ json: [] });
  });
  await page.goto('/');
  await expect(page.locator('.animate-pulse').first()).toBeVisible();
  release();
  await expect(page.getByText('Crea tu primer mazo', { exact: true })).toBeVisible();
  await page.route('**/api/decks', (route) => route.fulfill({ status: 500, json: {} }));
  await page.reload();
  await expect(page.getByText('Error cargando mazos.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nuevo Mazo' })).toBeVisible();
});

test('deck creation, notification and study rating use local fixtures', async ({ page }) => {
  await fixture(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Nuevo Mazo' }).click();
  await page.getByRole('textbox', { name: 'Nombre del mazo' }).fill('Mazo de prueba');
  await page.getByRole('button', { name: 'Crear', exact: true }).click();
  await expect(page.getByText('Mazo creado', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mazo de prueba' })).toBeVisible();
  await page.goto('/study/paper-deck');
  const card = page.getByRole('button', { name: 'Voltear tarjeta', exact: true });
  await card.click();
  await expect(page.getByRole('button', { name: /Bien/ })).toBeVisible();
  await page.getByRole('button', { name: /Bien/ }).click();
  await expect(page.getByRole('button', { name: 'Voltear tarjeta', exact: true })).toBeVisible();
});

test('image search dialog uses paper and closes with keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixture(page);
  await page.route('https://commons.wikimedia.org/**', (route) => route.fulfill({ json: {} }));
  await page.goto('/add/paper-deck');
  await page.getByRole('button', { name: 'Buscar', exact: true }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox', { name: 'Buscar imágenes' }).fill('biología');
  await dialog.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(dialog.getByText(/No se encontraron/)).toBeVisible();
  await noOverflow(page);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('document dialog has paper, fullscreen and a recoverable local error', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixture(page);
  await page.route('**/api/decks/paper-deck/document/info', (route) =>
    route.fulfill({ json: { hasDocument: true } }),
  );
  await page.route('**/api/decks/paper-deck/document', (route) =>
    route.fulfill({ status: 404, body: '' }),
  );
  await page.goto('/hub/paper-deck');
  await page.getByRole('button', { name: /Ver Documento Original/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(/El documento no se pudo cargar/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Pantalla Completa' }).click();
  await expect(dialog.getByRole('button', { name: 'Contraer' })).toBeVisible();
  await noOverflow(page);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});
