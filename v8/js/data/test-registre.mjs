// ============================================================
// Test du registre vivant Phase B (exécution : node test-registre.mjs)
// Cycle de vie des mouvements, effets stocks/charges, chaîne
// d'intégrité SHA-256, journal d'audit. Node ≥ 18, sans DOM.
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

// --- Utilisateur courant et outillage ------------------------
const utilisateur = await store.getUtilisateurCourant();
verifier('getUtilisateurCourant → Frédéric Henninot, rôle REFERENT',
  utilisateur.prenom === 'Frédéric' && utilisateur.nom === 'Henninot' &&
  utilisateur.roleApp === 'REFERENT');

const outillage = await store.getOutillage();
// Phase C : outillage enrichi (5 outils) et statuts RECALCULÉS
// depuis les échéances — seuls les 2 détecteurs sont expirés.
verifier('getOutillage → 5 outils, seuls les 2 détecteurs EXPIRE',
  outillage.length === 5 &&
  outillage.filter((o) => o.statut === 'EXPIRE').length === 2 &&
  outillage.filter((o) => o.statut === 'EXPIRE')
    .every((o) => o.typeOutil === 'DETECTEUR') &&
  outillage.some((o) => o.typeOutil === 'BALANCE' &&
    o.statut === 'CONFORME'));

const alertesInitiales = await store.getAlertes();
verifier('alertes calculées : fuite M5 + contrôle M6 + 2 détecteurs',
  alertesInitiales.some((a) => a.titre === 'Fuite non résolue') &&
  alertesInitiales.some((a) => a.titre.includes('en retard')) &&
  alertesInitiales.filter((a) => a.titre === 'Détecteur à réétalonner').length === 2,
  JSON.stringify(alertesInitiales.map((a) => a.titre)));

// --- Création machine / bouteille ----------------------------
const machine = await store.createMachine({
  designation: 'Banc froid pédagogique',
  type: 'Banc didactique',
  fluide: 'R-134a',
  chargeNominaleKg: 5.0,
  clientId: 'cli-lycee',
  operateur: 'Frédéric Henninot'
});
verifier('createMachine → code M7, EN_SERVICE, charge 0',
  machine.code === 'M7' && machine.statut === 'EN_SERVICE' &&
  machine.chargeActuelleKg === 0);

const bouteille = await store.createBouteille({
  type: 'RECUPERATION',
  fluide: 'R-134a',
  tareKg: 12.0,
  masseBruteKg: 12.0,
  contenanceMaxKg: 10,
  operateur: 'Frédéric Henninot'
});
verifier('createBouteille → code B-06, masse nette 0 (brute = tare)',
  bouteille.code === 'B-06' && PROCHE(bouteille.masseNetteKg, 0));

// --- Pesée ---------------------------------------------------
const pesee = await store.peserBouteille(bouteille.id, 14.5, 'Frédéric Henninot');
verifier('peserBouteille → nette = brute − tare (14,5 − 12 = 2,5)',
  PROCHE(pesee.masseNetteKg, 2.5) && PROCHE(pesee.masseBruteKg, 14.5));

await verifierRejet('peserBouteille rejette brute < tare',
  store.peserBouteille(bouteille.id, 10.0, 'Frédéric Henninot'),
  'inférieure à la tare');

await verifierRejet('peserBouteille rejette nette > contenance',
  store.peserBouteille(bouteille.id, 23.0, 'Frédéric Henninot'),
  'contenance');

// --- Cycle brouillon → soumis → validé -----------------------
// Charge d'appoint : bouteille B2 (R-134a, nette 9,1) vers la machine M7.
const brouillon = await store.creerMouvement({
  type: 'CHARGE_APPOINT',
  machineId: machine.id,
  bouteilleSrcId: 'B2',
  peseeAvantKg: 20.6,
  peseeApresKg: 18.6,
  technicien: 'Julien Martin'
});
verifier('creerMouvement → statut BROUILLON, numéro FORM-2026-0001',
  brouillon.statut === 'BROUILLON' && brouillon.numero === 'FORM-2026-0001');

const soumis = await store.soumettreMouvement(brouillon.id);
verifier('soumettreMouvement → statut SOUMIS', soumis.statut === 'SOUMIS');

// Un ÉLÈVE ne valide JAMAIS (per-jm = Julien Martin, élève)
await verifierRejet('validerMouvement rejette un validateur ÉLÈVE',
  store.validerMouvement(brouillon.id, 'per-jm'), 'élève');

