// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// Test du Lot 1 de l'audit du 03/07/2026 (exécution : node test-lot1.mjs)
// Côté moteur (store + générateur CERFA) :
//   CR-4  masse d'entrée figée → balance matière juste
//   CR-3  fuite déclarée au wizard → contrôle lié + machine FUITE
//   CR-1  supprimerMouvement (brouillon) / rejeterMouvement (soumis)
//   CR-5  invariants + chaîne de hash à l'import ET au chargement
//   IM-12 pas de CERFA pour un TRANSFERT (SPEC §7.1)
// Node ≥ 18, sans DOM.
// ============================================================

import { creerStore } from './datastore.js';
import { genererCerfaPdf } from '../cerfa/generateur.js';

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
// CR-4 — bouteille créée dans l'application : masse d'entrée
// figée, poste « achats » juste, balance SANS écart fantôme
// ============================================================
const balanceAvant = await store.getBalanceMatiere(2026);
const achatsAvant = balanceAvant.lignes
  .find((l) => l.fluide === 'R-134a').achatsKg;

const bouteille = await store.createBouteille({
  type: 'NEUVE',
  fluide: 'R-134a',
  tareKg: 11.0,
  masseBruteKg: 21.0, // nette = 10,0 kg à l'entrée
  contenanceMaxKg: 12,
  dateEntree: '2026-07-03',
  operateur: 'Frédéric Henninot'
});
verifier('CR-4 : createBouteille fige masseEntreeKg = masse nette initiale (10,0)',
  PROCHE(bouteille.masseEntreeKg, 10.0),
  `valeur = ${bouteille.masseEntreeKg}`);

const machine = await store.createMachine({
  designation: 'Machine d’essai Lot 1',
  fluide: 'R-134a',
  chargeNominaleKg: 5.0,
  clientId: 'cli-lycee',
  operateur: 'Frédéric Henninot'
});

const nbControlesInitial = (await store.getControles()).length;

// Charge de 2 kg depuis la bouteille neuve (contrôle SANS_OBJET)
const charge = await store.creerMouvement({
  type: 'CHARGE_APPOINT',
  date: '2026-07-03',
  machineId: machine.id,
  bouteilleSrcId: bouteille.id,
  peseeAvantKg: 21.0,
  peseeApresKg: 19.0,
  technicien: 'Frédéric Henninot'
});
await store.soumettreMouvement(charge.id);
await store.validerMouvement(charge.id, 'per-fh');

verifier('CR-3 : contrôle SANS_OBJET → AUCUN contrôle créé à la validation',
  (await store.getControles()).length === nbControlesInitial);

const balanceApres = await store.getBalanceMatiere(2026);
const ligne134 = balanceApres.lignes.find((l) => l.fluide === 'R-134a');
verifier('CR-4 : poste « achats » = + masse d’ENTRÉE (10,0), pas la nette courante',
  PROCHE(ligne134.achatsKg, achatsAvant + 10.0),
  `achats = ${ligne134.achatsKg}, attendu = ${achatsAvant + 10.0}`);

const stockPhysique = (await store.getBouteilles())
  .filter((b) => b.fluide === 'R-134a' && b.statut === 'EN_STOCK')
  .reduce((somme, b) => somme + b.masseNetteKg, 0);
verifier('CR-4 : stock théorique R-134a = état physique des bouteilles',
  PROCHE(ligne134.stockTheoriqueKg, stockPhysique),
  `théorique = ${ligne134.stockTheoriqueKg}, physique = ${stockPhysique}`);

const balanceInventaire = await store.saisirInventaire(2026,
  [{ fluide: 'R-134a', stockReelKg: stockPhysique }], 'Frédéric Henninot');
verifier('CR-4 : bouteille créée + charge 2 kg → inventaire SANS écart',
  PROCHE(balanceInventaire.lignes
    .find((l) => l.fluide === 'R-134a').ecartKg, 0),
  JSON.stringify(balanceInventaire.lignes.find((l) => l.fluide === 'R-134a')));

