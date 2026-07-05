'use strict';

/**
 * inerWeb Fluide — Restauration atomique « coffre-fort » (V9-E4.1).
 * ================================================================
 * LA SECONDE MOITIÉ de la fabrique : RESTAURER une sauvegarde sans jamais
 * perdre l'existant. C'EST le point dur du projet (VISION §4, docs/E4-PLAN
 * §"Restauration atomique — LE POINT DUR (Windows, base ouverte, WAL)").
 * Une seule erreur ici = perte de données. Le déroulé 0→6 ci-dessous est la
 * traduction FIDÈLE du plan, dans l'ordre, avec ses pièges bordés.
 *
 * INVARIANT GLOBAL (le contrat de non-perte) : à AUCUN instant il n'existe un
 * `data/inerweb-fluide.db` PARTIEL. Soit l'ancien ENTIER, soit le nouveau
 * ENTIER, soit RIEN (et `data/restauration-en-cours/` porte alors les deux
 * fichiers entiers et distincts, pour reprise au démarrage). On ne FUSIONNE
 * jamais deux bases : deux `.db` complets se remplacent, jamais ne se mêlent.
 * Les `-wal`/`-shm` sont TOUJOURS effacés avant toute réouverture (piège
 * mortel du WAL orphelin : un WAL de l'ancienne base rejoué sur la nouvelle
 * donnerait un hybride corrompu).
 *
 * Chemins de travail :
 *   data/inerweb-fluide.db (+ -wal/-shm) = base VIVE ;
 *   data/restauration-en-cours/          = zone de bascule (nouvelle/ancienne) ;
 *   backups/avant-restauration/          = filet AUTO non désactivable.
 *
 * Points VITAUX (relire E4-PLAN avant de toucher) :
 *   (0) lire le manifeste SANS écrire ; refuser une RÉGRESSION (l'archive a
 *       moins d'écritures figées que la base) sauf confirmePerte explicite ;
 *   (1) extraire la base HORS du chemin vif, sha256 === manifeste sinon
 *       ABANDON (base vive intacte), puis 3 vérifications sur la base TEMP
 *       AVANT toute bascule ;
 *   (2) sauvegarde de sécurité AUTO (échec = ABANDON : pas de filet, pas de
 *       restauration) ;
 *   (3) bascule par renommages sur cibles INEXISTANTES (contournement du
 *       rename-sur-cible-existante que NTFS refuse), WAL/-shm purgés ;
 *   (4) réouverture + 3 vérifications sur la base VIVE ;
 *   (5) rollback auto si rouge (rejoue le filet) ;
 *   (6) nettoyage + journal RESTAURATION.
 *
 * Zéro dépendance externe.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const db = require('./db.js');
const zip = require('./zip-node.js');
const { verifierIntegrite } = require('./verification.js');
const { relireManifeste } = require('./manifeste.js');
const sauvegarde = require('./sauvegarde.js');

// ------------------------------------------------------------
// Emplacements — dérivés du .db ouvert (jetable en test, réel en prod).
// data/ = dossier du .db ; restauration-en-cours/ et documents/ y vivent ;
// backups/avant-restauration/ est frère (sous backups/).
// ------------------------------------------------------------

/** Racine data/ (dossier du .db). */
function dossierData() {
  return path.dirname(db.cheminOuvert());
}

/** Zone de travail de bascule (deux .db entiers pendant l'échange). */
function dossierRestaurationEnCours() {
  return path.join(dossierData(), 'restauration-en-cours');
}

/** Dossier des pièces jointes (à côté de la base — cf. api.js). */
function dossierDocuments() {
  return path.join(dossierData(), 'documents');
}

/** Filet AUTO d'avant-restauration (sous backups/). */
function dossierAvantRestauration() {
  return path.join(sauvegarde.dossierBackups(), 'avant-restauration');
}

// ------------------------------------------------------------
// Empreintes.
// ------------------------------------------------------------

/** SHA-256 hexadécimal d'un fichier. */
function sha256Fichier(chemin) {
  return crypto.createHash('sha256')
    .update(fs.readFileSync(chemin)).digest('hex');
}

/** SHA-256 hexadécimal d'un tampon d'octets. */
function sha256Octets(octets) {
  return crypto.createHash('sha256').update(octets).digest('hex');
}

// ------------------------------------------------------------
// Drapeau anti-concurrence — Node est mono-fil, DatabaseSync synchrone :
// un booléen module suffit. Une restauration FERME la base : aucune autre
// opération E4 (ni mutation qui rouvrirait la base) ne doit s'intercaler.
// routes-sauvegarde.js s'appuie AUSSI sur operationEnCours() pour refuser
// une seconde opération avant même d'entrer ici.
// ------------------------------------------------------------

let operationE4EnCours = false;

/** Vrai si une opération E4 (sauvegarde/restauration/test) est en cours. */
function operationEnCours() {
  return operationE4EnCours;
}

/** Prend le verrou E4 (lève si déjà pris — jamais de réentrance). */
function prendreVerrou(quoi) {
  if (operationE4EnCours) {
    throw new Error(
      `Une opération de sauvegarde est déjà en cours : ${quoi} refusé ` +
      'tant qu\'elle n\'est pas terminée (une seule à la fois).');
  }
  operationE4EnCours = true;
}

/** Rend le verrou E4. */
function rendreVerrou() {
  operationE4EnCours = false;
}

