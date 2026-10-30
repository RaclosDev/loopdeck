import { afterEach, describe, expect, it } from 'vitest';
import { applyThemeColor } from './colorHelper';

afterEach(() => {
  document.documentElement.removeAttribute('style');
  localStorage.clear();
});
describe('custom paper ink', () => {
  it('keeps dark colors and retains the selected color separately from readable ink', () => {
    applyThemeColor('#0b5f74');
    expect(document.documentElement.style.getPropertyValue('--accent-primary')).toBe('#0b5f74');
    applyThemeColor('#ffffff');
    expect(localStorage.getItem('loopdeck_custom_color')).toBe('#ffffff');
    const channel =
      parseInt(
        document.documentElement.style.getPropertyValue('--accent-primary').slice(1, 3),
        16,
      ) / 255;
    const luminance = ((channel + 0.055) / 1.055) ** 2.4;
    expect((0.84 + 0.05) / (luminance + 0.05)).toBeGreaterThanOrEqual(4.5);
  });
  it('ignores malformed persisted colors', () => {
    applyThemeColor('broken');
    expect(document.documentElement.style.getPropertyValue('--accent-primary')).toBe('');
  });
});
