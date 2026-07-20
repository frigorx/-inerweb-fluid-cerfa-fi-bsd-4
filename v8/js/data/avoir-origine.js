// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide v8 — « avoir de fluide par machine d'origine »
// Module PUR/Node-testable (zéro DOM), DÉRIVÉ des mouvements —
// rien de nouveau n'est stocké (patron de vie-bouteille.js).
//
// Règle métier (F. Henninot, frigoriste) : le fluide RÉCUPÉRÉ d'une
// machine M ne peut être RÉEMPLOYÉ que sur M, à concurrence de ce qui
// a été récupéré de M. Ce module calcule, pour une bouteille B, combien
// de fluide d'origine M y reste disponible :
//   avoir(M, B) = Σ récupérations (M → B) − Σ réemplois (B → M)
// sur les mouvements ACTIFS (VALIDE, hors contre-écritures — un mouvement
// annulé et sa contre-écriture sortent tous deux du compte : effet net
// nul, comme pour la masse vivante de la bouteille).
//
// Conventions de signe (appliquerEffets / variationPourBouteille) :
//   - RÉCUPÉRATION : machineId = M, bouteilleDstId = B, quantiteKg NÉGATIF
//     → la bouteille gagne (−quantiteKg) d'origine M ;
//   - CHARGE/réemploi : machineId = M, bouteilleSrcId = B, quantiteKg POSITIF
//     → la bouteille perd quantiteKg, imputé à l'origine M.
//
// TRANSFERT (point délicat, V1) : un transfert déplace du fluide sans
// machine d'origine → il n'entre PAS dans ce calcul. Le fluide issu d'un
// transfert n'a donc pas d'avoir d'origine (un réemploi qui s'y appuierait
// est signalé comme anomalie — CM-2). La masse PHYSIQUE de la bouteille
// (gardée par retirerDeBouteille) borne de toute façon tout prélèvement.
// ============================================================

const TYPES_RECUPERATION = ['RECUPERATION_MAINTENANCE', 'RECUPERATION_DEMANTELEMENT'];
const TYPES_CHARGE = ['CHARGE_APPOINT', 'MISE_EN_SERVICE'];

/** Arrondi au gramme (mêmes 3 décimales que le reste du cœur). */
function arrondirGramme(kg) {
  return Math.round(kg * 1000) / 1000;
}

/** Mouvements dont l'effet stock est ACTIF (VALIDE, hors contre-écritures). */
function mouvementsActifs(mouvements) {
  return (mouvements ?? []).filter((mv) =>
    mv.statut === 'VALIDE' && !mv.contreEcritureDe);
}

/**
 * Avoir de fluide récupéré par machine d'origine, présent dans une bouteille.
 * @param {string} bouteilleId
 * @param {Array} mouvements — lectures du contrat (getMouvements) telles quelles
 * @returns {Map<string, number>} machineId → kg d'origine (valeur NETTE, brute :
 *          peut être 0 voire négative si les données sont incohérentes — le
 *          consommateur décide ; voir avoirOrigineDisponible pour la règle).
 */
export function avoirParMachineOrigine(bouteilleId, mouvements) {
  const avoir = new Map();
  for (const mv of mouvementsActifs(mouvements)) {
    if (mv.quantiteKg == null || mv.machineId == null) continue;
    if (TYPES_RECUPERATION.includes(mv.type)
        && mv.bouteilleDstId === bouteilleId) {
      const gain = -mv.quantiteKg; // quantiteKg négatif → gain positif
      avoir.set(mv.machineId,
        arrondirGramme((avoir.get(mv.machineId) ?? 0) + gain));
    } else if (TYPES_CHARGE.includes(mv.type)
        && mv.bouteilleSrcId === bouteilleId) {
      const perte = mv.quantiteKg; // positif
      avoir.set(mv.machineId,
        arrondirGramme((avoir.get(mv.machineId) ?? 0) - perte));
    }
  }
  return avoir;
}

/**
 * Avoir d'origine DISPONIBLE pour UNE machine dans une bouteille (kg), borné
 * à 0 : un net négatif (incohérence ou origine brouillée par transfert) vaut
 * « rien de disponible d'origine M » pour la règle de réemploi (CM-2).
 */
export function avoirOrigineDisponible(bouteilleId, machineId, mouvements) {
  const net = avoirParMachineOrigine(bouteilleId, mouvements).get(machineId) ?? 0;
  return net > 0 ? net : 0;
}
