// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// Test de CONFORMITÉ AU CONTRAT DataStore (V9-E0)
// Exécution : node v8/js/data/test-contrat.mjs [demo]
//
// Cette suite vérifie qu'une implémentation respecte contrat.js :
// surface (91 méthodes, 2 propriétés, rien de plus), sémantique
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
// Lot C (C3) : refus canonique d'un PDF final hors mode OFFICIEL.
import { MSG_PDF_FINAL_HORS_OFFICIEL } from './pdf-final.js';
// P7-c : refus STRUCTUREL du contrôle direct en mode OFFICIEL.
import { MSG_CONTROLE_DIRECT_OFFICIEL } from './blocage-officiel.js';
// Lot B3 : fabrique de VRAIS PNG (l'image de signature est décodée).
import { pngDeTest, pngVierge, pngUnSeulPixel }
  from '../../../server/fabrique-png-test.mjs';

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
// V9.1 : identifiant opaque QR — base32 Crockford (sans I, L, O, U), 7 car.
const CODE_PUBLIC = /^[0-9A-HJKMNP-TV-Z]{7}$/;

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
// 1. Surface du contrat : 87 méthodes, 2 propriétés, rien de plus
// ============================================================
const surface = verifierSurface(store);
verifier('toutes les méthodes du contrat sont présentes',
  surface.manques.length === 0, `manquent : ${surface.manques.join(', ')}`);
verifier('aucune méthode intruse hors contrat (anti-dérive v7)',
  surface.intrus.length === 0, `intrus : ${surface.intrus.join(', ')}`);
verifier('les propriétés du contrat sont présentes',
  surface.proprietesManquantes.length === 0,
  `manquent : ${surface.proprietesManquantes.join(', ')}`);
