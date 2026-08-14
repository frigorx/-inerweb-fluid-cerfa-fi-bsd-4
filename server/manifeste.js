// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
'use strict';

/**
 * inerWeb Fluide — Manifeste de sauvegarde (V9-E4.1, coffre-fort).
 * ================================================================
 * « Ce qui transforme un ZIP en preuve » (VISION §4.2). Le manifeste est un
 * objet JSON EN CLAIR, placé en TÊTE de chaque archive (et, en E4.2, en tête
 * du fichier chiffré — jamais chiffré, sans donnée sensible). Il permet de
 * répondre « voilà ce qui s'est passé, à telle date » SANS restaurer, et de
 * détecter une restauration qui régresse (« 588 mouvements dans l'archive,
 * 590 en base → restaurer perd 2 écritures, confirmer ? »).
 *
 * Schéma FIGÉ (versionné par `versionManifeste`) — cf. docs/E4-PLAN.md :
 *   format, versionManifeste, type (SNAPSHOT|ARCHIVE), horodatage (ISO UTC),
 *   versionApp, versionBase ;
 *   base : { nomFichier, tailleOctets, sha256 }  ← sha256 du .db issu du
 *          VACUUM, calculé APRÈS écriture : le pivot de la vérification
 *          pré-écrasement (une archive dont la base ne colle pas est refusée
 *          avant de toucher la base vivante) ;
 *   integrite : { chaineRegistreOk, chaineJournalOk, dernierHashRegistre,
 *                 dernierHashJournal } ;
 *   compteurs : { machines, bouteilles, mouvements, mouvementsValides,
 *                 controles, personnelActif, clients, documents,
 *                 entreesJournal }  ← mouvementsValides = count statut
 *                 VALIDE|ANNULE, le pivot de la détection de régression ;
 *   documents (si ARCHIVE) : { nombre, tailleTotaleOctets, sha256Global }
 *          ← sha256Global = SHA-256 de la concaténation TRIÉE des sha256 par
 *          PJ : détecte une PJ manquante sans tout rouvrir ;
 *   chiffrement : { actif, algorithme, kdf, kdfParams, indice }.
 *
 * `construireManifeste(instance, …)` calcule les compteurs par des COUNT SQL
 * directs sur l'instance passée (jamais le singleton — cohérent avec
 * verification.js). `relireManifeste(objet)` relit et VALIDE un manifeste lu
 * dans une archive (format/version reconnus, champs obligatoires présents).
 *
 * Zéro dépendance externe (node:crypto uniquement).
 */

const crypto = require('node:crypto');
const { verifierIntegrite } = require('./verification.js');

/** Étiquette de format (constante, sert de garde à la relecture). */
const FORMAT_MANIFESTE = 'inerweb-fluide-sauvegarde';

/** Version du SCHÉMA de manifeste (incrémentée si le schéma évolue). */
const VERSION_MANIFESTE = 1;

/** Version applicative embarquée (miroir de la version d'export du contrat). */
const VERSION_APP = 8;

/** Nom canonique du fichier base dans l'archive (VISION §4.2 : base/…). */
const NOM_FICHIER_BASE = 'inerweb-fluide.db';

/** Types de sauvegarde admis. */
const TYPES_SAUVEGARDE = ['SNAPSHOT', 'ARCHIVE'];

// ------------------------------------------------------------
// Compteurs — COUNT SQL directs sur l'instance.
// ------------------------------------------------------------

/** Renvoie l'entier d'un `SELECT count(*) AS n …`. */
function compter(instance, sql) {
  return instance.prepare(sql).get().n;
}

/**
 * Les neuf compteurs du manifeste, comptés sur l'instance. `mouvements` =
 * total ; `mouvementsValides` = écritures FIGÉES (VALIDE|ANNULE), le pivot
 * anti-régression. `documents` = pièces jointes (cohérent avec
 * documents.nombre pour une ARCHIVE).
 */
function compterTout(instance) {
  return {
    machines: compter(instance, 'SELECT count(*) AS n FROM machines'),
    bouteilles: compter(instance, 'SELECT count(*) AS n FROM bouteilles'),
    mouvements: compter(instance, 'SELECT count(*) AS n FROM mouvements'),
    mouvementsValides: compter(instance,
      "SELECT count(*) AS n FROM mouvements WHERE statut IN ('VALIDE','ANNULE')"),
    controles: compter(instance, 'SELECT count(*) AS n FROM controles'),
    personnelActif: compter(instance,
      'SELECT count(*) AS n FROM personnel WHERE actif = 1'),
    clients: compter(instance,
      'SELECT count(*) AS n FROM clients_detenteurs'),
    documents: compter(instance, 'SELECT count(*) AS n FROM pieces_jointes'),
    entreesJournal: compter(instance,
      'SELECT count(*) AS n FROM journal_audit')
  };
}

