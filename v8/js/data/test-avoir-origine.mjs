// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// Test du module « avoir de fluide par machine d'origine ».
// Exécution : node v8/js/data/test-avoir-origine.mjs
//
// Volet A (pur, données forgées) : crédit d'une récupération, débit d'un
// réemploi, multi-origines dans une même bouteille, exclusion des
// contre-écritures et des brouillons, non-fuite d'une autre bouteille,
// net négatif borné à 0, et PROPAGATION des lots par les TRANSFERTS
// (CM-5) : consolidation propre, prorata multi-origines, excédent sans
// origine, solde négatif exclu, ordre du registre rétabli en interne,
// contre-écriture neutralisée.
// Volet B (DemoStore réel) : parcours mise en service → récupération →
// réemploi, ET chaîne de consolidation récup → transfert → recharge
// SANS alerte de réemploi (le faux positif de la revue du 22/07, tué).
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
  // TRANSFERT entrant depuis une bouteille SANS lot attribué : rien à
  // propager (l'excédent n'a pas d'origine machine).
  const mouvements = [
    { id: 't1', statut: 'VALIDE', type: 'TRANSFERT', date: '2026-07-01',
      numero: 'T-01', machineId: null, bouteilleSrcId: 'autre',
      bouteilleDstId: B, quantiteKg: 2 }
  ];
  verifier('transfert depuis une bouteille sans lot : rien de propagé',
    avoirParMachineOrigine(B, mouvements).size === 0);
}

// ------------------------------------------------------------
// CM-5 — propagation des lots d'origine par les TRANSFERTS
// ------------------------------------------------------------
console.log('--- A2. transferts (CM-5) ---');

{
  // Consolidation LÉGITIME : récup M1 → B, transfert B → B2, recharge M1
  // depuis B2 → avoir(M1, B2) = 0, JAMAIS négatif (faux positif de la
  // revue du 22/07, tué).
  const mouvements = [
    { id: 'r1', statut: 'VALIDE', type: 'RECUPERATION_MAINTENANCE',
      date: '2026-07-01', numero: 'M-01', machineId: M1,
      bouteilleDstId: B, quantiteKg: -2 },
    { id: 't1', statut: 'VALIDE', type: 'TRANSFERT', date: '2026-07-02',
      numero: 'M-02', machineId: null, bouteilleSrcId: B,
      bouteilleDstId: 'bou-2', quantiteKg: 2 },
    { id: 'c1', statut: 'VALIDE', type: 'CHARGE_APPOINT',
      date: '2026-07-03', numero: 'M-03', machineId: M1,
      bouteilleSrcId: 'bou-2', quantiteKg: 2 }
  ];
  verifier('consolidation : le lot M1 SUIT le transfert puis s’éteint au réemploi (net 0)',
    PROCHE(avoirParMachineOrigine('bou-2', mouvements).get(M1) ?? 0, 0),
    `net = ${avoirParMachineOrigine('bou-2', mouvements).get(M1)}`);
  verifier('consolidation : la source est vidée de son lot (net 0)',
    PROCHE(avoirParMachineOrigine(B, mouvements).get(M1) ?? 0, 0));

  // Même registre fourni dans l'ordre CONTRACTUEL (décroissant) : le
  // module rétablit l'ordre chronologique lui-même.
  const decroissant = [...mouvements].reverse();
  verifier('l’ordre contractuel (décroissant) donne le MÊME résultat',
    PROCHE(avoirParMachineOrigine('bou-2', decroissant).get(M1) ?? 0, 0));
}

