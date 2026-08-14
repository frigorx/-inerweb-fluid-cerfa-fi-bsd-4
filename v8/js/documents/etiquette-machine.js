// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — étiquette QR d'un équipement (V9.1, vague 3)
// Modale d'aperçu imprimable : étiquette 50×70 mm (code lisible +
// code_public + QR pointant vers « #/m/<code_public> », hors-ligne,
// indépendant de toute IP/domaine) et planche A4 en option (grille
// 3×3 de la même étiquette, pour un lot d'équipements identiques —
// V3 : liste multi-machines, ici la machine courante répétée).
//
// Patron repris de documents/plaque-fgas.js (modale + @media print
// scopé). Le QR est rendu par la lib vendored (v8/js/lib/qrcode-vendor.js,
// chargée en <script> classique global depuis index.html, AVANT app.js) :
// elle dessine sur un <canvas> puis exporte un PNG via toDataURL, ou
// bascule sur un rendu <table> si le canvas n'est pas disponible. Si la
// bibliothèque elle-même est absente (script non chargé), un message
// d'erreur visible remplace la zone QR — jamais d'échec silencieux.
// ============================================================

import { modale, ICONES } from '../views/communs.js';
import { esc } from '../core/utils.js';
import { obtenirQRCode } from '../lib/qrcode.js';

/** Taille en pixels du QR généré (avant mise à l'échelle CSS). */
const QR_PIXELS = 200;

/**
 * Génère le contenu du QR pour une machine : chemin relatif hors-ligne,
 * jamais d'URL absolue ni de domaine codé en dur (cf. décisions figées
 * de cet incrément — piège v7 : js/qr-print.js codait frigorx.github.io).
 * Exportée pour permettre aux tests d'inspecter le texte exact demandé
 * à la lib QR sans avoir à rendre un canvas réel (impossible sous Node).
 * @param {string} codePublic
 * @returns {string}
 */
export function contenuQR(codePublic) {
  return '#/m/' + codePublic;
}

/**
 * Génère un QR code dans un conteneur DOM déjà monté, puis retourne un
 * dataURL PNG si un <canvas> a pu être utilisé (navigateur réel), sinon
 * une chaîne vide (le rendu <table> reste visible dans le conteneur,
 * l'aperçu à l'écran et l'impression restent corrects dans les deux cas).
 * Si la bibliothèque QR est indisponible (script vendored non chargé),
 * affiche un message d'erreur lisible dans le conteneur plutôt que de
 * laisser planter l'appelant ou de laisser la zone silencieusement vide.
 * @param {HTMLElement} conteneur - élément vide, DÉJÀ attaché au document
 * @param {string} texte - contenu à encoder
 * @returns {string} dataURL PNG ou chaîne vide
 */
function genererQRDansConteneur(conteneur, texte) {
  let QRCode;
  try {
    QRCode = obtenirQRCode();
  } catch (erreur) {
    conteneur.innerHTML = '<span class="etiquette-qr-erreur">'
      + esc(erreur.message) + '</span>';
    return '';
  }
  new QRCode(conteneur, {
    text: texte,
    width: QR_PIXELS,
    height: QR_PIXELS,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H // ~30 % de correction : tolère la bavure d'impression
  });
  const canvas = conteneur.querySelector('canvas');
  if (canvas && typeof canvas.toDataURL === 'function') {
    try {
      return canvas.toDataURL('image/png');
    } catch {
      return ''; // navigateur restreignant toDataURL : le rendu visuel suffit
    }
  }
  return '';
}

/* ============================================================
   Gabarit HTML d'une étiquette (identique pour l'aperçu unique et
   chaque case de la planche A4 — seul un suffixe d'id distingue
   les zones QR à générer séparément).
   ============================================================ */

/**
 * @param {object} machine
 * @param {string} suffixeId - distingue la zone QR d'une case à l'autre
 *   dans la planche (ex. « -planche-3 ») ; vide pour l'aperçu unique.
 * @returns {string} HTML
 */
function gabaritEtiquetteQR(machine, suffixeId) {
  const idQR = 'etiquette-qr' + suffixeId;
  return '<div class="etiquette-qr-machine">'
    + '<div class="etiquette-qr-entete">ÉQUIPEMENT SUIVI — inerWeb Fluide</div>'
    + '<div class="etiquette-qr-corps">'
    + '<div class="etiquette-qr-zone" id="' + esc(idQR) + '"></div>'
    + '<div class="etiquette-qr-texte">'
    + '<span class="etiquette-qr-code">' + esc(machine.code) + '</span>'
    + '<span class="etiquette-qr-code-public">' + esc(machine.codePublic) + '</span>'
    + '<span class="etiquette-qr-designation">' + esc(machine.designation) + '</span>'
    + '</div>'
    + '</div>'
    + '</div>';
}

/* ============================================================
   Styles (injectés une fois, classes préfixées « etiquette-qr »)
   ============================================================ */

const STYLE_ETIQUETTE_ID = 'style-etiquette-qr-machine';

