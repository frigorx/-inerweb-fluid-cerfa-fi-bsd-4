// ============================================================
// Scénario d'intégration du Lot 1 (exécution : node test-scenario-lot1.mjs)
// Le parcours de l'audit du 03/07/2026 rejoué de bout en bout,
// côté store — exactement ce que les vues Mouvements, Tableau de
// bord et l'assistant déclenchent après les correctifs :
//   1. brouillon créé puis supprimé (disparu des compteurs) ;
//   2. soumis → rejeté (retour brouillon, motif journalisé) ;
//   3. soumis → validé (effets stocks/charges) ;
//   4. validé → contre-écriture (effets inverses, original ANNULE) ;
//   5. fuite déclarée au wizard → machine FUITE + contrôle lié + alerte ;
//   6. bouteille créée + mouvement → balance SANS écart fantôme ;
//   7. TRANSFERT → aucun CERFA (numéro, compteur, générateur) ;
//   8. import forgé rejeté, données en place intactes ;
//   9. état du registre SAIN au rechargement (localStorage rejoué).
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
const VALIDATEUR = 'per-fh'; // Frédéric Henninot, référent du monde de démo

// ---- Décor : une machine et une bouteille créées DANS l'application ----
const bouteille = await store.createBouteille({
  type: 'NEUVE',
  fluide: 'R-134a',
  tareKg: 11.0,
  masseBruteKg: 21.0, // nette = 10,0 kg à l'entrée (masse d'entrée figée, CR-4)
  contenanceMaxKg: 12,
  dateEntree: '2026-07-03',
  operateur: 'Frédéric Henninot'
});
const machine = await store.createMachine({
  designation: 'Machine du scénario Lot 1',
  fluide: 'R-134a',
  chargeNominaleKg: 5.0,
  clientId: 'cli-lycee',
  operateur: 'Frédéric Henninot'
});

// ============================================================
// 1. Brouillon créé puis supprimé : disparu des compteurs
// ============================================================
const statsAvant = await store.getStats();

const brouillon = await store.creerMouvement({
  type: 'CHARGE_APPOINT',
  date: '2026-07-03',
  machineId: machine.id,
  bouteilleSrcId: bouteille.id,
  peseeAvantKg: 21.0,
  peseeApresKg: 20.0,
  technicien: 'Julien Martin'
});
verifier('1. le brouillon naît BROUILLON, sans numéro de CERFA',
  brouillon.statut === 'BROUILLON' && brouillon.cerfaNumero === null);
verifier('1. un brouillon ne compte JAMAIS comme fiche d’intervention',
  (await store.getStats()).nbCerfa === statsAvant.nbCerfa);

await store.supprimerMouvement(brouillon.id);
const statsApresSuppression = await store.getStats();
verifier('1. brouillon supprimé : disparu de la liste des mouvements',
  !(await store.getMouvements()).some((mv) => mv.id === brouillon.id));
verifier('1. brouillon supprimé : compteurs revenus à l’identique',
  statsApresSuppression.nbMouvements === statsAvant.nbMouvements &&
  statsApresSuppression.nbCerfa === statsAvant.nbCerfa,
  JSON.stringify({ avant: statsAvant.nbMouvements,
    apres: statsApresSuppression.nbMouvements }));

// ============================================================
// 2. Soumis → rejeté : retour en brouillon, motif journalisé
// ============================================================
const mouvement = await store.creerMouvement({
  type: 'CHARGE_APPOINT',
  date: '2026-07-03',
  machineId: machine.id,
  bouteilleSrcId: bouteille.id,
  peseeAvantKg: 21.0,
  peseeApresKg: 20.0, // charge de 1,00 kg
  technicien: 'Julien Martin'
});
await store.soumettreMouvement(mouvement.id);

const rejete = await store.rejeterMouvement(mouvement.id,
  'Pesée après intervention illisible.');
verifier('2. rejet : retour en BROUILLON avec le motif porté',
  rejete.statut === 'BROUILLON' &&
  rejete.motifRejet === 'Pesée après intervention illisible.');
