// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — modale « Enregistrer / Modifier une plainte »
// (report v7 : registre des réclamations clients). Objet + date de
// réception obligatoires ; client du registre OU plaignant en saisie
// libre ; état RECUE / EN_COURS / TRAITEE ; réponse et sa date.
// Le store reste seul juge (mêmes gardes des deux côtés).
// ============================================================

import { modale, toast } from '../views/communs.js';
import { esc } from '../core/utils.js';

const LIBELLES_ETAT = {
  RECUE: 'Reçue', EN_COURS: 'En cours de traitement', TRAITEE: 'Traitée'
};

function gabarit(plainte, clients) {
  const p = plainte || {};
  const options = clients.map(function (c) {
    return '<option value="' + esc(c.id) + '"'
      + (p.clientId === c.id ? ' selected' : '') + '>'
      + esc(c.raisonSociale) + '</option>';
  }).join('');
  const optionsEtat = ['RECUE', 'EN_COURS', 'TRAITEE'].map(function (e) {
    const courant = p.etat || 'RECUE';
    return '<option value="' + e + '"' + (courant === e ? ' selected' : '')
      + '>' + LIBELLES_ETAT[e] + '</option>';
  }).join('');
  return '<form id="form-plainte" class="formulaire" novalidate>'
    + '<div id="pf-bandeau-erreur" class="bandeau-erreur" hidden></div>'

    + '<div class="grille-form-2">'
    + '<div class="champ" data-champ="dateReception">'
    + '<label for="pf-reception">Date de réception *</label>'
    + '<input type="date" id="pf-reception" name="dateReception" '
    + 'value="' + esc(p.dateReception || '') + '">'
    + '<span class="champ-erreur" hidden></span>'
    + '</div>'
    + '<div class="champ" data-champ="etat">'
    + '<label for="pf-etat">État</label>'
    + '<select id="pf-etat" name="etat">' + optionsEtat + '</select>'
    + '</div>'
    + '</div>'

    + '<div class="champ" data-champ="clientId">'
    + '<label for="pf-client">Client / détenteur concerné</label>'
    + '<select id="pf-client" name="clientId">'
    + '<option value="">— non précisé —</option>' + options + '</select>'
    + '</div>'
    + '<div class="champ" data-champ="clientLibelle">'
    + '<label for="pf-client-libelle">…ou plaignant hors registre</label>'
    + '<input type="text" id="pf-client-libelle" name="clientLibelle" '
    + 'maxlength="150" value="' + esc(p.clientLibelle || '') + '" '
    + 'placeholder="Ex. Un particulier, une copropriété…">'
    + '</div>'

    + '<div class="champ" data-champ="objet">'
    + '<label for="pf-objet">Objet de la réclamation *</label>'
    + '<textarea id="pf-objet" name="objet" rows="2" maxlength="500" '
    + 'placeholder="Ex. Température instable après intervention.">'
    + esc(p.objet || '') + '</textarea>'
    + '<span class="champ-erreur" hidden></span>'
    + '</div>'

    + '<div class="grille-form-2">'
    + '<div class="champ" data-champ="dateReponse">'
    + '<label for="pf-date-reponse">Date de réponse</label>'
    + '<input type="date" id="pf-date-reponse" name="dateReponse" '
    + 'value="' + esc(p.dateReponse || '') + '">'
    + '</div>'
    + '</div>'
    + '<div class="champ" data-champ="reponse">'
    + '<label for="pf-reponse">Réponse apportée</label>'
    + '<textarea id="pf-reponse" name="reponse" rows="2" maxlength="500" '
    + 'placeholder="Suite donnée à la réclamation.">'
    + esc(p.reponse || '') + '</textarea>'
    + '</div>'

    + '</form>';
}

/** Valeurs saisies (chaîne vide → champ absent pour un patch propre). */
function valeurs(racine) {
  const g = (nom) => {
    const el = racine.querySelector('[name="' + nom + '"]');
    return el ? String(el.value || '').trim() : '';
  };
  return {
    dateReception: g('dateReception'),
    etat: g('etat') || 'RECUE',
    clientId: g('clientId') || null,
    clientLibelle: g('clientLibelle') || null,
    objet: g('objet'),
    dateReponse: g('dateReponse') || null,
    reponse: g('reponse') || null
  };
}

/**
 * Ouvre la modale de création ou d'édition d'une plainte.
 * @returns {Promise<boolean>} true si enregistrée.
 */
export async function ouvrirFormPlainte(ctx, plainteId) {
  const [plaintes, clients] = await Promise.all([
    plainteId ? ctx.store.getPlaintes() : Promise.resolve([]),
    ctx.store.getClients()
  ]);
  const plainte = plainteId
    ? plaintes.find((p) => p.id === plainteId) ?? null : null;
  const enEdition = Boolean(plainte);
  const clientsActifs = clients.filter((c) => c.actif !== false
    || (plainte && plainte.clientId === c.id));

  return new Promise(function (resoudre) {
    const { racine, fermer } = modale({
      titre: enEdition
        ? 'Plainte ' + (plainte.numero || '') : 'Enregistrer une plainte',
      contenuHtml: gabarit(plainte, clientsActifs),
      actionsHtml:
        '<button type="button" id="pf-annuler" class="btn btn-secondaire">Annuler</button>'
        + '<button type="button" id="pf-enregistrer" class="btn btn-primaire">Enregistrer</button>'
    });
    const bandeau = racine.querySelector('#pf-bandeau-erreur');
    const masquer = () => { bandeau.hidden = true; bandeau.textContent = ''; };
    racine.querySelectorAll('input, select, textarea').forEach(function (c) {
      c.addEventListener('input', masquer);
    });

    let enregistree = false;
    racine.querySelector('#pf-annuler').addEventListener('click', fermer);
    racine.querySelector('#pf-enregistrer').addEventListener('click',
      async function () {
        const v = valeurs(racine);
        const bouton = racine.querySelector('#pf-enregistrer');
        bouton.disabled = true;
        try {
          if (enEdition) {
            await ctx.store.updatePlainte(plainte.id, v);
            toast('Plainte mise à jour.', 'succes');
          } else {
            await ctx.store.createPlainte(v);
            toast('Plainte enregistrée.', 'succes');
          }
          enregistree = true;
          fermer();
        } catch (erreur) {
          bandeau.textContent = erreur && erreur.message
            ? erreur.message : 'Enregistrement impossible.';
          bandeau.hidden = false;
          bouton.disabled = false;
        }
      });

    const fond = racine.closest('.modale-fond');
    const obs = new MutationObserver(function () {
      if (!document.body.contains(fond)) {
        obs.disconnect();
        resoudre(enregistree);
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  });
}
