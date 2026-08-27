/* =====================================================================
   LIVRET « HABILITATION FLUIDE » — ASSEMBLEUR DOCX (LIVRET ÉLÈVE)
   ---------------------------------------------------------------------
   Cinquième maillon (`npm run livret`). Il assemble TOUT ce que les
   maillons précédents ont produit — contenu extrait, chapitre généré,
   visuels convertis, QR codes — en un document Word natif A5 (lib
   `docx`, jamais pandoc), puis en PDF si LibreOffice est présent.

   Règles tenues ici :
   · une page de contenu = au moins une illustration (garanti en amont
     par visuels.mjs — ici on pose ce que le plan désigne, sans trou) ;
   · les questions élève n'affichent JAMAIS la bonne réponse : la
     sélection est écrite dans `questions-choisies.gen.json` pour que
     le corrigé formateur reprenne exactement les mêmes ;
   · charte inerWeb : Trebuchet MS pour les titres, Calibri pour le
     corps, bleu #1B3A63, orange #FF6B35 — logo « Fluide » (§ 3.4).

   Sortie : dist/inerWeb-Habilitation-Fluide-Tome1-Livret-eleve-A5.docx
            (le Word ÉDITABLE ; le PDF d'impression vient du gabarit A5,
            build-html.mjs) + questions-choisies.gen.json
   ===================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import {
  AlignmentType, BorderStyle, Document, Footer, HeadingLevel, ImageRun,
  PageBreak, PageNumber, Packer, Paragraph, ShadingType, Table, TableCell,
  TableRow, TextRun, VerticalAlign, WidthType,
} from 'docx';
import { CHAPITRES, PARTIES, LIMINAIRES, FIN, PLANCHE_CENTRALE, QR_BASE } from './plan-chapitres.mjs';
import { TEXTES_LIMINAIRES, TEXTES_FIN, LIGNES_FIN } from './textes-liminaires.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const LIVRET = path.join(ICI, '..');
const DIST = path.join(LIVRET, 'dist');
const CONTENU = JSON.parse(fs.readFileSync(path.join(LIVRET, 'contenu.gen.json'), 'utf8'));
const VISUELS = JSON.parse(fs.readFileSync(path.join(LIVRET, 'visuels.gen.json'), 'utf8'));
const QR = JSON.parse(fs.readFileSync(path.join(LIVRET, 'qr.gen.json'), 'utf8'));
const SOURCE = process.env.PILOTE_FLUIDES || 'C:/git/pilote-fluides';
const REF = JSON.parse(fs.readFileSync(path.join(SOURCE, 'packs', 'fluides', 'referentiel-2025.json'), 'utf8'));

/* ------------------------- La charte ------------------------- */
const BLEU = '1B3A63'; const ORANGE = 'FF6B35'; const MUT = '5A6B7D';
const FOND_CLE = 'E9F0F7'; const FOND_PIEGE = 'FBE7E4'; const LIGNE = 'D6DEE7';
const TITRES = 'Trebuchet MS'; const CORPS = 'Calibri';

/* A5 en twips (1 mm = 56,693 twips), marges 14 mm. */
const PAGE = { width: 8391, height: 11906 };
const MARGE = 794;
/* Largeur utile en pixels à 96 dpi, pour dimensionner les images. */
const LARGEUR_PX = Math.round(((PAGE.width - 2 * MARGE) / 1440) * 96);

/* ------------------------- Petites briques ------------------------- */
const t = (texte, opts = {}) => new TextRun({ text: texte, font: CORPS, size: 21, ...opts });

/* Le plan écrit ses chaînes SANS apostrophes (« L air qui manque ») pour
   s'épargner l'échappement. On les restitue ici — et SEULEMENT sur les
   chaînes du plan : le contenu extrait a déjà les siennes, et les données
   du référentiel (« Article 4 point d uniquement ») ne doivent pas bouger. */