// ------------------------------------------------------------
// Réessai borné sur les renames (antivirus / EPERM transitoire).
// Un fichier fraîchement écrit peut être brièvement tenu par un analyseur ;
// on réessaie quelques fois avec une courte pause active (aucune dépendance
// timer async ici — on est dans une séquence synchrone critique).
// ------------------------------------------------------------

/** Renomme avec réessais bornés (EPERM antivirus transitoire sous Windows). */
function renommerAvecReessai(source, cible, essais = 8) {
  let derniere = null;
  for (let i = 0; i < essais; i += 1) {
    try {
      fs.renameSync(source, cible);
      return;
    } catch (erreur) {
      derniere = erreur;
      if (i === essais - 1) break;
      const jusqua = Date.now() + 60;
      while (Date.now() < jusqua) { /* pause courte bornée */ }
    }
  }
  throw new Error(
    `Renommage impossible (${path.basename(source)} → ` +
    `${path.basename(cible)}) : ${derniere ? derniere.message : 'inconnu'}.`);
}

/** Supprime un fichier s'il existe, avec réessais bornés (verrou transitoire). */
function supprimerAvecReessai(chemin, essais = 8) {
  let derniere = null;
  for (let i = 0; i < essais; i += 1) {
    try {
      fs.rmSync(chemin, { force: true });
      return;
    } catch (erreur) {
      derniere = erreur;
      if (i === essais - 1) break;
      const jusqua = Date.now() + 60;
      while (Date.now() < jusqua) { /* pause courte bornée */ }
    }
  }
  throw new Error(
    `Suppression impossible (${path.basename(chemin)}) : ` +
    `${derniere ? derniere.message : 'inconnu'}.`);
}

/**
 * Efface les journaux WAL/SHM résiduels D'UNE base .db donnée. PIÈGE MORTEL
 * si on l'oublie : un `-wal` de l'ANCIENNE base survivant à côté de la
 * NOUVELLE serait rejoué à l'ouverture → hybride corrompu. Best-effort borné
 * (un fichier absent n'est pas une erreur).
 */
function effacerWalShm(cheminDb) {
  for (const suffixe of ['-wal', '-shm']) {
    const compagnon = cheminDb + suffixe;
    if (fs.existsSync(compagnon)) supprimerAvecReessai(compagnon);
  }
}

/** Supprime un dossier et tout son contenu (best-effort borné). */
function supprimerDossier(dossier) {
  if (!fs.existsSync(dossier)) return;
  fs.rmSync(dossier, { recursive: true, force: true });
}

// ------------------------------------------------------------
// Ouverture d'une base TEMP DÉDIÉE (jamais le singleton db.js).
// Sert aux 3 vérifications hors-base (étape 1) et à testerSauvegarde. La
// base est ouverte en simple lecture d'intégrité : on pose les PRAGMA
// indispensables au verdict (clés étrangères pour foreign_key_check ;
// recursive_triggers sans effet en lecture mais posé par cohérence). On
// n'écrit RIEN et on ferme toujours dans un finally.
// ------------------------------------------------------------

/**
 * Ouvre une base .db autonome en instance DÉDIÉE, passe verifierIntegrite,
 * ferme, renvoie le verdict. `readonly` par défaut (aucune écriture). La base
 * étant issue d'un VACUUM INTO, elle n'a ni -wal ni -shm : lecture directe.
 * @param {string} cheminDb
 * @returns {{ok: boolean, details: object}}
 */
function verifierBaseFichier(cheminDb) {
  const instance = new DatabaseSync(cheminDb, { readOnly: true });
  try {
    instance.exec('PRAGMA foreign_keys = ON;');
    return verifierIntegrite(instance);
  } finally {
    instance.close();
  }
}

// ------------------------------------------------------------
// Lecture des compteurs de la base VIVE (pour l'écran de comparaison et le
// journal avant/après). On lit `mouvementsValides` (le pivot de régression)
// et le total mouvements, via le singleton ouvert.
// ------------------------------------------------------------

/** Compteurs clés de la base actuellement ouverte (pivot anti-régression). */
function compteursBaseVive() {
  const instance = db.ouvrir();
  const valides = instance.prepare(
    "SELECT count(*) AS n FROM mouvements " +
    "WHERE statut IN ('VALIDE','ANNULE')").get().n;
  const total = instance.prepare(
    'SELECT count(*) AS n FROM mouvements').get().n;
  const journal = instance.prepare(
    'SELECT count(*) AS n FROM journal_audit').get().n;
  return {
    mouvements: total,
    mouvementsValides: valides,
    entreesJournal: journal
  };
}

// ------------------------------------------------------------
// (0) PRÉ-CONTRÔLES SANS ÉCRIRE — lire le manifeste, refuser une régression.
// ------------------------------------------------------------

/**
 * Lit et valide le manifeste de l'archive SANS rien extraire d'autre (via
 * zip.lireEntree — le manifeste est en tête). Renvoie le manifeste validé.
 * Une archive dont le manifeste manque ou est étranger est refusée AVANT
 * tout contact avec la base vive.
 * @param {string} cheminZip
 * @returns {object} manifeste validé
 */
function lireManifesteArchive(cheminZip) {
  if (!fs.existsSync(cheminZip)) {
    throw new Error(`Archive introuvable : ${cheminZip}.`);
  }
  const octets = zip.lireEntree(cheminZip, 'manifeste.json');
  if (!octets) {
    throw new Error(
      'Archive invalide : manifeste.json absent — ce fichier n\'est pas ' +
      'une sauvegarde inerWeb Fluide restaurable.');
  }
  return relireManifeste(JSON.parse(octets.toString('utf8')));
}

