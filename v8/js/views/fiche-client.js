// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — vue « Fiche client / détenteur » (Phase 2)
// Vue hors sidebar, atteinte par la route paramétrée '#/c/<id>'.
// Coordonnées du client + liste de SES machines (drill-down cliquable
// vers la fiche machine), ajout d'une machine déjà rattachée au client.
// ============================================================

import { enteteVue, tableau, chipStatut, toast, ICONES } from './communs.js';
import { esc, fmtNombre, fmtKg } from '../core/utils.js';
import { ouvrirFormClient } from '../modales/client-form.js';
import { ouvrirFormMachine } from '../modales/machine-form.js';
import { ouvrirEtiquetteClient } from '../documents/etiquette-client.js';
import { genererDossierClient } from '../documents/dossier-client.js';
import { telechargerEtSceller } from '../documents/telecharger-dossier.js';

export const titre = 'Fiche client';

const STYLES_VUE = `
<style>
  .fc-retour {
    display: inline-flex; align-items: center; gap: 6px;
    margin-bottom: 12px; font-size: 13px; color: var(--texte-3);
    text-decoration: none;
  }
  .fc-retour:hover, .fc-retour:focus-visible { color: var(--accent); }
  .fc-section { margin-top: 20px; }
  .fc-section-titre {
    font-family: var(--police-titres); font-size: 15px; font-weight: 600;
    color: var(--texte); margin: 0 0 10px;
  }
  .fc-coord {
    display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px 24px; padding: 16px;
  }
  @media (max-width: 640px) { .fc-coord { grid-template-columns: 1fr; } }
  .fc-coord-libelle {
    font-size: 10.5px; letter-spacing: .03em; text-transform: uppercase;
    color: var(--texte-faible);
  }
  .fc-coord-valeur { font-size: 13.5px; color: var(--texte); margin-top: 2px; }
  .fc-actions { display: flex; flex-wrap: wrap; gap: 10px; }
  .fc-machine-lien {
    background: none; border: none; padding: 0; cursor: pointer;
    color: var(--accent); font: inherit; text-align: left;
  }
  .fc-machine-lien:hover { text-decoration: underline; }
</style>`;

function ligneCoord(libelle, valeur) {
  if (valeur === null || valeur === undefined || valeur === '') return '';
  return '<div>'
    + '<div class="fc-coord-libelle">' + esc(libelle) + '</div>'
    + '<div class="fc-coord-valeur">' + esc(valeur) + '</div>'
    + '</div>';
}

function blocCoordonnees(client) {
  const lignes = [
    ligneCoord('Adresse', client.adresse),
    ligneCoord('SIRET', client.siret),
    ligneCoord('Contact', client.contact),
    ligneCoord('Téléphone', client.telephone),
    ligneCoord('Courriel', client.email)
  ].join('');
  const corps = lignes
    || '<div class="etat-vide" style="padding:16px">' + ICONES.client
      + '<p>Aucune coordonnée renseignée.</p></div>';
  return '<div class="fc-section">'
    + '<h3 class="fc-section-titre">Coordonnées</h3>'
    + '<div class="carte"><div class="fc-coord">' + corps + '</div></div>'
    + '</div>';
}

function ligneMachine(machine, fluideParCode) {
  const fluide = fluideParCode.get(machine.fluide);
  const cible = machine.codePublic
    ? '<button type="button" class="fc-machine-lien" data-action="ouvrir-machine" '
      + 'data-code="' + esc(machine.codePublic) + '">' + esc(machine.designation) + '</button>'
    : esc(machine.designation);
  return '<tr>'
    + '<td>' + cible + '</td>'
    + '<td><span class="chip chip-gris chip-mono">' + esc(machine.fluide) + '</span> '
    + esc(fluide ? fluide.famille : '') + '</td>'
    + '<td class="mono">' + esc(fmtNombre(machine.chargeActuelleKg, 2))
    + ' / ' + esc(fmtKg(machine.chargeNominaleKg)) + '</td>'
    + '<td>' + chipStatut(machine.statut) + '</td>'
    + '</tr>';
}

function blocMachines(machinesClient, fluideParCode) {
  const corps = machinesClient.length
    ? tableau({
        colonnes: [
          { cle: 'designation', libelle: 'Machine' },
          { cle: 'fluide', libelle: 'Fluide' },
          { cle: 'charge', libelle: 'Charge' },
          { cle: 'statut', libelle: 'Statut' }
        ],
        lignesHtml: machinesClient.map((m) => ligneMachine(m, fluideParCode))
      })
    : '<div class="carte"><div class="etat-vide">' + ICONES.machine
      + '<p>Aucune machine rattachée à ce client pour le moment.</p></div></div>';

  return '<div class="fc-section">'
    + '<h3 class="fc-section-titre">Machines de ce client</h3>'
    + corps
    + '</div>';
}

function afficherClientIntrouvable(conteneur) {
  conteneur.innerHTML = STYLES_VUE
    + '<a href="#/clients" class="fc-retour">' + ICONES.client + '<span>Retour à l’annuaire</span></a>'
    + enteteVue({ titre: 'Client introuvable' })
    + '<div class="carte"><div class="etat-vide">' + ICONES.client
    + '<p>Aucun client ne correspond à ce lien (il a peut-être été supprimé).</p>'
    + '</div></div>';
}

