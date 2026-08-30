/* =====================================================================
   LIVRET « HABILITATION FLUIDE » — QR CODES
   ---------------------------------------------------------------------
   Quatrième maillon (`npm run qr`). Un QR imprimé est gravé pour la
   durée de vie du papier : il ne porte donc JAMAIS l'adresse réelle
   d'un hébergeur, mais un alias court `https://inerweb.fr/f/<slug>`
   que l'on redirige (spécification posée par le storyboard H0, ici
   enfin réalisée).

   Ce maillon produit quatre choses :
     qr.gen/<slug>.png        les codes, prêts pour le papier
     qr.gen.json              le manifeste : alias, cible réelle, titre
     redirections-pages/f/<slug>/index.html
                              LA table qui fonctionne : une page de
                              redirection statique par alias, à copier
                              à la racine du dépôt pilote-fluides
     redirections.gen.htaccess  archive Apache — NE FONCTIONNE PAS sur
                              l'hébergement actuel, gardée pour le jour
                              où le site quitterait GitHub Pages

   ⚠️ POURQUOI des pages statiques et pas le .htaccess : inerweb.fr est
   servi par GitHub Pages (en-tête `server: GitHub.com` vérifié le
   27/08/2026 ; le CNAME vit dans frigorx/pilote-fluides). GitHub Pages
   n'exécute AUCUNE directive Apache : un .htaccess déposé à la racine
   y est servi comme un fichier ordinaire et ne redirige rien. La seule
   redirection que Pages sache servir est une page HTML statique —
   meta-refresh immédiat + relais JavaScript + lien de secours. Un
   dossier par alias : changer une cible plus tard = changer UN petit
   fichier ; le papier, lui, ne bouge pas.

   La CIBLE de chaque alias suit une règle déterministe :
     · la CAPSULE narrée du chapitre si sa première fiche en a une
       (le chapitre expliqué à voix haute — l'idéal au téléphone) ;
     · sinon la fiche elle-même dans l'appli (`?carte=<id>`, entrée
       par URL que le moteur sait ouvrir — moteur.js) ;
     · le chapitre généré (les catégories) mène à l'accueil des
       parcours (`?carte=c00`), où l'on choisit sa catégorie.
   Changer une cible plus tard = rééditer UN fichier dans
   `redirections-pages/` ; le papier, lui, ne bouge pas.
   ===================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import { CHAPITRES, LIMINAIRES, FIN, PLANCHE_CENTRALE, QR_BASE } from './plan-chapitres.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = process.env.PILOTE_FLUIDES || 'C:/git/pilote-fluides';
const DEHORS = path.join(ICI, '..', 'qr.gen');
const MANIFESTE = path.join(ICI, '..', 'qr.gen.json');
const HTACCESS = path.join(ICI, '..', 'redirections.gen.htaccess');
const PAGES = path.join(ICI, '..', 'redirections-pages');

/* L'appli élève, telle qu'elle est servie aujourd'hui : à la racine
   d'inerweb.fr (GitHub Pages y redirige en 301, vérifié le 27/08/2026).
   Si elle déménage, seule la table de redirections se régénère — pas
   le livret. */
const APPLI = 'https://inerweb.fr/';
const CAPSULES = path.join(SOURCE, 'packs', 'fluides', 'res', 'capsules', 'donnees');

const erreurs = [];
const entrees = [];

/* La meilleure cible d'une fiche : sa capsule narrée si elle existe
   (animations + voix), sinon la fiche interactive dans l'appli. */
const cibleDe = (src) => fs.existsSync(path.join(CAPSULES, `${src}.js`))
  ? `${APPLI}packs/fluides/res/capsules/index.html?c=${src}`
  : `${APPLI}?carte=${src}`;

for (const ch of CHAPITRES) {
  if (!ch.qr) { erreurs.push(`ch ${ch.num} « ${ch.titre} » : pas d'alias qr`); continue; }
  /* L'alias du chapitre... */
  entrees.push({
    chapitre: ch.num, titre: ch.titre, slug: ch.qr, alias: QR_BASE + ch.qr,
    cible: ch.genere ? `${APPLI}?carte=c00` : cibleDe(ch.lecons[0].src),
  });
  /* ...et un alias PAR LEÇON : sous chaque leçon du papier, le code qui
     ouvre son pendant interactif — l'animation, la voix, la correction.
     Le livret est aussi le sommaire de la formation en ligne. */
  for (const [i, l] of (ch.lecons || []).entries()) {
    entrees.push({
      chapitre: ch.num, lecon: i + 1, titre: l.t, slug: `${ch.qr}-${i + 1}`,
      alias: `${QR_BASE}${ch.qr}-${i + 1}`, cible: cibleDe(l.src),
    });
  }
}

