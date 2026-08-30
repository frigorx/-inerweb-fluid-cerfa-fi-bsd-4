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
const PACK_LOCAL = path.join(ICI, '..', 'illustrations-interieures-v2', 'svg');
const DEHORS = path.join(ICI, '..', 'visuels.gen');
const MANIFESTE = path.join(ICI, '..', 'visuels.gen.json');

/* Largeur cible. La planche centrale se lit COUCHÉE : elle s'étale sur
   les 200 mm de la hauteur de page, et 300 points par pouce y réclament
   2400 pixels — à 1800 elle tombait à 185 ppp, sous le seuil d'Amazon.
   Les SVG n'y perdent rien, ils se rastérisent à la demande ; les
   bitmaps ne sont jamais agrandis au-delà de leur taille d'origine. */
const LARGEUR = 2400;

const FAMILLES = {
  pack: (n) => path.join(PACK_LOCAL, `${n}.svg`),
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

/* Les planches du COMBLEMENT (comblement.gen.json, quand combler.mjs a
   tourné) : la réserve posée dans les pieds de page vides entre au
   manifeste comme n'importe quel visuel du plan. */
const COMBLEMENT = path.join(ICI, '..', 'comblement.gen.json');
if (fs.existsSync(COMBLEMENT)) {
  const table = JSON.parse(fs.readFileSync(COMBLEMENT, 'utf8'));
  for (const [ancre, c] of Object.entries(table)) {
    releve(`comblement ${ancre}`, [c.ref], [c.legende]);
  }
}

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

   Mais quel état ? Ni le premier ni le dernier. Tout révéler empilait
   les libellés qui se remplacent — « alarme d'évacuation » par-dessus
   « alarme intérieure » sur la planche CO₂. Ne garder que la fin vidait
   les planches EN BOUCLE, où tout s'éteint pour que le cycle reparte :
   le coup de liquide y perdait son piston, son choc et sa morale.

   On cherche donc L'INSTANT LE PLUS RICHE : le moment de l'animation où
   le plus d'éléments sont visibles ENSEMBLE. C'est l'image qu'un
   photographe garderait du dessin animé, et elle tombe juste dans les
   deux cas — la boucle est saisie pleine, le libellé remplacé est saisi
   seul.
   ------------------------------------------------------------------ */
/* Le balisage se parcourt avec une pile, pas avec une expression
   régulière : l'animation n'est pas toujours le premier enfant de
   l'élément qu'elle anime, et chercher « la balise juste avant » cassait
   dix planches sur quarante-six. */
const etatFinal = (svg) => {
  const BALISE = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<!DOCTYPE[^>]*>|<\/([\w:-]+)\s*>|<([\w:-]+)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;
  const pile = [];         // les éléments ouverts à cet instant du parcours
  const elements = [];     // tous ceux rencontrés, pour la passe finale
  const retouches = [];    // { debut, fin, texte }, appliquées de la fin vers le début

  let m;
  while ((m = BALISE.exec(svg)) !== null) {
    const [tout, ferme, ouvre, attrs, auto] = m;
    if (ferme) { pile.pop(); continue; }
    if (!ouvre) continue;                       // commentaire, instruction, CDATA

    if (ouvre === 'animate' && /attributeName\s*=\s*"opacity"/.test(attrs)) {
      /* On retient la COURBE entière, pas seulement sa fin : c'est elle
         qui dira, plus bas, à quel instant la planche montre le plus. */
      const vals = /values="([^"]*)"/.exec(attrs);
      const kt = /keyTimes="([^"]*)"/.exec(attrs);
      const to = /\bto="([^"]*)"/.exec(attrs);
      const suite = vals ? vals[1].split(';').map((x) => parseFloat(x))
        : [parseFloat(to ? to[1] : '1')];
      const temps = kt ? kt[1].split(';').map((x) => parseFloat(x))
        : suite.map((_, i) => (suite.length > 1 ? i / (suite.length - 1) : 1));
      const anime = pile[pile.length - 1];
      if (anime) anime.courbe = { suite, temps };
      retouches.push({ debut: m.index, fin: m.index + tout.length, texte: '' });
      continue;
    }
    if (!auto) {
      const e = { debut: m.index, fin: m.index + tout.length, tag: ouvre, attrs };
      pile.push(e);
      elements.push(e);
    }
  }

  /* L'INSTANT LE PLUS RICHE.
     Ni le début — la planche y est vide — ni la fin : une boucle s'y
     éteint, et un libellé remplacé y revient par-dessus son remplaçant.
     On cherche donc le moment où le PLUS d'éléments sont visibles
     ENSEMBLE : c'est l'image qu'un photographe garderait, et celle que
     le papier doit figer. À égalité, on prend l'instant le plus tardif,
     le plus proche de la conclusion du dessin. */
  const animes = elements.filter((e) => e.courbe);
  const aInstant = ({ suite, temps }, t) => {
    if (suite.length === 1) return suite[0];
    for (let i = 1; i < temps.length; i += 1) {
      if (t <= temps[i]) {
        const large = temps[i] - temps[i - 1];
        const part = large > 0 ? (t - temps[i - 1]) / large : 1;
        return suite[i - 1] + (suite[i] - suite[i - 1]) * part;
      }
    }
    return suite[suite.length - 1];
  };
  let meilleur = 1;
  if (animes.length) {
    let record = -1;
    for (let pas = 0; pas <= 100; pas += 1) {
      const t = pas / 100;
      const vus = animes.filter((e) => aInstant(e.courbe, t) > 0.5).length;
      if (vus >= record) { record = vus; meilleur = t; }
    }
  }
  for (const e of elements) {
    if (!e.courbe) continue;
    const visible = aInstant(e.courbe, meilleur) > 0.5;
    const nets = e.attrs.replace(/\sopacity\s*=\s*"[^"]*"/g, '')
      .replace(/([;"\s])opacity\s*:\s*[\d.]+\s*;?/g, '$1');
    retouches.push({ debut: e.debut, fin: e.fin, texte: `<${e.tag}${nets} opacity="${visible ? '1' : '@CACHE@'}">` });
  }

  let s = svg;
  for (const r of retouches.sort((a, b) => b.debut - a.debut)) {
    s = s.slice(0, r.debut) + r.texte + s.slice(r.fin);
  }
  /* Ce qui naît invisible SANS animation est un élément que le dessin
     révèle plus tard : celui-là, on le montre. */
  s = s.replace(/\sopacity="0(?:\.0+)?"/g, ' opacity="1"')
    .replace(/([;"\s])opacity\s*:\s*0(?:\.0+)?\s*([;"])/g, '$1opacity:1$2');
  return s.replace(/@CACHE@/g, '0');
};

const reveillees = [];

/* ---------------- Conversion pour le papier ---------------- */
fs.mkdirSync(DEHORS, { recursive: true });
const manifeste = {};
for (const { ref, famille, nom, chemin } of aConvertir) {
  const sortie = path.join(DEHORS, `${famille}-${nom.replace(/[^a-z0-9_-]/gi, '_')}.png`);
  /* Les SVG se rastérisent en haute densité ; les bitmaps se réduisent
     à la largeur cible sans jamais être agrandis. */
  let source = chemin;
  if (famille === 'svg' || famille === 'sym' || famille === 'pack') {
    const brut = fs.readFileSync(chemin, 'utf8');
    const fini = etatFinal(brut);
    if (fini !== brut) { reveillees.push(ref); source = Buffer.from(fini); }
  }
  const img = famille === 'svg' || famille === 'sym' || famille === 'pack'
    ? sharp(source, { density: 500 }).resize({ width: LARGEUR, withoutEnlargement: false })
    : sharp(source).resize({ width: LARGEUR, withoutEnlargement: true });
  const info = await img.png({ compressionLevel: 9 }).toFile(sortie);
  manifeste[ref] = {
    fichier: path.basename(sortie),
    largeur: info.width,
    hauteur: info.height,
    source: path.relative(SOURCE, chemin).replace(/\\/g, '/'),
    citations: refs.get(ref).length,
    /* Une planche animée a sa jumelle vivante en ligne : le livre pose
       alors un QR d'animation dans la marge (pages.mjs + finition.py). */
    animee: /\.svg$/i.test(chemin) && /<animate(Motion|Transform)?[\s>]/.test(fs.readFileSync(chemin, 'utf8')),
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
