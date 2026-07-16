// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// Tests du MOTEUR RÉGLEMENTAIRE UNIQUE (cadre 7 F-Gas).
// Batterie aux VALEURS LIMITES : exactement sous / à / au-dessus de
// chaque seuil, pour chaque catégorie, plus le cas du bug corrigé
// (mélange HFC/HFO R-455A). Cf. docs/TABLE-REGLEMENTAIRE-FLUIDES.md.
// ============================================================

import { categorieCadre7, evaluerControle } from './reglementation-fluides.js';

let nbOk = 0;
let nbEchecs = 0;
function verifier(label, condition) {
  if (condition) { nbOk++; }
  else { nbEchecs++; console.error('  ÉCHEC : ' + label); }
}

const freq = (fluide, charge, det) => evaluerControle(fluide, charge, det).frequenceMois;
const cat = (famille) => categorieCadre7({ famille });

// ---- Catégorie réglementaire (Règle A : HFC avant HFO) ----
verifier('R-32 (HFC pur) → HFC', cat('HFC') === 'HFC');
verifier('mélange « HFC/HFO » → HFC (Règle A)', cat('HFC/HFO') === 'HFC');
verifier('libellé « Mélange HFO/HFC » → HFC (ordre du libellé indifférent)',
  cat('Mélange HFO/HFC') === 'HFC');
verifier('R-1234yf (HFO pur) → HFO', cat('HFO') === 'HFO');
verifier('HCFC → HCFC (ne matche pas HFC par sous-chaîne)', cat('HCFC') === 'HCFC');
verifier('PFC → HFC (même barème teqCO₂)', cat('PFC') === 'HFC');
verifier('CO2 → hors périmètre (null)', cat('CO2') === null);
verifier('HC → hors périmètre (null)', cat('HC') === null);
verifier('famille vide → null', cat('') === null);

// ---- HFC : seuils en tonnes éq. CO₂ (5 / 50 / 500), valeurs limites ----
// PRP 1000 → 1 kg = 1 t éq. CO₂ (lecture directe des kg en tonnes).
const hfc = { famille: 'HFC', gwpAr4: 1000 };
verifier('HFC 4,999 t → sous seuil → aucun contrôle', freq(hfc, 4.999, false) === null);
verifier('HFC exactement 5 t → 12 mois', freq(hfc, 5, false) === 12);
verifier('HFC 5 t + détection permanente → 24 mois', freq(hfc, 5, true) === 24);
verifier('HFC 49,999 t → niveau bas (12 mois)', freq(hfc, 49.999, false) === 12);
verifier('HFC exactement 50 t → 6 mois', freq(hfc, 50, false) === 6);
verifier('HFC 50 t + détection → 12 mois', freq(hfc, 50, true) === 12);
verifier('HFC 499,999 t → niveau moyen (6 mois)', freq(hfc, 499.999, false) === 6);
verifier('HFC exactement 500 t → 3 mois', freq(hfc, 500, false) === 3);
verifier('HFC 500 t + détection → 6 mois', freq(hfc, 500, true) === 6);

// ---- HFO pur : seuils en kg (1 / 10 / 100), F-Gas III / Règle B ----
const hfo = { famille: 'HFO', gwpAr4: 4 };
verifier('HFO 0,999 kg → sous seuil → aucun contrôle', freq(hfo, 0.999, false) === null);
verifier('HFO exactement 1 kg → 12 mois', freq(hfo, 1, false) === 12);
verifier('HFO 1 kg + détection → 24 mois', freq(hfo, 1, true) === 24);
verifier('HFO 9,999 kg → 12 mois', freq(hfo, 9.999, false) === 12);
verifier('HFO exactement 10 kg → 6 mois', freq(hfo, 10, false) === 6);
verifier('HFO 99,999 kg → 6 mois', freq(hfo, 99.999, false) === 6);
verifier('HFO exactement 100 kg → 3 mois', freq(hfo, 100, false) === 3);
verifier('HFO 100 kg + détection → 6 mois', freq(hfo, 100, true) === 6);

// ---- HCFC : seuils en kg (2 / 30 / 300) ----
const hcfc = { famille: 'HCFC', gwpAr4: 1810 };
verifier('HCFC 1,999 kg → aucun contrôle', freq(hcfc, 1.999, false) === null);
verifier('HCFC exactement 2 kg → 12 mois', freq(hcfc, 2, false) === 12);
verifier('HCFC exactement 30 kg → 6 mois', freq(hcfc, 30, false) === 6);
verifier('HCFC exactement 300 kg → 3 mois', freq(hcfc, 300, false) === 3);

// ---- LE cas du bug corrigé : R-455A (mélange HFC/HFO, PRP 148) ----
const r455a = { famille: 'HFC/HFO', gwpAr4: 148 };
verifier('R-455A à 3,2 kg → traité HFC → 0,47 t éq. CO₂ < 5 → AUCUN contrôle (bug n°1 corrigé)',
  freq(r455a, 3.2, true) === null);
verifier('R-455A à 3,2 kg sans détection → toujours aucun contrôle',
  freq(r455a, 3.2, false) === null);
