// ============================================================
// inerWeb Fluide — modale « Créer / Modifier un outil » (Phase C)
// Formulaire de saisie conforme charte (.formulaire / .champ /
// .grille-form-2), champs conditionnels (précision pour une
// balance, sensibilité pour un détecteur), pièces jointes
// (certificat d'étalonnage) en édition. Appel au store.
// ============================================================

import { modale, toast } from '../views/communs.js';
import { esc } from '../core/utils.js';
import { zonePiecesJointes } from '../composants/pieces-jointes.js';
import { LIBELLES_TYPE_OUTIL } from '../views/outillage.js';

/**
 * Construit les <option> d'un select « type d'outil ».
 * @param {string} valeurCourante
 * @returns {string} HTML
 */
function optionsTypeOutil(valeurCourante) {
  return Object.keys(LIBELLES_TYPE_OUTIL).map(function (code) {
    const selectionne = code === valeurCourante ? ' selected' : '';
    return '<option value="' + esc(code) + '"' + selectionne + '>'
      + esc(LIBELLES_TYPE_OUTIL[code]) + '</option>';
  }).join('');
}

/**
 * Construit le HTML du formulaire (mêmes valeurs qu'à l'ouverture ;
 * les erreurs de champ sont ajoutées/retirées dynamiquement ensuite).
 * @param {object} outil — valeurs courantes (vide en création)
 * @returns {string} HTML
 */
function gabaritFormulaire(outil) {
  return '<form id="form-outil" class="formulaire" novalidate>'

    + '<div id="bandeau-erreur-outil" class="bandeau-erreur" hidden></div>'

    + '<div class="grille-form-2">'
    + '<div class="champ" data-champ="typeOutil">'
    + '<label for="of-type">Type d’outil *</label>'
    + '<select id="of-type" name="typeOutil">'
    + '<option value="">— Sélectionner —</option>'
    + optionsTypeOutil(outil.typeOutil || '')
    + '</select>'
    + '<span class="champ-erreur" hidden></span>'
    + '</div>'

    + '<div class="champ" data-champ="siteAtelier">'
    + '<label for="of-site">Site / atelier</label>'
    + '<input type="text" id="of-site" name="siteAtelier" maxlength="120" '
    + 'value="' + esc(outil.siteAtelier || '') + '" placeholder="Ex. Atelier froid — poste 2">'
    + '</div>'
    + '</div>'

    + '<div class="grille-form-2">'
    + '<div class="champ" data-champ="marque">'
    + '<label for="of-marque">Marque *</label>'
    + '<input type="text" id="of-marque" name="marque" maxlength="80" '
    + 'value="' + esc(outil.marque || '') + '">'
    + '<span class="champ-erreur" hidden></span>'
    + '</div>'

    + '<div class="champ" data-champ="modele">'
    + '<label for="of-modele">Modèle</label>'
    + '<input type="text" id="of-modele" name="modele" maxlength="80" '
    + 'value="' + esc(outil.modele || '') + '">'
    + '</div>'
    + '</div>'

    + '<div class="champ" data-champ="numSerie">'
    + '<label for="of-num-serie">N° de série</label>'
    + '<input type="text" id="of-num-serie" name="numSerie" maxlength="80" '
    + 'value="' + esc(outil.numSerie || '') + '">'
    + '</div>'

    + '<div class="grille-form-2">'
    + '<div class="champ" data-champ="precision" data-visible-pour="BALANCE" hidden>'
    + '<label for="of-precision">Précision</label>'
    + '<input type="text" id="of-precision" name="precision" maxlength="40" '
    + 'value="' + esc(outil.precision || '') + '" placeholder="Ex. ± 1 g">'
    + '</div>'

    + '<div class="champ" data-champ="sensibilite" data-visible-pour="DETECTEUR" hidden>'
    + '<label for="of-sensibilite">Sensibilité</label>'
    + '<input type="text" id="of-sensibilite" name="sensibilite" maxlength="40" '
    + 'value="' + esc(outil.sensibilite || '') + '" placeholder="Ex. 4 g/an">'
    + '</div>'
    + '</div>'

    + '<div class="grille-form-2">'
    + '<div class="champ" data-champ="dateVerification">'
    + '<label for="of-date-verif">Vérifié / étalonné le</label>'
    + '<input type="date" id="of-date-verif" name="dateVerification" '
    + 'value="' + esc(outil.dateVerification || outil.dateEtalonnage || '') + '">'
    + '</div>'

    + '<div class="champ" data-champ="prochaineEcheance">'
    + '<label for="of-echeance">Prochaine échéance</label>'
    + '<input type="date" id="of-echeance" name="prochaineEcheance" '
    + 'value="' + esc(outil.prochaineEcheance || '') + '">'
    + '</div>'
    + '</div>'

    + '<div class="champ" id="of-zone-pieces-jointes"></div>'

    + '</form>';
}

