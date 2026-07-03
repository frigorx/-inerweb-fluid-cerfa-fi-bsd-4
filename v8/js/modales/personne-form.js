// ============================================================
// inerWeb Fluide — modale « Créer / Modifier une personne » (Phase C)
// Registre du personnel : nom, type de personne, rôle applicatif,
// attestation d'aptitude, catégories 2008/2025, activités
// autorisées. Un élève n'a pas de champs d'attestation (mode
// formation uniquement). Désactivation au lieu de suppression.
// Pièces jointes (attestation d'aptitude) visibles en édition.
// ============================================================

import { modale, toast, ICONES } from '../views/communs.js';
import { esc } from '../core/utils.js';
import { zonePiecesJointes } from '../composants/pieces-jointes.js';

// Types de personne proposés au choix (contrat Phase C)
const TYPES_PERSONNE = [
  { valeur: 'ENSEIGNANT', libelle: 'Enseignant' },
  { valeur: 'ELEVE', libelle: 'Élève' },
  { valeur: 'SALARIE', libelle: 'Salarié' },
  { valeur: 'SOUS_TRAITANT', libelle: 'Sous-traitant' },
  { valeur: 'INTERVENANT_EXT', libelle: 'Intervenant extérieur' }
];

// Rôles applicatifs proposés au choix
const ROLES_APP = [
  { valeur: 'ELEVE', libelle: 'Élève (voir / saisir en formation)' },
  { valeur: 'ENSEIGNANT', libelle: 'Enseignant' },
  { valeur: 'REFERENT', libelle: 'Référent' },
  { valeur: 'ADMIN', libelle: 'Administrateur' }
];

// Catégories d'attestation (grilles 2008 et 2025)
const CATEGORIES = ['I', 'II', 'III', 'IV'];

// Activités réglementées (attestation de capacité et d'aptitude)
const ACTIVITES = [
  { valeur: 'MISE_EN_SERVICE', libelle: 'Mise en service' },
  { valeur: 'MAINTENANCE', libelle: 'Maintenance' },
  { valeur: 'CONTROLE', libelle: 'Contrôle' },
  { valeur: 'RECUPERATION', libelle: 'Récupération' },
  { valeur: 'DEMANTELEMENT', libelle: 'Démantèlement' }
];

/**
 * Construit les <option> d'un select depuis une liste { valeur, libelle }.
 * @param {{valeur: string, libelle: string}[]} options
 * @param {string} valeurCourante
 * @param {boolean} [avecVide=false] — ajoute une option vide en tête
 * @returns {string} HTML
 */
function optionsHtml(options, valeurCourante, avecVide = false) {
  const vide = avecVide ? '<option value="">— Sélectionner —</option>' : '';
  return vide + options.map(function (opt) {
    const selectionne = opt.valeur === valeurCourante ? ' selected' : '';
    return '<option value="' + esc(opt.valeur) + '"' + selectionne + '>'
      + esc(opt.libelle) + '</option>';
  }).join('');
}

/**
 * Construit le HTML du formulaire.
 * @param {object} personne — valeurs courantes (vide en création)
 * @param {boolean} enModification
 * @returns {string} HTML
 */
