// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
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
 *  16 — habilitations F-Gas (chantier B2, Phase 1) : table habilitations
 *       MULTI-RÉGIME (2008 I-IV + 2025 A1-V cumulables sur une personne,
 *       jamais supprimée : actif=0 + date_revocation) avec CHECK composite
 *       régime↔catégorie ; + 3 colonnes de rôle sur mouvements (execute_par_id
 *       / superviseur_id / responsable_registre_id, nullable, SANS backfill,
 *       HORS empreinte de hachage) et trigger WORM recréé pour les couvrir
 *       (précédent prg_fige migration 13). Aucune règle bloquante : la Phase 1
 *       stocke et affiche, le verdict est Phase 2, le blocage est Phase 3.
 *  17 — mentions de formation complémentaire (chantier B2, Phase 2b,
 *       brique 1) : table mentions_habilitation = une mention PAR FLUIDE
 *       (CO2 / NH3 / HC) que l'admin coche sur une personne et qui ÉTEND
 *       l'axe fluide de ses habilitations (jamais les opérations ni la
 *       charge — décision Franck 14/07, un ancien I-IV + stage CO₂ peut
 *       intervenir sur le CO₂). Même patron que 16 : cumul/renouvellement
 *       (aucun UNIQUE), jamais supprimée (actif=0 + date_revocation).
 *       Table neuve : aucune colonne sur mouvements, trigger WORM inchangé.
 *  18 — outils d'intervention (brique produit n°2 post-B2) : table de
 *       jonction mouvement_outillage = QUELS outils réglementaires ont
 *       servi à QUEL mouvement (traçabilité d'étalonnage — aujourd'hui
 *       seul le détecteur du contrôle était lié). Lignes posées au
 *       BROUILLON (déclaratif), statut + échéance de l'outil FIGÉS à la
 *       validation du mouvement (opposable, hors empreinte — table
 *       séparée). Triggers dédiés : une fois le mouvement figé
 *       (VALIDE/ANNULE), ses liens d'outils ne peuvent plus être créés,
 *       modifiés ni supprimés. Trigger WORM des mouvements INCHANGÉ.
 *  19 — numéro + mode du CONTRÔLE : le CERFA d'un contrôle affichait l'id
 *       technique (ctl-…) et restait toujours OFFICIEL (jamais de filigrane
 *       FORMATION). ADD COLUMN numero/mode sur controles (table sans WORM,
 *       hors chaîne de hash) + backfill : contrôle lié = hérite du mouvement ;
 *       contrôle autonome = « C-FORM-AAAA-NNNN » (espace disjoint des
 *       mouvements → aucune collision de numéro), mode FORMATION.
 *  20 — correction du PRP de R-1234yf (1 → 4, valeur de l'annexe F-Gas), et
 *       seulement si la valeur d'origine (1) est intacte (jamais d'écrasement
 *       d'un référentiel ajusté localement).
 *  21 — fiche réglementaire explicite par fluide (moteur cadre 7 unique,
 *       docs/TABLE-REGLEMENTAIRE-FLUIDES.md) : fluides.contient_hfc /
 *       contient_hfo / categorie_cadre7 / source_prp. categorieCadre7 est LU
 *       EN PRIORITÉ par reglementation-fluides.js (categorieCadre7()) ; NULL
 *       = pas de fiche → repli sur la dérivation historique du libellé
 *       famille. Remplissage PAR CODE des 9 fluides du référentiel validé
 *       (table VALIDÉE par Franck, aucune valeur inventée) ; un fluide ajouté
 *       localement (code inconnu de ce remplissage) garde les 4 colonnes à
 *       NULL, ce qui déclenche justement le repli. Table fluides HORS WORM et
 *       hors chaîne de hash (comme la migration 19) : ALTER + remplissage
 *       sans le moindre risque sur le registre scellé.
 *  22 — PRP F-Gas III (avis réglementaire du 16/07/2026, arbitrage Franck) :
 *       R-1234yf 4 → 0,501 et R-290 3 → 0,02, conditionnels (jamais
 *       d'écrasement d'une valeur ajustée localement) ; sources PRP
 *       alignées ; R-455A garde 148 (conservatoire, réserve DGPR).
 *  23 — LOT C (brique C1) : signatures réelles + socle du scellement v2.
 *       mouvements.version_empreinte (DÉFAUT 1 = historique) /
 *       revision_brouillon (DÉFAUT 0 — invalidation des signatures par
 *       comparaison) / outils_figes / hash_signatures / hash_pieces_jointes
 *       / hash_pdf_final (champs dérivés GELÉS au scellement, consommés par
 *       C2-C3, HORS liste blanche v1 du hasseur → chaînes existantes
 *       INTACTES). Table signatures_mouvement WORM (triggers : jamais
 *       d'UPDATE ; DELETE réservé aux signatures d'un BROUILLON — la
 *       suppression d'un brouillon emporte ses signatures, la trace reste
 *       au journal chaîné ; INSERT refusé sur une écriture figée).
 *       pieces_jointes RECRÉÉE (procédure migration 10) pour la catégorie
 *       CERFA_FINAL (le PDF conservé, C3). Trigger WORM des mouvements
 *       recréé, liste blanche étendue aux 6 nouvelles colonnes.
 *  24 — LOT C (brique C5) : WORM des pièces jointes d'une écriture FIGÉE.
 *       3 triggers sur pieces_jointes — INSERT/UPDATE/DELETE refusés quand
 *       la pièce appartient à un MOUVEMENT VALIDE/ANNULE (reparentage vers
 *       ou depuis une écriture figée compris) ; les pièces des autres
 *       entités (machine, bouteille, personne…) restent libres. Le canal
 *       SYSTÈME conserverPdfFinal insère PENDANT que la ligne est encore
 *       SOUMIS en base : il passe. L'import total retire puis recrée ces
 *       triggers comme les autres WORM (declencheursWorm d'api.js — filtre
 *       tbl_name étendu à pieces_jointes). ⚠️ Toute future migration qui
 *       RECRÉE pieces_jointes (procédure migration 10) devra recréer ces
 *       triggers (« aucun trigger sur pieces_jointes » n'est plus vrai).
 *  26 — LOT E (brique E2b) : ENTITÉS de pièces jointes élargies — même
 *       bug, même remède que la migration 10 (qui l'avait corrigé pour les
 *       CATÉGORIES) : le CHECK du socle v1 sur pieces_jointes.entite_type
 *       REFUSAIT en Mode Local deux valeurs POURTANT posées par le front
 *       (la démo, sans liste blanche, les acceptait) :
 *         personne  fiche du personnel (personne-form, scans + signature)
 *         OUTIL     certificat d'étalonnage (outil-form ; fiche-outil dit
 *                   OUTILLAGE — dette front à unifier, les DEUX passent)
 *       Recréation de la table (procédure migration 10, colonnes nommées)
 *       + RECRÉATION des 3 triggers WORM de la migration 24 (le DROP les
 *       emporte — c'était l'avertissement explicite de la 24).
 *  25 — LOT E (brique E2b) : COFFRE DES IDENTITÉS (RGPD, minimisation).
 *       Deux tables : coffre_identites (une ligne = une identité d'élève
 *       mise à l'abri — pseudonyme UNIQUE, enveloppe AES-256-GCM
 *       AUTOPORTANTE sel|iv|tag|chiffré, cf. server/chiffrement.js
 *       MAGIC_COFFRE) et coffre_purge_en_attente (chemins de fichiers à
 *       supprimer, rejoués au démarrage — un plantage entre COMMIT et
 *       purge disque ne laisse jamais un scan en clair orphelin). Les
 *       clés coffre_sel / coffre_temoin / coffre_kdf / coffre_compteur_*
 *       vivent dans `parametres` (posées à la création du coffre, PAS
 *       ici). AUCUN trigger WORM : la restauration légitime fait un
 *       DELETE (la parade contre la destruction = les sauvegardes).
 *       Tables NON MAPPÉES (mapping.js) : le front ne voit jamais une
 *       enveloppe — import/export par insertion brute dédiée (E2c).
 *  27 — P0-6 (cycle fuite, décision Franck 22/07) : machines.type_installation
 *       ('FIXE'/'MOBILE', défaut FIXE, backfill par le DEFAULT) — un
 *       équipement MOBILE listé est admis au contrôle immédiat après
 *       réparation (exception réglementaire), un FIXE exige J+1 (proxy des
 *       24 h de fonctionnement). Nom compatible avec le modèle complet
 *       P1-1 (qui ajoutera le sous-type — colonne à part, pas de re-modelage).
 *  28 — P0-8 (déclaration annuelle) : bsff.issue_traitement (+ installation_
 *       traitement, certificat_traitement, date_traitement, tous nullable) —
 *       nature du traitement final d'un déchet remis (RECYCLAGE/REGENERATION/
 *       DESTRUCTION/AUTRE), attestée séparément. Corrige BSFF ≠ destruction.
 *  29 — P0-8 (déclaration annuelle) : table cessions (sortie de fluide vers un
 *       tiers attesté, rubrique 10) — trace figée comme retours_fournisseur.
 *       Fin du cessions_kg = 0 codé en dur.
 *  30 — P0-8 : la vue bilan_matiere COMPTE les cessions (DROP + CREATE à
 *       l'identique + CTE cessions_agg) — sans quoi une cession créerait un
 *       écart d'inventaire fantôme. Parité stricte avec calculerBalanceMatiere.
 *  31 — P1-2 (administration du référentiel) : fluides.actif (DEFAULT 1 =
 *       backfill conservateur). Un fluide n'est jamais supprimé (sa clé est
 *       référencée par 8 tables, dont des écritures scellées) : il est
 *       DÉSACTIVÉ — il sort des listes de saisie, reste lisible partout où
 *       il est déjà référencé. Table fluides hors WORM et hors chaîne de hash.
 *  32 — P1-1 (modèle d'équipement) : machines.hermetique_scelle /
 *       hermetique_etiquete / residentiel / sous_type_installation (liste
 *       FERMÉE des mobiles) / detection_verifiee_le / detection_prochaine_verif
 *       / detection_reference. Booléens à 0 et dates à NULL = backfill
 *       CONSERVATEUR : aucun équipement n'est exempté, aucune détection n'est
 *       réputée vérifiée. Le parc devient plus contrôlé, jamais moins.
 *  33 — L4/Q3 (remise à niveau 2008) : habilitations.remise_niveau_le /
 *       remise_niveau_organisme (backfill NULL = rien de présumé fait).
 *       L'arrêté du 21/11/2025 art. 7 : remise à niveau AU PLUS TARD le
 *       12/03/2029, sinon l'attestation n'est plus valide. Hors WORM.
 *  34 — L3/R4 (usage thermique) : machines.usage_thermique (liste FERMÉE
 *       froid/clim/PAC, NULL = régime le plus strict). Commande les dates
 *       d'interdiction du vierge PRP >= 2500 (art. 13). Hors WORM.
 *  35 — report v7 : table plaintes (registre des réclamations clients —
 *       objet, réception, réponse, état RECUE/EN_COURS/TRAITEE ; client_id
 *       FK nullable + client_libelle de secours). Jamais supprimée. Hors WORM.
 *  36 — lot B2 : bsff.masse_bouteille_apres_kg — masse nette RESTANTE dans
 *       la bouteille juste après la remise en filière, FIGÉE à l'émission.
 *       Sans ce repère, une bouteille « re-gonflée » par un simple
 *       updateBouteille après une remise déclarée ne se rapproche de rien
 *       (attaque tirée). Backfill NULL = aucun repère, donc aucune alerte
 *       sur les suivis antérieurs (conservateur). Hors WORM.
 *  37 — lot F carte blanche (13/08) : etablissements.categories_2025
 *       RENOMMÉE categories_autorisees — elle portait la grille 2008 sous
 *       un nom 2025 (4e relecture). RENAME COLUMN, aucune donnée touchée,
 *       aucun déclencheur WORM sur cette table. Hors WORM.
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
 * Fiche réglementaire COURANTE des 9 fluides du référentiel — valeurs de
 * la table validée docs/TABLE-REGLEMENTAIRE-FLUIDES.md (§1 bis, avis du
 * 16/07/2026 ; rien d'inventé), au format front (camelCase, booléens).
 * `prp` = PRP réglementaire courant : sert à l'import JSON pour ne
 * recopier `sourcePrp` QUE si le PRP importé est bien la valeur
 * réglementaire (sinon source inconnue = null, on reste honnête).
 * ⚠️ Consommée par l'IMPORT (api.js) SEULEMENT — jamais par une
 * migration : une migration est IMMUABLE, elle fige ses propres
 * littéraux (leçon de la relecture du 16/07). Miroir front : les MÊMES
 * valeurs vivent dans v8/js/data/demo-donnees.js, parité prouvée par
 * test-contrat (fiche identique demo/local, y compris après import).
 */
const FICHE_REGLEMENTAIRE_FLUIDES = {
  'R-32': { contientHfc: true, contientHfo: false, prp: 675,
    categorieCadre7: 'HFC', sourcePrp: 'AR4 / annexe F-Gas' },
  'R-410A': { contientHfc: true, contientHfo: false, prp: 2088,
    categorieCadre7: 'HFC', sourcePrp: 'AR4' },
  'R-134a': { contientHfc: true, contientHfo: false, prp: 1430,
    categorieCadre7: 'HFC', sourcePrp: 'AR4' },
  'R-407C': { contientHfc: true, contientHfo: false, prp: 1774,
    categorieCadre7: 'HFC', sourcePrp: 'AR4' },
  'R-404A': { contientHfc: true, contientHfo: false, prp: 3922,
    categorieCadre7: 'HFC', sourcePrp: 'AR4' },
  'R-1234yf': { contientHfc: false, contientHfo: true, prp: 0.501,
    categorieCadre7: 'HFO', sourcePrp: 'annexe règl. UE 2024/573 (F-Gas III)' },
  'R-455A': { contientHfc: true, contientHfo: true, prp: 148,
    categorieCadre7: 'HFC', sourcePrp: 'AR4 — 148 conservatoire (réserve DGPR)' },
  'R-744': { contientHfc: false, contientHfo: false, prp: 1,
    categorieCadre7: 'AUCUNE', sourcePrp: 'définition' },
  'R-290': { contientHfc: false, contientHfo: false, prp: 0.02,
    categorieCadre7: 'AUCUNE', sourcePrp: 'AR6 GIEC (réf. règl. UE 2024/573)' }
};

/**
 * Corrections réglementaires conditionnelles des PRP (avis du 16/07/2026)
 * — le CONTENU de la migration 22, partagé avec l'import JSON : un export
 * antérieur réintroduirait les anciens PRP par INSERT OR REPLACE alors
 * que la base est déjà en version 22 (la migration ne rejouera jamais).
 * N'écrase JAMAIS une valeur réellement ajustée (conditions d'égalité).
 * ⚠️ FIGÉ avec la migration 22 : toute correction future = nouvelle
 * migration + nouveau helper, on ne modifie plus celui-ci.
 * @param {(sql: string) => void} executer — exécute un ordre SQL
 *   (db.exec en migration, db.run côté api).
 */
function corrigerPrpFgas3(executer) {
  // R-1234yf : 1 (pré-migration 20) ou 4 (ancien référentiel) → 0,501
  // (valeur 100 ans, annexe II section 1 du règl. UE 2024/573).
  executer(
    "UPDATE fluides SET gwp_ar4 = 0.501 WHERE code = 'R-1234yf' AND gwp_ar4 IN (1, 4);");
  // R-290 (propane) : 3 (AR4) → 0,02 (AR6 GIEC — le propane n'est pas un
  // gaz fluoré, il ne figure pas dans une annexe : valeur référencée par
  // le règl. UE 2024/573). Hors périmètre : effet d'affichage seulement.
  executer(
    "UPDATE fluides SET gwp_ar4 = 0.02 WHERE code = 'R-290' AND gwp_ar4 = 3;");
  // Sources PRP alignées — seulement si la valeur réglementaire est en
  // place. R-455A garde 148 : choix CONSERVATOIRE (contrôle déclenché
  // plus tôt), réserve écrite à lever auprès de la DGPR (148 vs 145,53).
  executer(
    `UPDATE fluides SET source_prp = 'annexe règl. UE 2024/573 (F-Gas III)'
      WHERE code = 'R-1234yf' AND gwp_ar4 = 0.501;`);
  executer(
    `UPDATE fluides SET source_prp = 'AR6 GIEC (réf. règl. UE 2024/573)'
      WHERE code = 'R-290' AND gwp_ar4 = 0.02;`);
  executer(
    `UPDATE fluides SET source_prp = 'AR4 — 148 conservatoire (réserve DGPR)'
      WHERE code = 'R-455A' AND gwp_ar4 = 148;`);
  // Commentaire du seed devenu faux (« PRP = 4 ... ») : corrigé seulement
  // s'il est intact (jamais un commentaire personnalisé).
  executer(
    `UPDATE fluides SET commentaire = 'PRP = 0,501 (annexe F-Gas III) — légèrement inflammable'
      WHERE code = 'R-1234yf'
        AND commentaire = 'PRP = 4 (annexe F-Gas) — légèrement inflammable'
        AND gwp_ar4 = 0.501;`);
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
  },

  16: {
    nom: 'habilitations_fgas',
    appliquer(db) {
      // Habilitations F-Gas MULTI-RÉGIME (Phase 1, chantier B2). Une PERSONNE
      // CUMULE N habilitations : régime 2008 (I–IV) ET 2025 (A1–V) coexistent
      // jusqu'au 31/12/2026, catégories multiples, renouvellement possible
      // (même (regime,categorie) plusieurs fois, différencié par les dates :
      // AUCUN index UNIQUE sur le triplet). Jamais supprimée (actif=0 +
      // date_revocation, comme personnel/clients) : l'historique d'aptitude
      // est opposable en audit. date_debut/date_fin = fenêtre de validité PAR
      // LIGNE. Le CHECK composite = intégrité de STOCKAGE régime↔catégorie
      // (la Phase 1 ne BLOQUE aucune intervention : le verdict est Phase 2).
      db.exec(`CREATE TABLE IF NOT EXISTS habilitations (
        id                   TEXT PRIMARY KEY,
        etablissement_id     TEXT NOT NULL REFERENCES etablissements(id),
        personne_id          TEXT NOT NULL REFERENCES personnel(id),
        regime               TEXT NOT NULL CHECK (regime IN ('2008','2025')),
        categorie            TEXT NOT NULL,
        numero_attestation   TEXT,
        organisme_delivreur  TEXT,
        date_debut           TEXT,
        date_fin             TEXT,
        actif                INTEGER NOT NULL DEFAULT 1 CHECK (actif IN (0,1)),
        date_revocation      TEXT,
        date_creation        TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        CHECK ( (regime = '2008' AND categorie IN ('I','II','III','IV'))
             OR (regime = '2025' AND categorie IN ('A1','A2','B','C','D','E','V')) )
      );`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_habilitations_personne
                 ON habilitations (personne_id);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_habilitations_echeance
                 ON habilitations (date_fin);`);

      // Rôles réels d'une intervention pédagogique, posés sur le mouvement :
      // qui fait le geste (élève), qui supervise (enseignant), qui répond du
      // registre (référent). Nullable, sans DEFAULT, SANS backfill (backfill
      // depuis `technicien` = attribution de rôle inventée = mensonge d'audit,
      // même règle que prg_fige migration 13). HORS empreinte de hachage
      // (CHAMPS_HASH_MOUVEMENT inchangé) : les chaînes scellées existantes,
      // rôles NULL, restent valides.
      db.exec('ALTER TABLE mouvements ADD COLUMN execute_par_id TEXT REFERENCES personnel(id);');
      db.exec('ALTER TABLE mouvements ADD COLUMN superviseur_id TEXT REFERENCES personnel(id);');
      db.exec('ALTER TABLE mouvements ADD COLUMN responsable_registre_id TEXT REFERENCES personnel(id);');

      // WORM : recréer le déclencheur d'immuabilité avec les 3 colonnes de
      // rôle (même raison que la migration 13 pour prg_fige) — sinon la
      // bascule VALIDE→ANNULE laisserait muter ces champs sur une écriture
      // scellée. Recréer un trigger ne touche à AUCUNE donnée : aucun re-hash.
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
          AND NEW.prg_fige              IS OLD.prg_fige
          AND NEW.execute_par_id          IS OLD.execute_par_id
          AND NEW.superviseur_id          IS OLD.superviseur_id
          AND NEW.responsable_registre_id IS OLD.responsable_registre_id)
BEGIN
    SELECT RAISE(ABORT, 'Registre verrouillé : une écriture validée ne peut pas être modifiée (utiliser une contre-écriture).');
END;`);
    }
  },

  17: {
    nom: 'mentions_habilitation',
    appliquer(db) {
      // Mentions de formation complémentaire par fluide (décision Franck
      // 14/07) : un ancien I-IV + stage CO₂/NH₃/HC peut intervenir sur ce
      // fluide. Même patron que habilitations (migration 16) : cumul de N
      // mentions, renouvellement possible (AUCUN index UNIQUE sur
      // (personne, fluide)), jamais supprimée (actif=0 + date_revocation),
      // fenêtre de validité date_debut/date_fin PAR LIGNE. Table neuve :
      // AUCUNE colonne sur mouvements, donc trigger WORM inchangé.
      db.exec(`CREATE TABLE IF NOT EXISTS mentions_habilitation (
        id                   TEXT PRIMARY KEY,
        etablissement_id     TEXT NOT NULL REFERENCES etablissements(id),
        personne_id          TEXT NOT NULL REFERENCES personnel(id),
        fluide               TEXT NOT NULL CHECK (fluide IN ('CO2','NH3','HC')),
        numero_attestation   TEXT,
        organisme_delivreur  TEXT,
        date_debut           TEXT,
        date_fin             TEXT,
        actif                INTEGER NOT NULL DEFAULT 1 CHECK (actif IN (0,1)),
        date_revocation      TEXT,
        date_creation        TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      );`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_mentions_personne
                 ON mentions_habilitation (personne_id);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_mentions_echeance
                 ON mentions_habilitation (date_fin);`);
    }
  },

  18: {
    nom: 'outils_intervention',
    appliquer(db) {
      // Jonction mouvement ↔ outillage (traçabilité d'étalonnage) :
      // déclarée au brouillon, FIGÉE avec le mouvement. statut_fige /
      // echeance_figee = l'état de l'outil AU MOMENT de la validation
      // (la question d'audit : « la balance était-elle étalonnée CE
      // jour-là ? ») — posés par validerMouvement, dans la même
      // transaction, AVANT le passage en VALIDE.
      db.exec(`CREATE TABLE IF NOT EXISTS mouvement_outillage (
        id               TEXT PRIMARY KEY,
        etablissement_id TEXT NOT NULL REFERENCES etablissements(id),
        mouvement_id     TEXT NOT NULL REFERENCES mouvements(id),
        outillage_id     TEXT NOT NULL REFERENCES outillage(id),
        statut_fige      TEXT
            CHECK (statut_fige IS NULL OR
                   statut_fige IN ('CONFORME','A_VERIFIER','EXPIRE','HORS_SERVICE')),
        echeance_figee   TEXT,
        date_creation    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      );`);
      db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_mvt_outillage_unique
                 ON mouvement_outillage (mouvement_id, outillage_id);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_mvt_outillage_outil
                 ON mouvement_outillage (outillage_id);`);
      // Une fois le mouvement figé (VALIDE/ANNULE), ses liens d'outils
      // sont figés avec lui : ni ajout, ni retouche, ni retrait (sinon
      // on pourrait forger a posteriori « l'outil était conforme »).
      db.exec(`CREATE TRIGGER IF NOT EXISTS mvt_outillage_interdire_insert_fige
        BEFORE INSERT ON mouvement_outillage
        WHEN (SELECT statut FROM mouvements WHERE id = NEW.mouvement_id)
             IN ('VALIDE','ANNULE')
        BEGIN
          SELECT RAISE(ABORT,
            'Écriture validée : liens d''outils figés (ajout interdit)');
        END;`);
      db.exec(`CREATE TRIGGER IF NOT EXISTS mvt_outillage_interdire_update_fige
        BEFORE UPDATE ON mouvement_outillage
        WHEN (SELECT statut FROM mouvements WHERE id = OLD.mouvement_id)
             IN ('VALIDE','ANNULE')
          OR (SELECT statut FROM mouvements WHERE id = NEW.mouvement_id)
             IN ('VALIDE','ANNULE')
        BEGIN
          SELECT RAISE(ABORT,
            'Écriture validée : liens d''outils figés (modification interdite)');
        END;`);
      // Un lien ne change JAMAIS de mouvement ni d'outil (le flux légitime
      // ne met à jour que le figeage) : ferme la forge par re-parentage.
      db.exec(`CREATE TRIGGER IF NOT EXISTS mvt_outillage_interdire_reparentage
        BEFORE UPDATE ON mouvement_outillage
        WHEN NEW.mouvement_id IS NOT OLD.mouvement_id
          OR NEW.outillage_id IS NOT OLD.outillage_id
        BEGIN
          SELECT RAISE(ABORT,
            'Lien d''outil : mouvement et outil ne sont pas modifiables');
        END;`);
      db.exec(`CREATE TRIGGER IF NOT EXISTS mvt_outillage_interdire_delete_fige
        BEFORE DELETE ON mouvement_outillage
        WHEN (SELECT statut FROM mouvements WHERE id = OLD.mouvement_id)
             IN ('VALIDE','ANNULE')
        BEGIN
          SELECT RAISE(ABORT,
            'Écriture validée : liens d''outils figés (suppression interdite)');
        END;`);
    }
  },

  19: {
    nom: 'numero_mode_controles',
    appliquer(db) {
      // CERFA depuis un CONTRÔLE : jusqu'ici le contrôle n'avait ni numéro ni
      // mode → le CERFA affichait l'id technique (ctl-…) et restait toujours
      // OFFICIEL (jamais de filigrane FORMATION). On dote chaque contrôle d'un
      // numero + mode. La table controles est LIBREMENT mutable (les triggers
      // WORM ne visent que mouvements/journal_audit, et elle est hors chaîne de
      // hash des mouvements) : ALTER + backfill sans le moindre risque.
      db.exec('ALTER TABLE controles ADD COLUMN numero TEXT;');
      db.exec('ALTER TABLE controles ADD COLUMN mode TEXT;');

      // 1) Contrôle LIÉ à un mouvement (CR-3) : hérite numéro + mode du
      //    mouvement parent — une seule identité de fiche pour une même
      //    intervention physique.
      db.exec(`UPDATE controles
                 SET numero = (SELECT m.numero FROM mouvements m
                                WHERE m.id = controles.mouvement_id),
                     mode   = (SELECT m.mode   FROM mouvements m
                                WHERE m.id = controles.mouvement_id)
               WHERE mouvement_id IS NOT NULL;`);

      // 2) Contrôle AUTONOME (aucun mouvement) : numéro dédié
      //    « C-FORM-AAAA-NNNN » (espace DISJOINT des mouvements → aucune
      //    collision possible avec un numéro de fiche de mouvement), mode
      //    FORMATION. NNNN = séquentiel sur les seuls contrôles autonomes.
      const motif = /^C-FORM-\d{4}-(\d{4})$/;
      let maxAuto = 0;
      for (const { numero } of db.prepare(
          'SELECT numero FROM controles WHERE numero IS NOT NULL').all()) {
        const t = motif.exec(numero || '');
        if (t) maxAuto = Math.max(maxAuto, Number(t[1]));
      }
      const autonomes = db.prepare(
        `SELECT id, date_controle FROM controles
          WHERE mouvement_id IS NULL ORDER BY date_controle, id`).all();
      const maj = db.prepare(
        'UPDATE controles SET numero = ?, mode = ? WHERE id = ?');
      for (const c of autonomes) {
        maxAuto += 1;
        const annee = String(c.date_controle || '').slice(0, 4)
          || String(new Date().getFullYear());
        maj.run(`C-FORM-${annee}-${String(maxAuto).padStart(4, '0')}`,
          'FORMATION', c.id);
      }
    }
  },

  20: {
    nom: 'correction_gwp_r1234yf',
    appliquer(db) {
      // R-1234yf : PRP corrigé de 1 à 4 (valeur de l'annexe F-Gas), UNIQUEMENT
      // si la valeur d'origine (1) est encore en place — on n'écrase jamais une
      // valeur que l'utilisateur aurait lui-même ajustée dans son référentiel.
      db.exec(
        "UPDATE fluides SET gwp_ar4 = 4 WHERE code = 'R-1234yf' AND gwp_ar4 = 1;");
    }
  },

  21: {
    nom: 'fiche_reglementaire_fluides',
    appliquer(db) {
      // Fiche réglementaire EXPLICITE par fluide (moteur cadre 7 unique) :
      // plus de dérivation implicite depuis le libellé famille — chaque
      // fluide du référentiel porte sa propre fiche, prioritaire dans
      // reglementation-fluides.js (categorieCadre7()). Table fluides SANS
      // WORM et hors chaîne de hash (comme la migration 019) : ALTER +
      // remplissage sans le moindre risque.
      db.exec(
        "ALTER TABLE fluides ADD COLUMN contient_hfc INTEGER CHECK (contient_hfc IN (0,1));");
      db.exec(
        "ALTER TABLE fluides ADD COLUMN contient_hfo INTEGER CHECK (contient_hfo IN (0,1));");
      db.exec(
        "ALTER TABLE fluides ADD COLUMN categorie_cadre7 TEXT CHECK (categorie_cadre7 IN ('HFC','HFO','HCFC','AUCUNE'));");
      db.exec('ALTER TABLE fluides ADD COLUMN source_prp TEXT;');

      // Remplissage PAR CODE des 9 fluides du référentiel — valeurs et
      // libellés FIGÉS à la livraison de cette migration (16/07/2026
      // matin) : une migration est IMMUABLE, elle doit produire le même
      // état quelle que soit la version du code qui la rejoue (leçon de
      // la relecture du 16/07 — la constante partagée, elle, évolue avec
      // l'import ; c'est la migration 22 qui réétiquette, conditionnelle-
      // ment). Un fluide ajouté localement (code hors de cette liste)
      // garde les 4 colonnes à NULL : categorieCadre7 NULL fait retomber
      // le moteur sur la dérivation de famille (repli explicite).
      const FICHE_LIVRAISON_21 = [
        ['R-32', 1, 0, 'HFC', 'AR4 / annexe F-Gas'],
        ['R-410A', 1, 0, 'HFC', 'AR4'],
        ['R-134a', 1, 0, 'HFC', 'AR4'],
        ['R-407C', 1, 0, 'HFC', 'AR4'],
        ['R-404A', 1, 0, 'HFC', 'AR4'],
        ['R-1234yf', 0, 1, 'HFO', 'annexe F-Gas'],
        ['R-455A', 1, 1, 'HFC', 'moyenne pondérée massique (AR4)'],
        ['R-744', 0, 0, 'AUCUNE', 'définition'],
        ['R-290', 0, 0, 'AUCUNE', 'AR4']
      ];
      const maj = db.prepare(`UPDATE fluides
        SET contient_hfc = ?, contient_hfo = ?, categorie_cadre7 = ?, source_prp = ?
        WHERE code = ?`);
      for (const [code, hfc, hfo, categorie, source] of FICHE_LIVRAISON_21) {
        maj.run(hfc, hfo, categorie, source, code);
      }
    }
  },

  22: {
    nom: 'prp_fgas3',
    appliquer(db) {
      // PRP réglementaires F-Gas III (avis réglementaire du 16/07/2026,
      // arbitrage Franck : « au mieux du point de vue F-Gas, compromis le
      // plus protecteur »). Sans effet sur le déclenchement des contrôles
      // (HFO purs et HC seuillés en kg ou hors périmètre) : seul le
      // tonnage équivalent CO₂ affiché/CERFA change. Conditionnel comme la
      // migration 20 : on n'écrase JAMAIS une valeur ajustée localement.
      // Le PRP FIGÉ des mouvements validés reste NON rétroactif (acté).
      // Contenu = corrigerPrpFgas3 (en tête de module), PARTAGÉ avec
      // l'import JSON (api.js) et FIGÉ avec cette migration.
      corrigerPrpFgas3((sql) => db.exec(sql));
    }
  },

  23: {
    nom: 'signatures_reelles_lot_c',
    appliquer(db) {
      // LOT C (conditions 3 et 4 du plan audit-proof, docs/PLAN-LOT-C.md §3)
      // — le modèle de données COMPLET du lot est posé en UNE migration (une
      // migration est IMMUABLE) : la brique C1 consomme la table des
      // signatures et la révision du brouillon, C2 l'empreinte v2 et les
      // champs gelés, C3 le PDF conservé (catégorie CERFA_FINAL).

      // 1) mouvements : version d'empreinte (1 = historique, 2 = renforcée,
      //    posée au scellement par C2), révision du brouillon (compteur
      //    incrémenté à chaque modification — les signatures portent la
      //    révision qu'elles ont signée, l'invalidation est une COMPARAISON,
      //    jamais une retouche) et champs dérivés GELÉS au scellement
      //    (calculés puis stockés, jamais re-dérivés à la vérification).
      //    Tous HORS de la liste blanche v1 du hasseur (CHAMPS_HASH_MOUVEMENT
      //    inchangée par cette migration) : aucune chaîne existante ne bouge.
      db.exec('ALTER TABLE mouvements ADD COLUMN version_empreinte INTEGER NOT NULL DEFAULT 1;');
      db.exec('ALTER TABLE mouvements ADD COLUMN revision_brouillon INTEGER NOT NULL DEFAULT 0;');
      db.exec('ALTER TABLE mouvements ADD COLUMN outils_figes TEXT;');
      db.exec('ALTER TABLE mouvements ADD COLUMN hash_signatures TEXT;');
      db.exec('ALTER TABLE mouvements ADD COLUMN hash_pieces_jointes TEXT;');
      db.exec('ALTER TABLE mouvements ADD COLUMN hash_pdf_final TEXT;');

      // 2) Table des signatures RÉELLES (technicien PUIS détenteur — au
      //    lycée le professeur signe détenteur PAR DÉLÉGATION, décision
      //    Franck 16/07). Nom/prénom = personne PHYSIQUE (plus jamais la
      //    raison sociale seule) ; la déclaration est le texte EXACT affiché
      //    au moment de signer ; sha256_document = empreinte de la fiche
      //    telle que présentée ; version_document = révision signée.
      db.exec(`
        CREATE TABLE signatures_mouvement (
            id                   TEXT PRIMARY KEY,
            etablissement_id     TEXT REFERENCES etablissements(id),
            mouvement_id         TEXT NOT NULL REFERENCES mouvements(id),
            role                 TEXT NOT NULL
                CHECK (role IN ('TECHNICIEN','DETENTEUR')),
            nom                  TEXT NOT NULL,
            prenom               TEXT NOT NULL,
            qualite              TEXT,
            organisation         TEXT,
            par_delegation       INTEGER NOT NULL DEFAULT 0
                CHECK (par_delegation IN (0,1)),
            date_heure           TEXT NOT NULL,
            declaration          TEXT NOT NULL,
            image_png            TEXT NOT NULL,
            session_compte_id    TEXT,
            session_personnel_id TEXT,
            sha256_document      TEXT NOT NULL,
            version_document     INTEGER NOT NULL
        );
      `);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_signatures_mouvement
                 ON signatures_mouvement (mouvement_id);`);

      // WORM des signatures : une signature posée ne se modifie JAMAIS ;
      // elle ne se supprime que si son mouvement est encore un BROUILLON
      // (cascade de supprimerMouvement — la trace reste au journal chaîné) ;
      // une écriture figée n'acquiert plus de signature (l'import JSON,
      // opération admin, retire puis recrée ces triggers dans sa
      // transaction, comme les autres WORM).
      db.exec(`CREATE TRIGGER signatures_mouvement_interdire_update
BEFORE UPDATE ON signatures_mouvement
BEGIN
    SELECT RAISE(ABORT, 'Signature scellée : une signature posée ne peut pas être modifiée.');
END;`);
      db.exec(`CREATE TRIGGER signatures_mouvement_interdire_delete
BEFORE DELETE ON signatures_mouvement
WHEN EXISTS (SELECT 1 FROM mouvements
             WHERE id = OLD.mouvement_id AND statut IN ('VALIDE','ANNULE'))
BEGIN
    SELECT RAISE(ABORT, 'Signature scellée : les signatures d''une écriture figée sont conservées.');
END;`);
      db.exec(`CREATE TRIGGER signatures_mouvement_interdire_insert_fige
BEFORE INSERT ON signatures_mouvement
WHEN EXISTS (SELECT 1 FROM mouvements
             WHERE id = NEW.mouvement_id AND statut IN ('VALIDE','ANNULE'))
BEGIN
    SELECT RAISE(ABORT, 'Écriture figée : elle ne peut plus recevoir de signature.');
END;`);

      // 3) pieces_jointes : la catégorie CERFA_FINAL (PDF final conservé,
      //    brique C3). SQLite ne sait pas ALTERer un CHECK : on RECRÉE la
      //    table (procédure officielle, à l'identique de la migration 10),
      //    données et index préservés, copie par colonnes NOMMÉES. Toujours
      //    aucun trigger ni FK entrante sur pieces_jointes.
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
                                     'BORDEREAU_BSFF','CERTIFICAT_ETALONNAGE','CERFA_FINAL')),
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

      // 4) WORM des mouvements : trigger recréé avec la liste blanche
      //    ÉTENDUE aux 6 nouvelles colonnes — la bascule VALIDE → ANNULE ne
      //    peut retoucher NI la version d'empreinte, NI la révision, NI les
      //    champs gelés d'une écriture scellée. Recréer un trigger ne touche
      //    à AUCUNE donnée : aucun re-hash.
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
          AND NEW.prg_fige              IS OLD.prg_fige
          AND NEW.execute_par_id          IS OLD.execute_par_id
          AND NEW.superviseur_id          IS OLD.superviseur_id
          AND NEW.responsable_registre_id IS OLD.responsable_registre_id
          AND NEW.version_empreinte     IS OLD.version_empreinte
          AND NEW.revision_brouillon    IS OLD.revision_brouillon
          AND NEW.outils_figes          IS OLD.outils_figes
          AND NEW.hash_signatures       IS OLD.hash_signatures
          AND NEW.hash_pieces_jointes   IS OLD.hash_pieces_jointes
          AND NEW.hash_pdf_final        IS OLD.hash_pdf_final)
BEGIN
    SELECT RAISE(ABORT, 'Registre verrouillé : une écriture validée ne peut pas être modifiée (utiliser une contre-écriture).');
END;`);
    }
  },

  // ------------------------------------------------------------
  // 24 — LOT C (brique C5) : WORM des pièces jointes d'une écriture
  // figée. Une pièce justificative d'un mouvement VALIDE/ANNULE ne se
  // modifie plus, ne se supprime plus, et une écriture figée n'en
  // acquiert plus (l'empreinte v2 gèle hashPiecesJointes au scellement —
  // ces triggers ferment le canal SQL direct, symétrique des refus
  // applicatifs de C3c). Le canal système conserverPdfFinal insère
  // pendant que la ligne est encore SOUMIS : il passe. L'import total
  // (opération admin) retire puis recrée ces triggers dans sa
  // transaction, comme les autres WORM.
  // ------------------------------------------------------------
  24: {
    nom: 'worm_pieces_jointes_lot_c',
    appliquer(db) {
      db.exec(`CREATE TRIGGER pieces_jointes_interdire_update_fige
BEFORE UPDATE ON pieces_jointes
WHEN (OLD.entite_type = 'MOUVEMENT' AND EXISTS (
        SELECT 1 FROM mouvements
        WHERE id = OLD.entite_id AND statut IN ('VALIDE','ANNULE')))
  OR (NEW.entite_type = 'MOUVEMENT' AND EXISTS (
        SELECT 1 FROM mouvements
        WHERE id = NEW.entite_id AND statut IN ('VALIDE','ANNULE')))
BEGIN
    SELECT RAISE(ABORT, 'Pièce scellée : les pièces justificatives d''une écriture figée ne peuvent plus être modifiées.');
END;`);
      db.exec(`CREATE TRIGGER pieces_jointes_interdire_delete_fige
BEFORE DELETE ON pieces_jointes
WHEN OLD.entite_type = 'MOUVEMENT' AND EXISTS (
        SELECT 1 FROM mouvements
        WHERE id = OLD.entite_id AND statut IN ('VALIDE','ANNULE'))
BEGIN
    SELECT RAISE(ABORT, 'Pièce scellée : les pièces justificatives d''une écriture figée sont conservées.');
END;`);
      db.exec(`CREATE TRIGGER pieces_jointes_interdire_insert_fige
BEFORE INSERT ON pieces_jointes
WHEN NEW.entite_type = 'MOUVEMENT' AND EXISTS (
        SELECT 1 FROM mouvements
        WHERE id = NEW.entite_id AND statut IN ('VALIDE','ANNULE'))
BEGIN
    SELECT RAISE(ABORT, 'Écriture figée : elle ne peut plus recevoir de pièce justificative.');
END;`);
    }
  },

  // 25 — LOT E (brique E2b) : coffre des identités (RGPD). Deux tables,
  // littéraux FIGÉS (une migration est immuable). Aucun trigger WORM
  // (la restauration légitime supprime sa ligne) ; tables non mappées.
  25: {
    nom: 'coffre_identites_lot_e',
    appliquer(db) {
      db.exec(`CREATE TABLE IF NOT EXISTS coffre_identites (
    id                 TEXT PRIMARY KEY,
    personnel_id       TEXT UNIQUE NOT NULL REFERENCES personnel(id),
    pseudonyme         TEXT UNIQUE NOT NULL,
    enveloppe          BLOB NOT NULL,
    date_mise_a_labri  TEXT NOT NULL,
    etablissement_id   TEXT NOT NULL,
    date_creation      TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);`);
      db.exec(`CREATE TABLE IF NOT EXISTS coffre_purge_en_attente (
    id            TEXT PRIMARY KEY,
    chemin        TEXT NOT NULL,
    date_creation TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);`);
    }
  },

  // 26 — LOT E (brique E2b) : entités de PJ élargies (personne, OUTIL) —
  // procédure de la migration 10 (recréation par colonnes nommées) + les
  // 3 triggers WORM de la migration 24 RECRÉÉS (le DROP les emporte).
  26: {
    nom: 'entites_pieces_jointes_elargies',
    appliquer(db) {
      db.exec(`
        CREATE TABLE pieces_jointes_nouveau (
            id             TEXT PRIMARY KEY,
            etablissement_id TEXT REFERENCES etablissements(id),
            entite_type    TEXT NOT NULL
                CHECK (entite_type IN ('ETABLISSEMENT','AUDIT','NON_CONFORMITE','PERSONNEL','OUTILLAGE',
                                       'MACHINE','BOUTEILLE','MOUVEMENT','CONTROLE','BSFF',
                                       'CLIENT_DETENTEUR','INVENTAIRE','personne','OUTIL')),
            entite_id      TEXT NOT NULL,
            categorie      TEXT NOT NULL DEFAULT 'AUTRE'
                CHECK (categorie IN ('ATTESTATION','CERTIFICAT','FACTURE','BL','BON_DE_REPRISE','BSFF',
                                     'PHOTO_PESEE','PLAQUE_SIGNALETIQUE','RAPPORT','AUTRE',
                                     'SIGNATURE','ATTESTATION_APTITUDE','ATTESTATION_CAPACITE',
                                     'BORDEREAU_BSFF','CERTIFICAT_ETALONNAGE','CERFA_FINAL')),
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
      // Triggers WORM de la migration 24, RECRÉÉS à l'identique (littéraux).
      db.exec(`CREATE TRIGGER pieces_jointes_interdire_update_fige
BEFORE UPDATE ON pieces_jointes
WHEN (OLD.entite_type = 'MOUVEMENT' AND EXISTS (
        SELECT 1 FROM mouvements
        WHERE id = OLD.entite_id AND statut IN ('VALIDE','ANNULE')))
  OR (NEW.entite_type = 'MOUVEMENT' AND EXISTS (
        SELECT 1 FROM mouvements
        WHERE id = NEW.entite_id AND statut IN ('VALIDE','ANNULE')))
BEGIN
    SELECT RAISE(ABORT, 'Pièce scellée : les pièces justificatives d''une écriture figée ne peuvent plus être modifiées.');
END;`);
      db.exec(`CREATE TRIGGER pieces_jointes_interdire_delete_fige
BEFORE DELETE ON pieces_jointes
WHEN OLD.entite_type = 'MOUVEMENT' AND EXISTS (
        SELECT 1 FROM mouvements
        WHERE id = OLD.entite_id AND statut IN ('VALIDE','ANNULE'))
BEGIN
    SELECT RAISE(ABORT, 'Pièce scellée : les pièces justificatives d''une écriture figée sont conservées.');
END;`);
      db.exec(`CREATE TRIGGER pieces_jointes_interdire_insert_fige
BEFORE INSERT ON pieces_jointes
WHEN NEW.entite_type = 'MOUVEMENT' AND EXISTS (
        SELECT 1 FROM mouvements
        WHERE id = NEW.entite_id AND statut IN ('VALIDE','ANNULE'))
BEGIN
    SELECT RAISE(ABORT, 'Écriture figée : elle ne peut plus recevoir de pièce justificative.');
END;`);
    }
  },

  // 27 — P0-6 : distinction FIXE/MOBILE de l'équipement (exception du
  // contrôle immédiat après réparation pour les mobiles listés). DEFAULT
  // 'FIXE' = backfill conservateur de tout le parc existant.
  27: {
    nom: 'machines_type_installation',
    appliquer(db) {
      db.exec(`ALTER TABLE machines ADD COLUMN type_installation TEXT
                 NOT NULL DEFAULT 'FIXE'
                 CHECK (type_installation IN ('FIXE','MOBILE'));`);
    }
  },

  // 28 — P0-8 (déclaration annuelle) : ISSUE de traitement final d'un BSFF.
  // Un BSFF n'atteste que la REMISE du déchet ; la nature du traitement
  // (recyclage / régénération / destruction / autre) est attestée séparément,
  // quand l'opérateur renvoie son certificat. Tout nullable = un BSFF déjà
  // remis reste « traitement final non attesté » (anomalie) tant qu'on n'a
  // pas la preuve — jamais compté à tort en destruction. Corrige la « double
  // erreur de sens » de l'audit (BSFF ≠ destruction).
  28: {
    nom: 'bsff_issue_traitement',
    appliquer(db) {
      db.exec(`ALTER TABLE bsff ADD COLUMN issue_traitement TEXT
                 CHECK (issue_traitement IS NULL OR issue_traitement IN
                   ('RECYCLAGE','REGENERATION','DESTRUCTION','AUTRE'));`);
      db.exec(`ALTER TABLE bsff ADD COLUMN installation_traitement TEXT;`);
      db.exec(`ALTER TABLE bsff ADD COLUMN certificat_traitement TEXT;`);
      db.exec(`ALTER TABLE bsff ADD COLUMN date_traitement TEXT;`);
    }
  },

  // 29 — P0-8 (déclaration annuelle) : table CESSIONS. Sortie de fluide vers
  // un tiers attesté (rubrique 10) — trace figée au même niveau de rigueur
  // que retours_fournisseur (pas de WORM/hash-chain : durcissement éventuel
  // renvoyé à P1-3, cohérent avec retours_fournisseur). Fin du cessions_kg=0.
  29: {
    nom: 'cessions',
    appliquer(db) {
      db.exec(`CREATE TABLE IF NOT EXISTS cessions (
        id                        TEXT PRIMARY KEY,
        etablissement_id          TEXT NOT NULL REFERENCES etablissements(id),
        bouteille_id              TEXT REFERENCES bouteilles(id),
        bouteille_code            TEXT,
        fluide                    TEXT REFERENCES fluides(code),
        destinataire_type         TEXT
            CHECK (destinataire_type IN
              ('OPERATEUR_ATTESTE','DISTRIBUTEUR','PRODUCTEUR')),
        destinataire_raison_sociale TEXT,
        masse_kg                  REAL,
        date_cession              TEXT,
        operateur                 TEXT,
        observation               TEXT,
        date_creation             TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      );`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_cessions_bouteille
                 ON cessions (bouteille_id);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_cessions_fluide
                 ON cessions (fluide);`);
    }
  },

  // 30 — P0-8 : la vue bilan_matiere COMPTE enfin les cessions (fin du
  // « 0 AS cessions_kg »). Une cession décrémente physiquement la bouteille ;
  // sans ce poste, la balance ferait apparaître un écart d'inventaire fantôme.
  // La vue est RECRÉÉE à l'identique + un CTE cessions_agg (parité stricte avec
  // demo-store calculerBalanceMatiere, qui soustrait déjà l.cessionsKg).
  30: {
    nom: 'bilan_matiere_cessions',
    appliquer(db) {
      db.exec('DROP VIEW IF EXISTS bilan_matiere;');
      db.exec(`CREATE VIEW bilan_matiere AS
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
cessions_agg AS (
    SELECT etablissement_id,
           fluide,
           CAST(strftime('%Y', date_cession) AS INTEGER) AS annee,
           SUM(COALESCE(masse_kg, 0)) AS cede_kg
    FROM cessions
    WHERE date_cession IS NOT NULL AND fluide IS NOT NULL
    GROUP BY etablissement_id, fluide, annee
),
perimetre AS (
    SELECT etablissement_id, fluide, annee FROM mvt
    UNION SELECT etablissement_id, fluide, annee FROM achats
    UNION SELECT etablissement_id, fluide, annee FROM destructions
    UNION SELECT etablissement_id, fluide, annee FROM retours
    UNION SELECT etablissement_id, fluide, annee FROM cessions_agg
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
    COALESCE(c.cede_kg, 0)            AS cessions_kg,
    COALESCE(r.retourne_kg, 0)        AS retours_fournisseur_kg,
    COALESCE(d.detruit_kg, 0)         AS destructions_kg,
    ( COALESCE(si.stock_neuf_kg, 0) + COALESCE(si.stock_recupere_kg, 0)
    + COALESCE(a.achats_kg, 0) + COALESCE(m.recupere_kg, 0)
    - COALESCE(m.charge_kg, 0) - COALESCE(c.cede_kg, 0)
    - COALESCE(r.retourne_kg, 0) - COALESCE(d.detruit_kg, 0) ) AS stock_theorique_kg,
    i.stock_reel_kg                   AS stock_reel_kg,
    ( i.stock_reel_kg
    - ( COALESCE(si.stock_neuf_kg, 0) + COALESCE(si.stock_recupere_kg, 0)
      + COALESCE(a.achats_kg, 0) + COALESCE(m.recupere_kg, 0)
      - COALESCE(m.charge_kg, 0) - COALESCE(c.cede_kg, 0)
      - COALESCE(r.retourne_kg, 0) - COALESCE(d.detruit_kg, 0) ) ) AS ecart_kg,
    j.justification                   AS justification
FROM perimetre p
LEFT JOIN mvt          m  ON m.etablissement_id  = p.etablissement_id AND m.fluide  = p.fluide AND m.annee  = p.annee
LEFT JOIN achats       a  ON a.etablissement_id  = p.etablissement_id AND a.fluide  = p.fluide AND a.annee  = p.annee
LEFT JOIN destructions d  ON d.etablissement_id  = p.etablissement_id AND d.fluide  = p.fluide AND d.annee  = p.annee
LEFT JOIN retours      r  ON r.etablissement_id  = p.etablissement_id AND r.fluide  = p.fluide AND r.annee  = p.annee
LEFT JOIN cessions_agg c  ON c.etablissement_id  = p.etablissement_id AND c.fluide  = p.fluide AND c.annee  = p.annee
LEFT JOIN stocks_initiaux si ON si.etablissement_id = p.etablissement_id AND si.fluide = p.fluide AND si.annee = p.annee
LEFT JOIN inventaires  i  ON i.etablissement_id  = p.etablissement_id AND i.fluide  = p.fluide AND i.annee  = p.annee
LEFT JOIN justifications_ecarts j ON j.etablissement_id = p.etablissement_id AND j.fluide = p.fluide AND j.annee = p.annee;`);
    }
  },

  // 31 — P1-2 (écran d'administration du référentiel) : fluides.actif.
  // Le référentiel devient modifiable par le référent LUI-MÊME (plus de
  // migration pour corriger un PRP ou déclarer un gaz). Un fluide n'est
  // JAMAIS supprimé — sa clé est référencée par 8 tables, dont des
  // écritures scellées : on le DÉSACTIVE. Un fluide inactif sort des
  // listes de saisie (machine, bouteille, wizard) mais reste lisible
  // partout où il est déjà référencé (cas réel du R-22 : on n'en monte
  // plus, on en récupère encore). DEFAULT 1 = backfill conservateur,
  // tout l'existant reste actif. Table fluides HORS WORM et hors chaîne
  // de hash (comme les migrations 19 et 21) : ALTER sans risque sur le
  // registre scellé.
  31: {
    nom: 'fluides_actif',
    appliquer(db) {
      db.exec(`ALTER TABLE fluides ADD COLUMN actif INTEGER
                 NOT NULL DEFAULT 1 CHECK (actif IN (0,1));`);
    }
  },

  // 32 — P1-1 : le MODÈLE D'ÉQUIPEMENT. La fiche machine ne savait pas dire
  // ce que l'équipement EST (hermétiquement scellé, étiqueté comme tel,
  // résidentiel, sous-type mobile), ni si son système de détection de fuites
  // a été vérifié. Or ce dernier point commande un allègement de moitié des
  // contrôles : sans preuve de vérification, l'allègement n'est pas dû.
  //
  // Tous les booléens à DEFAULT 0 et toutes les dates à NULL = backfill
  // CONSERVATEUR : après migration, AUCUN équipement existant n'est exempté
  // de quoi que ce soit, et aucune détection n'est réputée vérifiée. Le parc
  // devient donc plus contrôlé, jamais moins — c'est le sens voulu.
  //
  // sous_type_installation : liste FERMÉE des équipements mobiles (l'exception
  // du contrôle immédiat après réparation vise les équipements mobiles
  // LISTÉS ; sans liste, elle n'était pas vérifiable). NULL admis = sous-type
  // non renseigné, qui ne donne PAS droit à l'exception.
  // Table machines hors WORM et hors chaîne de hash (comme les migrations 19,
  // 21, 27 et 31) : aucun trigger à recréer.
  32: {
    nom: 'machines_modele_equipement',
    appliquer(db) {
      db.exec(`ALTER TABLE machines ADD COLUMN hermetique_scelle INTEGER
                 NOT NULL DEFAULT 0 CHECK (hermetique_scelle IN (0,1));`);
      db.exec(`ALTER TABLE machines ADD COLUMN hermetique_etiquete INTEGER
                 NOT NULL DEFAULT 0 CHECK (hermetique_etiquete IN (0,1));`);
      db.exec(`ALTER TABLE machines ADD COLUMN residentiel INTEGER
                 NOT NULL DEFAULT 0 CHECK (residentiel IN (0,1));`);
      db.exec(`ALTER TABLE machines ADD COLUMN sous_type_installation TEXT
                 CHECK (sous_type_installation IS NULL
                   OR sous_type_installation IN ('CAMION_FRIGORIFIQUE',
                     'REMORQUE_FRIGORIFIQUE', 'FOURGON_FRIGORIFIQUE',
                     'CONTENEUR_FRIGORIFIQUE', 'WAGON_FRIGORIFIQUE',
                     'AUTRE_MOBILE'));`);
      db.exec('ALTER TABLE machines ADD COLUMN detection_verifiee_le TEXT;');
      db.exec('ALTER TABLE machines ADD COLUMN detection_prochaine_verif TEXT;');
      db.exec('ALTER TABLE machines ADD COLUMN detection_reference TEXT;');
    }
  },

  // 33 — L4/Q3 : la REMISE À NIVEAU des attestations 2008. L'arrêté du
  // 21/11/2025 (aptitude, art. 7) impose aux titulaires I-IV une formation
  // de remise à niveau ponctuelle AU PLUS TARD le 12/03/2029, faute de quoi
  // l'attestation n'est plus valide ; le logiciel doit donc pouvoir
  // l'ENREGISTRER (date + organisme) — sans champ, il aurait dû choisir
  // entre la présumer faite (permissif : reconnaître des attestations que
  // la loi a invalidées) ou expirer tout le monde (l'ancien couperet).
  // Backfill CONSERVATEUR : NULL — aucune remise à niveau n'est réputée
  // faite. Avant le 12/03/2029 la reconnaissance est de droit ; après,
  // seule une ligne renseignée compte (habilitationReconnue, RN-1).
  // Table habilitations hors WORM et hors chaîne de hash (comme la
  // migration 16 qui l'a créée) : aucun trigger à recréer.
  33: {
    nom: 'habilitations_remise_niveau',
    appliquer(db) {
      db.exec('ALTER TABLE habilitations ADD COLUMN remise_niveau_le TEXT;');
      db.exec('ALTER TABLE habilitations ADD COLUMN remise_niveau_organisme TEXT;');
    }
  },

  // 34 — L3/R4 (décision Franck 25/07) : l'USAGE THERMIQUE de la machine
  // (froid commercial / climatisation / pompe à chaleur). Il commande les
  // DATES d'interdiction du fluide VIERGE à PRP >= 2500 (règl. UE 2024/573,
  // art. 13) : réfrigération depuis le 01/01/2025, clim/PAC depuis le
  // 01/01/2026. Backfill CONSERVATEUR : NULL = usage non renseigné → le
  // régime le plus STRICT s'applique (froid, 2025) — le raffinement ne peut
  // qu'ASSOUPLIR une machine explicitement déclarée en clim/PAC, jamais
  // durcir par accident. Table machines hors WORM (comme 27, 31, 32).
  34: {
    nom: 'machines_usage_thermique',
    appliquer(db) {
      db.exec(`ALTER TABLE machines ADD COLUMN usage_thermique TEXT
                 CHECK (usage_thermique IS NULL
                   OR usage_thermique IN ('FROID_COMMERCIAL',
                     'CLIMATISATION', 'POMPE_A_CHALEUR'));`);
    }
  },

  // 35 — REPORT v7 : le REGISTRE DES PLAINTES / réclamations clients (la v7
  // le tenait dans une feuille « PLAINTES »). Trace interne d'une
  // réclamation (objet, réception, réponse, état), reliée à un détenteur du
  // registre (client_id) ou saisie libre (client_libelle) pour un plaignant
  // hors registre. Jamais supprimée (registre), état RECUE→EN_COURS→TRAITEE.
  // Table hors WORM et hors chaîne de hash (comme clients).
  35: {
    nom: 'plaintes',
    appliquer(db) {
      db.exec(`CREATE TABLE IF NOT EXISTS plaintes (
        id                TEXT PRIMARY KEY,
        etablissement_id  TEXT NOT NULL REFERENCES etablissements(id),
        numero            TEXT,
        client_id         TEXT REFERENCES clients_detenteurs(id),
        client_libelle    TEXT,
        date_reception    TEXT,
        objet             TEXT,
        reponse           TEXT,
        date_reponse      TEXT,
        etat              TEXT NOT NULL DEFAULT 'RECUE'
            CHECK (etat IN ('RECUE','EN_COURS','TRAITEE')),
        date_creation     TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      );`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_plaintes_etablissement
                 ON plaintes (etablissement_id);`);
    }
  },

  // 36 — LOT B2 : LA BALANCE CESSE DE POUVOIR MENTIR. Attaque tirée : après
  // deux remises en filière déclarées (5 kg partis), un simple
  // updateBouteille { masseBruteKg: 20 } faisait repasser la bouteille de
  // 5 à 10 kg — HTTP 200, modification journalisée, mais RIEN ne rapprochait
  // les deux faits. On fige donc, à l'émission du suivi, la masse nette
  // RESTANTE : c'est le repère qui rend l'écart calculable pour toujours,
  // y compris après un export/import. NULL sur les suivis antérieurs : pas
  // de repère, pas d'alerte (on n'invente pas un passé qu'on n'a pas mesuré).
  36: {
    nom: 'masse de la bouteille figée après remise en filière',
    appliquer(db) {
      db.exec('ALTER TABLE bsff ADD COLUMN masse_bouteille_apres_kg REAL;');
    }
  },

  // 37 — LOT F carte blanche (13/08) : LE NOM DE LA COLONNE CESSE DE MENTIR.
  // La 4e relecture externe l'a relevé : les catégories de capacité de
  // l'établissement — grille 2008 (I-IV) comme 2025 (A1…V) depuis ce même
  // lot — étaient écrites dans une colonne nommée `categories_2025`.
  // RENAME COLUMN : non destructif, aucune donnée ne bouge. La table
  // etablissements ne porte aucun déclencheur WORM (rien à recréer).
  37: {
    nom: 'la colonne des catégories de capacité porte son vrai nom',
    appliquer(db) {
      db.exec('ALTER TABLE etablissements RENAME COLUMN categories_2025 '
        + 'TO categories_autorisees;');
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
  FICHE_REGLEMENTAIRE_FLUIDES,
  corrigerPrpFgas3,
  versionCible,
  lireVersion,
  migrer
};
