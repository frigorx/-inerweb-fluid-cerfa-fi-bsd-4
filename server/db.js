'use strict';

/**
 * inerWeb Fluide v8 — Module d'accès à la base SQLite (Mode Local Lycée).
 *
 * - SQLite via le module intégré `node:sqlite` (Node ≥ 22) : zéro dépendance
 *   externe, rien à installer (SPEC-V8 §2.2).
 * - La base vit dans `data/inerweb-fluide.db` à côté de l'application ; le
 *   dossier est créé au besoin.
 * - À l'ouverture : clés étrangères activées, journal en mode WAL, puis
 *   exécution de `schema.sql` (idempotent : IF NOT EXISTS partout).
 * - Fournit aussi les deux aides transverses du registre :
 *   `generateId(prefixe)` (identifiants préfixés MAC-, BTL-, MVT-…) et
 *   `hashEcriture(donnees, hashPrecedent)` (empreinte SHA-256 chaînée,
 *   SPEC-V8 §5.6 : registre inviolable).
 */

const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

// Chemins par défaut : la base dans data/ à la racine de l'application,
// le schéma à côté de ce module.
const CHEMIN_BASE_DEFAUT = path.join(__dirname, '..', 'data', 'inerweb-fluide.db');
const CHEMIN_SCHEMA = path.join(__dirname, 'schema.sql');

/** Instance unique de la base (ouverte à la demande). */
let base = null;

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

  // Intégrité référentielle + journal WAL (lectures concurrentes, robustesse).
  base.exec('PRAGMA foreign_keys = ON;');
  base.exec('PRAGMA journal_mode = WAL;');

  // Application du schéma (jamais de DROP, IF NOT EXISTS partout).
  base.exec(fs.readFileSync(CHEMIN_SCHEMA, 'utf8'));

  return base;
}

/** Ferme proprement la base (fin de programme, tests). */
function fermer() {
  if (base) {
    base.close();
    base = null;
  }
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
 * @template T
 * @param {(db: DatabaseSync) => T} fn
 * @returns {T}
 */
function transaction(fn) {
  const db = ouvrir();
  db.exec('BEGIN IMMEDIATE;');
  try {
    const resultat = fn(db);
    db.exec('COMMIT;');
    return resultat;
  } catch (erreur) {
    db.exec('ROLLBACK;');
    throw erreur;
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
  ouvrir,
  fermer,
  get,
  all,
  run,
  transaction,
  generateId,
  hashEcriture,
};
