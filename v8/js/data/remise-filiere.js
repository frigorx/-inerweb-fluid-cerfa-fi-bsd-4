// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — REMISE EN FILIÈRE DÉCHETS (lot B2)
//
// Module PUR (aucune entrée/sortie, aucun store) : il porte le
// vocabulaire, la mention permanente et les règles de forme du
// SUIVI INTERNE de remise en filière.
//
// Pourquoi ce module existe (constat A07) : l'objet interne du
// logiciel s'appelait « BSFF », comme le bordereau de suivi de
// déchets dématérialisé obligatoire. Il en portait le nom, le
// libellé d'écran, l'en-tête de colonne du dossier d'audit — sans
// en être un. Un document interne qui emprunte le nom d'un document
// réglementaire finit par en tenir lieu : c'est exactement ce qu'il
// ne doit pas faire. Le logiciel dit désormais ce qu'il est.
//
// Miroir littéral CommonJS côté serveur : server/remise-filiere.js
// (parité prouvée par server/test-remise-filiere-parite.mjs).
// ============================================================

/** Nom de l'objet interne, partout où l'utilisateur le lit. */
export const LIBELLE_SUIVI = 'Suivi interne de remise en filière';

/** Forme courte (colonnes de tableau, boutons). */
export const LIBELLE_SUIVI_COURT = 'Suivi interne';

/**
 * MENTION PERMANENTE ET NON AMBIGUË. Affichée sur l'écran des déchets,
 * dans la modale de création, et reportée au sommaire du dossier
 * d'audit scellé. Elle ne cite AUCUNE date ni référence d'arrêté : le
 * fait réglementaire précis relève du propriétaire du registre.
 */
export const MENTION_BORDEREAU_OFFICIEL =
  'Document INTERNE au registre : il ne remplace pas le bordereau de suivi '
  + 'de déchets dématérialisé obligatoire, qui s’établit sur la plateforme '
  + 'nationale prévue à cet effet. Le bordereau officiel doit être joint en '
  + 'pièce jointe et son numéro reporté sur ce suivi.';

/** Libellé du champ qui porte le numéro du bordereau RÉEL (externe). */
export const LIBELLE_BORDEREAU_EXTERNE =
  'N° du bordereau dématérialisé officiel';

/* ============================================================
   B2-3 — FORME ET UNICITÉ DU NUMÉRO INTERNE
   Le logiciel est LOCAL par doctrine : il ne peut pas valider en
   ligne un numéro de bordereau officiel. Il numérote donc ce qui
   lui appartient — le suivi INTERNE — et lui seul. Deux suivis ne
   portent jamais le même numéro : ni par l'API, ni par l'import.
   ============================================================ */

/** Préfixe du numéro de suivi interne (Suivi Interne de Filière). */
export const PREFIXE_NUMERO_SUIVI = 'SIF';

/** Forme canonique : SIF-AAAA-NNNN (année sur 4 chiffres, rang sur 4). */
export const FORME_NUMERO_SUIVI = /^SIF-\d{4}-\d{4}$/;

/** Message canonique — numéro fourni hors forme canonique. */
export const MSG_NUMERO_SUIVI_FORME =
  'Numéro de suivi interne invalide : il est attribué par le logiciel, '
  + 'au format SIF-AAAA-NNNN. Le numéro du bordereau dématérialisé officiel '
  + 'se reporte dans le champ qui lui est réservé.';

/**
 * Message canonique — numéro déjà porté par un autre suivi.
 * @param {string} numero
 * @returns {string}
 */
export function msgNumeroSuiviDoublon(numero) {
  return `Numéro de suivi interne déjà utilisé : ${numero}. `
    + 'Un suivi de remise en filière ne se numérote jamais deux fois.';
}

/**
 * Clé de comparaison d'un numéro : espaces des bords retirés, espaces
 * internes réduits, casse ignorée. « sif-2026-0001 » et « SIF-2026-0001 »
 * sont le MÊME numéro — sans quoi l'unicité se contourne d'une majuscule.
 * @param {string|null|undefined} numero
 * @returns {string}
 */
export function cleNumeroSuivi(numero) {
  return String(numero ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
}

/**
 * Prochain numéro libre pour l'année donnée : rang maximal déjà utilisé
 * + 1, sur quatre chiffres. Purement LOCAL, aucun réseau, aucun compteur
 * persisté (les numéros existants font foi — un registre importé reprend
 * la numérotation là où elle s'était arrêtée).
 * @param {Array<string|null|undefined>} numerosExistants
 * @param {number|string} annee
 * @returns {string} « SIF-AAAA-NNNN »
 */
export function prochainNumeroSuivi(numerosExistants, annee) {
  const an = String(annee);
  const debut = `${PREFIXE_NUMERO_SUIVI}-${an}-`;
  let rang = 0;
  for (const numero of numerosExistants ?? []) {
    const cle = cleNumeroSuivi(numero);
    if (!cle.startsWith(debut)) continue;
    const n = Number(cle.slice(debut.length));
    if (Number.isInteger(n) && n > rang) rang = n;
  }
  return debut + String(rang + 1).padStart(4, '0');
}

/**
 * Garde de saisie du numéro de suivi interne. Retourne le message
 * canonique du refus, ou null si le numéro est acceptable.
 * @param {string} numero - numéro FOURNI (jamais vide : l'absence
 *   déclenche l'attribution automatique, ce n'est pas une erreur)
 * @param {Array<string|null|undefined>} numerosExistants
 * @returns {string|null}
 */
export function verifierNumeroSuivi(numero, numerosExistants) {
  const cle = cleNumeroSuivi(numero);
  if (!FORME_NUMERO_SUIVI.test(cle)) return MSG_NUMERO_SUIVI_FORME;
  for (const autre of numerosExistants ?? []) {
    if (cleNumeroSuivi(autre) === cle) return msgNumeroSuiviDoublon(cle);
  }
  return null;
}

/**
 * Invariant d'import : deux suivis ne peuvent pas porter le même numéro.
 * La FORME n'est PAS exigée ici — un registre antérieur reste importable
 * (on n'empêche jamais de reprendre la réalité déjà enregistrée) ; le
 * DOUBLON, lui, ne peut être qu'une incohérence.
 * @param {object[]} suivis
 * @returns {string|null} description du problème, ou null
 */
export function problemeNumerosSuivi(suivis) {
  const vus = new Set();
  for (const s of suivis ?? []) {
    const cle = cleNumeroSuivi(s && s.numeroBsff);
    if (!cle) continue;
    if (vus.has(cle)) {
      return `suivi de remise en filière ${cle} : numéro en double`;
    }
    vus.add(cle);
  }
  return null;
}
