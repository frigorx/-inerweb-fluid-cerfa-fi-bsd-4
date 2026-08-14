// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — étiquette QR d'un outil réglementaire (QR outillage)
// Modale d'aperçu imprimable : étiquette 50×70 mm (type + marque/modèle +
// code_public + QR vers « #/o/<code_public> », hors-ligne) ; planche A4 en
// option (3×3) avec bandeau logo. À coller sur l'outil : un scan ouvre sa
// fiche (état d'étalonnage / vérification). Patron repris À L'IDENTIQUE de
// etiquette-client.js (seuls le texte et le préfixe « #/o/ » changent).
// ============================================================

import { modale, ICONES } from '../views/communs.js';
import { esc } from '../core/utils.js';
import { obtenirQRCode } from '../lib/qrcode.js';

const QR_PIXELS = 200;

// Libellés français des types d'outil (dupliqués volontairement ici pour ne
// pas créer de dépendance circulaire documents/ ↔ views/outillage.js).
const LIBELLES_TYPE_OUTIL = {
  STATION_RECUPERATION: 'Station de récupération',
  STATION_CHARGE: 'Station de charge',
  BALANCE: 'Balance',
  DETECTEUR: 'Détecteur de fuite',
  POMPE_A_VIDE: 'Pompe à vide',
  MANIFOLD: 'Manifold',
  THERMOMETRE: 'Thermomètre',
  BOUTEILLE_RECUP: 'Bouteille de récupération',
  FLEXIBLE: 'Flexible',
  EPI: 'Équipement de protection',
  AUTRE: 'Autre'
};

/**
 * Contenu du QR d'un outil : chemin relatif hors-ligne (jamais d'URL absolue).
 * Exportée pour les tests.
 * @param {string} codePublic
 * @returns {string}
 */
export function contenuQR(codePublic) {
  return '#/o/' + codePublic;
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

function gabaritEtiquetteQR(outil, suffixeId) {
  const idQR = 'etiquette-qr-outil' + suffixeId;
  const type = LIBELLES_TYPE_OUTIL[outil.typeOutil] || outil.typeOutil || 'Outil';
  const marqueModele = [outil.marque, outil.modele].filter(Boolean).join(' ');
  return '<div class="etiquette-qr-machine">'
    + '<div class="etiquette-qr-entete">OUTIL VÉRIFIÉ — inerWeb Fluide</div>'
    + '<div class="etiquette-qr-corps">'
    + '<div class="etiquette-qr-zone" id="' + esc(idQR) + '"></div>'
    + '<div class="etiquette-qr-texte">'
    + '<span class="etiquette-qr-outil-type">' + esc(type) + '</span>'
    + (marqueModele
        ? '<span class="etiquette-qr-designation">' + esc(marqueModele) + '</span>' : '')
    + '<span class="etiquette-qr-code-public">' + esc(outil.codePublic) + '</span>'
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

const STYLE_ETIQUETTE_ID = 'style-etiquette-qr-outil';

function assurerStyleEtiquette() {
  if (document.getElementById(STYLE_ETIQUETTE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ETIQUETTE_ID;
  style.textContent = `
    .etiquette-qr-apercu {
      display: flex; justify-content: center; padding: 24px 16px;
      background: var(--fond-2); border-radius: var(--rayon-bouton);
    }
    .etiquette-qr-planche {
      display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px; padding: 16px; background: var(--fond-2);
      border-radius: var(--rayon-bouton);
    }
    .planche-bandeau {
      grid-column: 1 / -1; display: flex; align-items: center;
      justify-content: space-between; gap: 16px; margin-bottom: 6px;
      padding: 10px 12px; background: #ffffff; border: 1px solid var(--bordure-2);
      border-radius: var(--rayon-bouton);
    }
    .planche-bandeau-logo { display: flex; align-items: center; gap: 10px; }
    .planche-bandeau-nom {
      font-family: var(--police-titres); font-weight: 700; font-size: 14px;
      color: var(--texte); line-height: 1.2;
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
    .etiquette-qr-outil-type {
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
 * Ouvre la modale d'aperçu de l'étiquette QR d'un outil (+ planche A4 3×3).
 * @param {{ store: object }} ctx
 * @param {string} outilId
 * @returns {Promise<void>}
 */
export async function ouvrirEtiquetteOutil(ctx, outilId) {
  const outillage = await ctx.store.getOutillage();
  const outil = outillage.find((o) => o.id === outilId);
  if (!outil || !outil.codePublic) return;

  assurerStyleEtiquette();

  let modePlanche = false;

  const titreOutil = [outil.marque, outil.modele].filter(Boolean).join(' ')
    || (LIBELLES_TYPE_OUTIL[outil.typeOutil] || 'Outil');

  const { fermer, racine } = modale({
    titre: 'Étiquette QR — ' + titreOutil,
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
        + gabaritEtiquetteQR(outil, '') + '</div>';
      genererQRDansConteneur(
        zoneContenu.querySelector('#etiquette-qr-outil'),
        contenuQR(outil.codePublic));
    } else {
      const cases = Array.from({ length: 9 }, (_, i) =>
        gabaritEtiquetteQR(outil, '-planche-' + i)).join('');
      zoneContenu.innerHTML = '<div class="etiquette-qr-planche">'
        + gabaritBandeauPlanche() + cases + '</div>';
      for (let i = 0; i < 9; i += 1) {
        genererQRDansConteneur(
          zoneContenu.querySelector('#etiquette-qr-outil-planche-' + i),
          contenuQR(outil.codePublic));
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
