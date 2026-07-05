// ============================================================
// inerWeb Fluide — vue « Connexion » (V9-E5, vague 5)
//
// Écran sobre affiché quand aucune session valide n'est active (première
// visite, session expirée après 8 h, ou retour depuis /api/deconnexion).
// N'appartient PAS au routeur hash normal (elle n'est jamais dans VUES,
// jamais atteignable par '#/connexion') : c'est app.js qui la monte
// directement dans #vue, hors navigation, pour ne jamais boucler avec
// l'écran qu'elle protège.
//
// Appelle directement le transport (via store.transport), PAS via
// store.get*/create* : connexion/déconnexion sont hors du contrat
// DataStore (cf. routes-comptes.js), le store ne les expose pas.
// ============================================================

import { ICONES } from '../core/icones.js';
import { esc } from '../core/utils.js';

export const titre = 'Connexion';

/**
 * Construit l'écran de connexion.
 * @param {HTMLElement} conteneur — élément où injecter l'écran.
 * @param {{
 *   transport: (methode: string, params: object) => Promise<any>,
 *   surConnexion: (info: { role: string, utilisateur: object }) => void
 * }} options
 */
export function render(conteneur, { transport, surConnexion }) {
  conteneur.innerHTML =
    '<div class="ecran-connexion">'
    + '<div class="carte-connexion">'
    + '<div class="connexion-pastille">' + ICONES.verrou + '</div>'
    + '<h2 class="connexion-titre">Connexion requise</h2>'
    + '<p class="connexion-sous-titre">'
    + 'Identifiez-vous pour accéder à inerWeb Fluide.'
    + '</p>'
    + '<form class="formulaire" id="form-connexion" novalidate>'
    + '<div id="zone-erreur-connexion"></div>'
    + '<div class="champ">'
    + '<label for="champ-login">Identifiant</label>'
    + '<input type="text" id="champ-login" name="login" autocomplete="username" required autofocus>'
    + '</div>'
    + '<div class="champ">'
    + '<label for="champ-mot-de-passe">Mot de passe</label>'
    + '<input type="password" id="champ-mot-de-passe" name="motDePasse" autocomplete="current-password" required>'
    + '</div>'
    + '<button type="submit" class="btn btn-marine btn-bloc" id="bouton-connexion">'
    + ICONES.verrou + '<span>Connexion</span></button>'
    + '</form>'
    + '</div>'
    + '</div>';

  const form = conteneur.querySelector('#form-connexion');
  const zoneErreur = conteneur.querySelector('#zone-erreur-connexion');
  const champLogin = conteneur.querySelector('#champ-login');
  const champMotDePasse = conteneur.querySelector('#champ-mot-de-passe');
  const bouton = conteneur.querySelector('#bouton-connexion');
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

    if (!login || !motDePasse) {
      afficherErreur('Identifiant et mot de passe sont obligatoires.');
      return;
    }

    enCours = true;
    bouton.disabled = true;
    try {
      // Message d'échec UNIQUE renvoyé mot pour mot par le serveur
      // (« Identifiant ou mot de passe incorrect. ») : jamais reformulé
      // ici, pour ne fuiter aucune information sur l'existence du login.
      const resultat = await transport('connexion', { login, motDePasse });
      champMotDePasse.value = '';
      surConnexion(resultat);
    } catch (erreur) {
      champMotDePasse.value = '';
      champMotDePasse.focus();
      afficherErreur(erreur.message || 'La connexion a échoué.');
      bouton.disabled = false;
      enCours = false;
    }
  });
}
