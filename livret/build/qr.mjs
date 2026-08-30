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
import { CHAPITRES, QR_BASE } from './plan-chapitres.mjs';

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

/* ------------------------------------------------------------------
   TROIS INDEX, CONSTRUITS UNE FOIS.

   1. Les ECRANS de chaque capsule. Le parametre `e` de capsule.js est un
      RANG, pas un identifiant : il faut donc l'ordre reel des ecrans.
   2. Les planches ANIMEES a la source. Le papier les fige ; le renvoi
      redonne le mouvement. On ne les devine pas : on lit le SVG.
   3. Qui JOUE chaque planche. Un QR d'animation doit ouvrir une page ou
      l'animation tourne vraiment — sinon on grave un renvoi vers rien.
   ------------------------------------------------------------------ */
const RES = path.join(SOURCE, 'packs', 'fluides', 'res');

const ecransDeCapsule = (fiche) => {
  const f = path.join(CAPSULES, `${fiche}.js`);
  if (!fs.existsSync(f)) return null;
  const t = fs.readFileSync(f, 'utf8');
  const bloc = t.slice(t.indexOf('ecrans:'));
  const ids = [...bloc.matchAll(/^\s{4,6}id:\s*"([^"]+)"/gm)].map((m) => m[1]);
  const titres = [...bloc.matchAll(/^\s{4,6}titre:\s*"([^"]+)"/gm)].map((m) => m[1]);
  return ids.map((id, i) => ({ rang: i + 1, id, titre: titres[i] || id }));
};

const VISUELS = JSON.parse(fs.readFileSync(path.join(ICI, '..', 'visuels.gen.json'), 'utf8'));

/* Une planche est animee si son SVG porte une animation. */
const anime = new Map();
for (const [ref, o] of Object.entries(VISUELS)) {
  const p = path.resolve(SOURCE, o.source);
  anime.set(ref, fs.existsSync(p) && !fs.statSync(p).isDirectory()
    && /<animate|<animateTransform/.test(fs.readFileSync(p, 'utf8')));
}

/* Qui joue quoi : on lit une fois le code de chaque module et de chaque
   capsule, et on note quels fichiers SVG y sont cites. */
const joueurs = [];
const ramasser = (dossier, url, titre) => {
  let texte = '';
  for (const f of ['app.js', 'index.html', 'animations.js', 'capsule.js']) {
    const p = path.join(dossier, f);
    if (fs.existsSync(p)) texte += fs.readFileSync(p, 'utf8');
  }
  if (texte) joueurs.push({ url, titre, texte });
};
if (fs.existsSync(RES)) {
  for (const d of fs.readdirSync(RES)) {
    const dossier = path.join(RES, d);
    if (!fs.statSync(dossier).isDirectory() || d.startsWith('_')) continue;
    if (!fs.existsSync(path.join(dossier, 'index.html'))) continue;
    ramasser(dossier, `${APPLI}packs/fluides/res/${d}/index.html`, d);
  }
}

/* Les capsules citent leurs planches dans `donnees/<id>.js`, pas dans leur
   index. Sans les lire, onze planches animees passaient pour injouables
   alors qu'une capsule les deroule — et le livre les aurait figees sans
   renvoi. Une capsule est un joueur comme un autre, avec sa propre URL. */
if (fs.existsSync(CAPSULES)) {
  for (const f of fs.readdirSync(CAPSULES)) {
    if (!f.endsWith('.js') || f.startsWith('_')) continue;
    const id = f.replace(/\.js$/, '');
    joueurs.push({
      url: `${APPLI}packs/fluides/res/capsules/index.html?c=${id}`,
      titre: `capsule ${id}`,
      texte: fs.readFileSync(path.join(CAPSULES, f), 'utf8'),
    });
  }
}

/* La page ou l'animation d'une planche tourne reellement, ou rien. */
const ouAnime = (ref) => {
  const o = VISUELS[ref];
  if (!o) return null;
  const nom = path.basename(o.source);
  const trouve = joueurs.find((j) => j.texte.includes(nom));
  return trouve ? trouve : null;
};

