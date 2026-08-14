// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — PREUVE du refus d'une base vive sous un dossier
// synchronisé (P1-6, reprise RC 8.1)
// Exécution : node server/test-emplacement-base.mjs
//
// Constat (audit externe #2, 20/07) : une base SQLite ouverte en WAL ne doit
// JAMAIS vivre sous OneDrive / Google Drive / Dropbox — le fournisseur cloud
// peut observer la base et son WAL à des instants différents, corruption
// silencieuse (vision §4, piège Windows n°5). L'ancien comportement se
// contentait d'un avertissement ; désormais db.verifierEmplacementBase
// REFUSE (au démarrage serveur ET dans db.ouvrir), sauf dérogation explicite
// IWF_AUTORISER_BASE_SYNCHRONISEE=1 (migration contrôlée) — auquel cas
// l'avertissement du démarrage reste.
//
// Familles :
//   1. cheminSousSynchronisation : détection par SEGMENT de chemin
//      (onedrive quelle que soit la casse, « Mon Drive », google drive,
//      dropbox) et par RACINE d'environnement (variable OneDrive...) ;
//      contre-exemples sains refusés.
//   2. verifierEmplacementBase : lève un message actionnable sur un chemin
//      synchronisé, laisse passer un chemin sain, respecte la dérogation.
//   3. db.ouvrir REFUSE une base sous un faux OneDrive (tiré en process).
//   4. Le VRAI serveur (process enfant) refuse de démarrer avec
//      IWF_CHEMIN_BASE sous un faux OneDrive (exit 1, message), et DÉMARRE
//      avec la dérogation — en imprimant l'avertissement « Dérogation ».
//
// Isolation : tout se joue sous os.tmpdir() dans des dossiers jetables dont
// un segment s'appelle « OneDrive » (aucun vrai espace synchronisé n'est
// jamais touché) ; port aléatoire haut, jamais 2011, jamais data/ réel.
// ============================================================

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

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

// ------------------------------------------------------------
// Banc d'essai : un dossier jetable avec un segment « OneDrive » DEDANS.
// ------------------------------------------------------------
const DOSSIER = mkdtempSync(join(tmpdir(), 'inerweb-fluide-emplacement-'));
const FAUX_ONEDRIVE = join(DOSSIER, 'OneDrive', 'Documents');
mkdirSync(FAUX_ONEDRIVE, { recursive: true });
const BASE_SYNCHRONISEE = join(FAUX_ONEDRIVE, 'data', 'inerweb-fluide.db');
const BASE_SAINE = join(DOSSIER, 'donnees-locales', 'inerweb-fluide.db');

// La suite manipule la dérogation : partir d'un environnement NET.
delete process.env.IWF_AUTORISER_BASE_SYNCHRONISEE;

const db = require('./db.js');

// ============================================================
// 1. cheminSousSynchronisation — détection par segment et par racine
// ============================================================
{
  verifier('segment « OneDrive » détecté (casse indifférente)',
    db.cheminSousSynchronisation(BASE_SYNCHRONISEE) === true);
  verifier('segment « onedrive » minuscule détecté',
    db.cheminSousSynchronisation('C:\\onedrive\\data\\base.db') === true);
  verifier('segment « Mon Drive » (Google Drive français) détecté',
    db.cheminSousSynchronisation('G:\\Mon Drive\\registre\\base.db') === true);
  verifier('segment « My Drive » détecté',
    db.cheminSousSynchronisation('G:\\My Drive\\base.db') === true);
  verifier('segment « Google Drive » détecté',
    db.cheminSousSynchronisation('C:\\Users\\x\\Google Drive\\base.db') === true);
  verifier('segment « Dropbox » détecté',
    db.cheminSousSynchronisation('D:\\Dropbox\\base.db') === true);
  verifier('un chemin local sain n\'est PAS signalé',
    db.cheminSousSynchronisation('C:\\git\\inerweb-fluide\\data\\base.db') === false);
  verifier('le dossier jetable de cette suite (hors segment cloud) est sain',
    db.cheminSousSynchronisation(BASE_SAINE) === false);

  // Détection par RACINE d'environnement : un chemin SANS segment cloud,
  // mais SOUS la racine désignée par la variable OneDrive, est signalé.
  const racineEnv = join(DOSSIER, 'racine-sync');
  const sauvegardeEnv = process.env.OneDrive;
  process.env.OneDrive = racineEnv;
  try {
    verifier('un chemin sous la RACINE de la variable OneDrive est signalé',
      db.cheminSousSynchronisation(join(racineEnv, 'coin', 'base.db')) === true);
    verifier('un chemin frère de cette racine (préfixe texte proche) est sain',
      db.cheminSousSynchronisation(join(DOSSIER, 'racine-sync-bis', 'base.db')) === false);
  } finally {
    if (sauvegardeEnv === undefined) delete process.env.OneDrive;
    else process.env.OneDrive = sauvegardeEnv;
  }
}

