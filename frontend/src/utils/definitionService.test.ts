import { afterEach, describe, expect, it, vi } from 'vitest';
import { lookupDefinition } from './definitionService';

describe('lookupDefinition', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sigue las redirecciones de Wikipedia cuando la IA no responde', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.hostname !== 'es.wikipedia.org') return new Response('', { status: 503 });
      const redirected = url.searchParams.get('redirects') === '1';
      const page = redirected
        ? { title: 'Blattodea', extract: 'Insectos de cuerpo aplanado; incluyen a las cucarachas.' }
        : { title: 'Cucaracha', extract: '' };
      return new Response(JSON.stringify({ query: { pages: [page] } }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await lookupDefinition('cucaracha');

    expect(result?.definition).toMatch(/^Insectos de cuerpo aplanado/);
    expect(result?.definition).not.toMatch(/cucaracha/i);
  });
});