/**
 * Derniers maillons des deux chaînes : la dernière empreinte du REGISTRE
 * (ordre_validation max) et du JOURNAL (id max). null si la chaîne est vide.
 */
function derniersHash(instance) {
  const registre = instance.prepare(
    `SELECT hash_ecriture FROM mouvements
     WHERE statut IN ('VALIDE','ANNULE') AND ordre_validation IS NOT NULL
     ORDER BY ordre_validation DESC LIMIT 1`).get();
  const journal = instance.prepare(
    `SELECT hash FROM journal_audit
     WHERE hash IS NOT NULL ORDER BY id DESC LIMIT 1`).get();
  return {
    dernierHashRegistre: registre?.hash_ecriture ?? null,
    dernierHashJournal: journal?.hash ?? null
  };
}

// ------------------------------------------------------------
// Construction.
// ------------------------------------------------------------

/**
 * Bloc `chiffrement` par défaut : NON chiffré (E4.1). Les paramètres KDF sont
 * inscrits dès maintenant (schéma figé) même inactifs : E4.2 basculera
 * `actif` à true sans changer la forme. Aucun secret ici.
 */
function chiffrementParDefaut(indice = null) {
  return {
    actif: false,
    algorithme: 'AES-256-GCM',
    kdf: 'scrypt',
    kdfParams: { N: 32768, r: 8, p: 1, selLongueur: 16 },
    indice
  };
}

/**
 * Construit le manifeste d'une sauvegarde à partir de la base issue du
 * VACUUM (fichier .db autonome) et de l'instance qui l'a produite.
 *
 * Le sha256 de la base est calculé sur le FICHIER `cheminBaseVacuum` (le .db
 * qui partira dans l'archive), APRÈS son écriture — c'est l'empreinte qu'on
 * revérifiera à la restauration avant tout écrasement. Les compteurs et les
 * chaînes sont lus sur `instance` (la base vivante au moment du VACUUM ; ses
 * compteurs sont identiques à ceux du .db copié, capture cohérente).
 *
 * @param {import('node:sqlite').DatabaseSync} instance - base vivante (source)
 * @param {object} options
 * @param {'SNAPSHOT'|'ARCHIVE'} options.type
 * @param {string} options.cheminBaseVacuum - chemin du .db issu du VACUUM
 * @param {number} options.tailleBaseOctets - taille de ce .db (déjà connue)
 * @param {string} options.sha256Base - SHA-256 hexadécimal de ce .db
 * @param {number} options.versionBase - user_version de la base au VACUUM
 * @param {Array<{sha256: string, taille: number}>} [options.documents]
 *        pièces jointes incluses (ARCHIVE seulement) — pour sha256Global.
 * @param {string|null} [options.indice] - indice de chiffrement non secret.
 * @param {Date} [options.horodatage] - instant de la sauvegarde (défaut now).
 * @returns {object} manifeste (schéma figé)
 */
function construireManifeste(instance, options) {
  const {
    type, sha256Base, tailleBaseOctets, versionBase,
    documents = null, indice = null, horodatage = new Date()
  } = options;

  if (!TYPES_SAUVEGARDE.includes(type)) {
    throw new Error(
      `Type de sauvegarde inconnu : ${type} ` +
      `(attendu : ${TYPES_SAUVEGARDE.join(' ou ')}).`);
  }
  if (typeof sha256Base !== 'string' || !/^[0-9a-f]{64}$/.test(sha256Base)) {
    throw new Error('construireManifeste : sha256 de la base absent ou invalide.');
  }

  const compteurs = compterTout(instance);
  const integrite = verifierIntegrite(instance);
  const { dernierHashRegistre, dernierHashJournal } = derniersHash(instance);

  const manifeste = {
    format: FORMAT_MANIFESTE,
    versionManifeste: VERSION_MANIFESTE,
    type,
    horodatage: horodatage.toISOString(), // ISO UTC (tri), jamais l'heure locale
    versionApp: VERSION_APP,
    versionBase,
    base: {
      nomFichier: NOM_FICHIER_BASE,
      tailleOctets: tailleBaseOctets,
      sha256: sha256Base
    },
    integrite: {
      chaineRegistreOk: integrite.details.chaineRegistre.ok,
      chaineJournalOk: integrite.details.chaineJournal.ok,
      dernierHashRegistre,
      dernierHashJournal
    },
    compteurs,
    chiffrement: chiffrementParDefaut(indice)
  };

  if (type === 'ARCHIVE') {
    manifeste.documents = resumeDocuments(documents ?? [], compteurs.documents);
  }

  return manifeste;
}

