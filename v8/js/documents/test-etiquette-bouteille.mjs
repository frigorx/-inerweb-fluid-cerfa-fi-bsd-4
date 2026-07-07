// ============================================================
// Test de l'étiquette QR bouteille (V9.2, vague 2 — bouteilles)
// Exécution : node v8/js/documents/test-etiquette-bouteille.mjs
//
// Patron repris à l'identique de test-etiquette-machine.mjs (même
// contexte Node : la lib QR vendored exige window/canvas réels, donc
// non testable ici — cf. commentaire détaillé dans le test machine).
// Vérifie ce qui EST vérifiable sous Node, sans repli qui masque un
// échec :
//
//  1. Le module s'IMPORTE sans erreur sous Node.
//  2. Le texte demandé à la lib QR est exactement « #/b/<code_public> »
//     (jamais une URL absolue) — vérifié via contenuQR().
//  3. La structure de la modale (aperçu unique + bascule planche A4
//     à 9 cases) est correcte, y compris quand la lib QR est absente.
//  4. Le bandeau logo + 2 emplacements réservés (« Logo établissement »,
//     « Logo groupement ») n'apparaît PAS sur l'étiquette individuelle,
//     et apparaît EXACTEMENT UNE FOIS en haut de la planche A4 (jamais
//     répété par case).
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
   1. Import sans erreur sous Node.
   ============================================================ */
let contenuQR;
let ouvrirEtiquette;
try {
  ({ contenuQR, ouvrirEtiquette } = await import('./etiquette-bouteille.js'));
  verifier('documents/etiquette-bouteille.js s’importe sans erreur sous Node',
    typeof ouvrirEtiquette === 'function' && typeof contenuQR === 'function');
} catch (erreur) {
  nbEchecs += 1;
  console.error('ÉCHEC import de documents/etiquette-bouteille.js : ' + erreur.message);
}

const BOUTEILLE_TEST = {
  id: 'bou-1', code: 'B1', fluide: 'R404A', codePublic: 'XYZ789K'
};

/* ============================================================
   2. Contenu QR demandé : chemin relatif hors-ligne exact, jamais une
   URL absolue/domaine — vérifiable sans rendre de canvas.
   ============================================================ */
{
  const texte = contenuQR(BOUTEILLE_TEST.codePublic);
  verifier('contenuQR() produit exactement « #/b/<code_public> »',
    texte === '#/b/XYZ789K', 'obtenu : ' + texte);
  verifier('contenuQR() ne produit jamais une URL absolue/domaine codé en dur',
    !/^https?:\/\//i.test(texte) && !texte.includes('frigorx.github.io'));
}

/* ============================================================
   3. Structure de la modale (aperçu unique + planche A4 à 9 cases),
   y compris SANS bibliothèque QR disponible.
   ============================================================ */
{
  const ctx = { store: { async getBouteilles() { return [BOUTEILLE_TEST]; } } };

  let exceptionRemontee = null;
  try {
    await ouvrirEtiquette(ctx, 'bou-1');
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
  verifier('le code bouteille lisible (B1) est affiché sur l’étiquette',
    Boolean(code) && code.textContent === 'B1');
  verifier('le code_public (XYZ789K) est affiché sur l’étiquette',
    Boolean(codePublic) && codePublic.textContent === 'XYZ789K');

  /* ---- 4. Bandeau logo absent sur l'étiquette individuelle ---- */
  verifier('aucun bandeau logo sur l’étiquette individuelle (pas de place '
    + 'sur un contenant 50×70 mm)',
    !fond.querySelector('.planche-bandeau'));

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

  /* ---- 4. Bandeau logo présent EXACTEMENT une fois sur la planche ---- */
  const bandeaux = fond.querySelectorAll('.planche-bandeau');
  verifier('le bandeau logo + emplacements réservés apparaît exactement '
    + 'une fois en haut de la planche A4 (jamais répété par case)',
    bandeaux.length === 1, 'trouvé ' + bandeaux.length);

  const emplacements = fond.querySelectorAll('.planche-emplacement');
  verifier('la planche affiche bien 2 emplacements réservés '
    + '(établissement + groupement)',
    emplacements.length === 2, 'trouvé ' + emplacements.length);

  const legendes = Array.from(fond.querySelectorAll('.planche-emplacement-legende'))
    .map((e) => e.textContent);
  verifier('les légendes des emplacements réservés sont exactement '
    + '« Logo établissement » et « Logo groupement »',
    legendes.length === 2
    && legendes.includes('Logo établissement')
    && legendes.includes('Logo groupement'),
    'obtenu : ' + JSON.stringify(legendes));

  const logoCarre = fond.querySelector('.planche-bandeau .logo-carre');
  verifier('le bandeau planche reprend le pictogramme flocon (logo inerWeb Fluide)',
    Boolean(logoCarre));
}

// ---- Bilan ----
console.log('\nÀ VALIDER EN NAVIGATEUR (non testable sous Node) : le rendu '
  + 'canvas réel du QR (new window.QRCode(...) via le <script> vendored '
  + 'chargé depuis index.html) — voir v8/js/lib/qrcode-vendor.js et '
  + 'v8/index.html.');
console.log(`\n${nbOk} test(s) réussi(s), ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
