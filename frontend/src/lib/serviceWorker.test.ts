import { beforeEach, describe, expect, it, vi } from 'vitest';

type Matcher = (context: { url: URL }) => boolean;
const routes: { matcher: Matcher; strategy: { cacheName: string } }[] = [];

vi.mock('workbox-precaching', () => ({
  precacheAndRoute: vi.fn(),
  cleanupOutdatedCaches: vi.fn(),
}));
vi.mock('workbox-routing', () => ({
  registerRoute: (matcher: Matcher, strategy: { cacheName: string }) =>
    routes.push({ matcher, strategy }),
}));
vi.mock('workbox-strategies', () => {
  class Strategy {
    cacheName: string;
    constructor(options: { cacheName: string }) {
      this.cacheName = options.cacheName;
    }
  }
  return { NetworkFirst: Strategy, StaleWhileRevalidate: Strategy };
});
vi.mock('workbox-cacheable-response', () => ({ CacheableResponsePlugin: class {} }));
vi.mock('workbox-expiration', () => ({ ExpirationPlugin: class {} }));

describe('service worker API route', () => {
  beforeEach(async () => {
    routes.length = 0;
    vi.resetModules();
    Object.assign(globalThis, { __WB_MANIFEST: [], addEventListener: vi.fn() });
    // @ts-expect-error public/sw.js es JavaScript sin tipos
    await import('../../public/sw.js');
  });

  const apiRoute = () => routes.find((route) => route.strategy.cacheName === 'api-cache')!;
  const asks = (path: string) =>
    apiRoute().matcher({ url: new URL(path, 'https://loopdeck.test') });

  it('caches the deck list and notes for offline reading', () => {
    expect(asks('/api/decks')).toBe(true);
    expect(asks('/api/decks/d1/notes/page?page=0')).toBe(true);
  });

  it('never stores export, documents, passkeys, profile, study queues or the session', () => {
    for (const path of [
      '/api/users/me/export',
      '/api/decks/d1/document',
      '/api/users/me/passkeys',
      '/api/users/me',
      '/api/decks/d1/study/batch?limit=50',
      '/api/ai/definition?word=x',
      '/api/auth/refresh',
    ])
      expect(asks(path), path).toBe(false);
  });
});
