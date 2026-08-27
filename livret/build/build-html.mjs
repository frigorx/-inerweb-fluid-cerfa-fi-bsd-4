/* =====================================================================
   LIVRET « HABILITATION FLUIDE » — GABARIT A5 : HTML PAGINÉ, PUIS PDF
   ---------------------------------------------------------------------
   La mise en page validée sur maquette (27/08/2026), appliquée au
   livret entier.

   La pagination est celle du navigateur — la seule qui sache couper un
   paragraphe proprement entre deux pages, donc la seule qui remplisse
   vraiment le papier. (Une pagination maison en pages de hauteur fixe a
   été essayée : elle laissait un tiers des pages à moitié vides, faute
   de pouvoir couper un paragraphe. Abandonnée.)

   Ce que le navigateur ne sait pas faire, en revanche, c'est écrire en
   haut de CHAQUE page la partie et le chapitre courants. Chaque bloc
   emporte donc un marqueur invisible, et finition.py lit ces marqueurs
   page à page pour dessiner le bandeau, le pied et le numéro dans les
   marges réservées.

   Ce que le CSS garantit : une planche, un encadré, une question, un
   bloc « À l'écran » ne se coupent jamais ; un titre n'est jamais seul
   en bas de page ; couverture, ouvertures de partie et planche centrale
   occupent leur page entière, sans bandeau.

   Sorties : dist/…-A5.html (autonome, images embarquées — version écran)
             dist/…-A5.pdf  (Chrome headless + finition — version papier)
   ===================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { construireFlux, TITRES_PARTIES, TITRES_CHAPITRES } from './pages.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ICI, '..', 'dist');
const NOM = 'inerWeb-Habilitation-Fluide-Tome1-Livret-eleve-A5';

const CSS = `
:root{
  --bleu:#1B3A63; --bleu2:#2f5689; --orange:#FF6B35; --logo:#e8914a;
  --txt:#1d2a38; --mut:#5a6b7d; --ligne:#d6dee7; --pale:#F4F7FA;
  --ok:#1e7e54; --ko:#c0392b;
  --page-h:210mm; --page-l:148mm;
  --marge-h:12mm; --marge-haut:11mm; --marge-bas:9mm;
  --bandeau-h:9mm; --pied-h:8mm;
}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{background:#e7ecf1;color:var(--txt);
  font:9.6pt/1.5 Calibri,"Segoe UI",system-ui,sans-serif;
  -webkit-print-color-adjust:exact;print-color-adjust:exact}

/* ---------- Le flux (écran) ---------- */
#livret{max-width:148mm;margin:0 auto;background:#fff;padding:14mm 12mm;
  box-shadow:0 3px 14px rgba(27,58,99,.16)}