function gabaritFormulaire(personne, enModification) {
  const activitesCourantes = personne.activitesAutorisees || [];
  const estEleve = personne.typePersonne === 'ELEVE';

  const casesActivites = ACTIVITES.map(function (act) {
    const coche = activitesCourantes.includes(act.valeur) ? ' checked' : '';
    return '<label class="case-activite">'
      + '<input type="checkbox" name="activitesAutorisees" value="' + esc(act.valeur) + '"' + coche + '>'
      + '<span>' + esc(act.libelle) + '</span>'
      + '</label>';
  }).join('');

  return '<style>'
    + '.grille-activites { display: flex; flex-wrap: wrap; gap: 8px 18px; margin-top: 2px; }'
    + '.case-activite { display: flex; align-items: center; gap: 7px; '
    + 'font-size: 13px; font-weight: 500; color: var(--texte-2); cursor: pointer; text-transform: none; letter-spacing: normal; }'
    + '.case-activite input { width: 16px; height: 16px; }'
    + '#pf-bandeau-eleve { margin-bottom: 4px; }'
    + '</style>'

    + '<form id="form-personne" class="formulaire" novalidate>'

    + '<div id="bandeau-erreur-personne" class="bandeau-erreur" hidden></div>'

    + '<div class="grille-form-2">'
    + '<div class="champ" data-champ="prenom">'
    + '<label for="pf-prenom">Prénom *</label>'
    + '<input type="text" id="pf-prenom" name="prenom" maxlength="80" '
    + 'value="' + esc(personne.prenom || '') + '">'
    + '<span class="champ-erreur" hidden></span>'
    + '</div>'

    + '<div class="champ" data-champ="nom">'
    + '<label for="pf-nom">Nom *</label>'
    + '<input type="text" id="pf-nom" name="nom" maxlength="80" '
    + 'value="' + esc(personne.nom || '') + '">'
    + '<span class="champ-erreur" hidden></span>'
    + '</div>'
    + '</div>'

    + '<div class="grille-form-2">'
    + '<div class="champ" data-champ="typePersonne">'
    + '<label for="pf-type-personne">Type de personne *</label>'
    + '<select id="pf-type-personne" name="typePersonne">'
    + optionsHtml(TYPES_PERSONNE, personne.typePersonne || '', true)
    + '</select>'
    + '<span class="champ-erreur" hidden></span>'
    + '</div>'

    + '<div class="champ" data-champ="roleApp">'
    + '<label for="pf-role-app">Rôle applicatif *</label>'
    + '<select id="pf-role-app" name="roleApp">'
    + optionsHtml(ROLES_APP, personne.roleApp || '', true)
    + '</select>'
    + '<span class="champ-erreur" hidden></span>'
    + '</div>'
    + '</div>'

    + '<div class="champ" data-champ="email">'
    + '<label for="pf-email">Courriel</label>'
    + '<input type="email" id="pf-email" name="email" maxlength="160" '
    + 'value="' + esc(personne.email || '') + '">'
    + '</div>'

    + '<div id="pf-bandeau-eleve" class="bandeau-avertissement" '
    + (estEleve ? '' : 'hidden') + '>'
    + ICONES.alerte
    + '<span>Élève : mode formation uniquement, jamais opérateur officiel autonome.</span>'
    + '</div>'

    + '<div id="pf-bloc-attestation"' + (estEleve ? ' hidden' : '') + '>'

    + '<div class="champ" data-champ="numAttestationAptitude">'
    + '<label for="pf-num-aptitude">N° attestation d’aptitude</label>'
    + '<input type="text" id="pf-num-aptitude" name="numAttestationAptitude" maxlength="60" '
    + 'value="' + esc(personne.numAttestationAptitude || '') + '">'
    + '</div>'

    + '<div class="champ" data-champ="organismeDelivreur">'
    + '<label for="pf-organisme">Organisme délivreur</label>'
    + '<input type="text" id="pf-organisme" name="organismeDelivreur" maxlength="120" '
    + 'value="' + esc(personne.organismeDelivreur || '') + '">'
    + '</div>'

    + '<div class="grille-form-2">'
    + '<div class="champ" data-champ="dateObtention">'
    + '<label for="pf-date-obtention">Date d’obtention</label>'
    + '<input type="date" id="pf-date-obtention" name="dateObtention" '
    + 'value="' + esc(personne.dateObtention || '') + '">'
    + '</div>'

    + '<div class="champ" data-champ="dateFinValidite">'
    + '<label for="pf-date-fin">Date limite de validité</label>'
    + '<input type="date" id="pf-date-fin" name="dateFinValidite" '
    + 'value="' + esc(personne.dateFinValidite || '') + '">'
    + '</div>'
    + '</div>'

    + '<div class="encart-aide">'
    + 'Catégorie 2008 : valable jusqu’au 31/12/2026 · '
    + 'Catégorie 2025 : obligatoire à partir du 01/01/2027.'
    + '</div>'

    + '<div class="grille-form-2">'
    + '<div class="champ" data-champ="categorie2008">'
    + '<label for="pf-cat-2008">Catégorie 2008</label>'
    + '<select id="pf-cat-2008" name="categorie2008">'
    + '<option value="">— Aucune —</option>'
    + optionsHtml(CATEGORIES.map(function (c) { return { valeur: c, libelle: c }; }),
        personne.categorie2008 || '')
    + '</select>'
    + '</div>'

    + '<div class="champ" data-champ="categorie2025">'
    + '<label for="pf-cat-2025">Catégorie 2025</label>'
    + '<select id="pf-cat-2025" name="categorie2025">'
    + '<option value="">— Aucune —</option>'
    + optionsHtml(CATEGORIES.map(function (c) { return { valeur: c, libelle: c }; }),
        personne.categorie2025 || '')
    + '</select>'
    + '</div>'
    + '</div>'

    + '<div class="champ">'
    + '<label>Activités autorisées</label>'
    + '<div class="grille-activites">' + casesActivites + '</div>'
    + '</div>'

    + (enModification ? '<div class="champ">'
      + '<label>Pièce jointe — attestation d’aptitude</label>'
      + '<div id="pf-zone-pj"></div>'
      + '</div>' : '')

    + '</div>' // fin #pf-bloc-attestation

    + '</form>';
}

