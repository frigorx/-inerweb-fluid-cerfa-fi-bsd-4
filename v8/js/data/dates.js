// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// MODULE PUR — « une date est une date » (lot L2, 25/07/2026).
//
// POURQUOI CE MODULE EXISTE.
// Le logiciel décide de choses opposables en COMPARANT DES CHAÎNES :
// `h.dateFin < aujourdhui`, `d.dateDebut > FIN_DELIVRANCE_2008`,
// `detectionVerifieeLe` + 12 mois. Tant que la valeur est une vraie date
// ISO, la comparaison lexicographique dit vrai — c'est même l'astuce qui
// rend le format AAAA-MM-JJ si commode. Mais elle ne dit plus rien du tout
// dès que la valeur n'est pas une date :
//
//   '31/12/2020' < '2026-07-25'  →  FAUX  (le '3' est après le '2')
//   → une attestation périmée depuis six ans est déclarée VALIDE.
//   '2028-99-99' passe /^\d{4}-\d{2}-\d{2}$/ → une détection « vérifiée »
//   au 99ᵉ jour du 99ᵉ mois allège la fréquence de contrôle par deux.
//
// Les deux ont été TIRÉS et prouvés le 25/07/2026 (suite de sécurité
// négative, lot L2). La leçon de la revue L4 est ici généralisée : le
// FORMAT NE SUFFIT PAS, il faut le CALENDRIER RÉEL — d'où l'aller-retour
// par Date.UTC, seul moyen sûr de refuser le 30 février.
//
// Règle d'emploi, valable partout :
//   - une date ABSENTE (null, undefined, '') reste une donnée légitime :
//     « pas d'échéance », « jamais vérifié ». Une clé absente ne vaut pas
//     décision (doctrine maison, payée deux fois) ;
//   - une date PRÉSENTE mais illisible n'est jamais interprétée : elle est
//     refusée à la saisie, et le moteur qui la rencontre quand même
//     REFUSE au lieu de conclure (défaut-refus).
//
// Miroir littéral CommonJS : server/dates.js — parité prouvée par
// server/test-dates.mjs. Ne jamais toucher l'un sans l'autre.
// ============================================================

/** Message canonique de refus, pour un champ nommé. */
export function messageDateInvalide(libelleChamp) {
  return `${libelleChamp} invalide (AAAA-MM-JJ attendu, date réelle).`;
}

/**
 * Vrai si la valeur est une date AAAA-MM-JJ du calendrier RÉEL.
 * Refuse : tout autre format (y compris JJ/MM/AAAA), le 30 février, le
 * mois 13, le jour 99, une valeur vide, un nombre, un objet.
 * @param {unknown} valeur
 * @returns {boolean}
 */
export function estDateCalendaire(valeur) {
  if (typeof valeur !== 'string') return false;
  const trouve = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valeur);
  if (!trouve) return false;
  const annee = Number(trouve[1]);
  const mois = Number(trouve[2]);
  const jour = Number(trouve[3]);
  // Aller-retour UTC : seul moyen sûr de refuser le 30 février — JavaScript
  // « rattrape » silencieusement une date impossible sur le mois suivant.
  const date = new Date(Date.UTC(annee, mois - 1, jour));
  return date.getUTCFullYear() === annee
    && date.getUTCMonth() === mois - 1
    && date.getUTCDate() === jour;
}

/**
 * Vrai si la valeur est ABSENTE (donnée légitime) ou une date réelle.
 * C'est la forme à utiliser pour les gardes de saisie : elle laisse passer
 * « pas de date » et n'arrête que l'illisible.
 * @param {unknown} valeur
 * @returns {boolean}
 */
export function estDateCalendaireOuVide(valeur) {
  if (valeur === null || valeur === undefined || valeur === '') return true;
  return estDateCalendaire(valeur);
}

/**
 * Vrai si la valeur est une date réelle POSTÉRIEURE au jour donné.
 * Une date illisible n'est pas « future » : elle est illisible — c'est
 * `estDateCalendaire` qui la refuse, pas cette fonction.
 * @param {unknown} valeur
 * @param {string} jour AAAA-MM-JJ (aujourd'hui, en général)
 * @returns {boolean}
 */
export function estDateFuture(valeur, jour) {
  if (!estDateCalendaire(valeur) || !estDateCalendaire(jour)) return false;
  return valeur > jour;
}
