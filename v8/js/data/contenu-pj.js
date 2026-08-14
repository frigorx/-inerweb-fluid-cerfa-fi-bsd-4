// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide v8 — contenu binaire des pièces jointes
// (PUR/Node-testable, zéro DOM, zéro store).
//
// Rôle : adapter le CONTENU d'une pièce jointe au transport JSON.
//   - versBase64(contenu)      : Blob | File | Uint8Array | ArrayBuffer |
//                                chaîne base64 → chaîne base64 PURE.
//   - versBlob(base64, mime)   : chaîne base64 → Blob (contenu binaire,
//                                ce que le contrat promet et ce que le
//                                DemoStore rend) ; Uint8Array si Blob absent.
//   - estBase64(valeur)        : la chaîne est-elle de la base64 lisible ?
//
// POURQUOI (défaut trouvé à l'audit du 14/07) : JSON ne sait PAS porter un
// Blob — `JSON.stringify(new Blob(…))` rend `{}`. Sans cette conversion, le
// fichier choisi par l'utilisateur arrivait au serveur local sous la forme
// `{}`, y était accepté (truthy), décodé en 9 octets de déchet, écrit sur
// disque, haché en SHA-256 et journalisé comme pièce probante. Le DemoStore,
// lui, refusait proprement : les deux implémentations divergeaient en silence.
//
// PIÈGES : encoder par TRANCHES (String.fromCharCode(...5 Mo) déborde la
// pile) ; messages d'erreur repris MOT POUR MOT du DemoStore (parité du
// contrat) — server/api.js en tient le miroir (refus d'un contenu non
// textuel + base64 illisible).
// ============================================================

/** Message du DemoStore quand le contenu n'est ni un binaire ni du base64. */
export const MSG_CONTENU_ATTENDU =
  'Contenu de pièce jointe attendu : blob ou base64.';

/** Message du DemoStore quand la base64 est indécodable. */
export const MSG_BASE64_ILLISIBLE =
  'Contenu base64 illisible pour la pièce jointe.';

/** Préfixe des URL de données (`data:image/png;base64,…`), toléré en entrée. */
const PREFIXE_DATA = /^data:[^;]*;base64,/;

/** Alphabet base64 standard, padding optionnel — rien d'autre n'est admis. */
const BASE64_VALIDE = /^[A-Za-z0-9+/]*={0,2}$/;

/** Taille de tranche d'encodage (String.fromCharCode borne le nombre d'arguments). */
const TRANCHE = 0x8000;

/**
 * La valeur est-elle une chaîne base64 lisible (préfixe `data:` toléré) ?
 * @param {unknown} valeur
 * @returns {boolean}
 */
export function estBase64(valeur) {
  if (typeof valeur !== 'string') return false;
  return BASE64_VALIDE.test(valeur.replace(PREFIXE_DATA, ''));
}

/** Encode des octets en base64, par tranches (5 Mo ne passent pas en un appel). */
function octetsVersBase64(octets) {
  let binaire = '';
  for (let debut = 0; debut < octets.length; debut += TRANCHE) {
    const fin = Math.min(debut + TRANCHE, octets.length);
    binaire += String.fromCharCode.apply(null, octets.subarray(debut, fin));
  }
  return btoa(binaire);
}

/**
 * Décode une chaîne base64 en octets.
 * @param {string} base64 (préfixe `data:` toléré)
 * @returns {Uint8Array}
 * @throws {Error} MSG_BASE64_ILLISIBLE si la chaîne n'est pas de la base64
 */
export function base64VersOctets(base64) {
  if (!estBase64(base64)) throw new Error(MSG_BASE64_ILLISIBLE);
  let binaire;
  try {
    binaire = atob(base64.replace(PREFIXE_DATA, ''));
  } catch {
    throw new Error(MSG_BASE64_ILLISIBLE);
  }
  const octets = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i += 1) octets[i] = binaire.charCodeAt(i);
  return octets;
}

