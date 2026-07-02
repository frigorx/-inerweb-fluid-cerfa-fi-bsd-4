-- ============================================================================
-- inerWeb Fluide v8 — Schéma SQLite complet (Mode Local Lycée)
-- ----------------------------------------------------------------------------
-- Source de vérité : docs/SPEC-V8.md (§5 modèle de données, §6 bilan matière,
-- §7 règles réglementaires). Ce schéma traduit TOUT le modèle v8 : il sert de
-- squelette aux phases B (registre) et C (conformité).
--
-- Conventions :
--   - Identifiants texte préfixés : ETB-, PER-, OUT-, MAC-, BTL-, MVT-, CTL-,
--     BSFF-, PJ-, CLI-, INV-, UTI-, AUD-, NC- (générés par server/db.js).
--   - Dates et horodatages au format ISO 8601 (TEXT) : « 2026-07-02 » ou
--     « 2026-07-02T14:30:00 ».
--   - Booléens : INTEGER 0/1 avec contrainte CHECK.
--   - Quantités de fluide en kilogrammes (REAL), 3 décimales recommandées.
--   - `etablissement_id` partout (multi-site prêt).
--   - Les clés étrangères sont ACTIVÉES par db.js (PRAGMA foreign_keys = ON).
--   - Idempotent : IF NOT EXISTS partout, jamais de DROP. Ce fichier est
--     exécuté à chaque ouverture de la base sans risque.
-- ============================================================================


