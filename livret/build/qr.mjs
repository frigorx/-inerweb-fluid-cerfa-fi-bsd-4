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
/* Le chapitre qui utilise chaque planche : la visionneuse propose « la
   leçon complète » et ce lien passe par l'alias de la STATION du
   chapitre (/f/<ch.qr>) — une indirection de plus, recâblable elle
   aussi sans réimprimer. Une planche hors chapitre (liminaires,
   planche centrale) renvoie à l'accueil de l'appli. */
const chapitreDePlanche = new Map();
const collecte = (o, chQr) => {
  if (typeof o === 'string') {
    if (o.startsWith('svg:')) {
      const nom = o.slice(4);
      planches.add(nom);
      if (chQr && !chapitreDePlanche.has(nom)) chapitreDePlanche.set(nom, chQr);
    }
    return;
  }
  if (Array.isArray(o)) { o.forEach((x) => collecte(x, chQr)); return; }
  if (o && typeof o === 'object') Object.values(o).forEach((x) => collecte(x, chQr));
};
for (const ch of CHAPITRES) collecte(ch, ch.qr);
collecte(PLANCHE_CENTRALE); collecte(LIMINAIRES); collecte(FIN);
/* Les planches du comblement aussi : chaque planche posée dans un blanc
   porte son QR, comme toute planche du livre. Le chapitre vient de la
   clé d'ancre (« 9-4 » → chapitre 9). */
const CHEMIN_COMBLE = path.join(ICI, '..', 'comblement.gen.json');
if (fs.existsSync(CHEMIN_COMBLE)) {
  const table = JSON.parse(fs.readFileSync(CHEMIN_COMBLE, 'utf8'));
  for (const [ancre, c] of Object.entries(table)) {
    const num = Number(ancre.split('-')[0]);
    const ch = CHAPITRES.find((x) => x.num === num);
    collecte(c.ref, ch ? ch.qr : undefined);
  }
}
/* TOUTES les planches du pack ont leur alias, les fixes comprises : la
   feuille de route du projet anime le pack planche après planche
   (37 sur 48 le sont déjà), et un QR imprimé doit survivre à cette
   montée — quand la planche s'anime au site, le code déjà en marge la
   montre en mouvement SANS réimprimer. En attendant, la visionneuse
   la sert en grand, et le renvoi de marge dit ce qui est vrai
   aujourd'hui. */
