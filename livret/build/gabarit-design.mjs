/* =====================================================================
   LIVRET « inerweb.fr HabFluide » — LE GABARIT, POUR CLAUDE DESIGN
   ---------------------------------------------------------------------
   Ce que Claude Design doit recevoir : pas les 406 pages, mais les SEPT
   pages types qui décident de tout le reste, au format 6 × 9 exact, avec
   le vrai contenu et les vraies planches.

   Ce qu'on lui demande est écrit dans la page elle-même : ce qui est
   figé (charte, croix du frigoriste, 14 pt minimum, jamais de justifié)
   et ce qui est ouvert (grille, respiration, traitement des blocs).

   Ce qu'il retouchera se reporte ensuite dans `build-html.mjs`, qui
   fabrique le livre entier. Le gabarit ne remplace pas la chaîne : il
   lui dicte son habillage.

   `node build/gabarit-design.mjs` → gabarit-interieur.html (autonome,
   images réduites pour rester transportable).
   ===================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CHAPITRES } from './plan-chapitres.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const LIVRET = path.join(ICI, '..');
const CONTENU = JSON.parse(fs.readFileSync(path.join(LIVRET, 'contenu.gen.json'), 'utf8'));
const VISUELS = JSON.parse(fs.readFileSync(path.join(LIVRET, 'visuels.gen.json'), 'utf8'));
const QR = JSON.parse(fs.readFileSync(path.join(LIVRET, 'qr.gen.json'), 'utf8'));
const CHOISIES = JSON.parse(fs.readFileSync(path.join(LIVRET, 'questions-choisies.gen.json'), 'utf8'));
const KDP = JSON.parse(fs.readFileSync(path.join(LIVRET, 'kdp.gen.json'), 'utf8'));
const { LEXIQUE } = await import('./lexique.mjs');

/* Les images du gabarit sont fortement réduites : il sert à juger le
   PLACEMENT, pas à lire le détail des planches — et il doit rester assez
   léger pour voyager jusqu'à Claude Design. */
/* SANS_IMAGES=1 : les planches deviennent des cadres cotés, aux
   proportions exactes. Le gabarit tombe de 50 Ko à 15 et voyage sans
   peine — et l'on juge toujours ce qui compte : la place que prend une
   planche dans la page, et ce qu'il reste au texte. */
const CADRES = process.env.SANS_IMAGES === '1';
const petite = async (ref, largeur) => {
  const v = VISUELS[ref];
  if (CADRES) return null;
  const buf = await sharp(path.join(LIVRET, 'visuels.gen', v.fichier))
    .resize({ width: largeur, withoutEnlargement: true })
    .webp({ quality: 82 }).toBuffer();
  return 'data:image/webp;base64,' + buf.toString('base64');
};

/* Une planche : l'image si on l'a, sinon son cadre aux memes proportions. */
const planche = (ref, src, classe, legende) => {
  const v = VISUELS[ref];
  const dedans = src
    ? `<img src="${src}" alt="">`
    : `<div class="cadre" style="aspect-ratio:${v.largeur}/${v.hauteur}">
         <span>${ref}<br><i>${v.largeur} × ${v.hauteur}</i></span></div>`;
  return `<figure class="${classe}">${dedans}
    <figcaption>${legende}</figcaption></figure>`;
};
const qrPetit = async (slug) => {
  const e = QR.find((x) => x.slug === slug);
  if (CADRES) return null;
  const buf = await sharp(path.join(LIVRET, 'qr.gen', e.fichier))
    .resize({ width: 130 }).png({ compressionLevel: 9, palette: true, colours: 4 }).toBuffer();
  return 'data:image/png;base64,' + buf.toString('base64');
};

