// ============================================================
// inerWeb Fluide v8 — Transport HTTP du LocalStore (V9-E3 / V9-E5)
//
// Transport NAVIGATEUR : chaque appel du LocalStore devient un
// POST /api/:methode (corps JSON { params }), et la réponse enveloppée
// { ok, resultat } / { ok:false, erreur, code } est désenveloppée :
//   succès → resultat (déjà une copie fraîche, sérialisée par le réseau) ;
//   échec  → throw new Error(erreur) MOT POUR MOT (le message français
//            du serveur intact — l'interface s'appuie dessus).
//
// Signature unique du contrat de transport :
//   transport(methode: string, params: object) => Promise<any>
//
// V9-E5 : deux ajouts, aucun changement de signature.
//  - credentials:'same-origin' — indispensable pour que le navigateur
//    envoie (et reçoive) le cookie iwf_session, HttpOnly/SameSite=Strict,
//    posé par /api/connexion. Sans cette option, fetch n'envoie AUCUN
//    cookie par défaut sur certains contextes et la session serait
//    invisible à chaque appel suivant.
//  - Détection d'une ABSENCE DE SESSION (le serveur répond HTTP 403 avec
//    un message qui ne nomme aucun rôle courant : garde de lecture LAN
//    « Session requise… » ou garde de mutation « … rôle courant : aucun. »)
//    → émission d'un évènement DOM global 'iwf:session-requise' AVANT de
//    relever l'erreur, pour que app.js bascule sur l'écran de connexion.
//    Un 403 de RÔLE INSUFFISANT (utilisateur connecté mais pas habilité,
//    ex. ENSEIGNANT sur importerJSON) NE déclenche PAS cet évènement — il
//    nomme un rôle courant précis — et remonte en erreur métier normale
//    (pas de redirection : l'utilisateur est bien connecté).
// ============================================================

/** Nom de l'évènement DOM émis quand aucune session valide n'est active. */
export const EVENEMENT_SESSION_REQUISE = 'iwf:session-requise';

/**
 * Vrai si le message d'échec signale une absence de session (à distinguer
 * d'un rôle insuffisant nommé). Repère les deux gardes serveur possibles :
 *   - garde de lecture LAN (serveur.js)  : « Session requise (connexion nécessaire). »
 *   - garde de mutation (api.js)          : « … — rôle courant : aucun. »
 * @param {string} message
 * @returns {boolean}
 */
function signaleAbsenceDeSession(message) {
  const texte = String(message || '');
  return texte.includes('Session requise')
    || texte.includes('rôle courant : aucun');
}

/**
 * Crée le transport HTTP du LocalStore.
 * @param {string} [base] Préfixe des routes (défaut : '/api').
 * @returns {(methode: string, params: object) => Promise<any>}
 */
export function creerTransportHttp(base = '/api') {
  return async function transport(methode, params) {
    let reponse;
    try {
      reponse = await fetch(`${base}/${methode}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ params: params ?? {} })
      });
    } catch (erreur) {
      throw new Error(
        `Serveur local injoignable (${methode}) : ${erreur.message}`);
    }

    let enveloppe;
    try {
      enveloppe = await reponse.json();
    } catch {
      throw new Error(
        `Réponse illisible du serveur local (${methode}, HTTP ${reponse.status}).`);
    }

    if (enveloppe && enveloppe.ok === true) {
      return enveloppe.resultat;
    }

    const messageErreur = (enveloppe && enveloppe.erreur) ||
      `Erreur du serveur local (${methode}, HTTP ${reponse.status}).`;

    // Absence de session (jamais sur /api/connexion elle-même, ni sur
    // /api/deconnexion : un échec de connexion est une erreur métier
    // normale — identifiant/mot de passe incorrect — à afficher sur
    // l'écran de connexion, pas une raison d'y revenir en boucle).
    if (reponse.status === 403 && methode !== 'connexion'
      && methode !== 'deconnexion' && signaleAbsenceDeSession(messageErreur)
      && typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent(EVENEMENT_SESSION_REQUISE, {
        detail: { methode }
      }));
    }

    // Échec métier ou technique : on relève le message serveur mot pour mot.
    throw new Error(messageErreur);
  };
}
