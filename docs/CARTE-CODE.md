# CARTE DU CODE — inerWeb Fluide v8/v9

> **À lire AVANT toute exploration** (doctrine sobriété tokens, 14/07/2026).
> Elle remplace 90 % des grep/lectures. Mise à jour : une ligne par module
> ajouté/retiré, à CHAQUE incrément (comme le CHANGELOG).

## Architecture en une phrase

Front vanilla ES modules sous `v8/` (démo navigateur OU client du serveur
local), serveur Node CommonJS sous `server/` (SQLite `node:sqlite`, port
2011) ; les DEUX implémentent le MÊME contrat `v8/js/data/contrat.js`
(93 méthodes, `VERSION_CONTRAT` 10) prouvé par `test-contrat.mjs` joué
contre chacune.

## Flux clés

- **Écriture opposable** : wizard → `creerMouvement` (BROUILLON) →
  `soumettreMouvement` → `validerMouvement` (effets stocks + contrôle lié +
  figeages PRP/outils + scellement hash chaîné) ; annulation UNIQUEMENT par
  `annulerParContreEcriture`. Statuts : BROUILLON/SOUMIS/VALIDE/ANNULE.
- **Choix du store** (front) : `v8/js/data/datastore.js` — DemoStore
  (mémoire+localStorage) par défaut, LocalStore (`local-store.js` →
  `transport-http.js` → `POST /api/:methode`) si le serveur répond.
- **Tests** : `node outils/lancer-tests.mjs` = TOUT le filet (~30 s, arrêt
  au premier rouge). Suites `SUITES_DOUBLEES` jouées demo PUIS local.
  Toute nouvelle suite `test-*.mjs` est auto-découverte.

## server/ (CommonJS — les modules purs du front y sont DUPLIQUÉS en littéraux)

