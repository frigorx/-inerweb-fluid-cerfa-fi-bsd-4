// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// Scénario d'INTÉGRATION du Lot 2 — vie d'atelier de bout en bout.
// Exécution : node test-scenario-lot2.mjs (Node ≥ 18, sans DOM).
// Enchaîne, sur UN MÊME store, les chantiers du Lot 2 :
//   IM-4  arrêt / remise en service, récupération-démantèlement
//         → proposition → démantèlement → exclusion des stats
//   IM-9  retour fournisseur → balance matière + sortie des actifs
//   IM-7  décision « déchet » annulée → bouteille de nouveau éligible
//   IM-8  BSFF partiel → reliquat exact
//   IM-3  alerte « mouvement soumis à valider » (écriture vieillie)
//   IM-10 getAnneesDisponibles voit une écriture 2027
//   IM-19 type MIME exotique rejeté au store
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
const OPERATEUR = 'Frédéric Henninot';

const store = await creerStore();

// ============================================================
// 1. Machine arrêtée puis remise en service (IM-4)
// ============================================================
const m2Arretee = await store.arreterMachine('M2', OPERATEUR);
verifier('Machine M2 mise à l’arrêt → statut ARRETEE',
  m2Arretee.statut === 'ARRETEE');

let stats = await store.getStats();
verifier('Compteur « en service » réduit à 5 pendant l’arrêt',
  stats.nbMachines === 5, `nbMachines = ${stats.nbMachines}`);

const m2Remise = await store.remettreEnService('M2', OPERATEUR);
stats = await store.getStats();
verifier('M2 remise en service → EN_SERVICE et compteur revenu à 6',
  m2Remise.statut === 'EN_SERVICE' && stats.nbMachines === 6);

// ============================================================
// 2. Récupération-démantèlement → proposition → démantelée
//    → exclue des stats (IM-4)
// ============================================================
const statsAvantEssai = await store.getStats();

const essai = await store.createMachine({
  designation: 'Groupe d’essai scénario Lot 2',
  fluide: 'R-404A',
  chargeNominaleKg: 1.0,
  chargeActuelleKg: 0.4,
  clientId: 'cli-lycee',
  operateur: OPERATEUR
});

const recup = await store.creerMouvement({
  type: 'RECUPERATION_DEMANTELEMENT',
  date: '2026-07-03',
  machineId: essai.id,
  bouteilleDstId: 'B3', // bouteille de récupération R-404A en stock
  peseeAvantKg: 16.8,
  peseeApresKg: 17.2, // + 0,4 kg = toute la charge
  technicien: OPERATEUR
});
await store.soumettreMouvement(recup.id);
const resultatRecup = await store.validerMouvement(recup.id, 'per-fh');
verifier('Récupération-démantèlement qui vide la machine → ' +
  'proposerDemantelement === true',
  resultatRecup.proposerDemantelement === true);

const essaiVidee = (await store.getMachines()).find((m) => m.id === essai.id);
verifier('La proposition n’applique RIEN : machine vidée mais non démantelée',
  essaiVidee.statut !== 'DEMANTELEE' && PROCHE(essaiVidee.chargeActuelleKg, 0));

const demantelee = await store.demantelerMachine(essai.id, OPERATEUR);
verifier('demantelerMachine (charge ≈ 0) → statut DEMANTELEE',
  demantelee.statut === 'DEMANTELEE');

const statsApresDemantelement = await store.getStats();
verifier('Machine démantelée EXCLUE des stats : compteur et charge du parc ' +
  'revenus à leur valeur d’avant l’essai',
  statsApresDemantelement.nbMachines === statsAvantEssai.nbMachines &&
  PROCHE(statsApresDemantelement.chargeParcKg, statsAvantEssai.chargeParcKg),
  `nbMachines = ${statsApresDemantelement.nbMachines}, ` +
  `chargeParcKg = ${statsApresDemantelement.chargeParcKg}`);

// ============================================================
// 3. Retour fournisseur (IM-9) : balance alimentée, bouteille
//    sortie des actifs
// ============================================================
const stockAvantRetour = (await store.getStats()).stockBouteillesKg;

const b5 = await store.retournerFournisseur('B5', OPERATEUR);
verifier('retournerFournisseur → statut RETOURNEE, masse nette 0, ' +
  'masse brute = tare',
  b5.statut === 'RETOURNEE' && PROCHE(b5.masseNetteKg, 0) &&
  PROCHE(b5.masseBruteKg, b5.tareKg));

