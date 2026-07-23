// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// Test du MODULE PUR « modèle d'équipement » (P1-1) + PARITÉ stricte
// avec son miroir CommonJS server/equipement.js.
// Exécution : node v8/js/data/test-equipement-pur.mjs — sans DOM, sans store.
//
// Ce que ça prouve :
//   E1 — l'allègement de fréquence n'est dû que si la détection a été
//        vérifiée depuis moins de 12 mois (valeurs limites au jour près) ;
//   E2 — la détection est obligatoire au niveau HAUT, et le niveau vient
//        du MOTEUR (aucun seuil recopié dans ce module) ;
//   E3 — aucune exemption n'est codée : `exemptionControle` rend TOUJOURS
//        « non exempté » (choix conservateur assumé, activable plus tard) ;
//   E4 — le seuil d'aptitude élargi exige l'ÉTIQUETTE, pas seulement le
//        scellement ;
//   E5 — un MOBILE sans sous-type listé n'est PAS admis au contrôle
//        immédiat (plus strict qu'avant P1-1) ;
//   + la garde de saisie et ses messages canoniques ;
//   + PARITÉ ESM ↔ CommonJS sur chaque fonction commune.
// ============================================================

import { createRequire } from 'node:module';
import {
  DELAI_VERIF_DETECTION_MOIS, SOUS_TYPES_MOBILES,
  SOUS_TYPES_MOBILES_ELIGIBLES, LIBELLE_SOUS_TYPE,
  ajouterMoisEquipement, echeanceVerificationDetection, detectionEffective,
  detectionObligatoire, detectionObligatoireDepuisNiveau, exemptionControle,
  hermetiqueOpposable, mobileListe, verifierModeleEquipement
} from './equipement.js';

