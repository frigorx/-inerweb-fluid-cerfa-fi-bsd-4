// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
'use strict';

/**
 * inerWeb Fluide v8 — Module d'accès à la base SQLite (Mode Local Lycée).
 *
 * - SQLite via le module intégré `node:sqlite` (Node ≥ 22) : zéro dépendance
 *   externe, rien à installer (SPEC-V8 §2.2).
 * - La base vit dans `data/inerweb-fluide.db` à côté de l'application ; le
 *   dossier est créé au besoin.
 * - À l'ouverture (V9-E1) : PRAGMA coffre-fort (clés étrangères, WAL,
 *   busy_timeout, synchronous=FULL, wal_autocheckpoint — vision §13.2),
 *   puis VERSIONNAGE : une base vierge reçoit le socle v1 (schema.sql +
 *   user_version = 1), une base versionnée passe par les migrations
 *   (server/migrations.js). Une base NON versionnée mais non vide date
 *   d'avant la V9 : refusée avec un message clair (aucune base réelle
 *   n'existait — recréer).
 * - Fournit aussi les deux aides transverses du registre :
 *   `generateId(prefixe)` (identifiants préfixés MAC-, BTL-, MVT-…) et
 *   `hashEcriture(donnees, hashPrecedent)` (empreinte SHA-256 chaînée,
 *   SPEC-V8 §5.6 : registre inviolable).
 */

const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const migrations = require('./migrations.js');

/** Version du socle posé par schema.sql sur une base vierge (réexportée). */
const VERSION_BASE = migrations.VERSION_BASE;

// Chemins par défaut : la base dans data/ à la racine de l'application,
// le schéma à côté de ce module. IWF_CHEMIN_BASE permet de pointer une base
// JETABLE (tests, vérification navigateur sur port neuf) sans jamais toucher
// au data/ réel — le défaut de production reste inchangé si la variable est
// absente.
const CHEMIN_BASE_DEFAUT = process.env.IWF_CHEMIN_BASE
  ? path.resolve(process.env.IWF_CHEMIN_BASE)
  : path.join(__dirname, '..', 'data', 'inerweb-fluide.db');
const CHEMIN_SCHEMA = path.join(__dirname, 'schema.sql');

/** Instance unique de la base (ouverte à la demande). */
let base = null;

/** Chemin du fichier .db actuellement ouvert (pour dériver documents/). */
let cheminBaseOuverte = null;

/**
 * Ouvre (ou crée) la base et applique le schéma. Idempotent : les appels
 * suivants renvoient la même instance.
 * @param {string} [cheminBase] Chemin du fichier .db (utile pour les tests).
 * @returns {DatabaseSync}
 */
function ouvrir(cheminBase = CHEMIN_BASE_DEFAUT) {
  if (base) return base;

  // Créer le dossier data/ au besoin.
  fs.mkdirSync(path.dirname(cheminBase), { recursive: true });

  base = new DatabaseSync(cheminBase);
  cheminBaseOuverte = cheminBase;

  try {
    // PRAGMA coffre-fort (vision §13.2) : intégrité référentielle, WAL,
    // patience sous verrou, durabilité avant vitesse (volumes faibles).
    base.exec('PRAGMA foreign_keys = ON;');
    base.exec('PRAGMA journal_mode = WAL;');
    base.exec('PRAGMA busy_timeout = 5000;');
    base.exec('PRAGMA synchronous = FULL;');
    base.exec('PRAGMA wal_autocheckpoint = 200;');
    // INDISPENSABLE au WORM : sans lui, le DELETE implicite d'un
    // INSERT OR REPLACE / UPDATE OR REPLACE ne déclenche PAS les
    // BEFORE DELETE — une écriture scellée serait remplaçable en silence
    // (trou découvert en revue adversariale E1).
    base.exec('PRAGMA recursive_triggers = ON;');

    // Versionnage (V9-E1) : socle v1 sur base vierge, migrations ensuite.
    const version = base.prepare('PRAGMA user_version').get().user_version;
    if (version === 0) {
      const { n } = base.prepare(
        "SELECT count(*) AS n FROM sqlite_master " +
        "WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").get();
      if (n > 0) {
        throw new Error(
          'Base à l\'état 0 mais non vide : création interrompue ou base ' +
          'd\'avant le versionnage V9 (aucune base réelle n\'existait ' +
          `alors). Vérifier puis supprimer ou déplacer ${cheminBase} et ` +
          'relancer — le socle v1 sera recréé proprement.');
      }
      // Création ATOMIQUE : schéma + estampille dans la même transaction —
      // une coupure ne laisse jamais des tables sans version.
      base.exec('BEGIN IMMEDIATE;');
      try {
        base.exec(fs.readFileSync(CHEMIN_SCHEMA, 'utf8'));
        base.exec(`PRAGMA user_version = ${migrations.VERSION_BASE};`);
        base.exec('COMMIT;');
      } catch (erreur) {
        base.exec('ROLLBACK;');
        throw erreur;
      }
    }
    migrations.migrer(base);
  } catch (erreur) {
    base.close();
    base = null;
    throw erreur;
  }

  return base;
}

