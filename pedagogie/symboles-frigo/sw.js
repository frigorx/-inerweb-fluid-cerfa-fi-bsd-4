/* Service worker — permet l'entraînement maison sans connexion.
   Stratégie : réseau d'abord, cache en secours. Le cache est reconstruit à
   chaque visite en ligne, donc l'élève travaille toujours sur la dernière
   version quand il a du réseau, et sur la dernière connue quand il n'en a pas. */

const CACHE = 'circuit-fantome-v3';

const RESSOURCES = [
  './',
  './index.html',
  './styles.css',
  './donnees-symboles.js',
  './donnees-circuits.js',
  './app.js',
  './atelier-decodage.js',
  './atelier-familles.js',
  './atelier-pieges.js',
  './atelier-circuit.js',
  './atelier-blanc.js',
  './maison.js',
  './biblio.js',
  './atelier-chaine.js',
  './atelier-regulateurs.js',
  './atelier-groupe.js',
  './manifest.json',
  './icone.svg'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(RESSOURCES); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (noms) {
        return Promise.all(noms.filter(function (n) { return n !== CACHE; })
                               .map(function (n) { return caches.delete(n); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(function (rep) {
        const copie = rep.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copie); });
        return rep;
      })
      .catch(function () { return caches.match(e.request); })
  );
});
