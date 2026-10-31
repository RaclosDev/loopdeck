import { describe, expect, it } from 'vitest';
import { parseNoteFields, renderCloze } from './noteFields';

describe('legacy note data and cloze', () => {
  it('keeps valid text and allows older malformed notes to be edited instead of crashing', () => {
    for (const raw of ['null', '[]', 'bad', '1']) expect(parseNoteFields(raw)).toEqual({});
    expect(parseNoteFields('{"front":42,"back":"<b>Answer</b>","text":null}')).toEqual({
      front: '42',
      back: '<b>Answer</b>',
    });
  });
  it('hides each cloze independently, supports hints and repairs display of ordinal zero', () => {
    const text = '{{c3::tres}} {{c1::uno::pista}} {{c3::repetido}}';
    expect(renderCloze(text, 1, false)).toBe('tres <span class="cloze">[pista]</span> repetido');
    expect(renderCloze(text, 3, false)).toBe(
      '<span class="cloze">[…]</span> uno <span class="cloze">[…]</span>',
    );
    expect(renderCloze(text, 0, false)).toBe(renderCloze(text, 1, false));
    expect(renderCloze(text, 1, true)).toContain('class="cloze-revealed">uno</span>');
  });
});
