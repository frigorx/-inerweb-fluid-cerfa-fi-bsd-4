// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — LE PLAN DU FILET : quelles suites, et combien
// d'exécutions.
//
// Extrait de `outils/lancer-tests.mjs` le 27/07/2026 (revue du lot 1),
// pour une raison précise : le dépôt ANNONCE ce nombre dans huit pièces,
// dont celles remises à l'établissement (« TOUT VERT — N exécutions …
// vérifiez par vous-même »). Tant que le nombre n'était écrit qu'à la
// main, il pouvait vieillir sans que rien ne rougisse — et il avait
// vieilli de trois. `outils/test-nombre-executions.mjs` le RECOMPTE ici
// et confronte chaque annonce.
//
// Ce module ne lance rien : il ne fait que DÉCRIRE le plan.
// Node ≥ 22, zéro dépendance.
// ============================================================

import { readdirSync } from 'node:fs';
import { join, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');

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
export function decouvrirSuites(dossier = RACINE) {
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
export const SUITES_DOUBLEES = new Set([
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
  'v8/js/data/test-audit-guide.mjs',
  'v8/js/data/test-coherence-etat-bouteille.mjs',
  'v8/js/data/test-referentiel-fluides.mjs',
  'v8/js/data/test-equipement.mjs',
  'v8/js/data/test-machine-saisie.mjs',
  'v8/js/data/test-perimetre-cerfa.mjs',
  'v8/js/data/test-plaintes.mjs',
  'v8/js/data/test-remise-filiere.mjs',
  // Lot 1 / branche A : le REFUS du CERFA sur une contre-écriture, et ce
  // que le refus ne doit pas casser. C'est le store qui porte
  // `contreEcritureDe` et `cerfaNumero` — la preuve ne vaut que jouée
  // contre les deux (parité api.js ↔ demo-store.js).
  'v8/js/cerfa/test-contre-ecriture.mjs',
  // Lot 1 / branche A : le DOCUMENT qui remplace ce CERFA.
  'v8/js/documents/test-justificatif-regularisation.mjs'
]);

/** Une exécution = un fichier + des arguments éventuels. */
export function planifier(suites) {
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

/** Le nombre d'EXÉCUTIONS que le filet complet enchaîne. */
export function nombreExecutions() {
  return planifier(decouvrirSuites()).length;
}
