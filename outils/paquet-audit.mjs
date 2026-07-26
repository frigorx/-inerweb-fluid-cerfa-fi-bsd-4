// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// PAQUET D'AUDIT — tout le programme en quelques fichiers lisibles
//
// À QUOI ÇA SERT. Faire relire le logiciel par quelqu'un d'extérieur —
// expert humain, ou modèle de langue à qui l'on demande d'incarner ce rôle.
// Dans les deux cas, il faut lui donner le CODE ENTIER, pas un dépôt à
// explorer : un relecteur qui doit deviner où regarder ne regarde rien.
//
// CE QUE LE PAQUET CONTIENT
//   00-BRIEF-AUDITEUR.md    ce qu'est le logiciel, ce qu'on demande, les
//                           questions précises, ce qui est déjà prouvé et
//                           ce qui reste ouvert (rédigé à la main, copié ici)
//   01-SOMMAIRE.md          la liste des fichiers, leur rôle, leur volume
//   CODE-01.txt … CODE-NN   le code source complet, découpé en volumes
//
// CE QU'IL NE CONTIENT PAS, ET POURQUOI
//   · `data/`, `documents/`, `backups/` : les données RÉELLES du poste —
//     élèves, clients, interventions. Elles n'ont rien à faire dans un
//     dossier qui part à l'extérieur. C'est la règle la plus importante ici.
//   · `v8/js/lib/` : le DOSSIER ENTIER est écarté (`DOSSIERS_TIERS`), et
//     ses fichiers sont NOMMÉS au sommaire avec leur taille, pour que
//     l'auditeur sache ce qui tourne. Il contient CINQ fichiers :
//       - QUATRE fichiers TIERS (2 362 164 o, soit 2,25 Mio) pour TROIS
//         projets — pdf.min.mjs + pdf.worker.min.mjs (PDF.js 4.10.38,
//         Apache 2.0), pdf-lib.min.js (MIT, contient tslib en Apache 2.0),
//         qrcode-vendor.js (qrcodejs, MIT). Les trois premiers sont
//         MINIFIÉS ; qrcode-vendor.js l'est aussi, sous notre en-tête.
//         Personne ne relira ligne à ligne du code qu'on n'a pas écrit.
//       - UN fichier de NOUS, `qrcode.js` (38 lignes) : un adaptateur qui
//         lit `window.QRCode`. Il part avec les autres parce que le filtre
//         écarte le dossier, pas les fichiers un par un — c'est assumé, et
//         c'est dit au sommaire. Inventaire complet et licences RÉELLES
//         vérifiées fichier par fichier : `LICENCES-TIERCES.md`.
//   · `.git/`, `node_modules/` : sans objet.
//
// Usage :  node outils/paquet-audit.mjs
//          node outils/paquet-audit.mjs --volume 300   (Ko par volume)
//          node outils/paquet-audit.mjs --sortie <dossier>
// ============================================================

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, rmSync,
  existsSync } from 'node:fs';
