/* =====================================================================
   LIVRET « HABILITATION FLUIDE » — LE LIVRET EN BLOCS HTML
   ---------------------------------------------------------------------
   Le contenu du livret, rendu une fois pour toutes en blocs HTML, dans
   l'ordre. Chaque bloc porte le contexte dont la pagination a besoin
   (partie, chapitre) et dit s'il est insécable.

   Ce module ne décide RIEN de la mise en page : il produit la matière.
   `build-html.mjs` la répartit en pages A5, pose bandeaux et pieds.
   ===================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHAPITRES, PARTIES, LIMINAIRES, FIN, PLANCHE_CENTRALE, apos } from './plan-chapitres.mjs';
import { TEXTES_LIMINAIRES, TEXTES_FIN, LIGNES_FIN } from './textes-liminaires.mjs';
import { LEXIQUE } from './lexique.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const LIVRET = path.join(ICI, '..');
const CONTENU = JSON.parse(fs.readFileSync(path.join(LIVRET, 'contenu.gen.json'), 'utf8'));
const VISUELS = JSON.parse(fs.readFileSync(path.join(LIVRET, 'visuels.gen.json'), 'utf8'));
const QR = JSON.parse(fs.readFileSync(path.join(LIVRET, 'qr.gen.json'), 'utf8'));
const CHOISIES = JSON.parse(fs.readFileSync(path.join(LIVRET, 'questions-choisies.gen.json'), 'utf8'));
/* Les questions que les chapitres n'ont pas prises : la banque de révision. */
const RESERVE = JSON.parse(fs.readFileSync(path.join(LIVRET, 'questions-reserve.gen.json'), 'utf8'));
/* Le comblement (« aucune page ne se termine sur du vide », maquette du
   30/08) : `npm run combler` mesure les pieds de page vides et affecte à
   chacun une planche de la réserve, par sujet de chapitre. Sa table donne,
   par ancre @@P|…@@, la planche à glisser dans le blanc. Absente, le livre
   se fabrique sans comblement — la table se régénère quand le texte bouge. */
const COMBLE = fs.existsSync(path.join(LIVRET, 'comblement.gen.json'))
  ? JSON.parse(fs.readFileSync(path.join(LIVRET, 'comblement.gen.json'), 'utf8'))
  : {};
const SOURCE = process.env.PILOTE_FLUIDES || 'C:/git/pilote-fluides';
const REF = JSON.parse(fs.readFileSync(path.join(SOURCE, 'packs', 'fluides', 'referentiel-2025.json'), 'utf8'));

/* Images embarquées : le HTML doit vivre seul (sortie triple). */
const cache = new Map();
const dataUri = (dossier, fichier) => {
  const cle = dossier + '/' + fichier;
  if (!cache.has(cle)) {
    cache.set(cle, 'data:image/png;base64,' +
      fs.readFileSync(path.join(LIVRET, dossier, fichier)).toString('base64'));
  }
  return cache.get(cle);
};
export const visuel = (ref) => dataUri('visuels.gen', VISUELS[ref].fichier);
const ratio = (ref) => VISUELS[ref].hauteur / VISUELS[ref].largeur;

/* Les cotes de l'image, écrites dans la balise. Sans elles, le navigateur
   doit DÉCODER chaque image pour connaître sa forme et savoir quelle
   hauteur lui réserver : la mise en page dépend alors de l'ordre dans
   lequel 314 images de 22 Mo finissent de se décoder, et le livre change
   de pagination d'une fabrication à l'autre — on l'a vu passer de 383 à
   272 pages sans qu'une ligne de contenu ait bougé. Cotes déclarées, la
   place est réservée avant tout décodage, et le livre est reproductible. */
const cotes = (ref) => ` width="${VISUELS[ref].largeur}" height="${VISUELS[ref].hauteur}"`;
const qrImg = (slug) => dataUri('qr.gen', QR.find((e) => e.slug === slug).fichier);

