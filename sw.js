/**
 * inerWeb Fluide - Service Worker « sabordage » (remplace le SW v7)
 *
 * Le SW v7 faisait du cache-d'abord sur tout le site (y compris /v8/ sur
 * GitHub Pages) et n'était jamais désenregistré : les visiteurs pouvaient
 * recevoir indéfiniment de l'ancien code. Ce remplaçant n'intercepte AUCUNE
 * requête : à sa prochaine revérification par le navigateur (au plus tard
 * 24 h), il s'installe, purge tous les caches, se désenregistre et recharge
 * les pages encore sous son contrôle. Ne pas ré-introduire de handler fetch.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const noms = await caches.keys();
    await Promise.all(noms.map((nom) => caches.delete(nom)));
    await self.registration.unregister();
    const fenetres = await self.clients.matchAll({ type: 'window' });
    fenetres.forEach((client) => client.navigate(client.url));
  })());
});
