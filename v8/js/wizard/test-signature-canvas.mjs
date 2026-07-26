// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// ZONE DE SIGNATURE : LE CANVAS N'EXPORTE QUE LE TRACÉ (lot B3, brique 4)
//
// Pourquoi : le canvas peignait lui-même un fond blanc et une ligne de
// base pointillée. Un canvas JAMAIS DESSINÉ produisait donc un PNG
// impeccable et NON uniforme — que le refus du vide absolu (brique 3)
// laissait passer. Le fond et le repère sont désormais du DÉCOR CSS,
// derrière le canvas : ce qui sort de canvas.toDataURL() est le tracé
// du signataire, et rien d'autre.
//
// La preuve se TIRE : on branche un contexte 2D ENREGISTREUR sur le
// canvas et on regarde ce que le module y peint. À l'ouverture et
// après « Effacer », il ne doit y avoir AUCUNE opération de peinture
// (fillRect, stroke, fillText…) — seulement un effacement.
//
// Exécution : node v8/js/wizard/test-signature-canvas.mjs
// ============================================================

import { installerDocumentFactice, ElementFactice }
  from '../core/shim-dom-tests.mjs';

installerDocumentFactice();

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else {
    nbEchecs += 1;
    console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`);
  }
}

/** Opérations d'un contexte 2D qui DÉPOSENT quelque chose sur l'image. */
const OPERATIONS_DE_PEINTURE = [
  'fillRect', 'stroke', 'fill', 'fillText', 'strokeText', 'drawImage',
  'putImageData', 'strokeRect'
];

/** Contexte 2D ENREGISTREUR : ne dessine rien, note tout. */
function contexteEnregistreur() {
  const journal = [];
  const noter = (nom) => (...args) => { journal.push({ nom, args }); };
  const ctx = { journal };
  for (const nom of ['save', 'restore', 'beginPath', 'moveTo', 'lineTo',
    'setLineDash', 'clearRect', 'closePath', 'arc', 'rect',
    ...OPERATIONS_DE_PEINTURE]) {
    ctx[nom] = noter(nom);
  }
  return ctx;
}

// Le shim n'a ni canvas ni layout : on les fournit ici, au plus juste.
ElementFactice.prototype.getContext = function getContext() {
  if (!this._contexte2d) this._contexte2d = contexteEnregistreur();
  return this._contexte2d;
};
ElementFactice.prototype.getBoundingClientRect = function rect() {
  return { left: 0, top: 0, width: 700, height: 350 };
};
ElementFactice.prototype.setPointerCapture = function () {};
ElementFactice.prototype.releasePointerCapture = function () {};
ElementFactice.prototype.hasPointerCapture = function () { return false; };
ElementFactice.prototype.toDataURL = function () {
  return 'data:image/png;base64,SIMULATION';
};

const { creerSignature } = await import('./signature.js');

const conteneur = document.createElement('div');
document.body.appendChild(conteneur);
const zone = creerSignature(conteneur, 'Signature du technicien');
const canvas = conteneur.querySelector('.zone-signature__canvas');
const ctx = canvas.getContext('2d');

/** Les opérations de peinture enregistrées depuis le début. */
const peintures = () => ctx.journal
  .filter((op) => OPERATIONS_DE_PEINTURE.includes(op.nom))
  .map((op) => op.nom);

// ------------------------------------------------------------
// 1. À l'ouverture : rien n'est peint sur le canvas
// ------------------------------------------------------------
verifier('le canvas est dimensionné (le module a bien tourné)',
  canvas.width === 1400 && canvas.height === 700,
  `${canvas.width}x${canvas.height}`);
verifier('OUVERTURE : AUCUNE opération de peinture sur le canvas',
  peintures().length === 0, peintures().join(', '));
verifier('la zone se déclare vide',
  zone.estVide() === true);

// ------------------------------------------------------------
// 2. Le décor (fond blanc + ligne de base) est du CSS, pas du canvas
// ------------------------------------------------------------
{
  const styles = document.querySelectorAll('style')
    .map((el) => el.textContent || el.innerHTML).join('\n');
  verifier('le fond blanc est porté par le CADRE en CSS, jamais peint',
    /\.zone-signature__cadre[^}]*background:\s*#ffffff/.test(styles), styles.slice(0, 80));
  verifier('la ligne de base est un repère CSS (::before), jamais peinte',
    styles.includes('.zone-signature__cadre::before')
    && /dashed/.test(styles));
  verifier('le canvas passe AU-DESSUS du repère (le tracé n’est pas barré)',
    /\.zone-signature__canvas[^}]*position:\s*relative/.test(styles)
    && /\.zone-signature__canvas[^}]*z-index:\s*1/.test(styles));
}

// ------------------------------------------------------------
// 3. Après « Effacer » : toujours aucune peinture
// ------------------------------------------------------------
{
  const avant = peintures().length;
  zone.effacer();
  verifier('EFFACER : aucune peinture ajoutée (on efface, on ne repeint pas)',
    peintures().length === avant,
    peintures().slice(avant).join(', '));
  verifier('EFFACER : le canvas est bien nettoyé (clearRect appelé)',
    ctx.journal.some((op) => op.nom === 'clearRect'));
  verifier('après effacement, la zone se redéclare vide',
    zone.estVide() === true);
}

// ------------------------------------------------------------
// 4. Quand le signataire trace, ÇA, ça peint
// ------------------------------------------------------------
{
  canvas.declencher('pointerdown',
    { button: 0, pointerId: 1, clientX: 10, clientY: 10,
      preventDefault() {} });
  canvas.declencher('pointermove',
    { pointerId: 1, clientX: 40, clientY: 30, preventDefault() {} });
  canvas.declencher('pointerup', { pointerId: 1, preventDefault() {} });
  verifier('TRACÉ : le trait du signataire, lui, est peint (stroke)',
    peintures().includes('stroke'));
  verifier('TRACÉ : la zone n’est plus vide',
    zone.estVide() === false);
  const peinturesApresTrace = peintures().length;
  zone.effacer();
  verifier('EFFACER après un tracé : rien n’est repeint, la zone redevient vide',
    peintures().length === peinturesApresTrace && zone.estVide() === true);
}

console.log(`\n${nbOk} OK, ${nbEchecs} échec(s) [zone de signature : le canvas n’exporte que le tracé]`);
process.exit(nbEchecs === 0 ? 0 : 1);
