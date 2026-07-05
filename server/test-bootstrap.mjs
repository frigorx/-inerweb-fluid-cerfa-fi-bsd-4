// ============================================================
// inerWeb Fluide — PREUVE du bootstrap ADMIN (V9-E5, vague 4)
// Exécution : node server/test-bootstrap.mjs
//
// Éprouve server/creer-admin.js — SEULE façon de créer le 1er ADMIN.
// N'exerce PAS la saisie interactive au clavier (aucun vrai TTY dans un
// test automatisé) : cible directement `creerPremierAdmin` et
// `analyserArguments`, la logique testable indépendamment du terminal.
// Reprend le patron de test-comptes.mjs : base jetable sous os.tmpdir(),
// jamais data/ réel.
//
// Familles :
//   1. analyserArguments : formes --cle=valeur et --cle valeur.
//   2. Bootstrap réussi : compte ADMIN créé, hash vérifiable, entrée de
//      journal BOOTSTRAP_ADMIN.
//   3. Refus d'un 2e ADMIN : la commande s'arrête, message clair, AUCUNE
//      ligne supplémentaire insérée en base.
//   4. Refus mot de passe trop court (< 10 caractères) — avant toute base.
//   5. Refus identifiant déjà utilisé (compte non-ADMIN portant déjà ce
//      login).
//   6. Refus identifiant absent.
//
// Test manuel du scan tablette (LAN, vague 4, documenté ici faute de banc
// réseau automatisable) :
//   1) Lancer :  IWF_LAN=1 IWF_HOTE_LAN=<IP-LAN-du-poste> node server/serveur.js
//      (sous PowerShell : $env:IWF_LAN='1'; $env:IWF_HOTE_LAN='192.168.1.42';
//       node server/serveur.js)
//   2) Depuis une tablette connectée au MÊME réseau, ouvrir
//      http://<IP-LAN-du-poste>:2011/ — la page doit se charger (Host reconnu
//      par HOTES_AUTORISES puisque LAN_ACTIF étend la liste).
//   3) Sans se connecter, tenter une lecture (ex. onglet Fluides) : DOIT être
//      refusée (403 « Session requise ») — la garde de lecture LAN de la
//      vague 3 s'applique dès que la connexion n'est pas loopback.
//   4) Se connecter (POST /api/connexion) : le cookie iwf_session doit être
//      accepté par le navigateur de la tablette (Path=/, SameSite=Strict
//      n'empêche pas une navigation directe) ; les lectures et mutations
//      habilitées doivent alors fonctionner.
//   5) Relancer SANS IWF_LAN (ou IWF_LAN=0) : la même tablette ne doit plus
//      pouvoir atteindre le serveur (retour au 127.0.0.1 strict).
//
// Node ≥ 22 (node:sqlite, node:crypto), sans DOM.
// ============================================================

import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const db = require('./db.js');
const comptes = require('./comptes.js');
const bootstrap = require('./creer-admin.js');

// ------------------------------------------------------------
// Outillage de vérification (conventions maison des suites v8/v9).
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

// ============================================================
// 1. analyserArguments : formes --cle=valeur et --cle valeur
// ============================================================
{
  const a = bootstrap.analyserArguments(['--login=admin.test', '--mot-de-passe=SecretLong123']);
  verifier('analyserArguments : forme --cle=valeur (login)', a.login === 'admin.test');
  verifier('analyserArguments : forme --cle=valeur (mot-de-passe)',
    a['mot-de-passe'] === 'SecretLong123');

  const b = bootstrap.analyserArguments(['--login', 'admin.test2', '--mot-de-passe', 'AutreSecret1']);
  verifier('analyserArguments : forme --cle valeur (login)', b.login === 'admin.test2');
  verifier('analyserArguments : forme --cle valeur (mot-de-passe)',
    b['mot-de-passe'] === 'AutreSecret1');

  const c = bootstrap.analyserArguments([]);
  verifier('analyserArguments : argv vide → objet vide', Object.keys(c).length === 0);
}

// ------------------------------------------------------------
// Base jetable (data/ sous un dossier temporaire, jamais le data/ réel).
// ------------------------------------------------------------
const DOSSIER = mkdtempSync(join(tmpdir(), 'inerweb-fluide-bootstrap-'));
const CHEMIN_BASE = join(DOSSIER, 'data', 'inerweb-fluide.db');
db.ouvrir(CHEMIN_BASE);

db.run(`INSERT INTO etablissements (id, raison_sociale)
        VALUES ('ETB-TEST', 'Lycée du test');`);

// ============================================================
// 4. Refus mot de passe trop court (AVANT tout accès base ADMIN)
// ============================================================
{
  let leve = null;
  try {
    bootstrap.creerPremierAdmin('admin.court', 'court123');
  } catch (erreur) {
    leve = erreur;
  }
  verifier('mot de passe < 10 caractères → refusé', leve !== null,
    leve?.message);
  verifier('aucun compte inséré après ce refus',
    db.get('SELECT count(*) AS n FROM utilisateurs_app').n === 0);
}

