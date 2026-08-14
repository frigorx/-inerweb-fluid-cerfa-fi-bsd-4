// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — TOUT FICHIER SOURCE RESTE RELISIBLE
// Exécution : node server/test-sources-relisibles.mjs
//
// POURQUOI CETTE SUITE EXISTE (revue adversariale du lot B3, 25/07).
// `server/fabrique-png-test.mjs` portait un octet NUL LITTÉRAL glissé
// dans une chaîne JavaScript (le séparateur d'un chunk tEXt). git
// classe alors le fichier BINAIRE : « git diff » n'affiche plus
// « Bin 5 596 -> 6 081 bytes » et RIEN d'autre. Ce fichier définit ce
// qu'est « une signature valide » pour cinq suites — il était donc le
// seul du dépôt exempté de la relecture de diff, dans un dépôt dont la
// doctrine est « relis le diff en entier ».
//
// Un octet NUL est EXACTEMENT l'heuristique de git (« binary file » dès
// qu'un NUL apparaît dans les premiers 8 000 octets). On le refuse donc
// dans tout fichier source : le remède est toujours trivial (écrire
// l'octet à part, Buffer.from([0])), et la relecture reste possible.
//
// Aucune I/O réseau, aucune base : lecture seule du dépôt.
// ============================================================

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Dossiers sans code à nous (ou données réelles de l'utilisateur). */
const EXCLUS_PARTOUT = new Set(['.git', 'node_modules', '.claude']);
const EXCLUS_RACINE = new Set([
  'data', 'documents', 'backups', 'exports', 'img'
]);

/** Extensions dont le contenu DOIT rester lisible dans un diff. */
const EXTENSIONS = /\.(mjs|cjs|js|json|md|sql|html|css|txt|bat|yml)$/i;

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else {
    nbEchecs += 1;
    console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`);
  }
}

/** Parcourt le dépôt et rend les chemins relatifs des fichiers source. */
function parcourir(dossier = RACINE) {
  const fichiers = [];
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    if (entree.isDirectory()) {
      if (EXCLUS_PARTOUT.has(entree.name)) continue;
      if (dossier === RACINE && EXCLUS_RACINE.has(entree.name)) continue;
      fichiers.push(...parcourir(join(dossier, entree.name)));
    } else if (EXTENSIONS.test(entree.name)) {
      fichiers.push(relative(RACINE, join(dossier, entree.name)));
    }
  }
  return fichiers.sort();
}

const fichiers = parcourir();
verifier('le dépôt expose bien ses fichiers source à la relecture',
  fichiers.length > 100, `${fichiers.length} fichier(s) parcouru(s)`);

const binaires = [];
for (const chemin of fichiers) {
  // L'heuristique de git : un octet NUL dans les 8 000 premiers octets.
  if (readFileSync(join(RACINE, chemin)).subarray(0, 8000).includes(0)) {
    binaires.push(chemin);
  }
}
verifier('⭐ aucun fichier source ne porte d’octet NUL (git le classerait '
  + 'BINAIRE, donc hors de toute relecture de diff)',
binaires.length === 0, binaires.join(', '));

// Contre-épreuve interne : la détection FONCTIONNE (sans elle, la
// vérification ci-dessus serait vraie quoi qu'il arrive).
verifier('contre-épreuve : la détection reconnaît bien un contenu binaire',
  Buffer.from('Cale' + String.fromCharCode(0) + 'remplissage', 'latin1')
    .subarray(0, 8000).includes(0));

// La fabrique de PNG de test est le cas qui a motivé cette suite : elle
// produit toujours un chunk tEXt CORRECT (mot-clé, NUL séparateur, texte).
{
  const { pngDeTest } = await import('./fabrique-png-test.mjs');
  const cale = pngDeTest(1200);
  verifier('la fabrique cale toujours ses PNG à la taille demandée',
    cale.length >= 1200, `${cale.length} octets`);
  const { verifierStructurePng, analyseEncre } = await import('./png.js')
    .then((m) => m.default ?? m);
  verifier('… et le PNG calé reste STRUCTURELLEMENT valide (chunk tEXt inclus)',
    verifierStructurePng(cale).ok === true,
    JSON.stringify(verifierStructurePng(cale).motif));
  verifier('… et porte toujours un tracé', analyseEncre(cale) === 'ENCRE');
}

console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('Sources relisibles : aucun fichier du dépôt n’échappe au diff.');
