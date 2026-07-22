// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — vue « Contrôles d'étanchéité »
// Tableau des contrôles : date, machine, méthode, résultat,
// opérateur, prochaine échéance (rouge gras si en retard).
// Phase B : création d'un contrôle via modale dédiée.
// Phase D : visualiseur du CERFA officiel rempli.
// ============================================================

import { enteteVue, tableau, chipStatut, ICONES } from './communs.js';
import { esc, fmtDate } from '../core/utils.js';
import { ouvrirFormControle } from '../modales/controle-form.js';
import { ouvrirFormReparation } from '../modales/reparation-form.js';
import { ouvrirCerfa } from '../cerfa/visualiseur.js';

export const titre = 'Contrôles d’étanchéité';

// Libellés français des méthodes de contrôle
const LIBELLES_METHODE = {
  DIRECTE: 'Directe',
  INDIRECTE: 'Indirecte'
};

/**
 * Chip de résultat : vert « Conforme » ou rouge « Fuite détectée ».
 * @param {string} resultat — 'CONFORME' | 'FUITE'
 * @returns {string} HTML
 */
function chipResultat(resultat) {
  if (resultat === 'FUITE') {
    return '<span class="chip chip-rouge">Fuite détectée</span>';
  }
  return chipStatut(resultat);
}

/**
 * Rend une ligne du tableau des contrôles.
 * @param {object} controle — élément retourné par store.getControles()
 * @returns {string} HTML `<tr>…</tr>`
 */
function ligneControle(controle, annule) {
  const methode = LIBELLES_METHODE[controle.methode] || esc(controle.methode);

  // Prochaine échéance : rouge gras si le contrôle est en retard
  const dateProchain = fmtDate(controle.prochainControle);
  const celluleProchain = controle.enRetard
    ? '<span class="echeance-depassee">' + dateProchain + '</span>'
    : dateProchain;

  // R3/R4 : un contrôle FUITE sans réparation tracée propose l'action
  // dédiée (le formulaire de contrôle ne suffit pas : la réparation
  // se constate a posteriori, souvent bien après le contrôle).
  // P0-6 (revue I-4) : un contrôle né d'un mouvement ANNULÉ reste visible
  // (le registre montre tout) mais il est MARQUÉ et perd son action de
  // réparation — le store la refuse de toute façon (fait dérivé).
  const boutonReparation = (controle.resultat === 'FUITE'
    && !controle.dateReparation && !annule)
    ? '<button type="button" class="btn btn-contour btn-petit" '
      + 'data-action="reparation" data-id="' + esc(controle.id) + '">Tracer réparation</button>'
    : '';
  const marqueAnnule = annule
    ? ' <span class="chip chip-gris">Annulé (contre-écriture)</span>'
    : '';

  return '<tr>'
    + '<td>' + fmtDate(controle.date) + '</td>'
    + '<td><strong>' + esc(controle.machineLabel) + '</strong>' + marqueAnnule + '</td>'
    + '<td>' + methode + '</td>'
    + '<td>' + chipResultat(controle.resultat) + '</td>'
    + '<td>' + esc(controle.operateur) + '</td>'
    + '<td>' + celluleProchain + '</td>'
    + '<td class="align-droite">'
    + boutonReparation
    + '<button type="button" class="btn btn-contour btn-petit" '
    + 'data-action="cerfa" data-id="' + esc(controle.id) + '">CERFA</button>'
    + '</td>'
    + '</tr>';
}

/**
 * Rend la vue « Contrôles d'étanchéité ».
 * @param {HTMLElement} conteneur — élément vidé d'avance par le routeur
 * @param {{ store: object, naviguer: (id: string) => void }} ctx
 */
export async function render(conteneur, ctx) {
  const controles = await ctx.store.getControles();
  // P0-6 (revue I-4) : contrôles réputés annulés = ceux dont le mouvement
  // porteur est ANNULE (même fait dérivé que les stores).
  const mouvements = await ctx.store.getMouvements();
  const idsMouvementsAnnules = new Set(mouvements
    .filter(function (mv) { return mv.statut === 'ANNULE'; })
    .map(function (mv) { return mv.id; }));
  const estAnnule = function (c) {
    return Boolean(c.mouvementId && idsMouvementsAnnules.has(c.mouvementId));
  };

  // Affichage du plus récent au plus ancien (dates ISO comparables en texte)
  const tries = controles.slice().sort(function (a, b) {
    return String(b.date).localeCompare(String(a.date));
  });

  const actionsHtml = '<button type="button" class="btn btn-marine" data-action="nouveau-controle">'
    + ICONES.plus + '<span>Nouveau contrôle</span></button>';

  conteneur.innerHTML = enteteVue({
    titre: titre,
    sousTitre: 'Périodicité, résultats et prochaines échéances',
    actionsHtml: actionsHtml
  })
  + tableau({
    colonnes: [
      { cle: 'date', libelle: 'Date' },
      { cle: 'machine', libelle: 'Machine' },
      { cle: 'methode', libelle: 'Méthode' },
      { cle: 'resultat', libelle: 'Résultat' },
      { cle: 'operateur', libelle: 'Opérateur' },
      { cle: 'prochain', libelle: 'Prochain' },
      { cle: 'actions', libelle: '', align: 'droite' }
    ],
    lignesHtml: tries.map(function (c) { return ligneControle(c, estAnnule(c)); })
  });

  // Bouton « + Nouveau contrôle » : ouvre la modale de création
  const boutonNouveau = conteneur.querySelector('[data-action="nouveau-controle"]');
  if (boutonNouveau) {
    boutonNouveau.addEventListener('click', function () {
      ouvrirFormControle(ctx);
    });
  }

  // Boutons « CERFA » : visualiseur plein écran du PDF officiel rempli
  conteneur.querySelectorAll('[data-action="cerfa"]').forEach(function (bouton) {
    bouton.addEventListener('click', function () {
      ouvrirCerfa(ctx, { source: 'controle', id: bouton.dataset.id });
    });
  });

  // Boutons « Tracer réparation » (R3/R4) : modale dédiée
  conteneur.querySelectorAll('[data-action="reparation"]').forEach(function (bouton) {
    bouton.addEventListener('click', function () {
      const controle = tries.find(function (c) { return c.id === bouton.dataset.id; });
      if (controle) ouvrirFormReparation(ctx, controle);
    });
  });
}
