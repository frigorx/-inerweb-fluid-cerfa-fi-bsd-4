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
const chiffrement = require('./chiffrement.js');
const { verifierIntegrite } = require('./verification.js');
const { relireManifeste } = require('./manifeste.js');
const sauvegarde = require('./sauvegarde.js');

// ------------------------------------------------------------
// Emplacements — dérivés du .db ouvert (jetable en test, réel en prod).
// data/ = dossier du .db ; restauration-en-cours/ et documents/ y vivent ;
// backups/avant-restauration/ est frère (sous backups/).
//
// PIÈGE MORTEL (revue adversariale E4.1) : db.cheminOuvert() retourne le
// CHEMIN PAR DÉFAUT (data/ RÉEL du dépôt) dès que la base est FERMÉE
// (db.fermer() nulle cheminBaseOuverte). Or la restauration FERME la base
// pour basculer le fichier. Recalculer un chemin via ces fonctions APRÈS la
// fermeture viserait donc data/ RÉEL — corruption/perte en test ET latent en
// prod. RÈGLE : restaurer() capture TOUS les chemins dérivés AU DÉBUT (base
// encore ouverte) via capturerChemins() et les passe en paramètres ; on ne
// dérive JAMAIS un chemin de bascule via cheminOuvert() après db.fermer().
// ------------------------------------------------------------

/** Racine data/ (dossier du .db) — À N'UTILISER QUE base OUVERTE. */
function dossierData() {
  return path.dirname(db.cheminOuvert());
}

/** Zone de travail de bascule — À N'UTILISER QUE base OUVERTE (cf. capturerChemins). */
function dossierRestaurationEnCours() {
  return path.join(dossierData(), 'restauration-en-cours');
}

/** Filet AUTO d'avant-restauration (sous backups/) — base OUVERTE seulement. */
function dossierAvantRestauration() {
  return path.join(sauvegarde.dossierBackups(), 'avant-restauration');
}

/**
 * Capture, DEPUIS le chemin de la base vive (donné AVANT toute fermeture),
 * TOUS les chemins dérivés dont la bascule/le rollback/la reprise ont besoin.
 * Aucune de ces valeurs ne repasse jamais par db.cheminOuvert() : elles
 * survivent donc à db.fermer() (qui ferait retomber cheminOuvert() sur data/
 * RÉEL du dépôt). C'est le cœur du correctif « chemins après fermeture ».
 * @param {string} cheminBaseVive - chemin du .db vif, capturé base ouverte
 * @returns {{cheminBaseVive: string, dossierData: string,
 *   documentsVifs: string, zone: string, dossierAvantRestauration: string}}
 */
