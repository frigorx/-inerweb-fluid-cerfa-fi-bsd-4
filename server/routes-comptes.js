'use strict';

/**
 * inerWeb Fluide — Routes d'authentification (V9-E5, vague 3 « le cœur »).
 * ==========================================================================
 * REMPLACE le raccourci provisoire « loopback = REFERENT » : ce module
 * matérialise la connexion, la déconnexion et la création de compte (ADMIN
 * uniquement). Câblé dans serveur.js AVANT l'aiguillage api.appeler, avec les
 * MÊMES gardes réseau (CSRF / DNS-rebinding) déjà posées par traiterApi.
 * Patron repris de routes-sauvegarde.js (aiguillage, enveloppe, gardes).
 *
 *   POST /api/connexion    { login, motDePasse }
 *   POST /api/deconnexion  {}
 *   POST /api/creerCompte  { login, motDePasseInitial, role, personnelId? }
 *                          — GARDÉE ADMIN uniquement.
 *
 * Ces routes NE SONT PAS gardées par garderRole du contrat DataStore (elles
 * n'en font pas partie) : /api/connexion et /api/deconnexion sont ouvertes à
 * quiconque peut atteindre le serveur (c'est justement leur rôle — poser ou
 * lever une session). /api/creerCompte porte SA PROPRE garde de rôle
 * (ADMIN), appliquée AVANT tout effet, exactement comme routes-sauvegarde.
 *
 * Sécurité (règles V9-E5 non négociables) :
 *   - Le rôle vient TOUJOURS de la session serveur, jamais du corps de la
 *     requête (creerCompte lit contexte.role, jamais params.role appelant).
 *   - Message d'échec de connexion UNIQUE, que le login existe ou non.
 *   - Verrouillage vérifié AVANT toute tentative de vérification du mot de
 *     passe (un compte verrouillé refuse même le bon mot de passe).
 *   - Écritures multi-tables (échecs/déverrouillage/dernière connexion +
 *     création de session) dans db.transaction() (ré-entrante).
 *   - Poser/lever le cookie iwf_session est laissé à serveur.js (qui connaît
 *     seul le contexte HTTPS/HTTP de la réponse) : ce module renvoie un
 *     jeton clair (connexion) ou rien (déconnexion), jamais l'en-tête brut.
 *
 * Zéro dépendance externe.
 */

const crypto = require('node:crypto');
const db = require('./db.js');
const comptes = require('./comptes.js');
const sessions = require('./sessions.js');

/** Message d'échec de connexion UNIQUE (règle non négociable V9-E5). */
const MSG_ECHEC_CONNEXION = 'Identifiant ou mot de passe incorrect.';

/**
 * Couple hash+sel LEURRE, dérivé une seule fois au chargement du module. Sert
 * à faire payer un scrypt COMPLET même sur la branche « login inexistant ou
 * inactif », afin que le coût de vérification soit INDÉPENDANT de l'existence
 * du login : sans cela, un login absent répondrait quasi instantanément (une
 * lecture SQL) tandis qu'un login présent + mauvais mot de passe subirait le
 * délai d'un scrypt (~64 Mio), ce qui ouvrirait un oracle de temps permettant
 * d'énumérer les identifiants valides malgré le message d'échec unique. Le
 * mot de passe leurre n'est jamais valide (le hash provient d'un secret
 * aléatoire), on ignore donc le verdict : seul le COÛT compte.
 */
const SEL_LEURRE = crypto.randomBytes(comptes.LONGUEUR_SEL).toString('hex');
const HASH_LEURRE = comptes
  .deriverHash(crypto.randomBytes(32).toString('hex'), Buffer.from(SEL_LEURRE, 'hex'))
  .toString('hex');

/** Rôles admis à la création d'un compte (les 4 seuls rôles V9). */
const ROLES_COMPTE = ['ADMIN', 'REFERENT', 'ENSEIGNANT', 'ELEVE'];

/** Rôles exigeant un mot de passe long (habilitations sensibles). */
const ROLES_MOT_DE_PASSE_LONG = ['ADMIN', 'REFERENT'];

/** Longueur minimale du mot de passe pour ADMIN/REFERENT. */
const LONGUEUR_MIN_MOT_DE_PASSE_HABILITE = 10;

/** Longueur minimale du mot de passe pour ENSEIGNANT/ELEVE. */
const LONGUEUR_MIN_MOT_DE_PASSE_STANDARD = 8;

/** Les 3 méthodes servies par ce routeur (préfixe /api/ retiré). */
const METHODES = Object.freeze(['connexion', 'deconnexion', 'creerCompte']);

