// ============================================================
// inerWeb Fluide — vue « Stock bouteilles »
// Grille de cartes : une carte par contenant avec chips de type et
// de statut, code fluide mono, niveau et barre de progression.
// IM-5 : les bouteilles sorties du stock (retournées, déchets BSFF)
// sont regroupées dans une section repliée, hors compteur actif.
// IM-9 : action « Retour fournisseur » sur les contenants actifs.
// ============================================================

import { enteteVue, chipStatut, barreProgression, modale, toast, ICONES } from './communs.js';
import { esc, fmtNombre } from '../core/utils.js';
import { ouvrirFormBouteille, ouvrirPesee } from '../modales/bouteille-form.js';
import { ouvrirEtiquette } from '../documents/etiquette-bouteille.js';

export const titre = 'Stock bouteilles';

// Libellés français des états de fluide (maquette : « État : Neuf »)
const LIBELLES_ETAT_FLUIDE = {
  VIERGE:   'Neuf',
  RECUPERE: 'Récupéré',
  RECYCLE:  'Recyclé',
  REGENERE: 'Régénéré',
  DECHET:   'Déchet',
  // R2 : bouteille de récupération au contenu probablement mélangé.
  MELANGE:  'Mélange'
};

// IM-5 : chips de statut propres aux bouteilles (le code EN_SERVICE
// des machines affiche « Conforme » dans communs.js, inadapté ici)
const CHIPS_STATUT_BOUTEILLE = {
  EN_STOCK:    { libelle: 'En stock',    classe: 'chip-vert' },
  EN_SERVICE:  { libelle: 'En service',  classe: 'chip-bleu' },
  A_RETOURNER: { libelle: 'À retourner', classe: 'chip-ambre' },
  RETOURNEE:   { libelle: 'Retournée',   classe: 'chip-gris' },
  DECHET:      { libelle: 'Déchet',      classe: 'chip-gris' }
};

/** Chip de statut d'une bouteille (repli sur chipStatut si inconnu). */
function chipStatutBouteille(statut) {
  const connu = CHIPS_STATUT_BOUTEILLE[statut];
  if (connu) {
    return '<span class="chip ' + connu.classe + '">' + esc(connu.libelle) + '</span>';
  }
  return chipStatut(statut);
}

/** IM-5 : vrai si la bouteille a quitté le stock (aucune action possible). */
function estSortieDuStock(b) {
  return b.statut === 'RETOURNEE' || b.statut === 'DECHET';
}

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
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 4px;
    padding-top: 12px;
    border-top: 1px solid var(--bordure-2);
  }
  .bouteille-chips {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
  }
  /* IM-5 : bouteille sortie du stock — carte grisée, sans action */
  .carte-bouteille-sortie {
    opacity: 0.6;
  }
  /* Section repliée des sorties du stock (retours, déchets BSFF) */
  .bouteilles-sorties {
    margin-top: 22px;
  }
  .bouteilles-sorties summary {
    cursor: pointer;
    user-select: none;
    font-size: 13px;
    font-weight: 600;
    color: var(--texte-2);
    padding: 10px 14px;
    background: var(--carte);
    border: 1px solid var(--bordure-2);
    border-radius: 10px;
  }
  .bouteilles-sorties summary:hover {
    background: var(--fond-2);
  }
  .bouteilles-sorties[open] summary {
    margin-bottom: 14px;
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
  const sortie = estSortieDuStock(b);
  const melangee = b.etatFluide === 'MELANGE';

  // IM-5 : plus aucune action sur une bouteille sortie du stock ;
  // IM-9 : « Retour fourn. » (consigne) sur les contenants actifs.
  const pied = sortie
    ? ''
    : '<div class="bouteille-pied">'
      + '<button type="button" class="btn btn-secondaire btn-petit" data-action="modifier" data-id="' + esc(b.id) + '"'
      + ' aria-label="Modifier la bouteille ' + esc(b.code) + '">Modifier</button>'
      + '<button type="button" class="btn btn-contour btn-petit" data-action="peser" data-id="' + esc(b.id) + '"'
      + ' aria-label="Peser la bouteille ' + esc(b.code) + '">Peser</button>'
      + '<button type="button" class="btn btn-contour btn-petit" data-action="etiquette" data-id="' + esc(b.id) + '"'
      + ' aria-label="Étiquette QR de la bouteille ' + esc(b.code) + '">Étiquette QR</button>'
      + '<button type="button" class="btn btn-danger-contour btn-petit" data-action="retour" data-id="' + esc(b.id) + '"'
      + ' aria-label="Retourner la bouteille ' + esc(b.code) + ' au fournisseur">Retour fourn.</button>'
      + '</div>';

  // R2 : chip TRÈS visible + détail des versements tracés (fluide,
  // quantité, date) quand la bouteille est marquée MELANGE.
  const chipMelange = melangee
    ? '<span class="chip chip-ambre">Contenu probablement mélangé</span>' : '';
  const composition = melangee && Array.isArray(b.compositionMelange) &&
      b.compositionMelange.length
    ? '<div class="bouteille-detail">Versements tracés : '
      + b.compositionMelange.map(function (v) {
        return esc(v.fluide) + ' ' + esc(fmtNombre(v.quantiteKg, 2)) + ' kg ('
          + esc(v.date) + ')';
      }).join(' · ')
      + '</div>'
    : '';

  return '<article class="carte carte-bouteille' + (sortie ? ' carte-bouteille-sortie' : '') + '">'
    + '<div class="bouteille-haut">'
    + '<span class="bouteille-chips">' + chipStatut(b.type) + chipStatutBouteille(b.statut) + chipMelange + '</span>'
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
    + composition
    + pied
    + '</article>';
}

