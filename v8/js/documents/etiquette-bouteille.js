// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — étiquette QR d'une bouteille (V9.2, vague 2)
// Modale d'aperçu imprimable : étiquette individuelle 50×70 mm (code
// lisible + code_public + QR pointant vers « #/b/<code_public> »,
// hors-ligne, indépendant de toute IP/domaine), SANS logo (pas de
// place sur une étiquette de contenant) ; et planche A4 en option
// (grille 3×3 de la même étiquette), qui elle affiche un bandeau
// logo inerWeb Fluide + 2 emplacements réservés (« Logo établissement »,
// « Logo groupement ») UNE SEULE FOIS en haut de la planche.
//
// Patron repris À L'IDENTIQUE de documents/etiquette-machine.js (modale
// + @media print scopé, mêmes classes CSS préfixées, même mécanisme
// obtenirQRCode/QRCode vendored). Seule différence structurelle : le
// bandeau logo + emplacements réservés, propre à la planche bouteille.
// ============================================================

import { modale, ICONES } from '../views/communs.js';
import { esc } from '../core/utils.js';
import { obtenirQRCode } from '../lib/qrcode.js';

/** Taille en pixels du QR généré (avant mise à l'échelle CSS). */
const QR_PIXELS = 200;

/**
 * Génère le contenu du QR pour une bouteille : chemin relatif hors-ligne,
 * jamais d'URL absolue ni de domaine codé en dur (même règle que les
 * machines — cf. documents/etiquette-machine.js::contenuQR).
 * Exportée pour permettre aux tests d'inspecter le texte exact demandé
 * à la lib QR sans avoir à rendre un canvas réel (impossible sous Node).
 * @param {string} codePublic
 * @returns {string}
 */
export function contenuQR(codePublic) {
  return '#/b/' + codePublic;
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
   les zones QR à générer séparément). Pas de logo dessus : pas de
   place sur une étiquette de contenant 50×70 mm.
   ============================================================ */

/**
 * @param {object} bouteille
 * @param {string} suffixeId - distingue la zone QR d'une case à l'autre
 *   dans la planche (ex. « -planche-3 ») ; vide pour l'aperçu unique.
 * @returns {string} HTML
 */
function gabaritEtiquetteQR(bouteille, suffixeId) {
  const idQR = 'etiquette-qr' + suffixeId;
  return '<div class="etiquette-qr-machine">'
    + '<div class="etiquette-qr-entete">CONTENANT SUIVI — inerWeb Fluide</div>'
    + '<div class="etiquette-qr-corps">'
    + '<div class="etiquette-qr-zone" id="' + esc(idQR) + '"></div>'
    + '<div class="etiquette-qr-texte">'
    + '<span class="etiquette-qr-code">' + esc(bouteille.code) + '</span>'
    + '<span class="etiquette-qr-code-public">' + esc(bouteille.codePublic) + '</span>'
    + '<span class="etiquette-qr-designation">' + esc(bouteille.fluide) + '</span>'
    + '</div>'
    + '</div>'
    + '</div>';
}

/* ============================================================
   Bandeau logo + 2 emplacements réservés (« Logo établissement »,
   « Logo groupement »), affiché UNE SEULE FOIS en haut de la planche
   A4 — jamais sur l'étiquette individuelle ni répété par case.
   Patron repris de app.js:93-98 (logo sidebar), classes CSS déjà
   posées dans v8/css/coquille.css (.sidebar-logo, .logo-carre,
   .logo-textes, .logo-nom, .logo-fluide, .logo-sous-titre) : ici,
   variante locale « planche-bandeau » car le fond de la sidebar est
   marine alors que la planche s'imprime sur fond blanc.
   ============================================================ */

