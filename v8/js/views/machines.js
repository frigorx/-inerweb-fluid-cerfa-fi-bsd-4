// ============================================================
// inerWeb Fluide — vue « Parc machines » (Phase A, lecture seule)
// Grille de cartes machine : statut, fluide, charge, contrôles,
// fidèle à la maquette validée (composant n° 4 de la charte).
// ============================================================

import { enteteVue, chipStatut, barreProgression, ICONES } from './communs.js';
import { esc, fmtNombre, fmtKg, fmtTeq, teqCO2 } from '../core/utils.js';
import { ouvrirFormMachine } from '../modales/machine-form.js';
import { ouvrirPlaque } from '../documents/plaque-fgas.js';

export const titre = 'Parc machines';

/* ============================================================
   Styles propres à la vue (classes préfixées « machine- »)
   ============================================================ */

const STYLES_VUE = `
<style>
  /* Carte machine : pile verticale d'informations */
  .carte-machine {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  /* Ligne 1 : désignation + chip de statut à droite */
  .machine-entete {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .machine-titre {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    font-weight: 600;
    font-size: 14.5px;
    color: var(--texte);
    line-height: 1.35;
  }

  /* Ligne 2 : type · marque modèle */
  .machine-sous-titre {
    margin-top: -8px;
    font-size: 12.5px;
    color: var(--texte-3);
  }

  /* Chip code fluide (mono, fond gris clair) + famille grise */
  .machine-fluide {
    display: flex;
    align-items: center;
    gap: 9px;
  }

  .machine-famille {
    font-size: 12px;
    color: var(--texte-3);
  }

  /* Ligne de charge : libellé + valeurs mono, t CO₂ à droite */
  .machine-charge {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    font-size: 12.5px;
    color: var(--texte-2);
  }

  .machine-co2 {
    font-family: var(--police-mono);
    font-variant-numeric: tabular-nums;
    color: var(--texte-3);
    white-space: nowrap;
  }

  /* Pied : localisation à gauche, détenteur à droite, filet au-dessus */
  .machine-pied {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-top: 2px;
    padding-top: 10px;
    border-top: 1px solid var(--bordure-2);
    font-size: 12px;
    color: var(--texte-3);
  }

  .machine-detenteur {
    text-align: right;
  }

  /* Pied d'actions : boutons Plaque / Modifier alignés à droite */
  .machine-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
</style>`;

/* ============================================================
   Gabarit d'une carte machine
   ============================================================ */

/**
 * Rend la carte d'une machine.
 * @param {object} machine — machine du store (contrat v8)
 * @param {Map<string, object>} fluideParCode — code fluide → fiche fluide
 * @param {Map<string, object>} clientParId — id client → fiche client
 * @returns {string} HTML
 */