/**
 * Écran de comparaison (SANS écrire) : compteurs de l'ARCHIVE (manifeste)
 * face à ceux de la base VIVE. Détecte une RÉGRESSION = l'archive fige MOINS
 * d'écritures que la base (restaurer PERDRAIT des mouvements scellés). Le
 * pivot est `mouvementsValides` (VALIDE|ANNULE, jamais un brouillon).
 * @param {object} manifeste
 * @returns {{avant: object, archive: object, regression: boolean,
 *            ecrituresPerdues: number}}
 */
function comparerAvecBaseVive(manifeste) {
  const avant = compteursBaseVive();
  const archive = manifeste.compteurs;
  const ecrituresPerdues = Math.max(
    0, avant.mouvementsValides - archive.mouvementsValides);
  return {
    avant,
    archive,
    regression: ecrituresPerdues > 0,
    ecrituresPerdues
  };
}

// ------------------------------------------------------------
// (1) EXTRAIRE + VÉRIFIER HORS-BASE.
// ------------------------------------------------------------

/**
 * Extrait la base de l'archive vers `restauration-en-cours/nouvelle.db`
 * (CRC-32 par entrée vérifié par zip-node), contrôle son sha256 contre le
 * manifeste (divergence = ABANDON, base vive JAMAIS touchée), puis passe les
 * 3 vérifications sur cette base TEMP. Extrait aussi les documents/ dans la
 * zone de travail (ARCHIVE) et vérifie nombre + sha256Global.
 *
 * @param {string} cheminZip
 * @param {object} manifeste
 * @param {string} zone - dossier restauration-en-cours/
 * @returns {{cheminNouvelle: string, cheminDocumentsExtraits: string|null}}
 */
function extraireEtVerifierHorsBase(cheminZip, manifeste, zone) {
  // Zone de travail PROPRE (un reste d'une tentative précédente ne doit pas
  // polluer) — on repart d'un dossier vide.
  supprimerDossier(zone);
  fs.mkdirSync(zone, { recursive: true });

  // 1a. Extraire toutes les entrées (CRC-32 vérifié à l'écriture par
  //     zip.extraireVers). base/inerweb-fluide.db + manifeste.json
  //     [+ documents/<id> + config/ si ARCHIVE].
  const extraites = zip.extraireVers(cheminZip, zone);

  // 1b. Localiser la base extraite (base/inerweb-fluide.db) et la déplacer en
  //     nouvelle.db à plat dans la zone (nom canonique de la bascule).
  const baseExtraite = extraites.find(
    (e) => e.nom === 'base/' + manifeste.base.nomFichier
      || e.nom === 'base/inerweb-fluide.db');
  if (!baseExtraite) {
    throw new Error(
      'Archive invalide : la base (base/inerweb-fluide.db) est absente.');
  }
  const cheminNouvelle = path.join(zone, 'nouvelle.db');
  renommerAvecReessai(baseExtraite.chemin, cheminNouvelle);

  // 1c. sha256 de la base extraite === manifeste (le PIVOT pré-écrasement).
  //     Une divergence = archive douteuse → ABANDON, base vive intacte.
  const sha = sha256Fichier(cheminNouvelle);
  if (sha !== manifeste.base.sha256) {
    throw new Error(
      'Empreinte de la base restaurée non conforme au manifeste ' +
      `(attendu ${manifeste.base.sha256.slice(0, 12)}…, obtenu ` +
      `${sha.slice(0, 12)}…) : archive endommagée, restauration ABANDONNÉE ` +
      '(la base actuelle n\'a pas été touchée).');
  }

  // 1d. 3 vérifications sur la base TEMP, AVANT toute bascule. Une base
  //     restaurée qui ne passe pas l'intégrité ne remplacera jamais la vive.
  const verdict = verifierBaseFichier(cheminNouvelle);
  if (!verdict.ok) {
    throw new Error(
      'La base de l\'archive échoue aux vérifications d\'intégrité ' +
      `(${motifVerdict(verdict)}) : restauration ABANDONNÉE, base actuelle ` +
      'intacte.');
  }

  // 1e. Documents (ARCHIVE) : vérifier nombre + sha256Global contre le
  //     manifeste, sur les fichiers EXTRAITS (les CRC sont déjà validés).
  let cheminDocumentsExtraits = null;
  if (manifeste.type === 'ARCHIVE') {
    cheminDocumentsExtraits = path.join(zone, 'documents');
    verifierDocumentsExtraits(cheminDocumentsExtraits, manifeste);
  }

  return { cheminNouvelle, cheminDocumentsExtraits };
}

/** Motif humain d'un verdict rouge de verifierIntegrite (pour les messages). */
function motifVerdict(verdict) {
  const d = verdict.details;
  if (!d.integritePhysique.ok) {
    return `intégrité physique : ${d.integritePhysique.message}`;
  }
  if (!d.clesEtrangeres.ok) {
    return `clés étrangères : ${d.clesEtrangeres.violations} violation(s)`;
  }
  if (!d.chaineRegistre.ok) {
    return `chaîne du registre rompue à ${d.chaineRegistre.casseA}`;
  }
  if (!d.chaineJournal.ok) {
    return `chaîne du journal rompue à l'entrée ${d.chaineJournal.casseA}`;
  }
  return 'anomalie inconnue';
}

