/* =====================================================================
   LIVRET « HABILITATION FLUIDE » — VISUELS
   ---------------------------------------------------------------------
   Troisième maillon (`npm run visuels`). Il fait respecter la règle
   gravée en tête du plan : UNE PAGE, UNE ILLUSTRATION AU MOINS — et il
   prépare chaque visuel pour le papier.

   1. Il relève chaque référence du plan (leçons, activités, liminaires,
      pages de fin, planche centrale) et la résout sur le disque :
        svg:<nom>  → res/svg/<nom>.svg            (planches techniques)
        illu:<id>  → res/bibliotheque/illu-<id>.webp
        amb:<id>   → res/bibliotheque/amb-<id>.webp
        ico:<nom>  → res/bibliotheque/icones/ico-<nom>.png
        sym:<nom>  → res/symboles/<nom>.svg       (symboles fluidiques)
      (La famille `ico:` manquait à l'en-tête du plan : la voici écrite.)

   2. Il ÉCHOUE si une référence ne trouve pas son fichier, si une page
      n'a aucun visuel, ou si une liste de légendes n'a pas la même
      longueur que sa liste de visuels.

   3. Il rend chaque visuel imprimable : tout part en PNG dans
      `livret/visuels.gen/` — les SVG rastérisés en haute densité, les
      webp convertis (la lib `docx` ne lit pas le webp). Le manifeste
      `visuels.gen.json` donne, pour chaque référence, le fichier
      produit et ses dimensions : le maillon DOCX ne touche jamais aux
      sources.

   Un visuel n'est converti qu'une fois, même cité six fois.
   ===================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CHAPITRES, LIMINAIRES, FIN, PLANCHE_CENTRALE } from './plan-chapitres.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = process.env.PILOTE_FLUIDES || 'C:/git/pilote-fluides';
const RES = path.join(SOURCE, 'packs', 'fluides', 'res');
const DEHORS = path.join(ICI, '..', 'visuels.gen');
const MANIFESTE = path.join(ICI, '..', 'visuels.gen.json');

/* Largeur cible : pleine page A5 à 300 dpi (14,8 cm ≈ 1750 px), un peu
   au-delà pour garder de la marge de recadrage. On ne grossit jamais
   une image bitmap au-delà de sa taille d'origine. */
const LARGEUR = 1800;

const FAMILLES = {
  svg: (n) => path.join(RES, 'svg', `${n}.svg`),
  illu: (n) => path.join(RES, 'bibliotheque', `illu-${n}.webp`),
  amb: (n) => path.join(RES, 'bibliotheque', `amb-${n}.webp`),
  /* Deux séries cohabitent dans le dossier : `ico-<nom>.png` (objets)
     et `<nom>.png` (série `role-*`). On tente l'une puis l'autre. */
  ico: (n) => {
    const a = path.join(RES, 'bibliotheque', 'icones', `ico-${n}.png`);
    return fs.existsSync(a) ? a : path.join(RES, 'bibliotheque', 'icones', `${n}.png`);
  },
  sym: (n) => path.join(RES, 'symboles', `${n}.svg`),
};

const erreurs = [];
const refs = new Map(); // 'svg:croix-frigoriste' -> [emplacements]

const releve = (ou, visuels, legendes) => {
  if (!visuels || !visuels.length) { erreurs.push(`${ou} : aucun visuel — la règle du plan l'interdit`); return; }
  if (legendes && legendes.length !== visuels.length) {
    erreurs.push(`${ou} : ${visuels.length} visuel(s) mais ${legendes.length} légende(s)`);
  }
  for (const v of visuels) {
    if (!refs.has(v)) refs.set(v, []);
    refs.get(v).push(ou);
  }
};

/* ---------------- Le relevé, page par page ---------------- */
for (const ch of CHAPITRES) {
  const ou = `ch ${ch.num}`;
  (ch.lecons || []).forEach((l, i) => releve(`${ou} leçon ${i + 1} « ${l.t} »`, l.visuels, l.legendes));
  if (ch.activite) releve(`${ou} activité « ${ch.activite.t} »`, ch.activite.visuels, ch.activite.legendes);
  else erreurs.push(`${ou} : pas d'activité`);
}
for (const p of LIMINAIRES) releve(`liminaire « ${p.t} »`, p.visuels, p.legendes);
for (const p of FIN) releve(`fin « ${p.t} »`, p.visuels, p.legendes);
releve(`planche centrale (corrigé)`, PLANCHE_CENTRALE.corrige.visuels, PLANCHE_CENTRALE.corrige.legendes);
releve(`planche centrale (fantôme)`, PLANCHE_CENTRALE.fantome.visuels, PLANCHE_CENTRALE.fantome.legendes);

