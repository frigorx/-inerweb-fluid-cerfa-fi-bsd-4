/* =====================================================================
   LIVRET « HABILITATION FLUIDE » — MAQUETTE DE MISE EN PAGE
   ---------------------------------------------------------------------
   Pas un maillon de la chaîne : une PROPOSITION à valider avant de
   refaire la mise en page du DOCX. Elle montre quatre pages réelles
   (contenu, visuels et QR véritables — aucun faux texte) au format A5
   exact, dans la direction graphique proposée.

   `node build/maquette.mjs` → maquette-mise-en-page.html (autonome,
   images embarquées : le fichier s'ouvre et se partage seul).
   ===================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHAPITRES, PARTIES } from './plan-chapitres.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const LIVRET = path.join(ICI, '..');
const CONTENU = JSON.parse(fs.readFileSync(path.join(LIVRET, 'contenu.gen.json'), 'utf8'));
const VISUELS = JSON.parse(fs.readFileSync(path.join(LIVRET, 'visuels.gen.json'), 'utf8'));
const QR = JSON.parse(fs.readFileSync(path.join(LIVRET, 'qr.gen.json'), 'utf8'));

const b64 = (fichier, dossier) =>
  'data:image/png;base64,' + fs.readFileSync(path.join(LIVRET, dossier, fichier)).toString('base64');
const visuel = (ref) => b64(VISUELS[ref].fichier, 'visuels.gen');
const qrImg = (slug) => b64(QR.find((e) => e.slug === slug).fichier, 'qr.gen');

/* Le chapitre 2 sert de démonstration : c'est celui de la page LIE. */
const CH = CHAPITRES.find((c) => c.num === 2);
const C = CONTENU.chapitres.find((c) => c.num === 2);
const PARTIE = PARTIES.find((p) => p.id === CH.partie);
const QUESTIONS = JSON.parse(fs.readFileSync(path.join(LIVRET, 'questions-choisies.gen.json'), 'utf8'))[2]
  .map((id) => C.questions.find((q) => q.id === id));

const echappe = (s) => String(s).replace(/&(?![a-z]+;)/g, '&amp;').replace(/<(?!\/?[bi]>)/g, '&lt;');
const apos = (s) => String(s).replace(
  /\b(jusqu|lorsqu|puisqu|quelqu|aujourd|[qQ]u|[dcjlmnstDCJLMNST])\s(?=[aeiouyhéèêëàâîïôûAEIOUYHÉÈÊÀÂÎÔ])/g, '$1’');

const bandeau = (n) => `
  <header class="bandeau">
    <span class="bandeau-partie">Partie ${PARTIE.id} · ${PARTIE.titre.toUpperCase()}</span>
    <span class="bandeau-ch">Chapitre ${n}</span>
  </header>`;

const pied = (n) => `
  <footer class="pied">
    <span class="pied-marque">inerWeb Fluide · Habilitation, tome 1 — la théorie</span>
    <span class="pied-num">${n}</span>
  </footer>`;

const ligneEcran = (slug, texte) => {
  const e = QR.find((x) => x.slug === slug);
  return `
  <div class="ecran">
    <img class="ecran-qr" src="${qrImg(slug)}" alt="">
    <div class="ecran-txt">
      <span class="ecran-eti">À l’écran</span>
      <span class="ecran-url">${e.alias.replace('https://', '')}</span>
      <span class="ecran-desc">${texte}</span>
    </div>
  </div>`;
};

/* ---------- Page 1 : couverture ---------- */
const pageCouverture = `
<div class="page couverture">
  <div class="couv-marque">
    <span class="flocon">❄</span><span class="iner">iner</span><span class="web">Web</span>
    <span class="cartouche">Fluide</span>
  </div>
  <div class="couv-titre">
    <h1>Habilitation<br>Fluide</h1>
    <p class="couv-sous">Livret élève — tome 1 : la théorie</p>
  </div>
  <img class="couv-illu" src="${visuel('amb:jour1')}" alt="">
  <div class="couv-bas">
    <p class="couv-epreuve">Préparation à l’épreuve <b>théorique</b><br>de l’attestation d’aptitude fluides frigorigènes</p>
    <p class="couv-cats"><span>A1</span><span>A2</span><span>D</span><span>E</span></p>
    <p class="couv-ref">Arrêté du 21 novembre 2025 · règlement (UE) 2024/573</p>
    <p class="couv-auteur">F. Henninot, enseignant en filière froid et climatisation</p>
  </div>
</div>`;

