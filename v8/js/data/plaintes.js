// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// REGISTRE DES PLAINTES — garde de saisie (report v7, module PUR).
//
// La v7 tenait un registre des réclamations clients dans une feuille. En v8
// il devient une table (migration 35) avec un CRUD propre. Cette garde
// valide le FORMAT et NORMALISE la fiche ; l'existence du client (clientId)
// est vérifiée par le store, qui seul connaît l'annuaire — comme createClient.
//
// Recopiée en littéral côté serveur (api.js) : la parité de comportement est
// prouvée par la suite doublée (mêmes erreurs, mêmes résultats des 2 côtés).
// ============================================================

/** États d'une plainte (liste fermée). */
export const ETATS_PLAINTE = ['RECUE', 'EN_COURS', 'TRAITEE'];

/** Trim → valeur ou null (jamais de chaîne vide stockée). */
function texteOuNull(v) {
  return v !== undefined && v !== null && String(v).trim() !== ''
    ? String(v).trim() : null;
}

const EST_DATE = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v));

/**
 * Valide et normalise une fiche de plainte. En création, `existant` est null
 * (les champs obligatoires doivent être fournis) ; en modification, il porte
 * la fiche actuelle (patch partiel : un champ absent conserve sa valeur).
 *
 * @param {object} d          données entrantes (création ou patch)
 * @param {?object} existant  fiche actuelle (modification) ou null (création)
 * @returns {{clientId:?string, clientLibelle:?string, dateReception:string,
 *   objet:string, reponse:?string, dateReponse:?string, etat:string}}
 * @throws {Error} message canonique si invalide (hors existence du client).
 */
export function verifierPlainte(d, existant) {
  const champ = (nom) => (d[nom] !== undefined
    ? texteOuNull(d[nom])
    : (existant ? existant[nom] ?? null : null));

  const objet = champ('objet');
  if (!objet) throw new Error('Objet de la plainte obligatoire.');

  const dateReception = champ('dateReception');
  if (!dateReception || !EST_DATE(dateReception)) {
    throw new Error('Date de réception obligatoire (AAAA-MM-JJ).');
  }

  const etat = d.etat !== undefined
    ? String(d.etat)
    : (existant ? existant.etat : 'RECUE');
  if (!ETATS_PLAINTE.includes(etat)) {
    throw new Error(`État de plainte inconnu : ${etat} `
      + `(attendu : ${ETATS_PLAINTE.join(', ')}).`);
  }

  const dateReponse = champ('dateReponse');
  if (dateReponse && !EST_DATE(dateReponse)) {
    throw new Error('Date de réponse invalide (AAAA-MM-JJ).');
  }

  return {
    clientId: champ('clientId'),
    clientLibelle: champ('clientLibelle'),
    dateReception,
    objet,
    reponse: champ('reponse'),
    dateReponse,
    etat
  };
}