const typo = (s) => String(s).replace(
  /\b(jusqu|lorsqu|puisqu|quelqu|aujourd|[qQ]u|[dcjlmnstDCJLMNST])\s(?=[aeiouyhéèêëàâîïôûAEIOUYHÉÈÊÀÂÎÔ])/g,
  '$1’',
);

/* <b>/<i> → runs. Le contenu extrait ne porte rien de plus exotique
   dans ses paragraphes ; les listes des blocs sont traitées à part. */
const runsDe = (html, opts = {}) => {
  const morceaux = String(html).split(/(<\/?b>|<\/?i>)/);
  const runs = []; let gras = false; let ital = false;
  for (const m of morceaux) {
    if (m === '<b>') gras = true; else if (m === '</b>') gras = false;
    else if (m === '<i>') ital = true; else if (m === '</i>') ital = false;
    else if (m) {
      const texte = m.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
      if (texte) runs.push(t(texte, { bold: gras, italics: ital, ...opts }));
    }
  }
  return runs;
};

const para = (html, opts = {}) => new Paragraph({
  children: runsDe(html, opts.runs || {}),
  spacing: { after: 140, line: 276 },
  alignment: AlignmentType.JUSTIFIED,
  ...opts,
});

const titre = (texte, niveau, opts = {}) => new Paragraph({
  children: [t(typo(texte), { font: TITRES, bold: true, color: BLEU, size: niveau === 1 ? 34 : niveau === 2 ? 27 : 23 })],
  spacing: { before: niveau === 1 ? 0 : 260, after: 140 },
  keepNext: true,
  ...opts,
});

const saut = () => new Paragraph({ children: [new PageBreak()] });

const image = (ref, largeurPx) => {
  const v = VISUELS[ref];
  if (!v) throw new Error(`visuel « ${ref} » absent du manifeste — relancer npm run visuels`);
  const l = Math.min(largeurPx, LARGEUR_PX);
  const h = Math.round((l * v.hauteur) / v.largeur);
  return new ImageRun({
    type: 'png',
    data: fs.readFileSync(path.join(LIVRET, 'visuels.gen', v.fichier)),
    transformation: { width: l, height: h },
  });
};

const legende = (texte) => new Paragraph({
  children: [t(typo(texte), { size: 17, color: MUT, italics: true })],
  alignment: AlignmentType.CENTER,
  spacing: { after: 160 },
});

/* Un ou deux visuels avec leurs légendes. Deux → côte à côte — SAUF si
   l'un est une planche technique (`svg:`) : une diapositive dense en
   demi-largeur est illisible, elle passe donc toujours pleine page. */
const visuels = (refs, legendes = []) => {
  const sortie = [];
  if (refs.length >= 2 && refs.some((r) => r.startsWith('svg:'))) {
    for (const [i, r] of refs.entries()) {
      sortie.push(new Paragraph({ children: [image(r, r.startsWith('svg:') ? LARGEUR_PX : Math.round(LARGEUR_PX * 0.55))], alignment: AlignmentType.CENTER, keepNext: true }));
      if (legendes[i]) sortie.push(legende(legendes[i]));
    }
    return sortie;
  }
  if (refs.length >= 2) {
    const cellule = (i) => new TableCell({
      children: [
        new Paragraph({ children: [image(refs[i], Math.round(LARGEUR_PX / 2) - 14)], alignment: AlignmentType.CENTER }),
        ...(legendes[i] ? [legende(legendes[i])] : []),
      ],
      borders: SANS_BORD, verticalAlign: VerticalAlign.TOP,
      width: { size: 50, type: WidthType.PERCENTAGE },
    });
    sortie.push(new Table({
      rows: [new TableRow({ children: [cellule(0), cellule(1)] })],
      width: { size: 100, type: WidthType.PERCENTAGE },
    }));
    sortie.push(new Paragraph({ spacing: { after: 60 } }));
  } else if (refs.length === 1) {
    sortie.push(new Paragraph({ children: [image(refs[0], LARGEUR_PX)], alignment: AlignmentType.CENTER, keepNext: true }));
    if (legendes[0]) sortie.push(legende(legendes[0]));
  }
  return sortie;
};

