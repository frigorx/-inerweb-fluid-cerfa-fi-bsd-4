/* Service worker — le TP fonctionne sans connexion une fois ouvert.
   Stratégie : réseau d'abord, cache en secours (même règle que le Circuit
   Fantôme). */

const CACHE = 'automaintien-v1';

const RESSOURCES = [
  './',
  './index.html',
  './styles.css',
  './simulation.js',
  './schemas.js',
  './app.js',
  './fiche.js',
  './fiche-eleve.html',
  './manifest.json',
  './icone.svg'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(RESSOURCES); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (cles) {
    return Promise.all(cles.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(function (rep) {
      const copie = rep.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copie); });
      return rep;
    }).catch(function () { return caches.match(e.request); })
  );
});
