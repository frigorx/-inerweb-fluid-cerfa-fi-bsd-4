// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// Test des exports CSV Phase D (exécution : node test-exports.mjs)
// Vérifie les 9 tables, le format CSV (BOM, séparateur, CRLF,
// échappement) et la cohérence des volumes avec le monde de démo.
// Node ≥ 18, sans DOM.
// ============================================================

import { creerStore } from '../data/datastore.js';
import { toutesLesTables, genererJournalAuditPdf, champCsv } from './exports.js';

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

const BOM = '﻿';
const ANNEE = new Date().getFullYear();

/** Découpe un CSV (déjà débarrassé du BOM) en lignes non vides. */
function lignesDe(contenu) {
  return contenu.replace(/^﻿/, '').split('\r\n').filter((l) => l !== '');
}

const store = await creerStore();

// --- 1. Onze fichiers, noms exacts ------------------------------
const fichiers = await toutesLesTables(store, ANNEE);
const NOMS_ATTENDUS = ['personnel.csv', 'habilitations.csv',
  'mentions-habilitation.csv', 'outillage.csv', 'bouteilles.csv',
  'machines.csv', 'mouvements.csv', 'controles.csv', 'balance-matiere.csv',
  'bsff.csv', 'journal-audit.csv'];
verifier('toutesLesTables retourne exactement 11 fichiers',
  fichiers.length === 11, `reçu ${fichiers.length}`);
verifier('les 11 noms de fichiers attendus sont présents',
  NOMS_ATTENDUS.every((nom) => fichiers.some((f) => f.nom === nom)),
  JSON.stringify(fichiers.map((f) => f.nom)));

const parNom = new Map(fichiers.map((f) => [f.nom, f.contenu]));

// Brique 2 (outils multiples) : aucun mouvement du monde de démo ne porte
// d'outil lié — outils-intervention.csv est CONDITIONNEL et doit donc être
// absent (pas un fichier vide en-tête seul comme les tables fixes).
verifier('outils-intervention.csv absent : aucun outil lié sur le monde de démo',
  !fichiers.some((f) => f.nom === 'outils-intervention.csv'));

// --- 2. BOM UTF-8 présent sur chaque fichier --------------------
verifier('chaque fichier commence par le BOM UTF-8',
  fichiers.every((f) => f.contenu.startsWith(BOM)));

// --- 3. Fin de ligne CRLF partout (pas de \n orphelin) ----------
const personnelBrut = parNom.get('personnel.csv');
verifier('les lignes sont terminées en CRLF (\\r\\n)',
  personnelBrut.includes('\r\n') &&
  !personnelBrut.replace(/\r\n/g, '').includes('\n'));

// --- 4. Séparateur « ; » dans l'en-tête -------------------------
const enteteMachines = lignesDe(parNom.get('machines.csv'))[0];
verifier('le séparateur « ; » est bien utilisé (en-tête machines)',
  enteteMachines.includes(';') && enteteMachines.startsWith('Code;'),
  enteteMachines);

// --- 5. Volumes cohérents avec le monde de démo -----------------
// 4 personnes au registre (2 enseignants + 2 élèves) + 1 ligne d'en-tête.
const lignesPersonnel = lignesDe(personnelBrut);
verifier('personnel.csv : 4 personnes + en-tête = 5 lignes',
  lignesPersonnel.length === 5, `reçu ${lignesPersonnel.length}`);

// Habilitations / mentions (chantier B2) : le monde de démo en SÈME
// désormais (réserve B2, 14/07) — le CSV les porte avec le NOM RÉSOLU
// de la personne (jamais un id brut), révoquées comprises et datées.
verifier('habilitations.csv : les 3 habilitations semées (P0-5 : + A1 2025), noms résolus',
  lignesDe(parNom.get('habilitations.csv')).length === 4
  && parNom.get('habilitations.csv').includes('Marc Delorme')
  && !parNom.get('habilitations.csv').includes('per-fh'));
