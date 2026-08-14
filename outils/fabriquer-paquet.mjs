// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — Fabrication du PAQUET PORTABLE « clé en main »
// (Phase 2, Lot 1 ; licence nominative depuis le 14/08/2026 —
// plan docs/PLAN-LICENCE-NOMINATIVE.md)
//
// Assemble un dossier autonome que l'on peut copier sur un poste VIERGE
// (sans Node.js installé) et lancer d'un double-clic sur lancer-inerweb.bat.
//
// DEPUIS LE 14/08/2026, LA LICENCE EST OBLIGATOIRE : chaque paquet est
// fabriqué POUR un destinataire nommé (--licence <fichier délivré par
// outils/delivrer-licence.mjs>). Le fichier signé est embarqué, le
// LISEZ-MOI porte le titulaire, le zip porte le numéro, et l'empreinte
// SHA-256 du zip est reportée au registre des livraisons. Aucun paquet
// déverrouillé ne peut sortir de cet outil par accident.
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
//   node outils/fabriquer-paquet.mjs --licence <licence.json> [dossierSortie] [--zip]
//   (défaut : ../paquets/inerWeb-Fluide-<numéro de licence>)
// ============================================================

import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const licenceModule = require('../server/licence.js');

const RACINE = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const FAIRE_ZIP = args.includes('--zip');

// ------------------------------------------------------------
// La licence nominative du destinataire : OBLIGATOIRE, et vérifiée avec la
// clé publique EMBARQUÉE (celle que le paquet utilisera lui-même) AVANT
// d'assembler quoi que ce soit. Fabriquer un paquet dont la licence serait
// refusée au premier démarrage n'aurait aucun sens.
// ------------------------------------------------------------
const indexLicence = args.indexOf('--licence');
const cheminLicence = indexLicence >= 0 ? args[indexLicence + 1] : null;
if (!cheminLicence) {
  console.error('[ERREUR] La licence du destinataire est obligatoire :');
  console.error('  node outils/fabriquer-paquet.mjs --licence <licence.json> [dossierSortie] [--zip]');
  console.error('  (délivrez-la d\'abord : node outils/delivrer-licence.mjs "Nom" courriel)');
  process.exit(1);
}
let LICENCE;
try {
  LICENCE = JSON.parse(fs.readFileSync(path.resolve(cheminLicence), 'utf8'));
} catch (erreur) {
  console.error(`[ERREUR] Licence illisible (${erreur.message}) : ${cheminLicence}`);
  process.exit(1);
}
{
  const verdict = licenceModule.verifierLicence(LICENCE, licenceModule.dateDuJour());
  if (!verdict.ok) {
    console.error(`[ERREUR] Licence refusée (${verdict.motif}${verdict.detail ? ` : ${verdict.detail}` : ''}).`);
    console.error('         Le paquet démarrerait sur un refus — fabrication interrompue.');
    process.exit(1);
  }
}

const positionnels = args.filter((a, i) => !a.startsWith('--') && i !== indexLicence + 1);
const SORTIE = path.resolve(positionnels[0]
  ?? path.join(RACINE, '..', 'paquets', `inerWeb-Fluide-${LICENCE.numero}`));