/* ---------- Page 2 : tête de chapitre ---------- */
const pageTete = `
<div class="page">
  ${bandeau(2)}
  <div class="ch-tete">
    <span class="ch-num">2</span>
    <div>
      <h2 class="ch-titre">${apos(CH.titre)}</h2>
      <p class="ch-objectif">${apos(CH.objectif)}</p>
    </div>
  </div>

  <section class="ref">
    <h3 class="ref-t">Ce que le référentiel exige ici</h3>
    ${C.referentiel.slice(0, 2).map((r) => `
      <p class="ref-l"><span class="ref-code">${r.code}</span>${echappe(r.libelle)}</p>`).join('')}
  </section>

  <section class="test">
    <h3 class="sect-t"><span class="sect-num">1</span>Testez-vous d’abord</h3>
    <p class="sect-intro">Répondez <b>avant</b> de lire : vous saurez tout de suite ce que vous savez
      déjà, et ce qui mérite votre lecture. Les corrections sont en fin de chapitre.</p>
    ${QUESTIONS.slice(0, 2).map((q, i) => `
      <div class="q">
        <p class="q-e"><span class="q-n">${i + 1}</span>${echappe(q.enonce)}</p>
        <ul class="q-c">${q.choix.map((c, j) => `
          <li><span class="case"></span><span class="lettre">${String.fromCharCode(65 + j)}</span>${echappe(c)}</li>`).join('')}
        </ul>
      </div>`).join('')}
  </section>
  ${pied(28)}
</div>`;

/* ---------- Page 3 : une leçon, planche pleine page ---------- */
const LECON = C.lecons[2];
const PLAN_LECON = CH.lecons[2];
const pageLecon = `
<div class="page">
  ${bandeau(2)}
  <h3 class="lecon-t"><span class="lecon-n">2.3</span>${apos(PLAN_LECON.t)}</h3>

  <figure class="planche">
    <img src="${visuel(PLAN_LECON.visuels[0])}" alt="">
    <figcaption>${apos(PLAN_LECON.legendes[0])}</figcaption>
  </figure>

  ${LECON.paras.slice(0, 1).map((p) => `<p class="txt">${echappe(p)}</p>`).join('')}

  <aside class="encadre cle">
    <h4>${echappe(LECON.blocs[0].t)}</h4>
    ${(LECON.blocs[0].html.match(/<(?:p|li)>[\s\S]*?<\/(?:p|li)>/g) || []).slice(0, 2)
      .map((p) => `<p>${echappe(p.replace(/<\/?(?:p|li)>/g, ''))}</p>`).join('')}
  </aside>

  ${ligneEcran('classes-3', 'Cette leçon animée et racontée à voix haute.')}
  ${pied(34)}
</div>`;

/* ---------- Page 4 : les réponses ---------- */
const pageReponses = `
<div class="page">
  ${bandeau(2)}
  <h3 class="sect-t"><span class="sect-num">5</span>Les réponses — corrigez-vous</h3>
  ${QUESTIONS.slice(0, 4).map((q, i) => `
    <div class="rep">
      <p class="rep-l"><span class="rep-n">${i + 1}</span>
        <span class="rep-lettre">${String.fromCharCode(65 + q.bonne)}</span>
        <b>${echappe(q.choix[q.bonne])}</b></p>
      ${q.explication ? `<p class="rep-x">${echappe(q.explication)}</p>` : ''}
    </div>`).join('')}
  <div class="note">Ma note <span class="note-case"></span> / 6
    <span class="note-desc">à reporter au bilan, en fin de livret</span></div>
  ${pied(40)}
</div>`;

