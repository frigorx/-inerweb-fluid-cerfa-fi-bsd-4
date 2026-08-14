// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// MIROIR LITTÉRAL CommonJS de v8/js/data/dates.js (lot L2, 25/07/2026).
// « Une date est une date » : format AAAA-MM-JJ ET calendrier réel.
//
// Le front (ES modules) et le serveur (CommonJS) partagent la MÊME règle ;
// la parité est prouvée par server/test-dates.mjs, qui joue les deux
// implémentations sur la même batterie de valeurs. Ne jamais toucher l'un
// sans l'autre — c'est la doctrine des modules purs du projet.
//
// Le pourquoi complet (attaques tirées : '31/12/2020' déclaré valide,
// '2028-99-99' qui allège une fréquence de contrôle) est documenté dans
// le module d'origine ; il n'est pas recopié ici pour éviter que les deux
// commentaires divergent.
// ============================================================

/** Message canonique de refus, pour un champ nommé. */
function messageDateInvalide(libelleChamp) {
  return `${libelleChamp} invalide (AAAA-MM-JJ attendu, date réelle).`;
}

/** Vrai si la valeur est une date AAAA-MM-JJ du calendrier RÉEL. */
function estDateCalendaire(valeur) {
  if (typeof valeur !== 'string') return false;
  const trouve = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valeur);
  if (!trouve) return false;
  const annee = Number(trouve[1]);
  const mois = Number(trouve[2]);
  const jour = Number(trouve[3]);
  const date = new Date(Date.UTC(annee, mois - 1, jour));
  return date.getUTCFullYear() === annee
    && date.getUTCMonth() === mois - 1
    && date.getUTCDate() === jour;
}

/** Vrai si la valeur est ABSENTE (donnée légitime) ou une date réelle. */
function estDateCalendaireOuVide(valeur) {
  if (valeur === null || valeur === undefined || valeur === '') return true;
  return estDateCalendaire(valeur);
}

/** Vrai si la valeur est une date réelle POSTÉRIEURE au jour donné. */
function estDateFuture(valeur, jour) {
  if (!estDateCalendaire(valeur) || !estDateCalendaire(jour)) return false;
  return valeur > jour;
}

module.exports = {
  messageDateInvalide,
  estDateCalendaire,
  estDateCalendaireOuVide,
  estDateFuture
};