{
  // Prorata multi-origines : B porte M1 = 2 et M2 = 2 ; transfert de
  // 2 kg → chaque lot voyage pour moitié.
  const mouvements = [
    { id: 'r1', statut: 'VALIDE', type: 'RECUPERATION_MAINTENANCE',
      date: '2026-07-01', numero: 'M-01', machineId: M1,
      bouteilleDstId: B, quantiteKg: -2 },
    { id: 'r2', statut: 'VALIDE', type: 'RECUPERATION_MAINTENANCE',
      date: '2026-07-01', numero: 'M-02', machineId: M2,
      bouteilleDstId: B, quantiteKg: -2 },
    { id: 't1', statut: 'VALIDE', type: 'TRANSFERT', date: '2026-07-02',
      numero: 'M-03', machineId: null, bouteilleSrcId: B,
      bouteilleDstId: 'bou-2', quantiteKg: 2 }
  ];
  const src = avoirParMachineOrigine(B, mouvements);
  const dst = avoirParMachineOrigine('bou-2', mouvements);
  verifier('prorata : la destination reçoit M1 = 1 et M2 = 1',
    PROCHE(dst.get(M1), 1) && PROCHE(dst.get(M2), 1),
    `dst = M1:${dst.get(M1)} M2:${dst.get(M2)}`);
  verifier('prorata : la source garde M1 = 1 et M2 = 1',
    PROCHE(src.get(M1), 1) && PROCHE(src.get(M2), 1));
}

{
  // Excédent : B ne porte qu'1 kg attribué (M1) mais 3 kg sont
  // transférés → tout le lot part, l'excédent reste SANS origine.
  const mouvements = [
    { id: 'r1', statut: 'VALIDE', type: 'RECUPERATION_MAINTENANCE',
      date: '2026-07-01', numero: 'M-01', machineId: M1,
      bouteilleDstId: B, quantiteKg: -1 },
    { id: 't1', statut: 'VALIDE', type: 'TRANSFERT', date: '2026-07-02',
      numero: 'M-02', machineId: null, bouteilleSrcId: B,
      bouteilleDstId: 'bou-2', quantiteKg: 3 }
  ];
  verifier('excédent : la destination reçoit le lot entier (M1 = 1), pas plus',
    PROCHE(avoirParMachineOrigine('bou-2', mouvements).get(M1), 1));
  verifier('excédent : la source est vidée de son lot (M1 = 0)',
    PROCHE(avoirParMachineOrigine(B, mouvements).get(M1) ?? 0, 0));
}

{
  // Solde NÉGATIF (surcharge déjà signalée) : il ne voyage jamais.
  const mouvements = [
    { id: 'r1', statut: 'VALIDE', type: 'RECUPERATION_MAINTENANCE',
      date: '2026-07-01', numero: 'M-01', machineId: M1,
      bouteilleDstId: B, quantiteKg: -1 },
    { id: 'c1', statut: 'VALIDE', type: 'CHARGE_APPOINT',
      date: '2026-07-02', numero: 'M-02', machineId: M1,
      bouteilleSrcId: B, quantiteKg: 2 }, // M1 → −1 (surcharge)
    { id: 'r2', statut: 'VALIDE', type: 'RECUPERATION_MAINTENANCE',
      date: '2026-07-03', numero: 'M-03', machineId: M2,
      bouteilleDstId: B, quantiteKg: -2 },
    { id: 't1', statut: 'VALIDE', type: 'TRANSFERT', date: '2026-07-04',
      numero: 'M-04', machineId: null, bouteilleSrcId: B,
      bouteilleDstId: 'bou-2', quantiteKg: 1 }
  ];
  const src = avoirParMachineOrigine(B, mouvements);
  const dst = avoirParMachineOrigine('bou-2', mouvements);
  verifier('solde négatif : seul le lot positif (M2) propage',
    PROCHE(dst.get(M2), 1) && dst.get(M1) === undefined,
    `dst = M1:${dst.get(M1)} M2:${dst.get(M2)}`);
  verifier('solde négatif : la surcharge M1 = −1 RESTE sur la source (toujours signalée)',
    PROCHE(src.get(M1), -1) && PROCHE(src.get(M2), 1));
}

{
  // Transfert AVANT toute récupération (ordre chronologique respecté) :
  // les lots n'existaient pas encore, rien ne voyage.
  const mouvements = [
    { id: 't1', statut: 'VALIDE', type: 'TRANSFERT', date: '2026-07-01',
      numero: 'M-01', machineId: null, bouteilleSrcId: B,
      bouteilleDstId: 'bou-2', quantiteKg: 2 },
    { id: 'r1', statut: 'VALIDE', type: 'RECUPERATION_MAINTENANCE',
      date: '2026-07-02', numero: 'M-02', machineId: M1,
      bouteilleDstId: B, quantiteKg: -2 }
  ];
  verifier('transfert ANTÉRIEUR à la récupération : rien de propagé',
    avoirParMachineOrigine('bou-2', mouvements).size === 0
    && PROCHE(avoirParMachineOrigine(B, mouvements).get(M1), 2));
}

