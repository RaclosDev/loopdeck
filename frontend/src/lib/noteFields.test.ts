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

describe('isLongCardContent', () => {
  it('keeps vocabulary and image cards in the classic layout', async () => {
    const { isLongCardContent } = await import('./noteFields');
    expect(isLongCardContent('<p>Mitocondria</p>')).toBe(false);
    expect(isLongCardContent('<img src="https://example.invalid/a-very-long-url.png">')).toBe(
      false,
    );
  });

  it('flags code, tables and long text', async () => {
    const { isLongCardContent } = await import('./noteFields');
    expect(isLongCardContent('<pre><code>x</code></pre>')).toBe(true);
    expect(isLongCardContent('<table><tr><td>a</td></tr></table>')).toBe(true);
    expect(isLongCardContent(`<p>${'palabra '.repeat(60)}</p>`)).toBe(true);
  });
});