.marq{font-size:1pt;line-height:0;color:#fff}

/* Rien ne se coupe au milieu : ni une planche, ni un encadré,
   ni une question et ses réponses, ni un bloc « À l'écran ». */
figure,.duo,.encadre,.q,.rep,.ecran,.tbl,.ch-tete,.ref,.note,.voix,.som-partie,
.remplir>.rl,.remplir>.trait{break-inside:avoid;page-break-inside:avoid}
h2,h3,h4,.sect-t,.lecon-t,.page-t,.sect-intro{break-after:avoid;page-break-after:avoid}
.rupture{break-before:page;page-break-before:always}
.seul{break-before:page;break-after:page;page-break-before:always;page-break-after:always}

/* ---------- Titres et texte ---------- */
.page-t{font:700 19pt/1.12 "Trebuchet MS",Calibri,sans-serif;color:var(--bleu);margin:0 0 5mm}
.txt{margin:0 0 2.6mm;text-align:justify;hyphens:auto}
.txt.petit{font-size:8.4pt;color:var(--mut);margin-bottom:1.4mm}
.txt.attente{color:var(--mut)}

.ch-tete{display:flex;gap:4.4mm;align-items:flex-start;margin-bottom:5mm}
.ch-num{font:700 40pt/.82 "Trebuchet MS",Calibri,sans-serif;color:var(--orange)}
.ch-titre{font:700 18pt/1.12 "Trebuchet MS",Calibri,sans-serif;color:var(--bleu);margin:0 0 2.4mm}
.ch-objectif{margin:0;font-style:italic;font-size:8.8pt}

.ref{border-left:2.4pt solid var(--bleu);background:var(--pale);
  padding:3.4mm 4.4mm;margin:0 0 5mm;border-radius:0 3px 3px 0}
.ref h3{font:700 9.4pt/1 "Trebuchet MS",Calibri,sans-serif;color:var(--bleu);margin:0 0 2.6mm}
.ref-l{margin:0 0 1.8mm;font-size:8pt;line-height:1.4;color:#2a3a4a}
.ref-code{display:inline-block;background:var(--bleu);color:#fff;font-weight:700;font-size:7pt;
  padding:.3mm 1.4mm;border-radius:2px;margin-right:1.4mm;vertical-align:.3mm}
.ref-p{color:var(--mut);font-size:7.4pt}

.sect-t{display:flex;align-items:center;gap:2.6mm;
  font:700 12.6pt/1.1 "Trebuchet MS",Calibri,sans-serif;color:var(--bleu);margin:0 0 2.6mm}
.sect-num{display:inline-flex;align-items:center;justify-content:center;width:6.4mm;height:6.4mm;
  border-radius:50%;background:var(--orange);color:#fff;font-size:8.4pt;flex:none}
.sect-intro{margin:0 0 3.4mm;color:var(--mut);font-size:8.4pt}

.lecon-t{display:flex;align-items:baseline;gap:2.6mm;
  font:700 12pt/1.15 "Trebuchet MS",Calibri,sans-serif;color:var(--bleu);margin:3mm 0 2.4mm}
.lecon-n{color:var(--orange);font-size:10pt}

/* ---------- Images ---------- */
/* Une planche est plafonnée en HAUTEUR, pas en largeur : au-delà, elle
   mangerait la moitié de la page et pousserait le texte plus loin qu'il
   ne faut. À 74 mm elle reste large et parfaitement lisible en A5. */
figure{margin:0 0 3.4mm}
figure img{width:100%;max-height:74mm;object-fit:contain;display:block;margin:0 auto;
  border:.6pt solid var(--ligne);border-radius:3px}
figure figcaption{margin-top:1.2mm;text-align:center;font-style:italic;font-size:7.6pt;color:var(--mut)}
.planche.haute img{width:auto;max-height:82mm}
.appoint{width:52%;margin-left:auto;margin-right:auto}
.appoint img{max-height:44mm}
.duo{display:flex;gap:4mm;margin:0 0 3.4mm}
.duo figure{margin:0;flex:1}
.duo img{max-height:56mm}

/* ---------- Encadrés ---------- */
.encadre{border-left:2.4pt solid var(--bleu);background:var(--pale);
  padding:3mm 4mm;margin:0 0 4mm;border-radius:0 3px 3px 0}
.encadre h4{font:700 9.2pt/1 "Trebuchet MS",Calibri,sans-serif;color:var(--bleu);margin:0 0 1.8mm}
.encadre p{margin:0 0 1.4mm;font-size:8.6pt}
.encadre ol{margin:0;padding-left:4.6mm;font-size:8.6pt}
.encadre li{margin-bottom:1mm}
.encadre.piege{border-left-color:var(--ko);background:#fbe7e4}
.encadre.piege h4{color:var(--ko)}

/* ---------- Questions ---------- */
.q{margin-bottom:3.4mm}
.q-e{margin:0 0 1.4mm;font-weight:600}
.q-n{display:inline-flex;align-items:center;justify-content:center;width:4.6mm;height:4.6mm;
  border:1pt solid var(--bleu);border-radius:50%;color:var(--bleu);font-size:7.2pt;font-weight:700;
  margin-right:2mm;vertical-align:.3mm}
.q-c{list-style:none;margin:0;padding:0 0 0 6.6mm}
.q-c li{display:flex;align-items:flex-start;gap:1.8mm;margin-bottom:.9mm;font-size:8.8pt}
.case{flex:none;width:2.8mm;height:2.8mm;border:.8pt solid var(--mut);border-radius:1.5px;margin-top:.8mm}
.lettre{flex:none;font-weight:700;color:var(--bleu);width:3.2mm}

.rep{margin-bottom:2.8mm}
.rep-l{margin:0 0 .8mm;font-size:8.8pt}
.rep-n{display:inline-flex;align-items:center;justify-content:center;width:4.6mm;height:4.6mm;
  border-radius:50%;background:var(--ok);color:#fff;font-size:7.2pt;font-weight:700;
  margin-right:2mm;vertical-align:.3mm}
.rep-lettre{font-weight:700;color:var(--ok);margin-right:1.6mm}
.rep-x{margin:0 0 0 6.6mm;font-size:8pt;color:var(--mut)}

.note{margin:4mm 0;border-top:.6pt solid var(--ligne);padding-top:2.4mm;
  font:700 9.6pt "Trebuchet MS",Calibri,sans-serif;color:var(--bleu)}
.note-case{display:inline-block;width:11mm;border-bottom:1pt dotted var(--mut);margin:0 1.2mm}
.note-desc{font:italic 7.8pt Calibri,sans-serif;color:var(--mut);margin-left:2.4mm}

/* ---------- À l'écran ---------- */
.ecran{display:flex;gap:3mm;align-items:center;background:#fff;
  border:.6pt solid var(--ligne);border-left:2.4pt solid var(--orange);
  border-radius:0 3px 3px 0;padding:2.2mm 3mm;margin:0 0 4mm}
.ecran-qr{width:14mm;height:14mm;flex:none}
.ecran-txt{display:flex;flex-direction:column;gap:.4mm}
.ecran-eti{font:700 6.6pt/1 "Trebuchet MS",Calibri,sans-serif;color:var(--orange);
  letter-spacing:.7px;text-transform:uppercase}
.ecran-url{font-weight:700;color:var(--bleu);font-size:9pt}
.ecran-desc{font-size:7.6pt;color:var(--mut)}

/* ---------- À remplir ---------- */
.remplir{margin:0 0 3mm}
.rl{margin:2.4mm 0 .8mm;font-size:9pt}
.trait{margin:0 0 1.4mm;border-bottom:.8pt dotted var(--mut);height:4.4mm}
.voix{margin:3mm 0 4mm;font-style:italic;font-size:9.2pt}
.voix span{display:block;font:700 7.4pt/1 "Trebuchet MS",Calibri,sans-serif;color:var(--orange);
  letter-spacing:.7px;text-transform:uppercase;margin-bottom:1mm;font-style:normal}

/* ---------- Tableaux ---------- */
.tbl{margin:0 0 4mm}
.tbl h4{font:700 9.4pt/1 "Trebuchet MS",Calibri,sans-serif;color:var(--bleu);margin:0 0 2mm}
table{width:100%;border-collapse:collapse;font-size:8pt}
th{background:var(--bleu);color:#fff;text-align:left;padding:1.4mm 2mm;font-weight:700}
td{padding:1.2mm 2mm;border-bottom:.5pt solid var(--ligne);vertical-align:top}
tbody tr:nth-child(even) td{background:#F7FAFC}

/* ---------- Sommaire ---------- */
.som-partie{margin-bottom:4mm}
.som-p{margin:0 0 1.6mm;font-size:9.6pt}
.som-p b{font-family:"Trebuchet MS",Calibri,sans-serif;color:var(--bleu)}
.som-p span{color:var(--mut);font-style:italic;font-size:8.4pt;margin-left:2mm}
.som-ch{display:flex;align-items:baseline;gap:2mm;margin:0 0 .9mm 4mm;font-size:9pt}
.som-n{display:inline-flex;align-items:center;justify-content:center;width:4.6mm;height:4.6mm;flex:none;
  border-radius:50%;background:var(--pale);color:var(--bleu);font-size:7pt;font-weight:700}
.som-url{margin-left:auto;font-size:7.4pt;color:var(--mut)}

/* ---------- Ouvertures ---------- */
.ouverture{height:172mm;display:flex;flex-direction:column;justify-content:center;
  align-items:center;text-align:center;padding:0 8mm}
.ouv-eti{font:700 11pt "Trebuchet MS",Calibri,sans-serif;color:var(--orange);letter-spacing:2px;
  text-transform:uppercase}
.ouv-t{font:700 30pt/1.1 "Trebuchet MS",Calibri,sans-serif;color:var(--bleu);margin:3mm 0 2mm}
.ouv-s{font-style:italic;color:var(--mut);font-size:11pt;margin:0 0 10mm}
.ouv-liste{display:flex;flex-direction:column;gap:2mm;font-size:9.4pt;color:var(--txt)}
.ouv-liste b{color:var(--orange);margin-right:1.4mm}

/* ---------- Couverture ---------- */
.couverture{height:172mm;display:flex;flex-direction:column;align-items:center;text-align:center;
  padding-top:4mm}
.couv-marque{display:flex;align-items:center;gap:1.6mm;margin-bottom:12mm}
.flocon{color:var(--bleu);font-size:14pt}
.iner{font:700 20pt "Trebuchet MS",Calibri,sans-serif;color:var(--bleu);
  border-bottom:1.6pt solid var(--logo)}
.web{font:20pt "Segoe Script","Brush Script MT",cursive;color:var(--bleu);
  border-bottom:1.6pt solid var(--logo);margin-left:-1mm}
.cartouche{background:var(--logo);color:#fff;font:700 10.4pt "Segoe UI",sans-serif;
  padding:1.6mm 3.4mm;border-radius:18px;margin-left:1.6mm}
.couv-titre h1{font:700 33pt/1.02 "Trebuchet MS",Calibri,sans-serif;color:var(--bleu);margin:0}
.couv-sous{font:700 12.6pt "Trebuchet MS",Calibri,sans-serif;color:var(--orange);margin:3mm 0 0}
.couv-illu{width:86%;margin:8mm 0;border-radius:5px}
.couv-bas{margin-top:auto;padding-bottom:6mm}
.couv-epreuve{margin:0 0 3.4mm;font-size:9.2pt;color:var(--mut);line-height:1.45}
.couv-cats{display:flex;gap:2mm;justify-content:center;margin:0 0 3.4mm}
.couv-cats span{background:var(--bleu);color:#fff;font:700 9.6pt "Trebuchet MS",Calibri,sans-serif;
  padding:1.2mm 3.2mm;border-radius:3px}
.couv-ref{margin:0 0 4mm;font-size:7.8pt;color:var(--mut)}
.couv-auteur{margin:0;font-size:8.8pt}

/* ---------- Impression ----------
   Les marges du haut et du bas sont plus larges que nécessaire : elles
   réservent la place du bandeau et du pied, dessinés à la finition. */
@page{size:148mm 210mm;margin:19mm 12mm 15mm}
@media print{
  body{background:#fff}
  #livret{max-width:none;margin:0;padding:0;box-shadow:none}
}`;

/* ------------------------------------------------------------------
   Le marqueur invisible que `finition.py` relit : la partie et le
   chapitre auxquels ce bloc appartient, ou NUE pour les pages qui ne
   veulent ni bandeau ni pied (couverture, ouvertures de partie).
   ------------------------------------------------------------------ */
const marqueur = (b) => {
  if (b.seul) return '<span class="marq">@@NUE@@</span>';
  if (!b.chapitre) return '<span class="marq">@@LIM@@</span>';
  return `<span class="marq">@@${b.partie}|${b.chapitre}@@</span>`;
};

const flux = construireFlux().filter((b) => b.html && b.html.trim());
const classes = (b) => [b.seul ? 'seul' : '', b.rupture ? 'rupture' : ''].filter(Boolean).join(' ');

const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<title>Habilitation Fluide — livret élève, tome 1</title>
<style>${CSS}</style></head>
<body>
<div id="livret">
${flux.map((b) => `<div class="${classes(b)}">${marqueur(b)}${b.html}</div>`).join('\n')}
</div>
</body></html>`;

fs.mkdirSync(DIST, { recursive: true });
const fichierHtml = path.join(DIST, `${NOM}.html`);
fs.writeFileSync(fichierHtml, html, 'utf8');

/* ---- Le PDF, par Chrome headless : même moteur, même pagination ---- */
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
let pdf = '(Chrome absent : pas de PDF)';
if (fs.existsSync(CHROME)) {
  const cible = path.join(DIST, `${NOM}.pdf`);
  execFileSync(CHROME, [
    '--headless', '--disable-gpu', '--no-pdf-header-footer',
    `--print-to-pdf=${cible}`, '--virtual-time-budget=30000',
    'file:///' + fichierHtml.replace(/\\/g, '/'),
  ], { stdio: 'ignore', timeout: 300000 });
  /* Bandeaux, pieds et numéros : ce que le navigateur ne sait pas poser. */
  try {
    execFileSync('python', [path.join(ICI, 'finition.py'), cible], { stdio: 'inherit', timeout: 180000 });
  } catch {
    console.warn('  (finition non appliquée : python/pymupdf indisponible)');
  }
  pdf = cible;
}

console.log('Gabarit A5 — livret élève');
console.log(`  ${flux.length} blocs de contenu · images embarquées (${(html.length / 1024 / 1024).toFixed(1)} Mo)`);
console.log(`\n✔ ${path.relative(process.cwd(), fichierHtml)}`);
console.log(`✔ ${pdf.endsWith('.pdf') ? path.relative(process.cwd(), pdf) : pdf}`);