/**
 * Affiche un message d'erreur sous un champ et marque le conteneur invalide.
 * @param {HTMLElement} racine — racine du formulaire
 * @param {string} nomChamp — clé data-champ
 * @param {string} message
 */
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

/**
 * Efface l'erreur d'un champ (saisie corrigée).
 * @param {HTMLElement} racine
 * @param {string} nomChamp
 */
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
 * Affiche uniquement les champs conditionnels correspondant au type
 * d'outil choisi (précision pour une balance, sensibilité pour un
 * détecteur).
 * @param {HTMLElement} racine
 * @param {string} typeOutil
 */
function mettreAJourChampsConditionnels(racine, typeOutil) {
  racine.querySelectorAll('[data-visible-pour]').forEach(function (champ) {
    champ.hidden = champ.dataset.visiblePour !== typeOutil;
  });
}

/**
 * Valide le formulaire en direct. Retourne les valeurs si tout est correct,
 * sinon affiche les erreurs de champ et retourne null.
 * @param {HTMLElement} racine
 * @returns {object|null}
 */
function validerFormulaire(racine) {
  const form = racine.querySelector('#form-outil');
  const donnees = new FormData(form);
  let valide = true;

  ['typeOutil', 'marque'].forEach(function (nom) {
    effacerErreur(racine, nom);
  });

  const typeOutil = String(donnees.get('typeOutil') || '').trim();
  if (!typeOutil) {
    marquerErreur(racine, 'typeOutil', 'Le type d’outil est obligatoire.');
    valide = false;
  }

  const marque = String(donnees.get('marque') || '').trim();
  if (!marque) {
    marquerErreur(racine, 'marque', 'La marque est obligatoire.');
    valide = false;
  }

  if (!valide) return null;

  const modele = String(donnees.get('modele') || '').trim();
  const numSerie = String(donnees.get('numSerie') || '').trim();
  const siteAtelier = String(donnees.get('siteAtelier') || '').trim();
  const precision = String(donnees.get('precision') || '').trim();
  const sensibilite = String(donnees.get('sensibilite') || '').trim();
  const dateVerification = String(donnees.get('dateVerification') || '').trim();
  const prochaineEcheance = String(donnees.get('prochaineEcheance') || '').trim();

  return {
    typeOutil: typeOutil,
    marque: marque,
    modele: modele || null,
    numSerie: numSerie || null,
    siteAtelier: siteAtelier || null,
    // Champs propres au type choisi seulement (évite de garder une valeur
    // orpheline si l'on change le type d'outil après saisie)
    precision: typeOutil === 'BALANCE' ? (precision || null) : null,
    sensibilite: typeOutil === 'DETECTEUR' ? (sensibilite || null) : null,
    dateVerification: dateVerification || null,
    dateEtalonnage: dateVerification || null,
    prochaineEcheance: prochaineEcheance || null
  };
}