verifier('R-455A à 33,8 kg → 5,0 t éq. CO₂ → contrôle 12 mois (traité comme HFC, pas HFO/kg)',
  freq(r455a, 33.8, false) === 12);

// ---- Hors périmètre : aucune charge ne déclenche de contrôle ----
verifier('R-744 (CO₂) 500 kg → aucun contrôle', freq({ famille: 'CO2', gwpAr4: 1 }, 500, false) === null);
verifier('R-290 (HC) 50 kg → aucun contrôle', freq({ famille: 'HC', gwpAr4: 3 }, 50, false) === null);

// ---- Fiche EXPLICITE par fluide (migration 21) : la colonne l'emporte ----
verifier('fiche explicite HFC sur famille « HFO » → HFC (la colonne fait foi)',
  categorieCadre7({ famille: 'HFO', categorieCadre7: 'HFC' }) === 'HFC');
verifier('fiche explicite AUCUNE sur famille « HFC » → hors périmètre',
  categorieCadre7({ famille: 'HFC', categorieCadre7: 'AUCUNE' }) === null);
verifier('fiche explicite en minuscules (« hfo ») → HFO (casse tolérée)',
  categorieCadre7({ famille: '', categorieCadre7: 'hfo' }) === 'HFO');
verifier('fiche explicite INCONNUE → ignorée, repli sur la famille',
  categorieCadre7({ famille: 'HFC', categorieCadre7: 'PLOUF' }) === 'HFC');
verifier('fiche explicite null → repli sur la famille (compat. anciens fluides)',
  categorieCadre7({ famille: 'HCFC', categorieCadre7: null }) === 'HCFC');
verifier('evaluerControle suit la fiche explicite (famille inconnue, HFO 10 kg → 6 mois)',
  freq({ famille: 'Mystère', categorieCadre7: 'HFO', gwpAr4: 4 }, 10, false) === 6);
verifier('evaluerControle : AUCUNE explicite neutralise une famille HFC (500 kg → rien)',
  freq({ famille: 'HFC', categorieCadre7: 'AUCUNE', gwpAr4: 2000 }, 500, false) === null);

// ---- Date d'intervention : HFO purs contrôlés seulement depuis le 11/03/2024 ----
const freqDate = (fluide, charge, det, date) =>
  evaluerControle(fluide, charge, det, date).frequenceMois;
verifier('HFO 10 kg au 10/03/2024 → AUCUN contrôle (avant F-Gas III)',
  freqDate(hfo, 10, false, '2024-03-10') === null);
verifier('HFO 10 kg au 11/03/2024 → 6 mois (jour d\'entrée en vigueur)',
  freqDate(hfo, 10, false, '2024-03-11') === 6);
verifier('HFO 10 kg sans date → 6 mois (régime courant)',
  freqDate(hfo, 10, false, undefined) === 6);
verifier('HFO 10 kg, datetime « 2023-12-31T23:59:59 » → aucun contrôle',
  freqDate(hfo, 10, false, '2023-12-31T23:59:59') === null);
verifier('HFO avant régime : catégorie reste HFO, niveau/case à null',
  (() => { const r = evaluerControle(hfo, 10, false, '2023-01-01');
    return r.categorie === 'HFO' && r.niveau === null
      && r.caseSeuil === null && r.caseFrequence === null; })());
verifier('HFC 5 t au 01/01/2020 → 12 mois (les HFC étaient déjà contrôlés)',
  freqDate(hfc, 5, false, '2020-01-01') === 12);
verifier('mélange HFC/HFO 33,8 kg au 01/01/2023 → 12 mois (Règle A insensible à la date)',
  freqDate(r455a, 33.8, false, '2023-01-01') === 12);
verifier('HCFC 30 kg au 01/01/2023 → 6 mois (HCFC insensible à la date)',
  freqDate(hcfc, 30, false, '2023-01-01') === 6);
verifier('date NON ISO (« 10/03/2024 ») → ignorée → régime courant (6 mois)',
  freqDate(hfo, 10, false, '10/03/2024') === 6);
verifier('fiche explicite HFO + date avant régime → aucun contrôle (règles combinées)',
  freqDate({ famille: 'Mystère', categorieCadre7: 'HFO', gwpAr4: 4 }, 10, false,
    '2024-01-01') === null);

// ---- Robustesse ----
verifier('fluide null → hors périmètre', evaluerControle(null, 10, false).frequenceMois === null);
verifier('charge NaN → 0 → aucun contrôle', freq(hfc, NaN, false) === null);
verifier('caseSeuil cohérent (HFC 5 t → Case_HFC_5)',
  evaluerControle(hfc, 5, false).caseSeuil === 'Case_HFC_5');
verifier('caseFrequence cohérente (HFC 5 t sans détection → Case_Sans_12m)',
  evaluerControle(hfc, 5, false).caseFrequence === 'Case_Sans_12m');
verifier('categorie renvoyée dans le résultat (R-455A → HFC)',
  evaluerControle(r455a, 33.8, false).categorie === 'HFC');

console.log('');
console.log(`Moteur réglementaire : ${nbOk} réussies, ${nbEchecs} en échec.`);
if (nbEchecs > 0) process.exit(1);
console.log('Moteur réglementaire (cadre 7) : tout est vert.');