/* ---- Les alias d'ANIMATION : un par planche animée que le livre
   imprime. Le papier fige l'état final ; le QR, posé en marge, rejoue
   l'animation elle-même — le SVG servi par inerweb.fr s'anime tel quel
   dans le navigateur du téléphone. Retargetable plus tard vers une
   visionneuse habillée, sans réimprimer : c'est le rôle des alias. ---- */
const SVG_PACK = path.join(SOURCE, 'packs', 'fluides', 'res', 'svg');
const planches = new Set();
const collecte = (o) => {
  if (typeof o === 'string') { if (o.startsWith('svg:')) planches.add(o.slice(4)); return; }
  if (Array.isArray(o)) { o.forEach(collecte); return; }
  if (o && typeof o === 'object') Object.values(o).forEach(collecte);
};
collecte(CHAPITRES); collecte(PLANCHE_CENTRALE); collecte(LIMINAIRES); collecte(FIN);
for (const nom of [...planches].sort()) {
  const chemin = path.join(SVG_PACK, `${nom}.svg`);
  if (!fs.existsSync(chemin)) { erreurs.push(`planche « ${nom} » absente du pack`); continue; }
  const svg = fs.readFileSync(chemin, 'utf8');
  if (!/<animate(Motion|Transform)?[\s>]/.test(svg)) continue; /* planche fixe : pas d'alias */
  const titre = ((svg.match(/<title>([^<]+)<\/title>/) || [])[1] || nom).trim();
  entrees.push({
    genre: 'animation', titre, slug: `a-${nom}`, alias: `${QR_BASE}a-${nom}`,
    cible: `${APPLI}packs/fluides/res/svg/${nom}.svg`,
  });
}

/* ---- Les alias d'ENTRAÎNEMENT : la série de révision du chapitre.
   Les treize séries rev-g1 à rev-g13 existent dans l'appli ; chaque
   chapitre déclare son groupe, la cible se calcule. Le renvoi « des
   questions ? » de la marge y mène : dix questions niveau examen,
   corrigées et expliquées — c'est là que vit la correction, depuis que
   les pages de corrigé ont quitté le papier (maquette du 30/08). ---- */
const CARTES_TEXTE = fs.readFileSync(path.join(SOURCE, 'packs', 'fluides', 'cartes.js'), 'utf8');
const groupes = new Set();
for (const ch of CHAPITRES) {
  const g = (ch.groupesQ || []).find((x) => /^G\d+$/.test(x));
  if (g) groupes.add(g.toLowerCase().replace('g', 'g'));
}
for (const g of [...groupes].sort()) {
  const id = `rev-${g.toLowerCase()}`;
  if (!CARTES_TEXTE.includes(`id: "${id}"`)) { erreurs.push(`série ${id} absente de cartes.js`); continue; }
  entrees.push({
    genre: 'entrainement', titre: `Série de révision ${g.toUpperCase()}`,
    slug: id, alias: QR_BASE + id, cible: `${APPLI}?carte=${id}`,
  });
}

/* ---- Le RENVOI de chaque alias : ce que la marge imprime. Genre,
   titre et description voyagent dans le manifeste — finition.py ne
   fait que dessiner. Retoucher un libellé = rééditer ICI, jamais le
   script de finition. ---- */
for (const e of entrees) {
  const capsule = e.cible.includes('capsules');
  if (e.genre === 'animation') {
    e.renvoi = { genre: 'animation', titre: 'La planche en mouvement',
      quoi: 'Ci-contre figée. En ligne, elle se joue du début à la fin.' };
  } else if (e.genre === 'entrainement') {
    e.renvoi = { genre: 'des questions ?', titre: '10 questions, niveau examen',
      quoi: 'La série du chapitre, corrigée et expliquée question par question.' };
  } else if (e.lecon) {
    e.renvoi = { genre: capsule ? 'leçon narrée' : 'fiche',
      titre: e.titre.length > 46 ? e.titre.slice(0, 43) + '…' : e.titre,
      quoi: capsule ? 'Cette leçon animée et racontée à voix haute.'
                    : 'La fiche interactive, avec sa question corrigée.' };
  } else {
    e.renvoi = { genre: 'station', titre: 'Le chapitre en entier',
      quoi: capsule ? 'Le chapitre raconté à voix haute, avec ses animations.'
                    : "Le chapitre dans l'appli : les leçons, les animations, l'entraînement." };
  }
}

const doublons = entrees.map((e) => e.slug).filter((s, i, t) => t.indexOf(s) !== i);
if (doublons.length) erreurs.push(`alias en double : ${[...new Set(doublons)].join(', ')}`);

if (erreurs.length) {
  console.error(`\n✖ QR refusés — ${erreurs.length} manque(s) :\n`);
  erreurs.forEach((e) => console.error('  · ' + e));
  process.exit(1);
}

