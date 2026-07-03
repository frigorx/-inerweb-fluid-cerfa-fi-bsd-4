// ============================================================
// inerWeb Fluide — modale « Créer / Modifier un client / détenteur »
// (Phase C, IM-11) Cadre 2 du CERFA : raison sociale, adresse,
// SIRET (validation de forme : 14 chiffres, espaces tolérés).
// Même gabarit que modales/etablissement-form.js.
// ============================================================

import { modale, toast } from '../views/communs.js';
import { esc } from '../core/utils.js';

/** Construit le HTML du formulaire client (création ou édition). */
function gabaritFormulaire(client) {
  const c = client || {};
  return '<form id="form-client" class="formulaire" novalidate>'

    + '<div id="cf-bandeau-erreur" class="bandeau-erreur" hidden></div>'

    + '<div class="champ" data-champ="raisonSociale">'
    + '<label for="cf-raison-sociale">Raison sociale *</label>'
    + '<input type="text" id="cf-raison-sociale" name="raisonSociale" maxlength="150" '
    + 'value="' + esc(c.raisonSociale || '') + '" placeholder="Ex. Boulangerie Le Fournil">'
    + '<span class="champ-erreur" hidden></span>'
    + '</div>'

    + '<div class="champ" data-champ="adresse">'
    + '<label for="cf-adresse">Adresse (avec CP et ville) *</label>'
    + '<input type="text" id="cf-adresse" name="adresse" maxlength="200" '
    + 'value="' + esc(c.adresse || '') + '" placeholder="Ex. 12 rue des Fabres, 13001 Marseille">'
    + '<span class="champ-erreur" hidden></span>'
    + '</div>'

    + '<div class="champ" data-champ="siret">'
    + '<label for="cf-siret">N° SIRET *</label>'
    + '<input type="text" id="cf-siret" name="siret" maxlength="20" inputmode="numeric" '
    + 'value="' + esc(c.siret || '') + '" placeholder="14 chiffres, ex. 824 519 002 00018">'
    + '<span class="champ-erreur" hidden></span>'
    + '</div>'

    + '</form>';
}

function marquerErreur(racine, nomChamp, message) {
  const champ = racine.querySelector('[data-champ="' + nomChamp + '"]');
  if (!champ) return;
  champ.classList.add('invalide');
  const erreur = champ.querySelector('.champ-erreur');
  if (erreur) {
    erreur.textContent = message;
    erreur.hidden = false;
  }
}

function effacerErreur(racine, nomChamp) {
  const champ = racine.querySelector('[data-champ="' + nomChamp + '"]');
  if (!champ) return;
  champ.classList.remove('invalide');
  const erreur = champ.querySelector('.champ-erreur');
  if (erreur) {
    erreur.textContent = '';
    erreur.hidden = true;
  }
}

/**
 * Validation de forme du SIRET : 14 chiffres, espaces/tirets tolérés
 * à la saisie mais retirés avant contrôle (pas de contrôle de clé Luhn,
 * simple contrôle de forme comme demandé).
 * @param {string} valeurBrute
 * @returns {boolean}
 */
function siretDeFormeValide(valeurBrute) {
  const chiffres = String(valeurBrute || '').replace(/[\s.-]/g, '');
  return /^\d{14}$/.test(chiffres);
}

/** Valide le formulaire ; retourne les valeurs ou null si invalide. */
function validerFormulaire(racine) {
  const form = racine.querySelector('#form-client');
  const donnees = new FormData(form);
  let valide = true;

  ['raisonSociale', 'adresse', 'siret'].forEach(function (nom) {
    effacerErreur(racine, nom);
  });

  const raisonSociale = String(donnees.get('raisonSociale') || '').trim();
  if (!raisonSociale) {
    marquerErreur(racine, 'raisonSociale', 'La raison sociale est obligatoire.');
    valide = false;
  }

  const adresse = String(donnees.get('adresse') || '').trim();
  if (!adresse) {
    marquerErreur(racine, 'adresse', 'L’adresse est obligatoire.');
    valide = false;
  }

  const siretBrut = String(donnees.get('siret') || '').trim();
  if (!siretBrut) {
    marquerErreur(racine, 'siret', 'Le SIRET est obligatoire.');
    valide = false;
  } else if (!siretDeFormeValide(siretBrut)) {
    marquerErreur(racine, 'siret', 'Le SIRET doit comporter 14 chiffres.');
    valide = false;
  }

  if (!valide) return null;

  return {
    raisonSociale: raisonSociale,
    adresse: adresse,
    siret: siretBrut
  };
}

/**
 * Ouvre la modale de création ou d'édition d'un client / détenteur.
 * @param {{ store: object }} ctx
 * @param {object|null} client — client existant (édition) ou null (création)
 * @returns {Promise<boolean>} résolue à la fermeture (true si enregistré)
 */
export async function ouvrirFormClient(ctx, client = null) {
  const enEdition = Boolean(client && client.id);

  return new Promise(function (resoudre) {
    const { fermer } = modale({
      titre: enEdition ? 'Modifier le détenteur' : 'Ajouter un détenteur',
      contenuHtml: gabaritFormulaire(client),
      actionsHtml:
        '<button type="button" id="cf-annuler" class="btn btn-secondaire">Annuler</button>'
        + '<button type="button" id="cf-enregistrer" class="btn btn-primaire">Enregistrer</button>'
    });

    const racine = document.querySelector('.modale-fond:last-of-type .modale')
      || document.querySelector('.modale');
    const bandeauErreur = racine.querySelector('#cf-bandeau-erreur');

    function masquerBandeau() {
      bandeauErreur.hidden = true;
      bandeauErreur.textContent = '';
    }

    function afficherBandeau(message) {
      bandeauErreur.textContent = message;
      bandeauErreur.hidden = false;
    }

    racine.querySelectorAll('input').forEach(function (champ) {
      champ.addEventListener('input', masquerBandeau);
      champ.addEventListener('change', masquerBandeau);
    });

    let fermeeParEnregistrement = false;

    racine.querySelector('#cf-annuler').addEventListener('click', function () {
      fermer();
    });

    racine.querySelector('#cf-enregistrer').addEventListener('click', async function () {
      const valeurs = validerFormulaire(racine);
      if (!valeurs) return;

      const bouton = racine.querySelector('#cf-enregistrer');
      bouton.disabled = true;

      try {
        if (enEdition && typeof ctx.store.updateClient === 'function') {
          await ctx.store.updateClient(client.id, valeurs);
          toast('Détenteur mis à jour.', 'succes');
        } else if (!enEdition && typeof ctx.store.createClient === 'function') {
          await ctx.store.createClient(valeurs);
          toast('Détenteur ajouté.', 'succes');
        } else {
          throw new Error(
            'La création/modification des détenteurs n’est pas encore disponible '
            + 'côté données (fonctionnalité à venir).');
        }
        fermeeParEnregistrement = true;
        fermer();
      } catch (erreur) {
        afficherBandeau(erreur && erreur.message ? erreur.message : 'Enregistrement impossible.');
        bouton.disabled = false;
      }
    });

    const fondModale = racine.closest('.modale-fond');
    const observateur = new MutationObserver(function () {
      if (!document.body.contains(fondModale)) {
        observateur.disconnect();
        resoudre(fermeeParEnregistrement);
      }
    });
    observateur.observe(document.body, { childList: true, subtree: true });
  });
}
