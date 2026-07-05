'use strict';

/**
 * inerWeb Fluide — Sessions serveur (V9-E5, vague 2/2 « sessions »).
 * ============================================================================
 * Ce module REMPLACE le raccourci provisoire « loopback = REFERENT » : c'est
 * lui qui matérialise une session authentifiée, indépendamment de comptes.js
 * (hachage/verrouillage, vague 1) qui reste inchangé.
 *
 * Principe (règles V9-E5 non négociables) :
 *   - Le jeton CLAIR (32 octets aléatoires, encodés base64url) n'est JAMAIS
 *     stocké : seule son empreinte SHA-256 (hex) va en base. Le cookie porte
 *     le clair ; retrouver une session revient à re-hacher ce que le
 *     navigateur présente et chercher l'empreinte correspondante.
 *   - Le rôle est FIGÉ à l'ouverture de la session (colonne `role` de la
 *     table `sessions`) : une fois la session ouverte, changer le rôle du
 *     compte en base ne change PAS le rôle de la session déjà émise — c'est
 *     un choix assumé de simplicité (cohérent avec « le rôle vient toujours
 *     de la session serveur, jamais du corps de la requête »).
 *   - Durée de vie : 8 heures depuis la création (`expire_le`), vérifiée à
 *     CHAQUE appel de `verifierSession` (jamais mise en cache côté route).
 *   - Comparaison du jeton présenté à celui recherché en base : en TEMPS
 *     CONSTANT (`crypto.timingSafeEqual`), jamais `===`, pour la même raison
 *     que la vérification de mot de passe dans comptes.js.
 *   - Défense en profondeur (durcissement post-revue adversariale) :
 *     `verifierSession` vérifie aussi que le compte `utilisateurs_app`
 *     correspondant existe ET est `actif = 1` — un compte désactivé coupe
 *     l'accès immédiatement, sans attendre l'expiration de 8 h. La
 *     désactivation d'un compte doit en outre appeler
 *     `revoquerToutesLesSessions` pour invalider ses sessions déjà ouvertes.
 *   - `purgerSessionsObsoletes` (best-effort, branchée au démarrage du
 *     serveur) nettoie les sessions expirées ; les sessions révoquées mais
 *     pas encore expirées sont conservées le temps restant (traçabilité).
 *
 * Zéro dépendance externe (node:crypto natif).
 */

const crypto = require('node:crypto');
const db = require('./db.js');

/** Durée de vie d'une session, en millisecondes (règle V9-E5 : 8 heures). */
const DUREE_SESSION_MS = 8 * 60 * 60 * 1000;

/**
 * Hache un jeton CLAIR en SHA-256 hexadécimal — c'est cette empreinte, et
 * elle seule, qui est stockée/recherchée en base (jamais le clair).
 * @param {string} jetonClair
 * @returns {string} empreinte hexadécimale (64 caractères)
 */
function hacherJeton(jetonClair) {
  return crypto.createHash('sha256').update(jetonClair, 'utf8').digest('hex');
}

/**
 * Ouvre une nouvelle session pour un utilisateur déjà authentifié (mot de
 * passe vérifié en amont par comptes.js) : tire un jeton clair aléatoire,
 * n'en stocke QUE l'empreinte SHA-256, avec le rôle figé et l'échéance à
 * +8 h. Journalise l'ouverture si `journaliser()` est disponible sur db
 * (présent depuis E2 — cohérent avec le reste du coffre-fort).
 *
 * @param {string} utilisateurId
 * @param {string} role - rôle FIGÉ pour toute la durée de vie de la session
 * @param {string|null} [ip] - IP du poste à la connexion (traçabilité)
 * @param {Date} [maintenant]
 * @returns {string} le jeton CLAIR — à poser dans le cookie, JAMAIS stocké
 */
function creerSession(utilisateurId, role, ip = null, maintenant = new Date()) {
  if (typeof utilisateurId !== 'string' || !utilisateurId) {
    throw new Error(
      'Identifiant utilisateur obligatoire pour créer une session.');
  }
  if (typeof role !== 'string' || !role) {
    throw new Error('Rôle obligatoire pour créer une session.');
  }

  const jetonClair = crypto.randomBytes(32).toString('base64url');
  const jetonHache = hacherJeton(jetonClair);
  const creeLe = maintenant.toISOString();
  const expireLe = new Date(maintenant.getTime() + DUREE_SESSION_MS).toISOString();

  db.transaction((bdd) => {
    bdd.prepare(
      `INSERT INTO sessions (jeton, utilisateur_id, role, cree_le, expire_le, ip)
       VALUES (?, ?, ?, ?, ?, ?)`)
      .run(jetonHache, utilisateurId, role, creeLe, expireLe, ip);
    if (typeof db.journaliser === 'function') {
      db.journaliser({
        qui: utilisateurId,
        action: 'SESSION_OUVERTE',
        cible: utilisateurId,
        details: `role=${role}`,
      });
    }
  });

  return jetonClair;
}

/**
 * Vérifie un jeton CLAIR présenté (typiquement issu du cookie) : hache,
 * recherche une session NON révoquée et NON expirée, compare l'empreinte en
 * temps constant. Purge paresseusement les sessions expirées croisées au
 * passage (pas de tâche planifiée séparée — suffisant au volume mono-poste).
 *
 * @param {string} jetonClair
 * @param {Date} [maintenant]
 * @returns {{utilisateur_id: string, role: string}|null}
 */