// ============================================================
// CR-3 — fuite déclarée à l'étape 5 du wizard : contrôle lié,
// machine en FUITE, alerte, journal, référence croisée
// ============================================================
const mvtFuite = await store.creerMouvement({
  type: 'CHARGE_APPOINT',
  date: '2026-07-03',
  machineId: machine.id,
  bouteilleSrcId: bouteille.id,
  peseeAvantKg: 19.0,
  peseeApresKg: 18.5,
  controle: { statutControle: 'FUITE', detecteurId: 'out-1' },
  technicien: 'Sophie Bianchi'
});
await store.soumettreMouvement(mvtFuite.id);
const mvtFuiteValide = await store.validerMouvement(mvtFuite.id, 'per-fh');

const controles = await store.getControles();
const controleLie = controles.find((c) => c.mouvementId === mvtFuite.id);
verifier('CR-3 : fuite wizard → contrôle lié créé (FUITE, NON_PERIODIQUE)',
  Boolean(controleLie) && controleLie.resultat === 'FUITE' &&
  controleLie.typeControle === 'NON_PERIODIQUE' &&
  controleLie.date === '2026-07-03');
verifier('CR-3 : détecteur du wizard et opérateur = technicien du mouvement',
  controleLie.detecteurId === 'out-1' &&
  controleLie.operateur === 'Sophie Bianchi');
verifier('CR-3 : référence croisée mouvement ↔ contrôle',
  mvtFuiteValide.controle.controleId === controleLie.id &&
  controleLie.mouvementId === mvtFuite.id);

const machineFuite = (await store.getMachines())
  .find((m) => m.id === machine.id);
verifier('CR-3 : la machine passe en statut FUITE',
  machineFuite.statut === 'FUITE' &&
  machineFuite.dernierControle === '2026-07-03');
verifier('CR-3 : alerte CRITIQUE « Fuite non résolue » levée',
  (await store.getAlertes()).some((a) => a.titre === 'Fuite non résolue' &&
    a.detail.includes('Machine d’essai Lot 1')));
verifier('CR-3 : création du contrôle journalisée',
  (await store.getJournalAudit()).some((e) =>
    e.action === 'CREATION_CONTROLE' && e.cible === machineFuite.code &&
    e.details.includes('FUITE')));

// R3c : tant que la fuite reste ouverte (pas de réparation tracée), le
// CHARGE_APPOINT est bloqué — même s'il déclare au passage un contrôle
// CONFORME (la garde s'applique AVANT tout effet, cf. appliquerEffets).
await verifierRejet(
  'R3c : CHARGE_APPOINT refusé tant que la fuite n’est pas réparée (tracée)',
  (async () => {
    const mvtBloque = await store.creerMouvement({
      type: 'CHARGE_APPOINT',
      date: '2026-07-03',
      machineId: machine.id,
      bouteilleSrcId: bouteille.id,
      peseeAvantKg: 18.5,
      peseeApresKg: 18.2,
      controle: { statutControle: 'CONFORME', detecteurId: 'out-1' },
      technicien: 'Frédéric Henninot'
    });
    await store.soumettreMouvement(mvtBloque.id);
    await store.validerMouvement(mvtBloque.id, 'per-fh');
  })(),
  'Tracez la réparation');

// R3a : réparation tracée sur le contrôle FUITE → le CHARGE_APPOINT
// redevient possible.
// P0-6 : réparation le jour de la fuite (03/07), CONFORME de suivi le
// LENDEMAIN (04/07) — la clôture stricte J+1 interdit le jour même.
await store.tracerReparation(controleLie.id, {
  dateReparation: '2026-07-03', natureReparation: 'Resserrage du raccord',
  reparateur: 'Frédéric Henninot'
});

