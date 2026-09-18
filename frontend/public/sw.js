import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

const CACHE_NAME = 'loopdeck-v-post-ascension-1';

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && !cacheName.includes('workbox')) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => clients.claim())
  );
});
