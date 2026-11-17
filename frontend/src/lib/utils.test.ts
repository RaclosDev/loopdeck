import { describe, expect, it } from 'vitest';
import { htmlToText } from './utils';

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
