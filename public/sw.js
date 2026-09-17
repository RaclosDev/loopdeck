import { precacheAndRoute } from 'workbox-precaching';

// Precache resources injected by VitePWA
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