import { join, relative, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const iVol = args.indexOf('--volume');
const TAILLE_VOLUME_KO = iVol >= 0 ? Number(args[iVol + 1]) || 300 : 300;
const COEUR = args.includes('--coeur');
const iSortie = args.indexOf('--sortie');
const SORTIE = iSortie >= 0 ? args[iSortie + 1]
  : join(RACINE, '..', COEUR ? 'inerweb-fluide-PAQUET-AUDIT-COEUR'
    : 'inerweb-fluide-PAQUET-AUDIT');

// ------------------------------------------------------------
// LE CŒUR — ce qu'il faut lire pour juger l'INTÉGRITÉ et la SÉCURITÉ.
// Un paquet complet (82 000 lignes) ne rentre pas dans la mémoire de
// travail d'un relecteur, humain ou machine. Cette liste est le
// sous-ensemble sans lequel on ne peut PAS se prononcer : le dispatcher,
// la base, le serveur, les empreintes, les comptes, le chiffrement, les
// règles réglementaires pures — et la suite qui prouve les refus. Tout le
// reste (écrans, assistants de saisie, documents, tests fonctionnels)
// reste disponible dans le paquet complet.
// ------------------------------------------------------------
const COEUR_FICHIERS = [
  'server/api.js', 'server/db.js', 'server/serveur.js', 'server/migrations.js',
  'server/schema.sql', 'server/hash-mouvement.js', 'server/mapping.js',
  'server/comptes.js', 'server/sessions.js', 'server/routes-comptes.js',
  'server/routes-sauvegarde.js', 'server/chiffrement.js',
  'server/sauvegarde.js', 'server/restauration.js', 'server/manifeste.js',
  'server/verification.js', 'server/scellement-externe.js',
  'server/sauvegarde-auto.js', 'server/coffre-identites.js',
  'server/borne-scellement.js', 'server/dates.js', 'server/equipement.js',
  'server/droit-intervention.js', 'server/blocage-officiel.js',
  'server/declaration-annuelle.js', 'server/pdf-final.js',
  'server/signatures-mouvement.js', 'server/export-personne.js',
  'server/zip-node.js', 'server/parametres.js', 'server/creer-admin.js',
  'server/test-securite-negative.mjs',
  'v8/js/data/contrat.js', 'v8/js/data/dates.js',
  'v8/js/data/reglementation-fluides.js', 'v8/js/data/habilitations.js',
  'v8/js/data/equipement.js', 'v8/js/data/blocage-officiel.js',
  'v8/js/data/avoir-origine.js', 'v8/js/data/dossiers-fuite.js',
  'v8/js/data/coffre-identites.js', 'v8/js/data/export-personne.js',
  'v8/js/data/local-store.js', 'v8/js/data/transport-http.js',
  'v8/js/data/datastore.js', 'v8/js/data/contenu-pj.js'
];

// Ce qui ne sort JAMAIS du poste. ⚠️ PIÈGE DU DÉPÔT, payé deux fois (ici et
// dans le lanceur de tests) : `data/`, `documents/` et `backups/` ne sont les
// dossiers de DONNÉES qu'À LA RACINE. Plus bas, `v8/js/data/` est du CODE —
// et pas n'importe lequel : c'est le cœur métier (contrat, magasin de
// démonstration, tous les modules de règles). Un filtre non ancré vidait le
// paquet d'audit de l'essentiel, sans rien dire.
const DOSSIERS_INTERDITS_RACINE = new Set([
  'data', 'documents', 'backups', 'exports', 'design'
]);
const DOSSIERS_INTERDITS_PARTOUT = new Set([
  '.git', 'node_modules', '.claude'
]);
// Tiers minifié : nommé au sommaire, pas recopié.
const DOSSIERS_TIERS = new Set(['lib']);
const EXTENSIONS_CODE = new Set([
  '.js', '.mjs', '.sql', '.css', '.html', '.json', '.md', '.bat', '.cmd'
]);
const FICHIERS_SENSIBLES = new Set(['.env', '.env.local']);

/** Parcourt le dépôt et rend les fichiers à embarquer. */
function collecter(dossier = RACINE, tiers = []) {
  const fichiers = [];
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    const chemin = join(dossier, entree.name);
    const rel = relative(RACINE, chemin).split('\\').join('/');
    if (entree.isDirectory()) {
      if (DOSSIERS_INTERDITS_PARTOUT.has(entree.name)) continue;
      if (dossier === RACINE && DOSSIERS_INTERDITS_RACINE.has(entree.name)) {
        continue;
      }
      if (DOSSIERS_TIERS.has(entree.name)) {
        for (const f of readdirSync(chemin)) {
          const t = statSync(join(chemin, f));
          tiers.push({ chemin: `${rel}/${f}`, taille: t.size });
        }
        continue;
      }
      const sous = collecter(chemin, tiers);
      fichiers.push(...sous.fichiers);
      continue;
    }
    if (FICHIERS_SENSIBLES.has(entree.name)) continue;
    if (!EXTENSIONS_CODE.has(extname(entree.name).toLowerCase())) continue;
    fichiers.push({ chemin: rel, taille: statSync(chemin).size });
  }
  return { fichiers, tiers };
}

const collecte = collecter();
const tiers = collecte.tiers;
let fichiers = collecte.fichiers;
if (COEUR) {
  const voulus = new Set(COEUR_FICHIERS);
  const presents = new Set(fichiers.map((f) => f.chemin));
  for (const attendu of COEUR_FICHIERS) {
    if (!presents.has(attendu)) {
      console.error(`  [attention] fichier du coeur introuvable : ${attendu}`);
    }
  }
  fichiers = fichiers.filter((f) => voulus.has(f.chemin));
}
fichiers.sort((a, b) => a.chemin.localeCompare(b.chemin));

// ------------------------------------------------------------
// Écriture du paquet
// ------------------------------------------------------------
if (existsSync(SORTIE)) rmSync(SORTIE, { recursive: true, force: true });
mkdirSync(SORTIE, { recursive: true });

const LIMITE = TAILLE_VOLUME_KO * 1024;
let volume = 1;
let tampon = '';
const volumes = [];

function viderTampon() {
  if (!tampon) return;
  const nom = `CODE-${String(volume).padStart(2, '0')}.txt`;
  writeFileSync(join(SORTIE, nom), tampon, 'utf8');
  volumes.push({ nom, taille: Buffer.byteLength(tampon), fin: dernierFichier });
  tampon = '';
  volume += 1;
}

