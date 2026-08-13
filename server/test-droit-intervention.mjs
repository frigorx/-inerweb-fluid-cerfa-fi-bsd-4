// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// Parité STRICTE du moteur d'aptitude : v8/js/data/habilitations.js (ESM)
// ↔ server/droit-intervention.js (miroir littéral CommonJS, brique P0-5).
// Éventail discriminant comparé par JSON.stringify : tout écart de verdict,
// de gravité OU DE MESSAGE casse. Tourne une seule fois (non doublé).

import { createRequire } from 'node:module';
import {
  verifierDroitIntervention,
  operationNormalisee,
  familleDuFluide,
  jetonsMentionsActives,
  habilitationReconnue,
  SEUIL_CHARGE_LIMITEE_KG,
  SEUIL_CHARGE_HERMETIQUE_KG,
  SEUIL_CHARGE_2008_KG,
  FIN_DELIVRANCE_2008,
  DATE_BUTOIR_REMISE_NIVEAU_2008,
  DUREE_CYCLE_FORMATION_ANS,
  plusAnnees
} from '../v8/js/data/habilitations.js';

const require = createRequire(import.meta.url);
const miroir = require('./droit-intervention.js');

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else { nbEchecs += 1; console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`); }
}
const H = (regime, categorie) => ({ regime, categorie });

// ============================================================
// 1. Constantes identiques des deux côtés
// ============================================================
verifier('seuils de charge identiques (3 / 6 kg régime 2025, 2 kg régime 2008)',
  miroir.SEUIL_CHARGE_LIMITEE_KG === SEUIL_CHARGE_LIMITEE_KG
  && miroir.SEUIL_CHARGE_HERMETIQUE_KG === SEUIL_CHARGE_HERMETIQUE_KG
  && miroir.SEUIL_CHARGE_2008_KG === SEUIL_CHARGE_2008_KG
  && SEUIL_CHARGE_2008_KG === 2);
verifier('constantes de transition identiques (délivrance 2026-12-31, butoir 2029-03-12, cycle 7 ans)',
  miroir.FIN_DELIVRANCE_2008 === FIN_DELIVRANCE_2008
  && FIN_DELIVRANCE_2008 === '2026-12-31'
  && miroir.DATE_BUTOIR_REMISE_NIVEAU_2008 === DATE_BUTOIR_REMISE_NIVEAU_2008
  && DATE_BUTOIR_REMISE_NIVEAU_2008 === '2029-03-12'
  && miroir.DUREE_CYCLE_FORMATION_ANS === DUREE_CYCLE_FORMATION_ANS
  && DUREE_CYCLE_FORMATION_ANS === 7);

// ============================================================
// 2. Parité stricte du VERDICT sur un éventail discriminant
// ============================================================
{
  const ENTREES = [];
  const CATS = [
    H('2025', 'A1'), H('2025', 'A2'), H('2025', 'B'), H('2025', 'C'),
    H('2025', 'D'), H('2025', 'E'), H('2025', 'V'),
    H('2008', 'I'), H('2008', 'II'), H('2008', 'III'), H('2008', 'IV')
  ];
  const OPS = ['CHARGE_APPOINT', 'MISE_EN_SERVICE', 'RECUPERATION_MAINTENANCE',
    'TRANSFERT', 'CONTROLE_PERIODIQUE', 'CONTROLE_NON_PERIODIQUE', 'XYZ_INCONNU', null];
  // Toutes catégories × opérations, sur HFC charge 10 kg (discrimine ops + limites).
  for (const cat of CATS) {
    for (const op of OPS) {
      ENTREES.push({ habilitations: [cat], operation: op, familleFluide: 'HFC', chargeKg: 10 });
    }
  }
  // Les frontières strictes des DEUX régimes (AP-1 + L1a) : 2 kg (2008),
  // 3 et 6 kg (2025), hermétique vrai/faux — y compris la preuve que
  // l'hermétique n'élargit JAMAIS une catégorie 2008.
  for (const chargeKg of [1.999, 2, 2.5, 2.999, 3, 5.999, 6]) {
    ENTREES.push({ habilitations: [H('2025', 'A2')], operation: 'CHARGE_APPOINT', familleFluide: 'HFC', chargeKg });
    ENTREES.push({ habilitations: [H('2025', 'A2')], operation: 'CHARGE_APPOINT', familleFluide: 'HFC', chargeKg, hermetiqueScelle: true });
    ENTREES.push({ habilitations: [H('2008', 'II')], operation: 'CHARGE_APPOINT', familleFluide: 'HFC', chargeKg });
    ENTREES.push({ habilitations: [H('2008', 'II')], operation: 'CHARGE_APPOINT', familleFluide: 'HFC', chargeKg, hermetiqueScelle: true });
    ENTREES.push({ habilitations: [H('2008', 'III')], operation: 'RECUPERATION_MAINTENANCE', familleFluide: 'HFC', chargeKg });
    ENTREES.push({ habilitations: [H('2025', 'D')], operation: null, familleFluide: 'HFC', chargeKg });
    ENTREES.push({ habilitations: [H('2008', 'II'), H('2025', 'A2')], operation: 'CHARGE_APPOINT', familleFluide: 'HFC', chargeKg });
  }
  // Familles dédiées, mentions, dérivation de famille depuis le code fluide.
  ENTREES.push({ habilitations: [H('2025', 'B')], operation: 'CHARGE_APPOINT', familleFluide: 'CO2', chargeKg: 40 });
  ENTREES.push({ habilitations: [H('2025', 'C')], operation: 'MAINTENANCE', familleFluide: 'NH3' });
  ENTREES.push({ habilitations: [H('2025', 'V')], operation: 'MISE_EN_SERVICE', familleFluide: 'VEHICULE' });
  ENTREES.push({ habilitations: [H('2008', 'I')], operation: 'MAINTENANCE', familleFluide: 'CO2' });
  ENTREES.push({ habilitations: [H('2008', 'I')], mentions: ['CO2'], operation: 'CHARGE_APPOINT', familleFluide: 'CO2', chargeKg: 20 });
  ENTREES.push({ habilitations: [H('2008', 'IV')], mentions: ['CO2'], operation: 'CONTROLE', familleFluide: 'CO2' });
  ENTREES.push({ habilitations: [H('2025', 'A1')], operation: 'MAINTENANCE', familleFluide: 'HC' });
  ENTREES.push({ habilitations: [H('2008', 'I')], operation: 'MAINTENANCE', familleFluide: 'HC' });
  ENTREES.push({ habilitations: [H('2008', 'I')], mentions: ['R-290'], operation: 'MAINTENANCE', familleFluide: 'HC' });
  ENTREES.push({ habilitations: [H('2025', 'B')], operation: 'CHARGE_APPOINT', fluide: 'R-744', chargeKg: 5 });
  ENTREES.push({ habilitations: [H('2025', 'A1')], operation: 'CHARGE_APPOINT', fluide: 'R-290', chargeKg: 1 });
  ENTREES.push({ habilitations: [H('2025', 'E')], operation: 'CHARGE_APPOINT', fluide: 'R-1234ze' });
  // Cumuls (le meilleur profil domine), synthèses, robustesse.
  ENTREES.push({ habilitations: [H('2025', 'A2'), H('2025', 'D')], operation: 'RECUPERATION_MAINTENANCE', familleFluide: 'HFC', chargeKg: 5 });
  ENTREES.push({ habilitations: [H('2025', 'A1'), H('2025', 'E')], operation: 'MAINTENANCE', familleFluide: 'HFC', chargeKg: 12 });
  ENTREES.push({ habilitations: [H('2025', 'A2'), H('2025', 'E')], operation: null, familleFluide: 'HFC', chargeKg: 10 });
  ENTREES.push({ habilitations: [H('2025', 'E')], operation: null, familleFluide: 'HFC' });
  ENTREES.push({ habilitations: [H('2025', 'D')], operation: null, familleFluide: 'HFC' });
  ENTREES.push({ habilitations: [], operation: 'MAINTENANCE', familleFluide: 'HFC' });
  ENTREES.push({ mentions: ['CO2'], operation: 'MAINTENANCE', familleFluide: 'CO2' });
  ENTREES.push({});
  ENTREES.push({ habilitations: [H('1999', 'Z')], operation: 'MAINTENANCE', familleFluide: 'HFC' });

  let identiques = 0;
  for (const e of ENTREES) {
    const a = JSON.stringify(verifierDroitIntervention(e));
    const b = JSON.stringify(miroir.verifierDroitIntervention(e));
    if (a === b) identiques += 1;
    else console.error(`  divergence sur ${JSON.stringify(e)}\n  ESM=${a}\n  CJS=${b}`);
  }
  verifier(`parité stricte du verdict sur ${ENTREES.length} entrées discriminantes`,
    identiques === ENTREES.length, `${identiques}/${ENTREES.length}`);
}

// ============================================================
// 3. Parité des aides d'assemblage (opérations, familles, faits)
// ============================================================
{
  const OPS = ['CHARGE', 'CHARGE_APPOINT', 'MISE_EN_SERVICE', 'RECUPERATION_MAINTENANCE',
    'RECUPERATION_DEMANTELEMENT', 'TRANSFERT', 'CONTROLE', 'CONTROLE_ETANCHEITE',
    'CONTROLE_PERIODIQUE', 'CONTROLE_NON_PERIODIQUE', 'ETANCHEITE', 'INSTALLATION',
    'MAINTENANCE', 'REPARATION', 'RECUPERATION', 'xyz', '', null];
  verifier('operationNormalisee identique sur tous les types (dont contrôles P7)',
    OPS.every((op) => operationNormalisee(op) === miroir.operationNormalisee(op)));

  const FLUIDES = ['R-744', 'r744', 'R-717', 'R-290', 'R-600a', 'R-1270', 'R-1234yf',
    'R-1234ze', 'R-410A', 'R-455A', '', null];
  verifier('familleDuFluide identique sur l’éventail de codes',
    FLUIDES.every((f) => familleDuFluide(f) === miroir.familleDuFluide(f)));

  const MENTIONS = [
    [{ actif: true, fluideMention: 'CO2' }, { actif: false, fluideMention: 'HC' }],
    [], null, [{ fluideMention: 'NH3' }]
  ];
  verifier('jetonsMentionsActives identique (actives seules, ordre conservé)',
    MENTIONS.every((l) =>
      JSON.stringify(jetonsMentionsActives(l)) === JSON.stringify(miroir.jetonsMentionsActives(l))));
}

// ============================================================
// 4. habilitationReconnue — transition 2008→2025 (L4/Q3, 24/07)
// La mécanique en trois temps de l'arrêté du 21/11/2025 (art. 7 et 11) :
// fin de DÉLIVRANCE au 31/12/2026 ≠ fin de validité ; reconnaissance sans
// condition jusqu'au butoir du 12/03/2029 ; ensuite remise à niveau
// enregistrée AU PLUS TARD le butoir + cycle de 7 ans. L'ancien test
// affirmait le couperet du 31/12/2026 : c'était l'erreur corrigée.
// ============================================================
{
  const h2008 = (extra = {}) =>
    ({ actif: true, regime: '2008', categorie: 'I', dateFin: null, ...extra });
  const CAS = [
    [{ actif: true, regime: '2025', categorie: 'A1', dateFin: null }, '2026-07-22'],
    [{ actif: true, regime: '2025', categorie: 'A1', dateFin: '2026-07-21' }, '2026-07-22'],
    [{ actif: true, regime: '2025', categorie: 'A1', dateFin: '2026-07-22' }, '2026-07-22'],
    [{ actif: false, regime: '2025', categorie: 'A1', dateFin: null }, '2026-07-22'],
    [h2008({ dateFin: '2028-01-01' }), '2026-12-31'],
    [h2008({ dateFin: '2028-01-01' }), '2027-01-01'],
    [h2008(), '2027-06-15'],
    [h2008(), '2029-03-12'],
    [h2008(), '2029-03-13'],
    [h2008({ remiseNiveauLe: '2028-06-01' }), '2029-03-13'],
    [h2008({ remiseNiveauLe: '2028-06-01' }), '2035-06-01'],
    [h2008({ remiseNiveauLe: '2028-06-01' }), '2035-06-02'],
    [h2008({ remiseNiveauLe: '2029-03-12' }), '2030-01-01'],
    [h2008({ remiseNiveauLe: '2029-06-01' }), '2029-07-01'],
    [h2008({ remiseNiveauLe: '2024-02-29' }), '2031-02-28'],
    [h2008({ remiseNiveauLe: '2024-02-29' }), '2031-03-01'],
    [null, '2026-07-22']
  ];
  verifier('habilitationReconnue : parité sur tous les cas de transition',
    CAS.every(([h, d]) => habilitationReconnue(h, d) === miroir.habilitationReconnue(h, d)));

  verifier('⭐ 2008 RECONNUE le 01/01/2027 (le 31/12/2026 = fin de DÉLIVRANCE, pas de validité — l’ancien couperet était faux)',
    habilitationReconnue(h2008({ dateFin: '2028-01-01' }), '2027-01-01') === true);
  verifier('2008 reconnue le 12/03/2029 (butoir inclus, sans condition)',
    habilitationReconnue(h2008(), '2029-03-12') === true);
  verifier('2008 SANS remise à niveau : plus reconnue le 13/03/2029',
    habilitationReconnue(h2008(), '2029-03-13') === false);
  verifier('2008 remise à niveau 01/06/2028 : reconnue après le butoir…',
    habilitationReconnue(h2008({ remiseNiveauLe: '2028-06-01' }), '2029-03-13') === true);
  verifier('… jusqu’au bout du cycle de 7 ans (01/06/2035 inclus)',
    habilitationReconnue(h2008({ remiseNiveauLe: '2028-06-01' }), '2035-06-01') === true
    && habilitationReconnue(h2008({ remiseNiveauLe: '2028-06-01' }), '2035-06-02') === false);
  verifier('remise à niveau LE JOUR du butoir : acceptée (« au plus tard »)',
    habilitationReconnue(h2008({ remiseNiveauLe: '2029-03-12' }), '2030-01-01') === true);
  verifier('remise à niveau APRÈS le butoir : ne répare pas (examen à repasser — lecture stricte)',
    habilitationReconnue(h2008({ remiseNiveauLe: '2029-06-01' }), '2029-07-01') === false);
  verifier('l’échéance PROPRE de la ligne prime toujours (dateFin passée → non reconnue, remise ou pas)',
    habilitationReconnue(h2008({ dateFin: '2028-01-01', remiseNiveauLe: '2027-06-01' }), '2028-06-01') === false);
  verifier('2025 insensible à la transition 2008',
    habilitationReconnue({ actif: true, regime: '2025', dateFin: null }, '2030-01-01') === true);
  verifier('échue hier → non reconnue ; échéance AUJOURD’HUI → reconnue',
    habilitationReconnue({ actif: true, regime: '2025', dateFin: '2026-07-21' }, '2026-07-22') === false
    && habilitationReconnue({ actif: true, regime: '2025', dateFin: '2026-07-22' }, '2026-07-22') === true);

  // plusAnnees : comportement et parité (écrêtage bissextile compris).
  verifier('plusAnnees : +7 ans jour pour jour, 29/02 écrêté au 28/02, entrée illisible → null',
    plusAnnees('2028-06-01', 7) === '2035-06-01'
    && plusAnnees('2024-02-29', 7) === '2031-02-28'
    && plusAnnees('2024-02-29', 4) === '2028-02-29'
    && plusAnnees('n-importe-quoi', 7) === null
    && plusAnnees(null, 7) === null);
  verifier('plusAnnees : parité ESM ↔ serveur',
    ['2028-06-01', '2024-02-29', '2029-03-12', 'zut', null]
      .every((d) => plusAnnees(d, 7) === miroir.plusAnnees(d, 7)));

  // Revue L4 — jamais reconnaître par accident (défense en profondeur du
  // moteur PUR, indépendante des gardes de saisie du CRUD).
  verifier('remise « 2028-99-99 » (calendrier impossible) : jamais reconnue',
    habilitationReconnue(h2008({ remiseNiveauLe: '2028-99-99' }), '2035-12-31') === false
    && plusAnnees('2028-99-99', 7) === null);
  verifier('remise en horodatage ISO complet : jamais reconnue (format ancré)',
    habilitationReconnue(h2008({ remiseNiveauLe: '2028-05-01T10:00:00Z' }), '2030-01-01') === false);
  verifier('plusAnnees pad l’année (une année < 1000 ne ressuscite plus rien)',
    plusAnnees('0993-01-01', 7) === '1000-01-01');
  verifier('régime inconnu, absent ou mal typé : REFUS par défaut (jamais « reconnu sans condition »)',
    habilitationReconnue({ actif: true, categorie: 'I' }, '2035-01-01') === false
    && habilitationReconnue({ actif: true, regime: '2008 ', categorie: 'I' }, '2027-01-01') === false
    && habilitationReconnue({ actif: true, regime: 2008, categorie: 'I' }, '2027-01-01') === false);
  verifier('date de référence illisible (vide, format FR) : REFUS, jamais comparaison de chaînes',
    habilitationReconnue(h2008(), '') === false
    && habilitationReconnue(h2008(), '13/03/2029') === false
    && habilitationReconnue({ actif: true, regime: '2025' }, '') === false);
  verifier('robustesse : parité miroir sur les cas vicieux',
    [[h2008({ remiseNiveauLe: '2028-99-99' }), '2035-12-31'],
     [h2008({ remiseNiveauLe: '2028-05-01T10:00:00Z' }), '2030-01-01'],
     [{ actif: true, categorie: 'I' }, '2035-01-01'],
     [h2008(), ''], [h2008(), '13/03/2029']]
      .every(([h, d]) => habilitationReconnue(h, d) === miroir.habilitationReconnue(h, d)));
}

// ============================================================
// Lot F carte blanche (13/08) : parité de la PORTÉE DE CAPACITÉ DE
// L'ÉTABLISSEMENT — verdicts ET messages, éventail discriminant
// (activité manquante, portée vide, charge au-delà de la catégorie,
// couverture, régime 2025, hermétique).
// ============================================================
{
  const { capaciteEtablissementCouvre, regimeDeCategorieCapacite,
    ACTIVITE_PAR_OPERATION } = await import('../v8/js/data/habilitations.js');
  verifier('lot F : mapping opération → activité identique des deux côtés',
    JSON.stringify(ACTIVITE_PAR_OPERATION)
    === JSON.stringify(miroir.ACTIVITE_PAR_OPERATION));
  verifier('lot F : régime déduit identique (I → 2008, A1 → 2025)',
    ['I', 'II', 'III', 'IV', 'A1', 'A2', 'B', 'C', 'D', 'E', 'V']
      .every((c) => regimeDeCategorieCapacite(c)
        === miroir.regimeDeCategorieCapacite(c)));
  const vecteurs = [
    { categories: ['II'], activites: ['CONTROLE'],
      operation: 'RECUPERATION_MAINTENANCE', fluide: 'R-410A', chargeKg: 50 },
    { categories: ['II'], activites: ['MAINTENANCE', 'RECUPERATION'],
      operation: 'RECUPERATION_MAINTENANCE', fluide: 'R-410A', chargeKg: 50 },
    { categories: [], activites: [], operation: 'CHARGE_APPOINT' },
    { categories: ['I'],
      activites: ['MISE_EN_SERVICE', 'MAINTENANCE', 'CONTROLE', 'RECUPERATION'],
      operation: 'CHARGE_APPOINT', fluide: 'R-410A', chargeKg: 50 },
    { categories: ['A1'], activites: ['MAINTENANCE'],
      operation: 'CHARGE_APPOINT', fluide: 'R-410A', chargeKg: 20 },
    { categories: ['A2'], activites: ['MAINTENANCE'],
      operation: 'CHARGE_APPOINT', fluide: 'R-410A', chargeKg: 5,
      hermetiqueScelle: true },
    { categories: ['IV'], activites: ['CONTROLE'],
      operation: 'CONTROLE_PERIODIQUE', fluide: 'R-410A', chargeKg: 300 }
  ];
  verifier('lot F : capaciteEtablissementCouvre — parité stricte sur '
    + `${vecteurs.length} vecteurs (verdicts ET messages)`,
  vecteurs.every((v) =>
    JSON.stringify(capaciteEtablissementCouvre(v))
    === JSON.stringify(miroir.capaciteEtablissementCouvre(v))));
}

console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('Moteur d’aptitude : parité ESM ↔ serveur stricte (verdicts, messages, faits).');