const SANS_BORD = {
  top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
  left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
};

/* Un encadré plein-largeur (bloc « à retenir » ou « piège »). Le HTML
   des blocs porte des <p> et des <ol>/<ul> : on les déroule. */
const encadre = (bloc) => {
  const piege = bloc.type === 'piege';
  const enfants = [new Paragraph({
    children: [t(piege ? `⚠ ${bloc.t}` : bloc.t, { font: TITRES, bold: true, size: 21, color: piege ? 'C0392B' : BLEU })],
    spacing: { after: 80 },
  })];
  const corps = String(bloc.html);
  const items = corps.match(/<li>[\s\S]*?<\/li>/g);
  for (const p of corps.replace(/<[ou]l>[\s\S]*?<\/[ou]l>/g, '').match(/<p>[\s\S]*?<\/p>/g) || []) {
    enfants.push(new Paragraph({ children: runsDe(p, { size: 20 }), spacing: { after: 80 } }));
  }
  for (const [i, li] of (items || []).entries()) {
    enfants.push(new Paragraph({
      children: [t(`${i + 1}.  `, { bold: true, size: 20 }), ...runsDe(li, { size: 20 })],
      spacing: { after: 60 }, indent: { left: 200 },
    }));
  }
  return [new Table({
    rows: [new TableRow({
      cantSplit: true,
      children: [new TableCell({
        children: enfants,
        shading: { type: ShadingType.CLEAR, fill: piege ? FOND_PIEGE : FOND_CLE },
        margins: { top: 140, bottom: 100, left: 160, right: 160 },
        borders: SANS_BORD,
      })],
    })],
    width: { size: 100, type: WidthType.PERCENTAGE },
  }), new Paragraph({ spacing: { after: 120 } })];
};

/* Un tableau de données (chapitre généré). */
const tableauDe = (tb) => {
  const entete = new TableRow({
    tableHeader: true,
    children: tb.entetes.map((e) => new TableCell({
      children: [new Paragraph({ children: [t(e, { bold: true, color: 'FFFFFF', size: 19 })] })],
      shading: { type: ShadingType.CLEAR, fill: BLEU },
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
    })),
  });
  const lignes = tb.lignes.map((l, i) => new TableRow({
    cantSplit: true,
    children: l.map((c) => new TableCell({
      children: [new Paragraph({ children: runsDe(String(c), { size: 19 }) })],
      shading: i % 2 ? { type: ShadingType.CLEAR, fill: 'F4F7FA' } : undefined,
      margins: { top: 50, bottom: 50, left: 100, right: 100 },
    })),
  }));
  return [
    new Paragraph({ children: [t(tb.titre, { font: TITRES, bold: true, size: 21, color: BLEU })], spacing: { before: 120, after: 80 }, keepNext: true }),
    new Table({ rows: [entete, ...lignes], width: { size: 100, type: WidthType.PERCENTAGE } }),
    new Paragraph({ spacing: { after: 140 } }),
  ];
};

/* Une ligne à remplir : son libellé, puis un trait d'écriture. */
const ligneAremplir = (texte) => {
  const libelle = typo(texte.replace(/\s*_{2,}\s*/g, ' … ').replace(/\s*[:—]?\s*…\s*$/, ''));
  return [
    new Paragraph({ children: runsDe(libelle, { size: 21 }), spacing: { before: 120, after: 40 }, keepNext: true }),
    new Paragraph({
      border: { bottom: { style: BorderStyle.DOTTED, size: 6, color: MUT } },
      spacing: { after: 60 },
    }),
  ];
};

