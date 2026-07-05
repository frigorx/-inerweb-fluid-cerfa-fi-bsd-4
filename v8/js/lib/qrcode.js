// ============================================================
// inerWeb Fluide v8 — accès à la lib QR code vendored (V9.1, correctif QR)
//
// La lib vendored (davidshimjs/qrcodejs) N'EST PLUS embarquée ici. Elle
// vit désormais dans v8/js/lib/qrcode-vendor.js, chargée en <script>
// CLASSIQUE (pas type="module") depuis v8/index.html, AVANT app.js.
//
// Pourquoi ce changement : la lib est conçue pour tourner en contexte
// GLOBAL (elle lit navigator.userAgent, teste document.documentElement,
// et s'attache à la variable globale QRCode). L'ancienne version de ce
// fichier l'exécutait paresseusement DANS un module ES — mais un module
// ES exécute son code en mode strict avec `this` = undefined au niveau
// racine, ce qui faisait planter la lib (elle référence `this._android`
// dans son constructeur de dessin canvas) : « Cannot read properties of
// undefined (reading '_android') ». Le conteneur QR restait vide dans un
// vrai navigateur, alors que les tests restaient verts (ils empruntaient
// un repli <table> qui masquait l'échec réel du rendu canvas).
//
// Ce module se contente donc de lire window.QRCode, déjà posé par le
// <script> classique au moment où le DOM a chargé ses scripts. Aucune
// exécution de code DOM à l'import : obtenirQRCode() ne lève que si on
// l'APPELLE sans window.QRCode disponible (ex. sous Node, en test).
// ============================================================

/**
 * Retourne le constructeur QRCode (avec .CorrectLevel) posé sur `window`
 * par le <script> classique js/lib/qrcode-vendor.js.
 * @returns {Function} le constructeur QRCode
 * @throws {Error} si la bibliothèque n'est pas disponible (window absent,
 *   ou script vendored non chargé/pas encore exécuté)
 */
export function obtenirQRCode() {
  if (typeof window === 'undefined' || !window.QRCode) {
    throw new Error('Bibliothèque QR indisponible.');
  }
  return window.QRCode;
}
