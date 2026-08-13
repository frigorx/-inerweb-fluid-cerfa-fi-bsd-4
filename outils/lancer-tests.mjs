// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
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

import { spawnSync } from 'node:child_process';
// ⚠ La DÉCOUVERTE et la PLANIFICATION vivent dans outils/plan-tests.mjs
// depuis la revue du lot 1 (27/07/2026) : huit pièces du dépôt annoncent
// le nombre d'exécutions, et outils/test-nombre-executions.mjs le
// RECOMPTE en important ce plan. Le lanceur ne peut pas être importé
// (il lance), d'où le module voisin.
import { RACINE, decouvrirSuites, planifier } from './plan-tests.mjs';

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