/* ------------------------- Le logo ------------------------- */
const logoPng = async (mot) => {
  const w = Math.max(56, Math.round(mot.length * 7 + 38));
  const vb = 160 + w;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vb} 50" width="${vb * 6}" height="300">` +
    `<text fill="#1b3a63" font-size="28px" x="4" y="34">❄</text>` +
    `<text fill="#1b3a63" font-family="Trebuchet MS, Trebuchet, sans-serif" font-size="26px" font-weight="bold" x="44" y="32">iner</text>` +
    `<text fill="#1b3a63" font-family="Segoe Script, Brush Script MT, cursive" font-size="26px" x="94" y="32">Web</text>` +
    `<line stroke="#e8914a" stroke-width="2" x1="44" x2="150" y1="35" y2="35"/>` +
    `<rect fill="#e8914a" x="155" y="10" rx="5" ry="5" width="${w}" height="24"/>` +
    `<text fill="#ffffff" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="14px" font-weight="bold" x="${155 + w / 2}" y="27" text-anchor="middle">${mot}</text>` +
    `</svg>`;
  return { data: await sharp(Buffer.from(svg), { density: 300 }).png().toBuffer(), ratio: 50 / vb };
};

/* ------------------------- Sélection des questions ------------------------- */
/* Six par chapitre, déterministe : on couvre d'abord chaque code du
   chapitre, puis on complète dans l'ordre des identifiants. La liste
   est écrite sur disque : le corrigé formateur reprend LA MÊME. */
const SELECTION = {};
/* Une explication qui ne dit rien de plus que « retenez la formulation »
   n'apprend rien sur papier : à question égale, on prend celle qui
   explique vraiment. (25 des 180 questions de la banque sont dans ce
   cas — signalé à F. Henninot pour la source.) */
const creuse = (q) => /Retenez la notion-clé/.test(q.explication || '') || !q.explication;
const choisirQuestions = (ch) => {
  const pool = [...ch.questions].sort((a, b) =>
    (creuse(a) - creuse(b))
    || String(a.code || '').localeCompare(String(b.code || ''))
    || String(a.id).localeCompare(String(b.id)));
  const prises = []; const codesVus = new Set();
  for (const q of pool) {
    if (prises.length >= 6) break;
    if (q.code && codesVus.has(q.code)) continue;
    prises.push(q); if (q.code) codesVus.add(q.code);
  }
  for (const q of pool) {
    if (prises.length >= 6) break;
    if (!prises.includes(q)) prises.push(q);
  }
  SELECTION[ch.num] = prises.map((q) => q.id);
  return prises;
};

/* ------------------------- Les pages ------------------------- */
const qrDe = (num) => QR.find((e) => e.chapitre === num && !e.lecon);
const qrLeconDe = (num, lecon) => QR.find((e) => e.chapitre === num && e.lecon === lecon);

/* La ligne « voir à l'écran » d'une leçon : petit QR + adresse en clair.
   Insécable, collée à ce qui précède. */
