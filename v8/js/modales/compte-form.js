// ============================================================
// inerWeb Fluide — modale « Comptes de connexion » (V9, gestion des comptes)
//
// Deux usages, Mode Local uniquement (les comptes n'existent pas en Démo) :
//   - ouvrirCreationCompte(transport)            → créer un compte
//   - ouvrirReinitialisationMotDePasse(transport, compte) → nouveau mot de passe
//
// `transport` est le transport des routes de compte (creerTransportHttp) :
// ces routes sont HORS du contrat DataStore (cf. routes-comptes.js), le store
// ne les expose pas. Le serveur re-valide tout (garde ADMIN, longueurs, unicité).
// ============================================================

import { modale, toast } from '../views/communs.js';
import { esc } from '../core/utils.js';

/** Rôles proposés + longueur minimale du mot de passe (miroir routes-comptes.js). */
const ROLES = [
  { valeur: 'REFERENT', libelle: 'Référent (chef d’atelier)', min: 10 },
  { valeur: 'ENSEIGNANT', libelle: 'Enseignant', min: 8 },
  { valeur: 'ELEVE', libelle: 'Élève', min: 8 },
  { valeur: 'ADMIN', libelle: 'Administrateur', min: 10 },
];

/** Longueur minimale d'un mot de passe pour un rôle donné. */
function longueurMin(role) {
  const trouve = ROLES.find((r) => r.valeur === role);
  return trouve ? trouve.min : 8;
}

/**
 * Attend la fermeture de la modale et résout la promesse avec le drapeau
 * « une action a réussi » (déclenche un rafraîchissement chez l'appelant).
 */
function surFermeture(racine, drapeau, resoudre) {
  const fondModale = racine.closest('.modale-fond');
  const observateur = new MutationObserver(() => {
    if (!document.body.contains(fondModale)) {
      observateur.disconnect();
      resoudre(drapeau.valeur);
    }
  });
  observateur.observe(document.body, { childList: true, subtree: true });
}

/**
 * Ouvre la modale de création d'un compte de connexion.
 * @param {(methode: string, params: object) => Promise<any>} transport
 * @returns {Promise<boolean>} true si un compte a été créé
 */
export function ouvrirCreationCompte(transport) {
  const optionsRoles = ROLES.map((r) =>
    '<option value="' + r.valeur + '">' + esc(r.libelle) + '</option>').join('');

  const contenuHtml =
    '<form id="form-compte" class="formulaire" novalidate>'
    + '<div id="cc-bandeau-erreur" class="bandeau-erreur" hidden></div>'
    + '<div class="champ">'
    + '<label for="cc-login">Identifiant de connexion *</label>'
    + '<input type="text" id="cc-login" name="login" maxlength="60" '
    + 'autocomplete="username" placeholder="Ex. m.dupont">'
    + '</div>'
    + '<div class="champ">'
    + '<label for="cc-role">Rôle *</label>'
    + '<select id="cc-role" name="role">' + optionsRoles + '</select>'
    + '</div>'
    + '<div class="champ">'
    + '<label for="cc-mdp">Mot de passe * '
    + '<span class="champ-aide" id="cc-aide-mdp">(10 caractères minimum)</span></label>'
    + '<input type="password" id="cc-mdp" name="motDePasse" autocomplete="new-password">'
    + '</div>'
    + '<div class="champ">'
    + '<label for="cc-confirmation">Confirmez le mot de passe *</label>'
    + '<input type="password" id="cc-confirmation" name="confirmation" autocomplete="new-password">'
    + '</div>'
    + '</form>';

  return new Promise((resoudre) => {
    const drapeau = { valeur: false };
    const { fermer, racine } = modale({
      titre: 'Créer un compte de connexion',
      contenuHtml,
      actionsHtml:
        '<button type="button" id="cc-annuler" class="btn btn-secondaire">Annuler</button>'
        + '<button type="button" id="cc-creer" class="btn btn-primaire">Créer le compte</button>'
    });

    const bandeau = racine.querySelector('#cc-bandeau-erreur');
    const champRole = racine.querySelector('#cc-role');
    const aideMdp = racine.querySelector('#cc-aide-mdp');

    function majAide() {
      aideMdp.textContent = '(' + longueurMin(champRole.value) + ' caractères minimum)';
    }
    champRole.addEventListener('change', majAide);

    function afficherErreur(message) {
      bandeau.textContent = message;
      bandeau.hidden = false;
    }
    racine.querySelectorAll('input, select').forEach((c) =>
      c.addEventListener('input', () => { bandeau.hidden = true; }));

    racine.querySelector('#cc-annuler').addEventListener('click', () => fermer());

    racine.querySelector('#cc-creer').addEventListener('click', async () => {
      const login = racine.querySelector('#cc-login').value.trim();
      const role = champRole.value;
      const motDePasse = racine.querySelector('#cc-mdp').value;
      const confirmation = racine.querySelector('#cc-confirmation').value;

      if (!login) { afficherErreur('Un identifiant est obligatoire.'); return; }
      if (motDePasse.length < longueurMin(role)) {
        afficherErreur('Mot de passe trop court : ' + longueurMin(role)
          + ' caractères minimum pour ce rôle.');
        return;
      }
      if (motDePasse !== confirmation) {
        afficherErreur('Les deux mots de passe ne correspondent pas.');
        return;
      }

      const bouton = racine.querySelector('#cc-creer');
      bouton.disabled = true;
      try {
        await transport('creerCompte',
          { login, motDePasseInitial: motDePasse, role });
        toast('Compte « ' + login + ' » créé.', 'succes');
        drapeau.valeur = true;
        fermer();
      } catch (erreur) {
        afficherErreur(erreur && erreur.message ? erreur.message : 'Création impossible.');
        bouton.disabled = false;
      }
    });

    surFermeture(racine, drapeau, resoudre);
  });
}