/**
 * Résumé `documents` d'une ARCHIVE. `sha256Global` = SHA-256 de la
 * concaténation TRIÉE (ordre lexicographique) des sha256 individuels : deux
 * archives contenant les mêmes PJ produisent le même sceau global, quel que
 * soit l'ordre d'ajout ; une PJ manquante ou altérée le change. Une archive
 * sans PJ a un `sha256Global` du vide (SHA-256 de la chaîne vide) — stable.
 * @param {Array<{sha256: string, taille: number}>} documents
 * @param {number} nombreAttendu - compteurs.documents (garde de cohérence)
 */
function resumeDocuments(documents, nombreAttendu) {
  if (documents.length !== nombreAttendu) {
    throw new Error(
      `Incohérence documents : ${documents.length} pièce(s) fournie(s) pour ` +
      `${nombreAttendu} attendue(s) — refus de sceller un manifeste faux.`);
  }
  const empreintes = documents.map((d) => d.sha256).sort();
  const sha256Global = crypto.createHash('sha256')
    .update(empreintes.join(''), 'utf8').digest('hex');
  const tailleTotaleOctets = documents.reduce((s, d) => s + (d.taille ?? 0), 0);
  return { nombre: documents.length, tailleTotaleOctets, sha256Global };
}

// ------------------------------------------------------------
// Relecture / validation.
// ------------------------------------------------------------

/**
 * Relit et VALIDE un manifeste lu dans une archive. Vérifie que c'est bien
 * un manifeste inerWeb Fluide d'une version reconnue, et que les champs
 * OBLIGATOIRES sont présents (structure minimale sur laquelle la
 * restauration s'appuiera). Lève un Error explicite sinon — la restauration
 * refuse d'agir sur un manifeste douteux AVANT de toucher quoi que ce soit.
 *
 * NE recalcule PAS les hash (c'est le rôle de la restauration, sur la base
 * extraite) : ici on garantit seulement que l'objet a la bonne FORME.
 * @param {object} objet - manifeste désérialisé
 * @returns {object} le manifeste, si valide
 */
function relireManifeste(objet) {
  if (!objet || typeof objet !== 'object') {
    throw new Error('Manifeste illisible ou absent.');
  }
  if (objet.format !== FORMAT_MANIFESTE) {
    throw new Error(
      `Manifeste étranger (format « ${objet.format ?? '?'} ») : ` +
      'ce fichier n\'est pas une sauvegarde inerWeb Fluide.');
  }
  if (objet.versionManifeste !== VERSION_MANIFESTE) {
    throw new Error(
      `Version de manifeste non gérée : ${objet.versionManifeste} ` +
      `(cette version lit ${VERSION_MANIFESTE}).`);
  }
  if (!TYPES_SAUVEGARDE.includes(objet.type)) {
    throw new Error(`Type de sauvegarde inconnu au manifeste : ${objet.type}.`);
  }
  const base = objet.base;
  if (!base || typeof base.sha256 !== 'string'
    || !/^[0-9a-f]{64}$/.test(base.sha256) || !base.nomFichier) {
    throw new Error(
      'Manifeste incomplet : bloc « base » (nomFichier + sha256) manquant ou invalide.');
  }
  if (!objet.integrite || !objet.compteurs) {
    throw new Error(
      'Manifeste incomplet : blocs « integrite » et « compteurs » requis.');
  }
  if (objet.type === 'ARCHIVE') {
    const d = objet.documents;
    if (!d || typeof d.nombre !== 'number'
      || typeof d.sha256Global !== 'string') {
      throw new Error(
        'Manifeste d\'archive incomplet : bloc « documents » (nombre + sha256Global) requis.');
    }
  }
  return objet;
}

module.exports = {
  FORMAT_MANIFESTE,
  VERSION_MANIFESTE,
  VERSION_APP,
  NOM_FICHIER_BASE,
  TYPES_SAUVEGARDE,
  construireManifeste,
  relireManifeste,
  resumeDocuments
};