verifier('2. rejet : motif inscrit au journal d’audit',
  (await store.getJournalAudit()).some((e) =>
    e.action === 'REJET_MOUVEMENT' && e.cible === rejete.numero &&
    e.details.includes('Pesée après intervention illisible.')));

// ============================================================
// 3. Soumis → validé : effets réels sur stocks et charges
// ============================================================
await store.soumettreMouvement(mouvement.id);
const valide = await store.validerMouvement(mouvement.id, VALIDATEUR);
verifier('3. validation : écriture VALIDE, quantité 1,00 kg, CERFA attribué',
  valide.statut === 'VALIDE' && PROCHE(valide.quantiteKg, 1.0) &&
  valide.cerfaNumero === valide.numero);

const machineChargee = (await store.getMachines())
  .find((m) => m.id === machine.id);
const bouteilleDebitee = (await store.getBouteilles())
  .find((b) => b.id === bouteille.id);
verifier('3. effets : machine 0 → 1,00 kg, bouteille 10,0 → 9,00 kg',
  PROCHE(machineChargee.chargeActuelleKg, 1.0) &&
  PROCHE(bouteilleDebitee.masseNetteKg, 9.0),
  `machine = ${machineChargee.chargeActuelleKg}, `
  + `bouteille = ${bouteilleDebitee.masseNetteKg}`);

// ============================================================
// 4. Validé → contre-écriture : effets inverses, original ANNULE
// ============================================================
const contre = await store.annulerParContreEcriture(mouvement.id,
  'Machine erronée : la charge concernait la M2.', VALIDATEUR);
verifier('4. la contre-écriture référence l’originale (quantité opposée)',
  contre.contreEcritureDe === mouvement.id &&
  PROCHE(contre.quantiteKg, -1.0) && contre.statut === 'VALIDE');
verifier('4. l’écriture originale passe ANNULE (jamais effacée)',
  (await store.getMouvements()).find((mv) => mv.id === mouvement.id)
    .statut === 'ANNULE');

const machineRetablie = (await store.getMachines())
  .find((m) => m.id === machine.id);
const bouteilleRetablie = (await store.getBouteilles())
  .find((b) => b.id === bouteille.id);
verifier('4. effets inverses : machine et bouteille à l’état antérieur',
  PROCHE(machineRetablie.chargeActuelleKg, 0) &&
  PROCHE(bouteilleRetablie.masseNetteKg, 10.0),
  `machine = ${machineRetablie.chargeActuelleKg}, `
  + `bouteille = ${bouteilleRetablie.masseNetteKg}`);

// ============================================================
// 5. Fuite déclarée au wizard → machine FUITE + contrôle + alerte
// ============================================================
const mvtFuite = await store.creerMouvement({
  type: 'CHARGE_APPOINT',
  date: '2026-07-03',
  machineId: machine.id,
  bouteilleSrcId: bouteille.id,
  peseeAvantKg: 21.0,
  peseeApresKg: 20.5,
  controle: { statutControle: 'FUITE', detecteurId: 'out-1' },
  technicien: 'Sophie Bianchi'
});
await store.soumettreMouvement(mvtFuite.id);
await store.validerMouvement(mvtFuite.id, VALIDATEUR);

verifier('5. la machine passe en statut FUITE',
  (await store.getMachines()).find((m) => m.id === machine.id)
    .statut === 'FUITE');
const controleLie = (await store.getControles())
  .find((c) => c.mouvementId === mvtFuite.id);
verifier('5. un contrôle d’étanchéité lié est créé (FUITE, non périodique)',
  Boolean(controleLie) && controleLie.resultat === 'FUITE' &&
  controleLie.typeControle === 'NON_PERIODIQUE');
verifier('5. l’alerte « Fuite non résolue » est présente',
  (await store.getAlertes()).some((a) => a.titre === 'Fuite non résolue' &&
    a.detail.includes('Machine du scénario Lot 1')));