{
  // CONSERVATION sous micro-transferts (revue du 22/07) : l'arrondi au
  // gramme par lot, sans plafond global, CRÉAIT de la matière tracée
  // (2 g déplacés pour 1 g transféré, cumulable). La somme des lots de
  // la destination ne doit JAMAIS dépasser le total transféré.
  const mouvements = [
    { id: 'r1', statut: 'VALIDE', type: 'RECUPERATION_MAINTENANCE',
      date: '2026-07-01', numero: 'M-001', machineId: M1,
      bouteilleDstId: B, quantiteKg: -0.5 },
    { id: 'r2', statut: 'VALIDE', type: 'RECUPERATION_MAINTENANCE',
      date: '2026-07-01', numero: 'M-002', machineId: M2,
      bouteilleDstId: B, quantiteKg: -0.5 }
  ];
  // 10 micro-transferts d'1 g chacun vers bou-2.
  for (let i = 0; i < 10; i += 1) {
    mouvements.push({ id: `t${i}`, statut: 'VALIDE', type: 'TRANSFERT',
      date: '2026-07-02', numero: `M-1${String(i).padStart(2, '0')}`,
      machineId: null, bouteilleSrcId: B, bouteilleDstId: 'bou-2',
      quantiteKg: 0.001 });
  }
  const dst = avoirParMachineOrigine('bou-2', mouvements);
  const totalDst = [...dst.values()].reduce((t, v) => t + v, 0);
  verifier('micro-transferts : 10 g transférés → AU PLUS 10 g de lots tracés (conservation)',
    totalDst <= 0.01 + 1e-9, `total destination = ${totalDst}`);
  const src = avoirParMachineOrigine(B, mouvements);
  const totalGlobal = totalDst + [...src.values()].reduce((t, v) => t + v, 0);
  verifier('micro-transferts : le total global des lots reste 1 kg (rien créé, rien perdu)',
    PROCHE(totalGlobal, 1), `total global = ${totalGlobal}`);
}

{
  // CHRONOLOGIE MÉTIER (revue du 22/07) : la date d'opération PRIME sur
  // le numéro d'écriture — une récupération du 01/07 saisie tardivement
  // (numéro élevé) précède quand même un transfert du 02/07 saisi tôt.
  const mouvements = [
    { id: 't1', statut: 'VALIDE', type: 'TRANSFERT', date: '2026-07-02',
      numero: 'M-001', machineId: null, bouteilleSrcId: B,
      bouteilleDstId: 'bou-2', quantiteKg: 2 },
    { id: 'r1', statut: 'VALIDE', type: 'RECUPERATION_MAINTENANCE',
      date: '2026-07-01', numero: 'M-999', machineId: M1,
      bouteilleDstId: B, quantiteKg: -2 }
  ];
  verifier('chronologie métier : la récup du 01/07 (saisie tard) précède le transfert du 02/07',
    PROCHE(avoirParMachineOrigine('bou-2', mouvements).get(M1), 2),
    `dst = ${avoirParMachineOrigine('bou-2', mouvements).get(M1)}`);
}

{
  // Auto-transfert (source = destination) : garde explicite, rien ne bouge.
  const mouvements = [
    { id: 'r1', statut: 'VALIDE', type: 'RECUPERATION_MAINTENANCE',
      date: '2026-07-01', numero: 'M-01', machineId: M1,
      bouteilleDstId: B, quantiteKg: -2 },
    { id: 't1', statut: 'VALIDE', type: 'TRANSFERT', date: '2026-07-02',
      numero: 'M-02', machineId: null, bouteilleSrcId: B,
      bouteilleDstId: B, quantiteKg: 1 }
  ];
  verifier('auto-transfert (source = destination) : les lots ne bougent pas',
    PROCHE(avoirParMachineOrigine(B, mouvements).get(M1), 2));
}