/* Le groupe d'entrainement d'un chapitre : `groupesQ` porte deja
   « G5 », et la serie `rev-g5` existe sur inerweb.fr. */
/* Le libelle et le volume de chaque serie sont ecrits dans `cartes.js`
   (« Recuperation, charge, tracabilite ... 10 questions »). On les lit
   plutot que de les recopier : le jour ou une serie grossit, la marge
   du livre le dira. */
const SERIES = new Map();
{
  const src = fs.readFileSync(path.join(SOURCE, 'packs', 'fluides', 'cartes.js'), 'utf8');
  for (const m of src.matchAll(/vers:\s*"(rev-g\d{1,2})"[^}]*?titre:\s*"([^"]+)"[^}]*?desc:\s*"([^"]*)"/g)) {
    const n = /(\d+)\s+questions/.exec(m[3]);
    SERIES.set(m[1], { titre: m[2], questions: n ? +n[1] : null });
  }
}

const serieDe = (ch) => {
  for (const g of ch.groupesQ || []) {
    const m = /^G(\d{1,2})$/.exec(g);
    if (m && +m[1] >= 1 && +m[1] <= 13) return `rev-g${m[1]}`;
  }
  return null;
};

/* Apparier une lecon a l'ecran de capsule qui la traite. On ne devine
   pas : sans mots communs francs, le renvoi ouvre la capsule au debut,
   ce qui reste juste. Mieux vaut un renvoi large qu'un renvoi faux. */
const VIDES = new Set(['le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'et', 'ou',
  'a', 'au', 'aux', 'en', 'dans', 'sur', 'pour', 'par', 'ce', 'ce', 'qui', 'que',
  'son', 'sa', 'ses', 'il', 'elle', 'on', 'ne', 'pas', 'plus', 'toujours', 'jamais']);
const mots = (t) => String(t).toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .split(/[^a-z0-9]+/).filter((m) => m.length > 2 && !VIDES.has(m));

const ecranPour = (ecrans, titreLecon) => {
  if (!ecrans || !ecrans.length) return null;
  const cible = new Set(mots(titreLecon));
  let meilleur = null;
  for (const e of ecrans) {
    const communs = mots(e.titre).filter((m) => cible.has(m)).length;
    if (communs >= 2 && (!meilleur || communs > meilleur.communs)) meilleur = { ...e, communs };
  }
  return meilleur;
};

/* La meilleure cible d'une fiche : sa capsule narrée si elle existe
   (animations + voix), sinon la fiche interactive dans l'appli. */
const cibleDe = (src) => fs.existsSync(path.join(CAPSULES, `${src}.js`))
  ? `${APPLI}packs/fluides/res/capsules/index.html?c=${src}`
  : `${APPLI}?carte=${src}`;

/* ------------------------------------------------------------------
   QUATRE GENRES DE RENVOI, une promesse par code.

     station      le chapitre entier dans l'appli — un par chapitre
     lecon        la capsule narree OUVERTE SUR SON ECRAN quand on sait
                  lequel, sinon la fiche interactive
     animation    la page ou la planche que le papier fige tourne
                  vraiment — seulement si elle existe
     entrainement la serie de questions niveau examen du groupe

   Chaque entree porte de quoi etre DESSINEE dans la marge : un genre,
   un titre court, une phrase. La finition n'a plus qu'a les poser.
   ------------------------------------------------------------------ */
let ancres = 0, animations = 0, series = 0;

