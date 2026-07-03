// ============================================================
// inerWeb Fluide — vue « Stock bouteilles » (Phase A, lecture seule)
// Grille de cartes : une carte par contenant avec chip de type,
// code fluide mono, niveau de remplissage et barre de progression.
// Les actions (ajouter, modifier, supprimer) arrivent en Phase B.
// ============================================================

import { enteteVue, chipStatut, barreProgression, toast, ICONES } from './communs.js';
import { esc, fmtNombre } from '../core/utils.js';
import { ouvrirFormBouteille, ouvrirPesee } from '../modales/bouteille-form.js';

export const titre = 'Stock bouteilles';

// Libellés français des états de fluide (maquette : « État : Neuf »)
const LIBELLES_ETAT_FLUIDE = {
  VIERGE:   'Neuf',
  RECUPERE: 'Récupéré',
  RECYCLE:  'Recyclé',
  REGENERE: 'Régénéré',
  DECHET:   'Déchet'
};

// Sous ce pourcentage de remplissage, la bouteille est quasi vide → barre rouge
const SEUIL_QUASI_VIDE_PCT = 25;

/* ============================================================
   Styles propres à la vue (composants absents de composants.css :
   ajoutés ici en dernier recours, portée limitée au conteneur)
   ============================================================ */

const STYLES_VUE = `
<style>
  .carte-bouteille {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .bouteille-haut {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .bouteille-fluide {
    font-size: 13px;
    font-weight: 600;
    color: var(--texte-2);
  }
  .bouteille-niveau {
    font-family: var(--police-titres);
    font-size: 30px;
    font-weight: 700;
    color: var(--texte);
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }
  .bouteille-max {
    font-size: 15px;
    font-weight: 500;
    color: var(--texte-3);
  }
  .bouteille-detail {
    font-size: 12px;
    color: var(--texte-3);
  }
  .bouteille-pied {
    display: flex;
    gap: 8px;
    margin-top: 4px;
    padding-top: 12px;
    border-top: 1px solid var(--bordure-2);
  }
</style>`;

/* ============================================================
   Rendu d'une carte bouteille
   ============================================================ */

/**
 * Choisit la teinte de la barre de niveau :
 * rouge si quasi vide, ambre pour la récupération, turquoise sinon.
 * @param {object} bouteille
 * @param {number} pct - pourcentage de remplissage
 * @returns {'accent'|'ambre'|'rouge'}
 */
function teinteBarre(bouteille, pct) {
  if (pct < SEUIL_QUASI_VIDE_PCT) return 'rouge';
  if (bouteille.type === 'RECUPERATION') return 'ambre';
  return 'accent';
}

/**
 * Carte d'un contenant : chip de type + code fluide mono, grosse
 * valeur nette / contenance, barre de niveau, détails, actions.
 * @param {object} b - bouteille (contrat store.getBouteilles)
 * @returns {string} HTML
 */
function carteBouteille(b) {
  const pct = b.contenanceMaxKg > 0 ? (b.masseNetteKg / b.contenanceMaxKg) * 100 : 0;
  const etat = LIBELLES_ETAT_FLUIDE[b.etatFluide] || b.etatFluide;

  return '<article class="carte carte-bouteille">'
    + '<div class="bouteille-haut">'
    + chipStatut(b.type)
    + '<span class="bouteille-fluide mono">' + esc(b.fluide) + '</span>'
    + '</div>'
    + '<div class="bouteille-niveau">'
    + esc(fmtNombre(b.masseNetteKg, 1))
    + ' <span class="bouteille-max">/ ' + esc(fmtNombre(b.contenanceMaxKg, 0)) + ' kg</span>'
    + '</div>'
    + barreProgression(pct, teinteBarre(b, pct))
    + '<div class="bouteille-detail">État : ' + esc(etat)
    + ' · Tare ' + esc(fmtNombre(b.tareKg, 1)) + ' kg</div>'
    + '<div class="bouteille-detail">' + esc(b.proprietaire) + ' · Lot ' + esc(b.lot) + '</div>'
    + '<div class="bouteille-pied">'
    + '<button type="button" class="btn btn-secondaire btn-petit" data-action="modifier" data-id="' + esc(b.id) + '"'
    + ' aria-label="Modifier la bouteille ' + esc(b.code) + '">Modifier</button>'
    + '<button type="button" class="btn btn-contour btn-petit" data-action="peser" data-id="' + esc(b.id) + '"'
    + ' aria-label="Peser la bouteille ' + esc(b.code) + '">Peser</button>'
    + '<button type="button" class="btn btn-danger-contour btn-petit" data-action="supprimer" data-id="' + esc(b.id) + '"'
    + ' aria-label="Supprimer la bouteille ' + esc(b.code) + '">Suppr.</button>'
    + '</div>'
    + '</article>';
}

/* ============================================================
   Rendu de la vue
   ============================================================ */

/**
 * @param {HTMLElement} conteneur - élément vidé d'avance par le routeur
 * @param {{ store: object, naviguer: (id: string) => void }} ctx
 */
export async function render(conteneur, ctx) {
  const bouteilles = await ctx.store.getBouteilles();

  const entete = enteteVue({
    titre: 'Stock bouteilles',
    sousTitre: bouteilles.length + ' contenants — fluide neuf, récupéré, transfert',
    actionsHtml: '<button type="button" class="btn btn-marine" data-action="ajouter">'
      + ICONES.plus + 'Ajouter</button>'
  });

  conteneur.innerHTML = STYLES_VUE
    + '<div class="vue-contenu anim-fade">'
    + entete
    + '<div class="grille-3">' + bouteilles.map(carteBouteille).join('') + '</div>'
    + '</div>';

  // Actions différées : un seul écouteur délégué pour toute la vue
  conteneur.addEventListener('click', function (evenement) {
    const bouton = evenement.target.closest('[data-action]');
    if (!bouton || !conteneur.contains(bouton)) return;

    const action = bouton.dataset.action;
    const id = bouton.dataset.id;
    // Rafraîchissement après fermeture d'une modale : redemande la même vue
    // au routeur, qui reconstruit un conteneur neuf (pas d'écouteurs dupliqués).
    const ctxAvecRafraichissement = Object.assign({}, ctx, {
      rafraichir: function () { ctx.naviguer('bouteilles'); }
    });

    if (action === 'ajouter') {
      ouvrirFormBouteille(ctxAvecRafraichissement);
    } else if (action === 'modifier') {
      ouvrirFormBouteille(ctxAvecRafraichissement, id);
    } else if (action === 'peser') {
      ouvrirPesee(ctxAvecRafraichissement, id);
    } else if (action === 'supprimer') {
      toast('Suppression encadrée : Phase C — une bouteille se retourne ou se déclare déchet, elle ne s’efface pas.', 'info');
    }
  });
}
