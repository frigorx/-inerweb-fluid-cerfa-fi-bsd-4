// ============================================================
// Test de CONFORMITÉ AU CONTRAT DataStore (V9-E0)
// Exécution : node v8/js/data/test-contrat.mjs [demo]
//
// Cette suite vérifie qu'une implémentation respecte contrat.js :
// surface (64 méthodes, 2 propriétés, rien de plus), sémantique
// (formes de retour, garde-fous, messages français, effets stocks,
// hash chaîné, machine à états des mouvements), et invariants
// transverses (copies, notifications, journal append-only).
//
// RÈGLE D'OR : la suite ne dépend PAS des données de démonstration.
// Elle construit son propre monde via les mutations du contrat, pour
// pouvoir tourner à l'identique contre le DemoStore d'aujourd'hui et
// le LocalStore de la Phase E (SQLite) — c'est elle qui casse le
// build à la moindre divergence (leçon v7).
//
// ATTENTION : la suite ÉCRIT dans le store cible (créations, imports).
// Contre un store persistant (LocalStore E3), la lancer exclusivement
// sur une base de test JETABLE, jamais sur le data/ réel.
// Node ≥ 18, sans DOM.
// ============================================================

import {
  VERSION_CONTRAT, METHODES_CONTRAT, MSG_ECRITURE_FIGEE, FORMAT_EXPORT,
  TYPES_MOUVEMENT, STATUTS_MOUVEMENT, verifierSurface
} from './contrat.js';

// ------------------------------------------------------------
// Choix de l'implémentation à éprouver (demo par défaut).
// Phase E3 : ajouter ici le cas 'local' (serveur lancé au préalable).
// ------------------------------------------------------------
const NOM_STORE = process.argv[2] ?? 'demo';

async function fabriquerStore(nom) {
  switch (nom) {
    case 'demo': {
      const { creerStore } = await import('./datastore.js');
      return creerStore();
    }
    case 'local': {
      // Base jetable + LocalStore sur transport in-process (V9-E3).
      const { creerStoreDeTest } =
        await import('../../../server/harnais-contrat.mjs');
      return creerStoreDeTest();
    }
    default:
      console.error(`Store inconnu : « ${nom} » (implémentations connues : demo, local).`);
      process.exit(2);
  }
}

// ------------------------------------------------------------
// Outillage de vérification (conventions maison des suites v8)
// ------------------------------------------------------------
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

/** Vérifie la présence de toutes les clés attendues sur un objet. */
function verifierCles(libelle, objet, cles) {
  const manquantes = cles.filter((cle) => !(cle in (objet ?? {})));
  verifier(libelle, manquantes.length === 0,
    manquantes.length ? `clés absentes : ${manquantes.join(', ')}` : '');
}

const PROCHE = (a, b) => Math.abs(a - b) < 1e-9;
const DATE_JOUR = /^\d{4}-\d{2}-\d{2}$/;
const HASH_HEX = /^[0-9a-f]{64}$/;