verifier('le contrat compte bien 96 méthodes',
  Object.keys(METHODES_CONTRAT).length === 96,
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
  'getRetoursFournisseur', 'peutPasserEnOfficiel', 'exporterJSON',
  'getSentinelle', 'getHabilitations', 'getMentions'
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

// Fiche réglementaire EXPLICITE par fluide (migration 21 côté serveur,
// demo-donnees côté front) : les valeurs de la table validée
// (docs/TABLE-REGLEMENTAIRE-FLUIDES.md) sont exposées à l'IDENTIQUE des
// deux côtés — preuve que la colonne existe, traverse le mapping et que
// la parité demo/local tient sur les 4 nouveaux champs.
{
  const r455a = fluides.find((f) => f.code === 'R-455A');
  verifier('fiche explicite : R-455A porte contientHfc ET contientHfo à vrai',
    r455a?.contientHfc === true && r455a?.contientHfo === true);
  verifier('fiche explicite : R-455A classé HFC par la colonne (Règle A actée en base)',
    r455a?.categorieCadre7 === 'HFC');
  verifier('fiche explicite : R-455A porte la source de son PRP',
    typeof r455a?.sourcePrp === 'string' && r455a.sourcePrp.length > 0);
  verifier('fiche explicite : R-744 hors périmètre acté (AUCUNE, pas null)',
    fluides.find((f) => f.code === 'R-744')?.categorieCadre7 === 'AUCUNE');
  verifier('fiche explicite : R-1234yf classé HFO, sans HFC',
    (() => { const f = fluides.find((x) => x.code === 'R-1234yf');
      return f?.categorieCadre7 === 'HFO' && f?.contientHfo === true
        && f?.contientHfc === false; })());
  // PRP réglementaires F-Gas III (avis du 16/07/2026, migration 022 côté
  // serveur, demo-donnees côté front) : parité des valeurs des deux côtés.
  verifier('PRP F-Gas III : R-1234yf 0,501 · R-290 0,02 · R-455A 148 (conservatoire)',
    fluides.find((f) => f.code === 'R-1234yf')?.gwpAr4 === 0.501
    && fluides.find((f) => f.code === 'R-290')?.gwpAr4 === 0.02
    && fluides.find((f) => f.code === 'R-455A')?.gwpAr4 === 148);
  // P1-2 : deux champs dérivés désormais servis des DEUX côtés — actif
  // (migration 31, tout l'existant à vrai) et impact (déduit du PRP :
  // avant, il n'existait que dans le monde démo).
  verifier('P1-2 : tous les fluides du référentiel sont ACTIFS au départ',
    fluides.every((f) => f.actif === true));
  verifier('P1-2 : impact dérivé du PRP, servi par les deux stores',
    fluides.find((f) => f.code === 'R-404A')?.impact === 'TRES_ELEVE'
    && fluides.find((f) => f.code === 'R-32')?.impact === 'MODERE'
    && fluides.find((f) => f.code === 'R-455A')?.impact === 'FAIBLE');
}

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
// P0-5 (revue) : la grille est PAR CHAMP — avant, « A1 » était refusé pour
// la grille 2025 (validée contre I…IV) et le message mentait.
{
  const attestee = await store.createPersonne({
    nom: 'Grille', prenom: 'Christine', typePersonne: 'ENSEIGNANT',
    categorie2008: 'I', categorie2025: 'A1'
  });
  verifier('createPersonne accepte categorie2025 de la VRAIE grille 2025 (A1)',
    attestee.categorie2025 === 'A1' && attestee.categorie2008 === 'I');
}
await verifierRejet('createPersonne refuse une catégorie 2008 dans le champ 2025',
  store.createPersonne({ nom: 'Grille', prenom: 'Yves',
    typePersonne: 'ENSEIGNANT', categorie2025: 'I' }));
await verifierRejet('createPersonne refuse une catégorie 2025 dans le champ 2008',
  store.createPersonne({ nom: 'Grille', prenom: 'Zoé',
    typePersonne: 'ENSEIGNANT', categorie2008: 'A1' }));

const patchPersonne = await store.updatePersonne(enseignant.id,
  { categorie2025: 'A2' });
verifier('updatePersonne applique un patch partiel',
  patchPersonne.categorie2025 === 'A2' && patchPersonne.nom === 'Contrat');
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
  adresse: '4 rue des Tests, 30000 Nîmes',
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

// Référence client enrichie (Phase 2) : SIRET optionnel, coordonnées, désactivation.
const clientSansSiret = await store.createClient({
  raisonSociale: 'Client sans SIRET', adresse: 'Zone test'
});
verifier('createClient accepte l’absence de SIRET (référence allégée)',
  Boolean(clientSansSiret.id)
  && (clientSansSiret.siret === '' || clientSansSiret.siret == null));
verifier('createClient : actif à vrai par défaut', clientSansSiret.actif === true);
const clientCoord = await store.createClient({
  raisonSociale: 'Client coordonnées', adresse: 'Rue Contact',
  contact: 'M. Dupont', email: 'contact@exemple.fr', telephone: '0491000000'
});
verifier('createClient enregistre les coordonnées',
  clientCoord.contact === 'M. Dupont'
  && clientCoord.email === 'contact@exemple.fr'
  && clientCoord.telephone === '0491000000');
const clientRelu = (await store.getClients()).find((c) => c.id === clientCoord.id);
verifier('getClients restitue coordonnées et actif',
  clientRelu.telephone === '0491000000' && clientRelu.actif === true);
const clientDesactive = await store.updateClient(clientCoord.id, { actif: false });
verifier('updateClient désactive un client (actif=false)',
  clientDesactive.actif === false);
const clientReactive = await store.updateClient(clientCoord.id,
  { actif: true, telephone: '0492000000' });
verifier('updateClient réactive et modifie les coordonnées',
  clientReactive.actif === true && clientReactive.telephone === '0492000000');
await verifierRejet('updateClient refuse un SIRET renseigné invalide',
  store.updateClient(clientCoord.id, { siret: '42' }));
// Code public opaque (référence client QR) : format Crockford, unique.
verifier('createClient pose un code public opaque (Crockford 7)',
  CODE_PUBLIC.test(client.codePublic) && CODE_PUBLIC.test(clientCoord.codePublic)
  && client.codePublic !== clientCoord.codePublic);
verifier('le code public du client est stable (immuable au patch)',
  (await store.updateClient(clientCoord.id, { contact: 'Autre' })).codePublic
    === clientCoord.codePublic);

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

// V9.1 : code public (identifiant opaque QR) — format, unicité, immutabilité.
verifier('createMachine pose un code public au format Crockford (7 car.)',
  CODE_PUBLIC.test(machineA.codePublic));

await verifierRejet('createMachine refuse un fluide inconnu au référentiel',
  store.createMachine({ designation: 'X', fluide: 'R-999', chargeNominaleKg: 1 }));
await verifierRejet('createMachine refuse une charge nominale négative ou nulle',
  store.createMachine({ designation: 'X', fluide: FLUIDE, chargeNominaleKg: 0 }));
await verifierRejet('createMachine refuse un client introuvable',
  store.createMachine({ designation: 'X', fluide: FLUIDE, chargeNominaleKg: 1,
    clientId: 'cli-fantome' }));
// Blocage dur du mode OFFICIEL (lot B) : une demande OFFICIEL forgée via
// l'API reste refusée avec le message canonique MOTIVÉ du moteur — T1
// (20/07) : le verrou de livraison est REFERMÉ, le message le cite à
// nouveau EN PLUS des conditions réelles de l'établissement (parité
// demo/local — les motifs de poste diffèrent, le début du message jamais).
await verifierRejet('creerMouvement refuse une demande en mode OFFICIEL (motivé)',
  store.creerMouvement({ type: 'CHARGE_APPOINT', mode: 'OFFICIEL' }),
  'Mode Officiel refusé');
{
  let messageRefusOff = '';
  try {
    await store.creerMouvement({ type: 'CHARGE_APPOINT', mode: 'OFFICIEL' });
  } catch (erreur) { messageRefusOff = erreur.message; }
  verifier('le refus OFFICIEL cite le verrou de livraison (T1 : refermé)',
    messageRefusOff.startsWith('Mode Officiel refusé')
    && messageRefusOff.includes('pas encore ouvert'),
    messageRefusOff);
}

// P7-c (option A, remplace le colmatage P0-2) : le handler DIRECT est
// FORMATION-only PAR NATURE. Un contrôle AUTONOME forgé en mode OFFICIEL est
// refusé AVANT tout effet (machineId volontairement inexistant : le refus
// précède la vérification de la machine) avec le message canonique EXACT —
// l'égalité stricte prouve que c'est le refus STRUCTUREL qui parle, pas le
// verrou de livraison : ce refus tiendra verrou OUVERT, l'officiel ne
// passant que par le parcours mouvement de type CONTROLE (P7-a/b).
{
  let messageControleOff = '';
  try {
    await store.createControle({
      machineId: 'mac-fantome', resultat: 'CONFORME', mode: 'OFFICIEL' });
  } catch (erreur) { messageControleOff = erreur.message; }
  verifier('createControle refuse un contrôle AUTONOME en mode OFFICIEL '
    + '(refus structurel P7-c, message canonique exact)',
    messageControleOff === MSG_CONTROLE_DIRECT_OFFICIEL,
    `message = « ${messageControleOff} »`);
}

const machineB = await store.createMachine({
  designation: 'Groupe froid du contrat', fluide: FLUIDE,
  chargeNominaleKg: 10, localisation: 'Atelier B', operateur: 'Testeur Contrat'
});
verifier('createMachine : deux machines reçoivent des codes publics distincts',
  CODE_PUBLIC.test(machineB.codePublic)
  && machineB.codePublic !== machineA.codePublic);

const machineBMaj = await store.updateMachine(machineB.id,
  { localisation: 'Atelier C', codePublic: 'ZZZZZZZ' });
verifier('updateMachine applique le patch sans toucher id ni code',
  machineBMaj.localisation === 'Atelier C' && machineBMaj.id === machineB.id
  && machineBMaj.code === machineB.code);
verifier('updateMachine ignore silencieusement une tentative de modifier codePublic',
  machineBMaj.codePublic === machineB.codePublic
  && machineBMaj.codePublic !== 'ZZZZZZZ');

// Unicité sur un lot : N créations → N codes publics distincts.
{
  const lot = [];
  for (let i = 0; i < 15; i += 1) {
    lot.push(await store.createMachine({
      designation: `Machine du lot ${i}`, fluide: FLUIDE, chargeNominaleKg: 1
    }));
  }
  const codes = new Set(lot.map((m) => m.codePublic));
  verifier('createMachine : un lot de 15 machines donne 15 codes publics distincts',
    codes.size === lot.length && lot.every((m) => CODE_PUBLIC.test(m.codePublic)));
}

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

// V9.2 : code public (identifiant opaque QR) — format, unicité,
// immutabilité. Parité exacte des assertions machines (V9.1, § 5 ci-dessus).
verifier('createBouteille pose un code public au format Crockford (7 car.)',
  CODE_PUBLIC.test(b1.codePublic));

await verifierRejet('createBouteille refuse brute < tare (nette négative)',
  store.createBouteille({ type: 'NEUVE', fluide: FLUIDE, tareKg: 10,
    masseBruteKg: 8, contenanceMaxKg: 12 }));
await verifierRejet('createBouteille refuse un débordement de contenance',
  store.createBouteille({ type: 'NEUVE', fluide: FLUIDE, tareKg: 10,
    masseBruteKg: 30, contenanceMaxKg: 12 }));
await verifierRejet('createBouteille refuse un type inconnu',
  store.createBouteille({ type: 'CONSIGNE', fluide: FLUIDE, tareKg: 1,
    contenanceMaxKg: 2 }));

const bCodePublic = await store.createBouteille({
  type: 'NEUVE', fluide: FLUIDE, tareKg: 5, masseBruteKg: 5,
  contenanceMaxKg: 8
});
verifier('createBouteille : deux bouteilles reçoivent des codes publics distincts',
  CODE_PUBLIC.test(bCodePublic.codePublic) && bCodePublic.codePublic !== b1.codePublic);

const bCodePublicMaj = await store.updateBouteille(bCodePublic.id, { codePublic: 'ZZZZZZZ' });
verifier('updateBouteille ignore silencieusement une tentative de modifier codePublic',
  bCodePublicMaj.codePublic === bCodePublic.codePublic
  && bCodePublicMaj.codePublic !== 'ZZZZZZZ');

// Unicité sur un lot : N créations → N codes publics distincts.
{
  const lot = [];
  for (let i = 0; i < 15; i += 1) {
    lot.push(await store.createBouteille({
      type: 'NEUVE', fluide: FLUIDE, tareKg: 1, masseBruteKg: 1,
      contenanceMaxKg: 5
    }));
  }
  const codes = new Set(lot.map((b) => b.codePublic));
  verifier('createBouteille : un lot de 15 bouteilles donne 15 codes publics distincts',
    codes.size === lot.length && lot.every((b) => CODE_PUBLIC.test(b.codePublic)));
}

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
verifier('le contrat fige les 7 types de mouvement (dont 2 contrôles)',
  TYPES_MOUVEMENT.length === 7 && STATUTS_MOUVEMENT.length === 4);

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

// --- lot C (C3) : PDF final réservé au mode OFFICIEL -------------
// Bloc NEUTRE pour les stocks : le refus ne produit aucun effet, le
// brouillon d'essai est rejeté puis supprimé (aucune validation ajoutée).
{
  // '%PDF-1.4' en base64 : un vrai début de PDF, suffisant pour la magie.
  const pdfBase64 = 'JVBERi0xLjQKJSVFT0YK';
  const brouillonPdf = await store.creerMouvement({
    type: 'CHARGE_APPOINT', machineId: machineB.id, bouteilleSrcId: b1.id,
    peseeAvantKg: 8, peseeApresKg: 7.5, technicien: 'Testeur Contrat',
    causeMouvement: 'Preuve PDF hors officiel'
  });
  await store.soumettreMouvement(brouillonPdf.id);
  await verifierRejet('un PDF final fourni en FORMATION répond le refus canonique',
    store.validerMouvement(brouillonPdf.id, enseignant.id, pdfBase64),
    MSG_PDF_FINAL_HORS_OFFICIEL);
  verifier('l’écriture est restée SOUMISE après le refus du PDF hors officiel',
    (await store.getMouvements()).find((m) => m.id === brouillonPdf.id)
      .statut === 'SOUMIS');
  verifier('FORMATION inchangée : hashPdfFinal null, aucune PJ CERFA_FINAL',
    mvt1Valide.hashPdfFinal === null &&
    !(await store.listerPiecesJointes('MOUVEMENT', mvt1Valide.id))
      .some((pj) => pj.categorie === 'CERFA_FINAL'));
  await store.rejeterMouvement(brouillonPdf.id, 'Fin de la preuve PDF');
  await store.supprimerMouvement(brouillonPdf.id, 'Testeur');
}

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
// Lot 1 / C2 (27/07) : une contre-écriture DIT QUI L'A FAITE. Sans ce
// champ, la colonne « Exécuté par » de mouvements.csv sortait vide dans le
// dossier d'audit SCELLÉ : une écriture avait modifié le registre sans
// qu'on sache de qui elle était. C'est l'identité du VALIDATEUR (côté
// serveur : contrainte à la personne connectée par la garde de session) —
// jamais une valeur lue du corps de la requête. PARITÉ : les deux magasins
// posent la MÊME valeur, sinon le round-trip démo↔local casserait la
// chaîne (le champ entre dans l'empreinte v2).
verifier('la contre-écriture porte l’identité de qui l’a faite (executeParId)',
  contre.executeParId === enseignant.id,
  JSON.stringify({ executeParId: contre.executeParId, attendu: enseignant.id }));
verifier('la contre-écriture reste scellée en v2 et la chaîne se vérifie',
  contre.versionEmpreinte === 2
  && /^[0-9a-f]{64}$/.test(String(contre.hashEcriture))
  && (await store.verifierChaineHash()).ok === true);
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
// Lot C (C3c) : la preuve s'attache AU BROUILLON — une fois l'écriture
// figée, plus aucune PJ ne s'ajoute (asymétrie fermée). Cette pièce sert
// plus bas (section pièces jointes) au refus de suppression sur figé.
await store.ajouterPieceJointe({
  entiteType: 'MOUVEMENT', entiteId: mvt2.id, categorie: 'PHOTO_PESEE',
  nomFichier: 'preuve-mouvement.png', mimeType: 'image/png',
  base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk'
    + 'YPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
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
// Règle C : le périmètre se juge sur la charge NOMINALE déclarée, pas sur la
// quantité présente. Une machine hors périmètre = un fluide NON fluoré (CO₂,
// HC), jamais une machine simplement « vide » (machineA, R-410A à 5 kg
// nominal, EST dans le périmètre). On teste donc avec du R-744.
const machineHorsPerimetre = await store.createMachine({
  designation: 'Groupe CO₂ hors périmètre F-Gas', fluide: 'R-744',
  chargeNominaleKg: 20, operateur: 'Testeur Contrat'
});
verifier('calculerProchainControle : null pour un fluide hors périmètre (R-744)',
  await store.calculerProchainControle(machineHorsPerimetre.id, dateRelative(0)) === null);
// Verrou de la reclassification (Règle A) sur demo ET serveur : un mélange
// HFC/HFO se traite comme un HFC (teqCO₂), pas comme un HFO (kg). R-455A à
// 5 kg nominal = 0,74 t éq. CO₂ < 5 → aucun contrôle. Sous l'ancien ordre
// (HFO testé avant HFC), 5 kg ≥ 1 kg aurait déclenché un contrôle → ce test
// échouerait. C'est la SEULE preuve de la reclassification côté serveur.
const machineMelange = await store.createMachine({
  designation: 'Groupe mélange HFC/HFO du contrat', fluide: 'R-455A',
  chargeNominaleKg: 5, operateur: 'Testeur Contrat'
});
verifier('calculerProchainControle : mélange HFC/HFO (R-455A, 5 kg) traité HFC → null (< 5 t éq. CO₂)',
  await store.calculerProchainControle(machineMelange.id, dateRelative(0)) === null);
// Portée TEMPORELLE de la Règle B, prouvée côté demo ET serveur : les HFO
// purs ne sont soumis au contrôle que depuis le 11/03/2024 (F-Gas III).
// R-1234yf à 12 kg : contrôle daté de la veille → aucun prochain contrôle ;
// daté du jour d'entrée en vigueur → 6 mois. Si le miroir serveur ignorait
// la date, le premier cas rendrait une date → ce test échouerait.
const machineHfo = await store.createMachine({
  designation: 'Groupe HFO pur du contrat', fluide: 'R-1234yf',
  chargeNominaleKg: 12, operateur: 'Testeur Contrat'
});
verifier('calculerProchainControle : HFO pur, contrôle du 10/03/2024 → null (avant F-Gas III)',
  await store.calculerProchainControle(machineHfo.id, '2024-03-10') === null);
verifier('calculerProchainControle : HFO pur, contrôle du 11/03/2024 → 6 mois (2024-09-11)',
  await store.calculerProchainControle(machineHfo.id, '2024-03-11') === '2024-09-11');
await verifierRejet('calculerProchainControle refuse une machine introuvable',
  store.calculerProchainControle('mac-fantome', dateRelative(0)));

// P0-6 (I-1) : fuite datée d'HIER — la réparation tracée plus bas est
// datée d'hier aussi, et la garde refuse une réparation antérieure à la
// détection de la fuite.
const controleFuite = await store.createControle({
  machineId: machineB.id, resultat: 'FUITE', methode: 'DIRECTE',
  date: dateRelative(-1),
  operateur: 'Testeur Contrat', localisationFuite: 'Raccord BP'
});
verifier('un contrôle FUITE passe la machine en statut FUITE',
  controleFuite.resultat === 'FUITE'
  && (await store.getMachines()).find((m) => m.id === machineB.id)
    .statut === 'FUITE');
verifier('un contrôle FUITE porte la localisation saisie',
  controleFuite.localisationFuite === 'Raccord BP');
// Migration 19 / CERFA de contrôle : un contrôle AUTONOME reçoit un numéro de
// fiche dédié (« C-FORM-AAAA-NNNN », espace disjoint des mouvements) et le mode
// FORMATION — sans quoi le CERFA affichait l'id technique et restait OFFICIEL.
// Vérifié à l'IDENTIQUE contre DemoStore ET LocalStore (parité).
verifier('un contrôle autonome reçoit un numéro C-FORM- et le mode FORMATION',
  /^C-FORM-\d{4}-\d{4}$/.test(controleFuite.numero)
  && controleFuite.mode === 'FORMATION');

// R4 : un CONFORME SANS réparation tracée ne referme PAS la fuite
// (durcissement — avant ce lot, n'importe quel CONFORME suffisait).
await store.createControle({
  machineId: machineB.id, resultat: 'CONFORME', methode: 'DIRECTE',
  operateur: 'Testeur Contrat', prochainControle: prochain
});
verifier('R4 : un CONFORME sans réparation tracée NE remet PAS la machine en service',
  (await store.getMachines()).find((m) => m.id === machineB.id)
    .statut === 'FUITE');

// Bouteille DÉDIÉE à ces essais R3/R4/R5 (jamais b1 : ses valeurs sont
// attendues EXACTES plus loin — retour fournisseur §13).
const bAppointFuite = await store.createBouteille({
  type: 'NEUVE', fluide: FLUIDE, tareKg: 5, masseBruteKg: 25,
  contenanceMaxKg: 20
});

// R3c : CHARGE_APPOINT bloqué tant que la fuite reste ouverte (pas de
// réparation tracée) — MISE_EN_SERVICE n'est PAS concernée par ce blocage.
const mvtAppointBloque = await store.creerMouvement({
  type: 'CHARGE_APPOINT', machineId: machineB.id, bouteilleSrcId: bAppointFuite.id,
  peseeAvantKg: 20, peseeApresKg: 19, technicien: 'Testeur Contrat'
});
await store.soumettreMouvement(mvtAppointBloque.id);
await verifierRejet(
  'R3c : CHARGE_APPOINT refusé sur une machine à fuite ouverte',
  store.validerMouvement(mvtAppointBloque.id, enseignant.id),
  'Tracez la réparation');
// Rejette (SOUMIS → BROUILLON) puis supprime : un mouvement refusé par la
// garde métier reste SOUMIS (validerMouvement a throw AVANT de sceller).
await store.rejeterMouvement(mvtAppointBloque.id, 'Nettoyage test contrat (R3c)');
await store.supprimerMouvement(mvtAppointBloque.id);

// R3/R4 : tracerReparation — champs obligatoires, résultat FUITE requis
await verifierRejet('tracerReparation refuse un contrôle introuvable',
  store.tracerReparation('ctl-fantome', {
    dateReparation: dateRelative(-1), natureReparation: 'Test',
    reparateur: 'Testeur Contrat'
  }));
await verifierRejet('tracerReparation refuse un contrôle non-FUITE',
  store.tracerReparation((await store.getControles())
    .find((c) => c.machineId === machineB.id && c.resultat === 'CONFORME').id, {
    dateReparation: dateRelative(-1), natureReparation: 'Test',
    reparateur: 'Testeur Contrat'
  }));
await verifierRejet('tracerReparation refuse une réparation incomplète',
  store.tracerReparation(controleFuite.id, { dateReparation: dateRelative(-1) }));

// R4 : réparation datée D'HIER — le CONFORME de suivi (aujourd'hui) lui
// est postérieur et refermera la fuite (le cas MÊME JOUR est éprouvé
// plus bas, section 13 quinquies).
const reparation = await store.tracerReparation(controleFuite.id, {
  dateReparation: dateRelative(-1), natureReparation: 'Remplacement raccord',
  reparateur: 'Testeur Contrat'
});
verifier('tracerReparation pose les 3 champs sur le contrôle',
  reparation.dateReparation === dateRelative(-1)
  && reparation.natureReparation === 'Remplacement raccord'
  && reparation.reparateur === 'Testeur Contrat');
verifier('tracerReparation NE remet PAS la machine en service (R4)',
  (await store.getMachines()).find((m) => m.id === machineB.id)
    .statut === 'FUITE');

// R4 : une fois réparée (tracée), l'alerte devient IMPORTANT « contrôle de
// suivi à faire » — elle n'est plus CRITIQUE « fuite non résolue ».
{
  const alertesApresReparation = await store.getAlertes();
  const alerteMachineB = alertesApresReparation.find(
    (a) => a.id === `alr-fuite-${machineB.id}`);
  verifier('R4 : alerte « contrôle de suivi à faire » (IMPORTANT) après réparation tracée',
    alerteMachineB?.niveau === 'IMPORTANT'
    && alerteMachineB?.titre === 'Contrôle de suivi à faire');
}

// R3a : la réparation tracée débloque le CHARGE_APPOINT (fuite plus « ouverte »)
const mvtAppointDebloque = await store.creerMouvement({
  type: 'CHARGE_APPOINT', machineId: machineB.id, bouteilleSrcId: bAppointFuite.id,
  peseeAvantKg: 20, peseeApresKg: 19, technicien: 'Testeur Contrat'
});
await store.soumettreMouvement(mvtAppointDebloque.id);
const mvtAppointValide = await store.validerMouvement(mvtAppointDebloque.id, enseignant.id);
verifier('R3a : CHARGE_APPOINT accepté une fois la réparation tracée',
  PROCHE(mvtAppointValide.quantiteKg, 1));

// R4 : un CONFORME postérieur À LA RÉPARATION referme enfin la fuite
await store.createControle({
  machineId: machineB.id, resultat: 'CONFORME', methode: 'DIRECTE',
  operateur: 'Testeur Contrat', prochainControle: prochain
});
verifier('R4 : un CONFORME postérieur à la réparation remet la machine en service',
  (await store.getMachines()).find((m) => m.id === machineB.id)
    .statut === 'EN_SERVICE');

// R5 : la localisation de la fuite déclarée dans mouvement.controle (étape
// 5 du wizard) est propagée jusqu'au VRAI contrôle enregistré par CR-3.
const mvtNouvelleFuite = await store.creerMouvement({
  type: 'CHARGE_APPOINT', machineId: machineB.id, bouteilleSrcId: bAppointFuite.id,
  // P0-6 (I-1) : fuite datée d'hier pour que la réparation d'hier et le
  // CONFORME de nettoyage d'aujourd'hui (J+1) restent valides.
  date: dateRelative(-1),
  peseeAvantKg: 19, peseeApresKg: 18.5, technicien: 'Testeur Contrat',
  controle: { statutControle: 'FUITE', detecteurId: null,
    localisationFuite: 'Vanne HP' }
});
await store.soumettreMouvement(mvtNouvelleFuite.id);
const mvtNouvelleFuiteValide =
  await store.validerMouvement(mvtNouvelleFuite.id, enseignant.id);
{
  const controleLie = (await store.getControles())
    .find((c) => c.id === mvtNouvelleFuiteValide.controle?.controleId);
  verifier('R5 : le contrôle CR-3 porte la localisation déclarée dans le mouvement',
    controleLie?.localisationFuite === 'Vanne HP');
}
// Nettoyage : referme cette seconde fuite (réparation + CONFORME) pour ne
// pas polluer les sections suivantes (démantèlement, etc. attendent
// EN_SERVICE).
const controleFuite2 = (await store.getControles())
  .find((c) => c.id === mvtNouvelleFuiteValide.controle?.controleId);
await store.tracerReparation(controleFuite2.id, {
  dateReparation: dateRelative(-1), natureReparation: 'Remplacement vanne',
  reparateur: 'Testeur Contrat'
});
await store.createControle({
  machineId: machineB.id, resultat: 'CONFORME', methode: 'DIRECTE',
  operateur: 'Testeur Contrat', prochainControle: prochain
});
verifier('R5 : nettoyage — machine EN_SERVICE après la seconde réparation',
  (await store.getMachines()).find((m) => m.id === machineB.id)
    .statut === 'EN_SERVICE');

await verifierRejet('createControle refuse un résultat inconnu',
  store.createControle({ machineId: machineB.id, resultat: 'MOYEN' }));
await verifierRejet('createControle refuse une machine introuvable',
  store.createControle({ machineId: 'mac-fantome', resultat: 'CONFORME' }));
await verifierRejet('demantelerMachine refuse une machine chargée (> 0,05)',
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
// Lot B2 : le numéro du suivi INTERNE est attribué par le logiciel
// (SIF-AAAA-NNNN, unique) — la suite reste rejouable contre un store
// persistant sans préfixe fabriqué, et l'unicité n'est plus notre affaire.
const bsff1 = await store.createBsff({
  bouteilleId: bR.id,
  transporteur: 'Transports du Sud', installationDestination: 'Récupfluides SA',
  masseRemiseKg: 0.5
});
verifier('createBsff attribue un numéro de suivi interne bien formé',
  /^SIF-\d{4}-\d{4}$/.test(bsff1.numeroBsff), String(bsff1.numeroBsff));
verifier('remise PARTIELLE : le reliquat reste en déchet (1,0 kg)',
  PROCHE((await store.getBouteilles()).find((b) => b.id === bR.id).masseNetteKg, 1)
  && (await store.getBouteilles()).find((b) => b.id === bR.id).statut === 'DECHET');
const bsff2 = await store.createBsff({
  bouteilleId: bR.id, masseRemiseKg: 1
});
verifier('remise TOTALE : bouteille vidée et RETOURNEE',
  PROCHE((await store.getBouteilles()).find((b) => b.id === bR.id).masseNetteKg, 0)
  && (await store.getBouteilles()).find((b) => b.id === bR.id)
    .statut === 'RETOURNEE');
verifier('getBsff trace les deux suivis de remise en filière',
  (await store.getBsff()).filter((x) =>
    x.id === bsff1.id || x.id === bsff2.id).length === 2);
verifier('le numéro de BSFF est reporté sur la bouteille',
  (await store.getBouteilles()).find((b) => b.id === bR.id).numBsff?.length > 0);

// P0-8 (DA-2) : issue de traitement final d'un suivi de remise en filière
// (corrige « remise en filière ≠ destruction »)
await verifierRejet('attesterIssueBsff refuse un suivi introuvable',
  store.attesterIssueBsff('BSFF-INEXISTANT',
    { issueTraitement: 'DESTRUCTION', installationTraitement: 'X' }),
  'introuvable');
await verifierRejet('attesterIssueBsff refuse une issue hors grille',
  store.attesterIssueBsff(bsff1.id,
    { issueTraitement: 'BROYAGE', installationTraitement: 'X' }));
await verifierRejet('attesterIssueBsff exige l’installation pour une destruction',
  store.attesterIssueBsff(bsff1.id, { issueTraitement: 'DESTRUCTION' }),
  'Installation');
await verifierRejet('attesterIssueBsff exige l’installation pour une régénération',
  store.attesterIssueBsff(bsff1.id, { issueTraitement: 'REGENERATION' }),
  'Installation');
{
  const atteste = await store.attesterIssueBsff(bsff1.id, {
    issueTraitement: 'DESTRUCTION',
    installationTraitement: 'Incinérateur agréé de Fos',
    certificatTraitement: 'CERT-2026-42', operateur: 'Testeur Contrat'
  });
  verifier('attesterIssueBsff pose issue + installation + certificat + date',
    atteste.issueTraitement === 'DESTRUCTION'
    && atteste.installationTraitement === 'Incinérateur agréé de Fos'
    && atteste.certificatTraitement === 'CERT-2026-42'
    && DATE_JOUR.test(atteste.dateTraitement));
  const relu = (await store.getBsff()).find((x) => x.id === bsff1.id);
  verifier('l’issue attestée est persistée et relue par getBsff',
    relu && relu.issueTraitement === 'DESTRUCTION'
    && relu.installationTraitement === 'Incinérateur agréé de Fos');
  const reAtteste = await store.attesterIssueBsff(bsff1.id,
    { issueTraitement: 'AUTRE', operateur: 'Testeur Contrat' });
  verifier('ré-attestation autorisée (AUTRE sans installation, correction)',
    reAtteste.issueTraitement === 'AUTRE'
    && reAtteste.installationTraitement === null);
}

// P0-8 (DA-3) : cession de fluide à un tiers attesté (rubrique 10, fin du 0 en dur)
const bCession = await store.createBouteille({
  type: 'NEUVE', fluide: FLUIDE, tareKg: 10, masseBruteKg: 18, contenanceMaxKg: 12
});
await verifierRejet('createCession refuse un destinataire hors grille',
  store.createCession({ bouteilleId: bCession.id, destinataireType: 'AMI',
    destinataireRaisonSociale: 'X', masseKg: 1 }));
await verifierRejet('createCession exige la raison sociale du destinataire',
  store.createCession({ bouteilleId: bCession.id,
    destinataireType: 'DISTRIBUTEUR', destinataireRaisonSociale: '  ',
    masseKg: 1 }), 'Raison sociale');
await verifierRejet('createCession refuse une masse supérieure au contenu',
  store.createCession({ bouteilleId: bCession.id,
    destinataireType: 'DISTRIBUTEUR', destinataireRaisonSociale: 'Clim Sud',
    masseKg: 999 }));
{
  const cession = await store.createCession({
    bouteilleId: bCession.id, destinataireType: 'OPERATEUR_ATTESTE',
    destinataireRaisonSociale: 'Régé-Fluides SAS', masseKg: 3,
    operateur: 'Testeur Contrat'
  });
  verifier('createCession trace la cession (destinataire, type, masse, date)',
    cession.destinataireType === 'OPERATEUR_ATTESTE'
    && cession.destinataireRaisonSociale === 'Régé-Fluides SAS'
    && PROCHE(cession.masseKg, 3) && DATE_JOUR.test(cession.date));
  verifier('la cession décrémente la bouteille (8 → 5 kg)',
    PROCHE((await store.getBouteilles()).find((b) => b.id === bCession.id)
      .masseNetteKg, 5));
  verifier('getCessions liste la cession créée',
    (await store.getCessions()).some((c) => c.id === cession.id));
}
{
  // Un déchet part par une remise en filière, jamais par une cession.
  const bDechetCession = await store.createBouteille({
    type: 'RECUPERATION', fluide: FLUIDE, tareKg: 5, masseBruteKg: 8,
    contenanceMaxKg: 10
  });
  await store.deciderFluideRecupere(bDechetCession.id, 'DECHET', 'Testeur');
  await verifierRejet('createCession refuse une bouteille déchet (→ remise en filière)',
    store.createCession({ bouteilleId: bDechetCession.id,
      destinataireType: 'DISTRIBUTEUR', destinataireRaisonSociale: 'X',
      masseKg: 1 }), 'remise en filière');
}

// P0-8 (DA-5) : getDeclarationAnnuelle — câblage store → module pur (11 rubriques)
{
  const ANNEE_DECL = Number((await store.getCessions())[0].date.slice(0, 4));
  const declaration = await store.getDeclarationAnnuelle(ANNEE_DECL);
  verifier('getDeclarationAnnuelle : structure { annee, lignes, anomalies, complet }',
    declaration.annee === ANNEE_DECL && Array.isArray(declaration.lignes)
    && Array.isArray(declaration.anomalies)
    && typeof declaration.complet === 'boolean');
  const ligneFluide = declaration.lignes.find((l) => l.fluide === FLUIDE);
  verifier('getDeclarationAnnuelle : la cession créée alimente la rubrique 10',
    ligneFluide && ligneFluide.cessionsKg >= 3 - 1e-9);
  verifier('getDeclarationAnnuelle : chaque ligne porte les rubriques attendues',
    ligneFluide && 'acquisitionsKg' in ligneFluide
    && 'chargesNeufKg' in ligneFluide && 'destructionKg' in ligneFluide
    && 'stockFinDechetKg' in ligneFluide);
}

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
// IM-5 durci (brique ②) : plus de pesée sur une bouteille sortie du stock
// (une masse réécrite APRÈS le départ physique fausserait l'audit).
await verifierRejet('peserBouteille refuse une bouteille sortie du stock',
  store.peserBouteille(b1.id, 12, 'Testeur'), 'sortie du stock');

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
// 13 ter. Cycle du fluide (lot F-Gas R1 + R2 + R6) : blocage du
// croisement recup→vierge, bouteille MELANGE, ventilation CERFA
// ============================================================
const AUTRE_FLUIDE = fluides.find((f) => f.code !== FLUIDE)?.code;
verifier('le référentiel offre un second fluide pour éprouver le croisement',
  Boolean(AUTRE_FLUIDE));

// --- R1 : transfert recup → vierge/neuve BLOQUÉ ------------------------
{
  const bNeuve = await store.createBouteille({
    type: 'NEUVE', fluide: FLUIDE, tareKg: 5, masseBruteKg: 5,
    contenanceMaxKg: 10
  });
  const bRecup = await store.createBouteille({
    type: 'RECUPERATION', fluide: FLUIDE, tareKg: 5, masseBruteKg: 8,
    contenanceMaxKg: 10
  });
  const transfertInterdit = await store.creerMouvement({
    type: 'TRANSFERT', bouteilleSrcId: bRecup.id, bouteilleDstId: bNeuve.id,
    peseeAvantKg: 8, peseeApresKg: 6, technicien: 'Testeur Contrat'
  });
  await store.soumettreMouvement(transfertInterdit.id);
  await verifierRejet('R1 : transfert fluide récupéré → bouteille neuve/vierge BLOQUÉ',
    store.validerMouvement(transfertInterdit.id, enseignant.id),
    'Transfert interdit');

  // R1 (contrôle) : transfert vierge → vierge reste AUTORISÉ (déjà couvert
  // section 13 bis, b2 → b3) ; transfert recup → RECUPERATION même fluide
  // (regroupement de fonds) reste AUTORISÉ.
  const bRecup2 = await store.createBouteille({
    type: 'RECUPERATION', fluide: FLUIDE, tareKg: 5, masseBruteKg: 5,
    contenanceMaxKg: 10
  });
  const regroupement = await store.creerMouvement({
    type: 'TRANSFERT', bouteilleSrcId: bRecup.id, bouteilleDstId: bRecup2.id,
    peseeAvantKg: 8, peseeApresKg: 6, technicien: 'Testeur Contrat'
  });
  await store.soumettreMouvement(regroupement.id);
  const valideRegroupement =
    await store.validerMouvement(regroupement.id, enseignant.id);
  verifier('R1 : transfert récupéré → RECUPÉRATION même fluide AUTORISÉ (regroupement)',
    PROCHE(valideRegroupement.quantiteKg, 2));
}

// --- R2 : bouteille MELANGE ---------------------------------------------
await verifierRejet('createBouteille refuse MELANGE hors type RÉCUPÉRATION',
  store.createBouteille({
    type: 'NEUVE', fluide: FLUIDE, etatFluide: 'MELANGE', tareKg: 5,
    masseBruteKg: 5, contenanceMaxKg: 10
  }),
  'MÉLANGE');
{
  const bMelange = await store.createBouteille({
    type: 'RECUPERATION', fluide: FLUIDE, etatFluide: 'MELANGE',
    tareKg: 5, masseBruteKg: 8, contenanceMaxKg: 20
  });
  verifier('createBouteille MELANGE : composition AMORCÉE avec le contenu initial (3 kg, étiquette)',
    bMelange.etatFluide === 'MELANGE' &&
    Array.isArray(bMelange.compositionMelange) &&
    bMelange.compositionMelange.length === 1 &&
    bMelange.compositionMelange[0].fluide === FLUIDE &&
    PROCHE(bMelange.compositionMelange[0].quantiteKg, 3) &&
    bMelange.compositionMelange[0].mouvementId === null);

  // Machine de l'AUTRE fluide : récupération croisée vers la MELANGE.
  const machineAutreFluide = await store.createMachine({
    designation: 'Machine croisement du contrat', fluide: AUTRE_FLUIDE,
    chargeNominaleKg: 5, operateur: 'Testeur Contrat'
  });
  const mise = await store.creerMouvement({
    type: 'MISE_EN_SERVICE', machineId: machineAutreFluide.id,
    bouteilleSrcId: (await store.createBouteille({
      type: 'NEUVE', fluide: AUTRE_FLUIDE, tareKg: 5, masseBruteKg: 10,
      contenanceMaxKg: 10
    })).id,
    peseeAvantKg: 10, peseeApresKg: 5, technicien: 'Testeur Contrat'
  });
  await store.soumettreMouvement(mise.id);
  await store.validerMouvement(mise.id, enseignant.id);

  const recupCroisee = await store.creerMouvement({
    type: 'RECUPERATION_MAINTENANCE', machineId: machineAutreFluide.id,
    bouteilleDstId: bMelange.id, peseeAvantKg: 6, peseeApresKg: 8,
    technicien: 'Testeur Contrat'
  });
  await store.soumettreMouvement(recupCroisee.id);
  const valideCroisee =
    await store.validerMouvement(recupCroisee.id, enseignant.id);
  verifier('R2 : récupération d’un AUTRE fluide dans une bouteille MELANGE AUTORISÉE',
    PROCHE(valideCroisee.quantiteKg, -2));

  const bMelangeApres = (await store.getBouteilles())
    .find((b) => b.id === bMelange.id);
  verifier('R2 : le versement croisé est tracé (fluide, quantité, date)',
    Array.isArray(bMelangeApres.compositionMelange) &&
    bMelangeApres.compositionMelange.length === 2 &&
    bMelangeApres.compositionMelange[1].fluide === AUTRE_FLUIDE &&
    PROCHE(bMelangeApres.compositionMelange[1].quantiteKg, 2));
  verifier('R2 : l’étiquette NE bascule PAS — le contenu initial (3 kg) reste majoritaire',
    bMelangeApres.fluide === FLUIDE);

  // Second versement croisé (2 kg de plus) : l'AUTRE fluide devient
  // majoritaire (4 kg > 3 kg) → l'étiquette bascule ENFIN.
  const recupCroisee2 = await store.creerMouvement({
    type: 'RECUPERATION_MAINTENANCE', machineId: machineAutreFluide.id,
    bouteilleDstId: bMelange.id, peseeAvantKg: 8, peseeApresKg: 10,
    technicien: 'Testeur Contrat'
  });
  await store.soumettreMouvement(recupCroisee2.id);
  await store.validerMouvement(recupCroisee2.id, enseignant.id);
  const bMelangeApres2 = (await store.getBouteilles())
    .find((b) => b.id === bMelange.id);
  verifier('R2 : l’étiquette bascule quand l’autre fluide devient MAJORITAIRE (4 kg > 3 kg)',
    bMelangeApres2.fluide === AUTRE_FLUIDE &&
    bMelangeApres2.compositionMelange.length === 3);

  // R1 (contrôle croisé) : croisement de fluide INTERDIT vers toute AUTRE
  // bouteille de récupération non-MELANGE (règle inchangée).
  const bRecupOrdinaire = await store.createBouteille({
    type: 'RECUPERATION', fluide: FLUIDE, tareKg: 5, masseBruteKg: 5,
    contenanceMaxKg: 10
  });
  const machineFluide = await store.createMachine({
    designation: 'Machine ordinaire du contrat', fluide: FLUIDE,
    chargeNominaleKg: 5, operateur: 'Testeur Contrat'
  });
  const miseOrdinaire = await store.creerMouvement({
    type: 'MISE_EN_SERVICE', machineId: machineFluide.id,
    bouteilleSrcId: (await store.createBouteille({
      type: 'NEUVE', fluide: FLUIDE, tareKg: 5, masseBruteKg: 8,
      contenanceMaxKg: 10
    })).id,
    peseeAvantKg: 8, peseeApresKg: 6, technicien: 'Testeur Contrat'
  });
  await store.soumettreMouvement(miseOrdinaire.id);
  await store.validerMouvement(miseOrdinaire.id, enseignant.id);
  const machineAutreFluide2 = await store.createMachine({
    designation: 'Machine croisement 2 du contrat', fluide: AUTRE_FLUIDE,
    chargeNominaleKg: 5, operateur: 'Testeur Contrat'
  });
  const miseAutre2 = await store.creerMouvement({
    type: 'MISE_EN_SERVICE', machineId: machineAutreFluide2.id,
    bouteilleSrcId: (await store.createBouteille({
      type: 'NEUVE', fluide: AUTRE_FLUIDE, tareKg: 5, masseBruteKg: 8,
      contenanceMaxKg: 10
    })).id,
    peseeAvantKg: 8, peseeApresKg: 6, technicien: 'Testeur Contrat'
  });
  await store.soumettreMouvement(miseAutre2.id);
  await store.validerMouvement(miseAutre2.id, enseignant.id);
  const recupInterdite = await store.creerMouvement({
    type: 'RECUPERATION_MAINTENANCE', machineId: machineAutreFluide2.id,
    bouteilleDstId: bRecupOrdinaire.id, peseeAvantKg: 6, peseeApresKg: 7,
    technicien: 'Testeur Contrat'
  });
  await store.soumettreMouvement(recupInterdite.id);
  await verifierRejet('R2 (contrôle) : croisement toujours interdit vers une RÉCUPÉRATION non-MELANGE',
    store.validerMouvement(recupInterdite.id, enseignant.id),
    'Croisement de fluides interdit');
}

// ============================================================
// 13 quater. Cohérences transverses (audit V3) : contre-écriture sur
// bouteille sortie du stock, machine DÉMANTELÉE bloquée dur
// ============================================================

// --- Contre-écriture bloquée si la bouteille est sortie du stock -------
{
  const machineCE = await store.createMachine({
    designation: 'Machine contre-écriture du contrat', fluide: FLUIDE,
    chargeNominaleKg: 8, operateur: 'Testeur Contrat'
  });
  const bSourceCE = await store.createBouteille({
    type: 'NEUVE', fluide: FLUIDE, tareKg: 5, masseBruteKg: 11,
    contenanceMaxKg: 10
  });
  const chargeCE = await store.creerMouvement({
    type: 'MISE_EN_SERVICE', machineId: machineCE.id,
    bouteilleSrcId: bSourceCE.id,
    peseeAvantKg: 6, peseeApresKg: 3, technicien: 'Testeur Contrat'
  });
  await store.soumettreMouvement(chargeCE.id);
  const chargeCEValidee =
    await store.validerMouvement(chargeCE.id, enseignant.id);
  verifier('V3 (préparation) : charge validée (+3 kg) avant vidage de la bouteille',
    PROCHE(chargeCEValidee.quantiteKg, 3));

  // La bouteille source se vide ensuite (transfert du reliquat) puis sort
  // du stock (retour fournisseur) — statut courant modifié APRÈS la charge.
  const bDstVidage = await store.createBouteille({
    type: 'NEUVE', fluide: FLUIDE, tareKg: 5, masseBruteKg: 5,
    contenanceMaxKg: 10
  });
  const bSourceCEApresCharge = (await store.getBouteilles())
    .find((b) => b.id === bSourceCE.id);
  const vidage = await store.creerMouvement({
    type: 'TRANSFERT', bouteilleSrcId: bSourceCE.id,
    bouteilleDstId: bDstVidage.id,
    peseeAvantKg: bSourceCEApresCharge.masseNetteKg, peseeApresKg: 0,
    technicien: 'Testeur Contrat'
  });
  await store.soumettreMouvement(vidage.id);
  await store.validerMouvement(vidage.id, enseignant.id);
  await store.retournerFournisseur(bSourceCE.id, 'Testeur Contrat');
  const bSourceRetournee = (await store.getBouteilles())
    .find((b) => b.id === bSourceCE.id);
  verifier('V3 (préparation) : la bouteille source est bien RETOURNEE',
    bSourceRetournee.statut === 'RETOURNEE');

  await verifierRejet(
    'V3 : contre-écriture BLOQUÉE — la bouteille source a quitté le stock',
    store.annulerParContreEcriture(chargeCE.id,
      'Erreur de saisie (test contrat)', enseignant.id),
    'Contre-écriture impossible');

  const machineApresRejet = (await store.getMachines())
    .find((m) => m.id === machineCE.id);
  const chargeApresRejet = (await store.getMouvements())
    .find((mv) => mv.id === chargeCE.id);
  verifier('V3 : après le refus, l’écriture d’origine reste VALIDÉE (pas de mutation partielle)',
    chargeApresRejet.statut === 'VALIDE');
  verifier('V3 : après le refus, la charge machine reste intacte',
    PROCHE(machineApresRejet.chargeActuelleKg, 3));
}

// --- Machine DÉMANTELÉE : blocage dur de tout mouvement -----------------
{
  const machineDem = await store.createMachine({
    designation: 'Machine à démanteler du contrat', fluide: FLUIDE,
    chargeNominaleKg: 5, operateur: 'Testeur Contrat'
  });
  verifier('V3 (préparation) : machine neuve démantelable (charge nulle)',
    (await store.demantelerMachine(machineDem.id, 'Testeur Contrat'))
      .statut === 'DEMANTELEE');

  const bSourceDem = await store.createBouteille({
    type: 'NEUVE', fluide: FLUIDE, tareKg: 5, masseBruteKg: 8,
    contenanceMaxKg: 10
  });
  const miseSurDemantelee = await store.creerMouvement({
    type: 'MISE_EN_SERVICE', machineId: machineDem.id,
    bouteilleSrcId: bSourceDem.id,
    peseeAvantKg: 3, peseeApresKg: 1, technicien: 'Testeur Contrat'
  });
  await store.soumettreMouvement(miseSurDemantelee.id);
  await verifierRejet(
    'V3 : mouvement BLOQUÉ sur une machine DÉMANTELÉE (charge)',
    store.validerMouvement(miseSurDemantelee.id, enseignant.id),
    'démantelée');

  const bDstDem = await store.createBouteille({
    type: 'RECUPERATION', fluide: FLUIDE, tareKg: 5, masseBruteKg: 5,
    contenanceMaxKg: 10
  });
  const recupSurDemantelee = await store.creerMouvement({
    type: 'RECUPERATION_MAINTENANCE', machineId: machineDem.id,
    bouteilleDstId: bDstDem.id,
    peseeAvantKg: 0, peseeApresKg: 1, technicien: 'Testeur Contrat'
  });
  await store.soumettreMouvement(recupSurDemantelee.id);
  await verifierRejet(
    'V3 : mouvement BLOQUÉ sur une machine DÉMANTELÉE (récupération)',
    store.validerMouvement(recupSurDemantelee.id, enseignant.id),
    'démantelée');
}

// ============================================================
// 13 quinquies. Lot métier F-Gas (2e passe) : R1 étendu au type NEUVE,
// confinement du mélange (charge et transfert), contre-écritures sur
// bouteille MELANGE / VIDE / A_RETOURNER, fuite réparée le même jour
// ============================================================

// --- R1 étendu : récupéré → bouteille NEUVE même non-VIERGE, BLOQUÉ ----
{
  const bNeuveRecyclee = await store.createBouteille({
    type: 'NEUVE', fluide: FLUIDE, etatFluide: 'RECYCLE', tareKg: 5,
    masseBruteKg: 5, contenanceMaxKg: 10
  });
  const bRecupSrc = await store.createBouteille({
    type: 'RECUPERATION', fluide: FLUIDE, tareKg: 5, masseBruteKg: 9,
    contenanceMaxKg: 10
  });
  const transfertNeuve = await store.creerMouvement({
    type: 'TRANSFERT', bouteilleSrcId: bRecupSrc.id,
    bouteilleDstId: bNeuveRecyclee.id,
    peseeAvantKg: 4, peseeApresKg: 3, technicien: 'Testeur Contrat'
  });
  await store.soumettreMouvement(transfertNeuve.id);
  await verifierRejet(
    'R1 étendu : transfert récupéré → bouteille NEUVE (état RECYCLE) BLOQUÉ',
    store.validerMouvement(transfertNeuve.id, enseignant.id),
    'Transfert interdit');
  await store.rejeterMouvement(transfertNeuve.id, 'Nettoyage (R1 étendu)');
  await store.supprimerMouvement(transfertNeuve.id);
}

// --- R2 : le mélange ne recharge rien et reste confiné ------------------
{
  // Bouteille MELANGE avec 3 kg de contenu initial, étiquetée FLUIDE.
  const bMelSrc = await store.createBouteille({
    type: 'RECUPERATION', fluide: FLUIDE, etatFluide: 'MELANGE',
    tareKg: 5, masseBruteKg: 8, contenanceMaxKg: 20
  });

  // (a) recharge d'une installation depuis la MELANGE : BLOQUÉE.
  const machineMel = await store.createMachine({
    designation: 'Machine mélange du contrat', fluide: FLUIDE,
    chargeNominaleKg: 5, operateur: 'Testeur Contrat'
  });
  const chargeMel = await store.creerMouvement({
    type: 'CHARGE_APPOINT', machineId: machineMel.id,
    bouteilleSrcId: bMelSrc.id, peseeAvantKg: 3, peseeApresKg: 2,
    technicien: 'Testeur Contrat'
  });
  await store.soumettreMouvement(chargeMel.id);
  await verifierRejet(
    'R2 : CHARGE_APPOINT depuis une bouteille MELANGE BLOQUÉ (contenu incertain)',
    store.validerMouvement(chargeMel.id, enseignant.id),
    'probablement mélangé');
  await store.rejeterMouvement(chargeMel.id, 'Nettoyage (R2 charge)');
  await store.supprimerMouvement(chargeMel.id);

  // (b) transfert MELANGE → bouteille de récupération ordinaire : BLOQUÉ
  // (le caractère « probablement mélangé » ne doit pas se blanchir).
  const bRecupPropre = await store.createBouteille({
    type: 'RECUPERATION', fluide: FLUIDE, tareKg: 5, masseBruteKg: 5,
    contenanceMaxKg: 10
  });
  const evasionMel = await store.creerMouvement({
    type: 'TRANSFERT', bouteilleSrcId: bMelSrc.id,
    bouteilleDstId: bRecupPropre.id,
    peseeAvantKg: 3, peseeApresKg: 2, technicien: 'Testeur Contrat'
  });
  await store.soumettreMouvement(evasionMel.id);
  await verifierRejet(
    'R2 : transfert MELANGE → bouteille non-MELANGE BLOQUÉ (le mélange reste confiné)',
    store.validerMouvement(evasionMel.id, enseignant.id),
    'probablement mélangé');
  await store.rejeterMouvement(evasionMel.id, 'Nettoyage (R2 transfert)');
  await store.supprimerMouvement(evasionMel.id);

  // (c) transfert MELANGE → MELANGE (regroupement de fonds) : AUTORISÉ,
  // versement tracé chez la destination, étiquette recalculée.
  const bMelDst = await store.createBouteille({
    type: 'RECUPERATION', fluide: AUTRE_FLUIDE, etatFluide: 'MELANGE',
    tareKg: 5, masseBruteKg: 5, contenanceMaxKg: 20
  });
  const regroupMel = await store.creerMouvement({
    type: 'TRANSFERT', bouteilleSrcId: bMelSrc.id, bouteilleDstId: bMelDst.id,
    peseeAvantKg: 3, peseeApresKg: 2, technicien: 'Testeur Contrat'
  });
  await store.soumettreMouvement(regroupMel.id);
  const regroupValide =
    await store.validerMouvement(regroupMel.id, enseignant.id);
  verifier('R2 : transfert MELANGE → MELANGE AUTORISÉ (regroupement, 1 kg)',
    PROCHE(regroupValide.quantiteKg, 1));
  {
    const dst = (await store.getBouteilles()).find((b) => b.id === bMelDst.id);
    verifier('R2 : versement du regroupement tracé, étiquette recalculée (1 kg > 0 kg initial)',
      dst.fluide === FLUIDE &&
      dst.compositionMelange.some((v) => v.mouvementId === regroupMel.id));
  }

  // (d) contre-écriture : le versement annulé SORT de la composition,
  // l'étiquette d'origine REVIENT, la source ne gagne AUCUNE ligne
  // fantôme au reversement.
  await store.annulerParContreEcriture(regroupMel.id,
    'Erreur de saisie (test contrat R2)', enseignant.id);
  {
    const dst = (await store.getBouteilles()).find((b) => b.id === bMelDst.id);
    const src = (await store.getBouteilles()).find((b) => b.id === bMelSrc.id);
    verifier('R2 : contre-écriture — versement retiré et étiquette d’origine restaurée',
      dst.fluide === AUTRE_FLUIDE && PROCHE(dst.masseNetteKg, 0) &&
      !dst.compositionMelange.some((v) => v.mouvementId === regroupMel.id));
    verifier('R2 : contre-écriture — la source MELANGE reprend sa masse SANS versement fantôme',
      PROCHE(src.masseNetteKg, 3) && src.compositionMelange.length === 1);
  }
}

// --- Contre-écriture sur bouteille passée VIDE / A_RETOURNER ------------
{
  // A_RETOURNER : une charge vide une bouteille NEUVE consignée → statut
  // automatique (CF-5). La contre-écriture doit RESTER possible (unique
  // voie de correction du registre WORM) : le reversement remet EN_STOCK.
  const machineCE2 = await store.createMachine({
    designation: 'Machine contre-écriture 2 du contrat', fluide: FLUIDE,
    chargeNominaleKg: 5, operateur: 'Testeur Contrat'
  });
  const bConsignee = await store.createBouteille({
    type: 'NEUVE', fluide: FLUIDE, tareKg: 5, masseBruteKg: 7,
    contenanceMaxKg: 10, proprietaire: 'Fournigaz'
  });
  const chargeVidante = await store.creerMouvement({
    type: 'CHARGE_APPOINT', machineId: machineCE2.id,
    bouteilleSrcId: bConsignee.id, peseeAvantKg: 2, peseeApresKg: 0,
    technicien: 'Testeur Contrat'
  });
  await store.soumettreMouvement(chargeVidante.id);
  await store.validerMouvement(chargeVidante.id, enseignant.id);
  verifier('CF-5 (préparation) : la bouteille consignée vidée passe A_RETOURNER',
    (await store.getBouteilles()).find((b) => b.id === bConsignee.id)
      .statut === 'A_RETOURNER');
  await store.annulerParContreEcriture(chargeVidante.id,
    'Erreur de saisie (test contrat A_RETOURNER)', enseignant.id);
  {
    const b = (await store.getBouteilles()).find((x) => x.id === bConsignee.id);
    verifier('contre-écriture ACCEPTÉE sur une bouteille A_RETOURNER — retour EN_STOCK (2 kg)',
      b.statut === 'EN_STOCK' && PROCHE(b.masseNetteKg, 2));
  }

  // VIDE : un transfert vide une bouteille de récupération (sans
  // propriétaire) → statut VIDE ; même exigence.
  const bRecupV = await store.createBouteille({
    type: 'RECUPERATION', fluide: FLUIDE, tareKg: 5, masseBruteKg: 6,
    contenanceMaxKg: 10
  });
  const bRecupV2 = await store.createBouteille({
    type: 'RECUPERATION', fluide: FLUIDE, tareKg: 5, masseBruteKg: 5,
    contenanceMaxKg: 10
  });
  const transfertVidant = await store.creerMouvement({
    type: 'TRANSFERT', bouteilleSrcId: bRecupV.id, bouteilleDstId: bRecupV2.id,
    peseeAvantKg: 1, peseeApresKg: 0, technicien: 'Testeur Contrat'
  });
  await store.soumettreMouvement(transfertVidant.id);
  await store.validerMouvement(transfertVidant.id, enseignant.id);
  verifier('CF-5 (préparation) : la bouteille vidée par transfert passe VIDE',
    (await store.getBouteilles()).find((b) => b.id === bRecupV.id)
      .statut === 'VIDE');
  await store.annulerParContreEcriture(transfertVidant.id,
    'Erreur de saisie (test contrat VIDE)', enseignant.id);
  {
    const b = (await store.getBouteilles()).find((x) => x.id === bRecupV.id);
    verifier('contre-écriture ACCEPTÉE sur une bouteille VIDE — retour EN_STOCK (1 kg)',
      b.statut === 'EN_STOCK' && PROCHE(b.masseNetteKg, 1));
  }
}

// --- Fuite : CONFORME de complaisance, puis réparation le MÊME JOUR -----
{
  const machineFuite2 = await store.createMachine({
    designation: 'Machine fuite même jour du contrat', fluide: FLUIDE,
    chargeNominaleKg: 5, operateur: 'Testeur Contrat'
  });
  const bSrcFuite = await store.createBouteille({
    type: 'NEUVE', fluide: FLUIDE, tareKg: 5, masseBruteKg: 10,
    contenanceMaxKg: 10
  });
  // Fuite déclarée il y a 5 jours, AUCUNE réparation tracée, puis un
  // CONFORME daté d'aujourd'hui (prématuré ou de complaisance) : la
  // fuite doit RESTER ouverte (R3c) et l'alerte RESTER « Fuite non
  // résolue » (R4) — jamais refermée par un contrôle seul.
  const ctlFuite2 = await store.createControle({
    machineId: machineFuite2.id, resultat: 'FUITE', methode: 'DIRECTE',
    date: dateRelative(-5), operateur: 'Testeur Contrat'
  });
  await store.createControle({
    machineId: machineFuite2.id, resultat: 'CONFORME', methode: 'DIRECTE',
    date: dateRelative(-4), operateur: 'Testeur Contrat'
  });
  const appointComplaisance = await store.creerMouvement({
    type: 'CHARGE_APPOINT', machineId: machineFuite2.id,
    bouteilleSrcId: bSrcFuite.id, peseeAvantKg: 5, peseeApresKg: 4,
    technicien: 'Testeur Contrat'
  });
  await store.soumettreMouvement(appointComplaisance.id);
  await verifierRejet(
    'R3c : un CONFORME postérieur SANS réparation tracée ne referme PAS la fuite',
    store.validerMouvement(appointComplaisance.id, enseignant.id),
    'Tracez la réparation');
  {
    const alerte = (await store.getAlertes())
      .find((a) => a.id === `alr-fuite-${machineFuite2.id}`);
    verifier('R4 : l’alerte reste CRITIQUE « Fuite non résolue » (pas de réparation tracée)',
      alerte?.niveau === 'CRITIQUE' && alerte?.titre === 'Fuite non résolue');
  }
  await store.rejeterMouvement(appointComplaisance.id, 'Nettoyage (R3c bis)');
  await store.supprimerMouvement(appointComplaisance.id);

  // P0-6 (audit 20/07, cas d'acceptation §11 — remplace la convention
  // « à date égale » de R4) : sur un équipement FIXE, un CONFORME daté
  // du JOUR de la réparation ne clôture PAS (24 h de fonctionnement
  // requises, dates au jour → J+1). Réparation antidatée d'hier :
  // le CONFORME du même jour (hier) reste sans effet, celui
  // d'aujourd'hui (J+1) referme.
  await store.tracerReparation(ctlFuite2.id, {
    dateReparation: dateRelative(-1), natureReparation: 'Brasure reprise',
    reparateur: 'Testeur Contrat'
  });
  await store.createControle({
    machineId: machineFuite2.id, resultat: 'CONFORME', methode: 'DIRECTE',
    date: dateRelative(-1), operateur: 'Testeur Contrat'
  });
  verifier('P0-6 : réparation + CONFORME le MÊME JOUR → la machine RESTE en FUITE',
    (await store.getMachines()).find((m) => m.id === machineFuite2.id)
      .statut === 'FUITE');
  {
    const alerte = (await store.getAlertes())
      .find((a) => a.id === `alr-fuite-${machineFuite2.id}`);
    verifier('P0-6 : l’alerte reste « Contrôle de suivi à faire » (IMPORTANT, échéance affichée)',
      alerte?.niveau === 'IMPORTANT'
      && alerte?.titre === 'Contrôle de suivi à faire');
  }
  await store.createControle({
    machineId: machineFuite2.id, resultat: 'CONFORME', methode: 'DIRECTE',
    date: dateRelative(0), operateur: 'Testeur Contrat'
  });
  verifier('P0-6 : CONFORME du LENDEMAIN de la réparation (J+1) → machine EN_SERVICE',
    (await store.getMachines()).find((m) => m.id === machineFuite2.id)
      .statut === 'EN_SERVICE');
  verifier('P0-6 : plus d’alerte fuite après la clôture à J+1',
    !(await store.getAlertes())
      .some((a) => a.id === `alr-fuite-${machineFuite2.id}`));
}

// --- P0-6 (CF-4) : type d'installation FIXE/MOBILE — exception mobile ---
{
  verifier('createMachine : typeInstallation par défaut = FIXE (conservateur)',
    machineA.typeInstallation === 'FIXE');
  await verifierRejet('createMachine refuse un type d’installation inconnu',
    store.createMachine({ designation: 'Machine roulante ?', fluide: FLUIDE,
      chargeNominaleKg: 2, typeInstallation: 'CAMION',
      operateur: 'Testeur Contrat' }), 'installation inconnu');

  // Équipement MOBILE listé : le contrôle immédiat après réparation est
  // admis (cas d'acceptation n° 4 de l'audit §11) — fuite, réparation et
  // CONFORME le MÊME JOUR → clôture, machine EN_SERVICE.
  // P1-1 (E5) : « listé » se PROUVE désormais par le sous-type. Un MOBILE
  // sans sous-type de la liste fermée n'ouvre plus l'exception (le cas
  // négatif est couvert par test-equipement).
  const machineMobile = await store.createMachine({
    designation: 'Groupe mobile de transfert de clim', fluide: FLUIDE,
    chargeNominaleKg: 2, typeInstallation: 'MOBILE',
    sousTypeInstallation: 'FOURGON_FRIGORIFIQUE',
    operateur: 'Testeur Contrat'
  });
  verifier('createMachine : typeInstallation MOBILE + sous-type listé enregistrés',
    machineMobile.typeInstallation === 'MOBILE'
    && machineMobile.sousTypeInstallation === 'FOURGON_FRIGORIFIQUE');
  const ctlFuiteMobile = await store.createControle({
    machineId: machineMobile.id, resultat: 'FUITE', methode: 'DIRECTE',
    date: dateRelative(0), operateur: 'Testeur Contrat'
  });
  await store.tracerReparation(ctlFuiteMobile.id, {
    dateReparation: dateRelative(0), natureReparation: 'Remplacement flexible',
    reparateur: 'Testeur Contrat'
  });
  await store.createControle({
    machineId: machineMobile.id, resultat: 'CONFORME', methode: 'DIRECTE',
    date: dateRelative(0), operateur: 'Testeur Contrat'
  });
  verifier('P0-6 : MOBILE listé — contrôle immédiat admis, machine EN_SERVICE le jour même',
    (await store.getMachines()).find((m) => m.id === machineMobile.id)
      .statut === 'EN_SERVICE');
  verifier('P0-6 : MOBILE — plus d’alerte fuite après la clôture immédiate',
    !(await store.getAlertes())
      .some((a) => a.id === `alr-fuite-${machineMobile.id}`));

  // Revue I-2 : archive portant un type d'installation hors grille refusée
  // à l'IMPORT — même message des deux côtés (la démo l'acceptait en
  // silence, le serveur levait un CHECK SQL brut : divergence).
  const exportTI = JSON.parse(await store.exporterJSON());
  exportTI.donnees.machines[0].typeInstallation = 'CAMION';
  await verifierRejet('P0-6 : import d’un type d’installation hors grille refusé (miroir)',
    store.importerJSON(JSON.stringify(exportTI)), 'installation invalide');
}

// --- P0-6 (CF-5) : l'annulation d'un mouvement CONTROLE neutralise ses ---
// --- effets machine (écart P0-7 §7(a) soldé) -----------------------------
{
  const machineCtl = await store.createMachine({
    designation: 'Machine contrôle annulé P0-6', fluide: FLUIDE,
    chargeNominaleKg: 2, operateur: 'Testeur Contrat'
  });

  // 1) Un contrôle FUITE annulé ne laisse plus la machine en FUITE à jamais.
  const mvtFuite = await store.creerMouvement({
    type: 'CONTROLE_NON_PERIODIQUE', machineId: machineCtl.id,
    date: dateRelative(-2), technicien: 'Un Enseignant',
    executeParId: enseignant.id,
    controle: { statutControle: 'FUITE', detecteurId: null,
      localisationFuite: 'Vanne de service' }
  });
  await store.soumettreMouvement(mvtFuite.id);
  await store.validerMouvement(mvtFuite.id, enseignant.id);
  verifier('CF-5 : mouvement CONTROLE FUITE validé → machine en FUITE',
    (await store.getMachines()).find((m) => m.id === machineCtl.id)
      .statut === 'FUITE');
  await store.annulerParContreEcriture(mvtFuite.id,
    'Erreur de machine (mauvaise fiche)', enseignant.id);
  const apresAnnulation = (await store.getMachines())
    .find((m) => m.id === machineCtl.id);
  verifier('CF-5 : contrôle FUITE ANNULÉ → la machine redevient EN_SERVICE',
    apresAnnulation.statut === 'EN_SERVICE', `statut = ${apresAnnulation.statut}`);
  verifier('CF-5 : l’alerte de fuite disparaît avec l’annulation',
    !(await store.getAlertes())
      .some((a) => a.id === `alr-fuite-${machineCtl.id}`));
  verifier('CF-5 : dernierControle recalculé (aucun contrôle actif restant)',
    apresAnnulation.dernierControle === null);

  // 2) Un CONFORME de clôture annulé fait RÉAPPARAÎTRE la fuite réparée
  // en attente de suivi (le dossier n'était refermé que par lui).
  const mvtFuite2 = await store.creerMouvement({
    type: 'CONTROLE_NON_PERIODIQUE', machineId: machineCtl.id,
    date: dateRelative(-2), technicien: 'Un Enseignant',
    executeParId: enseignant.id,
    controle: { statutControle: 'FUITE', detecteurId: null,
      localisationFuite: 'Brasure' }
  });
  await store.soumettreMouvement(mvtFuite2.id);
  const mvtFuite2Valide = await store.validerMouvement(mvtFuite2.id, enseignant.id);
  const ctlLie2 = (await store.getControles())
    .find((c) => c.mouvementId === mvtFuite2.id);
  await store.tracerReparation(ctlLie2.id, {
    dateReparation: dateRelative(-1), natureReparation: 'Brasure reprise',
    reparateur: 'Testeur Contrat'
  });
  const mvtCloture = await store.creerMouvement({
    type: 'CONTROLE_NON_PERIODIQUE', machineId: machineCtl.id,
    date: dateRelative(0), technicien: 'Un Enseignant',
    executeParId: enseignant.id,
    controle: { statutControle: 'CONFORME', detecteurId: null }
  });
  await store.soumettreMouvement(mvtCloture.id);
  await store.validerMouvement(mvtCloture.id, enseignant.id);
  verifier('CF-5 : clôture à J+1 par mouvement CONTROLE → EN_SERVICE',
    (await store.getMachines()).find((m) => m.id === machineCtl.id)
      .statut === 'EN_SERVICE');
  await store.annulerParContreEcriture(mvtCloture.id,
    'Contrôle mal réalisé (détecteur non conforme)', enseignant.id);
  const apresAnnulCloture = (await store.getMachines())
    .find((m) => m.id === machineCtl.id);
  verifier('CF-5 : clôture ANNULÉE → la fuite réparée RÉAPPARAÎT (machine en FUITE)',
    apresAnnulCloture.statut === 'FUITE', `statut = ${apresAnnulCloture.statut}`);
  verifier('CF-5 : l’alerte « Contrôle de suivi à faire » revient avec l’annulation',
    (await store.getAlertes()).some((a) =>
      a.id === `alr-fuite-${machineCtl.id}`
      && a.titre === 'Contrôle de suivi à faire'));
  verifier('CF-5 : dernierControle recalculé = date du contrôle FUITE restant',
    apresAnnulCloture.dernierControle === mvtFuite2Valide.date);

  // Revue I-4 : un contrôle annulé ne reçoit plus de réparation tracée.
  const ctlAnnule = (await store.getControles())
    .find((c) => c.mouvementId === mvtFuite.id);
  await verifierRejet('CF-5 : tracerReparation refusé sur un contrôle ANNULÉ',
    store.tracerReparation(ctlAnnule.id, {
      dateReparation: dateRelative(0), natureReparation: 'Tentative',
      reparateur: 'Testeur Contrat'
    }), 'annulé');

  // Revue I-1 : la DATE DE RÉPARATION est la cheville de la clôture
  // stricte J+1 — gardée (format jour, jamais antérieure à la fuite,
  // jamais future), sinon l'antidatage contournait la règle des 24 h.
  const ctlGarde = await store.createControle({
    machineId: machineCtl.id, resultat: 'FUITE', methode: 'DIRECTE',
    date: dateRelative(-3), operateur: 'Testeur Contrat'
  });
  await verifierRejet('I-1 : date de réparation au format HORAIRE refusée',
    store.tracerReparation(ctlGarde.id, {
      dateReparation: dateRelative(0) + 'T18:00',
      natureReparation: 'Brasure', reparateur: 'Testeur Contrat'
    }), 'format attendu');
  await verifierRejet('I-1 : réparation ANTÉRIEURE au contrôle FUITE refusée',
    store.tracerReparation(ctlGarde.id, {
      dateReparation: dateRelative(-5),
      natureReparation: 'Brasure', reparateur: 'Testeur Contrat'
    }), 'antérieure au contrôle');
  await verifierRejet('I-1 : réparation datée dans le FUTUR refusée',
    store.tracerReparation(ctlGarde.id, {
      dateReparation: dateRelative(2),
      natureReparation: 'Brasure', reparateur: 'Testeur Contrat'
    }), 'futur');
  await verifierRejet('I-1 : date de contrôle au format HORAIRE refusée (createControle)',
    store.createControle({
      machineId: machineCtl.id, resultat: 'CONFORME', methode: 'DIRECTE',
      date: dateRelative(0) + 'T18:00', operateur: 'Testeur Contrat'
    }), 'format attendu');
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

// ------------------------------------------------------------
// V3 : un TRANSFERT est interne au stock (bouteille → bouteille) — il ne
// doit JAMAIS être compté comme charge ni comme récupération, ni dans
// getBilan, ni dans getStats.fluxMensuels (alignement sur la balance
// matière, IM-12). Test DIFFÉRENTIEL : le total ne bouge pas après un
// nouveau transfert connu.
// ------------------------------------------------------------
{
  const bSrcT = await store.createBouteille({
    type: 'NEUVE', fluide: FLUIDE, tareKg: 5, masseBruteKg: 12,
    contenanceMaxKg: 10
  });
  const bDstT = await store.createBouteille({
    type: 'NEUVE', fluide: FLUIDE, tareKg: 5, masseBruteKg: 5,
    contenanceMaxKg: 10
  });
  const bilanAvant = await store.getBilan(ANNEE);
  const statsAvant = await store.getStats();
  const ligneAvant = bilanAvant.lignes.find((l) => l.fluide === FLUIDE);
  const totalChargeAvant = ligneAvant ? ligneAvant.chargeKg : 0;
  const totalRecupereAvant = ligneAvant ? ligneAvant.recupereKg : 0;
  const totalFluxAvant = statsAvant.fluxMensuels
    .reduce((s, f) => s + f.chargeKg + f.recupKg, 0);

  const transfertV3 = await store.creerMouvement({
    type: 'TRANSFERT', bouteilleSrcId: bSrcT.id, bouteilleDstId: bDstT.id,
    peseeAvantKg: 7, peseeApresKg: 3, technicien: 'Testeur Contrat V3'
  });
  await store.soumettreMouvement(transfertV3.id);
  const transfertValideV3 =
    await store.validerMouvement(transfertV3.id, enseignant.id);
  verifier('V3 : le transfert de contrôle est bien validé (+4 kg)',
    PROCHE(transfertValideV3.quantiteKg, 4));

  const bilanApres = await store.getBilan(ANNEE);
  const statsApres = await store.getStats();
  const ligneApres = bilanApres.lignes.find((l) => l.fluide === FLUIDE);
  const totalFluxApres = statsApres.fluxMensuels
    .reduce((s, f) => s + f.chargeKg + f.recupKg, 0);

  verifier('V3 : getBilan.chargeKg INCHANGÉ après un TRANSFERT (mouvement interne)',
    PROCHE(ligneApres.chargeKg, totalChargeAvant));
  verifier('V3 : getBilan.recupereKg INCHANGÉ après un TRANSFERT',
    PROCHE(ligneApres.recupereKg, totalRecupereAvant));
  verifier('V3 : getStats.fluxMensuels INCHANGÉ après un TRANSFERT',
    PROCHE(totalFluxApres, totalFluxAvant));
}

const officiel = await store.peutPasserEnOfficiel();
verifier('peutPasserEnOfficiel : { ok, motifs[] français }',
  typeof officiel.ok === 'boolean' && Array.isArray(officiel.motifs));

// Lot B — simulation de validation OFFICIELLE (lecture, ne bloque jamais) :
// forme du verdict, conditions de fiche signalées. T1 (20/07) : le verrou
// de livraison est REFERMÉ (audit externe, le temps des P0) — il DOIT
// réapparaître dans la simulation (sa mécanique reste aussi prouvée par
// test-blocage-officiel avec un cadre construit). Les motifs de POSTE
// (sauvegarde, session) sont propres au serveur : on n'affirme ici que ce
// qui vaut pour les DEUX stores.
{
  const brouillonSim = await store.creerMouvement({
    type: 'CHARGE_APPOINT', machineId: machineA.id, fluide: FLUIDE,
    peseeAvantKg: 12, peseeApresKg: 11
  });
  const simulation = await store.simulerValidationOfficielle(brouillonSim.id);
  verifier('simulerValidationOfficielle : { ok, blocages[] {code, motif} }',
    simulation.ok === false && Array.isArray(simulation.blocages) &&
    simulation.blocages.every((b) =>
      typeof b.code === 'string' && typeof b.motif === 'string'),
    JSON.stringify(simulation));
  verifier('simulation : le verrou de livraison est REFERMÉ (présent dans les blocages)',
    simulation.blocages.some((b) => b.code === 'VERROU_LIVRAISON'),
    JSON.stringify(simulation.blocages.map((b) => b.code)));
  verifier('simulation : intervenant non désigné signalé (condition 6)',
    simulation.blocages.some((b) => b.code === 'INTERVENANT'));
  verifier('simulation : signature du technicien absente signalée (condition 11)',
    simulation.blocages.some((b) => b.code === 'SIGNATURE'));
  await verifierRejet('simulerValidationOfficielle refuse un mouvement introuvable',
    store.simulerValidationOfficielle('mvt-fantome'), 'introuvable');
  // Brouillon de simulation supprimé : aucune trace parasite pour la suite.
  await store.supprimerMouvement(brouillonSim.id);
}

// P0-5 — aptitude OPPOSABLE (condition 16, APTITUDE_PORTEE) : la simulation
// prouve l'assemblage du fait `aptitude` par les DEUX stores (suite doublée
// demo/local — c'est la parité des deux cadreFicheOfficiel qui casse à la
// moindre divergence). Cas d'acceptation de l'audit du 20/07 (§11) :
// E + charge → refus ; D + autre chose que récupération → refus ; A2 sur une
// machine au-delà de sa limite → refus ; A1 → rien. machineA : R-410A (HFC),
// charge nominale 5 kg.
{
  const cas = [
    ['E', 'étanchéité seule devant une charge', true],
    ['D', 'récupération seule devant une charge', true],
    ['A2', 'limite 3 kg devant une machine de 5 kg', true],
    ['A1', 'toutes opérations sans limite', false]
  ];
  for (const [categorie, libelle, refusAttendu] of cas) {
    const technicien = await store.createPersonne({
      nom: `Aptitude ${categorie}`, prenom: 'Test', typePersonne: 'ENSEIGNANT'
    });
    await store.createHabilitation({
      personneId: technicien.id, regime: '2025', categorie,
      operateur: 'Testeur Contrat'
    });
    const brouillon = await store.creerMouvement({
      type: 'CHARGE_APPOINT', machineId: machineA.id, fluide: FLUIDE,
      peseeAvantKg: 12, peseeApresKg: 11, causeMouvement: 'Fuite réparée',
      technicien: `Test Aptitude ${categorie}`, executeParId: technicien.id
    });
    const sim = await store.simulerValidationOfficielle(brouillon.id);
    if (refusAttendu) {
      verifier(`aptitude opposable : cat. ${categorie} (${libelle}) → APTITUDE_PORTEE nominatif`,
        sim.blocages.some((b) => b.code === 'APTITUDE_PORTEE' &&
          b.motif.includes(`Aptitude ${categorie}`)),
        JSON.stringify(sim.blocages.map((b) => b.code)));
      verifier(`aptitude opposable : cat. ${categorie} — jamais en doublon d'APTITUDE (la 7 se tait)`,
        !sim.blocages.some((b) => b.code === 'APTITUDE'),
        JSON.stringify(sim.blocages.map((b) => b.code)));
    } else {
      verifier(`aptitude opposable : cat. ${categorie} (${libelle}) → ni APTITUDE ni APTITUDE_PORTEE`,
        !sim.blocages.some((b) =>
          b.code === 'APTITUDE' || b.code === 'APTITUDE_PORTEE'),
        JSON.stringify(sim.blocages.map((b) => b.code)));
    }
    await store.supprimerMouvement(brouillon.id);
  }
}

// Lot C (brique C1) — signatures RÉELLES : ordre imposé, déclarations
// figées, illisibilité, invalidation par révision, traces. Jouée demo ET
// local : c'est la parité qui casse à la moindre divergence.
/**
 * Tracé PNG de test : un VRAI PNG, portant un tracé (lot B3, 25/07).
 * AVANT, cette fabrique posait 8 octets magiques puis du remplissage —
 * et les DEUX stores l'acceptaient : le filet vert attestait le
 * comportement défaillant (constat A04).
 */
function imagePngTest(taille = 1200) {
  return Buffer.from(pngDeTest(taille)).toString('base64');
}
{
  const brouillonSig = await store.creerMouvement({
    type: 'CHARGE_APPOINT', machineId: machineA.id, fluide: FLUIDE,
    peseeAvantKg: 12, peseeApresKg: 11.5, causeMouvement: 'Fuite réparée',
    technicien: 'Testeur Contrat'
  });
  verifier('un brouillon neuf porte revisionBrouillon 0 et versionEmpreinte 1',
    brouillonSig.revisionBrouillon === 0 && brouillonSig.versionEmpreinte === 1,
    JSON.stringify({ r: brouillonSig.revisionBrouillon,
      v: brouillonSig.versionEmpreinte }));

  // Ordre imposé et garde-fous, AVANT toute signature valide.
  await verifierRejet('signerMouvement refuse le détenteur avant le technicien',
    store.signerMouvement(brouillonSig.id, { role: 'DETENTEUR',
      nom: 'Dupont', prenom: 'Marie', imagePng: imagePngTest() }),
    'technicien signe en premier');
  await verifierRejet('signerMouvement refuse un rôle inconnu',
    store.signerMouvement(brouillonSig.id, { role: 'PATRON', nom: 'A',
      prenom: 'B', imagePng: imagePngTest() }), 'Rôle de signature inconnu');
  await verifierRejet('signerMouvement exige nom ET prénom (personne physique)',
    store.signerMouvement(brouillonSig.id, { role: 'TECHNICIEN',
      nom: 'Lycée Vidal', prenom: '  ', imagePng: imagePngTest() }),
    'personne physique');
  await verifierRejet('signerMouvement refuse un tracé absent',
    store.signerMouvement(brouillonSig.id, { role: 'TECHNICIEN', nom: 'A',
      prenom: 'B' }), 'tracé absent');
  await verifierRejet('signerMouvement refuse une image non PNG (HTML déguisé)',
    store.signerMouvement(brouillonSig.id, { role: 'TECHNICIEN', nom: 'A',
      prenom: 'B', imagePng: Buffer.from(
        '<html>signature</html>'.padEnd(2000, '.')).toString('base64') }),
    'PNG');
  // Lot B3 (brique 2) — l'ATTAQUE A04, tirée contre LES DEUX stores :
  // 8 octets magiques + une phrase en clair répétée n'est pas une image.
  await verifierRejet('signerMouvement refuse un bloc de texte aux octets magiques PNG',
    store.signerMouvement(brouillonSig.id, { role: 'TECHNICIEN', nom: 'A',
      prenom: 'B', imagePng: Buffer.from((() => {
        const octets = new Uint8Array(2348);
        [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
          .forEach((o, i) => { octets[i] = o; });
        const phrase = 'signature de complaisance ';
        for (let i = 8; i < octets.length; i += 1) {
          octets[i] = phrase.charCodeAt((i - 8) % phrase.length);
        }
        return octets;
      })()).toString('base64') }), 'PNG');
  await verifierRejet('signerMouvement refuse un PNG dont un CRC-32 est retouché',
    store.signerMouvement(brouillonSig.id, { role: 'TECHNICIEN', nom: 'A',
      prenom: 'B', imagePng: Buffer.from((() => {
        const octets = pngDeTest(2048);
        octets[octets.length - 3] ^= 0xff;
        return octets;
      })()).toString('base64') }), 'PNG');
  // Lot B3 (brique 3) — le VIDE ABSOLU : un PNG impeccable mais
  // rigoureusement uniforme, c'est la case restée vierge. Seul cas où
  // le logiciel disait « signature valide » sur une case blanche.
  await verifierRejet('signerMouvement refuse une zone restée VIERGE (aplat uni)',
    store.signerMouvement(brouillonSig.id, { role: 'TECHNICIEN', nom: 'A',
      prenom: 'B', imagePng: Buffer.from(pngVierge(5562)).toString('base64') }),
    'restée vierge');
  await verifierRejet('signerMouvement refuse un canvas TRANSPARENT jamais dessiné',
    store.signerMouvement(brouillonSig.id, { role: 'TECHNICIEN', nom: 'A',
      prenom: 'B', imagePng: Buffer.from(pngVierge(4096, [0, 0, 0, 0]))
        .toString('base64') }), 'restée vierge');

  // Signature du technicien : forme, déclaration figée, empreinte, révision.
  const sigTech = await store.signerMouvement(brouillonSig.id, {
    role: 'TECHNICIEN', nom: 'Contrat', prenom: 'Testeur',
    qualite: 'Élève technicien', imagePng: imagePngTest()
  });
  verifier('signature technicien : valide, révision 0, empreinte du document',
    sigTech.valide === true && sigTech.versionDocument === 0 &&
    HASH_HEX.test(sigTech.sha256Document) && sigTech.role === 'TECHNICIEN' &&
    typeof sigTech.dateHeure === 'string' &&
    sigTech.declaration.startsWith('Je certifie avoir réalisé'),
    JSON.stringify({ v: sigTech.valide, r: sigTech.versionDocument }));

  // Détenteur par délégation (décision Franck 16/07) : la raison sociale
  // est obligatoire, la mention entre dans la déclaration figée.
  await verifierRejet('délégation sans raison sociale représentée refusée',
    store.signerMouvement(brouillonSig.id, { role: 'DETENTEUR',
      nom: 'Dupont', prenom: 'Marie', parDelegation: true,
      imagePng: imagePngTest() }), 'Raison sociale');
  // DÉCISION D2 (25/07) : aucun seuil d'encre. Ce détenteur signe avec
  // un tracé d'UN SEUL pixel, dans un fichier de 105 octets — c'est-à-
  // dire sous l'ancienne borne de 1 Ko, retirée. Le signataire seul
  // juge son tracé : le logiciel ne refuse que le vide absolu.
  const sigDet = await store.signerMouvement(brouillonSig.id, {
    role: 'DETENTEUR', nom: 'Dupont', prenom: 'Marie',
    qualite: 'Professeur, par délégation du détenteur', parDelegation: true,
    organisation: 'LP Antoine Vidal',
    imagePng: Buffer.from(pngUnSeulPixel()).toString('base64')
  });
  verifier('signature détenteur : déclaration avec la mention de délégation',
    sigDet.valide === true && sigDet.parDelegation === true &&
    sigDet.declaration.includes(
      'par délégation du détenteur (LP Antoine Vidal)'), sigDet.declaration);

  const listeSignatures = await store.getSignaturesMouvement(brouillonSig.id);
  verifier('getSignaturesMouvement : 2 signatures, toutes valides',
    listeSignatures.length === 2 &&
    listeSignatures.every((sig) => sig.valide === true));
  listeSignatures[0].nom = 'FALSIFIÉ';
  verifier('les signatures retournées sont des COPIES indépendantes',
    (await store.getSignaturesMouvement(brouillonSig.id))[0].nom !== 'FALSIFIÉ');

  // Invalidation : une PJ ajoutée au brouillon modifie la fiche présentée
  // aux signataires → révision incrémentée, signatures PÉRIMÉES.
  await store.ajouterPieceJointe({ entiteType: 'MOUVEMENT',
    entiteId: brouillonSig.id, nomFichier: 'photo-pesee.png',
    mimeType: 'image/png', categorie: 'PHOTO_PESEE',
    base64: imagePngTest(2048) });
  const apresPj = await store.getSignaturesMouvement(brouillonSig.id);
  verifier('fiche modifiée (PJ ajoutée) : toutes les signatures périmées',
    apresPj.length === 2 && apresPj.every((sig) => sig.valide === false));
  await verifierRejet('détenteur refusé quand la signature technicien est périmée',
    store.signerMouvement(brouillonSig.id, { role: 'DETENTEUR',
      nom: 'Dupont', prenom: 'Marie', imagePng: imagePngTest() }),
    'absente ou périmée');
  const reSigne = await store.signerMouvement(brouillonSig.id, {
    role: 'TECHNICIEN', nom: 'Contrat', prenom: 'Testeur',
    imagePng: imagePngTest() });
  verifier('le technicien re-signe la révision courante (1)',
    reSigne.versionDocument === 1 && reSigne.valide === true);

  // Le moteur OFFICIEL voit les signatures réelles (conditions 14-15).
  const simulationSig = await store.simulerValidationOfficielle(brouillonSig.id);
  verifier('simulation : détenteur périmé → « fiche modifiée après signature »',
    simulationSig.blocages.some((b) => b.code === 'SIGNATURE_DETENTEUR' &&
      b.motif.includes('Fiche modifiée après signature')),
    JSON.stringify(simulationSig.blocages.map((b) => b.code)));
  verifier('simulation : technicien re-signé → aucun blocage SIGNATURE_TECHNICIEN',
    !simulationSig.blocages.some((b) => b.code === 'SIGNATURE_TECHNICIEN'));

  // Machine à états : SOUMIS ne se signe pas, le rejet invalide, le figé
  // oppose le message canonique.
  await store.soumettreMouvement(brouillonSig.id);
  await verifierRejet('signerMouvement refuse un mouvement SOUMIS',
    store.signerMouvement(brouillonSig.id, { role: 'TECHNICIEN', nom: 'A',
      prenom: 'B', imagePng: imagePngTest() }), 'brouillon');
  await store.rejeterMouvement(brouillonSig.id, 'Reprise pour les signatures.');
  verifier('le rejet incrémente la révision : signatures périmées',
    (await store.getSignaturesMouvement(brouillonSig.id))
      .every((sig) => sig.valide === false));
  const figee = (await store.getMouvements()).find((mv) => mv.statut === 'VALIDE');
  await verifierRejet('signerMouvement refuse une écriture figée',
    store.signerMouvement(figee.id, { role: 'TECHNICIEN', nom: 'A',
      prenom: 'B', imagePng: imagePngTest() }), MSG_ECRITURE_FIGEE);
  // Lot C (C2) : toute écriture scellée par CETTE version porte l'empreinte
  // RENFORCÉE et ses champs gelés (parité demo/local du parcours v2).
  verifier('une écriture scellée porte l’empreinte v2 et ses champs gelés',
    figee.versionEmpreinte === 2 && HASH_HEX.test(figee.hashSignatures) &&
    HASH_HEX.test(figee.hashPiecesJointes) &&
    Array.isArray(figee.outilsFiges) && figee.hashPdfFinal === null,
    JSON.stringify({ v: figee.versionEmpreinte, o: figee.outilsFiges }));
  // Parité du refus sur un fichier à DOUBLE faute (chaîne rompue ET fausse
  // signature) : les deux stores vérifient la CHAÎNE d'abord — même
  // message, dans le même ordre (revue adversariale C2).
  const exportDouble = JSON.parse(await store.exporterJSON());
  const cibleDouble = exportDouble.donnees.mouvements
    .find((mv) => mv.id === figee.id);
  cibleDouble.quantiteKg = (cibleDouble.quantiteKg ?? 0) + 1;
  exportDouble.donnees.signaturesMouvement.push({
    id: 'sig-double-faute', mouvementId: figee.id, role: 'TECHNICIEN',
    nom: 'Faux', prenom: 'Signataire', qualite: null, organisation: null,
    parDelegation: false, dateHeure: DEBUT_SUITE, declaration: 'Fausse.',
    imagePng: 'AAAA', sessionCompteId: null, sessionPersonnelId: null,
    sha256Document: 'beef', versionDocument: 0 });
  await verifierRejet('fichier à DOUBLE faute : refusé par la CHAÎNE (même message des deux côtés)',
    store.importerJSON(JSON.stringify(exportDouble)),
    'chaîne d’intégrité rompue');
  await verifierRejet('getSignaturesMouvement refuse un mouvement introuvable',
    store.getSignaturesMouvement('mvt-fantome'), 'introuvable');

  // ------------------------------------------------------------
  // REVUE DU 25/07 (IMPORTANT 5) — contrat.js est « LA vérité de surface »
  // (docs/CARTE-CODE.md) : c'est le SEUL fichier du dépôt dont le rôle est
  // de ne pas mentir sur le comportement. Il annonçait encore « nombres
  // magiques, ≥ 1 Ko » alors que l'image est décodée et que la borne basse
  // a été SUPPRIMÉE — dans un lot intitulé « ne plus mentir ».
  // ------------------------------------------------------------
  {
    const dit = METHODES_CONTRAT.signerMouvement.description;
    verifier('le contrat n’annonce plus les « nombres magiques » (l’image est décodée)',
      !dit.includes('nombres magiques'), dit.slice(0, 200));
    verifier('le contrat n’annonce plus de borne basse de 1 Ko (elle est retirée)',
      !/[≥>]=?\s*1\s*Ko/.test(dit), dit.slice(0, 200));
    verifier('le contrat annonce le décodage réel et le refus de la zone vierge',
      dit.includes('DÉCODÉE') && dit.includes('MSG_ZONE_VIERGE')
      && dit.includes('CRC-32'), dit.slice(0, 200));
    // Ce que le contrat annonce est TIRÉ juste ici : la borne basse n'existe
    // plus (un vrai tracé de 105 octets passe, vérifié plus haut) et la zone
    // vierge est refusée avec ce message.
    await verifierRejet('… et ce qu’il annonce est vrai : la zone vierge est refusée',
      store.signerMouvement(brouillonSig.id, { role: 'TECHNICIEN',
        nom: 'Contrat', prenom: 'Testeur',
        imagePng: Buffer.from(pngVierge(5562)).toString('base64') }),
      'restée vierge');
    const ditLecture = METHODES_CONTRAT.getSignaturesMouvement.description;
    verifier('le contrat dit que « valide » exige AUSSI une image recevable',
      ditLecture.includes('image recevable'), ditLecture.slice(0, 200));
    verifier('le contrat annonce imageRecevable (la cause dite à part)',
      ditLecture.includes('imageRecevable'), ditLecture.slice(0, 200));
  }

  // ------------------------------------------------------------
  // ⭐ REVUE DU 25/07 (IMPORTANT 1) — LA PORTE IMPORT N'ÉTAIT PAS GARDÉE.
  // La POSE refuse le bloc de texte aux 8 octets magiques (A04). L'IMPORT,
  // lui, ne regardait pas l'image : on exportait, on REMPLAÇAIT l'image
  // des deux signatures par ce bloc, on réimportait — et les conditions
  // bloquantes 14/15 du mode Officiel DISPARAISSAIENT. Une signature dont
  // l'image est illisible n'est pas une signature : elle ne vaut nulle
  // part, quelle que soit la porte par laquelle elle est entrée.
  // ------------------------------------------------------------
  {
    // Le mouvement a été rejeté : on re-signe proprement la révision
    // courante pour partir d'une fiche RÉELLEMENT signée (le témoin).
    await store.signerMouvement(brouillonSig.id, { role: 'TECHNICIEN',
      nom: 'Contrat', prenom: 'Testeur', imagePng: imagePngTest() });
    await store.signerMouvement(brouillonSig.id, { role: 'DETENTEUR',
      nom: 'Dupont', prenom: 'Marie', imagePng: imagePngTest() });
    const avantAttaque = await store.getSignaturesMouvement(brouillonSig.id);
    verifier('témoin : les deux signatures de la révision courante sont valides',
      avantAttaque.filter((s) => s.valide === true).length === 2,
      JSON.stringify(avantAttaque.map((s) => [s.role, s.valide])));
    const temoin = await store.simulerValidationOfficielle(brouillonSig.id);
    verifier('témoin : fiche réellement signée → aucun blocage de signature',
      !temoin.blocages.some((b) => b.code === 'SIGNATURE_TECHNICIEN'
        || b.code === 'SIGNATURE_DETENTEUR'),
      JSON.stringify(temoin.blocages.map((b) => b.code)));

    // L'attaque, mot pour mot celle du relecteur : le bloc que la POSE
    // refuse est glissé à la place des deux tracés, par le fichier.
    const bloc = new Uint8Array(2348).fill(0x2e);
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
      .forEach((o, i) => { bloc[i] = o; });
    const blocBase64 = Buffer.from(bloc).toString('base64');
    await verifierRejet('témoin : la POSE refuse ce bloc de 2 348 octets',
      store.signerMouvement(brouillonSig.id, { role: 'TECHNICIEN',
        nom: 'Contrat', prenom: 'Testeur', imagePng: blocBase64 }),
      'n’est pas un PNG valide');

    const forge = JSON.parse(await store.exporterJSON());
    let forgees = 0;
    for (const sig of forge.donnees.signaturesMouvement) {
      if (sig.mouvementId === brouillonSig.id) {
        sig.imagePng = blocBase64;
        forgees += 1;
      }
    }
    verifier('décor : toutes les images du brouillon sont remplacées',
      forgees === avantAttaque.length, `${forgees} signature(s) touchée(s)`);
    const importe = await store.importerJSON(JSON.stringify(forge));
    verifier('le fichier est ACCEPTÉ (on n’empêche pas d’importer un registre)',
      importe === true);

    const apresImport = await store.getSignaturesMouvement(brouillonSig.id);
    verifier('⭐ une signature à l’image illisible n’est PLUS déclarée valide',
      apresImport.length === avantAttaque.length
      && apresImport.every((s) => s.valide === false),
      JSON.stringify(apresImport.map((s) => s.valide)));
    // ⭐ REVUE DU 26/07 — LA CAUSE EST DITE À PART, DES DEUX CÔTÉS.
    // Repliée dans le seul « valide », elle ressortait partout en
    // « périmée » (= la fiche a été modifiée après la signature), motif
    // FAUX ici : la révision signée est ÉGALE à la révision courante.
    // Ce motif faux allait jusque dans le dossier scellé.
    verifier('⭐ le magasin dit POURQUOI : imageRecevable est false',
      apresImport.every((s) => s.imageRecevable === false),
      JSON.stringify(apresImport.map((s) => s.imageRecevable)));
    verifier('… et la fiche n’a PAS bougé (révision signée = révision courante)',
      apresImport.every((s) => (s.versionDocument ?? 0)
        === (avantAttaque.find((a) => a.id === s.id)?.versionDocument ?? 0)),
      JSON.stringify(apresImport.map((s) => s.versionDocument)));
    verifier('témoin : avant l’attaque, l’image était déclarée recevable',
      avantAttaque.every((s) => s.imageRecevable === true),
      JSON.stringify(avantAttaque.map((s) => s.imageRecevable)));
    const apres = await store.simulerValidationOfficielle(brouillonSig.id);
    verifier('⭐ les conditions 14 et 15 du mode Officiel SONT DE RETOUR',
      apres.blocages.some((b) => b.code === 'SIGNATURE_TECHNICIEN')
      && apres.blocages.some((b) => b.code === 'SIGNATURE_DETENTEUR'),
      JSON.stringify(apres.blocages.map((b) => b.code)));
    // … et le fait SE VOIT : sans trace, l'écran dirait seulement
    // « signature absente », comme si personne n'avait jamais signé.
    const journalApres = (await store.getJournalAudit())
      .filter((e) => e.action === 'SIGNATURE_ILLISIBLE_A_L_IMPORT');
    verifier('⭐ le journal nomme CHAQUE signature illisible entrée par le fichier',
      journalApres.length === avantAttaque.length,
      `${journalApres.length} entrée(s) pour ${avantAttaque.length} signature(s)`);
    // ⚠️ `every` sur un tableau VIDE est vrai : sans le décompte, ces deux
    // vérifications ne pourraient pas échouer (piège relevé par la revue).
    verifier('… en disant qu’elle est conservée mais ne vaut pas signature',
      journalApres.length > 0
      && journalApres.every((e) => e.details.includes('ne vaut PAS signature')
        && e.details.includes('conservée telle quelle')),
      JSON.stringify(journalApres[0] ?? null));
    verifier('… rattachée au NUMÉRO du mouvement concerné',
      journalApres.length > 0
      && journalApres.every((e) => e.cible === brouillonSig.numero),
      JSON.stringify(journalApres.map((e) => e.cible)));
    verifier('… avec le message canonique EXISTANT (aucune condition ajoutée)',
      apres.blocages.filter((b) => b.code === 'SIGNATURE_TECHNICIEN'
        || b.code === 'SIGNATURE_DETENTEUR')
        .every((b) => !b.motif.includes('Fiche modifiée après signature')),
      JSON.stringify(apres.blocages.map((b) => b.motif)));
  }

  // ------------------------------------------------------------
  // ⭐ REVUE DU 26/07 — LE REGISTRE EXISTANT, ET LA CASE BLANCHE.
  // Le CHANGELOG et le plan du lot annonçaient « aucun contrôle
  // rétroactif : verifierImageSignature n'est appelée qu'à la POSE ».
  // C'est FAUX depuis que la porte IMPORT a été fermée : le contrôle
  // est rejoué à chaque LECTURE (getSignaturesMouvement et l'état des
  // signatures pour le moteur Officiel). C'est la pièce même sur
  // laquelle le propriétaire doit se prononcer, elle se TIRE donc.
  //
  // Le cas n'est pas une attaque : c'est un registre HONNÊTE d'avant le
  // lot. La version d'avant acceptait et stockait une case blanche —
  // un VRAI PNG, CRC justes, 5 506 o, le chiffre publié au CHANGELOG.
  // On l'insère en base par le fichier, exactement comme elle y serait.
  // ------------------------------------------------------------
  {
    // On repart d'une fiche RÉELLEMENT signée (les images de la section
    // précédente ont été remplacées par le bloc de texte).
    await store.signerMouvement(brouillonSig.id, { role: 'TECHNICIEN',
      nom: 'Contrat', prenom: 'Testeur', imagePng: imagePngTest() });
    await store.signerMouvement(brouillonSig.id, { role: 'DETENTEUR',
      nom: 'Dupont', prenom: 'Marie', imagePng: imagePngTest() });
    const temoin = await store.simulerValidationOfficielle(brouillonSig.id);
    verifier('témoin : fiche signée → aucun blocage de signature',
      !temoin.blocages.some((b) => b.code === 'SIGNATURE_TECHNICIEN'
        || b.code === 'SIGNATURE_DETENTEUR'),
      JSON.stringify(temoin.blocages.map((b) => b.code)));

    const caseBlanche = Buffer.from(pngVierge(5506)).toString('base64');
    const registre = JSON.parse(await store.exporterJSON());
    let posees = 0;
    for (const sig of registre.donnees.signaturesMouvement) {
      if (sig.mouvementId === brouillonSig.id) {
        sig.imagePng = caseBlanche;
        posees += 1;
      }
    }
    verifier('décor : le registre porte des cases blanches de 5 506 o',
      posees > 0 && Buffer.from(caseBlanche, 'base64').length === 5506,
      `${posees} signature(s), ${Buffer.from(caseBlanche, 'base64').length} o`);

    verifier('⭐ un registre existant s’importe TOUJOURS (rien n’est refusé)',
      (await store.importerJSON(JSON.stringify(registre))) === true);
    const relues = await store.getSignaturesMouvement(brouillonSig.id);
    verifier('⭐ … mais sa signature retombe sur « absente » (image non lue)',
      relues.length === posees
      && relues.every((s) => s.valide === false && s.imageRecevable === false),
      JSON.stringify(relues.map((s) => [s.valide, s.imageRecevable])));
    const officiel = await store.simulerValidationOfficielle(brouillonSig.id);
    verifier('⭐ … et les conditions 14/15 lui sont opposées en mode Officiel',
      officiel.blocages.some((b) => b.code === 'SIGNATURE_TECHNICIEN')
      && officiel.blocages.some((b) => b.code === 'SIGNATURE_DETENTEUR'),
      JSON.stringify(officiel.blocages.map((b) => b.code)));
    // Ce que ce contrôle à la lecture NE fait PAS, et qu'il faut pouvoir
    // dire au propriétaire : il ne retire aucune masse, ne casse aucune
    // écriture scellée, et ne rend aucun registre « invalide ».
    verifier('… le registre ne devient PAS invalide : la chaîne reste verte',
      (await store.verifierChaineHash()).ok === true);
    verifier('… aucune condition bloquante NOUVELLE (les codes existants seuls)',
      officiel.blocages.every((b) => b.code !== 'SIGNATURE_IMAGE'
        && !b.motif.includes('illisible')),
      JSON.stringify(officiel.blocages.map((b) => b.code)));
  }

  // Suppression du brouillon : ses signatures partent avec lui — la trace
  // reste au journal (une entrée SIGNATURE_MOUVEMENT par signature posée).
  await store.supprimerMouvement(brouillonSig.id);
  const exportSig = JSON.parse(await store.exporterJSON());
  verifier('les signatures d’un brouillon supprimé partent avec lui',
    Array.isArray(exportSig.donnees.signaturesMouvement) &&
    exportSig.donnees.signaturesMouvement
      .every((sig) => sig.mouvementId !== brouillonSig.id));
  verifier('le journal d’audit garde la trace des signatures posées',
    (await store.getJournalAudit())
      .some((e) => e.action === 'SIGNATURE_MOUVEMENT'));
}

// ============================================================
// 16. Outillage : statut recalculé, réforme définitive
// ============================================================
const outil = await store.createOutil({
  typeOutil: 'DETECTEUR', marque: 'Inficon', modele: 'D-TEK',
  prochaineEcheance: dateRelative(120)
});
verifier('createOutil : statut CONFORME (échéance à 120 jours)',
  outil.statut === 'CONFORME');
verifier('createOutil pose un code public opaque (Crockford 7)',
  CODE_PUBLIC.test(outil.codePublic));
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
// Lot F (13/08) : la grille de capacité accepte les DEUX régimes — « V »
// (véhicules, 2025) était refusé pour l'établissement pendant que la même
// valeur passait pour une personne (4e relecture, tiré). Le refus se
// prouve désormais sur une catégorie réellement inconnue.
const etabDeuxRegimes = await store.updateEtablissement(
  { categoriesAutorisees: ['I', 'A1'] });
verifier('updateEtablissement accepte les DEUX régimes (I et A1) [lot F]',
  (etabDeuxRegimes.categoriesAutorisees ?? []).includes('I')
  && (etabDeuxRegimes.categoriesAutorisees ?? []).includes('A1'));
await verifierRejet('updateEtablissement refuse une catégorie inconnue',
  store.updateEtablissement({ categoriesAutorisees: ['I', 'IX'] }));
await store.updateEtablissement({ categoriesAutorisees: ['I'] });

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
// PNG 1×1 minimal (vraie signature 0x89 'P' 'N' 'G' …) : depuis le
// durcissement audit-proof, le store VÉRIFIE que le contenu concorde avec le
// type déclaré. Toute PJ « image acceptée » du scénario s'appuie sur ce fixture.
const PNG_1x1_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk'
  + 'YPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const OCTETS_PNG = Buffer.from(PNG_1x1_B64, 'base64');
const CONTENU_BASE64 = PNG_1x1_B64;
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
// Audit-proof : un contenu qui DÉMENT le type déclaré (ici du HTML annoncé
// « image/png ») est refusé sur la signature binaire réelle, jamais sur le
// seul MIME. Vaut des DEUX côtés du contrat (démo ET local).
await verifierRejet('un contenu qui dément le type déclaré est refusé (signature binaire)',
  store.ajouterPieceJointe({ entiteType: 'MACHINE', entiteId: machineB.id,
    nomFichier: 'faux.png', mimeType: 'image/png',
    base64: Buffer.from('<html>pas une image</html>').toString('base64') }),
  'signature binaire');
await verifierRejet('une pièce jointe sans contenu est refusée',
  store.ajouterPieceJointe({ entiteType: 'MACHINE', entiteId: machineB.id,
    nomFichier: 'x.png', mimeType: 'image/png' }));

// --- Le chemin RÉEL de l'interface : un Blob -----------------------
// composants/pieces-jointes.js passe le File du formulaire et
// modales/personne-form.js la signature manuscrite — jamais du base64.
// JSON ne sait pas porter un Blob (il le réduit à {}) : avant le correctif
// du 14/07, le Mode Local enregistrait 9 octets de déchet, les hachait en
// SHA-256 et les journalisait comme pièce probante, pendant que la Démo
// refusait proprement. Ce cas est la sentinelle de cette divergence.
// Le Blob porte de VRAIS octets PNG (binaire non textuel, avec des 0x00) :
// meilleur témoin encore que du texte pour la fidélité de l'aller-retour, et
// il satisfait le contrôle de signature du type déclaré.
const pjBlob = await store.ajouterPieceJointe({
  entiteType: 'MACHINE', entiteId: machineB.id, categorie: 'PHOTO_PESEE',
  nomFichier: 'signature.png', mimeType: 'image/png',
  blob: new Blob([OCTETS_PNG], { type: 'image/png' }),
  ajoutePar: 'Testeur Contrat'
});
verifier('ajouterPieceJointe accepte un Blob et enregistre sa VRAIE taille',
  pjBlob.taille === OCTETS_PNG.length,
  `taille=${pjBlob.taille}, attendu=${OCTETS_PNG.length}`);
{
  const complete = await store.obtenirPieceJointe(pjBlob.id);
  const relu = typeof complete.blob?.arrayBuffer === 'function'
    ? new Uint8Array(await complete.blob.arrayBuffer())
    : new Uint8Array(complete.blob);
  const identique = relu.length === OCTETS_PNG.length
    && relu.every((o, i) => o === OCTETS_PNG[i]);
  verifier('obtenirPieceJointe restitue le contenu du Blob à l’identique (octets)',
    identique, `taille relue=${relu.length}`);
}
await verifierRejet('un contenu non textuel est REFUSÉ (jamais décodé en déchet)',
  store.ajouterPieceJointe({ entiteType: 'MACHINE', entiteId: machineB.id,
    nomFichier: 'x.png', mimeType: 'image/png', blob: { faux: true } }),
  'attendu');
await verifierRejet('une base64 illisible est refusée',
  store.ajouterPieceJointe({ entiteType: 'MACHINE', entiteId: machineB.id,
    nomFichier: 'x.png', mimeType: 'image/png',
    base64: '@@@ pas du base64 @@@' }),
  'illisible');

// Lot C (C3c) : la PJ posée sur mvt2 AU BROUILLON (voir sa création) est
// devenue la preuve d'une écriture FIGÉE — intouchable, et plus rien ne
// s'ajoute (asymétrie fermée), catégorie CERFA_FINAL réservée au système.
const pjFigee = (await store.listerPiecesJointes('MOUVEMENT', mvt2.id))
  .find((x) => x.nomFichier === 'preuve-mouvement.png');
verifier('la preuve attachée au brouillon a suivi l’écriture figée',
  Boolean(pjFigee));
await verifierRejet('une PJ liée à une écriture figée est intouchable',
  store.supprimerPieceJointe(pjFigee.id, 'Testeur'));
await verifierRejet('une écriture figée ne reçoit PLUS de pièce justificative',
  store.ajouterPieceJointe({ entiteType: 'MOUVEMENT', entiteId: mvt2.id,
    categorie: 'PHOTO_PESEE', nomFichier: 'apres-coup.png',
    mimeType: 'image/png', base64: CONTENU_BASE64 }),
  'ne peut plus recevoir');
await verifierRejet('la catégorie CERFA_FINAL est réservée au système',
  store.ajouterPieceJointe({ entiteType: 'MOUVEMENT', entiteId: mvt2.id,
    categorie: 'CERFA_FINAL', nomFichier: 'fausse.pdf',
    mimeType: 'application/pdf', base64: 'JVBERi0xLjQK' }),
  'réservée au système');
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

// P0-8 (revue adversariale, constat BLOQUANT) : les CESSIONS voyagent dans
// l'export. Sans elles, un aller-retour les perdrait alors que la bouteille
// est déjà décrémentée → écart d'inventaire fantôme dans la base cible.
{
  const cessionsStore = await store.getCessions();
  verifier('exporterJSON : la collection cessions est PRÉSENTE dans l’export',
    Array.isArray(enveloppe.donnees.cessions));
  verifier('exporterJSON : l’export porte autant de cessions que le store',
    (enveloppe.donnees.cessions ?? []).length === cessionsStore.length
    && cessionsStore.length >= 1,
    `export ${(enveloppe.donnees.cessions ?? []).length} / store ${cessionsStore.length}`);
}

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

// P7-e (option A) : un contrôle OFFICIEL orphelin (sans mouvementId) injecté
// dans un export est REFUSÉ à l'import — dans la cible, tout contrôle
// officiel naît d'un mouvement (CR-3, parcours signé/scellé/WORM) : un
// orphelin ne peut être que forgé ou issu d'un contournement.
{
  const forge = JSON.parse(exportPropre);
  forge.donnees.controles.push({
    id: 'ctl-forge-orphelin', numero: 'C-FI-2026-0099', mode: 'OFFICIEL',
    date: '2026-07-20', machineId: forge.donnees.machines[0]?.id ?? 'M1',
    machineLabel: 'Machine du forgeur', typeControle: 'PERIODIQUE',
    methode: 'DIRECTE', resultat: 'CONFORME', operateur: 'Forgeur',
    prochainControle: null, enRetard: false
  });
  await verifierRejet(
    'P7-e : un contrôle OFFICIEL orphelin (sans mouvement lié) est refusé à l’import',
    store.importerJSON(JSON.stringify(forge)), 'orphelin');
}

verifier('importerJSON adopte un export propre (true)',
  await store.importerJSON(exportPropre) === true);
verifier('après import propre, le registre est déclaré sain',
  (await store.getEtatRegistre()).altere === false
  && store.registreAltere === null);
verifier('l’état importé est fidèle (nos mouvements sont là)',
  (await store.getMouvements()).some((m) => m.id === mvt3.id));

// Un export ANTÉRIEUR au lot « fiche explicite » (fluides sans les 4
// champs) ne doit PAS effacer la fiche réglementaire actée (constat de
// revue du 16/07, prouvé : INSERT OR REPLACE → colonnes NULL côté
// serveur, clés absentes côté démo). L'import la recomplète depuis la
// table validée, à l'IDENTIQUE des deux côtés ; un fluide inconnu sans
// fiche reste sans fiche (4 clés à null, jamais false ni undefined).
{
  const ancien = JSON.parse(exportPropre);
  for (const f of ancien.donnees.fluides) {
    delete f.contientHfc;
    delete f.contientHfo;
    delete f.categorieCadre7;
    delete f.sourcePrp;
  }
  // Un export d'AVANT la migration 22 porte aussi les anciens PRP :
  // l'import doit rejouer la correction conditionnelle (jamais sur une
  // valeur réellement ajustée) — sinon INSERT OR REPLACE réintroduirait
  // 4/3 pour toujours (la migration ne rejoue pas sur une base à jour).
  ancien.donnees.fluides.find((f) => f.code === 'R-1234yf').gwpAr4 = 4;
  ancien.donnees.fluides.push({
    code: 'R-ETRANGER', famille: 'HFC', gwpAr4: 100, classeSecurite: 'A1'
  });
  verifier('import : un export sans fiche réglementaire est accepté',
    await store.importerJSON(JSON.stringify(ancien)) === true);
  const apres = await store.getFluides();
  const r455aImporte = apres.find((f) => f.code === 'R-455A');
  verifier('import ancien : la fiche du R-455A est recomplétée (Règle A actée)',
    r455aImporte?.categorieCadre7 === 'HFC'
    && r455aImporte?.contientHfc === true
    && r455aImporte?.contientHfo === true
    && typeof r455aImporte?.sourcePrp === 'string');
  verifier('import ancien : R-744 réacté hors périmètre (AUCUNE)',
    apres.find((f) => f.code === 'R-744')?.categorieCadre7 === 'AUCUNE');
  verifier('import ancien : le PRP 4 du R-1234yf est recorrigé en 0,501 (F-Gas III)',
    (() => { const f = apres.find((x) => x.code === 'R-1234yf');
      return f?.gwpAr4 === 0.501
        && f?.sourcePrp === 'annexe règl. UE 2024/573 (F-Gas III)'; })());
  const etranger = apres.find((f) => f.code === 'R-ETRANGER');
  verifier('import ancien : un fluide inconnu reste SANS fiche (4 clés à null)',
    etranger !== undefined && etranger.contientHfc === null
    && etranger.contientHfo === null && etranger.categorieCadre7 === null
    && etranger.sourcePrp === null);
  // Remettre l'état de référence : la suite du scénario ne doit pas
  // dépendre du fluide étranger injecté ici.
  verifier('import : retour à l’export propre après le cas « export ancien »',
    await store.importerJSON(exportPropre) === true);
}

// ============================================================
// 22. Forme canonique du contrôle déclaré + échange CROISÉ démo ↔ local
// ============================================================
{
  // Le wizard envoie detecteurId/localisationFuite éventuellement NULS :
  // le store doit figer la forme CANONIQUE (clé localisationFuite absente
  // quand nulle), identique au round-trip SQL — l'empreinte SHA-256 couvre
  // l'objet controle entier et JSON.stringify est sensible à la présence
  // des clés. Sans ça : faux « registre altéré » au premier échange.
  const bCanon1 = await store.createBouteille({
    type: 'NEUVE', fluide: FLUIDE, tareKg: 5, masseBruteKg: 8,
    contenanceMaxKg: 10
  });
  const bCanon2 = await store.createBouteille({
    type: 'NEUVE', fluide: FLUIDE, tareKg: 5, masseBruteKg: 5,
    contenanceMaxKg: 10
  });
  const mvtCanon = await store.creerMouvement({
    type: 'TRANSFERT', bouteilleSrcId: bCanon1.id, bouteilleDstId: bCanon2.id,
    peseeAvantKg: 3, peseeApresKg: 2, technicien: 'Testeur Contrat',
    controle: { statutControle: 'CONFORME', detecteurId: null,
      localisationFuite: null }
  });
  verifier('controle déclaré : forme canonique (localisationFuite ABSENTE quand nulle)',
    mvtCanon.controle.statutControle === 'CONFORME' &&
    !('localisationFuite' in mvtCanon.controle));
  await store.soumettreMouvement(mvtCanon.id);
  await store.validerMouvement(mvtCanon.id, enseignant.id);

  // Échange croisé : l'export de CETTE implémentation doit s'importer dans
  // L'AUTRE avec un registre déclaré SAIN (CR-5) — c'est le trajet réel
  // « démo → fichier → mode local » (et l'inverse) d'un utilisateur.
  const exportCroise = await store.exporterJSON();
  const autreNom = NOM_STORE === 'demo' ? 'local' : 'demo';
  const autreStore = await fabriquerStore(autreNom);
  verifier(`échange croisé : l’export « ${NOM_STORE} » s’importe dans « ${autreNom} »`,
    await autreStore.importerJSON(exportCroise) === true);
  const etatCroise = await autreStore.getEtatRegistre();
  verifier('échange croisé : le registre importé est déclaré SAIN (chaîne intacte)',
    etatCroise.altere === false && etatCroise.casseA === null,
    `casse à ${etatCroise.casseA}`);
  const chaineCroisee = await autreStore.verifierChaineHash();
  verifier('échange croisé : la chaîne de hash se recalcule à l’identique',
    chaineCroisee.ok === true, `casse à ${chaineCroisee.casseA}`);
}

// ============================================================
// P7-a (audit externe #2) — parcours du CONTRÔLE d'étanchéité comme mouvement
// ============================================================
// Un mouvement de type CONTROLE traverse création → soumission → validation
// SANS pesées ni effet stock, et produit un contrôle lié du BON type. C'est la
// fondation de l'option A (le contrôle officiel réutilisera ce parcours
// signé/scellé/WORM). Placé EN FIN : une écriture ajoutée en queue ne décale
// pas la chaîne de hash éprouvée plus haut. Machine dédiée : zéro effet de bord.
{
  const machineCtrl = await store.createMachine({
    designation: 'Machine contrôle P7-a', fluide: FLUIDE,
    chargeNominaleKg: 8, localisation: 'Atelier P7', operateur: 'Testeur Contrat'
  });
  const ctrlPerio = await store.creerMouvement({
    type: 'CONTROLE_PERIODIQUE', machineId: machineCtrl.id,
    technicien: 'Testeur Contrat',
    controle: { statutControle: 'CONFORME', detecteurId: null }
  });
  await store.soumettreMouvement(ctrlPerio.id);
  const ctrlValide = await store.validerMouvement(ctrlPerio.id, enseignant.id);
  verifier('P7-a : un mouvement CONTROLE_PERIODIQUE se valide sans pesées (quantité 0)',
    ctrlValide.statut === 'VALIDE' && ctrlValide.quantiteKg === 0,
    JSON.stringify({ statut: ctrlValide.statut, q: ctrlValide.quantiteKg }));
  const controleLie = (await store.getControles())
    .find((c) => c.mouvementId === ctrlPerio.id);
  verifier('P7-a : le mouvement CONTROLE a produit un contrôle lié',
    Boolean(controleLie), 'aucun contrôle lié trouvé');
  verifier('P7-a : le contrôle lié est PERIODIQUE et CONFORME',
    controleLie && controleLie.typeControle === 'PERIODIQUE'
    && controleLie.resultat === 'CONFORME', JSON.stringify(controleLie));

  // P7-b : un mouvement de CONTROLE sans résultat déclaré (SANS_OBJET par
  // défaut) est refusé à la validation — pas de « contrôle vide ».
  const ctrlVide = await store.creerMouvement({
    type: 'CONTROLE_PERIODIQUE', machineId: machineCtrl.id,
    technicien: 'Testeur Contrat'
  });
  await store.soumettreMouvement(ctrlVide.id);
  await verifierRejet('P7-b : un mouvement CONTROLE sans résultat est refusé à la validation',
    store.validerMouvement(ctrlVide.id, enseignant.id),
    'exige un résultat');

  // --- P7-d : effets machine du parcours mouvement STRICTEMENT identiques
  // à enregistrerControle direct (plan §3.a-c) — le contrôle lié ne perd
  // rien : lien personnel (B2), localisation, échéance déclarée.
  // 1) FUITE via mouvement CONTROLE : machine en FUITE, tout propagé.
  // P0-6 : fuite et réparation datées d'HIER — la clôture par le CONFORME
  // d'aujourd'hui exige désormais J+1 strict après la réparation.
  const ctrlFuite = await store.creerMouvement({
    type: 'CONTROLE_NON_PERIODIQUE', machineId: machineCtrl.id,
    date: dateRelative(-1),
    technicien: 'Un Enseignant', executeParId: enseignant.id,
    controle: { statutControle: 'FUITE', detecteurId: null,
      localisationFuite: 'Raccord évaporateur' }
  });
  await store.soumettreMouvement(ctrlFuite.id);
  const ctrlFuiteValide = await store.validerMouvement(ctrlFuite.id, enseignant.id);
  const mFuite = (await store.getMachines()).find((m) => m.id === machineCtrl.id);
  verifier('P7-d : un mouvement CONTROLE FUITE passe la machine en statut FUITE',
    mFuite.statut === 'FUITE', `statut = ${mFuite?.statut}`);
  verifier('P7-d : dernierControle de la machine = date du mouvement',
    mFuite.dernierControle === ctrlFuiteValide.date,
    JSON.stringify({ dernier: mFuite.dernierControle, date: ctrlFuiteValide.date }));
  const lieFuite = (await store.getControles())
    .find((c) => c.mouvementId === ctrlFuite.id);
  verifier('P7-d : le contrôle lié porte localisation, operateurId (B2) et NON_PERIODIQUE',
    Boolean(lieFuite) && lieFuite.localisationFuite === 'Raccord évaporateur'
    && lieFuite.operateurId === enseignant.id
    && lieFuite.typeControle === 'NON_PERIODIQUE', JSON.stringify(lieFuite));

  // 2) R4 par le parcours mouvement : réparation TRACÉE puis mouvement
  // CONTROLE CONFORME → retour EN_SERVICE ; l'échéance suivante est
  // CALCULÉE par la logique réglementaire unique (cadre 7) et portée à la
  // machine — même résultat que la méthode calculerProchainControle du
  // contrat (jamais de saisie libre par le chemin mouvement).
  await store.tracerReparation(lieFuite.id, {
    dateReparation: ctrlFuiteValide.date,
    natureReparation: 'Resserrage du raccord', reparateur: 'Un Enseignant' });
  const ctrlRetour = await store.creerMouvement({
    type: 'CONTROLE_NON_PERIODIQUE', machineId: machineCtrl.id,
    technicien: 'Un Enseignant', executeParId: enseignant.id,
    controle: { statutControle: 'CONFORME', detecteurId: null }
  });
  await store.soumettreMouvement(ctrlRetour.id);
  const ctrlRetourValide = await store.validerMouvement(ctrlRetour.id, enseignant.id);
  const mRetour = (await store.getMachines()).find((m) => m.id === machineCtrl.id);
  verifier('P7-d : réparation tracée + mouvement CONTROLE CONFORME → EN_SERVICE (R4)',
    mRetour.statut === 'EN_SERVICE', `statut = ${mRetour?.statut}`);
  const echeanceAttendue = await store.calculerProchainControle(
    machineCtrl.id, ctrlRetourValide.date);
  verifier('P7-d : l\'échéance RÉGLEMENTAIRE (logique unique cadre 7) est portée à la machine',
    echeanceAttendue !== null && mRetour.prochainControle === echeanceAttendue,
    JSON.stringify({ machine: mRetour?.prochainControle, attendu: echeanceAttendue }));

  // 3) Machine DÉMANTELÉE (sortie du parc) : un contrôle d'étanchéité n'a
  // plus d'objet — refus à la validation, même garde que les charges.
  const machineDemCtrl = await store.createMachine({
    designation: 'Machine démantelée P7-d', fluide: FLUIDE,
    chargeNominaleKg: 5, operateur: 'Testeur Contrat'
  });
  await store.demantelerMachine(machineDemCtrl.id, 'Testeur Contrat');
  const ctrlSurDem = await store.creerMouvement({
    type: 'CONTROLE_PERIODIQUE', machineId: machineDemCtrl.id,
    technicien: 'Testeur Contrat',
    controle: { statutControle: 'CONFORME', detecteurId: null }
  });
  await store.soumettreMouvement(ctrlSurDem.id);
  await verifierRejet('P7-d : contrôle refusé sur une machine démantelée',
    store.validerMouvement(ctrlSurDem.id, enseignant.id),
    'Machine démantelée');

  // --- P7-e : acceptation — immuabilité et correction du mouvement CONTROLE.
  // 1) Écriture figée : mêmes protections que toute écriture validée.
  await verifierRejet('P7-e : un mouvement CONTROLE validé refuse la suppression',
    store.supprimerMouvement(ctrlFuite.id, 'Testeur'), MSG_ECRITURE_FIGEE);
  await verifierRejet('P7-e : un mouvement CONTROLE validé refuse la revalidation',
    store.validerMouvement(ctrlFuite.id, enseignant.id), MSG_ECRITURE_FIGEE);

  // 2) Contre-écriture : SEULE correction possible — scellée, l'original
  // passe ANNULE, aucun effet stock fantôme (mouvement sec). Le contrôle
  // lié SURVIT à l'annulation (le geste a physiquement eu lieu ; rattaché
  // à une écriture ANNULE, comportement aligné sur le contrôle accessoire
  // et CONSIGNÉ au plan — les effets machine ne sont pas neutralisés).
  const machineAvantAnnulation = (await store.getMachines())
    .find((m) => m.id === machineCtrl.id);
  const annulation = await store.annulerParContreEcriture(
    ctrlRetour.id, 'Contrôle saisi par erreur (test P7-e).', enseignant.id);
  verifier('P7-e : la contre-écriture d\'un mouvement CONTROLE est VALIDE, '
    + 'type conservé, quantité 0',
    annulation.statut === 'VALIDE'
    && annulation.type === 'CONTROLE_NON_PERIODIQUE'
    && annulation.quantiteKg === 0
    && annulation.contreEcritureDe === ctrlRetour.id,
    JSON.stringify({ statut: annulation.statut, type: annulation.type,
      q: annulation.quantiteKg }));
  const originalAnnule = (await store.getMouvements())
    .find((m) => m.id === ctrlRetour.id);
  verifier('P7-e : l\'original passe ANNULE (données intactes)',
    originalAnnule.statut === 'ANNULE');
  const lieToujours = (await store.getControles())
    .find((c) => c.mouvementId === ctrlRetour.id);
  verifier('P7-e : le contrôle lié SURVIT à l\'annulation (rattaché à '
    + 'l\'écriture annulée)', Boolean(lieToujours));
  const machineApresAnnulation = (await store.getMachines())
    .find((m) => m.id === machineCtrl.id);
  verifier('P7-e : l\'annulation ne retouche PAS la machine (mouvement sec — '
    + 'statut/échéance conservés, comportement consigné)',
    machineApresAnnulation.statut === machineAvantAnnulation.statut
    && machineApresAnnulation.prochainControle
      === machineAvantAnnulation.prochainControle
    && machineApresAnnulation.dernierControle
      === machineAvantAnnulation.dernierControle);

  // 3) createControle direct : un mouvementId forgé fabriquerait un faux
  // rattachement au registre scellé — refus (reste consigné de l'audit,
  // fermé ; le serveur l'insérait, la démo l'ignorait en silence).
  await verifierRejet('P7-e : createControle direct refuse un mouvementId forgé',
    store.createControle({ machineId: machineCtrl.id, resultat: 'CONFORME',
      mouvementId: ctrlPerio.id }),
    'Lien de mouvement refusé');
}

// ============================================================
// Verdict
// ============================================================
console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log(`Contrat DataStore v${VERSION_CONTRAT} : ` +
  `l’implémentation « ${NOM_STORE} » est conforme.`);
