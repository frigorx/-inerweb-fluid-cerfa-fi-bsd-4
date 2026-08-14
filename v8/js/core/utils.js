// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
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
// Code public (V9.1 — fiche machine vivante, QR hors-ligne)
// ------------------------------------------------------------

/**
 * Alphabet base32 Crockford, SANS I, L, O, U (ambiguïtés visuelles à la
 * lecture manuelle comme au scan). 32 symboles, 5 bits chacun.
 */
const ALPHABET_CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** Longueur fixe d'un code public (VISION-V9-V10 §6). */
export const LONGUEUR_CODE_PUBLIC = 7;

/**
 * Génère un identifiant OPAQUE base32 Crockford de 7 caractères, tiré au
 * hasard (crypto, jamais Math.random : c'est un identifiant public exposé
 * par QR, pas seulement une clé technique interne). Ne garantit PAS
 * l'unicité à lui seul : l'appelant retire (retry) en cas de collision
 * avec le parc existant.
 * @returns {string} ex. « 8F3K2Q7 »
 */
export function genererCodePublic() {
  const octets = new Uint8Array(LONGUEUR_CODE_PUBLIC);
  globalThis.crypto.getRandomValues(octets);
  let code = '';
  for (let i = 0; i < LONGUEUR_CODE_PUBLIC; i += 1) {
    code += ALPHABET_CROCKFORD[octets[i] % ALPHABET_CROCKFORD.length];
  }
  return code;
}

/**
 * Vrai si `valeur` a la forme d'un code public valide (7 caractères de
 * l'alphabet Crockford restreint). N'atteste PAS son existence en base.
 * @param {*} valeur
 * @returns {boolean}
 */
export function estCodePublicValide(valeur) {
  if (typeof valeur !== 'string') return false;
  const motif = new RegExp(`^[${ALPHABET_CROCKFORD}]{${LONGUEUR_CODE_PUBLIC}}$`);
  return motif.test(valeur);
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
export const CHAMPS_HASH_MOUVEMENT = [
  'id', 'numero', 'date', 'mode', 'type',
  'machineId', 'fluide', 'quantiteKg',
  'peseeAvantKg', 'peseeApresKg',
  'bouteilleSrcId', 'bouteilleDstId',
  'causeMouvement', 'controle', 'technicien',
  'validateurId', 'contreEcritureDe', 'motif'
];

/**
 * Champs de l'empreinte RENFORCÉE v2 (lot C, brique C2 — condition 4 du
 * plan audit-proof) : les 18 champs v1 PLUS le PRP figé, le numéro CERFA,
 * les rôles réels de l'intervention, et les champs dérivés GELÉS au
 * scellement (outils figés, empreinte des signatures, empreinte des pièces
 * jointes, empreinte du PDF final). L'ORDRE est contractuel
 * (JSON.stringify). La liste v1 ci-dessus est FIGÉE À JAMAIS : les
 * écritures existantes gardent leur empreinte v1, on ne recalcule rien.
 */
export const CHAMPS_HASH_MOUVEMENT_V2 = [
  ...CHAMPS_HASH_MOUVEMENT,
  'prpFige', 'cerfaNumero',
  'executeParId', 'superviseurId', 'responsableRegistreId',
  'outilsFiges', 'hashSignatures', 'hashPiecesJointes', 'hashPdfFinal'
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
  // Lot C (C2) : hasseur VERSIONNÉ — la version de l'ÉCRITURE choisit sa
  // liste de champs (2 = renforcée ; 1 ou absente = historique, préimage
  // STRICTEMENT inchangée bit à bit). On ne recalcule JAMAIS une v1 en v2.
  const noms = (mouvement.versionEmpreinte ?? 1) >= 2
    ? CHAMPS_HASH_MOUVEMENT_V2 : CHAMPS_HASH_MOUVEMENT;
  const champs = {};
  for (const nom of noms) {
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

/**
 * Empreinte SHA-256 d'une LISTE de chaînes, TRIÉE puis JSON-sérialisée —
 * LA forme canonique des champs gelés du scellement v2 (hashSignatures sur
 * les formes canoniques des signatures, hashPiecesJointes sur les sha256
 * des pièces jointes). Une liste VIDE donne l'empreinte de « [] » (jamais
 * null : l'absence PROUVÉE se distingue de l'absence de calcul).
 * Miroir CommonJS : server/hash-mouvement.js (ne jamais toucher l'un sans
 * l'autre — parité prouvée par test-hash-mouvement).
 * @param {string[]} chaines
 * @returns {Promise<string>} empreinte hexadécimale (64 caractères)
 */
export async function empreinteListeTriee(chaines) {
  const texte = JSON.stringify([...chaines].sort());
  const subtle = await obtenirSubtle();
  const empreinte = await subtle.digest('SHA-256',
    new TextEncoder().encode(texte));
  return [...new Uint8Array(empreinte)]
    .map((octet) => octet.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Forme CANONIQUE d'une signature réelle pour l'empreinte v2 (plan lot C
 * §6) : ordre de clés FIXE, champs absents comptés null, l'image réduite à
 * son empreinte (sha256Image = SHA-256 des octets du PNG). La délégation et
 * l'organisation sont DÉJÀ portées par la déclaration figée.
 * @param {object} signature Enregistrement camelCase de la signature.
 * @param {?string} sha256Image Empreinte hexadécimale des octets de l'image.
 * @returns {string} JSON canonique (une ligne de la liste triée).
 */
/**
 * P1-2 — fluides PROPOSABLES à la saisie : les fluides ACTIFS du
 * référentiel, plus, le cas échéant, celui déjà enregistré sur la fiche
 * ouverte même s'il a été désactivé depuis.
 *
 * Sans cette exception, rouvrir une vieille machine au R-22 (fluide qu'on
 * ne monte plus mais qu'on récupère encore) viderait son fluide en
 * silence à l'enregistrement — une donnée réelle perdue par un effet de
 * bord d'écran. Même principe que `preserverHorsListe` des états de
 * bouteille (CM-4c) : on ne substitue JAMAIS une valeur enregistrée.
 * L'ordre du référentiel est conservé.
 *
 * @param {Array<{code: string, actif?: boolean}>} fluides — getFluides()
 * @param {string|null} [codeRetenu] — fluide déjà enregistré sur la fiche
 * @returns {Array<object>} sous-ensemble proposable
 */
export function fluidesProposables(fluides, codeRetenu = null) {
  return (fluides ?? []).filter((f) =>
    f.actif !== false || (codeRetenu != null && f.code === codeRetenu));
}

export function chaineCanoniqueSignature(signature, sha256Image) {
  return JSON.stringify({
    role: signature.role ?? null,
    nom: signature.nom ?? null,
    prenom: signature.prenom ?? null,
    qualite: signature.qualite ?? null,
    dateHeure: signature.dateHeure ?? null,
    declaration: signature.declaration ?? null,
    sha256Image: sha256Image ?? null,
    versionDocument: signature.versionDocument ?? null
  });
}