function gabaritBandeauPlanche() {
  return '<div class="planche-bandeau">'
    + '<div class="planche-bandeau-logo">'
    + '<span class="logo-carre">' + ICONES.flocon + '</span>'
    + '<div class="logo-textes">'
    + '<div class="planche-bandeau-nom">inerWeb <span class="logo-fluide">Fluide</span></div>'
    + '<div class="planche-bandeau-sous-titre">Traçabilité F-Gas</div>'
    + '</div>'
    + '</div>'
    + '<div class="planche-bandeau-emplacements">'
    + '<div class="planche-emplacement">'
    + '<div class="planche-emplacement-cadre"></div>'
    + '<span class="planche-emplacement-legende">Logo établissement</span>'
    + '</div>'
    + '<div class="planche-emplacement">'
    + '<div class="planche-emplacement-cadre"></div>'
    + '<span class="planche-emplacement-legende">Logo groupement</span>'
    + '</div>'
    + '</div>'
    + '</div>';
}

/* ============================================================
   Styles (injectés une fois, classes préfixées « etiquette-qr » pour
   l'étiquette elle-même — identiques à etiquette-machine.js — et
   « planche-bandeau »/« planche-emplacement » pour le bandeau logo,
   propre à ce document)
   ============================================================ */

const STYLE_ETIQUETTE_ID = 'style-etiquette-qr-bouteille';

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

    /* Bandeau logo + emplacements réservés, une seule fois en haut
       de la planche (jamais sur l'étiquette individuelle). */
    .planche-bandeau {
      grid-column: 1 / -1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 6px;
      padding: 10px 12px;
      background: #ffffff;
      border: 1px solid var(--bordure-2);
      border-radius: var(--rayon-bouton);
    }
    .planche-bandeau-logo {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .planche-bandeau-nom {
      font-family: var(--police-titres);
      font-weight: 700;
      font-size: 14px;
      color: var(--texte);
      line-height: 1.2;
    }
    .planche-bandeau-nom .logo-fluide {
      color: var(--marine-900);
    }
    .planche-bandeau-sous-titre {
      font-size: 8px;
      font-weight: 600;
      letter-spacing: .14em;
      text-transform: uppercase;
      color: var(--texte-3);
      margin-top: 1px;
    }
    .planche-bandeau-emplacements {
      display: flex;
      gap: 14px;
    }
    .planche-emplacement {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
    }
    .planche-emplacement-cadre {
      width: 30mm;
      height: 15mm;
      border: 1px dashed var(--bordure);
      border-radius: 4px;
      background: var(--fond-2);
    }
    .planche-emplacement-legende {
      font-size: 7px;
      color: var(--texte-faible);
      text-align: center;
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
 * Ouvre la modale d'aperçu de l'étiquette QR d'une bouteille, avec
 * bascule vers une planche A4 (grille 3×3 de la même étiquette,
 * bandeau logo + emplacements réservés affiché une seule fois en haut).
 * @param {{ store: object }} ctx
 * @param {string} bouteilleId
 * @returns {Promise<void>}
 */
export async function ouvrirEtiquette(ctx, bouteilleId) {
  const bouteilles = await ctx.store.getBouteilles();
  const bouteille = bouteilles.find((b) => b.id === bouteilleId);
  if (!bouteille) return;

  assurerStyleEtiquette();

  let modePlanche = false;

  const { fermer, racine } = modale({
    titre: 'Étiquette QR — ' + bouteille.code,
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
        + gabaritEtiquetteQR(bouteille, '') + '</div>';
      genererQRDansConteneur(
        zoneContenu.querySelector('#etiquette-qr'),
        contenuQR(bouteille.codePublic));
    } else {
      const cases = Array.from({ length: 9 }, (_, i) =>
        gabaritEtiquetteQR(bouteille, '-planche-' + i)).join('');
      zoneContenu.innerHTML = '<div class="etiquette-qr-planche">'
        + gabaritBandeauPlanche() + cases + '</div>';
      for (let i = 0; i < 9; i += 1) {
        genererQRDansConteneur(
          zoneContenu.querySelector('#etiquette-qr-planche-' + i),
          contenuQR(bouteille.codePublic));
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
