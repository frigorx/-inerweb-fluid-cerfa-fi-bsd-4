// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// LES PREUVES CITÉES EXISTENT (revue B2, mineur 1).
//
// La doctrine du dépôt est la preuve CITÉE et VÉRIFIÉE : chaque module
// sensible renvoie, en tête, à la suite qui l'éprouve. Trois modules du
// lot B2 citaient une suite de parité qui N'EXISTE PAS — la preuve
// existait bien, mais sous un autre nom. Une référence morte est le pire
// des mineurs : elle fait croire à un filet qu'on n'a pas.
//
// Cette suite relit TOUT le code du dépôt et vérifie que chaque nom de
// suite cité (dans un commentaire comme dans du code) correspond à un
// fichier réellement présent. Un chemin partiel suffit : il doit être la
// FIN du chemin réel d'une suite existante.
//
// Exécution : node outils/test-references-suites.mjs
// ============================================================

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const EXCLUS_PARTOUT = new Set(['.git', 'node_modules', '.claude']);
// Mêmes exclusions que le lanceur : à la RACINE seulement (v8/js/data et
// v8/js/documents sont du code, data/ et documents/ sont à l'utilisateur).
const EXCLUS_RACINE = new Set([
  'data', 'documents', 'backups', 'exports', 'img', 'css', 'apps-script'
]);

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else { nbEchecs += 1; console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`); }
}

/** Tous les fichiers de code, et tous les chemins de suites existantes. */
function inventorier(dossier, sources, suites) {
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    if (entree.isDirectory()) {
      if (EXCLUS_PARTOUT.has(entree.name)) continue;
      if (dossier === RACINE && EXCLUS_RACINE.has(entree.name)) continue;
      inventorier(join(dossier, entree.name), sources, suites);
      continue;
    }
    const chemin = join(dossier, entree.name);
    const relatif = relative(RACINE, chemin).split('\\').join('/');
    if (/\.(js|mjs)$/.test(entree.name)) sources.push({ relatif, chemin });
    if (/^test-.*\.mjs$/.test(entree.name)) suites.push(relatif);
  }
}

const sources = [];
const suites = [];
inventorier(RACINE, sources, suites);

console.log('\n--- Inventaire ---');
verifier('le dépôt a bien été parcouru (code et suites trouvés)',
  sources.length > 100 && suites.length > 50,
  `${sources.length} fichiers de code, ${suites.length} suites`);

// Un nom de suite cité (un fichier de test), éventuellement précédé d'un
// bout de chemin. On ne retient QUE ces mentions-là : le reste des
// chemins cités ne relève pas de la preuve.
const MOTIF_CITATION = /[A-Za-z0-9_./-]*test-[A-Za-z0-9_.-]+\.mjs/g;

const mortes = [];
for (const source of sources) {
  const texte = readFileSync(source.chemin, 'utf8');
  for (const trouve of texte.matchAll(MOTIF_CITATION)) {
    const citation = trouve[0];
    const existe = suites.some(
      (s) => s === citation || s.endsWith(`/${citation}`));
    if (!existe) mortes.push(`${source.relatif} cite « ${citation} »`);
  }
}

console.log('\n--- Références aux suites ---');
verifier('toute suite citée dans le code existe réellement',
  mortes.length === 0, mortes.join(' | '));

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
