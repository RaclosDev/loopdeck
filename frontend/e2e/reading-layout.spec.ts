import { test, expect, type Page } from '@playwright/test';

const deck = {
  id: 'long-deck',
  userId: 'fixture',
  name: 'Entrevista 03 · Concurrencia',
  description: '',
  parentId: null,
  presetId: null,
  createdAt: '2026-10-30',
};

const box = (color: string, body: string) =>
  `<div style="border-left:3px solid ${color};padding:0.1em 0 0.1em 0.8em;margin:0.8em 0">${body}</div>`;
const longBack =
  '<div style="text-align:left;font-size:0.85em;line-height:1.5">' +
  '<p>Cada hilo guarda su propia copia de la variable, aislada del resto, así que no hace falta sincronizar. ' +
  'Se declara como <code>static final</code> y cada hilo lee y escribe solo su valor.</p>' +
  '<p><strong>Cuándo usarlo:</strong></p>' +
  '<ul><li>Contexto por petición: usuario autenticado, transacción en curso.</li>' +
  '<li>Identificador de traza para los logs (<code>MDC</code>).</li>' +
  '<li>Objetos caros y no seguros entre hilos, como <code>SimpleDateFormat</code>.</li></ul>' +
  '<pre style="white-space:pre-wrap;overflow-wrap:anywhere;text-align:left;font-size:0.9em"><code>' +
  'private static final ThreadLocal&lt;Usuario&gt; ACTUAL = new ThreadLocal&lt;&gt;();<br><br>' +
  'ACTUAL.set(usuario);<br>try {<br>    servicio.ejecutar();<br>} finally {<br>    ACTUAL.remove();<br>}' +
  '</code></pre>' +
  box(
    '#D9A400',
    '<p>💡 <strong>Punto clave:</strong> en pools de hilos hay que llamar siempre a <code>remove()</code> al terminar, o el valor se filtra a la siguiente petición que reutilice el hilo.</p>',
  ) +
  '<hr><p><strong>En mis proyectos</strong></p>' +
  box(
    '#1F9E9E',
    '<p><strong>⚽ PorrApp</strong></p><p>Spring Security guarda el usuario del token en un <code>SecurityContextHolder</code>, que por debajo es un ThreadLocal, y lo limpia al acabar la petición.</p>',
  ) +
  box(
    '#5B5FC7',
    '<p><strong>🏋 Ascension</strong></p><p>El identificador de traza de cada petición viaja en el MDC para poder seguirla en los logs de principio a fin.</p>',
  ) +
  '</div>';

function note(id: string, front: string, back: string) {
  return {
    id,
    deckId: deck.id,
    userId: 'fixture',
    noteType: 'basic',
    fieldsJson: JSON.stringify({ front, back }),
    tags: '',
    createdAt: '2026-10-30',
    updatedAt: '2026-10-30',
  };
}

async function fixture(page: Page, notes: ReturnType<typeof note>[]) {
  await page.addInitScript(() => {
    const token = `e30.${btoa(JSON.stringify({ sub: 'fixture', name: 'Prueba local', email: 'fixture@example.invalid', exp: 4102444800 }))}.fixture`;
    localStorage.setItem('loopdeck_jwt_token', token);
  });
  const items = notes.map((n, index) => ({
    note: n,
    card: { id: `card-${index}`, noteId: n.id, state: 'new', intervalDays: 0, easeFactor: 2.5 },
    intervals: { 1: '1m', 2: '6m', 3: '10m', 4: '15d' },
  }));
  await page.route(/^http:\/\/[^/]+\/api\//, async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api', '');
    let body: unknown = {};
    let status = 200;
    if (path.startsWith('/auth/')) status = 401;
    else if (path === '/version') body = { version: 'fixture' };
    else if (path === '/decks') body = [deck];
    else if (path.endsWith('/study/batch'))
      body = {
        items,
        counts: { newCount: items.length, learningCount: 0, reviewCount: 0 },
        hasMore: false,
      };
    else if (path.endsWith('/study')) body = items;
    else if (path.endsWith('/notes')) body = notes;
    await route.fulfill({ status, json: body });
  });
}

for (const [width, height] of [
  [1440, 900],
  [390, 844],
]) {
  test(`long cards get the reading layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await fixture(page, [
      note('long', '<p>¿Qué es ThreadLocal y cuándo lo usarías?</p>', longBack),
    ]);
    await page.goto(`/study/${deck.id}`);

    const session = page.locator('.study-session');
    await expect(session).toHaveClass(/study-session--reading/);
    await page.getByRole('button', { name: 'Mostrar Respuesta' }).click();

    // Los cuatro botones, «otro momento» y «deshacer» comparten una sola fila.
    const controls = [
      page.getByRole('button', { name: /Otra vez/ }),
      page.getByRole('button', { name: /Difícil/ }),
      page.getByRole('button', { name: /Bien/ }),
      page.getByRole('button', { name: /Fácil/ }),
      page.getByRole('button', { name: 'Elegir cuándo repasar esta tarjeta' }),
      page.getByRole('button', { name: 'Deshacer' }),
    ];
    const boxes = await Promise.all(controls.map((control) => control.boundingBox()));
    const tops = boxes.map((box) => Math.round(box!.y));
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(1);
    expect(boxes[0]!.y + boxes[0]!.height).toBeLessThanOrEqual(height);

    // La tarjeta se queda con la mayor parte de la pantalla y empieza por el principio.
    const card = await page.locator('.flashcard-frame').boundingBox();
    expect(card!.height).toBeGreaterThan(height * 0.6);
    await expect(page.getByText('Cada hilo guarda su propia copia').first()).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );

    if (process.env.LOOPDECK_SCREENSHOTS) {
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${process.env.LOOPDECK_SCREENSHOTS}/reading-${width}.png` });
    }
  });
}

test('short cards keep the classic layout', async ({ page }) => {
  await fixture(page, [
    note('short', 'Mitocondria', 'Orgánulo que produce la energía de la célula'),
  ]);
  await page.goto(`/study/${deck.id}`);
  await expect(page.locator('.study-session')).not.toHaveClass(/study-session--reading/);
  await expect(page.getByRole('button', { name: 'Mostrar Respuesta' })).toBeVisible();
});
