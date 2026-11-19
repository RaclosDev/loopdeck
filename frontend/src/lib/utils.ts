import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import DOMPurify from 'dompurify';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Texto plano de un fragmento HTML: quita todas las etiquetas y conserva su contenido. */
export function htmlToText(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [], KEEP_CONTENT: true });
}

export function sanitizeHtml(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'b',
      'i',
      'em',
      'strong',
      'a',
      'p',
      'br',
      'ul',
      'ol',
      'li',
      'code',
      'pre',
      'span',
      'blockquote',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'img',
      'hr',
      'div',
    ],
    ALLOWED_ATTR: ['href', 'target', 'class', 'style', 'src', 'alt', 'title'],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });
}

/**
 * Título del dorso cuando el término del frente pasa a la otra cara (definición IA, foto
 * automática o al escribir en el dorso): en mayúsculas, negrita y centrado.
 * `data-auto` marca el bloque para el editor; la sanitización lo elimina al mostrarlo.
 */
export function formatTermHeading(html: string): string {
  const doc = new DOMParser().parseFromString(htmlToText(html), 'text/html');
  const text = (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const strong = document.createElement('strong');
  strong.textContent = text.toLocaleUpperCase('es');
  return `<div style="font-size: 1.25em; text-align: center; letter-spacing: 0.02em;" data-auto="true">${strong.outerHTML}</div>`;
}
