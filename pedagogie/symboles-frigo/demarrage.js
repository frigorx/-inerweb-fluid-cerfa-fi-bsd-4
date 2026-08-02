/* Amorçage — sorti de index.html pour qu'aucun script ne soit « en ligne ».
   C'est ce qui permet la politique de sécurité stricte déclarée dans la page :
   script-src 'self', donc aucun script injecté ne peut s'exécuter. */

APP.demarrer();

// Mise en cache pour l'entraînement maison hors connexion.
if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () { /* sans effet si indisponible */ });
  });
}
