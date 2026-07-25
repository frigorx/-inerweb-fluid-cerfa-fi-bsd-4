// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// Scénario de bout en bout Phase C (exécution : node test-scenario-c.mjs)
// Parcours « audit de conformité » complet côté store :
// décision DÉCHET sur B-03 → BSFF → sortie de stock → la balance
// matière reflète la destruction → inventaire avec écart → alerte
// CRITIQUE → justification → l'alerte disparaît → blocage OFFICIEL
// (motif détecteurs expirés) → remplacement du détecteur → le
// motif disparaît. Node ≥ 18, sans DOM.
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

const PROCHE = (a, b) => Math.abs(a - b) < 1e-9;
const ANNEE = new Date().getFullYear();

const store = await creerStore();
const utilisateur = await store.getUtilisateurCourant();

// --- 0. État initial : aucun écart, la balance retombe juste ----
let balance = await store.getBalanceMatiere(ANNEE);
verifier('état initial : aucun inventaire saisi, donc aucun écart',
  balance.lignes.every((l) => l.stockReelKg === null && l.ecartKg === null));

let alertes = await store.getAlertes();
verifier('état initial : aucune alerte d’écart de balance',
  alertes.every((a) => !a.id.startsWith('alr-ecart-')));

// --- 1. Décision DÉCHET sur la bouteille B-03 -------------------
const bouteilles = await store.getBouteilles();
const b03 = bouteilles.find((b) => b.code === 'B-03');
verifier('B-03 présente en stock (récupération R-404A, 3,60 kg)',
  b03 && b03.type === 'RECUPERATION' && b03.statut === 'EN_STOCK' &&
  PROCHE(b03.masseNetteKg, 3.6));

const apresDecision = await store.deciderFluideRecupere(
  b03.id, 'DECHET', utilisateur.id);
verifier('décision DÉCHET : statut DECHET + date limite de garde à un an',
  apresDecision.statut === 'DECHET' &&
  typeof apresDecision.dateLimiteGarde === 'string' &&
  apresDecision.dateLimiteGarde > apresDecision.decisionDate);

// --- 2. Sortie BSFF ---------------------------------------------
const bsff = await store.createBsff({
  bouteilleId: b03.id,
  numeroBsff: 'SIF-2026-0001',
  transporteur: 'TransFluides Provence',
  installationDestination: 'Trédi Salaise-sur-Sanne',
  masseRemiseKg: 3.6,
  dateRemise: apresDecision.decisionDate,
  operateur: utilisateur.id
});
verifier('BSFF créé et listé', (await store.getBsff())
  .some((b) => b.id === bsff.id && b.numeroBsff === 'SIF-2026-0001'));

const b03Apres = (await store.getBouteilles()).find((b) => b.id === b03.id);
verifier('sortie de stock : B-03 RETOURNEE, masse nette 0, BSFF référencé',
  b03Apres.statut === 'RETOURNEE' && PROCHE(b03Apres.masseNetteKg, 0) &&
  b03Apres.numBsff === 'SIF-2026-0001');

const journal = await store.getJournalAudit();
verifier('mouvement de sortie tracé au journal (SORTIE_BSFF)',
  journal.some((j) => j.action === 'SORTIE_BSFF' && j.cible === 'B-03'));

// --- 3. La balance matière reflète la destruction ---------------
balance = await store.getBalanceMatiere(ANNEE);
const ligne404 = balance.lignes.find((l) => l.fluide === 'R-404A');
verifier('balance R-404A : destruction 3,60 kg, stock théorique 0',
  ligne404 && PROCHE(ligne404.destructionsKg, 3.6) &&
  PROCHE(ligne404.stockTheoriqueKg, 0),
  JSON.stringify(ligne404));

// --- 4. Inventaire avec écart → alerte CRITIQUE -----------------
const ligne32 = balance.lignes.find((l) => l.fluide === 'R-32');
const reelAvecEcart = ligne32.stockTheoriqueKg - 0.35; // manque 350 g
await store.saisirInventaire(ANNEE,
  [{ fluide: 'R-32', stockReelKg: reelAvecEcart }], utilisateur.id);

balance = await store.getBalanceMatiere(ANNEE);
const ecart32 = balance.lignes.find((l) => l.fluide === 'R-32');
verifier('inventaire saisi : écart de −0,35 kg calculé, non justifié',
  PROCHE(ecart32.stockReelKg, reelAvecEcart) &&
  PROCHE(ecart32.ecartKg, -0.35) && ecart32.justification === null,
  JSON.stringify(ecart32));

alertes = await store.getAlertes();
verifier('alerte CRITIQUE « écart non justifié » présente',
  alertes.some((a) => a.id === `alr-ecart-${ANNEE}-R-32` &&
    a.niveau === 'CRITIQUE'));

let officiel = await store.peutPasserEnOfficiel();
verifier('passage en OFFICIEL bloqué par l’écart non justifié',
  officiel.ok === false &&
  officiel.motifs.some((m) => m.includes('Écart de balance matière')));

// --- 5. Justification → l'alerte disparaît ----------------------
await store.justifierEcart(ANNEE, 'R-32',
  'Purge de flexibles et pertes de manipulation en TP (cumul estimé 350 g).');

balance = await store.getBalanceMatiere(ANNEE);
verifier('justification portée sur la ligne de balance',
  balance.lignes.find((l) => l.fluide === 'R-32').justification !== null);

alertes = await store.getAlertes();
verifier('l’alerte d’écart a disparu après justification',
  !alertes.some((a) => a.id === `alr-ecart-${ANNEE}-R-32`));

// --- 6. Prérequis OFFICIEL réunis dès la justification ----------
// 22/07 : le monde démo garde un détecteur CONFORME (Inficon) — une
// fois l'écart justifié, plus aucun motif ne bloque les prérequis
// (le verrou de livraison, lui, reste une autre porte).
officiel = await store.peutPasserEnOfficiel();
verifier('prérequis OFFICIEL réunis : aucun motif restant',
  officiel.ok === true && officiel.motifs.length === 0,
  JSON.stringify(officiel.motifs));

// --- 7. Remplacement du détecteur expiré → motif levé -----------
const outillage = await store.getOutillage();
const detecteurExpire = outillage.find(
  (o) => o.typeOutil === 'DETECTEUR' && o.statut === 'EXPIRE');
verifier('un détecteur EXPIRE existe bien dans l’outillage de démo',
  Boolean(detecteurExpire));

const dansUnAn = new Date();
dansUnAn.setFullYear(dansUnAn.getFullYear() + 1);
const echeanceFuture = dansUnAn.toISOString().slice(0, 10);
const detecteurAJour = await store.updateOutil(detecteurExpire.id, {
  dateEtalonnage: new Date().toISOString().slice(0, 10),
  dateVerification: new Date().toISOString().slice(0, 10),
  prochaineEcheance: echeanceFuture,
  operateur: utilisateur.id
});
verifier('détecteur réétalonné : statut recalculé CONFORME',
  detecteurAJour.statut === 'CONFORME');

officiel = await store.peutPasserEnOfficiel();
verifier('le motif « détecteur » a disparu : passage en OFFICIEL possible',
  officiel.ok === true && officiel.motifs.length === 0,
  JSON.stringify(officiel.motifs));

// --- 8. Intégrité finale ----------------------------------------
const chaine = await store.verifierChaineHash();
verifier('chaîne d’intégrité des écritures intacte en fin de scénario',
  chaine.ok === true, JSON.stringify(chaine));

// --- Verdict ----------------------------------------------------
console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('Scénario de bout en bout Phase C : tout passe.');
