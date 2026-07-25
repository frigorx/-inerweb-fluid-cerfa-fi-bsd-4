// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// RÉPÉTITION GÉNÉRALE DU MODE OFFICIEL (préparation du lot L6)
//
// LE PROBLÈME. Le mode Officiel est fermé par `VERROU_LIVRAISON = true`
// (décision T1, audit externe du 20/07), et ce verrou n'est PAS configurable
// par l'environnement — c'est délibéré : une variable d'env, c'est une
// réouverture par accident. Conséquence : la suite `server/test-officiel-e2e`
// est gelée, et personne ne sait dans quel état est réellement le parcours
// officiel après tout ce qui a été livré depuis (P0-3 à P1-2, les lots
// réglementaires L1/L3/L4/L5, et maintenant L2).
//
// Le jour de la réouverture, on découvrirait tout d'un coup. Cet outil
// permet de le savoir AVANT, sans rien rouvrir :
//
//   1. il COPIE le dépôt dans un dossier temporaire ;
//   2. il bascule le verrou à `false` DANS LA COPIE seulement (les deux
//      miroirs : v8/js/data/blocage-officiel.js et server/blocage-officiel.js) ;
//   3. il joue la suite e2e officielle DEPUIS la copie, sur une base jetable ;
//   4. il rapporte, et supprime la copie.
//
// Le dépôt n'est jamais modifié. Rien n'est commité. Le verrou de production
// reste fermé — vérifié en fin de course, et l'outil le dit.
//
// Usage :  node outils/repetition-generale-officiel.mjs
//          node outils/repetition-generale-officiel.mjs --garder   (garde la
//          copie pour inspection : le chemin est affiché)
//
// Ce fichier n'est PAS une suite de tests (il ne s'appelle pas test-*.mjs) :
// il ne doit pas entrer dans le filet, qui éprouve le logiciel TEL QU'IL EST
// LIVRÉ — donc verrou fermé.
// ============================================================

import { cpSync, rmSync, readFileSync, writeFileSync, mkdtempSync, existsSync }
  from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const GARDER = process.argv.includes('--garder');

console.log('');
console.log('=== RÉPÉTITION GÉNÉRALE DU MODE OFFICIEL ===');
console.log('Le verrou de production n’est PAS touché : tout se passe dans');
console.log('une copie jetable du dépôt.');
console.log('');

const COPIE = mkdtempSync(join(tmpdir(), 'iwf-repetition-officiel-'));

/** Bascule VERROU_LIVRAISON à false dans un fichier de la COPIE. */
function ouvrirLeVerrouDansLaCopie(cheminRelatif) {
  const chemin = join(COPIE, cheminRelatif);
  const avant = readFileSync(chemin, 'utf8');
  const apres = avant
    .replace('const VERROU_LIVRAISON = true;', 'const VERROU_LIVRAISON = false;')
    .replace('export const VERROU_LIVRAISON = true;',
      'export const VERROU_LIVRAISON = false;');
  if (apres === avant) {
    console.error(`  [ERREUR] verrou introuvable dans ${cheminRelatif} — la`);
    console.error('  forme du code a changé, cet outil doit être mis à jour.');
    process.exit(1);
  }
  writeFileSync(chemin, apres, 'utf8');
  console.log(`  verrou ouvert dans la copie : ${cheminRelatif}`);
}

let code = 0;
try {
  // 1. Copie (seulement ce qui sert : le code et les suites).
  for (const dossier of ['server', 'v8', 'outils', 'img']) {
    if (existsSync(join(RACINE, dossier))) {
      cpSync(join(RACINE, dossier), join(COPIE, dossier), { recursive: true });
    }
  }
  for (const fichier of ['index.html', 'guide.html', 'manifest.json']) {
    if (existsSync(join(RACINE, fichier))) {
      cpSync(join(RACINE, fichier), join(COPIE, fichier));
    }
  }
  console.log(`copie faite : ${COPIE}`);

  // 2. Le verrou, dans la COPIE uniquement.
  ouvrirLeVerrouDansLaCopie(join('v8', 'js', 'data', 'blocage-officiel.js'));
  ouvrirLeVerrouDansLaCopie(join('server', 'blocage-officiel.js'));
  console.log('');

  // 3. La suite e2e officielle, depuis la copie.
  console.log('--- suite e2e officielle (verrou ouvert dans la copie) ---');
  const resultat = spawnSync(process.execPath,
    [join('server', 'test-officiel-e2e.mjs')],
    { cwd: COPIE, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const sortie = `${resultat.stdout ?? ''}${resultat.stderr ?? ''}`;
  console.log(sortie.trim() || '(aucune sortie)');
  code = resultat.status ?? 1;

  console.log('');
  if (code === 0) {
    console.log('✔ La répétition générale PASSE : le parcours officiel de bout');
    console.log('  en bout fonctionne avec le verrou ouvert. La réouverture');
    console.log('  (lot L6) ne réserve pas de mauvaise surprise sur ce parcours.');
  } else {
    console.log('✘ La répétition générale ÉCHOUE. Ce n’est pas une régression');
    console.log('  du logiciel livré (le mode Officiel est fermé, donc ce');
    console.log('  parcours n’est pas exerçable) : c’est la LISTE DE TRAVAIL');
    console.log('  de la réouverture. Chaque ligne en échec ci-dessus est un');
    console.log('  point à traiter dans le lot L6, avant de basculer le verrou.');
  }

  // 4. Le verrou de production, lui, n'a pas bougé — on le vérifie.
  const productionEsm = readFileSync(
    join(RACINE, 'v8', 'js', 'data', 'blocage-officiel.js'), 'utf8');
  const productionCjs = readFileSync(
    join(RACINE, 'server', 'blocage-officiel.js'), 'utf8');
  const toujoursFerme =
    productionEsm.includes('export const VERROU_LIVRAISON = true;')
    && productionCjs.includes('const VERROU_LIVRAISON = true;');
  console.log('');
  console.log(toujoursFerme
    ? '✔ Vérifié : le verrou de production est TOUJOURS FERMÉ (dépôt intact).'
    : '✘ ALERTE : le verrou de production n’est plus fermé — vérifiez le dépôt !');
  if (!toujoursFerme) code = 1;
} finally {
  if (GARDER) {
    console.log('');
    console.log(`copie conservée pour inspection : ${COPIE}`);
  } else {
    try {
      rmSync(COPIE, { recursive: true, force: true, maxRetries: 5,
        retryDelay: 200 });
    } catch { /* dossier temporaire : sans conséquence */ }
  }
}

process.exit(code);