for (const nom of [...planches].sort()) {
  const chemin = path.join(SVG_PACK, `${nom}.svg`);
  if (!fs.existsSync(chemin)) { erreurs.push(`planche « ${nom} » absente du pack`); continue; }
  const svg = fs.readFileSync(chemin, 'utf8');
  const animee = /<animate(Motion|Transform)?[\s>]/.test(svg);
  const titre = ((svg.match(/<title>([^<]+)<\/title>/) || [])[1] || nom).trim();
  entrees.push({
    genre: 'animation', animee, titre, slug: `a-${nom}`, alias: `${QR_BASE}a-${nom}`,
    cible: `${APPLI}packs/fluides/res/svg/${nom}.svg`,
    retour: chapitreDePlanche.has(nom) ? `${QR_BASE}${chapitreDePlanche.get(nom)}` : APPLI,
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

/* ---- Les alias de QCM : la CORRESPONDANCE papier/numérique, QCM par
   QCM (règle de Franck, 30/08 soir). Chaque chapitre imprime ses
   questions « Testez-vous » ; la page /f/q-<chapitre> joue LES MÊMES,
   dans le même ordre, corrigées à la validation — c'est là que vit la
   correction depuis que les corrigés ont quitté le papier. Le score
   se garde sur l'appareil (clé propre au livre) et « mes résultats »
   l'affiche. Les dix questions niveau examen restent la marche
   au-dessus : la page y mène. ---- */
const CHOISIES_QCM = JSON.parse(fs.readFileSync(path.join(ICI, '..', 'questions-choisies.gen.json'), 'utf8'));
const CONTENU_QCM = JSON.parse(fs.readFileSync(path.join(ICI, '..', 'contenu.gen.json'), 'utf8'));
for (const ch of CHAPITRES) {
  const selection = CHOISIES_QCM[ch.num] || [];
  const c = CONTENU_QCM.chapitres.find((x) => x.num === ch.num);
  if (!selection.length || !c) continue;
  const questions = selection.map((sel) => {
    const q = (c.questions || []).find((x) => x.id === sel.id);
    return q && { enonce: q.enonce, choix: sel.ordre.map((i) => q.choix[i]), bonne: sel.bonne };
  }).filter(Boolean);
  if (!questions.length) continue;
  const g = (ch.groupesQ || []).find((x) => /^G\d+$/.test(x));
  entrees.push({
    genre: 'qcm', chapitre_num: ch.num, titre: `QCM du chapitre ${ch.num} — ${ch.titre}`,
    slug: `q-${ch.qr}`, alias: `${QR_BASE}q-${ch.qr}`, cible: APPLI,
    suite: g ? `${QR_BASE}rev-${g.toLowerCase()}` : '',
    questions, /* consommées par la page, retirées du manifeste */
  });
}

/* ---- L'alias du BILAN : la page « mes résultats ». Le moteur de
   l'appli note déjà chaque série finie (pilote_hist_*) et chaque
   compétence rencontrée (pilote_comp_*), dans le navigateur du
   stagiaire, sans que rien ne remonte. Cette page lit ces deux
   mémoires — même origine inerweb.fr — et les met en face du bilan
   papier : la note de chaque série, chapitre par chapitre, et l'état
   de chaque compétence. Le QR vit sur la page Bilan du livre. ---- */
const SERIES_CHAPITRES = CHAPITRES
  .map((ch) => {
    const g = (ch.groupesQ || []).find((x) => /^G\d+$/.test(x));
    return g ? { serie: `rev-${g.toLowerCase()}`, num: ch.num, titre: ch.titre } : null;
  })
  .filter(Boolean);
entrees.push({
  genre: 'bilan', titre: 'Mes résultats — séries et compétences',
  slug: 'mes-resultats', alias: `${QR_BASE}mes-resultats`, cible: APPLI,
});

/* ---- Le RENVOI de chaque alias : ce que la marge imprime. Genre,
   titre et description voyagent dans le manifeste — finition.py ne
   fait que dessiner. Retoucher un libellé = rééditer ICI, jamais le
   script de finition. ---- */
for (const e of entrees) {
  const capsule = e.cible.includes('capsules');
  if (e.genre === 'animation') {
    e.renvoi = e.animee
      ? { genre: 'animation', titre: 'La planche en mouvement',
          quoi: 'Ci-contre figée. En ligne, elle se joue du début à la fin.' }
      : { genre: 'la planche', titre: 'La planche en grand',
          quoi: 'Sur votre écran, en pleine taille. Elle s’animera au fil des mises à jour du site.' };
  } else if (e.genre === 'entrainement') {
    e.renvoi = { genre: 'des questions ?', titre: '10 questions, niveau examen',
      quoi: 'La série du chapitre, corrigée et expliquée question par question.' };
  } else if (e.genre === 'bilan') {
    e.renvoi = { genre: 'vos résultats', titre: 'Vos notes, vos compétences',
      quoi: 'Ce que votre téléphone a retenu de vos séries — rien ne quitte l’appareil.' };
  } else if (e.genre === 'qcm') {
    e.renvoi = { genre: 'ce qcm', titre: 'Les mêmes questions, corrigées',
      quoi: 'Le QCM de cette page sur votre téléphone, corrigé à la validation.' };
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

/* Le manifeste omet les questions des pages QCM : elles sont gravées
   dans chaque page, le livre n'en a pas besoin. */
fs.writeFileSync(MANIFESTE,
  JSON.stringify(entrees, (k, v) => (k === 'questions' ? undefined : v), 1), 'utf8');

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

/* La VISIONNEUSE des animations : au lieu de rediriger vers le SVG brut,
   la page l'injecte inline — le SMIL se joue à l'insertion, et se rejoue
   à chaque réinjection : c'est tout le mécanisme du bouton « Revoir ».
   Même origine (inerweb.fr) : le fetch passe sans détour. Si le réseau
   ou le script manquent, le lien direct vers le SVG reste au bas de la
   page — un téléphone de chantier ne doit jamais tomber sur du vide. */
const pageVisionneuse = (e) => `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${echapper(e.titre)} — inerWeb HabFluide</title>
<style>
:root{--bleu:#1b3a63;--orange:#ff6b35;--mut:#5a6472;--ligne:#d6dee7}
body{font-family:Calibri,Carlito,'Segoe UI',sans-serif;color:var(--bleu);background:#f4f7fa;margin:0;min-height:100vh;display:flex;flex-direction:column}
header{background:#fff;border-bottom:2px solid var(--orange);padding:10px 16px;font-weight:700}
header .hab{color:var(--orange)}
main{flex:1;max-width:860px;width:100%;margin:0 auto;padding:16px;box-sizing:border-box}
h1{font-size:1.15rem;line-height:1.3;margin:6px 0 14px}
#scene{background:#fff;border:1px solid var(--ligne);border-radius:10px;padding:10px;min-height:200px}
#scene svg{width:100%;height:auto;display:block}
#scene .attente{color:var(--mut);text-align:center;padding:60px 12px;margin:0}
.actions{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0}
.actions button,.actions a{font:inherit;font-weight:700;border-radius:8px;padding:10px 16px;cursor:pointer;text-decoration:none;text-align:center}
.actions button{background:var(--bleu);color:#fff;border:none}
.actions a{background:#fff;color:var(--bleu);border:1.5px solid var(--bleu)}
footer{color:var(--mut);font-size:.82rem;padding:10px 16px;text-align:center}
footer a{color:var(--mut)}
</style>
</head>
<body>
<header><span class="hab">❄</span> inerWeb · HabFluide — ${e.animee ? 'la planche en mouvement' : 'la planche en grand'}</header>
<main>
<h1>${echapper(e.titre)}</h1>
${e.animee ? '' : `<p class="note-fixe">Cette planche s’animera au fil des mises à jour du site — la voici en pleine taille.</p>`}
<div id="scene"><p class="attente">Chargement de la planche…</p></div>
<div class="actions">
${e.animee ? '<button id="revoir" type="button">↻ Revoir l’animation</button>' : ''}
<a href="${echapper(e.retour)}">La leçon complète →</a>
</div>
</main>
<footer>Du livre « HAB-FLUIDE — partie théorique » · <a href="${echapper(e.cible)}">ouvrir la planche seule</a></footer>
<script>
(function () {
  var scene = document.getElementById('scene');
  var texte = null;
  function montrer() { if (texte !== null) { scene.innerHTML = texte; } }
  fetch(${JSON.stringify(e.cible)}).then(function (r) {
    if (!r.ok) throw new Error(r.status);
    return r.text();
  }).then(function (t) { texte = t; montrer(); }).catch(function () {
    scene.innerHTML = '<p class="attente">L’animation n’a pas pu se charger ici — ' +
      '<a href="${echapper(e.cible)}">l’ouvrir directement<\\/a>.</p>';
  });
  document.getElementById('revoir').addEventListener('click', montrer);
})();
</script>
</body>
</html>
`;

/* La page MES RÉSULTATS : lecture seule des deux mémoires locales du
   moteur (elle n'écrit ni n'efface jamais rien). Le tableau des séries
   est gravé à la génération depuis le plan du livre — chaque série en
   face de son chapitre, comme sur la page Bilan du papier. */
const pageResultats = (e) => `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${echapper(e.titre)} — inerWeb HabFluide</title>
<style>
:root{--bleu:#1b3a63;--orange:#ff6b35;--mut:#5a6472;--ligne:#d6dee7;--vert:#2e7d4f;--rouge:#c9451a}
body{font-family:Calibri,Carlito,'Segoe UI',sans-serif;color:var(--bleu);background:#f4f7fa;margin:0;min-height:100vh;display:flex;flex-direction:column}
header{background:#fff;border-bottom:2px solid var(--orange);padding:10px 16px;font-weight:700}
header .hab{color:var(--orange)}
main{flex:1;max-width:760px;width:100%;margin:0 auto;padding:16px;box-sizing:border-box}
h1{font-size:1.2rem;margin:6px 0 4px}
.note-page{color:var(--mut);font-size:.9rem;margin:0 0 16px}
section{background:#fff;border:1px solid var(--ligne);border-radius:10px;padding:14px 16px;margin:0 0 16px}
h2{font-size:1rem;margin:0 0 10px;border-bottom:2px solid var(--orange);padding-bottom:6px}
table{width:100%;border-collapse:collapse;font-size:.95rem}
td,th{text-align:left;padding:7px 6px;border-bottom:1px solid var(--ligne);vertical-align:top}
th{color:var(--mut);font-weight:700;font-size:.82rem;text-transform:uppercase;letter-spacing:.4px}
.num{color:var(--orange);font-weight:700;padding-right:2px}
.note{font-weight:700;white-space:nowrap;text-align:right}
.vide{color:var(--mut);font-weight:400}
.etat{font-weight:700;white-space:nowrap}
.etat.acquis{color:var(--vert)}.etat.fragile{color:var(--orange)}.etat.revoir{color:var(--rouge)}
.rien{color:var(--mut);margin:6px 0}
footer{color:var(--mut);font-size:.82rem;padding:10px 16px;text-align:center}
footer a{color:var(--mut)}
</style>
</head>
<body>
<header><span class="hab">❄</span> inerWeb · HabFluide — mes résultats</header>
<main>
<h1>Où j’en suis</h1>
<p class="note-page">Ce que ce téléphone a retenu de vos séries. Tout reste sur l’appareil : rien ne remonte, rien ne s’envoie.</p>
<section>
<h2>Mes séries, chapitre par chapitre</h2>
<p class="note-page">La note à reporter sur la page Bilan du livre.</p>
<table id="series"><tr><th>Chapitre</th><th style="text-align:right">Note</th></tr></table>
</section>
<section>
<h2>Les QCM du livre</h2>
<p class="note-page">Les « Testez-vous » de chaque chapitre, joués depuis leur QR.</p>
<div id="qcm"><p class="rien">Aucun QCM du livre joué sur cet appareil pour l’instant.</p></div>
</section>
<section>
<h2>Mes compétences</h2>
<p class="note-page">Code par code, d’après vos réponses : acquise, fragile, ou à revoir.</p>
<div id="comp"><p class="rien">Aucune question corrigée sur cet appareil pour l’instant — lancez une série depuis un QR « des questions ? » du livre.</p></div>
</section>
</main>
<footer>Du livre « HAB-FLUIDE — partie théorique » · <a href="${echapper(APPLI)}">ouvrir l’appli</a></footer>
<script>
(function () {
  var SERIES = ${JSON.stringify(SERIES_CHAPITRES)};
  var hist = {}, comp = {};
  try { hist = JSON.parse(localStorage.getItem('pilote_hist_fluides-habilitation') || '{}'); } catch (e) {}
  try { comp = JSON.parse(localStorage.getItem('pilote_comp_fluides-habilitation') || '{}'); } catch (e) {}
  var qcm = {};
  try { qcm = JSON.parse(localStorage.getItem('inerweb_qcm_papier') || '{}'); } catch (e) {}
  var t = document.getElementById('series');
  SERIES.forEach(function (s) {
    var tr = document.createElement('tr');
    var pct = hist[s.serie];
    var note = (pct == null) ? '<span class="vide">— pas encore jouée</span>'
      : (Math.round(pct / 10) + ' / 10');
    tr.innerHTML = '<td><span class="num">' + s.num + '</span> ' + s.titre + '</td>' +
      '<td class="note">' + note + '</td>';
    t.appendChild(tr);
  });
  var slugsQcm = Object.keys(qcm);
  if (slugsQcm.length) {
    var hq = '<table><tr><th>Chapitre</th><th style="text-align:right">Note</th></tr>';
    slugsQcm.map(function (s) { return qcm[s]; })
      .sort(function (a, b) { return (a.chapitre || 0) - (b.chapitre || 0); })
      .forEach(function (r) {
        hq += '<tr><td><span class="num">' + (r.chapitre || '?') + '</span> Testez-vous</td>' +
          '<td class="note">' + r.bons + ' / ' + r.sur + '</td></tr>';
      });
    hq += '</table>';
    document.getElementById('qcm').innerHTML = hq;
  }
  var codes = Object.keys(comp).sort(function (a, b) {
    return a.localeCompare(b, 'fr', { numeric: true });
  });
  if (codes.length) {
    var ETATS = { acquis: 'acquise', fragile: 'fragile', revoir: 'à revoir' };
    var h = '<table><tr><th>Code</th><th>Réponses</th><th>État</th></tr>';
    codes.forEach(function (c) {
      var e = comp[c] || {};
      var etat = (!e.ok && !e.ko) ? 'vierge'
        : (e.dernier === 1 && !e.ko) ? 'acquis'
        : (e.dernier === 1) ? 'fragile' : 'revoir';
      if (etat === 'vierge') return;
      h += '<tr><td><b>' + c + '</b></td><td>' + (e.ok || 0) + ' justes · ' + (e.ko || 0) + ' fausses</td>' +
        '<td class="etat ' + etat + '">' + ETATS[etat] + '</td></tr>';
    });
    h += '</table>';
    document.getElementById('comp').innerHTML = h;
  }
})();
</script>
</body>
</html>
`;

/* La page QCM : les questions du papier, jouables et corrigées. Tout
   est gravé dans la page à la génération — aucune requête, le QCM
   marche dès que la page charge. Le score reste sur l'appareil. */
const pageQcm = (e) => `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${echapper(e.titre)} — inerWeb HabFluide</title>
<style>
:root{--bleu:#1b3a63;--orange:#ff6b35;--mut:#5a6472;--ligne:#d6dee7;--vert:#2e7d4f;--rouge:#c9451a;--pale:#f4f7fa}
body{font-family:Calibri,Carlito,'Segoe UI',sans-serif;color:var(--bleu);background:var(--pale);margin:0;min-height:100vh;display:flex;flex-direction:column}
header{background:#fff;border-bottom:2px solid var(--orange);padding:10px 16px;font-weight:700}
header .hab{color:var(--orange)}
main{flex:1;max-width:720px;width:100%;margin:0 auto;padding:16px;box-sizing:border-box}
h1{font-size:1.15rem;line-height:1.3;margin:6px 0 4px}
.note-page{color:var(--mut);font-size:.9rem;margin:0 0 14px}
.q{background:#fff;border:1px solid var(--ligne);border-radius:10px;padding:12px 14px;margin:0 0 12px}
.q.juste{border-color:var(--vert);border-width:2px}
.q.faux{border-color:var(--rouge);border-width:2px}
.q-e{font-weight:700;margin:0 0 10px}
.q-e .n{display:inline-grid;place-items:center;width:1.5em;height:1.5em;background:var(--orange);color:#fff;border-radius:50%;margin-right:8px;font-size:.9em}
label{display:flex;gap:10px;align-items:flex-start;padding:7px 8px;border-radius:8px;cursor:pointer}
label:hover{background:var(--pale)}
input[type=radio]{width:1.15em;height:1.15em;margin:2px 0 0;accent-color:var(--bleu);flex:none}
.verdict{font-weight:700;margin:8px 0 0;display:none}
.q.juste .verdict.ok{display:block;color:var(--vert)}
.q.faux .verdict.ko{display:block;color:var(--rouge)}
.actions{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0}
.actions button,.actions a{font:inherit;font-weight:700;border-radius:8px;padding:11px 18px;cursor:pointer;text-decoration:none;text-align:center}
.actions button{background:var(--bleu);color:#fff;border:none}
.actions a{background:#fff;color:var(--bleu);border:1.5px solid var(--bleu)}
#score{font-size:1.2rem;font-weight:700;margin:8px 0;display:none}
footer{color:var(--mut);font-size:.82rem;padding:10px 16px;text-align:center}
footer a{color:var(--mut)}
</style>
</head>
<body>
<header><span class="hab">❄</span> inerWeb · HabFluide — le QCM du livre</header>
<main>
<h1>${echapper(e.titre)}</h1>
<p class="note-page">Les mêmes questions que dans le livre, dans le même ordre. Répondez, puis corrigez — votre note reste sur cet appareil.</p>
<form id="f">
${e.questions.map((q, i) => `<div class="q" data-b="${q.bonne}">
<p class="q-e"><span class="n">${i + 1}</span>${echapper(q.enonce)}</p>
${q.choix.map((c, j) => `<label><input type="radio" name="q${i}" value="${j}"><span><b>${'ABCD'[j]}</b> — ${echapper(c)}</span></label>`).join('\n')}
<p class="verdict ok">✔ Juste.</p>
<p class="verdict ko">✘ La bonne réponse était <b class="rep"></b>.</p>
</div>`).join('\n')}
</form>
<p id="score"></p>
<div class="actions">
<button id="corriger" type="button">Corriger mes réponses</button>
${e.suite ? `<a href="${echapper(e.suite)}">10 questions de plus, niveau examen →</a>` : ''}
</div>
</main>
<footer>Du livre « HAB-FLUIDE — partie théorique » · <a href="${echapper(QR_BASE)}mes-resultats">mes résultats</a></footer>
<script>
(function () {
  var qs = Array.prototype.slice.call(document.querySelectorAll('.q'));
  document.getElementById('corriger').addEventListener('click', function () {
    var bons = 0;
    qs.forEach(function (q, i) {
      var b = Number(q.getAttribute('data-b'));
      var coche = q.querySelector('input:checked');
      var v = coche ? Number(coche.value) : -1;
      q.classList.remove('juste', 'faux');
      q.classList.add(v === b ? 'juste' : 'faux');
      if (v === b) { bons++; }
      else {
        var lab = q.querySelectorAll('label')[b];
        q.querySelector('.rep').textContent = lab ? lab.textContent.trim() : '';
      }
    });
    var s = document.getElementById('score');
    s.style.display = 'block';
    s.textContent = 'Votre note : ' + bons + ' / ' + qs.length +
      ' — à reporter sur la page du livre.';
    try {
      var k = 'inerweb_qcm_papier';
      var o = JSON.parse(localStorage.getItem(k) || '{}');
      o[${JSON.stringify(e.slug)}] = { bons: bons, sur: qs.length, chapitre: ${e.chapitre_num} };
      localStorage.setItem(k, JSON.stringify(o));
    } catch (err) { /* navigation privée : pas de mémoire, la note s'affiche quand même */ }
  });
})();
</script>
</body>
</html>
`;

fs.rmSync(PAGES, { recursive: true, force: true });
for (const e of entrees) {
  const dossier = path.join(PAGES, 'f', e.slug);
  fs.mkdirSync(dossier, { recursive: true });
  fs.writeFileSync(path.join(dossier, 'index.html'),
    e.genre === 'animation' ? pageVisionneuse(e)
      : e.genre === 'bilan' ? pageResultats(e)
        : e.genre === 'qcm' ? pageQcm(e)
          : pageRedirection(e), 'utf8');
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