/** Ferme proprement la base (fin de programme, tests). */
function fermer() {
  if (base) {
    base.close();
    base = null;
    cheminBaseOuverte = null;
  }
}

/**
 * Vrai si une base est actuellement ouverte (handle vivant). Le noyau de
 * sauvegarde/restauration (E4) s'en sert pour décider s'il faut rouvrir
 * après une bascule de fichier.
 * @returns {boolean}
 */
function estOuverte() {
  return base !== null;
}

/**
 * Réouvre la base précédemment ouverte (ou le chemin par défaut). Ferme
 * d'abord un éventuel handle courant (idempotent), puis rouvre le MÊME
 * chemin avec le versionnage complet (PRAGMA + migrations). Indispensable à
 * la restauration E4 : après avoir fermé pour libérer le verrou fichier et
 * basculé le .db, on rouvre exactement là où on était.
 * @returns {DatabaseSync}
 */
function reouvrir() {
  const chemin = cheminBaseOuverte ?? CHEMIN_BASE_DEFAUT;
  fermer();
  return ouvrir(chemin);
}

/**
 * Version courante du schéma de la base ouverte (`PRAGMA user_version`).
 * Le manifeste de sauvegarde la fige au moment du VACUUM (E4) : une archive
 * porte la version de schéma de sa base, condition d'une restauration sûre.
 * @returns {number}
 */
function versionBase() {
  return ouvrir().prepare('PRAGMA user_version').get().user_version;
}

/**
 * Copie transactionnellement COHÉRENTE de la base ouverte vers un fichier
 * .db cible, par `VACUUM INTO` — la SEULE primitive de sauvegarde admise
 * (VISION §4.1). Contrairement à une copie brute du fichier, `VACUUM INTO`
 * intègre le WAL, défragmente et n'écrit ni `-wal` ni `-shm` : le résultat
 * est un .db autonome et sain, capturé sans fermer ni verrouiller la base
 * vivante (les lectures continuent).
 *
 * La cible doit être INEXISTANTE (SQLite refuse d'écraser : « output file
 * already exists ») — l'appelant fournit un nom unique. Les quotes SQL du
 * chemin sont échappées (doublées) : un dossier « c'est » ne casse pas la
 * commande. Aucune validation de format de chemin ici : `path.resolve` en
 * amont a déjà produit un chemin propre.
 * @param {string} cibleAbsolue - chemin absolu du .db à créer (inexistant)
 */
