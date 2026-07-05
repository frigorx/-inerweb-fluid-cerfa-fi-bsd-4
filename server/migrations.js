'use strict';

/**
 * inerWeb Fluide — Migrations de schéma versionnées (V9-E1).
 *
 * Discipline (VISION-V9-V10 §11) :
 *  - La version de la base vit dans `PRAGMA user_version`.
 *  - schema.sql crée la BASE v1 sur une base VIERGE uniquement (db.js) ;
 *    toute évolution ultérieure est une migration ci-dessous.
 *  - Boucle : tant que user_version < version cible, jouer la migration
 *    suivante DANS UNE TRANSACTION (tout ou rien), puis estampiller.
 *  - Les versions sont consécutives (un trou dans le registre = erreur).
 *  - JAMAIS de DROP destructif, JAMAIS de re-hash d'écritures scellées :
 *    une migration AJOUTE (tables, colonnes, index) ou transforme sans
 *    perte. Une écriture du registre n'est jamais réécrite.
 *  - Chaque migration est rejouable de zéro (base v1 → cible) : c'est le
 *    chemin UNIQUE — les bases neuves passent par les mêmes migrations
 *    que les bases existantes, donc elles sont éprouvées à chaque création.
 *
 * Registre :
 *   2 — sites : le chaînon client ↔ machine (vision §3), porté par V9.1.
 *   3 — codes publics : identifiants opaques stables pour les QR (vision §6).
 *   4 — journal chaîné (E2) : hash_precedent + hash + cible/details.
 *   5 — comptes/sessions (E5) : verrouillage utilisateurs_app + table
 *       sessions (remplace le raccourci provisoire loopback = REFERENT).
 */

/** Version de base posée par schema.sql (base vierge). */
const VERSION_BASE = 1;

/**
 * Le registre des migrations. Clé = version CIBLE (entier), valeur =
 * { nom, appliquer(db) }. `appliquer` reçoit l'instance DatabaseSync et
 * s'exécute déjà dans une transaction : ne pas ouvrir la sienne.
 */