/* ============================================================
   IM-9 : retour d'une bouteille consignée au fournisseur
   ============================================================ */

/**
 * Confirmation avant retour fournisseur : la masse nette restante
 * alimente la balance matière et la bouteille sort du stock.
 * Les refus du store (déjà retournée, déchet → BSFF) partent en toast.
 * @param {object} ctx — contexte avec store + rafraichir
 * @param {object} bouteille
 */
function ouvrirConfirmationRetour(ctx, bouteille) {
  const masse = fmtNombre(bouteille.masseNetteKg, 1);
  const instance = modale({
    titre: 'Retour fournisseur',
    contenuHtml: '<p style="font-size:13px;color:var(--texte-2)">'
      + 'La bouteille ' + esc(bouteille.code) + ' (' + esc(bouteille.fluide) + ') '
      + 'repart chez ' + esc(bouteille.proprietaire || 'le fournisseur')
      + ' avec ' + esc(masse) + ' kg de fluide. Cette masse alimente le poste '
      + '« retours fournisseur » de la balance matière et la bouteille sort '
      + 'définitivement du stock.</p>',
    actionsHtml:
      '<button type="button" class="btn btn-secondaire" data-role="fermer">Annuler</button>'
      + '<button type="button" class="btn btn-primaire" data-role="confirmer">Confirmer le retour</button>'
  });

  // La modale vient d'être injectée : on câble la dernière boîte ouverte
  const boites = document.querySelectorAll('.modale');
  const boite = boites[boites.length - 1];
  if (!boite) return;

  boite.querySelector('[data-role="fermer"]').addEventListener('click', instance.fermer);
  boite.querySelector('[data-role="confirmer"]').addEventListener('click', async function () {
    try {
      const utilisateur = await ctx.store.getUtilisateurCourant();
      await ctx.store.retournerFournisseur(bouteille.id,
        utilisateur.prenom + ' ' + utilisateur.nom);
      instance.fermer();
      toast('Bouteille ' + bouteille.code + ' retournée au fournisseur.', 'succes');
      if (typeof ctx.rafraichir === 'function') ctx.rafraichir();
    } catch (erreur) {
      instance.fermer();
      toast(erreur && erreur.message ? erreur.message : 'Erreur inattendue.', 'erreur');
    }
  });
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

  // IM-5 : les sorties du stock (retournées, déchets BSFF) quittent
  // la grille principale et le compteur de contenants actifs
  const actives = bouteilles.filter(function (b) { return !estSortieDuStock(b); });
  const sorties = bouteilles.filter(estSortieDuStock);

  const pluriel = actives.length > 1 ? 's' : '';
  const entete = enteteVue({
    titre: 'Stock bouteilles',
    sousTitre: actives.length + ' contenant' + pluriel + ' actif' + pluriel
      + ' — fluide neuf, récupéré, transfert',
    actionsHtml: '<button type="button" class="btn btn-marine" data-action="ajouter">'
      + ICONES.plus + 'Ajouter</button>'
  });

  const grilleActives = actives.length
    ? '<div class="grille-3">' + actives.map(carteBouteille).join('') + '</div>'
    : '<div class="carte"><div class="etat-vide">' + ICONES.bouteille
      + '<p>Aucun contenant actif en stock pour le moment.</p></div></div>';

  // Section repliée des bouteilles sorties du stock (consultation seule)
  const plurielSorties = sorties.length > 1 ? 's' : '';
  const sectionSorties = sorties.length
    ? '<details class="bouteilles-sorties">'
      + '<summary>Sorties du stock (' + sorties.length + ' bouteille' + plurielSorties
      + ' retournée' + plurielSorties + ' ou partie' + plurielSorties + ' en filière déchet)</summary>'
      + '<div class="grille-3">' + sorties.map(carteBouteille).join('') + '</div>'
      + '</details>'
    : '';

  conteneur.innerHTML = STYLES_VUE
    + '<div class="vue-contenu anim-fade">'
    + entete
    + grilleActives
    + sectionSorties
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
    } else if (action === 'etiquette') {
      ouvrirEtiquette(ctxAvecRafraichissement, id);
    } else if (action === 'retour') {
      // IM-9 : retour fournisseur avec confirmation (remplace l'ancien
      // « Suppr. » qui se bornait à renvoyer vers cette action)
      const bouteille = bouteilles.find(function (b) { return b.id === id; });
      if (bouteille) ouvrirConfirmationRetour(ctxAvecRafraichissement, bouteille);
    }
  });
}