| Module | Rôle | Pièges |
|---|---|---|
| `serveur.js` | HTTP loopback ; LAN si `IWF_LAN=1` = **HTTPS OBLIGATOIRE** (IWF_TLS_CERT/KEY, TLS ≥ 1.2, HSTS, refus de démarrer sans certificat — P1-5, test-lan-https) ; routage `/api/:methode` ; **statique ALLOWLISTÉ (P2-4, 23/07) : `DOSSIERS_SERVIS` = v8, img + `FICHIERS_RACINE_SERVIS` = index/guide/manifest — tout le reste répond 404 (pas 403 : on ne confirme pas l'existence). Avant : liste noire, donc docs/, CHANGELOG, README, apps-script/ et le RAPPORT D'AUDIT étaient servis en 200 (prouvé en le tirant). Ne JAMAIS revenir à une liste noire : elle oublie ce qu'on ajoute ensuite. `test-distribution-statique`** | garde Host+Origin (CSRF/rebinding) obligatoire ; **lot A : TOUTE lecture exige une session (loopback compris), seuls ping + routes d'amorçage de routes-comptes passent sans** ; CSP servie en en-tête (`frame-ancestors 'none'`) |
| `api.js` (~5000 l.) | LE dispatcher : un handler par méthode du contrat, `muter()` = transaction, `ROLES_MUTATION` | sémantique = copie EXACTE du DemoStore ; rôle jamais lu du corps ; **lot E ① : `ROLES_LECTURE_SENSIBLE` (lectures gatées par rôle) consulté par `garderRole` après `ROLES_MUTATION` — `exporterDonneesPersonne` = VALIDEUR** |
| `export-personne.js` | miroir littéral de l'assemblage de l'export RGPD d'une personne (lot E ①) | parité prouvée par `test-export-personne.mjs` ; handler serveur = composition des getters existants + signatures brutes mappées ; personne AU COFFRE → signatures substituées par le pseudonyme |
| `coffre-identites.js` | miroir littéral des règles pures du COFFRE DES IDENTITÉS (lot E2) | parité prouvée par `test-coffre-identites.mjs` ; api.js porte les 6 gestes (REFERENT/ADMIN + poste local), le témoin GCM, l'archive préalable OBLIGATOIRE, la purge rattrapée au démarrage (`rejouerPurgeCoffre`), les verrous de fiche au coffre (updatePersonne/PJ/désactivation/habilitations/mentions) et le transport export/import du coffre (E2c : coffreConfig sel/témoin/kdf + compteurs + enveloppes base64, remplacement atomique, simulation rejetée, refus protecteur si fichier sans coffre sur poste au coffre) ; primitives crypto = `chiffrement.js` (enveloppes de champ autoportantes, scrypt N=131072) |
| `db.js` | ouverture PRAGMA coffre-fort, `journaliser()` SHA-256 CHAÎNÉ, transaction ré-entrante | `recursive_triggers=ON` VITAL (anti-REPLACE) ; **P1-6 : base vive REFUSÉE sous OneDrive/Drive/Dropbox** (`verifierEmplacementBase`, dérogation `IWF_AUTORISER_BASE_SYNCHRONISEE=1`, test-emplacement-base) |
| `migrations.js` | registre 2→32, transactionnel, consécutif ; exporte `FICHE_REGLEMENTAIRE_FLUIDES` (table validée, consommée par la migration 21 ET l'import JSON d'api.js) | JAMAIS de DROP destructif ; trigger WORM à recréer si colonne mouvements ajoutée ; registre-commentaire en tête à tenir ; **24 (C5) = WORM pieces_jointes d'un mouvement figé — à recréer si la table est recréée (procédure migration 10, fait par la 26)** ; **25-26 (E2b) = tables du coffre des identités + entités de PJ élargies (personne/OUTIL, bug préexistant)** ; **27 (P0-6) = machines.type_installation FIXE/MOBILE** ; **28-30 (P0-8) = bsff.issue_traitement, table cessions, vue bilan_matiere RECRÉÉE (DROP+CREATE) pour compter les cessions (seul DROP VIEW du registre — non destructif de données)** ; **31 (P1-2) = fluides.actif (DEFAULT 1) — un fluide n'est jamais supprimé (clé étrangère de 8 tables, dont des écritures scellées), il est DÉSACTIVÉ** ; **32 (P1-1) = machines.hermetique_scelle/hermetique_etiquete/residentiel/sous_type_installation (liste FERMÉE des mobiles)/detection_verifiee_le/detection_prochaine_verif/detection_reference — backfill CONSERVATEUR (booléens 0, dates NULL : rien exempté, rien vérifié)** |
| `schema.sql` | socle v1 SEUL (les évolutions = migrations) | ne jamais l'éditer pour une évolution |
| `mapping.js` | correspondance UNIQUE front(camel)↔SQL(snake), `CHAMPS_HASH_MOUVEMENT` = liste blanche du hasseur | toute colonne hors empreinte reste HORS de cette liste |
| `hash-mouvement.js` | clone EXACT du hasseur front — VERSIONNÉ (lot C, C2) : v1 (18 champs) FIGÉE À JAMAIS, v2 = +9 champs (PRP figé, CERFA, rôles, champs gelés) ; aides empreinteListeTriee / chaineCanoniqueSignature | ne jamais utiliser db.hashEcriture pour les mouvements ; QUATRE vérificateurs versionnés (api ×2 + démo + verification.js) ; empreintes CONNUES figées dans test-hash-mouvement |
| `blocage-officiel.js` | miroir littéral du moteur de blocage OFFICIEL (lot B) | **verrou REFERMÉ le 20/07 (T1, audit externe #2)** : `VERROU_LIVRAISON = true` ICI + côté ESM, nulle part ailleurs, NON configurable par l'env (rebasculer à `false` rouvre) ; ouvert le 19/07 (C5) puis refermé le temps des P0 ; api.js ajoute sauvegarde du poste + validateur de session (tous modes, 403) au cadre |
| `signatures-mouvement.js` | miroir littéral des signatures RÉELLES (lot C, C1) : déclarations figées + critères d'illisibilité | parité prouvée par test-signatures-mouvement ; ne jamais toucher un miroir sans l'autre |
| `droit-intervention.js` | miroir littéral du MOTEUR d'aptitude de `habilitations.js` (P0-5) : `verifierDroitIntervention` + matrice/seuils/messages, `habilitationReconnue` (fin de reconnaissance 2008 au 31/12/2026), `jetonsMentionsActives` | parité prouvée par test-droit-intervention (verdicts ET messages) ; consommé par le `cadreFicheOfficiel` d'api.js (fait `aptitude`) ; les constantes CRUD (REGIMES…) restent dans api.js |
| `declaration-annuelle.js` | miroir littéral du moteur PUR de la déclaration annuelle 11 rubriques (P0-8) : `calculerDeclarationAnnuelle(annee, donnees)` | parité prouvée par `test-declaration-annuelle` (sémantique + JSON.stringify ESM↔CJS) ; `api.js` l'appelle depuis `getDeclarationAnnuelle` (lit les tables via db.all, assemble le même sac que le DemoStore) ; agrégation 100 % JS des 2 côtés (pas de vue SQL) |
| `pdf-final.js` | miroir littéral du PDF FINAL conservé (lot C, C3a) : messages canoniques + contrôle %PDF/5 Mo + nom `CERFA-<numéro>.pdf` | parité prouvée par test-signatures-mouvement ; la conservation = `conserverPdfFinal` d'api.js (PJ système CERFA_FINAL, SANS bump de révision) ; C3b : témoins `.sha256`+`.manifeste.json` frères (`ecrireTemoinsPdfFinal`, best-effort hors transaction) + `verifierPdfFinalConserve` (pluralité dénoncée) + RÉGÉNÉRATION des témoins manquants au démarrage (`reecrireTemoinsPdfFinalManquants`, jamais d'écrasement — la restauration d'archive ne transporte pas les frères) ; C3c : asymétrie FERMÉE (ajouterPieceJointe refuse figé + catégorie réservée), l'import RECOMPTE hashPiecesJointes des v2 + garde « CERFA_FINAL hors canal système » ; C5 : trigger WORM pieces_jointes POSÉ (migration 24) + `verifierTousPdfFinalConserves` joué au démarrage par serveur.js (anomalie journalisée PDF_FINAL_ANOMALIE, best-effort par écriture) |
| `comptes.js` / `sessions.js` / `routes-comptes.js` | scrypt **N=2^17** (OWASP, P2-3)+NFC+leurre anti-timing, jetons hachés SHA-256, cookie HttpOnly | message d'échec UNIQUE ; session meurt si compte désactivé ; ancien profil N=2^15 accepté puis RE-HACHÉ à la connexion (journal `RENFORCEMENT_HASH_MOT_DE_PASSE`) ; chiffrement.js garde N=2^15 (archives existantes) |
| `sauvegarde.js` / `restauration.js` / `manifeste.js` / `verification.js` / `chiffrement.js` | coffre-fort : VACUUM INTO, restauration atomique, AES-256-GCM | jamais copier le .db à chaud ; phrase NFC ; rollback = reposer l'original ; ⚠️ verification.js hache les mouvements (4e vérificateur versionné v2 — l'oublier rendrait toute archive « invalide ») |
| `sauvegarde-auto.js` | sauvegarde AUTOMATIQUE (condition 6) : archive au démarrage si > 24 h + VÉRIFIÉE, snapshot débouncé après écriture scellée (crochet dans api.appeler) | best-effort ABSOLU (jamais bloquant) ; hors transaction ; réglages `sauvegarde_auto_*` |
| `scellement-externe.js` | témoin QUOTIDIEN de scellement (lot D) : têtes des chaînes + compteurs + versions dans `backups/scellement/`, chaîné entre jours, empreinte auto-vérifiable | best-effort ABSOLU ; toujours actif ; crochets démarrage + api.appeler ; ⚠️ tests : base jetable NICHÉE sous `<mkdtemp>/data/` sinon backups/ dérive sur Temp partagé |
| `creer-admin.js` | CLI bootstrap 1er ADMIN | aucun endpoint web équivalent |
| `harnais-contrat.mjs` | monte un LocalStore sur une base JETABLE + transport in-process qui sérialise VRAIMENT en JSON | c'est lui qui joue `test-contrat.mjs local` ; contexte figé `role:'REFERENT'` |
| `parametres.js` | table clé/valeur (réglages du poste) | — |
| `zip-node.js` | ZIP « stored » côté serveur (coffre-fort) | confine les chemins (patron à reprendre) |

## v8/js/data/ (cœur pur + stores)

| Module | Rôle |
|---|---|
| `contrat.js` | LA vérité de surface : 87 méthodes documentées, messages canoniques |
| `demo-store.js` (~4000 l.) | implémentation mémoire complète (référence sémantique) |
| `local-store.js` | enveloppes 1-pour-1 vers l'API (ajouter CHAQUE nouvelle méthode ici) ; SEULE adaptation : le contenu binaire des PJ (base64 à l'aller, Blob au retour) |
| `contenu-pj.js` | pur : contenu binaire des pièces jointes (`versBase64`/`versBlob`) — JSON réduit un Blob à `{}`, d'où 9 octets de déchet enregistrés comme preuve avant le 14/07 ; **lot A : `signatureConcordeAvecMime` = contrôle des nombres magiques (PDF/PNG/JPEG/WebP), miroir littéral dans `api.js`, appelé par `ajouterPieceJointe` des deux côtés** |
| `datastore.js` | fabrique : choisit DemoStore ou LocalStore selon que le serveur répond |
| `demo-donnees.js` | le monde fictif de la Démo (données seules, aucune règle) |
| `transport-http.js` | transport `fetch` du LocalStore (`POST /api/:methode`, enveloppe `{ok,resultat}`) |
| `code-machine.js` | pur : code lisible SITE-FAMILLE-NUMÉRO (JR-CF-001), générateur/validation |
| `habilitations.js` | pur : moteur d'aptitude B2 (`verifierDroitIntervention`, matrice 2008+2025) — CONSEIL partout, et depuis P0-5 BLOCAGE en Officiel (fait `intervenant.aptitude` des deux `cadreFicheOfficiel` → condition 16 `APTITUDE_PORTEE` de blocage-officiel, charge NOMINALE machine, **hermétique branché sur la machine depuis P1-1 — seuil 6 kg si scellé ET étiqueté, `equipement.hermetiqueOpposable`**) ; frontières STRICTES (< 3 / < 6 kg, 3,000 pile refusé), cat. II (2008) limitée, contrôles P7 mappés ETANCHEITE ; `habilitationReconnue` (2008 non reconnue après le 31/12/2026) ; miroir serveur = `server/droit-intervention.js` |
| `reglementation-fluides.js` | **P1-2 (23/07)** : porte AUSSI les règles d'ADMINISTRATION du référentiel — `verifierFicheFluide` (garde de saisie, messages canoniques, cohérence cadre 7 limitée aux contradictions manifestes), `codeFluideNormalise` (unicité insensible espaces/tirets/casse, casse saisie conservée), `impactDepuisPrp` (bornes F-Gas 150/750/2500 ; PRP absent OU NÉGATIF → null, jamais « FAIBLE » — rassurant à tort), listes `CLASSES_SECURITE`/`STATUTS_REGLEMENTAIRES`/`CATEGORIES_CADRE7`. Miroir littéral CommonJS dans `api.js`, parité prouvée par `test-referentiel-fluides` (doublée). ⏤ pur : MOTEUR RÉGLEMENTAIRE UNIQUE cadre 7 (`categorieCadre7` + `evaluerControle`) — source de vérité des seuils/fréquences F-Gas (règles A/B/C, `docs/TABLE-REGLEMENTAIRE-FLUIDES.md`), consommé par plaque-fgas/generateur/demo-store, copié en littéral côté serveur (`api.js` `frequenceControleMois`). Charge NOMINALE, HFC avant HFO ; fiche EXPLICITE par fluide prioritaire (`categorieCadre7`, migration 21, AUCUNE = hors périmètre) ; `dateIntervention` optionnelle (HFO purs contrôlés depuis le 11/03/2024 seulement) |
| `blocage-officiel.js` | pur : moteur de blocage du mode OFFICIEL (lot B) — `evaluerBlocagesOfficiel(cadre)` applique la liste de `docs/CONDITIONS-BLOCANTES-OFFICIEL.md` filtrée par moment (PASSAGE/SOUMISSION/VALIDATION), `VERROU_LIVRAISON` ferme le mode jusqu'aux lots C-D ; branché aux 3 moments des deux stores + `simulerValidationOfficielle` (contrat) ; conditions 14-15 (lot C) = faits tri-état signatureTechnicienValide/signatureDetenteurValide ; P7-c : `MSG_CONTROLE_DIRECT_OFFICIEL` = refus STRUCTUREL de `createControle` en OFFICIEL (FORMATION-only par nature, l'officiel = mouvement type CONTROLE) |
| `signatures-mouvement.js` | pur : signatures RÉELLES (lot C, C1) — déclarations signées EXACTES (`declarationSignature`, délégation dans la qualité ET la déclaration) + critères d'illisibilité (`verifierImageSignature` : PNG réel, ≥ 1 Ko, ≤ 1 Mo) ; consommé par signerMouvement des deux stores, recopié en littéral côté serveur |
| `pdf-final.js` | pur : PDF FINAL conservé (lot C, C3a) — messages canoniques de refus + `verifierOctetsPdfFinal` (%PDF, 5 Mo) + `nomFichierPdfFinal` ; C5 : `pdfFinalAttendu(type)` = exemption TRANSFERT (jamais de CERFA, IM-12 — PDF fourni refusé) ; consommé par validerMouvement des deux stores (3e param `pdfFinalBase64`, OBLIGATOIRE en OFFICIEL hors transfert, refusé en FORMATION), recopié en littéral côté serveur |
| `parcours-signature.js` | pur : décisions de l'écran de double signature (lot C, C4) — `etatParcoursSignatures` (tri-état par rôle, signature retenue, prêt pour soumission) + `preremplirSignature` (équipement du lycée = professeur PAR DÉLÉGATION pré-cochée) ; consommé par la modale ET le générateur CERFA |
| `export-personne.js` | pur : assemble l'export RGPD des données d'UNE personne (lot E ①, `assemblerExportPersonne`) — accès/portabilité, SANS binaire ni journal ; recopié en littéral côté serveur ; `exporterDonneesPersonne` compose les getters existants dans les deux stores |
| `coffre-identites.js` | pur : règles du COFFRE DES IDENTITÉS (lot E2) — messages canoniques, AAD, pseudonymes « Élève AAAA-NN », éligibilité (élève désactivé), pseudonymisation/restauration bit à bit, `libelleIntervenant` (substitution par identifiant via la fiche vivante) ; le DemoStore SIMULE (enveloppes balisées `SIMULATION-COFFRE`, phrase d'exercice en mémoire de session seulement, jamais persistée) |
| `feu-tricolore.js` | pur : consolide alertes/officiel/chaîne en 7 domaines VERT/ORANGE/ROUGE (`collecterConformite(store)`) |
| `audit-guide.js` | pur : parcours d'audit en 9 étapes ordonnées (alertes par préfixe + faits de présence, `collecterAuditGuide(store)`) |
| `filtre-mouvements.js` | pur : filtres de la vue Mouvements (index cherchable sans accents, correspondance, options présentes) |
| `dossiers-fuite.js` | pur : dossiers de fuite reconstruits des contrôles (épisodes, OUVERTE/REPAREE/FERMEE). **P0-6 (22/07)** : clôture STRICTE J+1 après réparation (proxy des 24 h de fonctionnement, jour même réservé aux machines MOBILES — `estMachineMobile`, migration 27 `type_installation` ; **depuis P1-1, `estMachineMobile`→`equipement.mobileListe` : un MOBILE non LISTÉ, ou sans sous-type, n'en bénéficie plus**) ; échéance de suivi = 1 MOIS CIVIL (`ajouterUnMoisCivil`, écrêtage fin de mois) ; clôture tardive CONSIGNÉE (`clotureEnRetard`/`retardClotureJours`, jamais bloquée) ; contrôles nés d'un mouvement ANNULÉ exclus (fait dérivé). Miroirs stores : `estFuiteOuverte(controles, machineMobile)` + `controlesActifsDeLaMachine`/LEFT JOIN + `recalculerEffetsMachineApresAnnulation` (annulation d'un mouvement porteur de contrôle lié → effets machine recalculés, écart P0-7 §7(a) soldé) |
| `sentinelle.js` | pur : historisation temporelle des alertes (épisodes, acquittement) |
| `vie-bouteille.js` | pur : chronologie d'une bouteille (mouvements appariés) |
| `avoir-origine.js` | pur : avoir de fluide par machine d'origine dans une bouteille, DÉRIVÉ des mouvements (Σ récup − Σ réemploi ; VALIDE hors contre-écritures) — cycle matière CM-1 ; **CM-5 : les TRANSFERTS propagent les lots au prorata des soldes positifs (passe chronologique interne, clé date+numero croissants = celle de la chaîne de scellement ; excédent sans origine ; négatif ne voyage pas)** ; aucune migration. CM-2 : consommé par `getAlertes` (famille `alr-reemploi-`, IMPORTANT, avoir négatif = réintroduction au-delà du récupéré) des 2 stores — `api.js` en tient un miroir littéral ; préfixe rattaché au feu tricolore (domaine Bouteilles) + audit-guide. Bouteille NEUVE jamais concernée (fluide acheté ≠ réemploi). CM-3 : cohérence état↔type de la bouteille gardée dans createBouteille+updateBouteille des 2 stores (`verifierCoherenceEtatBouteille`, miroir littéral) — NEUVE={VIERGE,RECYCLE,REGENERE} acheté / RECUPERATION={RECUPERE,MELANGE,DECHET,DOUTEUX}, AUCUNE requalification interne (le régénéré s'ACHÈTE certifié) ; schéma (CHECK déjà ouvert), CERFA QB/QC et certificat fournisseur en PJ (entité BOUTEILLE, catégorie CERTIFICAT) déjà en place → aucune migration ; suite doublée `test-coherence-etat-bouteille.mjs`. CM-4 (surfaces, 22/07 — ⭐ règle Franck : surcharge de réemploi SIGNALÉE jamais BLOQUÉE, même en Officiel) : bandeau wizard étape 4 (zone dédiée, jamais dans les erreurs bloquantes), mention SYSTÈME au cadre 14 du CERFA (`PREFIXE_MENTION_REEMPLOI`, écartée de la correction élève), bloc « fluide d'origine machine » sur la fiche bouteille (`blocAvoirOrigine`, net négatif MONTRÉ), partition des états dans `bouteille-form` (`optionsEtatPour` exportée), option `categorieSeule` de `zonePiecesJointes` (zone certificat fournisseur dédiée, NEUVE seule) ; suite `test-bouteille-form.mjs` |

| `equipement.js` | pur : MODÈLE D'ÉQUIPEMENT (P1-1) — `detectionEffective` (E1 : allègement de fréquence dû seulement si détection vérifiée < 12 mois ; 4 motifs), `detectionObligatoire` (E2 : vrai au niveau HAUT — **interroge `evaluerControle`, aucun seuil recopié**), `exemptionControle` (**E3 : rend TOUJOURS non exempté** — aucune exemption hermétique codée, choix conservateur activable sans réécriture), `hermetiqueOpposable` (E4 : seuil d'aptitude 6 kg si scellé ET **étiqueté**), `mobileListe` (E5 : liste FERMÉE `SOUS_TYPES_MOBILES_ELIGIBLES`, AUTRE_MOBILE exclu), `verifierModeleEquipement` (garde de saisie), `echeanceVerificationDetection` (+12 mois civils). Miroir littéral CommonJS `server/equipement.js`, parité prouvée par `test-equipement-pur` ; comportement métier par `test-equipement` (doublée). Consommé par : le moteur de fréquence des 2 stores (détection EFFECTIVE), `getAlertes` (alr-detection-*), les 2 `cadreFicheOfficiel` (faits `intervenant.aptitude` P0-5 + `detectionObligatoireAbsente` cond. 17), `dossiers-fuite.estMachineMobile`, `machine-form`, `fiche-machine` |
| `declaration-annuelle.js` | pur : déclaration annuelle réglementaire (11 rubriques/fluide, arrêté 21/11/2025, P0-8) — `calculerDeclarationAnnuelle(annee, donnees)` → `{ annee, lignes, anomalies, complet }`. Rubriques 2-5 PAR TYPE de mouvement ; BSFF ventilé par ISSUE attestée (destruction = DESTRUCTION SEULE, BSFF ≠ destruction) ; rubrique 11 = photos N-1/N ventilées neuf/récup/déchet, repli stocks_initiaux + anomalie. Miroir serveur `server/declaration-annuelle.js`, consommé par `getDeclarationAnnuelle` des 2 stores. Captures : `attesterIssueBsff` (migration 28) + `createCession` (migration 29, décrémente la bouteille) ; réconciliation : la balance matière compte enfin les cessions (loop démo + vue migration 30) | miroir littéral à tenir des 2 côtés ; l'assemblage du sac (`getDeclarationAnnuelle`) doit rester identique demo/serveur |

## v8/js/ (le reste)

- `views/` : une vue par écran (routeur hash `#/vue` ; fiches paramétrées
  `#/m|b|cl|o|f/<code>`). `communs.js` = modale/toast/enteteVue/carteKpi.
  `rgpd.js` (lot E ③ + E2d) = notice d'information RGPD (art. 13/14) +
  SECTION OPÉRATIONNELLE du coffre des identités (compteur, candidats
  pré-cochés, les 5 gestes en modales, bandeau démo) ; entrée de menu
  « Protection des données » (`app.js` VUES). Badge « au coffre » dans
  `personnel.js`, verrou d'écran dans `personne-form.js`, substitution par
  identifiant dans `mouvements.js` (modale + index de recherche,
  `indexerMouvement` 3e param) et `documents/exports.js` (CSV).
- `modales/` : formulaires (piège historique : jamais de sélecteur global
  `.modale` — `modale()` retourne sa racine). `signatures-modal.js`
  (lot C C4) = parcours de double signature d'un BROUILLON (bouton
  « Signatures » de la vue Mouvements, les deux modes) + panneau partagé
  `remplirSimulationOfficielle` ; le store reste seul juge.
