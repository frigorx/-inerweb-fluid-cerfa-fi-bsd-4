// ============================================================
// inerWeb Fluide v8 — utilitaires partagés (Phase A)
// Formatage fr-FR (virgule décimale), échappement HTML, identifiants.
// Aucune dépendance externe. Module ES.
// ============================================================

/**
 * Formate un nombre en fr-FR avec un nombre fixe de décimales.
 * @param {number} n - valeur numérique
 * @param {number} [dec=2] - nombre de décimales
 * @returns {string} ex. « 4,20 »
 */
export function fmtNombre(n, dec = 2) {
  const valeur = Number(n);
  if (!Number.isFinite(valeur)) return '—';
  return valeur.toLocaleString('fr-FR', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec
  });
}

/**
 * Formate une masse en kilogrammes : « 4,20 kg ».
 * @param {number} n - masse en kg
 * @returns {string}
 */
export function fmtKg(n) {
  return `${fmtNombre(n, 2)} kg`;
}

/**
 * Formate une masse SIGNÉE : « + 0,30 kg » ou « − 0,15 kg ».
 * Le signe moins est le vrai signe moins typographique (U+2212).
 * La mise en couleur est l'affaire des vues, pas de cette fonction.
 * @param {number} n - masse signée en kg (négatif = récupération)
 * @returns {string}
 */
export function fmtKgSigne(n) {
  const valeur = Number(n);
  if (!Number.isFinite(valeur)) return '—';
  const signe = valeur < 0 ? '−' : '+';
  return `${signe} ${fmtNombre(Math.abs(valeur), 2)} kg`;
}

/**
 * Formate un équivalent CO₂ en tonnes : « 16,47 t CO₂ ».
 * @param {number} n - tonnes équivalent CO₂
 * @returns {string}
 */
export function fmtTeq(n) {
  return `${fmtNombre(n, 2)} t CO₂`;
}

/**
 * Formate une date ISO en date française : « 29/06/2026 ».
 * @param {string|null} iso - date ISO (ex. « 2026-06-29 ») ou null
 * @returns {string} « — » si absente ou invalide
 */
export function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const jour = String(d.getDate()).padStart(2, '0');
  const mois = String(d.getMonth() + 1).padStart(2, '0');
  return `${jour}/${mois}/${d.getFullYear()}`;
}

/**
 * Calcule l'équivalent CO₂ en tonnes : kg × GWP / 1000.
 * @param {number} kg - masse de fluide en kg
 * @param {number} gwp - potentiel de réchauffement global (AR4)
 * @returns {number} tonnes équivalent CO₂ (nombre brut, non formaté)
 */
export function teqCO2(kg, gwp) {
  return (Number(kg) * Number(gwp)) / 1000;
}

/**
 * Échappe une chaîne pour insertion sûre dans du HTML.
 * @param {*} s - valeur à échapper (convertie en chaîne)
 * @returns {string}
 */
export function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Génère un identifiant unique préfixé, ex. genId('mvt') → « mvt-k3f9x2a7 ».
 * @param {string} prefixe - préfixe métier
 * @returns {string}
 */
export function genId(prefixe) {
  const aleatoire = Math.random().toString(36).slice(2, 8);
  const horodatage = Date.now().toString(36).slice(-4);
  return `${prefixe}-${horodatage}${aleatoire}`;
}
