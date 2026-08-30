/* =====================================================================
   LIVRET « inerweb.fr HabFluide » — LA COUVERTURE AMAZON KDP
   ---------------------------------------------------------------------
   4e de couverture · dos · 1re, d'un seul tenant, aux cotes exactes du
   téléversement.

   Elle était écrite à la main, et c'est ainsi qu'elle a porté un dos de
   390 pages pendant que la fiche en annonçait 406 et que le livre en
   faisait 290 : trois chiffres pour un même ouvrage, et un dos faux de
   près de six millimètres. Elle se calcule donc, ici, sur `kdp.gen.json`
   — écrit par la finition à partir du PDF réel. Une seule source.

   Sorties : couverture-kdp.html          (pour l'écran et Claude Design)
             dist/…-Couverture-6x9.pdf    (le fichier à téléverser)

   `node build/couverture.mjs`
   ===================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const LIVRET = path.join(ICI, '..');
const DIST = path.join(LIVRET, 'dist');
const KDP = JSON.parse(fs.readFileSync(path.join(LIVRET, 'kdp.gen.json'), 'utf8'));

/* ------------------------------------------------------------------
   LES SYMBOLES NORMALISÉS DE LA BIBLIOTHÈQUE — jamais un redessin.
   Verdict de la relecture couverture (29/08) : un croquis maison n'a
   rien à faire sur le plat d'un livre de frigoristes. Le circuit de
   couverture embarque les fichiers de la bibliothèque du pack
   (pilote-fluides), recolorés pour le fond marine : traits blancs,
   intérieurs au bleu du plat.
   ------------------------------------------------------------------ */
const SOURCE = process.env.PILOTE_FLUIDES || 'C:/git/pilote-fluides';
const SYMBOLES = path.join(SOURCE, 'packs', 'fluides', 'res', 'symboles');

function symbole(nom) {
  const brut = fs.readFileSync(path.join(SYMBOLES, `${nom}.svg`), 'utf8')
    .replace(/<metadata>[\s\S]*?<\/metadata>/, '')
    .replace(/stroke="#1b3a63"/g, 'stroke="#ffffff"')
    .replace(/fill="#1b3a63"/g, 'fill="#ffffff"')
    .replace(/fill="white"/g, 'fill="#1B3A63"');
  const [, vb] = brut.match(/viewBox="([^"]+)"/);
  const corps = brut.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  return { vb: vb.split(/\s+/).map(Number), corps };
}

/* Pose un symbole : centre cible + échelle, dans le repère du circuit. */
function pose(nom, cx, cy, echelle, rotation = 0) {
  const s = symbole(nom);
  const [x, y, w, h] = s.vb;
  const centre = [x + w / 2, y + h / 2];
  return `<g transform="translate(${cx},${cy}) rotate(${rotation}) scale(${echelle}) translate(${-centre[0]},${-centre[1]})">${s.corps}</g>`;
}

const [LARGEUR, HAUTEUR] = KDP.couverture_mm;
const DOS = KDP.dos_mm;
const NOM = 'inerweb.fr-HabFluide-Tome1-Couverture-6x9';

/* Un livre français écrit ses décimales avec une virgule. */
const fr = (n) => String(n).replace('.', ',');

/* Le dos ne porte de texte qu'à partir de 100 pages (règle Amazon), et
   il faut de la place : sous 9 mm, on n'y met que le flocon. */
const DOS_ECRIT = KDP.pages >= 100 && DOS >= 9;

/* Le QR de couverture : la porte d'entrée du livre interactif. Il mène à
   l'accueil d'inerweb.fr — jamais à une page profonde : la couverture
   vit plus longtemps que n'importe quelle URL interne. Sombre sur blanc,
   correction Q : il sera photographié sur un livre, pas scanné à plat. */
const QR_ACCUEIL = await QRCode.toDataURL('https://inerweb.fr/', {
  errorCorrectionLevel: 'Q', width: 600, margin: 2,
  color: { dark: '#1B3A63', light: '#ffffff' },
});

/* ------------------------------------------------------------------
   LE CIRCUIT DE COUVERTURE — la croix du frigoriste, en symboles
   normalisés de la bibliothèque, dans le bon sens : détendeur à
   GAUCHE, compresseur à DROITE, condenseur en HAUT, évaporateur en
   BAS. HP en orange (refoulement → condenseur → liquide), BP en blanc
   (détente → évaporateur → aspiration). Même lecture que la planche
   croix-frigoriste.svg du pack, réduite au format du plat.
   ------------------------------------------------------------------ */