/** Date locale AAAA-MM-JJ décalée de n jours (même convention que le store). */
function dateRelative(jours) {
  const d = new Date();
  d.setDate(d.getDate() + jours);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-` +
    String(d.getDate()).padStart(2, '0');
}

const DEBUT_SUITE = new Date().toISOString();
const store = await fabriquerStore(NOM_STORE);
console.log(`Conformité au contrat DataStore — implémentation « ${NOM_STORE} »\n`);

// ============================================================
// 1. Surface du contrat : 64 méthodes, 2 propriétés, rien de plus
// ============================================================
const surface = verifierSurface(store);
verifier('toutes les méthodes du contrat sont présentes',
  surface.manques.length === 0, `manquent : ${surface.manques.join(', ')}`);
verifier('aucune méthode intruse hors contrat (anti-dérive v7)',
  surface.intrus.length === 0, `intrus : ${surface.intrus.join(', ')}`);
verifier('les propriétés du contrat sont présentes',
  surface.proprietesManquantes.length === 0,
  `manquent : ${surface.proprietesManquantes.join(', ')}`);
verifier('le contrat compte bien 64 méthodes',
  Object.keys(METHODES_CONTRAT).length === 64,
  `compté : ${Object.keys(METHODES_CONTRAT).length}`);
verifier('modeLabel est une chaîne non vide',
  typeof store.modeLabel === 'string' && store.modeLabel.length > 0);
verifier('registreAltere est null (sain) ou { ok:false, casseA }',
  store.registreAltere === null
  || (store.registreAltere?.ok === false && 'casseA' in store.registreAltere));

// Toute lecture sans argument retourne une Promise (contrat : async partout
// sauf surChangement) — la sémantique des mutations est éprouvée plus bas.
const LECTURES_SANS_ARGUMENT = [
  'getEtablissement', 'getOutillage', 'getMachines', 'getBouteilles',
  'getMouvements', 'getControles', 'getFluides', 'getPersonnel',
  'getClients', 'getAlertes', 'getJournalAudit', 'verifierChaineHash',
  'getEtatRegistre', 'getStats', 'getAnneesDisponibles',
  'getAuditsOrganisme', 'getNonConformites', 'getBsff',
  'getRetoursFournisseur', 'peutPasserEnOfficiel', 'exporterJSON'
];
{
  let toutesDesPromesses = true;
  for (const nom of LECTURES_SANS_ARGUMENT) {
    const retour = store[nom]();
    if (!(retour instanceof Promise)) {
      toutesDesPromesses = false;
      continue; // pas de .catch sur une non-Promise : l'échec suffit
    }
    await retour.catch(() => {});
  }
  verifier('chaque lecture sans argument retourne une Promise', toutesDesPromesses);
}
verifier('surChangement est synchrone et retourne une fonction de désabonnement',
  typeof store.surChangement(() => {}) === 'function');
try {
  store.surChangement('pas une fonction');
  verifier('surChangement refuse un abonné non fonction', false, 'aucune erreur levée');
} catch (erreur) {
  verifier('surChangement refuse un abonné non fonction',
    erreur.message.includes('fonction'));
}

// ============================================================
// 2. Référentiel et lectures de base
// ============================================================
const fluides = await store.getFluides();
verifier('getFluides retourne un référentiel non vide', fluides.length > 0);
verifierCles('un fluide porte code, famille, gwpAr4, nbMachines',
  fluides[0], ['code', 'famille', 'gwpAr4', 'nbMachines']);
verifier('gwpAr4 est un nombre (jamais une chaîne)',
  fluides.every((f) => typeof f.gwpAr4 === 'number'));

// Le scénario exige un HFC à fort PRP (périmètre F-Gas atteint dès
// quelques kg) : choisi par CRITÈRE, jamais par position dans le
// référentiel. R-410A est préféré s'il existe (lisibilité des masses).
const fluideScenario = fluides.find((f) => f.code === 'R-410A')
  ?? fluides.find((f) => String(f.famille).includes('HFC') && f.gwpAr4 >= 1500);
verifier('le référentiel offre un HFC à fort PRP pour le scénario',
  Boolean(fluideScenario));
if (!fluideScenario) {
  console.error('\nRéférentiel sans HFC à fort PRP : scénario impossible.');
  console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
  process.exit(1);
}
const FLUIDE = fluideScenario.code;

const etablissement = await store.getEtablissement();
verifierCles('l’établissement porte le dossier opérateur',
  etablissement, ['raisonSociale', 'siret', 'numAttestationCapacite',
    'dateEcheanceCapacite', 'categoriesAutorisees', 'activitesAutorisees']);

const etatRegistre = await store.getEtatRegistre();
verifier('getEtatRegistre : registre sain au départ { altere:false, casseA:null }',
  etatRegistre.altere === false && etatRegistre.casseA === null);

const alertes = await store.getAlertes();
verifier('getAlertes retourne un tableau', Array.isArray(alertes));
verifier('chaque alerte porte id, niveau (CRITIQUE|IMPORTANT), titre, cible',
  alertes.every((a) => a.id && ['CRITIQUE', 'IMPORTANT'].includes(a.niveau)
    && a.titre && typeof a.cible === 'object'));

// ============================================================
// 3. Personnel : création, garde-fous, désactivation (jamais supprimé)
// ============================================================
const enseignant = await store.createPersonne({
  nom: 'Contrat', prenom: 'Enseignant', typePersonne: 'ENSEIGNANT'
});
verifier('createPersonne : un enseignant reçoit roleApp ENSEIGNANT par défaut',
  enseignant.roleApp === 'ENSEIGNANT' && enseignant.actif === true);
const eleve = await store.createPersonne({
  nom: 'Contrat', prenom: 'Un élève', typePersonne: 'ELEVE'
});
verifier('createPersonne : un élève reçoit roleApp ELEVE par défaut',
  eleve.roleApp === 'ELEVE');
await verifierRejet('createPersonne refuse un nom vide',
  store.createPersonne({ nom: '', prenom: 'X', typePersonne: 'ELEVE' }));
await verifierRejet('createPersonne refuse un type de personne inconnu',
  store.createPersonne({ nom: 'X', prenom: 'X', typePersonne: 'ROBOT' }));

const patchPersonne = await store.updatePersonne(enseignant.id,
  { categorie2025: 'II' });
verifier('updatePersonne applique un patch partiel',
  patchPersonne.categorie2025 === 'II' && patchPersonne.nom === 'Contrat');
await verifierRejet('updatePersonne refuse une catégorie inconnue',
  store.updatePersonne(enseignant.id, { categorie2025: 'IX' }));

// La suite crée SON référent (règle d'or : aucune dépendance au monde
// seedé — un LocalStore vide doit passer).
const referent = await store.createPersonne({
  nom: 'Contrat', prenom: 'Référent', typePersonne: 'ENSEIGNANT',
  roleApp: 'REFERENT'
});
verifier('createPersonne accepte un roleApp explicite (REFERENT)',
  referent.roleApp === 'REFERENT');
const utilisateur = await store.getUtilisateurCourant();
verifier('getUtilisateurCourant retourne un référent',
  utilisateur.roleApp === 'REFERENT');

// ============================================================
// 4. Clients détenteurs
// ============================================================
const client = await store.createClient({
  raisonSociale: 'Boulangerie du contrat',
  adresse: '4 rue des Tests, 13010 Marseille',
  siret: '12345678900011'
});
verifier('createClient : client créé avec nbMachines à zéro',
  client.id && client.nbMachines === 0);
await verifierRejet('createClient refuse un SIRET invalide',
  store.createClient({ raisonSociale: 'X', adresse: 'X', siret: '123' }));
await verifierRejet('createClient refuse une raison sociale vide',
  store.createClient({ raisonSociale: ' ', adresse: 'X', siret: '12345678900011' }));
await verifierRejet('updateClient refuse un client introuvable',
  store.updateClient('cli-fantome', { adresse: 'X' }));
const clientMaj = await store.updateClient(client.id, { adresse: '5 rue Neuve' });
verifier('updateClient applique le patch', clientMaj.adresse === '5 rue Neuve');

// ============================================================
// 5. Machines : création, patch, cycle arrêt/remise/démantèlement
// ============================================================
const machineA = await store.createMachine({
  designation: 'Armoire de test A', fluide: FLUIDE,
  chargeNominaleKg: 5, clientId: client.id, operateur: 'Testeur Contrat'
});
verifier('createMachine : code auto M{n}, statut EN_SERVICE, charge nulle',
  /^M\d+$/.test(machineA.code) && machineA.statut === 'EN_SERVICE'
  && machineA.chargeActuelleKg === 0);
verifier('createMachine relie le client détenteur', machineA.clientId === client.id);
verifier('getClients recalcule nbMachines',
  (await store.getClients()).find((c) => c.id === client.id).nbMachines === 1);

await verifierRejet('createMachine refuse un fluide inconnu au référentiel',
  store.createMachine({ designation: 'X', fluide: 'R-999', chargeNominaleKg: 1 }));
await verifierRejet('createMachine refuse une charge nominale négative ou nulle',
  store.createMachine({ designation: 'X', fluide: FLUIDE, chargeNominaleKg: 0 }));
await verifierRejet('createMachine refuse un client introuvable',
  store.createMachine({ designation: 'X', fluide: FLUIDE, chargeNominaleKg: 1,
    clientId: 'cli-fantome' }));

const machineB = await store.createMachine({
  designation: 'Groupe froid du contrat', fluide: FLUIDE,
  chargeNominaleKg: 10, localisation: 'Atelier B', operateur: 'Testeur Contrat'
});
const machineBMaj = await store.updateMachine(machineB.id,
  { localisation: 'Atelier C' });
verifier('updateMachine applique le patch sans toucher id ni code',
  machineBMaj.localisation === 'Atelier C' && machineBMaj.id === machineB.id
  && machineBMaj.code === machineB.code);

const machineArretee = await store.arreterMachine(machineA.id, 'Testeur');
verifier('arreterMachine passe la machine en ARRETEE',
  machineArretee.statut === 'ARRETEE');
await verifierRejet('arreterMachine refuse une machine déjà arrêtée',
  store.arreterMachine(machineA.id, 'Testeur'));
verifier('remettreEnService revient à EN_SERVICE',
  (await store.remettreEnService(machineA.id, 'Testeur')).statut === 'EN_SERVICE');
await verifierRejet('remettreEnService refuse une machine déjà en service',
  store.remettreEnService(machineA.id, 'Testeur'));
verifier('demantelerMachine accepte une machine vide de fluide',
  (await store.demantelerMachine(machineA.id, 'Testeur')).statut === 'DEMANTELEE');
await verifierRejet('updateMachine refuse une machine démantelée',
  store.updateMachine(machineA.id, { localisation: 'X' }));
await verifierRejet('remettreEnService refuse une machine démantelée (définitif)',
  store.remettreEnService(machineA.id, 'Testeur'));

// ============================================================
// 6. Bouteilles : création, pesée, invariant nette = brute − tare
// ============================================================
const b1 = await store.createBouteille({
  type: 'NEUVE', fluide: FLUIDE, tareKg: 10, masseBruteKg: 20,
  contenanceMaxKg: 12
});
verifier('createBouteille : code auto B-NN, EN_STOCK, fluide VIERGE',
  /^B-\d{2,}$/.test(b1.code) && b1.statut === 'EN_STOCK'
  && b1.etatFluide === 'VIERGE');
verifier('invariant masseNetteKg = masseBruteKg − tareKg',
  PROCHE(b1.masseNetteKg, 10) && PROCHE(b1.masseBruteKg - b1.tareKg, b1.masseNetteKg));
verifier('masseEntreeKg figée à l’entrée (CR-4)', PROCHE(b1.masseEntreeKg, 10));
verifier('les dates de la bouteille sont au format AAAA-MM-JJ',
  DATE_JOUR.test(b1.dateEntree) && DATE_JOUR.test(b1.datePesee));

await verifierRejet('createBouteille refuse brute < tare (nette négative)',
  store.createBouteille({ type: 'NEUVE', fluide: FLUIDE, tareKg: 10,
    masseBruteKg: 8, contenanceMaxKg: 12 }));
await verifierRejet('createBouteille refuse un débordement de contenance',
  store.createBouteille({ type: 'NEUVE', fluide: FLUIDE, tareKg: 10,
    masseBruteKg: 30, contenanceMaxKg: 12 }));
await verifierRejet('createBouteille refuse un type inconnu',
  store.createBouteille({ type: 'CONSIGNE', fluide: FLUIDE, tareKg: 1,
    contenanceMaxKg: 2 }));

const b1Pesee = await store.peserBouteille(b1.id, 19.5, 'Testeur');
verifier('peserBouteille recalcule la nette et date la pesée du jour',
  PROCHE(b1Pesee.masseNetteKg, 9.5) && b1Pesee.datePesee === dateRelative(0));
await verifierRejet('peserBouteille refuse une brute sous la tare',
  store.peserBouteille(b1.id, 5, 'Testeur'));
await store.peserBouteille(b1.id, 20, 'Testeur'); // retour à l'état de départ

const b1Patch = await store.updateBouteille(b1.id, { masseBruteKg: 21 });
verifier('updateBouteille recalcule la nette quand la brute change',
  PROCHE(b1Patch.masseNetteKg, 11));
await verifierRejet('updateBouteille refuse un débordement de contenance',
  store.updateBouteille(b1.id, { masseBruteKg: 40 }));
await store.updateBouteille(b1.id, { masseBruteKg: 20 }); // retour à 10 kg nets

// ============================================================
// 7. Les lectures retournent des COPIES indépendantes
// ============================================================
{
  const machines = await store.getMachines();
  const cible = machines.find((m) => m.id === machineB.id);
  cible.designation = 'MUTATION SAUVAGE';
  const relecture = (await store.getMachines()).find((m) => m.id === machineB.id);
  verifier('muter une machine retournée n’a aucun effet sur le store',
    relecture.designation === 'Groupe froid du contrat');

  const etab = await store.getEtablissement();
  etab.raisonSociale = 'MUTATION SAUVAGE';
  verifier('muter l’établissement retourné n’a aucun effet sur le store',
    (await store.getEtablissement()).raisonSociale !== 'MUTATION SAUVAGE');

  // Généralisation à toutes les collections (le journal append-only est
  // le plus sensible : une référence vive le rendrait falsifiable).
  for (const nom of ['getBouteilles', 'getMouvements', 'getControles',
    'getPersonnel', 'getClients', 'getOutillage', 'getFluides',
    'getJournalAudit']) {
    const temoin = JSON.stringify(await store[nom]());
    const retour = await store[nom]();
    if (retour.length > 0) {
      for (const cle of Object.keys(retour[0])) retour[0][cle] = 'MUTATION';
    }
    verifier(`${nom} retourne des copies indépendantes`,
      JSON.stringify(await store[nom]()) === temoin);
  }
}

// ============================================================
// 8. Notifications surChangement
// ============================================================
{
  let notifications = 0;
  const desabonner = store.surChangement(() => { notifications += 1; });
  await store.updateClient(client.id, { adresse: '6 rue des Signaux' });
  verifier('une mutation réussie notifie les abonnés', notifications >= 1);
  const avant = notifications;
  desabonner();
  await store.updateClient(client.id, { adresse: '7 rue du Silence' });
  verifier('après désabonnement, plus aucune notification',
    notifications === avant);
}

// ============================================================
// 9. Cycle de vie d'un mouvement : BROUILLON → SOUMIS → VALIDE
// ============================================================
verifier('le contrat fige les 5 types de mouvement',
  TYPES_MOUVEMENT.length === 5 && STATUTS_MOUVEMENT.length === 4);

const mvt1 = await store.creerMouvement({
  type: 'CHARGE_APPOINT', machineId: machineB.id, bouteilleSrcId: b1.id,
  peseeAvantKg: 20, peseeApresKg: 18, technicien: 'Testeur Contrat',
  causeMouvement: 'Complément de charge (essai du contrat)'
});
verifier('creerMouvement : BROUILLON numéroté FORM-AAAA-NNNN',
  mvt1.statut === 'BROUILLON' && /^FORM-\d{4}-\d{4}$/.test(mvt1.numero));
verifier('au brouillon : quantité nulle, aucune empreinte, date du jour',
  mvt1.quantiteKg === null && mvt1.hashEcriture === null
  && DATE_JOUR.test(mvt1.date));
verifier('au brouillon : aucun effet stock',
  PROCHE((await store.getMachines()).find((m) => m.id === machineB.id)
    .chargeActuelleKg, 0));

await verifierRejet('creerMouvement refuse un type inconnu',
  store.creerMouvement({ type: 'INVENTION', machineId: machineB.id }));
await verifierRejet('creerMouvement refuse une machine introuvable',
  store.creerMouvement({ type: 'CHARGE_APPOINT', machineId: 'mac-fantome' }));

const mvt1Soumis = await store.soumettreMouvement(mvt1.id);
verifier('soumettreMouvement : SOUMIS avec date de soumission',
  mvt1Soumis.statut === 'SOUMIS' && DATE_JOUR.test(mvt1Soumis.dateSoumission));
await verifierRejet('soumettre un mouvement déjà soumis est refusé',
  store.soumettreMouvement(mvt1.id), 'brouillon');

await verifierRejet('rejeterMouvement exige un motif',
  store.rejeterMouvement(mvt1.id, '  '), 'otif');
const mvt1Rejete = await store.rejeterMouvement(mvt1.id, 'Pesée à revérifier');
verifier('rejeterMouvement : retour au BROUILLON avec motif conservé',
  mvt1Rejete.statut === 'BROUILLON' && mvt1Rejete.motifRejet === 'Pesée à revérifier');

await store.soumettreMouvement(mvt1.id);
await verifierRejet('un élève ne peut JAMAIS valider une écriture',
  store.validerMouvement(mvt1.id, eleve.id));
verifier('l’écriture est restée SOUMISE après le refus',
  (await store.getMouvements()).find((m) => m.id === mvt1.id).statut === 'SOUMIS');

const mvt1Valide = await store.validerMouvement(mvt1.id, enseignant.id);
verifier('validerMouvement : statut VALIDE, validateur porté',
  mvt1Valide.statut === 'VALIDE' && mvt1Valide.validateurId === enseignant.id);
verifier('la quantité est calculée des pesées, SIGNÉE (+2 kg chargés)',
  PROCHE(mvt1Valide.quantiteKg, 2));
verifier('l’écriture est scellée : hash 64 hex, ordre de validation fini',
  HASH_HEX.test(mvt1Valide.hashEcriture)
  && Number.isFinite(mvt1Valide.ordreValidation));
verifier('le numéro CERFA reprend le numéro de fiche (hors TRANSFERT)',
  mvt1Valide.cerfaNumero === mvt1Valide.numero);
{
  const machine = (await store.getMachines()).find((m) => m.id === machineB.id);
  const bouteille = (await store.getBouteilles()).find((b) => b.id === b1.id);
  verifier('effet stock : la machine gagne 2 kg', PROCHE(machine.chargeActuelleKg, 2));
  verifier('effet stock : la bouteille perd 2 kg', PROCHE(bouteille.masseNetteKg, 8));
}

// --- écriture figée : MSG canonique, mot pour mot ---------------
await verifierRejet('soumettre une écriture VALIDE répond le message canonique',
  store.soumettreMouvement(mvt1.id), MSG_ECRITURE_FIGEE);
await verifierRejet('supprimer une écriture VALIDE répond le message canonique',
  store.supprimerMouvement(mvt1.id, 'Testeur'), MSG_ECRITURE_FIGEE);
await verifierRejet('revalider une écriture VALIDE répond le message canonique',
  store.validerMouvement(mvt1.id, enseignant.id), MSG_ECRITURE_FIGEE);

// --- suppression d'un brouillon (CR-1) ---------------------------
{
  const brouillon = await store.creerMouvement({
    type: 'CHARGE_APPOINT', machineId: machineB.id, bouteilleSrcId: b1.id,
    peseeAvantKg: 18, peseeApresKg: 17, technicien: 'Testeur Contrat'
  });
  verifier('supprimerMouvement retourne true pour un brouillon',
    await store.supprimerMouvement(brouillon.id, 'Testeur') === true);
  verifier('le brouillon supprimé a disparu du registre',
    !(await store.getMouvements()).some((m) => m.id === brouillon.id));
}

// ============================================================
// 10. Contre-écriture : l'inverse scellé, l'original ANNULE
// ============================================================
await verifierRejet('annuler exige un motif',
  store.annulerParContreEcriture(mvt1.id, '', enseignant.id));
const contre = await store.annulerParContreEcriture(
  mvt1.id, 'Erreur de bouteille (essai du contrat)', enseignant.id);
verifier('la contre-écriture naît VALIDE, quantité OPPOSÉE (−2 kg)',
  contre.statut === 'VALIDE' && PROCHE(contre.quantiteKg, -2));
verifier('les pesées sont permutées',
  PROCHE(contre.peseeAvantKg, 18) && PROCHE(contre.peseeApresKg, 20));
verifier('la contre-écriture référence l’originale',
  contre.contreEcritureDe === mvt1.id && contre.motif?.length > 0);
verifier('la contre-écriture est chaînée à l’écriture précédente',
  contre.hashPrecedent === mvt1Valide.hashEcriture
  && contre.ordreValidation === mvt1Valide.ordreValidation + 1);
{
  const original = (await store.getMouvements()).find((m) => m.id === mvt1.id);
  verifier('l’original passe ANNULE, son empreinte reste intacte',
    original.statut === 'ANNULE'
    && original.hashEcriture === mvt1Valide.hashEcriture);
  const machine = (await store.getMachines()).find((m) => m.id === machineB.id);
  const bouteille = (await store.getBouteilles()).find((b) => b.id === b1.id);
  verifier('les stocks reviennent à l’état d’avant (machine à 0, bouteille à 10)',
    PROCHE(machine.chargeActuelleKg, 0) && PROCHE(bouteille.masseNetteKg, 10));
}
await verifierRejet('annuler une écriture déjà ANNULE est refusé',
  store.annulerParContreEcriture(mvt1.id, 'Encore ?', enseignant.id));

// ============================================================
// 11. Deuxième charge (élève écarté du jeu), puis récupération
// ============================================================
const mvt2 = await store.creerMouvement({
  type: 'CHARGE_APPOINT', machineId: machineB.id, bouteilleSrcId: b1.id,
  peseeAvantKg: 20, peseeApresKg: 15, technicien: 'Testeur Contrat'
});
await store.soumettreMouvement(mvt2.id);
const mvt2Valide = await store.validerMouvement(mvt2.id, enseignant.id);
verifier('deuxième charge validée (+5 kg)', PROCHE(mvt2Valide.quantiteKg, 5));

const bR = await store.createBouteille({
  type: 'RECUPERATION', fluide: FLUIDE, tareKg: 5, masseBruteKg: 5,
  contenanceMaxKg: 10
});
verifier('une bouteille de récupération naît vide, fluide RECUPERE',
  PROCHE(bR.masseNetteKg, 0) && bR.etatFluide === 'RECUPERE');

const mvt3 = await store.creerMouvement({
  type: 'RECUPERATION_MAINTENANCE', machineId: machineB.id,
  bouteilleDstId: bR.id, peseeAvantKg: 5, peseeApresKg: 6.5,
  technicien: 'Testeur Contrat'
});
await store.soumettreMouvement(mvt3.id);
const mvt3Valide = await store.validerMouvement(mvt3.id, enseignant.id);
verifier('récupération validée : quantité NÉGATIVE (−1,5 kg)',
  PROCHE(mvt3Valide.quantiteKg, -1.5));
{
  const machine = (await store.getMachines()).find((m) => m.id === machineB.id);
  const bouteille = (await store.getBouteilles()).find((b) => b.id === bR.id);
  verifier('effet stock : machine à 3,5 kg, bouteille de récup à 1,5 kg',
    PROCHE(machine.chargeActuelleKg, 3.5) && PROCHE(bouteille.masseNetteKg, 1.5));
}

// ============================================================
// 12. Contrôles d'étanchéité et fréquence réglementaire
// ============================================================
const prochain = await store.calculerProchainControle(machineB.id, dateRelative(0));
verifier('calculerProchainControle : date ISO pour une machine dans le périmètre',
  typeof prochain === 'string' && DATE_JOUR.test(prochain));
verifier('calculerProchainControle : null pour une machine hors périmètre',
  await store.calculerProchainControle(machineA.id, dateRelative(0)) === null);
await verifierRejet('calculerProchainControle refuse une machine introuvable',
  store.calculerProchainControle('mac-fantome', dateRelative(0)));

const controleFuite = await store.createControle({
  machineId: machineB.id, resultat: 'FUITE', methode: 'DIRECTE',
  operateur: 'Testeur Contrat', localisationFuite: 'Raccord BP'
});
verifier('un contrôle FUITE passe la machine en statut FUITE',
  controleFuite.resultat === 'FUITE'
  && (await store.getMachines()).find((m) => m.id === machineB.id)
    .statut === 'FUITE');
await store.createControle({
  machineId: machineB.id, resultat: 'CONFORME', methode: 'DIRECTE',
  operateur: 'Testeur Contrat', prochainControle: prochain
});
verifier('un contrôle CONFORME ramène la machine EN_SERVICE',
  (await store.getMachines()).find((m) => m.id === machineB.id)
    .statut === 'EN_SERVICE');
await verifierRejet('createControle refuse un résultat inconnu',
  store.createControle({ machineId: machineB.id, resultat: 'MOYEN' }));
await verifierRejet('createControle refuse une machine introuvable',
  store.createControle({ machineId: 'mac-fantome', resultat: 'CONFORME' }));
await verifierRejet('demantelerMachine refuse une machine chargée (3,5 kg > 0,05)',
  store.demantelerMachine(machineB.id, 'Testeur'));

// ============================================================
// 13. Chaîne déchets : décision, BSFF, retour fournisseur
// ============================================================
await verifierRejet('deciderFluideRecupere refuse une décision inconnue',
  store.deciderFluideRecupere(bR.id, 'PEUT-ETRE', 'Testeur'));
const bDechet = await store.deciderFluideRecupere(bR.id, 'DECHET', 'Testeur');
verifier('décision DECHET : statut, état du fluide et délai de garde posés',
  bDechet.statut === 'DECHET' && bDechet.etatFluide === 'DECHET'
  && DATE_JOUR.test(bDechet.dateLimiteGarde));

await verifierRejet('createBsff refuse une bouteille qui n’est pas un déchet',
  store.createBsff({ bouteilleId: b1.id, numeroBsff: 'BSFF-X', masseRemiseKg: 1 }));
// Préfixe UNIQUE par exécution : la suite doit rester rejouable contre
// un store persistant (les numéros d'une passe précédente subsistent).
const PREFIXE_BSFF = `BSFF-CONTRAT-${Date.now().toString(36).toUpperCase()}`;
const bsff1 = await store.createBsff({
  bouteilleId: bR.id, numeroBsff: `${PREFIXE_BSFF}-001`,
  transporteur: 'Transports du Sud', installationDestination: 'Récupfluides SA',
  masseRemiseKg: 0.5
});
verifier('remise PARTIELLE : le reliquat reste en déchet (1,0 kg)',
  PROCHE((await store.getBouteilles()).find((b) => b.id === bR.id).masseNetteKg, 1)
  && (await store.getBouteilles()).find((b) => b.id === bR.id).statut === 'DECHET');
await store.createBsff({
  bouteilleId: bR.id, numeroBsff: `${PREFIXE_BSFF}-002`, masseRemiseKg: 1
});
verifier('remise TOTALE : bouteille vidée et RETOURNEE',
  PROCHE((await store.getBouteilles()).find((b) => b.id === bR.id).masseNetteKg, 0)
  && (await store.getBouteilles()).find((b) => b.id === bR.id)
    .statut === 'RETOURNEE');
verifier('getBsff trace les deux bordereaux',
  (await store.getBsff()).filter((x) =>
    String(x.numeroBsff).startsWith(PREFIXE_BSFF)).length === 2);
verifier('le numéro de BSFF est reporté sur la bouteille',
  (await store.getBouteilles()).find((b) => b.id === bR.id).numBsff?.length > 0);

const b1Retournee = await store.retournerFournisseur(b1.id, 'Testeur Contrat');
verifier('retournerFournisseur vide la bouteille et la sort du stock',
  b1Retournee.statut === 'RETOURNEE' && PROCHE(b1Retournee.masseNetteKg, 0));
{
  const retours = await store.getRetoursFournisseur();
  const notre = retours.find((r) => r.bouteilleId === b1.id);
  verifier('le retour fournisseur est tracé avec la masse au moment du retour (5 kg)',
    notre && PROCHE(notre.masseKg, 5));
}
await verifierRejet('retournerFournisseur refuse une bouteille déjà retournée',
  store.retournerFournisseur(b1.id, 'Testeur'));

// ============================================================
// 13 bis. Les trois autres types : TRANSFERT (sans CERFA),
// MISE_EN_SERVICE, RECUPERATION_DEMANTELEMENT (vide la machine)
// ============================================================
const b2 = await store.createBouteille({
  type: 'NEUVE', fluide: FLUIDE, tareKg: 5, masseBruteKg: 11,
  contenanceMaxKg: 8
});
const b3 = await store.createBouteille({
  type: 'NEUVE', fluide: FLUIDE, tareKg: 5, masseBruteKg: 5,
  contenanceMaxKg: 8
});
{
  const transfert = await store.creerMouvement({
    type: 'TRANSFERT', bouteilleSrcId: b2.id, bouteilleDstId: b3.id,
    peseeAvantKg: 11, peseeApresKg: 9, technicien: 'Testeur Contrat'
  });
  await store.soumettreMouvement(transfert.id);
  const valide = await store.validerMouvement(transfert.id, enseignant.id);
  verifier('TRANSFERT validé : quantité positive (+2 kg), scellé',
    PROCHE(valide.quantiteKg, 2) && HASH_HEX.test(valide.hashEcriture));
  verifier('TRANSFERT : JAMAIS de numéro CERFA (mouvement interne, IM-12)',
    valide.cerfaNumero === null);
  const src = (await store.getBouteilles()).find((b) => b.id === b2.id);
  const dst = (await store.getBouteilles()).find((b) => b.id === b3.id);
  verifier('effet stock du transfert : source à 4 kg, destination à 2 kg',
    PROCHE(src.masseNetteKg, 4) && PROCHE(dst.masseNetteKg, 2));
}

const machineC = await store.createMachine({
  designation: 'Monobloc du contrat', fluide: FLUIDE, chargeNominaleKg: 8,
  operateur: 'Testeur Contrat'
});
{
  const mise = await store.creerMouvement({
    type: 'MISE_EN_SERVICE', machineId: machineC.id, bouteilleSrcId: b2.id,
    peseeAvantKg: 9, peseeApresKg: 6, technicien: 'Testeur Contrat'
  });
  await store.soumettreMouvement(mise.id);
  const valide = await store.validerMouvement(mise.id, enseignant.id);
  verifier('MISE_EN_SERVICE validée : +3 kg, machine chargée',
    PROCHE(valide.quantiteKg, 3)
    && PROCHE((await store.getMachines()).find((m) => m.id === machineC.id)
      .chargeActuelleKg, 3));
}
{
  const bRec2 = await store.createBouteille({
    type: 'RECUPERATION', fluide: FLUIDE, tareKg: 5, masseBruteKg: 5,
    contenanceMaxKg: 10
  });
  const recup = await store.creerMouvement({
    type: 'RECUPERATION_DEMANTELEMENT', machineId: machineC.id,
    bouteilleDstId: bRec2.id, peseeAvantKg: 5, peseeApresKg: 8,
    technicien: 'Testeur Contrat'
  });
  await store.soumettreMouvement(recup.id);
  const valide = await store.validerMouvement(recup.id, enseignant.id);
  verifier('RECUPERATION_DEMANTELEMENT : −3 kg, machine vidée',
    PROCHE(valide.quantiteKg, -3)
    && PROCHE((await store.getMachines()).find((m) => m.id === machineC.id)
      .chargeActuelleKg, 0));
  verifier('la validation qui vide la machine PROPOSE le démantèlement ' +
    '(champ éphémère de la copie retournée)',
    valide.proposerDemantelement === true);
  verifier('la machine vidée se démantèle alors sans obstacle',
    (await store.demantelerMachine(machineC.id, 'Testeur')).statut
      === 'DEMANTELEE');
}

// ============================================================
// 14. Balance matière : inventaire et justification d'écart
// ============================================================
const ANNEE = new Date().getFullYear();
const balance = await store.getBalanceMatiere(ANNEE);
verifier('getBalanceMatiere : { annee, lignes[] }',
  balance.annee === ANNEE && Array.isArray(balance.lignes));
const ligneAvant = balance.lignes.find((l) => l.fluide === FLUIDE);
verifierCles('une ligne de balance porte les postes du registre', ligneAvant,
  ['stockInitialNeufKg', 'achatsKg', 'recuperationsKg', 'chargesKg',
    'retoursFournisseurKg', 'destructionsKg', 'stockTheoriqueKg',
    'stockReelKg', 'ecartKg', 'justification']);

await verifierRejet('saisirInventaire refuse un inventaire vide',
  store.saisirInventaire(ANNEE, [], 'Testeur'));
await verifierRejet('saisirInventaire refuse un fluide inconnu',
  store.saisirInventaire(ANNEE, [{ fluide: 'R-999', stockReelKg: 1 }], 'Testeur'));
await verifierRejet('saisirInventaire refuse un stock réel négatif',
  store.saisirInventaire(ANNEE, [{ fluide: FLUIDE, stockReelKg: -1 }], 'Testeur'));

const balanceInventoriee = await store.saisirInventaire(ANNEE,
  [{ fluide: FLUIDE, stockReelKg: ligneAvant.stockTheoriqueKg + 0.5 }], 'Testeur');
const ligneApres = balanceInventoriee.lignes.find((l) => l.fluide === FLUIDE);
verifier('l’inventaire fait apparaître l’écart théorique/réel (+0,5 kg)',
  PROCHE(ligneApres.ecartKg, 0.5));

const balanceJustifiee = await store.justifierEcart(ANNEE, FLUIDE,
  'Purge de circuit non pesée (essai du contrat).');
verifier('justifierEcart consigne la justification sur la ligne',
  balanceJustifiee.lignes.find((l) => l.fluide === FLUIDE)
    .justification?.includes('Purge'));
await verifierRejet('justifierEcart refuse quand il n’y a aucun écart à justifier',
  store.justifierEcart(1999, FLUIDE, 'Rien à justifier'));
await verifierRejet('justifierEcart exige une justification',
  store.justifierEcart(ANNEE, FLUIDE, '  '));

// ============================================================
// 15. Synthèses : stats, bilan, années, mode officiel
// ============================================================
const stats = await store.getStats();
verifierCles('getStats expose le tableau de bord complet', stats,
  ['nbMachines', 'chargeParcKg', 'stockBouteillesKg', 'nbBouteilles',
    'teqCo2Parc', 'nbCerfa', 'nbMouvements', 'nbControles',
    'tauxConformitePct', 'nbFuites', 'nbOperateursActifs',
    'chargeParFluide', 'fluxMensuels']);
verifier('les flux mensuels couvrent une fenêtre de 6 mois',
  Array.isArray(stats.fluxMensuels) && stats.fluxMensuels.length === 6);
verifier('les masses des stats sont des nombres',
  typeof stats.chargeParcKg === 'number' && typeof stats.teqCo2Parc === 'number');

const annees = await store.getAnneesDisponibles();
verifier('getAnneesDisponibles : nombres triés décroissants, année courante incluse',
  annees.includes(ANNEE)
  && annees.every((a, i) => typeof a === 'number' && (i === 0 || annees[i - 1] > a)));

const bilan = await store.getBilan(ANNEE);
verifier('getBilan : totaux et lignes par fluide',
  bilan.annee === ANNEE && Array.isArray(bilan.lignes)
  && typeof bilan.totalChargeKg === 'number');
verifier('le bilan a une ligne pour le fluide de nos écritures',
  bilan.lignes.some((l) => l.fluide === FLUIDE));

const officiel = await store.peutPasserEnOfficiel();
verifier('peutPasserEnOfficiel : { ok, motifs[] français }',
  typeof officiel.ok === 'boolean' && Array.isArray(officiel.motifs));

// ============================================================
// 16. Outillage : statut recalculé, réforme définitive
// ============================================================
const outil = await store.createOutil({
  typeOutil: 'DETECTEUR', marque: 'Inficon', modele: 'D-TEK',
  prochaineEcheance: dateRelative(120)
});
verifier('createOutil : statut CONFORME (échéance à 120 jours)',
  outil.statut === 'CONFORME');
verifier('updateOutil recalcule le statut (échéance dépassée → EXPIRE)',
  (await store.updateOutil(outil.id, { prochaineEcheance: dateRelative(-1) }))
    .statut === 'EXPIRE');
verifier('reformerOutil : HORS_SERVICE',
  (await store.reformerOutil(outil.id, 'Testeur')).statut === 'HORS_SERVICE');
verifier('un outil réformé le reste, même ré-étalonné (définitif)',
  (await store.updateOutil(outil.id, { prochaineEcheance: dateRelative(300) }))
    .statut === 'HORS_SERVICE');
await verifierRejet('createOutil refuse un type inconnu',
  store.createOutil({ typeOutil: 'PERCEUSE', marque: 'X' }));
await verifierRejet('reformerOutil refuse un outil déjà réformé',
  store.reformerOutil(outil.id, 'Testeur'));

// ============================================================
// 17. Dossier opérateur : établissement, audits, non-conformités
// ============================================================
const etabMaj = await store.updateEtablissement({ sitesCouverts: 'Atelier + labo' });
verifier('updateEtablissement applique le patch',
  etabMaj.sitesCouverts === 'Atelier + labo');
await verifierRejet('updateEtablissement refuse une catégorie inconnue',
  store.updateEtablissement({ categoriesAutorisees: ['I', 'V'] }));

const audit = await store.createAuditOrganisme({
  date: dateRelative(0), organisme: 'QualiFroid Cert', resultat: 'CONFORME'
});
verifier('createAuditOrganisme met à jour le dernier audit de l’établissement',
  (await store.getEtablissement()).dernierAudit === audit.date);
await verifierRejet('createAuditOrganisme refuse un organisme vide',
  store.createAuditOrganisme({ date: dateRelative(0), organisme: ' ',
    resultat: 'CONFORME' }));

const nc = await store.createNonConformite({
  auditId: audit.id, description: 'Étiquette de bouteille illisible.'
});
verifier('createNonConformite : OUVERTE, rattachée à l’audit',
  nc.statut === 'OUVERTE' && nc.auditId === audit.id);
await verifierRejet('createNonConformite refuse une description vide',
  store.createNonConformite({ description: '' }));
await verifierRejet('createNonConformite refuse un audit introuvable',
  store.createNonConformite({ description: 'X', auditId: 'aud-fantome' }));
const ncSoldee = await store.solderNonConformite(nc.id,
  'Étiquette remplacée le jour même.');
verifier('solderNonConformite : SOLDEE, datée, commentée',
  ncSoldee.statut === 'SOLDEE' && DATE_JOUR.test(ncSoldee.dateSolde)
  && ncSoldee.commentaireSolde.includes('remplacée'));
await verifierRejet('solder deux fois la même NC est refusé',
  store.solderNonConformite(nc.id, 'Encore ?'));

// ============================================================
// 18. Personnel : désactivation (jamais de suppression)
// ============================================================
verifier('desactiverPersonne éteint le compte sans le supprimer',
  (await store.desactiverPersonne(eleve.id, 'Testeur')).actif === false
  && (await store.getPersonnel()).some((p) => p.id === eleve.id));
await verifierRejet('désactiver deux fois est refusé',
  store.desactiverPersonne(eleve.id, 'Testeur'));

// ============================================================
// 19. Pièces jointes : liste blanche MIME, préservation des preuves
// ============================================================
const CONTENU_BASE64 = Buffer.from('preuve de pesée (essai du contrat)')
  .toString('base64');
const pj = await store.ajouterPieceJointe({
  entiteType: 'MACHINE', entiteId: machineB.id, categorie: 'PHOTO_PESEE',
  nomFichier: 'preuve.png', mimeType: 'image/png', base64: CONTENU_BASE64,
  ajoutePar: 'Testeur Contrat'
});
verifier('ajouterPieceJointe : métadonnées complètes, SHA-256, horodatage ISO',
  pj.taille > 0 && HASH_HEX.test(pj.hashSha256) && pj.dateAjout.includes('T'));
verifier('listerPiecesJointes retrouve la pièce de l’entité',
  (await store.listerPiecesJointes('MACHINE', machineB.id))
    .some((x) => x.id === pj.id));
{
  const complete = await store.obtenirPieceJointe(pj.id);
  const octets = complete.blob?.length ?? complete.blob?.size ?? 0;
  verifier('obtenirPieceJointe restitue le contenu binaire', octets > 0);
}
await verifierRejet('le SVG est refusé (surface XSS, IM-19)',
  store.ajouterPieceJointe({ entiteType: 'MACHINE', entiteId: machineB.id,
    nomFichier: 'x.svg', mimeType: 'image/svg+xml', base64: CONTENU_BASE64 }),
  'refusé');
await verifierRejet('une pièce jointe sans contenu est refusée',
  store.ajouterPieceJointe({ entiteType: 'MACHINE', entiteId: machineB.id,
    nomFichier: 'x.png', mimeType: 'image/png' }));

const pjFigee = await store.ajouterPieceJointe({
  entiteType: 'MOUVEMENT', entiteId: mvt2.id, categorie: 'PHOTO_PESEE',
  nomFichier: 'preuve-mouvement.png', mimeType: 'image/png',
  base64: CONTENU_BASE64
});
await verifierRejet('une PJ liée à une écriture figée est intouchable',
  store.supprimerPieceJointe(pjFigee.id, 'Testeur'));
verifier('supprimerPieceJointe retire une PJ ordinaire',
  await store.supprimerPieceJointe(pj.id, 'Testeur') === true
  && !(await store.listerPiecesJointes('MACHINE', machineB.id))
    .some((x) => x.id === pj.id));
await verifierRejet('obtenirPieceJointe refuse une pièce disparue',
  store.obtenirPieceJointe(pj.id));

// ============================================================
// 20. Intégrité : chaîne de hash et journal d'audit
// ============================================================
const chaine = await store.verifierChaineHash();
verifier('la chaîne de hash est intacte après tout le scénario',
  chaine.ok === true && chaine.casseA === null);

const journal = await store.getJournalAudit();
verifier('le journal d’audit est horodaté ISO complet',
  journal.length > 0 && journal.every((e) => String(e.date).includes('T')));
const nosActions = journal.filter((e) => e.date >= DEBUT_SUITE)
  .map((e) => e.action);
for (const action of ['CREATION_MACHINE', 'VALIDATION_MOUVEMENT',
  'CONTRE_ECRITURE', 'SORTIE_BSFF', 'SAISIE_INVENTAIRE']) {
  verifier(`le journal trace l’action ${action}`, nosActions.includes(action));
}

// ============================================================
// 21. Export / import : enveloppe, illisible, forgé, fidèle
// ============================================================
const exportPropre = await store.exporterJSON();
const enveloppe = JSON.parse(exportPropre);
verifier('exporterJSON : l’enveloppe contractuelle (format d’échange entre stores)',
  enveloppe.application === FORMAT_EXPORT.application
  && enveloppe.version === FORMAT_EXPORT.version
  && String(enveloppe.exporteLe).includes('T')
  && typeof enveloppe.donnees === 'object');

verifier('importerJSON retourne FALSE (sans lever) pour un texte illisible',
  await store.importerJSON('ceci n’est pas du JSON') === false);
verifier('importerJSON retourne FALSE pour une structure étrangère',
  await store.importerJSON('{"bonjour": 42}') === false);

{
  const forge = JSON.parse(exportPropre);
  const cible = forge.donnees.mouvements.find(
    (m) => m.statut === 'VALIDE' && Number.isFinite(m.quantiteKg));
  cible.quantiteKg += 1;
  await verifierRejet('un export FORGÉ (quantité retouchée) est refusé à l’import',
    store.importerJSON(JSON.stringify(forge)), 'Import refusé');
  const apres = await store.getMouvements();
  verifier('l’état courant reste intact après le refus du fichier forgé',
    apres.length === enveloppe.donnees.mouvements.length);
}

verifier('importerJSON adopte un export propre (true)',
  await store.importerJSON(exportPropre) === true);
verifier('après import propre, le registre est déclaré sain',
  (await store.getEtatRegistre()).altere === false
  && store.registreAltere === null);
verifier('l’état importé est fidèle (nos mouvements sont là)',
  (await store.getMouvements()).some((m) => m.id === mvt3.id));

// ============================================================
// Verdict
// ============================================================
console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log(`Contrat DataStore v${VERSION_CONTRAT} : ` +
  `l’implémentation « ${NOM_STORE} » est conforme.`);
