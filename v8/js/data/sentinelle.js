// ============================================================
// inerWeb Fluide v8 — SENTINELLE d'alertes persistées (module pur)
//
// getAlertes() reste la SEULE vérité du présent : la sentinelle
// n'invente ni ne cache aucune alerte. Elle pose par-dessus une
// couche TEMPORELLE opposable — depuis quand une alerte est active
// (apparueLe), quand elle a cessé (resolueLe), et la preuve qu'un
// responsable en a pris connaissance (acquitteeLe / acquitteePar).
//
// Un « épisode » = une occurrence continue d'une alerte donnée. Une
// alerte qui disparaît puis réapparaît ouvre un NOUVEL épisode
// (l'ancien reste archivé, résolu) — même logique d'historisation
// que les dossiers de fuite.
//
// Ce module est PUR (aucun accès au stockage, aucune horloge : le
// « maintenant » est toujours injecté). Il est dupliqué à
// l'identique côté serveur (server/api.js, « miroir exact ») ; la
// parité de SORTIE est garantie par test-contrat.mjs, pas par le
// partage de code (le serveur est CommonJS, le front ESM).
//
// GARDE-FOU AUDIT : il n'existe AUCUNE fonction de masquage /
// snooze / suppression. Acquitter, c'est « j'ai vu », jamais « fais
// disparaître » : une alerte critique acquittée reste active,
// visible, et le feu tricolore reste au rouge tant qu'elle dure.
// ============================================================

/**
 * Un épisode est OUVERT tant qu'il n'est pas résolu.
 * @param {{ resolueLe?: string|null }} episode
 */
export function estOuvert(episode) {
  return !episode.resolueLe;
}

/**
 * Diff PUR entre les alertes actives du présent et les épisodes
 * encore ouverts : ce qu'il faut créer (apparitions), rafraîchir en
 * cas de changement de gravité (escalades) et clore (résolutions).
 * Idempotent : rejoué sans changement d'état, les trois listes sont
 * vides.
 *
 * @param {Array<{id, niveau, titre, detail?, cible?}>} alertesActives
 *        la sortie de getAlertes() (id stable par alerte).
 * @param {Array<{id, idAlerte, niveau, ...}>} episodesOuverts
 *        les épisodes de la table dont resolueLe est nul (le `niveau`
 *        porté = le snapshot courant, comparé pour détecter l'escalade).
 * @param {string} maintenantIso horodatage ISO complet injecté.
 * @returns {{ apparitions: Array<object>, escalades: Array<object>,
 *          resolutions: string[] }}
 *          apparitions = données d'épisode SANS id (le store attribue
 *          l'identité) ; escalades = { id, niveau, titre, detail,
 *          cibleVue, cibleId } d'épisodes ouverts dont la GRAVITÉ a
 *          changé (le store rafraîchit le snapshot ET remet à zéro
 *          l'acquittement) ; resolutions = ids d'épisode à clore.
 */
export function calculerTransitions(alertesActives, episodesOuverts, maintenantIso) {
  const idsActifs = new Set(alertesActives.map((a) => a.id));
  const ouvertParIdAlerte = new Map();
  for (const e of episodesOuverts) ouvertParIdAlerte.set(e.idAlerte, e);

  const apparitions = [];
  const escalades = [];
  const vus = new Set(); // dédup défensif : un id d'alerte est unique par tour

  for (const a of alertesActives) {
    if (vus.has(a.id)) continue;
    vus.add(a.id);
    const ouvert = ouvertParIdAlerte.get(a.id);
    if (!ouvert) {
      // Apparition : une alerte active sans épisode ouvert correspondant.
      apparitions.push({
        idAlerte: a.id,
        niveau: a.niveau,
        titre: a.titre,
        detail: a.detail ?? null,
        cibleVue: a.cible?.vue ?? null,
        cibleId: a.cible?.id ?? null,
        apparueLe: maintenantIso
      });
    } else if (ouvert.niveau !== a.niveau) {
      // Escalade (ou allègement) : la GRAVITÉ de l'alerte a changé sous
      // le même id (ex. capacité « à renouveler » IMPORTANT → « expirée »
      // CRITIQUE). On rafraîchit le snapshot ET on remet à zéro
      // l'acquittement : avoir pris acte de la version douce ne vaut pas
      // prise d'acte de l'aggravation (fidélité d'audit).
      escalades.push({
        id: ouvert.id,
        niveau: a.niveau,
        titre: a.titre,
        detail: a.detail ?? null,
        cibleVue: a.cible?.vue ?? null,
        cibleId: a.cible?.id ?? null
      });
    }
  }

  // Résolution : un épisode ouvert dont l'alerte n'est plus active.
  const resolutions = episodesOuverts
    .filter((e) => !idsActifs.has(e.idAlerte))
    .map((e) => e.id);

  return { apparitions, escalades, resolutions };
}

/**
 * Met un épisode STOCKÉ (forme à plat, colonnes/props brutes) à la
 * forme de SORTIE du contrat : cible reconstruite en objet, valeurs
 * nulles normalisées. Le snapshot (niveau/titre/detail) est celui
 * FIGÉ à l'apparition — l'affichage courant, lui, lit getAlertes()
 * (toujours frais) et n'utilise le snapshot que pour l'historique
 * des épisodes résolus.
 *
 * @param {object} e épisode brut { id, idAlerte, niveau, titre,
 *        detail, cibleVue, cibleId, apparueLe, resolueLe,
 *        acquitteeLe, acquitteePar }
 */
export function formaterEpisode(e) {
  return {
    id: e.id,
    idAlerte: e.idAlerte,
    niveau: e.niveau,
    titre: e.titre,
    detail: e.detail ?? null,
    cible: e.cibleVue ? { vue: e.cibleVue, id: e.cibleId ?? null } : null,
    apparueLe: e.apparueLe,
    resolueLe: e.resolueLe ?? null,
    acquitteeLe: e.acquitteeLe ?? null,
    acquitteePar: e.acquitteePar ?? null
  };
}

/**
 * Ordre d'affichage stable : apparitions les plus récentes d'abord.
 * Départage DÉTERMINISTE et COMMUN aux deux stores par idAlerte —
 * l'id de stockage est aléatoire et diffère d'un store à l'autre, il
 * ferait diverger le tri (donc la parité). Deux épisodes de même
 * apparueLe partagent forcément des idAlerte distincts (au plus un
 * épisode ouvert par alerte, et deux résolus d'un même id ont des
 * apparueLe différents).
 */
export function comparerEpisodes(a, b) {
  if (a.apparueLe !== b.apparueLe) return a.apparueLe < b.apparueLe ? 1 : -1;
  if (a.idAlerte === b.idAlerte) return 0;
  return a.idAlerte < b.idAlerte ? -1 : 1;
}
