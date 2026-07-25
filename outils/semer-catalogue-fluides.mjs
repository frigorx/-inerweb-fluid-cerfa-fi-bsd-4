// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// SEMER LE CATALOGUE DE FLUIDES (lot 2 — mélanges HFC/HFO, HFO pur, NH₃)
//
// À quoi ça sert : ajouter au référentiel les 10 fluides validés du
// document `docs/CATALOGUE-FLUIDES-A-VALIDER.md`, sans les ressaisir un par
// un à l'écran. Chaque ligne reste une VALEUR RÉGLEMENTAIRE : l'outil se
// contente de la reporter, il ne décide de rien.
//
// PRUDENCE, par construction :
//   · ESSAI À BLANC par défaut — rien n'est écrit sans `--appliquer` ;
//   · il DIT ce qu'il ferait, ligne par ligne, avant de le faire ;
//   · un fluide DÉJÀ présent n'est jamais écrasé en silence : il est
//     signalé, et seul `--corriger` autorise la mise à jour ;
//   · le PRP d'une écriture déjà validée n'est JAMAIS retouché (il est figé
//     dans l'empreinte — c'est le store qui le garantit, pas cet outil).
//
// Usage (serveur ARRÊTÉ — la base ne s'ouvre pas deux fois) :
//   node outils/semer-catalogue-fluides.mjs                    (essai à blanc)
//   node outils/semer-catalogue-fluides.mjs --appliquer
//   node outils/semer-catalogue-fluides.mjs --appliquer --corriger
//   node outils/semer-catalogue-fluides.mjs --base C:\chemin\vers\base.db
//
// ⚠️ Sans --base, l'outil vise la base RÉELLE du poste. Pour un essai sans
// risque, donnez-lui une base jetable.
// ============================================================

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const APPLIQUER = args.includes('--appliquer');
const CORRIGER = args.includes('--corriger');
const iBase = args.indexOf('--base');
const CHEMIN_BASE = iBase >= 0 ? args[iBase + 1] : null;

const CATALOGUE = JSON.parse(readFileSync(
  join(RACINE, 'docs', 'catalogue-fluides-lot2.json'), 'utf8'));

console.log('');
console.log('=== Semis du catalogue de fluides (lot 2) ===');
console.log(`${CATALOGUE.length} fluides dans le fichier.`);
console.log(APPLIQUER
  ? (CORRIGER
    ? 'Mode : APPLIQUER + CORRIGER (les fluides existants seront mis à jour).'
    : 'Mode : APPLIQUER (les fluides existants seront laissés tels quels).')
  : 'Mode : ESSAI À BLANC — rien ne sera écrit. Ajoutez --appliquer pour agir.');
console.log('');

const db = require(join(RACINE, 'server', 'db.js'));
const api = require(join(RACINE, 'server', 'api.js'));

if (CHEMIN_BASE) db.ouvrir(CHEMIN_BASE);
else db.ouvrir();

const contexte = { role: 'REFERENT' };
const existants = new Map(
  api.appeler('getFluides', {}, contexte).map((f) => [f.code, f]));

let ajoutes = 0;
let corriges = 0;
let inchanges = 0;
let refuses = 0;

for (const fiche of CATALOGUE) {
  const dejaLa = existants.get(fiche.code);
  const resume = `${fiche.code} — PRP ${fiche.gwpAr4}, ${fiche.classeSecurite}, `
    + `cadre 7 : ${fiche.categorieCadre7}`;

  if (!dejaLa) {
    if (!APPLIQUER) {
      console.log(`  [à ajouter]  ${resume}`);
      ajoutes += 1;
      continue;
    }
    try {
      api.appeler('createFluide', { donneesFluide: fiche }, contexte);
      console.log(`  [AJOUTÉ]     ${resume}`);
      ajoutes += 1;
    } catch (erreur) {
      console.error(`  [REFUSÉ]     ${fiche.code} — ${erreur.message}`);
      refuses += 1;
    }
    continue;
  }

  // Déjà présent : on ne touche à rien sans --corriger, et on dit en quoi
  // la fiche du fichier diffère de celle du référentiel.
  const ecarts = [];
  for (const champ of ['gwpAr4', 'classeSecurite', 'categorieCadre7',
    'statutReglementaire', 'contientHfc', 'contientHfo']) {
    if (fiche[champ] !== undefined && dejaLa[champ] !== fiche[champ]) {
      ecarts.push(`${champ} : ${dejaLa[champ]} → ${fiche[champ]}`);
    }
  }
  if (ecarts.length === 0) {
    console.log(`  [inchangé]   ${fiche.code} — déjà au référentiel, identique`);
    inchanges += 1;
    continue;
  }
  if (!CORRIGER) {
    console.log(`  [EXISTANT]   ${fiche.code} — DIFFÉRENT du référentiel : `
      + `${ecarts.join(' · ')}`);
    console.log('               (rien touché — ajoutez --corriger pour '
      + 'appliquer ces changements)');
    inchanges += 1;
    continue;
  }
  if (!APPLIQUER) {
    console.log(`  [à corriger] ${fiche.code} — ${ecarts.join(' · ')}`);
    corriges += 1;
    continue;
  }
  try {
    api.appeler('updateFluide', { code: fiche.code, donneesFluide: fiche },
      contexte);
    console.log(`  [CORRIGÉ]    ${fiche.code} — ${ecarts.join(' · ')}`);
    corriges += 1;
  } catch (erreur) {
    console.error(`  [REFUSÉ]     ${fiche.code} — ${erreur.message}`);
    refuses += 1;
  }
}

console.log('');
console.log(`Bilan : ${ajoutes} ajout(s), ${corriges} correction(s), `
  + `${inchanges} inchangé(s), ${refuses} refus.`);
if (!APPLIQUER) {
  console.log('Essai à blanc : AUCUNE écriture. Relancez avec --appliquer '
    + 'quand le tableau ci-dessus vous convient.');
}
console.log('');
console.log('Rappel : le PRP retenu suit la règle du projet — en cas de');
console.log('valeurs concurrentes, on garde la PLUS ÉLEVÉE (précaution : elle');
console.log('déclenche les contrôles plus tôt). Le détail et les sources de');
console.log('chaque ligne sont dans docs/CATALOGUE-FLUIDES-A-VALIDER.md.');