const ligneEcran = (qr) => new Table({
  rows: [new TableRow({
    cantSplit: true,
    children: [
      new TableCell({
        children: [new Paragraph({
          children: [new ImageRun({ type: 'png', data: fs.readFileSync(path.join(LIVRET, 'qr.gen', qr.fichier)), transformation: { width: 52, height: 52 } })],
        })],
        borders: SANS_BORD, width: { size: 64, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER,
      }),
      new TableCell({
        children: [
          new Paragraph({
            children: [
              t('À l’écran : ', { size: 18, color: MUT }),
              t(qr.alias.replace('https://', ''), { bold: true, size: 18, color: BLEU }),
              t(qr.cible.includes('capsule') ? '  —  cette leçon animée et racontée à voix haute.' : '  —  la fiche interactive, avec sa question corrigée.', { size: 18, color: MUT }),
            ],
          }),
        ],
        borders: SANS_BORD, verticalAlign: VerticalAlign.CENTER, margins: { left: 120 },
      }),
    ],
  })],
  width: { size: 100, type: WidthType.PERCENTAGE },
});
const contenuDe = (num) => CONTENU.chapitres.find((c) => c.num === num);
const chapitresDe = (partie) => CHAPITRES.filter((c) => c.partie === partie);

/* Libellé d'un code du référentiel, pour l'index. */
const libelleCode = (() => {
  const idx = new Map();
  for (const g of REF.groupes) for (const c of g.codes || []) idx.set(c.code, c.libelle);
  return (code) => idx.get(code) || '';
})();

const construire = async () => {
  const logo = await logoPng('HabFluide');
  const enfants = [];

  /* ---------- Couverture ---------- */
  const couv = LIMINAIRES.find((p) => p.id === 'couverture');
  enfants.push(
    new Paragraph({
      children: [new ImageRun({ type: 'png', data: logo.data, transformation: { width: 220, height: Math.round(220 * logo.ratio) } })],
      alignment: AlignmentType.CENTER, spacing: { before: 500, after: 500 },
    }),
    new Paragraph({
      children: [t('Habilitation Fluide', { font: TITRES, bold: true, size: 64, color: BLEU })],
      alignment: AlignmentType.CENTER, spacing: { after: 100 },
    }),
    new Paragraph({
      children: [t('Livret élève — tome 1 : la théorie', { font: TITRES, size: 30, color: ORANGE, bold: true })],
      alignment: AlignmentType.CENTER, spacing: { after: 400 },
    }),
    new Paragraph({ children: [image(couv.visuels[0], Math.round(LARGEUR_PX * 0.9))], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
    new Paragraph({
      children: [t('Préparation à l\u2019épreuve théorique de l\u2019attestation d\u2019aptitude fluides frigorigènes', { size: 22, color: MUT })],
      alignment: AlignmentType.CENTER, spacing: { after: 60 },
    }),
    new Paragraph({
      children: [t(`Catégories ${CONTENU.categories.join(' · ')}`, { font: TITRES, bold: true, size: 24, color: BLEU })],
      alignment: AlignmentType.CENTER, spacing: { after: 60 },
    }),
    new Paragraph({
      children: [t('Arrêté du 21 novembre 2025 · règlement (UE) 2024/573', { size: 19, color: MUT })],
      alignment: AlignmentType.CENTER, spacing: { after: 300 },
    }),
    new Paragraph({
      children: [t('F. Henninot, enseignant en filière froid et climatisation', { size: 21 })],
      alignment: AlignmentType.CENTER,
    }),
    saut(),
  );

  /* ---------- Liminaires ---------- */
  for (const p of LIMINAIRES) {
    if (p.id === 'couverture') continue;
    if (p.id === 'sommaire') {
      enfants.push(titre('Sommaire', 1));
      for (const partie of PARTIES) {
        enfants.push(new Paragraph({
          children: [t(`Partie ${partie.id} — ${partie.titre}`, { font: TITRES, bold: true, size: 23, color: BLEU }),
            t(`   ${typo(partie.sous)}`, { size: 19, color: MUT, italics: true })],
          spacing: { before: 180, after: 60 },
        }));
        for (const ch of chapitresDe(partie.id)) {
          enfants.push(new Paragraph({
            children: [t(`${ch.num}.  ${typo(ch.titre)}`, { size: 21 }),
              t(`   ·  inerweb.fr/f/${ch.qr}`, { size: 17, color: MUT })],
            indent: { left: 320 }, spacing: { after: 40 },
          }));
        }
      }
      enfants.push(...visuels(p.visuels, p.legendes), saut());
      continue;
    }
    enfants.push(titre(p.t, 1));
    for (const texte of TEXTES_LIMINAIRES[p.id] || []) enfants.push(para(texte));
    enfants.push(...visuels(p.visuels, p.legendes));
    for (const l of LIGNES_FIN[p.id] || []) enfants.push(...ligneAremplir(l));
    enfants.push(saut());
  }

  /* ---------- Les parties et leurs chapitres ---------- */
  for (const partie of PARTIES) {
    enfants.push(
      new Paragraph({ spacing: { before: 2600 } }),
      new Paragraph({
        children: [t(`Partie ${partie.id}`, { font: TITRES, bold: true, size: 30, color: ORANGE })],
        alignment: AlignmentType.CENTER, spacing: { after: 120 },
      }),
      new Paragraph({
        children: [t(partie.titre, { font: TITRES, bold: true, size: 48, color: BLEU })],
        alignment: AlignmentType.CENTER, spacing: { after: 120 },
      }),
      new Paragraph({
        children: [t(typo(partie.sous), { size: 24, color: MUT, italics: true })],
        alignment: AlignmentType.CENTER,
      }),
      saut(),
    );

    for (const ch of chapitresDe(partie.id)) {
      const c = contenuDe(ch.num);
      /* Tête de chapitre. */
      enfants.push(
        new Paragraph({
          children: [t(`Chapitre ${ch.num}`, { font: TITRES, bold: true, size: 22, color: ORANGE })],
          spacing: { after: 40 },
        }),
        titre(ch.titre, 1),
        para(`<b>Objectif :</b> ${typo(ch.objectif)}`, { runs: { italics: true, size: 20 } }),
      );

      /* 1. Ce que le référentiel exige — le texte officiel, code par
         code. La raison d'être du livret : ne rien oublier. */
      if (c.referentiel?.length) {
        enfants.push(new Table({
          rows: [new TableRow({
            children: [new TableCell({
              children: [
                new Paragraph({
                  children: [t('Ce que le référentiel exige ici', { font: TITRES, bold: true, size: 20, color: BLEU })],
                  spacing: { after: 70 },
                }),
                ...c.referentiel.map((r) => new Paragraph({
                  children: [
                    t(`${r.code}  `, { bold: true, size: 18, color: BLEU }),
                    ...runsDe(r.libelle, { size: 18 }),
                    t(r.theorie ? '' : '   (évalué en pratique — tome 2 ; expliqué ici en théorie)', { size: 16, color: MUT, italics: true }),
                  ],
                  spacing: { after: 50 },
                })),
              ],
              shading: { type: ShadingType.CLEAR, fill: 'F4F7FA' },
              margins: { top: 120, bottom: 90, left: 150, right: 150 },
              borders: SANS_BORD,
            })],
          })],
          width: { size: 100, type: WidthType.PERCENTAGE },
        }), new Paragraph({ spacing: { after: 140 } }));
      }

      /* 2. Les questions AVANT la lecture : chacun se juge d'abord —
         inutile de tout relire quand on sait déjà. Corrections en fin
         de chapitre. */
      const questions = choisirQuestions(c);
      enfants.push(
        titre(`Testez-vous d'abord — ${questions.length} questions`, 2),
        para(`Répondez <b>avant</b> de lire : vous saurez tout de suite ce que vous savez déjà, et ce qui ` +
          `mérite votre lecture. Les corrections sont en fin de chapitre.`, { runs: { size: 20, color: MUT } }),
      );
      for (const [qi, q] of questions.entries()) {
        enfants.push(new Paragraph({
          children: [t(`${qi + 1}. `, { bold: true }), ...runsDe(q.enonce)],
          spacing: { before: 120, after: 60 }, keepNext: true, keepLines: true,
        }));
        for (const [ci, choix] of q.choix.entries()) {
          enfants.push(new Paragraph({
            children: [t(`☐  ${String.fromCharCode(65 + ci)}.  `, { size: 20 }), ...runsDe(choix, { size: 20 })],
            indent: { left: 280 }, spacing: { after: 30 }, keepLines: true,
            keepNext: ci < q.choix.length - 1,
          }));
        }
      }

      /* 3. Les leçons — chacune se termine par son QR vers la version
         interactive : l'animation, la voix, la correction. */
      for (const [i, l] of (ch.lecons || (c.lecons.map((x) => ({ t: x.t })))).entries()) {
        const lc = c.lecons[i];
        enfants.push(titre(`${ch.num}.${i + 1} — ${lc.t}`, 2));
        if (l.visuels) enfants.push(...visuels(l.visuels, l.legendes));
        for (const p of lc.paras) enfants.push(para(p));
        if (lc.tableau) enfants.push(...tableauDe(lc.tableau));
        for (const b of lc.blocs) enfants.push(...encadre(b));
        const qrl = qrLeconDe(ch.num, i + 1);
        if (qrl) enfants.push(ligneEcran(qrl), new Paragraph({ spacing: { after: 100 } }));
      }

      /* 4. L'activité. */
      const act = ch.activite;
      enfants.push(titre(`À vous — ${act.t}`, 2));
      enfants.push(...visuels(act.visuels, act.legendes));
      if (c.activite) for (const p of c.activite.paras) enfants.push(para(p));
      for (const l of act.lignes) enfants.push(...ligneAremplir(l));
      enfants.push(new Paragraph({
        children: [t('À voix haute : ', { font: TITRES, bold: true, size: 20, color: ORANGE }),
          t(`« ${typo(act.voixHaute)} »`, { italics: true, size: 21 })],
        spacing: { before: 160, after: 200 },
      }));

      /* 5. Les corrections des questions du début. */
      enfants.push(titre('Les réponses — corrigez-vous', 2));
      for (const [qi, q] of questions.entries()) {
        enfants.push(new Paragraph({
          children: [
            t(`${qi + 1} → ${String.fromCharCode(65 + q.bonne)}.  `, { bold: true, size: 20, color: '1E7E54' }),
            ...runsDe(q.choix[q.bonne], { size: 20, bold: true }),
          ],
          spacing: { before: 90, after: 40 }, keepNext: !!q.explication, keepLines: true,
        }));
        if (q.explication) {
          enfants.push(new Paragraph({
            children: runsDe(q.explication, { size: 18, color: MUT }),
            indent: { left: 280 }, spacing: { after: 60 },
          }));
        }
      }
      enfants.push(new Paragraph({
        children: [t(`Ma note : ______ / ${questions.length} — à reporter au bilan de fin de livret.`, { size: 20, color: MUT, italics: true })],
        spacing: { before: 120, after: 160 },
      }));

      /* Le pont vers l'écran. */
      const qr = qrDe(ch.num);
      enfants.push(new Table({
        rows: [new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              children: [new Paragraph({
                children: [new ImageRun({ type: 'png', data: fs.readFileSync(path.join(LIVRET, 'qr.gen', qr.fichier)), transformation: { width: 92, height: 92 } })],
              })],
              borders: SANS_BORD, width: { size: 110, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER,
            }),
            new TableCell({
              children: [
                new Paragraph({ children: [t('Poursuivre à l\u2019écran', { font: TITRES, bold: true, size: 21, color: BLEU })], spacing: { after: 50 } }),
                new Paragraph({ children: [t(qr.alias.replace('https://', ''), { bold: true, size: 21, color: ORANGE })], spacing: { after: 50 } }),
                new Paragraph({ children: [t(qr.cible.includes('capsule') ? 'Le chapitre raconté à voix haute, avec ses animations.' : 'La fiche interactive du chapitre, avec ses questions corrigées.', { size: 19, color: MUT })] }),
              ],
              borders: SANS_BORD, verticalAlign: VerticalAlign.CENTER,
              margins: { left: 160 },
            }),
          ],
        })],
        width: { size: 100, type: WidthType.PERCENTAGE },
      }), saut());
    }

    /* La planche centrale, entre « Savoir » (C) et « Les organes » (D). */
    if (partie.id === 'C') {
      for (const face of [PLANCHE_CENTRALE.corrige, PLANCHE_CENTRALE.fantome]) {
        enfants.push(titre(face.t, 1), ...visuels(face.visuels, face.legendes), saut());
      }
    }
  }

  /* ---------- Pages de fin ---------- */
  for (const p of FIN) {
    enfants.push(titre(p.t, 1));
    for (const texte of TEXTES_FIN[p.id] || []) enfants.push(para(texte));

    if (p.id === 'bilan') {
      enfants.push(...tableauDe({
        titre: 'Chapitre par chapitre',
        entetes: ['Ch.', 'Titre', 'Ma note', 'À reprendre ?'],
        lignes: CHAPITRES.map((ch) => [String(ch.num), typo(ch.titre), '__ / 6', '']),
      }));
    }
    if (p.id === 'index-codes') {
      const parCode = new Map();
      for (const ch of CHAPITRES) for (const code of ch.codes) {
        if (!parCode.has(code)) parCode.set(code, []);
        parCode.get(code).push(ch.num);
      }
      enfants.push(...tableauDe({
        titre: 'Code → chapitre(s) du livret',
        entetes: ['Code', 'Ce qu\u2019il exige', 'Chapitre(s)'],
        lignes: [...parCode.entries()].sort((a, b) => a[0].localeCompare(b[0], 'fr', { numeric: true }))
          .map(([code, nums]) => [code, libelleCode(code).slice(0, 90), nums.join(', ')]),
      }));
    }
    if (p.id === 'index-qr') {
      enfants.push(...tableauDe({
        titre: 'Toutes les adresses, en clair',
        entetes: ['Chapitre', 'Adresse à taper'],
        lignes: QR.map((e) => [`${e.chapitre}. ${typo(e.titre)}`, e.alias.replace('https://', '')]),
      }));
    }
    if (p.id === 'sources') {
      enfants.push(
        para(`<b>${REF.source.texte}</b> — ${REF.source.publication}.`),
        ...REF.source.fondement_ue.map((f) => para(`· ${f}`, { runs: { size: 20 } })),
        para(`Application élève et capsules : <b>inerweb.fr</b>.`),
      );
    }
    if (p.id.startsWith('lexique')) {
      enfants.push(para(`<i>Page préparée pour la relecture : le lexique se remplit avec F. Henninot au bon à tirer.</i>`, { runs: { color: MUT } }));
    }
    for (const l of LIGNES_FIN[p.id] || []) enfants.push(...ligneAremplir(l));
    enfants.push(...visuels(p.visuels, p.legendes), saut());
  }

  /* ---------- Le document ---------- */
  const doc = new Document({
    creator: 'F. Henninot — inerWeb',
    title: 'Habilitation Fluide — livret élève, tome 1 : la théorie',
    styles: { default: { document: { run: { font: CORPS, size: 21 } } } },
    sections: [{
      properties: {
        page: { size: { width: PAGE.width, height: PAGE.height }, margin: { top: MARGE, bottom: MARGE, left: MARGE, right: MARGE } },
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            children: [
              t('inerWeb Fluide — Habilitation, tome 1', { size: 15, color: MUT }),
              t('        ', { size: 15 }),
              new TextRun({ children: [PageNumber.CURRENT], font: CORPS, size: 15, color: MUT }),
            ],
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: LIGNE } },
          })],
        }),
      },
      children: enfants,
    }],
  });

  fs.mkdirSync(DIST, { recursive: true });
  const docx = path.join(DIST, 'inerWeb-Habilitation-Fluide-Tome1-Livret-eleve-A5.docx');
  fs.writeFileSync(docx, await Packer.toBuffer(doc));
  fs.writeFileSync(path.join(LIVRET, 'questions-choisies.gen.json'), JSON.stringify(SELECTION, null, 1), 'utf8');

  /* Pas de conversion PDF ici : le PDF de référence est celui du
     gabarit A5 (`build-html.mjs`), au même nom de fichier. Ce Word est
     la sortie ÉDITABLE — celle qu'on ouvre pour retoucher un mot avant
     une séance, pas celle qu'on envoie à l'imprimeur. */

  console.log('Livret élève — tome 1 (Word, sortie éditable)\n');
  console.log(`  ${CHAPITRES.length} chapitres · ${LIMINAIRES.length} liminaires · ${FIN.length} pages de fin · planche centrale`);
  console.log(`  questions élève : ${Object.values(SELECTION).flat().length} (6 max/chapitre, liste écrite pour le corrigé)`);
  console.log(`\n✔ ${path.relative(process.cwd(), docx)}`);
};

await construire();
