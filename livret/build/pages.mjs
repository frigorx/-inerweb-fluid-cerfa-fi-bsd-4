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
import { CHAPITRES, PARTIES, LIMINAIRES, FIN, PLANCHE_CENTRALE } from './plan-chapitres.mjs';
import { TEXTES_LIMINAIRES, TEXTES_FIN, LIGNES_FIN } from './textes-liminaires.mjs';
import { LEXIQUE } from './lexique.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const LIVRET = path.join(ICI, '..');
const CONTENU = JSON.parse(fs.readFileSync(path.join(LIVRET, 'contenu.gen.json'), 'utf8'));
const VISUELS = JSON.parse(fs.readFileSync(path.join(LIVRET, 'visuels.gen.json'), 'utf8'));
const QR = JSON.parse(fs.readFileSync(path.join(LIVRET, 'qr.gen.json'), 'utf8'));
const CHOISIES = JSON.parse(fs.readFileSync(path.join(LIVRET, 'questions-choisies.gen.json'), 'utf8'));
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
const qrImg = (slug) => dataUri('qr.gen', QR.find((e) => e.slug === slug).fichier);

const ech = (s) => String(s)
  .replace(/&(?![a-zA-Z]+;|#\d+;)/g, '&amp;')
  .replace(/<(?!\/?(?:b|i)>)/g, '&lt;');
/* Le plan écrit ses chaînes sans apostrophes ; on les restitue. */
export const apos = (s) => String(s).replace(
  /\b(jusqu|lorsqu|puisqu|quelqu|aujourd|[qQ]u|[dcjlmnstDCJLMNST])\s(?=[aeiouyhéèêëàâîïôûAEIOUYHÉÈÊÀÂÎÔ])/g, '$1’');

const qrDe = (num) => QR.find((e) => e.chapitre === num && !e.lecon);
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
      <figure><img src="${visuel(r)}" alt="">${legendes[i] ? `<figcaption>${ech(apos(legendes[i]))}</figcaption>` : ''}</figure>`).join('')}</div>`;
  }
  /* Une planche accompagnée d'une illustration d'ambiance : la planche
     explique et prend la largeur, l'illustration accompagne et se range
     en appoint. Deux images de même poids sur une page A5 la remplissent
     à elles seules et repoussent le texte. */
  const appointPossible = technique && refs.length >= 2;
  return refs.map((r, i) => {
    const appoint = appointPossible && !estTechnique(r);
    return `<figure class="${appoint ? 'appoint' : 'planche'}${!appoint && ratio(r) > 1.15 ? ' haute' : ''}">
      <img src="${visuel(r)}" alt="">
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

const encadre = (b) => {
  const piege = b.type === 'piege';
  const corps = String(b.html);
  const items = corps.match(/<li>[\s\S]*?<\/li>/g) || [];
  const paras = corps.replace(/<[ou]l>[\s\S]*?<\/[ou]l>/g, '').match(/<p>[\s\S]*?<\/p>/g) || [];
  return `<aside class="encadre ${piege ? 'piege' : 'cle'}">
    <h4>${piege ? '⚠ ' : ''}${ech(b.t)}</h4>
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
      <p class="couv-sous">Livret élève — tome 1 : la théorie</p></div>
    <img class="couv-illu" src="${visuel(couv.visuels[0])}" alt="">
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
              <span class="som-url">inerweb.fr/f/${ch.qr}</span></p>`).join('')}
        </div>`, { nue: true });
      }
      continue;
    }
    pousse(`<h2 class="page-t">${ech(apos(p.t))}</h2>`, { rupture: true, nue: true, garde: true });
    for (const texte of TEXTES_LIMINAIRES[p.id] || []) pousse(`<p class="txt">${ech(texte)}</p>`, { nue: true });
    pousse(figure(p.visuels, p.legendes), { nue: true });
    if (LIGNES_FIN[p.id]) pousse(lignes(LIGNES_FIN[p.id]), { nue: true });
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
        <p class="ch-objectif">${ech(apos(ch.objectif))}</p></div></div>`,
      { ...meta, rupture: true, garde: true });

      if (c.referentiel?.length) {
        /* Qui est concerné, code par code : le référentiel n'exige pas
           la même chose de A1, A2, D et E. */
        const cats = (r) => {
          if (!r.catsT.length) return '<span class="ref-cat prat">épreuve pratique — tome 2</span>';
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

      /* 1 — Testez-vous */
      const questions = (CHOISIES[ch.num] || []).map((id) => c.questions.find((q) => q.id === id)).filter(Boolean);
      /* Le QCM tient d'un seul tenant, sur sa propre page : autrement on
         ne voit ni combien de questions il y a, ni où il s'arrête — et
         se tester devient impossible (remarque de F. Henninot). */
      const court = (q) => q.choix.every((x) => x.length <= 46);
      pousse(`<section class="qcm">
        <h3 class="sect-t"><span class="sect-num">1</span>Testez-vous d’abord —
          ${questions.length} questions</h3>
        <p class="sect-intro">Répondez <b>avant</b> de lire : vous saurez tout de suite ce que vous savez déjà,
        et ce qui mérite votre lecture. Les corrections sont en fin de chapitre.</p>
        ${questions.map((q, i) => `<div class="q"><p class="q-e"><span class="q-n">${i + 1}</span>${ech(q.enonce)}</p>
          <ul class="q-c${court(q) ? ' deux' : ''}">${q.choix.map((ch2, j) => `<li><span class="case"></span><span class="lettre">${String.fromCharCode(65 + j)}</span>${ech(ch2)}</li>`).join('')}</ul></div>`).join('')}
      </section>`, meta); /* la rupture de page est portée par .qcm, pas ici :
                             deux ruptures d'affilée feraient une page blanche */

      /* 2 — Les leçons */
      pousse(`<h3 class="sect-t"><span class="sect-num">2</span>Comprendre</h3>`, { ...meta, garde: true });
      for (const [i, lp] of (ch.lecons || []).entries()) {
        const lc = c.lecons[i];
        pousse(`<h4 class="lecon-t"><span class="lecon-n">${ch.num}.${i + 1}</span>${ech(apos(lc.t))}</h4>`,
          { ...meta, garde: true });
        if (lp.visuels) pousse(figure(lp.visuels, lp.legendes), meta);
        for (const p of lc.paras) pousse(`<p class="txt">${ech(p)}</p>`, meta);
        if (lc.tableau) pousse(tableau(lc.tableau), meta);
        for (const b of lc.blocs) pousse(encadre(b), meta);
        const qrl = qrLeconDe(ch.num, i + 1);
        if (qrl) pousse(ecran(qrl.slug, qrl.cible.includes('capsule')
          ? 'Cette leçon animée et racontée à voix haute.'
          : 'La fiche interactive, avec sa question corrigée.'), meta);
      }
      /* Le chapitre généré n'a pas de leçons du plan : ses leçons sont dans le contenu. */
      if (!ch.lecons) {
        for (const [i, lc] of c.lecons.entries()) {
          pousse(`<h4 class="lecon-t"><span class="lecon-n">${ch.num}.${i + 1}</span>${ech(apos(lc.t))}</h4>`,
            { ...meta, garde: true });
          for (const p of lc.paras) pousse(`<p class="txt">${ech(p)}</p>`, meta);
          if (lc.tableau) pousse(tableau(lc.tableau), meta);
          for (const b of lc.blocs) pousse(encadre(b), meta);
        }
      }

      /* 3 — À vous */
      const act = ch.activite;
      pousse(`<h3 class="sect-t"><span class="sect-num">3</span>À vous — ${ech(apos(act.t))}</h3>`,
        { ...meta, garde: true });
      if (act.visuels) pousse(figure(act.visuels, act.legendes), meta);
      if (c.activite) for (const p of c.activite.paras) pousse(`<p class="txt">${ech(p)}</p>`, meta);
      pousse(lignes(act.lignes), meta);
      pousse(`<p class="voix"><span>À voix haute</span>« ${ech(apos(act.voixHaute))} »</p>`, meta);

      /* 4 — Les réponses */
      pousse(`<h3 class="sect-t"><span class="sect-num">4</span>Les réponses — corrigez-vous</h3>`,
        { ...meta, garde: true });
      for (const [i, q] of questions.entries()) {
        pousse(`<div class="rep"><p class="rep-l"><span class="rep-n">${i + 1}</span>
          <span class="rep-lettre">${String.fromCharCode(65 + q.bonne)}</span><b>${ech(q.choix[q.bonne])}</b></p>
          ${q.explication ? `<p class="rep-x">${ech(q.explication)}</p>` : ''}</div>`, meta);
      }
      const qc = qrDe(ch.num);
      pousse(`<div class="note">Ma note <span class="note-case"></span> / ${questions.length}
        <span class="note-desc">à reporter au bilan, en fin de livret</span></div>
        ${ecran(qc.slug, qc.cible.includes('capsule')
    ? 'Tout le chapitre, raconté à voix haute.'
    : 'Le chapitre en version interactive, avec ses questions corrigées.')}`, meta);
    }

    /* La planche centrale, après la partie C. */
    if (partie.id === 'C') {
      for (const face of [PLANCHE_CENTRALE.corrige, PLANCHE_CENTRALE.fantome]) {
        pousse(`<h2 class="page-t">${ech(apos(face.t))}</h2>${figure(face.visuels, face.legendes)}`,
          { seul: true, partie: partie.id });
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
        lignes: CHAPITRES.map((ch) => [String(ch.num), ch.titre, '__ / 6', '']),
      }), { nue: true });
    }
    if (p.id === 'index-codes') {
      const parCode = new Map();
      for (const ch of CHAPITRES) for (const code of ch.codes) {
        if (!parCode.has(code)) parCode.set(code, []);
        parCode.get(code).push(ch.num);
      }
      pousse(tableau({
        titre: 'Code → chapitre(s) du livret',
        entetes: ['Code', 'Ce qu’il exige', 'Chapitre(s)'],
        lignes: [...parCode.entries()].sort((a, b) => a[0].localeCompare(b[0], 'fr', { numeric: true }))
          .map(([code, nums]) => [code, libelleCode(code).slice(0, 110), nums.join(', ')]),
      }), { nue: true });
    }
    if (p.id === 'index-qr') {
      pousse(tableau({
        titre: 'Toutes les adresses, en clair',
        entetes: ['Chapitre', 'Adresse à taper'],
        lignes: QR.filter((e) => !e.lecon).map((e) => [`${e.chapitre}. ${e.titre}`, e.alias.replace('https://', '')]),
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
        des mots plus simples qu'eux.</p>`, { nue: true });
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