// ============================================================
// 2. verifierEmplacementBase — refus actionnable, chemin sain, dérogation
// ============================================================
{
  let message = null;
  try {
    db.verifierEmplacementBase(BASE_SYNCHRONISEE);
  } catch (erreur) {
    message = erreur.message;
  }
  verifier('verifierEmplacementBase LÈVE sur une base sous OneDrive',
    typeof message === 'string');
  verifier('le message dit QUOI FAIRE (IWF_CHEMIN_BASE hors cloud)',
    Boolean(message) && message.includes('dossier synchronisé')
      && message.includes('IWF_CHEMIN_BASE'), String(message));

  verifier('un chemin sain est renvoyé ABSOLU, sans lever',
    db.verifierEmplacementBase(BASE_SAINE) === resolve(BASE_SAINE));

  process.env.IWF_AUTORISER_BASE_SYNCHRONISEE = '1';
  try {
    verifier('la dérogation IWF_AUTORISER_BASE_SYNCHRONISEE=1 laisse passer',
      db.verifierEmplacementBase(BASE_SYNCHRONISEE) === resolve(BASE_SYNCHRONISEE));
  } finally {
    delete process.env.IWF_AUTORISER_BASE_SYNCHRONISEE;
  }
}

// ============================================================
// 3. db.ouvrir REFUSE une base sous un faux OneDrive (tiré, pas lu)
// ============================================================
{
  let refus = null;
  try {
    db.ouvrir(BASE_SYNCHRONISEE);
  } catch (erreur) {
    refus = erreur.message;
  }
  verifier('db.ouvrir refuse d\'ouvrir une base sous un dossier synchronisé',
    typeof refus === 'string' && refus.includes('dossier synchronisé'),
    String(refus));
  // Et le chemin sain s'ouvre normalement (le refus n'a rien cassé).
  const base = db.ouvrir(BASE_SAINE);
  verifier('db.ouvrir accepte ensuite la base saine (aucun état résiduel)',
    Boolean(base) && db.cheminOuvert() === resolve(BASE_SAINE));
  db.fermer();
}

// ============================================================
// 4. Le VRAI serveur : refus au démarrage, puis dérogation + avertissement
// ============================================================
const PORT = 35000 + Math.floor(Math.random() * 9000);
const CHEMIN_SERVEUR = join(import.meta.dirname, 'serveur.js');

/** Lance serveur.js et rend {code, sortie} — soit à l'exit, soit à l'écoute. */
function lancerServeur(env, dureeMaxMs = 15000) {
  return new Promise((resoudre) => {
    const enfant = spawn(process.execPath, [CHEMIN_SERVEUR], {
      env: { ...process.env, PORT: String(PORT), ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let sortie = '';
    let tranche = false;
    const conclure = (code) => {
      if (tranche) return;
      tranche = true;
      enfant.kill();
      resoudre({ code, sortie });
    };
    enfant.stdout.on('data', (d) => {
      sortie += d.toString();
      if (sortie.includes('serveur local démarré')) conclure(null);
    });
    enfant.stderr.on('data', (d) => { sortie += d.toString(); });
    enfant.on('exit', (code) => conclure(code));
    setTimeout(() => conclure('délai'), dureeMaxMs);
  });
}

{
  const refus = await lancerServeur({ IWF_CHEMIN_BASE: BASE_SYNCHRONISEE });
  verifier('le vrai serveur REFUSE de démarrer sur une base sous OneDrive (exit 1)',
    refus.code === 1, `code : ${refus.code}`);
  verifier('le refus du serveur porte le message actionnable',
    refus.sortie.includes('dossier synchronisé'), refus.sortie.slice(0, 400));

  const derogation = await lancerServeur({
    IWF_CHEMIN_BASE: BASE_SYNCHRONISEE,
    IWF_AUTORISER_BASE_SYNCHRONISEE: '1',
  });
  verifier('avec la dérogation, le serveur démarre (migration contrôlée possible)',
    derogation.code === null, `code : ${derogation.code} — ${derogation.sortie.slice(0, 400)}`);
  verifier('la dérogation s\'annonce à la console (« Dérogation active »)',
    derogation.sortie.includes('Dérogation active'), derogation.sortie.slice(0, 600));
  // Laisser le process libérer la base avant le nettoyage.
  await new Promise((r) => setTimeout(r, 300));
}

// ============================================================
// Verdict + nettoyage
// ============================================================
try { rmSync(DOSSIER, { recursive: true, force: true }); } catch { /* verrou Windows résiduel toléré */ }

console.log('');
console.log(`Bilan test-emplacement-base : ${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
