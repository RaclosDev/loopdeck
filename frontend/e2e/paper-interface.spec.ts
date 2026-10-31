import { test, expect, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

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
    else if (path.endsWith('/notes/page')) {
      const url = new URL(route.request().url());
      const q = (url.searchParams.get('search') || '').toLowerCase();
      const tag = url.searchParams.get('tag');
      const filtered = notes.filter(
        (note) =>
          note.fieldsJson.toLowerCase().includes(q) && (!tag || note.tags.split(',').includes(tag)),
      );
      body = {
        items: filtered.map((note) => ({ note, state: 'new' })),
        total: filtered.length,
        page: 0,
        size: 25,
      };
    } else if (path.endsWith('/notes/tags')) body = ['biología'];
    else if (path.endsWith('/study/batch'))
      body = {
        items: notes.map((note, index) => ({
          note,
          card: {
            id: `card-${index}`,
            noteId: note.id,
            state: 'new',
            intervalDays: 0,
            easeFactor: 2.5,
          },
        })),
        counts: { newCount: 4, learningCount: 2, reviewCount: 3 },
        hasMore: false,
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

for (const width of [320, 390, 820, 1440]) {
  test(`separate deck sheets and study states at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await fixture(page);
    await page.route('**/api/decks', (route) =>
      route.fulfill({
        json: [
          deck,
          {
            ...deck,
            id: 'history',
            name: 'Historia · La Europa del siglo XX y sus transformaciones',
          },
          { ...deck, id: 'empty', name: 'Inglés' },
        ],
      }),
    );
    await page.route('**/api/decks/stats', (route) =>
      route.fulfill({
        json: {
          [deck.id]: { newCount: 4, learningCount: 2, reviewCount: 3, totalCount: 29 },
          history: { newCount: 0, learningCount: 0, reviewCount: 0, totalCount: 1200 },
          empty: { newCount: 0, learningCount: 0, reviewCount: 0, totalCount: 0 },
        },
      }),
    );
    for (const path of ['/', '/hub']) {
      await page.goto(path);
      const sheets = page.getByRole('article');
      await expect(sheets).toHaveCount(3);
      const biology = sheets.filter({ has: page.getByRole('heading', { name: deck.name }) });
      await expect(biology.getByText('Aprendiendo', { exact: true })).toBeVisible();
      await expect(biology.locator('dd')).toHaveText(['4', '2', '3']);
      await expect(biology).toContainText('29 tarjetas');
      await expect(sheets.filter({ hasText: 'Historia' })).toContainText('Al día');
      await expect(sheets.filter({ hasText: 'Inglés' })).toContainText('Sin tarjetas');
      const first = await sheets.nth(0).boundingBox();
      const second = await sheets.nth(1).boundingBox();
      expect(
        first!.height,
        'El mazo debe poder escanearse sin ocupar una pantalla',
      ).toBeLessThanOrEqual(300);
      expect(
        width < 900 ? second!.y - first!.y - first!.height : second!.x - first!.x - first!.width,
      ).toBeGreaterThanOrEqual(20);
      await noOverflow(page);
      await textContrast(page);
      if (process.env.LOOPDECK_SCREENSHOTS)
        await writeFile(
          `${process.env.LOOPDECK_SCREENSHOTS}/density-${width}-${path === '/' ? 'decks' : 'study'}.json`,
          JSON.stringify({ first, second }),
        );
      if (process.env.LOOPDECK_SCREENSHOTS)
        await page.screenshot({
          path: `${process.env.LOOPDECK_SCREENSHOTS}/sheets-${width}-${path === '/' ? 'decks' : 'study'}.png`,
          fullPage: true,
        });
    }
    await page
      .getByRole('article')
      .first()
      .getByRole('link', { name: /Elegir método/ })
      .focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/hub\/paper-deck$/);
    await expect(page.getByRole('heading', { name: deck.name, level: 1 })).toBeVisible();
    await expect(page.getByText('Aprendiendo', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /Repaso espaciado/ })).toHaveAttribute(
      'href',
      '/study/paper-deck',
    );
    await expect(page.getByRole('link', { name: /Guía de estudio/ })).toHaveAttribute(
      'href',
      '/hub/paper-deck/guide',
    );
    await noOverflow(page);
    await textContrast(page);
    if (process.env.LOOPDECK_SCREENSHOTS)
      await page.screenshot({
        path: `${process.env.LOOPDECK_SCREENSHOTS}/sheets-${width}-methods.png`,
        fullPage: true,
      });
  });
}

test('unavailable counts never claim the deck is up to date', async ({ page }) => {
  await fixture(page);
  await page.route('**/api/decks/stats', (route) => route.fulfill({ status: 500, json: {} }));
  for (const path of ['/', '/hub', '/hub/paper-deck']) {
    await page.goto(path);
    await expect(page.getByText('No se han podido cargar los recuentos.')).toBeVisible();
    await expect(page.getByText('Al día', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Reintentar recuentos' })).toBeVisible();
  }
  await page.route('**/api/decks/stats', (route) =>
    route.fulfill({
      json: {
        [deck.id]: { newCount: 4, learningCount: 2, reviewCount: 3, totalCount: 29 },
      },
    }),
  );
  await page.getByRole('button', { name: 'Reintentar recuentos' }).click();
  await expect(page.getByText('9 pendientes', { exact: true })).toBeVisible();
  await expect(page.locator('.study-counts dd')).toHaveText(['4', '2', '3']);
});

test('deck sheet actions and menu target the selected deck', async ({ page }) => {
  await fixture(page);
  await page.goto('/');
  const sheet = page.getByRole('article', { name: deck.name });
  await expect(sheet.getByRole('link', { name: 'Repasar (9)' })).toHaveAttribute(
    'href',
    '/study/paper-deck',
  );
  await expect(sheet.getByRole('link', { name: `Añadir tarjeta a ${deck.name}` })).toHaveAttribute(
    'href',
    '/add/paper-deck',
  );
  await expect(
    sheet.getByRole('link', { name: `Explorar tarjetas de ${deck.name}` }),
  ).toHaveAttribute('href', '/browser?deck=paper-deck');
  let updatedName = '';
  let deleted = false;
  await page.route('**/api/decks/paper-deck', async (route) => {
    if (route.request().method() === 'PUT') {
      updatedName = route.request().postDataJSON().name;
      await route.fulfill({ json: { ...deck, name: updatedName } });
    } else {
      deleted = route.request().method() === 'DELETE';
      await route.fulfill({ status: 204 });
    }
  });
  await sheet.getByRole('button', { name: /Opciones del mazo/ }).click();
  await page.getByRole('button', { name: 'Editar nombre' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Nombre del mazo' }).fill('  Biología actualizada  ');
  await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByText('Nombre actualizado', { exact: true })).toBeVisible();
  expect(updatedName).toBe('Biología actualizada');
  await page
    .getByRole('article')
    .getByRole('button', { name: /Opciones del mazo/ })
    .click();
  await page.getByRole('button', { name: 'Eliminar mazo', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(page.getByText('Mazo eliminado', { exact: true })).toBeVisible();
  expect(deleted).toBe(true);
});

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

test('empty and unavailable collections have a way forward', async ({ page }) => {
  await fixture(page);
  await page.route('**/api/decks', (route) => route.fulfill({ json: [] }));
  for (const path of ['/browser', '/add']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: 'Todavía no tienes mazos' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ir a Mis Mazos' })).toHaveAttribute('href', '/');
    await expect(page.locator('.animate-pulse')).toHaveCount(0);
  }
  await page.route('**/api/decks', (route) => route.fulfill({ status: 500, json: {} }));
  for (const path of ['/browser', '/add', '/stats']) {
    await page.goto(path);
    await expect(page.getByRole('button', { name: 'Reintentar', exact: true })).toBeVisible();
    await expect(page.getByText('Sin datos aún', { exact: true })).toHaveCount(0);
  }
});

test('editor fits narrow screens and exposes labelled inputs', async ({ page }) => {
  await fixture(page);
  for (const width of [320, 390, 820]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/add/paper-deck');
    const editor = page.getByRole('textbox', { name: 'Frente de la tarjeta' });
    await expect(editor).toBeVisible();
    const clipped = await page
      .locator('main input, main button, main [contenteditable="true"]')
      .evaluateAll((elements) =>
        elements
          .filter((element) => {
            if (!element.checkVisibility()) return false;
            const rect = element.getBoundingClientRect();
            return rect.left < 0 || rect.right > innerWidth + 1;
          })
          .map(
            (element) =>
              element.getAttribute('aria-label') || element.textContent?.trim().slice(0, 40),
          ),
      );
    expect(clipped).toEqual([]);
    await expect(page.getByRole('button', { name: /Seleccionar mazo/ })).toBeVisible();
    if (width < 768) {
      await editor.focus();
      await expect(page.locator('.mobile-bottom-nav')).toBeHidden();
    }
  }
});

test('statistics describe available cards without mislabelling the whole collection', async ({
  page,
}) => {
  await fixture(page);
  await page.route('**/api/decks/stats', (route) =>
    route.fulfill({
      json: {
        [deck.id]: { newCount: 4, learningCount: 2, reviewCount: 3, totalCount: 29, noteCount: 20 },
      },
    }),
  );
  await page.goto('/stats');
  await expect(page.getByRole('heading', { name: 'Para hoy', exact: true })).toBeVisible();
  await expect(
    page.getByText('9 tarjetas disponibles para repasar.', { exact: true }),
  ).toBeVisible();
  await expect(page.locator('.study-counts dd')).toHaveText(['4', '2', '3']);
  await page.route('**/api/decks/stats', (route) => route.fulfill({ status: 500, json: {} }));
  await page.reload();
  await expect(page.getByText('No se han podido cargar los recuentos.')).toBeVisible();
});

test('mobile navigation only exposes visible controls and study stays focused', async ({
  page,
}) => {
  await fixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Mis Mazos', exact: true })).toHaveCount(1);
  for (const path of ['/hub/paper-deck/guide', '/hub/paper-deck/explore']) {
    await page.goto(path);
    await expect(page.getByRole('navigation', { name: 'Navegación inferior' })).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  }
});

test('study modes recover from failed loads', async ({ page }) => {
  await fixture(page);
  await page.route('**/api/decks/paper-deck/notes', (route) =>
    route.fulfill({ status: 500, json: {} }),
  );
  await page.route('**/api/decks/paper-deck/study**', (route) =>
    route.fulfill({ status: 500, json: {} }),
  );
  for (const path of [
    '/study/paper-deck',
    ...['guide', 'explore', 'quiz', 'chunked', 'tutor'].map((mode) => `/hub/paper-deck/${mode}`),
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole('heading', { name: 'No se ha podido cargar el estudio' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reintentar', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Volver al mazo' })).toHaveAttribute(
      'href',
      '/hub/paper-deck',
    );
  }
  await page.unroute('**/api/decks/paper-deck/notes');
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Tutor IA/ })).toBeVisible();
});

test('empty deck offers adding cards before choosing study modes', async ({ page }) => {
  await fixture(page);
  await page.route('**/api/decks/stats', (route) =>
    route.fulfill({
      json: { [deck.id]: { newCount: 0, learningCount: 0, reviewCount: 0, totalCount: 0 } },
    }),
  );
  await page.goto('/hub/paper-deck');
  await expect(page.getByRole('heading', { name: 'Tu mazo está vacío' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Añadir tarjetas', exact: true })).toHaveAttribute(
    'href',
    '/add/paper-deck',
  );
  await expect(page.getByRole('link', { name: /Repaso espaciado/ })).toHaveCount(0);
});

test('browser filters exact tags and keeps the selected deck in its URL', async ({ page }) => {
  await fixture(page);
  await page.route('**/api/decks', (route) =>
    route.fulfill({ json: [deck, { ...deck, id: 'history', name: 'Historia' }] }),
  );
  await page.route('**/api/decks/paper-deck/notes/tags', (route) =>
    route.fulfill({ json: ['bio', 'biología'] }),
  );
  await page.route('**/api/decks/paper-deck/notes/page?**', (route) => {
    const tag = new URL(route.request().url()).searchParams.get('tag');
    const rows = notes
      .map((note, i) => ({ ...note, tags: i === 0 ? 'bio' : 'biología' }))
      .filter((note) => !tag || note.tags === tag);
    return route.fulfill({
      json: {
        items: rows.map((note) => ({ note, state: 'new' })),
        total: rows.length,
        page: 0,
        size: 25,
      },
    });
  });
  await page.goto('/browser?deck=paper-deck');
  await page.getByLabel('Etiqueta', { exact: true }).selectOption('bio');
  await expect(page.getByRole('status')).toHaveText('1 nota');
  await expect(page.getByText('Concepto 1', { exact: true })).toBeVisible();
  await expect(page.getByText('Concepto 2', { exact: true })).toHaveCount(0);
  await page.getByLabel('Mazo', { exact: true }).selectOption('history');
  await expect(page).toHaveURL(/deck=history/);
  await page.reload();
  await expect(page.getByLabel('Mazo', { exact: true })).toHaveValue('history');
});

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
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await noOverflow(page);
      await textContrast(page);
      expect(errors, path).toEqual([]);
      expect(
        await page
          .locator('.main-content-inner')
          .evaluate((el) => getComputedStyle(el).backgroundColor),
      ).toBe(
        ['/', '/hub', '/hub/paper-deck'].includes(path) ? 'rgba(0, 0, 0, 0)' : 'rgb(243, 236, 220)',
      );
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
  await page.getByRole('button', { name: 'Crear un mazo' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Crear un mazo' })).toBeFocused();
  const tape = page.getByRole('article').first();
  const angle = await tape.evaluate((el) => el.style.getPropertyValue('--tape-angle'));
  expect(Math.abs(parseFloat(angle))).toBeLessThanOrEqual(6);
  const centered = await tape.evaluate((el) =>
    Math.abs(
      parseFloat(getComputedStyle(el, '::after').left) - el.getBoundingClientRect().width / 2,
    ),
  );
  expect(centered).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: `Opciones del mazo ${deck.name}` }).click();
  await page.keyboard.press('Escape');
  expect(await tape.evaluate((el) => el.style.getPropertyValue('--tape-angle'))).toBe(angle);
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Apariencia', exact: true }).click();
  await page.getByRole('button', { name: /Claro/ }).click();
  await expect(page.locator('body')).toHaveClass('light-mode');
  await textContrast(page);
  await page.getByRole('button', { name: /Oscuro/ }).click();
  await expect(page.locator('body')).toHaveClass('dark-mode');
  await textContrast(page);
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
  await expect(page.getByRole('button', { name: 'Crear un mazo' })).toBeVisible();
});

test('deck creation, notification and study rating use local fixtures', async ({ page }) => {
  await fixture(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Crear un mazo' }).click();
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

test('browser requests bounded pages and searches the whole deck on the server', async ({
  page,
}) => {
  await fixture(page);
  const rows = Array.from({ length: 68 }, (_, i) => ({
    ...notes[0],
    id: `large-${i}`,
    fieldsJson: JSON.stringify({ front: `Pregunta ${i + 1}`, back: `Respuesta ${i + 1}` }),
  }));
  await page.route('**/api/decks/paper-deck/notes/page?**', (route) => {
    const url = new URL(route.request().url());
    const p = Number(url.searchParams.get('page'));
    expect(url.searchParams.get('size')).toBe('25');
    const q = url.searchParams.get('search') || '';
    const filtered = rows.filter((row) => row.fieldsJson.includes(q));
    return route.fulfill({
      json: {
        items: filtered.slice(p * 25, (p + 1) * 25).map((note) => ({ note, state: 'new' })),
        total: filtered.length,
        page: p,
        size: 25,
      },
    });
  });
  await page.goto('/browser?deck=paper-deck');
  await expect(page.getByRole('button', { name: 'Editar tarjeta', exact: true })).toHaveCount(25);
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await expect(page.getByText('Pregunta 26', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/page=1/);
  await page.getByLabel('Buscar', { exact: true }).fill('Pregunta 68');
  await expect(page.getByText('Pregunta 68', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Editar tarjeta', exact: true })).toHaveCount(1);
  await expect(page).not.toHaveURL(/page=/);
});

test('study continues after fifty cards and completes only after the last confirmed write', async ({
  page,
}) => {
  await fixture(page);
  const pending = Array.from({ length: 51 }, (_, i) => ({
    note: {
      ...notes[0],
      id: `large-${i}`,
      fieldsJson: JSON.stringify({ front: `Pregunta ${i + 1}`, back: `Respuesta ${i + 1}` }),
    },
    card: { id: `large-card-${i}`, state: 'new', cardOrdinal: 0, intervalDays: 0, easeFactor: 2.5 },
  }));
  let batchRequests = 0;
  const actions = new Set<string>();
  await page.route('**/api/decks/paper-deck/study/batch?**', (route) => {
    batchRequests++;
    expect(new URL(route.request().url()).searchParams.get('limit')).toBe('50');
    return route.fulfill({
      json: {
        items: pending.slice(0, 50),
        counts: { newCount: pending.length, learningCount: 0, reviewCount: 0 },
        hasMore: pending.length > 50,
      },
    });
  });
  await page.route('**/api/cards/*/review', async (route) => {
    const body = route.request().postDataJSON();
    expect(actions.has(body.requestId)).toBe(false);
    actions.add(body.requestId);
    const [reviewed] = pending.splice(0, 1);
    await route.fulfill({ json: { card: reviewed.card, reviewId: body.requestId } });
  });
  await page.goto('/study/paper-deck');
  for (let i = 0; i < 51; i++) {
    await page.getByRole('button', { name: 'Mostrar Respuesta', exact: true }).click();
    await page.getByRole('button', { name: /Fácil/ }).click();
  }
  await expect(page.getByRole('heading', { name: '¡Sesión Completada!' })).toBeVisible();
  expect(actions.size).toBe(51);
  expect(batchRequests).toBe(3);
});