const require = createRequire(import.meta.url);
const miroir = require('../../../server/equipement.js');

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) {
    nbOk += 1;
  } else {
    nbEchecs += 1;
    console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`);
  }
}

// ============================================================
// A. Échéance de vérification (12 mois CIVILS, écrêtage fin de mois)
// ============================================================
verifier('échéance = 12 mois civils après la vérification',
  echeanceVerificationDetection('2026-03-15') === '2027-03-15');
verifier('écrêtage fin de mois (29/02 d’une année bissextile)',
  echeanceVerificationDetection('2024-02-29') === '2025-02-28');
verifier('jamais vérifiée → aucune échéance',
  echeanceVerificationDetection(null) === null
  && echeanceVerificationDetection('') === null
  && echeanceVerificationDetection('pas une date') === null);
verifier('le délai réglementaire est bien de 12 mois',
  DELAI_VERIF_DETECTION_MOIS === 12);

// ============================================================
// B. ⭐ E1 — la détection ne compte que si elle est VÉRIFIÉE
// ============================================================
const AVEC = (verifieeLe) => ({ detectionPermanente: true,
  detectionVerifieeLe: verifieeLe });

verifier('détection non déclarée : ne compte pas, motif ABSENTE',
  (() => { const d = detectionEffective({ detectionPermanente: false },
    '2026-07-23');
    return d.compte === false && d.declaree === false
      && d.motif === 'ABSENTE'; })());

verifier('⭐ détection DÉCLARÉE mais JAMAIS vérifiée : ne compte PAS',
  (() => { const d = detectionEffective(AVEC(null), '2026-07-23');
    return d.compte === false && d.declaree === true
      && d.motif === 'JAMAIS_VERIFIEE' && d.echeance === null; })());

verifier('vérifiée la veille : compte',
  detectionEffective(AVEC('2026-07-22'), '2026-07-23').compte === true);

verifier('vérifiée il y a 11 mois : compte encore',
  detectionEffective(AVEC('2025-08-23'), '2026-07-23').compte === true);

verifier('⭐ dernier jour couvert (12 mois pile) : compte ENCORE',
  (() => { const d = detectionEffective(AVEC('2025-07-23'), '2026-07-23');
    return d.compte === true && d.echeance === '2026-07-23'
      && d.motif === 'A_JOUR'; })());

verifier('⭐ lendemain de l’échéance : l’allègement TOMBE',
  (() => { const d = detectionEffective(AVEC('2025-07-23'), '2026-07-24');
    return d.compte === false && d.motif === 'VERIFICATION_PERIMEE'
      && d.echeance === '2026-07-23'; })());

verifier('l’échéance est rendue même quand la vérification est périmée '
  + '(l’écran doit pouvoir dire depuis quand)',
  detectionEffective(AVEC('2020-01-01'), '2026-07-23').echeance === '2021-01-01');

// ============================================================
// C. ⭐ E2 — détection obligatoire au niveau HAUT, niveau pris au MOTEUR
// ============================================================
// PRP 1000 → 1 kg = 1 tCO₂eq : lecture directe des kg en tonnes.
const HFC = { famille: 'HFC', gwpAr4: 1000, categorieCadre7: 'HFC' };
const HFO = { famille: 'HFO', gwpAr4: 1, categorieCadre7: 'HFO' };
const HC = { famille: 'HC', gwpAr4: 0.02, categorieCadre7: 'AUCUNE' };

verifier('HFC 499 tCO₂eq : détection non obligatoire',
  detectionObligatoire(HFC, { chargeNominaleKg: 499 }) === false);
verifier('⭐ HFC 500 tCO₂eq pile : détection OBLIGATOIRE',
  detectionObligatoire(HFC, { chargeNominaleKg: 500 }) === true);
verifier('HFO pur 99 kg : non obligatoire · 100 kg : OBLIGATOIRE',
  detectionObligatoire(HFO, { chargeNominaleKg: 99 }) === false
  && detectionObligatoire(HFO, { chargeNominaleKg: 100 }) === true);
verifier('hors périmètre (HC) : jamais obligatoire, quelle que soit la charge',
  detectionObligatoire(HC, { chargeNominaleKg: 5000 }) === false);
verifier('charge absente ou nulle : jamais obligatoire (pas de faux positif)',
  detectionObligatoire(HFC, {}) === false
  && detectionObligatoire(HFC, { chargeNominaleKg: 0 }) === false
  && detectionObligatoire(HFC, { chargeNominaleKg: null }) === false);
verifier('la règle tient en un point : niveau 3 ⇒ obligatoire',
  detectionObligatoireDepuisNiveau(3) === true
  && detectionObligatoireDepuisNiveau(2) === false
  && detectionObligatoireDepuisNiveau(1) === false
  && detectionObligatoireDepuisNiveau(null) === false);
verifier('HFO pur AVANT le 11/03/2024 : hors régime, donc non obligatoire',
  detectionObligatoire(HFO, { chargeNominaleKg: 500 }, '2023-06-01') === false);

// ============================================================
// D. ⭐ E3 — aucune exemption codée (choix conservateur assumé)
// ============================================================
verifier('⭐ un hermétique étiqueté de 0,1 kg n’est PAS exempté '
  + '(aucune exemption codée tant que les seuils ne sont pas confirmés)',
  (() => { const e = exemptionControle(HFC, { chargeNominaleKg: 0.1,
    hermetiqueScelle: true, hermetiqueEtiquete: true, residentiel: true });
    return e.exempte === false && e.motif === null; })());

// ============================================================
// E. ⭐ E4 — le seuil d’aptitude élargi exige l’ÉTIQUETTE
// ============================================================
verifier('hermétique scellé SANS étiquette : pas de seuil élargi',
  hermetiqueOpposable({ hermetiqueScelle: true, hermetiqueEtiquete: false })
    === false);
verifier('⭐ hermétique scellé ET étiqueté : seuil élargi',
  hermetiqueOpposable({ hermetiqueScelle: true, hermetiqueEtiquete: true })
    === true);
verifier('ni l’un ni l’autre : pas de seuil élargi',
  hermetiqueOpposable({}) === false);

// ============================================================
// F. ⭐ E5 — mobile LISTÉ seulement
// ============================================================
verifier('FIXE : jamais admis au contrôle immédiat',
  mobileListe({ typeInstallation: 'FIXE',
    sousTypeInstallation: 'CAMION_FRIGORIFIQUE' }) === false);
verifier('⭐ MOBILE SANS sous-type : PAS admis (plus strict qu’avant P1-1)',
  mobileListe({ typeInstallation: 'MOBILE' }) === false
  && mobileListe({ typeInstallation: 'MOBILE',
    sousTypeInstallation: null }) === false);
verifier('⭐ MOBILE de sous-type AUTRE_MOBILE : PAS admis',
  mobileListe({ typeInstallation: 'MOBILE',
    sousTypeInstallation: 'AUTRE_MOBILE' }) === false);
verifier('MOBILE listé : admis',
  SOUS_TYPES_MOBILES_ELIGIBLES.every((s) =>
    mobileListe({ typeInstallation: 'MOBILE', sousTypeInstallation: s })));
verifier('AUTRE_MOBILE est connu mais NON éligible',
  SOUS_TYPES_MOBILES.includes('AUTRE_MOBILE')
  && !SOUS_TYPES_MOBILES_ELIGIBLES.includes('AUTRE_MOBILE'));
verifier('chaque sous-type porte un libellé lisible',
  SOUS_TYPES_MOBILES.every((s) => typeof LIBELLE_SOUS_TYPE[s] === 'string'
    && LIBELLE_SOUS_TYPE[s].length > 0));

// ============================================================
// G. Garde de saisie
// ============================================================
const leve = (machine, extrait) => {
  try { verifierModeleEquipement(machine); return false; }
  catch (erreur) { return erreur.message.includes(extrait); }
};
const passe = (machine) => {
  try { verifierModeleEquipement(machine); return true; }
  catch { return false; }
};

verifier('fiche vide : acceptée (rien n’est obligatoire)',
  passe({}) && passe({ typeInstallation: 'FIXE' }));
verifier('sous-type hors liste refusé',
  leve({ typeInstallation: 'MOBILE', sousTypeInstallation: 'BATEAU' },
    'Sous-type d’installation inconnu'));
verifier('sous-type sur un équipement FIXE refusé',
  leve({ typeInstallation: 'FIXE',
    sousTypeInstallation: 'CAMION_FRIGORIFIQUE' },
  'ne se renseigne que sur un équipement MOBILE'));
verifier('⭐ étiqueté sans être scellé refusé (E4 : l’étiquette atteste '
  + 'quelque chose qui doit exister)',
  leve({ hermetiqueEtiquete: true, hermetiqueScelle: false },
    'sans être hermétiquement scellé'));
verifier('date de vérification illisible refusée',
  leve({ detectionPermanente: true, detectionVerifieeLe: '15/03/2026' },
    'Date de vérification de la détection invalide'));
verifier('vérification renseignée SANS détection déclarée refusée',
  leve({ detectionPermanente: false, detectionVerifieeLe: '2026-03-15' },
    'aucun système de détection permanente'));
verifier('fiche complète et cohérente acceptée',
  passe({ typeInstallation: 'MOBILE',
    sousTypeInstallation: 'REMORQUE_FRIGORIFIQUE', hermetiqueScelle: true,
    hermetiqueEtiquete: true, residentiel: false, detectionPermanente: true,
    detectionVerifieeLe: '2026-03-15' }));

// ============================================================
// H. ⭐ PARITÉ ESM ↔ CommonJS (le miroir serveur)
// ============================================================
verifier('parité : constantes identiques',
  miroir.DELAI_VERIF_DETECTION_MOIS === DELAI_VERIF_DETECTION_MOIS
  && JSON.stringify(miroir.SOUS_TYPES_MOBILES) === JSON.stringify(SOUS_TYPES_MOBILES)
  && JSON.stringify(miroir.SOUS_TYPES_MOBILES_ELIGIBLES)
    === JSON.stringify(SOUS_TYPES_MOBILES_ELIGIBLES)
  && JSON.stringify(miroir.LIBELLE_SOUS_TYPE) === JSON.stringify(LIBELLE_SOUS_TYPE));

{
  // detectionEffective : on compare l'objet ENTIER, sur un balayage qui
  // couvre les 4 motifs et les valeurs limites du jour.
  const CAS = [
    [{ detectionPermanente: false }, '2026-07-23'],
    [AVEC(null), '2026-07-23'],
    [AVEC('2025-07-23'), '2026-07-23'],
    [AVEC('2025-07-23'), '2026-07-24'],
    [AVEC('2024-02-29'), '2025-02-28'],
    [AVEC('2024-02-29'), '2025-03-01']
  ];
  const ecarts = CAS.filter(([m, j]) =>
    JSON.stringify(detectionEffective(m, j))
      !== JSON.stringify(miroir.detectionEffective(m, j)));
  verifier('parité : detectionEffective, objet identique sur les 6 cas',
    ecarts.length === 0, JSON.stringify(ecarts));
}

verifier('parité : detectionObligatoireDepuisNiveau',
  [1, 2, 3, null, undefined].every((n) =>
    detectionObligatoireDepuisNiveau(n) === miroir.detectionObligatoireDepuisNiveau(n)));
verifier('parité : exemptionControle (toujours non exempté des 2 côtés)',
  JSON.stringify(exemptionControle(HFC, { hermetiqueScelle: true }))
    === JSON.stringify(miroir.exemptionControle(HFC, { hermetiqueScelle: true })));
verifier('parité : hermetiqueOpposable',
  [[true, true], [true, false], [false, true], [false, false]].every(([s, e]) =>
    hermetiqueOpposable({ hermetiqueScelle: s, hermetiqueEtiquete: e })
      === miroir.hermetiqueOpposable({ hermetiqueScelle: s, hermetiqueEtiquete: e })));
verifier('parité : mobileListe sur tous les sous-types × FIXE/MOBILE',
  ['FIXE', 'MOBILE'].every((t) =>
    [...SOUS_TYPES_MOBILES, null].every((s) =>
      mobileListe({ typeInstallation: t, sousTypeInstallation: s })
        === miroir.mobileListe({ typeInstallation: t, sousTypeInstallation: s }))));
verifier('parité : echeanceVerificationDetection',
  ['2026-03-15', '2024-02-29', null, 'x'].every((d) =>
    echeanceVerificationDetection(d) === miroir.echeanceVerificationDetection(d)));

{
  // Garde de saisie : mêmes verdicts ET mêmes messages, mot pour mot.
  const CAS = [
    {}, { typeInstallation: 'MOBILE', sousTypeInstallation: 'BATEAU' },
    { typeInstallation: 'FIXE', sousTypeInstallation: 'CAMION_FRIGORIFIQUE' },
    { hermetiqueEtiquete: true, hermetiqueScelle: false },
    { detectionPermanente: true, detectionVerifieeLe: '15/03/2026' },
    { detectionPermanente: false, detectionVerifieeLe: '2026-03-15' },
    { typeInstallation: 'MOBILE', sousTypeInstallation: 'WAGON_FRIGORIFIQUE' }
  ];
  const message = (fn, m) => {
    try { fn(m); return 'OK'; } catch (e) { return e.message; }
  };
  const ecarts = CAS.filter((m) =>
    message(verifierModeleEquipement, m) !== message(miroir.verifierModeleEquipement, m));
  verifier('⭐ parité : verifierModeleEquipement, MESSAGES identiques (7 cas)',
    ecarts.length === 0, JSON.stringify(ecarts));
}

// ============================================================
console.log('');
console.log(`Modèle d’équipement (pur + parité) : ${nbOk} réussies, `
  + `${nbEchecs} en échec.`);
if (nbEchecs > 0) process.exit(1);
console.log('Modèle d’équipement : tout est vert.');