- `wizard/` : les 6 étapes du mouvement (~1800 l.) + signature canvas
  (`creerSignature(conteneur, libelle?)`, libellé par défaut inchangé).
  P7-d2 : carte « Contrôle d'étanchéité » (6ᵉ, interrupteur non
  périodique) = parcours « sec » — étapes 3-4 « Sans objet » SAUTÉES
  aller/retour, « Sans objet » retiré de l'étape 5, pesées null.
  C5 : choix du MODE à l'étape 6 (`etat.modeFiche`, Formation par défaut,
  Officiel si `peutPasserEnOfficiel().ok` et store non-démo) ; en OFFICIEL
  la finalisation s'arrête au BROUILLON (signatures d'abord) ; le mode
  d'une écriture déjà créée est FIGÉ ; reprise = mode conservé,
  rétrogradation signalée.
- `cerfa/` : `generateur.js` (72 champs, `calculerChampsCerfa` = vérité ;
  lot C C4 : inscrit les signatures RÉELLES valides — personne physique,
  qualité, date réelle, tracés — et `genererPdfFinalBase64` = PDF FINAL de
  la validation officielle, option `accepterSoumis` RÉSERVÉE à ce canal,
  SANS tolérance : deux signatures valides exigées, erreurs propagées),
  `correction.js` (correction copie élève — TOUJOURS les blocs de
  signature historiques, `sansSignaturesReelles`), `visualiseur.js` (PDF.js),
  `conserve.js` (lot C C3b : sert le PDF CONSERVÉ d'une fiche officielle
  figée — les DEUX portes, mouvement ET contrôle lié —, empreinte vérifiée
  contre `hashPdfFinal` scellé, jamais le générateur, jamais de repli).