function vacuumInto(cibleAbsolue) {
  const instance = ouvrir();
  const chemin = String(cibleAbsolue).split('\\').join('/');
  instance.exec("VACUUM INTO '" + chemin.replace(/'/g, "''") + "'");
}

/**
 * Chemin du fichier .db actuellement ouvert (ou le défaut si rien n'est
 * encore ouvert) — sert à dériver le dossier `documents/` des pièces
 * jointes, TOUJOURS à côté de la base (jetable en test, réelle en prod).
 * @returns {string}
 */
function cheminOuvert() {
  return cheminBaseOuverte ?? CHEMIN_BASE_DEFAUT;
}

/**
 * Prépare une requête et lui passe les paramètres (tableau positionnel `?`
 * ou objet nommé `$nom` / `:nom`).
 */
function preparer(sql) {
  return ouvrir().prepare(sql);
}

function appliquerParams(methode, sql, params) {
  const requete = preparer(sql);
  if (params === undefined) return requete[methode]();
  if (Array.isArray(params)) return requete[methode](...params);
  return requete[methode](params);
}

/**
 * Renvoie la première ligne (ou undefined).
 * @example get('SELECT * FROM fluides WHERE code = ?', ['R-32'])
 */
function get(sql, params) {
  return appliquerParams('get', sql, params);
}

/**
 * Renvoie toutes les lignes (tableau, éventuellement vide).
 * @example all('SELECT * FROM machines WHERE statut = ?', ['EN_SERVICE'])
 */
function all(sql, params) {
  return appliquerParams('all', sql, params);
}

/**
 * Exécute une requête d'écriture (INSERT/UPDATE/DELETE).
 * @returns {{changes: number|bigint, lastInsertRowid: number|bigint}}
 */
function run(sql, params) {
  return appliquerParams('run', sql, params);
}

/**
 * Exécute `fn` dans une transaction : COMMIT si tout passe, ROLLBACK à la
 * moindre erreur (l'erreur est relancée). `fn` reçoit l'instance de la base.
 *
 * RÉ-ENTRANT (V9-E2) : un appel imbriqué rejoint la transaction ambiante au
 * lieu de lever « cannot start a transaction within a transaction » — et
 * surtout au lieu de la SABORDER par son ROLLBACK. Indispensable pour
 * journaliser une mutation dans le même tout-ou-rien qu'elle (E3).
 * Node est mono-fil et DatabaseSync synchrone : un drapeau suffit.
 * @template T
 * @param {(db: DatabaseSync) => T} fn
 * @returns {T}
 */
let transactionOuverte = false;
function transaction(fn) {
  const db = ouvrir();
  if (transactionOuverte) {
    return fn(db); // rejoint la transaction ambiante (l'appelant décide)
  }
  db.exec('BEGIN IMMEDIATE;');
  transactionOuverte = true;
  try {
    const resultat = fn(db);
    db.exec('COMMIT;');
    return resultat;
  } catch (erreur) {
    db.exec('ROLLBACK;');
    throw erreur;
  } finally {
    transactionOuverte = false;
  }
}

/**
 * Génère un identifiant texte préfixé, unique et trié par date de création :
 * horodatage (base 36) + 6 caractères aléatoires.
 * @example generateId('MVT') → 'MVT-MCK3T9ZQ-4F07A1'
 */
function generateId(prefixe) {
  const horodatage = Date.now().toString(36).toUpperCase();
  const aleatoire = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefixe}-${horodatage}-${aleatoire}`;
}

/**
 * Alphabet base32 Crockford, SANS I, L, O, U (ambiguïtés visuelles), même
 * alphabet que v8/js/core/utils.js — équivalent Node de genererCodePublic
 * (crypto natif au lieu de crypto.getRandomValues navigateur).
 */
const ALPHABET_CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** Longueur fixe d'un code public (VISION-V9-V10 §6). */
const LONGUEUR_CODE_PUBLIC = 7;

/**
 * Génère un identifiant OPAQUE base32 Crockford de 7 caractères pour le QR
 * d'une machine ou d'une bouteille (code_public). Ne garantit PAS
 * l'unicité à lui seul : l'appelant retire (retry) en cas de collision
 * avec la contrainte UNIQUE de la base.
 * @returns {string} ex. « 8F3K2Q7 »
 */
function genererCodePublic() {
  const octets = crypto.randomBytes(LONGUEUR_CODE_PUBLIC);
  let code = '';
  for (let i = 0; i < LONGUEUR_CODE_PUBLIC; i += 1) {
    code += ALPHABET_CROCKFORD[octets[i] % ALPHABET_CROCKFORD.length];
  }
  return code;
}

/**
 * Sérialisation JSON stable (clés triées récursivement) : le hash d'une même
 * écriture est identique quel que soit l'ordre de construction de l'objet.
 */
function stringifierStable(valeur) {
  if (valeur === null || typeof valeur !== 'object') {
    return JSON.stringify(valeur === undefined ? null : valeur);
  }
  if (Array.isArray(valeur)) {
    return '[' + valeur.map(stringifierStable).join(',') + ']';
  }
  const cles = Object.keys(valeur).sort();
  return '{' + cles
    .map((cle) => JSON.stringify(cle) + ':' + stringifierStable(valeur[cle]))
    .join(',') + '}';
}

/**
 * Écrit une entrée CHAÎNÉE au journal d'audit (V9-E2 — le vrai passage
 * démo → coffre-fort). L'empreinte de chaque entrée intègre celle de
 * l'entrée précédente : toute excision a posteriori (même par un outil
 * externe qui contournerait les déclencheurs) casse la chaîne et devient
 * détectable par verifierChaineJournal().
 * Sérialisé par transaction (BEGIN IMMEDIATE) : pas de fourche de chaîne.
 * @param {{qui?: string, action: string, cible?: string, details?: string}} entree
 * @returns {string} L'empreinte de l'entrée écrite.
 */
function journaliser({ qui = null, action, cible = null, details = null }) {
  if (!action || !String(action).trim()) {
    throw new Error('Action de journal obligatoire.');
  }
  return transaction((bdd) => {
    const precedent = bdd.prepare(
      `SELECT hash FROM journal_audit
       WHERE hash IS NOT NULL ORDER BY id DESC LIMIT 1`).get();
    const contenu = {
      date_heure: new Date().toISOString(),
      utilisateur: qui ?? 'système',
      action: String(action),
      cible,
      details
    };
    const hash = hashEcriture(contenu, precedent?.hash ?? '');
    bdd.prepare(
      `INSERT INTO journal_audit
         (date_heure, utilisateur, action, cible, details,
          hash_precedent, hash)
       VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(contenu.date_heure, contenu.utilisateur, contenu.action,
        contenu.cible, contenu.details, precedent?.hash ?? null, hash);
    return hash;
  });
}

