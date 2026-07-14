// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// Test du Lot 2 de l'audit du 03/07/2026 — côté MOTEUR (store).
// Exécution : node test-lot2.mjs (Node ≥ 18, sans DOM).
//   IM-4  arrêt / démantèlement / remise en service des machines,
//         compteur « en service », proposition de démantèlement
//   IM-6  bouteilles inéligibles rejetées à la validation
//   IM-7  décision « déchet » réversible
//   IM-8  BSFF partiel : le reliquat reste en stock
//   IM-9  retour fournisseur → balance matière
//   IM-10 années dynamiques + flux mensuels glissants
//   IM-3  trois familles d'alertes ajoutées
//   IM-2  cible { vue, id? } sur chaque alerte + surChangement()
//   IM-1  calculerProchainControle (fréquence réglementaire)
//   IM-19 liste blanche MIME des pièces jointes au store
// ============================================================

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

/** Vérifie qu'un appel async REJETTE avec un message contenant `extrait`. */
async function verifierRejet(libelle, promesse, extrait = '') {
  try {
    await promesse;
    verifier(libelle, false, 'aucune erreur levée');
  } catch (erreur) {
    verifier(libelle,
      !extrait || String(erreur.message).includes(extrait),
      `message = « ${erreur.message} »`);
  }
}

const PROCHE = (a, b) => Math.abs(a - b) < 1e-9;

const store = await creerStore();

// ============================================================
// IM-2 — abonnement au signal « données modifiées »
// ============================================================
let nbNotifications = 0;
const desabonner = store.surChangement(() => { nbNotifications += 1; });
verifier('IM-2 : surChangement retourne une fonction de désabonnement',
  typeof desabonner === 'function');

// ============================================================
// IM-4 — arrêt / remise en service, compteurs « en service »
// ============================================================
const arretee = await store.arreterMachine('M2', 'Frédéric Henninot');
verifier('IM-4 : arreterMachine → statut ARRETEE',
  arretee.statut === 'ARRETEE');
verifier('IM-2 : la mutation arreterMachine a notifié les abonnés',
  nbNotifications >= 1, `notifications = ${nbNotifications}`);

let stats = await store.getStats();
verifier('IM-4 : machine ARRETEE exclue du compteur « en service » (5/6)',
  stats.nbMachines === 5, `nbMachines = ${stats.nbMachines}`);
verifier('IM-4 : le fluide de la machine à l’arrêt reste compté au parc',
  stats.chargeParcKg >= 13.80 && stats.chargeParcKg <= 13.90,
  `chargeParcKg = ${stats.chargeParcKg}`);

await verifierRejet('IM-4 : arrêt refusé sur machine déjà à l’arrêt',
  store.arreterMachine('M2'), 'déjà à l’arrêt');

const remise = await store.remettreEnService('M2', 'Frédéric Henninot');
verifier('IM-4 : remettreEnService → EN_SERVICE, compteur revenu à 6',
  remise.statut === 'EN_SERVICE' &&
  (await store.getStats()).nbMachines === 6);

await verifierRejet(
  'IM-4 : démantèlement refusé si la machine contient du fluide (M1, 4,2 kg)',
  store.demantelerMachine('M1', 'Frédéric Henninot'), 'Récupérez');
await verifierRejet(
  'IM-4 : remise en service refusée sur une machine non arrêtée',
  store.remettreEnService('M1'), 'à l’arrêt');

// --- Récupération-démantèlement qui VIDE la machine → proposition
const essai = await store.createMachine({
  designation: 'Machine d’essai Lot 2 (à démanteler)',
  fluide: 'R-404A',
  chargeNominaleKg: 1.0,
  chargeActuelleKg: 0.5,
  clientId: 'cli-lycee',
  operateur: 'Frédéric Henninot'
});
const recupTotale = await store.creerMouvement({
  type: 'RECUPERATION_DEMANTELEMENT',
  date: '2026-07-03',
  machineId: essai.id,
  bouteilleDstId: 'B3', // bouteille de récupération R-404A en stock
  peseeAvantKg: 16.8,
  peseeApresKg: 17.3, // + 0,5 kg = toute la charge
  technicien: 'Frédéric Henninot'
});
await store.soumettreMouvement(recupTotale.id);
const resultatRecup = await store.validerMouvement(recupTotale.id, 'per-fh');
verifier('IM-4 : récupération-démantèlement qui vide la machine → ' +
  '{ proposerDemantelement: true }',
  resultatRecup.proposerDemantelement === true);
