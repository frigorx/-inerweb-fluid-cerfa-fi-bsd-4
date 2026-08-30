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
/* Le format et les noms de fichiers viennent de reglages.json, via format.mjs. */
import * as F from './format.mjs';


const ICI = path.dirname(fileURLToPath(import.meta.url));
/* La couverture vient APRÈS le livre : son dos se calcule sur la
   pagination réelle, que seule la fabrication du PDF connaît. */
const maillons = ['extraire.mjs', 'visuels.mjs', 'reserve.mjs', 'qr.mjs', 'build-livret.mjs',
  'build-html.mjs', 'build-corrige.mjs', 'correction.mjs', 'couverture.mjs', 'paquet-kdp.mjs',
  'registre-visuels.mjs', 'matrice-referentiel.mjs', 'audit-referentiel.mjs'];

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
    kdp(`${F.NOM_INTERIEUR}.pdf`),
    kdp(`${F.NOM_COUVERTURE}.pdf`)], { stdio: 'inherit' });
} catch {
  console.error('\n✖ Le paquet ne passe pas le contrôle : ne rien téléverser en l’état.');
  process.exit(1);
}
/* Le blanc se mesure, il ne se juge pas à l'œil. La règle de fabrication
   est qu'aucune page ne se termine sur du vide ; ce compte dit où on en
   est, à chaque fabrication. Il n'ARRÊTE PAS la chaîne : un blanc n'est
   pas un défaut qu'Amazon refuse, c'est un défaut que le lecteur voit. */
console.log('\n━━━ mesure-blancs.py ━━━');
try {
  execFileSync('python', [path.join(ICI, 'mesure-blancs.py'),
    kdp(`${F.NOM_INTERIEUR}.pdf`)], { stdio: 'inherit' });
} catch {
  console.error('  (mesure des blancs indisponible)');
}

console.log('\n━━━ Chaîne complète : dist/kdp/ est prêt à téléverser. ━━━');
