// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — LA BORNE DE SCELLEMENT EST CONFRONTÉE AU REGISTRE,
// AU DÉMARRAGE (lot 0, brique B2 — audit externe #4 du 27/07/2026)
// Exécution : node server/test-non-regression-scellement.mjs
//
// LE DÉFAUT TIRÉ PENDANT L'INSTRUCTION DE L'AUDIT. Après un retour en
// arrière fait AU DISQUE (quelqu'un repose une ancienne copie de la base),
// le fichier voisin `borne-scellement.json` portait encore 3 pendant que le
// registre n'avait plus qu'UNE écriture scellée. L'écart était lisible en
// une soustraction — mais personne ne la faisait :
// `nombreScelleesJamaisAtteint()` n'était consulté QU'À L'IMPORT et au
// scellement, JAMAIS au démarrage. La correction la moins chère du dossier :
// le détecteur était déjà sur le poste, on ne lui demandait rien.
//
// CE QUI EST PROUVÉ ICI :
//   1. `api.constaterBorneScellement()` — les TROIS verdicts, en process :
//      concordance, régression après retour en arrière au disque, et
//      INDÉTERMINÉ quand il n'y a pas de borne (jamais une accusation).
//   2. Le VRAI serveur (process enfant) DIT la régression en console ET la
//      porte au journal chaîné (REGISTRE_REGRESSION) — c'est CETTE famille
//      qui devient rouge si l'on retire l'appel de `server/serveur.js`.
//   3. Aucun FAUX POSITIF : sur un poste sain et sur un poste neuf, le
//      démarrage ne dit rien et n'écrit rien au journal.
//   4. Best-effort : le serveur démarre quand même (le témoin quotidien,
//      écrit APRÈS le constat, est bien là dans les trois cas).
//   5. ⭐ REVUE ADVERSARIALE (27/07) — LE CAS LÉGITIME, TIRÉ : une
//      RESTAURATION d'archive plus ancienne (geste prévu du coffre-fort,
//      confirmé par `confirmePerte`) produit EXACTEMENT le même écart. Le
//      constat reste juste, mais le message ne doit pas imputer le seul
//      geste manuel : il énumère les causes et dit qu'il ne tranche pas.
//
// CE QUE LA MESURE NE PRÉTEND PAS. Elle compare DEUX NOMBRES. Si l'on
// recopie la base ET son fichier voisin ensemble, l'écart est nul et rien
// n'est vu : limite CONNUE (voir l'en-tête de server/borne-scellement.js).
// On ne dit donc jamais « le registre est intact », mais « la borne et le
// registre concordent / ne concordent pas ».
//
// Isolation : tout se joue sous os.tmpdir(), bases JETABLES NICHÉES sous
// <mkdtemp>/<poste>/data/ (le dossier backups/ dérivé reste dans le bac à
// sable) ; port dédié 2202, jamais 2011, jamais le data/ réel.
// ============================================================

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, copyFileSync, existsSync, rmSync,
  readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const db = require('./db.js');