const essaiApres = (await store.getMachines()).find((m) => m.id === essai.id);
verifier('IM-4 : la proposition n’est PAS appliquée (machine non démantelée)',
  essaiApres.statut !== 'DEMANTELEE' &&
  PROCHE(essaiApres.chargeActuelleKg, 0));

const demantelee = await store.demantelerMachine(essai.id, 'Frédéric Henninot');
verifier('IM-4 : demantelerMachine (charge ≈ 0) → statut DEMANTELEE',
  demantelee.statut === 'DEMANTELEE');
await verifierRejet('IM-4 : remise en service refusée après démantèlement',
  store.remettreEnService(essai.id), 'définitif');
verifier('IM-4 : démantèlement journalisé',
  (await store.getJournalAudit()).some(
    (e) => e.action === 'DEMANTELEMENT_MACHINE' && e.cible === demantelee.code));

// ============================================================
// IM-6 — bouteilles inéligibles rejetées par la validation
// ============================================================

// Place restante insuffisante : petite bouteille de récupération
const petiteRecup = await store.createBouteille({
  type: 'RECUPERATION',
  fluide: 'R-404A',
  tareKg: 5.0,
  masseBruteKg: 6.8, // nette 1,8 kg
  contenanceMaxKg: 2.0,
  operateur: 'Frédéric Henninot'
});
const deborde = await store.creerMouvement({
  type: 'RECUPERATION_MAINTENANCE',
  date: '2026-07-03',
  machineId: 'M1',
  bouteilleDstId: petiteRecup.id,
  peseeAvantKg: 6.8,
  peseeApresKg: 7.3, // + 0,5 kg → 2,3 > contenance 2,0
  technicien: 'Frédéric Henninot'
});
await store.soumettreMouvement(deborde.id);
await verifierRejet(
  'IM-6 : récupération refusée si la place restante est insuffisante',
  store.validerMouvement(deborde.id, 'per-fh'), 'Débordement');
verifier('IM-6 : le rejet ne laisse AUCUNE mutation partielle (M1 intact)',
  PROCHE((await store.getMachines()).find((m) => m.id === 'M1')
    .chargeActuelleKg, 3.8));

// Source dont le fluide est en attente d'analyse
await store.deciderFluideRecupere('B3', 'A_ANALYSER', 'Frédéric Henninot');
const chargeAnalyse = await store.creerMouvement({
  type: 'CHARGE_APPOINT',
  date: '2026-07-03',
  machineId: 'M1',
  bouteilleSrcId: 'B3',
  peseeAvantKg: 17.3,
  peseeApresKg: 17.0,
  technicien: 'Frédéric Henninot'
});
await store.soumettreMouvement(chargeAnalyse.id);
await verifierRejet(
  'IM-6 : charge refusée depuis une bouteille au fluide « à analyser »',
  store.validerMouvement(chargeAnalyse.id, 'per-fh'), 'analyser');

// Source déclarée déchet (statut DECHET = sortie des sources possibles)
await store.deciderFluideRecupere('B3', 'DECHET', 'Frédéric Henninot');
const chargeDechet = await store.creerMouvement({
  type: 'CHARGE_APPOINT',
  date: '2026-07-03',
  machineId: 'M1',
  bouteilleSrcId: 'B3',
  peseeAvantKg: 17.3,
  peseeApresKg: 17.0,
  technicien: 'Frédéric Henninot'
});
await store.soumettreMouvement(chargeDechet.id);
await verifierRejet(
  'IM-6 : charge refusée depuis une bouteille déclarée DÉCHET',
  store.validerMouvement(chargeDechet.id, 'per-fh'), 'sortie du stock');

