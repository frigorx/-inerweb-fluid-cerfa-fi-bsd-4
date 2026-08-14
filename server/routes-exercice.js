// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
'use strict';

/**
 * inerWeb Fluide — Routes du MODE EXERCICE (13/08/2026, plan
 * docs/PLAN-MODE-EXERCICE.md).
 * ============================================================================
 * Le mode exercice est un BAC À SABLE pédagogique dans le navigateur : il
 * part d'une PHOTO du registre réel (export JSON complet) et n'écrit JAMAIS
 * rien au registre. Ces routes ne servent que deux choses : tenir le CODE DE
 * DÉBLOCAGE (décision du propriétaire : « celui qui a le code » tient la
 * clé), et délivrer la photo à qui le présente.
 *
 *   POST /api/etatExercice         {}          — le code est-il défini ?
 *   POST /api/definirCodeExercice  { code }    — ADMIN/REFERENT seulement.
 *   POST /api/demarrerExercice     { code }    — session requise (tout rôle)
 *                                                + code exact → la photo.
 *
 * Sécurité, dit honnêtement :
 *   - Le code est HACHÉ (scrypt, patron comptes.js), jamais stocké ni
 *     journalisé en clair. Vérification en temps constant, par les versions
 *     ASYNCHRONES (A14) : aucun gel de la boucle d'événements.
 *   - `demarrerExercice` rend l'EXPORT COMPLET (nominatif compris — décision
 *     du propriétaire du 13/08 : « on garde le réel ») à toute session munie
 *     du code : le code EST la clé, PAS le rôle. La garde VALIDEUR
 *     d'`exporterJSON` (L2-i) n'est pas affaiblie pour autant : ce chemin-ci
 *     exige le code, et chaque démarrage est JOURNALISÉ au journal chaîné
 *     (`DEMARRAGE_EXERCICE`, identité de session) — on sait toujours qui a
 *     tiré une photo, et quand.
 *   - Anti-force-brute : le coût d'un scrypt par essai (~100 ms), et le
 *     refus ne distingue jamais « code faux » de « code non défini ».
 *     Pas de verrouillage dédié (consigné au plan) : le code n'ouvre qu'un
 *     bac à sable, et le journal trace.
 *
 * Zéro dépendance externe.
 */

const db = require('./db.js');
const parametres = require('./parametres.js');
const comptes = require('./comptes.js');
const api = require('./api.js');

/** Rôles habilités à DÉFINIR le code (jamais un élève, jamais un simple valideur). */
const ROLES_DEFINITION_CODE = ['ADMIN', 'REFERENT'];

/** Longueur minimale du code de déblocage. */
const LONGUEUR_MIN_CODE = 4;

/** Clés de la table parametres. */
const CLE_HASH = 'exercice_code_hash';
const CLE_SEL = 'exercice_code_sel';

/** Message de refus UNIQUE (code faux, code absent : indiscernables). */
const MSG_CODE_REFUSE =
  'Code de déblocage refusé. Vérifiez le code du mode exercice auprès du ' +
  'formateur qui l’a défini.';

/** Méthodes servies par ce routeur (préfixe /api/ retiré). */
const METHODES = Object.freeze([
  'etatExercice', 'definirCodeExercice', 'demarrerExercice'
]);

/** Vrai si `methode` relève de ce routeur (aiguillage de serveur.js). */
function gereMethode(methode) {
  return METHODES.includes(methode);
}

/** Garde de rôle générique (403 AVANT tout effet). */
function garderRole(contexte, roles, geste) {
  const role = contexte?.role ?? null;
  if (!roles.includes(role)) {
    const erreur = new Error(
      `${geste} réservé aux rôles ${roles.join('/')} — rôle courant : ` +
      `${role ?? 'aucun'}.`);
    erreur.code = 403;
    throw erreur;
  }
}

