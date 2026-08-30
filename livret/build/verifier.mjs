/* =====================================================================
   LIVRET « HABILITATION FLUIDE » — `npm run verifier`
   ---------------------------------------------------------------------
   Le contrôle avant téléversement se fait en Python (PyMuPDF lit le PDF
   réel). Ce lanceur ne fait qu'une chose, mais elle compte : lui passer
   les fichiers PORTANT LE FORMAT COURANT.

   Avant, les deux noms étaient écrits en dur dans `package.json`. Le jour
   où le format a changé, `npm run verifier` cherchait un 6x9 qui n'existait
   plus — et échouait sur un fichier absent au lieu de contrôler le vrai.
   ===================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as F from './format.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const LIVRET = path.join(ICI, '..');

/* Le paquet prêt à téléverser d'abord ; à défaut, la sortie de fabrication. */
const trouver = (nom) => {
  for (const dossier of ['dist/kdp', 'dist']) {
    const p = path.join(LIVRET, dossier, `${nom}.pdf`);
    if (fs.existsSync(p)) return p;
  }
  return null;
};

const interieur = trouver(F.NOM_INTERIEUR);
const couverture = trouver(F.NOM_COUVERTURE);

if (!interieur) {
  console.error(`\n✖ Intérieur introuvable : ${F.NOM_INTERIEUR}.pdf\n` +
    `  Fabriquer d'abord — npm run tout\n`);
  process.exit(1);
}

execFileSync('python', [
  path.join(ICI, 'verifier-kdp.py'),
  interieur,
  ...(couverture ? [couverture] : []),
], { stdio: 'inherit', cwd: LIVRET });