- `documents/` : étiquettes QR, dossiers ZIP scellés SHA-256 (`dossier-commun.js`),
  `exports.js` (tous les CSV du dossier d'audit), `verificateur.js`
  (99-VERIFICATEUR.html embarqué), `plaque-fgas.js` (seuils tCO₂eq 5/50/500).
  C5 (`dossier-audit.js`) : fiche officielle scellée → PDF CONSERVÉ
  restitué (jamais régénéré), verdicts `02-PDF-CONSERVES.txt`, contrôle
  lié conservé sauté, TRANSFERT exclu de la boucle CERFA.
- **P1-1 (23/07) — modèle d'équipement** : module pur `data/equipement.js`
  + miroir `server/equipement.js` (voir la ligne dédiée). Migration 32
  (7 champs, backfill conservateur). `machine-form` : blocs « Nature de
  l'équipement » et « Détection de fuites » à affichage conditionnel (note
  en direct sur l'allègement) ; `fiche-machine` : « Motif de la fréquence »
  (une fréquence doit être explicable). Le moteur de fréquence des 2 stores
  consomme la détection EFFECTIVE (E1) ; 2 alertes `alr-detection-*` ;
  condition Officiel 17 `DETECTION_OBLIGATOIRE` **inerte tant que le verrou
  est fermé**. Dettes soldées : P0-5 (hermétique plus en dur) et P0-6
  (mobile LISTÉ, `estMachineMobile`→`mobileListe`). ⚠️ **Consigné, antérieur
  à P1-1** : `machine.statut` figé à EN_SERVICE si on rétrograde un mobile
  après une clôture immédiate (denormalisation non recalculée sur un simple
  update — à traiter avec le modèle de statut de P0-6).
- **P1-2 (23/07) — administration du référentiel des fluides** :
  `views/fluides.js` n'est plus en lecture seule (ajout / modification /
  désactivation, gestes réservés à REFERENT+ADMIN via
  `getUtilisateurCourant`, case « afficher les désactivés »)
  + `modales/fluide-form.js` (code verrouillé en modification, source du
  PRP exigée dès que le PRP bouge, impact en direct ; le store reste seul
  juge). Mutations `createFluide`/`updateFluide` des 2 stores,
  `ROLES_MUTATION` = REFERENT_ADMIN. `utils.js fluidesProposables` retire
  les fluides désactivés des sélecteurs machine et bouteille SAUF la
  valeur déjà enregistrée (le wizard ne liste pas les fluides).
  `exports.js` ajoute `referentiel-fluides.csv` au dossier scellé (14
  fichiers fixes). ⚠️ **Piège payé** : un export ANTÉRIEUR n'a pas la clé
  `actif` et l'import remplace la ligne entière → il ressuscitait un
  fluide désactivé ; l'import conserve désormais l'état courant quand la
  clé manque (une clé absente ne vaut pas décision — même règle que la
  fiche réglementaire).