/**
 * Vérifie les documents extraits d'une ARCHIVE : le NOMBRE de fichiers sous
 * documents/ == manifeste.documents.nombre, et le sha256Global recomposé
 * (SHA-256 de la concaténation TRIÉE des sha256 par fichier) == celui du
 * manifeste. Détecte une PJ manquante/altérée sans ouvrir la base.
 * @param {string} dossierDocs - dossier documents/ extrait (peut ne pas exister si 0 PJ)
 * @param {object} manifeste
 */
function verifierDocumentsExtraits(dossierDocs, manifeste) {
  const attendu = manifeste.documents;
  const fichiers = fs.existsSync(dossierDocs)
    ? fs.readdirSync(dossierDocs).filter((n) => {
        const p = path.join(dossierDocs, n);
        return fs.statSync(p).isFile();
      })
    : [];
  if (fichiers.length !== attendu.nombre) {
    throw new Error(
      `Documents de l'archive incohérents : ${fichiers.length} fichier(s) ` +
      `présent(s) pour ${attendu.nombre} attendu(s) — restauration ABANDONNÉE.`);
  }
  const empreintes = fichiers
    .map((n) => sha256Fichier(path.join(dossierDocs, n)))
    .sort();
  const sha256Global = crypto.createHash('sha256')
    .update(empreintes.join(''), 'utf8').digest('hex');
  if (sha256Global !== attendu.sha256Global) {
    throw new Error(
      'Sceau global des documents non conforme au manifeste : une pièce ' +
      'jointe manque ou a été altérée — restauration ABANDONNÉE.');
  }
}

// ------------------------------------------------------------
// (3) BASCULE ATOMIQUE (le contournement NTFS) + documents.
// ------------------------------------------------------------

/**
 * Bascule : ferme la base, purge les WAL/-shm résiduels (piège mortel), sort
 * l'ancienne base HORS du chemin, met la nouvelle sur le chemin LIBRE, puis
 * bascule les documents par la même technique. Point d'injection possible
 * (`interrompreApres`) pour les tests de COUPURE — l'exception est levée
 * APRÈS l'étape nommée, la reprise au démarrage devant alors rétablir un état
 * cohérent (jamais un hybride).
 *
 * @param {string} cheminBaseVive - chemin du .db vif (déjà capturé AVANT fermer)
 * @param {string} cheminNouvelle - restauration-en-cours/nouvelle.db (vérifiée)
 * @param {string|null} cheminDocumentsExtraits - documents/ extrait (ARCHIVE)
 * @param {string} zone - restauration-en-cours/
 * @param {(etape: string) => void} [interrompreApres] - crochet de test
 */
function basculer(cheminBaseVive, cheminNouvelle, cheminDocumentsExtraits,
  zone, interrompreApres = () => {}) {
  const cheminAncienne = path.join(zone, 'ancienne.db');

  // a. Fermer la base VIVE (libère le verrou fichier Windows). db.js met son
  //    singleton à null ; on rouvrira explicitement le même chemin en (4).
  db.fermer();
  interrompreApres('fermeture');

  // b. Purger -wal/-shm résiduels de la base vive AVANT toute bascule.
  //    Sans ça, un WAL orphelin serait rejoué sur la nouvelle base.
  effacerWalShm(cheminBaseVive);
  interrompreApres('purge-wal');

  // c. Sortir l'ANCIENNE base du chemin (cible inexistante = rename sûr).
  //    Après ceci, data/inerweb-fluide.db N'EXISTE PLUS (état "rien" —
  //    la zone porte les DEUX bases entières : reprise possible).
  if (fs.existsSync(cheminBaseVive)) {
    // Si une ancienne.db traîne (tentative précédente), la dégager d'abord.
    if (fs.existsSync(cheminAncienne)) supprimerAvecReessai(cheminAncienne);
    renommerAvecReessai(cheminBaseVive, cheminAncienne);
  }
  interrompreApres('ancienne-sortie');

  // d. Poser la NOUVELLE base sur le chemin LIBRE (cible inexistante =
  //    rename quasi-atomique). data/inerweb-fluide.db = nouvelle ENTIÈRE.
  effacerWalShm(cheminBaseVive); // ceinture : aucun -wal ne doit rester
  renommerAvecReessai(cheminNouvelle, cheminBaseVive);
  interrompreApres('nouvelle-posee');

  // e. Basculer les documents/ (ARCHIVE) par la même technique : jamais
  //    par-dessus l'existant. On sort l'ancien dossier documents/ dans la
  //    zone (documents-ancien/) puis on pose le nouveau sur le chemin libre.
  if (cheminDocumentsExtraits && fs.existsSync(cheminDocumentsExtraits)) {
    const docsVifs = dossierDocuments();
    const docsAncien = path.join(zone, 'documents-ancien');
    if (fs.existsSync(docsVifs)) {
      if (fs.existsSync(docsAncien)) supprimerDossier(docsAncien);
      renommerAvecReessai(docsVifs, docsAncien);
    }
    renommerAvecReessai(cheminDocumentsExtraits, docsVifs);
  }
  interrompreApres('documents-bascules');
}

// ------------------------------------------------------------
// (2)+(4)+(5)+(6) — le déroulé complet.
// ------------------------------------------------------------