const valide = await store.validerMouvement(brouillon.id, 'per-fh');
verifier('validerMouvement → VALIDE, quantité = 20,6 − 18,6 = 2,00 kg',
  valide.statut === 'VALIDE' && PROCHE(valide.quantiteKg, 2.0));
verifier('écriture validée : hash présent + validateur enregistré',
  typeof valide.hashEcriture === 'string' && valide.hashEcriture.length === 64 &&
  valide.validateurId === 'per-fh');

let machines = await store.getMachines();
let bouteilles = await store.getBouteilles();
const m7 = machines.find((m) => m.id === machine.id);
const b2 = bouteilles.find((b) => b.id === 'B2');
verifier('effets exacts : M7 passe à 2,00 kg, B2 tombe à 7,10 kg',
  PROCHE(m7.chargeActuelleKg, 2.0) && PROCHE(b2.masseNetteKg, 7.1),
  `M7 = ${m7.chargeActuelleKg}, B2 = ${b2.masseNetteKg}`);

// --- Numérotation séparée FORMATION --------------------------
const brouillon2 = await store.creerMouvement({
  type: 'RECUPERATION_MAINTENANCE',
  machineId: 'M1',
  bouteilleDstId: 'B3',
  peseeAvantKg: 16.8,
  peseeApresKg: 17.3,
  technicien: 'Sophie Bianchi'
});
verifier('numérotation FORM-2026-NNNN : 2e mouvement = FORM-2026-0002',
  brouillon2.numero === 'FORM-2026-0002');

// --- Récupération : effets et quantité NÉGATIVE ---------------
await store.soumettreMouvement(brouillon2.id);
const recup = await store.validerMouvement(brouillon2.id, 'per-sb');
verifier('récupération : quantité stockée NÉGATIVE (−0,50 kg)',
  PROCHE(recup.quantiteKg, -0.5), `valeur = ${recup.quantiteKg}`);

machines = await store.getMachines();
bouteilles = await store.getBouteilles();
const m1 = machines.find((m) => m.id === 'M1');
const b3 = bouteilles.find((b) => b.id === 'B3');
verifier('effets exacts : M1 3,80 → 3,30 kg, B3 3,60 → 4,10 kg',
  PROCHE(m1.chargeActuelleKg, 3.3) && PROCHE(b3.masseNetteKg, 4.1),
  `M1 = ${m1.chargeActuelleKg}, B3 = ${b3.masseNetteKg}`);

// --- Rejets métier -------------------------------------------
// Croisement de fluides : bouteille R-32 (B1) sur machine R-134a (M7)
const croise = await store.creerMouvement({
  type: 'CHARGE_APPOINT',
  machineId: machine.id,
  bouteilleSrcId: 'B1',
  peseeAvantKg: 19.4,
  peseeApresKg: 19.0,
  technicien: 'Sophie Bianchi'
});
await store.soumettreMouvement(croise.id);
await verifierRejet('rejet croisement de fluides (R-32 sur machine R-134a)',
  store.validerMouvement(croise.id, 'per-fh'), 'Croisement de fluides');

// Récupération vers une bouteille NEUVE
const versNeuve = await store.creerMouvement({
  type: 'RECUPERATION_MAINTENANCE',
  machineId: 'M1',
  bouteilleDstId: 'B1',
  peseeAvantKg: 19.4,
  peseeApresKg: 19.6,
  technicien: 'Sophie Bianchi'
});
await store.soumettreMouvement(versNeuve.id);
await verifierRejet('rejet récupération vers une bouteille NEUVE',
  store.validerMouvement(versNeuve.id, 'per-fh'), 'RÉCUPÉRATION');

// Écriture VALIDE figée : toute modification est refusée
await verifierRejet('rejet modification d’une écriture VALIDE',
  store.soumettreMouvement(valide.id), 'contre-écriture');
await verifierRejet('rejet re-validation d’une écriture VALIDE',
  store.validerMouvement(valide.id, 'per-fh'), 'contre-écriture');

// --- Contre-écriture -----------------------------------------
const contre = await store.annulerParContreEcriture(
  valide.id, 'Erreur de pesée constatée en TP', 'per-fh');
verifier('contre-écriture : VALIDE, quantité opposée, lien vers l’original',
  contre.statut === 'VALIDE' && PROCHE(contre.quantiteKg, -2.0) &&
  contre.contreEcritureDe === valide.id && contre.type === valide.type &&
  contre.motif === 'Erreur de pesée constatée en TP');

