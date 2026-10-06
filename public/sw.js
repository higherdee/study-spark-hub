// Syllaboss Service Worker for Native App Installation (PWA)
const CACHE_NAME = 'syllaboss-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass through fetch to enable Chrome installability checks
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