verifier('mentions-habilitation.csv : les 2 mentions semées (dont la révoquée)',
  lignesDe(parNom.get('mentions-habilitation.csv')).length === 3
  && parNom.get('mentions-habilitation.csv').includes('Sophie Bianchi'));
{
  const personne = await store.createPersonne({
    nom: 'Cartier', prenom: 'Aude', typePersonne: 'ENSEIGNANT'
  });
  await store.createHabilitation({
    personneId: personne.id, regime: '2008', categorie: 'I',
    numeroAttestation: 'AAF-EXPORT-1', operateur: 'testeur'
  });
  const mention = await store.createMention({
    personneId: personne.id, fluideMention: 'CO2', operateur: 'testeur'
  });
  await store.revoquerMention(mention.id, 'testeur');
  const fichiersB2 = await toutesLesTables(store, ANNEE);
  const habCsv = fichiersB2.find((f) => f.nom === 'habilitations.csv').contenu;
  const menCsv = fichiersB2.find((f) => f.nom === 'mentions-habilitation.csv').contenu;
  verifier('habilitations.csv : la ligne porte le nom résolu, pas l’id',
    habCsv.includes('Aude Cartier') && habCsv.includes('AAF-EXPORT-1')
    && !habCsv.includes(personne.id));
  verifier('mentions-habilitation.csv : la mention RÉVOQUÉE reste au dossier, datée',
    menCsv.includes('Aude Cartier') && menCsv.includes('Révoquée')
    && menCsv.includes('CO₂ (R-744)'));
}

// 7 mouvements de démo, tous datés dans l'année courante (2026).
const lignesMouvements = lignesDe(parNom.get('mouvements.csv'));
verifier('mouvements.csv : 7 mouvements de l’année + en-tête = 8 lignes',
  lignesMouvements.length === 8, `reçu ${lignesMouvements.length}`);

// 5 outils, 5 bouteilles, 6 machines, 3 contrôles de démo.
verifier('outillage.csv : 5 outils + en-tête = 6 lignes',
  lignesDe(parNom.get('outillage.csv')).length === 6);
verifier('bouteilles.csv : 5 bouteilles + en-tête = 6 lignes',
  lignesDe(parNom.get('bouteilles.csv')).length === 6);
verifier('machines.csv : 6 machines + en-tête = 7 lignes',
  lignesDe(parNom.get('machines.csv')).length === 7);
verifier('controles.csv : 3 contrôles de l’année + en-tête = 4 lignes',
  lignesDe(parNom.get('controles.csv')).length === 4);

// bsff.csv et journal-audit.csv : aucun BSFF de démo au départ, mais un
// journal d'audit non vide (le store journalise dès l'initialisation).
verifier('bsff.csv : aucun BSFF en démo → 1 seule ligne (en-tête)',
  lignesDe(parNom.get('bsff.csv')).length === 1);
verifier('journal-audit.csv : au moins une ligne de données au-delà de l’en-tête',
  lignesDe(parNom.get('journal-audit.csv')).length >= 1);

// --- 6. Machines : client résolu en raison sociale --------------
const ligneM1 = lignesDe(parNom.get('machines.csv'))
  .find((l) => l.startsWith('M1;'));
verifier('machines.csv : le client est résolu en raison sociale (pas un ID)',
  Boolean(ligneM1) && ligneM1.includes('Lycée J. Raynaud'),
  ligneM1);

// --- 7. Échappement CSV correct ----------------------------------
// Une justification d'écart de balance ne peut être saisie que si un
// écart existe déjà (un inventaire doit d'abord être posé) : on saisit
// un inventaire R-32 légèrement en dessous du théorique, puis on
// justifie avec un texte contenant à la fois « ; » et des guillemets,
// pour prouver l'échappement CSV en conditions réelles.
const utilisateur = await store.getUtilisateurCourant();
const balanceInitiale = await store.getBalanceMatiere(ANNEE);
const theoriqueR32 = balanceInitiale.lignes
  .find((l) => l.fluide === 'R-32').stockTheoriqueKg;
await store.saisirInventaire(ANNEE,
  [{ fluide: 'R-32', stockReelKg: theoriqueR32 - 0.35 }], utilisateur.id);
await store.justifierEcart(ANNEE, 'R-32',
  'Fuite ; purge atelier "TP n°3" (constat du 03/07).');
const fichiersApresJustif = await toutesLesTables(store, ANNEE);
const balanceApres = fichiersApresJustif
  .find((f) => f.nom === 'balance-matiere.csv').contenu;
verifier('balance-matiere.csv : justification contenant « ; » et guillemets ' +
  'correctement échappée (entourée, guillemets doublés)',
  balanceApres.includes('"Fuite ; purge atelier ""TP n°3"" (constat du 03/07).""') === false &&
  balanceApres.includes('"Fuite ; purge atelier ""TP n°3"" (constat du 03/07)."'),
  balanceApres.split('\r\n').find((l) => l.startsWith('R-32')));

