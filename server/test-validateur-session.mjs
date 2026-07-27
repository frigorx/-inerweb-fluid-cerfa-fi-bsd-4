// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// Validateur DE SESSION (lot B — condition n° 12 de la liste
// docs/CONDITIONS-BLOCANTES-OFFICIEL.md) : l'API n'accepte JAMAIS qu'un
// utilisateur déclare l'identité d'un autre validateur — le trou
// « qui déclaré ≠ prouvé » de l'audit externe du 15/07 est FERMÉ pour
// validerMouvement ET annulerParContreEcriture, dans TOUS les modes.
// Les attaques sont TIRÉES : chaque refus est prouvé contre une session
// réelle (compte + personnel), le repli sans session (harnais) est
// prouvé intact, et la simulation OFFICIELLE reflète l'état de session.
// Exécution : node server/test-validateur-session.mjs — base JETABLE.
// ============================================================

import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const db = require('./db.js');
const api = require('./api.js');
const comptes = require('./comptes.js');

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else {
    nbEchecs += 1;
    console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`);
  }
}
function attendreRejet(libelle, fn, extrait, codeAttendu = null) {
  try {
    fn();
    verifier(libelle, false, 'aucune erreur levée');
  } catch (erreur) {
    verifier(libelle,
      String(erreur.message).includes(extrait) &&
      (codeAttendu === null || erreur.code === codeAttendu),
      `message = « ${erreur.message} », code = ${erreur.code}`);
  }
}

// Base JETABLE (jamais le data/ réel), NICHÉE sous <mkdtemp>/data/ pour
// que backups/ (frère de data/) reste dans le bac à sable — les crochets
// de sauvegarde/scellement écriraient sinon dans Temp\backups partagé.
const dossier = mkdtempSync(join(tmpdir(), 'inerweb-fluide-validateur-'));
mkdirSync(join(dossier, 'data'));
db.ouvrir(join(dossier, 'data', 'test.db'));

const sansSession = { role: 'REFERENT' };
api.appeler('init', {}, sansSession);

// Deux valideurs au registre + un compte chacun, plus un compte SANS fiche.
const valideurA = api.appeler('createPersonne', { donneesPersonne: {
  prenom: 'Référent', nom: 'Alpha', typePersonne: 'ENSEIGNANT',
  roleApp: 'REFERENT' } }, sansSession);
const valideurB = api.appeler('createPersonne', { donneesPersonne: {
  prenom: 'Enseignant', nom: 'Bravo', typePersonne: 'ENSEIGNANT',
  roleApp: 'ENSEIGNANT' } }, sansSession);

/** Crée un compte comme routes-comptes.js (même hachage, même table). */
function creerCompte(login, role, personnelId) {
  const { hash, sel } = comptes.hacherMotDePasse(`motdepasse-${login}`);
  const id = db.generateId('UTI');
  db.run(
    `INSERT INTO utilisateurs_app (id, login, hash_mot_de_passe, sel, role,
       personnel_id) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, login, hash, sel, role, personnelId]);
  return id;
}
const sessionA = {
  role: 'REFERENT', utilisateur: creerCompte('alpha', 'REFERENT', valideurA.id)
};
const sessionSansFiche = {
  role: 'REFERENT', utilisateur: creerCompte('admincli', 'REFERENT', null)
};

// Parc minimal : machine + bouteille, et une fabrique de mouvements SOUMIS.
const machine = api.appeler('createMachine', { donneesMachine: {
  designation: 'Groupe de preuve', fluide: 'R-134a', chargeNominaleKg: 10,
  operateur: 'Testeur' } }, sansSession);
const bouteille = api.appeler('createBouteille', { donneesBouteille: {
  type: 'NEUVE', fluide: 'R-134a', tareKg: 10, masseBruteKg: 30,
  contenanceMaxKg: 25 } }, sansSession);
let peseeCourante = 30;
function mouvementSoumis() {
  const mvt = api.appeler('creerMouvement', { donneesMouvement: {
    type: 'CHARGE_APPOINT', machineId: machine.id,
    bouteilleSrcId: bouteille.id, peseeAvantKg: peseeCourante,
    peseeApresKg: peseeCourante - 1, technicien: 'Testeur',
    causeMouvement: 'Preuve de session' } }, sansSession);
  peseeCourante -= 1;
  api.appeler('soumettreMouvement', { id: mvt.id }, sansSession);
  return mvt;
}

// ============================================================
// 1. L'ATTAQUE : une session déclare l'identité d'un AUTRE validateur
// ============================================================
{
  const mvt = mouvementSoumis();
  attendreRejet(
    'validerMouvement refuse (403) un validateur qui n’est pas la session',
    () => api.appeler('validerMouvement',
      { id: mvt.id, validateurId: valideurB.id }, sessionA),
    'n’est pas la personne connectée', 403);
  verifier('le mouvement est resté SOUMIS (aucun effet avant la garde)',
    api.appeler('getMouvements', {}, sansSession)
      .find((m) => m.id === mvt.id)?.statut === 'SOUMIS');

  // 2. Un compte SANS fiche personnel ne peut pas valider.
  attendreRejet(
    'validerMouvement refuse (403) un compte sans fiche du personnel',
    () => api.appeler('validerMouvement',
      { id: mvt.id, validateurId: valideurA.id }, sessionSansFiche),
    'aucune fiche du personnel', 403);

  // 3. Le cas légitime : le validateur EST la personne connectée.
  const valide = api.appeler('validerMouvement',
    { id: mvt.id, validateurId: valideurA.id }, sessionA);
  verifier('validerMouvement accepte le validateur de la session',
    valide.statut === 'VALIDE' && valide.validateurId === valideurA.id);
}