/**
 * Affiche un message d'erreur sous un champ et marque le conteneur invalide.
 * @param {HTMLElement} racine
 * @param {string} nomChamp
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
 * Valide le formulaire en direct. Retourne les valeurs si tout est correct,
 * sinon affiche les erreurs de champ et retourne null.
 * @param {HTMLElement} racine
 * @returns {object|null}
 */
function validerFormulaire(racine) {
  const form = racine.querySelector('#form-personne');
  const donnees = new FormData(form);
  let valide = true;

  ['prenom', 'nom', 'typePersonne', 'roleApp'].forEach(function (nom) {
    effacerErreur(racine, nom);
  });

  const prenom = String(donnees.get('prenom') || '').trim();
  if (!prenom) {
    marquerErreur(racine, 'prenom', 'Le prénom est obligatoire.');
    valide = false;
  }

  const nom = String(donnees.get('nom') || '').trim();
  if (!nom) {
    marquerErreur(racine, 'nom', 'Le nom est obligatoire.');
    valide = false;
  }

  const typePersonne = String(donnees.get('typePersonne') || '').trim();
  if (!typePersonne) {
    marquerErreur(racine, 'typePersonne', 'Le type de personne est obligatoire.');
    valide = false;
  }

  const roleApp = String(donnees.get('roleApp') || '').trim();
  if (!roleApp) {
    marquerErreur(racine, 'roleApp', 'Le rôle applicatif est obligatoire.');
    valide = false;
  }

  if (!valide) return null;

  const estEleve = typePersonne === 'ELEVE';
  const email = String(donnees.get('email') || '').trim();
  const activitesAutorisees = estEleve ? [] : donnees.getAll('activitesAutorisees');

  return {
    prenom: prenom,
    nom: nom,
    typePersonne: typePersonne,
    roleApp: roleApp,
    email: email || null,
    numAttestationAptitude: estEleve ? null
      : (String(donnees.get('numAttestationAptitude') || '').trim() || null),
    organismeDelivreur: estEleve ? null
      : (String(donnees.get('organismeDelivreur') || '').trim() || null),
    dateObtention: estEleve ? null
      : (String(donnees.get('dateObtention') || '').trim() || null),
    dateFinValidite: estEleve ? null
      : (String(donnees.get('dateFinValidite') || '').trim() || null),
    categorie2008: estEleve ? null
      : (String(donnees.get('categorie2008') || '').trim() || null),
    categorie2025: estEleve ? null
      : (String(donnees.get('categorie2025') || '').trim() || null),
    activitesAutorisees: activitesAutorisees
  };
}

/**
 * Ouvre la modale de création ou de modification d'une personne.
 * @param {{ store: object, naviguer: (id: string) => void }} ctx
 * @param {string|null} [personneId=null] — identifiant à modifier, ou null pour créer
 * @returns {Promise<boolean>} résolue à la fermeture de la modale (true si enregistré)
 */
