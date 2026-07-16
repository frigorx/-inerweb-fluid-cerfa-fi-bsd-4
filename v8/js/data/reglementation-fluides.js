// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// MOTEUR RÉGLEMENTAIRE UNIQUE — cadre 7 F-Gas (seuils + fréquence
// de contrôle d'étanchéité). SOURCE DE VÉRITÉ : ce module remplace
// les logiques auparavant dupliquées dans plaque-fgas.js,
// cerfa/generateur.js et server/api.js.
//
// Règles validées (Franck 15/07/2026, cf. docs/TABLE-REGLEMENTAIRE-FLUIDES.md),
// établies sur sources officielles :
//
//   A. Un fluide contenant du HFC se traite comme un HFC (seuils en
//      tonnes équivalent CO₂), MÊME s'il contient aussi du HFO.
//      → on teste donc HFC/PFC AVANT HFO (la notice du CERFA 15497*04
//      cite R-455A nommément : « considéré comme relevant de la
//      catégorie des HFC »).
//   B. Les HFO PURS ont des seuils en KILOGRAMMES (1/10/100 kg),
//      nouveauté du règlement UE 2024/573 (F-Gas III) art. 5, en
//      vigueur depuis le 11/03/2024 — AVANT cette date, les HFO purs
//      n'étaient pas soumis au contrôle d'étanchéité (voir
//      DEBUT_CONTROLE_HFO et le paramètre optionnel dateIntervention).
//   C. La charge de référence est la charge NOMINALE / totale déclarée
//      de l'équipement (valeur fixe marquée à demeure), PAS la quantité
//      momentanément présente (FAQ DGPR). Ce module reçoit donc la
//      charge nominale ; ne jamais lui passer chargeActuelleKg.
//
// FICHE EXPLICITE PAR FLUIDE (migration 21) : quand la fiche du
// référentiel porte une catégorie explicite (champ categorieCadre7 :
// HFC / HFO / HCFC / AUCUNE, peuplé depuis la table validée de
// docs/TABLE-REGLEMENTAIRE-FLUIDES.md), elle L'EMPORTE sur la
// dérivation du libellé de famille. La dérivation par includes() ne
// reste qu'un REPLI pour un fluide ajouté localement sans fiche.
//
// Familles hors périmètre du contrôle d'étanchéité fluoré : CO₂ (R-744),
// HC (R-290/propane), NH₃ (hors CERFA) → aucune fréquence exigée.
// ============================================================

// Entrée en vigueur du contrôle d'étanchéité des HFO purs (règl. UE
// 2024/573, F-Gas III, art. 5). Avant : HFO purs non contrôlés.
export const DEBUT_CONTROLE_HFO = '2024-03-11';

// Seuils par catégorie réglementaire, du palier le plus HAUT au plus BAS
// (le premier palier atteint l'emporte → niveau le plus élevé applicable).
// HFC/PFC : valeur comparée = tonnes éq. CO₂ (charge × PRP / 1000).
// HFO / HCFC : valeur comparée = charge en kg bruts.
const SEUILS = {
  HFC: {
    unite: 'teqCO2',
    paliers: [
      { min: 500, niveau: 3, caseSeuil: 'Case_HFC_500' },
      { min: 50, niveau: 2, caseSeuil: 'Case_HFC_50' },
      { min: 5, niveau: 1, caseSeuil: 'Case_HFC_5' }
    ]
  },
  HFO: {
    unite: 'kg',
    paliers: [
      { min: 100, niveau: 3, caseSeuil: 'Case_HFO_100' },
      { min: 10, niveau: 2, caseSeuil: 'Case_HFO_10' },
      { min: 1, niveau: 1, caseSeuil: 'Case_HFO_1' }
    ]
  },
  HCFC: {
    unite: 'kg',
    paliers: [
      { min: 300, niveau: 3, caseSeuil: 'Case_HCFC_300' },
      { min: 30, niveau: 2, caseSeuil: 'Case_HCFC_30' },
      { min: 2, niveau: 1, caseSeuil: 'Case_HCFC_2' }
    ]
  }
};

// Fréquence (en mois) et case CERFA par niveau, croisée avec la présence
// d'un système de détection permanente des fuites (cadre 6).
const FREQUENCE = {
  1: { sans: 12, avec: 24, caseSans: 'Case_Sans_12m', caseAvec: 'Case_Avec_24m' },
  2: { sans: 6, avec: 12, caseSans: 'Case_Sans_6m', caseAvec: 'Case_Avec_12m' },
  3: { sans: 3, avec: 6, caseSans: 'Case_Sans_3m', caseAvec: 'Case_Avec_6m' }
};

