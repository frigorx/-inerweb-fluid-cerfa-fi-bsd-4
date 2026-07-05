// ============================================================
// inerWeb Fluide — modale « Dossier opérateur » (Phase C)
// Formulaire complet du cadre 1 (raison sociale, SIRET, adresse,
// attestation de capacité, catégories/activités autorisées,
// audits) + pièces jointes (catégorie ATTESTATION_CAPACITE).
// ============================================================

import { modale, toast } from '../views/communs.js';
import { esc } from '../core/utils.js';
import { zonePiecesJointes } from '../composants/pieces-jointes.js';

// Catégories d'attestation de capacité (grilles 2008/2025)
const CATEGORIES = ['I', 'II', 'III', 'IV'];

// Activités réglementées (mêmes valeurs que le store)
const ACTIVITES = [
  { valeur: 'MISE_EN_SERVICE', libelle: 'Mise en service' },
  { valeur: 'MAINTENANCE', libelle: 'Maintenance' },
  { valeur: 'CONTROLE', libelle: 'Contrôle d’étanchéité' },
  { valeur: 'RECUPERATION', libelle: 'Récupération' },
  { valeur: 'DEMANTELEMENT', libelle: 'Démantèlement' }
];

// Style inline du label d'une case à cocher (même patron que machine-form.js)
const STYLE_LABEL_CASE = 'display:flex;flex-direction:row;align-items:center;gap:8px;'
  + 'text-transform:none;letter-spacing:normal;font-weight:500;font-size:13.5px;'
  + 'color:var(--texte-2);cursor:pointer;';

/** Groupe de cases à cocher (catégories ou activités). */
function groupeCases(nom, options, valeursCochees) {
  const coches = new Set(valeursCochees || []);
  return '<div style="display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:4px;">'
    + options.map(function (option) {
        const valeur = option.valeur ?? option;
        const libelle = option.libelle ?? option;
        const id = 'ef-' + nom + '-' + valeur;
        return '<label for="' + id + '" style="' + STYLE_LABEL_CASE + '">'
          + '<input type="checkbox" id="' + id + '" name="' + nom + '" value="' + esc(valeur) + '"'
          + ' style="width:16px;height:16px;"'
          + (coches.has(valeur) ? ' checked' : '') + '>'
          + '<span>' + esc(libelle) + '</span>'
          + '</label>';
      }).join('')
    + '</div>';
}

