// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide v8 — APERÇU IMPRIMABLE du justificatif de
// régularisation (lot 1, branche A). LE DOM VIT ICI, ET NULLE PART
// AILLEURS.
//
// POURQUOI CE FICHIER EXISTE (revue du 27/07/2026). Le document lui-même
// vit dans `documents/regularisation.js`, dont dépendent TROIS modules
// d'export ZIP (`dossier-audit.js`, `dossier-machine.js`,
// `dossier-fuite.js`) qui s'annoncent en tête « testables sous Node
// (contrat DataStore + Web Crypto) ». Tant que la modale vivait dans le
// même fichier, ces trois modules tiraient `views/communs.js` à chaque
// import : rien ne cassait aujourd'hui, mais le jour où `communs.js`
// touchera le DOM au niveau module, les trois suites de dossiers
// tomberaient d'un coup. Même partage que `documents/dossier-commun.js`
// (pur) et `documents/telecharger-dossier.js` (DOM).
//
// ⚠️ LE STYLE EST RETIRÉ À LA FERMETURE. Il porte une règle `@page`
// (marge basse réservée au bandeau répété sur chaque feuille), et `@page`
// est GLOBALE au document : laissée en place, elle changerait les marges
// de TOUTE impression ultérieure de l'application — l'étiquette F-Gas, le
// bon d'intervention. Elle ne vit donc que le temps de l'aperçu.
// ============================================================

import { modale, ICONES } from '../views/communs.js';
import {
  construireJustificatif, gabaritJustificatif,
  CSS_JUSTIFICATIF, CSS_IMPRESSION_APERCU, STYLE_JUSTIFICATIF_ID
} from './regularisation.js';

function poserStyleJustificatif() {
  if (document.getElementById(STYLE_JUSTIFICATIF_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_JUSTIFICATIF_ID;
  style.textContent = CSS_JUSTIFICATIF + CSS_IMPRESSION_APERCU;
  document.head.appendChild(style);
}

function retirerStyleJustificatif() {
  const style = document.getElementById(STYLE_JUSTIFICATIF_ID);
  if (style) style.remove();
}

/**
 * Ouvre l'aperçu imprimable du justificatif de régularisation d'une
 * écriture d'annulation.
 * @param {{ store: object }} ctx
 * @param {string} mouvementId - id de la CONTRE-ÉCRITURE
 * @returns {Promise<void>}
 */
export async function ouvrirJustificatifRegularisation(ctx, mouvementId) {
  const faits = await construireJustificatif(ctx.store, mouvementId);
  poserStyleJustificatif();

  const { fermer, racine } = modale({
    titre: 'Justificatif de régularisation — '
      + (faits.numero ?? 'écriture d’annulation'),
    contenuHtml: '<div class="justif-apercu">'
      + gabaritJustificatif(faits) + '</div>',
    actionsHtml:
      '<button type="button" id="justif-fermer" '
      + 'class="btn btn-secondaire no-print">Fermer</button>'
      + '<button type="button" id="justif-imprimer" '
      + 'class="btn btn-marine no-print">'
      + ICONES.imprimer + '<span>Imprimer</span></button>',
    surFermeture: retirerStyleJustificatif
  });

  racine.querySelector('#justif-fermer').addEventListener('click', function () {
    fermer();
  });
  racine.querySelector('#justif-imprimer')
    .addEventListener('click', function () {
      window.print();
    });
}
