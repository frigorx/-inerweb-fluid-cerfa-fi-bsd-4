// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// Test du module « avoir de fluide par machine d'origine ».
// Exécution : node v8/js/data/test-avoir-origine.mjs
//
// Volet A (pur, données forgées) : crédit d'une récupération, débit d'un
// réemploi, multi-origines dans une même bouteille, exclusion des
// contre-écritures et des brouillons, non-fuite d'une autre bouteille,
// transfert ignoré (V1), net négatif borné à 0.
// Volet B (DemoStore réel) : un parcours mise en service → récupération →
// réemploi retrouve l'avoir d'origine dérivé des lectures du contrat.
// Node ≥ 18, sans DOM.
// ============================================================

import { avoirParMachineOrigine, avoirOrigineDisponible }
  from './avoir-origine.js';
import { creerStore } from './datastore.js';

let nbOk = 0;
let nbEchecs = 0;

function verifier(libelle, condition, detail = '') {
  if (condition) {
    nbOk += 1;
    console.log(`  OK  ${libelle}`);
  } else {
    nbEchecs += 1;
    console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`);
  }
}

const PROCHE = (a, b) => Math.abs(a - b) < 1e-9;

const B = 'bou-1';
const M1 = 'mac-1';
const M2 = 'mac-2';

// ============================================================
// A. Volet PUR — dérivation depuis des mouvements forgés
// ============================================================
console.log('--- A. avoir dérivé (pur) ---');

{
  // Deux origines dans la bouteille, dont une partiellement réemployée.
  const mouvements = [
    { id: 'r1', statut: 'VALIDE', type: 'RECUPERATION_MAINTENANCE',
      machineId: M1, bouteilleDstId: B, quantiteKg: -3 },
    { id: 'r2', statut: 'VALIDE', type: 'RECUPERATION_DEMANTELEMENT',
      machineId: M2, bouteilleDstId: B, quantiteKg: -2 },
    { id: 'c1', statut: 'VALIDE', type: 'CHARGE_APPOINT',
      machineId: M1, bouteilleSrcId: B, quantiteKg: 1 }
  ];
  const avoir = avoirParMachineOrigine(B, mouvements);
  verifier('récup M1 3 kg puis réemploi 1 kg → avoir(M1) = 2',
    PROCHE(avoir.get(M1), 2), `avoir(M1) = ${avoir.get(M1)}`);
  verifier('récup M2 2 kg (démantèlement) → avoir(M2) = 2',
    PROCHE(avoir.get(M2), 2), `avoir(M2) = ${avoir.get(M2)}`);
  verifier('disponible pour M1 = 2',
    PROCHE(avoirOrigineDisponible(B, M1, mouvements), 2));
  verifier('disponible pour une machine sans lot = 0',
    avoirOrigineDisponible(B, 'mac-inconnue', mouvements) === 0);
}

{
  // Récupération annulée par contre-écriture : effet net nul, avoir absent.
  const mouvements = [
    { id: 'r1', statut: 'ANNULE', type: 'RECUPERATION_MAINTENANCE',
      machineId: M1, bouteilleDstId: B, quantiteKg: -3 },
    { id: 'cr1', statut: 'VALIDE', type: 'RECUPERATION_MAINTENANCE',
      machineId: M1, bouteilleDstId: B, quantiteKg: 3, contreEcritureDe: 'r1' }
  ];
  verifier('récup annulée + contre-écriture → avoir(M1) absent',
    avoirParMachineOrigine(B, mouvements).get(M1) === undefined);
  verifier('disponible après annulation = 0',
    avoirOrigineDisponible(B, M1, mouvements) === 0);
}

{
  // Une récupération vers une AUTRE bouteille ne crédite pas B.
  const mouvements = [
    { id: 'r1', statut: 'VALIDE', type: 'RECUPERATION_MAINTENANCE',
      machineId: M1, bouteilleDstId: 'autre-bou', quantiteKg: -3 }
  ];
  verifier('récup vers une autre bouteille : B non crédité',
    avoirParMachineOrigine(B, mouvements).get(M1) === undefined);
}

{
  // Un brouillon n'est pas opposable → ignoré.
  const mouvements = [
    { id: 'r1', statut: 'BROUILLON', type: 'RECUPERATION_MAINTENANCE',
      machineId: M1, bouteilleDstId: B, quantiteKg: -3 }
  ];
  verifier('récup en BROUILLON non comptée',
    avoirParMachineOrigine(B, mouvements).get(M1) === undefined);
}

{
  // TRANSFERT (V1) : brouille l'origine → hors calcul.
  const mouvements = [
    { id: 't1', statut: 'VALIDE', type: 'TRANSFERT',
      machineId: null, bouteilleSrcId: 'autre', bouteilleDstId: B, quantiteKg: 2 }
  ];
  verifier('transfert entrant : aucun avoir d’origine crédité (V1)',
    avoirParMachineOrigine(B, mouvements).size === 0);
}

{
  // Net négatif (réemploi > récupéré, cas limite) : brut exposé, disponible borné à 0.
  const mouvements = [
    { id: 'r1', statut: 'VALIDE', type: 'RECUPERATION_MAINTENANCE',
      machineId: M1, bouteilleDstId: B, quantiteKg: -1 },
    { id: 'c1', statut: 'VALIDE', type: 'CHARGE_APPOINT',
      machineId: M1, bouteilleSrcId: B, quantiteKg: 3 }
  ];
  verifier('net brut négatif exposé (−2)',
    PROCHE(avoirParMachineOrigine(B, mouvements).get(M1), -2));
  verifier('disponible borné à 0 (jamais négatif)',
    avoirOrigineDisponible(B, M1, mouvements) === 0);
}

// ============================================================
// B. Volet DemoStore réel — parcours mise en service → récup → réemploi
// ============================================================
console.log('--- B. parcours réel (DemoStore) ---');

const store = await creerStore();
await store.init();

const referent = await store.createPersonne({
  nom: 'Avoir', prenom: 'Référent', typePersonne: 'ENSEIGNANT',
  roleApp: 'REFERENT'
});
const fluides = await store.getFluides();
const machine = await store.createMachine({
  designation: 'Machine avoir origine', fluide: fluides[0].code,
  chargeNominaleKg: 10, operateur: 'Testeur'
});
const neuve = await store.createBouteille({
  type: 'NEUVE', fluide: fluides[0].code, tareKg: 10, masseBruteKg: 25,
  contenanceMaxKg: 20
});
const recup = await store.createBouteille({
  type: 'RECUPERATION', fluide: fluides[0].code, tareKg: 8, masseBruteKg: 8,
  contenanceMaxKg: 15
});

async function passer(params) {
  const mvt = await store.creerMouvement(params);
  await store.soumettreMouvement(mvt.id);
  await store.validerMouvement(mvt.id, referent.id);
  return mvt;
}

// Mise en service : la bouteille neuve (nette 15) charge 5 kg dans la machine.
await passer({ type: 'MISE_EN_SERVICE', machineId: machine.id,
  bouteilleSrcId: neuve.id, peseeAvantKg: 15, peseeApresKg: 10,
  technicien: 'Testeur' });

// Récupération : 3 kg de la machine → bouteille de récupération (nette 0 → 3).
await passer({ type: 'RECUPERATION_MAINTENANCE', machineId: machine.id,
  bouteilleDstId: recup.id, peseeAvantKg: 0, peseeApresKg: 3,
  technicien: 'Testeur' });

let mouvements = await store.getMouvements();
verifier('réel : après récupération de 3 kg, avoir(machine) dans la bouteille = 3',
  PROCHE(avoirOrigineDisponible(recup.id, machine.id, mouvements), 3),
  `disponible = ${avoirOrigineDisponible(recup.id, machine.id, mouvements)}`);

// Réemploi : 1 kg de la bouteille (nette 3 → 2) revient dans la machine.
await passer({ type: 'CHARGE_APPOINT', machineId: machine.id,
  bouteilleSrcId: recup.id, peseeAvantKg: 3, peseeApresKg: 2,
  technicien: 'Testeur' });

mouvements = await store.getMouvements();
verifier('réel : après réemploi de 1 kg, avoir(machine) = 2',
  PROCHE(avoirOrigineDisponible(recup.id, machine.id, mouvements), 2),
  `disponible = ${avoirOrigineDisponible(recup.id, machine.id, mouvements)}`);

// --- Surcharge de réemploi (CM-2) : le cas de Franck — réintroduire dans
// une machine PLUS que ce qu'on en a récupéré. Bouteille multi-origines :
// 1 kg d'origine M1 + 2 kg d'origine M2 ; on réemploie 2 kg dans M1 → on
// remet dans M1 1 kg qui ne vient pas d'elle → avoir(M1) = −1 → getAlertes
// SIGNALE l'anomalie (sans jamais bloquer la validation).
const m1 = await store.createMachine({
  designation: 'Machine origine 1', fluide: fluides[0].code,
  chargeNominaleKg: 10, operateur: 'Testeur'
});
const m2 = await store.createMachine({
  designation: 'Machine origine 2', fluide: fluides[0].code,
  chargeNominaleKg: 10, operateur: 'Testeur'
});
const neuve2 = await store.createBouteille({
  type: 'NEUVE', fluide: fluides[0].code, tareKg: 10, masseBruteKg: 25,
  contenanceMaxKg: 20
});
const bMix = await store.createBouteille({
  type: 'RECUPERATION', fluide: fluides[0].code, tareKg: 8, masseBruteKg: 8,
  contenanceMaxKg: 15
});
await passer({ type: 'MISE_EN_SERVICE', machineId: m1.id,
  bouteilleSrcId: neuve2.id, peseeAvantKg: 15, peseeApresKg: 13,
  technicien: 'Testeur' }); // M1 = 2
await passer({ type: 'MISE_EN_SERVICE', machineId: m2.id,
  bouteilleSrcId: neuve2.id, peseeAvantKg: 13, peseeApresKg: 10,
  technicien: 'Testeur' }); // M2 = 3
await passer({ type: 'RECUPERATION_MAINTENANCE', machineId: m1.id,
  bouteilleDstId: bMix.id, peseeAvantKg: 0, peseeApresKg: 1,
  technicien: 'Testeur' }); // bMix +1 d'origine M1
await passer({ type: 'RECUPERATION_MAINTENANCE', machineId: m2.id,
  bouteilleDstId: bMix.id, peseeAvantKg: 1, peseeApresKg: 3,
  technicien: 'Testeur' }); // bMix +2 d'origine M2 (3 kg au total)
await passer({ type: 'CHARGE_APPOINT', machineId: m1.id,
  bouteilleSrcId: bMix.id, peseeAvantKg: 3, peseeApresKg: 1,
  technicien: 'Testeur' }); // réemploi 2 kg dans M1 (dont 1 kg qui n'en vient pas)

mouvements = await store.getMouvements();
verifier('réel : réemploi 2 kg pour 1 kg récupéré de M1 → avoir(M1) = −1',
  PROCHE(avoirParMachineOrigine(bMix.id, mouvements).get(m1.id), -1),
  `avoir = ${avoirParMachineOrigine(bMix.id, mouvements).get(m1.id)}`);

const alertes = await store.getAlertes();
const alerteSurcharge = alertes.find(
  (a) => a.id === `alr-reemploi-${bMix.id}-${m1.id}`);
verifier('réel : getAlertes SIGNALE la réintroduction au-delà du récupéré',
  alerteSurcharge != null && alerteSurcharge.niveau === 'IMPORTANT');
verifier('réel : le détail nomme la machine et le surplus (1 kg)',
  alerteSurcharge != null
  && alerteSurcharge.detail.includes('Machine origine 1')
  && alerteSurcharge.detail.includes('1'));
verifier('réel : la charge depuis une bouteille NEUVE ne déclenche AUCUNE alerte de réemploi',
  !alertes.some((a) => a.id.startsWith(`alr-reemploi-${neuve2.id}`)));

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