const ech = (s) => String(s)
  /* Filet de sécurité : aucune balise de mise en page ne doit atteindre le
     papier. L'extraction les retire déjà à la source, mais une source qui
     change, un bloc qui passe par un autre chemin, et « <iframe src=… »
     s'imprime en toutes lettres au milieu d'un encadré — c'est arrivé sur
     dix-huit pages. Seuls <b> et <i> survivent ici. */
  .replace(/<(?:img|iframe|figure|source|video|audio|script|style)\b[^>]*>[\s\S]*?<\/(?:iframe|figure|video|audio|script|style)>/gi, '')
  .replace(/<(?:img|iframe|source|br|hr)\b[^>]*\/?>/gi, ' ')
  .replace(/<\/?(?:p|div|span|ul|ol|li|table|tbody|tr|td|th|figcaption|a)\b[^>]*>/gi, ' ')
  .replace(/&(?![a-zA-Z]+;|#\d+;)/g, '&amp;')
  .replace(/<(?!\/?(?:b|i)>)/g, '&lt;')
  /* Le panneau ⚠ que la source glisse au fil du texte : le navigateur va
     le chercher dans la police d'emoji, en COULEUR et en bitmap (Type 3).
     Sur un tirage noir et blanc, il ressort en pâté. Dans une phrase il
     tenait de toute façon la place d'un mot ; on écrit le mot. */
  .replace(/⚠️?\s*/g, 'À éviter : ')
  /* Typographie d'imprimerie. L'apostrophe droite du clavier n'existe pas
     dans un livre : la source en portait 1719, mêlées à 452 courbes, sur
     227 pages — ça se voit au premier coup d'œil sur papier.
     1. entre deux lettres, c'est une apostrophe : l'eau → l’eau ;
     2. par paire autour d'un mot, ce sont des guillemets : on met des
        chevrons et des espaces insécables, comme le veut le français ;
     3. ce qui reste est une apostrophe isolée. */
  .replace(/(\p{L})'(\p{L})/gu, '$1’$2')
  .replace(/'([^'\n]{1,60})'/g, '« $1 »')
  .replace(/'/g, '’')
  /* Le français veut une espace avant les signes doubles, et elle doit
     être INSÉCABLE : sinon la ligne se coupe là, et le livre imprime un
     chevron ou un point-virgule tout seul en tête de ligne. */
  .replace(/«[ 	 ]*/g, '« ')
  .replace(/[ 	 ]*»/g, ' »')
  .replace(/[  ]+([;:!?])(?=\s|$)/g, ' $1');

/* Le même avertissement, mais en tête d'encadré : là c'est un signal, pas
   un mot. On le dessine — un tracé s'imprime net à toute taille, et il
   passe en gris franc sur une presse noir et blanc. */
/* Le badge du QCM : une case cochée, dessinée — le signal que Franck
   réclamait pour qu'un QCM se reconnaisse d'un coup d'œil. */
const PICTO_QCM = `<svg class="picto-qcm" viewBox="0 0 20 20" aria-hidden="true">
  <rect x="1.4" y="1.4" width="17.2" height="17.2" rx="3.2" fill="none" stroke="currentColor" stroke-width="2.1"/>
  <path d="M5.2 10.4 8.6 13.8 14.9 6.6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const PICTO_PIEGE = `<svg class="picto-piege" viewBox="0 0 20 18" aria-hidden="true">
  <path d="M10 1.7 19.1 16.5H0.9z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>
  <path d="M10 6.9v4.4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
  <circle cx="10" cy="14.1" r="1.05" fill="currentColor"/></svg>`;
/* Le plan écrit ses chaînes sans apostrophes ; `apos` (importée du plan,
   comme la convention) les restitue partout où un titre s'affiche. */

const qrDe = (num) => QR.find((e) => e.chapitre === num && !e.lecon && !e.genre);
/* La série d'entraînement du chapitre : son premier groupe G-numéroté. */
const revDe = (ch) => {
  const g = (ch.groupesQ || []).find((x) => /^G\d+$/.test(x));
  return g ? 'rev-' + g.toLowerCase() : '';
};
const qrLeconDe = (num, i) => QR.find((e) => e.chapitre === num && e.lecon === i);
const contenuDe = (num) => CONTENU.chapitres.find((c) => c.num === num);

/* Un bloc du flux. `seul` = il occupe sa page à lui tout seul. */
const bloc = (html, meta = {}) => ({ html, ...meta });

/* ------------------------- Briques ------------------------- */
const estTechnique = (r) => r.startsWith('svg:') || r.startsWith('sym:');

const figure = (refs, legendes = []) => {
  /* Une planche technique ne se met JAMAIS en demi-largeur : illisible.
     Deux illustrations d'ambiance peuvent en revanche voisiner. */
  const technique = refs.some(estTechnique);
  if (refs.length >= 2 && !technique) {
    return `<div class="duo">${refs.map((r, i) => `
      <figure><img src="${visuel(r)}"${cotes(r)} alt="">${legendes[i] ? `<figcaption>${ech(apos(legendes[i]))}</figcaption>` : ''}</figure>`).join('')}</div>`;
  }
  /* Une planche accompagnée d'une illustration d'ambiance : la planche
     explique et prend la largeur, l'illustration accompagne et se range
     en appoint. Deux images de même poids sur une page A5 la remplissent
     à elles seules et repoussent le texte. */
  const appointPossible = technique && refs.length >= 2;
  return refs.map((r, i) => {
    const appoint = appointPossible && !estTechnique(r);
    const symbole = r.startsWith('sym:');
    return `<figure class="${symbole ? 'symbole' : appoint ? 'appoint' : 'planche'}${!appoint && !symbole && ratio(r) > 1.15 ? ' haute' : ''}">
      ${r.startsWith('svg:') ? qrm('a-' + r.slice(4), 'a') : ''}<img src="${visuel(r)}"${cotes(r)} alt="">
      ${legendes[i] ? `<figcaption>${ech(apos(legendes[i]))}</figcaption>` : ''}
    </figure>`;
  }).join('');
};

const ecran = (slug, texte) => {
  const e = QR.find((x) => x.slug === slug);
  if (!e) return '';
  return `<div class="ecran">
    <img class="ecran-qr" src="${qrImg(slug)}" alt="">
    <div class="ecran-txt">
      <span class="ecran-eti">À l’écran</span>
      <span class="ecran-url">${e.alias.replace('https://', '')}</span>
      <span class="ecran-desc">${texte}</span>
    </div></div>`;
};

/* Le QR de MARGE — la colonne numérique du livre. Un marqueur invisible
   que finition.py relit page à page pour poser le code en regard, dans
   la marge extérieure, à la hauteur exacte du bloc qui le porte. Le type
   choisit le libellé imprimé : c chapitre, l leçon, a animation, q quiz. */
const qrm = (slug, type) => QR.some((x) => x.slug === slug)
  ? `<span class="marq">@@QR|${slug}|${type}@@</span>` : '';

/* L'ANCRE de comblement — un repère invisible en fin de bloc éditorial
   (fin de leçon, d'activité, de chapitre, d'ouverture). finition.py note,
   page par page, la dernière ancre vue et le blanc qui reste au pied ;
   combler.mjs choisit alors où glisser une planche de la réserve. Quand
   la table a retenu une ancre, la planche s'imprime juste après elle —
   plafonnée à la hauteur mesurée, elle ne déplace jamais la pagination.
   Comme tout marqueur, l'ancre se place EN FIN d'élément : l'effacement
   de finition mange le caractère qui suivrait sur la même ligne. */
const compteurAncres = {};
const ancre = (chNum) => {
  const n = (compteurAncres[chNum] = (compteurAncres[chNum] || 0) + 1);
  const cle = `${chNum}-${n}`;
  const c = COMBLE[cle];
  const planche = c ? `<figure class="planche comble">
      ${c.ref.startsWith('svg:') ? qrm('a-' + c.ref.slice(4), 'a') : ''}<img src="${visuel(c.ref)}"${cotes(c.ref)} style="max-height:${c.h}mm" alt="">
      ${c.legende ? `<figcaption>${ech(apos(c.legende))}</figcaption>` : ''}
    </figure>` : '';
  /* `vide` dit au bloc de s'écraser à hauteur nulle : sans planche, une
     ancre ne doit pas peser un strut de ligne — cent ancres pèseraient
     deux pages. Avec planche, le bloc reprend sa hauteur naturelle. */
  return { html: `<span class="marq">@@P|${cle}@@</span>${planche}`, vide: !c };
};


const encadre = (b) => {
  const piege = b.type === 'piege';
  const corps = String(b.html);
  const items = corps.match(/<li>[\s\S]*?<\/li>/g) || [];
  let paras = corps.replace(/<[ou]l>[\s\S]*?<\/[ou]l>/g, '').match(/<p>[\s\S]*?<\/p>/g) || [];
  /* La source n'enveloppe pas toujours son texte dans un <p> : 81 encadrés
     sur 109 n'en portaient aucun et s'imprimaient RÉDUITS À LEUR TITRE —
     3 639 mots perdus, dont « le piège des manomètres ». Ce qui reste une
     fois les listes ôtées est du texte : on l'imprime. */
  if (!paras.length && !items.length) {
    const reste = corps.replace(/<\/?p>/g, '').trim();
    if (reste) paras = [reste];
  }
  return `<aside class="encadre ${piege ? 'piege' : 'cle'}">
    <h4>${piege ? PICTO_PIEGE : ''}${ech(b.t)}</h4>
    ${paras.map((p) => `<p>${ech(p.replace(/<\/?p>/g, ''))}</p>`).join('')}
    ${items.length ? `<ol>${items.map((li) => `<li>${ech(li.replace(/<\/?li>/g, ''))}</li>`).join('')}</ol>` : ''}
  </aside>`;
};

const tableau = (tb) => `
  <div class="tbl">
    <h4>${ech(apos(tb.titre))}</h4>
    <table><thead><tr>${tb.entetes.map((e) => `<th>${ech(e)}</th>`).join('')}</tr></thead>
    <tbody>${tb.lignes.map((l) => `<tr>${l.map((c) => `<td>${ech(apos(String(c)))}</td>`).join('')}</tr>`).join('')}
    </tbody></table>
  </div>`;

const lignes = (liste) => `<div class="remplir">${liste.map((l) => {
  const libelle = apos(String(l).replace(/\s*_{2,}\s*/g, ' … ').replace(/\s*[:—]?\s*…\s*$/, ''));
  return `<p class="rl">${ech(libelle)}</p><p class="trait"></p>`;
}).join('')}</div>`;

/* Un libellé d'arrêté fait parfois trois lignes : on le coupe au dernier
   mot entier, jamais au milieu d'un mot — « thermodynamique élémentaire
   (terminologie, p » n'apprend rien à personne. */
const raccourcir = (texte, n) => {
  const t = String(texte);
  if (t.length <= n) return t;
  const bout = t.slice(0, n);
  const espace = bout.lastIndexOf(' ');
  return `${(espace > n * 0.6 ? bout.slice(0, espace) : bout).replace(/[ ,;:(]+$/, '')}…`;
};

const libelleCode = (() => {
  const idx = new Map();
  for (const g of REF.groupes) for (const c of g.codes || []) idx.set(c.code, c.libelle);
  return (code) => idx.get(code) || '';
})();

/* ------------------------- Le flux ------------------------- */
export const construireFlux = () => {
  const flux = [];
  const pousse = (html, meta) => flux.push(bloc(html, meta));

  /* ---- Couverture ---- */
  const couv = LIMINAIRES.find((p) => p.id === 'couverture');
  pousse(`<div class="couverture">
    <div class="couv-marque"><span class="flocon">❄</span><span class="iner">iner</span><span class="web">Web</span><span class="cartouche">HabFluide</span></div>
    <div class="couv-titre"><h1>HabFluide</h1>
      <p class="couv-sous">Livre sur l'habilitation des fluides — partie théorique</p></div>
    <img class="couv-illu" src="${visuel(couv.visuels[0])}"${cotes(couv.visuels[0])} alt="">
    <div class="couv-bas">
      <p class="couv-epreuve">Préparation à l’épreuve <b>théorique</b><br>de l’attestation d’aptitude fluides frigorigènes</p>
      <p class="couv-cats">${CONTENU.categories.map((c) => `<span>${c}</span>`).join('')}</p>
      <p class="couv-ref">Arrêté du 21 novembre 2025 · règlement (UE) 2024/573</p>
      <p class="couv-auteur">F. Henninot, enseignant en filière froid et climatisation</p>
    </div></div>`, { seul: true, nue: true });

  /* ---- Liminaires ---- */
  for (const p of LIMINAIRES) {
    if (p.id === 'couverture') continue;
    if (p.id === 'sommaire') {
      pousse(`<h2 class="page-t">Sommaire</h2>`, { rupture: true, nue: true, garde: true });
      for (const partie of PARTIES) {
        pousse(`<div class="som-partie">
          <p class="som-p"><b>Partie ${partie.id} — ${ech(partie.titre)}</b><span>${ech(apos(partie.sous))}</span></p>
          ${CHAPITRES.filter((c) => c.partie === partie.id).map((ch) => `
            <p class="som-ch"><span class="som-n">${ch.num}</span>${ech(apos(ch.titre))}
              <span class="som-url">inerweb.fr/f/${ch.qr}</span><span class="marq">@@SOM|${ch.num}@@</span></p>`).join('')}
        </div>`, { nue: true });
      }
      continue;
    }
    pousse(`<h2 class="page-t">${ech(apos(p.t))}</h2>`, { rupture: true, nue: true, garde: true });
    for (const texte of TEXTES_LIMINAIRES[p.id] || []) pousse(`<p class="txt">${ech(texte)}</p>`, { nue: true });
    pousse(figure(p.visuels, p.legendes), { nue: true });
    if (LIGNES_FIN[p.id]) pousse(lignes(LIGNES_FIN[p.id]), { nue: true });
    /* Sous les lignes du point de départ, le test qui l'objective : vingt
       questions en ligne, et le parcours qui en sort — par quels chapitres
       commencer. Le QR vit dans la page, comme celui du bilan. */
    if (p.id === 'point-depart' && QR.some((x) => x.slug === 'positionnement')) {
      pousse(`<div class="bilan-qr">
        <img class="bilan-qr-img" src="${qrImg('positionnement')}" alt="" width="600" height="600">
        <div class="bilan-qr-txt">
          <b>Vingt questions avant d'ouvrir le livre</b>
          <span>Ce code lance le test d'entrée : un tirage dans tous les chapitres,
          corrigé sur votre téléphone. À la fin, votre parcours — les chapitres à
          travailler d'abord, ceux que vous pouvez survoler.</span>
          <span class="bilan-qr-url">inerweb.fr/f/positionnement</span>
        </div></div>`, { nue: true });
    }
  }

  /* ---- Parties et chapitres ---- */
  for (const partie of PARTIES) {
    pousse(`<div class="ouverture">
      <span class="ouv-eti">Partie ${partie.id}</span>
      <h1 class="ouv-t">${ech(partie.titre)}</h1>
      <p class="ouv-s">${ech(apos(partie.sous))}</p>
      <div class="ouv-liste">${CHAPITRES.filter((c) => c.partie === partie.id)
        .map((ch) => `<span><b>${ch.num}</b> ${ech(apos(ch.titre))}</span>`).join('')}</div>
    </div>`, { seul: true, nue: true, partie: partie.id });

    for (const ch of CHAPITRES.filter((c) => c.partie === partie.id)) {
      const c = contenuDe(ch.num);
      const meta = { partie: partie.id, chapitre: ch.num };

      pousse(`<div class="ch-tete"><span class="ch-num">${ch.num}</span>
        <div><h2 class="ch-titre">${ech(apos(ch.titre))}</h2>
        <p class="ch-objectif">${ech(apos(ch.objectif))}${qrm(ch.qr, 'c')}</p></div></div>`,
      { ...meta, rupture: true, garde: true });

      if (c.referentiel?.length) {
        /* Qui est concerné, code par code : le référentiel n'exige pas
           la même chose de A1, A2, D et E. */
        const cats = (r) => {
          if (!r.catsT.length) {
            /* Deux raisons TRÈS différentes de n'avoir aucune catégorie
               théorique ici, et les confondre est une faute : le code est
               évalué en atelier (partie pratique, prochain livre), OU il est théorique mais pour
               une catégorie que ce livre ne prépare pas — le CO₂ pour B,
               l'ammoniac pour C. Le code 1.09 était annoncé « épreuve
               pratique » alors qu'il est théorique en catégorie B. */
            /* Le contenu ne retient que les catégories du périmètre : un
               code théorique en B ou C y arrive donc SANS catégorie. On
               va lire le référentiel officiel pour savoir laquelle. */
            const officiel = REF.groupes.flatMap((g) => g.codes || [])
              .find((x) => x.code === r.code);
            const autres = Object.entries((officiel && officiel.cat) || {})
              .filter(([k, v]) => v === 'T' && !CONTENU.categories.includes(k))
              .map(([k]) => k);
            if (autres.length) {
              return `<span class="ref-cat hors">hors périmètre — catégorie ${autres.join(' et ')}</span>`;
            }
            return '<span class="ref-cat prat">épreuve pratique — prochain livre</span>';
          }
          if (r.catsT.length === CONTENU.categories.length) return '<span class="ref-cat">toutes catégories</span>';
          return r.catsT.map((k) => `<span class="ref-cat">${k}</span>`).join('');
        };
        pousse(`<section class="ref">
          <h3>Ce que le référentiel exige ici</h3>
          <p class="ref-intro">Attestation d’aptitude fluides frigorigènes, épreuve théorique —
            catégories ${CONTENU.categories.join(', ')}. Chaque code indique les catégories qu’il concerne.</p>
          ${c.referentiel.map((r) => `<p class="ref-l"><span class="ref-code">${r.code}</span>${ech(r.libelle)}
            <span class="ref-cats">${cats(r)}</span></p>`).join('')}
        </section>`, meta);
      }

      /* Le sommaire du chapitre, sous le référentiel : la maquette du
         30/08 le pose en ouverture — on sait où l'on va avant de partir. */
      const titresLecons = (ch.lecons || c.lecons || []).map((l) => l.t);
      if (titresLecons.length) {
        pousse(`<div class="sommaire-ch"><p class="sommaire-t">Dans ce chapitre</p>
          <ol>${titresLecons.map((t2) => `<li>${ech(apos(t2))}</li>`).join('')}</ol></div>`, meta);
      }
      { const a = ancre(ch.num); pousse(a.html, { ...meta, ancre: a.vide }); } /* fin d'ouverture — le QCM rompt derrière */

      /* 1 — Testez-vous */
      /* L'ordre des choix vient de la sélection, pas de la banque : la
         bonne réponse y a été répartie sur les quatre rangs. */
      const questions = (CHOISIES[ch.num] || []).map((sel) => {
        const q = c.questions.find((x) => x.id === sel.id);
        return q && { ...q, choix: sel.ordre.map((i) => q.choix[i]), bonne: sel.bonne };
      }).filter(Boolean);
      /* Le QCM tient d'un seul tenant, sur sa propre page : autrement on
         ne voit ni combien de questions il y a, ni où il s'arrête — et
         se tester devient impossible (remarque de F. Henninot). */
      /* Deux colonnes seulement si chaque choix tient sur UNE ligne en
   demi-largeur : au-delà, il repasse à la ligne et la question devient
   plus haute qu'en pleine largeur. À 14 pt, la bascule est vers 30. */
  const court = (q) => q.choix.every((x) => x.length <= 30);
      /* Le QCM se VOIT (remarque de F. Henninot, 30/08 soir) : un cadre
         bleu sur fond pâle, un badge QCM, chaque question dans sa carte
         blanche, des cases à cocher franches. Et la correspondance
         papier/numérique : le QR DANS le cadre ouvre LES MÊMES
         questions, corrigées à la validation — la série complète du
         chapitre reste en marge, comme marche au-dessus. */
      const slugQcm = QR.some((x) => x.slug === `q-${ch.qr}`) ? `q-${ch.qr}` : '';
      pousse(`<section class="qcm">
        <div class="qcm-tete">
          <div>
            <h3 class="sect-t"><span class="sect-num">1</span>${PICTO_QCM}QCM — Testez-vous d’abord${qrm(revDe(ch), 'e')}</h3>
            <p class="sect-intro">Cochez <b>avant</b> de lire : vous saurez ce qui mérite votre lecture.
            Le code ci-contre corrige ce QCM sur votre téléphone ; la série complète du chapitre est en marge.</p>
          </div>
          ${slugQcm ? `<div class="qcm-qr"><img src="${qrImg(slugQcm)}" alt="" width="600" height="600">
            <span class="qcm-qr-txt"><b>Ce QCM, corrigé</b>en ligne<span class="qcm-qr-url">inerweb.fr/f/<br>${slugQcm}</span></span></div>` : ''}
        </div>
        ${questions.map((q, i) => `<div class="q"><p class="q-e"><span class="q-n">${i + 1}</span>${ech(q.enonce)}</p>
          <ul class="q-c${court(q) ? ' deux' : ''}">${q.choix.map((ch2, j) => `<li><span class="case"></span><span class="lettre">${String.fromCharCode(65 + j)}</span>${ech(ch2)}</li>`).join('')}</ul></div>`).join('')}
        <div class="qcm-note">Ma note à ce QCM <span class="note-case"></span> / ${questions.length}</div>
      </section>`, meta); /* la rupture de page est portée par .qcm, pas ici :
                             deux ruptures d'affilée feraient une page blanche */

      /* 2 — Les leçons */
      pousse(`<h3 class="sect-t"><span class="sect-num">2</span>Comprendre</h3>`, { ...meta, garde: true });
      for (const [i, lp] of (ch.lecons || []).entries()) {
        const lc = c.lecons[i];
        /* Chaque bloc emporte les codes que sa carte source DÉCLARE
           traiter : le pied de page les imprimera, et l'audit comptera
           sur quelles pages chaque compétence est réellement vue. */
        const meta = { partie: partie.id, chapitre: ch.num, codes: lc.codes || [] };
        const qrl = qrLeconDe(ch.num, i + 1);
        pousse(`<h4 class="lecon-t"><span class="lecon-n">${ch.num}.${i + 1}</span>${ech(apos(lc.t))}${qrl ? qrm(qrl.slug, 'l') : ''}</h4>`,
          { ...meta, garde: true });
        if (lp.visuels) pousse(figure(lp.visuels, lp.legendes), meta);
        for (const p of lc.paras) pousse(`<p class="txt">${ech(p)}</p>`, meta);
        if (lc.tableau) pousse(tableau(lc.tableau), meta);
        for (const b of lc.blocs) pousse(encadre(b), meta);
        { const a = ancre(ch.num); pousse(a.html, { ...meta, ancre: a.vide }); } /* fin de leçon */
      }
      /* Le chapitre généré n'a pas de leçons du plan : ses leçons sont dans le contenu. */
      if (!ch.lecons) {
        for (const [i, lc] of c.lecons.entries()) {
          pousse(`<h4 class="lecon-t"><span class="lecon-n">${ch.num}.${i + 1}</span>${ech(apos(lc.t))}</h4>`,
            { ...meta, garde: true });
          for (const p of lc.paras) pousse(`<p class="txt">${ech(p)}</p>`, meta);
          if (lc.tableau) pousse(tableau(lc.tableau), meta);
          for (const b of lc.blocs) pousse(encadre(b), meta);
          { const a = ancre(ch.num); pousse(a.html, { ...meta, ancre: a.vide }); } /* fin de leçon */
        }
      }

      /* 3 — À vous */
      const act = ch.activite;
      pousse(`<h3 class="sect-t"><span class="sect-num">3</span>À vous — ${ech(apos(act.t))}</h3>`,
        { ...meta, garde: true });
      if (act.visuels) pousse(figure(act.visuels, act.legendes), meta);
      if (c.activite) for (const p of c.activite.paras) pousse(`<p class="txt">${ech(p)}</p>`, meta);
      pousse(lignes(act.lignes), meta);
      pousse(`<p class="voix"><span>À voix haute</span>« ${ech(apos(act.voixHaute))} »</p>`, meta);

      { const a = ancre(ch.num); pousse(a.html, { ...meta, ancre: a.vide }); } /* fin d'activité */

      /* 4 — S'entraîner en ligne. Les pages de corrigé ont quitté le
         papier (décision de la maquette du 30/08) : la correction vit en
         ligne, question par question, dans la série du chapitre. */
      const qc = qrDe(ch.num);
      pousse(`<h3 class="sect-t"><span class="sect-num">4</span>Entraînez-vous — la suite est en ligne${qrm(revDe(ch), 'e')}</h3>
        <p class="sect-intro">La série du chapitre vous attend : dix questions niveau examen,
        corrigées et expliquées une à une. Le code est en marge — l'adresse aussi.</p>`,
        { ...meta, garde: true });
      pousse(`<div class="note">Ma note à la série en ligne <span class="note-case"></span> / 10
        <span class="note-desc">à reporter au bilan, en fin de livret</span>${qc ? qrm(qc.slug, 'c') : ''}</div>`, meta);
      { const a = ancre(ch.num); pousse(a.html, { ...meta, ancre: a.vide }); } /* fin de chapitre */
    }

    /* La planche centrale, après la partie C. Couchée d'un quart de tour :
       le circuit est large (rapport 1,6), il butait sur les 120 mm de
       justification alors que la page en offre 200 dans l'autre sens. Le
       lecteur tourne le livre, la planche gagne 38 % de taille. */
    if (partie.id === 'C') {
      for (const face of [PLANCHE_CENTRALE.corrige, PLANCHE_CENTRALE.fantome]) {
        pousse(`<div class="paysage"><div class="paysage-in">
          <h2 class="page-t">${ech(apos(face.t))}</h2>${figure(face.visuels, face.legendes)}
          </div></div>`, { seul: true, partie: partie.id });
      }
    }
  }

  /* ---- Pages de fin ---- */
  for (const p of FIN) {
    pousse(`<h2 class="page-t">${ech(apos(p.t))}</h2>`, { rupture: true, nue: true, garde: true });
    for (const texte of TEXTES_FIN[p.id] || []) pousse(`<p class="txt">${ech(texte)}</p>`, { nue: true });

    if (p.id === 'bilan') {
      pousse(tableau({
        titre: 'Chapitre par chapitre',
        entetes: ['Ch.', 'Titre', 'Ma note', 'À reprendre ?'],
        lignes: CHAPITRES.map((ch) => [String(ch.num), ch.titre, '__ / 10', '']),
      }), { nue: true });
      /* Le pendant numérique du bilan : la page « mes résultats » lit ce
         que le téléphone a retenu des séries — notes et compétences. La
         page Bilan est nue (sans marge de renvois), le QR vit donc dans
         la page même, comme un bloc du bilan. */
      if (QR.some((x) => x.slug === 'mes-resultats')) {
        pousse(`<div class="bilan-qr">
          <img class="bilan-qr-img" src="${qrImg('mes-resultats')}" alt="" width="600" height="600">
          <div class="bilan-qr-txt">
            <b>Vos notes, déjà remplies</b>
            <span>Ce code ouvre « mes résultats » : la note de chaque série jouée sur votre
            téléphone, et l'état de chaque compétence — acquise, fragile, à revoir.
            Rien ne quitte l'appareil.</span>
            <span class="bilan-qr-url">inerweb.fr/f/mes-resultats</span>
          </div></div>`, { nue: true });
      }
    }
    /* La banque : les 89 questions laissées de côté par les chapitres,
       posées dans l'ordre du livre, chacune marquée de son chapitre. */
    if (p.id === 'banque') {
      /* En tête, l'examen blanc : la banque s'ouvre au moment où le livre
         est lu — c'est là qu'on se teste en conditions réelles. Quarante
         questions en ligne, un tirage neuf à chaque passage, et la
         remédiation en sortie : les chapitres où reprendre, pages à
         l'appui. Le papier n'imprime que le QR. */
      if (QR.some((x) => x.slug === 'examen-blanc')) {
        pousse(`<div class="bilan-qr">
          <img class="bilan-qr-img" src="${qrImg('examen-blanc')}" alt="" width="600" height="600">
          <div class="bilan-qr-txt">
            <b>L'examen blanc, quand vous vous sentez prêt</b>
            <span>Quarante questions tirées de tous les chapitres, dans le désordre,
            corrigées sur votre téléphone. Le tirage change à chaque passage. À la
            fin : votre note, et les chapitres où reprendre, pages à l'appui.</span>
            <span class="bilan-qr-url">inerweb.fr/f/examen-blanc</span>
          </div></div>`, { nue: true });
      }
      const corrige = false;
      let n = 0;
      /* Entrelacées, pas rangées par chapitre : l'épreuve ne prévient pas
         de quel chapitre tombe la question suivante, la révision non plus.
         Le tour de rôle est déterministe — le livre reste reproductible. */
      const files = Object.entries(RESERVE).map(([num, liste]) => ({ num, liste: [...liste] }));
      const melange = [];
      for (let rang = 0; files.some((f) => f.liste.length); rang += 1) {
        for (const f of files) if (f.liste.length) melange.push([f.num, f.liste.shift()]);
      }
      for (const [num, sel] of melange) {
        const contenu = contenuDe(Number(num));
        {
          const brute = contenu?.questions.find((q) => q.id === sel.id);
          if (!brute) continue;
          n += 1;
          const choix = sel.ordre.map((i) => brute.choix[i]);
          if (corrige) {
            pousse(`<div class="rep"><p class="rep-l"><span class="rep-n">${n}</span>
              <span class="rep-lettre">${String.fromCharCode(65 + sel.bonne)}</span><b>${ech(choix[sel.bonne])}</b>
              <span class="note-desc">ch. ${num}</span></p>
              ${brute.explication ? `<p class="rep-x">${ech(brute.explication)}</p>` : ''}</div>`, { nue: true });
          } else {
            pousse(`<div class="q"><p class="q-e"><span class="q-n">${n}</span>
              <span class="note-desc">ch. ${num}</span> ${ech(brute.enonce)}</p>
              <ol class="q-c">${choix.map((c, i) => `<li><span class="case"></span>
                <span class="lettre">${String.fromCharCode(65 + i)}</span>${ech(c)}</li>`).join('')}</ol></div>`,
            { nue: true });
          }
        }
      }
    }
    if (p.id === 'index-codes') {
      /* L'index dit où RETROUVER un code, et il le dit d'après la même
         source que les pieds de page : les codes que chaque leçon déclare
         traiter. Auparavant il recopiait les codes annoncés en tête de
         chapitre — une intention, pas un relevé. */
      const parCode = new Map();
      for (const c of CONTENU.chapitres) {
        for (const l of c.lecons || []) {
          for (const code of l.codes || []) {
            if (!parCode.has(code)) parCode.set(code, new Set());
            parCode.get(code).add(c.num);
          }
        }
      }
      pousse(`<p class="txt">Chaque page du livre porte en pied les codes qu’elle travaille.
        Ce tableau fait le chemin inverse : pour un code, les chapitres où il est traité.</p>`,
      { nue: true });
      pousse(tableau({
        titre: 'Code du référentiel → chapitre(s) du livre',
        entetes: ['Code', 'Ce qu’il exige', 'Chapitre(s)'],
        lignes: [...parCode.entries()].sort((a, b) => a[0].localeCompare(b[0], 'fr', { numeric: true }))
          .map(([code, nums]) => [code, raccourcir(libelleCode(code), 108), [...nums].sort((x, y) => x - y).join(', ')]),
      }), { nue: true });
    }
    if (p.id === 'index-qr') {
      pousse(tableau({
        titre: 'Toutes les adresses, en clair',
        entetes: ['Chapitre', 'Adresse à taper'],
        lignes: QR.filter((e) => !e.lecon && e.genre !== 'animation').map((e) => [`${e.chapitre}. ${e.titre}`, e.alias.replace('https://', '')]),
      }), { nue: true });
      pousse(tableau({
        titre: 'Les animations du livre',
        entetes: ['Planche animée', 'Adresse à taper'],
        lignes: QR.filter((e) => e.genre === 'animation').map((e) => [
          e.titre.length > 64 ? e.titre.slice(0, 61) + '…' : e.titre, e.alias.replace('https://', '')]),
      }), { nue: true });
    }
    if (p.id === 'sources') {
      pousse(`<p class="txt"><b>${ech(REF.source.texte)}</b> — ${ech(REF.source.publication)}.</p>
        ${REF.source.fondement_ue.map((f) => `<p class="txt petit">· ${ech(f)}</p>`).join('')}
        <p class="txt">Application élève et capsules : <b>inerweb.fr</b>. Source éditoriale :
        pack « Habilitation fluides frigorigènes », commit ${CONTENU.source.commit}.</p>`, { nue: true });
    }
    if (LEXIQUE[p.id]) {
      const lex = LEXIQUE[p.id];
      pousse(`<p class="txt lex-chapeau">${ech(lex.titre)} — les mots du métier, expliqués avec
        des mots plus simples qu’eux.</p>`, { nue: true });
      for (const [terme, def] of lex.entrees) {
        pousse(`<p class="lex"><b>${ech(terme)}</b><span>${ech(def)}</span></p>`, { nue: true });
      }
    }
    if (LIGNES_FIN[p.id]) pousse(lignes(LIGNES_FIN[p.id]), { nue: true });
    pousse(figure(p.visuels, p.legendes), { nue: true });
  }

  return flux;
};

export const NB_CHAPITRES = CHAPITRES.length;
export const TITRES_PARTIES = Object.fromEntries(PARTIES.map((p) => [p.id, p.titre]));
export const TITRES_CHAPITRES = Object.fromEntries(CHAPITRES.map((c) => [c.num, c.titre]));