// ------------------------------------------------------------
// Garde-fous
// ------------------------------------------------------------
const nodeExe = process.execPath;
if (!/node(\.exe)?$/i.test(nodeExe)) {
  console.error(`[ERREUR] Exécutable Node introuvable (process.execPath = ${nodeExe}).`);
  process.exit(1);
}
// Le node.exe embarqué est celui qui EXÉCUTE cette commande. Revue du
// 14/08 : « en version 22+ » laissait embarquer n'importe quel Node du
// poste de build (un collègue sous Node 25 aurait livré Node 25, jamais
// éprouvé). On exige désormais la version VALIDÉE, à l'octet de version
// près — celle que le filet et les bancs ont réellement prouvée
// (source : server/version.js, téléchargement vérifié contre le
// SHASUMS256.txt officiel de nodejs.org).
const { NODE_VALIDE, VERSION_LOGICIEL } = require('../server/version.js');
if (process.versions.node !== NODE_VALIDE) {
  console.error(`[ERREUR] Ce build tourne sous Node ${process.versions.node} ; la version`);
  console.error(`         VALIDÉE pour être embarquée est ${NODE_VALIDE} (server/version.js).`);
  console.error('         Lancez la fabrication avec le runtime validé, par exemple :');
  console.error(`         <dossier-node-${NODE_VALIDE}>\\node.exe outils\\fabriquer-paquet.mjs …`);
  process.exit(1);
}
// La version du produit a UNE source (server/version.js) ; package.json la
// recopie pour l'outillage standard. Une divergence = un paquet qui ment.
{
  const paquetJson = JSON.parse(
    fs.readFileSync(path.join(RACINE, 'package.json'), 'utf8'));
  if (paquetJson.version !== VERSION_LOGICIEL) {
    console.error(`[ERREUR] Versions divergentes : package.json dit « ${paquetJson.version} »,`);
    console.error(`         server/version.js dit « ${VERSION_LOGICIEL} ». Alignez-les.`);
    process.exit(1);
  }
}
// Le gabarit CERFA existe en DEUX copies (racine, servie au front sous
// v8/) : la fabrication refuse qu'elles divergent (revue du 14/08).
{
  const empreinteDe = (chemin) => createHash('sha256')
    .update(fs.readFileSync(chemin)).digest('hex');
  const racinePdf = path.join(RACINE, 'cerfa_15497-04_officiel.pdf');
  const v8Pdf = path.join(RACINE, 'v8', 'cerfa_15497-04_officiel.pdf');
  if (empreinteDe(racinePdf) !== empreinteDe(v8Pdf)) {
    console.error('[ERREUR] Les deux copies du gabarit CERFA divergent :');
    console.error(`         ${racinePdf}`);
    console.error(`         ${v8Pdf}`);
    console.error('         Refaites-en une copie unique avant de fabriquer.');
    process.exit(1);
  }
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

// La licence de Node.js DOIT accompagner son binaire (obligation MIT :
// conservation de la notice de copyright à la redistribution). Le fichier
// NODE-LICENSE.txt du dépôt = LICENSE officiel de la version embarquée
// (Node.js + tous ses composants). Sans lui, chaque copie serait en infraction.
const licenceNode = path.join(RACINE, 'NODE-LICENSE.txt');
if (fs.existsSync(licenceNode)) {
  fs.copyFileSync(licenceNode, path.join(SORTIE, 'node', 'LICENSE'));
  console.log('  [ok] node/LICENSE (licence de Node.js embarquée)');
} else {
  console.error('  [ERREUR] NODE-LICENSE.txt introuvable : la licence de Node.js');
  console.error('           doit accompagner node.exe. Paquet interrompu.');
  process.exit(1);
}

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
// Le paquet est régi par LICENCE-EVALUATION.txt (le contrat d'évaluation),
// pas par le LICENSE du dépôt — un seul texte fait foi chez le destinataire.
const FICHIERS = ['lancer-inerweb.bat', 'cerfa_15497-04_officiel.pdf',
  '.env.example', 'LICENCES-TIERCES.md'];
for (const f of FICHIERS) {
  const src = path.join(RACINE, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(SORTIE, f));
    console.log(`  [ok] ${f}`);
  } else {
    console.warn(`  [!]  ${f} introuvable — ignoré`);
  }
}

// 3 bis) Les TEXTES des licences tierces (LICENSES/) — OBLIGATOIRES : MIT,
// Apache 2.0 et OFL exigent que notices et textes accompagnent toute
// redistribution (revue externe du 14/08).
const dossierLicences = path.join(RACINE, 'LICENSES');
if (!fs.existsSync(path.join(dossierLicences, 'Apache-2.0.txt'))) {
  console.error('  [ERREUR] LICENSES/ incomplet au dépôt — paquet interrompu.');
  process.exit(1);
}
fs.cpSync(dossierLicences, path.join(SORTIE, 'LICENSES'), { recursive: true });
console.log('  [ok] LICENSES/ (textes des licences tierces)');

// 3 ter) Le contrat d'évaluation et la licence nominative signée — tous deux
// OBLIGATOIRES : sans eux le paquet refuse de démarrer, autant échouer ICI.
const cheminContrat = path.join(RACINE, 'LICENCE-EVALUATION.txt');
if (!fs.existsSync(cheminContrat)) {
  console.error('  [ERREUR] LICENCE-EVALUATION.txt introuvable au dépôt — paquet interrompu.');
  process.exit(1);
}
fs.copyFileSync(cheminContrat, path.join(SORTIE, 'LICENCE-EVALUATION.txt'));
console.log('  [ok] LICENCE-EVALUATION.txt (le contrat qui régit ce paquet)');
fs.writeFileSync(path.join(SORTIE, licenceModule.NOM_FICHIER_LICENCE),
  JSON.stringify(LICENCE, null, 2) + '\n', 'utf8');
console.log(`  [ok] ${licenceModule.NOM_FICHIER_LICENCE} — n° ${LICENCE.numero}, `
  + `${LICENCE.titulaire}, expire le ${LICENCE.expireLe}`);