const MIGRATIONS = {

  2: {
    nom: 'sites',
    appliquer(db) {
      // Le chaînon manquant de la hiérarchie métier :
      // clients_detenteurs ──< sites ──< machines (vision §3).
      db.exec(`
        CREATE TABLE IF NOT EXISTS sites (
            id                  TEXT PRIMARY KEY,            -- SITE-…
            etablissement_id    TEXT NOT NULL REFERENCES etablissements(id),
            client_detenteur_id TEXT NOT NULL REFERENCES clients_detenteurs(id),
            nom                 TEXT NOT NULL,               -- « Cuisine centrale », « Magasin nord »
            adresse             TEXT,                        -- adresse physique du site (différente du siège)
            latitude            REAL,
            longitude           REAL,                        -- géolocalisation optionnelle (tournées V10)
            contact_site        TEXT,
            telephone           TEXT,
            actif               INTEGER NOT NULL DEFAULT 1 CHECK (actif IN (0,1)),
            date_creation       TEXT NOT NULL DEFAULT (datetime('now','localtime'))
        );
      `);
      // Nullable au départ (règle d'or : brancher le neuf avant de retirer
      // l'ancien). On GARDE client_detenteur_id sur la machine
      // (dénormalisation assumée — cadre 2 du CERFA, machine mobile entre
      // sites du même client).
      db.exec('ALTER TABLE machines ADD COLUMN site_id TEXT REFERENCES sites(id);');
      db.exec('CREATE INDEX IF NOT EXISTS idx_machines_site ON machines (site_id);');
    }
  },

  3: {
    nom: 'codes_publics_qr',
    appliquer(db) {
      // Identifiant OPAQUE public, stable à vie, résolu par la base
      // (vision §6) : le QR encode une URL courte vers ce code, jamais
      // l'id interne (qui fuite l'horodatage), jamais de données métier.
      db.exec('ALTER TABLE machines   ADD COLUMN code_public TEXT;');
      db.exec('ALTER TABLE bouteilles ADD COLUMN code_public TEXT;');
      db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_machines_code_public
                 ON machines (code_public) WHERE code_public IS NOT NULL;`);
      db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_bouteilles_code_public
                 ON bouteilles (code_public) WHERE code_public IS NOT NULL;`);
    }
  },

  4: {
    nom: 'journal_chaine',
    appliquer(db) {
      // LE vrai passage démo → coffre-fort (vision §3) : le journal d'audit
      // devient chaîné par hash. Les déclencheurs interdisent déjà toute
      // modification/suppression PAR L'APPLICATION ; le chaînage rend toute
      // excision par un outil externe DÉTECTABLE (tamper-evidence, §4.6).
      // cible/details : les deux champs du contrat (getJournalAudit) qui
      // n'avaient pas de colonne d'accueil — entite_type/entite_id/
      // avant_json/apres_json restent réservés au serveur.
      db.exec('ALTER TABLE journal_audit ADD COLUMN cible TEXT;');
      db.exec('ALTER TABLE journal_audit ADD COLUMN details TEXT;');
      db.exec('ALTER TABLE journal_audit ADD COLUMN hash_precedent TEXT;');
      db.exec('ALTER TABLE journal_audit ADD COLUMN hash TEXT;');
    }
  },

  5: {
    nom: 'comptes_sessions',
    appliquer(db) {
      // Verrouillage après échecs (V9-E5, remplace loopback = REFERENT) :
      // compteur PAR COMPTE (jamais par IP), remis à zéro sur connexion
      // réussie ; verrouille_jusqua NULL = compte non verrouillé.
      db.exec(`ALTER TABLE utilisateurs_app
                 ADD COLUMN echecs_consecutifs INTEGER NOT NULL DEFAULT 0;`);
      db.exec('ALTER TABLE utilisateurs_app ADD COLUMN verrouille_jusqua TEXT;');

      // Sessions : jeton = SHA-256 du jeton clair (jamais le clair en base —
      // le cookie porte le clair, la base ne connaît que son empreinte). Le
      // rôle est FIGÉ à l'ouverture de session (source de vérité serveur,
      // jamais recalculé depuis le corps d'une requête).
      db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
            jeton           TEXT PRIMARY KEY,          -- SHA-256 (hex) du jeton clair
            utilisateur_id  TEXT NOT NULL REFERENCES utilisateurs_app(id),
            role            TEXT NOT NULL,              -- rôle figé à la connexion
            cree_le         TEXT NOT NULL,              -- ISO
            expire_le       TEXT NOT NULL,              -- ISO — durée de vie 8 h
            ip              TEXT,                       -- IP du poste à la connexion
            revoque         INTEGER NOT NULL DEFAULT 0 CHECK (revoque IN (0,1))
        );
      `);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_utilisateur
                 ON sessions (utilisateur_id);`);
    }
  }
};

/** Version cible = plus grande version du registre (ou la base s'il est vide). */
function versionCible(registre = MIGRATIONS) {
  const versions = Object.keys(registre).map(Number);
  return versions.length ? Math.max(...versions) : VERSION_BASE;
}

function lireVersion(db) {
  return db.prepare('PRAGMA user_version').get().user_version;
}

/**
 * Joue toutes les migrations en attente, une par une, chacune dans sa
 * transaction. Retourne la version finale de la base.
 * @param {import('node:sqlite').DatabaseSync} db Base ouverte.
 * @param {object} [registre] Registre de migrations (celui du module par
 *                            défaut — paramétrable pour les tests).
 */
function migrer(db, registre = MIGRATIONS) {
  let version = lireVersion(db);
  if (version < VERSION_BASE) {
    throw new Error(
      `Base non initialisée (user_version = ${version}) : le socle v1 ` +
      'doit être créé par schema.sql avant toute migration (db.js).');
  }

  const aJouer = Object.keys(registre).map(Number).sort((a, b) => a - b);
  for (const cible of aJouer) {
    if (version >= cible) continue;
    if (cible !== version + 1) {
      throw new Error(
        `Registre de migrations troué : version ${version} en base, ` +
        `migration ${cible} attendue en ${version + 1}.`);
    }
    const migration = registre[cible];
    db.exec('BEGIN IMMEDIATE;');
    try {
      migration.appliquer(db);
      db.exec(`PRAGMA user_version = ${cible};`);
      db.exec('COMMIT;');
    } catch (erreur) {
      db.exec('ROLLBACK;');
      throw new Error(
        `Migration ${cible} (${migration.nom}) échouée — base laissée en ` +
        `version ${version}, rien n'a été appliqué : ${erreur.message}`);
    }
    version = cible;
  }
  return version;
}

module.exports = {
  VERSION_BASE,
  MIGRATIONS,
  versionCible,
  lireVersion,
  migrer
};
