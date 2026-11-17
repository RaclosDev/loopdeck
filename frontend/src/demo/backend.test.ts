import { describe, expect, it } from 'vitest';
import type { InternalAxiosRequestConfig } from 'axios';
import { demoAdapter } from './backend';

type Deck = { id: string; name: string };

async function call<T = unknown>(method: string, url: string, data?: unknown, params?: object) {
  const config = { method, url, data, params, headers: {} } as InternalAxiosRequestConfig;
  return (await demoAdapter(config)).data as T;
}

describe('backend del modo demo', () => {
  it('trae varios mazos de prueba con notas y estadísticas', async () => {
    const decks = await call<Deck[]>('get', '/decks');
    expect(decks.length).toBeGreaterThan(2);

    const stats = await call<Record<string, unknown>>('get', '/decks/stats');
    expect(Object.keys(stats)).toHaveLength(decks.length);

    const deckId = decks[0].id;
    const notes = await call<unknown[]>('get', `/decks/${deckId}/notes`);
    expect(notes.length).toBeGreaterThan(0);
    expect(await call('get', `/decks/${deckId}/notes/tags`)).toBeInstanceOf(Array);
    expect(await call('get', `/decks/${deckId}/card-states`)).toBeTypeOf('object');
    expect(await call('get', `/decks/${deckId}/document/info`)).toEqual({ hasDocument: false });

    const page = await call<{ items: unknown[]; total: number }>(
      'get',
      `/decks/${deckId}/notes/page?size=5&page=0`,
    );
    expect(page.items.length).toBeLessThanOrEqual(5);
    expect(page.total).toBe(notes.length);
  });

  it('permite crear, editar y borrar mazos y notas en memoria', async () => {
    const deck = await call<Deck>('post', '/decks', JSON.stringify({ name: 'Prueba' }));
    expect(deck.name).toBe('Prueba');
    await expect(call('post', '/decks', { name: ' ' })).rejects.toMatchObject({
      response: { status: 400 },
    });

    const renamed = await call<Deck>('put', `/decks/${deck.id}`, { name: 'Renombrado' });
    expect(renamed.name).toBe('Renombrado');

    const fieldsJson = JSON.stringify({ front: 'hola', back: 'hello' });
    const note = await call<{ id: string }>('post', '/notes', { deckId: deck.id, fieldsJson });
    await call('put', `/notes/${note.id}`, { fieldsJson, tags: 'saludos' });
    await call('post', `/decks/${deck.id}/import`, [{ fieldsJson }]);
    const search = await call<{ total: number }>('get', `/decks/${deck.id}/notes/page`, undefined, {
      search: 'hola',
      tag: 'saludos',
    });
    expect(search.total).toBe(1);

    await call('delete', `/notes/${note.id}`);
    expect(await call<unknown[]>('get', `/decks/${deck.id}/notes`)).toHaveLength(1);
    await call('delete', `/decks/${deck.id}`);
    await expect(call('get', `/decks/${deck.id}/notes`)).rejects.toMatchObject({
      response: { status: 404 },
    });
  });

  it('simula el estudio: repaso, deshacer y preparación de lotes', async () => {
    const [deck] = await call<Deck[]>('get', '/decks');
    const queue = await call<{ card: { id: string } }[] | { id: string }[]>(
      'get',
      `/decks/${deck.id}/study`,
    );
    expect(queue.length).toBeGreaterThan(0);
    const batch = await call<{ items: unknown[] }>('get', `/decks/${deck.id}/study/batch`);
    expect(batch.items.length).toBeGreaterThan(0);

    const prepared = await call<Record<string, unknown>>('post', '/study/prepare', {
      deckIds: [deck.id, 'no-existe'],
    });
    expect(Object.keys(prepared)).toEqual([deck.id]);

    const first = queue[0] as { card?: { id: string }; id?: string };
    const cardId = first.card?.id ?? first.id;
    for (const rating of [1, 2, 3, 4]) {
      const { reviewId } = await call<{ reviewId: string }>('post', `/cards/${cardId}/review`, {
        rating,
      });
      const undone = await call<{ alreadyUndone: boolean }>('post', `/cards/${cardId}/restore`, {
        reviewId,
      });
      expect(undone.alreadyUndone).toBe(false);
    }
    await call('post', `/cards/${cardId}/review`, { rating: 3, customIntervalMinutes: 2880 });
    const again = await call<{ alreadyUndone: boolean }>('post', `/cards/${cardId}/restore`, {
      reviewId: 'otro',
    });
    expect(again.alreadyUndone).toBe(true);
    await expect(call('post', '/cards/nada/review', {})).rejects.toMatchObject({
      response: { status: 404 },
    });
  });

  it('ofrece plantillas e IA de ejemplo y rechaza lo que no existe', async () => {
    const templates = await call<{ id: string }[]>('get', '/templates');
    expect(templates.length).toBeGreaterThan(0);
    const created = await call<Deck>('post', '/templates/import', undefined, {
      type: templates[0].id,
    });
    expect((await call<unknown[]>('get', `/decks/${created.id}/notes`)).length).toBeGreaterThan(0);
    await expect(call('post', '/templates/import', undefined, { type: 'x' })).rejects.toMatchObject(
      { response: { status: 404 } },
    );

    const chat = await call<{ response: string }>('post', '/ai/chat', { prompt: 'Explícame esto' });
    expect(chat.response).not.toBe('');
    expect(await call('post', '/ai/mass-define', { words: 'casa\nperro' })).toHaveLength(2);

    expect(await call('get', '/version')).toEqual({ version: 'demo' });
    expect(await call('post', '/auth/logout')).toEqual({});
    await expect(call('post', `/decks/${created.id}/document`)).rejects.toMatchObject({
      response: { status: 403 },
    });
    await expect(call('get', '/desconocido')).rejects.toMatchObject({ response: { status: 404 } });
  });
});
