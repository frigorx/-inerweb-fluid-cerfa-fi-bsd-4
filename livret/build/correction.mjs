/* =====================================================================
   LIVRET « HABILITATION FLUIDE » — LES CORRECTIONS EN LIGNE
   ---------------------------------------------------------------------
   Décision du 29/08/2026 : les 36 pages de QUESTIONS restent au papier —
   on doit pouvoir s'entraîner dans le train, sans réseau — mais les
   37 pages de CORRIGÉ le quittent.

   Deux raisons, et la seconde compte plus que l'économie de papier :

     · Un corrigé imprimé à trois pages de sa question se lit avant d'y
       répondre. C'est le défaut de tous les livres d'entraînement.
     · Le corrigé en ligne fait ce que le papier ne peut pas : après
       chaque réponse, il renvoie vers CE QUI L'EXPLIQUE — le module
       interactif, la capsule narrée, ou la page du livre elle-même.

   Ce maillon écrit une page de correction par chapitre. Elle reprend
   EXACTEMENT les questions imprimées, dans le même ordre, avec les
   mêmes choix mélangés (`questions-choisies.gen.json` fait foi) : sans
   cela, « la réponse B » du papier ne désignerait pas la même chose en
   ligne, et la correction tromperait au lieu d'aider.

   Sortie : redirections-pages/corriges/<slug>/index.html
   À copier dans `frigorx/pilote-fluides` avec le dossier `f/`.

   ⚠️ Ces pages ne sont PAS publiées par la chaîne : elles sont écrites à
   côté des redirections, et c'est F. Henninot qui décide de les déployer.
   ===================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHAPITRES } from './plan-chapitres.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const LIVRET = path.join(ICI, '..');
const DEHORS = path.join(LIVRET, 'redirections-pages', 'corriges');

const CONTENU = JSON.parse(fs.readFileSync(path.join(LIVRET, 'contenu.gen.json'), 'utf8'));
const CHOISIES = JSON.parse(fs.readFileSync(path.join(LIVRET, 'questions-choisies.gen.json'), 'utf8'));

/* La table code du référentiel → pages du livre, écrite par la
   fabrication. C'est elle qui permet au corrigé de dire « relisez la
   page 142 » plutôt que « relisez le chapitre ». */
const PAGES = fs.existsSync(path.join(LIVRET, 'inventaire-pages.gen.json'))
  ? JSON.parse(fs.readFileSync(path.join(LIVRET, 'inventaire-pages.gen.json'), 'utf8'))
  : {};

const APPLI = 'https://inerweb.fr/';
const ech = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* Les pages du livre où un code est traité, resserrées en intervalles :
   « 142-145 » se lit mieux que quatre nombres à la file. */
const pagesDe = (code) => {
  const liste = (PAGES[code] || []).slice().sort((a, b) => a - b);
  if (!liste.length) return null;
  const bouts = [];
  let debut = liste[0], fin = liste[0];
  for (const n of liste.slice(1)) {
    if (n === fin + 1) { fin = n; continue; }
    bouts.push(debut === fin ? `${debut}` : `${debut}\u2013${fin}`);
    debut = fin = n;
  }
  bouts.push(debut === fin ? `${debut}` : `${debut}\u2013${fin}`);
  return bouts.join(', ');
};

/* Ce vers quoi renvoie une réponse ratée : la capsule qui la raconte, à
   défaut la fiche. On ne fabrique pas de lien vers une page qu'on n'a
   pas vérifiée — `remediation_vers` vient de la source. */
const CAPSULES = path.join(process.env.PILOTE_FLUIDES || 'C:/git/pilote-fluides',
  'packs', 'fluides', 'res', 'capsules', 'donnees');
const versDe = (q) => {
  const src = q.remediation_vers;
  if (!src) return null;
  return fs.existsSync(path.join(CAPSULES, `${src}.js`))
    ? { url: `${APPLI}packs/fluides/res/capsules/index.html?c=${src}`, quoi: 'la leçon racontée à voix haute' }
    : { url: `${APPLI}?carte=${src}`, quoi: 'la fiche interactive' };
};

