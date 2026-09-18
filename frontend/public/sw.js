import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

// Limpiar cachés antiguas de versiones previas
cleanupOutdatedCaches();

// Precache resources injected by VitePWA
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