/**
 * RESTAURE une sauvegarde (le déroulé atomique 0→6 de E4-PLAN).
 *
 * @param {string} cheminZip - archive .zip à restaurer
 * @param {object} [options]
 * @param {string} [options.phrase] - phrase de déchiffrement (E4.2, ignorée en E4.1)
 * @param {boolean} [options.confirmePerte] - autorise une restauration qui
 *        RÉGRESSE (archive plus ancienne : perte d'écritures figées). Sans
 *        elle, une régression est REFUSÉE avant tout effet.
 * @param {(etape: string) => void} [options._interrompreApres] - crochet de
 *        TEST (injection d'exception à une étape nommée). Jamais en prod.
 * @param {(verdict: object) => object} [options._forcerVerdictVif] - crochet
 *        de TEST : remplace le verdict des 3 vérifications sur la base VIVE
 *        (étape 4) pour éprouver le rollback. Jamais en prod.
 * @returns {{ok: boolean, verdict: 'VERT'|'ROUGE', type: string,
 *            compteursAvant: object, compteursApres: object,
 *            cheminFiletSecurite: string, rollback?: boolean,
 *            motif?: string}}
 */
function restaurer(cheminZip, options = {}) {
  const {
    confirmePerte = false,
    _interrompreApres = () => {},
    _forcerVerdictVif = null
  } = options;

  prendreVerrou('restauration');
  // Capturer le chemin de la base VIVE AVANT toute fermeture (db.fermer()
  // nulle cheminBaseOuverte : le lire après serait le chemin par défaut).
  const cheminBaseVive = db.cheminOuvert();
  const zone = dossierRestaurationEnCours();
  let filet = null;

  try {
    // (0) PRÉ-CONTRÔLES SANS ÉCRIRE.
    const manifeste = lireManifesteArchive(cheminZip);
    const comparaison = comparerAvecBaseVive(manifeste);
    if (comparaison.regression && !confirmePerte) {
      throw new Error(
        `Restauration refusée : cette sauvegarde contient ` +
        `${manifeste.compteurs.mouvementsValides} écriture(s) figée(s), la ` +
        `base actuelle en compte ${comparaison.avant.mouvementsValides} — ` +
        `restaurer en perdrait ${comparaison.ecrituresPerdues}. Confirmez ` +
        'explicitement la perte pour continuer (confirmePerte).');
    }

    // (1) EXTRAIRE + VÉRIFIER HORS-BASE (base vive encore intacte ici).
    const { cheminNouvelle, cheminDocumentsExtraits } =
      extraireEtVerifierHorsBase(cheminZip, manifeste, zone);
    _interrompreApres('extraction-verifiee');

    // (2) SAUVEGARDE DE SÉCURITÉ AUTO, NON DÉSACTIVABLE. Échec = ABANDON :
    //     jamais de restauration sans filet. On archive l'état ACTUEL
    //     COMPLET (base + documents), par VACUUM INTO (cohérent), dans
    //     backups/avant-restauration/. La base vive est TOUJOURS ouverte
    //     à ce stade (on n'a encore rien basculé).
    filet = produireFiletSecurite();
    _interrompreApres('filet-cree');

    // (3) BASCULE ATOMIQUE. À partir d'ici la base vive change de fichier ;
    //     une coupure laisse la zone avec deux .db entiers (reprise).
    basculer(cheminBaseVive, cheminNouvelle, cheminDocumentsExtraits, zone,
      _interrompreApres);

    // (4) ROUVRIR + 3 VÉRIFICATIONS SUR LA BASE VIVE.
    db.ouvrir(cheminBaseVive);
    _interrompreApres('reouverture');
    let verdictVif = verifierBaseVive();
    if (_forcerVerdictVif) verdictVif = _forcerVerdictVif(verdictVif);

    if (!verdictVif.ok) {
      // (5) ROLLBACK AUTO : rejouer le filet de sécurité par le MÊME chemin.
      const motif = motifVerdict(verdictVif);
      rollbackDepuisFilet(cheminBaseVive, filet.chemin, zone);
      const compteursApres = compteursBaseVive();
      db.journaliser({
        qui: 'système',
        action: 'RESTAURATION',
        cible: path.basename(cheminZip),
        details: `ÉCHEC (${motif}) · rollback rejoué depuis ` +
          `${path.basename(filet.chemin)} · ` +
          `${compteursApres.mouvementsValides} écriture(s) figée(s) après ` +
          'retour à l\'état d\'avant restauration'
      });
      // (6') Nettoyage (le filet est CONSERVÉ).
      supprimerDossier(zone);
      return {
        ok: false,
        verdict: 'ROUGE',
        type: manifeste.type,
        compteursAvant: comparaison.avant,
        compteursApres,
        cheminFiletSecurite: filet.chemin,
        rollback: true,
        motif
      };
    }

    // (6) NETTOYAGE + JOURNAL RESTAURATION (le filet est CONSERVÉ).
    const compteursApres = compteursBaseVive();
    db.journaliser({
      qui: 'système',
      action: 'RESTAURATION',
      cible: path.basename(cheminZip),
      details: `${manifeste.type} · restaurée · ` +
        `${comparaison.avant.mouvementsValides} → ` +
        `${compteursApres.mouvementsValides} écriture(s) figée(s) · ` +
        `filet ${path.basename(filet.chemin)} conservé`
    });
    supprimerDossier(zone);

    return {
      ok: true,
      verdict: 'VERT',
      type: manifeste.type,
      compteursAvant: comparaison.avant,
      compteursApres,
      cheminFiletSecurite: filet.chemin
    };
  } catch (erreur) {
    // Toute exception AVANT la bascule (0,1,2) laisse la base vive intacte et
    // ouverte : on nettoie seulement la zone. Une exception PENDANT la bascule
    // laisse un état intermédiaire à rétablir proprement.
    if (baseViveManquante(cheminBaseVive)) {
      // Base vive ABSENTE (coupure entre sortie de l'ancienne et pose de la
      // nouvelle) : NE PAS nettoyer la zone — elle porte les deux .db entiers,
      // c'est le filet de reprise au prochain démarrage. On relance l'erreur.
      throw erreur;
    }
    // Base vive PRÉSENTE. Deux sous-cas :
    //  - la NOUVELLE base est DÉJÀ posée (nouvelle.db a quitté la zone) mais
    //    les documents n'ont pas fini de basculer : on TERMINE le basculement
    //    des documents, sinon la nouvelle base garderait les anciens documents
    //    (idempotent, non lossy) ;
    //  - sinon (nouvelle.db encore en zone : la base présente est l'ANCIENNE,
    //    aucune bascule aboutie), la base est intacte : on NE TOUCHE PAS aux
    //    documents (les basculer poserait le nouveau lot sur l'ancienne base)
    //    et on nettoie la zone.
    // Le marqueur décisif = nouvelle.db ABSENTE de la zone ⇔ base déjà posée.
    const baseDejaPosee = !fs.existsSync(path.join(zone, 'nouvelle.db'));
    const docsEnAttente = path.join(zone, 'documents');
    const docsDejaBascules = path.join(zone, 'documents-ancien');
    if (baseDejaPosee && fs.existsSync(docsEnAttente)
      && !fs.existsSync(docsDejaBascules)) {
      try {
        const docsVifs = dossierDocuments();
        if (fs.existsSync(docsVifs)) supprimerDossier(docsVifs);
        renommerAvecReessai(docsEnAttente, docsVifs);
      } catch { /* au pire, la reprise au démarrage terminera */ }
    }
    // Rouvrir la base si elle a été fermée pendant la bascule (ne pas laisser
    // le singleton mort).
    if (!db.estOuverte() && fs.existsSync(cheminBaseVive)) {
      try { db.ouvrir(cheminBaseVive); } catch { /* rouverte au mieux */ }
    }
    supprimerDossier(zone);
    throw erreur;
  } finally {
    rendreVerrou();
  }
}

