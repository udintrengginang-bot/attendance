// Automatic version based on build time - updates automatically on each deploy
const CACHE_VERSION = '2025-01-15-' + new Date().getTime();
const CACHE_NAME = 'shreeved-' + CACHE_VERSION;
const OFFLINE_URL = '/offline.html';

const urlsToCache = [
    '/',
    '/index.html',
    '/admin.html',
    '/worker.html',
    '/js/admin.js',
    '/js/worker.js',
    '/manifest.json'
];

// Install event - cache essential files and force immediate activation
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing... Version:', CACHE_VERSION);
    
    // Force this service worker to become active immediately
    self.skipWaiting();
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Caching app shell');
                return cache.addAll(urlsToCache).catch(err => {
                    console.warn('[Service Worker] Some resources failed to cache:', err);
                    // Continue even if some resources fail
                });
            })
    );
});

// Activate event - clean up old caches and take control immediately
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating... Version:', CACHE_VERSION);
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        // Delete all old caches that don't match current version
                        if (cacheName.startsWith('shreeved-') && cacheName !== CACHE_NAME) {
                            console.log('[Service Worker] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                // Force the service worker to take control of all pages immediately
                return self.clients.claim();
            })
            .then(() => {
                console.log('[Service Worker] Now controlling all pages');
            })
    );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
    // Skip chrome extension and non-http requests
    if (!event.request.url.startsWith('http')) {
        return;
    }
    
    // Skip POST, PUT, DELETE requests - only cache GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    // For navigation requests
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return caches.match(event.request)
                        .then(response => {
                            return response || caches.match(OFFLINE_URL);
                        });
                })
        );
        return;
    }
    
    // For all other GET requests - network first, cache fallback
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Only cache successful GET responses
                if (response && response.status === 200 && event.request.method === 'GET') {
                    const responseToCache = response.clone();
                    
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache).catch(err => {
                                // Silently fail if PUT fails
                                console.warn('[Service Worker] Failed to cache:', event.request.url);
                            });
                        });
                }
                
                return response;
            })
            .catch(() => {
                // If network fails, try cache
                return caches.match(event.request)
                    .then(response => {
                        if (response) {
                            return response;
                        }
                        // For navigation, return offline page
                        if (event.request.mode === 'navigate') {
                            return caches.match(OFFLINE_URL);
                        }
                    });
            })
    );
});

// Handle push notifications
self.addEventListener('push', (event) => {
    console.log('[Service Worker] Push received');
    
    const options = {
        body: event.data ? event.data.text() : 'New notification',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        }
    };
    
    event.waitUntil(
        self.registration.showNotification('Shreeved', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] Notification clicked');
    
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow('/')
    );
});
