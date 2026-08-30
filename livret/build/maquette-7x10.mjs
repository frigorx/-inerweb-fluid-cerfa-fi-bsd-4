/* =====================================================================
   LIVRET « HABILITATION FLUIDE » — MAQUETTE 7 × 10 À MARGE DE RENVOIS
   ---------------------------------------------------------------------
   Maquette de VALIDATION, hors chaîne (`node build/maquette-7x10.mjs`).
   Elle ne produit pas de livre : elle montre, sur du contenu réel, la
   mise en page proposée pour le tome 1 « interactif », afin de la faire
   valider AVANT de refondre les 5 700 lignes de la chaîne.

   Ce qu'elle démontre, et qu'il faut regarder :

   1. LE FORMAT. 7 × 10 pouces (177,8 × 254 mm) au lieu de 6 × 9. Les
      25,4 mm gagnés en largeur paient la marge de renvois SANS prendre
      un millimètre au texte : la colonne passe même de 114,4 à 119,8 mm.
      Surface utile +18 % → la pagination baisse au lieu de monter.

   2. LA MARGE MIROIR. Elle est TOUJOURS du côté extérieur : à droite
      sur une page impaire, à gauche sur une paire. C'est ce qui fait
      qu'on la voit sans ouvrir le livre en grand, pouce sur la tranche.
      La gouttière intérieure garde ses 19 mm (reliure KDP > 300 pages).

   3. LES TROIS ESPÈCES DE RENVOI, et une seule promesse par code :
        · STATION   — le chapitre entier dans l'appli (1 par chapitre)
        · LEÇON     — la capsule narrée, ouverte SUR SON ÉCRAN (?c=..&e=..
                      — entrée déjà lue par capsule.js, jamais utilisée
                      par le livre jusqu'ici), ou la fiche interactive
                      quand la leçon n'a pas de capsule
        · ANIMATION — la planche en mouvement, pour les 31 visuels du
                      livre qui sont animés à la source et que le papier
                      ne peut montrer que figés

   4. LE N&B. L'intérieur s'imprime en noir et blanc : la case en haut
      de la maquette bascule tout en niveaux de gris. Un QR doit rester
      franc une fois le bleu aplati.

   Contenu : chapitre 15, tel qu'il est dans contenu.gen.json — il cumule
   les trois cas (capsule de 7 écrans, planche animée, leçon qui tombe
   pile sur un écran). Les QR sont VRAIS et pointent leurs vraies cibles.
   ===================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import QRCode from 'qrcode';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const LIVRET = path.join(ICI, '..');
const PILOTE = process.env.PILOTE_FLUIDES || 'C:/git/pilote-fluides';
const SORTIE = path.join(LIVRET, 'maquette-7x10.html');

const CONTENU = JSON.parse(fs.readFileSync(path.join(LIVRET, 'contenu.gen.json'), 'utf8'));
const VISUELS = JSON.parse(fs.readFileSync(path.join(LIVRET, 'visuels.gen.json'), 'utf8'));
const { CHAPITRES } = await import(pathToFileURL(path.join(ICI, 'plan-chapitres.mjs')).href);

const CH_NUM = 15;
const plan = CHAPITRES.find((c) => c.num === CH_NUM);
const contenu = CONTENU.chapitres.find((c) => c.num === CH_NUM);

/* ------------------------------------------------------------------
   Les écrans de la capsule : c'est eux qui donnent au renvoi sa
   précision. On lit le fichier de la capsule pour connaître l'ordre
   réel des écrans — le paramètre `e` est un rang, pas un identifiant.
   ------------------------------------------------------------------ */
const ecransDe = (fiche) => {
  const f = path.join(PILOTE, 'packs/fluides/res/capsules/donnees', `${fiche}.js`);
  if (!fs.existsSync(f)) return null;
  const t = fs.readFileSync(f, 'utf8');
  const bloc = t.slice(t.indexOf('ecrans:'));
  const ids = [...bloc.matchAll(/^\s{4,6}id:\s*"([^"]+)"/gm)].map((m) => m[1]);
  const titres = [...bloc.matchAll(/^\s{4,6}titre:\s*"([^"]+)"/gm)].map((m) => m[1]);
  return ids.map((id, i) => ({ rang: i + 1, id, titre: titres[i] || id }));
};