// ============================================================
// 6. Bouteille créée + mouvements → balance SANS écart fantôme
// ============================================================
const balance = await store.getBalanceMatiere(2026);
const ligne134 = balance.lignes.find((l) => l.fluide === 'R-134a');
const stockPhysique = (await store.getBouteilles())
  .filter((b) => b.fluide === 'R-134a' && b.statut === 'EN_STOCK')
  .reduce((somme, b) => somme + b.masseNetteKg, 0);
verifier('6. stock théorique R-134a = état physique des bouteilles',
  PROCHE(ligne134.stockTheoriqueKg, stockPhysique),
  `théorique = ${ligne134.stockTheoriqueKg}, physique = ${stockPhysique}`);

const inventaire = await store.saisirInventaire(2026,
  [{ fluide: 'R-134a', stockReelKg: stockPhysique }], 'Frédéric Henninot');
verifier('6. inventaire au réel : écart NUL, aucune justification exigée',
  PROCHE(inventaire.lignes.find((l) => l.fluide === 'R-134a').ecartKg, 0),
  JSON.stringify(inventaire.lignes.find((l) => l.fluide === 'R-134a')));

// ============================================================
// 7. TRANSFERT : jamais de CERFA (numéro, compteur, générateur)
// ============================================================
const nbCerfaAvantTransfert = (await store.getStats()).nbCerfa;
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
const transfertValide = await store.validerMouvement(transfert.id, VALIDATEUR);

verifier('7. TRANSFERT validé SANS numéro de CERFA (SPEC §7.1)',
  transfertValide.statut === 'VALIDE' && transfertValide.cerfaNumero === null);
verifier('7. le compteur de fiches d’intervention ignore le transfert',
  (await store.getStats()).nbCerfa === nbCerfaAvantTransfert);
await verifierRejet('7. genererCerfaPdf refuse un TRANSFERT, message explicite',
  genererCerfaPdf(store, { source: 'mouvement', id: transfert.id }),
  'transfert entre contenants ne donne pas lieu');

// ============================================================
// 8. Import forgé : rejeté, données en place intactes
// ============================================================
const exportPropre = await store.exporterJSON();
const paquetForge = JSON.parse(exportPropre);
const cibleForge = paquetForge.donnees.mouvements.find((mv) =>
  mv.statut === 'VALIDE' && Number.isFinite(mv.quantiteKg));
const quantiteOriginale = cibleForge.quantiteKg;
cibleForge.quantiteKg = 999;
await verifierRejet('8. import d’un JSON forgé → rejeté en désignant l’écriture',
  store.importerJSON(JSON.stringify(paquetForge)), cibleForge.numero);
verifier('8. après le rejet, la donnée en place est intacte',
  PROCHE((await store.getMouvements())
    .find((mv) => mv.id === cibleForge.id).quantiteKg, quantiteOriginale));

// ============================================================
// 9. Rechargement : l'état du registre reste SAIN
// ============================================================
const memoire = new Map(
  [['inerweb-fluide-v8-demo',
    JSON.stringify(JSON.parse(exportPropre).donnees)]]);
globalThis.localStorage = {
  getItem: (cle) => (memoire.has(cle) ? memoire.get(cle) : null),
  setItem: (cle, valeur) => { memoire.set(cle, String(valeur)); },
  removeItem: (cle) => { memoire.delete(cle); }
};
try {
  const storeRecharge = await creerStore();
  const etat = await storeRecharge.getEtatRegistre();
  verifier('9. rechargement du parcours complet : registre déclaré SAIN',
    etat.altere === false && etat.casseA === null, JSON.stringify(etat));
  verifier('9. la chaîne d’empreintes revérifiée est intacte',
    (await storeRecharge.verifierChaineHash()).ok === true);
  verifier('9. le parcours a survécu au rechargement (écritures retrouvées)',
    (await storeRecharge.getMouvements()).some((mv) =>
      mv.contreEcritureDe === mouvement.id) &&
    (await storeRecharge.getMouvements()).find((mv) => mv.id === transfert.id)
      .cerfaNumero === null);
} finally {
  delete globalThis.localStorage;
}

// ============================================================
// Verdict
// ============================================================
console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('Scénario d’intégration du Lot 1 : tout passe.');
