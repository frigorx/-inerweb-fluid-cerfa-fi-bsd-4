// ============================================================
// inerWeb Fluide — vue « Clients / détenteurs » (Phase 2, référence client)
// Annuaire des détenteurs d'équipements : recherche, coordonnées, nombre
// de machines, accès à la fiche client (drill-down vers ses machines).
// Une machine pouvant être chez n'importe quel client, cet annuaire est
// la porte d'entrée pour retrouver les machines par client.
// ============================================================

import { enteteVue, tableau, toast, confirmer, ICONES } from './communs.js';
import { esc } from '../core/utils.js';
import { ouvrirFormClient } from '../modales/client-form.js';

export const titre = 'Clients / détenteurs';

const STYLES_VUE = `
<style>
  .clients-barre {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    margin-bottom: 14px;
  }
  .clients-recherche {
    flex: 1 1 240px;
    max-width: 420px;
  }
  .clients-recherche input {
    width: 100%;
  }
  .clients-inactifs {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 12.5px;
    color: var(--texte-3);
    cursor: pointer;
    user-select: none;
  }
  .client-nom {
    font-weight: 600;
    color: var(--texte);
  }
  .client-adresse {
    font-size: 11.5px;
    color: var(--texte-3);
    margin-top: 2px;
  }
  .client-coord {
    font-size: 12px;
    color: var(--texte-2);
    line-height: 1.5;
  }
  .client-coord-vide { color: var(--texte-faible); }
  tr.client-inactif { opacity: 0.55; }
  .client-badge-inactif {
    display: inline-block;
    margin-left: 7px;
    font-size: 10px;
    letter-spacing: .03em;
    text-transform: uppercase;
    color: var(--texte-faible);
  }
  .clients-aucun-resultat {
    padding: 18px;
    text-align: center;
    color: var(--texte-3);
    font-size: 13px;
  }
</style>`;

/** Texte de recherche agrégé (minuscules) d'un client. */
function texteRecherche(client) {
  return [client.raisonSociale, client.adresse, client.siret,
    client.contact, client.telephone, client.email]
    .filter(Boolean).join(' ').toLowerCase();
}

/** Cellule « coordonnées » : contact + téléphone + courriel, ou tiret. */
function celluleCoordonnees(client) {
  const morceaux = [];
  if (client.contact) morceaux.push(esc(client.contact));
  if (client.telephone) morceaux.push(esc(client.telephone));
  if (client.email) morceaux.push(esc(client.email));
  if (morceaux.length === 0) {
    return '<span class="client-coord-vide">—</span>';
  }
  return '<div class="client-coord">' + morceaux.join('<br>') + '</div>';
}

function ligneClient(client) {
  const inactif = client.actif === false;
  const badge = inactif
    ? '<span class="client-badge-inactif">inactif</span>' : '';
  const boutonActivation = inactif
    ? '<button type="button" class="btn btn-contour btn-petit" data-action="reactiver" '
      + 'data-id="' + esc(client.id) + '">Réactiver</button>'
    : '<button type="button" class="btn btn-contour btn-petit" data-action="desactiver" '
      + 'data-id="' + esc(client.id) + '">Désactiver</button>';

  return '<tr class="' + (inactif ? 'client-inactif' : '') + '" '
    + 'data-recherche="' + esc(texteRecherche(client)) + '">'
    + '<td>'
    + '<div class="client-nom">' + esc(client.raisonSociale) + badge + '</div>'
    + (client.adresse ? '<div class="client-adresse">' + esc(client.adresse) + '</div>' : '')
    + '</td>'
    + '<td>' + celluleCoordonnees(client) + '</td>'
    + '<td>' + (client.siret ? esc(client.siret) : '<span class="client-coord-vide">—</span>') + '</td>'
    + '<td class="align-centre mono">' + esc(String(client.nbMachines ?? 0)) + '</td>'
    + '<td class="align-droite">'
    + '<span style="display:inline-flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">'
    + '<button type="button" class="btn btn-contour btn-petit" data-action="ouvrir" '
    + 'data-id="' + esc(client.id) + '">Ouvrir la fiche</button>'
    + '<button type="button" class="btn btn-contour btn-petit" data-action="modifier" '
    + 'data-id="' + esc(client.id) + '">Modifier</button>'
    + boutonActivation
    + '</span>'
    + '</td>'
    + '</tr>';
}

/**
 * Rend la vue « Clients / détenteurs ».
 * @param {HTMLElement} conteneur — élément vidé d'avance par app.js
 * @param {{ store: object, naviguer: (hash: string) => void }} ctx
 * @param {{ avecInactifs?: boolean }} [options]
 */
