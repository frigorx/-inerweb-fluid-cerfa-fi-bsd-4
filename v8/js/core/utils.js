// ============================================================
// inerWeb Fluide v8 — utilitaires partagés (Phase A)
// Formatage fr-FR (virgule décimale), échappement HTML, identifiants.
// Aucune dépendance externe. Module ES.
// ============================================================

/**
 * Convertit une saisie fr-FR en nombre JavaScript.
 * Accepte un nombre (retourné tel quel) ou une chaîne : les espaces
 * (y compris fines/insécables et séparateurs de milliers) sont retirés,
 * la virgule décimale est remplacée par un point, puis Number() est
 * appliqué. Number("13,9") vaut NaN en JS : ce helper évite ce piège.
 * @param {number|string} valeur - saisie à convertir
 * @returns {number} le nombre, ou NaN si la saisie est invalide
 */
export function nombreFr(valeur) {
  if (typeof valeur === 'number') return valeur;
  if (typeof valeur !== 'string') return NaN;
  const nettoyee = valeur
    .trim()
    // tous les espaces : \s couvre en JS les fines (U+202F) et
    // insécables (U+00A0), séparateurs de milliers en fr-FR
    .replace(/[\s   ]/g, '')
    .replace(',', '.');
  if (nettoyee === '') return NaN;
  return Number(nettoyee);
}

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

// ------------------------------------------------------------
// Chaîne d'intégrité des écritures (Phase B — registre vivant)
// ------------------------------------------------------------

/**
 * Champs MÉTIER d'un mouvement pris en compte dans le hachage.
 * Le statut est volontairement EXCLU : une écriture annulée passe
 * de VALIDE à ANNULE sans que sa signature ne soit invalidée
 * (ses données métier restent intactes).
 */
const CHAMPS_HASH_MOUVEMENT = [
  'id', 'numero', 'date', 'mode', 'type',
  'machineId', 'fluide', 'quantiteKg',
  'peseeAvantKg', 'peseeApresKg',
  'bouteilleSrcId', 'bouteilleDstId',
  'causeMouvement', 'controle', 'technicien',
  'validateurId', 'contreEcritureDe', 'motif'
];

/** Retourne l'API SubtleCrypto (navigateur, ou repli Node ≥ 18). */
async function obtenirSubtle() {
  if (globalThis.crypto && globalThis.crypto.subtle) {
    return globalThis.crypto.subtle;
  }
  // Node sans crypto global : module natif (jamais atteint en navigateur)
  const { webcrypto } = await import('node:crypto');
  return webcrypto.subtle;
}

/**
 * Calcule l'empreinte SHA-256 (hexadécimale) d'une écriture de mouvement,
 * chaînée à l'empreinte de l'écriture validée précédente.
 * @param {object} mouvement - écriture (les champs absents comptent pour null)
 * @param {string|null} hashPrecedent - empreinte précédente de la chaîne
 * @returns {Promise<string>} empreinte hexadécimale (64 caractères)
 */
export async function hasherEcriture(mouvement, hashPrecedent) {
  const champs = {};
  for (const nom of CHAMPS_HASH_MOUVEMENT) {
    champs[nom] = mouvement[nom] ?? null;
  }
  const texte = `${JSON.stringify(champs)}|${hashPrecedent ?? ''}`;
  const subtle = await obtenirSubtle();
  const empreinte = await subtle.digest('SHA-256',
    new TextEncoder().encode(texte));
  return [...new Uint8Array(empreinte)]
    .map((octet) => octet.toString(16).padStart(2, '0'))
    .join('');
}