/** Construit le HTML du formulaire établissement. */
function gabaritFormulaire(etablissement) {
  const e = etablissement || {};
  return '<form id="form-etablissement" class="formulaire" novalidate>'

    + '<div id="bandeau-erreur-etab" class="bandeau-erreur" hidden></div>'

    + '<div class="champ" data-champ="raisonSociale">'
    + '<label for="ef-raison-sociale">Raison sociale *</label>'
    + '<input type="text" id="ef-raison-sociale" name="raisonSociale" maxlength="150" '
    + 'value="' + esc(e.raisonSociale || '') + '">'
    + '<span class="champ-erreur" hidden></span>'
    + '</div>'

    + '<div class="grille-form-2">'
    + '<div class="champ" data-champ="siret">'
    + '<label for="ef-siret">N° SIRET *</label>'
    + '<input type="text" id="ef-siret" name="siret" maxlength="20" '
    + 'value="' + esc(e.siret || '') + '">'
    + '<span class="champ-erreur" hidden></span>'
    + '</div>'

    + '<div class="champ" data-champ="adresse">'
    + '<label for="ef-adresse">Adresse complète *</label>'
    + '<input type="text" id="ef-adresse" name="adresse" maxlength="200" '
    + 'value="' + esc(e.adresse || '') + '">'
    + '<span class="champ-erreur" hidden></span>'
    + '</div>'
    + '</div>'

    + '<div class="grille-form-2">'
    + '<div class="champ" data-champ="numAttestationCapacite">'
    + '<label for="ef-num-attestation">N° attestation de capacité *</label>'
    + '<input type="text" id="ef-num-attestation" name="numAttestationCapacite" maxlength="60" '
    + 'value="' + esc(e.numAttestationCapacite || '') + '">'
    + '<span class="champ-erreur" hidden></span>'
    + '</div>'

    + '<div class="champ" data-champ="organisme">'
    + '<label for="ef-organisme">Organisme certificateur *</label>'
    + '<input type="text" id="ef-organisme" name="organisme" maxlength="120" '
    + 'value="' + esc(e.organisme || '') + '">'
    + '<span class="champ-erreur" hidden></span>'
    + '</div>'
    + '</div>'

    + '<div class="grille-form-2">'
    + '<div class="champ" data-champ="dateDelivranceCapacite">'
    + '<label for="ef-date-delivrance">Date de délivrance</label>'
    + '<input type="date" id="ef-date-delivrance" name="dateDelivranceCapacite" '
    + 'value="' + esc(e.dateDelivranceCapacite || '') + '">'
    + '</div>'

    + '<div class="champ" data-champ="dateEcheanceCapacite">'
    + '<label for="ef-date-echeance">Date d’échéance *</label>'
    + '<input type="date" id="ef-date-echeance" name="dateEcheanceCapacite" '
    + 'value="' + esc(e.dateEcheanceCapacite || '') + '">'
    + '<span class="champ-erreur" hidden></span>'
    + '</div>'
    + '</div>'

    + '<div class="champ" data-champ="categoriesAutorisees">'
    + '<label>Catégories autorisées *</label>'
    + groupeCases('categoriesAutorisees', CATEGORIES, e.categoriesAutorisees)
    + '<span class="champ-erreur" hidden></span>'
    + '</div>'

    + '<div class="champ" data-champ="activitesAutorisees">'
    + '<label>Activités autorisées *</label>'
    + groupeCases('activitesAutorisees', ACTIVITES, e.activitesAutorisees)
    + '<span class="champ-erreur" hidden></span>'
    + '</div>'

    + '<div class="champ">'
    + '<label for="ef-pieces-jointes">Attestation de capacité (pièce jointe)</label>'
    + '<div id="ef-pieces-jointes"></div>'
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

/** Valide le formulaire ; retourne les valeurs ou null si invalide. */
function validerFormulaire(racine) {
  const form = racine.querySelector('#form-etablissement');
  const donnees = new FormData(form);
  let valide = true;

  ['raisonSociale', 'siret', 'adresse', 'numAttestationCapacite', 'organisme',
    'dateEcheanceCapacite', 'categoriesAutorisees', 'activitesAutorisees']
    .forEach(function (nom) { effacerErreur(racine, nom); });

  const raisonSociale = String(donnees.get('raisonSociale') || '').trim();
  if (!raisonSociale) {
    marquerErreur(racine, 'raisonSociale', 'La raison sociale est obligatoire.');
    valide = false;
  }

  const siret = String(donnees.get('siret') || '').trim();
  if (!siret) {
    marquerErreur(racine, 'siret', 'Le SIRET est obligatoire.');
    valide = false;
  }

  const adresse = String(donnees.get('adresse') || '').trim();
  if (!adresse) {
    marquerErreur(racine, 'adresse', 'L’adresse est obligatoire.');
    valide = false;
  }

  const numAttestationCapacite = String(donnees.get('numAttestationCapacite') || '').trim();
  if (!numAttestationCapacite) {
    marquerErreur(racine, 'numAttestationCapacite', 'Le n° d’attestation est obligatoire.');
    valide = false;
  }

  const organisme = String(donnees.get('organisme') || '').trim();
  if (!organisme) {
    marquerErreur(racine, 'organisme', 'L’organisme certificateur est obligatoire.');
    valide = false;
  }

  const dateEcheanceCapacite = String(donnees.get('dateEcheanceCapacite') || '').trim();
  if (!dateEcheanceCapacite) {
    marquerErreur(racine, 'dateEcheanceCapacite', 'La date d’échéance est obligatoire.');
    valide = false;
  }

  const categoriesAutorisees = donnees.getAll('categoriesAutorisees');
  if (categoriesAutorisees.length === 0) {
    marquerErreur(racine, 'categoriesAutorisees', 'Sélectionnez au moins une catégorie.');
    valide = false;
  }

  const activitesAutorisees = donnees.getAll('activitesAutorisees');
  if (activitesAutorisees.length === 0) {
    marquerErreur(racine, 'activitesAutorisees', 'Sélectionnez au moins une activité.');
    valide = false;
  }

  if (!valide) return null;

  const dateDelivranceCapacite = String(donnees.get('dateDelivranceCapacite') || '').trim();

  return {
    raisonSociale: raisonSociale,
    siret: siret,
    adresse: adresse,
    numAttestationCapacite: numAttestationCapacite,
    organisme: organisme,
    dateDelivranceCapacite: dateDelivranceCapacite || null,
    dateEcheanceCapacite: dateEcheanceCapacite,
    categoriesAutorisees: categoriesAutorisees,
    activitesAutorisees: activitesAutorisees
  };
}

/**
 * Ouvre la modale de modification du dossier opérateur (cadre 1).
 * @param {{ store: object, naviguer: (id: string) => void }} ctx
 * @returns {Promise<boolean>} résolue à la fermeture (true si enregistré)
 */
export async function ouvrirFormEtablissement(ctx) {
  const etablissement = await ctx.store.getEtablissement();
  let utilisateur = null;
  try {
    utilisateur = await ctx.store.getUtilisateurCourant();
  } catch {
    // Aucun utilisateur courant : la modale reste utilisable en dégradé
  }

  return new Promise(function (resoudre) {
    const { fermer, racine } = modale({
      titre: 'Modifier le dossier opérateur',
      contenuHtml: gabaritFormulaire(etablissement),
      actionsHtml:
        '<button type="button" id="ef-annuler" class="btn btn-secondaire">Annuler</button>'
        + '<button type="button" id="ef-enregistrer" class="btn btn-primaire">Enregistrer</button>'
    });
    const bandeauErreur = racine.querySelector('#bandeau-erreur-etab');

    // Zone pièces jointes (attestation de capacité de l'établissement)
    zonePiecesJointes(racine.querySelector('#ef-pieces-jointes'), ctx, {
      entiteType: 'ETABLISSEMENT',
      entiteId: 'etablissement',
      categorie: 'ATTESTATION_CAPACITE'
    });

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

    racine.querySelector('#ef-annuler').addEventListener('click', function () {
      fermer();
    });

    racine.querySelector('#ef-enregistrer').addEventListener('click', async function () {
      const valeurs = validerFormulaire(racine);
      if (!valeurs) return;

      const bouton = racine.querySelector('#ef-enregistrer');
      bouton.disabled = true;

      try {
        await ctx.store.updateEtablissement({
          ...valeurs,
          operateur: utilisateur?.id
        });
        toast('Dossier opérateur mis à jour.', 'succes');
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