- `core/` : `utils.js` (esc, fmtDate, nombreFr, hasherEcriture,
  fluidesProposables…), `zip.js`
  maison, `routeur.js`, `shim-dom-tests.mjs` (tests DOM sans navigateur).

## Pièges transverses (payés cher — ne pas re-payer)

1. **Vérif navigateur** : servir `v8/` sur un port JETABLE NEUF à chaque
   session (cache modules ES) ; JAMAIS le port 2011 ni `data/` réel.
2. **Ordre contractuel** : tri en JS des deux côtés, JAMAIS d'ORDER BY
   (collation BINARY ≠ localeCompare).
3. **Empreinte** : l'objet `controle` entre dans le hash — une clé à null
   en plus/en moins casse la chaîne au round-trip démo↔local.
4. **Docx/PDF** : ne jamais relire un binaire en utf8.
5. **`??` vs `||`** : champs de rôle → `|| null` (chaîne vide = null).
6. **Import** : triggers WORM retirés puis recréés DANS la transaction ;
   compléments de collections absentes À VIDE.
7. **Lot A / démarrage sans session** : `LocalStore.init()` TOLÈRE « Session
   requise » (le store se crée avant connexion) ; l'intégrité est re-vérifiée
   APRÈS connexion dans `reprendreDemarrageApresConnexion`. Ne pas remettre de
   lecture gatée « dure » dans `creerStore` — l'amorçage doit atteindre l'écran
   de connexion/bootstrap sans planter.