export async function render(conteneur, ctx, options = {}) {
  const avecInactifs = Boolean(options.avecInactifs);
  const tous = await ctx.store.getClients();

  const visibles = avecInactifs ? tous : tous.filter((c) => c.actif !== false);
  const nbInactifs = tous.filter((c) => c.actif === false).length;

  const actifs = tous.filter((c) => c.actif !== false).length;
  const sousTitre = actifs + ' client' + (actifs > 1 ? 's' : '') + ' actif'
    + (actifs > 1 ? 's' : '')
    + (nbInactifs ? ' · ' + nbInactifs + ' inactif' + (nbInactifs > 1 ? 's' : '') : '')
    + ' — retrouvez les machines par détenteur';

  const corps = visibles.length
    ? tableau({
        colonnes: [
          { cle: 'nom', libelle: 'Raison sociale / adresse' },
          { cle: 'coord', libelle: 'Coordonnées' },
          { cle: 'siret', libelle: 'SIRET' },
          { cle: 'nb', libelle: 'Machines', align: 'centre' },
          { cle: 'actions', libelle: '', align: 'droite' }
        ],
        lignesHtml: visibles.map(ligneClient)
      })
    : '<div class="carte"><div class="etat-vide">' + ICONES.client
      + '<p>Aucun client enregistré. Ajoutez un détenteur pour rattacher '
      + 'ses machines.</p></div></div>';

  const caseInactifs = nbInactifs
    ? '<label class="clients-inactifs">'
      + '<input type="checkbox" id="clients-voir-inactifs"' + (avecInactifs ? ' checked' : '') + '>'
      + 'Afficher les inactifs (' + nbInactifs + ')</label>'
    : '';

  conteneur.innerHTML = STYLES_VUE
    + enteteVue({
        titre: titre,
        sousTitre: sousTitre,
        actionsHtml: '<button id="clients-ajouter" class="btn btn-marine" type="button">'
          + ICONES.plus + '<span>Ajouter un client</span></button>'
      })
    + '<div class="clients-barre">'
    + '<div class="clients-recherche">'
    + '<input type="search" id="clients-recherche" placeholder="Rechercher (nom, ville, SIRET, contact…)" '
    + 'aria-label="Rechercher un client">'
    + '</div>'
    + caseInactifs
    + '</div>'
    + corps
    + '<div class="clients-aucun-resultat" id="clients-aucun" hidden>'
    + 'Aucun client ne correspond à votre recherche.</div>';

  // ---- Recherche : filtre les lignes déjà rendues (le focus reste dans le champ) ----
  const champRecherche = conteneur.querySelector('#clients-recherche');
  const messageAucun = conteneur.querySelector('#clients-aucun');
  if (champRecherche) {
    champRecherche.addEventListener('input', function () {
      const q = champRecherche.value.trim().toLowerCase();
      let visiblesCount = 0;
      conteneur.querySelectorAll('tbody tr[data-recherche]').forEach(function (tr) {
        const ok = q === '' || tr.dataset.recherche.includes(q);
        tr.style.display = ok ? '' : 'none';
        if (ok) visiblesCount += 1;
      });
      if (messageAucun) messageAucun.hidden = visiblesCount !== 0;
    });
  }

  // ---- Afficher / masquer les inactifs (re-rendu) ----
  const caseVoir = conteneur.querySelector('#clients-voir-inactifs');
  if (caseVoir) {
    caseVoir.addEventListener('change', function () {
      render(conteneur, ctx, { avecInactifs: caseVoir.checked });
    });
  }

  const rafraichir = function () { render(conteneur, ctx, { avecInactifs }); };

  // ---- Ajouter ----
  conteneur.querySelector('#clients-ajouter').addEventListener('click', async function () {
    const enregistre = await ouvrirFormClient(ctx, null);
    if (enregistre) rafraichir();
  });

  // ---- Ouvrir la fiche ----
  conteneur.querySelectorAll('[data-action="ouvrir"]').forEach(function (bouton) {
    bouton.addEventListener('click', function () {
      ctx.naviguer('c/' + bouton.dataset.id);
    });
  });

  // ---- Modifier ----
  const parId = new Map(tous.map((c) => [c.id, c]));
  conteneur.querySelectorAll('[data-action="modifier"]').forEach(function (bouton) {
    bouton.addEventListener('click', async function () {
      const client = parId.get(bouton.dataset.id);
      if (!client) return;
      const enregistre = await ouvrirFormClient(ctx, client);
      if (enregistre) rafraichir();
    });
  });

  // ---- Désactiver / réactiver ----
  conteneur.querySelectorAll('[data-action="desactiver"]').forEach(function (bouton) {
    bouton.addEventListener('click', async function () {
      const client = parId.get(bouton.dataset.id);
      if (!client) return;
      const confirme = await confirmer({
        titre: 'Désactiver le client',
        message: '« ' + client.raisonSociale + ' » sera masqué de l’annuaire actif. '
          + 'Ses machines et leur historique restent intacts ; vous pourrez le réactiver.',
        libelleConfirmer: 'Désactiver'
      });
      if (!confirme) return;
      try {
        await ctx.store.updateClient(client.id, { actif: false });
        toast('Client désactivé.', 'succes');
        rafraichir();
      } catch (erreur) {
        toast(erreur && erreur.message ? erreur.message : 'Erreur inattendue.', 'erreur');
      }
    });
  });
  conteneur.querySelectorAll('[data-action="reactiver"]').forEach(function (bouton) {
    bouton.addEventListener('click', async function () {
      try {
        await ctx.store.updateClient(bouton.dataset.id, { actif: true });
        toast('Client réactivé.', 'succes');
        rafraichir();
      } catch (erreur) {
        toast(erreur && erreur.message ? erreur.message : 'Erreur inattendue.', 'erreur');
      }
    });
  });
}
