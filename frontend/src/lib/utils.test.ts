import { describe, expect, it } from 'vitest';
import { formatTermHeading, htmlToText } from './utils';

describe('htmlToText', () => {
  it('quita las etiquetas y conserva el texto', () => {
    expect(htmlToText('<div><strong>Hola</strong> mundo</div>')).toBe('Hola mundo');
  });

  it('no deja etiquetas reconstruidas a partir de fragmentos anidados', () => {
    const text = htmlToText('<scr<script>ipt>alert(1)</script>');
    expect(text).not.toContain('<script');
  });

  it('devuelve cadena vacía sin contenido', () => {
    expect(htmlToText('')).toBe('');
  });
});

describe('formatTermHeading', () => {
  it('pone el término en mayúsculas, negrita y centrado', () => {
    const html = formatTermHeading('<p>fotosíntesis  vegetal</p>');
    expect(html).toContain('<strong>FOTOSÍNTESIS VEGETAL</strong>');
    expect(html).toContain('text-align: center');
    expect(html).toContain('data-auto="true"');
  });

  it('escapa el texto y no interpreta HTML del término', () => {
    expect(formatTermHeading('R&amp;D <b>x</b>')).toContain('<strong>R&amp;D X</strong>');
    expect(formatTermHeading('&lt;img src=x onerror=alert(1)&gt;')).toContain(
      '&lt;IMG SRC=X ONERROR=ALERT(1)&gt;',
    );
  });

  it('devuelve vacío si no hay texto', () => {
    expect(formatTermHeading('<br>')).toBe('');
  });
});