const api = require('./api.js');
const borneScellement = require('./borne-scellement.js');
// Revue 27/07 : la restauration d'archive est le cas LÉGITIME qui produit le
// même écart — on le tire pour de vrai (section 5), on ne le suppose pas.
const sauvegarde = require('./sauvegarde.js');
const restauration = require('./restauration.js');

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else {
    nbEchecs += 1;
    console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`);
  }
}

// ------------------------------------------------------------
// Banc d'essai : trois postes jetables.
//   poste-sain     : 3 écritures scellées, borne 3        -> concordance
//   poste-regresse : base RÉTROGRADÉE à 1, borne 3        -> régression
//   poste-neuf     : rien du tout, aucune borne           -> indéterminé
// ------------------------------------------------------------
const RACINE = mkdtempSync(join(tmpdir(), 'inerweb-fluide-borne-'));
const SUFFIXES = ['', '-wal', '-shm'];

function cheminBase(poste) {
  return join(RACINE, poste, 'data', 'test.db');
}
function preparerPoste(poste) {
  mkdirSync(join(RACINE, poste, 'data'), { recursive: true });
  return cheminBase(poste);
}
/** Copie les fichiers SQLite (base + WAL + index) d'un chemin vers un autre. */
function copierBase(source, cible) {
  for (const suffixe of SUFFIXES) {
    const de = source + suffixe;
    const vers = cible + suffixe;
    if (existsSync(de)) copierEcrasant(de, vers);
    else if (existsSync(vers)) rmSync(vers, { force: true });
  }
}
function copierEcrasant(de, vers) {
  rmSync(vers, { force: true });
  copyFileSync(de, vers);
}

const BASE_SAINE = preparerPoste('poste-sain');
const BASE_REGRESSEE = preparerPoste('poste-regresse');
const BASE_NEUVE = preparerPoste('poste-neuf');
const INSTANTANE = join(RACINE, 'instantane', 'test.db');
mkdirSync(join(RACINE, 'instantane'), { recursive: true });

// ------------------------------------------------------------
// Semis : un monde minimal, puis N écritures VRAIMENT scellées (le canal
// réel api.appeler, pas un INSERT direct).
// ------------------------------------------------------------
const CONTEXTE = { role: 'REFERENT' };
let valideurId = null;
let machineId = null;
let bouteilleId = null;
let pesee = 30;

function semer() {
  api.appeler('init', {}, CONTEXTE);
  valideurId = api.appeler('createPersonne', { donneesPersonne: {
    prenom: 'Référent', nom: 'Borne', typePersonne: 'ENSEIGNANT',
    roleApp: 'REFERENT' } }, CONTEXTE).id;
  machineId = api.appeler('createMachine', { donneesMachine: {
    designation: 'Machine borne', fluide: 'R-134a', chargeNominaleKg: 10,
    operateur: 'Testeur' } }, CONTEXTE).id;
  bouteilleId = api.appeler('createBouteille', { donneesBouteille: {
    type: 'NEUVE', fluide: 'R-134a', tareKg: 10, masseBruteKg: 30,
    contenanceMaxKg: 25 } }, CONTEXTE).id;
}

function validerUnMouvement() {
  const mvt = api.appeler('creerMouvement', { donneesMouvement: {
    type: 'CHARGE_APPOINT', machineId, bouteilleSrcId: bouteilleId,
    peseeAvantKg: pesee, peseeApresKg: pesee - 1, technicien: 'Testeur',
    causeMouvement: 'Preuve de la borne' } }, CONTEXTE);
  pesee -= 1;
  api.appeler('soumettreMouvement', { id: mvt.id }, CONTEXTE);
  return api.appeler('validerMouvement',
    { id: mvt.id, validateurId: valideurId }, CONTEXTE);
}

/** Nombre d'écritures portant une empreinte, lu directement en SQL. */
function comptePorteurEmpreinte() {
  return db.get(
    'SELECT COUNT(*) AS n FROM mouvements WHERE hash_ecriture IS NOT NULL').n;
}

// ============================================================
// 0. Construction du banc : 1 écriture, instantané, puis 2 de plus
// ============================================================
{
  db.ouvrir(BASE_SAINE);
  semer();
  validerUnMouvement();
  db.fermer();
  // L'INSTANTANÉ du disque : l'état « à une seule écriture scellée ».
  copierBase(BASE_SAINE, INSTANTANE);

  db.ouvrir(BASE_SAINE);
  validerUnMouvement();
  validerUnMouvement();
  verifier('banc : 3 écritures portent une empreinte',
    comptePorteurEmpreinte() === 3, String(comptePorteurEmpreinte()));
  verifier('banc : le fichier VOISIN de la base porte la borne 3',
    borneScellement.lire(BASE_SAINE) === 3,
    String(borneScellement.lire(BASE_SAINE)));
  db.fermer();

  // Le poste RÉGRESSÉ : on recopie tout le poste sain (base + borne
  // voisine), PUIS on repose la base d'avant PAR-DESSUS — exactement le
  // geste incriminé : un retour en arrière fait AU DISQUE, qui ne rapporte
  // pas le fichier voisin avec lui.
  copierBase(BASE_SAINE, BASE_REGRESSEE);
  copyFileSync(borneScellement.cheminBorne(BASE_SAINE),
    borneScellement.cheminBorne(BASE_REGRESSEE));
  copierBase(INSTANTANE, BASE_REGRESSEE);
  verifier('banc : le poste régressé garde la borne 3 à côté de sa base',
    borneScellement.lire(BASE_REGRESSEE) === 3);
}

// ============================================================
// 1. Le constat, en process : les TROIS verdicts
// ============================================================
{
  db.ouvrir(BASE_SAINE);
  const sain = api.constaterBorneScellement();
  db.fermer();
  verifier('poste sain : la borne et le registre CONCORDENT',
    sain.ok === true && sain.motif === 'CONCORDANT'
      && sain.borne === 3 && sain.reelles === 3, JSON.stringify(sain));

  db.ouvrir(BASE_REGRESSEE);
  const regresse = api.constaterBorneScellement();
  db.fermer();
  verifier('⭐ retour en arrière au disque : RÉGRESSION constatée',
    regresse.ok === false && regresse.motif === 'REGRESSION',
    JSON.stringify(regresse));
  verifier('la régression porte les DEUX nombres (borne 3, réelles 1)',
    regresse.borne === 3 && regresse.reelles === 1,
    JSON.stringify(regresse));

  db.ouvrir(BASE_NEUVE);
  const neuf = api.constaterBorneScellement();
  db.fermer();
  verifier('poste neuf, aucune borne : INDÉTERMINÉ, JAMAIS une accusation',
    neuf.ok === null && neuf.motif === 'INDETERMINE'
      && neuf.borne === 0 && neuf.reelles === 0, JSON.stringify(neuf));
}

// ============================================================
// 2. La borne ILLISIBLE ne vaut pas non plus accusation
// ============================================================
{
  // Un fichier de borne abîmé retombe sur la borne de la base elle-même
  // (ici 1, celle de l'instantané) : elle concorde avec le registre. Un
  // fichier qu'on ne sait pas relire n'accuse personne — doctrine png.js.
  const cheminBorneAbimee = borneScellement.cheminBorne(BASE_REGRESSEE);
  // (revue) nom explicite : `sauvegarde` est le MODULE du coffre-fort ici.
  const contenuOriginal = readFileSync(cheminBorneAbimee, 'utf8');
  writeFileSync(cheminBorneAbimee, 'ceci n\'est pas du JSON', 'utf8');
  db.ouvrir(BASE_REGRESSEE);
  const abime = api.constaterBorneScellement();
  db.fermer();
  writeFileSync(cheminBorneAbimee, contenuOriginal, 'utf8');
  verifier('borne illisible : aucune accusation (pas de motif REGRESSION)',
    abime.motif !== 'REGRESSION', JSON.stringify(abime));
}

// ============================================================
// 3. LE VRAI SERVEUR AU DÉMARRAGE — c'est ici que se joue la brique
// ============================================================
const PORT = 2202;
const CHEMIN_SERVEUR = join(import.meta.dirname, 'serveur.js');

/** Lance serveur.js sur une base donnée et rend {code, sortie}. */
function lancerServeur(cheminBaseVoulue, dureeMaxMs = 20000) {
  return new Promise((resoudre) => {
    const enfant = spawn(process.execPath, [CHEMIN_SERVEUR], {
      env: { ...process.env, PORT: String(PORT),
        IWF_CHEMIN_BASE: cheminBaseVoulue },
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

/** Entrées REGISTRE_REGRESSION du journal chaîné d'une base. */
function entreesRegression(cheminBaseVoulue) {
  db.ouvrir(cheminBaseVoulue);
  const lignes = db.all(
    `SELECT action, cible, details FROM journal_audit
     WHERE action = 'REGISTRE_REGRESSION' ORDER BY id`);
  db.fermer();
  return lignes;
}

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

{
  const demarrage = await lancerServeur(BASE_REGRESSEE);
  await attendre(500); // laisser l'enfant relâcher la base

  verifier('⭐ démarrage sur base rétrogradée : la console DIT la '
    + 'non-concordance',
  demarrage.sortie.includes('NE CONCORDENT PAS'),
  demarrage.sortie.slice(-800));
  verifier('le message porte les deux nombres constatés (3 et 1)',
    /Borne du poste\s*:\s*3\b/.test(demarrage.sortie)
      && /registre actuel\s*:\s*1\b/.test(demarrage.sortie),
    demarrage.sortie.slice(-800));
  verifier('le message ne PROMET rien de plus que ce qui est mesuré '
    + '(jamais « le registre est intact »)',
  !/registre est intact/i.test(demarrage.sortie));

  const journal = entreesRegression(BASE_REGRESSEE);
  verifier('⭐ la régression est PORTÉE AU JOURNAL chaîné '
    + '(REGISTRE_REGRESSION)',
  journal.length === 1, JSON.stringify(journal));
  verifier('l’entrée du journal porte la borne ET le réel',
    journal.length === 1 && journal[0].details.includes('borne 3')
      && journal[0].details.includes('scellees 1'),
    JSON.stringify(journal));

  verifier('best-effort : le serveur a DÉMARRÉ malgré l’anomalie',
    demarrage.code === null, `code : ${demarrage.code}`);
  verifier('le témoin quotidien est écrit APRÈS le constat (ordre tenu)',
    demarrage.sortie.includes('[scellement] Témoin quotidien'),
    demarrage.sortie.slice(-600));
}

// ============================================================
// 4. Aucun FAUX POSITIF : poste sain, puis poste neuf
// ============================================================
{
  const sain = await lancerServeur(BASE_SAINE);
  await attendre(500);
  verifier('poste sain : le démarrage ne dit RIEN de la borne',
    !sain.sortie.includes('[registre]'), sain.sortie.slice(-600));
  verifier('poste sain : le constat a bien été traversé (témoin écrit)',
    sain.sortie.includes('[scellement] Témoin quotidien'),
    sain.sortie.slice(-600));
  verifier('poste sain : aucune entrée REGISTRE_REGRESSION au journal',
    entreesRegression(BASE_SAINE).length === 0);

  const neuf = await lancerServeur(BASE_NEUVE);
  await attendre(500);
  verifier('poste neuf (aucune borne) : le démarrage n’accuse personne',
    !neuf.sortie.includes('[registre]'), neuf.sortie.slice(-600));
  verifier('poste neuf : aucune entrée REGISTRE_REGRESSION au journal',
    entreesRegression(BASE_NEUVE).length === 0);
}

// ============================================================
// 5. ⭐ REVUE ADVERSARIALE (27/07) — LE CAS QUE FRANCK RENCONTRERA
//    VRAIMENT : une RESTAURATION D'ARCHIVE LÉGITIME.
//
// Le geste est PRÉVU, documenté et journalisé : `restaurer(zip,
// { confirmePerte: true })` accepte de revenir à une archive plus ancienne,
// c'est-à-dire de perdre des écritures figées, dès lors que l'opérateur le
// confirme explicitement (server/restauration.js, étape 0). La borne, elle,
// vit dans un fichier VOISIN que la restauration ne touche pas : elle reste
// donc HAUTE. L'écart est réel, le constat est juste — mais la première
// version du message écrivait « une base ANTÉRIEURE a pu être remise en
// place À LA MAIN », à chaque démarrage, pour toujours. C'est une cause que
// la mesure ne constate pas, et c'est FAUX ici : le logiciel l'a fait
// lui-même, sur confirmation. Un motif faux répété dans un registre de
// preuve est un défaut au même titre qu'un bug (cf. « signature périmée »,
// revue du 26/07). On le TIRE, on ne le lit pas.
// ============================================================
const BASE_RESTAUREE = preparerPoste('poste-restaure');
{
  db.ouvrir(BASE_RESTAUREE);
  semer();
  pesee = 30; // repartir de la masse brute de la bouteille neuve du poste
  validerUnMouvement();
  // Archive OFFICIELLE du coffre-fort, faite par le logiciel, à 1 écriture.
  const archive = sauvegarde.sauvegarderArchive({});
  validerUnMouvement();
  validerUnMouvement();
  verifier('banc restauration : 3 écritures scellées avant le retour arrière',
    comptePorteurEmpreinte() === 3, String(comptePorteurEmpreinte()));
  // LE GESTE LÉGITIME, par le logiciel, avec confirmation explicite.
  const remise = restauration.restaurer(archive.chemin, { confirmePerte: true });
  const apres = api.constaterBorneScellement();
  db.fermer();

  verifier('restauration légitime (confirmePerte) : elle ABOUTIT',
    remise.ok === true && remise.verdict === 'VERT', JSON.stringify(remise));
  verifier('⭐ après une restauration LÉGITIME, le constat dit quand même '
    + 'RÉGRESSION (la mesure est juste : deux nombres)',
  apres.ok === false && apres.motif === 'REGRESSION'
      && apres.borne === 3 && apres.reelles === 1, JSON.stringify(apres));

  const demarrage = await lancerServeur(BASE_RESTAUREE);
  await attendre(500);
  verifier('⭐ le message NOMME la restauration parmi les causes possibles',
    /RESTAURATION/.test(demarrage.sortie), demarrage.sortie.slice(-900));
  verifier('⭐ le message DIT qu\'il ne tranche pas la cause',
    /ne tranche PAS la cause/.test(demarrage.sortie),
    demarrage.sortie.slice(-900));
  verifier('le message n\'impute JAMAIS le seul geste manuel : s\'il parle '
    + 'de « à la main », la restauration est citée aussi',
  !/à la main/.test(demarrage.sortie) || /RESTAURATION/.test(demarrage.sortie),
  demarrage.sortie.slice(-900));
}

// ============================================================
// Verdict + nettoyage
// ============================================================
try { rmSync(RACINE, { recursive: true, force: true }); }
catch { /* verrou Windows résiduel toléré */ }

console.log('');
console.log(`${nbOk} OK, ${nbEchecs} échec(s) [non-régression du scellement]`);
process.exit(nbEchecs === 0 ? 0 : 1);
