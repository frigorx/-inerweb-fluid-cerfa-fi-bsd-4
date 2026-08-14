// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
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
 *   POST /api/sauvegarder             { type, chiffrer?, phrase?, indice? }
 *   POST /api/listerSauvegardes       {}
 *   POST /api/restaurer               { chemin, phrase?, confirmePerte? }
 *   POST /api/testerSauvegarde        { chemin, phrase? }
 *   POST /api/lireReglagesSauvegarde  {}
 *   POST /api/definirReglagesSauvegarde { dossierDestination?, alerteJours? }
 *
 * Un DRAPEAU anti-concurrence (restauration.operationEnCours) refuse une
 * seconde opération simultanée : une restauration FERME la base, aucune autre
 * opération ne doit s'intercaler. Le refus est renvoyé en 409 (conflit).
 *
 * SÉCURITÉ chemins : `restaurer`/`testerSauvegarde` n'acceptent QUE des
 * archives (« .zip » claires OU « .zip.chiffre » chiffrées) situées SOUS
 * backups/ (une archive arbitraire du disque, ou un chemin remontant par
 * « .. », est refusée — on ne restaure pas n'importe quel fichier fourni par
 * une requête).
 *
 * CHIFFREMENT (E4.2) : `sauvegarder` accepte `chiffrer`/`phrase`/`indice` ;
 * `restaurer`/`testerSauvegarde` acceptent `phrase` (requise pour un chiffré,
 * un tag KO = rejet avant tout effet). Détail dans chiffrement.js / VISION §4.5.
 *
 * Zéro dépendance externe.
 */

const path = require('node:path');

const db = require('./db.js');
const parametres = require('./parametres.js');
const sauvegarde = require('./sauvegarde.js');
const sauvegardeAuto = require('./sauvegarde-auto.js');
const restauration = require('./restauration.js');

/** Rôles habilités aux opérations de sauvegarde (jamais un ELEVE). */
const ROLES_SAUVEGARDE = ['ADMIN', 'REFERENT'];

/** Méthodes servies par ce routeur (préfixe /api/ retiré). */
const METHODES = Object.freeze([
  'sauvegarder', 'listerSauvegardes', 'restaurer', 'testerSauvegarde',
  'lireReglagesSauvegarde', 'definirReglagesSauvegarde'
]);

/**
 * Méthodes EXEMPTÉES du verrou anti-concurrence (409) : lire/écrire un réglage
 * ne touche pas le fichier de base et ne doit pas être bloqué par une
 * sauvegarde en cours (l'écran de sauvegarde lit les réglages au chargement).
 */
const SANS_VERROU_CONCURRENCE = new Set([
  'lireReglagesSauvegarde', 'definirReglagesSauvegarde'
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
    // E4.2 : chiffrement branché. `chiffrer` (bool) + `phrase` (requise si
    // chiffré) + `indice` (non secret, consigné dans le manifeste clair). Sans
    // phrase alors que chiffrer=true, sauvegarder() lève une erreur claire.
    const options = {
      indice: params?.indice ?? null,
      chiffrer: params?.chiffrer === true,
      phrase: params?.phrase
    };
    const produit = type === 'ARCHIVE'
      ? sauvegarde.sauvegarderArchive(options)
      : sauvegarde.sauvegarderSnapshot(options);
    return {
      chemin: produit.chemin,
      type: produit.type,
      manifeste: produit.manifeste,
      chiffre: produit.chiffre === true
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
  },

  /**
   * Lit les réglages de sauvegarde : le dossier de destination CONFIGURÉ
   * (vide = défaut), le dossier EFFECTIF où vont réellement les archives, le
   * dossier par DÉFAUT, et le seuil d'alerte d'ancienneté (jours).
   */
  lireReglagesSauvegarde() {
    const configure = parametres.lire(sauvegarde.CLE_DOSSIER_DESTINATION, '') || '';
    return {
      dossierDestination: configure,
      dossierEffectif: sauvegarde.dossierBackups(),
      dossierParDefaut: sauvegarde.dossierBackupsParDefaut(),
      alerteJours: sauvegarde.alerteJours(),
      // Sauvegarde AUTOMATIQUE (condition 6) : active par défaut.
      autoActive: sauvegardeAuto.estActive(),
      autoHeures: sauvegardeAuto.heuresIntervalle()
    };
  },

  /**
   * Définit les réglages de sauvegarde. Champs OPTIONNELS (on ne modifie que
   * ceux présents) : `dossierDestination` (validé absolu + hors data/ + HORS
   * ESPACE SYNCHRONISÉ + inscriptible ; chaîne vide = revenir au dossier par
   * défaut — la garde est ICI, donc valable pour l'écran comme pour l'API) et
   * `alerteJours` (entier 1..3650). Journalise, puis renvoie les réglages à jour.
   */
  definirReglagesSauvegarde(params, contexte) {
    const maj = {};
    if (Object.prototype.hasOwnProperty.call(params, 'dossierDestination')) {
      const verdict = sauvegarde.validerDossierDestination(params.dossierDestination);
      if (!verdict.ok) {
        const erreur = new Error(verdict.message);
        erreur.code = 400;
        throw erreur;
      }
      parametres.ecrire(sauvegarde.CLE_DOSSIER_DESTINATION, verdict.resolu);
      maj.dossierDestination = verdict.resolu;
    }
    if (Object.prototype.hasOwnProperty.call(params, 'alerteJours')) {
      const n = Number.parseInt(params.alerteJours, 10);
      if (!Number.isFinite(n) || n < 1 || n > 3650) {
        const erreur = new Error(
          'Le seuil d’alerte doit être un nombre de jours entre 1 et 3650.');
        erreur.code = 400;
        throw erreur;
      }
      parametres.ecrire(sauvegarde.CLE_ALERTE_JOURS, n);
      maj.alerteJours = n;
    }
    // Sauvegarde AUTOMATIQUE (condition 6) : activation + intervalle (heures).
    if (Object.prototype.hasOwnProperty.call(params, 'autoActive')) {
      parametres.ecrire(sauvegardeAuto.CLE_ACTIVE, params.autoActive ? '1' : '0');
      maj.autoActive = Boolean(params.autoActive);
    }
    if (Object.prototype.hasOwnProperty.call(params, 'autoHeures')) {
      const h = Number.parseInt(params.autoHeures, 10);
      if (!Number.isFinite(h) || h < 1 || h > 720) {
        const erreur = new Error(
          'L’intervalle de sauvegarde automatique doit être un nombre ' +
          'd’heures entre 1 et 720.');
        erreur.code = 400;
        throw erreur;
      }
      parametres.ecrire(sauvegardeAuto.CLE_HEURES, h);
      maj.autoHeures = h;
    }
    if (typeof db.journaliser === 'function') {
      db.journaliser({
        qui: contexte?.utilisateur ?? null,
        action: 'CONFIG_SAUVEGARDE',
        details: JSON.stringify(maj)
      });
    }
    return HANDLERS.lireReglagesSauvegarde();
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
  //    Les routes de RÉGLAGE en sont exemptées (ne touchent pas la base fichier).
  if (!SANS_VERROU_CONCURRENCE.has(methode) && restauration.operationEnCours()) {
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