function verifierSession(jetonClair, maintenant = new Date()) {
  if (typeof jetonClair !== 'string' || jetonClair.length === 0) return null;

  const jetonHache = hacherJeton(jetonClair);
  const ligne = db.get(
    `SELECT jeton, utilisateur_id, role, expire_le
     FROM sessions
     WHERE jeton = ? AND revoque = 0`,
    [jetonHache]);
  if (!ligne) return null;

  // Comparaison en temps constant de l'empreinte retrouvée : la clause SQL
  // ci-dessus a déjà filtré sur égalité exacte (index sur clé primaire), mais
  // on re-vérifie ici en temps constant pour ne jamais s'appuyer sur une
  // comparaison SQL potentiellement optimisée en court-circuit par le moteur.
  const bufAttendu = Buffer.from(ligne.jeton, 'hex');
  const bufCalcule = Buffer.from(jetonHache, 'hex');
  if (bufAttendu.length !== bufCalcule.length
    || !crypto.timingSafeEqual(bufCalcule, bufAttendu)) {
    return null;
  }

  const echeance = new Date(ligne.expire_le);
  if (Number.isNaN(echeance.getTime()) || echeance.getTime() <= maintenant.getTime()) {
    // Session expirée : purge paresseuse (best effort, pas critique si ça
    // échoue — la condition expire_le > maintenant protège de toute façon
    // tous les appels suivants).
    try {
      db.run('DELETE FROM sessions WHERE jeton = ?', [jetonHache]);
    } catch {
      // Purge best-effort : une erreur ici ne doit jamais faire échouer la
      // vérification (déjà tranchée : session refusée ci-dessous).
    }
    return null;
  }

  // Défense en profondeur : un compte désactivé coupe l'accès IMMÉDIATEMENT,
  // sans attendre l'expiration naturelle de la session (jusqu'à 8 h sinon).
  // Lecture indexée sur la clé primaire d'utilisateurs_app : coût négligeable.
  const compte = db.get(
    'SELECT actif FROM utilisateurs_app WHERE id = ?',
    [ligne.utilisateur_id]);
  if (!compte || compte.actif !== 1) return null;

  return { utilisateur_id: ligne.utilisateur_id, role: ligne.role };
}

/**
 * Révoque une session (déconnexion explicite) : passe `revoque = 1`. Un
 * jeton inconnu ne lève pas — révoquer une session déjà absente/révoquée
 * est un no-op silencieux (idempotent).
 * @param {string} jetonClair
 */
function revoquerSession(jetonClair) {
  if (typeof jetonClair !== 'string' || jetonClair.length === 0) return;
  const jetonHache = hacherJeton(jetonClair);
  db.run('UPDATE sessions SET revoque = 1 WHERE jeton = ?', [jetonHache]);
}

/**
 * Révoque D'UN COUP TOUTES les sessions ouvertes d'un utilisateur (passe
 * `revoque = 1` sur chaque ligne le concernant) — utile à la désactivation
 * d'un compte : sans cela, une session déjà ouverte restait valide jusqu'à
 * 8 h après la désactivation (aucune révocation n'était déclenchée).
 * Un utilisateur sans session ouverte ne lève pas (no-op silencieux).
 * @param {string} utilisateurId
 */
function revoquerToutesLesSessions(utilisateurId) {
  if (typeof utilisateurId !== 'string' || utilisateurId.length === 0) return;
  db.run('UPDATE sessions SET revoque = 1 WHERE utilisateur_id = ?', [utilisateurId]);
}

/**
 * Purge best-effort des sessions devenues obsolètes : celles expirées (que
 * la purge paresseuse de `verifierSession` n'aurait pas croisées faute
 * d'appel) ET celles à la fois révoquées ET expirées. Les sessions
 * révoquées mais PAS ENCORE expirées sont volontairement CONSERVÉES (courte
 * traçabilité d'une déconnexion/désactivation récente) — seule l'échéance
 * naturelle les rend éligibles à la purge.
 * Hors chemin critique : toute erreur est avalée (jamais bloquant pour le
 * démarrage du serveur ni pour un appel opportuniste depuis le module).
 * @param {Date} [maintenant]
 * @returns {number} nombre de lignes supprimées (0 si erreur ou rien à purger)
 */
function purgerSessionsObsoletes(maintenant = new Date()) {
  try {
    const maintenantIso = maintenant.toISOString();
    const resultat = db.run(
      `DELETE FROM sessions
       WHERE expire_le <= ?
          OR (revoque = 1 AND expire_le <= ?)`,
      [maintenantIso, maintenantIso]);
    return Number(resultat.changes ?? 0);
  } catch {
    // Best effort : la purge n'est jamais une condition de fonctionnement —
    // les sessions expirées restent de toute façon filtrées par
    // verifierSession (expire_le > maintenant, vérifié à chaque appel).
    return 0;
  }
}

module.exports = {
  DUREE_SESSION_MS,
  creerSession,
  verifierSession,
  revoquerSession,
  revoquerToutesLesSessions,
  purgerSessionsObsoletes,
  // Exposé pour tests ciblés (vérifier ce qui est réellement stocké en base).
  hacherJeton,
};
