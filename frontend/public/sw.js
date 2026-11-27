import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { API_CACHE_NAME, isOfflineCacheable } from '../src/lib/offlineCache';

const CACHE_NAME = 'loopdeck-v2';

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Toda navegación (la raíz con `?v=3` de la PWA instalada, /decks/…, /study/…) recibe el index.html
// precacheado: es una app de una sola página y sin esto no abre sin conexión. Se excluyen la API y
// los archivos con extensión (sitemap, robots, imágenes…), que no son pantallas de la app.
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [/^\/api\//, /\/[^/?]+\.[^/]+$/],
  }),
);

// API caching - Network First, solo para la lista blanca de offlineCache.ts (mazos y notas). La
// sesión (/api/auth), la exportación, los documentos, las passkeys, la IA y la cola de estudio
// nunca se guardan. La app borra esta caché al cerrar sesión, al ser expulsada o al cambiar de cuenta.
registerRoute(
  ({ url }) => isOfflineCacheable(url.pathname),
  new NetworkFirst({
    cacheName: API_CACHE_NAME,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [200],
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      }),
    ],
  }),
);

// Assets caching - Stale While Revalidate
registerRoute(
  ({ request }) =>
    request.destination === 'image' ||
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font',
  new StaleWhileRevalidate({
    cacheName: 'assets-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [200],
      }),
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  }),
);

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== CACHE_NAME &&
              !cacheName.includes('workbox') &&
              !cacheName.includes('api-cache') &&
              !cacheName.includes('assets-cache')
            ) {
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => clients.claim()),
  );
});
