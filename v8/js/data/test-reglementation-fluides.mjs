// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// Tests du MOTEUR RÉGLEMENTAIRE UNIQUE (cadre 7 F-Gas).
// Batterie aux VALEURS LIMITES : exactement sous / à / au-dessus de
// chaque seuil, pour chaque catégorie, plus le cas du bug corrigé
// (mélange HFC/HFO R-455A). Cf. docs/TABLE-REGLEMENTAIRE-FLUIDES.md.
// ============================================================

import { categorieCadre7, evaluerControle, impactDepuisPrp,
  codeFluideNormalise, verifierFicheFluide } from './reglementation-fluides.js';

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

// ============================================================
// P1-2 (AF-2) — règles d'ADMINISTRATION du référentiel : impact dérivé,
// normalisation du code, garde de saisie. Suite PURE (la parité
// demo/serveur des messages est prouvée par test-referentiel-fluides).
// ============================================================

// ---- impact dérivé du PRP (D3 : bornes F-Gas 150 / 750 / 2500) ----
verifier('PRP 0,02 (R-290) → FAIBLE', impactDepuisPrp(0.02) === 'FAIBLE');
verifier('PRP 148 (R-455A) → FAIBLE', impactDepuisPrp(148) === 'FAIBLE');
verifier('PRP 150 pile → MODERE (borne stricte)',
  impactDepuisPrp(150) === 'MODERE');
verifier('PRP 675 (R-32) → MODERE', impactDepuisPrp(675) === 'MODERE');
verifier('PRP 750 pile → ELEVE', impactDepuisPrp(750) === 'ELEVE');
verifier('PRP 1774 (R-407C) → ELEVE', impactDepuisPrp(1774) === 'ELEVE');
verifier('PRP 2500 pile → TRES_ELEVE', impactDepuisPrp(2500) === 'TRES_ELEVE');
verifier('PRP 3922 (R-404A) → TRES_ELEVE',
  impactDepuisPrp(3922) === 'TRES_ELEVE');
verifier('PRP illisible → null', impactDepuisPrp('abc') === null
  && impactDepuisPrp(null) === null && impactDepuisPrp(undefined) === null);
verifier('PRP NÉGATIF (valeur aberrante entrée par un import) → null, '
  + 'jamais « FAIBLE » (revue du 23/07)',
  impactDepuisPrp(-5000) === null && impactDepuisPrp(-0.5) === null);
verifier('PRP 0 → FAIBLE (le NH₃ vaut 0, ce n’est pas aberrant)',
  impactDepuisPrp(0) === 'FAIBLE');

// ---- normalisation du code (comparaison d'unicité) ----
verifier('« R-32 », « R32 » et « r 32 » désignent le même gaz',
  codeFluideNormalise('R-32') === codeFluideNormalise('R32')
  && codeFluideNormalise('R-32') === codeFluideNormalise('r 32'));
verifier('R-1234yf et R-1234ze restent distincts',
  codeFluideNormalise('R-1234yf') !== codeFluideNormalise('R-1234ze'));

// ---- garde de saisie ----
const leve = (fiche, extrait) => {
  try { verifierFicheFluide(fiche); return false; }
  catch (erreur) { return erreur.message.includes(extrait); }
};
const ficheOk = {
  code: 'R-449A', famille: 'HFC', gwpAr4: 1397, classeSecurite: 'A1',
  statutReglementaire: 'AUTORISE', categorieCadre7: 'HFC',
  contientHfc: true, contientHfo: false
};
verifier('une fiche complète et cohérente passe',
  (() => { try { verifierFicheFluide(ficheOk); return true; }
    catch { return false; } })());
verifier('code vide refusé', leve({ ...ficheOk, code: '  ' }, 'Code du fluide'));
verifier('famille vide refusée',
  leve({ ...ficheOk, famille: '' }, 'Famille du fluide'));
verifier('PRP négatif refusé', leve({ ...ficheOk, gwpAr4: -1 }, 'PRP invalide'));
verifier('PRP non numérique refusé',
  leve({ ...ficheOk, gwpAr4: 'beaucoup' }, 'PRP invalide'));
verifier('PRP 0 ACCEPTÉ (NH₃)',
  (() => { try { verifierFicheFluide({ ...ficheOk, gwpAr4: 0 }); return true; }
    catch { return false; } })());
verifier('classe de sécurité hors liste refusée',
  leve({ ...ficheOk, classeSecurite: 'A4' }, 'Classe de sécurité inconnue'));
verifier('statut réglementaire hors liste refusé',
  leve({ ...ficheOk, statutReglementaire: 'PEUT-ETRE' },
    'Statut réglementaire inconnu'));
verifier('statut ABSENT toléré (fiche ancienne)',
  (() => { const f = { ...ficheOk }; delete f.statutReglementaire;
    try { verifierFicheFluide(f); return true; } catch { return false; } })());
verifier('catégorie cadre 7 hors liste refusée',
  leve({ ...ficheOk, categorieCadre7: 'PFC' }, 'Catégorie du cadre 7 inconnue'));
verifier('catégorie ABSENTE tolérée (fluide sans fiche → repli du moteur)',
  (() => { try {
    verifierFicheFluide({ ...ficheOk, categorieCadre7: null,
      contientHfc: null, contientHfo: null });
    return true; } catch { return false; } })());
verifier('HFC sans « contient du HFC » refusé',
  leve({ ...ficheOk, contientHfc: false }, 'la catégorie HFC suppose'));
verifier('HFO qui contient du HFC refusé (règle A)',
  leve({ ...ficheOk, categorieCadre7: 'HFO', contientHfc: true,
    contientHfo: true }, 'la catégorie HFO suppose'));
verifier('HFO sans « contient du HFO » refusé',
  leve({ ...ficheOk, categorieCadre7: 'HFO', contientHfc: false,
    contientHfo: false }, 'la catégorie HFO suppose'));
verifier('AUCUNE avec « contient du HFC » refusé',
  leve({ ...ficheOk, categorieCadre7: 'AUCUNE', contientHfc: true,
    contientHfo: false }, 'la catégorie AUCUNE exclut'));
verifier('HCFC avec « contient du HFO » refusé',
  leve({ ...ficheOk, categorieCadre7: 'HCFC', contientHfc: false,
    contientHfo: true }, 'la catégorie HCFC exclut'));
verifier('R-455A (HFC qui contient AUSSI du HFO) ACCEPTÉ — règle A',
  (() => { try {
    verifierFicheFluide({ code: 'R-455A', famille: 'HFC/HFO', gwpAr4: 148,
      classeSecurite: 'A2L', categorieCadre7: 'HFC',
      contientHfc: true, contientHfo: true });
    return true; } catch { return false; } })());

console.log('');
console.log(`Moteur réglementaire : ${nbOk} réussies, ${nbEchecs} en échec.`);
if (nbEchecs > 0) process.exit(1);
console.log('Moteur réglementaire (cadre 7) : tout est vert.');