/** Vrai si le fichier de base vive n'existe pas (bascule entamée). */
function baseViveManquante(cheminBaseVive) {
  return !fs.existsSync(cheminBaseVive);
}

/**
 * Produit le filet de sécurité AUTO (état ACTUEL complet) dans
 * backups/avant-restauration/. Réutilise la fabrique (VACUUM INTO cohérent,
 * base + documents + config + manifeste), puis DÉPLACE l'archive produite
 * sous avant-restauration/ (nom avant-<horodatage>.zip). Échec ici = l'appelant
 * ABANDONNE (pas de filet, pas de restauration).
 * @returns {{chemin: string, manifeste: object}}
 */
function produireFiletSecurite() {
  fs.mkdirSync(dossierAvantRestauration(), { recursive: true });
  // La fabrique écrit dans backups/archives/ ; on rapatrie sous
  // avant-restauration/ pour bien distinguer le filet des sauvegardes
  // normales (il ne doit JAMAIS être purgé par la rotation GFS).
  const produit = sauvegarde.sauvegarderArchive();
  const base = path.basename(produit.chemin)
    .replace(/-archive-[0-9a-f]{6}\.zip$/, '')
    .replace(/\.zip$/, '');
  const cible = path.join(
    dossierAvantRestauration(), `avant-${base}.zip`);
  const cibleUnique = fs.existsSync(cible)
    ? path.join(dossierAvantRestauration(),
        `avant-${base}-${crypto.randomBytes(3).toString('hex')}.zip`)
    : cible;
  renommerAvecReessai(produit.chemin, cibleUnique);
  return { chemin: cibleUnique, manifeste: produit.manifeste };
}

/**
 * Les 3 vérifications sur la base VIVE (via getEtatRegistre d'api.js pour la
 * chaîne registre+journal, + les PRAGMA physiques via une instance dédiée en
 * lecture seule sur le MÊME fichier). On n'ouvre pas deux fois le singleton :
 * on lit l'état registre par api (qui utilise le singleton) et on complète
 * par les PRAGMA sur une instance de lecture — le fichier issu du VACUUM n'a
 * pas de WAL, la lecture concurrente est sûre.
 * @returns {{ok: boolean, details: object}}
 */
function verifierBaseVive() {
  // integrity_check + foreign_key_check + chaînes, le tout sur le fichier
  // vif. On passe par une instance dédiée lecture seule : verifierIntegrite
  // fait les 4 contrôles d'un bloc, exactement comme sur la base TEMP.
  return verifierBaseFichier(db.cheminOuvert());
}

/**
 * ROLLBACK : la base vive vient d'être jugée ROUGE après bascule. On rétablit
 * l'état d'AVANT en rejouant le filet de sécurité par le MÊME chemin de
 * bascule (extraire → vérifier hors-base → fermer → purger WAL → sortir la
 * mauvaise → poser l'ancienne). Le filet ayant été produit par la fabrique,
 * il est intègre par construction ; on le re-vérifie tout de même.
 * @param {string} cheminBaseVive
 * @param {string} cheminFilet - backups/avant-restauration/avant-….zip
 * @param {string} zone - restauration-en-cours/
 */