/**
 * Catégorie réglementaire d'un fluide au sens du cadre 7 (F-Gas).
 * 1. Fiche EXPLICITE d'abord : si le fluide porte un champ
 *    categorieCadre7 (HFC / HFO / HCFC / AUCUNE — 'AUCUNE' = hors
 *    périmètre acté), c'est LUI qui fait foi (migration 21, valeurs de
 *    la table validée). Une valeur inconnue est ignorée (repli).
 * 2. REPLI sinon : dérivation du libellé de famille, Règle A — HFC/PFC
 *    testés AVANT HFO, un mélange contenant du HFC (ex. R-455A,
 *    famille « HFC/HFO ») relève de la catégorie HFC.
 * @param {{ famille?: string, categorieCadre7?: string }|null|undefined} fluideRef
 * @returns {'HFC'|'HFO'|'HCFC'|null} null = hors périmètre (CO₂, HC, NH₃…)
 */
export function categorieCadre7(fluideRef) {
  const explicite = String(fluideRef?.categorieCadre7 || '').toUpperCase();
  if (explicite === 'AUCUNE') return null;
  if (explicite === 'HFC' || explicite === 'HFO' || explicite === 'HCFC') {
    return explicite;
  }
  const f = String(fluideRef?.famille || '').toUpperCase();
  if (f.includes('HFC') || f.includes('PFC')) return 'HFC';
  if (f.includes('HFO')) return 'HFO';
  if (f.includes('HCFC')) return 'HCFC';
  return null;
}

/**
 * Évalue l'obligation de contrôle d'étanchéité d'un équipement.
 * @param {{ famille?: string, gwpAr4?: number, categorieCadre7?: string
 *   }|null|undefined} fluideRef
 * @param {number} chargeNominaleKg — charge NOMINALE totale déclarée (Règle C)
 * @param {boolean} detectionPermanente — cadre 6
 * @param {string} [dateIntervention] — date ISO de l'intervention. Les HFO
 *   PURS ne sont soumis au contrôle que depuis le 11/03/2024 (F-Gas III) :
 *   avant, aucun niveau ni fréquence (la catégorie reste 'HFO'). Omise ou
 *   non ISO → régime courant (post-2024). Sans effet sur HFC/HCFC.
 * @returns {{ categorie: 'HFC'|'HFO'|'HCFC'|null, niveau: 1|2|3|null,
 *   caseSeuil: string|null, caseFrequence: string|null, frequenceMois: number|null }}
 */
export function evaluerControle(fluideRef, chargeNominaleKg,
  detectionPermanente, dateIntervention) {
  const categorie = categorieCadre7(fluideRef);
  const charge = Number(chargeNominaleKg) || 0;

  // Portée temporelle de la Règle B : HFO pur + intervention datée AVANT
  // le 11/03/2024 → pas encore de contrôle exigé. Une date non ISO est
  // ignorée (on ne désactive jamais un contrôle sur une date illisible).
  const date = typeof dateIntervention === 'string'
    && /^\d{4}-\d{2}-\d{2}/.test(dateIntervention)
    ? dateIntervention.slice(0, 10) : null;
  const hfoAvantRegime = categorie === 'HFO'
    && date !== null && date < DEBUT_CONTROLE_HFO;

  let niveau = null;
  let caseSeuil = null;
  if (categorie && !hfoAvantRegime) {
    const { unite, paliers } = SEUILS[categorie];
    const valeur = unite === 'teqCO2'
      ? charge * (Number(fluideRef?.gwpAr4) || 0) / 1000
      : charge;
    const palier = paliers.find((p) => valeur >= p.min);
    if (palier) {
      niveau = palier.niveau;
      caseSeuil = palier.caseSeuil;
    }
  }

  let caseFrequence = null;
  let frequenceMois = null;
  if (niveau) {
    const f = FREQUENCE[niveau];
    frequenceMois = detectionPermanente ? f.avec : f.sans;
    caseFrequence = detectionPermanente ? f.caseAvec : f.caseSans;
  }

  return { categorie, niveau, caseSeuil, caseFrequence, frequenceMois };
}
