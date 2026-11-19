/**
 * Búsqueda de fotos candidatas para una tarjeta.
 *
 * Primero se buscan artículos de Wikipedia en español: su imagen principal suele ser
 * la foto más representativa del término. Después se completa con Wikimedia Commons,
 * buscando tanto por el término como por el título en inglés del artículo, que es el
 * idioma en el que está descrita la mayoría de archivos.
 */

export interface ImageResult {
  /** Miniatura de tamaño razonable que se inserta en la tarjeta. */
  url: string;
  title: string;
}

const THUMB_WIDTH = 640;
const MAX_RESULTS = 12;
const MIN_WIDTH = 200;
/** Las SVG se sirven como PNG en la miniatura, así que los esquemas también valen. */
const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);
/** Archivos que casi nunca sirven como ilustración de un término. */
const NOISE =
  /\b(logo|icon|icono|flag|bandera|coat of arms|escudo|map|mapa|locator|signature|firma|stamp|sello|qr)\b/i;

interface WikiPage {
  title: string;
  /** Presente (vacío) cuando el título pedido no existe. */
  missing?: string;
  index?: number;
  pageimage?: string;
  thumbnail?: { source: string; width: number };
  langlinks?: { lang: string; '*'?: string; title?: string }[];
  pageprops?: { wikibase_item?: string };
}

interface CommonsPage {
  title: string;
  index?: number;
  imageinfo?: { thumburl?: string; url: string; mime?: string; width?: number }[];
}

const byIndex = (a: { index?: number }, b: { index?: number }) => (a.index ?? 0) - (b.index ?? 0);

const fileKey = (name: string) =>
  name
    .replace(/^(File|Archivo):/i, '')
    .replace(/ /g, '_')
    .toLowerCase();

const cleanTitle = (name: string) =>
  name
    .replace(/^(File|Archivo):/i, '')
    .replace(/\.\w+$/, '')
    .replace(/_/g, ' ');

async function getPages<T>(url: string, signal?: AbortSignal): Promise<T[]> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Wikimedia ${res.status}`);
  const data = await res.json();
  const pages = data?.query?.pages as Record<string, T> | undefined;
  return pages ? Object.values(pages) : [];
}

/** Artículo cuyo título es exactamente el término (siguiendo redirecciones). */
function wikipediaExactUrl(term: string) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    titles: term,
    redirects: '1',
    prop: 'pageimages|langlinks|pageprops',
    piprop: 'thumbnail|name',
    pithumbsize: String(THUMB_WIDTH),
    lllang: 'en',
    ppprop: 'wikibase_item',
  });
  return `https://es.wikipedia.org/w/api.php?${params}`;
}

/** Artículos relacionados, por si el término no tiene artículo propio. */
function wikipediaSearchUrl(term: string) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'search',
    gsrsearch: term,
    gsrlimit: '5',
    prop: 'pageimages|langlinks|pageprops',
    piprop: 'thumbnail|name',
    pithumbsize: String(THUMB_WIDTH),
    pilimit: '5',
    lllang: 'en',
    lllimit: '50',
    ppprop: 'wikibase_item',
  });
  return `https://es.wikipedia.org/w/api.php?${params}`;
}

function commonsUrl(query: string) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'search',
    gsrnamespace: '6',
    gsrsearch: `filetype:bitmap|drawing ${query}`,
    gsrlimit: '15',
    prop: 'imageinfo',
    iiprop: 'url|mime|size',
    iiurlwidth: String(THUMB_WIDTH),
  });
  return `https://commons.wikimedia.org/w/api.php?${params}`;
}

type Candidate = ImageResult & { key: string };

async function searchCommons(query: string, signal?: AbortSignal): Promise<Candidate[]> {
  const allowNoise = NOISE.test(query) || query.startsWith('haswbstatement:');
  const pages = await getPages<CommonsPage>(commonsUrl(query), signal);
  return pages.sort(byIndex).flatMap((page): Candidate[] => {
    const info = page.imageinfo?.[0];
    if (!info?.thumburl) return [];
    if (info.mime && !IMAGE_MIMES.has(info.mime)) return [];
    if (info.width !== undefined && info.width < MIN_WIDTH) return [];
    const title = cleanTitle(page.title);
    if (!allowNoise && NOISE.test(title)) return [];
    return [{ url: info.thumburl, title, key: fileKey(page.title) }];
  });
}

