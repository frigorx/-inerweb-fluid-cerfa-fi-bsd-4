// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — vue « Fluides frigorigènes »
// Référentiel des fluides : famille, GWP (AR4), impact
// environnemental et nombre de machines du parc concernées.
// Lecture seule (Phase A) — aucune action de modification.
// ============================================================

import { enteteVue, chipStatut, tableau, ICONES } from './communs.js';
import { esc, fmtNombre } from '../core/utils.js';

export const titre = 'Fluides frigorigènes';

/**
 * Rendu de la vue « Fluides frigorigènes ».
 * @param {HTMLElement} conteneur - élément vidé d'avance par le routeur
 * @param {{ store: object, naviguer: (id: string) => void }} ctx
 */
export async function render(conteneur, ctx) {
  const fluides = await ctx.store.getFluides();

  // Une ligne de tableau par fluide du référentiel
  const lignesHtml = fluides.map(function (fluide) {
    return '<tr>'
      // Code du fluide : mono gras (ex. R-404A)
      + '<td class="cellule-mono"><strong style="color:var(--texte)">' + esc(fluide.code) + '</strong></td>'
      // Famille chimique (HFC, HFO, mélange, CO2, HC…)
      + '<td>' + esc(fluide.famille) + '</td>'
      // GWP (AR4) : mono, aligné à droite, format fr avec espace des milliers
      + '<td class="cellule-mono align-droite">' + esc(fmtNombre(fluide.gwpAr4, 0)) + '</td>'
      // Impact environnemental : chip colorée Faible → Très élevé
      + '<td>' + chipStatut(fluide.impact) + '</td>'
      // Nombre de machines du parc utilisant ce fluide
      + '<td class="align-droite">' + esc(fluide.nbMachines) + '</td>'
      + '</tr>';
  });

  // CF-16 : état vide dédié (sur le patron bouteilles/machines) plutôt que
  // le repli générique de tableau() « Aucune donnée à afficher. »
  const corpsVue = fluides.length
    ? tableau({
        colonnes: [
          { cle: 'fluide',    libelle: 'Fluide' },
          { cle: 'famille',   libelle: 'Famille' },
          { cle: 'gwp',       libelle: 'GWP (AR4)', align: 'droite' },
          { cle: 'impact',    libelle: 'Impact' },
          { cle: 'machines',  libelle: 'Machines',  align: 'droite' }
        ],
        lignesHtml
      })
    : '<div class="carte"><div class="etat-vide">' + ICONES.flocon
      + '<p>Aucun fluide référencé.</p></div></div>';

  // Insertion unique du gabarit complet dans le conteneur
  conteneur.innerHTML = enteteVue({
    titre,
    sousTitre: 'Référentiel des fluides, familles et potentiel de réchauffement (GWP)'
  }) + corpsVue;

  // Note réglementaire discrète en bas de carte (pas de classe dédiée
  // dans la charte → style inline minimal, ton gris et filet fin)
  // Absente si le référentiel est vide (rien à commenter).
  const carte = conteneur.querySelector('.tableau-defilement');
  if (carte) {
    carte.insertAdjacentHTML('beforeend',
      '<p style="margin:0;padding:11px 16px;border-top:1px solid var(--bordure-2);'
      + 'font-size:12px;color:var(--texte-3)">'
      + 'PRP (GWP)&nbsp;: valeurs AR4 du GIEC, utilisées pour le calcul des tonnes '
      + 'équivalent CO&#8322; (réglementation F-Gas).'
      + '</p>');
  }
}
