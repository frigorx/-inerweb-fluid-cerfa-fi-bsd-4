// ============================================================
// inerWeb Fluide v8 — vue « Mouvements de fluide » (Phase A, lecture seule)
// Historique des charges, compléments et récupérations :
// tableau charte (date mono, machine en gras, chips de type,
// quantités signées colorées, n° CERFA turquoise, statut, action).
// ============================================================

import { enteteVue, chipStatut, chipType, tableau, toast, ICONES } from './communs.js';
import { fmtDate, fmtKgSigne, esc } from '../core/utils.js';

export const titre = 'Mouvements de fluide';

/* ============================================================
   Rendu d'une ligne du tableau
   ============================================================ */

/**
 * Construit la ligne HTML d'un mouvement.
 * @param {object} mouvement — objet Mouvement du store (copie)
 * @returns {string} HTML `<tr>…</tr>`
 */
function ligneMouvement(mouvement) {
  // Quantité signée : vert si charge (positif), violet si récupération (négatif)
  const classeQuantite = mouvement.quantiteKg < 0 ? 'quantite-negative' : 'quantite-positive';

  return '<tr>'
    // Date en mono
    + '<td class="cellule-mono">' + esc(fmtDate(mouvement.date)) + '</td>'
    // Machine en gras
    + '<td><strong>' + esc(mouvement.machineLabel) + '</strong></td>'
    // Type de mouvement (chip colorée)
    + '<td>' + chipType(mouvement.type) + '</td>'
    // Quantité signée colorée + code fluide gris
    + '<td class="cellule-mono">'
    + '<span class="' + classeQuantite + '">' + esc(fmtKgSigne(mouvement.quantiteKg)) + '</span>'
    + ' <span style="color:var(--texte-3);font-size:12px">' + esc(mouvement.fluide) + '</span>'
    + '</td>'
    // Numéro CERFA en mono turquoise
    + '<td class="cellule-mono" style="color:var(--accent-fort)">'
    + (mouvement.cerfaNumero ? esc(mouvement.cerfaNumero) : '—')
    + '</td>'
    // Statut (chip verte « Signé » pour VALIDE)
    + '<td>' + chipStatut(mouvement.statut) + '</td>'
    // Action : visualiser le CERFA (Phase D)
    + '<td class="align-droite">'
    + '<button type="button" class="btn btn-contour btn-petit" data-action="voir-cerfa"'
    + ' data-id="' + esc(mouvement.id) + '">Visualiser CERFA</button>'
    + '</td>'
    + '</tr>';
}

/* ============================================================
   État vide
   ============================================================ */

/**
 * Panneau élégant affiché quand aucun mouvement n'est enregistré.
 * @returns {string} HTML
 */
function etatVide() {
  return '<div class="carte">'
    + '<div class="etat-vide">'
    + ICONES.echange
    + '<p><strong>Aucun mouvement enregistré.</strong><br>'
    + 'Les charges, compléments et récupérations de fluide apparaîtront ici.</p>'
    + '</div>'
    + '</div>';
}

/* ============================================================
   Rendu de la vue
   ============================================================ */

/**
 * Rend la vue « Mouvements de fluide ».
 * @param {HTMLElement} conteneur — élément déjà vidé par le routeur
 * @param {{ store: object, naviguer: (vue: string) => void }} ctx
 */
export async function render(conteneur, ctx) {
  const mouvements = await ctx.store.getMouvements();

  // ---- En-tête : titre, sous-titre, bouton d'action principal ----
  const entete = enteteVue({
    titre,
    sousTitre: 'Historique des charges, compléments et récupérations',
    actionsHtml: '<button type="button" class="btn btn-primaire" data-action="nouveau-mouvement">'
      + ICONES.plus + '<span>Nouveau mouvement</span></button>'
  });

  // ---- Corps : tableau des mouvements ou état vide ----
  const corps = mouvements.length
    ? tableau({
        colonnes: [
          { cle: 'date',    libelle: 'Date' },
          { cle: 'machine', libelle: 'Machine' },
          { cle: 'type',    libelle: 'Type' },
          { cle: 'qte',     libelle: 'Qté' },
          { cle: 'cerfa',   libelle: 'CERFA' },
          { cle: 'statut',  libelle: 'Statut' },
          { cle: 'action',  libelle: '', align: 'droite' }
        ],
        lignesHtml: mouvements.map(ligneMouvement)
      })
    : etatVide();

  // Insertion unique dans le conteneur
  conteneur.innerHTML = entete + corps;

  // ---- Écouteurs ----

  // Bouton « + Nouveau mouvement » : assistant à venir en Phase B
  const boutonNouveau = conteneur.querySelector('[data-action="nouveau-mouvement"]');
  if (boutonNouveau) {
    boutonNouveau.addEventListener('click', function () {
      toast('Assistant « Nouveau mouvement » : Phase B', 'info');
    });
  }

  // Boutons « Visualiser CERFA » : délégation sur le conteneur
  conteneur.addEventListener('click', function (evenement) {
    const bouton = evenement.target.closest('[data-action="voir-cerfa"]');
    if (bouton && conteneur.contains(bouton)) {
      toast('Visualiseur CERFA : Phase D', 'info');
    }
  });
}