// Contrôle CONFORME déclaré au wizard → la machine revient EN_SERVICE
const mvtConforme = await store.creerMouvement({
  type: 'CHARGE_APPOINT',
  date: '2026-07-04',
  machineId: machine.id,
  bouteilleSrcId: bouteille.id,
  peseeAvantKg: 18.5,
  peseeApresKg: 18.2,
  controle: { statutControle: 'CONFORME', detecteurId: 'out-1' },
  technicien: 'Frédéric Henninot'
});
await store.soumettreMouvement(mvtConforme.id);
await store.validerMouvement(mvtConforme.id, 'per-fh');
verifier('CR-3 : contrôle CONFORME du wizard → machine de retour EN_SERVICE',
  (await store.getMachines()).find((m) => m.id === machine.id)
    .statut === 'EN_SERVICE');

const chaineApresControles = await store.verifierChaineHash();
verifier('CR-3 : chaîne d’intégrité intacte après les contrôles liés',
  chaineApresControles.ok === true, JSON.stringify(chaineApresControles));

// ============================================================
// CR-1 — sortir de l'impasse BROUILLON / SOUMIS
// ============================================================
const brouillon = await store.creerMouvement({
  type: 'CHARGE_APPOINT',
  machineId: machine.id,
  bouteilleSrcId: bouteille.id,
  peseeAvantKg: 18.2,
  peseeApresKg: 18.0,
  technicien: 'Julien Martin'
});
await store.supprimerMouvement(brouillon.id);
verifier('CR-1 : supprimerMouvement efface un BROUILLON',
  !(await store.getMouvements()).some((mv) => mv.id === brouillon.id));
verifier('CR-1 : suppression journalisée',
  (await store.getJournalAudit()).some((e) =>
    e.action === 'SUPPRESSION_MOUVEMENT' && e.cible === brouillon.numero));

const soumis = await store.creerMouvement({
  type: 'CHARGE_APPOINT',
  machineId: machine.id,
  bouteilleSrcId: bouteille.id,
  peseeAvantKg: 18.2,
  peseeApresKg: 18.0,
  technicien: 'Julien Martin'
});
await store.soumettreMouvement(soumis.id);
await verifierRejet('CR-1 : supprimer un SOUMIS → erreur (rejet d’abord)',
  store.supprimerMouvement(soumis.id), 'brouillon');
await verifierRejet('CR-1 : rejeterMouvement exige un motif',
  store.rejeterMouvement(soumis.id, '  '), 'Motif');

const rejete = await store.rejeterMouvement(soumis.id,
  'Pesée illisible sur la fiche de TP');
verifier('CR-1 : rejeterMouvement → retour BROUILLON avec motifRejet',
  rejete.statut === 'BROUILLON' &&
  rejete.motifRejet === 'Pesée illisible sur la fiche de TP');
verifier('CR-1 : rejet journalisé',
  (await store.getJournalAudit()).some((e) =>
    e.action === 'REJET_MOUVEMENT' && e.cible === rejete.numero));
await verifierRejet('CR-1 : rejeter un BROUILLON → erreur',
  store.rejeterMouvement(soumis.id, 'Encore'), 'soumis');
await store.supprimerMouvement(soumis.id); // reprise du brouillon → suppression
await verifierRejet('CR-1 : suppression d’un VALIDE → erreur (contre-écriture)',
  store.supprimerMouvement(charge.id), 'contre-écriture');

// ============================================================
// IM-12 — un TRANSFERT ne donne jamais lieu à un CERFA (SPEC §7.1)
// ============================================================
const transfert = await store.creerMouvement({
  type: 'TRANSFERT',
  date: '2026-07-03',
  bouteilleSrcId: 'B2',
  bouteilleDstId: bouteille.id,
  peseeAvantKg: 20.1,
  peseeApresKg: 19.6,
  technicien: 'Frédéric Henninot'
});
await store.soumettreMouvement(transfert.id);
await store.validerMouvement(transfert.id, 'per-fh');
verifier('IM-12 : TRANSFERT validé sans contrôle lié (pas de machine)',
  !(await store.getControles()).some((c) => c.mouvementId === transfert.id));