// ============================================================
// 4. Contre-écriture : même exigence (écriture scellée)
// ============================================================
{
  const mvt = mouvementSoumis();
  api.appeler('validerMouvement',
    { id: mvt.id, validateurId: valideurA.id }, sessionA);
  attendreRejet(
    'annulerParContreEcriture refuse (403) un validateur qui n’est pas la session',
    () => api.appeler('annulerParContreEcriture',
      { id: mvt.id, motif: 'Essai de forge', validateurId: valideurB.id },
      sessionA),
    'n’est pas la personne connectée', 403);
  const contre = api.appeler('annulerParContreEcriture',
    { id: mvt.id, motif: 'Annulation légitime', validateurId: valideurA.id },
    sessionA);
  verifier('annulerParContreEcriture accepte le validateur de la session',
    contre.contreEcritureDe === mvt.id);

  // Lot 1 / C2 (27/07) : l'écriture DIT QUI L'A FAITE — et cette identité
  // vient de la SESSION, jamais du corps de la requête.
  verifier('la contre-écriture porte l’identité de la SESSION (executeParId)',
    contre.executeParId === valideurA.id,
    JSON.stringify({ executeParId: contre.executeParId }));
}

// ============================================================
// 4 bis. L'ATTAQUE sur le champ neuf : « Exécuté par » ne se DÉCLARE pas.
// Le corps de la requête ne doit pas pouvoir désigner quelqu'un d'autre
// comme auteur d'une écriture scellée — sans quoi on aurait remplacé une
// colonne vide par une colonne MENSONGÈRE, ce qui est pire.
// ============================================================
{
  const mvt = mouvementSoumis();
  api.appeler('validerMouvement',
    { id: mvt.id, validateurId: valideurA.id }, sessionA);
  const contre = api.appeler('annulerParContreEcriture',
    { id: mvt.id, motif: 'Tentative de désignation',
      validateurId: valideurA.id, executeParId: valideurB.id }, sessionA);
  verifier('executeParId DÉCLARÉ dans le corps est IGNORÉ (session seule)',
    contre.executeParId === valideurA.id && contre.executeParId !== valideurB.id,
    JSON.stringify({ executeParId: contre.executeParId }));
}

// ============================================================
// 5. Repli sans session (harnais in-process) : comportement historique
// ============================================================
{
  const mvt = mouvementSoumis();
  const valide = api.appeler('validerMouvement',
    { id: mvt.id, validateurId: valideurB.id }, sansSession);
  verifier('sans session (harnais) : validateur déclaré accepté (parité contrat)',
    valide.statut === 'VALIDE' && valide.validateurId === valideurB.id);
}

// ============================================================
// 6. La simulation OFFICIELLE reflète l'état de session et de poste
// ============================================================
{
  const mvt = mouvementSoumis();
  const simSansFiche = api.appeler('simulerValidationOfficielle',
    { mouvementId: mvt.id }, sessionSansFiche);
  verifier('simulation (compte sans fiche) : blocage VALIDATEUR présent',
    simSansFiche.blocages.some((b) => b.code === 'VALIDATEUR'),
    JSON.stringify(simSansFiche.blocages.map((b) => b.code)));
  const simLiee = api.appeler('simulerValidationOfficielle',
    { mouvementId: mvt.id }, sessionA);
  verifier('simulation (compte lié) : aucun blocage VALIDATEUR',
    !simLiee.blocages.some((b) => b.code === 'VALIDATEUR'),
    JSON.stringify(simLiee.blocages.map((b) => b.code)));
  verifier('simulation : base jetable sans archive → blocage SAUVEGARDE (condition 5)',
    simLiee.blocages.some((b) => b.code === 'SAUVEGARDE'));
  // T1 (20/07) : le verrou de livraison est REFERMÉ (audit externe, le
  // temps des P0) — il DOIT réapparaître dans la simulation (le mode
  // Officiel est refermé ; la mécanique reste aussi testée par
  // test-blocage-officiel avec un cadre construit).
  verifier('simulation : le verrou de livraison est REFERMÉ (présent dans les blocages)',
    simLiee.blocages.some((b) => b.code === 'VERROU_LIVRAISON'),
    JSON.stringify(simLiee.blocages.map((b) => b.code)));
  verifier('simulation : intervenant non désigné → blocage INTERVENANT (condition 6)',
    simLiee.blocages.some((b) => b.code === 'INTERVENANT'),
    JSON.stringify(simLiee.blocages.map((b) => b.code)));
}

// ------------------------------------------------------------
console.log(`\n${nbOk} OK, ${nbEchecs} échec(s) [validateur de session]`);
process.exit(nbEchecs === 0 ? 0 : 1);