/** Vrai si `methode` relève de ce routeur (sert d'aiguillage à serveur.js). */
function gereMethode(methode) {
  return METHODES.includes(methode);
}

/**
 * Applique la garde de rôle ADMIN (création de compte). Lève un Error
 * `.code = 403` AVANT tout effet si le rôle de session n'est pas ADMIN.
 */
function garderRoleAdmin(contexte) {
  const role = contexte?.role ?? null;
  if (role !== 'ADMIN') {
    const erreur = new Error(
      `Création de compte réservée au rôle ADMIN — rôle courant : ` +
      `${role ?? 'aucun'}.`);
    erreur.code = 403;
    throw erreur;
  }
}

// ------------------------------------------------------------
// Handlers — un par méthode. Chacun renvoie un résultat sérialisable JSON ;
// les erreurs (Error avec .code) sont enveloppées par appeler().
// ------------------------------------------------------------

const HANDLERS = {
  /**
   * Connexion : vérifie login + mot de passe, gère le verrouillage, ouvre
   * une session en cas de succès. Renvoie { jetonClair, role, utilisateur }
   * — c'est serveur.js qui pose le cookie iwf_session à partir de
   * jetonClair (ce module ne connaît pas la réponse HTTP).
   */
  connexion(params, contexte) {
    const login = typeof params?.login === 'string' ? params.login.trim() : '';
    const motDePasse = typeof params?.motDePasse === 'string'
      ? params.motDePasse : '';

    if (!login || !motDePasse) {
      const erreur = new Error(MSG_ECHEC_CONNEXION);
      erreur.code = 400;
      throw erreur;
    }

    const compte = db.get(
      `SELECT id, login, hash_mot_de_passe, sel, role, actif,
              echecs_consecutifs, verrouille_jusqua
       FROM utilisateurs_app WHERE login = ?`, [login]);

    // Coût de vérification INDÉPENDANT de l'existence du login : les deux
    // chemins (login présent / absent ou inactif) paient EXACTEMENT un scrypt.
    // Sur un login inexistant ou désactivé, on vérifie contre un couple
    // hash+sel LEURRE constant (dérivé au chargement du module) : le verdict
    // est ignoré, seul le délai identique importe. Sans cela, le temps de
    // réponse trahirait l'existence d'un identifiant (oracle de timing), alors
    // même que le message d'échec textuel est unique.
    if (!compte || !compte.actif) {
      comptes.verifierMotDePasse(motDePasse, HASH_LEURRE, SEL_LEURRE);
      const erreur = new Error(MSG_ECHEC_CONNEXION);
      erreur.code = 400;
      throw erreur;
    }

    // Le mot de passe est vérifié AVANT de trancher le verrou, pour que le coût
    // (un scrypt) soit payé sur TOUS les chemins d'un login existant et ne
    // réintroduise pas d'asymétrie de branche entre « verrouillé » et « pas
    // encore verrouillé ». Le verdict de la vérification n'est utilisé qu'après.
    const motDePasseValide = comptes.verifierMotDePasse(
      motDePasse, compte.hash_mot_de_passe, compte.sel);

    // Un compte verrouillé refuse la tentative même avec le bon mot de passe :
    // ce refus prime sur le verdict ci-dessus (message de verrou explicite,
    // décision arrêtée V9-E5).
    if (comptes.estVerrouille(compte)) {
      const erreur = new Error('Compte verrouillé.');
      erreur.code = 403;
      throw erreur;
    }

    if (!motDePasseValide) {
      comptes.enregistrerEchec(compte.id);
      const erreur = new Error(MSG_ECHEC_CONNEXION);
      erreur.code = 400;
      throw erreur;
    }

    // Succès : remise à zéro des échecs, dernière connexion, ouverture de
    // session — le tout dans une même transaction (ré-entrante : creerSession
    // ouvre déjà la sienne, elle rejoint celle-ci).
    const ip = contexte?.ip ?? null;
    const jetonClair = db.transaction(() => {
      comptes.reinitialiserEchecs(compte.id);
      db.run(
        `UPDATE utilisateurs_app SET derniere_connexion = ? WHERE id = ?`,
        [new Date().toISOString(), compte.id]);
      return sessions.creerSession(compte.id, compte.role, ip);
    });

    return {
      jetonClair,
      role: compte.role,
      utilisateur: { id: compte.id, login: compte.login, role: compte.role }
    };
  },

  /**
   * Déconnexion : révoque la session portée par le jeton clair du cookie
   * (jamais du corps — le cookie est HttpOnly, un client JS ne le lit pas
   * de toute façon ; serveur.js extrait le jeton du cookie ENTRANT et le
   * pose dans contexte.jetonClair avant d'appeler ce handler). No-op
   * silencieux si le jeton est absent ou déjà inconnu (idempotent, cf.
   * sessions.revoquerSession) — serveur.js efface le cookie ensuite.
   */
  deconnexion(params, contexte) {
    const jetonClair = contexte?.jetonClair;
    if (typeof jetonClair === 'string' && jetonClair.length > 0) {
      sessions.revoquerSession(jetonClair);
    }
    return { deconnecte: true };
  },

  /**
   * Création d'un compte — GARDÉE ADMIN (garderRoleAdmin, appliquée dans
   * appeler() avant ce handler). Unicité du login, rôle parmi les 4 admis,
   * longueur minimale selon le rôle, hachage scrypt, insertion, journal.
   */
  creerCompte(params) {
    const login = typeof params?.login === 'string' ? params.login.trim() : '';
    const motDePasseInitial = typeof params?.motDePasseInitial === 'string'
      ? params.motDePasseInitial : '';
    const role = params?.role;
    const personnelId = params?.personnelId ?? null;

    if (!login) {
      const erreur = new Error('Identifiant de connexion obligatoire.');
      erreur.code = 400;
      throw erreur;
    }
    if (!ROLES_COMPTE.includes(role)) {
      const erreur = new Error(
        `Rôle obligatoire parmi : ${ROLES_COMPTE.join(', ')}.`);
      erreur.code = 400;
      throw erreur;
    }
    const longueurMin = ROLES_MOT_DE_PASSE_LONG.includes(role)
      ? LONGUEUR_MIN_MOT_DE_PASSE_HABILITE
      : LONGUEUR_MIN_MOT_DE_PASSE_STANDARD;
    if (motDePasseInitial.length < longueurMin) {
      const erreur = new Error(
        `Mot de passe trop court : ${longueurMin} caractères minimum pour ` +
        `le rôle ${role}.`);
      erreur.code = 400;
      throw erreur;
    }

    const existant = db.get(
      'SELECT id FROM utilisateurs_app WHERE login = ?', [login]);
    if (existant) {
      const erreur = new Error(`Identifiant déjà utilisé : ${login}.`);
      erreur.code = 400;
      throw erreur;
    }

    if (personnelId) {
      const personne = db.get(
        'SELECT id FROM personnel WHERE id = ?', [personnelId]);
      if (!personne) {
        const erreur = new Error(`Personne introuvable : ${personnelId}.`);
        erreur.code = 400;
        throw erreur;
      }
    }

    const { hash, sel } = comptes.hacherMotDePasse(motDePasseInitial);
    const id = db.generateId('UTI');

    return db.transaction(() => {
      db.run(
        `INSERT INTO utilisateurs_app
           (id, login, hash_mot_de_passe, sel, role, personnel_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, login, hash, sel, role, personnelId]);
      db.journaliser({
        qui: null,
        action: 'CREATION_COMPTE',
        cible: login,
        details: `role=${role}`,
      });
      const ligne = db.get(
        `SELECT id, login, role, personnel_id, actif, date_creation
         FROM utilisateurs_app WHERE id = ?`, [id]);
      return {
        id: ligne.id,
        login: ligne.login,
        role: ligne.role,
        personnelId: ligne.personnel_id,
        actif: ligne.actif === 1,
        dateCreation: ligne.date_creation
      };
    });
  }
};

/**
 * Point d'entrée du routeur. Applique la garde ADMIN pour creerCompte
 * (connexion/deconnexion restent ouvertes — c'est leur rôle), puis le
 * handler. Renvoie le RÉSULTAT nu ; l'enveloppe { ok, resultat } est posée
 * par serveur.js (identique à traiterApi / routes-sauvegarde).
 * @param {string} methode - sans le préfixe /api/
 * @param {object} params
 * @param {{role?: string, ip?: string}} contexte
 * @returns {object} résultat sérialisable
 */
function appeler(methode, params, contexte) {
  const handler = HANDLERS[methode];
  if (!handler) {
    const erreur = new Error(`Route de compte inconnue : ${methode}.`);
    erreur.code = 501;
    throw erreur;
  }
  if (methode === 'creerCompte') {
    garderRoleAdmin(contexte);
  }
  return handler(params ?? {}, contexte ?? {});
}

module.exports = {
  ROLES_COMPTE,
  METHODES,
  MSG_ECHEC_CONNEXION,
  gereMethode,
  appeler
};
