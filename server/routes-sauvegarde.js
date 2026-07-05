'use strict';

/**
 * inerWeb Fluide — Routes dédiées « coffre-fort » (V9-E4.1).
 * ==========================================================
 * Les 4 routes de sauvegarde/restauration, HORS du contrat DataStore (le
 * DemoStore n'a ni disque, ni VACUUM, ni ZIP serveur : les y mettre casserait
 * test-contrat). Elles sont câblées dans serveur.js AVANT l'aiguillage
 * api.appeler, avec les MÊMES gardes réseau (CSRF / DNS-rebinding) déjà
 * posées par traiterApi. Ici s'ajoute la GARDE DE RÔLE ADMIN/REFERENT
 * (403 AVANT tout effet) et l'enveloppe standard { ok, resultat } /
 * { ok:false, erreur, code }.
 *
 *   POST /api/sauvegarder       { type, chiffrer?, phrase?, indice? }
 *   POST /api/listerSauvegardes {}
 *   POST /api/restaurer         { chemin, phrase?, confirmePerte? }
 *   POST /api/testerSauvegarde  { chemin, phrase? }
 *
 * Un DRAPEAU anti-concurrence (restauration.operationEnCours) refuse une
 * seconde opération simultanée : une restauration FERME la base, aucune autre
 * opération ne doit s'intercaler. Le refus est renvoyé en 409 (conflit).
 *
 * SÉCURITÉ chemins : `restaurer`/`testerSauvegarde` n'acceptent QUE des
 * archives situées SOUS backups/ (une archive arbitraire du disque, ou un
 * chemin remontant par « .. », est refusée — on ne restaure pas n'importe
 * quel fichier fourni par une requête).
 *
 * Zéro dépendance externe.
 */

const path = require('node:path');

const sauvegarde = require('./sauvegarde.js');
const restauration = require('./restauration.js');

/** Rôles habilités aux opérations de sauvegarde (jamais un ELEVE). */
const ROLES_SAUVEGARDE = ['ADMIN', 'REFERENT'];

/** Les 4 méthodes servies par ce routeur (préfixe /api/ retiré). */
const METHODES = Object.freeze([
  'sauvegarder', 'listerSauvegardes', 'restaurer', 'testerSauvegarde'
]);

/** Vrai si `methode` relève de ce routeur (sert d'aiguillage à serveur.js). */
function gereMethode(methode) {
  return METHODES.includes(methode);
}

/**
 * Résout un chemin d'archive fourni par une requête et REFUSE tout ce qui
 * n'est pas strictement sous backups/. Empêche une requête de désigner un
 * fichier arbitraire du disque (« C:\autre\chose.zip ») ou de remonter par
 * « .. ». Renvoie le chemin absolu validé.
 * @param {string} cheminDemande
 * @returns {string} chemin absolu sûr, sous backups/
 */
function resoudreCheminArchive(cheminDemande) {
  if (!cheminDemande || typeof cheminDemande !== 'string') {
    const erreur = new Error('Chemin de la sauvegarde obligatoire.');
    erreur.code = 400;
    throw erreur;
  }
  const racine = path.resolve(sauvegarde.dossierBackups());
  const absolu = path.resolve(racine, cheminDemande);
  if (absolu !== racine && !absolu.startsWith(racine + path.sep)) {
    const erreur = new Error(
      'Chemin de sauvegarde hors du dossier des sauvegardes : refusé.');
    erreur.code = 403;
    throw erreur;
  }
  return absolu;
}

/**
 * Applique la garde de rôle ADMIN/REFERENT. Lève un Error `.code = 403`
 * AVANT tout effet si le rôle de session n'est pas habilité.
 */
function garderRole(contexte) {
  const role = contexte?.role ?? null;
  if (!ROLES_SAUVEGARDE.includes(role)) {
    const erreur = new Error(
      `Opération de sauvegarde réservée aux rôles habilités ` +
      `(${ROLES_SAUVEGARDE.join(', ')}) — rôle courant : ${role ?? 'aucun'}.`);
    erreur.code = 403;
    throw erreur;
  }
}

// ------------------------------------------------------------
// Handlers — un par méthode. Chacun renvoie un résultat sérialisable JSON ;
// les erreurs (Error avec .code) sont enveloppées par appeler().
// ------------------------------------------------------------

const HANDLERS = {
  /** Produit une sauvegarde SNAPSHOT ou ARCHIVE. */
  sauvegarder(params) {
    const type = params?.type;
    if (type !== 'SNAPSHOT' && type !== 'ARCHIVE') {
      const erreur = new Error(
        'Type de sauvegarde attendu : SNAPSHOT ou ARCHIVE.');
      erreur.code = 400;
      throw erreur;
    }
    // E4.1 : chiffrement non encore branché (E4.2). L'indice non secret peut
    // déjà être consigné dans le manifeste.
    const options = { indice: params?.indice ?? null };
    const produit = type === 'ARCHIVE'
      ? sauvegarde.sauvegarderArchive(options)
      : sauvegarde.sauvegarderSnapshot(options);
    return {
      chemin: produit.chemin,
      type: produit.type,
      manifeste: produit.manifeste
    };
  },

  /** Inventaire des sauvegardes (manifeste lu en tête, sans extraire). */
  listerSauvegardes() {
    return sauvegarde.listerSauvegardes();
  },

  /** Restaure une archive (déroulé atomique 0→6, sous backups/ uniquement). */
  restaurer(params) {
    const chemin = resoudreCheminArchive(params?.chemin);
    return restauration.restaurer(chemin, {
      phrase: params?.phrase,
      confirmePerte: params?.confirmePerte === true
    });
  },

  /** Teste une archive dans une base TEMP (la base courante n'est pas touchée). */
  testerSauvegarde(params) {
    const chemin = resoudreCheminArchive(params?.chemin);
    return restauration.testerSauvegarde(chemin, { phrase: params?.phrase });
  }
};

/**
 * Point d'entrée du routeur. Applique la garde de rôle (403 avant effet), le
 * drapeau anti-concurrence (409 si une opération E4 tourne déjà), puis le
 * handler. Renvoie le RÉSULTAT nu ; l'enveloppe { ok, resultat } est posée
 * par serveur.js (identique à traiterApi).
 * @param {string} methode - sans le préfixe /api/
 * @param {object} params
 * @param {{role?: string}} contexte
 * @returns {object} résultat sérialisable
 */
function appeler(methode, params, contexte) {
  const handler = HANDLERS[methode];
  if (!handler) {
    const erreur = new Error(`Route de sauvegarde inconnue : ${methode}.`);
    erreur.code = 501;
    throw erreur;
  }
  // 1) Garde de rôle AVANT tout effet.
  garderRole(contexte);
  // 2) Anti-concurrence : une seule opération E4 à la fois (restaurer ferme
  //    la base — rien d'autre ne doit s'intercaler). 409 = conflit temporaire.
  if (restauration.operationEnCours()) {
    const erreur = new Error(
      'Une opération de sauvegarde est déjà en cours : réessayez dans un ' +
      'instant (une seule à la fois).');
    erreur.code = 409;
    throw erreur;
  }
  return handler(params ?? {}, contexte ?? {});
}

module.exports = {
  ROLES_SAUVEGARDE,
  METHODES,
  gereMethode,
  appeler,
  // Exposés pour tests / câblage.
  resoudreCheminArchive
};
