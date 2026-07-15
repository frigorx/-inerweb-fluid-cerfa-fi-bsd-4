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