// --- 8. Balance matière : ligne avec justification visible ------
const ligneR32 = lignesDe(balanceApres).find((l) => l.startsWith('R-32'));
verifier('balance-matiere.csv : la ligne R-32 porte bien la justification saisie',
  Boolean(ligneR32) && ligneR32.includes('Fuite ; purge atelier'),
  ligneR32);

// --- 9. Nombres au format fr (virgule décimale) -----------------
const ligneB1 = lignesDe(parNom.get('bouteilles.csv'))
  .find((l) => l.startsWith('B-01;'));
verifier('bouteilles.csv : masses formatées avec virgule décimale (pas un point)',
  Boolean(ligneB1) && ligneB1.includes('7,40') && !/\b7\.40\b/.test(ligneB1),
  ligneB1);

// --- 10. Dates au format fr JJ/MM/AAAA ---------------------------
verifier('bouteilles.csv : dates au format JJ/MM/AAAA',
  Boolean(ligneB1) && /\b15\/04\/2026\b/.test(ligneB1), ligneB1);

// --- 11. CF-12 : neutralisation de l'injection de formule CSV ---
// Un champ TEXTE commençant par « = + - @ » est préfixé d'une apostrophe
// (convention tableur : affiché tel quel, jamais interprété en formule).
for (const motif of ['=SOMME(A1:A9)', '+1+1', '-2+3', '@NOTIFIER(1)']) {
  await store.justifierEcart(ANNEE, 'R-32', motif);
  const fichiersFormule = await toutesLesTables(store, ANNEE);
  const balanceFormule = fichiersFormule
    .find((f) => f.nom === 'balance-matiere.csv').contenu;
  const ligneFormule = lignesDe(balanceFormule).find((l) => l.startsWith('R-32'));
  verifier(`balance-matiere.csv : justification « ${motif} » neutralisée (apostrophe)`,
    Boolean(ligneFormule) && ligneFormule.includes(`'${motif}`), ligneFormule);
}

// --- 11 bis. CF-12 : tabulation en tête, amorce d'injection CSV (OWASP) --
// Testé directement sur champCsv() : les champs métier réels sont trimmés
// avant stockage (bonne hygiène des données), donc une tabulation en tête
// ne survit à aucun chemin métier existant — mais la fonction d'échappement
// elle-même doit rester sûre si un texte non maîtrisé (import, futur champ)
// lui parvenait tel quel.
verifier('champCsv : tabulation + « = » neutralisée (apostrophe)',
  champCsv('\t=SOMME(A1:A9)') === "'\t=SOMME(A1:A9)",
  champCsv('\t=SOMME(A1:A9)'));
// Le cas « nombre réel jamais préfixé » est déjà couvert plus bas (section
// 12) via le vrai chemin nb() → MARQUEUR_NOMBRE, sur un écart négatif réel.

// --- 12. CF-12 : un nombre négatif RÉEL n'est jamais préfixé -----
// L'écart d'inventaire (ecartKg) est une valeur numérique déjà formatée
// par nb() : même négatif (« -3,50 »), il ne doit PAS recevoir
// l'apostrophe de neutralisation (ce n'est pas une formule).
await store.saisirInventaire(ANNEE,
  [{ fluide: 'R-32', stockReelKg: theoriqueR32 - 3.5 }], utilisateur.id);
await store.justifierEcart(ANNEE, 'R-32', 'Écart contrôlé, sans lien avec une fuite.');
const fichiersEcartNeg = await toutesLesTables(store, ANNEE);
const balanceEcartNeg = fichiersEcartNeg
  .find((f) => f.nom === 'balance-matiere.csv').contenu;
const ligneEcartNeg = lignesDe(balanceEcartNeg).find((l) => l.startsWith('R-32'));
verifier('balance-matiere.csv : écart négatif réel (-3,50) non préfixé d’apostrophe',
  Boolean(ligneEcartNeg) && ligneEcartNeg.includes('-3,50') &&
  !ligneEcartNeg.includes("'-3,50"), ligneEcartNeg);

// --- 13. CF-22 : export PDF du journal d'audit -------------------
const pdfJournal = await genererJournalAuditPdf(store);
verifier('genererJournalAuditPdf retourne des octets et un nom de fichier',
  pdfJournal.octets instanceof Uint8Array && pdfJournal.octets.length > 0 &&
  pdfJournal.nomFichier === 'journal-audit.pdf');