// ============================================================
// IM-7 — décision réversible
// ============================================================
const b3Dechet = (await store.getBouteilles()).find((b) => b.id === 'B3');
verifier('IM-7 (préalable) : décision DECHET → statut DECHET + délai de garde',
  b3Dechet.statut === 'DECHET' && b3Dechet.etatFluide === 'DECHET' &&
  Boolean(b3Dechet.dateLimiteGarde));

const b3Restauree = await store.deciderFluideRecupere(
  'B3', 'REUTILISABLE', 'Frédéric Henninot');
verifier('IM-7 : re-décision REUTILISABLE → EN_STOCK, fluide RECUPERE, ' +
  'délai de garde effacé',
  b3Restauree.statut === 'EN_STOCK' &&
  b3Restauree.etatFluide === 'RECUPERE' &&
  b3Restauree.dateLimiteGarde === null &&
  b3Restauree.decisionFluide === 'REUTILISABLE');
verifier('IM-7 : le retour en stock est journalisé',
  (await store.getJournalAudit()).some((e) =>
    e.action === 'DECISION_FLUIDE' && e.cible === 'B-03' &&
    String(e.details).includes('retour en stock')));

// ============================================================
// IM-8 — BSFF partiel : le reliquat reste en stock
// ============================================================
const bDechet = await store.createBouteille({
  type: 'RECUPERATION',
  fluide: 'R-404A',
  tareKg: 13.0,
  masseBruteKg: 17.0, // nette 4,0 kg
  contenanceMaxKg: 10,
  operateur: 'Frédéric Henninot'
});
await store.deciderFluideRecupere(bDechet.id, 'DECHET', 'Frédéric Henninot');
await store.createBsff({
  bouteilleId: bDechet.id,
  numeroBsff: 'BSFF-2026-LOT2-A',
  transporteur: 'TransDéchets',
  installationDestination: 'Centre de traitement agréé',
  masseRemiseKg: 2.5,
  dateRemise: '2026-07-03',
  operateur: 'Frédéric Henninot'
});
const bApresPartiel = (await store.getBouteilles())
  .find((b) => b.id === bDechet.id);
verifier('IM-8 : BSFF partiel (2,5/4,0) → reliquat 1,5 kg en stock, ' +
  'statut inchangé (DECHET)',
  PROCHE(bApresPartiel.masseNetteKg, 1.5) &&
  bApresPartiel.statut === 'DECHET' &&
  PROCHE(bApresPartiel.masseBruteKg, 14.5));

await store.createBsff({
  bouteilleId: bDechet.id,
  numeroBsff: 'BSFF-2026-LOT2-B',
  masseRemiseKg: 1.5,
  dateRemise: '2026-07-03',
  operateur: 'Frédéric Henninot'
});
const bApresTotal = (await store.getBouteilles())
  .find((b) => b.id === bDechet.id);
verifier('IM-8 : bouteille vidée par le second BSFF → statut RETOURNEE',
  bApresTotal.statut === 'RETOURNEE' && PROCHE(bApresTotal.masseNetteKg, 0));

// IM-6 (suite) : la bouteille RETOURNEE est refusée comme destination
const recupSortie = await store.creerMouvement({
  type: 'RECUPERATION_MAINTENANCE',
  date: '2026-07-03',
  machineId: 'M1',
  bouteilleDstId: bDechet.id,
  peseeAvantKg: 13.0,
  peseeApresKg: 13.3,
  technicien: 'Frédéric Henninot'
});
await store.soumettreMouvement(recupSortie.id);
await verifierRejet(
  'IM-6 : récupération refusée vers une bouteille sortie (RETOURNEE)',
  store.validerMouvement(recupSortie.id, 'per-fh'), 'sortie du stock');

// ============================================================
// IM-9 — retour fournisseur
// ============================================================
const b5Retour = await store.retournerFournisseur('B5', 'Frédéric Henninot');
verifier('IM-9 : retournerFournisseur → statut RETOURNEE, masse nette 0',
  b5Retour.statut === 'RETOURNEE' && PROCHE(b5Retour.masseNetteKg, 0) &&
  PROCHE(b5Retour.masseBruteKg, b5Retour.tareKg));

