// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// inerWeb Fluide — vue « Premier lancement » (création du 1er ADMIN)
//
// Affichée UNE seule fois, au tout premier démarrage du Mode Local, quand
// aucun compte n'existe encore (route serveur /api/etatInitial → initialise:
// false). Remplace l'ancienne création CLI (fenêtre noire) : le prof crée son
// compte administrateur directement à l'écran, puis entre dans l'application.
//
// Comme la vue « Connexion », elle n'appartient PAS au routeur hash : app.js
// la monte directement dans #vue, hors navigation. Elle appelle le transport
// des comptes (routes hors contrat DataStore), jamais store.get*/create*.
//
// Sécurité : le serveur n'accepte /api/bootstrapAdmin que depuis le poste
// local (loopback strict) et seulement tant qu'aucun compte n'existe (cf.
// routes-comptes.js). Le front ne fait que présenter le formulaire ; toute la
// garde est côté serveur.
// ============================================================

import { ICONES } from '../core/icones.js';
import { esc } from '../core/utils.js';

export const titre = 'Premier lancement';

/** Longueur minimale du mot de passe ADMIN (miroir de routes-comptes.js). */
const LONGUEUR_MIN = 10;

/**
 * Construit l'écran de création du compte administrateur.
 * @param {HTMLElement} conteneur — élément où injecter l'écran.
 * @param {{
 *   transport: (methode: string, params: object) => Promise<any>,
 *   surCreation: (info: { role: string, utilisateur: object }) => void
 * }} options
 */
export function render(conteneur, { transport, surCreation }) {
  conteneur.innerHTML =
    '<div class="ecran-connexion">'
    + '<div class="carte-connexion">'
    + '<div class="connexion-pastille">' + ICONES.verrou + '</div>'
    + '<h2 class="connexion-titre">Bienvenue dans inerWeb Fluide</h2>'
    + '<p class="connexion-sous-titre">'
    + 'Premier lancement : créez le compte administrateur de cette '
    + 'installation. Il vous servira à vous connecter et à créer les '
    + 'comptes suivants.'
    + '</p>'
    + '<form class="formulaire" id="form-bootstrap" novalidate>'
    + '<div id="zone-erreur-bootstrap"></div>'
    + '<div class="champ">'
    + '<label for="champ-login">Identifiant</label>'
    + '<input type="text" id="champ-login" name="login" autocomplete="username" required autofocus>'
    + '</div>'
    + '<div class="champ">'
    + '<label for="champ-mot-de-passe">Mot de passe '
    + '<span class="champ-aide">(' + LONGUEUR_MIN + ' caractères minimum)</span></label>'
    + '<input type="password" id="champ-mot-de-passe" name="motDePasse" autocomplete="new-password" required>'
    + '</div>'
    + '<div class="champ">'
    + '<label for="champ-confirmation">Confirmez le mot de passe</label>'
    + '<input type="password" id="champ-confirmation" name="confirmation" autocomplete="new-password" required>'
    + '</div>'
    + '<button type="submit" class="btn btn-marine btn-bloc" id="bouton-bootstrap">'
    + ICONES.verrou + '<span>Créer le compte administrateur</span></button>'
    + '</form>'
    + '</div>'
    + '</div>';

  const form = conteneur.querySelector('#form-bootstrap');
  const zoneErreur = conteneur.querySelector('#zone-erreur-bootstrap');
  const champLogin = conteneur.querySelector('#champ-login');
  const champMotDePasse = conteneur.querySelector('#champ-mot-de-passe');
  const champConfirmation = conteneur.querySelector('#champ-confirmation');
  const bouton = conteneur.querySelector('#bouton-bootstrap');
  let enCours = false;

  function afficherErreur(message) {
    zoneErreur.innerHTML = '<div class="bandeau-erreur">' + ICONES.alerte
      + '<span>' + esc(message) + '</span></div>';
  }

  form.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    if (enCours) return;
    zoneErreur.innerHTML = '';

    const login = champLogin.value.trim();
    const motDePasse = champMotDePasse.value;
    const confirmation = champConfirmation.value;

    // Contrôles côté client (le serveur re-vérifie tout, mais autant donner un
    // retour immédiat plutôt qu'un aller-retour réseau).
    if (!login) {
      afficherErreur('Un identifiant est obligatoire.');
      champLogin.focus();
      return;
    }
    if (motDePasse.length < LONGUEUR_MIN) {
      afficherErreur('Le mot de passe doit comporter au moins '
        + LONGUEUR_MIN + ' caractères.');
      champMotDePasse.focus();
      return;
    }
    if (motDePasse !== confirmation) {
      afficherErreur('Les deux mots de passe ne correspondent pas.');
      champConfirmation.value = '';
      champConfirmation.focus();
      return;
    }

    enCours = true;
    bouton.disabled = true;
    try {
      const resultat = await transport('bootstrapAdmin', { login, motDePasse });
      champMotDePasse.value = '';
      champConfirmation.value = '';
      surCreation(resultat);
    } catch (erreur) {
      afficherErreur(erreur.message || 'La création du compte a échoué.');
      bouton.disabled = false;
      enCours = false;
    }
  });
}