/**
 * Re-parcourt le journal d'audit EN ENTIER et recalcule chaque empreinte.
 * Depuis E2, TOUTE entrée passe par journaliser() : une ligne sans hash est
 * une anomalie en soi (forgerie insérée à côté de la chaîne, ou entrée
 * soustraite à la vérification) — elle est SIGNALÉE, jamais tolérée
 * (trou découvert en revue adversariale E2 : une entrée forgée hash NULL
 * passait au vert).
 * Limites documentées (vision §4.6, tamper-evidence) : une troncature de
 * FIN de chaîne et une ré-écriture complète cohérente, disque en main,
 * restent indétectables sans scellé conservé hors système.
 * @returns {{ok: boolean, casseA: number|null}} casseA = id de la première
 *          entrée en rupture (excision, altération ou hors chaîne).
 */
function verifierChaineJournal() {
  const entrees = all(
    `SELECT id, date_heure, utilisateur, action, cible, details,
            hash_precedent, hash
     FROM journal_audit ORDER BY id`);
  let precedent = '';
  for (const entree of entrees) {
    if (entree.hash === null) {
      return { ok: false, casseA: entree.id };
    }
    const attendu = hashEcriture({
      date_heure: entree.date_heure,
      utilisateur: entree.utilisateur,
      action: entree.action,
      cible: entree.cible,
      details: entree.details
    }, precedent);
    if ((entree.hash_precedent ?? '') !== precedent
      || entree.hash !== attendu) {
      return { ok: false, casseA: entree.id };
    }
    precedent = entree.hash;
  }
  return { ok: true, casseA: null };
}

/**
 * Empreinte SHA-256 chaînée d'une écriture du registre (SPEC-V8 §5.6).
 * Le hash de chaque écriture validée intègre le hash de l'écriture validée
 * précédente : toute altération a posteriori casse la chaîne, ce qui rend le
 * registre vérifiable de bout en bout.
 * @param {object} donnees Contenu de l'écriture (objet simple).
 * @param {string} [hashPrecedent] Hash de l'écriture validée précédente
 *                                 ('' pour la première écriture).
 * @returns {string} Empreinte hexadécimale (64 caractères).
 */
function hashEcriture(donnees, hashPrecedent = '') {
  return crypto
    .createHash('sha256')
    .update(hashPrecedent + '\n' + stringifierStable(donnees), 'utf8')
    .digest('hex');
}

module.exports = {
  CHEMIN_BASE_DEFAUT,
  VERSION_BASE,
  ouvrir,
  fermer,
  estOuverte,
  reouvrir,
  versionBase,
  vacuumInto,
  cheminOuvert,
  get,
  all,
  run,
  transaction,
  generateId,
  genererCodePublic,
  hashEcriture,
  journaliser,
  verifierChaineJournal,
};
