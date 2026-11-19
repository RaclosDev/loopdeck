import { afterEach, describe, expect, it, vi } from 'vitest';
import { findImages } from './imageSearch';

type Pages = Record<string, unknown>;

const thumb = (name: string) => `https://upload.wikimedia.org/thumb/${name}/640px-${name}`;

function mockWikimedia(responses: {
  exact?: Pages | 'error';
  related?: Pages | 'error';
  commons?: Record<string, Pages | 'error'>;
}) {
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input));
    const params = url.searchParams;
    let body: Pages | 'error' | undefined;
    if (url.hostname === 'es.wikipedia.org') {
      body = params.has('titles') ? responses.exact : responses.related;
    } else {
      const query = (params.get('gsrsearch') ?? '').replace('filetype:bitmap|drawing ', '');
      body = responses.commons?.[query];
    }
    if (body === 'error') return new Response('busy', { status: 429 });
    return Response.json(body ? { query: { pages: body } } : {});
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const commonsFile = (title: string, index: number, extra: Record<string, unknown> = {}) => ({
  title: `File:${title}`,
  index,
  imageinfo: [
    {
      url: `https://upload.wikimedia.org/${title}`,
      thumburl: thumb(title),
      mime: 'image/jpeg',
      width: 2000,
      ...extra,
    },
  ],
});

afterEach(() => vi.unstubAllGlobals());

describe('findImages', () => {
  it('pone primero la foto del artículo y luego Commons en inglés y en español', async () => {
    const fetchMock = mockWikimedia({
      exact: {
        '1': {
          title: 'Tenedor',
          pageimage: 'Fork.jpg',
          thumbnail: { source: thumb('Fork.jpg'), width: 640 },
          langlinks: [{ lang: 'en', '*': 'Fork' }],
        },
      },
      related: {
        '2': {
          title: 'Tenedor de pescado',
          index: 1,
          pageimage: 'Fish_fork.jpg',
          thumbnail: { source: thumb('Fish_fork.jpg'), width: 640 },
        },
      },
      commons: {
        Fork: { a: commonsFile('Assorted forks.jpg', 2), b: commonsFile('Fork.jpg', 1) },
        tenedor: { c: commonsFile('Tenedor de madera.jpg', 1) },
      },
    });

    const images = await findImages(' tenedor ');

    expect(images.map((i) => i.title)).toEqual([
      'Tenedor',
      'Assorted forks',
      'Tenedor de madera',
      'Tenedor de pescado',
    ]);
    expect(images[0].url).toBe(thumb('Fork.jpg'));
    const urls = fetchMock.mock.calls.map(([u]) => String(u));
    expect(urls.every((u) => u.includes('origin=*'))).toBe(true);
    expect(urls.some((u) => u.includes('iiurlwidth=640'))).toBe(true);
  });

  it('usa las fotos que representan el concepto en Wikidata y sube las que lo nombran', async () => {
    mockWikimedia({
      exact: {
        '1': {
          title: 'Manzana',
          pageprops: { wikibase_item: 'Q89' },
          langlinks: [{ lang: 'en', '*': 'Apple' }],
        },
      },
      commons: {
        'haswbstatement:P180=Q89': {
          a: commonsFile('Fruit market.jpg', 1),
          b: commonsFile('Red apples.jpg', 2),
        },
        Apple: { c: commonsFile('Apple Park.jpg', 1) },
        manzana: { d: commonsFile('Manzana de Gomez.jpg', 1) },
      },
    });

    const images = await findImages('manzana');

    expect(images.map((i) => i.title)).toEqual([
      'Red apples',
      'Apple Park',
      'Fruit market',
      'Manzana de Gomez',
    ]);
  });

  it('descarta logos, mapas, archivos diminutos y formatos que no son imagen', async () => {
    mockWikimedia({
      exact: { '-1': { title: 'Gato', missing: '' } },
      commons: {
        gato: {
          a: commonsFile('Logo gato.png', 1),
          b: commonsFile('Mapa de gatos.jpg', 2),
          c: commonsFile('Gato diminuto.jpg', 3, { width: 80 }),
          d: commonsFile('Gato vídeo.webm', 4, { mime: 'video/webm' }),
          e: commonsFile('Gato atigrado.jpg', 5),
        },
      },
    });

    const images = await findImages('gato');

    expect(images.map((i) => i.title)).toEqual(['Gato atigrado']);
  });

  it('sigue con las fuentes que responden y solo falla si fallan todas', async () => {
    mockWikimedia({
      exact: 'error',
      related: 'error',
      commons: { perro: { a: commonsFile('Perro.jpg', 1) } },
    });
    await expect(findImages('perro')).resolves.toHaveLength(1);

    mockWikimedia({ exact: 'error', related: 'error', commons: { perro: 'error' } });
    await expect(findImages('perro')).rejects.toThrow('No se pudo buscar imágenes');
  });

  it('no busca nada con un término vacío', async () => {
    const fetchMock = mockWikimedia({});
    await expect(findImages('   ')).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
