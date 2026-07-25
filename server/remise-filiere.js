// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
'use strict';

/**
 * inerWeb Fluide — REMISE EN FILIÈRE DÉCHETS (lot B2).
 *
 * MIROIR LITTÉRAL CommonJS des règles pures de
 * v8/js/data/remise-filiere.js. Parité prouvée par
 * server/test-remise-filiere-parite.mjs : toute divergence de
 * comportement OU de message rend la suite rouge.
 *
 * Ne toucher un miroir sans l'autre est la faute la plus chère du
 * projet (deux vérités = deux registres).
 */

/** Préfixe du numéro de suivi interne (Suivi Interne de Filière). */
const PREFIXE_NUMERO_SUIVI = 'SIF';

/** Forme canonique : SIF-AAAA-NNNN (année sur 4 chiffres, rang sur 4). */
const FORME_NUMERO_SUIVI = /^SIF-\d{4}-\d{4}$/;

/** Message canonique — numéro fourni hors forme canonique. */
const MSG_NUMERO_SUIVI_FORME =
  'Numéro de suivi interne invalide : il est attribué par le logiciel, '
  + 'au format SIF-AAAA-NNNN. Le numéro du bordereau dématérialisé officiel '
  + 'se reporte dans le champ qui lui est réservé.';

/** Message canonique — numéro déjà porté par un autre suivi. */
function msgNumeroSuiviDoublon(numero) {
  return `Numéro de suivi interne déjà utilisé : ${numero}. `
    + 'Un suivi de remise en filière ne se numérote jamais deux fois.';
}

/** Clé de comparaison d'un numéro (bords, espaces internes, casse). */
function cleNumeroSuivi(numero) {
  return String(numero ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
}

/** Prochain numéro libre pour l'année donnée (purement LOCAL). */
function prochainNumeroSuivi(numerosExistants, annee) {
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

/** Garde de saisie du numéro de suivi interne (message ou null). */
function verifierNumeroSuivi(numero, numerosExistants) {
  const cle = cleNumeroSuivi(numero);
  if (!FORME_NUMERO_SUIVI.test(cle)) return MSG_NUMERO_SUIVI_FORME;
  for (const autre of numerosExistants ?? []) {
    if (cleNumeroSuivi(autre) === cle) return msgNumeroSuiviDoublon(cle);
  }
  return null;
}

/** Invariant d'import : aucun numéro de suivi en double. */
function problemeNumerosSuivi(suivis) {
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

module.exports = {
  PREFIXE_NUMERO_SUIVI,
  FORME_NUMERO_SUIVI,
  MSG_NUMERO_SUIVI_FORME,
  msgNumeroSuiviDoublon,
  cleNumeroSuivi,
  prochainNumeroSuivi,
  verifierNumeroSuivi,
  problemeNumerosSuivi
};
