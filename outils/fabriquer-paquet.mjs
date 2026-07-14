// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — Fabrication du PAQUET PORTABLE « clé en main »
// (Phase 2, Lot 1)
//
// Assemble un dossier autonome que l'on peut copier sur un poste VIERGE
// (sans Node.js installé) et lancer d'un double-clic sur lancer-inerweb.bat.
//
// Principe (décidé au plan Phase 2, `docs/PLAN-PHASE-2.md`) : Node.js EMBARQUÉ
// dans le dossier de l'appli, PAS pkg/SEA. On copie tout simplement le
// node.exe qui exécute CE script (process.execPath) : sur Windows c'est un
// exécutable autonome qui n'utilise que les modules `node:` intégrés — donc
// suffisant pour faire tourner le serveur (zéro dépendance npm). Le paquet
// prend exactement la version de Node déjà validée sur la machine de build.
//
// Le paquet ne contient QUE ce qui sert à l'exécution : server/ (hors tests),
// v8/ (hors tests), le lanceur, le PDF CERFA officiel, .env.example, LICENSE
// et un LISEZ-MOI. L'ancienne v7 (racine du dépôt) et la doc interne (docs/,
// apps-script/…) sont volontairement EXCLUES — le serveur redirige « / » vers
// « /v8/ », la v7 est donc inutile au fonctionnement.
//
// N'ÉCRIT JAMAIS dans data/ : ne copie que du CODE (server/, v8/), jamais les
// données réelles (data/ documents/ backups/ sont à la racine, hors périmètre).
//
// Usage :
//   node outils/fabriquer-paquet.mjs [dossierSortie] [--zip]
//   (défaut : ../inerWeb-Fluide-portable, à côté du dépôt)
// ============================================================

import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);

const RACINE = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const FAIRE_ZIP = args.includes('--zip');
const cibleArg = args.find((a) => !a.startsWith('--'));
const SORTIE = path.resolve(cibleArg
  ?? path.join(RACINE, '..', 'inerWeb-Fluide-portable'));

// ------------------------------------------------------------
// Garde-fous
// ------------------------------------------------------------
const nodeExe = process.execPath;
if (!/node(\.exe)?$/i.test(nodeExe)) {
  console.error(`[ERREUR] Exécutable Node introuvable (process.execPath = ${nodeExe}).`);
  process.exit(1);
}
// Le node.exe embarqué est celui de CETTE machine de build : il doit être en
// version 22+ (module intégré node:sqlite requis par le Mode Local), sinon on
// produirait un paquet qui plante au démarrage sur un poste vierge.
const majeurBuild = Number(process.versions.node.split('.')[0]);
if (Number.isNaN(majeurBuild) || majeurBuild < 22) {
  console.error(`[ERREUR] Node ${process.versions.node} est trop ancien pour être embarqué.`);
  console.error('         inerWeb Fluide (Mode Local) exige Node 22+ (module node:sqlite).');
  console.error('         Relancez la fabrication avec Node 22 ou plus récent.');
  process.exit(1);
}
if (SORTIE === RACINE || SORTIE.startsWith(RACINE + path.sep)) {
  console.error('[ERREUR] Le dossier de sortie ne doit pas être DANS le dépôt.');
  console.error(`         Sortie demandée : ${SORTIE}`);
  process.exit(1);
}
if (fs.existsSync(SORTIE) && fs.readdirSync(SORTIE).length > 0) {
  console.error(`[ERREUR] Le dossier de sortie existe déjà et n'est pas vide :`);
  console.error(`         ${SORTIE}`);
  console.error('         Supprimez-le puis relancez (sécurité anti-écrasement).');
  process.exit(1);
}

// ------------------------------------------------------------
// Exclusions : jamais les tests, ni le harnais de test, ni les données.
// ------------------------------------------------------------
const EST_TEST = (chemin) => /(^|[\\/])test-[^\\/]*\.mjs$/i.test(chemin)
  || /(^|[\\/])harnais-contrat\.mjs$/i.test(chemin);