{
  // Contre-écriture d'un transfert : l'original (ANNULE) et la CE
  // sortent tous deux du compte — aucun lot ne voyage.
  const mouvements = [
    { id: 'r1', statut: 'VALIDE', type: 'RECUPERATION_MAINTENANCE',
      date: '2026-07-01', numero: 'M-01', machineId: M1,
      bouteilleDstId: B, quantiteKg: -2 },
    { id: 't1', statut: 'ANNULE', type: 'TRANSFERT', date: '2026-07-02',
      numero: 'M-02', machineId: null, bouteilleSrcId: B,
      bouteilleDstId: 'bou-2', quantiteKg: 2 },
    { id: 't2', statut: 'VALIDE', type: 'TRANSFERT', date: '2026-07-03',
      numero: 'M-03', machineId: null, bouteilleSrcId: B,
      bouteilleDstId: 'bou-2', quantiteKg: -2, contreEcritureDe: 't1' }
  ];
  verifier('transfert annulé + contre-écriture : aucun lot déplacé',
    avoirParMachineOrigine('bou-2', mouvements).size === 0
    && PROCHE(avoirParMachineOrigine(B, mouvements).get(M1), 2));
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

// --- Consolidation réelle (CM-5) : récup → transfert → recharge, la
// chaîne LÉGITIME que la V1 signalait à tort (revue du 22/07). ---
const mC = await store.createMachine({
  designation: 'Machine consolidation', fluide: fluides[0].code,
  chargeNominaleKg: 10, operateur: 'Testeur'
});
const neuveC = await store.createBouteille({
  type: 'NEUVE', fluide: fluides[0].code, tareKg: 10, masseBruteKg: 25,
  contenanceMaxKg: 20
});
const bConso1 = await store.createBouteille({
  type: 'RECUPERATION', fluide: fluides[0].code, tareKg: 8, masseBruteKg: 8,
  contenanceMaxKg: 15
});
const bConso2 = await store.createBouteille({
  type: 'RECUPERATION', fluide: fluides[0].code, tareKg: 8, masseBruteKg: 8,
  contenanceMaxKg: 15
});
await passer({ type: 'MISE_EN_SERVICE', machineId: mC.id,
  bouteilleSrcId: neuveC.id, peseeAvantKg: 15, peseeApresKg: 11,
  technicien: 'Testeur' }); // mC = 4
await passer({ type: 'RECUPERATION_MAINTENANCE', machineId: mC.id,
  bouteilleDstId: bConso1.id, peseeAvantKg: 0, peseeApresKg: 2,
  technicien: 'Testeur' }); // bConso1 = 2 kg d'origine mC
// Le fluide récupéré doit être déclaré RÉUTILISABLE pour servir de source.
await store.deciderFluideRecupere(bConso1.id, 'REUTILISABLE', 'Testeur');
await passer({ type: 'TRANSFERT', bouteilleSrcId: bConso1.id,
  bouteilleDstId: bConso2.id, peseeAvantKg: 2, peseeApresKg: 0,
  technicien: 'Testeur' }); // les 2 kg (origine mC) passent dans bConso2
await store.deciderFluideRecupere(bConso2.id, 'REUTILISABLE', 'Testeur');
await passer({ type: 'CHARGE_APPOINT', machineId: mC.id,
  bouteilleSrcId: bConso2.id, peseeAvantKg: 2, peseeApresKg: 0.5,
  technicien: 'Testeur' }); // réemploi 1,5 kg ≤ 2 kg d'origine mC

mouvements = await store.getMouvements();
verifier('réel CM-5 : après le transfert, l’avoir d’origine mC vit dans la 2ᵉ bouteille',
  PROCHE(avoirOrigineDisponible(bConso2.id, mC.id, mouvements), 0.5),
  `disponible = ${avoirOrigineDisponible(bConso2.id, mC.id, mouvements)}`);
const alertesConso = await store.getAlertes();
verifier('réel CM-5 : la consolidation LÉGITIME ne déclenche AUCUNE alerte de réemploi',
  !alertesConso.some((a) => a.id.startsWith('alr-reemploi-' + bConso1.id))
  && !alertesConso.some((a) => a.id.startsWith('alr-reemploi-' + bConso2.id)));

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
