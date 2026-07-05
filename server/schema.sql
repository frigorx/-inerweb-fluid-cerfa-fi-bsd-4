-- ============================================================================
-- inerWeb Fluide — Schéma SQLite v1 (Mode Local « coffre-fort », V9)
-- ----------------------------------------------------------------------------
-- Sources de vérité : le CONTRAT DataStore (v8/js/data/contrat.js — les formes
-- front font foi) et docs/SPEC-V8.md (§5 modèle de données, §6 bilan matière,
-- §7 règles réglementaires). Les 18 divergences front↔SQL relevées en V9-E0
-- (server/mapping.js) sont résolues ICI, à la création — aucune base réelle
-- n'existait avant le versionnage.
--
-- VERSIONNAGE (V9-E1) : ce fichier crée la BASE v1 (PRAGMA user_version = 1,
-- posé par server/db.js après exécution). Il n'est exécuté QUE sur une base
-- vierge ; toute évolution ultérieure passe par server/migrations.js
-- (boucle user_version), jamais par modification de ce fichier après coup.
--
-- Conventions :
--   - Identifiants texte préfixés : ETB-, PER-, OUT-, MAC-, BTL-, MVT-, CTL-,
--     BSFF-, PJ-, CLI-, AUD-, NC-, UTI-, RF-, SITE- (générés par server/db.js
--     ou par le front — le format n'est PAS contractuel, seule l'unicité l'est).
--   - Dates métier au format « AAAA-MM-JJ » (contrat §7) ; horodatages ISO
--     complets réservés au journal d'audit et aux pièces jointes.
--   - Booléens : INTEGER 0/1 avec contrainte CHECK.
--   - Quantités de fluide en kilogrammes (REAL), arrondies au gramme.
--   - `etablissement_id` partout (multi-site prêt).
--   - Les clés étrangères sont ACTIVÉES par db.js (PRAGMA foreign_keys = ON).
-- ============================================================================


-- ============================================================================
-- RÉFÉRENTIEL DES FLUIDES FRIGORIGÈNES
-- Base commune : code, famille, PRP (GWP AR4, valeurs de la réglementation
-- F-Gas), classe de sécurité NF EN 378 / ASHRAE 34, statut réglementaire.
-- ============================================================================
CREATE TABLE IF NOT EXISTS fluides (
    code                 TEXT PRIMARY KEY,          -- ex. « R-32 », « R-410A »
    famille              TEXT NOT NULL,             -- HFC, HFO, HC, mélange, inorganique…
    gwp_ar4              REAL NOT NULL,             -- PRP (rapport GIEC AR4 — valeurs F-Gas)
    classe_securite      TEXT NOT NULL
        CHECK (classe_securite IN ('A1','A2L','A2','A3','B1','B2L','B2','B3')),
    statut_reglementaire TEXT NOT NULL DEFAULT 'AUTORISE'
        CHECK (statut_reglementaire IN ('AUTORISE','RESTREINT','INTERDIT')),
    commentaire          TEXT                       -- précisions réglementaires éventuelles
);


-- ============================================================================
-- §5.1 — DOSSIER OPÉRATEUR / ÉTABLISSEMENT
-- Attestation de CAPACITÉ = établissement (≠ attestation d'APTITUDE = personne).
-- Le PDF de l'attestation est porté par la table pieces_jointes.
-- ============================================================================
CREATE TABLE IF NOT EXISTS etablissements (
    id                        TEXT PRIMARY KEY,      -- ETB-…
    raison_sociale            TEXT NOT NULL,         -- ⚿
    siret                     TEXT,                  -- ⚿
    adresse                   TEXT,                  -- ⚿
    numero_attestation_capacite TEXT,                -- ⚿ n° attestation de capacité (établissement)
    organisme_certificateur   TEXT,                  -- Socotec, Bureau Veritas, SGS, Qualiclimafroid…
    date_delivrance           TEXT,                  -- ISO
    date_echeance             TEXT,                  -- ISO — alerte automatique à l'approche (M-2)
    categories_2008           TEXT,                  -- grille 2008 (valable jusqu'au 31/12/2026) — sort à confirmer, cf. mapping
    categories_2025           TEXT,                  -- ⚿ catégories autorisées (contrat : categoriesAutorisees, tableau JSON)
    activites_autorisees      TEXT,                  -- tableau JSON (mise en service, maintenance, contrôle…)
    sites_couverts            TEXT,                  -- tableau JSON des sites/ateliers couverts
    date_dernier_audit        TEXT,                  -- ISO
    date_prochain_audit       TEXT,                  -- ISO
    date_creation             TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- Audits de l'organisme certificateur (table liée du dossier opérateur).
-- `resultat` : texte libre (contrat) — « Conforme avec 1 remarque »…
CREATE TABLE IF NOT EXISTS audits_etablissement (
    id               TEXT PRIMARY KEY,               -- AUD-…
    etablissement_id TEXT NOT NULL REFERENCES etablissements(id),
    date_audit       TEXT NOT NULL,                  -- ISO
    organisme        TEXT,                           -- organisme ayant réalisé l'audit
    type_audit       TEXT,                           -- initial, de suivi, de renouvellement…
    resultat         TEXT,                           -- texte libre (aligné contrat, E0)
    observation      TEXT
);

-- Non-conformités relevées + actions correctives (table liée).
-- Cycle contractuel : OUVERTE → SOLDEE (avec commentaire de preuve).
CREATE TABLE IF NOT EXISTS non_conformites (
    id                  TEXT PRIMARY KEY,            -- NC-…
    etablissement_id    TEXT NOT NULL REFERENCES etablissements(id),
    audit_id            TEXT REFERENCES audits_etablissement(id),
    date_constat        TEXT DEFAULT (date('now','localtime')),  -- ISO
    description         TEXT NOT NULL,
    gravite             TEXT
        CHECK (gravite IS NULL OR gravite IN ('MINEURE','MAJEURE','CRITIQUE')),
    action_corrective   TEXT,                        -- action décidée
    date_echeance_action TEXT,                       -- ISO — date limite de l'action corrective
    date_cloture        TEXT,                        -- ISO — NULL tant que la NC est ouverte
    commentaire_solde   TEXT,                        -- preuve de l'action (obligatoire au solde, contrôle applicatif)
    statut              TEXT NOT NULL DEFAULT 'OUVERTE'
        CHECK (statut IN ('OUVERTE','SOLDEE'))
);


-- ============================================================================
-- §5.2 — REGISTRE DU PERSONNEL
-- Un élève = mode formation uniquement, jamais officiel. Le personnel n'est
-- JAMAIS supprimé (désactivation seule, la trace reste — contrat).
-- Rôles applicatifs alignés sur le contrat et la vision §5.1.
-- ============================================================================
CREATE TABLE IF NOT EXISTS personnel (
    id                          TEXT PRIMARY KEY,    -- PER-…
    etablissement_id            TEXT NOT NULL REFERENCES etablissements(id),
    nom                         TEXT NOT NULL,       -- ⚿
    prenom                      TEXT NOT NULL,       -- ⚿
    type_personne               TEXT NOT NULL        -- ⚿
        CHECK (type_personne IN ('SALARIE','ENSEIGNANT','ELEVE','SOUS_TRAITANT','INTERVENANT_EXT')),
    role_applicatif             TEXT NOT NULL DEFAULT 'ELEVE'
        CHECK (role_applicatif IN ('ADMIN','REFERENT','ENSEIGNANT','ELEVE','TECHNICIEN')),
    numero_attestation_aptitude TEXT,                -- n° attestation d'APTITUDE individuelle
    organisme_delivreur         TEXT,
    date_obtention              TEXT,                -- ISO
    date_limite_aptitude        TEXT,                -- ISO — date limite / remise à niveau (alerte)
    categorie_2008              TEXT,                -- grille 2008 (transition, cf. SPEC §7.3)
    categorie_2025              TEXT,                -- grille 2025
    activites_autorisees        TEXT,                -- tableau JSON
    signature_chemin            TEXT,                -- chemin de l'image de signature (documents/)
    email                       TEXT,
    actif                       INTEGER NOT NULL DEFAULT 1 CHECK (actif IN (0,1)),
    date_creation               TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);


-- ============================================================================
-- §5.3 — OUTILLAGE RÉGLEMENTAIRE
-- Types alignés sur le contrat (E0). Le statut est RECALCULÉ à la lecture
-- par l'application (sauf HORS_SERVICE, permanent) — la colonne matérialise
-- le dernier état connu.
-- ============================================================================
CREATE TABLE IF NOT EXISTS outillage (
    id                  TEXT PRIMARY KEY,            -- OUT-…
    etablissement_id    TEXT NOT NULL REFERENCES etablissements(id),
    type                TEXT NOT NULL                -- ⚿ (enum du contrat)
        CHECK (type IN ('STATION_RECUPERATION','STATION_CHARGE','BALANCE','DETECTEUR',
                        'POMPE_A_VIDE','MANIFOLD','THERMOMETRE','BOUTEILLE_RECUP',
                        'FLEXIBLE','EPI','AUTRE')),
    marque              TEXT,                        -- ⚿
    modele              TEXT,                        -- ⚿
    numero_serie        TEXT,                        -- ⚿
    site_atelier        TEXT,                        -- ⚿ site / atelier d'affectation
    precision_balance   TEXT,                        -- précision (balances), ex. « ± 5 g »
    sensibilite_detecteur TEXT,                      -- sensibilité (détecteurs), ex. « 5 g/an »
    date_etalonnage     TEXT,                        -- ISO — dernier étalonnage (distinct de la vérification, contrat)
    date_verification   TEXT,                        -- ISO — dernière vérification
    prochaine_echeance  TEXT,                        -- ISO — prochaine vérification (alerte)
    statut              TEXT NOT NULL DEFAULT 'CONFORME'
        CHECK (statut IN ('CONFORME','A_VERIFIER','EXPIRE','HORS_SERVICE')),
    observation         TEXT,
    date_creation       TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);


-- ============================================================================
-- CLIENTS / DÉTENTEURS d'équipements
-- ============================================================================
CREATE TABLE IF NOT EXISTS clients_detenteurs (
    id               TEXT PRIMARY KEY,               -- CLI-…
    etablissement_id TEXT NOT NULL REFERENCES etablissements(id),
    raison_sociale   TEXT NOT NULL,
    siret            TEXT,
    adresse          TEXT,
    contact          TEXT,
    email            TEXT,
    telephone        TEXT,
    actif            INTEGER NOT NULL DEFAULT 1 CHECK (actif IN (0,1))
);


-- ============================================================================
-- §5.4 — MACHINES / ÉQUIPEMENTS
-- Statuts alignés sur le contrat (E0) : EN_SERVICE, ARRETEE, DEMANTELEE,
-- FUITE, CONTROLE_DU. `machine_label` des mouvements et `site_label` restent
-- des dénormalisations assumées côté écriture (cadre 2 CERFA, historique).
-- ============================================================================
CREATE TABLE IF NOT EXISTS machines (
    id                      TEXT PRIMARY KEY,        -- MAC-…
    etablissement_id        TEXT NOT NULL REFERENCES etablissements(id),
    code_interne            TEXT,                    -- ⚿ code lisible atelier (« M7 »)
    designation             TEXT NOT NULL,           -- ⚿
    type                    TEXT,                    -- ⚿ groupe froid, PAC, chambre froide, split…
    marque                  TEXT,
    modele                  TEXT,
    numero_serie            TEXT,
    localisation            TEXT,                    -- ⚿
    site_label              TEXT,                    -- libellé du site affiché (contrat : siteLabel)
    client_detenteur_id     TEXT REFERENCES clients_detenteurs(id),  -- détenteur / propriétaire
    fluide                  TEXT REFERENCES fluides(code),           -- ⚿
    charge_nominale_kg      REAL,                    -- ⚿
    charge_actuelle_kg      REAL,                    -- ⚿ mise à jour par les mouvements validés
    date_mise_en_service    TEXT,                    -- ISO
    detection_permanente    INTEGER NOT NULL DEFAULT 0 CHECK (detection_permanente IN (0,1)),
    justification_detection TEXT,                    -- justification si la fréquence de contrôle est doublée
    frequence_controle_mois INTEGER,                 -- fréquence calculée (mois) selon tCO₂eq
    date_dernier_controle   TEXT,                    -- ISO
    date_prochain_controle  TEXT,                    -- ISO (alerte, blocage si dépassé — SPEC §7.2)
    plaque_fgas_generee     INTEGER NOT NULL DEFAULT 0 CHECK (plaque_fgas_generee IN (0,1)),
    statut                  TEXT NOT NULL DEFAULT 'EN_SERVICE'
        CHECK (statut IN ('EN_SERVICE','ARRETEE','DEMANTELEE','FUITE','CONTROLE_DU')),
    observation             TEXT,
    date_creation           TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    -- code_public (identifiant opaque QR, 7 car. base32 Crockford, UNIQUE,
    -- jamais modifiable) : colonne posée par la migration 003, backfillée
    -- et générée systématiquement à la création depuis la migration 006
    -- (V9.1) — cf. server/migrations.js, PAS dans le socle v1 ici.
);


-- ============================================================================
-- §5.5 — BOUTEILLES
-- La masse nette est une colonne CALCULÉE (masse brute − tare), jamais saisie.
-- La décision sur fluide récupéré vit SUR la bouteille (contrat E0) ; le BSFF
-- en garde une copie de constat. `proprietaire` : texte libre (contrat).
-- ============================================================================
CREATE TABLE IF NOT EXISTS bouteilles (
    id                      TEXT PRIMARY KEY,        -- BTL-…
    etablissement_id        TEXT NOT NULL REFERENCES etablissements(id),
    code_interne            TEXT,                    -- ⚿ code lisible (« B-06 »)
    numero_bouteille        TEXT,                    -- ⚿ n° réel gravé / étiquette fabricant (contrat : numeroReel)
    qr_interne              TEXT,                    -- contenu du QR code interne (legacy — cf. code_public, migration 003)
    type                    TEXT NOT NULL            -- ⚿
        CHECK (type IN ('NEUVE','RECUPERATION','TRANSFERT','DECHET')),
    fluide                  TEXT REFERENCES fluides(code),  -- ⚿
    etat_fluide             TEXT NOT NULL DEFAULT 'VIERGE'
        CHECK (etat_fluide IN ('VIERGE','RECUPERE','RECYCLE','REGENERE','DECHET','DOUTEUX','MELANGE')),
    tare_kg                 REAL,                    -- ⚿
    masse_brute_kg          REAL,                    -- ⚿ masse brute actuelle (dernière pesée)
    masse_nette_kg          REAL GENERATED ALWAYS AS (ROUND(masse_brute_kg - tare_kg, 3)) VIRTUAL,  -- ⚿ calculée, arrondie au gramme (contrat §7)
    contenance_max_kg       REAL,
    proprietaire            TEXT,                    -- texte libre (« Climalife ») ou NULL — aligné contrat (E0)
    numero_lot              TEXT,
    date_entree_stock       TEXT,                    -- ISO
    masse_nette_entree_kg   REAL,                    -- masse nette FIGÉE à l'entrée (CR-4 — poste « achats » du bilan)
    date_derniere_pesee     TEXT,                    -- ISO
    pese_par                TEXT REFERENCES personnel(id),  -- utilisateur ayant pesé
    statut                  TEXT NOT NULL DEFAULT 'EN_STOCK'
        CHECK (statut IN ('EN_STOCK','EN_SERVICE','VIDE','A_RETOURNER','RETOURNEE','DECHET','BLOQUEE')),
    decision_fluide         TEXT                     -- décision sur fluide récupéré (contrat, IM-7)
        CHECK (decision_fluide IS NULL OR decision_fluide IN ('REUTILISABLE','A_ANALYSER','DECHET')),
    decision_par            TEXT,                    -- qui a décidé (nom en toutes lettres)
    date_decision           TEXT,                    -- ISO
    numero_bl_facture       TEXT,                    -- n° BL / facture (le document est en pièce jointe)
    numero_bsff             TEXT,                    -- n° BSFF si la bouteille part en déchet (contrat : numBsff)
    date_retour_fournisseur TEXT,                    -- ISO
    date_epreuve            TEXT,                    -- ISO — épreuve / réépreuve (bouteilles de récupération)
    date_limite_garde       TEXT,                    -- ISO — limite de garde du fluide récupéré (1 an, IM-7)
    observation             TEXT,
    date_creation           TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);


-- ============================================================================
-- §5.6 — MOUVEMENTS (registre verrouillé, cœur WORM)
-- Le CONTRAT fait foi (E0) : date de JOUR (« AAAA-MM-JJ »), quantité SIGNÉE
-- (positive = charge/transfert, négative = récupération), chaîne de hash
-- vérifiable (hash_precedent + ordre_validation), champs du cycle de vie
-- (date_soumission, motif_rejet, motif de contre-écriture), signature.
-- Cycle de vie : BROUILLON → SOUMIS → VALIDE → (ANNULE par contre-écriture).
-- ⚠ Une écriture VALIDÉE n'est JAMAIS modifiée ni effacée : toute correction
-- passe par une contre-écriture (contre_ecriture_de). Voir les déclencheurs.
-- ============================================================================
CREATE TABLE IF NOT EXISTS mouvements (
    id                      TEXT PRIMARY KEY,        -- MVT-…
    numero                  TEXT NOT NULL UNIQUE,    -- ⚿ n° unique (FI-AAAA-NNNN officiel / FORM-AAAA-NNNN formation)
    etablissement_id        TEXT NOT NULL REFERENCES etablissements(id),
    date_mouvement          TEXT NOT NULL,           -- ⚿ date de JOUR « AAAA-MM-JJ » (contrat §7)
    mode                    TEXT NOT NULL            -- ⚿ SPEC §7.4 : séparation stricte
        CHECK (mode IN ('FORMATION','OFFICIEL')),
    type_operation          TEXT NOT NULL            -- ⚿ type réglementaire normalisé (SPEC §7.1)
        CHECK (type_operation IN ('MISE_EN_SERVICE','CHARGE_APPOINT','RECUPERATION_MAINTENANCE',
                                  'RECUPERATION_DEMANTELEMENT','CONTROLE_PERIODIQUE',
                                  'CONTROLE_NON_PERIODIQUE','ASSEMBLAGE','MODIFICATION','TRANSFERT')),
    cause                   TEXT,                    -- fuite, maintenance, remplacement compresseur… (contrat : causeMouvement)
    machine_id              TEXT REFERENCES machines(id),      -- machine concernée
    machine_label           TEXT,                    -- libellé machine figé à l'écriture (dénormalisation assumée, hors empreinte)
    machine_destination_id  TEXT REFERENCES machines(id),      -- machine destination (réservé)
    bouteille_source_id     TEXT REFERENCES bouteilles(id),
    bouteille_destination_id TEXT REFERENCES bouteilles(id),
    fluide                  TEXT REFERENCES fluides(code),     -- ⚿
    pesee_avant_kg          REAL,                    -- ⚿ pesée avant intervention
    pesee_apres_kg          REAL,                    -- ⚿ pesée après intervention
    quantite_calculee_kg    REAL,                    -- ⚿ quantité SIGNÉE (contrat : quantiteKg ; + charge, − récupération)
    sens                    TEXT                     -- réservé serveur (rapports) — le signe fait foi
        CHECK (sens IS NULL OR sens IN ('ENTREE','SORTIE','INTERNE')),
    -- Quantités ventilées (réservées serveur / déclaration ADEME — une seule
    -- est en général renseignée) :
    quantite_chargee_kg                 REAL,
    quantite_recuperee_kg               REAL,
    quantite_cedee_kg                   REAL,
    quantite_retournee_fournisseur_kg   REAL,
    quantite_detruite_regeneree_kg      REAL,
    origine_fluide          TEXT
        CHECK (origine_fluide IS NULL OR origine_fluide IN ('BOUTEILLE_NEUVE','BOUTEILLE_RECUPEREE','AUTRE_EQUIPEMENT')),
    destination_fluide      TEXT
        CHECK (destination_fluide IS NULL OR destination_fluide IN ('MACHINE','BOUTEILLE_RECUP','FOURNISSEUR','DECHET')),
    technicien              TEXT,                    -- ⚿ nom en toutes lettres (contrat — intervenant extérieur possible)
    technicien_id           TEXT REFERENCES personnel(id),     -- rapprochement optionnel avec le registre du personnel
    validateur_id           TEXT REFERENCES personnel(id),     -- ⚿ rôle habilité (REFERENT/ENSEIGNANT/ADMIN — contrôle applicatif)
    -- Contrôle d'étanchéité DÉCLARÉ dans le mouvement (contrat : objet
    -- `controle` imbriqué, aplati ici par le LocalStore — CR-3) :
    statut_controle_declare TEXT
        CHECK (statut_controle_declare IS NULL OR statut_controle_declare IN ('SANS_OBJET','CONFORME','FUITE')),
    detecteur_declare_id    TEXT REFERENCES outillage(id),
    controle_lie_id         TEXT REFERENCES controles(id),     -- le VRAI contrôle créé à la validation (CR-3)
    signature_data_url      TEXT,                    -- signature manuscrite (data URL canvas — hors empreinte)
    cerfa_numero            TEXT,                    -- n° de fiche CERFA (= numero, sauf TRANSFERT : NULL — IM-12)
    bsff_id                 TEXT REFERENCES bsff(id),          -- BSFF lié le cas échéant
    observation             TEXT,
    statut                  TEXT NOT NULL DEFAULT 'BROUILLON'  -- ⚿
        CHECK (statut IN ('BROUILLON','SOUMIS','VALIDE','ANNULE')),
    date_soumission         TEXT,                    -- ISO — posée à la soumission (hors empreinte)
    motif_rejet             TEXT,                    -- motif du dernier rejet (hors empreinte)
    motif                   TEXT,                    -- motif de la contre-écriture (DANS l'empreinte)
    hash_ecriture           TEXT,                    -- ⚿ empreinte SHA-256 chaînée (posée au scellement)
    hash_precedent          TEXT,                    -- ⚿ empreinte de l'écriture scellée précédente (chaîne vérifiable)
    ordre_validation        INTEGER,                 -- ⚿ rang de scellement (1, 2, 3…) — unique quand présent
    contre_ecriture_de      TEXT REFERENCES mouvements(id),    -- écriture d'origine si régularisation
    date_creation           TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- Un seul rang de scellement par écriture scellée (fourche de chaîne interdite).
CREATE UNIQUE INDEX IF NOT EXISTS idx_mouvements_ordre_validation
    ON mouvements (ordre_validation) WHERE ordre_validation IS NOT NULL;

-- Verrouillage du registre : une écriture VALIDÉE ne peut être ni supprimée,
-- ni modifiée. Seul le passage VALIDE → ANNULE (contre-écriture) est admis,
-- TOUT le contenu restant strictement identique. Une écriture ANNULÉE est figée.
CREATE TRIGGER IF NOT EXISTS mouvements_interdire_suppression
BEFORE DELETE ON mouvements
WHEN OLD.statut IN ('VALIDE','ANNULE')
BEGIN
    SELECT RAISE(ABORT, 'Registre verrouillé : une écriture validée ne peut pas être supprimée (utiliser une contre-écriture).');
END;

CREATE TRIGGER IF NOT EXISTS mouvements_interdire_modification_annulee
BEFORE UPDATE ON mouvements
WHEN OLD.statut = 'ANNULE'
BEGIN
    SELECT RAISE(ABORT, 'Registre verrouillé : une écriture annulée est figée.');
END;

CREATE TRIGGER IF NOT EXISTS mouvements_interdire_modification_validee
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
          AND NEW.date_creation         IS OLD.date_creation)
BEGIN
    SELECT RAISE(ABORT, 'Registre verrouillé : une écriture validée ne peut pas être modifiée (utiliser une contre-écriture).');
END;


-- ============================================================================
-- §5.7 — CONTRÔLES D'ÉTANCHÉITÉ
-- Résultats alignés sur le contrat : CONFORME | FUITE. `operateur` = nom en
-- toutes lettres (contrat) ; `operateur_id` = rapprochement optionnel.
-- `mouvement_id` croise le contrôle né d'une validation de mouvement (CR-3).
-- ============================================================================
CREATE TABLE IF NOT EXISTS controles (
    id                          TEXT PRIMARY KEY,    -- CTL-…
    etablissement_id            TEXT NOT NULL REFERENCES etablissements(id),
    type_controle               TEXT NOT NULL        -- ⚿
        CHECK (type_controle IN ('PERIODIQUE','NON_PERIODIQUE','APRES_REPARATION','MISE_EN_SERVICE')),
    machine_id                  TEXT NOT NULL REFERENCES machines(id),  -- ⚿
    machine_label               TEXT,                -- libellé machine figé au contrôle (contrat : machineLabel)
    date_controle               TEXT NOT NULL,       -- ⚿ ISO
    charge_kg                   REAL,                -- ⚿ charge au moment du contrôle
    prg_utilise                 REAL,                -- ⚿ PRP retenu pour le calcul
    tco2eq                      REAL GENERATED ALWAYS AS (charge_kg * prg_utilise / 1000.0) VIRTUAL,  -- ⚿
    methode                     TEXT
        CHECK (methode IS NULL OR methode IN ('DIRECTE','INDIRECTE')),
    methode_detail              TEXT,                -- détail : détecteur manuel, produit moussant, pression…
    detecteur_id                TEXT REFERENCES outillage(id),  -- détecteur utilisé (n° série via outillage)
    resultat                    TEXT                 -- ⚿ (enum du contrat)
        CHECK (resultat IS NULL OR resultat IN ('CONFORME','FUITE')),
    localisation_fuite          TEXT,                -- localisation précise de la fuite
    partie_concernee            TEXT
        CHECK (partie_concernee IS NULL OR partie_concernee IN ('RACCORD','VANNE','BRASURE','ECHANGEUR','AUTRE')),
    gravite                     TEXT,
    reparation_immediate        INTEGER CHECK (reparation_immediate IS NULL OR reparation_immediate IN (0,1)),
    date_reparation_prevue      TEXT,                -- ISO
    controle_apres_reparation_id TEXT REFERENCES controles(id),  -- contrôle après réparation (lié)
    date_prochain_controle      TEXT,                -- ISO — prochain contrôle calculé
    operateur                   TEXT,                -- ⚿ nom en toutes lettres (contrat)
    operateur_id                TEXT REFERENCES personnel(id),   -- rapprochement optionnel
    mouvement_id                TEXT REFERENCES mouvements(id),  -- mouvement d'origine (CR-3)
    cerfa_numero                TEXT,                -- CERFA lié
    observation                 TEXT,
    date_creation               TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);


-- ============================================================================
-- §5.8 — DÉCHETS / BSFF (bordereau de suivi des fluides frigorigènes)
-- ⚠ BSFF INTERNE : il ne remplace PAS Trackdéchets (M-1) — aucun mouvement
-- déchet OFFICIEL réel tant que le pont Trackdéchets (V10.5) n'existe pas.
-- ============================================================================
CREATE TABLE IF NOT EXISTS bsff (
    id                       TEXT PRIMARY KEY,       -- BSFF-…
    etablissement_id         TEXT NOT NULL REFERENCES etablissements(id),
    numero_bsff              TEXT,                   -- ⚿ n° BSFF
    bouteille_id             TEXT REFERENCES bouteilles(id),  -- bouteille concernée
    bouteille_code           TEXT,                   -- code lisible figé à l'émission (contrat : bouteilleCode)
    fluide                   TEXT REFERENCES fluides(code),
    statut_fluide            TEXT                    -- ⚿ constat au moment de l'émission
        CHECK (statut_fluide IS NULL OR statut_fluide IN ('REUTILISABLE','A_ANALYSER','DECHET')),
    decision_par             TEXT,                   -- ⚿ décision prise par qui (nom)
    date_decision            TEXT,                   -- ⚿ ISO
    transporteur_collecteur  TEXT,                   -- ⚿ (contrat : transporteur)
    installation_destination TEXT,                   -- ⚿ installation de destination
    masse_remise_kg          REAL,                   -- ⚿ masse réellement remise
    date_remise              TEXT,                   -- ⚿ ISO
    lien_trackdechets        TEXT,                   -- lien Trackdéchets (la preuve PDF est en pièce jointe)
    statut                   TEXT NOT NULL DEFAULT 'EN_PREPARATION'
        CHECK (statut IN ('EN_PREPARATION','EMIS','ENLEVE','TRAITE','CLOTURE')),
    observation              TEXT,
    date_creation            TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);


-- ============================================================================
-- RETOURS FOURNISSEUR (IM-9 — poste de la balance matière)
-- Trace figée du retour d'une bouteille consignée (masse au moment du retour).
-- ============================================================================
CREATE TABLE IF NOT EXISTS retours_fournisseur (
    id               TEXT PRIMARY KEY,               -- RF-…
    etablissement_id TEXT NOT NULL REFERENCES etablissements(id),
    bouteille_id     TEXT REFERENCES bouteilles(id),
    bouteille_code   TEXT,                           -- code lisible figé (contrat : bouteilleCode)
    fluide           TEXT REFERENCES fluides(code),
    masse_kg         REAL,                           -- masse nette au moment du retour
    date_retour      TEXT,                           -- ISO (contrat : date)
    operateur        TEXT                            -- nom en toutes lettres
);


-- ============================================================================
-- §5.9 — PIÈCES JOINTES (table unique polymorphe)
-- Le couple (entite_type, entite_id) désigne l'objet lié. En mode Local le
-- fichier vit dans documents/ (colonne chemin, posée par le serveur) ; le
-- hash SHA-256 garantit son intégrité. `mime_type` : liste blanche IM-19
-- appliquée par l'application (PDF, PNG, JPEG, WebP — jamais de SVG).
-- ============================================================================
CREATE TABLE IF NOT EXISTS pieces_jointes (
    id             TEXT PRIMARY KEY,                 -- PJ-…
    etablissement_id TEXT REFERENCES etablissements(id),
    entite_type    TEXT NOT NULL
        CHECK (entite_type IN ('ETABLISSEMENT','AUDIT','NON_CONFORMITE','PERSONNEL','OUTILLAGE',
                               'MACHINE','BOUTEILLE','MOUVEMENT','CONTROLE','BSFF',
                               'CLIENT_DETENTEUR','INVENTAIRE')),
    entite_id      TEXT NOT NULL,                    -- id de l'objet lié (polymorphe : pas de clé étrangère possible)
    categorie      TEXT NOT NULL DEFAULT 'AUTRE'
        CHECK (categorie IN ('ATTESTATION','CERTIFICAT','FACTURE','BL','BON_DE_REPRISE','BSFF',
                             'PHOTO_PESEE','PLAQUE_SIGNALETIQUE','RAPPORT','AUTRE')),
    nom_fichier    TEXT NOT NULL,
    mime_type      TEXT,                             -- type MIME vérifié (contrat : mimeType)
    chemin         TEXT,                             -- chemin relatif dans documents/ (posé par le serveur)
    taille_octets  INTEGER,
    hash_sha256    TEXT,                             -- empreinte du fichier (intégrité de la preuve)
    date_ajout     TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    ajoute_par     TEXT                              -- login ou nom de l'utilisateur
);


-- ============================================================================
-- §5.10 — JOURNAL D'AUDIT (append-only)
-- Non modifiable et non supprimable — verrouillé par déclencheurs.
-- Le CHAÎNAGE par hash (hash_precedent + hash) arrive en V9-E2 : c'est le
-- vrai passage démo → coffre-fort (vision §3).
-- ============================================================================
CREATE TABLE IF NOT EXISTS journal_audit (
    id           INTEGER PRIMARY KEY AUTOINCREMENT, -- séquence stricte, jamais réutilisée
    date_heure   TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    utilisateur  TEXT,                              -- qui (ou « système »)
    action       TEXT NOT NULL,                     -- ex. CREATION_MACHINE, VALIDATION_MOUVEMENT…
    entite_type  TEXT,
    entite_id    TEXT,
    avant_json   TEXT,                              -- état avant (JSON)
    apres_json   TEXT,                              -- état après (JSON)
    ip_poste     TEXT,                              -- IP / nom du poste
    resultat     TEXT                               -- OK, REFUS, ERREUR…
);

CREATE TRIGGER IF NOT EXISTS journal_audit_interdire_modification
BEFORE UPDATE ON journal_audit
BEGIN
    SELECT RAISE(ABORT, 'Le journal d''audit est en ajout seul : modification interdite.');
END;

CREATE TRIGGER IF NOT EXISTS journal_audit_interdire_suppression
BEFORE DELETE ON journal_audit
BEGIN
    SELECT RAISE(ABORT, 'Le journal d''audit est en ajout seul : suppression interdite.');
END;


-- ============================================================================
-- §6 — BALANCE MATIÈRE : stocks initiaux, inventaire, justifications
-- Modèle ALIGNÉ SUR LE CONTRAT (E0) : inventaire à plat par (année, fluide),
-- justification d'écart séparée. L'inventaire nominatif bouteille par
-- bouteille (CF-20) est une évolution prévue en V9.4.
-- ============================================================================

-- Stocks au 1er janvier (saisie établissement / reprise d'existant)
CREATE TABLE IF NOT EXISTS stocks_initiaux (
    etablissement_id   TEXT NOT NULL REFERENCES etablissements(id),
    annee              INTEGER NOT NULL,
    fluide             TEXT NOT NULL REFERENCES fluides(code),
    stock_neuf_kg      REAL NOT NULL DEFAULT 0,      -- (contrat : neufKg)
    stock_recupere_kg  REAL NOT NULL DEFAULT 0,      -- (contrat : recupKg)
    PRIMARY KEY (etablissement_id, annee, fluide)
);

-- Inventaire physique : stock réel pesé, une ligne par (année, fluide)
CREATE TABLE IF NOT EXISTS inventaires (
    etablissement_id TEXT NOT NULL REFERENCES etablissements(id),
    annee            INTEGER NOT NULL,
    fluide           TEXT NOT NULL REFERENCES fluides(code),
    stock_reel_kg    REAL NOT NULL,                  -- (contrat : stockReelKg)
    date_saisie      TEXT,                           -- ISO (contrat : dateSaisie)
    operateur        TEXT,                           -- nom en toutes lettres
    PRIMARY KEY (etablissement_id, annee, fluide)
);

-- Justifications d'écart théorique/réel (obligatoires au-delà de 0,01 kg)
CREATE TABLE IF NOT EXISTS justifications_ecarts (
    etablissement_id   TEXT NOT NULL REFERENCES etablissements(id),
    annee              INTEGER NOT NULL,
    fluide             TEXT NOT NULL REFERENCES fluides(code),
    justification      TEXT NOT NULL,
    date_justification TEXT,                         -- ISO (contrat : date)
    PRIMARY KEY (etablissement_id, annee, fluide)
);


-- ============================================================================
-- COMPTES UTILISATEURS DE L'APPLICATION (mode local)
-- Mot de passe haché scrypt (node:crypto), jamais en clair (SPEC §8).
-- La table sessions (jetons opaques) arrive en V9-E5.
-- ============================================================================
CREATE TABLE IF NOT EXISTS utilisateurs_app (
    id                  TEXT PRIMARY KEY,            -- UTI-…
    login               TEXT NOT NULL UNIQUE,
    hash_mot_de_passe   TEXT NOT NULL,               -- dérivé scrypt (hexadécimal)
    sel                 TEXT NOT NULL,               -- sel aléatoire propre au compte
    role                TEXT NOT NULL
        CHECK (role IN ('ADMIN','REFERENT','ENSEIGNANT','ELEVE')),
    personnel_id        TEXT REFERENCES personnel(id),  -- fiche personnel associée
    actif               INTEGER NOT NULL DEFAULT 1 CHECK (actif IN (0,1)),
    date_creation       TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    derniere_connexion  TEXT                         -- ISO
);


-- ============================================================================
-- PARAMÈTRES DE CONFIGURATION (clé / valeur)
-- Ex. : etablissement_actif, mode_par_defaut, prochain_numero_fi…
-- ============================================================================
CREATE TABLE IF NOT EXISTS parametres (
    cle               TEXT PRIMARY KEY,
    valeur            TEXT,
    date_modification TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);


-- ============================================================================
-- INDEX DE RECHERCHE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_mouvements_date        ON mouvements (date_mouvement);
CREATE INDEX IF NOT EXISTS idx_mouvements_machine     ON mouvements (machine_id);
CREATE INDEX IF NOT EXISTS idx_mouvements_fluide      ON mouvements (fluide);
CREATE INDEX IF NOT EXISTS idx_mouvements_statut      ON mouvements (statut);
CREATE INDEX IF NOT EXISTS idx_mouvements_type        ON mouvements (type_operation);
CREATE INDEX IF NOT EXISTS idx_mouvements_bouteille_src ON mouvements (bouteille_source_id);
CREATE INDEX IF NOT EXISTS idx_mouvements_bouteille_dst ON mouvements (bouteille_destination_id);
CREATE INDEX IF NOT EXISTS idx_controles_machine      ON controles (machine_id);
CREATE INDEX IF NOT EXISTS idx_controles_date         ON controles (date_controle);
CREATE INDEX IF NOT EXISTS idx_controles_mouvement    ON controles (mouvement_id);
CREATE INDEX IF NOT EXISTS idx_machines_fluide        ON machines (fluide);
CREATE INDEX IF NOT EXISTS idx_machines_statut        ON machines (statut);
CREATE INDEX IF NOT EXISTS idx_machines_prochain_ctl  ON machines (date_prochain_controle);
CREATE INDEX IF NOT EXISTS idx_bouteilles_fluide      ON bouteilles (fluide);
CREATE INDEX IF NOT EXISTS idx_bouteilles_statut      ON bouteilles (statut);
CREATE INDEX IF NOT EXISTS idx_personnel_echeance     ON personnel (date_limite_aptitude);
CREATE INDEX IF NOT EXISTS idx_outillage_echeance     ON outillage (prochaine_echeance);
CREATE INDEX IF NOT EXISTS idx_pj_entite              ON pieces_jointes (entite_type, entite_id);
CREATE INDEX IF NOT EXISTS idx_journal_date           ON journal_audit (date_heure);
CREATE INDEX IF NOT EXISTS idx_bsff_bouteille         ON bsff (bouteille_id);
CREATE INDEX IF NOT EXISTS idx_retours_bouteille      ON retours_fournisseur (bouteille_id);


-- ============================================================================
-- §6 — VUE bilan_matiere : balance matière annuelle par fluide
-- MIROIR EXACT du calcul du contrat (demo-store calculerBalanceMatiere) :
--   théorique = stock initial (neuf + récupéré, table stocks_initiaux)
--             + achats (masse d'entrée FIGÉE des bouteilles NEUVES de l'année)
--             + récupérations (écritures FIGÉES à quantité négative)
--             − charges (écritures FIGÉES à quantité positive)
--             − retours fournisseur − destructions (BSFF remis dans l'année) ;
--   écritures FIGÉES = statut VALIDE **ou ANNULE** (les contre-écritures se
--   neutralisent d'elles-mêmes) ; TRANSFERT exclu (interne au stock) ;
--   réel = inventaires (année, fluide) ; écart = réel − théorique (NULL sans
--   inventaire) ; justification jointe.
-- La conformité métier de cette vue sera éprouvée en E3 par test-contrat
-- (getBalanceMatiere) — ne pas s'en servir avant sans vérification.
-- ============================================================================
CREATE VIEW IF NOT EXISTS bilan_matiere AS
WITH
mvt AS (
    SELECT etablissement_id,
           fluide,
           CAST(strftime('%Y', date_mouvement) AS INTEGER) AS annee,
           SUM(CASE WHEN quantite_calculee_kg >= 0 THEN quantite_calculee_kg ELSE 0 END) AS charge_kg,
           SUM(CASE WHEN quantite_calculee_kg <  0 THEN -quantite_calculee_kg ELSE 0 END) AS recupere_kg
    FROM mouvements
    WHERE statut IN ('VALIDE','ANNULE')
      AND quantite_calculee_kg IS NOT NULL
      AND type_operation <> 'TRANSFERT'
      AND fluide IS NOT NULL
    GROUP BY etablissement_id, fluide, annee
),
achats AS (
    SELECT etablissement_id,
           fluide,
           CAST(strftime('%Y', date_entree_stock) AS INTEGER) AS annee,
           -- Repli IDENTIQUE au contrat : masse d'entrée figée, sinon la
           -- masse NETTE courante (reprise d'anciennes données sans CR-4).
           SUM(COALESCE(masse_nette_entree_kg, masse_nette_kg, 0)) AS achats_kg
    FROM bouteilles
    WHERE type = 'NEUVE' AND date_entree_stock IS NOT NULL AND fluide IS NOT NULL
    GROUP BY etablissement_id, fluide, annee
),
destructions AS (
    SELECT etablissement_id,
           fluide,
           CAST(strftime('%Y', date_remise) AS INTEGER) AS annee,
           SUM(COALESCE(masse_remise_kg, 0)) AS detruit_kg
    FROM bsff
    WHERE date_remise IS NOT NULL AND fluide IS NOT NULL
    GROUP BY etablissement_id, fluide, annee
),
retours AS (
    SELECT etablissement_id,
           fluide,
           CAST(strftime('%Y', date_retour) AS INTEGER) AS annee,
           SUM(COALESCE(masse_kg, 0)) AS retourne_kg
    FROM retours_fournisseur
    WHERE date_retour IS NOT NULL AND fluide IS NOT NULL
    GROUP BY etablissement_id, fluide, annee
),
-- Périmètre IDENTIQUE au contrat : une ligne naît d'un stock initial, d'un
-- achat, d'une écriture ou d'une sortie — JAMAIS d'un inventaire seul
-- (l'inventaire se JOINT aux lignes existantes, il n'en crée pas).
perimetre AS (
    SELECT etablissement_id, fluide, annee FROM mvt
    UNION SELECT etablissement_id, fluide, annee FROM achats
    UNION SELECT etablissement_id, fluide, annee FROM destructions
    UNION SELECT etablissement_id, fluide, annee FROM retours
    UNION SELECT etablissement_id, fluide, annee FROM stocks_initiaux
)
SELECT
    p.etablissement_id,
    p.fluide,
    p.annee,
    COALESCE(si.stock_neuf_kg, 0)     AS stock_initial_neuf_kg,
    COALESCE(si.stock_recupere_kg, 0) AS stock_initial_recupere_kg,
    COALESCE(a.achats_kg, 0)          AS achats_kg,
    COALESCE(m.recupere_kg, 0)        AS recuperations_kg,
    COALESCE(m.charge_kg, 0)          AS charges_kg,
    0                                 AS cessions_kg,
    COALESCE(r.retourne_kg, 0)        AS retours_fournisseur_kg,
    COALESCE(d.detruit_kg, 0)         AS destructions_kg,
    ( COALESCE(si.stock_neuf_kg, 0) + COALESCE(si.stock_recupere_kg, 0)
    + COALESCE(a.achats_kg, 0) + COALESCE(m.recupere_kg, 0)
    - COALESCE(m.charge_kg, 0)
    - COALESCE(r.retourne_kg, 0) - COALESCE(d.detruit_kg, 0) ) AS stock_theorique_kg,
    i.stock_reel_kg                   AS stock_reel_kg,   -- NULL si pas d'inventaire cette année
    ( i.stock_reel_kg
    - ( COALESCE(si.stock_neuf_kg, 0) + COALESCE(si.stock_recupere_kg, 0)
      + COALESCE(a.achats_kg, 0) + COALESCE(m.recupere_kg, 0)
      - COALESCE(m.charge_kg, 0)
      - COALESCE(r.retourne_kg, 0) - COALESCE(d.detruit_kg, 0) ) ) AS ecart_kg,
    j.justification                   AS justification
FROM perimetre p
LEFT JOIN mvt          m  ON m.etablissement_id  = p.etablissement_id AND m.fluide  = p.fluide AND m.annee  = p.annee
LEFT JOIN achats       a  ON a.etablissement_id  = p.etablissement_id AND a.fluide  = p.fluide AND a.annee  = p.annee
LEFT JOIN destructions d  ON d.etablissement_id  = p.etablissement_id AND d.fluide  = p.fluide AND d.annee  = p.annee
LEFT JOIN retours      r  ON r.etablissement_id  = p.etablissement_id AND r.fluide  = p.fluide AND r.annee  = p.annee
LEFT JOIN stocks_initiaux si ON si.etablissement_id = p.etablissement_id AND si.fluide = p.fluide AND si.annee = p.annee
LEFT JOIN inventaires  i  ON i.etablissement_id  = p.etablissement_id AND i.fluide  = p.fluide AND i.annee  = p.annee
LEFT JOIN justifications_ecarts j ON j.etablissement_id = p.etablissement_id AND j.fluide = p.fluide AND j.annee = p.annee;


-- ============================================================================
-- JEU DE FLUIDES DE BASE (PRP = GWP AR4, classe NF EN 378 / ASHRAE 34)
-- INSERT OR IGNORE : jamais écrasé si le référentiel a été complété localement.
-- ============================================================================
INSERT OR IGNORE INTO fluides (code, famille, gwp_ar4, classe_securite, statut_reglementaire, commentaire) VALUES
    ('R-32',     'HFC',                675, 'A2L', 'AUTORISE',  'Légèrement inflammable — précautions A2L'),
    ('R-410A',  'Mélange HFC',        2088, 'A1',  'AUTORISE',  'Mélange R-32/R-125 — en retrait progressif (PRP élevé)'),
    ('R-134a',  'HFC',                1430, 'A1',  'AUTORISE',  NULL),
    ('R-407C',  'Mélange HFC',        1774, 'A1',  'AUTORISE',  'Mélange zéotrope (glissement de température)'),
    ('R-404A',  'Mélange HFC',        3922, 'A1',  'RESTREINT', 'PRP > 2 500 : maintenance au fluide vierge interdite (F-Gas)'),
    ('R-1234yf','HFO',                   1, 'A2L', 'AUTORISE',  'PRP très faible — légèrement inflammable'),
    ('R-455A',  'Mélange HFO/HFC',     148, 'A2L', 'AUTORISE',  NULL),
    ('R-744',   'Inorganique (CO2)',     1, 'A1',  'AUTORISE',  'Dioxyde de carbone — hautes pressions (transcritique)'),
    ('R-290',   'HC (propane)',          3, 'A3',  'AUTORISE',  'Hydrocarbure hautement inflammable — classe A3, pas A2L');