const STYLE = `
:root{--bleu:#1B3A63;--bleu2:#2f5689;--orange:#FF6B35;--txt:#1d2a38;
  --mut:#5a6b7d;--ligne:#d6dee7;--pale:#F4F7FA;--ok:#1e7e54}
*{box-sizing:border-box}
body{margin:0;background:#eef2f6;color:var(--txt);
  font:16px/1.6 Calibri,Carlito,'Segoe UI',sans-serif;padding:20px 14px 60px}
main{max-width:760px;margin:0 auto;background:#fff;border-radius:12px;padding:26px 28px}
h1{font:700 26px/1.2 'Trebuchet MS',sans-serif;color:var(--bleu);margin:0 0 4px}
.sur{font:700 12px/1.2 'Trebuchet MS',sans-serif;color:var(--orange);
  text-transform:uppercase;letter-spacing:1px;margin:0 0 10px}
.intro{background:var(--pale);border-left:3px solid var(--orange);
  padding:12px 14px;margin:0 0 22px;font-size:15px}
.q{border-top:1px solid var(--ligne);padding-top:18px;margin-top:18px}
.q-n{display:inline-flex;align-items:center;justify-content:center;
  width:26px;height:26px;background:var(--bleu);color:#fff;border-radius:50%;
  font:700 14px 'Trebuchet MS',sans-serif;margin-right:8px;flex:none}
.q-e{font-weight:700;color:var(--bleu);margin:0 0 10px;display:flex;align-items:flex-start}
ol.choix{list-style:none;margin:0 0 12px;padding:0}
ol.choix li{padding:7px 10px;border:1px solid var(--ligne);border-radius:7px;
  margin-bottom:5px;font-size:15px}
ol.choix li.bonne{border-color:var(--ok);background:#eef8f2;font-weight:700}
.lettre{display:inline-block;width:20px;font-weight:700;color:var(--mut)}
ol.choix li.bonne .lettre{color:var(--ok)}
.x{font-size:15px;margin:0 0 10px}
.suite{display:flex;flex-wrap:wrap;gap:8px;font-size:14px}
.suite a,.suite span{display:inline-block;padding:6px 11px;border-radius:20px;
  border:1px solid var(--ligne);color:var(--bleu);text-decoration:none}
.suite a:hover{border-color:var(--bleu);background:var(--pale)}
.suite .papier{color:var(--mut)}
footer{max-width:760px;margin:18px auto 0;font-size:13px;color:var(--mut);text-align:center}
footer a{color:var(--bleu)}
`;

fs.rmSync(DEHORS, { recursive: true, force: true });

let pages = 0, questions = 0, avecPage = 0, avecSuite = 0;

for (const ch of CHAPITRES) {
  const c = CONTENU.chapitres.find((x) => x.num === ch.num);
  const tirage = CHOISIES[ch.num] || [];
  if (!c || !tirage.length) continue;

  /* Mêmes questions, même ordre, mêmes choix mélangés que le papier. */
  const liste = tirage.map((sel) => {
    const q = c.questions.find((x) => x.id === sel.id);
    return q && { ...q, choix: sel.ordre.map((i) => q.choix[i]), bonne: sel.bonne };
  }).filter(Boolean);

  const corps = liste.map((q, i) => {
    const suite = [];
    const pg = pagesDe(q.code);
    if (pg) { suite.push(`<span class="papier">Dans le livre : page ${pg}</span>`); avecPage++; }
    const vers = versDe(q);
    if (vers) { suite.push(`<a href="${ech(vers.url)}">Revoir ${ech(vers.quoi)}</a>`); avecSuite++; }
    questions++;
    return `
    <div class="q">
      <p class="q-e"><span class="q-n">${i + 1}</span><span>${ech(q.enonce)}</span></p>
      <ol class="choix">${q.choix.map((ch2, j) => `
        <li class="${j === q.bonne ? 'bonne' : ''}"><span class="lettre">${String.fromCharCode(65 + j)}</span>${ech(ch2)}</li>`).join('')}
      </ol>
      ${q.explication ? `<p class="x">${ech(q.explication)}</p>` : ''}
      ${suite.length ? `<div class="suite">${suite.join('')}</div>` : ''}
    </div>`;
  }).join('');

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Correction — chapitre ${ch.num} : ${ech(ch.titre)} | inerweb.fr HabFluide</title>
<meta name="robots" content="noindex">
<style>${STYLE}</style>
</head>
<body>
<main>
  <p class="sur">inerweb.fr HabFluide · tome 1 · chapitre ${ch.num}</p>
  <h1>${ech(ch.titre)}</h1>
  <p class="intro">La correction des <b>${liste.length} questions</b> du chapitre, dans
  l’ordre du livre. Après chaque réponse, de quoi comprendre : la page qui
  l’explique, et la leçon en ligne.</p>
  ${corps}
</main>
<footer>
  <p>inerweb.fr — F. Henninot, enseignant en filière froid et climatisation ·
  <a href="${APPLI}">retour à inerweb.fr</a></p>
</footer>
</body>
</html>
`;

  const dossier = path.join(DEHORS, ch.qr);
  fs.mkdirSync(dossier, { recursive: true });
  fs.writeFileSync(path.join(dossier, 'index.html'), html, 'utf8');
  pages++;
}

fs.writeFileSync(path.join(DEHORS, 'LISEZMOI.md'), [
  '# Les corrections du livret — à déployer avec `f/`',
  '',
  'Copier le dossier `corriges/` **à la racine du dépôt `frigorx/pilote-fluides`**,',
  'comme le dossier `f/`. Chaque chapitre du livre porte dans sa marge un QR',
  '`inerweb.fr/f/<slug>-c` qui redirige ici.',
  '',
  'Les questions et l’ordre des choix sont ceux du livre IMPRIMÉ : ils viennent',
  'de `questions-choisies.gen.json`. Refabriquer le livre change le tirage —',
  'il faut alors redéployer ces pages, sinon « la réponse B » du papier ne',
  'désignera plus la même chose en ligne.',
  '',
  '`noindex` : ces pages servent les lecteurs du livre, elles n’ont rien à',
  'faire dans les moteurs de recherche.',
  '',
].join('\n'), 'utf8');

console.log('Corrections en ligne — le corrigé quitte le papier\n');
console.log(`  ${pages} pages de correction · ${questions} questions`);
console.log(`  ${avecPage} renvoient à une page du livre · ${avecSuite} à une leçon en ligne`);
console.log(`\n✔ redirections-pages/corriges/ (à déployer dans pilote-fluides)`);
