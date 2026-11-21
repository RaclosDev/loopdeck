import { describe, expect, it } from 'vitest';
import { loginPathFor, safeNext } from './authRedirect';

describe('safeNext', () => {
  it('keeps internal paths with their query and hash', () => {
    expect(safeNext('/stats')).toBe('/stats');
    expect(safeNext('/hub/12/quiz?n=5#top')).toBe('/hub/12/quiz?n=5#top');
  });

  it.each([
    null,
    '',
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
    'stats',
    '/\nevil',
    '/login',
    '/registro?next=/stats',
  ])('falls back to / for %j', (value) => {
    expect(safeNext(value)).toBe('/');
  });
});

describe('loginPathFor', () => {
  it('carries the requested route as an encoded next parameter', () => {
    expect(loginPathFor('/hub/3?tab=quiz')).toBe('/login?next=%2Fhub%2F3%3Ftab%3Dquiz');
  });

  it('omits next for the landing page', () => {
    expect(loginPathFor('/')).toBe('/login');
  });
});
