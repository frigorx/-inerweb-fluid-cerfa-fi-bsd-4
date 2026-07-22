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
  FIN_RECONNAISSANCE_2008
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
verifier('seuils de charge identiques (3 / 6 kg)',
  miroir.SEUIL_CHARGE_LIMITEE_KG === SEUIL_CHARGE_LIMITEE_KG
  && miroir.SEUIL_CHARGE_HERMETIQUE_KG === SEUIL_CHARGE_HERMETIQUE_KG);
verifier('fin de reconnaissance 2008 identique (2026-12-31)',
  miroir.FIN_RECONNAISSANCE_2008 === FIN_RECONNAISSANCE_2008
  && FIN_RECONNAISSANCE_2008 === '2026-12-31');

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
  // Les 4 frontières strictes (AP-1), hermétique vrai/faux.
  for (const chargeKg of [2.999, 3, 5.999, 6]) {
    ENTREES.push({ habilitations: [H('2025', 'A2')], operation: 'CHARGE_APPOINT', familleFluide: 'HFC', chargeKg });
    ENTREES.push({ habilitations: [H('2025', 'A2')], operation: 'CHARGE_APPOINT', familleFluide: 'HFC', chargeKg, hermetiqueScelle: true });
    ENTREES.push({ habilitations: [H('2008', 'II')], operation: 'CHARGE_APPOINT', familleFluide: 'HFC', chargeKg });
    ENTREES.push({ habilitations: [H('2025', 'D')], operation: null, familleFluide: 'HFC', chargeKg });
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
// 4. habilitationReconnue — comportement ET parité (fin de régime 2008)
// ============================================================
{
  const CAS = [
    // [ligne, dateReference]
    [{ actif: true, regime: '2025', categorie: 'A1', dateFin: null }, '2026-07-22'],
    [{ actif: true, regime: '2025', categorie: 'A1', dateFin: '2026-07-21' }, '2026-07-22'],
    [{ actif: true, regime: '2025', categorie: 'A1', dateFin: '2026-07-22' }, '2026-07-22'],
    [{ actif: false, regime: '2025', categorie: 'A1', dateFin: null }, '2026-07-22'],
    [{ actif: true, regime: '2008', categorie: 'I', dateFin: '2028-01-01' }, '2026-12-31'],
    [{ actif: true, regime: '2008', categorie: 'I', dateFin: '2028-01-01' }, '2027-01-01'],
    [{ actif: true, regime: '2008', categorie: 'I', dateFin: null }, '2027-06-15'],
    [null, '2026-07-22']
  ];
  verifier('habilitationReconnue : parité sur tous les cas',
    CAS.every(([h, d]) => habilitationReconnue(h, d) === miroir.habilitationReconnue(h, d)));
  verifier('2008 reconnue LE 31/12/2026 (dernier jour)',
    habilitationReconnue({ actif: true, regime: '2008', dateFin: '2028-01-01' }, '2026-12-31') === true);
  verifier('2008 NON reconnue le 01/01/2027 (même active et non échue)',
    habilitationReconnue({ actif: true, regime: '2008', dateFin: '2028-01-01' }, '2027-01-01') === false);
  verifier('2025 insensible à la fin de régime 2008',
    habilitationReconnue({ actif: true, regime: '2025', dateFin: null }, '2030-01-01') === true);
  verifier('échue hier → non reconnue ; échéance AUJOURD’HUI → reconnue',
    habilitationReconnue({ actif: true, regime: '2025', dateFin: '2026-07-21' }, '2026-07-22') === false
    && habilitationReconnue({ actif: true, regime: '2025', dateFin: '2026-07-22' }, '2026-07-22') === true);
}

console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('Moteur d’aptitude : parité ESM ↔ serveur stricte (verdicts, messages, faits).');
