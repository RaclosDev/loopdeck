import { describe, expect, it } from 'vitest';
import { limitTutorContext, MAX_TUTOR_CONTEXT } from './tutorContext';

describe('limitTutorContext', () => {
  it('leaves a context that fits untouched', () => {
    const context = 'a'.repeat(MAX_TUTOR_CONTEXT);
    expect(limitTutorContext(context)).toBe(context);
  });

  it('never goes over the backend limit, truncation notice included', () => {
    for (const size of [MAX_TUTOR_CONTEXT + 1, 60_000, 5_000_000]) {
      const limited = limitTutorContext('x'.repeat(size));
      expect(limited.length).toBeLessThanOrEqual(MAX_TUTOR_CONTEXT);
      expect(limited.endsWith('(contexto truncado)')).toBe(true);
    }
  });

  it('does not split a surrogate pair at the cut', () => {
    const limited = limitTutorContext('a'.repeat(MAX_TUTOR_CONTEXT - 24) + '😀'.repeat(50));
    expect(limited.length).toBeLessThanOrEqual(MAX_TUTOR_CONTEXT);
    expect(limited).not.toMatch(/[\ud800-\udbff](?![\udc00-\udfff])/);
  });
});
