import { beforeEach, describe, expect, it, vi } from 'vitest';

type Matcher = (context: { url: URL }) => boolean;
type MockNavigation = { handler: unknown; options: { denylist: RegExp[] } };
const routes: { matcher: Matcher | MockNavigation; strategy?: { cacheName: string } }[] = [];

vi.mock('workbox-precaching', () => ({
  precacheAndRoute: vi.fn(),
  cleanupOutdatedCaches: vi.fn(),
  createHandlerBoundToURL: (url: string) => ({ boundTo: url }),
}));
vi.mock('workbox-routing', () => {
  class NavigationRoute {
    handler: unknown;
    options: { denylist: RegExp[] };
    constructor(handler: unknown, options: { denylist: RegExp[] }) {
      this.handler = handler;
      this.options = options;
    }
  }
  return {
    NavigationRoute,
    registerRoute: (matcher: Matcher | MockNavigation, strategy?: { cacheName: string }) =>
      routes.push({ matcher, strategy }),
  };
});
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

  const apiRoute = () => routes.find((route) => route.strategy?.cacheName === 'api-cache')!;
  const asks = (path: string) =>
    (apiRoute().matcher as Matcher)({ url: new URL(path, 'https://loopdeck.test') });

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
      '/api/auth/password-reset/request',
      '/api/auth/password-reset/confirm',
    ])
      expect(asks(path), path).toBe(false);
  });
});

describe('service worker offline navigation', () => {
  beforeEach(async () => {
    routes.length = 0;
    vi.resetModules();
    Object.assign(globalThis, { __WB_MANIFEST: [], addEventListener: vi.fn() });
    // @ts-expect-error public/sw.js es JavaScript sin tipos
    await import('../../public/sw.js');
  });

  const navigation = () =>
    routes.map((route) => route.matcher as MockNavigation).find((matcher) => 'handler' in matcher)!;
  const denied = (path: string) => navigation().options.denylist.some((regex) => regex.test(path));

  it('opens any screen of the app offline from the precached index.html', () => {
    expect(navigation().handler).toEqual({ boundTo: '/index.html' });
    for (const path of ['/', '/decks/d1', '/study/d1', '/ajustes'])
      expect(denied(path), path).toBe(false);
  });

  it('leaves the API and static files out of the navigation fallback', () => {
    for (const path of ['/api/decks', '/api/auth/refresh', '/robots.txt', '/assets/index-1.js'])
      expect(denied(path), path).toBe(true);
  });
});