const balance = await store.getBalanceMatiere(2026);
const ligneR410 = balance.lignes.find((l) => l.fluide === 'R-410A');
verifier('Balance matière 2026 : retoursFournisseurKg = 2,1 kg de R-410A',
  ligneR410 && PROCHE(ligneR410.retoursFournisseurKg, 2.1),
  `retoursFournisseurKg = ${ligneR410?.retoursFournisseurKg}`);

const stockApresRetour = (await store.getStats()).stockBouteillesKg;
verifier('Stock bouteilles actif réduit de 2,1 kg (bouteille exclue des actifs)',
  PROCHE(stockAvantRetour - stockApresRetour, 2.1),
  `avant = ${stockAvantRetour}, après = ${stockApresRetour}`);

const chargeDepuisRetournee = await store.creerMouvement({
  type: 'CHARGE_APPOINT',
  date: '2026-07-03',
  machineId: 'M1',
  bouteilleSrcId: 'B5',
  peseeAvantKg: 11.8,
  peseeApresKg: 11.5,
  technicien: OPERATEUR
});
await store.soumettreMouvement(chargeDepuisRetournee.id);
await verifierRejet(
  'Bouteille RETOURNEE refusée comme source d’un mouvement (hors stock)',
  store.validerMouvement(chargeDepuisRetournee.id, 'per-fh'),
  'sortie du stock');

// ============================================================
// 4. Décision déchet ANNULÉE → bouteille de nouveau éligible
//    aux mouvements du wizard (IM-7 + règles IM-6 du store)
// ============================================================
const b3Dechet = await store.deciderFluideRecupere('B3', 'DECHET', OPERATEUR);
verifier('Décision DECHET sur B3 → statut DECHET + délai de garde posé',
  b3Dechet.statut === 'DECHET' && Boolean(b3Dechet.dateLimiteGarde));

const recupVersDechet = await store.creerMouvement({
  type: 'RECUPERATION_MAINTENANCE',
  date: '2026-07-03',
  machineId: 'M1',
  bouteilleDstId: 'B3',
  peseeAvantKg: 17.2,
  peseeApresKg: 17.5,
  technicien: OPERATEUR
});
await store.soumettreMouvement(recupVersDechet.id);
await verifierRejet(
  'Pendant l’état déchet : B3 refusée comme destination de récupération',
  store.validerMouvement(recupVersDechet.id, 'per-fh'), 'sortie du stock');

const b3Restauree = await store.deciderFluideRecupere(
  'B3', 'REUTILISABLE', OPERATEUR);
verifier('Décision annulée (REUTILISABLE) → B3 de nouveau EN_STOCK, ' +
  'délai de garde effacé',
  b3Restauree.statut === 'EN_STOCK' && b3Restauree.dateLimiteGarde === null);

const recupApresRestauration = await store.creerMouvement({
  type: 'RECUPERATION_MAINTENANCE',
  date: '2026-07-03',
  machineId: 'M1',
  bouteilleDstId: 'B3',
  peseeAvantKg: 17.2,
  peseeApresKg: 17.5, // + 0,3 kg récupéré depuis M1
  technicien: OPERATEUR
});
await store.soumettreMouvement(recupApresRestauration.id);
const recupValidee =
  await store.validerMouvement(recupApresRestauration.id, 'per-fh');
verifier('Après annulation : le MÊME mouvement passe la validation ' +
  '(bouteille de nouveau éligible ; quantité signée, fluide sortant)',
  recupValidee.statut === 'VALIDE' && PROCHE(recupValidee.quantiteKg, -0.3),
  `statut = ${recupValidee.statut}, quantité = ${recupValidee.quantiteKg}`);

const b3Finale = (await store.getBouteilles()).find((b) => b.id === 'B3');
verifier('B3 créditée du fluide récupéré (3,6 + 0,4 + 0,3 = 4,3 kg nets)',
  PROCHE(b3Finale.masseNetteKg, 4.3),
  `masseNetteKg = ${b3Finale.masseNetteKg}`);