function capturerChemins(cheminBaseVive) {
  const data = path.dirname(cheminBaseVive);
  // backups/ = destination configurée si elle existe, sinon frère de data/.
  // Capturé ICI, base OUVERTE : la valeur survit à db.fermer() (dossierBackups
  // ne rouvrira pas la base ensuite, cf. son garde db.estOuverte()).
  const backups = sauvegarde.dossierBackups();
  return {
    cheminBaseVive,
    dossierData: data,
    documentsVifs: path.join(data, 'documents'),
    zone: path.join(data, 'restauration-en-cours'),
    dossierAvantRestauration: path.join(backups, 'avant-restauration')
  };
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
// Déchiffrement PRÉALABLE (E4.2) — une sauvegarde chiffrée (.zip.chiffre ou
// magic « IWF-CHIFFRE-1 ») est ramenée à un ZIP CLAIR dans un fichier temp
// JETABLE, AVANT tout contact avec la base vive. Un mauvais tag (phrase fausse
// OU altération) fait ÉCHOUER ICI, avant lecture du manifeste, extraction et a
// fortiori toute bascule : la base vive n'est jamais touchée (VISION §4.5,
// E4-PLAN §0). Le clair temporaire est effacé en fin d'opération.
// ------------------------------------------------------------

/** Vrai si le fichier sur disque est une sauvegarde chiffrée (extension ou magic). */
function estFichierChiffre(chemin) {
  if (typeof chemin === 'string' && chemin.endsWith('.zip.chiffre')) return true;
  try {
    // Lire juste assez d'octets pour tester le magic (défense en profondeur :
    // un chiffré renommé « .zip » est quand même reconnu par son en-tête).
    const fd = fs.openSync(chemin, 'r');
    try {
      const tete = Buffer.alloc(chiffrement.MAGIC.length);
      const lus = fs.readSync(fd, tete, 0, tete.length, 0);
      return chiffrement.estEnveloppeChiffree(tete.subarray(0, lus));
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return false;
  }
}

/**
 * Ramène une sauvegarde à un ZIP CLAIR exploitable par le pipeline E4.1.
 *   - fichier CLAIR : renvoie tel quel (aucune copie, aucun temp) ;
 *   - fichier CHIFFRÉ : exige la phrase, déchiffre en mémoire (tag GCM vérifié
 *     — phrase fausse ou octet modifié = REJET ici, base vive intacte), écrit
 *     le clair dans un fichier temp JETABLE et renvoie son chemin + un nettoyeur.
 * @param {string} chemin - chemin de la sauvegarde (clair ou chiffré)
 * @param {string|undefined} phrase - requise si chiffré
 * @returns {{cheminClair: string, nettoyer: () => void}}
 */
function preparerZipClair(chemin, phrase) {
  if (!estFichierChiffre(chemin)) {
    return { cheminClair: chemin, nettoyer: () => {} };
  }
  if (typeof phrase !== 'string' || phrase.length === 0) {
    throw new Error(
      'Cette sauvegarde est chiffrée : une phrase est requise pour la lire ' +
      '(restauration/test refusés sans phrase).');
  }
  const enveloppe = fs.readFileSync(chemin);
  // dechiffrer LÈVE « Phrase incorrecte ou sauvegarde altérée » sur tag KO —
  // AVANT toute lecture de manifeste ou extraction (base vive jamais touchée).
  const octetsZip = chiffrement.dechiffrer(enveloppe, phrase);
  const dossierTmp = fs.mkdtempSync(
    path.join(require('node:os').tmpdir(), 'inerweb-fluide-dechiffre-'));
  const cheminClair = path.join(dossierTmp, 'sauvegarde-claire.zip');
  fs.writeFileSync(cheminClair, octetsZip);
  return {
    cheminClair,
    nettoyer: () => { try { supprimerDossier(dossierTmp); } catch { /* best-effort */ } }
  };
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
  //     manifeste, ET recroiser le nombre de fichiers EXTRAITS avec le count
  //     RÉEL de pieces_jointes dans la base extraite (le manifeste seul est
  //     falsifiable : un attaquant peut retirer une PJ et re-signer le
  //     manifeste — mais pas mentir sur la base, dont le sha256 est le pivot
  //     déjà vérifié en 1c). Correctif 4 (b).
  let cheminDocumentsExtraits = null;
  if (manifeste.type === 'ARCHIVE') {
    cheminDocumentsExtraits = path.join(zone, 'documents');
    verifierDocumentsExtraits(cheminDocumentsExtraits, manifeste, cheminNouvelle);
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
 * Vérifie les documents extraits d'une ARCHIVE. Trois recroisements :
 *   1. NOMBRE de fichiers sous documents/ == manifeste.documents.nombre ;
 *   2. sha256Global recomposé (SHA-256 de la concaténation TRIÉE des sha256
 *      par fichier) == celui du manifeste ;
 *   3. NOMBRE de fichiers == count(*) RÉEL de pieces_jointes dans la base
 *      EXTRAITE — LA garde anti-falsification (correctif 4 (b)). Le manifeste
 *      est falsifiable (on peut retirer une PJ et re-signer nombre +
 *      sha256Global du vide) ; la base, elle, ne ment pas : son sha256 est le
 *      pivot déjà vérifié, et sa table pieces_jointes dit le VRAI compte. Une
 *      archive à qui il manque une PJ est ainsi démasquée même manifeste
 *      recalculé.
 * @param {string} dossierDocs - dossier documents/ extrait (peut ne pas exister si 0 PJ)
 * @param {object} manifeste
 * @param {string} cheminBaseExtraite - la base .db extraite (pour le count réel)
 */
function verifierDocumentsExtraits(dossierDocs, manifeste, cheminBaseExtraite) {
  const attendu = manifeste.documents;
  const fichiers = fs.existsSync(dossierDocs)
    ? fs.readdirSync(dossierDocs).filter((n) => {
        const p = path.join(dossierDocs, n);
        return fs.statSync(p).isFile();
      })
    : [];

  // 3. Recroisement avec le count RÉEL de la base (indépendant du manifeste).
  const pjEnBase = compterPiecesJointes(cheminBaseExtraite);
  if (fichiers.length !== pjEnBase) {
    throw new Error(
      `Pièces jointes incohérentes avec la base : ${fichiers.length} ` +
      `fichier(s) extrait(s) pour ${pjEnBase} pièce(s) jointe(s) en base ` +
      '(pieces_jointes) — une PJ manque ou a été ajoutée hors base, ' +
      'restauration ABANDONNÉE (le manifeste seul ne fait pas foi).');
  }

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

/**
 * Compte les pièces jointes (`count(*) FROM pieces_jointes`) dans un fichier
 * .db AUTONOME, via une instance DÉDIÉE en lecture seule (jamais le singleton).
 * @param {string} cheminDb
 * @returns {number}
 */
function compterPiecesJointes(cheminDb) {
  const instance = new DatabaseSync(cheminDb, { readOnly: true });
  try {
    return instance.prepare(
      'SELECT count(*) AS n FROM pieces_jointes').get().n;
  } finally {
    instance.close();
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
 * @param {ReturnType<typeof capturerChemins>} chemins - chemins CAPTURÉS base
 *        ouverte (cheminBaseVive, documentsVifs, zone…). JAMAIS recalculés via
 *        cheminOuvert() après db.fermer() (viserait data/ RÉEL).
 * @param {string} cheminNouvelle - restauration-en-cours/nouvelle.db (vérifiée)
 * @param {string|null} cheminDocumentsExtraits - documents/ extrait (ARCHIVE)
 * @param {(etape: string) => void} [interrompreApres] - crochet de test
 */
function basculer(chemins, cheminNouvelle, cheminDocumentsExtraits,
  interrompreApres = () => {}) {
  const cheminBaseVive = chemins.cheminBaseVive;
  const zone = chemins.zone;
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
  //    la zone porte les DEUX bases entières : reprise possible). ancienne.db
  //    est l'ORIGINAL bit-pour-bit : c'est lui, et non le filet re-extractible,
  //    qui sert de premier recours au rollback (correctif 2).
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
  //    docsVifs vient des chemins CAPTURÉS (jamais de cheminOuvert() : la base
  //    est fermée ici, cheminOuvert() viserait data/ RÉEL).
  if (cheminDocumentsExtraits && fs.existsSync(cheminDocumentsExtraits)) {
    const docsVifs = chemins.documentsVifs;
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
 * Nom du marqueur (fichier zéro octet dans la zone) posé PENDANT un rollback
 * via ancienne.db. Il lève l'ambiguïté à la reprise : « base vive présente +
 * documents-ancien en attente » signifie « rollback interrompu après repose
 * de la base, documents à restaurer » (et NON un aller-retour réussi dont on
 * garderait les nouveaux documents). Un simple fichier, pas un sous-dossier.
 */
const MARQUEUR_ROLLBACK = '.rollback-en-cours';

/**
 * NOTE D'HONNÊTETÉ (tamper-evidence, VISION §4.6). « VERT » ici =
 * « structure cohérente + chaîne du REGISTRE re-vérifiée par recalcul » sur
 * l'instance extraite (verifierIntegrite), PAS « archive authentifiée contre
 * un falsificateur disque-en-main ». Le manifeste n'est pas signé : ses
 * champs hors chaîne de hash (compteurs, sha256 annoncés) ne sont pas
 * protégés cryptographiquement — comme en mode démo. Ce qui EST garanti :
 *   - la chaîne du registre et du journal est recalculée sur la base réelle
 *     extraite (un registre trafiqué casse la chaîne, détecté) ;
 *   - le NOMBRE de pièces jointes est recroisé avec le count RÉEL de la base
 *     restaurée (pas seulement le manifeste, falsifiable — correctif E4.1).
 * Ce qui n'est PAS garanti : un adversaire qui réécrit COHÉREMMENT base +
 * chaîne + manifeste, disque en main, reste indétectable sans scellé
 * conservé hors système (renvoi §4.6). On ne prétend aucune garantie au-delà.
 *
 * RESTAURE une sauvegarde (le déroulé atomique 0→6 de E4-PLAN).
 *
 * @param {string} cheminZip - archive .zip ou .zip.chiffre à restaurer
 * @param {object} [options]
 * @param {string} [options.phrase] - phrase de déchiffrement (E4.2) : REQUISE si
 *        la sauvegarde est chiffrée ; un tag KO (phrase fausse OU octet modifié)
 *        rejette AVANT toute bascule (base vive intacte)
 * @param {boolean} [options.confirmePerte] - autorise une restauration qui
 *        RÉGRESSE (archive plus ancienne : perte d'écritures figées). Sans
 *        elle, une régression est REFUSÉE avant tout effet.
 * @param {(etape: string) => void} [options._interrompreApres] - crochet de
 *        TEST (injection d'exception à une étape nommée). Jamais en prod.
 * @param {(verdict: object) => object} [options._forcerVerdictVif] - crochet
 *        de TEST : remplace le verdict des 3 vérifications sur la base VIVE
 *        (étape 4) pour éprouver le rollback. Jamais en prod.
 * @param {(etape: string) => void} [options._interrompreRollbackApres] -
 *        crochet de TEST : injecte une exception à une étape du rollback via
 *        ancienne.db (crash pendant le rollback). Jamais en prod.
 * @param {boolean} [options._forcerFiletNonSain] - crochet de TEST : force le
 *        filet à être jugé NON sain à sa création (éprouve l'ABANDON). Jamais
 *        en prod.
 * @param {(cheminFilet: string) => void} [options._saboterFiletApresCreation]
 *        - crochet de TEST : appelé avec le chemin du filet juste après sa
 *        création+vérification, pour le corrompre et prouver que le rollback
 *        via ancienne.db sauve quand même l'état d'avant. Jamais en prod.
 * @returns {{ok: boolean, verdict: 'VERT'|'ROUGE', type: string,
 *            compteursAvant: object, compteursApres: object,
 *            cheminFiletSecurite: string, rollback?: boolean,
 *            methodeRollback?: 'ancienne'|'filet', motif?: string}}
 */
function restaurer(cheminZip, options = {}) {
  const {
    confirmePerte = false,
    _interrompreApres = () => {},
    _forcerVerdictVif = null,
    _interrompreRollbackApres = () => {},
    _forcerFiletNonSain = false,
    _saboterFiletApresCreation = null
  } = options;

  prendreVerrou('restauration');
  // Capturer le chemin de la base VIVE AVANT toute fermeture (db.fermer()
  // nulle cheminBaseOuverte : le lire après serait le chemin par défaut,
  // c.-à-d. le data/ RÉEL du dépôt). On en dérive TOUS les chemins de bascule
  // MAINTENANT, base ouverte : ils survivront à la fermeture (correctif 1).
  const chemins = capturerChemins(db.cheminOuvert());
  const zone = chemins.zone;
  let filet = null;
  let nettoyerClair = () => {};

  try {
    // (0 bis) DÉCHIFFREMENT PRÉALABLE (E4.2) — si la sauvegarde est chiffrée,
    //     on la ramène à un ZIP clair temp AVANT tout pré-contrôle. Un mauvais
    //     tag (phrase fausse OU octet modifié) LÈVE ICI, base vive JAMAIS
    //     touchée (aucune écriture, aucune bascule). Le clair temp est effacé
    //     dans le finally. Une sauvegarde claire passe inchangée.
    const prep = preparerZipClair(cheminZip, options.phrase);
    const cheminSource = prep.cheminClair;
    nettoyerClair = prep.nettoyer;

    // (0) PRÉ-CONTRÔLES SANS ÉCRIRE.
    const manifeste = lireManifesteArchive(cheminSource);
    const comparaison = comparerAvecBaseVive(manifeste);
    if (comparaison.regression && !confirmePerte) {
      throw new Error(
        `Restauration refusée : cette sauvegarde contient ` +
        `${manifeste.compteurs.mouvementsValides} écriture(s) figée(s), la ` +
        `base actuelle en compte ${comparaison.avant.mouvementsValides} — ` +
        `restaurer en perdrait ${comparaison.ecrituresPerdues}. Confirmez ` +
        'explicitement la perte pour continuer (confirmePerte).');
    }

    // (1) EXTRAIRE + VÉRIFIER HORS-BASE (base vive encore intacte ici). On
    //     travaille sur le ZIP CLAIR (déchiffré si besoin) : le pipeline E4.1
    //     est inchangé, il ne voit jamais de chiffré.
    const { cheminNouvelle, cheminDocumentsExtraits } =
      extraireEtVerifierHorsBase(cheminSource, manifeste, zone);
    _interrompreApres('extraction-verifiee');

    // (2) SAUVEGARDE DE SÉCURITÉ AUTO, NON DÉSACTIVABLE. Échec = ABANDON :
    //     jamais de restauration sans filet. On archive l'état ACTUEL
    //     COMPLET (base + documents), par VACUUM INTO (cohérent), dans
    //     backups/avant-restauration/. La base vive est TOUJOURS ouverte
    //     à ce stade (on n'a encore rien basculé). Le filet est VÉRIFIÉ
    //     restaurable juste après création ; s'il n'est pas sain, ABANDON
    //     AVANT toute bascule (base vive encore intacte) — correctif 2.
    filet = produireFiletSecurite(chemins, { forcerNonSain: _forcerFiletNonSain });
    if (_saboterFiletApresCreation) _saboterFiletApresCreation(filet.chemin);
    _interrompreApres('filet-cree');

    // (3) BASCULE ATOMIQUE. À partir d'ici la base vive change de fichier ;
    //     une coupure laisse la zone avec deux .db entiers (reprise).
    //     zone/ancienne.db = l'ORIGINAL bit-pour-bit, planche de salut n°1.
    basculer(chemins, cheminNouvelle, cheminDocumentsExtraits,
      _interrompreApres);

    // (4) ROUVRIR + 3 VÉRIFICATIONS SUR LA BASE VIVE.
    db.ouvrir(chemins.cheminBaseVive);
    _interrompreApres('reouverture');
    let verdictVif = verifierBaseVive();
    if (_forcerVerdictVif) verdictVif = _forcerVerdictVif(verdictVif);

    if (!verdictVif.ok) {
      // (5) ROLLBACK AUTO. Ordre du correctif 2 : (a) reposer zone/ancienne.db
      //     (l'original, rename direct, déterministe, SANS re-extraction) ;
      //     (b) SEULEMENT si ancienne.db absente/corrompue, recourir au filet ;
      //     (c) si tout échoue, état explicite (base absente + zone préservée +
      //     erreur CRITIQUE) plutôt qu'une base silencieusement fausse.
      const motif = motifVerdict(verdictVif);
      const retour = tenterRetourEtatAvant(
        chemins, filet.chemin, _interrompreRollbackApres);
      const compteursApres = compteursBaseVive();
      db.journaliser({
        qui: 'système',
        action: 'RESTAURATION',
        cible: path.basename(cheminZip),
        details: `ÉCHEC (${motif}) · rollback via ${retour.methode} · ` +
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
        methodeRollback: retour.methode,
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
    // Un rollback via ancienne.db est-il en cours (marqueur posé) ? Si oui, la
    // coupure a frappé PENDANT le rollback : NE PAS nettoyer la zone — elle
    // porte zone/ancienne.db (l'original) et documents-ancien ; la reprise au
    // prochain démarrage terminera le rollback (correctif 2 (iii) / 3).
    if (fs.existsSync(path.join(zone, MARQUEUR_ROLLBACK))) {
      throw erreur;
    }
    // Toute exception AVANT la bascule (0,1,2) laisse la base vive intacte et
    // ouverte : on nettoie seulement la zone. Une exception PENDANT la bascule
    // laisse un état intermédiaire à rétablir proprement.
    if (baseViveManquante(chemins.cheminBaseVive)) {
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
        const docsVifs = chemins.documentsVifs; // CAPTURÉ (jamais cheminOuvert)
        if (fs.existsSync(docsVifs)) supprimerDossier(docsVifs);
        renommerAvecReessai(docsEnAttente, docsVifs);
      } catch { /* au pire, la reprise au démarrage terminera */ }
    }
    // Rouvrir la base si elle a été fermée pendant la bascule (ne pas laisser
    // le singleton mort).
    if (!db.estOuverte() && fs.existsSync(chemins.cheminBaseVive)) {
      try { db.ouvrir(chemins.cheminBaseVive); } catch { /* rouverte au mieux */ }
    }
    supprimerDossier(zone);
    throw erreur;
  } finally {
    // Effacer le ZIP clair temporaire issu d'un éventuel déchiffrement (E4.2) :
    // aucun clair ne doit survivre à l'opération.
    try { nettoyerClair(); } catch { /* best-effort */ }
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
 * sous avant-restauration/ (nom avant-<horodatage>.zip). Le filet est ensuite
 * VÉRIFIÉ restaurable (baseFichierSaine sur sa base + relecture du manifeste) :
 * un filet non sain fait ÉCHOUER ici, AVANT toute bascule — jamais de
 * restauration derrière un filet qui ne protégerait pas (correctif 2 (ii)).
 * @param {ReturnType<typeof capturerChemins>} chemins - chemins capturés
 * @param {{forcerNonSain?: boolean}} [options] - crochet de test
 * @returns {{chemin: string, manifeste: object}}
 */
function produireFiletSecurite(chemins, options = {}) {
  fs.mkdirSync(chemins.dossierAvantRestauration, { recursive: true });
  // La fabrique écrit dans backups/archives/ ; on rapatrie sous
  // avant-restauration/ pour bien distinguer le filet des sauvegardes
  // normales (il ne doit JAMAIS être purgé par la rotation GFS).
  const produit = sauvegarde.sauvegarderArchive();
  const base = path.basename(produit.chemin)
    .replace(/-archive-[0-9a-f]{6}\.zip$/, '')
    .replace(/\.zip$/, '');
  const cible = path.join(
    chemins.dossierAvantRestauration, `avant-${base}.zip`);
  const cibleUnique = fs.existsSync(cible)
    ? path.join(chemins.dossierAvantRestauration,
        `avant-${base}-${crypto.randomBytes(3).toString('hex')}.zip`)
    : cible;
  renommerAvecReessai(produit.chemin, cibleUnique);

  // VÉRIFIER que le filet est restaurable AVANT de compter dessus. On teste
  // sa base extraite (les 3 vérifications, comme testerSauvegarde) : un filet
  // illisible/corrompu ici = ABANDON immédiat, base vive encore intacte.
  const filetSain = !options.forcerNonSain && filetRestaurable(cibleUnique);
  if (!filetSain) {
    // Le filet ne protège pas : on refuse d'aller plus loin. On le laisse en
    // place pour inspection ; la base vive n'a PAS été touchée.
    throw new Error(
      'Restauration ABANDONNÉE : le filet de sécurité créé juste avant la ' +
      'bascule n\'est pas restaurable (archive de secours non saine). La base ' +
      'actuelle n\'a pas été touchée. Vérifier l\'espace disque et les droits ' +
      `sous ${path.dirname(cibleUnique)}.`);
  }
  return { chemin: cibleUnique, manifeste: produit.manifeste };
}

/**
 * Vrai si l'archive filet est restaurable : manifeste relisible + base extraite
 * passant les 3 vérifications + documents recroisés. C'est le CŒUR de
 * testerSauvegarde SANS prendre le verrou E4 (restaurer() le détient déjà :
 * réutiliser testerSauvegarde ici lèverait « opération déjà en cours ») et SANS
 * écrire le témoin dernier_test_sauvegarde_ok (on est en pleine restauration).
 * La base COURANTE n'est ni ouverte ni fermée ni écrite. Best-effort défensif :
 * toute exception = filet jugé non sain.
 * @param {string} cheminFilet
 */
function filetRestaurable(cheminFilet) {
  const dossierTest = fs.mkdtempSync(
    path.join(require('node:os').tmpdir(), 'inerweb-fluide-filet-'));
  try {
    const manifeste = lireManifesteArchive(cheminFilet);
    const extraites = zip.extraireVers(cheminFilet, dossierTest);
    const baseExtraite = extraites.find(
      (e) => e.nom === 'base/' + manifeste.base.nomFichier
        || e.nom === 'base/inerweb-fluide.db');
    if (!baseExtraite) return false;
    if (sha256Fichier(baseExtraite.chemin) !== manifeste.base.sha256) return false;
    if (!verifierBaseFichier(baseExtraite.chemin).ok) return false;
    if (manifeste.type === 'ARCHIVE') {
      verifierDocumentsExtraits(
        path.join(dossierTest, 'documents'), manifeste, baseExtraite.chemin);
    }
    return true;
  } catch {
    return false;
  } finally {
    supprimerDossier(dossierTest);
  }
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
 * ORCHESTRE le retour à l'état d'AVANT après une bascule jugée ROUGE.
 * Ordre du correctif 2 :
 *   (a) reposer zone/ancienne.db (l'ORIGINAL bit-pour-bit, rename direct,
 *       déterministe, SANS re-extraction faillible) → si VERT, réussi ;
 *   (b) SEULEMENT si ancienne.db absente/corrompue, recours au filet
 *       (re-extraction, l'ancien chemin) ;
 *   (c) si TOUT échoue, laisser un état EXPLICITE (base absente + zone
 *       préservée + erreur CRITIQUE) plutôt qu'une base silencieusement fausse.
 * @param {ReturnType<typeof capturerChemins>} chemins
 * @param {string} cheminFilet - filet de secours (recours (b))
 * @param {(etape: string) => void} [interrompreRollbackApres] - crochet de test
 * @returns {{ok: true, methode: 'ancienne'|'filet'}}
 */
function tenterRetourEtatAvant(chemins, cheminFilet,
  interrompreRollbackApres = () => {}) {
  // (a) Planche de salut n°1 : l'original, déjà présent, bit-pour-bit.
  const parAncienne = rollbackDepuisAncienne(chemins, interrompreRollbackApres);
  if (parAncienne.ok) return { ok: true, methode: 'ancienne' };

  // (b) Recours : re-extraire le filet (faillible, mais dernière chance saine).
  const parFilet = rollbackDepuisFilet(chemins, cheminFilet);
  if (parFilet.ok) return { ok: true, methode: 'filet' };

  // (c) Ni l'original ni le filet ne redonnent une base saine. On NE laisse
  //     PAS la base restaurée REJETÉE en place (fausse en silence) : on la
  //     dégage, la zone (avec ancienne.db si présente) est PRÉSERVÉE pour
  //     inspection, et on lève une erreur CRITIQUE claire.
  etablirEtatCritique(chemins);
  throw new Error(
    'ÉCHEC CRITIQUE du rollback : ni la base d\'origine (zone/ancienne.db) ni ' +
    'le filet de sécurité ne redonnent une base saine. La base restaurée ' +
    '(rejetée) a été mise de côté pour NE PAS servir de base fausse. État à ' +
    'inspecter manuellement : la zone de restauration et le filet sont ' +
    'CONSERVÉS sous data/restauration-en-cours/ et backups/avant-restauration/.');
}

/**
 * ROLLBACK n°1 (correctif 2) : reposer zone/ancienne.db (l'ORIGINAL, présent
 * depuis basculer()) sur le chemin vif par renommage DIRECT — aucune
 * re-extraction, déterministe. Puis restaurer documents-ancien. Puis rouvrir +
 * vérifier. Un MARQUEUR (fichier zéro octet) est posé au tout début et retiré
 * en cas de succès : il permet à la reprise au démarrage de terminer un
 * rollback interrompu sans ambiguïté (crash pendant le rollback).
 *
 * ORDRE des mutations (pour que toute coupure laisse la reprise capable de
 * reposer l'ancienne) : la base transite par « chemin vif ABSENT » AVANT que
 * l'ancienne y soit posée ; les documents sont restaurés EN DERNIER.
 *
 * @param {ReturnType<typeof capturerChemins>} chemins
 * @param {(etape: string) => void} [interrompreApres] - crochet de test
 * @returns {{ok: boolean, verdict?: object, raison?: string}}
 */
function rollbackDepuisAncienne(chemins, interrompreApres = () => {}) {
  const zone = chemins.zone;
  const cheminAncienne = path.join(zone, 'ancienne.db');
  const docsAncien = path.join(zone, 'documents-ancien');
  const cheminBaseVive = chemins.cheminBaseVive;

  // L'original doit être présent ET sain, sinon on laisse la main au filet.
  if (!fs.existsSync(cheminAncienne) || !baseFichierSaine(cheminAncienne)) {
    return { ok: false, raison: 'ancienne-absente-ou-corrompue' };
  }

  // Marqueur « rollback en cours » : lève l'ambiguïté à la reprise.
  fs.writeFileSync(path.join(zone, MARQUEUR_ROLLBACK), '');

  // Fermer la base vive (rejetée) pour libérer le verrou fichier.
  db.fermer();
  effacerWalShm(cheminBaseVive);

  // Dégager la base REJETÉE hors du chemin (déterministe, pas de re-extraction).
  // Après ceci, le chemin vif est LIBRE (état « rien ») : une coupure ici est
  // rattrapée par la reprise (Cas 2 : reposer ancienne).
  if (fs.existsSync(cheminBaseVive)) {
    const rejetee = path.join(zone, 'rejetee.db');
    if (fs.existsSync(rejetee)) supprimerAvecReessai(rejetee);
    renommerAvecReessai(cheminBaseVive, rejetee);
  }
  effacerWalShm(cheminBaseVive); // ceinture
  interrompreApres('rejetee-sortie');

  // Reposer l'ORIGINAL sur le chemin LIBRE (rename direct, quasi-atomique).
  renommerAvecReessai(cheminAncienne, cheminBaseVive);
  interrompreApres('ancienne-reposee');

  // Restaurer les documents d'origine EN DERNIER (si un lot avait été mis de
  // côté par basculer()). C'est l'étape que la reprise « base présente +
  // marqueur » termine si la coupure survient juste avant.
  if (fs.existsSync(docsAncien)) {
    if (fs.existsSync(chemins.documentsVifs)) {
      supprimerDossier(chemins.documentsVifs);
    }
    renommerAvecReessai(docsAncien, chemins.documentsVifs);
  }
  interrompreApres('documents-restaures');

  // Rouvrir + vérifier : l'original doit être VERT (il l'était avant la
  // tentative de restauration).
  db.ouvrir(cheminBaseVive);
  const verdict = verifierBaseVive();
  if (!verdict.ok) {
    // Très improbable (l'original était sain) : on laisse le marqueur et on
    // rend la main — le recours filet prendra le relais.
    return { ok: false, verdict, raison: 'ancienne-verif-rouge' };
  }
  // Succès : retirer le marqueur (le rollback est terminé et cohérent).
  supprimerAvecReessai(path.join(zone, MARQUEUR_ROLLBACK));
  return { ok: true, verdict };
}

/**
 * ROLLBACK n°2 (recours) : rejouer le FILET de sécurité par le même chemin de
 * bascule (extraire → vérifier hors-base → fermer → purger WAL → sortir la
 * mauvaise → poser le filet). Faillible (re-extraction : le filet peut être
 * corrompu/illisible/ENOSPC), d'où son rang de RECOURS après ancienne.db.
 * Ne lève pas pour un filet corrompu : renvoie { ok:false } pour laisser
 * l'orchestrateur établir l'état critique.
 * @param {ReturnType<typeof capturerChemins>} chemins
 * @param {string} cheminFilet - backups/avant-restauration/avant-….zip
 * @returns {{ok: boolean, verdict?: object, raison?: string}}
 */
function rollbackDepuisFilet(chemins, cheminFilet) {
  const zoneRollback = path.join(chemins.zone, 'rollback-filet');
  try {
    const manifesteFilet = lireManifesteArchive(cheminFilet);
    const { cheminNouvelle, cheminDocumentsExtraits } =
      extraireEtVerifierHorsBase(cheminFilet, manifesteFilet, zoneRollback);
    // basculer() attend des chemins capturés + une zone : on réutilise la zone
    // de travail dédiée au rollback (rollback-filet/) pour ancienne.db/rejetee.
    basculer({ ...chemins, zone: zoneRollback },
      cheminNouvelle, cheminDocumentsExtraits);
    db.ouvrir(chemins.cheminBaseVive);
    const verdict = verifierBaseVive();
    return { ok: verdict.ok, verdict, raison: verdict.ok ? undefined : 'filet-verif-rouge' };
  } catch (erreur) {
    return { ok: false, raison: `filet-illisible: ${erreur.message}` };
  }
}

/**
 * (c) État CRITIQUE explicite : ni l'original ni le filet n'ont redonné une
 * base saine. On refuse de laisser la base restaurée REJETÉE tenir lieu de
 * base (fausse en silence). On la met de côté (rejetee.db dans la zone), la
 * zone est CONSERVÉE (ancienne.db éventuelle, marqueur, filet préservés) pour
 * inspection, et le chemin vif reste ABSENT — un socle vierge ne sera PAS
 * recréé par-dessus (db.ouvrir n'est pas appelé ici ; la reprise verra une
 * zone à inspecter). Best-effort : n'aggrave jamais l'état.
 * @param {ReturnType<typeof capturerChemins>} chemins
 */
function etablirEtatCritique(chemins) {
  try { if (db.estOuverte()) db.fermer(); } catch { /* déjà fermée */ }
  try { effacerWalShm(chemins.cheminBaseVive); } catch { /* best-effort */ }
  try {
    if (fs.existsSync(chemins.cheminBaseVive)) {
      const rejetee = path.join(chemins.zone, 'rejetee-critique.db');
      if (fs.existsSync(rejetee)) supprimerAvecReessai(rejetee);
      renommerAvecReessai(chemins.cheminBaseVive, rejetee);
    }
  } catch { /* best-effort : au pire la base rejetée reste, mais on a levé */ }
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
    const docsVifs = path.join(path.dirname(cheminBase), 'documents');
    const cheminDocsAncienRepr = path.join(zone, 'documents-ancien');

    // ROLLBACK interrompu APRÈS repose de l'ancienne base (marqueur présent) :
    // la base vive est déjà l'ORIGINAL, il ne reste qu'à restaurer ses
    // documents d'origine (documents-ancien). Sans ce cas, le nettoyage
    // générique ci-dessous jetterait documents-ancien et laisserait le nouveau
    // lot sur l'ancienne base (incohérence PJ). Correctif 3.
    if (fs.existsSync(path.join(zone, MARQUEUR_ROLLBACK))) {
      if (fs.existsSync(cheminDocsAncienRepr)) {
        if (fs.existsSync(docsVifs)) supprimerDossier(docsVifs);
        renommerAvecReessai(cheminDocsAncienRepr, docsVifs);
      }
      supprimerDossier(zone);
      return { repris: true, action: 'rollback-documents-termines' };
    }

    // Ne compléter le basculement des documents QUE si la nouvelle base est
    // déjà posée (nouvelle.db absente de la zone). Si nouvelle.db est encore
    // là, la base présente est l'ANCIENNE : poser le nouveau lot de documents
    // dessus créerait une incohérence — on n'y touche pas.
    const baseDejaPosee = !fs.existsSync(path.join(zone, 'nouvelle.db'));
    const cheminDocsEnAttente = path.join(zone, 'documents');
    if (baseDejaPosee && fs.existsSync(cheminDocsEnAttente)
      && !fs.existsSync(cheminDocsAncienRepr)) {
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

  // Cas 3 : ni nouvelle ni ancienne au 1er niveau. AVANT de conclure
  // « inexploitable » (ce qui laisserait db.ouvrir recréer un socle VIERGE),
  // on SCRUTE toute la zone (y compris les sous-dossiers de rollback :
  // rollback-filet/) : un recours filet interrompu peut y avoir laissé une
  // base ENTIÈRE et saine. Correctif 3 : le socle vierge ne doit JAMAIS
  // enterrer une base récupérable.
  const baseProfonde = trouverBaseSaineDansZone(zone);
  if (baseProfonde) {
    // On NE choisit PAS à l'aveugle laquelle poser (nouvelle vs ancienne vs
    // filet, sémantiques différentes) : on HALTE avec un message clair pour
    // inspection manuelle, plutôt que de recréer un socle vierge par-dessus
    // une base exploitable (perte silencieuse) ou de deviner mal.
    throw new Error(
      'Restauration interrompue à un état AMBIGU : la zone ' +
      `data/restauration-en-cours/ contient une base entière et saine ` +
      `(${path.relative(zone, baseProfonde)}) mais ni « nouvelle.db » ni ` +
      '« ancienne.db » au premier niveau. Un socle vierge NE sera PAS créé ' +
      'par-dessus. Inspecter manuellement la zone (une bascule/rollback a ' +
      'été coupée dans un sous-dossier de travail) avant de relancer.');
  }

  // Vraiment aucune base entière : zone inexploitable. On la conserve (pour
  // inspection) plutôt que de détruire une éventuelle preuve, et on laisse
  // db.ouvrir recréer un socle vierge (c'est le SEUL cas où c'est admis).
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

/**
 * Cherche récursivement, dans la zone, UN fichier .db ENTIER et sain (passant
 * verifierIntegrite). Sert de garde-fou anti « socle vierge par-dessus une
 * base récupérable » à la reprise (correctif 3). Renvoie le chemin du premier
 * trouvé, ou null. Best-effort borné (ne suit pas de liens ; profondeur
 * naturelle de la zone : quelques sous-dossiers de travail au plus).
 * @param {string} racineZone
 * @returns {string|null}
 */
function trouverBaseSaineDansZone(racineZone) {
  const pile = [racineZone];
  while (pile.length > 0) {
    const dossier = pile.pop();
    let entrees;
    try {
      entrees = fs.readdirSync(dossier, { withFileTypes: true });
    } catch { continue; }
    for (const entree of entrees) {
      const complet = path.join(dossier, entree.name);
      if (entree.isDirectory()) {
        pile.push(complet);
      } else if (entree.isFile() && entree.name.endsWith('.db')) {
        if (baseFichierSaine(complet)) return complet;
      }
    }
  }
  return null;
}

// ------------------------------------------------------------
// (g) TESTER UNE SAUVEGARDE — sans jamais toucher la base courante.
// ------------------------------------------------------------

/**
 * NOTE D'HONNÊTETÉ (tamper-evidence, VISION §4.6). Un verdict « VERT » ici
 * signifie « structure cohérente + chaîne du REGISTRE (et du journal)
 * re-vérifiée par recalcul sur l'instance extraite », PAS « archive
 * authentifiée contre un falsificateur disque-en-main ». Le manifeste N'EST
 * PAS signé : ses champs hors chaîne de hash (compteurs, sha256 annoncés) ne
 * sont pas protégés cryptographiquement — comme en mode démo. Ce qui EST
 * garanti : la chaîne est recalculée sur la base réelle (un registre trafiqué
 * casse la chaîne), et le NOMBRE de PJ est recroisé avec le count RÉEL de la
 * base (pas seulement le manifeste, falsifiable). Ce qui n'est PAS garanti :
 * un adversaire réécrivant COHÉREMMENT base + chaîne + manifeste, disque en
 * main, reste indétectable sans scellé conservé hors système (renvoi §4.6).
 *
 * Ouvre une sauvegarde dans une base TEMP en LECTURE SEULE (instance
 * DatabaseSync DÉDIÉE, JAMAIS le singleton db.js) et rend un verdict
 * VERT/ROUGE. « Une sauvegarde jamais testée n'est qu'un espoir » (VISION
 * §4.3). Déroulé : lire le manifeste (en tête) → extraire la base dans un
 * dossier temp jetable → sha256 === manifeste → verifierIntegrite (3 vérifs)
 * → si ARCHIVE, documents nombre + sha256Global + recroisement count RÉEL
 * pieces_jointes → verdict. La base courante n'est NI ouverte NI fermée NI
 * écrite. En cas de succès, la date du dernier test OK est inscrite dans
 * `parametres` (dernier_test_sauvegarde_ok).
 *
 * @param {string} cheminZip - archive .zip ou .zip.chiffre
 * @param {object} [options]
 * @param {string} [options.phrase] - déchiffrement (E4.2) : REQUISE si chiffrée ;
 *        tag KO (phrase fausse OU altération) = ROUGE, base courante intacte
 * @returns {{verdict: 'VERT'|'ROUGE', type: string, compteurs: object,
 *            details: object, motif: string|null}}
 */
function testerSauvegarde(cheminZip, options = {}) {
  prendreVerrou('test de sauvegarde');
  const dossierTest = fs.mkdtempSync(
    path.join(require('node:os').tmpdir(), 'inerweb-fluide-test-'));
  let nettoyerClair = () => {};
  try {
    // DÉCHIFFREMENT PRÉALABLE (E4.2) : ramener à un ZIP clair temp si chiffré.
    // Une phrase fausse ou une altération LÈVE ici — on renvoie alors un ROUGE
    // « Phrase incorrecte ou sauvegarde altérée » (jamais un plantage), la base
    // courante n'étant de toute façon jamais touchée par un test.
    let cheminSource;
    try {
      const prep = preparerZipClair(cheminZip, options.phrase);
      cheminSource = prep.cheminClair;
      nettoyerClair = prep.nettoyer;
    } catch (erreur) {
      return {
        verdict: 'ROUGE', type: null, compteurs: null,
        details: null, motif: erreur.message
      };
    }
    const manifeste = lireManifesteArchive(cheminSource);
    // Extraire dans le dossier temp jetable (CRC-32 vérifié par zip-node).
    const extraites = zip.extraireVers(cheminSource, dossierTest);
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
    // Documents (ARCHIVE) : nombre + sha256Global + recroisement avec le count
    // RÉEL de pieces_jointes dans la base extraite (correctif 4 (b)).
    if (manifeste.type === 'ARCHIVE') {
      try {
        verifierDocumentsExtraits(
          path.join(dossierTest, 'documents'), manifeste, baseExtraite.chemin);
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
    try { nettoyerClair(); } catch { /* best-effort : clair temp effacé */ }
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