/** Filtre fs.cpSync : renvoie false pour exclure une entrée (et sa sous-arbo). */
function filtreCopie(source) {
  if (EST_TEST(source)) return false;
  // Sécurité : ne jamais embarquer de données réelles même si mal rangées.
  const rel = path.relative(RACINE, source).toLowerCase();
  if (rel === 'data' || rel.startsWith('data' + path.sep)) return false;
  if (rel === 'documents' || rel.startsWith('documents' + path.sep)) return false;
  if (rel === 'backups' || rel.startsWith('backups' + path.sep)) return false;
  return true;
}

// ------------------------------------------------------------
// Assemblage
// ------------------------------------------------------------
console.log(`\n  Fabrication du paquet portable inerWeb Fluide`);
console.log(`  Source : ${RACINE}`);
console.log(`  Sortie : ${SORTIE}\n`);

fs.mkdirSync(SORTIE, { recursive: true });

// 1) Le moteur Node embarqué.
fs.mkdirSync(path.join(SORTIE, 'node'), { recursive: true });
fs.copyFileSync(nodeExe, path.join(SORTIE, 'node', 'node.exe'));
const tailleNode = (fs.statSync(nodeExe).size / (1024 * 1024)).toFixed(0);
console.log(`  [ok] node.exe embarqué (${tailleNode} Mo) — version ${process.version}`);

// 2) Le code applicatif (hors tests).
fs.cpSync(path.join(RACINE, 'server'), path.join(SORTIE, 'server'),
  { recursive: true, filter: filtreCopie });
console.log('  [ok] server/ (sans les suites de test)');
fs.cpSync(path.join(RACINE, 'v8'), path.join(SORTIE, 'v8'),
  { recursive: true, filter: filtreCopie });
console.log('  [ok] v8/ (sans les suites de test)');

// 3) Les fichiers d'accompagnement (best-effort : on saute ceux absents).
// LICENCES-TIERCES.md est OBLIGATOIRE dans le paquet : la licence Apache 2.0 de
// PDF.js exige que ses notices voyagent avec toute redistribution du logiciel.
const FICHIERS = ['lancer-inerweb.bat', 'cerfa_15497-04_officiel.pdf',
  '.env.example', 'LICENSE', 'LICENCES-TIERCES.md'];
for (const f of FICHIERS) {
  const src = path.join(RACINE, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(SORTIE, f));
    console.log(`  [ok] ${f}`);
  } else {
    console.warn(`  [!]  ${f} introuvable — ignoré`);
  }
}

// 4) Le mode d'emploi pour l'utilisateur final.
const LISEZMOI = `inerWeb Fluide — Traçabilité F-Gas / CERFA
==========================================

Application locale, autonome et gratuite. Toutes vos données restent
sur CE poste : rien n'est envoyé sur Internet.

DÉMARRER
--------
1. Double-cliquez sur « lancer-inerweb.bat ».
2. Le navigateur s'ouvre sur http://localhost:2011
3. Au tout premier lancement, l'application affiche un écran
   « Créer le compte administrateur » : choisissez un identifiant et un
   mot de passe d'au moins 10 caractères, puis validez. Vous entrez
   ensuite directement dans l'application.
4. Pour arrêter l'application : fermez la fenêtre noire.

Windows peut afficher un avertissement « SmartScreen » au premier
lancement (application téléchargée non signée) : cliquez sur
« Informations complémentaires » puis « Exécuter quand même ». Vous
pouvez aussi débloquer le dossier via clic droit → Propriétés →
« Débloquer » avant de lancer.

Node.js est DÉJÀ inclus dans ce dossier (sous « node\\ ») : il n'y a
rien à installer.

VOS DONNÉES
-----------
Elles vivent dans ce dossier, à côté de l'application :
  - data\\        la base de données (le registre)
  - documents\\   les pièces jointes (photos, attestations, PDF…)
  - backups\\     les sauvegardes

SAUVEGARDE
----------
Depuis l'application, utilisez l'écran « Sauvegarde ». Pour une copie
manuelle, il suffit de copier les dossiers data\\, documents\\ et
backups\\ sur une clé USB ou un espace synchronisé.

IMPORTANT : ne placez pas le dossier data\\ dans un dossier synchronisé
en permanence (OneDrive, Google Drive…) — la synchronisation d'une base
ouverte peut la corrompre. Le cloud sert aux sauvegardes (fichiers ZIP),
pas à la base en cours d'utilisation.

DÉPLACER / PARTAGER
-------------------
Ce dossier est portable : vous pouvez le copier entier sur un autre
poste Windows et le lancer de la même façon.
`;
fs.writeFileSync(path.join(SORTIE, 'LISEZ-MOI.txt'), LISEZMOI, 'utf8');
console.log('  [ok] LISEZ-MOI.txt');