/**
 * Rend la fiche d'un client / détenteur, retrouvé par son identifiant.
 * @param {HTMLElement} conteneur — élément vidé d'avance par app.js
 * @param {{ store: object, naviguer: (hash: string) => void, param: string }} ctx
 */
export async function render(conteneur, ctx) {
  const { store, naviguer, param } = ctx;
  const id = String(param || '').trim();

  const [clients, machines, fluides] = await Promise.all([
    store.getClients(),
    store.getMachines(),
    store.getFluides()
  ]);

  const client = clients.find((c) => c.id === id);
  if (!client) {
    afficherClientIntrouvable(conteneur);
    return;
  }

  const fluideParCode = new Map(fluides.map((f) => [f.code, f]));
  const machinesClient = machines
    .filter((m) => m.clientId === client.id && m.statut !== 'DEMANTELEE');

  const inactif = client.actif === false;
  const bandeauInactif = inactif
    ? '<div class="fc-section"><div class="bandeau-avertissement" style="align-items:center">'
      + ICONES.alerte + '<span>Ce client est désactivé (masqué de l’annuaire actif).</span>'
      + '</div></div>'
    : '';

  const nb = machinesClient.length;
  const sousTitre = nb + ' machine' + (nb > 1 ? 's' : '') + ' rattachée'
    + (nb > 1 ? 's' : '');

  conteneur.innerHTML = STYLES_VUE
    + '<a href="#/clients" class="fc-retour">' + ICONES.client + '<span>Retour à l’annuaire</span></a>'
    + enteteVue({ titre: client.raisonSociale, sousTitre: sousTitre })
    + bandeauInactif
    + '<div class="fc-section"><div class="fc-actions">'
    + '<button type="button" class="btn btn-primaire" data-action="ajouter-machine">'
    + ICONES.plus + '<span>Ajouter une machine</span></button>'
    + '<button type="button" class="btn btn-contour" data-action="etiquette-client">'
    + ICONES.grille + '<span>Étiquette QR</span></button>'
    + '<button type="button" class="btn btn-contour" data-action="modifier-client">'
    + ICONES.engrenage + '<span>Modifier le client</span></button>'
    + '<button type="button" class="btn btn-contour" data-action="dossier-client">'
    + ICONES.sauvegarde + '<span>Exporter le dossier (ZIP)</span></button>'
    + (nb ? '<button type="button" class="btn btn-contour" data-action="voir-parc">'
        + ICONES.machine + '<span>Voir dans le parc</span></button>' : '')
    + '</div></div>'
    + blocCoordonnees(client)
    + blocMachines(machinesClient, fluideParCode);

  const rafraichir = function () { render(conteneur, ctx); };

  // Ouvrir la fiche d'une machine (par son code public)
  conteneur.querySelectorAll('[data-action="ouvrir-machine"]').forEach(function (bouton) {
    bouton.addEventListener('click', function () {
      naviguer('m/' + bouton.dataset.code);
    });
  });

  // Ajouter une machine déjà rattachée à ce client
  conteneur.querySelector('[data-action="ajouter-machine"]').addEventListener('click', async function () {
    const enregistre = await ouvrirFormMachine(ctx, null, { clientId: client.id });
    if (enregistre) rafraichir();
  });

  // Étiquette QR du client (à coller chez le détenteur → ses machines)
  conteneur.querySelector('[data-action="etiquette-client"]').addEventListener('click', function () {
    ouvrirEtiquetteClient(ctx, client.id);
  });

  // Modifier le client
  conteneur.querySelector('[data-action="modifier-client"]').addEventListener('click', async function () {
    const enregistre = await ouvrirFormClient(ctx, client);
    if (enregistre) rafraichir();
  });

  // Voir les machines de ce client dans le parc (filtre pré-appliqué)
  const boutonParc = conteneur.querySelector('[data-action="voir-parc"]');
  if (boutonParc) {
    boutonParc.addEventListener('click', function () {
      naviguer('machines/' + client.id);
    });
  }

  // Export ZIP « dossier client » — identité + parc + dossier de chaque machine.
  const boutonDossierClient = conteneur.querySelector('[data-action="dossier-client"]');
  if (boutonDossierClient) {
    boutonDossierClient.addEventListener('click', async function () {
      const libelle = boutonDossierClient.querySelector('span');
      const texteInitial = libelle ? libelle.textContent : '';
      boutonDossierClient.disabled = true;
      if (libelle) libelle.textContent = 'Génération…';
      try {
        const dossier = await genererDossierClient(store, client.id);
        telechargerEtSceller(dossier);
      } catch (erreur) {
        toast(erreur && erreur.message ? erreur.message
          : 'Export du dossier client impossible.', 'erreur');
      } finally {
        boutonDossierClient.disabled = false;
        if (libelle) libelle.textContent = texteInitial;
      }
    });
  }
}