/**
 * Contenu quelconque → chaîne base64 PURE (transportable en JSON).
 * Reprend les types acceptés par le DemoStore, dans le même ordre.
 * @param {Blob|File|Uint8Array|ArrayBuffer|string} contenu
 * @returns {Promise<string>}
 * @throws {Error} MSG_CONTENU_ATTENDU (type refusé) ou MSG_BASE64_ILLISIBLE
 */
export async function versBase64(contenu) {
  if (typeof Blob !== 'undefined' && contenu instanceof Blob) {
    return octetsVersBase64(new Uint8Array(await contenu.arrayBuffer()));
  }
  if (contenu instanceof Uint8Array) return octetsVersBase64(contenu);
  if (contenu instanceof ArrayBuffer) {
    return octetsVersBase64(new Uint8Array(contenu));
  }
  if (typeof contenu === 'string') {
    const base64 = contenu.replace(PREFIXE_DATA, '');
    if (!BASE64_VALIDE.test(base64)) throw new Error(MSG_BASE64_ILLISIBLE);
    return base64;
  }
  throw new Error(MSG_CONTENU_ATTENDU);
}

/**
 * Chaîne base64 → contenu binaire, tel que le contrat le promet
 * (`obtenirPieceJointe` : « métadonnées + contenu binaire »).
 * @param {string} base64
 * @param {string} [mimeType]
 * @returns {Blob|Uint8Array} Blob, ou octets bruts si Blob est indisponible
 */
export function versBlob(base64, mimeType) {
  const octets = base64VersOctets(base64);
  if (typeof Blob === 'undefined') return octets;
  return new Blob([octets], { type: mimeType || 'application/octet-stream' });
}

/** Message levé quand le CONTENU réel d'une PJ dément le type déclaré. */
export const MSG_SIGNATURE_PJ =
  'Contenu du fichier incohérent avec le type déclaré ' +
  '(signature binaire non conforme).';

/**
 * Signatures binaires (« nombres magiques ») des SEULS types de PJ acceptés
 * (PDF, PNG, JPEG, WebP). Chaque entrée = une liste de motifs { pos, octets } :
 * le fichier concorde si TOUS les motifs de son type sont présents aux bons
 * décalages. WebP a besoin de deux ancres (RIFF au début, WEBP à l'octet 8).
 */
const SIGNATURES_PJ = {
  'application/pdf': [{ pos: 0, octets: [0x25, 0x50, 0x44, 0x46] }],           // %PDF
  'image/png': [{ pos: 0, octets: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  'image/jpeg': [{ pos: 0, octets: [0xff, 0xd8, 0xff] }],
  'image/webp': [
    { pos: 0, octets: [0x52, 0x49, 0x46, 0x46] },                             // RIFF
    { pos: 8, octets: [0x57, 0x45, 0x42, 0x50] },                             // WEBP
  ],
};

/**
 * La signature binaire RÉELLE des `octets` concorde-t-elle avec le `mimeType`
 * DÉCLARÉ ? Ne fait confiance qu'aux octets, jamais au type annoncé — c'est le
 * garde-fou audit-proof contre un fichier hostile déguisé (un exécutable ou du
 * HTML renommé « .pdf »). Retourne false si le type n'a pas de signature connue
 * ou si le fichier est trop court (un octet manquant vaut « ne concorde pas »).
 * @param {Uint8Array} octets
 * @param {string} mimeType (attendu déjà en minuscules, déjà dans la liste blanche)
 * @returns {boolean}
 */
export function signatureConcordeAvecMime(octets, mimeType) {
  const motifs = SIGNATURES_PJ[mimeType];
  if (!motifs || !octets) return false;
  for (const { pos, octets: attendus } of motifs) {
    for (let i = 0; i < attendus.length; i += 1) {
      if (octets[pos + i] !== attendus[i]) return false;
    }
  }
  return true;
}