/**
 * Ouvre la modale de création ou de modification d'un outil.
 * @param {{ store: object, naviguer: (id: string) => void }} ctx
 * @param {string|null} [outilId=null] — identifiant à modifier, ou null pour créer
 * @returns {Promise<boolean>} vrai si l'enregistrement a réussi
 */
export async function ouvrirFormOutil(ctx, outilId = null) {
  const enModification = Boolean(outilId);

  const [outillage, utilisateur] = await Promise.all([
    enModification ? ctx.store.getOutillage() : Promise.resolve([]),
    ctx.store.getUtilisateurCourant()
  ]);

  const outilExistant = enModification
    ? outillage.find(function (o) { return o.id === outilId; })
    : null;

  if (enModification && !outilExistant) {
    toast('Outil introuvable : impossible de le modifier.', 'erreur');
    return false;
  }

  const valeursInitiales = outilExistant || {};

  return new Promise(function (resoudre) {
    const { fermer, racine } = modale({
      titre: enModification ? 'Modifier l’outil' : 'Ajouter un outil',
      contenuHtml: gabaritFormulaire(valeursInitiales),
      actionsHtml:
        '<button type="button" id="of-annuler" class="btn btn-secondaire">Annuler</button>'
        + '<button type="button" id="of-enregistrer" class="btn btn-primaire">Enregistrer</button>'
    });
    const bandeauErreur = racine.querySelector('#bandeau-erreur-outil');
    const selectType = racine.querySelector('#of-type');

    // Pièces jointes (certificat d'étalonnage) : uniquement en édition,
    // une fois l'outil créé et son identifiant connu.
    if (enModification) {
      zonePiecesJointes(racine.querySelector('#of-zone-pieces-jointes'), ctx, {
        entiteType: 'OUTIL',
        entiteId: outilId,
        categorie: 'CERTIFICAT_ETALONNAGE'
      });
    } else {
      racine.querySelector('#of-zone-pieces-jointes').hidden = true;
    }

    function masquerBandeau() {
      bandeauErreur.hidden = true;
      bandeauErreur.textContent = '';
    }

    function afficherBandeau(message) {
      bandeauErreur.textContent = message;
      bandeauErreur.hidden = false;
    }

    mettreAJourChampsConditionnels(racine, selectType.value);
    selectType.addEventListener('change', function () {
      mettreAJourChampsConditionnels(racine, selectType.value);
    });

    // Validation en direct à la saisie / au changement
    ['of-type', 'of-marque'].forEach(function (id) {
      const champ = racine.querySelector('#' + id);
      if (champ) {
        champ.addEventListener('input', function () { validerFormulaire(racine); masquerBandeau(); });
        champ.addEventListener('change', function () { validerFormulaire(racine); masquerBandeau(); });
      }
    });

    let fermeeParEnregistrement = false;

    racine.querySelector('#of-annuler').addEventListener('click', function () {
      fermer();
    });

    racine.querySelector('#of-enregistrer').addEventListener('click', async function () {
      const valeurs = validerFormulaire(racine);
      if (!valeurs) return;

      const bouton = racine.querySelector('#of-enregistrer');
      bouton.disabled = true;

      try {
        if (enModification) {
          await ctx.store.updateOutil(outilId, {
            ...valeurs,
            operateur: utilisateur.id
          });
          toast('Outil modifié.', 'succes');
        } else {
          await ctx.store.createOutil({
            ...valeurs,
            operateur: utilisateur.id
          });
          toast('Outil ajouté.', 'succes');
        }
        fermeeParEnregistrement = true;
        fermer();
      } catch (erreur) {
        afficherBandeau(erreur && erreur.message ? erreur.message : 'Enregistrement impossible.');
        bouton.disabled = false;
      }
    });

    // La modale se ferme aussi via la croix / le fond / Échap :
    // on résout la promesse dans tous les cas en observant la disparition du fond.
    // subtree obligatoire : le fond vit dans #zone-modales, pas directement sous body.
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
