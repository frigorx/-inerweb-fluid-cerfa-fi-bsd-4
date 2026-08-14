// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
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
//                 ± lots déplacés par les TRANSFERTS (CM-5)
// sur les mouvements ACTIFS (VALIDE, hors contre-écritures — un mouvement
// annulé et sa contre-écriture sortent tous deux du compte : effet net
// nul, comme pour la masse vivante de la bouteille).
//
// Conventions de signe (appliquerEffets / variationPourBouteille) :
//   - RÉCUPÉRATION : machineId = M, bouteilleDstId = B, quantiteKg NÉGATIF
//     → la bouteille gagne (−quantiteKg) d'origine M ;
//   - CHARGE/réemploi : machineId = M, bouteilleSrcId = B, quantiteKg POSITIF
//     → la bouteille perd quantiteKg, imputé à l'origine M (peut rendre le
//     lot NÉGATIF : réintroduction au-delà du récupéré, signalée — CM-2) ;
//   - TRANSFERT (CM-5) : bouteilleSrcId → bouteilleDstId, quantiteKg POSITIF,
//     machineId null → les lots d'origine SUIVENT le fluide, AU PRORATA de
//     leur solde positif dans la source au moment du transfert (le gaz est
//     physiquement mélangé : tout prélèvement emporte un mélange
//     proportionnel). Un solde négatif ne propage rien ; si la quantité
//     transférée dépasse le total attribué, l'excédent reste SANS origine.
//
// ORDRE : l'allocation d'un transfert dépend des lots « à cet instant » →
// une passe CHRONOLOGIQUE sur les actifs, triés par (date puis numero,
// croissants) = la CHRONOLOGIE MÉTIER, celle des opérations physiques.
// Choix DÉLIBÉRÉ (revue du 22/07) : PAS l'ordre administratif de
// validation (ordreValidation) — valider une pile de brouillons dans un
// ordre de clics quelconque ne doit JAMAIS changer l'attribution des
// lots ; la dérivation reste reproductible depuis les seules données des
// mouvements. Le tri est fait ICI (getMouvements contractuel est
// décroissant) ; l'entrée est acceptée dans n'importe quel ordre.
// ============================================================

const TYPES_RECUPERATION = ['RECUPERATION_MAINTENANCE', 'RECUPERATION_DEMANTELEMENT'];
const TYPES_CHARGE = ['CHARGE_APPOINT', 'MISE_EN_SERVICE'];

/** Arrondi au gramme (mêmes 3 décimales que le reste du cœur). */
function arrondirGramme(kg) {
  return Math.round(kg * 1000) / 1000;
}

/** Mouvements dont l'effet stock est ACTIF (VALIDE, hors contre-écritures),
 *  remis dans la CHRONOLOGIE MÉTIER (date d'opération puis numero,
 *  croissants) — jamais l'ordre administratif de validation. */
function mouvementsActifsChronologiques(mouvements) {
  return (mouvements ?? [])
    .filter((mv) => mv.statut === 'VALIDE' && !mv.contreEcritureDe)
    .slice()
    .sort((a, b) =>
      String(a.date ?? '').localeCompare(String(b.date ?? ''))
      || String(a.numero ?? '').localeCompare(String(b.numero ?? '')));
}

/**
 * Lots d'origine machine de TOUTES les bouteilles (une passe globale) :
 * les transferts couplent les bouteilles entre elles, le calcul ne peut
 * plus être fait bouteille par bouteille (CM-5).
 * @param {Array} mouvements — lectures du contrat (getMouvements), ordre libre
 * @returns {Map<string, Map<string, number>>} bouteilleId → (machineId → kg net)
 */
function lotsParBouteille(mouvements) {
  const lots = new Map();
  const carte = (bouteilleId) => {
    let m = lots.get(bouteilleId);
    if (!m) { m = new Map(); lots.set(bouteilleId, m); }
    return m;
  };
  for (const mv of mouvementsActifsChronologiques(mouvements)) {
    if (mv.quantiteKg == null) continue;
    if (TYPES_RECUPERATION.includes(mv.type)
        && mv.machineId != null && mv.bouteilleDstId != null) {
      const avoir = carte(mv.bouteilleDstId);
      const gain = -mv.quantiteKg; // quantiteKg négatif → gain positif
      avoir.set(mv.machineId,
        arrondirGramme((avoir.get(mv.machineId) ?? 0) + gain));
    } else if (TYPES_CHARGE.includes(mv.type)
        && mv.machineId != null && mv.bouteilleSrcId != null) {
      const avoir = carte(mv.bouteilleSrcId);
      const perte = mv.quantiteKg; // positif
      avoir.set(mv.machineId,
        arrondirGramme((avoir.get(mv.machineId) ?? 0) - perte));
    } else if (mv.type === 'TRANSFERT'
        && mv.bouteilleSrcId != null && mv.bouteilleDstId != null
        && mv.quantiteKg > 0) {
      // CM-5 : les lots suivent le fluide, au prorata des soldes POSITIFS.
      // Auto-transfert (source = destination) : rien ne se déplace — garde
      // EXPLICITE (revue du 22/07 : l'annulation algébrique ne doit pas
      // rester accidentelle).
      if (mv.bouteilleSrcId === mv.bouteilleDstId) continue;
      const source = lots.get(mv.bouteilleSrcId);
      if (!source) continue; // rien d'attribué → rien à propager
      let totalPositif = 0;
      for (const solde of source.values()) {
        if (solde > 0) totalPositif += solde;
      }
      if (totalPositif <= 0) continue;
      const part = Math.min(1, mv.quantiteKg / totalPositif);
      // Plafond GLOBAL (revue du 22/07) : la somme des lots déplacés ne
      // dépasse JAMAIS la quantité transférée — sans lui, l'arrondi au
      // gramme par lot CRÉAIT de la matière tracée sur des micro-transferts
      // répétés multi-origines. Le lot le plus ancien absorbe l'arrondi.
      let resteAPropager = part === 1
        ? totalPositif : arrondirGramme(mv.quantiteKg);
      const destination = carte(mv.bouteilleDstId);
      for (const [machineId, solde] of source) {
        if (solde <= 0) continue; // une surcharge signalée ne voyage pas
        if (resteAPropager <= 0) break;
        const brut = part === 1 ? solde : arrondirGramme(solde * part);
        const deplace = Math.min(brut, solde, resteAPropager);
        if (deplace <= 0) continue;
        resteAPropager = arrondirGramme(resteAPropager - deplace);
        source.set(machineId, arrondirGramme(solde - deplace));
        destination.set(machineId,
          arrondirGramme((destination.get(machineId) ?? 0) + deplace));
      }
      // Si quantiteKg > totalPositif : l'excédent transféré n'a pas
      // d'origine machine — il reste sans lot, comme avant CM-5.
    }
  }
  return lots;
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
  return lotsParBouteille(mouvements).get(bouteilleId) ?? new Map();
}

/**
 * Avoir d'origine DISPONIBLE pour UNE machine dans une bouteille (kg), borné
 * à 0 : un net négatif (incohérence de données) vaut « rien de disponible
 * d'origine M » pour la règle de réemploi (CM-2).
 */
export function avoirOrigineDisponible(bouteilleId, machineId, mouvements) {
  const net = avoirParMachineOrigine(bouteilleId, mouvements).get(machineId) ?? 0;
  return net > 0 ? net : 0;
}