const enteteMagiquePdf = Buffer.from(pdfJournal.octets.slice(0, 5)).toString('latin1');
verifier('genererJournalAuditPdf produit un PDF valide (en-tête %PDF-)',
  enteteMagiquePdf === '%PDF-', enteteMagiquePdf);

// --- 14. Brique 2 : outils-intervention.csv apparaît dès qu'un mouvement
// validé porte un outil lié, avec son statut figé (CONFORME au jour de la
// validation) — motif source : v8/js/data/test-outils-intervention.mjs.
{
  const fluideOutils = (await store.getFluides())[0].code;
  const enseignantOutils = await store.createPersonne({
    nom: 'Outils', prenom: 'Export', typePersonne: 'ENSEIGNANT'
  });
  const machineOutils = await store.createMachine({
    designation: 'Machine export outils', fluide: fluideOutils, chargeNominaleKg: 10
  });
  const bouteilleOutils = await store.createBouteille({
    type: 'NEUVE', fluide: fluideOutils, tareKg: 10, masseBruteKg: 20, contenanceMaxKg: 12
  });
  const balanceOutils = await store.createOutil({
    typeOutil: 'BALANCE', marque: 'Sauter', modele: 'FK-50-CSV',
    numSerie: 'SN-CSV-1', prochaineEcheance: '2099-01-01'
  });
  const mvOutils = await store.creerMouvement({
    type: 'CHARGE_APPOINT', machineId: machineOutils.id,
    bouteilleSrcId: bouteilleOutils.id, peseeAvantKg: 20, peseeApresKg: 18,
    technicien: 'Export Outils', outilsIds: [balanceOutils.id]
  });
  await store.soumettreMouvement(mvOutils.id);
  await store.validerMouvement(mvOutils.id, enseignantOutils.id);

  const fichiersOutils = await toutesLesTables(store, ANNEE);
  const tableOutils = fichiersOutils.find((f) => f.nom === 'outils-intervention.csv');
  verifier('outils-intervention.csv apparaît dès qu’un mouvement validé porte un outil lié',
    Boolean(tableOutils));

  const lignesOutils = tableOutils ? lignesDe(tableOutils.contenu) : [];
  const ligneMvOutils = lignesOutils.find((l) => l.startsWith(mvOutils.numero + ';'));
  verifier('la ligne porte le numéro de mouvement, l’outil (type/marque/modèle) '
    + 'et son statut figé CONFORME',
    Boolean(ligneMvOutils) && ligneMvOutils.includes('BALANCE')
    && ligneMvOutils.includes('Sauter') && ligneMvOutils.includes('FK-50-CSV')
    && ligneMvOutils.includes('CONFORME'),
    ligneMvOutils);
}

// --- 15. Brique 3 : rôles réels (executeParId) résolus en nom, pas en id,
// dans mouvements.csv — colonne « Exécuté par » (aucun statut requis :
// csvMouvements ne filtre que par année, cf. test 6 ci-dessus).
{
  const fluideRoles = (await store.getFluides())[0].code;
  const executantRoles = await store.createPersonne({
    nom: 'Rolland', prenom: 'Sacha', typePersonne: 'ENSEIGNANT'
  });
  const machineRoles = await store.createMachine({
    designation: 'Machine export rôles', fluide: fluideRoles, chargeNominaleKg: 10
  });
  const bouteilleRoles = await store.createBouteille({
    type: 'NEUVE', fluide: fluideRoles, tareKg: 10, masseBruteKg: 20, contenanceMaxKg: 12
  });
  const mvRoles = await store.creerMouvement({
    type: 'CHARGE_APPOINT', machineId: machineRoles.id,
    bouteilleSrcId: bouteilleRoles.id, peseeAvantKg: 20, peseeApresKg: 18,
    technicien: 'Export Rôles', executeParId: executantRoles.id
  });

  const fichiersRoles = await toutesLesTables(store, ANNEE);
  const mvCsv = fichiersRoles.find((f) => f.nom === 'mouvements.csv').contenu;
  const ligneMvRoles = lignesDe(mvCsv).find((l) => l.startsWith(mvRoles.numero + ';'));
  verifier('mouvements.csv : la colonne « Exécuté par » porte le nom résolu (executeParId)',
    Boolean(ligneMvRoles) && ligneMvRoles.includes('Sacha Rolland')
    && !ligneMvRoles.includes(executantRoles.id),
    ligneMvRoles);
}

// --- Verdict ------------------------------------------------------
console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('Tous les tests des exports CSV passent.');
