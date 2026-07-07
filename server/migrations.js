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
 *   6 — backfill code_public machines (V9.1) : toute machine préexistante
 *       (créée avant la migration 003) reçoit un code public unique — la
 *       colonne posée par la migration 003 restait vide, rien ne la
 *       remplissait encore côté application.
 *   7 — cycle du fluide (lot F-Gas R1/R2/R6) : bouteilles.composition_melange
 *       (JSON, trace des versements croisés dans une bouteille MELANGE, R2).
 *   8 — cycle de la fuite (lot F-Gas R3/R4/R5) : controles.date_reparation /
 *       nature_reparation / reparateur / reparateur_id — réparation TRACÉE
 *       a posteriori sur un contrôle FUITE (tracerReparation()) ;
 *       mouvements.localisation_fuite_declaree — localisation de la fuite
 *       déclarée à l'étape 5 du wizard (R5), même pattern que
 *       statut_controle_declare/detecteur_declare_id.
 *   9 — backfill code_public bouteilles (V9.2, parité migration 6) : toute
 *       bouteille préexistante (créée avant que createBouteille ne génère
 *       systématiquement le code) reçoit un code public unique — la colonne
 *       posée par la migration 003 restait vide côté bouteilles, rien ne la
 *       remplissait encore côté application.
 */

/** Version de base posée par schema.sql (base vierge). */
const VERSION_BASE = 1;

/**
 * Alphabet base32 Crockford, SANS I, L, O, U — identique à celui de db.js
 * et de v8/js/core/utils.js. Dupliqué ici (pas d'import croisé db.js ↔
 * migrations.js) pour le seul usage du backfill de la migration 6.
 */
const ALPHABET_CROCKFORD_MIGRATION = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** Tire un code public de 7 caractères (backfill migration 6 uniquement). */
function tirerCodePublicMigration() {
  const crypto = require('node:crypto');
  const octets = crypto.randomBytes(7);
  let code = '';
  for (let i = 0; i < 7; i += 1) {
    code += ALPHABET_CROCKFORD_MIGRATION[
      octets[i] % ALPHABET_CROCKFORD_MIGRATION.length];
  }
  return code;
}

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
  },

  6: {
    nom: 'backfill_code_public_machines',
    appliquer(db) {
      // La migration 003 avait posé la colonne (nullable) et son index
      // UNIQUE partiel, mais rien ne la remplissait encore : toute machine
      // créée avant l'introduction de createMachine « générateur » (V9.1)
      // reste avec code_public NULL. Backfill un-shot, un code UNIQUE par
      // ligne (retry en cas de collision avec le parc déjà en base).
      const sansCode = db.prepare(
        'SELECT id FROM machines WHERE code_public IS NULL').all();
      const dejaPris = new Set(
        db.prepare('SELECT code_public AS c FROM machines WHERE code_public IS NOT NULL')
          .all().map((l) => l.c));
      const maj = db.prepare(
        'UPDATE machines SET code_public = ? WHERE id = ?');
      for (const { id } of sansCode) {
        let code = tirerCodePublicMigration();
        while (dejaPris.has(code)) code = tirerCodePublicMigration();
        dejaPris.add(code);
        maj.run(code, id);
      }
    }
  },

  7: {
    nom: 'cycle_fluide_melange',
    appliquer(db) {
      // R2 : traçabilité des versements croisés dans une bouteille de
      // RÉCUPÉRATION marquée etatFluide = 'MELANGE' (déjà admise par le
      // CHECK du socle v1) — un versement par ligne { fluide, quantiteKg,
      // date, mouvementId }, JSON nullable (NULL = pas mélangée / historique
      // non tracé pour les bouteilles préexistantes).
      db.exec('ALTER TABLE bouteilles ADD COLUMN composition_melange TEXT;');
    }
  },

  8: {
    nom: 'cycle_fluide_reparation',
    appliquer(db) {
      // R3/R4 : réparation TRACÉE a posteriori sur un contrôle FUITE —
      // distincte de date_reparation_prevue (échéance ANNONCÉE au moment
      // de la fuite, colonne déjà posée par le socle v1). Pose sur le
      // contrôle lui-même (pattern operateur/operateur_id déjà en place) :
      // une fuite = une réparation tracée, éventuellement mise à jour.
      db.exec('ALTER TABLE controles ADD COLUMN date_reparation TEXT;');
      db.exec('ALTER TABLE controles ADD COLUMN nature_reparation TEXT;');
      db.exec('ALTER TABLE controles ADD COLUMN reparateur TEXT;');
      db.exec(`ALTER TABLE controles
                 ADD COLUMN reparateur_id TEXT REFERENCES personnel(id);`);
      // R5 : localisation de la fuite DÉCLARÉE dans le mouvement (étape 5
      // du wizard) — même pattern que statut_controle_declare /
      // detecteur_declare_id, propagée au VRAI contrôle par CR-3.
      db.exec('ALTER TABLE mouvements ADD COLUMN localisation_fuite_declaree TEXT;');
    }
  },

  9: {
    nom: 'backfill_code_public_bouteilles',
    appliquer(db) {
      // Parité exacte de la migration 6 (backfill machines), scopée sur
      // bouteilles : la migration 003 avait posé la colonne (nullable) et
      // son index UNIQUE partiel, mais rien ne la remplissait encore côté
      // bouteilles — toute bouteille créée avant l'introduction du
      // générateur dans createBouteille reste avec code_public NULL.
      // Backfill un-shot, un code UNIQUE par ligne (retry en cas de
      // collision avec le parc déjà en base).
      const sansCode = db.prepare(
        'SELECT id FROM bouteilles WHERE code_public IS NULL').all();
      const dejaPris = new Set(
        db.prepare('SELECT code_public AS c FROM bouteilles WHERE code_public IS NOT NULL')
          .all().map((l) => l.c));
      const maj = db.prepare(
        'UPDATE bouteilles SET code_public = ? WHERE id = ?');
      for (const { id } of sansCode) {
        let code = tirerCodePublicMigration();
        while (dejaPris.has(code)) code = tirerCodePublicMigration();
        dejaPris.add(code);
        maj.run(code, id);
      }
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