await verifierRejet('IM-12 : CERFA refusé pour un TRANSFERT, message explicite',
  genererCerfaPdf(store, { source: 'mouvement', id: transfert.id }),
  'transfert entre contenants ne donne pas lieu');

// ============================================================
// CR-5 — registre non forgeable : import vérifié, chargement vérifié
// ============================================================
const exportPropre = await store.exporterJSON();
verifier('CR-5 : import de son propre export (sain) → accepté',
  (await store.importerJSON(exportPropre)) === true);
verifier('CR-5 : registre déclaré SAIN après un import vérifié',
  (await store.getEtatRegistre()).altere === false);

// a) quantité falsifiée sur une écriture VALIDE → rejet nominatif
const paquetForge = JSON.parse(exportPropre);
const cibleForge = paquetForge.donnees.mouvements.find((mv) =>
  mv.statut === 'VALIDE' && Number.isFinite(mv.quantiteKg));
const quantiteOriginale = cibleForge.quantiteKg;
cibleForge.quantiteKg = 999;
await verifierRejet('CR-5 : import d’un JSON forgé (quantité 999) → rejeté ' +
  'en désignant l’écriture',
  store.importerJSON(JSON.stringify(paquetForge)), cibleForge.numero);
verifier('CR-5 : après le rejet, la quantité en place est intacte',
  PROCHE((await store.getMouvements())
    .find((mv) => mv.id === cibleForge.id).quantiteKg, quantiteOriginale));

// b) masse nette négative → rejet « donnée incohérente »
const paquetMasse = JSON.parse(exportPropre);
paquetMasse.donnees.bouteilles[0].masseNetteKg = -5;
await verifierRejet('CR-5 : import avec masse nette −5 kg → rejeté (invariants)',
  store.importerJSON(JSON.stringify(paquetMasse)), 'incohérente');

// c) écriture VALIDE dont l'empreinte a été effacée → rejet
const paquetSansHash = JSON.parse(exportPropre);
delete paquetSansHash.donnees.mouvements
  .find((mv) => mv.statut === 'VALIDE').hashEcriture;
await verifierRejet('CR-5 : écriture VALIDE sans empreinte → rejetée',
  store.importerJSON(JSON.stringify(paquetSansHash)), 'empreinte');

// d) chargement depuis un localStorage réécrit à la main :
// drapeau « registre altéré » posé SANS bloquer l'application
const donneesAlterees = JSON.parse(exportPropre).donnees;
const cibleLocale = donneesAlterees.mouvements.find((mv) =>
  mv.statut === 'VALIDE' && Number.isFinite(mv.quantiteKg));
cibleLocale.quantiteKg = 123.456;
delete donneesAlterees.bouteilles[0].masseEntreeKg; // reprise CR-4 au passage
const memoire = new Map(
  [['inerweb-fluide-v8-demo', JSON.stringify(donneesAlterees)]]);
globalThis.localStorage = {
  getItem: (cle) => (memoire.has(cle) ? memoire.get(cle) : null),
  setItem: (cle, valeur) => { memoire.set(cle, String(valeur)); },
  removeItem: (cle) => { memoire.delete(cle); }
};
try {
  const storeAltere = await creerStore();
  const etat = await storeAltere.getEtatRegistre();
  verifier('CR-5 : chargement altéré → drapeau posé, écriture cassée désignée',
    etat.altere === true && etat.casseA === cibleLocale.numero,
    JSON.stringify(etat));
  verifier('CR-5 : application NON bloquée (getStats répond)',
    typeof (await storeAltere.getStats()).nbMachines === 'number');
  verifier('CR-4 : reprise d’une sauvegarde sans masseEntreeKg au chargement',
    (await storeAltere.getBouteilles()).every((b) =>
      Number.isFinite(b.masseEntreeKg)));
} finally {
  delete globalThis.localStorage;
}

// ============================================================
// Verdict
// ============================================================
console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('Tous les tests du Lot 1 passent.');