-- ============================================================================
-- RÉFÉRENTIEL DES FLUIDES FRIGORIGÈNES
-- Base commune : code, famille, PRP (GWP AR4, valeurs de la réglementation
-- F-Gas), classe de sécurité NF EN 378 /
-- ASHRAE 34, statut réglementaire F-Gas.
-- ============================================================================
CREATE TABLE IF NOT EXISTS fluides (
    code                 TEXT PRIMARY KEY,          -- ex. « R-32 », « R-410A »
    famille              TEXT NOT NULL,             -- HFC, HFO, HC, mélange, inorganique…
    gwp_ar4              REAL NOT NULL,             -- PRP (potentiel de réchauffement global, rapport GIEC AR4 — valeurs F-Gas)
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
-- Les audits et non-conformités sont dans des tables liées (ci-dessous).
-- ============================================================================
CREATE TABLE IF NOT EXISTS etablissements (
    id                        TEXT PRIMARY KEY,      -- ETB-…
    raison_sociale            TEXT NOT NULL,         -- ⚿
    siret                     TEXT,                  -- ⚿
    adresse                   TEXT,                  -- ⚿
    numero_attestation_capacite TEXT,                -- ⚿ n° attestation de capacité (établissement)
    organisme_certificateur   TEXT,                  -- Socotec, Bureau Veritas, SGS, Qualiclimafroid…
    date_delivrance           TEXT,                  -- ISO
    date_echeance             TEXT,                  -- ISO — alerte automatique à l'approche
    categories_2008           TEXT,                  -- catégories autorisées, grille 2008 (ex. « I » ; valable jusqu'au 31/12/2026)
    categories_2025           TEXT,                  -- catégories autorisées, grille 2025 (obligatoire au 01/01/2027)
    activites_autorisees      TEXT,                  -- mise en service, maintenance, contrôle, récupération, démantèlement (liste)
    sites_couverts            TEXT,                  -- sites/ateliers couverts par l'attestation
    date_dernier_audit        TEXT,                  -- ISO
    date_prochain_audit       TEXT,                  -- ISO
    date_creation             TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- Audits de l'organisme certificateur (table liée du dossier opérateur)
CREATE TABLE IF NOT EXISTS audits_etablissement (
    id               TEXT PRIMARY KEY,               -- AUD-…
    etablissement_id TEXT NOT NULL REFERENCES etablissements(id),
    date_audit       TEXT NOT NULL,                  -- ISO
    organisme        TEXT,                           -- organisme ayant réalisé l'audit
    type_audit       TEXT,                           -- initial, de suivi, de renouvellement…
    resultat         TEXT
        CHECK (resultat IS NULL OR resultat IN ('CONFORME','CONFORME_AVEC_REMARQUES','NON_CONFORME')),
    observation      TEXT
);

-- Non-conformités relevées + actions correctives (table liée)
CREATE TABLE IF NOT EXISTS non_conformites (
    id                  TEXT PRIMARY KEY,            -- NC-…
    etablissement_id    TEXT NOT NULL REFERENCES etablissements(id),
    audit_id            TEXT REFERENCES audits_etablissement(id),
    date_constat        TEXT NOT NULL,               -- ISO
    description         TEXT NOT NULL,
    gravite             TEXT
        CHECK (gravite IS NULL OR gravite IN ('MINEURE','MAJEURE','CRITIQUE')),
    action_corrective   TEXT,                        -- action décidée
    date_echeance_action TEXT,                       -- ISO — date limite de l'action corrective
    date_cloture        TEXT,                        -- ISO — NULL tant que la non-conformité est ouverte
    statut              TEXT NOT NULL DEFAULT 'OUVERTE'
        CHECK (statut IN ('OUVERTE','EN_COURS','CLOTUREE'))
);


-- ============================================================================
-- §5.2 — REGISTRE DU PERSONNEL
-- « Personnes autorisées à intervenir dans l'application : techniciens
-- titulaires d'une attestation d'aptitude, enseignants référents, élèves en
-- mode formation. » Un élève = mode formation uniquement, jamais officiel.
-- Le scan PDF de l'attestation d'aptitude est porté par pieces_jointes.
-- ============================================================================
CREATE TABLE IF NOT EXISTS personnel (
    id                          TEXT PRIMARY KEY,    -- PER-…
    etablissement_id            TEXT NOT NULL REFERENCES etablissements(id),
    nom                         TEXT NOT NULL,       -- ⚿
    prenom                      TEXT NOT NULL,       -- ⚿
    type_personne               TEXT NOT NULL        -- ⚿
        CHECK (type_personne IN ('SALARIE','ENSEIGNANT','ELEVE','SOUS_TRAITANT','INTERVENANT_EXTERIEUR')),
    role_applicatif             TEXT NOT NULL DEFAULT 'VOIR'
        CHECK (role_applicatif IN ('VOIR','SAISIR','VALIDER','ADMINISTRER','OFFICIEL')),
    numero_attestation_aptitude TEXT,                -- n° attestation d'APTITUDE individuelle
    organisme_delivreur         TEXT,
    date_obtention              TEXT,                -- ISO
    date_limite_aptitude        TEXT,                -- ISO — date limite / remise à niveau (alerte)
    categorie_2008              TEXT,                -- grille 2008 (transition, cf. SPEC §7.3)
    categorie_2025              TEXT,                -- grille 2025
    activites_autorisees        TEXT,
    signature_chemin            TEXT,                -- chemin de l'image de signature (dossier documents/)
    email                       TEXT,
    actif                       INTEGER NOT NULL DEFAULT 1 CHECK (actif IN (0,1)),
    date_creation               TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);


-- ============================================================================
-- §5.3 — OUTILLAGE RÉGLEMENTAIRE
-- Remplace les « détecteurs » seuls. Le certificat d'étalonnage (PDF) est
-- porté par pieces_jointes. Blocage du mode officiel si balance ou détecteur
-- requis est expiré (règle appliquée côté serveur, SPEC §7.2).
-- ============================================================================
CREATE TABLE IF NOT EXISTS outillage (
    id                  TEXT PRIMARY KEY,            -- OUT-…
    etablissement_id    TEXT NOT NULL REFERENCES etablissements(id),
    type                TEXT NOT NULL                -- ⚿
        CHECK (type IN ('STATION_RECUPERATION','STATION_CHARGE','BALANCE','DETECTEUR_FUITE',
                        'POMPE_A_VIDE','MANIFOLD','THERMOMETRE_SONDE','BOUTEILLE_RECUPERATION',
                        'FLEXIBLE_VANNES','RACCORDS_SPECIFIQUES','EPI','AUTRE')),
    marque              TEXT,                        -- ⚿
    modele              TEXT,                        -- ⚿
    numero_serie        TEXT,                        -- ⚿
    site_atelier        TEXT,                        -- ⚿ site / atelier d'affectation
    precision_balance   TEXT,                        -- précision (balances), ex. « ± 5 g »
    sensibilite_detecteur TEXT,                      -- sensibilité (détecteurs), ex. « 5 g/an »
    date_verification   TEXT,                        -- ISO — dernière vérification / étalonnage
    prochaine_echeance  TEXT,                        -- ISO — prochaine vérification (alerte)
    statut              TEXT NOT NULL DEFAULT 'CONFORME'
        CHECK (statut IN ('CONFORME','A_VERIFIER','EXPIRE','HORS_SERVICE')),
    observation         TEXT,
    date_creation       TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);


-- ============================================================================
-- CLIENTS / DÉTENTEURS d'équipements
-- Détenteur ou propriétaire d'une machine (client externe, ou l'établissement
-- lui-même pour le parc pédagogique).
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
-- Le PRP est porté par le référentiel fluides ; le tonnage équivalent CO₂
-- (charge × PRP / 1000) et la fréquence de contrôle en découlent.
-- La photo de la plaque signalétique est portée par pieces_jointes.
-- L'historique complet des interventions = tables mouvements et controles.
-- ============================================================================
CREATE TABLE IF NOT EXISTS machines (
    id                      TEXT PRIMARY KEY,        -- MAC-…
    etablissement_id        TEXT NOT NULL REFERENCES etablissements(id),
    code_interne            TEXT,                    -- ⚿ code interne atelier
    designation             TEXT NOT NULL,           -- ⚿
    type                    TEXT,                    -- ⚿ groupe froid, PAC, chambre froide, split…
    marque                  TEXT,
    modele                  TEXT,
    numero_serie            TEXT,
    localisation            TEXT,                    -- ⚿
    client_detenteur_id     TEXT REFERENCES clients_detenteurs(id),  -- détenteur / propriétaire
    fluide                  TEXT REFERENCES fluides(code),           -- ⚿
    charge_nominale_kg      REAL,                    -- ⚿
    charge_actuelle_kg      REAL,                    -- ⚿ mise à jour par les mouvements
    date_mise_en_service    TEXT,                    -- ISO
    detection_permanente    INTEGER NOT NULL DEFAULT 0 CHECK (detection_permanente IN (0,1)),
    justification_detection TEXT,                    -- justification si la fréquence de contrôle est doublée
    frequence_controle_mois INTEGER,                 -- fréquence calculée (mois) selon tCO₂eq
    date_dernier_controle   TEXT,                    -- ISO
    date_prochain_controle  TEXT,                    -- ISO (alerte, blocage si dépassé — SPEC §7.2)
    plaque_fgas_generee     INTEGER NOT NULL DEFAULT 0 CHECK (plaque_fgas_generee IN (0,1)),
    statut                  TEXT NOT NULL DEFAULT 'EN_SERVICE'
        CHECK (statut IN ('EN_SERVICE','ARRETE','DEMANTELE')),
    observation             TEXT,
    date_creation           TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);


-- ============================================================================
-- §5.5 — BOUTEILLES
-- La masse nette est une colonne CALCULÉE (masse brute − tare), jamais saisie.
-- BL/facture, bon de reprise : pieces_jointes. Lien déchets : table bsff.
-- ============================================================================
CREATE TABLE IF NOT EXISTS bouteilles (
    id                      TEXT PRIMARY KEY,        -- BTL-…
    etablissement_id        TEXT NOT NULL REFERENCES etablissements(id),
    code_interne            TEXT,                    -- ⚿
    numero_bouteille        TEXT,                    -- ⚿ n° bouteille réel (gravé / étiquette fabricant)
    qr_interne              TEXT,                    -- contenu du QR code interne
    type                    TEXT NOT NULL            -- ⚿
        CHECK (type IN ('NEUVE','RECUPERATION','TRANSFERT','DECHET')),
    fluide                  TEXT REFERENCES fluides(code),  -- ⚿
    etat_fluide             TEXT NOT NULL DEFAULT 'VIERGE'
        CHECK (etat_fluide IN ('VIERGE','RECUPERE','RECYCLE','REGENERE','DECHET','DOUTEUX','MELANGE')),
    tare_kg                 REAL,                    -- ⚿
    masse_brute_kg          REAL,                    -- ⚿ masse brute actuelle (dernière pesée)
    masse_nette_kg          REAL GENERATED ALWAYS AS (masse_brute_kg - tare_kg) VIRTUAL,  -- ⚿ calculée
    contenance_max_kg       REAL,
    proprietaire            TEXT NOT NULL DEFAULT 'ETABLISSEMENT'
        CHECK (proprietaire IN ('FOURNISSEUR','ETABLISSEMENT','CONSIGNATION')),
    numero_lot              TEXT,
    date_entree_stock       TEXT,                    -- ISO
    masse_nette_entree_kg   REAL,                    -- masse nette pesée à l'entrée en stock (sert d'« achat » au bilan matière)
    date_derniere_pesee     TEXT,                    -- ISO
    pese_par                TEXT REFERENCES personnel(id),  -- utilisateur ayant pesé
    statut                  TEXT NOT NULL DEFAULT 'EN_STOCK'
        CHECK (statut IN ('EN_STOCK','EN_SERVICE','VIDE','A_RETOURNER','RETOURNEE','DECHET','BLOQUEE')),
    numero_bl_facture       TEXT,                    -- n° BL / facture (le document est en pièce jointe)
    numero_bsff             TEXT,                    -- n° BSFF si la bouteille part en déchet (cf. table bsff)
    date_retour_fournisseur TEXT,                    -- ISO
    date_epreuve            TEXT,                    -- ISO — épreuve / réépreuve (bouteilles de récupération)
    date_limite_garde       TEXT,                    -- ISO — limite de garde du fluide récupéré
                                                     -- (tolérance : 1 an après la dernière intervention
                                                     --  pour les fluides non réutilisables)
    observation             TEXT,
    date_creation           TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);


-- ============================================================================
-- §5.6 — MOUVEMENTS (registre verrouillé)
-- Types d'opération normalisés (SPEC §7.1) — table de correspondance unique
-- avec les cases du CERFA 15497 :
--   MISE_EN_SERVICE, CHARGE_APPOINT, RECUPERATION_MAINTENANCE,
--   RECUPERATION_DEMANTELEMENT, CONTROLE_PERIODIQUE, CONTROLE_NON_PERIODIQUE,
--   ASSEMBLAGE, MODIFICATION, TRANSFERT.
-- Cycle de vie : BROUILLON → SOUMIS → VALIDE → (ANNULE par contre-écriture).
-- ⚠ Une écriture VALIDÉE n'est JAMAIS modifiée ni effacée : toute correction
-- passe par une contre-écriture qui référence l'écriture d'origine
-- (contre_ecriture_de). Le hash d'écriture SHA-256 est chaîné au hash de
-- l'écriture validée précédente → registre inviolable (voir db.js).
-- ============================================================================
CREATE TABLE IF NOT EXISTS mouvements (
    id                      TEXT PRIMARY KEY,        -- MVT-…
    numero                  TEXT NOT NULL UNIQUE,    -- ⚿ n° unique (FI-YYYY-XXXXX officiel / FORM-YYYY-XXXXX formation)
    etablissement_id        TEXT NOT NULL REFERENCES etablissements(id),
    date_heure              TEXT NOT NULL,           -- ⚿ ISO date + heure
    mode                    TEXT NOT NULL            -- ⚿ SPEC §7.4 : séparation stricte
        CHECK (mode IN ('FORMATION','OFFICIEL')),
    type_operation          TEXT NOT NULL            -- ⚿ type réglementaire normalisé (SPEC §7.1)
        CHECK (type_operation IN ('MISE_EN_SERVICE','CHARGE_APPOINT','RECUPERATION_MAINTENANCE',
                                  'RECUPERATION_DEMANTELEMENT','CONTROLE_PERIODIQUE',
                                  'CONTROLE_NON_PERIODIQUE','ASSEMBLAGE','MODIFICATION','TRANSFERT')),
    cause                   TEXT,                    -- fuite, maintenance, remplacement compresseur,
                                                     -- mise au rebut, exercice pédagogique…
    machine_id              TEXT REFERENCES machines(id),      -- machine concernée (source)
    machine_destination_id  TEXT REFERENCES machines(id),      -- machine destination (transfert)
    bouteille_source_id     TEXT REFERENCES bouteilles(id),
    bouteille_destination_id TEXT REFERENCES bouteilles(id),
    fluide                  TEXT REFERENCES fluides(code),     -- ⚿
    pesee_avant_kg          REAL,                    -- ⚿ pesée avant intervention
    pesee_apres_kg          REAL,                    -- ⚿ pesée après intervention
    quantite_calculee_kg    REAL,                    -- ⚿ |pesée après − pesée avant|
    sens                    TEXT
        CHECK (sens IS NULL OR sens IN ('ENTREE','SORTIE','INTERNE')),
    -- Quantités séparées (toutes en kg — une seule est en général renseignée) :
    quantite_chargee_kg                 REAL,        -- fluide chargé dans un équipement
    quantite_recuperee_kg               REAL,        -- fluide récupéré
    quantite_cedee_kg                   REAL,        -- fluide cédé à un tiers
    quantite_retournee_fournisseur_kg   REAL,        -- fluide retourné au fournisseur
    quantite_detruite_regeneree_kg      REAL,        -- fluide détruit / régénéré / recyclé
    origine_fluide          TEXT
        CHECK (origine_fluide IS NULL OR origine_fluide IN ('BOUTEILLE_NEUVE','BOUTEILLE_RECUPEREE','AUTRE_EQUIPEMENT')),
    destination_fluide      TEXT
        CHECK (destination_fluide IS NULL OR destination_fluide IN ('MACHINE','BOUTEILLE_RECUP','FOURNISSEUR','DECHET')),
    technicien_id           TEXT REFERENCES personnel(id),     -- ⚿
    validateur_id           TEXT REFERENCES personnel(id),     -- ⚿ référent — obligatoire en lycée (contrôle applicatif)
    cerfa_numero            TEXT,                    -- n° de la fiche d'intervention CERFA liée
    bsff_id                 TEXT REFERENCES bsff(id),          -- BSFF lié le cas échéant
    observation             TEXT,
    statut                  TEXT NOT NULL DEFAULT 'BROUILLON'  -- ⚿
        CHECK (statut IN ('BROUILLON','SOUMIS','VALIDE','ANNULE')),
    hash_ecriture           TEXT,                    -- ⚿ empreinte SHA-256 chaînée (posée à la validation)
    contre_ecriture_de      TEXT REFERENCES mouvements(id),    -- écriture d'origine si régularisation
    date_creation           TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- Verrouillage du registre : une écriture VALIDÉE ne peut être ni supprimée,
-- ni modifiée (seul le passage VALIDE → ANNULE par contre-écriture est admis,
-- sans toucher au contenu ni au hash). Une écriture ANNULÉE est figée.
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
          AND NEW.hash_ecriture         IS OLD.hash_ecriture
          AND NEW.numero                IS OLD.numero
          AND NEW.date_heure            IS OLD.date_heure
          AND NEW.mode                  IS OLD.mode
          AND NEW.type_operation        IS OLD.type_operation
          AND NEW.fluide                IS OLD.fluide
          AND NEW.pesee_avant_kg        IS OLD.pesee_avant_kg
          AND NEW.pesee_apres_kg        IS OLD.pesee_apres_kg
          AND NEW.quantite_calculee_kg  IS OLD.quantite_calculee_kg
          AND NEW.quantite_chargee_kg               IS OLD.quantite_chargee_kg
          AND NEW.quantite_recuperee_kg             IS OLD.quantite_recuperee_kg
          AND NEW.quantite_cedee_kg                 IS OLD.quantite_cedee_kg
          AND NEW.quantite_retournee_fournisseur_kg IS OLD.quantite_retournee_fournisseur_kg
          AND NEW.quantite_detruite_regeneree_kg    IS OLD.quantite_detruite_regeneree_kg)
BEGIN
    SELECT RAISE(ABORT, 'Registre verrouillé : une écriture validée ne peut pas être modifiée (utiliser une contre-écriture).');
END;


-- ============================================================================
-- §5.7 — CONTRÔLES D'ÉTANCHÉITÉ
-- Le tonnage équivalent CO₂ est une colonne calculée (charge × PRP / 1000) ;
-- c'est lui qui déclenche la fréquence de contrôle.
-- La validité d'étalonnage du détecteur est vérifiée côté serveur au moment
-- de la saisie (blocage si expirée — SPEC §7.2).
-- ============================================================================
CREATE TABLE IF NOT EXISTS controles (
    id                          TEXT PRIMARY KEY,    -- CTL-…
    etablissement_id            TEXT NOT NULL REFERENCES etablissements(id),
    type_controle               TEXT NOT NULL        -- ⚿
        CHECK (type_controle IN ('PERIODIQUE','NON_PERIODIQUE','APRES_REPARATION','MISE_EN_SERVICE')),
    machine_id                  TEXT NOT NULL REFERENCES machines(id),  -- ⚿
    date_controle               TEXT NOT NULL,       -- ⚿ ISO
    charge_kg                   REAL,                -- ⚿ charge au moment du contrôle
    prg_utilise                 REAL,                -- ⚿ PRP retenu pour le calcul
    tco2eq                      REAL GENERATED ALWAYS AS (charge_kg * prg_utilise / 1000.0) VIRTUAL,  -- ⚿
    methode                     TEXT
        CHECK (methode IS NULL OR methode IN ('DIRECTE','INDIRECTE')),
    methode_detail              TEXT,                -- détail : détecteur manuel, produit moussant, pression…
    detecteur_id                TEXT REFERENCES outillage(id),  -- détecteur utilisé (n° série via outillage)
    resultat                    TEXT                 -- ⚿
        CHECK (resultat IS NULL OR resultat IN ('CONFORME','FUITE_DETECTEE')),
    localisation_fuite          TEXT,                -- localisation précise de la fuite
    partie_concernee            TEXT
        CHECK (partie_concernee IS NULL OR partie_concernee IN ('RACCORD','VANNE','BRASURE','ECHANGEUR','AUTRE')),
    gravite                     TEXT,
    reparation_immediate        INTEGER CHECK (reparation_immediate IS NULL OR reparation_immediate IN (0,1)),
    date_reparation_prevue      TEXT,                -- ISO
    controle_apres_reparation_id TEXT REFERENCES controles(id),  -- contrôle après réparation (lié)
    date_prochain_controle      TEXT,                -- ISO — prochain contrôle calculé
    operateur_id                TEXT REFERENCES personnel(id),   -- ⚿
    cerfa_numero                TEXT,                -- CERFA lié
    observation                 TEXT,
    date_creation               TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);


-- ============================================================================
-- §5.8 — DÉCHETS / BSFF (bordereau de suivi des fluides frigorigènes)
-- Chaîne complète : récupération → stockage bouteille de récupération →
-- décision (réutilisable / à analyser / déchet) → si déchet : BSFF →
-- enlèvement ou retour fournisseur → masse réellement remise → justificatif
-- (pièce jointe ou lien Trackdéchets) → sortie du stock.
-- ============================================================================
CREATE TABLE IF NOT EXISTS bsff (
    id                       TEXT PRIMARY KEY,       -- BSFF-…
    etablissement_id         TEXT NOT NULL REFERENCES etablissements(id),
    numero_bsff              TEXT,                   -- ⚿ n° BSFF (lié au stock, pas seulement au CERFA)
    bouteille_id             TEXT REFERENCES bouteilles(id),  -- bouteille concernée
    fluide                   TEXT REFERENCES fluides(code),
    statut_fluide            TEXT                    -- ⚿ statut du fluide récupéré
        CHECK (statut_fluide IS NULL OR statut_fluide IN ('REUTILISABLE','A_ANALYSER','DECHET')),
    decision_par             TEXT REFERENCES personnel(id),   -- ⚿ décision prise par qui
    date_decision            TEXT,                   -- ⚿ ISO
    transporteur_collecteur  TEXT,                   -- ⚿
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
-- §5.9 — PIÈCES JOINTES (table unique polymorphe)
-- Tout objet important doit pouvoir porter des preuves : le couple
-- (entite_type, entite_id) désigne l'objet lié. Le fichier physique vit dans
-- le dossier documents/ (nommage horodaté) ; le hash SHA-256 garantit son
-- intégrité.
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
    chemin         TEXT NOT NULL,                    -- chemin relatif dans documents/ (ou clé de stockage cloud)
    taille_octets  INTEGER,
    hash_sha256    TEXT,                             -- empreinte du fichier (intégrité de la preuve)
    date_ajout     TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    ajoute_par     TEXT                              -- login ou id de l'utilisateur
);


-- ============================================================================
-- §5.10 — JOURNAL D'AUDIT (append-only)
-- Qui, quoi, quand, avant/après (JSON), poste, résultat. Non modifiable et
-- non supprimable depuis l'application (aucune route de purge) — verrouillé
-- ici même par déclencheurs. Export CSV/PDF pour le dossier annuel.
-- ============================================================================
CREATE TABLE IF NOT EXISTS journal_audit (
    id           INTEGER PRIMARY KEY AUTOINCREMENT, -- séquence stricte, jamais réutilisée
    date_heure   TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    utilisateur  TEXT,                              -- login (ou « système »)
    action       TEXT NOT NULL,                     -- ex. CREATION, MODIFICATION, VALIDATION, CONNEXION…
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
-- §6 — INVENTAIRE PHYSIQUE (stock réel pesé au 31/12)
-- Un inventaire = une campagne de pesée à une date donnée ; ses lignes
-- donnent, par fluide, le stock réel pesé (neuf et récupéré séparés).
-- Si l'écart avec le stock théorique est non nul, la justification est
-- obligatoire (saisie bloquante côté application — SPEC §6).
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventaires (
    id               TEXT PRIMARY KEY,               -- INV-…
    etablissement_id TEXT NOT NULL REFERENCES etablissements(id),
    date_inventaire  TEXT NOT NULL,                  -- ISO — en pratique le 31/12
    operateur_id     TEXT REFERENCES personnel(id),  -- qui a pesé
    valide           INTEGER NOT NULL DEFAULT 0 CHECK (valide IN (0,1)),
    observation      TEXT,
    date_creation    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS inventaire_lignes (
    id                      TEXT PRIMARY KEY,        -- INV-…-L…
    inventaire_id           TEXT NOT NULL REFERENCES inventaires(id),
    fluide                  TEXT NOT NULL REFERENCES fluides(code),
    stock_reel_neuf_kg      REAL NOT NULL DEFAULT 0, -- stock réel pesé, fluide neuf
    stock_reel_recupere_kg  REAL NOT NULL DEFAULT 0, -- stock réel pesé, fluide récupéré
    justification_ecart     TEXT,                    -- obligatoire si écart ≠ 0 (contrôle applicatif)
    UNIQUE (inventaire_id, fluide)
);


-- ============================================================================
-- COMPTES UTILISATEURS DE L'APPLICATION (mode local)
-- Mot de passe haché scrypt (node:crypto), jamais en clair (SPEC §8).
-- Rôles : ADMIN / REFERENT / ENSEIGNANT / ELEVE (SPEC §2.2).
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
CREATE INDEX IF NOT EXISTS idx_mouvements_date        ON mouvements (date_heure);
CREATE INDEX IF NOT EXISTS idx_mouvements_machine     ON mouvements (machine_id);
CREATE INDEX IF NOT EXISTS idx_mouvements_fluide      ON mouvements (fluide);
CREATE INDEX IF NOT EXISTS idx_mouvements_statut      ON mouvements (statut);
CREATE INDEX IF NOT EXISTS idx_mouvements_type        ON mouvements (type_operation);
CREATE INDEX IF NOT EXISTS idx_mouvements_bouteille_src ON mouvements (bouteille_source_id);
CREATE INDEX IF NOT EXISTS idx_mouvements_bouteille_dst ON mouvements (bouteille_destination_id);
CREATE INDEX IF NOT EXISTS idx_controles_machine      ON controles (machine_id);
CREATE INDEX IF NOT EXISTS idx_controles_date         ON controles (date_controle);
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
CREATE INDEX IF NOT EXISTS idx_inventaires_date       ON inventaires (date_inventaire);


-- ============================================================================
-- §6 — VUE bilan_matiere : balance matière annuelle par fluide
-- Pour chaque fluide et chaque année (mode OFFICIEL, écritures VALIDÉES) :
--   stock début (inventaire au 31/12 de l'année précédente)
--   + achats (bouteilles neuves entrées en stock dans l'année)
--   + récupérations − charges − cessions − retours fournisseur
--   − destructions/régénérations = stock théorique fin,
-- comparé au stock réel pesé (inventaire de l'année). Écart = réel − théorique
-- (NULL tant que l'inventaire de l'année n'existe pas).
-- ============================================================================
CREATE VIEW IF NOT EXISTS bilan_matiere AS
WITH
mvt AS (
    SELECT etablissement_id,
           fluide,
           CAST(strftime('%Y', date_heure) AS INTEGER) AS annee,
           SUM(COALESCE(quantite_chargee_kg, 0))               AS charge_kg,
           SUM(COALESCE(quantite_recuperee_kg, 0))             AS recupere_kg,
           SUM(COALESCE(quantite_cedee_kg, 0))                 AS cede_kg,
           SUM(COALESCE(quantite_retournee_fournisseur_kg, 0)) AS retourne_kg,
           SUM(COALESCE(quantite_detruite_regeneree_kg, 0))    AS detruit_kg
    FROM mouvements
    WHERE statut = 'VALIDE' AND mode = 'OFFICIEL' AND fluide IS NOT NULL
    GROUP BY etablissement_id, fluide, annee
),
achats AS (
    SELECT etablissement_id,
           fluide,
           CAST(strftime('%Y', date_entree_stock) AS INTEGER) AS annee,
           SUM(COALESCE(masse_nette_entree_kg, 0)) AS achats_kg
    FROM bouteilles
    WHERE type = 'NEUVE' AND date_entree_stock IS NOT NULL AND fluide IS NOT NULL
    GROUP BY etablissement_id, fluide, annee
),
stocks AS (
    SELECT i.etablissement_id,
           l.fluide,
           CAST(strftime('%Y', i.date_inventaire) AS INTEGER) AS annee,
           SUM(COALESCE(l.stock_reel_neuf_kg, 0))     AS reel_neuf_kg,
           SUM(COALESCE(l.stock_reel_recupere_kg, 0)) AS reel_recupere_kg
    FROM inventaires i
    JOIN inventaire_lignes l ON l.inventaire_id = i.id
    GROUP BY i.etablissement_id, l.fluide, annee
),
perimetre AS (
    SELECT etablissement_id, fluide, annee FROM mvt
    UNION SELECT etablissement_id, fluide, annee FROM achats
    UNION SELECT etablissement_id, fluide, annee + 1 FROM stocks  -- l'inventaire N ouvre l'année N+1
    UNION SELECT etablissement_id, fluide, annee FROM stocks
)
SELECT
    p.etablissement_id,
    p.fluide,
    p.annee,
    COALESCE(si.reel_neuf_kg, 0)      AS stock_initial_neuf_kg,
    COALESCE(si.reel_recupere_kg, 0)  AS stock_initial_recupere_kg,
    COALESCE(a.achats_kg, 0)          AS achats_kg,
    COALESCE(m.recupere_kg, 0)        AS recupere_kg,
    COALESCE(m.charge_kg, 0)          AS charge_kg,
    COALESCE(m.cede_kg, 0)            AS cede_kg,
    COALESCE(m.retourne_kg, 0)        AS retourne_fournisseur_kg,
    COALESCE(m.detruit_kg, 0)         AS detruit_regenere_kg,
    -- Stock théorique fin = stock début + achats + récupérations
    --                       − charges − cessions − retours − destructions
    ( COALESCE(si.reel_neuf_kg, 0) + COALESCE(si.reel_recupere_kg, 0)
    + COALESCE(a.achats_kg, 0) + COALESCE(m.recupere_kg, 0)
    - COALESCE(m.charge_kg, 0) - COALESCE(m.cede_kg, 0)
    - COALESCE(m.retourne_kg, 0) - COALESCE(m.detruit_kg, 0) ) AS stock_theorique_kg,
    (sf.reel_neuf_kg + sf.reel_recupere_kg) AS stock_reel_kg,   -- NULL si pas d'inventaire cette année
    ( (sf.reel_neuf_kg + sf.reel_recupere_kg)
    - ( COALESCE(si.reel_neuf_kg, 0) + COALESCE(si.reel_recupere_kg, 0)
      + COALESCE(a.achats_kg, 0) + COALESCE(m.recupere_kg, 0)
      - COALESCE(m.charge_kg, 0) - COALESCE(m.cede_kg, 0)
      - COALESCE(m.retourne_kg, 0) - COALESCE(m.detruit_kg, 0) ) ) AS ecart_kg
FROM perimetre p
LEFT JOIN mvt    m  ON m.etablissement_id  = p.etablissement_id AND m.fluide  = p.fluide AND m.annee  = p.annee
LEFT JOIN achats a  ON a.etablissement_id  = p.etablissement_id AND a.fluide  = p.fluide AND a.annee  = p.annee
LEFT JOIN stocks si ON si.etablissement_id = p.etablissement_id AND si.fluide = p.fluide AND si.annee = p.annee - 1
LEFT JOIN stocks sf ON sf.etablissement_id = p.etablissement_id AND sf.fluide = p.fluide AND sf.annee = p.annee;


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
