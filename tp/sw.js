/**
 * inerWeb TP — Service Worker
 * Stratégie : cache-first pour les ressources statiques, network-first pour l'API.
 * L'app fonctionne entièrement hors-ligne (les relevés sont stockés en localStorage
 * puis synchronisés dès qu'une connexion est disponible).
 */
const CACHE = 'inerweb-tp-v1.0.0';
const CORE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './data.js',
  './manifest.json',
  './img/balances/refco_octa_schema.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // API Apps Script : network-first (données fraîches prioritaires)
  if (url.hostname.includes('script.google.com')) {
    e.respondWith(
      fetch(e.request).catch(() => new Response(
        JSON.stringify({ success: false, error: 'offline' }),
        { headers: { 'Content-Type': 'application/json' } }
      ))
    );
    return;
  }

  // Ressources statiques : cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        // Mettre en cache les GET 200 réussis
        if (e.request.method === 'GET' && resp.status === 200 && resp.type === 'basic') {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return resp;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