const ech = (s) => String(s).replace(/&(?![a-zA-Z]+;|#\d+;)/g, '&amp;').replace(/<(?!\/?(?:b|i)>)/g, '&lt;');
const apos = (s) => String(s).replace(
  /\b(jusqu|lorsqu|puisqu|quelqu|aujourd|[qQ]u|[dcjlmnstDCJLMNST])\s(?=[aeiouyhéèêëàâîïôûAEIOUYHÉÈÊÀÂÎÔ])/g, '$1’');

const CH = CHAPITRES.find((c) => c.num === 2);
const C = CONTENU.chapitres.find((c) => c.num === 2);
const QUESTIONS = (CHOISIES[2] || []).map((id) => C.questions.find((q) => q.id === id)).filter(Boolean);

const bandeau = () => `<header class="bandeau">
  <b>Partie A · SE PROTÉGER</b><span>Chapitre 2</span></header>`;
const pied = (n) => `<footer class="pied">
  <span class="pied-m">inerweb.fr · HabFluide, tome 1 · la théorie</span>
  <span class="pied-n">${n}</span></footer>`;

const page = (etiquette, corps, opts = {}) => `
<figure class="planche-gabarit">
  <figcaption>${etiquette}</figcaption>
  <div class="page${opts.nue ? ' nue' : ''}">
    ${opts.nue ? '' : bandeau()}
    <div class="corps">${corps}</div>
    ${opts.sansPied ? '' : pied(opts.n || 1)}
  </div>
</figure>`;

const construire = async () => {
  const lie = await petite('svg:lie-domaine', 460);
  const illuCl2 = await petite('illu:cl2', 240);
  const prp = await petite('svg:prp-echelle', 460);
  const qrLecon = await qrPetit('classes-3');

  const L = C.lecons[2];
  const LP = CH.lecons[2];

  const pages = [
    /* 1 — ouverture de chapitre */
    page('1 · Ouverture de chapitre — le référentiel, catégorie par catégorie', `
      <div class="ch-tete"><span class="ch-num">2</span>
        <div><h2 class="ch-titre">${ech(apos(CH.titre))}</h2>
        <p class="ch-objectif">${ech(apos(CH.objectif))}</p></div></div>
      <section class="ref"><h3>Ce que le référentiel exige ici</h3>
        <p class="ref-intro">Attestation d’aptitude fluides frigorigènes, épreuve théorique —
          catégories A1, A2, D, E. Chaque code indique les catégories qu’il concerne.</p>
        ${C.referentiel.slice(0, 3).map((r) => `<p class="ref-l"><span class="ref-code">${r.code}</span>${ech(r.libelle)}
          <span class="ref-cats">${r.catsT.length ? r.catsT.map((k) => `<span class="ref-cat">${k}</span>`).join('')
    : '<span class="ref-cat prat">épreuve pratique — tome 2</span>'}</span></p>`).join('')}
      </section>`, { n: 26 }),

    /* 2 — le QCM */
    page('2 · « Testez-vous d’abord » — le QCM, en haut de page, d’un seul tenant', `
      <h3 class="sect-t"><span class="sect-num">1</span>Testez-vous d’abord — 6 questions</h3>
      <p class="sect-intro">Répondez <b>avant</b> de lire : vous saurez tout de suite ce que vous savez déjà,
        et ce qui mérite votre lecture. Les corrections sont en fin de chapitre.</p>
      ${QUESTIONS.slice(0, 3).map((q, i) => `<div class="q"><p class="q-e"><span class="q-n">${i + 1}</span>${ech(q.enonce)}</p>
        <ul class="q-c${q.choix.every((x) => x.length <= 46) ? ' deux' : ''}">${q.choix.map((c, j) =>
    `<li><span class="case"></span><span class="lettre">${String.fromCharCode(65 + j)}</span>${ech(c)}</li>`).join('')}</ul></div>`).join('')}`,
    { n: 27 }),

    /* 3 — une leçon */
    page('3 · Une leçon — planche pleine largeur, texte, puis le lien vers l’écran', `
      <h4 class="lecon-t"><span class="lecon-n">2.3</span>${ech(apos(L.t))}</h4>
      ${planche('svg:lie-domaine', lie, 'planche', ech(apos(LP.legendes[0])))}
      <p class="txt">${ech(L.paras[0])}</p>
      <div class="ecran">${qrLecon ? `<img class="ecran-qr" src="${qrLecon}" alt="">`
    : '<div class="ecran-qr cadre"><span>QR</span></div>'}
        <div class="ecran-txt"><span class="ecran-eti">À l’écran</span>
          <span class="ecran-url">inerweb.fr/f/classes-3</span>
          <span class="ecran-desc">Cette leçon animée et racontée à voix haute.</span></div></div>`,
    { n: 34 }),

    /* 4 — les encadrés */
    page('4 · Les deux encadrés — « à retenir » et « geste interdit »', `
      ${planche('illu:cl2', illuCl2, 'appoint', 'On ne sent rien à la LIE')}
      <aside class="encadre cle"><h4>${ech(L.blocs[0].t)}</h4>
        ${(L.blocs[0].html.match(/<(?:p|li)>[\s\S]*?<\/(?:p|li)>/g) || []).slice(0, 2)
    .map((x) => `<p>${ech(x.replace(/<\/?(?:p|li)>/g, ''))}</p>`).join('')}</aside>
      <aside class="encadre piege"><h4>⚠ ${ech(L.blocs[1] ? L.blocs[1].t : 'Le geste interdit')}</h4>
        ${L.blocs[1] ? (L.blocs[1].html.match(/<p>[\s\S]*?<\/p>/g) || []).slice(0, 1)
    .map((x) => `<p>${ech(x.replace(/<\/?p>/g, ''))}</p>`).join('') : ''}</aside>`, { n: 35 }),

    /* 5 — l'activité */
    page('5 · « À vous » — l’activité à remplir et la phrase à dire à voix haute', `
      <h3 class="sect-t"><span class="sect-num">3</span>À vous — ${ech(apos(CH.activite.t))}</h3>
      ${planche('svg:prp-echelle', prp, 'planche', 'Ce que pèse chaque fluide')}
      <div class="remplir">${CH.activite.lignes.slice(0, 3).map((l) =>
    `<p class="rl">${ech(apos(String(l).replace(/\s*_{2,}\s*/g, ' … ').replace(/\s*[:—]?\s*…\s*$/, '')))}</p><p class="trait"></p>`).join('')}</div>
      <p class="voix"><span>À voix haute</span>« ${ech(apos(CH.activite.voixHaute))} »</p>`, { n: 38 }),

    /* 6 — les réponses */
    page('6 · « Les réponses » — la correction, en fin de chapitre', `
      <h3 class="sect-t"><span class="sect-num">4</span>Les réponses — corrigez-vous</h3>
      ${QUESTIONS.slice(0, 4).map((q, i) => `<div class="rep">
        <p class="rep-l"><span class="rep-n">${i + 1}</span>
        <span class="rep-lettre">${String.fromCharCode(65 + q.bonne)}</span><b>${ech(q.choix[q.bonne])}</b></p>
        ${q.explication ? `<p class="rep-x">${ech(q.explication)}</p>` : ''}</div>`).join('')}
      <div class="note">Ma note <span class="note-case"></span> / 6
        <span class="note-desc">à reporter au bilan, en fin de livret</span></div>`, { n: 40 }),

    /* 7 — le lexique */
    page('7 · Le lexique — terme en vedette, définition en retrait', `
      <h2 class="page-t">Lexique — le fluide et la machine</h2>
      ${LEXIQUE['lexique-1'].entrees.slice(0, 4).map(([t, d]) =>
    `<p class="lex"><b>${ech(t)}</b><span>${ech(d)}</span></p>`).join('')}`, { n: 353 }),

    /* 8 — l'ouverture de partie */
    page('8 · Ouverture de partie — page nue, sans bandeau ni pied', `
      <div class="ouverture"><span class="ouv-eti">Partie A</span>
        <h1 class="ouv-t">Se protéger</h1>
        <p class="ouv-s">ce qui peut vous blesser, avant tout le reste</p>
        <div class="ouv-liste"><span><b>1</b> Ce qui peut vous blesser</span>
          <span><b>2</b> Lire une classe de sécurité</span></div></div>`, { nue: true, sansPied: true }),
  ];

  /* Le gabarit emprunte le CSS du livre lui-même : ce qu'on règle ici est
     exactement ce qui s'applique aux 406 pages. On retire seulement les
     règles d'impression, sans objet dans une planche-contact. */
  const source = fs.readFileSync(path.join(ICI, 'build-html.mjs'), 'utf8');
  const debut = source.indexOf('const CSS = `') + 'const CSS = `'.length;
  const css = source.slice(debut, source.indexOf('}`;', debut) + 1)
    .replace(/@page\{[^}]*\}/, '')
    .replace(/@media print\{[\s\S]*?\n\}/, '')
    /* Le CSS du livre est un gabarit de chaîne : ses ${…} doivent être
       résolus ici, sinon la règle qui les porte est invalide et le
       navigateur retombe sur ses polices par défaut — en serif. */
    .replace("${POLICE_DYS && DYS ? POLICE_DYS : ''}", '')
    .replace('${CORPS_PT}', '14')
    .replace('${INTERLIGNE}', '1.55')
    .replace('${FAMILLE}', 'Calibri,"Segoe UI",system-ui,sans-serif');
  if (css.includes('${')) throw new Error('interpolation non résolue dans le CSS du gabarit');

  return `<meta charset="utf-8">
<title>inerweb.fr HabFluide — gabarit intérieur</title>
<style>
${css}
/* ---- Habillage du gabarit (n'existe pas dans le livre) ---- */
body{background:#e7ecf1;padding:26px;font-size:14px}
.entete{max-width:1180px;margin:0 auto 24px;background:#fff;border-radius:12px;padding:22px 26px;
  box-shadow:0 2px 12px rgba(27,58,99,.12)}
.entete h1{font:700 24px/1.25 "Trebuchet MS",sans-serif;color:var(--bleu);margin:0 0 8px}
.entete h2{font:700 15px/1.3 "Trebuchet MS",sans-serif;color:var(--orange);margin:16px 0 6px;
  text-transform:uppercase;letter-spacing:.5px}
.entete p{margin:0 0 8px;max-width:96ch;font-size:14px;line-height:1.55}
.entete ul{margin:0 0 8px;padding-left:20px;max-width:96ch}
.entete li{margin-bottom:5px;font-size:14px;line-height:1.5}
.entete b{color:var(--bleu)}
.grille{display:flex;flex-wrap:wrap;gap:26px;justify-content:center;max-width:1180px;margin:0 auto}
.planche-gabarit{margin:0}
.planche-gabarit figcaption{font:700 12px/1.3 "Trebuchet MS",sans-serif;color:var(--mut);
  text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;text-align:center;max-width:152.4mm}
/* La page, au format 6 x 9 exact. */
.page{width:152.4mm;height:228.6mm;background:#fff;position:relative;overflow:hidden;
  padding:13mm 19mm 16mm;box-shadow:0 4px 18px rgba(27,58,99,.2);display:flex;flex-direction:column}
.page .corps{flex:1;overflow:hidden}
.bandeau{display:flex;justify-content:space-between;align-items:baseline;
  border-bottom:1.6pt solid var(--orange);padding-bottom:1.4mm;margin-bottom:6mm}
.bandeau b{font:700 7.4pt/1 "Trebuchet MS",Calibri,sans-serif;color:var(--bleu);letter-spacing:.9px}
.bandeau span{font:700 7.4pt/1 "Trebuchet MS",Calibri,sans-serif;color:var(--orange)}
.pied{display:flex;justify-content:space-between;align-items:center;
  border-top:.6pt solid var(--ligne);padding-top:2mm;margin-top:auto}
.pied-m{font-size:6.8pt;color:var(--mut)}
.pied-n{display:inline-flex;align-items:center;justify-content:center;width:6.4mm;height:6.4mm;
  border-radius:50%;background:var(--bleu);color:#fff;font:700 7.6pt "Trebuchet MS",sans-serif}
.page.nue .corps{display:flex;align-items:center}
.ouverture{height:auto;width:100%}
.cadre{border:1.2pt dashed var(--ligne);border-radius:3px;background:#fafcfe;
  display:flex;align-items:center;justify-content:center;width:100%}
.cadre span{font:9pt/1.4 Calibri,sans-serif;color:#adbcc9;text-align:center}
.cadre i{font-size:8pt}
.ecran-qr.cadre{width:19mm;height:19mm;flex:none}
</style>

<div class="entete">
  <h1>inerweb.fr HabFluide — gabarit intérieur à habiller</h1>
  <p>Huit pages types au format <b>6 × 9 pouces exact</b> (152,4 × 228,6 mm), avec le vrai contenu
     et les vraies planches. Elles décident de l’habillage des <b>${KDP.pages} pages</b> du livre :
     ce qui est réglé ici est reporté dans le générateur, qui refabrique le livre entier.
     Le livre part en autoédition <b>Amazon KDP</b>.</p>

  <h2>Ce qui est figé — ne pas y toucher</h2>
  <ul>
    <li><b>Charte inerWeb</b> : bleu <code>#1B3A63</code>, orange <code>#FF6B35</code>,
        titres Trebuchet MS, corps Calibri. <b>Jamais de serif.</b></li>
    <li><b>Corps à 14 pt minimum</b>, tableaux compris — règle de la charte pour tout document
        élève, aucune tolérance. Le public est FLE, DYS et lecture fragile.</li>
    <li><b>Jamais de texte justifié</b> : les rivières de blanc gênent la lecture dyslexique.</li>
    <li><b>Aucun texte ne chevauche un tracé</b>, sur aucun schéma.</li>
    <li><b>Croix du frigoriste</b> : détendeur à gauche, compresseur à droite, condenseur en haut,
        évaporateur en bas.</li>
    <li>Marges latérales de <b>19 mm</b> : exigence de reliure KDP au-delà de 300 pages.</li>
    <li>Aucun thème sombre. L’impression se fait en noir et blanc.</li>
  </ul>

  <h2>Ce qui est ouvert — ce qu’on attend</h2>
  <ul>
    <li>La <b>grille et la respiration</b> : hiérarchie des titres, blancs, rythme de page.</li>
    <li>Le traitement des <b>quatre blocs récurrents</b> : le référentiel, les encadrés
        « à retenir » et « geste interdit », le bloc « À l’écran », les lignes à remplir.</li>
    <li>La <b>signalétique des sections</b> (pastilles numérotées) et du bandeau de repère.</li>
    <li>Le traitement des <b>planches techniques</b> : cadre, légende, place dans la page.</li>
  </ul>
</div>

<div class="grille">
${pages.join('\n')}
</div>
`;
};

const sortie = path.join(LIVRET, 'gabarit-interieur.html');
fs.writeFileSync(sortie, await construire(), 'utf8');
const ko = (fs.statSync(sortie).size / 1024).toFixed(0);
console.log(`✔ ${path.relative(process.cwd(), sortie)} — ${ko} Ko, 8 pages types au format 6 × 9`);