const articleImage = (page: WikiPage): Candidate[] =>
  page.thumbnail?.source && page.pageimage && page.thumbnail.width >= MIN_WIDTH
    ? [{ url: page.thumbnail.source, title: page.title, key: fileKey(page.pageimage) }]
    : [];

/**
 * Archivos de Commons etiquetados como que representan el concepto (propiedad «depicts»
 * de Wikidata): es la fuente más precisa porque no depende de palabras sueltas.
 */
const depictsQuery = (page: WikiPage | undefined) => {
  const item = page?.pageprops?.wikibase_item;
  return item && /^Q\d+$/.test(item) ? `haswbstatement:P180=${item}` : undefined;
};

const settle = <T>(promise: Promise<T>) => Promise.allSettled([promise]).then(([result]) => result);

/**
 * Sube los archivos cuyo nombre contiene alguna palabra del término (en inglés si hay
 * traducción, porque Commons nombra así la mayoría), manteniendo el orden de relevancia.
 */
function rankByName(candidates: Candidate[], words: string): Candidate[] {
  const keys = normalize(words)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3);
  if (keys.length === 0) return candidates;
  const pattern = new RegExp(`\\b(${keys.join('|')})`);
  const named = candidates.filter((c) => pattern.test(normalize(c.title)));
  return [...named, ...candidates.filter((c) => !named.includes(c))];
}

const englishTitle = (page: WikiPage | undefined) => {
  const link = page?.langlinks?.find((l) => l.lang === 'en');
  return link?.['*'] ?? link?.title;
};

const normalize = (text: string) =>
  text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

/**
 * Devuelve hasta 12 imágenes candidatas para `term`, las más fiables primero: la del
 * artículo del término, luego Commons (en inglés y en español) y, como relleno, las de
 * artículos relacionados. Si alguna fuente falla se usan las demás; solo lanza un error
 * si fallan todas.
 */
export async function findImages(term: string, signal?: AbortSignal): Promise<ImageResult[]> {
  const query = term.trim();
  if (!query) return [];

  const [exact, related, commonsEs] = await Promise.allSettled([
    getPages<WikiPage>(wikipediaExactUrl(query), signal),
    getPages<WikiPage>(wikipediaSearchUrl(query), signal),
    searchCommons(query, signal),
  ]);
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  const exactPage =
    exact.status === 'fulfilled' ? exact.value.find((p) => p.missing === undefined) : undefined;
  const relatedPages = related.status === 'fulfilled' ? related.value.sort(byIndex) : [];
  const ownArticle = exactPage ?? relatedPages.find((p) => normalize(p.title) === normalize(query));

  const en = englishTitle(ownArticle);
  const depicts = depictsQuery(ownArticle);
  const translated = en && normalize(en) !== normalize(query) ? en : undefined;
  const [commonsDepicts, commonsEn] = await Promise.all([
    depicts ? settle(searchCommons(depicts, signal)) : undefined,
    translated ? settle(searchCommons(translated, signal)) : undefined,
  ]);
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  const sources = [exact, related, commonsEs, commonsDepicts, commonsEn].filter(Boolean);
  if (sources.every((s) => s?.status === 'rejected')) {
    throw new Error('No se pudo buscar imágenes');
  }

  const fromCommons = (r?: PromiseSettledResult<Candidate[]>) =>
    r?.status === 'fulfilled' ? r.value : [];
  const ranked = rankByName(
    [
      ...fromCommons(commonsDepicts).slice(0, 8),
      ...fromCommons(commonsEn),
      ...fromCommons(commonsEs),
    ],
    translated ?? query,
  );
  const collected: Candidate[] = [
    ...(ownArticle ? articleImage(ownArticle) : []),
    ...ranked,
    ...relatedPages
      .filter((p) => p !== ownArticle)
      .flatMap(articleImage)
      .slice(0, 3),
  ];

  const seen = new Set<string>();
  const images: ImageResult[] = [];
  for (const { url, title, key } of collected) {
    if (seen.has(key) || seen.has(url)) continue;
    seen.add(key);
    seen.add(url);
    images.push({ url, title });
    if (images.length === MAX_RESULTS) break;
  }
  return images;
}
