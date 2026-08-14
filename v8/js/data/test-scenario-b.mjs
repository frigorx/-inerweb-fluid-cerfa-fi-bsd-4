// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// Scénario de bout en bout Phase B (exécution : node test-scenario-b.mjs)
// Simule au store le parcours complet du wizard « Nouveau
// mouvement » : machine neuve + bouteille compatible, mise en
// service brouillon → soumis → validé, effets stocks/charges,
// contrôle conforme, contre-écriture, chaîne d'intégrité intacte.
// Node ≥ 18, sans DOM.
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

const store = await creerStore();
const utilisateur = await store.getUtilisateurCourant();

// --- 1. Machine neuve (comme la modale machine-form) ----------
const machine = await store.createMachine({
  designation: 'Groupe froid TP — scénario B',
  type: 'Chambre froide',
  marque: 'Bitzer',
  modele: 'LH64E',
  fluide: 'R-134a',
  chargeNominaleKg: 3.0,
  chargeActuelleKg: 0,
  clientId: 'cli-lycee',
  localisation: 'Atelier froid — poste 3',
  dateMiseEnService: '2026-07-03',
  operateur: utilisateur.id
});
verifier('machine neuve créée (EN_SERVICE, charge 0, date de mise en service conservée)',
  machine.statut === 'EN_SERVICE' && machine.chargeActuelleKg === 0 &&
  machine.dateMiseEnService === '2026-07-03');

// --- 2. Bouteille compatible (même fluide, pleine) -------------
const bouteille = await store.createBouteille({
  numeroReel: 'SCB-134-0001',
  type: 'NEUVE',
  fluide: 'R-134a',
  tareKg: 11.0,
  masseBruteKg: 21.0, // nette = 10,0 kg
  contenanceMaxKg: 12,
  proprietaire: 'Climalife',
  operateur: `${utilisateur.prenom} ${utilisateur.nom}`
});
verifier('bouteille compatible créée (R-134a, nette 10,0 kg)',
  bouteille.fluide === machine.fluide && PROCHE(bouteille.masseNetteKg, 10.0));

// --- 3. Mouvement MISE_EN_SERVICE : brouillon → soumis → validé
// (mêmes champs que le wizard à l'étape de finalisation)
const brouillon = await store.creerMouvement({
  type: 'MISE_EN_SERVICE',
  mode: 'FORMATION',
  machineId: machine.id,
  bouteilleSrcId: bouteille.id,
  bouteilleDstId: null,
  peseeAvantKg: 21.0,
  peseeApresKg: 18.2, // 2,8 kg chargés dans la machine
  causeMouvement: null,
  controle: { statutControle: 'CONFORME', detecteurId: 'out-1' },
  signatureDataUrl: 'data:image/png;base64,SCENARIO-B',
  technicien: `${utilisateur.prenom} ${utilisateur.nom}`
});
verifier('brouillon créé (statut BROUILLON, numéro FORM-2026-NNNN)',
  brouillon.statut === 'BROUILLON' && /^FORM-2026-\d{4}$/.test(brouillon.numero));

const soumis = await store.soumettreMouvement(brouillon.id);
verifier('mouvement soumis (statut SOUMIS)', soumis.statut === 'SOUMIS');

const valide = await store.validerMouvement(brouillon.id, utilisateur.id);
verifier('mouvement validé : quantité 2,80 kg, hash chaîné, CERFA numéroté',
  valide.statut === 'VALIDE' && PROCHE(valide.quantiteKg, 2.8) &&
  typeof valide.hashEcriture === 'string' && valide.hashEcriture.length === 64 &&
  valide.cerfaNumero === valide.numero);

// --- 4. Effets stocks / charges --------------------------------
let machines = await store.getMachines();
let bouteilles = await store.getBouteilles();
let machineApres = machines.find((m) => m.id === machine.id);
let bouteilleApres = bouteilles.find((b) => b.id === bouteille.id);
verifier('effets exacts : machine 0 → 2,80 kg, bouteille 10,0 → 7,20 kg',
  PROCHE(machineApres.chargeActuelleKg, 2.8) &&
  PROCHE(bouteilleApres.masseNetteKg, 7.2),
  `machine = ${machineApres.chargeActuelleKg}, bouteille = ${bouteilleApres.masseNetteKg}`);

// --- 5. Contrôle d'étanchéité CONFORME --------------------------
const controle = await store.createControle({
  machineId: machine.id,
  resultat: 'CONFORME',
  typeControle: 'MISE_EN_SERVICE',
  methode: 'DIRECTE',
  detecteurId: 'out-1',
  operateur: `${utilisateur.prenom} ${utilisateur.nom}`,
  operateurId: utilisateur.id,
  prochainControle: '2027-07-03'
});
machines = await store.getMachines();
machineApres = machines.find((m) => m.id === machine.id);
verifier('contrôle CONFORME enregistré, machine EN_SERVICE, échéance posée',
  controle.resultat === 'CONFORME' && controle.detecteurId === 'out-1' &&
  machineApres.statut === 'EN_SERVICE' &&
  machineApres.prochainControle === '2027-07-03');

// --- 6. Contre-écriture ----------------------------------------
const contre = await store.annulerParContreEcriture(
  valide.id, 'Scénario B : annulation de démonstration', utilisateur.id);
verifier('contre-écriture VALIDE, quantité opposée, liée à l’original',
  contre.statut === 'VALIDE' && PROCHE(contre.quantiteKg, -2.8) &&
  contre.contreEcritureDe === valide.id && contre.type === valide.type);

machines = await store.getMachines();
bouteilles = await store.getBouteilles();
machineApres = machines.find((m) => m.id === machine.id);
bouteilleApres = bouteilles.find((b) => b.id === bouteille.id);
verifier('effets inverses : machine revient à 0, bouteille revient à 10,0 kg',
  PROCHE(machineApres.chargeActuelleKg, 0) &&
  PROCHE(bouteilleApres.masseNetteKg, 10.0),
  `machine = ${machineApres.chargeActuelleKg}, bouteille = ${bouteilleApres.masseNetteKg}`);

const mouvements = await store.getMouvements();
const original = mouvements.find((mv) => mv.id === valide.id);
verifier('original ANNULE, données métier intactes',
  original.statut === 'ANNULE' && PROCHE(original.quantiteKg, 2.8) &&
  original.signatureDataUrl === 'data:image/png;base64,SCENARIO-B');

// --- 7. Chaîne d'intégrité -------------------------------------
const chaine = await store.verifierChaineHash();
verifier('verifierChaineHash → ok en fin de scénario',
  chaine.ok === true && chaine.casseA === null, JSON.stringify(chaine));

// --- Verdict ---------------------------------------------------
console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('Scénario de bout en bout Phase B : tout passe.');