const HANDLERS = {
  /** Le code du mode exercice est-il défini sur ce poste ? (lecture d'état,
   *  session requise — l'écran s'en sert pour guider le formateur). */
  etatExercice(params, contexte) {
    if (!contexte?.role) {
      const erreur = new Error('Session requise (connexion nécessaire).');
      erreur.code = 403;
      throw erreur;
    }
    return { codeDefini: Boolean(parametres.lire(CLE_HASH)) };
  },

  /**
   * Définit (ou remplace) le code de déblocage — ADMIN/REFERENT seulement.
   * Le code est haché (sel frais), jamais écrit en clair nulle part.
   */
  async definirCodeExercice(params, contexte) {
    garderRole(contexte, ROLES_DEFINITION_CODE,
      'Définir le code du mode exercice est');
    const code = typeof params?.code === 'string' ? params.code : '';
    if (code.length < LONGUEUR_MIN_CODE) {
      const erreur = new Error(
        `Code trop court : ${LONGUEUR_MIN_CODE} caractères minimum.`);
      erreur.code = 400;
      throw erreur;
    }
    const { hash, sel } = await comptes.hacherMotDePasseAsync(code);
    return db.transaction(() => {
      parametres.ecrire(CLE_HASH, hash);
      parametres.ecrire(CLE_SEL, sel);
      db.journaliser({
        qui: contexte?.utilisateur ?? null,
        action: 'DEFINITION_CODE_EXERCICE',
        cible: 'mode exercice',
        details: 'Code de déblocage défini ou remplacé (jamais journalisé en clair).',
      });
      return { codeDefini: true };
    });
  },

  /**
   * Démarre un exercice : session requise (tout rôle) + code exact → la
   * PHOTO du registre (export JSON complet). Chaque démarrage est journalisé
   * avec l'identité de session : on sait qui a tiré une photo, et quand.
   */
  async demarrerExercice(params, contexte) {
    if (!contexte?.role) {
      const erreur = new Error('Session requise (connexion nécessaire).');
      erreur.code = 403;
      throw erreur;
    }
    const code = typeof params?.code === 'string' ? params.code : '';
    const hash = parametres.lire(CLE_HASH);
    const sel = parametres.lire(CLE_SEL);
    // Code non défini : on paie quand même une vérification (leurre) pour ne
    // pas distinguer « pas de code » de « code faux » au chronomètre, puis le
    // MÊME refus. Un poste sans code défini n'ouvre pas de bac à sable.
    const valide = hash && sel
      ? await comptes.verifierMotDePasseAsync(code, hash, sel)
      : (await comptes.verifierMotDePasseAsync(
        code || 'leurre', 'ab'.repeat(32), 'cd'.repeat(16)), false);
    if (!valide) {
      const erreur = new Error(MSG_CODE_REFUSE);
      erreur.code = 403;
      throw erreur;
    }
    // La photo : l'export complet, par le handler du contrat — appelé avec
    // un contexte REFERENT interne. Ce n'est PAS un trou dans la garde
    // VALIDEUR d'exporterJSON (L2-i) : ce chemin-ci exige le CODE (décision
    // du propriétaire, 13/08 — « celui qui a le code » tient la clé) et il
    // est JOURNALISÉ nominativement ci-dessous, ce que l'appel direct ne
    // serait pas.
    const photo = api.appeler('exporterJSON', {}, { role: 'REFERENT' });
    db.journaliser({
      qui: contexte?.utilisateur ?? null,
      action: 'DEMARRAGE_EXERCICE',
      cible: 'mode exercice',
      details: `Photo du registre délivrée au bac à sable (rôle de session : ${contexte.role}).`,
    });
    return { photo, date: new Date().toISOString() };
  }
};

/**
 * Point d'entrée du routeur (patron routes-sauvegarde). ASYNCHRONE : les
 * dérivations scrypt du code passent par le pool de threads (A14).
 * @param {string} methode - sans le préfixe /api/
 * @param {object} params
 * @param {{role?: string, utilisateur?: string}} contexte
 * @returns {Promise<object>} résultat sérialisable
 */
async function appeler(methode, params, contexte) {
  const handler = HANDLERS[methode];
  if (!handler) {
    const erreur = new Error(`Route d'exercice inconnue : ${methode}.`);
    erreur.code = 501;
    throw erreur;
  }
  return handler(params ?? {}, contexte ?? {});
}

module.exports = {
  METHODES,
  MSG_CODE_REFUSE,
  LONGUEUR_MIN_CODE,
  gereMethode,
  appeler
};
