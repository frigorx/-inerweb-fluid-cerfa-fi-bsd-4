// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — vue « Registre des plaintes » (report v7).
// Journal des réclamations clients : objet, réception, réponse, état
// (RECUE / EN_COURS / TRAITEE). Jamais de suppression (registre).
// ============================================================

import { enteteVue, tableau, ICONES } from './communs.js';
import { esc, fmtDate } from '../core/utils.js';
import { ouvrirFormPlainte } from '../modales/plainte-form.js';

export const titre = 'Registre des plaintes';

const LIBELLES_ETAT = { RECUE: 'Reçue', EN_COURS: 'En cours', TRAITEE: 'Traitée' };
const CLASSE_ETAT = {
  RECUE: 'plainte-etat-recue',
  EN_COURS: 'plainte-etat-cours',
  TRAITEE: 'plainte-etat-traitee'
};

const STYLES_VUE = `
<style>
  .plainte-objet { color: var(--texte); }
  .plainte-numero { font-variant-numeric: tabular-nums; color: var(--texte-2); }
  .plainte-client { font-size: 12px; color: var(--texte-2); }
  .plainte-badge {
    display: inline-block; padding: 2px 9px; border-radius: 999px;
    font-size: 11.5px; font-weight: 600;
  }
  .plainte-etat-recue { background: rgba(2,136,209,0.14); color: #0277BD; }
  .plainte-etat-cours { background: rgba(230,81,0,0.14); color: #E65100; }
  .plainte-etat-traitee { background: rgba(46,125,50,0.14); color: #2E7D32; }
  @media (prefers-color-scheme: dark) {
    .plainte-etat-recue { color: #4FC3F7; }
    .plainte-etat-cours { color: #FFB74D; }
    .plainte-etat-traitee { color: #81C784; }
  }
</style>`;

function ligne(p) {
  const client = p.clientLibelle
    || (p.clientNom ?? null)
    || (p.clientId ? '(client du registre)' : '—');
  const badge = '<span class="plainte-badge ' + (CLASSE_ETAT[p.etat] || '')
    + '">' + (LIBELLES_ETAT[p.etat] || p.etat) + '</span>';
  return '<tr data-id="' + esc(p.id) + '" class="plainte-ligne" tabindex="0" '
    + 'role="button" style="cursor:pointer">'
    + '<td><span class="plainte-numero">' + esc(p.numero || '—') + '</span></td>'
    + '<td>' + esc(fmtDate(p.dateReception)) + '</td>'
    + '<td><div class="plainte-objet">' + esc(p.objet || '') + '</div>'
    + '<div class="plainte-client">' + esc(client) + '</div></td>'
    + '<td>' + (p.dateReponse ? esc(fmtDate(p.dateReponse)) : '—') + '</td>'
    + '<td class="cellule-centre">' + badge + '</td>'
    + '</tr>';
}

export async function render(conteneur, ctx) {
  const plaintes = await ctx.store.getPlaintes();
  const clients = await ctx.store.getClients();
  const nomParId = new Map(clients.map((c) => [c.id, c.raisonSociale]));
  const enrichies = plaintes.map((p) => ({
    ...p, clientNom: p.clientId ? nomParId.get(p.clientId) ?? null : null
  }));

  const enCours = enrichies.filter((p) => p.etat !== 'TRAITEE').length;
  const sousTitre = enrichies.length
    ? enrichies.length + ' plainte' + (enrichies.length > 1 ? 's' : '')
      + ' · ' + enCours + ' à traiter'
    : 'Aucune plainte enregistrée';

  const corps = enrichies.length
    ? tableau({
        colonnes: [
          { cle: 'numero', libelle: 'N°' },
          { cle: 'reception', libelle: 'Réception' },
          { cle: 'objet', libelle: 'Objet / plaignant' },
          { cle: 'reponse', libelle: 'Réponse' },
          { cle: 'etat', libelle: 'État', align: 'centre' }
        ],
        lignesHtml: enrichies.map(ligne)
      })
    : '<div class="carte"><div class="etat-vide">' + ICONES.client
      + '<p>Aucune plainte au registre. Enregistrez une réclamation pour '
      + 'en garder la trace et son suivi.</p></div></div>';

  conteneur.innerHTML = STYLES_VUE
    + enteteVue({
        titre,
        sousTitre,
        actionsHtml: '<button id="plaintes-ajouter" class="btn btn-marine" '
          + 'type="button">' + ICONES.plus + '<span>Enregistrer une plainte</span></button>'
      })
    + corps;

  const rafraichir = () => render(conteneur, ctx);

  conteneur.querySelector('#plaintes-ajouter')
    .addEventListener('click', async function () {
      const ok = await ouvrirFormPlainte(ctx, null);
      if (ok) rafraichir();
    });

  conteneur.querySelectorAll('.plainte-ligne').forEach(function (tr) {
    const ouvrir = async function () {
      const ok = await ouvrirFormPlainte(ctx, tr.dataset.id);
      if (ok) rafraichir();
    };
    tr.addEventListener('click', ouvrir);
    tr.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ouvrir(); }
    });
  });
}