for (const ch of CHAPITRES) {
  if (!ch.qr) { erreurs.push(`ch ${ch.num} « ${ch.titre} » : pas d'alias qr`); continue; }

  entrees.push({
    genre: 'station', chapitre: ch.num, titre: 'Le chapitre en entier',
    phrase: 'La station dans l’appli : les leçons, les animations, l’entraînement.',
    slug: ch.qr, alias: QR_BASE + ch.qr,
    cible: ch.genere ? `${APPLI}?carte=c00` : cibleDe(ch.lecons[0].src),
  });

  /* La correction du chapitre. Elle a quitte le papier : 37 pages ou la
     reponse se lisait a trois pages de sa question. En ligne, elle fait
     ce que le papier ne peut pas — renvoyer, apres chaque reponse, vers
     ce qui l'explique. Les pages sont ecrites par `correction.mjs`. */
  entrees.push({
    genre: 'correction', chapitre: ch.num, titre: 'La correction',
    phrase: 'Les réponses du chapitre, expliquées, avec le renvoi vers la page ou la leçon qui les fonde.',
    slug: `${ch.qr}-c`, alias: `${QR_BASE}${ch.qr}-c`,
    cible: `${APPLI}corriges/${ch.qr}/`,
  });

  /* L'entrainement : la serie du groupe, deja en ligne. Pas de serie
     identifiable, pas de code — on n'invente pas une cible. */
  const serie = serieDe(ch);
  if (serie) {
    series++;
    entrees.push({
      genre: 'entrainement', chapitre: ch.num,
      titre: SERIES.get(serie)?.titre || 'Se tester sur ce chapitre',
      phrase: `${SERIES.get(serie)?.questions ? SERIES.get(serie).questions + ' questions' : 'Des questions'} niveau examen, corrigées, chaque réponse renvoyant à ce qui l’explique.`,
      slug: `${ch.qr}-q`, alias: `${QR_BASE}${ch.qr}-q`,
      cible: `${APPLI}formation.html?carte=${serie}`,
    });
  }

  for (const [i, l] of (ch.lecons || []).entries()) {
    const ecrans = ecransDeCapsule(l.src);
    const e = ecrans ? ecranPour(ecrans, l.t) : null;
    if (e) ancres++;

    entrees.push({
      genre: 'lecon', chapitre: ch.num, lecon: i + 1,
      titre: e ? e.titre : l.t,
      phrase: ecrans
        ? (e ? `Expliqué à voix haute, écran ${e.rang} de la capsule.`
             : 'Le chapitre expliqué à voix haute, avec ses animations.')
        : 'La fiche interactive, avec sa question corrigée.',
      slug: `${ch.qr}-${i + 1}`, alias: `${QR_BASE}${ch.qr}-${i + 1}`,
      cible: ecrans && e
        ? `${APPLI}packs/fluides/res/capsules/index.html?c=${l.src}&e=${e.rang}`
        : cibleDe(l.src),
    });

    /* L'animation : seulement si UNE planche de cette lecon bouge a la
       source ET qu'une page la joue. Le papier montre un instant ; le
       code rend le mouvement. */
    const planche = (l.visuels || []).find((v) => anime.get(v) && ouAnime(v));
    if (planche) {
      animations++;
      entrees.push({
        genre: 'animation', chapitre: ch.num, lecon: i + 1,
        titre: 'La planche en mouvement',
        phrase: 'Ci-contre, elle est figée. En ligne, elle se déroule.',
        slug: `${ch.qr}-${i + 1}a`, alias: `${QR_BASE}${ch.qr}-${i + 1}a`,
        cible: ouAnime(planche).url,
      });
    }
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
  '# Table de redirections du livret « Habilitation Fluide » — tome 1',
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
const parGenre = entrees.reduce((a, e) => { a[e.genre] = (a[e.genre] || 0) + 1; return a; }, {});
console.log('QR codes du livret — tome 1\n');
for (const g of ['station', 'lecon', 'animation', 'entrainement', 'correction']) {
  if (parGenre[g]) console.log(`  ${String(parGenre[g]).padStart(3)} ${g}`);
}
console.log(`\n  ${ancres} leçons ouvrent la capsule SUR LEUR ÉCRAN (les autres à son début)`);
console.log(`  ${animations} planches animées ont une page où elles tournent`);
console.log(`  ${series} chapitres ont une série d'entraînement`);
console.log(`\n✔ ${entrees.length} codes (${capsules} vers une capsule narrée) · qr.gen.json · redirections-pages/ (${entrees.length} pages GitHub Pages) · redirections.gen.htaccess (archive)`);