const balance = await store.getBalanceMatiere(2026);
const ligne410 = balance.lignes.find((l) => l.fluide === 'R-410A');
verifier('IM-9 : la balance matière porte le retour (R-410A : 2,1 kg)',
  ligne410 && PROCHE(ligne410.retoursFournisseurKg, 2.1),
  `retoursFournisseurKg = ${ligne410?.retoursFournisseurKg}`);
verifier('IM-9 : retour journalisé (RETOUR_FOURNISSEUR)',
  (await store.getJournalAudit()).some(
    (e) => e.action === 'RETOUR_FOURNISSEUR' && e.cible === 'B-05'));
await verifierRejet('IM-9 : second retour refusé (bouteille déjà retournée)',
  store.retournerFournisseur('B5'), 'déjà retournée');

// ============================================================
// IM-10 — années dynamiques et flux mensuels glissants
// ============================================================
await store.creerMouvement({
  type: 'CHARGE_APPOINT',
  date: '2025-11-05', // brouillon daté 2025 : l'année doit apparaître
  machineId: 'M1',
  technicien: 'Frédéric Henninot'
});
const annees = await store.getAnneesDisponibles();
verifier('IM-10 : getAnneesDisponibles contient 2026 ET 2025 (mouvement)',
  annees.includes(2026) && annees.includes(2025),
  `années = ${JSON.stringify(annees)}`);
verifier('IM-10 : années triées par ordre décroissant',
  annees.every((a, i) => i === 0 || annees[i - 1] > a));

// Mouvement validé en septembre → la fenêtre glisse jusqu'à Sept.
const chargeSept = await store.creerMouvement({
  type: 'CHARGE_APPOINT',
  date: '2026-09-10',
  machineId: 'M1',
  bouteilleSrcId: 'B3', // redevenue EN_STOCK / REUTILISABLE (IM-7)
  peseeAvantKg: 17.3,
  peseeApresKg: 17.0, // + 0,3 kg sur M1 (4,2 → 4,5 ≤ nominale 4,5)
  technicien: 'Frédéric Henninot'
});
await store.soumettreMouvement(chargeSept.id);
await store.validerMouvement(chargeSept.id, 'per-fh');

stats = await store.getStats();
verifier('IM-10 : fenêtre glissante close sur le mois de la donnée la ' +
  'plus récente (Avr. → Sept. 2026)',
  stats.fluxMensuels.length === 6 &&
  stats.fluxMensuels[0].mois === 'Avr.' &&
  stats.fluxMensuels[5].mois === 'Sept.' &&
  stats.fluxMensuels[5].annee === 2026,
  JSON.stringify(stats.fluxMensuels.map((f) => f.mois)));
verifier('IM-10 : la charge de septembre (0,3 kg) est comptée dans son mois',
  PROCHE(stats.fluxMensuels[5].chargeKg, 0.3),
  `chargeKg = ${stats.fluxMensuels[5].chargeKg}`);

// ============================================================
// IM-3 + IM-2 — nouvelles familles d'alertes et cibles cliquables
// ============================================================
await store.createBouteille({
  type: 'NEUVE',
  fluide: 'R-134a',
  tareKg: 11.0,
  masseBruteKg: 15.0,
  contenanceMaxKg: 12,
  datePesee: '2026-01-05', // pesée vieille de plus de 90 jours
  operateur: 'Frédéric Henninot'
});

// Mouvements en souffrance : injectés par le cycle export → import
// (données anciennes SANS dateSoumission → repli sur la date).
const paquet = JSON.parse(await store.exporterJSON());
paquet.donnees.mouvements.push({
  id: 'mvt-lot2-soumis',
  numero: 'FORM-2026-9998',
  date: '2026-05-01',
  mode: 'FORMATION',
  type: 'CHARGE_APPOINT',
  machineId: 'M1',
  fluide: 'R-404A',
  quantiteKg: null,
  statut: 'SOUMIS',
  technicien: 'Julien Martin'
}, {
  id: 'mvt-lot2-brouillon',
  numero: 'FORM-2026-9999',
  date: '2026-04-01',
  mode: 'FORMATION',
  type: 'TRANSFERT',
  quantiteKg: null,
  statut: 'BROUILLON',
  technicien: 'Julien Martin'
});
verifier('(préalable) import du jeu enrichi accepté',
  await store.importerJSON(JSON.stringify(paquet)) === true);

