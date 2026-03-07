/**
 * inerWeb Fluide - Service Worker v7.1.0
 * Support hors-ligne et mise en cache
 */

const CACHE_NAME = 'inerweb-fluide-v7.1.0';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/api.js',
  './js/state.js',
  './js/ui.js',
  './js/wizard.js',
  './js/app.js',
  './manifest.json',
  './img/icon-192.png',
  './img/icon-512.png'
];

// Installation
self.addEventListener('install', (event) => {
  console.log('[SW] Installation...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Mise en cache des assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activation
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Suppression ancien cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Interception des requêtes
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ne pas intercepter les requêtes API
  if (url.hostname.includes('script.google.com') ||
      url.hostname.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then((response) => {
            // Ne pas mettre en cache les erreurs
            if (!response || response.status !== 200) {
              return response;
            }

            // Mettre en cache les nouvelles ressources
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Fallback pour les pages HTML
            if (event.request.headers.get('accept') &&
                event.request.headers.get('accept').includes('text/html')) {
              return caches.match('./index.html');
            }
          });
      })
  );
});