/* ---------------- Les codes eux-mêmes ---------------- */
fs.mkdirSync(DEHORS, { recursive: true });
for (const e of entrees) {
  /* Correction d'erreur Q (25 %) : un QR de livret vit des photocopies,
     des taches et des coins cornés. 600 px ≈ 2 cm nets à 300 dpi. */
  await QRCode.toFile(path.join(DEHORS, `${e.slug}.png`), e.alias, {
    errorCorrectionLevel: 'Q',
    width: 600,
    margin: 4,
    color: { dark: '#1b3a63', light: '#ffffff' },
  });
  e.fichier = `${e.slug}.png`;
}

fs.writeFileSync(MANIFESTE, JSON.stringify(entrees, null, 1), 'utf8');

/* ---------------- Les pages de redirection (GitHub Pages) ----------------
   La table qui fonctionne réellement : un dossier `f/<slug>/` par alias,
   avec un index.html qui redirige. Trois relais superposés, du plus
   robuste au plus confortable : le meta-refresh (aucun JavaScript
   requis), location.replace (ne pollue pas l'historique du téléphone),
   et un lien cliquable si tout le reste échoue. `noindex` : un alias
   n'est pas une page, les moteurs n'ont rien à y faire. */
const echapper = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const pageRedirection = (e) => `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=${echapper(e.cible)}">
<link rel="canonical" href="${echapper(e.cible)}">
<title>${echapper(e.titre)} — inerWeb HabFluide</title>
<style>body{font-family:Calibri,Carlito,'Segoe UI',sans-serif;color:#1b3a63;background:#fff;margin:0;display:grid;min-height:100vh;place-items:center;text-align:center;padding:24px}a{color:#1b3a63;font-weight:700}p{color:#5a6472}</style>
</head>
<body>
<div>
<p>Livret « Habilitation Fluide » — un instant…</p>
<p><a href="${echapper(e.cible)}">${echapper(e.titre)}</a></p>
</div>
<script>location.replace(${JSON.stringify(e.cible)});</script>
</body>
</html>
`;

fs.rmSync(PAGES, { recursive: true, force: true });
for (const e of entrees) {
  const dossier = path.join(PAGES, 'f', e.slug);
  fs.mkdirSync(dossier, { recursive: true });
  fs.writeFileSync(path.join(dossier, 'index.html'), pageRedirection(e), 'utf8');
}
fs.writeFileSync(path.join(PAGES, 'LISEZMOI.md'), [
  '# Redirections du livret « Habilitation Fluide » — à déployer',
  '',
  'Copier le dossier `f/` tel quel **à la racine du dépôt `frigorx/pilote-fluides`**',
  '(le dépôt qui sert inerweb.fr par GitHub Pages). Chaque alias imprimé dans le',
  'livret — `https://inerweb.fr/f/<slug>` — devient alors une page de redirection',
  'statique, la seule forme de redirection que GitHub Pages sache servir : un',
  '`.htaccess` y est ignoré (aucun Apache derrière, en-tête `server: GitHub.com`).',
  '',
  'Changer la cible d’un QR déjà imprimé = rééditer le `index.html` de son alias',
  'dans pilote-fluides, jamais le livret. Ce dossier se régénère en entier par',
  '`npm run qr` ; ne pas l’éditer à la main ici.',
  '',
].join('\n'), 'utf8');

/* ---------------- L'archive Apache (ne sert pas aujourd'hui) ---------------- */
const lignes = [
  '# Table de redirections du livret « Habilitation Fluide » — partie théorique',
  '# Générée par livret/build/qr.mjs.',
  '#',
  '# ⚠️ ARCHIVE : inerweb.fr est servi par GitHub Pages, qui IGNORE les',
  '# directives Apache — ce fichier n\'y redirige rien. La table qui',
  '# fonctionne est `redirections-pages/f/<slug>/index.html` (une page de',
  '# redirection statique par alias). Ce .htaccess n\'aurait d\'usage que',
  '# si le site déménageait un jour derrière un vrai Apache.',
  '',
  ...entrees.map((e) => `Redirect 302 /f/${e.slug} ${e.cible}`),
  '',
];
fs.writeFileSync(HTACCESS, lignes.join('\n'), 'utf8');

const capsules = entrees.filter((e) => e.cible.includes('capsules')).length;
const animations = entrees.filter((e) => e.genre === 'animation').length;
const series = entrees.filter((e) => e.genre === 'entrainement').length;
const parChapitre = entrees.filter((e) => !e.lecon && !e.genre).length;
console.log('QR codes du livret — partie théorique\n');
console.log(`  ${parChapitre} chapitres + ${entrees.length - parChapitre - animations - series} leçons + ${animations} animations + ${series} séries d'entraînement`);
console.log(`\n✔ ${entrees.length} codes (${capsules} vers une capsule narrée) · qr.gen.json · redirections-pages/ (${entrees.length} pages GitHub Pages) · redirections.gen.htaccess (archive)`);