const CIRCUIT = `
<svg viewBox="0 0 380 224" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
    <!-- HP (orange) : refoulement -> condenseur -> ligne liquide -> détendeur -->
    <path stroke="#FF6B35" d="M296 88 L296 44 L207 44"/>
    <path stroke="#FF6B35" d="M173 44 L84 44 L84 76"/>
    <!-- BP (blanc) : sortie détendeur -> évaporateur -> aspiration -->
    <path stroke="#ffffff" d="M84 120 L84 170 L173 170"/>
    <path stroke="#ffffff" d="M207 170 L296 170 L296 122"/>
    <!-- sens de circulation : vers le condenseur, vers le bas, vers l'évaporateur, vers le haut -->
    <path stroke="#FF6B35" d="M256 39 L247 44 L256 49" fill="none"/>
    <path stroke="#FF6B35" d="M79 60 L84 69 L89 60" fill="none"/>
    <path stroke="#ffffff" d="M124 165 L133 170 L124 175" fill="none"/>
    <path stroke="#ffffff" d="M291 146 L296 137 L301 146" fill="none"/>
  </g>
  <!-- Échangeurs DEBOUT, ailettes vers le bas : l'orientation de la
       bibliothèque, celle des folios. Les conduites entrent sur leurs
       flancs, à la hauteur du corps. -->
  ${pose('echangeur_a_air', 190, 40, 0.86)}
  ${pose('echangeur_a_air', 190, 166, 0.86)}
  <!-- Détendeur sur la jambe verticale : conduites hautes et basses,
       bulbe vers la gauche. -->
  ${pose('detendeur_thermo_ext', 84, 98, 1.05, -90)}
  <!-- Compresseur : le cercle aux deux biellettes de la planche de
       référence, débit montant. -->
  ${pose('compresseur_general', 296, 105, 1.1, 90)}
  <g font-family="Calibri, sans-serif" font-size="8.5" fill="#cfdcea" letter-spacing=".5">
    <text x="190" y="10" text-anchor="middle">CONDENSEUR</text>
    <text x="190" y="220" text-anchor="middle">ÉVAPORATEUR</text>
    <text x="64" y="101" text-anchor="end">DÉTENDEUR</text>
    <text x="316" y="101" text-anchor="start">COMPRESSEUR</text>
    <text x="120" y="36" text-anchor="middle" fill="#FF6B35" font-weight="700">HP</text>
    <text x="250" y="186" text-anchor="middle" font-weight="700">BP</text>
  </g>
</svg>`;

