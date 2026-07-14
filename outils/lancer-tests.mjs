// ============================================================
// inerWeb Fluide — Lanceur de tests global
// Exécution : node outils/lancer-tests.mjs [--tout]
//
// Découvre toutes les suites test-*.mjs du dépôt (serveur + front),
// les lance une à une depuis la racine et S'ARRÊTE AU PREMIER ROUGE
// en rejouant la sortie complète de la suite en échec.
// Avec --tout : ne s'arrête pas, dresse le bilan de toutes les suites.
//
// Cas particulier : v8/js/data/test-contrat.mjs tourne DEUX fois
// (demo puis local) — c'est la parité DemoStore/LocalStore qui casse
// le build à la moindre divergence.
//
// Chaque suite travaille sur des données jetables (mkdtemp) : le
// lanceur ne touche JAMAIS aux dossiers réels data/, documents/,
// backups/ — ils sont d'ailleurs exclus de la découverte.
// Node ≥ 22, zéro dépendance.
// ============================================================

import { readdirSync } from 'node:fs';
import { join, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
// Exclus PARTOUT (jamais de code à nous dedans).
const EXCLUS_PARTOUT = new Set(['.git', 'node_modules', '.claude']);
// Exclus À LA RACINE SEULEMENT : data/, documents/, backups/… sont les
// dossiers RÉELS de l'utilisateur — mais v8/js/data/ et v8/js/documents/
// sont du CODE avec des suites dedans (même piège que le .gitignore :
// un motif non ancré raterait 17 suites sur 37).
const EXCLUS_RACINE = new Set([
  'data', 'documents', 'backups', 'exports', 'img', 'css', 'apps-script'
]);

/** Parcourt le dépôt et retourne les chemins relatifs des test-*.mjs. */
function decouvrirSuites(dossier = RACINE) {
  const suites = [];
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    if (entree.isDirectory()) {
      if (EXCLUS_PARTOUT.has(entree.name)) continue;
      if (dossier === RACINE && EXCLUS_RACINE.has(entree.name)) continue;
      suites.push(...decouvrirSuites(join(dossier, entree.name)));
    } else if (/^test-.*\.mjs$/.test(entree.name)) {
      suites.push(relative(RACINE, join(dossier, entree.name)));
    }
  }
  return suites.sort();
}

// Suites jouées DEUX fois (demo puis local) : celles qui éprouvent la
// parité DemoStore/LocalStore via l'argument de store.
const SUITES_DOUBLEES = new Set([
  'v8/js/data/test-contrat.mjs',
  'v8/js/data/test-dossiers-fuite.mjs',
  'v8/js/data/test-feu-tricolore.mjs',
  'v8/js/data/test-prp-fige.mjs',
  'v8/js/data/test-inventaire-nominatif.mjs',
  'v8/js/data/test-sentinelle.mjs',
  'v8/js/data/test-habilitations.mjs',
  'v8/js/data/test-mentions.mjs',
  'v8/js/data/test-code-machine.mjs',
  'v8/js/data/test-outils-intervention.mjs',
  'v8/js/data/test-audit-guide.mjs'
]);

/** Une exécution = un fichier + des arguments éventuels. */
function planifier(suites) {
  const plan = [];
  for (const chemin of suites) {
    if (SUITES_DOUBLEES.has(chemin.split(sep).join('/'))) {
      plan.push({ chemin, args: ['demo'], libelle: `${chemin} (demo)` });
      plan.push({ chemin, args: ['local'], libelle: `${chemin} (local)` });
    } else {
      plan.push({ chemin, args: [], libelle: chemin });
    }
  }
  return plan;
}

const toutJouer = process.argv.includes('--tout');
const plan = planifier(decouvrirSuites());
console.log(`Lanceur de tests — ${plan.length} exécutions (${toutJouer ? 'bilan complet' : 'arrêt au premier rouge'})\n`);

const debut = Date.now();
const echecs = [];

for (const { chemin, args, libelle } of plan) {
  const top = Date.now();
  const resultat = spawnSync(process.execPath, [chemin, ...args], {
    cwd: RACINE, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024
  });
  const duree = ((Date.now() - top) / 1000).toFixed(1);

  if (resultat.status === 0) {
    console.log(`  VERT   ${libelle} (${duree} s)`);
  } else {
    console.error(`  ROUGE  ${libelle} (${duree} s) — code ${resultat.status}`);
    console.error('--- sortie de la suite en échec ---');
    if (resultat.stdout) console.error(resultat.stdout);
    if (resultat.stderr) console.error(resultat.stderr);
    console.error('-----------------------------------');
    echecs.push(libelle);
    if (!toutJouer) break;
  }
}

const total = ((Date.now() - debut) / 1000).toFixed(1);
if (echecs.length === 0) {
  console.log(`\nTOUT VERT — ${plan.length} exécutions en ${total} s.`);
} else {
  console.error(`\n${echecs.length} ÉCHEC(S) en ${total} s : ${echecs.join(', ')}`);
  process.exit(1);
}
