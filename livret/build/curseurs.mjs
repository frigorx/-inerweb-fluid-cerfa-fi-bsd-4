/* =====================================================================
   LIVRET « inerweb.fr HabFluide » — LES CURSEURS DE DENSITÉ
   ---------------------------------------------------------------------
   La règle des curseurs, appliquée au livre : plutôt qu'un aller-retour
   par réglage, une page où Franck manœuvre lui-même la densité et voit
   le résultat sur une vraie page, tout de suite.

   Ce qu'il obtient en bas : le contenu exact de `reglages.json`, à
   recopier. `npm run html` refabrique alors les 400 pages au réglage
   choisi. Une seule passe, pas dix.

   L'estimation de pagination est un ORDRE DE GRANDEUR, calculé sur la
   surface de texte : elle dit dans quel sens on va, pas le chiffre
   exact — seul le build le donne.

   `node build/curseurs.mjs` → curseurs.html
   ===================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const LIVRET = path.join(ICI, '..');
const R = JSON.parse(fs.readFileSync(path.join(LIVRET, 'reglages.json'), 'utf8'));
const KDP = JSON.parse(fs.readFileSync(path.join(LIVRET, 'kdp.gen.json'), 'utf8'));

/* Le CSS du livre, tel quel : ce qu'on règle ici est ce qui s'appliquera. */
const source = fs.readFileSync(path.join(ICI, 'build-html.mjs'), 'utf8');
const debut = source.indexOf('const CSS = `') + 'const CSS = `'.length;
/* L'ordre compte : on résout les ${…} AVANT de retirer les règles @page.
   Les accolades fermantes des interpolations casseraient sinon le motif
   qui découpe ces règles, et il en resterait des morceaux. */
const CSS_LIVRE = source.slice(debut, source.indexOf('}`;', debut) + 1)
  .replace("${POLICE_DYS && DYS ? POLICE_DYS : ''}", '')
  .replace('${CORPS_PT}pt/${INTERLIGNE} ${FAMILLE}', 'var(--corps)/var(--inter) Calibri,"Segoe UI",sans-serif')
  .replace('${R.air}', 'var(--air-init)')
  .replace('${R.planche_h_mm}mm', 'var(--planche)')
  .replace('${R.planche_haute_h_mm}mm', 'calc(var(--planche) * 1.14)')
  .replace('${R.appoint_pc}%', 'var(--appoint)')
  .replace(/\$\{R\.\w+\}/g, '0')
  .replace(/@page[^{]*\{[^}]*\}/g, '')
  .replace(/@media print\{[\s\S]*?\n\}/, '');
if (CSS_LIVRE.includes('${')) throw new Error('interpolation non résolue dans le CSS des curseurs');