function assurerStyleEtiquette() {
  if (document.getElementById(STYLE_ETIQUETTE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ETIQUETTE_ID;
  style.textContent = `
    .etiquette-qr-apercu {
      display: flex;
      justify-content: center;
      padding: 24px 16px;
      background: var(--fond-2);
      border-radius: var(--rayon-bouton);
    }

    .etiquette-qr-planche {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      padding: 16px;
      background: var(--fond-2);
      border-radius: var(--rayon-bouton);
    }

    /* Étiquette : proportions 50×70 mm (largeur:hauteur = 5:7) */
    .etiquette-qr-machine {
      width: 50mm;
      aspect-ratio: 5 / 7;
      border: 1px solid var(--bordure);
      border-radius: var(--rayon-chip);
      background: #ffffff;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .etiquette-qr-entete {
      padding: 4px 5px;
      background: var(--marine-900);
      color: #ffffff;
      font-family: var(--police-titres);
      font-weight: 600;
      font-size: 6.5px;
      letter-spacing: .03em;
      text-align: center;
      line-height: 1.3;
    }

    .etiquette-qr-corps {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 6px 5px;
    }

    .etiquette-qr-zone {
      width: 34mm;
      max-width: 100%;
    }
    .etiquette-qr-zone canvas,
    .etiquette-qr-zone img,
    .etiquette-qr-zone table {
      width: 100% !important;
      height: auto !important;
    }
    .etiquette-qr-erreur {
      display: block;
      font-size: 6px;
      line-height: 1.3;
      color: var(--danger);
      text-align: center;
    }

    .etiquette-qr-texte {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 1px;
    }
    .etiquette-qr-code {
      font-family: var(--police-mono);
      font-weight: 600;
      font-size: 9px;
      color: var(--texte);
    }
    .etiquette-qr-code-public {
      font-family: var(--police-mono);
      font-size: 7px;
      letter-spacing: .04em;
      color: var(--texte-3);
    }
    .etiquette-qr-designation {
      font-size: 6.5px;
      color: var(--texte-2);
      line-height: 1.25;
    }

    /* Impression : uniquement la zone d'étiquette(s) active, à sa taille
       réelle — le reste de l'application et de la modale est masqué. */
    @media print {
      body * { visibility: hidden; }

      .etiquette-qr-apercu, .etiquette-qr-apercu *,
      .etiquette-qr-planche, .etiquette-qr-planche * {
        visibility: visible;
      }

      .etiquette-qr-apercu, .etiquette-qr-planche {
        position: fixed;
        inset: 0;
        margin: auto;
        background: #ffffff;
        padding: 0;
      }
      .etiquette-qr-planche {
        align-content: start;
        gap: 4mm;
        padding: 10mm;
      }
    }
  `;
  document.head.appendChild(style);
}

/* ============================================================
   Ouverture de la modale
   ============================================================ */

/**
 * Ouvre la modale d'aperçu de l'étiquette QR d'un équipement, avec
 * bascule vers une planche A4 (grille 3×3 de la même étiquette).
 * @param {{ store: object }} ctx
 * @param {string} machineId
 * @returns {Promise<void>}
 */
export async function ouvrirEtiquette(ctx, machineId) {
  const machines = await ctx.store.getMachines();
  const machine = machines.find((m) => m.id === machineId);
  if (!machine) return;

  assurerStyleEtiquette();

  let modePlanche = false;

  const { fermer, racine } = modale({
    titre: 'Étiquette QR — ' + machine.designation,
    contenuHtml: '<div id="etiquette-qr-contenu"></div>',
    actionsHtml:
      '<button type="button" id="etiquette-qr-fermer" class="btn btn-secondaire">Fermer</button>'
      + '<button type="button" id="etiquette-qr-planche" class="btn btn-contour">'
      + ICONES.grille + '<span>Planche A4 (3×3)</span></button>'
      + '<button type="button" id="etiquette-qr-imprimer" class="btn btn-marine">'
      + ICONES.imprimer + '<span>Imprimer</span></button>'
  });

  const zoneContenu = racine.querySelector('#etiquette-qr-contenu');
  const boutonPlanche = racine.querySelector('#etiquette-qr-planche');

  /** (Re)rend l'aperçu (unique ou planche) puis génère le(s) QR. */
  function rendreApercu() {
    if (!modePlanche) {
      zoneContenu.innerHTML = '<div class="etiquette-qr-apercu">'
        + gabaritEtiquetteQR(machine, '') + '</div>';
      genererQRDansConteneur(
        zoneContenu.querySelector('#etiquette-qr'),
        contenuQR(machine.codePublic));
    } else {
      const cases = Array.from({ length: 9 }, (_, i) =>
        gabaritEtiquetteQR(machine, '-planche-' + i)).join('');
      zoneContenu.innerHTML = '<div class="etiquette-qr-planche">' + cases + '</div>';
      for (let i = 0; i < 9; i += 1) {
        genererQRDansConteneur(
          zoneContenu.querySelector('#etiquette-qr-planche-' + i),
          contenuQR(machine.codePublic));
      }
    }
    boutonPlanche.innerHTML = ICONES.grille
      + '<span>' + (modePlanche ? 'Étiquette seule' : 'Planche A4 (3×3)') + '</span>';
  }

  racine.querySelector('#etiquette-qr-fermer').addEventListener('click', function () {
    fermer();
  });
  boutonPlanche.addEventListener('click', function () {
    modePlanche = !modePlanche;
    rendreApercu();
  });
  racine.querySelector('#etiquette-qr-imprimer').addEventListener('click', function () {
    window.print();
  });

  rendreApercu();
}