/**
 * Ouvre la modale de réinitialisation du mot de passe d'un compte existant.
 * @param {(methode: string, params: object) => Promise<any>} transport
 * @param {{id: string, login: string, role: string}} compte
 * @returns {Promise<boolean>} true si le mot de passe a été réinitialisé
 */
export function ouvrirReinitialisationMotDePasse(transport, compte) {
  const min = longueurMin(compte.role);
  const contenuHtml =
    '<form id="form-reinit" class="formulaire" novalidate>'
    + '<div id="cr-bandeau-erreur" class="bandeau-erreur" hidden></div>'
    + '<p class="texte-doux">Nouveau mot de passe pour <strong>'
    + esc(compte.login) + '</strong> (' + esc(compte.role) + '). '
    + 'Les sessions ouvertes de ce compte seront fermées.</p>'
    + '<div class="champ">'
    + '<label for="cr-mdp">Nouveau mot de passe * '
    + '<span class="champ-aide">(' + min + ' caractères minimum)</span></label>'
    + '<input type="password" id="cr-mdp" name="motDePasse" autocomplete="new-password">'
    + '</div>'
    + '<div class="champ">'
    + '<label for="cr-confirmation">Confirmez le mot de passe *</label>'
    + '<input type="password" id="cr-confirmation" name="confirmation" autocomplete="new-password">'
    + '</div>'
    + '</form>';

  return new Promise((resoudre) => {
    const drapeau = { valeur: false };
    const { fermer, racine } = modale({
      titre: 'Réinitialiser le mot de passe',
      contenuHtml,
      actionsHtml:
        '<button type="button" id="cr-annuler" class="btn btn-secondaire">Annuler</button>'
        + '<button type="button" id="cr-valider" class="btn btn-primaire">Réinitialiser</button>'
    });

    const bandeau = racine.querySelector('#cr-bandeau-erreur');
    function afficherErreur(message) {
      bandeau.textContent = message;
      bandeau.hidden = false;
    }
    racine.querySelectorAll('input').forEach((c) =>
      c.addEventListener('input', () => { bandeau.hidden = true; }));

    racine.querySelector('#cr-annuler').addEventListener('click', () => fermer());

    racine.querySelector('#cr-valider').addEventListener('click', async () => {
      const motDePasse = racine.querySelector('#cr-mdp').value;
      const confirmation = racine.querySelector('#cr-confirmation').value;
      if (motDePasse.length < min) {
        afficherErreur('Mot de passe trop court : ' + min + ' caractères minimum.');
        return;
      }
      if (motDePasse !== confirmation) {
        afficherErreur('Les deux mots de passe ne correspondent pas.');
        return;
      }
      const bouton = racine.querySelector('#cr-valider');
      bouton.disabled = true;
      try {
        await transport('reinitialiserMotDePasse',
          { id: compte.id, nouveauMotDePasse: motDePasse });
        toast('Mot de passe de « ' + compte.login + ' » réinitialisé.', 'succes');
        drapeau.valeur = true;
        fermer();
      } catch (erreur) {
        afficherErreur(erreur && erreur.message ? erreur.message : 'Réinitialisation impossible.');
        bouton.disabled = false;
      }
    });

    surFermeture(racine, drapeau, resoudre);
  });
}