// 4) Le mode d'emploi pour l'utilisateur final — personnalisé au titulaire.
const LISEZMOI = `inerWeb Fluide — Traçabilité F-Gas / CERFA
==========================================

Application locale et autonome : toutes vos données restent sur CE poste,
rien n'est envoyé sur Internet.

VOTRE LICENCE
-------------
Ce paquet a été fabriqué pour :

  ${LICENCE.titulaire}
  Licence d'évaluation n° ${LICENCE.numero}, valable jusqu'au ${LICENCE.expireLe}.

Elle est PERSONNELLE : vous pouvez installer ce paquet sur vos postes,
mais pas le transmettre à quelqu'un d'autre — chaque collègue intéressé
reçoit gratuitement son propre paquet à son nom, sur simple demande à
inerweb.fh@gmail.com. Le contrat complet est dans le fichier
« LICENCE-EVALUATION.txt » ; le fichier « licence-inerweb.json » est votre
licence signée : ne le supprimez pas, le logiciel le vérifie au démarrage.

Après la date d'échéance, vos données restent consultables et exportables
sans limite de temps ; seules les nouvelles saisies se ferment, jusqu'au
renouvellement (gratuit, même adresse).

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
rien à installer. Sa licence figure dans « node\\LICENSE ».

VOS DONNÉES
-----------
Au tout premier lancement, l'application range votre registre dans votre
profil Windows, hors de tout dossier synchronisé :

  %LOCALAPPDATA%\\inerWeb-Fluide\\data\\       la base de données (le
      registre) et, à l'intérieur, documents\\ (photos, attestations, PDF…)
  %LOCALAPPDATA%\\inerWeb-Fluide\\backups\\    les sauvegardes

Le chemin exact s'affiche dans la fenêtre noire au démarrage, à la ligne
« Donnees locales : ». Autrement dit : ces données ne sont PAS dans le
dossier du programme, et copier ce dossier ne les emporte pas.

Si un dossier data\\ existe déjà à côté du programme (installation plus
ancienne), l'application continue de l'utiliser : c'est lui qui fait foi.

SAUVEGARDE
----------
Depuis l'application, utilisez l'écran « Sauvegarde » : il produit un
fichier ZIP complet et vérifié. C'est la seule méthode qui garantit une
copie cohérente du registre.

Pour une copie manuelle, fermez d'abord l'application (fenêtre noire),
puis copiez le dossier %LOCALAPPDATA%\\inerWeb-Fluide en entier.

IMPORTANT : ne placez jamais la base dans un dossier synchronisé en
permanence (OneDrive, Google Drive…) — la synchronisation d'une base
ouverte peut la corrompre ; l'application refuse d'ailleurs de démarrer
dans ce cas. Le cloud sert aux sauvegardes (fichiers ZIP), pas à la base
en cours d'utilisation.

DÉPLACER / CHANGER DE POSTE
---------------------------
Le programme est portable : copiez ce dossier sur l'autre poste Windows
et lancez-le de la même façon. Vos données, elles, ne suivent pas toutes
seules : faites une sauvegarde ZIP depuis l'application avant de partir,
puis restaurez-la sur le nouveau poste (écran « Sauvegarde »).
`;
fs.writeFileSync(path.join(SORTIE, 'LISEZ-MOI.txt'), LISEZMOI, 'utf8');
console.log('  [ok] LISEZ-MOI.txt');

// ------------------------------------------------------------
// ZIP COMPRESSÉ (deflate) — c'est un fichier de TÉLÉCHARGEMENT.
//
// ⚠ On n'utilise volontairement PAS `server/zip-node.js` : ce module écrit du
// « stored » (aucune compression) et il est le MIROIR EXACT de
// `v8/js/core/zip.js`, dont dépendent les dossiers d'audit SCELLÉS et leur
// vérificateur autonome hors ligne. **Un outil de fabrication n'a pas à toucher
// au cœur du produit.** On écrit donc ici, dans l'outil seul, un ZIP deflate
// autonome (`node:zlib`, natif) : ~92 Mo « stored » → ~35 Mo compressés, soit
// la différence entre trois et dix minutes sur une connexion de lycée.
// ------------------------------------------------------------

/** CRC-32 (IEEE 802.3) — exigé par le format ZIP, sur le contenu NON compressé. */
const TABLE_CRC32 = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let valeur = i;
    for (let bit = 0; bit < 8; bit += 1) {
      valeur = valeur & 1 ? 0xedb88320 ^ (valeur >>> 1) : valeur >>> 1;
    }
    table[i] = valeur >>> 0;
  }
  return table;
})();

