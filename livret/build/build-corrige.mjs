/* =====================================================================
   LIVRET « HABILITATION FLUIDE » — CORRIGÉ FORMATEUR
   ---------------------------------------------------------------------
   Sixième maillon (`npm run corrige`). Le corrigé reprend EXACTEMENT
   les questions que le livret élève a posées — la liste écrite par
   `build-livret.mjs` dans `questions-choisies.gen.json` fait foi, il
   n'y a pas de second tirage. Pour chacune : la bonne réponse, et
   l'explication de la source.

   Document court, à l'usage du formateur seul : il ne reprend ni les
   leçons ni les visuels — le livret élève est le support commun.
   ===================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  AlignmentType, BorderStyle, Document, Footer, PageBreak, PageNumber,
  Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun,
} from 'docx';
import { CHAPITRES } from './plan-chapitres.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const LIVRET = path.join(ICI, '..');
const DIST = path.join(LIVRET, 'dist');
const CONTENU = JSON.parse(fs.readFileSync(path.join(LIVRET, 'contenu.gen.json'), 'utf8'));
const CHOISIES = JSON.parse(fs.readFileSync(path.join(LIVRET, 'questions-choisies.gen.json'), 'utf8'));

const BLEU = '1B3A63'; const ORANGE = 'FF6B35'; const MUT = '5A6B7D';
const OK_BG = 'E3F5EC'; const LIGNE = 'D6DEE7';
const TITRES = 'Trebuchet MS'; const CORPS = 'Calibri';
const PAGE = { width: 8391, height: 11906 }; const MARGE = 794;

const t = (texte, opts = {}) => new TextRun({ text: texte, font: CORPS, size: 21, ...opts });
const typo = (s) => String(s).replace(
  /\b(jusqu|lorsqu|puisqu|quelqu|aujourd|[qQ]u|[dcjlmnstDCJLMNST])\s(?=[aeiouyhéèêëàâîïôûAEIOUYHÉÈÊÀÂÎÔ])/g,
  '$1’',
);
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

const enfants = [
  new Paragraph({
    children: [t('Habilitation Fluide — tome 1', { font: TITRES, bold: true, size: 40, color: BLEU })],
    alignment: AlignmentType.CENTER, spacing: { before: 400, after: 100 },
  }),
  new Paragraph({
    children: [t('Corrigé formateur — questions d’entraînement', { font: TITRES, bold: true, size: 26, color: ORANGE })],
    alignment: AlignmentType.CENTER, spacing: { after: 200 },
  }),
  new Paragraph({
    children: [t('Document réservé au formateur. Les questions sont celles du livret élève, dans le même ordre. ' +
      'Aucune question officielle d’examen ne figure ici.', { size: 20, color: MUT, italics: true })],
    alignment: AlignmentType.CENTER, spacing: { after: 200 },
  }),
  new Paragraph({ children: [new PageBreak()] }),
];

let total = 0;
for (const ch of CHAPITRES) {
  const c = CONTENU.chapitres.find((x) => x.num === ch.num);
  const ids = CHOISIES[ch.num] || [];
  const questions = ids.map((id) => {
    const q = c.questions.find((x) => x.id === id);
    if (!q) throw new Error(`question ${id} absente du contenu du chapitre ${ch.num} — relancer npm run livret`);
    return q;
  });
  total += questions.length;

  enfants.push(new Paragraph({
    children: [t(`Chapitre ${ch.num} — ${typo(ch.titre)}`, { font: TITRES, bold: true, size: 24, color: BLEU })],
    spacing: { before: 260, after: 120 }, keepNext: true,
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: LIGNE } },
  }));

  for (const [qi, q] of questions.entries()) {
    enfants.push(new Paragraph({
      children: [t(`${qi + 1}. `, { bold: true }), ...runsDe(q.enonce), t(q.code ? `   (code ${q.code})` : '', { size: 17, color: MUT })],
      spacing: { before: 120, after: 60 }, keepNext: true,
    }));
    enfants.push(new Table({
      rows: [new TableRow({
        children: [new TableCell({
          children: [new Paragraph({
            children: [t(`✔ ${String.fromCharCode(65 + q.bonne)}.  `, { bold: true, color: '1E7E54', size: 20 }),
              ...runsDe(q.choix[q.bonne], { size: 20, bold: true })],
          })],
          shading: { type: ShadingType.CLEAR, fill: OK_BG },
          margins: { top: 70, bottom: 70, left: 120, right: 120 },
          borders: {
            top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
          },
        })],
      })],
      width: { size: 100, type: 'pct' },
    }));
    if (q.explication) {
      enfants.push(new Paragraph({
        children: [t('Pourquoi : ', { bold: true, size: 19, color: MUT }), ...runsDe(q.explication, { size: 19, color: MUT })],
        spacing: { before: 60, after: 100 },
      }));
    }
  }
}

const doc = new Document({
  creator: 'F. Henninot — inerWeb',
  title: 'Habilitation Fluide — corrigé formateur, tome 1',
  styles: { default: { document: { run: { font: CORPS, size: 21 } } } },
  sections: [{
    properties: { page: { size: PAGE, margin: { top: MARGE, bottom: MARGE, left: MARGE, right: MARGE } } },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          children: [t('inerWeb Fluide — corrigé formateur (ne pas diffuser aux stagiaires)        ', { size: 15, color: MUT }),
            new TextRun({ children: [PageNumber.CURRENT], font: CORPS, size: 15, color: MUT })],
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: LIGNE } },
        })],
      }),
    },
    children: enfants,
  }],
});

fs.mkdirSync(DIST, { recursive: true });
const docx = path.join(DIST, 'inerweb.fr-HabFluide-Tome1-Corrige-formateur-A5.docx');
fs.writeFileSync(docx, await Packer.toBuffer(doc));

const soffice = 'C:/Program Files/LibreOffice/program/soffice.exe';
if (fs.existsSync(soffice)) {
  execFileSync(soffice, ['--headless', '--convert-to', 'pdf', '--outdir', DIST, docx], { stdio: 'ignore', timeout: 180000 });
}

console.log(`Corrigé formateur — ${total} questions corrigées, mêmes tirages que le livret élève`);
console.log(`✔ ${path.relative(process.cwd(), docx)}${fs.existsSync(soffice) ? ' (+ PDF)' : ''}`);
