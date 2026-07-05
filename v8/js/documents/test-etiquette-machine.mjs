// ============================================================
// Test de l'étiquette QR machine (V9.1 — correctif QR, vague 3)
// Exécution : node v8/js/documents/test-etiquette-machine.mjs
//
// Contexte du correctif : la lib QR vendored (davidshimjs/qrcodejs)
// est conçue pour tourner en contexte GLOBAL (this = window). Sous
// Node, il n'existe ni window.QRCode ni <canvas> réel — impossible
// donc de faire réellement dessiner un QR ici. Ce test NE PRÉTEND PAS
// vérifier le rendu canvas réel (à valider en navigateur, cf. rapport).
// Il vérifie ce qui EST vérifiable sous Node, sans repli qui masque
// un échec (l'ancienne version testait un mode <table> de secours qui
// cachait que la vraie lib plantait en navigateur — cf. incident) :
//
//  1. Le module js/lib/qrcode.js s'IMPORTE sans erreur sous Node (aucune
//     exécution de code DOM à l'import : pas de lib embarquée).
//  2. obtenirQRCode() lève une erreur claire quand window.QRCode est
//     absent (cas normal sous Node, et cas d'erreur réelle en
//     navigateur si le <script> vendored n'a pas chargé).
//  3. Le texte demandé à la lib QR est exactement « #/m/<code_public> »
//     (jamais une URL absolue) — vérifié par inspection directe de
//     contenuQR(), sans jamais avoir besoin de rendre un canvas.
//  4. La structure de la modale (aperçu unique + bascule planche A4
//     à 9 cases) est correcte, y compris quand la lib QR est absente :
//     chaque zone QR affiche alors un message d'erreur visible (jamais
//     un échec silencieux ni une exception qui remonte).
//
// Aucune dépendance nouvelle : mini-DOM partagé core/shim-dom-tests.mjs.
// ============================================================

let nbOk = 0;
let nbEchecs = 0;