function rollbackDepuisFilet(cheminBaseVive, cheminFilet, zone) {
  const manifesteFilet = lireManifesteArchive(cheminFilet);
  const zoneRollback = path.join(zone, 'rollback');
  const { cheminNouvelle, cheminDocumentsExtraits } =
    extraireEtVerifierHorsBase(cheminFilet, manifesteFilet, zoneRollback);
  basculer(cheminBaseVive, cheminNouvelle, cheminDocumentsExtraits,
    zoneRollback);
  db.ouvrir(cheminBaseVive);
  const verdict = verifierBaseVive();
  if (!verdict.ok) {
    // Catastrophe théorique (le filet lui-même est corrompu) : on ne masque
    // pas — mieux vaut une erreur bruyante qu'une base silencieusement fausse.
    throw new Error(
      'Rollback impossible : le filet de sécurité échoue lui-même aux ' +
      `vérifications (${motifVerdict(verdict)}). État à inspecter ` +
      'manuellement (filet conservé sous backups/avant-restauration/).');
  }
}

// ------------------------------------------------------------
// REPRISE AU DÉMARRAGE — data/inerweb-fluide.db absent ET
// restauration-en-cours/ présent = une bascule a été coupée. On REPREND
// (poser la nouvelle si elle est là et vérifiée) ou on ROLLBACK (reposer
// l'ancienne). Idempotent : rappelable sans dégât.
// ------------------------------------------------------------

/**
 * Reprend une restauration interrompue, appelée au DÉMARRAGE du serveur
 * AVANT toute ouverture de la base. Détermine l'état depuis les fichiers
 * présents dans restauration-en-cours/ :
 *   - la base vive existe déjà → rien à reprendre (cas normal) ;
 *   - base vive absente + nouvelle.db présente et VÉRIFIÉE → on la pose
 *     (la restauration était presque finie : on la termine) ;
 *   - base vive absente + nouvelle.db absente/invalide + ancienne.db présente
 *     → on repose l'ancienne (ROLLBACK : retour à l'état d'avant) ;
 *   - base vive absente et zone vide → rien à faire (base neuve au 1er lancement).
 * Ne lève jamais pour un cas normal ; nettoie la zone une fois l'état rétabli.
 *
 * @param {string} [cheminBase] - chemin de la base (défaut db.CHEMIN_BASE_DEFAUT)
 * @returns {{repris: boolean, action: string}}
 */
function reprendreRestaurationInterrompue(cheminBase = db.CHEMIN_BASE_DEFAUT) {
  const zone = path.join(path.dirname(cheminBase), 'restauration-en-cours');
  if (!fs.existsSync(zone)) {
    return { repris: false, action: 'aucune-reprise' };
  }
  // Base vive présente : soit la bascule n'avait pas commencé à toucher le
  // chemin (base = ancienne, zone = simple reste), soit la nouvelle base est
  // DÉJÀ posée et la coupure a frappé AVANT le basculement des documents (le
  // seul cas où « base présente » ne signifie pas « tout fini »). On détecte
  // ce cas — nouveau lot documents/ en attente, pas encore d'ancien mis de
  // côté — et on TERMINE le basculement des documents (idempotent) avant de
  // nettoyer, plutôt que de discarder un lot déjà extrait et vérifié.
  if (fs.existsSync(cheminBase)) {
    effacerWalShm(cheminBase); // purge défensive avant tout db.ouvrir ultérieur
    // Ne compléter le basculement des documents QUE si la nouvelle base est
    // déjà posée (nouvelle.db absente de la zone). Si nouvelle.db est encore
    // là, la base présente est l'ANCIENNE : poser le nouveau lot de documents
    // dessus créerait une incohérence — on n'y touche pas.
    const baseDejaPosee = !fs.existsSync(path.join(zone, 'nouvelle.db'));
    const cheminDocsEnAttente = path.join(zone, 'documents');
    const cheminDocsDejaBascules = path.join(zone, 'documents-ancien');
    if (baseDejaPosee && fs.existsSync(cheminDocsEnAttente)
      && !fs.existsSync(cheminDocsDejaBascules)) {
      const docsVifs = path.join(path.dirname(cheminBase), 'documents');
      if (fs.existsSync(docsVifs)) supprimerDossier(docsVifs);
      renommerAvecReessai(cheminDocsEnAttente, docsVifs);
      supprimerDossier(zone);
      return { repris: true, action: 'documents-termines' };
    }
    supprimerDossier(zone);
    return { repris: false, action: 'zone-residuelle-nettoyee' };
  }

  const cheminNouvelle = path.join(zone, 'nouvelle.db');
  const cheminAncienne = path.join(zone, 'ancienne.db');
  const cheminDocsExtraits = path.join(zone, 'documents');
  const cheminDocsAncien = path.join(zone, 'documents-ancien');

  // Cas 1 : la nouvelle base est là ET passe l'intégrité → TERMINER la pose.
  if (fs.existsSync(cheminNouvelle) && baseFichierSaine(cheminNouvelle)) {
    effacerWalShm(cheminBase);
    renommerAvecReessai(cheminNouvelle, cheminBase);
    // Documents : si le nouveau lot est là, le poser ; sinon garder l'existant.
    if (fs.existsSync(cheminDocsExtraits)) {
      const docsVifs = path.join(path.dirname(cheminBase), 'documents');
      if (fs.existsSync(docsVifs)) supprimerDossier(docsVifs);
      renommerAvecReessai(cheminDocsExtraits, docsVifs);
    }
    supprimerDossier(zone);
    return { repris: true, action: 'nouvelle-posee' };
  }

  // Cas 2 : rollback — reposer l'ANCIENNE base (retour à l'état d'avant).
  if (fs.existsSync(cheminAncienne)) {
    effacerWalShm(cheminBase);
    renommerAvecReessai(cheminAncienne, cheminBase);
    if (fs.existsSync(cheminDocsAncien)) {
      const docsVifs = path.join(path.dirname(cheminBase), 'documents');
      if (fs.existsSync(docsVifs)) supprimerDossier(docsVifs);
      renommerAvecReessai(cheminDocsAncien, docsVifs);
    }
    supprimerDossier(zone);
    return { repris: true, action: 'ancienne-reposee' };
  }

  // Cas 3 : ni nouvelle exploitable ni ancienne — zone inexploitable. On la
  // conserve (pour inspection) plutôt que de détruire une éventuelle preuve,
  // et on laisse db.ouvrir recréer un socle vierge si vraiment rien n'existe.
  return { repris: false, action: 'zone-inexploitable-conservee' };
}