/* ---------------- Résolution sur le disque ---------------- */
const aConvertir = [];
for (const [ref, emplacements] of refs) {
  const [famille, ...reste] = ref.split(':');
  const nom = reste.join(':');
  const versChemin = FAMILLES[famille];
  if (!versChemin) { erreurs.push(`référence « ${ref} » : famille inconnue (${emplacements[0]})`); continue; }
  const chemin = versChemin(nom);
  if (!fs.existsSync(chemin)) {
    erreurs.push(`« ${ref} » introuvable : ${path.relative(SOURCE, chemin)} (cité par ${emplacements[0]}` +
      (emplacements.length > 1 ? ` et ${emplacements.length - 1} autre(s)` : '') + ')');
    continue;
  }
  aConvertir.push({ ref, famille, nom, chemin });
}

if (erreurs.length) {
  console.error(`\n✖ Visuels refusés — ${erreurs.length} manque(s) :\n`);
  erreurs.forEach((e) => console.error('  · ' + e));
  process.exit(1);
}

/* ------------------------------------------------------------------
   LE PAPIER NE VOIT QUE L'INSTANT ZÉRO.
   37 des 46 planches sont animées, et 20 contiennent des éléments qui
   naissent invisibles (`opacity="0"`) pour apparaître ensuite. Rastérisées
   telles quelles, elles perdent leur fin : le double accident perd sa
   seconde victime, la décomposition perd son nuage.

   On rastérise donc l'état FINAL, celui que l'animation atteint : chaque
   élément initialement invisible est rendu visible, et les animations
   d'opacité sont retirées pour ne pas le recacher. Le reste du dessin —
   positions, couleurs, textes — n'est pas touché.
   ------------------------------------------------------------------ */
const etatFinal = (svg) => svg
  .replace(/<animate\b[^>]*attributeName="opacity"[^>]*\/>/g, '')
  .replace(/\sopacity="0(?:\.0+)?"/g, ' opacity="1"')
  .replace(/([;"\s])opacity\s*:\s*0(?:\.0+)?\s*([;"])/g, '$1opacity:1$2');

const reveillees = [];

/* ---------------- Conversion pour le papier ---------------- */
fs.mkdirSync(DEHORS, { recursive: true });
const manifeste = {};
for (const { ref, famille, nom, chemin } of aConvertir) {
  const sortie = path.join(DEHORS, `${famille}-${nom.replace(/[^a-z0-9_-]/gi, '_')}.png`);
  /* Les SVG se rastérisent en haute densité ; les bitmaps se réduisent
     à la largeur cible sans jamais être agrandis. */
  let source = chemin;
  if (famille === 'svg' || famille === 'sym') {
    const brut = fs.readFileSync(chemin, 'utf8');
    const fini = etatFinal(brut);
    if (fini !== brut) { reveillees.push(ref); source = Buffer.from(fini); }
  }
  const img = famille === 'svg' || famille === 'sym'
    ? sharp(source, { density: 300 }).resize({ width: LARGEUR, withoutEnlargement: false })
    : sharp(source).resize({ width: LARGEUR, withoutEnlargement: true });
  const info = await img.png({ compressionLevel: 9 }).toFile(sortie);
  manifeste[ref] = {
    fichier: path.basename(sortie),
    largeur: info.width,
    hauteur: info.height,
    source: path.relative(SOURCE, chemin).replace(/\\/g, '/'),
    citations: refs.get(ref).length,
  };
}

fs.writeFileSync(MANIFESTE, JSON.stringify(manifeste, null, 1), 'utf8');
/* Les planches dont on a force l'etat final : elles demandent un coup
   d'oeil de F. Henninot, un element revele pouvant en recouvrir un autre. */
fs.writeFileSync(path.join(ICI, '..', 'reveillees.gen.json'),
  JSON.stringify({ a_relire: reveillees.sort() }, null, 1), 'utf8');

const parFamille = {};
for (const { famille } of aConvertir) parFamille[famille] = (parFamille[famille] || 0) + 1;
console.log('Visuels du livret — tome 1\n');
console.log(`  ${refs.size} références sur ${[...refs.values()].reduce((s, e) => s + e.length, 0)} emplacements — toutes résolues`);
console.log(`  converties : ${Object.entries(parFamille).map(([f, n]) => `${n} ${f}`).join(' · ')}`);
console.log(`  planches rendues à leur état final (sinon amputées) : ${reveillees.length}`);
console.log('  ⚠ à relire : tout révéler d’un coup peut superposer des éléments');
console.log('    que l’animation montrait l’un après l’autre. Liste : reveillees.gen.json');
console.log(`\n✔ ${aConvertir.length} fichiers dans visuels.gen/ · manifeste : visuels.gen.json`);
