const CACHE_NAME = 'shreeved-v1';

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let all requests go through to the network
  // We'll add caching later once everything works
  event.respondWith(fetch(event.request));
});