// ------------------------------------------------------------
// ZIP optionnel (format « stored », lecteur/écrivain maison, zéro dépendance)
// ------------------------------------------------------------
if (FAIRE_ZIP) {
  const { creerZipOctets } = require(path.join(RACINE, 'server', 'zip-node.js'));
  const entrees = [];
  const racineZip = path.basename(SORTIE);
  (function parcourir(dossier) {
    for (const nom of fs.readdirSync(dossier)) {
      const abs = path.join(dossier, nom);
      if (fs.statSync(abs).isDirectory()) { parcourir(abs); continue; }
      const rel = path.relative(SORTIE, abs).split(path.sep).join('/');
      entrees.push({ nom: `${racineZip}/${rel}`, contenu: fs.readFileSync(abs) });
    }
  })(SORTIE);
  const octets = creerZipOctets(entrees);
  const cheminZip = SORTIE + '.zip';
  fs.writeFileSync(cheminZip, octets);
  const tailleZip = (octets.length / (1024 * 1024)).toFixed(0);
  console.log(`\n  [ok] Archive : ${cheminZip} (${tailleZip} Mo, non compressée)`);

  // EMPREINTE SHA-256 de l'archive — la SEULE protection qui vaille contre un
  // faux « inerWeb Fluide » vérolé distribué sous le nom de l'auteur. On ne
  // protège pas le code (impossible : il doit s'exécuter chez l'utilisateur) ;
  // on prouve que le paquet téléchargé est bien CELUI-CI, octet pour octet.
  // Même principe que le scellement des dossiers d'audit du logiciel lui-même.
  // Le fichier suit le format standard « <empreinte>␣␣<nom> » (sha256sum -c).
  const empreinte = createHash('sha256').update(octets).digest('hex');
  const nomZip = path.basename(cheminZip);
  fs.writeFileSync(`${cheminZip}.sha256`, `${empreinte}  ${nomZip}\n`, 'utf8');
  console.log(`  [ok] Empreinte : ${cheminZip}.sha256`);
  console.log('');
  console.log('  ------------------------------------------------------------');
  console.log('   PUBLIEZ CETTE EMPREINTE À CÔTÉ DU LIEN DE TÉLÉCHARGEMENT :');
  console.log(`   SHA-256 : ${empreinte}`);
  console.log('');
  console.log('   Qui télécharge peut la vérifier, sans rien installer :');
  console.log(`     certutil -hashfile ${nomZip} SHA256      (Windows)`);
  console.log(`     sha256sum ${nomZip}                       (Linux / Mac)`);
  console.log('  ------------------------------------------------------------');
}

console.log(`\n  Paquet prêt : ${SORTIE}`);
console.log('  Testez-le : double-cliquez sur lancer-inerweb.bat depuis ce dossier.');
if (!FAIRE_ZIP) {
  console.log('  (Pour produire aussi un .zip : ajoutez --zip.)');
}
console.log('');