export async function ouvrirFormPersonne(ctx, personneId = null) {
  const enModification = Boolean(personneId);

  const personnel = enModification ? await ctx.store.getPersonnel() : [];
  const personneExistante = enModification
    ? personnel.find(function (p) { return p.id === personneId; })
    : null;

  if (enModification && !personneExistante) {
    toast('Personne introuvable : impossible de la modifier.', 'erreur');
    return false;
  }

  const valeursInitiales = personneExistante || {};
  const utilisateur = await ctx.store.getUtilisateurCourant();

  return new Promise(function (resoudre) {
    const { fermer } = modale({
      titre: enModification ? 'Modifier la personne' : 'Ajouter une personne',
      contenuHtml: gabaritFormulaire(valeursInitiales, enModification),
      actionsHtml:
        (enModification
          ? '<button type="button" id="pf-desactiver" class="btn btn-danger-contour">Désactiver</button>'
          : '')
        + '<button type="button" id="pf-annuler" class="btn btn-secondaire">Annuler</button>'
        + '<button type="button" id="pf-enregistrer" class="btn btn-primaire">Enregistrer</button>'
    });

    const racine = document.querySelector('.modale-fond:last-of-type .modale')
      || document.querySelector('.modale');
    const bandeauErreur = racine.querySelector('#bandeau-erreur-personne');
    const selectTypePersonne = racine.querySelector('#pf-type-personne');
    const bandeauEleve = racine.querySelector('#pf-bandeau-eleve');
    const blocAttestation = racine.querySelector('#pf-bloc-attestation');

    // Zone pièces jointes (attestation d'aptitude), édition seulement
    const zonePj = racine.querySelector('#pf-zone-pj');
    if (zonePj && enModification) {
      zonePiecesJointes(zonePj, ctx, {
        entiteType: 'personne',
        entiteId: personneId,
        categorie: 'ATTESTATION_APTITUDE'
      });
    }

    function masquerBandeau() {
      bandeauErreur.hidden = true;
      bandeauErreur.textContent = '';
    }

    function afficherBandeau(message) {
      bandeauErreur.textContent = message;
      bandeauErreur.hidden = false;
    }

    /** Affiche ou masque les champs d'attestation selon le type de personne. */
    function ajusterAffichagePourType() {
      const estEleve = selectTypePersonne.value === 'ELEVE';
      bandeauEleve.hidden = !estEleve;
      blocAttestation.hidden = estEleve;
    }

    selectTypePersonne.addEventListener('change', ajusterAffichagePourType);

    // Validation en direct à la saisie / au changement
    ['pf-prenom', 'pf-nom', 'pf-type-personne', 'pf-role-app'].forEach(function (id) {
      const champ = racine.querySelector('#' + id);
      if (champ) {
        champ.addEventListener('input', function () { validerFormulaire(racine); masquerBandeau(); });
        champ.addEventListener('change', function () { validerFormulaire(racine); masquerBandeau(); });
      }
    });

    let fermeeParEnregistrement = false;

    racine.querySelector('#pf-annuler').addEventListener('click', function () {
      fermer();
    });

    const boutonDesactiver = racine.querySelector('#pf-desactiver');
    if (boutonDesactiver) {
      boutonDesactiver.addEventListener('click', async function () {
        const confirmation = window.confirm(
          'Désactiver ' + valeursInitiales.prenom + ' ' + valeursInitiales.nom + ' ?\n'
          + 'La personne restera au registre (aucune suppression) mais ne pourra plus '
          + 'être choisie comme opérateur ou validateur.');
        if (!confirmation) return;

        boutonDesactiver.disabled = true;
        try {
          await ctx.store.desactiverPersonne(personneId, utilisateur.id);
          toast('Personne désactivée.', 'succes');
          fermeeParEnregistrement = true;
          fermer();
        } catch (erreur) {
          afficherBandeau(erreur && erreur.message ? erreur.message : 'Désactivation impossible.');
          boutonDesactiver.disabled = false;
        }
      });
    }

    racine.querySelector('#pf-enregistrer').addEventListener('click', async function () {
      const valeurs = validerFormulaire(racine);
      if (!valeurs) return;

      const bouton = racine.querySelector('#pf-enregistrer');
      bouton.disabled = true;

      try {
        if (enModification) {
          await ctx.store.updatePersonne(personneId, {
            ...valeurs,
            operateur: utilisateur.id
          });
          toast('Personne modifiée.', 'succes');
        } else {
          await ctx.store.createPersonne({
            ...valeurs,
            operateur: utilisateur.id
          });
          toast('Personne ajoutée.', 'succes');
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
