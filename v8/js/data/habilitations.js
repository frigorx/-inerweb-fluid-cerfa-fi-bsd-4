// ============================================================
// inerWeb Fluide v8 — HABILITATIONS F-Gas : constantes réglementaires
// (module PUR, Phase 1 du chantier B2)
//
// Régimes de certification des PERSONNES à la manipulation des fluides :
//  - 2008 (arrêté du 13/10/2008) : catégories I / II / III / IV ;
//  - 2025 (arrêté du 21/11/2025, F-Gas III / règlement UE 2024/573) :
//    catégories A1 / A2 / B / C / D / E / V.
// Les deux régimes COEXISTENT : les attestations 2008 restent reconnues
// jusqu'au 31/12/2026, le régime 2025 est obligatoire au 01/01/2027.
//
// Ce module est PUR (aucune I/O, aucune horloge). Il est dupliqué à
// l'identique côté serveur (server/api.js, CommonJS) : la parité de SORTIE
// est prouvée par les tests, pas par un import croisé (même choix que
// sentinelle.js / getAlertes).
//
// ⚠️ Le MOTEUR de verdict `verifierDroitIntervention` viendra ICI en Phase 2.
// La PHASE 1 ne pose que les constantes : on STOCKE et on AFFICHE, on ne
// REFUSE rien. La matrice « quelle catégorie autorise quoi » (§2 de
// docs/SPEC-HABILITATIONS.md) est un BROUILLON à valider par Franck sur le
// texte officiel AVANT tout blocage (Phase 3).
// ============================================================

/** Les deux régimes de certification (ancien / nouveau). */
export const REGIMES = ['2008', '2025'];

/** Catégories de l'arrêté du 13/10/2008. */
export const CATEGORIES_2008 = ['I', 'II', 'III', 'IV'];

/** Catégories de l'arrêté du 21/11/2025 (F-Gas III). */
export const CATEGORIES_2025 = ['A1', 'A2', 'B', 'C', 'D', 'E', 'V'];

/**
 * Correspondance ancien → nouveau (SPEC §2) : I & II → A1/A2 · III → D ·
 * IV → E. RENVOIE UN TABLEAU — I et II donnent ['A1','A2'] : le choix A1 vs
 * A2 dépend du seuil de charge, matérialiser un choix unique serait mentir.
 * Cette équivalence est CALCULÉE, jamais STOCKÉE dans une ligne d'habilitation.
 */
export const CORRESPONDANCE_2008_VERS_2025 = Object.freeze({
  I: ['A1', 'A2'],
  II: ['A1', 'A2'],
  III: ['D'],
  IV: ['E']
});

/** Catégories 2025 équivalentes à une catégorie 2008 (tableau, [] si inconnue). */
export function correspondance2008Vers2025(categorie2008) {
  return CORRESPONDANCE_2008_VERS_2025[categorie2008] ?? [];
}

/** Vrai si `categorie` est cohérente avec `regime` (intégrité de stockage). */
export function categorieCoherente(regime, categorie) {
  if (regime === '2008') return CATEGORIES_2008.includes(categorie);
  if (regime === '2025') return CATEGORIES_2025.includes(categorie);
  return false;
}

/**
 * Ordre d'affichage stable des habilitations : régime 2025 avant 2008, puis
 * dateFin DÉCROISSANTE (null = pas d'échéance connue, placé EN TÊTE). Tri en
 * JS des deux côtés (jamais d'ORDER BY pour un ordre contractuel : la
 * collation BINARY de SQLite diverge de localeCompare — leçon du chantier
 * inventaire). Dupliqué à l'identique côté serveur.
 */
export function comparerHabilitations(a, b) {
  if (a.regime !== b.regime) return a.regime === '2025' ? -1 : 1;
  const fa = a.dateFin ?? null;
  const fb = b.dateFin ?? null;
  if (fa === fb) return 0;
  if (fa === null) return -1;
  if (fb === null) return 1;
  return fa < fb ? 1 : -1;
}