let dernierFichier = '';
const placement = [];
for (const f of fichiers) {
  const contenu = readFileSync(join(RACINE, f.chemin), 'utf8');
  const entete = `\n\n${'='.repeat(78)}\n`
    + `FICHIER : ${f.chemin}\n`
    + `${'='.repeat(78)}\n\n`;
  if (tampon && Buffer.byteLength(tampon) + Buffer.byteLength(contenu) > LIMITE) {
    viderTampon();
  }
  if (!tampon) {
    tampon = `PAQUET D'AUDIT inerWeb Fluide — volume ${volume}\n`
      + `(code source intégral, découpé pour être lisible d'un seul tenant)\n`;
  }
  tampon += entete + contenu;
  dernierFichier = f.chemin;
  placement.push({ ...f, volume });
}
viderTampon();

// ------------------------------------------------------------
// Sommaire
// ------------------------------------------------------------
const totalLignes = fichiers.reduce((n, f) =>
  n + readFileSync(join(RACINE, f.chemin), 'utf8').split('\n').length, 0);

const parDossier = new Map();
for (const f of placement) {
  const cle = f.chemin.includes('/') ? f.chemin.split('/').slice(0, -1).join('/') : '(racine)';
  if (!parDossier.has(cle)) parDossier.set(cle, []);
  parDossier.get(cle).push(f);
}

let sommaire = `# Sommaire du paquet d'audit — inerWeb Fluide\n\n`
  + `Paquet produit le ${new Date().toISOString().slice(0, 10)} par `
  + `\`node outils/paquet-audit.mjs\`.\n\n`
  + `- **${fichiers.length} fichiers**, **${totalLignes.toLocaleString('fr-FR')} lignes**, `
  + `répartis en **${volumes.length} volumes** de ${TAILLE_VOLUME_KO} Ko environ.\n`
  + `- Aucune donnée réelle : \`data/\`, \`documents/\`, \`backups/\` sont exclus `
  + `par construction.\n\n`
  + `## Les volumes\n\n| Volume | Taille | Se termine au fichier |\n|---|---|---|\n`;
for (const v of volumes) {
  sommaire += `| \`${v.nom}\` | ${Math.round(v.taille / 1024)} Ko | \`${v.fin}\` |\n`;
}

sommaire += `\n## Où trouver quoi\n\n| Fichier | Lignes | Volume |\n|---|---|---|\n`;
for (const [dossier, liste] of [...parDossier.entries()].sort()) {
  sommaire += `| **${dossier}/** | | |\n`;
  for (const f of liste) {
    const lignes = readFileSync(join(RACINE, f.chemin), 'utf8').split('\n').length;
    sommaire += `| \`${f.chemin.split('/').pop()}\` | ${lignes} | ${f.volume} |\n`;
  }
}

if (tiers.length > 0) {
  sommaire += `\n## Bibliothèques tierces — NON incluses, mais nommées\n\n`
    + `Ce sont des bibliothèques minifiées que nous n'avons pas écrites. Elles ne `
    + `sont pas recopiées (personne ne relit du code minifié), mais l'auditeur doit `
    + `savoir ce qui tourne sur le poste :\n\n| Fichier | Taille |\n|---|---|\n`;
  for (const t of tiers.sort((a, b) => b.taille - a.taille)) {
    sommaire += `| \`${t.chemin}\` | ${Math.round(t.taille / 1024)} Ko |\n`;
  }
  sommaire += `\nElles servent uniquement à **afficher** et **produire** des PDF `
    + `(visualiseur CERFA, génération du PDF final). Aucune ne touche à la base, `
    + `au réseau ni aux droits.\n`;
}

writeFileSync(join(SORTIE, '01-SOMMAIRE.md'), sommaire, 'utf8');

// Le brief, s'il a été rédigé dans le dépôt.
const briefSource = join(RACINE, 'docs', 'BRIEF-AUDITEUR-EXTERNE.md');
if (existsSync(briefSource)) {
  writeFileSync(join(SORTIE, '00-BRIEF-AUDITEUR.md'),
    readFileSync(briefSource, 'utf8'), 'utf8');
}

console.log('');
console.log('=== PAQUET D’AUDIT ===');
console.log(`dossier : ${SORTIE}`);
console.log(`${fichiers.length} fichiers, ${totalLignes.toLocaleString('fr-FR')} lignes, `
  + `${volumes.length} volume(s)`);
for (const v of volumes) {
  console.log(`  ${v.nom}  ${String(Math.round(v.taille / 1024)).padStart(4)} Ko`);
}
console.log(`${tiers.length} bibliothèque(s) tierce(s) nommée(s), non recopiée(s).`);
console.log('Aucune donnée réelle embarquée (data/, documents/, backups/ exclus).');