// ============================================================
// 5. BSFF partiel → reliquat exact (IM-8)
// ============================================================
const bDechet = await store.createBouteille({
  type: 'RECUPERATION',
  fluide: 'R-134a',
  tareKg: 10.0,
  masseBruteKg: 13.0, // nette 3,0 kg
  contenanceMaxKg: 10,
  operateur: OPERATEUR
});
await store.deciderFluideRecupere(bDechet.id, 'DECHET', OPERATEUR);
await store.createBsff({
  bouteilleId: bDechet.id,
  numeroBsff: 'SIF-2026-0001',
  transporteur: 'TransDéchets',
  installationDestination: 'Centre de traitement agréé',
  masseRemiseKg: 1.2,
  dateRemise: '2026-07-03',
  operateur: OPERATEUR
});
const bReliquat = (await store.getBouteilles())
  .find((b) => b.id === bDechet.id);
verifier('BSFF partiel (1,2 / 3,0 kg) → reliquat EXACT de 1,8 kg, ' +
  'statut DECHET conservé',
  PROCHE(bReliquat.masseNetteKg, 1.8) && bReliquat.statut === 'DECHET' &&
  PROCHE(bReliquat.masseBruteKg, 11.8),
  `nette = ${bReliquat.masseNetteKg}, brute = ${bReliquat.masseBruteKg}`);

await verifierRejet(
  'Second BSFF refusé au-delà du reliquat (5 kg demandés, 1,8 kg restants)',
  store.createBsff({
    bouteilleId: bDechet.id,
    numeroBsff: 'SIF-2026-0002',
    masseRemiseKg: 5,
    operateur: OPERATEUR
  }), 'supérieure au contenu');

// ============================================================
// 6. Alerte « mouvement soumis à valider » pour un SOUMIS vieilli
//    (IM-3) — date manipulée directement dans les données de test
//    via le cycle export → import
// ============================================================
const paquet = JSON.parse(await store.exporterJSON());
paquet.donnees.mouvements.push({
  id: 'mvt-sc2-soumis',
  numero: 'FORM-2026-9997',
  date: '2026-04-15', // soumis depuis bien plus de 7 jours
  mode: 'FORMATION',
  type: 'CHARGE_APPOINT',
  machineId: 'M1',
  fluide: 'R-404A',
  quantiteKg: null,
  statut: 'SOUMIS',
  technicien: 'Julien Martin'
});
verifier('Import du jeu de données enrichi accepté (chaîne intacte)',
  await store.importerJSON(JSON.stringify(paquet)) === true);

const alertes = await store.getAlertes();
verifier('Alerte « mouvement soumis à valider » présente pour le SOUMIS ' +
  'vieilli, avec cible cliquable',
  alertes.some((a) => a.id === 'alr-soumis-mvt-sc2-soumis' &&
    a.titre === 'Mouvement soumis à valider' &&
    a.cible?.vue === 'mouvements' && a.cible?.id === 'mvt-sc2-soumis'),
  JSON.stringify(alertes.map((a) => a.id)));

// ============================================================
// 7. Années disponibles : une écriture 2027 forgée proprement
//    (brouillon daté, aucune falsification de chaîne) (IM-10)
// ============================================================
await store.creerMouvement({
  type: 'CHARGE_APPOINT',
  date: '2027-01-15',
  machineId: 'M1',
  technicien: OPERATEUR
});
const annees = await store.getAnneesDisponibles();
verifier('getAnneesDisponibles contient 2027 (écriture forgée) ET 2026',
  annees.includes(2027) && annees.includes(2026),
  `années = ${JSON.stringify(annees)}`);
verifier('Années triées par ordre décroissant (2027 en tête)',
  annees[0] === 2027 &&
  annees.every((a, i) => i === 0 || annees[i - 1] > a));

// ============================================================
// 8. Type MIME exotique rejeté AU STORE (IM-19)
// ============================================================
await verifierRejet(
  'Pièce jointe application/x-msdownload (exécutable) refusée par le store',
  store.ajouterPieceJointe({
    entiteType: 'MACHINE',
    entiteId: 'M1',
    nomFichier: 'piege.exe',
    mimeType: 'application/x-msdownload',
    base64: 'TVqQAAMA'
  }), 'Type de fichier refusé');
await verifierRejet(
  'Pièce jointe image/svg+xml (script possible) refusée par le store',
  store.ajouterPieceJointe({
    entiteType: 'MACHINE',
    entiteId: 'M1',
    nomFichier: 'piege.svg',
    mimeType: 'image/svg+xml',
    base64: 'PHN2Zz4='
  }), 'Type de fichier refusé');

// ============================================================
console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs === 0) {
  console.log('Scénario d’intégration du Lot 2 : tout passe.');
}
if (nbEchecs > 0) process.exit(1);
