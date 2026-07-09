// ============================================================
// inerWeb Fluide — étiquette QR d'un client / détenteur (référence client)
// Modale d'aperçu imprimable : étiquette individuelle 50×70 mm (raison
// sociale + code_public + QR pointant vers « #/cl/<code_public> », hors-
// ligne, indépendant de toute IP/domaine) ; planche A4 en option (grille
// 3×3), avec bandeau logo + emplacements réservés une seule fois en haut.
//
// À coller chez le client : un scan ouvre sa fiche et la liste de ses
// équipements F-Gas. Patron repris À L'IDENTIQUE de etiquette-bouteille.js
// (seuls le texte et le préfixe de route « #/cl/ » changent).
// ============================================================

import { modale, ICONES } from '../views/communs.js';
import { esc } from '../core/utils.js';
import { obtenirQRCode } from '../lib/qrcode.js';

/** Taille en pixels du QR généré (avant mise à l'échelle CSS). */
const QR_PIXELS = 200;

/**
 * Contenu du QR d'un client : chemin relatif hors-ligne, jamais d'URL
 * absolue ni de domaine codé en dur (même règle que machines/bouteilles).
 * Exportée pour les tests (inspection du texte exact sans canvas).
 * @param {string} codePublic
 * @returns {string}
 */
export function contenuQR(codePublic) {
  return '#/cl/' + codePublic;
}

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
    correctLevel: QRCode.CorrectLevel.H
  });
  const canvas = conteneur.querySelector('canvas');
  if (canvas && typeof canvas.toDataURL === 'function') {
    try {
      return canvas.toDataURL('image/png');
    } catch {
      return '';
    }
  }
  return '';
}

/**
 * @param {object} client
 * @param {string} suffixeId - distingue la zone QR d'une case à l'autre.
 * @returns {string} HTML
 */
function gabaritEtiquetteQR(client, suffixeId) {
  const idQR = 'etiquette-qr-client' + suffixeId;
  return '<div class="etiquette-qr-machine">'
    + '<div class="etiquette-qr-entete">DÉTENTEUR — inerWeb Fluide</div>'
    + '<div class="etiquette-qr-corps">'
    + '<div class="etiquette-qr-zone" id="' + esc(idQR) + '"></div>'
    + '<div class="etiquette-qr-texte">'
    + '<span class="etiquette-qr-client-nom">' + esc(client.raisonSociale) + '</span>'
    + '<span class="etiquette-qr-code-public">' + esc(client.codePublic) + '</span>'
    + '<span class="etiquette-qr-designation">Scanner pour les équipements</span>'
    + '</div>'
    + '</div>'
    + '</div>';
}

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

const STYLE_ETIQUETTE_ID = 'style-etiquette-qr-client';

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
    .planche-bandeau-logo { display: flex; align-items: center; gap: 10px; }
    .planche-bandeau-nom {
      font-family: var(--police-titres);
      font-weight: 700; font-size: 14px; color: var(--texte); line-height: 1.2;
    }
    .planche-bandeau-nom .logo-fluide { color: var(--marine-900); }
    .planche-bandeau-sous-titre {
      font-size: 8px; font-weight: 600; letter-spacing: .14em;
      text-transform: uppercase; color: var(--texte-3); margin-top: 1px;
    }
    .planche-bandeau-emplacements { display: flex; gap: 14px; }
    .planche-emplacement {
      display: flex; flex-direction: column; align-items: center; gap: 3px;
    }
    .planche-emplacement-cadre {
      width: 30mm; height: 15mm; border: 1px dashed var(--bordure);
      border-radius: 4px; background: var(--fond-2);
    }
    .planche-emplacement-legende {
      font-size: 7px; color: var(--texte-faible); text-align: center;
    }
    .etiquette-qr-machine {
      width: 50mm; aspect-ratio: 5 / 7; border: 1px solid var(--bordure);
      border-radius: var(--rayon-chip); background: #ffffff; overflow: hidden;
      display: flex; flex-direction: column;
    }
    .etiquette-qr-entete {
      padding: 4px 5px; background: var(--marine-900); color: #ffffff;
      font-family: var(--police-titres); font-weight: 600; font-size: 6.5px;
      letter-spacing: .03em; text-align: center; line-height: 1.3;
    }
    .etiquette-qr-corps {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 4px; padding: 6px 5px;
    }
    .etiquette-qr-zone { width: 34mm; max-width: 100%; }
    .etiquette-qr-zone canvas,
    .etiquette-qr-zone img,
    .etiquette-qr-zone table { width: 100% !important; height: auto !important; }
    .etiquette-qr-erreur {
      display: block; font-size: 6px; line-height: 1.3; color: var(--danger);
      text-align: center;
    }
    .etiquette-qr-texte {
      display: flex; flex-direction: column; align-items: center;
      text-align: center; gap: 1px;
    }
    .etiquette-qr-client-nom {
      font-family: var(--police-titres); font-weight: 600; font-size: 8px;
      color: var(--texte); line-height: 1.2;
    }
    .etiquette-qr-code-public {
      font-family: var(--police-mono); font-size: 7px; letter-spacing: .04em;
      color: var(--texte-3);
    }
    .etiquette-qr-designation {
      font-size: 6.5px; color: var(--texte-2); line-height: 1.25;
    }
    @media print {
      body * { visibility: hidden; }
      .etiquette-qr-apercu, .etiquette-qr-apercu *,
      .etiquette-qr-planche, .etiquette-qr-planche * { visibility: visible; }
      .etiquette-qr-apercu, .etiquette-qr-planche {
        position: fixed; inset: 0; margin: auto; background: #ffffff; padding: 0;
      }
      .etiquette-qr-planche { align-content: start; gap: 4mm; padding: 10mm; }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Ouvre la modale d'aperçu de l'étiquette QR d'un client, avec bascule
 * vers une planche A4 (grille 3×3).
 * @param {{ store: object }} ctx
 * @param {string} clientId
 * @returns {Promise<void>}
 */
export async function ouvrirEtiquetteClient(ctx, clientId) {
  const clients = await ctx.store.getClients();
  const client = clients.find((c) => c.id === clientId);
  if (!client || !client.codePublic) return;

  assurerStyleEtiquette();

  let modePlanche = false;

  const { fermer, racine } = modale({
    titre: 'Étiquette QR — ' + client.raisonSociale,
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

  function rendreApercu() {
    if (!modePlanche) {
      zoneContenu.innerHTML = '<div class="etiquette-qr-apercu">'
        + gabaritEtiquetteQR(client, '') + '</div>';
      genererQRDansConteneur(
        zoneContenu.querySelector('#etiquette-qr-client'),
        contenuQR(client.codePublic));
    } else {
      const cases = Array.from({ length: 9 }, (_, i) =>
        gabaritEtiquetteQR(client, '-planche-' + i)).join('');
      zoneContenu.innerHTML = '<div class="etiquette-qr-planche">'
        + gabaritBandeauPlanche() + cases + '</div>';
      for (let i = 0; i < 9; i += 1) {
        genererQRDansConteneur(
          zoneContenu.querySelector('#etiquette-qr-client-planche-' + i),
          contenuQR(client.codePublic));
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
