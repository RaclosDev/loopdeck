/**
 * Oculta el término (y palabras de su familia) dentro de su propia definición,
 * para que la tarjeta no se responda sola. Misma lógica que TermGuard en el backend.
 */
const MASK = '…';
const WORD = /[\p{L}\p{N}]+/gu;
const STOPWORDS = new Set([
  'del',
  'las',
  'los',
  'una',
  'uno',
  'unos',
  'unas',
  'con',
  'sin',
  'por',
  'para',
  'que',
  'sus',
  'the',
  'and',
  'of',
]);

interface Stem {
  root: string;
  exact: boolean;
}

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');

function stems(term: string): Stem[] {
  const result: Stem[] = [];
  for (const match of term.matchAll(WORD)) {
    const token = normalize(match[0]);
    if (token.length < 3 || STOPWORDS.has(token)) continue;
    if (token.length <= 4) result.push({ root: token, exact: true });
    else
      result.push({
        root: token.slice(0, token.length - (token.length >= 7 ? 2 : 1)),
        exact: false,
      });
  }
  return result;
}

function matches(token: string, list: Stem[]) {
  return list.some(({ root, exact }) =>
    exact
      ? token === root || token === `${root}s` || token === `${root}es`
      : token.startsWith(root),
  );
}

export function maskTerm(definition: string, term: string): string {
  const list = stems(term);
  if (list.length === 0) return definition;
  return definition
    .replace(WORD, (word) => (matches(normalize(word), list) ? MASK : word))
    .replace(/…(\s*…)+/g, MASK);
}