function verifier(libelle, condition, detail = '') {
  if (condition) {
    nbOk += 1;
    console.log(`  OK  ${libelle}`);
  } else {
    nbEchecs += 1;
    console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`);
  }
}

const { installerDocumentFactice } = await import('../core/shim-dom-tests.mjs');
installerDocumentFactice();

/* ============================================================
   1. Import sans erreur sous Node (aucune exécution de code DOM,
   contrairement à l'ancienne version qui embarquait la lib).
   ============================================================ */
let obtenirQRCode;
let contenuQR;
let ouvrirEtiquette;
try {
  ({ obtenirQRCode } = await import('../lib/qrcode.js'));
  verifier('js/lib/qrcode.js s’importe sans erreur sous Node '
    + '(ne contient plus la lib vendored, aucun code DOM exécuté à l’import)',
    typeof obtenirQRCode === 'function');
} catch (erreur) {
  nbEchecs += 1;
  console.error('ÉCHEC import de lib/qrcode.js : ' + erreur.message);
}

try {
  ({ contenuQR, ouvrirEtiquette } = await import('./etiquette-machine.js'));
  verifier('documents/etiquette-machine.js s’importe sans erreur sous Node',
    typeof ouvrirEtiquette === 'function' && typeof contenuQR === 'function');
} catch (erreur) {
  nbEchecs += 1;
  console.error('ÉCHEC import de documents/etiquette-machine.js : ' + erreur.message);
}

const MACHINE_TEST = {
  id: 'mac-1', code: 'M1', designation: 'Chambre froide test',
  fluide: 'R404A', codePublic: 'ABC123X'
};

/* ============================================================
   2. Sous Node, window.QRCode n'existe pas (le <script> vendored
   n'est chargé qu'en navigateur, depuis index.html) : obtenirQRCode()
   doit lever une erreur claire, jamais planter de façon opaque ni
   retourner une valeur bidon.
   ============================================================ */
{
  verifier('sous Node, window.QRCode est bien absent (pas de <script> '
    + 'vendored chargé — condition normale de ce test)',
    typeof window === 'undefined' || !window.QRCode);

  let leveeAttendue = false;
  let messageErreur = '';
  try {
    obtenirQRCode();
  } catch (erreur) {
    leveeAttendue = true;
    messageErreur = erreur.message;
  }
  verifier('obtenirQRCode() lève une erreur claire quand la bibliothèque '
    + 'QR est indisponible (pas de crash silencieux, pas de valeur bidon)',
    leveeAttendue && messageErreur.length > 0,
    'message obtenu : ' + JSON.stringify(messageErreur));
}

/* ============================================================
   3. Contenu QR demandé : chemin relatif hors-ligne exact, jamais une
   URL absolue/domaine — vérifiable sans rendre de canvas.
   ============================================================ */
{
  const texte = contenuQR(MACHINE_TEST.codePublic);
  verifier('contenuQR() produit exactement « #/m/<code_public> »',
    texte === '#/m/ABC123X', 'obtenu : ' + texte);
  verifier('contenuQR() ne produit jamais une URL absolue/domaine codé en dur',
    !/^https?:\/\//i.test(texte) && !texte.includes('frigorx.github.io'));
}

/* ============================================================
   4. Structure de la modale (aperçu unique + planche A4 à 9 cases),
   y compris SANS bibliothèque QR disponible : chaque zone QR doit
   afficher un message d'erreur visible, jamais un échec silencieux
   ni une exception qui remonte jusqu'à ouvrirEtiquette().
   ============================================================ */
{
  const ctx = { store: { async getMachines() { return [MACHINE_TEST]; } } };

  let exceptionRemontee = null;
  try {
    await ouvrirEtiquette(ctx, 'mac-1');
  } catch (erreur) {
    exceptionRemontee = erreur;
  }
  verifier('ouvrirEtiquette() ne plante pas même sans bibliothèque QR '
    + 'disponible (l’erreur est affichée dans la zone, pas propagée)',
    exceptionRemontee === null,
    exceptionRemontee ? String(exceptionRemontee.message) : '');

  const fond = document.body.querySelector('.modale-fond');
  verifier('la modale d’étiquette s’ouvre bien', Boolean(fond));

  const etiquetteUnique = fond.querySelector('.etiquette-qr-machine');
  verifier('l’aperçu unique affiche une étiquette', Boolean(etiquetteUnique));

  const zoneQR = fond.querySelector('#etiquette-qr');
  verifier('la zone QR de l’étiquette unique n’est pas vide '
    + '(message d’erreur affiché en l’absence de bibliothèque QR — '
    + 'à valider en navigateur pour le rendu canvas réel)',
    Boolean(zoneQR) && zoneQR.innerHTML.length > 0);
  verifier('la zone QR affiche le message d’erreur attendu en l’absence '
    + 'de bibliothèque QR (pas un échec silencieux)',
    Boolean(zoneQR) && /etiquette-qr-erreur/.test(zoneQR.innerHTML)
    && /Bibliothèque QR indisponible/.test(zoneQR.innerHTML));

  const code = fond.querySelector('.etiquette-qr-code');
  const codePublic = fond.querySelector('.etiquette-qr-code-public');
  verifier('le code machine lisible (M1) est affiché sur l’étiquette',
    Boolean(code) && code.textContent === 'M1');
  verifier('le code_public (ABC123X) est affiché sur l’étiquette',
    Boolean(codePublic) && codePublic.textContent === 'ABC123X');

  // Bascule planche A4
  fond.querySelector('#etiquette-qr-planche').declencher('click');
  const casesPlanche = fond.querySelectorAll('.etiquette-qr-machine');
  verifier('la planche A4 affiche bien 9 étiquettes (grille 3×3)',
    casesPlanche.length === 9, 'trouvé ' + casesPlanche.length);

  const zonesQRPlanche = fond.querySelectorAll('.etiquette-qr-zone');
  verifier('les 9 zones QR de la planche sont toutes générées (non vides, '
    + 'message d’erreur affiché en l’absence de bibliothèque QR)',
    zonesQRPlanche.length === 9
    && zonesQRPlanche.every((z) => z.innerHTML.length > 0));
}

// ---- Bilan ----
console.log('\nÀ VALIDER EN NAVIGATEUR (non testable sous Node) : le rendu '
  + 'canvas réel du QR (new window.QRCode(...) via le <script> vendored '
  + 'chargé depuis index.html) — voir v8/js/lib/qrcode-vendor.js et '
  + 'v8/index.html.');
console.log(`\n${nbOk} test(s) réussi(s), ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