function crc32(octets) {
  let crc = 0xffffffff;
  for (let i = 0; i < octets.length; i += 1) {
    crc = TABLE_CRC32[(crc ^ octets[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const u16 = (v) => { const b = Buffer.alloc(2); b.writeUInt16LE(v, 0); return b; };
const u32 = (v) => { const b = Buffer.alloc(4); b.writeUInt32LE(v >>> 0, 0); return b; };

/** Date/heure au format MS-DOS (2 mots de 16 bits), exigé par le format ZIP. */
function versDateDos(date) {
  const heure = ((date.getHours() & 0x1f) << 11)
    | ((date.getMinutes() & 0x3f) << 5) | ((date.getSeconds() / 2) & 0x1f);
  const jour = (((date.getFullYear() - 1980) & 0x7f) << 9)
    | (((date.getMonth() + 1) & 0x0f) << 5) | (date.getDate() & 0x1f);
  return { heure, jour };
}

if (FAIRE_ZIP) {
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

  const { heure, jour } = versDateDos(new Date());
  const METHODE_DEFLATE = 8;
  const DRAPEAU_UTF8 = 0x0800; // les noms de fichiers sont en UTF-8
  const morceaux = [];
  const central = [];
  let decalage = 0;
  let tailleBrute = 0;

  for (const entree of entrees) {
    const nom = Buffer.from(entree.nom, 'utf8');
    const brut = Buffer.from(entree.contenu);
    const comprime = zlib.deflateRawSync(brut, { level: 9 });
    const crc = crc32(brut);
    tailleBrute += brut.length;

    const enTeteLocal = Buffer.concat([
      u32(0x04034b50), u16(20), u16(DRAPEAU_UTF8), u16(METHODE_DEFLATE),
      u16(heure), u16(jour), u32(crc), u32(comprime.length), u32(brut.length),
      u16(nom.length), u16(0), nom
    ]);
    morceaux.push(enTeteLocal, comprime);

    central.push(Buffer.concat([
      u32(0x02014b50), u16(20), u16(20), u16(DRAPEAU_UTF8), u16(METHODE_DEFLATE),
      u16(heure), u16(jour), u32(crc), u32(comprime.length), u32(brut.length),
      u16(nom.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(decalage), nom
    ]));
    decalage += enTeteLocal.length + comprime.length;
  }

  const repertoire = Buffer.concat(central);
  const fin = Buffer.concat([
    u32(0x06054b50), u16(0), u16(0), u16(entrees.length), u16(entrees.length),
    u32(repertoire.length), u32(decalage), u16(0)
  ]);
  const octets = Buffer.concat([...morceaux, repertoire, fin]);

  const cheminZip = SORTIE + '.zip';
  fs.writeFileSync(cheminZip, octets);
  const tailleZip = (octets.length / (1024 * 1024)).toFixed(1);
  const gain = (100 - (octets.length / tailleBrute) * 100).toFixed(0);
  console.log(`\n  [ok] Archive : ${cheminZip} (${tailleZip} Mo, compressée — `
    + `${gain} % de moins que le dossier)`);

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

  // Report au registre des livraisons : la ligne du numéro reçoit la date de
  // fabrication et l'empreinte du zip. C'est CE rapprochement qui rend une
  // copie qui circule attribuable à sa livraison d'origine. Best-effort : un
  // registre absent (licence fabriquée ailleurs) est DIT, jamais silencieux.
  const cheminRegistre = path.join(
    RACINE, '..', 'paquets', 'licences', 'registre-livraisons.csv');
  if (fs.existsSync(cheminRegistre)) {
    const lignes = fs.readFileSync(cheminRegistre, 'utf8').split(/\r?\n/);
    let reporte = false;
    const nouvelles = lignes.map((ligne) => {
      if (!ligne.startsWith(`${LICENCE.numero};`)) return ligne;
      const champs = ligne.split(';');
      champs[5] = licenceModule.dateDuJour();
      champs[6] = empreinte;
      reporte = true;
      return champs.join(';');
    });
    if (reporte) {
      fs.writeFileSync(cheminRegistre, nouvelles.join('\n'), 'utf8');
      console.log(`  [ok] Registre des livraisons mis à jour (${LICENCE.numero}).`);
    } else {
      console.warn(`  [!]  ${LICENCE.numero} absent du registre — empreinte NON reportée.`);
    }
  } else {
    console.warn(`  [!]  Registre introuvable (${cheminRegistre}) — empreinte NON reportée.`);
  }

  console.log('');
  console.log('  ------------------------------------------------------------');
  console.log(`   Paquet nominatif ${LICENCE.numero} — ${LICENCE.titulaire}`);
  console.log('   JOIGNEZ CETTE EMPREINTE AU COURRIEL D\'ENVOI :');
  console.log(`   SHA-256 : ${empreinte}`);
  console.log('');
  console.log('   Le destinataire peut la vérifier, sans rien installer :');
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