const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<title>inerweb.fr HabFluide — couverture Amazon KDP</title>
<style>
  :root{
    --bleu:#1B3A63; --bleu2:#2f5689; --orange:#FF6B35; --logo:#e8914a;
    --mut:#5a6b7d; --pale:#F4F7FA; --ligne:#d6dee7;
    /* Cotes calculées sur ${KDP.pages} pages, papier blanc, intérieur
       noir et blanc. Dos = ${KDP.pages} × 0,002252 pouce. */
    --fp:3.175mm; --page-l:152.4mm; --page-h:228.6mm; --dos:${DOS}mm;
    --marge:14mm;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#dfe5ec;font:14px/1.5 Calibri,"Segoe UI",system-ui,sans-serif;
    padding:24px;-webkit-print-color-adjust:exact;print-color-adjust:exact}

  .note{max-width:${LARGEUR}mm;margin:0 auto 16px;background:#fff;border-radius:10px;
    padding:16px 20px;box-shadow:0 2px 10px rgba(27,58,99,.12);color:#1d2a38}
  .note h1{font:700 19px/1.3 "Trebuchet MS",sans-serif;color:var(--bleu);margin-bottom:6px}
  .note p{margin-bottom:6px;max-width:100ch}
  .note b{color:var(--bleu)}

  /* La couverture complète : 4e — dos — 1re, fonds perdus compris. */
  .couverture{width:${LARGEUR}mm;height:${HAUTEUR}mm;display:flex;margin:0 auto;
    background:#fff;box-shadow:0 6px 24px rgba(27,58,99,.24);overflow:hidden}
  /* Le fond perdu prolonge la couleur du plat qu'il borde — sinon la
     coupe, qui tombe toujours un peu à côté, laisse une bande étrangère
     sur le bord du livre. */
  .fp{width:var(--fp);flex:none}
  .fp.cote-quatre{background:var(--pale)}
  .fp.cote-un{background:var(--bleu)}
  .plat{width:var(--page-l);flex:none;position:relative;display:flex;flex-direction:column}

  /* ---------------- 1re de couverture ---------------- */
  .un{background:var(--bleu);color:#fff;padding:calc(var(--marge) + var(--fp)) var(--marge) var(--marge)}
  /* La marque en toutes lettres, dans une police que toute machine de
     fabrication possede : plus jamais de script de substitution. */
  .marque{display:flex;align-items:center;gap:2mm;margin-bottom:8mm}
  .marque .floc{font-size:15pt;color:var(--logo)}
  .marque .iner{font:700 16pt "Trebuchet MS",sans-serif;border-bottom:2px solid var(--logo)}

  .titre{font:700 44pt/.96 "Trebuchet MS",Calibri,sans-serif;letter-spacing:-.01em}
  .titre em{font-style:normal;color:var(--orange)}
  .soustitre{margin-top:4mm;font:700 15pt/1.25 "Trebuchet MS",sans-serif;color:#fff}
  .version{margin-top:1.6mm;font-size:12pt;color:var(--orange);font-weight:700}
  .interactif{font-size:10.5pt;line-height:1.4;color:#cfdcea;max-width:44ch;margin-bottom:4mm}
  .interactif b{color:#fff}

  .croix{margin:auto 0;padding:4mm 0}
  .croix svg{width:100%;height:auto;display:block}

  .cats{display:flex;gap:2.4mm;margin-bottom:5mm}
  .cats span{border:1.5px solid var(--orange);color:var(--orange);font:700 13pt "Trebuchet MS",sans-serif;
    padding:1.6mm 4mm;border-radius:3px}
  .auteur{font-size:10.5pt;color:#cfdcea;border-top:1px solid rgba(255,255,255,.28);padding-top:3.4mm}
  .auteur b{color:#fff;display:block;font-size:12.5pt;margin-bottom:.8mm}

  /* ---------------- Dos ---------------- */
  .dos{width:var(--dos);flex:none;background:var(--bleu);color:#fff;
    display:flex;flex-direction:column;align-items:center;justify-content:space-between;
    padding:calc(var(--marge) + var(--fp)) 0 var(--marge)}
  .dos-haut{writing-mode:vertical-rl;font:700 ${DOS >= 14 ? 13 : 10.5}pt "Trebuchet MS",sans-serif;
    letter-spacing:.04em;white-space:nowrap}
  .dos-haut i{font-style:normal;color:var(--orange)}
  .dos-bas{font:700 ${DOS >= 14 ? 10 : 8.5}pt "Trebuchet MS",sans-serif;color:#cfdcea;writing-mode:vertical-rl}
  .dos-floc{font-size:13pt;color:var(--logo)}

  /* ---------------- 4e de couverture ---------------- */
  .quatre{background:var(--pale);color:#1d2a38;
    padding:calc(var(--marge) + var(--fp)) var(--marge) var(--marge)}
  .quatre h2{font:700 20pt/1.15 "Trebuchet MS",sans-serif;color:var(--bleu);margin-bottom:4mm}
  .quatre p{font-size:11pt;line-height:1.5;margin-bottom:3.4mm;max-width:44ch}
  .quatre p b{color:var(--bleu)}
  .liste{margin:0 0 4mm;padding:0;list-style:none}
  .liste li{font-size:10.5pt;line-height:1.45;padding-left:6mm;position:relative;margin-bottom:2mm}
  .liste li::before{content:"";position:absolute;left:1.5mm;top:1.8mm;width:2.2mm;height:2.2mm;
    background:var(--orange);border-radius:50%}
  .encart{background:#fff;border-left:3px solid var(--orange);border-radius:0 4px 4px 0;
    padding:3.4mm 4mm;margin-bottom:4mm}
  .encart-qr{display:flex;gap:4mm;align-items:center}
  .qr-accueil{flex:none;margin:0;text-align:center}
  .qr-accueil img{width:21mm;height:21mm;display:block}
  .qr-accueil figcaption{font:700 8.5pt "Trebuchet MS",sans-serif;color:var(--bleu);margin-top:1mm}
  .encart h3{font:700 11pt "Trebuchet MS",sans-serif;color:var(--bleu);margin-bottom:1.6mm}
  .encart p{font-size:10pt;margin:0;color:var(--mut);max-width:none}
  .avert{font-size:9pt;color:var(--mut);line-height:1.4;margin-bottom:auto}
  .pied4{margin-top:auto;display:flex;align-items:flex-end;justify-content:space-between;gap:4mm}
  .pied4 .site{font:700 13pt "Trebuchet MS",sans-serif;color:var(--bleu)}
  .pied4 .site small{display:block;font:400 9pt Calibri,sans-serif;color:var(--mut);margin-top:1mm}
  /* Zone réservée au code-barres ISBN : KDP l'imprime lui-même. Elle doit
     rester blanche et libre — 2 x 1,2 pouces minimum. */
  .isbn{width:50.8mm;height:30.5mm;background:#fff;border:1px dashed var(--ligne);
    display:flex;align-items:center;justify-content:center;flex:none}
  .isbn span{font-size:7.6pt;color:#b6c2cf;text-align:center;line-height:1.3}

  /* ---------------- Le fichier qu'on téléverse ---------------- */
  /* Une seule page, aux cotes exactes, sans la notice ni les ombres. */
  @page{size:${LARGEUR}mm ${HAUTEUR}mm;margin:0}
  @media print{
    body{background:#fff;padding:0}
    .note{display:none}
    .couverture{box-shadow:none;margin:0}
    .isbn{border-color:#fff}
    .isbn span{color:#fff}
  }
</style></head><body>

<div class="note">
  <h1>Couverture Amazon KDP — inerweb.fr HAB-FLUIDE, partie théorique</h1>
  <p>Format exact, prêt pour le téléversement : <b>${fr(LARGEUR)} × ${fr(HAUTEUR)} mm</b>
     (${fr((LARGEUR / 25.4).toFixed(3))} × ${fr((HAUTEUR / 25.4).toFixed(2))} pouces), fonds perdus de 3,175 mm compris.
     Dos de <b>${fr(DOS)} mm</b>, calculé sur <b>${KDP.pages} pages</b> en papier blanc noir et blanc
     (${KDP.pages} × 0,002252 pouce). Cette page est <b>générée</b> : si la pagination bouge,
     <code>npm run couverture</code> la refait juste.</p>
  <p>Le rectangle en bas de la 4e de couverture est la <b>zone réservée au code-barres ISBN</b> :
     Amazon l'imprime lui-même, rien ne doit s'y trouver. Son cadre ne s'imprime pas.</p>
</div>

<div class="couverture">
  <div class="fp cote-quatre"></div>

  <!-- ============ 4e DE COUVERTURE ============ -->
  <div class="plat quatre">
    <h2>Toute la théorie de l’épreuve, dans l’ordre du métier</h2>

    <p>Ce livre couvre <b>l’intégralité du programme théorique</b> de l’attestation d’aptitude
       à la manipulation des fluides frigorigènes, pour les catégories <b>A1, A2, D et E</b>,
       selon l’arrêté du 21 novembre 2025 et le règlement (UE) 2024/573.</p>

    <ul class="liste">
      <li><b>Dix-neuf chapitres</b>, de la sécurité aux opérations, en passant par le fluide et la machine.</li>
      <li>Chaque chapitre s’ouvre sur <b>ce que le référentiel exige</b>, code par code.</li>
      <li>Des <b>questions type examen posées avant la lecture</b> : on se situe d’abord, on lit ensuite,
          on se corrige en fin de chapitre.</li>
      <!-- Espaces insécables dans les guillemets : sans elles, le chevron
           fermant part seul en tête de ligne. -->
      <li>Plus de cent schémas techniques, des encadrés «&nbsp;à retenir&nbsp;»
          et «&nbsp;geste interdit&nbsp;», des pages à remplir.</li>
    </ul>

    <div class="encart encart-qr">
      <div>
        <h3>Un livre relié aux cours animés d’inerweb.fr</h3>
        <p>Quatre-vingt-quinze QR codes mènent aux cours du site, animés et racontés
           à voix haute : schémas en mouvement, questions corrigées, capsules audio.
           Les adresses sont aussi écrites en clair : un navigateur suffit.</p>
      </div>
      <figure class="qr-accueil">
        <img src="${QR_ACCUEIL}" alt="QR code vers inerweb.fr">
        <figcaption>inerweb.fr</figcaption>
      </figure>
    </div>

    <p class="avert">Ce livre prépare l’épreuve théorique ; il ne délivre aucune attestation :
       seul un organisme évaluateur certifié le fait. Les gestes professionnels et l’épreuve
       pratique feront l’objet du prochain livre, consacré à la partie pratique. Aucune question officielle d’examen ne figure dans cet ouvrage.</p>

    <div class="pied4">
      <div class="site">inerweb.fr
        <small>Ressources, cours animés<br>et simulateurs en accès libre</small>
      </div>
      <div class="isbn"><span>Zone réservée<br>au code-barres<br>ISBN</span></div>
    </div>
  </div>

  <!-- ============ DOS ============ -->
  <div class="dos">
    ${DOS_ECRIT
    ? `<div class="dos-haut">HAB-FLUIDE <i>· partie théorique</i></div>
    <div class="dos-floc">❄</div>
    <div class="dos-bas">F. Henninot</div>`
    : `<div class="dos-floc">❄</div>`}
  </div>

  <!-- ============ 1re DE COUVERTURE ============ -->
  <div class="plat un">
    <div class="marque"><span class="floc">❄</span><span class="iner">inerweb.fr</span></div>

    <h1 class="titre">HAB<em>-FLUIDE</em></h1>
    <p class="soustitre">Livre sur l’habilitation des fluides</p>
    <p class="version">Partie théorique · préparation à l’évaluation théorique</p>

    <div class="croix">${CIRCUIT}</div>

    <p class="interactif"><b>Livre interactif</b> — 95 QR codes ouvrent les cours
       animés et racontés d’inerweb.fr : schémas en mouvement, voix, corrections.</p>
    <div class="cats"><span>A1</span><span>A2</span><span>D</span><span>E</span></div>
    <p class="auteur"><b>F. Henninot</b>
      Enseignant en filière froid et climatisation</p>
  </div>

  <div class="fp cote-un"></div>
</div>
</body></html>`;

const fichier = path.join(LIVRET, 'couverture-kdp.html');
fs.writeFileSync(fichier, html, 'utf8');

/* ---- Le PDF de téléversement, par le même moteur que l'intérieur ---- */
fs.mkdirSync(DIST, { recursive: true });
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
let pdf = '(Chrome absent : pas de PDF)';
if (fs.existsSync(CHROME)) {
  const cible = path.join(DIST, `${NOM}.pdf`);
  execFileSync(CHROME, [
    '--headless', '--disable-gpu', '--no-pdf-header-footer',
    `--print-to-pdf=${cible}`, '--virtual-time-budget=60000',
    'file:///' + fichier.replace(/\\/g, '/'),
  ], { stdio: 'ignore', timeout: 300000 });
  pdf = path.relative(process.cwd(), cible);
  /* Chrome signe le PDF « HeadlessChrome » et laisse l'auteur vide : on
     repasse des métadonnées d'édition propres. Polish non bloquant —
     verifier-kdp.py reste le gendarme. */
  try {
    execFileSync('python', ['-c', [
      'import pymupdf, sys',
      'd = pymupdf.open(sys.argv[1])',
      'd.set_metadata({"title": "inerweb.fr HAB-FLUIDE — partie théorique (couverture)",',
      ' "author": "F. Henninot", "creator": "inerWeb — chaîne de fabrication livret/build"})',
      'd.saveIncr()',
    ].join('\n'), cible], { stdio: 'ignore', timeout: 60000 });
  } catch { console.log('  (métadonnées de couverture non posées — python/pymupdf indisponible)'); }
}

console.log('Couverture Amazon KDP');
console.log(`  ${KDP.pages} pages · dos ${DOS} mm · ${LARGEUR} x ${HAUTEUR} mm, fonds perdus compris`);
console.log(`  dos ${DOS_ECRIT ? 'titré' : 'nu (trop étroit pour du texte)'}`);
console.log(`✔ ${path.relative(process.cwd(), fichier)}`);
console.log(`✔ ${pdf}`);
