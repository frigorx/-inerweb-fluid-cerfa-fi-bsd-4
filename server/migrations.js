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
 *  10 — catégories de pièces jointes élargies (Phase 2, Lot 0) : le CHECK du
 *       socle v1 sur pieces_jointes.categorie refusait cinq catégories POURTANT
 *       posées par le front (SIGNATURE, ATTESTATION_APTITUDE, ATTESTATION_CAPACITE,
 *       BORDEREAU_BSFF, CERTIFICAT_ETALONNAGE) → échec silencieux en Mode Local
 *       (SQLite), la démo (sans liste blanche) les acceptait. Recréation de la
 *       table (SQLite ne sait pas ALTERer un CHECK), données et index préservés.
 *  11 — code_public des clients (Phase 2, référence client QR) : colonne opaque
 *       QR sur clients_detenteurs (comme machines/bouteilles migration 003) +
 *       index UNIQUE partiel + backfill un-shot des clients préexistants. Permet
 *       une étiquette QR « chez le client » qui ouvre la liste de ses machines.
 *  12 — code_public de l'outillage (Phase 2, QR outillage) : même patron que la
 *       migration 011, scopé sur outillage — étiquette QR sur un outil qui ouvre
 *       sa fiche (état d'étalonnage/vérification).
 *  13 — PRP figé sur les mouvements (brique ② / B7) : mouvements.prg_fige
 *       (REAL NULL, nommage prg_* aligné sur controles.prg_utilise ; clé front
 *       prpFige), posé à la VALIDATION avec le gwp_ar4 courant du fluide du
 *       mouvement. HORS empreinte chaînée (liste blanche du hasseur), pas de
 *       backfill (NULL = pas figé à l'époque). Recrée le déclencheur WORM avec
 *       la liste complète — répare aussi le trou de la migration 8 (bases
 *       d'avant le 06/07 : localisation_fuite_declaree non surveillée).
 *  14 — inventaire NOMINATIF (brique ② / B7, CF-20 annoncé « V9.4 ») : tables
 *       inventaires_bouteilles + inventaires_fuites = PHOTOGRAPHIE de l'état
 *       bouteille par bouteille (et des fuites machines ouvertes) FIGÉE à la
 *       saisie de l'inventaire annuel — le rejeu des mouvements ne peut PAS
 *       reconstituer l'état passé (les pesées écrasent hors registre).
 *       Dénormalisées à dessein (code, fluide, masse recopiés) : une photo
 *       doit rester lisible même si la bouteille évolue ensuite.
 *  15 — sentinelle d'alertes persistées : table sentinelle_alertes = un
 *       ÉPISODE par occurrence continue d'une alerte (rafraichirSentinelle
 *       ouvre/clôt, acquitterAlerte marque la prise de connaissance +
 *       journal chaîné). Index UNIQUE partiel « un seul épisode ouvert par
 *       alerte ». getAlertes() reste la vérité du présent ; la sentinelle
 *       n'HISTORISE que le temps et l'acquittement — jamais de masquage.
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
  },

  10: {
    nom: 'categories_pieces_jointes_elargies',
    appliquer(db) {
      // Phase 2, Lot 0 — le fil rouge du CDC. Le CHECK du socle v1 sur
      // pieces_jointes.categorie ne connaissait que dix catégories et
      // REFUSAIT en Mode Local (SQLite) cinq catégories POURTANT posées par
      // le front — la démo, sans liste blanche, les acceptait, d'où l'échec
      // invisible tant qu'on ne passait pas sur SQLite :
      //   SIGNATURE             signature d'un personnel      (personne-form)
      //   ATTESTATION_APTITUDE  aptitude d'une personne       (personne-form)
      //   ATTESTATION_CAPACITE  capacité de l'établissement   (etablissement-form, dossier-audit)
      //   BORDEREAU_BSFF        bordereau BSFF                (bsff-form)
      //   CERTIFICAT_ETALONNAGE étalonnage d'un outil         (outil-form)
      // SQLite ne sait pas ALTERer une contrainte CHECK : on RECRÉE la table
      // (procédure officielle SQLite), TOUTES les données et l'unique index
      // préservés. Aucun trigger, aucune FK entrante sur pieces_jointes ; sa
      // seule FK sortante (etablissement_id) est déjà satisfaite par les
      // lignes existantes. Copie par colonnes NOMMÉES (robuste à un futur
      // changement d'ordre du socle). recursive_triggers/foreign_keys sont
      // sans effet ici (pas de trigger, pas de FK entrante).
      db.exec(`
        CREATE TABLE pieces_jointes_nouveau (
            id             TEXT PRIMARY KEY,
            etablissement_id TEXT REFERENCES etablissements(id),
            entite_type    TEXT NOT NULL
                CHECK (entite_type IN ('ETABLISSEMENT','AUDIT','NON_CONFORMITE','PERSONNEL','OUTILLAGE',
                                       'MACHINE','BOUTEILLE','MOUVEMENT','CONTROLE','BSFF',
                                       'CLIENT_DETENTEUR','INVENTAIRE')),
            entite_id      TEXT NOT NULL,
            categorie      TEXT NOT NULL DEFAULT 'AUTRE'
                CHECK (categorie IN ('ATTESTATION','CERTIFICAT','FACTURE','BL','BON_DE_REPRISE','BSFF',
                                     'PHOTO_PESEE','PLAQUE_SIGNALETIQUE','RAPPORT','AUTRE',
                                     'SIGNATURE','ATTESTATION_APTITUDE','ATTESTATION_CAPACITE',
                                     'BORDEREAU_BSFF','CERTIFICAT_ETALONNAGE')),
            nom_fichier    TEXT NOT NULL,
            mime_type      TEXT,
            chemin         TEXT,
            taille_octets  INTEGER,
            hash_sha256    TEXT,
            date_ajout     TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            ajoute_par     TEXT
        );
      `);
      db.exec(`
        INSERT INTO pieces_jointes_nouveau
            (id, etablissement_id, entite_type, entite_id, categorie,
             nom_fichier, mime_type, chemin, taille_octets, hash_sha256,
             date_ajout, ajoute_par)
        SELECT id, etablissement_id, entite_type, entite_id, categorie,
               nom_fichier, mime_type, chemin, taille_octets, hash_sha256,
               date_ajout, ajoute_par
          FROM pieces_jointes;
      `);
      db.exec('DROP TABLE pieces_jointes;');
      db.exec('ALTER TABLE pieces_jointes_nouveau RENAME TO pieces_jointes;');
      db.exec(`CREATE INDEX IF NOT EXISTS idx_pj_entite
                 ON pieces_jointes (entite_type, entite_id);`);
    }
  },

  11: {
    nom: 'code_public_clients',
    appliquer(db) {
      // Même patron que la migration 003 (machines/bouteilles) : colonne
      // opaque nullable + index UNIQUE partiel (n'indexe que les non-NULL).
      db.exec('ALTER TABLE clients_detenteurs ADD COLUMN code_public TEXT;');
      db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_code_public
                 ON clients_detenteurs (code_public) WHERE code_public IS NOT NULL;`);
      // Backfill un-shot des clients préexistants (parité migrations 006/009) :
      // un code UNIQUE par ligne, retry en cas de collision avec le parc déjà
      // en base. Jamais régénéré une fois posé.
      const sansCode = db.prepare(
        'SELECT id FROM clients_detenteurs WHERE code_public IS NULL').all();
      const dejaPris = new Set(
        db.prepare('SELECT code_public AS c FROM clients_detenteurs WHERE code_public IS NOT NULL')
          .all().map((l) => l.c));
      const maj = db.prepare(
        'UPDATE clients_detenteurs SET code_public = ? WHERE id = ?');
      for (const { id } of sansCode) {
        let code = tirerCodePublicMigration();
        while (dejaPris.has(code)) code = tirerCodePublicMigration();
        dejaPris.add(code);
        maj.run(code, id);
      }
    }
  },

  12: {
    nom: 'code_public_outillage',
    appliquer(db) {
      // Parité exacte de la migration 011, scopée sur outillage.
      db.exec('ALTER TABLE outillage ADD COLUMN code_public TEXT;');
      db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_outillage_code_public
                 ON outillage (code_public) WHERE code_public IS NOT NULL;`);
      const sansCode = db.prepare(
        'SELECT id FROM outillage WHERE code_public IS NULL').all();
      const dejaPris = new Set(
        db.prepare('SELECT code_public AS c FROM outillage WHERE code_public IS NOT NULL')
          .all().map((l) => l.c));
      const maj = db.prepare(
        'UPDATE outillage SET code_public = ? WHERE id = ?');
      for (const { id } of sansCode) {
        let code = tirerCodePublicMigration();
        while (dejaPris.has(code)) code = tirerCodePublicMigration();
        dejaPris.add(code);
        maj.run(code, id);
      }
    }
  },

  13: {
    nom: 'prg_fige_mouvements',
    appliquer(db) {
      // PRP (GWP AR4) FIGÉ à la validation du mouvement — brique ② (B7).
      // Nommage SQL prg_* aligné sur le précédent controles.prg_utilise ;
      // clé front = prpFige (mapping.js). Champ HORS empreinte chaînée
      // (CHAMPS_HASH_MOUVEMENT est une liste blanche : rien à faire), donc
      // les chaînes existantes restent valides. PAS de backfill : NULL sur
      // les écritures antérieures = « pas figé à l'époque » (antidater une
      // valeur figée serait mensonger vis-à-vis d'un audit) ; l'affichage
      // replie sur le référentiel courant en le disant.
      db.exec('ALTER TABLE mouvements ADD COLUMN prg_fige REAL;');

      // Recréation du déclencheur WORM avec la liste de colonnes COMPLÈTE :
      // couvre prg_fige, et RÉPARE au passage le trou hérité de la
      // migration 8 (les bases créées avant le 06/07 gardaient un trigger
      // qui ne surveillait pas localisation_fuite_declaree pendant la
      // bascule VALIDE→ANNULE). Recréer un trigger ne touche à AUCUNE
      // donnée : aucun re-hash, aucune écriture de ligne.
      db.exec('DROP TRIGGER IF EXISTS mouvements_interdire_modification_validee;');
      db.exec(`CREATE TRIGGER mouvements_interdire_modification_validee
BEFORE UPDATE ON mouvements
WHEN OLD.statut = 'VALIDE'
 AND NOT (    NEW.statut = 'ANNULE'
          AND NEW.id                    IS OLD.id
          AND NEW.numero                IS OLD.numero
          AND NEW.etablissement_id      IS OLD.etablissement_id
          AND NEW.date_mouvement        IS OLD.date_mouvement
          AND NEW.mode                  IS OLD.mode
          AND NEW.type_operation        IS OLD.type_operation
          AND NEW.cause                 IS OLD.cause
          AND NEW.machine_id            IS OLD.machine_id
          AND NEW.machine_label         IS OLD.machine_label
          AND NEW.machine_destination_id IS OLD.machine_destination_id
          AND NEW.bouteille_source_id   IS OLD.bouteille_source_id
          AND NEW.bouteille_destination_id IS OLD.bouteille_destination_id
          AND NEW.fluide                IS OLD.fluide
          AND NEW.pesee_avant_kg        IS OLD.pesee_avant_kg
          AND NEW.pesee_apres_kg        IS OLD.pesee_apres_kg
          AND NEW.quantite_calculee_kg  IS OLD.quantite_calculee_kg
          AND NEW.sens                  IS OLD.sens
          AND NEW.quantite_chargee_kg               IS OLD.quantite_chargee_kg
          AND NEW.quantite_recuperee_kg             IS OLD.quantite_recuperee_kg
          AND NEW.quantite_cedee_kg                 IS OLD.quantite_cedee_kg
          AND NEW.quantite_retournee_fournisseur_kg IS OLD.quantite_retournee_fournisseur_kg
          AND NEW.quantite_detruite_regeneree_kg    IS OLD.quantite_detruite_regeneree_kg
          AND NEW.origine_fluide        IS OLD.origine_fluide
          AND NEW.destination_fluide    IS OLD.destination_fluide
          AND NEW.technicien            IS OLD.technicien
          AND NEW.technicien_id         IS OLD.technicien_id
          AND NEW.validateur_id         IS OLD.validateur_id
          AND NEW.statut_controle_declare IS OLD.statut_controle_declare
          AND NEW.detecteur_declare_id  IS OLD.detecteur_declare_id
          AND NEW.localisation_fuite_declaree IS OLD.localisation_fuite_declaree
          AND NEW.controle_lie_id       IS OLD.controle_lie_id
          AND NEW.signature_data_url    IS OLD.signature_data_url
          AND NEW.cerfa_numero          IS OLD.cerfa_numero
          AND NEW.bsff_id               IS OLD.bsff_id
          AND NEW.observation           IS OLD.observation
          AND NEW.date_soumission       IS OLD.date_soumission
          AND NEW.motif_rejet           IS OLD.motif_rejet
          AND NEW.motif                 IS OLD.motif
          AND NEW.hash_ecriture         IS OLD.hash_ecriture
          AND NEW.hash_precedent        IS OLD.hash_precedent
          AND NEW.ordre_validation      IS OLD.ordre_validation
          AND NEW.contre_ecriture_de    IS OLD.contre_ecriture_de
          AND NEW.date_creation         IS OLD.date_creation
          AND NEW.prg_fige              IS OLD.prg_fige)
BEGIN
    SELECT RAISE(ABORT, 'Registre verrouillé : une écriture validée ne peut pas être modifiée (utiliser une contre-écriture).');
END;`);
    }
  },

  14: {
    nom: 'inventaire_nominatif',
    appliquer(db) {
      // Photographies annuelles nominatives (brique ② / B7). Une ligne par
      // bouteille présente à la photo (upsert PAR ANNÉE : re-saisir
      // l'inventaire d'une année REFIGE sa photo). Pas de FK vers
      // bouteilles/machines : la photo est une archive dénormalisée qui
      // doit survivre à l'évolution du parc.
      // Seules les colonnes posées PAR la photo elle-même sont NOT NULL :
      // les champs recopiés de la bouteille restent nullables (une
      // bouteille importée d'un vieil export peut être incomplète — la
      // photo doit la documenter telle quelle, pas bloquer l'inventaire).
      db.exec(`CREATE TABLE IF NOT EXISTS inventaires_bouteilles (
        etablissement_id TEXT NOT NULL REFERENCES etablissements(id),
        annee            INTEGER NOT NULL,
        bouteille_id     TEXT NOT NULL,
        code_interne     TEXT,
        numero_bouteille TEXT,
        type             TEXT,
        fluide           TEXT,
        etat_fluide      TEXT,
        statut           TEXT,
        masse_nette_kg   REAL,
        proprietaire     TEXT,
        date_photo       TEXT NOT NULL,
        PRIMARY KEY (etablissement_id, annee, bouteille_id)
      );`);
      db.exec(`CREATE TABLE IF NOT EXISTS inventaires_fuites (
        etablissement_id TEXT NOT NULL REFERENCES etablissements(id),
        annee            INTEGER NOT NULL,
        machine_id       TEXT NOT NULL,
        machine_label    TEXT,
        date_constat     TEXT,
        localisation     TEXT,
        date_photo       TEXT NOT NULL,
        PRIMARY KEY (etablissement_id, annee, machine_id)
      );`);
    }
  },

  15: {
    nom: 'sentinelle_alertes',
    appliquer(db) {
      // Sentinelle d'alertes persistées : un ÉPISODE par occurrence
      // continue d'une alerte (id_alerte = id stable de getAlertes).
      // getAlertes() reste la vérité du présent ; cette table ne fait
      // qu'HISTORISER — apparueLe / resolueLe — et porter la preuve de
      // prise de connaissance (acquittee_le / acquittee_par, aussi
      // consignée au journal chaîné). Une alerte qui disparaît puis
      // revient ouvre un nouvel épisode (l'ancien reste, résolu).
      // Snapshot (niveau/titre/detail/cible) FIGÉ à l'apparition : il ne
      // sert qu'à l'historique des épisodes clos ; l'affichage courant
      // relit getAlertes(). Pas de FK vers une entité métier (la cible
      // peut être un agrégat — balance, admin — et l'épisode archivé
      // doit survivre à la disparition de sa cible).
      // Invariant applicatif : au plus UN épisode ouvert par id_alerte
      // (garanti par la réconciliation, garanti en base par l'index
      // UNIQUE partiel ci-dessous).
      db.exec(`CREATE TABLE IF NOT EXISTS sentinelle_alertes (
        id               TEXT PRIMARY KEY,
        etablissement_id TEXT NOT NULL REFERENCES etablissements(id),
        id_alerte        TEXT NOT NULL,
        niveau           TEXT NOT NULL,
        titre            TEXT NOT NULL,
        detail           TEXT,
        cible_vue        TEXT,
        cible_id         TEXT,
        apparue_le       TEXT NOT NULL,
        resolue_le       TEXT,
        acquittee_le     TEXT,
        acquittee_par    TEXT
      );`);
      db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_sentinelle_ouverte
        ON sentinelle_alertes (etablissement_id, id_alerte)
        WHERE resolue_le IS NULL;`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_sentinelle_apparue
        ON sentinelle_alertes (apparue_le);`);
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