const html = `<meta charset="utf-8">
<title>inerweb.fr HabFluide — les curseurs de densité</title>
<style>
${CSS_LIVRE}
/* ---- L'atelier (n'existe pas dans le livre) ---- */
body{background:#e7ecf1;padding:0;font-size:14px;
  font-family:Calibri,"Segoe UI",system-ui,sans-serif}
.atelier{display:flex;gap:26px;align-items:flex-start;padding:24px;max-width:1240px;margin:0 auto}
.reglages{position:sticky;top:24px;width:390px;flex:none;background:#fff;border-radius:12px;
  padding:20px 22px;box-shadow:0 2px 12px rgba(27,58,99,.14)}
.reglages h1{font:700 19px/1.3 "Trebuchet MS",sans-serif;color:var(--bleu);margin:0 0 4px}
.reglages .sous{color:var(--mut);font-size:13px;margin:0 0 16px;line-height:1.45}
.bloc{margin-bottom:15px}
.bloc label{display:flex;justify-content:space-between;align-items:baseline;
  font-weight:700;color:var(--bleu);font-size:13.5px;margin-bottom:3px}
.bloc .val{font:700 13px "Consolas",monospace;color:var(--orange)}
.bloc input[type=range]{width:100%;accent-color:#FF6B35}
.bloc .aide{font-size:11.5px;color:var(--mut);line-height:1.4;margin-top:2px}
.verrou{background:#F4F7FA;border-left:2.4pt solid var(--bleu);padding:9px 12px;
  border-radius:0 4px 4px 0;font-size:12px;color:#2a3a4a;line-height:1.45;margin-bottom:15px}
.verrou b{color:var(--bleu)}
.estim{background:var(--bleu);color:#fff;border-radius:8px;padding:12px 14px;margin:16px 0 12px}
.estim .gros{font:700 26px/1 "Trebuchet MS",sans-serif}
.estim .det{font-size:12px;color:#cfdcea;margin-top:5px;line-height:1.45}
textarea{width:100%;height:150px;font:12px/1.5 Consolas,monospace;border:1px solid var(--ligne);
  border-radius:6px;padding:9px;color:#2a3a4a;background:#fbfdff;resize:vertical}
.actions{display:flex;gap:8px;margin-top:9px}
button{flex:1;border:0;border-radius:6px;padding:9px;font:700 13px "Trebuchet MS",sans-serif;
  cursor:pointer;background:var(--bleu);color:#fff}
button.sec{background:#fff;color:var(--bleu);border:1.5px solid var(--ligne)}
.apercus{flex:1;display:flex;flex-wrap:wrap;gap:22px;justify-content:center}
.apercus figcaption{font:700 11px/1.3 "Trebuchet MS",sans-serif;color:var(--mut);
  text-transform:uppercase;letter-spacing:.5px;margin-bottom:7px;text-align:center}
.apercus figure{margin:0}
.page{width:152.4mm;height:228.6mm;background:#fff;overflow:hidden;display:flex;flex-direction:column;
  padding:var(--haut) var(--ext) var(--bas) var(--gout);
  box-shadow:0 4px 18px rgba(27,58,99,.2)}
.page .corps{flex:1;overflow:hidden;position:relative}
/* Ce qui déborde de la page se voit : c'est le signe qu'on a trop serré
   les marges ou trop grossi les planches. */
.page .corps::after{content:"";position:absolute;left:0;right:0;bottom:0;height:14mm;
  background:linear-gradient(transparent,#fff)}
.bandeau{display:flex;justify-content:space-between;align-items:baseline;
  border-bottom:1.6pt solid var(--orange);padding-bottom:1.4mm;margin-bottom:5mm}
.bandeau b{font:700 7.4pt/1 "Trebuchet MS",Calibri,sans-serif;color:var(--bleu);letter-spacing:.9px}
.bandeau span{font:700 7.4pt/1 "Trebuchet MS",Calibri,sans-serif;color:var(--orange)}
.pied{display:flex;justify-content:space-between;align-items:center;
  border-top:.6pt solid var(--ligne);padding-top:2mm;margin-top:auto}
.pied-m{font-size:6.8pt;color:var(--mut)}
.pied-n{display:inline-flex;align-items:center;justify-content:center;width:6.4mm;height:6.4mm;
  border-radius:50%;background:var(--bleu);color:#fff;font:700 7.6pt "Trebuchet MS",sans-serif}
.faux{border:1.2pt dashed var(--ligne);border-radius:3px;background:#fafcfe;width:100%;
  display:flex;align-items:center;justify-content:center;color:#adbcc9;font-size:9pt}
</style>

<div class="atelier">
  <div class="reglages">
    <h1>La densité, au curseur</h1>
    <p class="sous">Réglez, regardez les deux pages à droite, puis recopiez le résultat dans
      <b>livret/reglages.json</b>. Un seul <code>npm run html</code> refabrique le livre entier.</p>

    <div class="verrou">
      <b>Ce que les curseurs ne peuvent pas franchir.</b> Le corps reste à
      <b>14 pt</b> — plancher de la charte pour un document élève. La reliure garde
      <b>19 mm</b> — exigence Amazon KDP au-delà de 300 pages. Le texte n'est jamais justifié.
    </div>

    <div class="bloc">
      <label>Blancs entre les blocs <span class="val" id="v-air"></span></label>
      <input type="range" id="air" min="0.6" max="1.4" step="0.02">
      <p class="aide">Le curseur principal. Il agit sur TOUS les espacements d'un coup :
        entre paragraphes, autour des encadrés, des questions, des planches.</p>
    </div>

    <div class="bloc">
      <label>Interligne <span class="val" id="v-inter"></span></label>
      <input type="range" id="inter" min="1.28" max="1.7" step="0.01">
      <p class="aide">L'air entre deux lignes du même paragraphe. En dessous de 1,3, la lecture
        dyslexique souffre.</p>
    </div>

    <div class="bloc">
      <label>Hauteur des planches <span class="val" id="v-planche"></span></label>
      <input type="range" id="planche" min="70" max="140" step="2">
      <p class="aide">Plus haut = schémas plus lisibles, mais ils chassent le texte.
        C'est le compromis à trouver.</p>
    </div>

    <div class="bloc">
      <label>Illustration d'accompagnement <span class="val" id="v-appoint"></span></label>
      <input type="range" id="appoint" min="35" max="100" step="1">
      <p class="aide">Largeur d'une image d'ambiance qui accompagne une planche technique,
        en % de la largeur du texte.</p>
    </div>

    <div class="bloc">
      <label>Marge extérieure <span class="val" id="v-ext"></span></label>
      <input type="range" id="ext" min="10" max="20" step="0.5">
      <p class="aide">Côté tranche. Sous 10 mm, le pouce couvre le texte.</p>
    </div>

    <div class="bloc">
      <label>Marges haut et bas <span class="val" id="v-vert"></span></label>
      <input type="range" id="vert" min="12" max="24" step="0.5">
      <p class="aide">Elles logent le bandeau et le pied de page.</p>
    </div>

    <div class="estim">
      <div class="gros"><span id="pages">—</span> pages</div>
      <div class="det">Ordre de grandeur, calculé sur la surface de texte.
        Repère : <b>${KDP.pages} pages</b> au réglage actuellement enregistré.
        Le dos de la couverture et le coût d'impression en dépendent
        (<span id="dos">—</span> mm de dos, <span id="cout">—</span> € l'exemplaire).</div>
    </div>

    <textarea id="json" readonly></textarea>
    <div class="actions">
      <button onclick="copier()">Copier pour reglages.json</button>
      <button class="sec" onclick="defauts()">Revenir au réglage enregistré</button>
    </div>
  </div>

  <div class="apercus">
    <figure><figcaption>Une leçon — planche, texte, lien vers l'écran</figcaption>
      <div class="page" id="p1"></div></figure>
    <figure><figcaption>Le QCM d'ouverture</figcaption>
      <div class="page" id="p2"></div></figure>
  </div>
</div>

<script>
const DEFAUTS = ${JSON.stringify({
    air: R.air, interligne: R.interligne, planche_h_mm: R.planche_h_mm,
    appoint_pc: R.appoint_pc, exterieur_mm: R.exterieur_mm, haut_mm: R.haut_mm,
  })};
const PAGES_REF = ${KDP.pages};
const E = (id) => document.getElementById(id);

/* Les deux aperçus, en contenu réel. */
const BANDEAU = '<header class="bandeau"><b>Partie A · SE PROTÉGER</b><span>Chapitre 2</span></header>';
const PIED = '<footer class="pied"><span class="pied-m">inerweb.fr · HAB-FLUIDE · partie théorique</span><span class="pied-n">34</span></footer>';

E('p1').innerHTML = BANDEAU + '<div class="corps">' +
  '<h4 class="lecon-t"><span class="lecon-n">2.3</span>Explosif avant d\\u2019être perceptible — la LIE</h4>' +
  '<figure class="planche"><div class="faux" style="aspect-ratio:1800/695;max-height:var(--planche)">planche technique</div>' +
  '<figcaption>Le domaine d\\u2019explosivité</figcaption></figure>' +
  '<p class="txt"><b>Ce qui arrive.</b> Un gaz inflammable ne s\\'enflamme pas à n\\'importe quelle ' +
  'concentration dans l\\'air. Il lui faut un dosage : assez de gaz pour brûler, et assez d\\'air pour ' +
  'entretenir la combustion. En dessous d\\'une certaine concentration, le mélange est trop pauvre en ' +
  'gaz — une étincelle ne déclenche rien. Au-dessus d\\'une autre, il est trop riche : il n\\'y a plus ' +
  'assez d\\'oxygène. <b>Entre les deux</b>, le mélange s\\'enflamme, et il le fait d\\'un coup.</p>' +
  '<aside class="encadre cle"><h4>Ce qu\\'il faut retenir</h4>' +
  '<p>Un gaz inflammable ne brûle qu\\'entre deux bornes : <b>LIE</b> et <b>LSE</b>. ' +
  'Entre les deux, une étincelle suffit.</p></aside>' +
  '<div class="ecran"><div class="faux" style="width:19mm;height:19mm;flex:none">QR</div>' +
  '<div class="ecran-txt"><span class="ecran-eti">À l\\u2019écran</span>' +
  '<span class="ecran-url">inerweb.fr/f/classes-3</span>' +
  '<span class="ecran-desc">Cette leçon animée et racontée à voix haute.</span></div></div>' +
  '</div>' + PIED;

const Q = (n, e, choix) => '<div class="q"><p class="q-e"><span class="q-n">' + n + '</span>' + e + '</p>' +
  '<ul class="q-c' + (choix.every((c) => c.length <= 30) ? ' deux' : '') + '">' +
  choix.map((c, i) => '<li><span class="case"></span><span class="lettre">' +
    'ABCD'[i] + '</span>' + c + '</li>').join('') + '</ul></div>';

E('p2').innerHTML = BANDEAU + '<div class="corps">' +
  '<h3 class="sect-t"><span class="sect-num">1</span>Testez-vous d\\u2019abord — 6 questions</h3>' +
  '<p class="sect-intro">Répondez <b>avant</b> de lire : vous saurez tout de suite ce que vous savez ' +
  'déjà, et ce qui mérite votre lecture. Les corrections sont en fin de chapitre.</p>' +
  Q(1, 'Un fluide classé A2L est :', ['Non inflammable, non toxique', 'Légèrement inflammable, faible toxicité',
    'Très inflammable, faible toxicité', 'Légèrement inflammable, toxicité élevée']) +
  Q(2, 'Le R410A est un mélange de :', ['R134a + R125', 'R32 + R125', 'R32 + R134a', 'R290 + R600a']) +
  Q(3, 'Le R12 est un :', ['HFC', 'HCFC', 'CFC', 'HFO']) +
  '</div>' + PIED;

function appliquer() {
  const air = +E('air').value, inter = +E('inter').value;
  const planche = +E('planche').value, appoint = +E('appoint').value;
  const ext = +E('ext').value, vert = +E('vert').value;
  const r = document.documentElement.style;
  r.setProperty('--air-init', air);
  r.setProperty('--air', air);
  r.setProperty('--corps', '14pt');
  r.setProperty('--inter', inter);
  r.setProperty('--planche', planche + 'mm');
  r.setProperty('--appoint', appoint + '%');
  r.setProperty('--ext', ext + 'mm');
  r.setProperty('--gout', '19mm');
  r.setProperty('--haut', vert + 'mm');
  r.setProperty('--bas', (vert - 2) + 'mm');

  E('v-air').textContent = air.toFixed(2);
  E('v-inter').textContent = inter.toFixed(2);
  E('v-planche').textContent = planche + ' mm';
  E('v-appoint').textContent = appoint + ' %';
  E('v-ext').textContent = ext + ' mm';
  E('v-vert').textContent = vert + ' / ' + (vert - 2) + ' mm';

  /* Estimation : la surface utile et la hauteur de ligne décident du
     nombre de lignes par page ; les blancs mangent le reste. */
  const utile = (228.6 - vert - (vert - 2)) * (152.4 - 19 - ext);
  const utileRef = (228.6 - DEFAUTS.haut_mm - (DEFAUTS.haut_mm - 2)) * (152.4 - 19 - DEFAUTS.exterieur_mm);
  const densite = (DEFAUTS.interligne / inter) * (DEFAUTS.air / air) ** 0.45
    * (utile / utileRef) * (DEFAUTS.planche_h_mm / planche) ** 0.18;
  const pages = Math.max(60, Math.round(PAGES_REF / densite / 2) * 2);
  E('pages').textContent = pages;
  E('dos').textContent = (pages * 0.002252 * 25.4).toFixed(1);
  E('cout').textContent = (0.60 + pages * 0.012).toFixed(2);

  E('json').value = JSON.stringify({
    corps_pt: 14, interligne: +inter.toFixed(2), air: +air.toFixed(2),
    gouttiere_mm: 19, exterieur_mm: ext, haut_mm: vert, bas_mm: vert - 2,
    planche_h_mm: planche, planche_haute_h_mm: Math.round(planche * 1.14),
    appoint_pc: appoint,
  }, null, 1);
}

function defauts() {
  E('air').value = DEFAUTS.air;
  E('inter').value = DEFAUTS.interligne;
  E('planche').value = DEFAUTS.planche_h_mm;
  E('appoint').value = DEFAUTS.appoint_pc;
  E('ext').value = DEFAUTS.exterieur_mm;
  E('vert').value = DEFAUTS.haut_mm;
  appliquer();
}

function copier() {
  E('json').select();
  navigator.clipboard.writeText(E('json').value);
}

for (const id of ['air', 'inter', 'planche', 'appoint', 'ext', 'vert']) {
  E(id).addEventListener('input', appliquer);
}
defauts();
</script>
`;

const sortie = path.join(LIVRET, 'curseurs.html');
fs.writeFileSync(sortie, html, 'utf8');
console.log(`✔ ${path.relative(process.cwd(), sortie)} — six curseurs, deux pages réelles, estimation de pagination`);
