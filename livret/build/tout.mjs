/* =====================================================================
   LIVRET « HABILITATION FLUIDE » — LA CHAÎNE ENTIÈRE
   ---------------------------------------------------------------------
   `npm run tout` : les maillons dans l'ordre, chacun refusant de passer
   la main s'il lui manque quelque chose. Au bout, `dist/kdp/` porte les
   deux fichiers à téléverser — et le contrôle a dit qu'ils passent.
   ===================================================================== */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
/* La couverture vient APRÈS le livre : son dos se calcule sur la
   pagination réelle, que seule la fabrication du PDF connaît. */
const maillons = ['extraire.mjs', 'visuels.mjs', 'qr.mjs', 'build-livret.mjs',
  'build-html.mjs', 'build-corrige.mjs', 'couverture.mjs', 'paquet-kdp.mjs',
  'registre-visuels.mjs', 'matrice-referentiel.mjs'];

for (const m of maillons) {
  console.log(`\n━━━ ${m} ━━━`);
  execFileSync(process.execPath, [path.join(ICI, m)], { stdio: 'inherit' });
}

/* Le dernier mot revient au contrôle : la chaîne ne se déclare pas
   terminée sur une impression favorable, mais sur le fichier mesuré. */
console.log('\n━━━ verifier-kdp.py ━━━');
const kdp = (f) => path.join(ICI, '..', 'dist', 'kdp', f);
try {
  execFileSync('python', [path.join(ICI, 'verifier-kdp.py'),
    kdp('inerweb.fr-HabFluide-Tome1-Livret-eleve-6x9.pdf'),
    kdp('inerweb.fr-HabFluide-Tome1-Couverture-6x9.pdf')], { stdio: 'inherit' });
} catch {
  console.error('\n✖ Le paquet ne passe pas le contrôle : ne rien téléverser en l’état.');
  process.exit(1);
}
console.log('\n━━━ Chaîne complète : dist/kdp/ est prêt à téléverser. ━━━');