/** Vrai si un fichier .db autonome passe verifierIntegrite (instance dédiée). */
function baseFichierSaine(cheminDb) {
  try {
    return verifierBaseFichier(cheminDb).ok;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------
// (g) TESTER UNE SAUVEGARDE — sans jamais toucher la base courante.
// ------------------------------------------------------------

/**
 * Ouvre une sauvegarde dans une base TEMP en LECTURE SEULE (instance
 * DatabaseSync DÉDIÉE, JAMAIS le singleton db.js) et rend un verdict
 * VERT/ROUGE. « Une sauvegarde jamais testée n'est qu'un espoir » (VISION
 * §4.3). Déroulé : lire le manifeste (en tête) → extraire la base dans un
 * dossier temp jetable → sha256 === manifeste → verifierIntegrite (3 vérifs)
 * → si ARCHIVE, documents nombre + sha256Global → verdict. La base courante
 * n'est NI ouverte NI fermée NI écrite. En cas de succès, la date du dernier
 * test OK est inscrite dans `parametres` (dernier_test_sauvegarde_ok).
 *
 * @param {string} cheminZip
 * @param {object} [options]
 * @param {string} [options.phrase] - déchiffrement (E4.2, ignoré en E4.1)
 * @returns {{verdict: 'VERT'|'ROUGE', type: string, compteurs: object,
 *            details: object, motif: string|null}}
 */
function testerSauvegarde(cheminZip, options = {}) {
  prendreVerrou('test de sauvegarde');
  const dossierTest = fs.mkdtempSync(
    path.join(require('node:os').tmpdir(), 'inerweb-fluide-test-'));
  try {
    const manifeste = lireManifesteArchive(cheminZip);
    // Extraire dans le dossier temp jetable (CRC-32 vérifié par zip-node).
    const extraites = zip.extraireVers(cheminZip, dossierTest);
    const baseExtraite = extraites.find(
      (e) => e.nom === 'base/' + manifeste.base.nomFichier
        || e.nom === 'base/inerweb-fluide.db');
    if (!baseExtraite) {
      return rougeTest(manifeste, 'base absente de l\'archive');
    }
    // sha256 === manifeste (le pivot).
    const sha = sha256Fichier(baseExtraite.chemin);
    if (sha !== manifeste.base.sha256) {
      return rougeTest(manifeste,
        'empreinte de la base non conforme au manifeste (archive endommagée)');
    }
    // 3 vérifications sur la base TEMP en LECTURE SEULE (instance dédiée).
    const verdict = verifierBaseFichier(baseExtraite.chemin);
    if (!verdict.ok) {
      return {
        verdict: 'ROUGE',
        type: manifeste.type,
        compteurs: manifeste.compteurs,
        details: verdict.details,
        motif: motifVerdict(verdict)
      };
    }
    // Documents (ARCHIVE) : nombre + sha256Global.
    if (manifeste.type === 'ARCHIVE') {
      try {
        verifierDocumentsExtraits(
          path.join(dossierTest, 'documents'), manifeste);
      } catch (erreur) {
        return rougeTest(manifeste, erreur.message);
      }
    }
    // VERT : inscrire la date du dernier test OK (n'écrit QUE parametres, sur
    // la base COURANTE — jamais l'archive). Best-effort : un échec d'écriture
    // du témoin ne rend pas le test rouge (le verdict porte sur l'archive).
    try { inscrireDernierTestOk(); } catch { /* témoin best-effort */ }
    return {
      verdict: 'VERT',
      type: manifeste.type,
      compteurs: manifeste.compteurs,
      details: verdict.details,
      motif: null
    };
  } finally {
    supprimerDossier(dossierTest);
    rendreVerrou();
  }
}

/** Fabrique un verdict ROUGE de test avec un motif (base non ouverte). */
function rougeTest(manifeste, motif) {
  return {
    verdict: 'ROUGE',
    type: manifeste.type,
    compteurs: manifeste.compteurs,
    details: null,
    motif
  };
}

/**
 * Inscrit l'horodatage ISO du dernier test réussi dans parametres
 * (dernier_test_sauvegarde_ok). Écriture MINIMALE sur la base courante, hors
 * chaîne d'audit (un témoin technique, pas un événement métier). Idempotent
 * (INSERT OR REPLACE sur une clé de paramètre).
 */
function inscrireDernierTestOk() {
  const instance = db.ouvrir();
  instance.prepare(
    `INSERT INTO parametres (cle, valeur) VALUES (?, ?)
     ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur`)
    .run('dernier_test_sauvegarde_ok', new Date().toISOString());
}

module.exports = {
  restaurer,
  testerSauvegarde,
  reprendreRestaurationInterrompue,
  operationEnCours,
  // Exposés pour les tests (injection de coupure, vérifs ciblées).
  dossierRestaurationEnCours,
  dossierAvantRestauration,
  verifierBaseFichier
};