machines = await store.getMachines();
bouteilles = await store.getBouteilles();
const m7Apres = machines.find((m) => m.id === machine.id);
const b2Apres = bouteilles.find((b) => b.id === 'B2');
verifier('effets inverses exacts : M7 revient à 0, B2 revient à 9,10 kg',
  PROCHE(m7Apres.chargeActuelleKg, 0) && PROCHE(b2Apres.masseNetteKg, 9.1),
  `M7 = ${m7Apres.chargeActuelleKg}, B2 = ${b2Apres.masseNetteKg}`);

const mouvements = await store.getMouvements();
const original = mouvements.find((mv) => mv.id === valide.id);
verifier('original ANNULE mais données INTACTES (quantité, pesées, hash)',
  original.statut === 'ANNULE' &&
  PROCHE(original.quantiteKg, 2.0) &&
  PROCHE(original.peseeAvantKg, 20.6) &&
  original.hashEcriture === valide.hashEcriture);

await verifierRejet('rejet d’une seconde annulation du même original',
  store.annulerParContreEcriture(valide.id, 'Doublon', 'per-fh'),
  'déjà annulée');

// --- Contrôle d'étanchéité : effets sur la machine ------------
await store.createControle({
  machineId: 'M3',
  resultat: 'FUITE',
  typeControle: 'NON_PERIODIQUE',
  methode: 'DIRECTE',
  operateur: 'Frédéric Henninot',
  prochainControle: '2026-08-05'
});
machines = await store.getMachines();
verifier('createControle FUITE → machine M3 passe en statut FUITE',
  machines.find((m) => m.id === 'M3').statut === 'FUITE');

const statsFuite = await store.getStats();
const alertesFuite = await store.getAlertes();
verifier('getStats / getAlertes reflètent la nouvelle fuite (2 fuites)',
  statsFuite.nbFuites === 2 &&
  alertesFuite.filter((a) => a.titre === 'Fuite non résolue').length === 2);

await store.createControle({
  machineId: 'M3',
  resultat: 'CONFORME',
  typeControle: 'NON_PERIODIQUE',
  methode: 'DIRECTE',
  operateur: 'Frédéric Henninot',
  prochainControle: '2027-07-03'
});
machines = await store.getMachines();
verifier('contrôle CONFORME (échéance future) → M3 revient EN_SERVICE',
  machines.find((m) => m.id === 'M3').statut === 'EN_SERVICE');

// --- Machine démantelée : modification interdite --------------
await store.updateMachine(machine.id, { statut: 'DEMANTELEE' });
await verifierRejet('updateMachine rejette une machine DEMANTELEE',
  store.updateMachine(machine.id, { localisation: 'Ailleurs' }),
  'démantelée');

// --- Journal d'audit (append-only, croissant) -----------------
const journalAvant = await store.getJournalAudit();
verifier('journal d’audit non vide après les mutations',
  journalAvant.length > 0, `taille = ${journalAvant.length}`);
await store.peserBouteille('B1', 19.4, 'Frédéric Henninot');
const journalApres = await store.getJournalAudit();
verifier('journal d’audit croissant (chaque mutation ajoute une entrée)',
  journalApres.length === journalAvant.length + 1,
  `avant = ${journalAvant.length}, après = ${journalApres.length}`);
const datesOrdonnees = journalApres.every((entree, i) =>
  i === 0 || journalApres[i - 1].date <= entree.date);
verifier('journal d’audit ordonné chronologiquement', datesOrdonnees);
verifier('store sans méthode de purge du journal',
  Object.keys(store).every((cle) => !/purge|vider|effacer/i.test(cle)));

// --- Chaîne d'intégrité --------------------------------------
const chaineSaine = await store.verifierChaineHash();
verifier('verifierChaineHash → ok après toutes les écritures',
  chaineSaine.ok === true && chaineSaine.casseA === null,
  JSON.stringify(chaineSaine));

// Falsification « à la main » : on altère une quantité dans l'export
// puis on réimporte — CR-5 : l'import est REFUSÉ en désignant
// l'écriture trafiquée, et les données en place restent intactes.
const exportJson = await store.exporterJSON();
const paquet = JSON.parse(exportJson);
const cible = paquet.donnees.mouvements.find(
  (mv) => mv.numero === 'FI-2026-0004');
cible.quantiteKg = 9.99;
await verifierRejet(
  'réimport de données falsifiées REFUSÉ en désignant FI-2026-0004 (CR-5)',
  store.importerJSON(JSON.stringify(paquet)), 'FI-2026-0004');
const chaineApresRejet = await store.verifierChaineHash();
verifier('après le rejet, les données en place restent saines',
  chaineApresRejet.ok === true && chaineApresRejet.casseA === null,
  JSON.stringify(chaineApresRejet));

// --- Verdict -------------------------------------------------
console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('Tous les tests du registre passent.');
