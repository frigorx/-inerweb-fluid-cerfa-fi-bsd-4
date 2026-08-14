// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// Zone de signature manuscrite (canvas) pour le wizard « Nouveau mouvement ».
// Aucune dépendance au store : usage autonome, brancher via creerSignature(conteneur).
//
// Lot B3 (25/07) : le canvas n'exporte QUE le tracé du signataire. Le
// fond blanc et le repère de ligne de base sont du décor CSS posé
// DERRIÈRE lui — une case restée vierge produit ainsi une image
// rigoureusement uniforme, que le store refuse (« zone restée vierge »).
// Preuve tirée : v8/js/wizard/test-signature-canvas.mjs.

let styleInjecte = false;

// Injecte le style une seule fois, au premier appel (aucun accès DOM à l'import).
function injecterStyle() {
  if (styleInjecte) return;
  styleInjecte = true;
  const style = document.createElement('style');
  style.textContent = `
    .zone-signature {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .zone-signature__libelle {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--texte-3, #64748b);
    }
    .zone-signature__cadre {
      position: relative;
      width: 100%;
      aspect-ratio: 2 / 1;
      background: #ffffff;
      border: 1px solid var(--bordure, #e2e8f0);
      border-radius: 10px;
      overflow: hidden;
      touch-action: none;
    }
    /* Lot B3 : le repère de ligne de base est du DÉCOR, posé sous le
       canvas — il ne doit JAMAIS entrer dans l'image exportée, sans
       quoi une case restée vierge produirait un PNG « non vide ». */
    .zone-signature__cadre::before {
      content: '';
      position: absolute;
      left: 6%;
      right: 6%;
      top: 75%;
      border-top: 1px dashed #cbd5e1;
      z-index: 0;
      pointer-events: none;
    }
    .zone-signature__canvas {
      display: block;
      position: relative;
      z-index: 1;
      width: 100%;
      height: 100%;
      cursor: crosshair;
    }
    .zone-signature__actions {
      display: flex;
      justify-content: flex-end;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Crée une zone de signature dans le conteneur fourni.
 * @param {HTMLElement} conteneur - Élément dans lequel injecter la zone de signature.
 * @param {string} [libelle] - Libellé de la zone (défaut : wizard, technicien).
 * @returns {{ estVide: () => boolean, dataURL: () => string, effacer: () => void }}
 */
export function creerSignature(conteneur, libelle = 'Signature du technicien') {
  injecterStyle();

  const texteLibelle = document.createElement('div');
  texteLibelle.textContent = libelle;

  conteneur.innerHTML = `
    <div class="zone-signature">
      <div class="zone-signature__libelle">${texteLibelle.innerHTML}</div>
      <div class="zone-signature__cadre">
        <canvas class="zone-signature__canvas"></canvas>
      </div>
      <div class="zone-signature__actions">
        <button type="button" class="btn btn-contour btn-petit zone-signature__effacer">Effacer</button>
      </div>
    </div>
  `;

  const cadre = conteneur.querySelector('.zone-signature__cadre');
  const canvas = conteneur.querySelector('.zone-signature__canvas');
  const boutonEffacer = conteneur.querySelector('.zone-signature__effacer');
  const ctx = canvas.getContext('2d');

  // Résolution interne x2 pour la netteté (retina), taille CSS pilotée par le ratio 2:1.
  const RESOLUTION = 2;
  let dessinPresent = false;
  let enTrain = false;
  let dernierPoint = null;

  // Lot B3 (25/07) — LE CANVAS N'EXPORTE QUE LE TRACÉ. Avant, il
  // peignait lui-même un fond blanc et une ligne de base pointillée :
  // une case JAMAIS DESSINÉE produisait donc une image « non vide »,
  // que le refus du vide absolu laissait passer. Le fond et le repère
  // sont maintenant du décor CSS, DERRIÈRE le canvas. On n'efface
  // plus en repeignant : on efface, tout simplement.
  function viderCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // Redimensionne le canvas selon la taille CSS réelle (ratio 2:1 imposé par le cadre).
  function redimensionner() {
    const rect = cadre.getBoundingClientRect();
    const largeurCss = Math.max(1, Math.round(rect.width));
    const hauteurCss = Math.max(1, Math.round(rect.height));
    canvas.width = largeurCss * RESOLUTION;
    canvas.height = hauteurCss * RESOLUTION;
    canvas.style.width = largeurCss + 'px';
    canvas.style.height = hauteurCss + 'px';

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0e2a47';
    ctx.lineWidth = 2 * RESOLUTION;

    // Un redimensionnement efface le trait existant (ex: rotation d'écran) :
    // on repart d'une zone vide propre plutôt que de garder un dessin déformé.
    dessinPresent = false;
    viderCanvas();
  }

  function coordonneesRelatives(evenement) {
    const rect = canvas.getBoundingClientRect();
    const x = (evenement.clientX - rect.left) * (canvas.width / rect.width);
    const y = (evenement.clientY - rect.top) * (canvas.height / rect.height);
    return { x, y };
  }

  function demarrer(evenement) {
    if (evenement.button !== undefined && evenement.button !== 0) return;
    canvas.setPointerCapture(evenement.pointerId);
    enTrain = true;
    dernierPoint = coordonneesRelatives(evenement);
    evenement.preventDefault();
  }

  function tracer(evenement) {
    if (!enTrain) return;
    const point = coordonneesRelatives(evenement);
    ctx.beginPath();
    ctx.moveTo(dernierPoint.x, dernierPoint.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    dernierPoint = point;
    dessinPresent = true;
    evenement.preventDefault();
  }

  function arreter(evenement) {
    if (!enTrain) return;
    enTrain = false;
    dernierPoint = null;
    if (evenement && evenement.pointerId !== undefined && canvas.hasPointerCapture(evenement.pointerId)) {
      canvas.releasePointerCapture(evenement.pointerId);
    }
  }

  canvas.addEventListener('pointerdown', demarrer);
  canvas.addEventListener('pointermove', tracer);
  canvas.addEventListener('pointerup', arreter);
  canvas.addEventListener('pointercancel', arreter);
  canvas.addEventListener('pointerleave', arreter);

  boutonEffacer.addEventListener('click', () => {
    effacer();
  });

  function effacer() {
    dessinPresent = false;
    viderCanvas();
  }

  function estVide() {
    return !dessinPresent;
  }

  function dataURL() {
    return canvas.toDataURL('image/png');
  }

  // Initialisation : on attend le prochain cycle de rendu pour que le conteneur
  // ait sa taille finale dans le DOM avant de calculer les dimensions du canvas.
  requestAnimationFrame(redimensionner);
  window.addEventListener('resize', redimensionner);

  return { estVide, dataURL, effacer };
}