// ============================================================
// 6. Refus identifiant absent
// ============================================================
{
  let leve = null;
  try {
    bootstrap.creerPremierAdmin('', 'MotDePasseValideLong1');
  } catch (erreur) {
    leve = erreur;
  }
  verifier('identifiant absent → refusé', leve !== null, leve?.message);
}

// ============================================================
// 2. Bootstrap réussi : compte ADMIN créé, hash vérifiable, journal
// ============================================================
let admin;
{
  admin = bootstrap.creerPremierAdmin('admin.bootstrap', 'MotDePasseAdminBootstrap-2026');
  verifier('creerPremierAdmin renvoie un id, un login, le rôle ADMIN',
    typeof admin.id === 'string' && admin.login === 'admin.bootstrap' && admin.role === 'ADMIN');

  const ligne = db.get(
    'SELECT * FROM utilisateurs_app WHERE login = ?', ['admin.bootstrap']);
  verifier('la ligne existe bien en base avec le rôle ADMIN',
    ligne !== undefined && ligne.role === 'ADMIN');
  verifier('le mot de passe est vérifiable via comptes.verifierMotDePasse',
    comptes.verifierMotDePasse(
      'MotDePasseAdminBootstrap-2026', ligne.hash_mot_de_passe, ligne.sel) === true);
  verifier('un mauvais mot de passe est rejeté',
    comptes.verifierMotDePasse(
      'UnAutreMotDePasse', ligne.hash_mot_de_passe, ligne.sel) === false);

  const entreeJournal = db.get(
    `SELECT * FROM journal_audit WHERE action = 'BOOTSTRAP_ADMIN'
     ORDER BY id DESC LIMIT 1`);
  verifier('une entrée BOOTSTRAP_ADMIN a été journalisée',
    entreeJournal !== undefined && entreeJournal.cible === 'admin.bootstrap');
}

// ============================================================
// 3. Refus d'un 2e ADMIN
// ============================================================
{
  let leve = null;
  try {
    bootstrap.creerPremierAdmin('admin.intrus', 'AutreMotDePasseLong-2026');
  } catch (erreur) {
    leve = erreur;
  }
  verifier('un 2e ADMIN est refusé (le 1er existe déjà)', leve !== null, leve?.message);
  verifier('le message cite le login de l\'ADMIN déjà présent',
    leve?.message.includes('admin.bootstrap'));
  verifier('le code d\'erreur est ADMIN_DEJA_PRESENT',
    leve?.code === 'ADMIN_DEJA_PRESENT');

  const compteIntrus = db.get(
    'SELECT id FROM utilisateurs_app WHERE login = ?', ['admin.intrus']);
  verifier('aucune ligne insérée pour le compte refusé',
    compteIntrus === undefined);

  const nbAdmins = db.get(
    "SELECT count(*) AS n FROM utilisateurs_app WHERE role = 'ADMIN'").n;
  verifier('un seul compte ADMIN existe en base après le refus', nbAdmins === 1);
}

// ============================================================
// 5. Refus identifiant déjà utilisé (même si role différent visé)
// ============================================================
{
  // On simule un ADMIN qui n'existerait plus (impossible en pratique — la
  // garde du point 3 l'empêche déjà) : ce test vise la garde d'UNICITÉ DU
  // LOGIN elle-même, en la déclenchant sur un login non-ADMIN existant.
  // On la contourne donc en retirant temporairement l'ADMIN pour isoler
  // strictement la vérification d'unicité de login (sans quoi la garde
  // « ADMIN déjà présent » masquerait systématiquement celle-ci).
  db.run("DELETE FROM utilisateurs_app WHERE role = 'ADMIN'");
  db.run(
    `INSERT INTO utilisateurs_app (id, login, hash_mot_de_passe, sel, role)
     VALUES ('UTI-AUTRE', 'login.pris', 'aa', 'bb', 'ENSEIGNANT')`);

  let leve = null;
  try {
    bootstrap.creerPremierAdmin('login.pris', 'MotDePasseValideLong2');
  } catch (erreur) {
    leve = erreur;
  }
  verifier('identifiant déjà utilisé (par un compte non-ADMIN) → refusé',
    leve !== null, leve?.message);
}

// ============================================================
// Verdict + nettoyage
// ============================================================
db.fermer();
try {
  rmSync(DOSSIER, { recursive: true, force: true });
} catch {
  // Best-effort : sous Windows, WAL/SHM peuvent rester verrouillés un court
  // instant après la fermeture — ne fait pas échouer la suite.
}

console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('Bootstrap ADMIN (V9-E5, vague 4) : tout est vert.');