const alertes = await store.getAlertes();
const VUES_CIBLES = ['machines', 'bouteilles', 'mouvements', 'controles',
  'outillage', 'personnel', 'admin', 'balance'];
verifier('IM-2 : CHAQUE alerte porte une cible { vue } valide',
  alertes.length > 0 && alertes.every((a) =>
    a.cible && VUES_CIBLES.includes(a.cible.vue)),
  JSON.stringify(alertes.filter((a) =>
    !a.cible || !VUES_CIBLES.includes(a.cible?.vue))));
verifier('IM-2 : l’alerte de fuite cible la machine M5',
  alertes.some((a) => a.id === 'alr-fuite-M5' &&
    a.cible.vue === 'machines' && a.cible.id === 'M5'));
verifier('IM-3 : alerte « bouteille sans pesée récente » (> 90 j) avec cible',
  alertes.some((a) => a.id.startsWith('alr-pesee-') &&
    a.titre === 'Bouteille sans pesée récente' &&
    a.cible.vue === 'bouteilles' && Boolean(a.cible.id)));
verifier('IM-3 : alerte « mouvement soumis à valider » (> 7 j) avec cible',
  alertes.some((a) => a.id === 'alr-soumis-mvt-lot2-soumis' &&
    a.cible.vue === 'mouvements' && a.cible.id === 'mvt-lot2-soumis'));
verifier('IM-3 : alerte « brouillon à reprendre » (> 30 j) avec cible',
  alertes.some((a) => a.id === 'alr-brouillon-mvt-lot2-brouillon' &&
    a.cible.vue === 'mouvements'));
verifier('IM-3 : un mouvement soumis AUJOURD’HUI ne lève pas d’alerte',
  !alertes.some((a) => a.id === `alr-soumis-${deborde.id}`));

// ============================================================
// IM-1 — calculerProchainControle (fréquence réglementaire)
// ============================================================
verifier('IM-1 : M1 (R-404A, 4,5 kg → 17,6 t éq. CO₂, sans détection) ' +
  '→ + 12 mois',
  await store.calculerProchainControle('M1', '2026-07-01') === '2027-07-01');
verifier('IM-1 : M5 (R-455A avec HFO, 3,05 kg, détection permanente) ' +
  '→ + 24 mois',
  await store.calculerProchainControle('M5', '2026-01-31') === '2028-01-31');
verifier('IM-1 : M4 (R-32, 0,9 kg → 0,6 t éq. CO₂) hors périmètre → null',
  await store.calculerProchainControle('M4', '2026-07-01') === null);

// ============================================================
// IM-19 — liste blanche MIME au store
// ============================================================
await verifierRejet('IM-19 : pièce jointe text/html refusée par le store',
  store.ajouterPieceJointe({
    entiteType: 'MACHINE',
    entiteId: 'M1',
    nomFichier: 'piege.html',
    mimeType: 'text/html',
    base64: 'PGh0bWw+'
  }), 'Type de fichier refusé');
const pj = await store.ajouterPieceJointe({
  entiteType: 'MACHINE',
  entiteId: 'M1',
  nomFichier: 'notice.pdf',
  mimeType: 'application/pdf',
  base64: 'JVBERi0xLjQK'
});
verifier('IM-19 : PDF accepté (liste blanche)',
  pj.mimeType === 'application/pdf');

// ============================================================
// IM-2 — désabonnement effectif
// ============================================================
verifier('IM-2 : les mutations ont notifié les abonnés tout du long',
  nbNotifications > 5, `notifications = ${nbNotifications}`);
desabonner();
const notificationsAvant = nbNotifications;
await store.arreterMachine('M3', 'Frédéric Henninot');
await store.remettreEnService('M3', 'Frédéric Henninot');
verifier('IM-2 : plus AUCUNE notification après désabonnement',
  nbNotifications === notificationsAvant);

// ============================================================
console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