const APPLI = 'https://inerweb.fr/';
const dataUri = (dossier, fichier) => {
  const p = path.join(LIVRET, dossier, fichier);
  return `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
};

/* Un QR de maquette : on le fabrique à la volée, aux mêmes réglages que
   la chaîne (correction Q, bleu de charte) pour juger de sa lisibilité. */
const qr = async (url) => QRCode.toDataURL(url, {
  errorCorrectionLevel: 'Q', width: 600, margin: 2,
  color: { dark: '#1B3A63', light: '#ffffff' },
});

/* ------------------------------------------------------------------
   Les renvois de la démonstration.
   ------------------------------------------------------------------ */
const ecrans = ecransDe('g5a') || [];
const ecranRecycle = ecrans.find((e) => e.id === 'recycle-regenere');
const ecranOrdre = ecrans.find((e) => e.id === 'fermer-stabiliser-desserrer');

const RENVOIS = {
  station: {
    genre: 'station', url: `${APPLI}f/${plan.qr}`,
    titre: 'Le chapitre en entier',
    quoi: 'La station « Récupération » dans l’appli : les cinq leçons, les animations, l’entraînement.',
  },
  animation: {
    genre: 'animation', url: `${APPLI}f/${plan.qr}-1a`,
    titre: 'Le montage en mouvement',
    quoi: 'Ci-contre figé. En ligne, le fluide circule et les vannes s’ouvrent dans l’ordre.',
  },
  leconOrdre: {
    genre: 'leçon narrée', url: `${APPLI}f/${plan.qr}-3`,
    titre: ecranOrdre ? ecranOrdre.titre : 'L’ordre des vannes',
    quoi: `Ouvre la capsule à l’écran ${ecranOrdre ? ecranOrdre.rang : '?'} — celui-ci, expliqué à voix haute.`,
    cible: ecranOrdre ? `${APPLI}packs/fluides/res/capsules/index.html?c=g5a&e=${ecranOrdre.rang}` : '',
  },
  leconRecycle: {
    genre: 'leçon narrée', url: `${APPLI}f/${plan.qr}-5`,
    titre: ecranRecycle ? ecranRecycle.titre : 'Récupéré, recyclé, régénéré',
    quoi: `Ouvre la capsule à l’écran ${ecranRecycle ? ecranRecycle.rang : '?'}, pas au début : la distinction des trois états, narrée.`,
    cible: ecranRecycle ? `${APPLI}packs/fluides/res/capsules/index.html?c=g5a&e=${ecranRecycle.rang}` : '',
  },
  hydro: {
    genre: 'station', url: `${APPLI}f/hydrocarbures`,
    titre: 'Hydrocarbures : le module',
    quoi: '28 écrans en ligne — inflammabilité, charge limite, intervention pas à pas.',
  },
  /* Le quatrieme renvoi : l'entrainement. Il ne s'invente pas — les
     13 series `rev-g1`..`rev-g13` existent deja sur inerweb.fr, avec
     entree par URL (`formation.html?carte=rev-g5`). Le chapitre declare
     son groupe dans le plan (`groupesQ`), donc la cible se calcule.
     Chaque question corrigee renvoie ensuite vers sa remediation —
     le module en ligne, ou la page du livre qui l'explique. */
  entrainement: {
    genre: 'des questions ?', url: `${APPLI}f/${plan.qr}-q`,
    titre: '10 questions, niveau examen',
    quoi: 'Serie « Récupération, charge, traçabilité ». Corrigée, chaque réponse renvoyant à ce qui l’explique.',
  },
  entrainementHydro: {
    genre: 'des questions ?', url: `${APPLI}f/hydrocarbures-q`,
    titre: '7 questions sur le R-290',
    quoi: 'Série « Hydrocarbures » : analyse de risques, zéro ignition, charge limite.',
  },
  fiche: {
    genre: 'fiche', url: `${APPLI}f/${plan.qr}-4`,
    titre: 'La pesée, en interactif',
    quoi: 'Cette leçon n’a pas de capsule : le code ouvre sa fiche dans l’appli.',
  },
};

for (const r of Object.values(RENVOIS)) r.image = await qr(r.url);

/* ------------------------------------------------------------------
   Le bloc de marge : QR, genre, titre, une phrase d'origine.
   L'invite « Vous voulez en savoir plus ? » ne se répète pas sous
   chaque code — elle coifferait la marge une fois par chapitre.
   ------------------------------------------------------------------ */
const renvoi = (r) => `
  <div class="renvoi">
    <img class="renvoi-qr" src="${r.image}" alt="">
    <p class="renvoi-genre">${r.genre}</p>
    <p class="renvoi-titre">${r.titre}</p>
    <p class="renvoi-quoi">${r.quoi}</p>
    <p class="renvoi-url"><span>inerweb.fr/f/</span><span>${r.url.split('/f/')[1]}</span></p>
  </div>`;

/* Une planche de la RESERVE : les 62 SVG de pilote-fluides qu'aucune page
   du livre n'utilise encore. Injectee en SVG inline — a l'ecran c'est plus
   net qu'un rendu bitmap, et la maquette n'a pas a rasteriser.
   Regle de fabrication : aucune page ne se termine sur du vide. Un blanc de
   bas de page se comble par une planche RATTACHEE AU SUJET de la page —
   jamais par une image decorative, qui serait pire que le blanc. */
const reserve = (chemin, legende, note) => {
  const svg = fs.readFileSync(path.join(PILOTE, 'packs/fluides/res', chemin), 'utf8')
    .replace(/<\?xml[^>]*>/, '')
    .replace(/<svg /, '<svg preserveAspectRatio="xMidYMid meet" ');
  return `
  <figure class="planche comblement">
    <p class="comblement-t">${note}</p>
    <div class="comblement-svg">${svg}</div>
    <figcaption>${legende}</figcaption>
  </figure>`;
};

const visuel = (ref, legende) => `
  <figure class="planche">
    <img src="${dataUri('visuels.gen', VISUELS[ref].fichier)}"
         width="${VISUELS[ref].largeur}" height="${VISUELS[ref].hauteur}" alt="">
    <figcaption>${legende}</figcaption>
  </figure>`;

/* Les encadres du livre : « a retenir » et « piege ». La maquette les
   reprend tels quels — une page se juge avec ce qu'elle porte vraiment. */
/* Sur une ouverture de chapitre, le blanc ne se comble pas par une image
   de plus : il se comble par ce que le lecteur cherche a cet endroit —
   ce que le chapitre va traiter. Du contenu, pas un bouche-trou. */
const sommaire = (ch) => `
  <div class="sommaire-ch">
    <p class="sommaire-t">Dans ce chapitre</p>
    <ol>${ch.lecons.map((l) => `<li>${l.t}</li>`).join('')}</ol>
  </div>`;

const encadre = (b) => `
  <div class="encadre ${b.type === 'piege' ? 'piege' : ''}">
    <p class="encadre-t">${b.t}</p>
    <p>${b.html}</p>
  </div>`;

const l1 = contenu.lecons[0];
const l3 = contenu.lecons[2];
const l5 = contenu.lecons[4];

/* ------------------------------------------------------------------
   Les trois planches.
   ------------------------------------------------------------------ */
const pages = [];

/* 1 — Ouverture de chapitre, page impaire (marge à droite). */
pages.push(`
<div class="page impaire">
  <div class="bandeau"><span>Partie E · Les opérations</span><span>Chapitre ${plan.num}</span></div>
  <div class="corps">
    <div class="texte">
      <p class="ch-num">Chapitre ${plan.num}</p>
      <h1 class="ch-titre">${plan.titre}</h1>
      <p class="ch-objectif">${plan.objectif}</p>
      <p class="ch-codes"><b>Codes travaillés :</b> ${plan.codes.join(' · ')}</p>
      ${visuel('svg:recuperation', 'Le montage de récupération')}
      <h2>${l1.t}</h2>
      ${l1.paras.slice(0, 2).map((p) => `<p>${p}</p>`).join('')}
      ${sommaire(plan)}
    </div>
    <aside class="marge">
      <p class="marge-invite">Vous voulez<br>en savoir plus&nbsp;?</p>
      ${renvoi(RENVOIS.station)}
      ${renvoi(RENVOIS.animation)}
    </aside>
  </div>
  <div class="pied"><span class="pied-n">${143}</span><span>inerweb.fr · HabFluide — tome 1</span></div>
</div>`);

/* 2 — Page de leçon, page paire (marge à gauche : le miroir). */
pages.push(`
<div class="page paire">
  <div class="bandeau"><span>Chapitre ${plan.num} · ${plan.titre}</span><span>Partie E</span></div>
  <div class="corps">
    <aside class="marge">
      ${renvoi(RENVOIS.leconOrdre)}
      ${renvoi(RENVOIS.fiche)}
    </aside>
    <div class="texte">
      <h2>${l3.t}</h2>
      ${l3.paras.slice(0, 2).map((p) => `<p>${p}</p>`).join('')}
      ${visuel('svg:ordre-vannes', 'La chorégraphie des vannes — elle ne change jamais')}
      ${l3.paras.slice(2).map((p) => `<p>${p}</p>`).join('')}
      ${l3.blocs.map(encadre).join('')}
    </div>
  </div>
  <div class="pied"><span>inerweb.fr · HabFluide — tome 1</span><span class="pied-n">${144}</span></div>
</div>`);

/* 3 — Leçon renvoyant à un écran précis, page impaire. */
pages.push(`
<div class="page impaire">
  <div class="bandeau"><span>Partie E · Les opérations</span><span>Chapitre ${plan.num}</span></div>
  <div class="corps">
    <div class="texte">
      <h2>${l5.t}</h2>
      ${l5.paras.slice(0, 5).map((p) => `<p>${p}</p>`).join('')}
      ${l5.blocs.slice(0, 2).map(encadre).join('')}
    </div>
    <aside class="marge">
      ${renvoi(RENVOIS.leconRecycle)}
      ${renvoi(RENVOIS.entrainement)}
    </aside>
  </div>
  <div class="pied"><span class="pied-n">${145}</span><span>inerweb.fr · HabFluide — tome 1</span></div>
</div>`);

/* 4 — LA RÈGLE « PAS DE BLANC », démontrée sur un vrai cas.
   Page 303 du tirage actuel : le bloc « À l'écran » y tient seul, et la
   page perd 173 mm — mesuré par `python build/mesure-blancs.py`, qui
   compte 121 pages à 35 mm de blanc ou plus, dont 54 trous francs.
   Ici, deux choses la remplissent : le renvoi quitte le fil du texte
   pour la marge (il ne fabrique donc plus de page à moitié vide), et le
   bas est comblé par une planche de la réserve — choisie parce qu'elle
   parle du sujet de la page, pas pour boucher. */
const ch18 = CONTENU.chapitres.find((c) => c.num === 18);
const p18 = CHAPITRES.find((c) => c.num === 18);
/* La lecon la plus maigre du chapitre : dix mots et un encadre. C'est
   exactement le profil de la page 303 du tirage — et c'est pour cela
   qu'elle sert de demonstration. */
const l18 = ch18.lecons[4];

pages.push(`
<div class="page paire">
  <div class="bandeau"><span>Chapitre 18 · ${p18.titre}</span><span>Partie F</span></div>
  <div class="corps">
    <aside class="marge">
      ${renvoi(RENVOIS.hydro)}
      ${renvoi(RENVOIS.entrainementHydro)}
    </aside>
    <div class="texte">
      <h2>${l18.t}</h2>
      <p>${l18.paras[0]}</p>
      ${encadre(l18.blocs[0])}
      ${reserve('illustrations/autorises-hfo-naturels.svg',
        'Deux familles d’alternatives, et le revers de chacune',
        'Ce qui remplit le bas de page — 1 sur 2')}
      ${reserve('illustrations/classes-de-securite_classe-methode.svg',
        'La classe lue sur l’étiquette commande la charge et la méthode',
        'Ce qui remplit le bas de page — 2 sur 2')}
    </div>
  </div>
  <div class="pied"><span>inerweb.fr · HabFluide — tome 1</span><span class="pied-n">${294}</span></div>
</div>`);

/* ------------------------------------------------------------------
   La page de maquette.
   ------------------------------------------------------------------ */
const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Maquette 7 × 10 à marge de renvois — HabFluide tome 1</title>
<style>
:root{
  --bleu:#1B3A63; --bleu2:#2f5689; --orange:#FF6B35; --logo:#e8914a;
  --txt:#1d2a38; --mut:#5a6b7d; --ligne:#d6dee7; --pale:#F4F7FA;

  /* La géométrie proposée. 19 + 119,8 + 5 + 26 + 8 = 177,8 mm. */
  --page-l:177.8mm; --page-h:254mm;
  --gouttiere:19mm;   /* côté reliure — exigence KDP au-delà de 300 pages */
  --exterieur:8mm;    /* côté tranche */
  --colonne:119.8mm;  /* le texte : plus large qu'aujourd'hui (114,4 mm) */
  --separation:5mm;
  --marge:26mm;       /* la marge de renvois */
  --haut:13mm; --bas:16mm;
}
*{box-sizing:border-box}
body{margin:0;background:#e9eef4;color:var(--txt);
  font:15px/1.6 "Trebuchet MS",Calibri,Carlito,"Segoe UI",sans-serif;padding:26px 18px 60px}

.entete{max-width:1180px;margin:0 auto 26px;background:#fff;border-radius:12px;padding:22px 26px}
.entete h1{font:700 24px/1.25 "Trebuchet MS",sans-serif;color:var(--bleu);margin:0 0 10px}
.entete p{margin:0 0 10px;max-width:92ch;font-size:14px;line-height:1.55}
.entete b{color:var(--bleu)}
.cotes{display:flex;flex-wrap:wrap;gap:10px;margin:14px 0 0;padding:0;list-style:none}
.cotes li{background:var(--pale);border:1px solid var(--ligne);border-radius:7px;
  padding:7px 11px;font-size:13px}
.cotes b{color:var(--bleu)}
.bascule{margin-top:16px;padding-top:14px;border-top:1px solid var(--ligne);font-size:14px}
.bascule label{cursor:pointer;user-select:none}

.grille{display:flex;flex-wrap:wrap;gap:26px;justify-content:center;max-width:1220px;margin:0 auto}
.legende-planche{font:700 11px/1.3 "Trebuchet MS",sans-serif;color:var(--bleu);
  text-transform:uppercase;letter-spacing:.5px;margin:0 0 8px;text-align:center;max-width:var(--page-l)}

/* ---------------- La page ---------------- */
.page{width:var(--page-l);height:var(--page-h);background:#fff;position:relative;
  overflow:hidden;display:flex;flex-direction:column;
  box-shadow:0 4px 18px rgba(27,58,99,.2);
  padding-top:var(--haut);padding-bottom:var(--bas)}
.page.impaire{padding-left:var(--gouttiere);padding-right:var(--exterieur)}
.page.paire  {padding-right:var(--gouttiere);padding-left:var(--exterieur)}

.bandeau{display:flex;justify-content:space-between;font:700 8pt/1.2 "Trebuchet MS",sans-serif;
  color:var(--bleu);text-transform:uppercase;letter-spacing:.4px;
  border-bottom:1.6pt solid var(--orange);padding-bottom:1.4mm;margin-bottom:6mm}
.pied{display:flex;justify-content:space-between;align-items:center;font-size:7.5pt;color:var(--mut);
  border-top:.6pt solid var(--ligne);padding-top:2mm;margin-top:auto}
.pied-n{display:inline-flex;align-items:center;justify-content:center;width:6.4mm;height:6.4mm;
  background:var(--bleu);color:#fff;border-radius:50%;font-weight:700;font-size:7.5pt}

.corps{display:flex;gap:var(--separation);flex:1;min-height:0}
.texte{width:var(--colonne);flex:none}
.marge{width:var(--marge);flex:none;border-left:.6pt solid var(--ligne);padding-left:3mm}
.page.paire .marge{border-left:0;border-right:.6pt solid var(--ligne);padding-left:0;padding-right:3mm}

/* ---------------- Le texte ---------------- */
.ch-num{font:700 8.5pt/1 "Trebuchet MS",sans-serif;color:var(--orange);
  text-transform:uppercase;letter-spacing:1.2px;margin:0 0 2mm}
.ch-titre{font:700 21pt/1.15 "Trebuchet MS",sans-serif;color:var(--bleu);margin:0 0 3mm}
.ch-objectif{font-size:10pt;line-height:1.5;color:var(--txt);margin:0 0 2.5mm;
  border-left:2.4pt solid var(--orange);padding-left:3mm}
.ch-codes{font-size:8pt;color:var(--mut);margin:0 0 4mm}
.texte h2{font:700 12.5pt/1.25 "Trebuchet MS",sans-serif;color:var(--bleu);margin:0 0 2.5mm}
.texte p{font-size:10pt;line-height:1.52;margin:0 0 2.6mm;text-align:justify;hyphens:auto}
.texte b{color:var(--bleu)}

.planche{margin:0 0 3mm}
/* Une planche ne mange pas la page : plafonnee en hauteur, elle laisse
   la place au texte plutot que de creer un blanc a la page suivante. */
.planche img{width:100%;height:auto;display:block;border:.6pt solid var(--ligne)}
.planche figcaption{font-size:7.5pt;color:var(--mut);margin-top:1.2mm;font-style:italic}

/* Le comblement. Il ne se signale pas dans le livre — le liseré et le
   libellé n'existent QUE dans cette maquette, pour montrer ce qui a été
   ajouté. Dans le tirage, la planche est une planche comme une autre. */
.sommaire-ch{border:.6pt solid var(--ligne);background:var(--pale);padding:2.5mm 3mm;margin:1mm 0 0}
.sommaire-t{font:700 8pt/1.2 "Trebuchet MS",sans-serif;color:var(--bleu);
  text-transform:uppercase;letter-spacing:.4px;margin:0 0 1.5mm}
.sommaire-ch ol{margin:0;padding-left:5mm}
.sommaire-ch li{font-size:9pt;line-height:1.45;color:var(--txt);margin-bottom:.6mm}

.encadre{border-left:2.4pt solid var(--bleu2);background:var(--pale);
  padding:2.5mm 3mm;margin:0 0 3mm}
.encadre.piege{border-left-color:var(--orange)}
.encadre-t{font:700 8pt/1.2 "Trebuchet MS",sans-serif;color:var(--bleu);margin:0 0 1.2mm}
.encadre p{font-size:9pt;line-height:1.45;margin:0}

.comblement{border:1.2pt dashed var(--logo);padding:1.8mm;background:#fffdf9;margin-top:2mm;margin-bottom:2mm}
.comblement-t{font:700 6pt/1.1 "Trebuchet MS",sans-serif;color:var(--logo);
  text-transform:uppercase;letter-spacing:.5px;margin:0 0 1.5mm}
.comblement-svg svg{width:100%;height:auto;max-height:58mm;display:block}

/* ---------------- La marge de renvois ---------------- */
.marge-invite{font:700 8pt/1.2 "Trebuchet MS",sans-serif;color:var(--orange);
  text-transform:uppercase;letter-spacing:.4px;margin:0 0 3mm;
  border-bottom:1.2pt solid var(--orange);padding-bottom:1.5mm}
.renvoi{margin:0 0 6mm}
.renvoi-qr{width:20mm;height:20mm;display:block;margin-bottom:1.2mm}
/* Le genre du renvoi. PAS en orange : a 6 pt, l'orange aplati en gris par
   l'impression N&B devient illisible. Bleu pour le texte, filet orange pour
   la couleur — un filet est une surface, il survit au niveau de gris. */
.renvoi-genre{font:700 6pt/1.1 "Trebuchet MS",sans-serif;color:var(--bleu);
  text-transform:uppercase;letter-spacing:.5px;margin:0 0 .8mm;
  border-left:1.6pt solid var(--orange);padding-left:1.2mm}
.renvoi-titre{font:700 7pt/1.2 "Trebuchet MS",sans-serif;color:var(--bleu);margin:0 0 .8mm}
.renvoi-quoi{font-size:6.5pt;line-height:1.35;color:var(--mut);margin:0 0 .8mm}
/* L'adresse écrite en clair, pour qui n'a pas de téléphone sous la main.
   Coupée à un endroit CHOISI — « inerweb.fr/f/ » puis le slug — jamais
   au milieu d'un mot comme le ferait break-all. */
.renvoi-url{font-size:5.5pt;line-height:1.25;color:var(--mut);margin:0}
.renvoi-url span{display:block;white-space:nowrap}

/* ---------------- Le rendu d'impression : noir et blanc ---------------- */
body.nb .page{filter:grayscale(1) contrast(1.06)}
</style>
</head>
<body>

<div class="entete">
  <h1>Maquette 7 × 10 à marge de renvois — HabFluide, tome 1</h1>
  <p>Trois pages réelles du <b>chapitre ${plan.num}</b>, au format proposé. Les QR sont vrais : ils
  pointent leurs vraies cibles sur inerweb.fr. Rien n’est encore changé dans la chaîne
  de fabrication — cette maquette existe pour être jugée avant.</p>
  <p><b>Ce qu’il faut regarder.</b> La marge est toujours <b>du côté de la tranche</b> :
  à droite sur une page impaire, à gauche sur une paire — on la voit pouce posé, sans
  ouvrir le livre en grand. Le texte n’a rien perdu : sa colonne passe de 114,4 mm
  (aujourd’hui, en 6 × 9) à <b>119,8 mm</b>. La marge est payée par les 25,4 mm de largeur
  que donne le passage au 7 × 10.</p>
  <p><b>Les trois espèces de renvoi.</b> <b>Station</b> — le chapitre entier dans l’appli, une fois
  en ouverture. <b>Leçon narrée</b> — la capsule ouverte <b>sur son écran</b>, pas à son début :
  page 2 de la maquette, le code tombe sur l’écran ${ecranOrdre ? ecranOrdre.rang : '?'} ;
  page 3, sur l’écran ${ecranRecycle ? ecranRecycle.rang : '?'}. <b>Animation</b> — pour les
  31 planches du livre qui bougent en ligne et que le papier fige.</p>
  <p><b>Le quatrième renvoi : l’entraînement.</b> En bas de la marge, page 3 —
  « des questions ? » ouvre la série <code>rev-g5</code>, dix questions niveau examen
  déjà en ligne. Rien à écrire : les <b>13 séries</b> existent, chaque chapitre déclare
  son groupe, la cible se calcule. Et comme les 180 questions portent toutes leur
  remédiation, chaque réponse pourra renvoyer soit au module en ligne, soit
  <b>à la page du livre</b> qui l’explique — la correspondance code → page existe déjà.
  Décision prise : les <b>37 pages de corrigé</b> quittent le papier, les 36 pages de
  questions y restent.</p>
  <p><b>Aucune page ne se termine sur du vide.</b> Le tirage actuel perd
  <b>13,10 m</b> de blanc cumulé — <b>121 pages</b> sur 388 laissent 35 mm ou plus,
  dont <b>54 trous francs</b> de plus de 70 mm (mesuré par
  <code>python build/mesure-blancs.py</code>, pas à l’œil). La quatrième planche
  ci-dessous montre le remède sur un cas réel : le renvoi quitte le fil du texte
  pour la marge, et le bas est comblé par une planche de la <b>réserve</b> — les
  62 SVG de pilote-fluides qu’aucune page n’utilise encore. Celle-ci parle des HFO
  et des fluides naturels : elle est là parce qu’elle <b>traite le sujet de la page</b>,
  jamais pour boucher.</p>
  <ul class="cotes">
    <li>Page <b>177,8 × 254 mm</b> (7 × 10 po)</li>
    <li>Gouttière <b>19 mm</b> — exigence KDP au-delà de 300 pages</li>
    <li>Texte <b>119,8 mm</b> <span style="color:var(--mut)">(114,4 aujourd’hui)</span></li>
    <li>Marge de renvois <b>26 mm</b></li>
    <li>QR <b>20 mm</b>, correction Q</li>
    <li>Surface utile <b>+18 %</b> → pagination en baisse</li>
  </ul>
  <div class="bascule">
    <label><input type="checkbox" id="nb"> Voir <b>comme à l’impression</b> : intérieur en noir et blanc
    (le seul test qui compte pour la lisibilité des QR une fois le bleu aplati)</label>
  </div>
</div>

<div class="grille">
  <div>
    <p class="legende-planche">Page impaire — ouverture de chapitre · marge à droite</p>
    ${pages[0]}
  </div>
  <div>
    <p class="legende-planche">Page paire — le miroir · marge à gauche</p>
    ${pages[1]}
  </div>
  <div>
    <p class="legende-planche">Page impaire — le renvoi tombe sur un écran précis</p>
    ${pages[2]}
  </div>
  <div>
    <p class="legende-planche">La règle « pas de blanc » — page 303 du tirage actuel, qui perdait 173 mm</p>
    ${pages[3]}
  </div>
</div>

<script>
document.getElementById('nb').addEventListener('change', (e) => {
  document.body.classList.toggle('nb', e.target.checked);
});
</script>
</body>
</html>
`;

fs.writeFileSync(SORTIE, html, 'utf8');

console.log('Maquette 7 × 10 à marge de renvois\n');
console.log(`  chapitre ${plan.num} — « ${plan.titre} »`);
console.log(`  capsule g5a : ${ecrans.length} écrans adressables`);
if (ecranOrdre) console.log(`    écran ${ecranOrdre.rang} — ${ecranOrdre.titre}`);
if (ecranRecycle) console.log(`    écran ${ecranRecycle.rang} — ${ecranRecycle.titre}`);
console.log(`  colonne de texte 119,8 mm (114,4 mm en 6 × 9) · marge 26 mm`);
console.log(`\n✔ ${path.relative(LIVRET, SORTIE)} (${(fs.statSync(SORTIE).size / 1e6).toFixed(1)} Mo)`);