/* ------------------------------------------------------------------ */
const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<title>Maquette — livret Habilitation Fluide, tome 1</title>
<style>
  :root{
    --bleu:#1B3A63; --bleu2:#2f5689; --orange:#FF6B35; --logo:#e8914a;
    --txt:#1d2a38; --mut:#5a6b7d; --ligne:#d6dee7; --pale:#F4F7FA;
    --ok:#1e7e54; --ko:#c0392b;
  }
  *{box-sizing:border-box}
  body{margin:0;background:#e7ecf1;color:var(--txt);
    font:15px/1.55 Calibri,"Segoe UI",system-ui,sans-serif;padding:28px}
  .intro{max-width:1180px;margin:0 auto 26px;background:#fff;border-radius:12px;
    padding:22px 26px;box-shadow:0 2px 10px rgba(27,58,99,.10)}
  .intro h1{font:700 24px/1.25 "Trebuchet MS",Calibri,sans-serif;color:var(--bleu);margin:0 0 6px}
  .intro p{margin:0 0 10px;max-width:82ch}
  .intro ul{margin:0;padding-left:20px;max-width:82ch}
  .intro li{margin-bottom:5px}
  .intro b{color:var(--bleu)}

  .planches{display:flex;flex-wrap:wrap;gap:26px;justify-content:center;max-width:1180px;margin:0 auto}
  .cadre{background:#fff;border-radius:6px;box-shadow:0 4px 18px rgba(27,58,99,.18)}
  .etiq{font:700 12px/1 "Trebuchet MS",sans-serif;color:var(--mut);
    letter-spacing:.6px;text-transform:uppercase;margin:0 0 8px;text-align:center}

  /* ---- La page A5 ---- */
  .page{width:148mm;height:210mm;background:#fff;padding:13mm 12mm 20mm;
    position:relative;overflow:hidden;font-size:9.6pt;line-height:1.5}

  .bandeau{display:flex;justify-content:space-between;align-items:baseline;
    border-bottom:2px solid var(--orange);padding-bottom:4px;margin-bottom:10mm}
  .bandeau-partie{font:700 7.4pt/1 "Trebuchet MS",sans-serif;color:var(--bleu);
    letter-spacing:.9px}
  .bandeau-ch{font:700 7.4pt/1 "Trebuchet MS",sans-serif;color:var(--orange)}

  .ch-tete{display:flex;gap:5mm;align-items:flex-start;margin-bottom:7mm}
  .ch-num{font:700 42pt/.82 "Trebuchet MS",sans-serif;color:var(--orange);opacity:.9}
  .ch-titre{font:700 19pt/1.12 "Trebuchet MS",sans-serif;color:var(--bleu);margin:0 0 3mm}
  .ch-objectif{margin:0;font-style:italic;color:var(--txt);font-size:9pt}

  .ref{border-left:3px solid var(--bleu);background:var(--pale);
    padding:4mm 5mm;margin-bottom:7mm;border-radius:0 4px 4px 0}
  .ref-t{font:700 9.5pt/1 "Trebuchet MS",sans-serif;color:var(--bleu);margin:0 0 3mm}
  .ref-l{margin:0 0 2mm;font-size:8.2pt;line-height:1.42;color:#2a3a4a}
  .ref-code{display:inline-block;background:var(--bleu);color:#fff;font-weight:700;
    font-size:7.4pt;padding:1px 5px;border-radius:3px;margin-right:5px;vertical-align:1px}

  .sect-t{display:flex;align-items:center;gap:3mm;
    font:700 13pt/1.1 "Trebuchet MS",sans-serif;color:var(--bleu);margin:0 0 3mm}
  .sect-num{display:inline-flex;align-items:center;justify-content:center;
    width:7mm;height:7mm;border-radius:50%;background:var(--orange);color:#fff;
    font-size:9pt;flex:none}
  .sect-intro{margin:0 0 4mm;color:var(--mut);font-size:8.6pt}

  .q{margin-bottom:4mm}
  .q-e{margin:0 0 1.6mm;font-weight:600}
  .q-n{display:inline-flex;align-items:center;justify-content:center;width:5mm;height:5mm;
    border:1.4px solid var(--bleu);border-radius:50%;color:var(--bleu);font-size:7.6pt;
    font-weight:700;margin-right:2.4mm;vertical-align:1px}
  .q-c{list-style:none;margin:0;padding:0 0 0 7.4mm}
  .q-c li{display:flex;align-items:flex-start;gap:2.2mm;margin-bottom:1.1mm;font-size:9pt}
  .case{flex:none;width:3.1mm;height:3.1mm;border:1.2px solid var(--mut);
    border-radius:2px;margin-top:.9mm}
  .lettre{flex:none;font-weight:700;color:var(--bleu);width:3.5mm}

  .lecon-t{display:flex;align-items:baseline;gap:3mm;
    font:700 14pt/1.15 "Trebuchet MS",sans-serif;color:var(--bleu);margin:0 0 5mm}
  .lecon-n{color:var(--orange);font-size:11pt}

  .planche{margin:0 0 5mm}
  .planche img{width:100%;display:block;border:1px solid var(--ligne);border-radius:4px}
  .planche figcaption{margin-top:2mm;text-align:center;font-style:italic;
    font-size:7.8pt;color:var(--mut)}

  .txt{margin:0 0 3mm;text-align:justify;hyphens:auto}

  .encadre{border-left:3px solid var(--bleu);background:var(--pale);
    padding:3.4mm 4.4mm;margin:0 0 5mm;border-radius:0 4px 4px 0}
  .encadre h4{font:700 9.4pt/1 "Trebuchet MS",sans-serif;color:var(--bleu);margin:0 0 2mm}
  .encadre p{margin:0;font-size:8.6pt}
  .encadre.piege{border-left-color:var(--ko);background:#fbe7e4}
  .encadre.piege h4{color:var(--ko)}

  .ecran{display:flex;gap:3.4mm;align-items:center;background:#fff;
    border:1px solid var(--ligne);border-left:3px solid var(--orange);
    border-radius:0 4px 4px 0;padding:2.6mm 3.4mm}
  .ecran-qr{width:15mm;height:15mm;flex:none}
  .ecran-txt{display:flex;flex-direction:column;gap:.6mm}
  .ecran-eti{font:700 7pt/1 "Trebuchet MS",sans-serif;color:var(--orange);letter-spacing:.7px;
    text-transform:uppercase}
  .ecran-url{font-weight:700;color:var(--bleu);font-size:9.4pt}
  .ecran-desc{font-size:7.8pt;color:var(--mut)}

  .rep{margin-bottom:3.4mm}
  .rep-l{margin:0 0 1mm;font-size:9.2pt}
  .rep-n{display:inline-flex;align-items:center;justify-content:center;width:5mm;height:5mm;
    border-radius:50%;background:var(--ok);color:#fff;font-size:7.6pt;font-weight:700;
    margin-right:2.4mm;vertical-align:1px}
  .rep-lettre{font-weight:700;color:var(--ok);margin-right:2mm}
  .rep-x{margin:0 0 0 7.4mm;font-size:8.2pt;color:var(--mut)}

  .note{margin-top:5mm;border-top:1px solid var(--ligne);padding-top:3mm;
    font:700 10pt "Trebuchet MS",sans-serif;color:var(--bleu)}
  .note-case{display:inline-block;width:12mm;border-bottom:1.4px dotted var(--mut);margin:0 1.5mm}
  .note-desc{font:italic 8pt Calibri,sans-serif;color:var(--mut);margin-left:3mm}

  .pied{position:absolute;left:12mm;right:12mm;bottom:7mm;display:flex;
    justify-content:space-between;align-items:center;
    border-top:1px solid var(--ligne);padding-top:2.4mm}
  .pied-marque{font-size:7pt;color:var(--mut)}
  .pied-num{display:inline-flex;align-items:center;justify-content:center;
    width:6.6mm;height:6.6mm;border-radius:50%;background:var(--bleu);color:#fff;
    font:700 8pt "Trebuchet MS",sans-serif}

  /* ---- Couverture ---- */
  .couverture{display:flex;flex-direction:column;align-items:center;text-align:center;
    padding-top:16mm}
  .couv-marque{display:flex;align-items:center;gap:2mm;margin-bottom:14mm}
  .flocon{color:var(--bleu);font-size:15pt}
  .iner{font:700 21pt "Trebuchet MS",sans-serif;color:var(--bleu);
    border-bottom:2px solid var(--logo);padding-bottom:1px}
  .web{font:21pt "Segoe Script","Brush Script MT",cursive;color:var(--bleu);
    border-bottom:2px solid var(--logo);padding-bottom:1px;margin-left:-1mm}
  .cartouche{background:var(--logo);color:#fff;font:700 11pt "Segoe UI",sans-serif;
    padding:2mm 4mm;border-radius:20px;margin-left:2mm}
  .couv-titre h1{font:700 34pt/1.02 "Trebuchet MS",sans-serif;color:var(--bleu);margin:0}
  .couv-sous{font:700 13pt "Trebuchet MS",sans-serif;color:var(--orange);margin:3mm 0 0}
  .couv-illu{width:88%;margin:9mm 0;border-radius:6px}
  .couv-bas{margin-top:auto;padding-bottom:4mm}
  .couv-epreuve{margin:0 0 4mm;font-size:9.4pt;color:var(--mut);line-height:1.45}
  .couv-cats{display:flex;gap:2.4mm;justify-content:center;margin:0 0 4mm}
  .couv-cats span{background:var(--bleu);color:#fff;font:700 10pt "Trebuchet MS",sans-serif;
    padding:1.4mm 3.6mm;border-radius:4px}
  .couv-ref{margin:0 0 5mm;font-size:8pt;color:var(--mut)}
  .couv-auteur{margin:0;font-size:9pt;color:var(--txt)}
</style></head><body>

<div class="intro">
  <h1>Maquette de mise en page — livret « Habilitation Fluide », tome 1</h1>
  <p>Quatre pages <b>réelles</b> au format A5 exact : contenu, planches et QR véritables, aucun faux
     texte. C’est la direction proposée pour remplacer la mise en page actuelle du Word.</p>
  <ul>
    <li><b>Bandeau de repère</b> en haut de chaque page : la partie et le chapitre, filet orange —
        on sait toujours où l’on est.</li>
    <li><b>Grand numéro de chapitre</b> et objectif en italique : une entrée franche, pas un empilement.</li>
    <li><b>Bloc référentiel</b> à filet bleu, codes en pastilles — ce que l’examen exige, lisible d’un coup d’œil.</li>
    <li><b>Sections numérotées</b> (pastille orange) : 1 Testez-vous · 2 Les leçons · 3 À vous · 4 Les réponses.</li>
    <li><b>Planches pleine largeur</b>, encadrées, légende dessous — plus jamais une diapositive en demi-page.</li>
    <li><b>Encadrés à filet</b> (bleu « à retenir », rouge « geste interdit ») plutôt que des aplats lourds.</li>
    <li><b>Bloc « À l’écran »</b> sous chaque leçon : QR + adresse en clair + ce qu’on y trouve.</li>
    <li><b>Pied de page</b> : numéro en pastille bleue, marque discrète.</li>
  </ul>
</div>

<div class="planches">
  <div><p class="etiq">Couverture</p><div class="cadre">${pageCouverture}</div></div>
  <div><p class="etiq">Ouverture de chapitre — référentiel puis questions</p><div class="cadre">${pageTete}</div></div>
  <div><p class="etiq">Une leçon — planche pleine largeur et lien vers l’écran</p><div class="cadre">${pageLecon}</div></div>
  <div><p class="etiq">Les réponses, en fin de chapitre</p><div class="cadre">${pageReponses}</div></div>
</div>

</body></html>`;

const sortie = path.join(LIVRET, 'maquette-mise-en-page.html');
fs.writeFileSync(sortie, html, 'utf8');
console.log(`✔ ${path.relative(process.cwd(), sortie)} — ${(html.length / 1024 / 1024).toFixed(1)} Mo, autonome`);
