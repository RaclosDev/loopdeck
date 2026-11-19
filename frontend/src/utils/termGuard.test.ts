import { describe, expect, it } from 'vitest';
import { maskTerm } from './termGuard';

describe('maskTerm', () => {
  it('oculta el término y sus derivados sin distinguir tildes ni mayúsculas', () => {
    expect(
      maskTerm('El perro (Canis familiaris) es un mamífero; la perra pare perritos.', 'Perro'),
    ).toBe('El … (Canis familiaris) es un mamífero; la … pare ….');
    expect(maskTerm('La Fotosintesis es un proceso.', 'fotosíntesis')).toBe('La … es un proceso.');
  });

  it('no toca palabras ajenas que solo se parecen', () => {
    expect(maskTerm('Edificio donde vive una familia, casi siempre.', 'casa')).toBe(
      'Edificio donde vive una familia, casi siempre.',
    );
    expect(maskTerm('Capital de Francia.', 'Ciudad de México')).toBe('Capital de Francia.');
  });
});
