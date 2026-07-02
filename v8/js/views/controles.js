// ============================================================
// inerWeb Fluide — vue « Contrôles d'étanchéité » (Phase A, lecture seule)
// Tableau des contrôles : date, machine, méthode, résultat,
// opérateur, prochaine échéance (rouge gras si en retard).
// Les actions (nouveau contrôle, CERFA) arrivent en Phases B et D.
// ============================================================

import { enteteVue, tableau, chipStatut, toast, ICONES } from './communs.js';
import { esc, fmtDate } from '../core/utils.js';

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
function ligneControle(controle) {
  const methode = LIBELLES_METHODE[controle.methode] || esc(controle.methode);

  // Prochaine échéance : rouge gras si le contrôle est en retard
  const dateProchain = fmtDate(controle.prochainControle);
  const celluleProchain = controle.enRetard
    ? '<span class="echeance-depassee">' + dateProchain + '</span>'
    : dateProchain;

  return '<tr>'
    + '<td>' + fmtDate(controle.date) + '</td>'
    + '<td><strong>' + esc(controle.machineLabel) + '</strong></td>'
    + '<td>' + methode + '</td>'
    + '<td>' + chipResultat(controle.resultat) + '</td>'
    + '<td>' + esc(controle.operateur) + '</td>'
    + '<td>' + celluleProchain + '</td>'
    + '<td class="align-droite">'
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
    lignesHtml: tries.map(ligneControle)
  });

  // Bouton « + Nouveau contrôle » : saisie prévue en Phase B
  const boutonNouveau = conteneur.querySelector('[data-action="nouveau-controle"]');
  if (boutonNouveau) {
    boutonNouveau.addEventListener('click', function () {
      toast('La saisie d’un nouveau contrôle arrivera en Phase B.', 'info');
    });
  }

  // Boutons « CERFA » : visualiseur prévu en Phase D
  conteneur.querySelectorAll('[data-action="cerfa"]').forEach(function (bouton) {
    bouton.addEventListener('click', function () {
      toast('La visualisation du CERFA arrivera en Phase D.', 'info');
    });
  });
}
