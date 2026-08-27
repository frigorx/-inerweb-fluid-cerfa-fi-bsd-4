/* =====================================================================
   LIVRET « HABILITATION FLUIDE » — LA CHAÎNE ENTIÈRE
   ---------------------------------------------------------------------
   `npm run tout` : les cinq maillons dans l'ordre, chacun refusant de
   passer la main s'il lui manque quelque chose. Sorties dans dist/.
   ===================================================================== */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const maillons = ['extraire.mjs', 'visuels.mjs', 'qr.mjs', 'build-livret.mjs', 'build-corrige.mjs'];

for (const m of maillons) {
  console.log(`\n━━━ ${m} ━━━`);
  execFileSync(process.execPath, [path.join(ICI, m)], { stdio: 'inherit' });
}
console.log('\n━━━ Chaîne complète : dist/ est à jour. ━━━');