function carteMachine(machine, fluideParCode, clientParId) {
  const fluide = fluideParCode.get(machine.fluide);
  const client = clientParId.get(machine.clientId);

  // Détenteur : raison sociale du client, sinon libellé de site
  const detenteur = (client && client.raisonSociale) || machine.siteLabel || '—';

  // Taux de remplissage (borné par barreProgression), rouge en cas de fuite
  const pct = machine.chargeNominaleKg > 0
    ? (machine.chargeActuelleKg / machine.chargeNominaleKg) * 100
    : 0;
  const teinteBarre = machine.statut === 'FUITE' ? 'rouge' : 'vert';

  // Équivalent CO₂ de la charge actuelle (GWP AR4 du référentiel)
  const co2 = fluide ? fmtTeq(teqCO2(machine.chargeActuelleKg, fluide.gwpAr4)) : '—';

  // Pastille verte discrète : détection permanente de fuite
  const pastilleDetection = machine.detectionPermanente
    ? '<span class="pastille-verte" title="Détection permanente de fuite"></span>'
      + '<span class="sr-uniquement">Détection permanente de fuite</span>'
    : '';

  return '<article class="carte carte-machine">'

    // Ligne 1 : désignation + statut
    + '<div class="machine-entete">'
    + '<h3 class="machine-titre"><span>' + esc(machine.designation) + '</span>' + pastilleDetection + '</h3>'
    + chipStatut(machine.statut)
    + '</div>'

    // Ligne 2 : type · marque modèle
    + '<p class="machine-sous-titre">'
    + esc(machine.type) + ' · ' + esc(machine.marque) + ' ' + esc(machine.modele)
    + '</p>'

    // Fluide : chip code mono fond gris clair + famille grise
    + '<div class="machine-fluide">'
    + '<span class="chip chip-gris chip-mono">' + esc(machine.fluide) + '</span>'
    + '<span class="machine-famille">' + esc(fluide ? fluide.famille : '—') + '</span>'
    + '</div>'

    // Barre de remplissage de la charge
    + barreProgression(pct, teinteBarre)

    // Charge actuelle / nominale + équivalent CO₂ à droite
    + '<div class="machine-charge">'
    + '<span>Charge <span class="mono">' + esc(fmtNombre(machine.chargeActuelleKg, 2))
    + ' / ' + esc(fmtKg(machine.chargeNominaleKg)) + '</span></span>'
    + '<span class="machine-co2">' + esc(co2) + '</span>'
    + '</div>'

    // Pied : localisation à gauche, détenteur à droite
    + '<div class="machine-pied">'
    + '<span class="machine-localisation">' + esc(machine.localisation) + '</span>'
    + '<span class="machine-detenteur">' + esc(detenteur) + '</span>'
    + '</div>'

    // Actions discrètes : plaque F-Gas (aperçu/impression) + modification de la fiche
    + '<div class="machine-actions">'
    + '<button type="button" class="btn btn-contour btn-petit" data-action="plaque-machine" '
    + 'data-id="' + esc(machine.id) + '" aria-label="Plaque F-Gas de ' + esc(machine.designation) + '">Plaque</button>'
    + '<button type="button" class="btn btn-contour btn-petit" data-action="modifier-machine" '
    + 'data-id="' + esc(machine.id) + '" aria-label="Modifier ' + esc(machine.designation) + '">Modifier</button>'
    + '</div>'

    + '</article>';
}

/* ============================================================
   Rendu de la vue
   ============================================================ */

/**
 * Rend la vue « Parc machines ».
 * @param {HTMLElement} conteneur — élément vidé d'avance par app.js
 * @param {{ store: object, naviguer: (id: string) => void }} ctx
 */
export async function render(conteneur, ctx) {
  const [machines, fluides, clients] = await Promise.all([
    ctx.store.getMachines(),
    ctx.store.getFluides(),
    ctx.store.getClients()
  ]);

  // Index de recherche : fluide par code, client par identifiant
  const fluideParCode = new Map(fluides.map(function (f) { return [f.code, f]; }));
  const clientParId = new Map(clients.map(function (c) { return [c.id, c]; }));

  const pluriel = machines.length > 1 ? 's' : '';
  const sousTitre = machines.length + ' équipement' + pluriel + ' suivi' + pluriel
    + ' — charge, fluide, contrôles';

  const cartes = machines.length
    ? '<div class="grille-2">'
      + machines.map(function (machine) {
          return carteMachine(machine, fluideParCode, clientParId);
        }).join('')
      + '</div>'
    : '<div class="carte"><div class="etat-vide">' + ICONES.machine
      + '<p>Aucune machine dans le parc pour le moment.</p></div></div>';

  conteneur.innerHTML = STYLES_VUE
    + enteteVue({
        titre: titre,
        sousTitre: sousTitre,
        actionsHtml: '<button id="bouton-ajouter-machine" class="btn btn-marine" type="button">'
          + ICONES.plus + '<span>Ajouter</span></button>'
      })
    + cartes;

  // Ajout d'une nouvelle machine : ré-affiche la vue si l'enregistrement a réussi
  conteneur.querySelector('#bouton-ajouter-machine').addEventListener('click', async function () {
    const enregistre = await ouvrirFormMachine(ctx);
    if (enregistre) render(conteneur, ctx);
  });

  // Modification d'une machine existante, une écoute par carte
  conteneur.querySelectorAll('[data-action="modifier-machine"]').forEach(function (bouton) {
    bouton.addEventListener('click', async function () {
      const enregistre = await ouvrirFormMachine(ctx, bouton.dataset.id);
      if (enregistre) render(conteneur, ctx);
    });
  });

  // Aperçu / impression de la plaque F-Gas, une écoute par carte
  conteneur.querySelectorAll('[data-action="plaque-machine"]').forEach(function (bouton) {
    bouton.addEventListener('click', function () {
      ouvrirPlaque(ctx, bouton.dataset.id);
    });
  });
}
