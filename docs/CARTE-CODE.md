# CARTE DU CODE — inerWeb Fluide v8/v9

> **À lire AVANT toute exploration** (doctrine sobriété tokens, 14/07/2026).
> Elle remplace 90 % des grep/lectures. Mise à jour : une ligne par module
> ajouté/retiré, à CHAQUE incrément (comme le CHANGELOG).
>
> ⚠️ **Ce document décrit l'état COURANT** (dernière vérification des chiffres :
> 26/07/2026). Ce n'est pas un journal : aucune valeur périmée ne doit y rester.
> Les chiffres cités se re-mesurent par la commande indiquée à côté d'eux.

## Architecture en une phrase

Front vanilla ES modules sous `v8/` (démo navigateur OU client du serveur
local), serveur Node CommonJS sous `server/` (SQLite `node:sqlite`, port
2011) ; les DEUX implémentent le MÊME contrat `v8/js/data/contrat.js`
(**96 méthodes, `VERSION_CONTRAT` 13** au 26/07/2026) prouvé par
`test-contrat.mjs` joué contre chacune.

## Flux clés

- **Écriture opposable** : wizard → `creerMouvement` (BROUILLON) →
  `soumettreMouvement` → `validerMouvement` (effets stocks + contrôle lié +
  figeages PRP/outils + scellement hash chaîné) ; annulation UNIQUEMENT par
  `annulerParContreEcriture`. Statuts : BROUILLON/SOUMIS/VALIDE/ANNULE.
- **Choix du store** (front) : `v8/js/data/datastore.js` — DemoStore
  (mémoire+localStorage) par défaut, LocalStore (`local-store.js` →
  `transport-http.js` → `POST /api/:methode`) si le serveur répond.
- **Plans de lot** : `docs/PLAN-*.md`, un par lot (P0-5, P0-6, P0-8, P1-2,
  Q1-Q11, **B3-SIGNATURE**) — décisions du propriétaire, mesures et gates.
- **Outils hors filet** : `outils/` (paquet, captures, répétition générale,
  semis de catalogue). `outils/test-taille-signature.mjs`, lui, EST dans le
  filet : il publie la mesure qui a fait tomber la borne de 1 Ko des
  signatures et devient rouge si quelqu'un remet un seuil de taille.
- **Tests** : `node outils/lancer-tests.mjs --tout` = TOUT le filet
  (**121 exécutions, ~100 s** au 26/07/2026 ; sans `--tout`, arrêt au
  premier rouge). Suites `SUITES_DOUBLEES` jouées demo PUIS local.
  Toute nouvelle suite `test-*.mjs` est auto-découverte.
  `outils/test-references-suites.mjs` (revue B2, mineur 1) : **toute suite
  CITÉE dans un commentaire ou du code doit exister** — 5 pointeurs morts
  trouvés d'un coup (3 posés par B2, 2 antérieurs). Dans un dépôt dont la
  doctrine est la preuve citée, une référence morte fait croire à un filet
  qu'on n'a pas.

## server/ (CommonJS — les modules purs du front y sont DUPLIQUÉS en littéraux)

| Module | Rôle | Pièges |
|---|---|---|
| `serveur.js` | **L2 (25/07) : la liste blanche juge désormais le fichier RÉEL — extensions jamais servies (.db/.db-wal/.db-shm/.sqlite/.zip/.env/.key/.pem/.bak) et chemin PHYSIQUE résolu par `fs.realpath` avant envoi (une jonction Windows `mklink /J` posée dans `v8/` servait tout `server/` ; une base vive rangée sous `v8/data/` était téléchargeable sans session).** HTTP loopback ; LAN si `IWF_LAN=1` = **HTTPS OBLIGATOIRE** (IWF_TLS_CERT/KEY, TLS ≥ 1.2, HSTS, refus de démarrer sans certificat — P1-5, test-lan-https) ; routage `/api/:methode` ; **statique ALLOWLISTÉ (P2-4, 23/07) : `DOSSIERS_SERVIS` = v8, img + `FICHIERS_RACINE_SERVIS` = index/guide/manifest — tout le reste répond 404 (pas 403 : on ne confirme pas l'existence). Avant : liste noire, donc docs/, CHANGELOG, README, apps-script/ et le RAPPORT D'AUDIT étaient servis en 200 (prouvé en le tirant). Ne JAMAIS revenir à une liste noire : elle oublie ce qu'on ajoute ensuite. `test-distribution-statique`** | garde Host+Origin (CSRF/rebinding) obligatoire ; **lot A : TOUTE lecture exige une session (loopback compris), seuls ping + routes d'amorçage de routes-comptes passent sans** ; CSP servie en en-tête (`frame-ancestors 'none'`) |
| `api.js` (9 412 l. au 26/07) | LE dispatcher : un handler par méthode du contrat, `muter()` = transaction, `ROLES_MUTATION` ; **B1 (25/07) — « une règle, pas une porte » : DEUX filtres uniques traversant TOUTES les portes d'écriture des mêmes colonnes, au lieu d'une garde recopiée sur une seule. `garderQualificationMachine` (liste `CHAMPS_QUALIFICATION_MACHINE` = **13 champs** : 6 de qualification + `statut` + les 2 dates de contrôle + **`chargeNominaleKg` et la triplette de DÉTECTION, ajoutées par la revue** — la détection déclarée divise par DEUX la fréquence des contrôles, la charge nominale fait SORTIR du périmètre F-Gas ; conséquence assumée : la charge nominale étant obligatoire, CRÉER une fiche machine est un geste de responsable, et l'écran l'annonce avant d'ouvrir) sur `createMachine` ET `updateMachine` — la garde n'existait QUE dans update, et createMachine est OPERATEUR : un élève déclarait sa machine hermétique+étiquetée et faisait sauter le blocage d'aptitude en Officiel. **⭐ REVUE : `arreterMachine` / `demantelerMachine` passent à VALIDEUR — `statut` fermé aux deux portes s'obtenait quand même en DEUX appels par ces gestes dédiés (3ᵉ porte du même seuil). `remettreEnService` reste OPERATEUR à dessein : il RAMÈNE l'obligation.** `garderFichePersonne` (`CHAMPS_GOUVERNANCE_PERSONNE` = roleApp/actif + `CHAMPS_PREUVE_PERSONNE` = attestation/organisme/dates/catégories/activités) sur `createPersonne` ET `updatePersonne` — `actif` était dans la liste blanche d'update alors que `desactiverPersonne` est gardé VALIDEUR. **⭐ REVUE : un rôle applicatif ne se DÉDUIT que pour qui a le droit de l'ATTRIBUER — `referencePersonneNeuve()` vaut le moindre privilège et ne lit plus la charge utile (elle en déduisait ENSEIGNANT dès que le type n'était pas ÉLÈVE : la référence bougeait avec l'attaque). On ne refuse rien de plus, la fiche naît sans pouvoir.** ⚠️ Les deux filtres comparent des valeurs NORMALISÉES contre la fiche en place (ou contre les défauts d'une fiche neuve à la création) : renvoyer la fiche telle quelle ne déclenche RIEN, sans quoi l'écran devient mort pour l'élève. Aussi : `chargeActuelleNormalisee` + `verifierDatesMachine` appelés aux deux portes (refus MÉTIER, donc miroir DemoStore)** ; **L2 (25/07) : `exporterJSON` rejoint `ROLES_LECTURE_SENSIBLE` (VALIDEUR) — il rendait le journal nominatif et la config du coffre à un ÉLÈVE ; `importerJSON` refuse le ré-amorçage de chaîne sur un poste déjà scellé (borne MONOTONE `registre_scellees_max` dans `parametres`, hors registre), vérifie le témoin de tête du journal, refuse un mouvement/contrôle OFFICIEL tant que le verrou est fermé et toute transition RÉCUPÉRATION→ACHAT de bouteille** | sémantique = copie EXACTE du DemoStore ; rôle jamais lu du corps ; **lot E ① : `ROLES_LECTURE_SENSIBLE` (lectures gatées par rôle) consulté par `garderRole` après `ROLES_MUTATION` — `exporterDonneesPersonne` = VALIDEUR** |
| `export-personne.js` | miroir littéral de l'assemblage de l'export RGPD d'une personne (lot E ①) | parité prouvée par `test-export-personne.mjs` ; handler serveur = composition des getters existants + signatures brutes mappées ; personne AU COFFRE → signatures substituées par le pseudonyme |
| `coffre-identites.js` | miroir littéral des règles pures du COFFRE DES IDENTITÉS (lot E2) | parité prouvée par `test-coffre-identites.mjs` ; api.js porte les 6 gestes (REFERENT/ADMIN + poste local), le témoin GCM, l'archive préalable OBLIGATOIRE, la purge rattrapée au démarrage (`rejouerPurgeCoffre`), les verrous de fiche au coffre (updatePersonne/PJ/désactivation/habilitations/mentions) et le transport export/import du coffre (E2c : coffreConfig sel/témoin/kdf + compteurs + enveloppes base64, remplacement atomique, simulation rejetée, refus protecteur si fichier sans coffre sur poste au coffre) ; primitives crypto = `chiffrement.js` (enveloppes de champ autoportantes, scrypt N=131072) |
| `db.js` | ouverture PRAGMA coffre-fort, `journaliser()` SHA-256 CHAÎNÉ, transaction ré-entrante | `recursive_triggers=ON` VITAL (anti-REPLACE) ; **P1-6 : base vive REFUSÉE sous OneDrive/Drive/Dropbox** (`verifierEmplacementBase`, dérogation `IWF_AUTORISER_BASE_SYNCHRONISEE=1`, test-emplacement-base) |
| `migrations.js` | registre **2→36** (35 migrations, consécutives), transactionnel ; exporte `FICHE_REGLEMENTAIRE_FLUIDES` (table validée, consommée par la migration 21 ET l'import JSON d'api.js) | JAMAIS de DROP destructif ; trigger WORM à recréer si colonne mouvements ajoutée ; registre-commentaire en tête à tenir ; **24 (C5) = WORM pieces_jointes d'un mouvement figé — à recréer si la table est recréée (procédure migration 10, fait par la 26)** ; **25-26 (E2b) = tables du coffre des identités + entités de PJ élargies (personne/OUTIL, bug préexistant)** ; **27 (P0-6) = machines.type_installation FIXE/MOBILE** ; **28-30 (P0-8) = bsff.issue_traitement, table cessions, vue bilan_matiere RECRÉÉE (DROP+CREATE) pour compter les cessions (seul DROP VIEW du registre — non destructif de données)** ; **31 (P1-2) = fluides.actif (DEFAULT 1) — un fluide n'est jamais supprimé (clé étrangère de 8 tables, dont des écritures scellées), il est DÉSACTIVÉ** ; **32 (P1-1) = machines.hermetique_scelle/hermetique_etiquete/residentiel/sous_type_installation (liste FERMÉE des mobiles)/detection_verifiee_le/detection_prochaine_verif/detection_reference — backfill CONSERVATEUR (booléens 0, dates NULL : rien exempté, rien vérifié)** ; **33 (L4) = habilitations.remise_niveau_le/organisme (NULL = rien de présumé)** ; **34 (L3/R4) = machines.usage_thermique (liste FERMÉE froid/clim/PAC, NULL = régime le plus strict — dates d'interdiction du vierge PRP ≥ 2500)** ; **35 = table plaintes (report v7)** ; **36 (lot B2) = bsff.masse_bouteille_apres_kg — masse nette RESTANTE figée à l'émission du suivi, repère du rapprochement « la bouteille a-t-elle regagné du fluide depuis ? » ; NULL sur les suivis antérieurs = aucun repère, donc aucune alerte** |
| `schema.sql` | socle v1 SEUL (les évolutions = migrations) | ne jamais l'éditer pour une évolution |
| `mapping.js` | correspondance UNIQUE front(camel)↔SQL(snake), `CHAMPS_HASH_MOUVEMENT` = liste blanche du hasseur | toute colonne hors empreinte reste HORS de cette liste |
| `hash-mouvement.js` | clone EXACT du hasseur front — VERSIONNÉ (lot C, C2) : v1 (18 champs) FIGÉE À JAMAIS, v2 = +9 champs (PRP figé, CERFA, rôles, champs gelés) ; aides empreinteListeTriee / chaineCanoniqueSignature | ne jamais utiliser db.hashEcriture pour les mouvements ; QUATRE vérificateurs versionnés (api ×2 + démo + verification.js) ; empreintes CONNUES figées dans test-hash-mouvement |
| `blocage-officiel.js` | miroir littéral du moteur de blocage OFFICIEL (lot B) | **verrou REFERMÉ le 20/07 (T1, audit externe #2)** : `VERROU_LIVRAISON = true` ICI + côté ESM, nulle part ailleurs, NON configurable par l'env (rebasculer à `false` rouvre) ; ouvert le 19/07 (C5) puis refermé le temps des P0 ; api.js ajoute sauvegarde du poste + validateur de session (tous modes, 403) au cadre |
| `signatures-mouvement.js` | miroir littéral des signatures RÉELLES (lot C, C1) : déclarations figées + critères d'illisibilité | parité prouvée par test-signatures-mouvement ; ne jamais toucher un miroir sans l'autre ; **lot B3 (25/07) : l'image est DÉCODÉE par `png.js` (elle était reconnue à 8 octets) et le VIDE ABSOLU est refusé (`MSG_ZONE_VIERGE`) ; borne basse de 1 Ko RETIRÉE — aucun seuil d'encre** |
| `droit-intervention.js` | miroir littéral du MOTEUR d'aptitude de `habilitations.js` (P0-5) : `verifierDroitIntervention` + matrice/seuils/messages, `habilitationReconnue` (transition 2008 L4/Q3 : butoir de remise à niveau 12/03/2029 + cycle 7 ans, `plusAnnees`), `jetonsMentionsActives` | parité prouvée par test-droit-intervention (verdicts ET messages) ; consommé par le `cadreFicheOfficiel` d'api.js (fait `aptitude`) ; les constantes CRUD (REGIMES…) restent dans api.js |
| `dates.js` | miroir littéral de `v8/js/data/dates.js` (L2, 25/07) — « une date est une date » : format AAAA-MM-JJ ANCRÉ **et calendrier RÉEL** (aller-retour `Date.UTC`, seul moyen de refuser le 30 février) | parité prouvée par `test-dates.mjs` (38 vérifs, balayage des 366 jours de 2024) ; règle d'emploi : une date ABSENTE reste légitime (« pas d'échéance »), une date PRÉSENTE mais illisible n'est JAMAIS interprétée (défaut-refus). Consommé par `api.js` (CRUD habilitation/personne, contrôles, invariants d'import), `droit-intervention.js` et `equipement.js` |
| `png.js` | miroir littéral de `v8/js/data/png.js` (lot B3, 25/07) — lecture RÉELLE d'un PNG : IHDR, chaîne des chunks, **CRC-32 de chacun**, IDAT/IEND, puis décompression DEFLATE **écrite à la main** (aucune dépendance tierce) et dé-filtrage des lignes | parité prouvée par `test-png.mjs` (55 vérifs) ; `analyseEncre` répond ENCRE / VIDE / **INDETERMINABLE** — on ne conclut JAMAIS au vide sur un format qu'on ne sait pas relire (entrelacé, profondeur < 8, flux illisible, surface > 32 Mo) ; **`lireImagePng` = les deux questions en UN SEUL passage (revue du 26/07) — c'est CE point d'entrée qu'utilise `verifierImageSignature`, le fichier était décodé deux fois** |
| `declaration-annuelle.js` | miroir littéral du moteur PUR de la déclaration annuelle 11 rubriques (P0-8) : `calculerDeclarationAnnuelle(annee, donnees)` | parité prouvée par `test-declaration-annuelle` (sémantique + JSON.stringify ESM↔CJS) ; `api.js` l'appelle depuis `getDeclarationAnnuelle` (lit les tables via db.all, assemble le même sac que le DemoStore) ; agrégation 100 % JS des 2 côtés (pas de vue SQL) |
| `pdf-final.js` | miroir littéral du PDF FINAL conservé (lot C, C3a) : messages canoniques + contrôle %PDF/5 Mo + nom `CERFA-<numéro>.pdf` | parité prouvée par test-signatures-mouvement ; la conservation = `conserverPdfFinal` d'api.js (PJ système CERFA_FINAL, SANS bump de révision) ; C3b : témoins `.sha256`+`.manifeste.json` frères (`ecrireTemoinsPdfFinal`, best-effort hors transaction) + `verifierPdfFinalConserve` (pluralité dénoncée) + RÉGÉNÉRATION des témoins manquants au démarrage (`reecrireTemoinsPdfFinalManquants`, jamais d'écrasement — la restauration d'archive ne transporte pas les frères) ; C3c : asymétrie FERMÉE (ajouterPieceJointe refuse figé + catégorie réservée), l'import RECOMPTE hashPiecesJointes des v2 + garde « CERFA_FINAL hors canal système » ; C5 : trigger WORM pieces_jointes POSÉ (migration 24) + `verifierTousPdfFinalConserves` joué au démarrage par serveur.js (anomalie journalisée PDF_FINAL_ANOMALIE, best-effort par écriture) |
| `comptes.js` / `sessions.js` / `routes-comptes.js` | scrypt **N=2^17** (OWASP, P2-3)+NFC+leurre anti-timing, jetons hachés SHA-256, cookie HttpOnly | message d'échec UNIQUE ; session meurt si compte désactivé ; ancien profil N=2^15 accepté puis RE-HACHÉ à la connexion (journal `RENFORCEMENT_HASH_MOT_DE_PASSE`) ; chiffrement.js garde N=2^15 (archives existantes) |
| `sauvegarde.js` / `restauration.js` / `manifeste.js` / `verification.js` / `chiffrement.js` | coffre-fort : VACUUM INTO, restauration atomique, AES-256-GCM | jamais copier le .db à chaud ; phrase NFC ; rollback = reposer l'original ; ⚠️ verification.js hache les mouvements (4e vérificateur versionné v2 — l'oublier rendrait toute archive « invalide ») |
| `routes-sauvegarde.js` | les 6 routes « coffre-fort » (`sauvegarder`, `listerSauvegardes`, `restaurer`, `testerSauvegarde`, lire/définir les réglages), HORS contrat DataStore — le DemoStore n'a ni disque, ni VACUUM, ni ZIP | câblées dans `serveur.js` AVANT l'aiguillage `api.appeler`, MÊMES gardes réseau (CSRF / rebinding) + garde de rôle ADMIN/REFERENT (403 AVANT tout effet) ; les y remettre dans le contrat casserait `test-contrat` |
| `sauvegarde-auto.js` | sauvegarde AUTOMATIQUE (condition 6) : archive au démarrage si > 24 h + VÉRIFIÉE, snapshot débouncé après écriture scellée (crochet dans api.appeler) | best-effort ABSOLU (jamais bloquant) ; hors transaction ; réglages `sauvegarde_auto_*` |
| `scellement-externe.js` | témoin QUOTIDIEN de scellement (lot D) : têtes des chaînes + compteurs + versions dans `backups/scellement/`, chaîné entre jours, empreinte auto-vérifiable | best-effort ABSOLU ; toujours actif ; crochets démarrage + api.appeler ; ⚠️ tests : base jetable NICHÉE sous `<mkdtemp>/data/` sinon backups/ dérive sur Temp partagé |
| `borne-scellement.js` | **« ce poste a déjà scellé »** (L2, 25/07) — borne MONOTONE du nombre d'écritures scellées, qui ne DESCEND jamais ; c'est elle qui refuse le ré-amorçage de chaîne à l'import (« historique antérieur au scellement » forgé en retirant toutes les empreintes) | ⚠️ elle vit dans un fichier VOISIN de la base, PAS dedans : première version en table `parametres`, mise en défaut par la revue en la TIRANT (la restauration d'archive remplace la base, donc la borne). Une protection contre l'écrasement du registre ne peut pas vivre DANS le registre. Ne prétend rien contre qui a le disque : elle ferme le canal IMPORT/RESTAURATION |
| `creer-admin.js` | CLI bootstrap 1er ADMIN | aucun endpoint web équivalent |
| `harnais-contrat.mjs` | monte un LocalStore sur une base JETABLE + transport in-process qui sérialise VRAIMENT en JSON | c'est lui qui joue `test-contrat.mjs local` ; contexte figé `role:'REFERENT'` |
| `remise-filiere.js` | miroir littéral des règles pures de la REMISE EN FILIÈRE DÉCHETS (lot B2) : forme canonique du numéro de SUIVI INTERNE `SIF-AAAA-NNNN`, clé de comparaison (bords/espaces/casse), numérotation LOCALE (rang max + 1), invariant d'import (doublon), `ecartApresRemise` (re-inflation de bouteille après remise déclarée) | parité prouvée par `v8/js/data/test-remise-filiere-pur.mjs` (fonctions ET messages) ; consommé par `createBsff` (numérotation + unicité), `verifierInvariantsDonneesCandidat` (doublon à l'import) et `getAlertes` (`alr-remise-filiere-`) d'api.js |
| `parametres.js` | table clé/valeur (réglages du poste) | — |
| `zip-node.js` | ZIP « stored » côté serveur (coffre-fort) | confine les chemins (patron à reprendre) |

## v8/js/data/ (cœur pur + stores)

| Module | Rôle |
|---|---|
| `contrat.js` | LA vérité de surface : **96 méthodes** documentées, messages canoniques (`VERSION_CONTRAT` **13** depuis le lot B2 : `bordereauExterne` sur le suivi de remise en filière). Se recompte : `Object.keys(METHODES_CONTRAT).length` |
| `demo-store.js` (6 510 l. au 26/07) | implémentation mémoire complète (référence sémantique) |
| `local-store.js` | enveloppes 1-pour-1 vers l'API (ajouter CHAQUE nouvelle méthode ici) ; SEULE adaptation : le contenu binaire des PJ (base64 à l'aller, Blob au retour) |
| `contenu-pj.js` | pur : contenu binaire des pièces jointes (`versBase64`/`versBlob`) — JSON réduit un Blob à `{}`, d'où 9 octets de déchet enregistrés comme preuve avant le 14/07 ; **lot A : `signatureConcordeAvecMime` = contrôle des nombres magiques (PDF/PNG/JPEG/WebP), miroir littéral dans `api.js`, appelé par `ajouterPieceJointe` des deux côtés** |
| `datastore.js` | fabrique : choisit DemoStore ou LocalStore selon que le serveur répond |
| `demo-donnees.js` | le monde fictif de la Démo (données seules, aucune règle) |
| `transport-http.js` | transport `fetch` du LocalStore (`POST /api/:methode`, enveloppe `{ok,resultat}`) |
| `code-machine.js` | pur : code lisible SITE-FAMILLE-NUMÉRO (JR-CF-001), générateur/validation |
| `habilitations.js` | pur : moteur d'aptitude B2 (`verifierDroitIntervention`, matrice 2008+2025) — CONSEIL partout, et depuis P0-5 BLOCAGE en Officiel (fait `intervenant.aptitude` des deux `cadreFicheOfficiel` → condition 16 `APTITUDE_PORTEE` de blocage-officiel, charge NOMINALE machine, **hermétique branché sur la machine depuis P1-1 — seuil 6 kg si scellé ET étiqueté, `equipement.hermetiqueOpposable`**) ; frontières STRICTES (< 3 / < 6 kg régime 2025, < 2 kg cat. II/III 2008 SANS variante hermétique — L1a 24/07, limite PAR CATÉGORIE) ; `habilitationReconnue` (transition 2008 : reconnue jusqu'au 12/03/2029, puis remise à niveau enregistrée + cycle 7 ans — L4/Q3 24/07, migration 33 `remise_niveau_le`, garde de délivrance 2008 post-2026, alerte `alr-remise-niveau-`) ; contrôles P7 mappés ETANCHEITE ; **L2 (25/07) : la date de FIN passe par `estDateCalendaire` — une `dateFin` présente mais illisible ne se compare plus, elle REFUSE (défaut-refus) ; absente = pas d'échéance** ; miroir serveur = `server/droit-intervention.js` |
| `reglementation-fluides.js` | **P1-2 (23/07)** : porte AUSSI les règles d'ADMINISTRATION du référentiel — `verifierFicheFluide` (garde de saisie, messages canoniques, cohérence cadre 7 limitée aux contradictions manifestes), `codeFluideNormalise` (unicité insensible espaces/tirets/casse, casse saisie conservée), `impactDepuisPrp` (bornes F-Gas 150/750/2500 ; PRP absent OU NÉGATIF → null, jamais « FAIBLE » — rassurant à tort), listes `CLASSES_SECURITE`/`STATUTS_REGLEMENTAIRES`/`CATEGORIES_CADRE7`. Miroir littéral CommonJS dans `api.js`, parité prouvée par `test-referentiel-fluides` (doublée). ⏤ pur : MOTEUR RÉGLEMENTAIRE UNIQUE cadre 7 (`categorieCadre7` + `evaluerControle`) — source de vérité des seuils/fréquences F-Gas (règles A/B/C, `docs/TABLE-REGLEMENTAIRE-FLUIDES.md`), consommé par plaque-fgas/generateur/demo-store, copié en littéral côté serveur (`api.js` `frequenceControleMois`). Charge NOMINALE, HFC avant HFO ; fiche EXPLICITE par fluide prioritaire (`categorieCadre7`, migration 21, AUCUNE = hors périmètre) ; `dateIntervention` optionnelle (HFO purs contrôlés depuis le 11/03/2024 seulement) |
| `blocage-officiel.js` | pur : moteur de blocage du mode OFFICIEL (lot B) — `evaluerBlocagesOfficiel(cadre)` applique la liste de `docs/CONDITIONS-BLOCANTES-OFFICIEL.md` filtrée par moment (PASSAGE/SOUMISSION/VALIDATION), `VERROU_LIVRAISON` ferme le mode jusqu'aux lots C-D ; branché aux 3 moments des deux stores + `simulerValidationOfficielle` (contrat) ; conditions 14-15 (lot C) = faits tri-état signatureTechnicienValide/signatureDetenteurValide ; P7-c : `MSG_CONTROLE_DIRECT_OFFICIEL` = refus STRUCTUREL de `createControle` en OFFICIEL (FORMATION-only par nature, l'officiel = mouvement type CONTROLE) |
| `signatures-mouvement.js` | pur : signatures RÉELLES (lot C, C1) — déclarations signées EXACTES (`declarationSignature`, délégation dans la qualité ET la déclaration) + critères d'illisibilité (`verifierImageSignature`). **Lot B3 (25/07) : l'image est VRAIMENT DÉCODÉE (`png.js` : IHDR, chunks, CRC-32, IDAT, IEND — avant, 8 octets magiques suffisaient et un bloc de texte de 2 Ko passait, constat A04) et le VIDE ABSOLU est refusé (`MSG_ZONE_VIERGE`, image rigoureusement uniforme = case restée vierge). La borne basse de 1 Ko est RETIRÉE : les populations se chevauchent — mesure REPRODUCTIBLE, `node outils/test-taille-signature.mjs` (zone jamais touchée 3 879 o, griffure 3 893 o, blanche unie 5 506 o) — et aucun texte ne fixe de seuil d'encre — une griffure de deux pixels DOIT passer (décision du propriétaire). Reste le plafond de 1 Mo (mémoire), contrôlé AVANT décodage** ; consommé par signerMouvement des deux stores, recopié en littéral côté serveur |
| `pdf-final.js` | pur : PDF FINAL conservé (lot C, C3a) — messages canoniques de refus + `verifierOctetsPdfFinal` (%PDF, 5 Mo) + `nomFichierPdfFinal` ; C5 : `pdfFinalAttendu(type)` = exemption TRANSFERT (jamais de CERFA, IM-12 — PDF fourni refusé) ; consommé par validerMouvement des deux stores (3e param `pdfFinalBase64`, OBLIGATOIRE en OFFICIEL hors transfert, refusé en FORMATION), recopié en littéral côté serveur |
| `parcours-signature.js` | pur : décisions de l'écran de double signature (lot C, C4) — `etatParcoursSignatures` (état par rôle, signature retenue, prêt pour soumission) + `preremplirSignature` (équipement du lycée = professeur PAR DÉLÉGATION pré-cochée) ; consommé par la modale ET le générateur CERFA. **Revue du 26/07 : QUATRE états, plus trois — `IMAGE_ILLISIBLE` s'ajoute à ABSENTE/VALIDE/PERIMEE. Depuis que `valide` intègre la recevabilité de l'image, tout « valide !== true » était annoncé PERIMEE, c'est-à-dire « la fiche a été modifiée après la signature » : FAUX quand la fiche n'a pas bougé, et ce motif faux entrait dans la colonne État de `signatures.csv`, au dossier SCELLÉ. Le champ `imageRecevable` de `getSignaturesMouvement` (les DEUX magasins) porte la cause ; `imageRecevable === undefined` = comportement d'avant (ce champ NOMME, il ne refuse pas — le refus reste dans `valide`, et là seulement). Les illisibles sont écartées d'abord, comme le fait `etatSignatureReelle` du moteur : l'écran ne dit jamais autre chose que le moteur.** |
| `export-personne.js` | pur : assemble l'export RGPD des données d'UNE personne (lot E ①, `assemblerExportPersonne`) — accès/portabilité, SANS binaire ni journal ; recopié en littéral côté serveur ; `exporterDonneesPersonne` compose les getters existants dans les deux stores |
| `coffre-identites.js` | pur : règles du COFFRE DES IDENTITÉS (lot E2) — messages canoniques, AAD, pseudonymes « Élève AAAA-NN », éligibilité (élève désactivé), pseudonymisation/restauration bit à bit, `libelleIntervenant` (substitution par identifiant via la fiche vivante) ; le DemoStore SIMULE (enveloppes balisées `SIMULATION-COFFRE`, phrase d'exercice en mémoire de session seulement, jamais persistée) |
| `dates.js` | pur : **« une date est une date » (L2, 25/07)** — `estDateCalendaire` (format ANCRÉ + calendrier RÉEL par aller-retour `Date.UTC`), `estDateCalendaireOuVide` (absente = donnée légitime), `estDateFuture`, `messageDateInvalide`. Racine commune à 8 attaques tirées : `'31/12/2020'` déclarait valide une attestation périmée (comparaison de chaînes), `'2028-99-99'` divisait par deux la fréquence des contrôles. Miroir `server/dates.js`, parité prouvée par `test-dates.mjs` |
| `png.js` | pur : **lecture RÉELLE d'une image PNG (lot B3, 25/07)** — `verifierStructurePng` (en-tête, parcours des chunks, CRC-32 de chacun, IHDR cohérent, IDAT présent, IEND final, rien après) et `analyseEncre` → `ENCRE` / `VIDE` / `INDETERMINABLE`. Décompression zlib/DEFLATE (RFC 1950/1951) et dé-filtrage des 5 filtres PNG écrits À LA MAIN : le dépôt n'a aucune dépendance tierce et n'en prend pas pour cela. Plafond DÉFENSIF de surface (32 Mo) contre la bombe de décompression. Aucun seuil de densité, aucun pourcentage : la frontière est « rien du tout » (image rigoureusement uniforme) contre « quelque chose ». **`lireImagePng(octets)` rend `{ structure, encre }` en UN SEUL décodage — le point d'entrée du chemin qui juge les signatures ; il ne reçoit AUCUNE structure de l'appelant (on ne peut pas lui mentir).** Miroir `server/png.js`, parité prouvée par `server/test-png.mjs` (55 vérifs, sections 2-4 posées aux DEUX modules) |
| `feu-tricolore.js` | pur : consolide alertes/officiel/chaîne en 7 domaines VERT/ORANGE/ROUGE (`collecterConformite(store)`) |
| `audit-guide.js` | pur : parcours d'audit en 9 étapes ordonnées (alertes par préfixe + faits de présence, `collecterAuditGuide(store)`) |
| `filtre-mouvements.js` | pur : filtres de la vue Mouvements (index cherchable sans accents, correspondance, options présentes) |
| `dossiers-fuite.js` | pur : dossiers de fuite reconstruits des contrôles (épisodes, OUVERTE/REPAREE/FERMEE). **P0-6 (22/07)** : clôture STRICTE J+1 après réparation (proxy des 24 h de fonctionnement, jour même réservé aux machines MOBILES — `estMachineMobile`, migration 27 `type_installation` ; **depuis P1-1, `estMachineMobile`→`equipement.mobileListe` : un MOBILE non LISTÉ, ou sans sous-type, n'en bénéficie plus**) ; échéance de suivi = 1 MOIS CIVIL (`ajouterUnMoisCivil`, écrêtage fin de mois) ; clôture tardive CONSIGNÉE (`clotureEnRetard`/`retardClotureJours`, jamais bloquée) ; contrôles nés d'un mouvement ANNULÉ exclus (fait dérivé). Miroirs stores : `estFuiteOuverte(controles, machineMobile)` + `controlesActifsDeLaMachine`/LEFT JOIN + `recalculerEffetsMachineApresAnnulation` (annulation d'un mouvement porteur de contrôle lié → effets machine recalculés, écart P0-7 §7(a) soldé) |
| `sentinelle.js` | pur : historisation temporelle des alertes (épisodes, acquittement) |
| `vie-bouteille.js` | pur : chronologie d'une bouteille (mouvements appariés) |
| `macaron-controle.js` | pur : statut de contrôle d'une machine pour le MACARON au scan du QR (report v7 repensé, `statutMacaron`) — ROUGE fuite non résolue · GRIS hors périmètre F-Gas · ORANGE échéance dépassée/jamais contrôlé (jamais un bleu conforme mensonger) · BLEU conforme + date. Pur front, consommé par fiche-machine ; test-macaron-controle |
| `remise-filiere.js` | pur : **REMISE EN FILIÈRE DÉCHETS (lot B2, constat A07)** — l'objet interne ne s'appelle plus comme le document réglementaire qu'il n'est pas. Porte le vocabulaire (`LIBELLE_SUIVI` « Suivi interne de remise en filière »), la **mention permanente** `MENTION_BORDEREAU_OFFICIEL` (aucune date ni référence d'arrêté : le fait réglementaire précis relève du propriétaire), le libellé du champ du bordereau RÉEL, la forme canonique du numéro interne `SIF-AAAA-NNNN` + unicité (casse et espaces compris), la numérotation LOCALE sans réseau, l'invariant d'import (doublon refusé, forme NON exigée pour ne pas rejeter un registre antérieur) et `ecartApresRemise` (bouteille regarnie après une remise déclarée — gain expliqué par les écritures VALIDE postérieures, tolérance 10 g). **Revue B2 : TOUS les repères sont éprouvés (un suivi bidon de 0,001 kg éteignait l'alerte d'un clic), l'ordre se lit à la DATE seule — jamais au numéro — et un TRANSFERT entrant est stocké POSITIF : lire le seul signe accusait par écrit une écriture légitime. ⭐ Vérification finale : la RACINE était la convention de DATE, pas le seul signe — `contributionRetenue` la porte désormais SEULE, au même rang pour les remises comme pour les mouvements (antérieure = déjà dans le repère fige à l'INSTANT de la remise ; postérieure = comptée entière ; **MÊME JOUR = on ne retient que ce qui EXPLIQUE le gain, jamais ce qui l'aggrave**). Une sortie validée le jour de la remise était comptée deux fois et accusée par écrit. Porte aussi `MENTION_PIECE_NON_PROBANTE` (le logiciel COMPTE les pièces, il ne les lit pas — mention permanente sur l'écran Déchets, la modale d'attestation et la légende du bilan).** Miroir littéral `server/remise-filiere.js`, parité prouvée par `test-remise-filiere-pur` ; comportement métier par `test-remise-filiere` (doublée) et surfaces par `v8/js/views/test-dechets-libelles.mjs` |
| `plaintes.js` | pur : garde de saisie du REGISTRE DES PLAINTES (report v7, `verifierPlainte` : format + normalisation, états RECUE/EN_COURS/TRAITEE) ; miroir littéral dans `api.js`, existence du client vérifiée par le store ; migration 35, contrat v12. CRUD getPlaintes/createPlainte/updatePlainte des 2 stores, vue+modale+menu, export/import ; test-plaintes doublée |
| `avoir-origine.js` | pur : avoir de fluide par machine d'origine dans une bouteille, DÉRIVÉ des mouvements (Σ récup − Σ réemploi ; VALIDE hors contre-écritures) — cycle matière CM-1 ; **CM-5 : les TRANSFERTS propagent les lots au prorata des soldes positifs (passe chronologique interne, clé date+numero croissants = celle de la chaîne de scellement ; excédent sans origine ; négatif ne voyage pas)** ; aucune migration. CM-2 : consommé par `getAlertes` (famille `alr-reemploi-`, IMPORTANT, avoir négatif = réintroduction au-delà du récupéré) des 2 stores — `api.js` en tient un miroir littéral ; préfixe rattaché au feu tricolore (domaine Bouteilles) + audit-guide. Bouteille NEUVE jamais concernée (fluide acheté ≠ réemploi). CM-3 : cohérence état↔type de la bouteille gardée dans createBouteille+updateBouteille des 2 stores (`verifierCoherenceEtatBouteille`, miroir littéral) — NEUVE={VIERGE,RECYCLE,REGENERE} acheté / RECUPERATION={RECUPERE,MELANGE,DECHET,DOUTEUX}, AUCUNE requalification interne (le régénéré s'ACHÈTE certifié) ; schéma (CHECK déjà ouvert), CERFA QB/QC et certificat fournisseur en PJ (entité BOUTEILLE, catégorie CERTIFICAT) déjà en place → aucune migration ; suite doublée `test-coherence-etat-bouteille.mjs`. CM-4 (surfaces, 22/07 — ⭐ règle Franck : surcharge de réemploi SIGNALÉE jamais BLOQUÉE, même en Officiel) : bandeau wizard étape 4 (zone dédiée, jamais dans les erreurs bloquantes), mention SYSTÈME au cadre 14 du CERFA (`PREFIXE_MENTION_REEMPLOI`, écartée de la correction élève), bloc « fluide d'origine machine » sur la fiche bouteille (`blocAvoirOrigine`, net négatif MONTRÉ), partition des états dans `bouteille-form` (`optionsEtatPour` exportée), option `categorieSeule` de `zonePiecesJointes` (zone certificat fournisseur dédiée, NEUVE seule) ; suite `test-bouteille-form.mjs` |
| `equipement.js` | pur : MODÈLE D'ÉQUIPEMENT (P1-1) — `detectionEffective` (E1 : allègement de fréquence dû seulement si détection vérifiée < 12 mois ; 4 motifs), `detectionObligatoire` (E2 : vrai au niveau HAUT — **interroge `evaluerControle`, aucun seuil recopié**), `exemptionControle` (**E3(b)/L5 24/07 : le calcul est CODÉ (`calculerExemption`, 3 seuils stricts Q6, cas R2 chiffré) derrière `EXEMPTION_HERMETIQUE_ACTIVE = false` — fermé jusqu'au visa T3, geste d'activation consigné au PLAN-LOTS §L5**), `hermetiqueOpposable` (E4 : seuil d'aptitude 6 kg si scellé ET **étiqueté**), `mobileListe` (E5 : liste FERMÉE `SOUS_TYPES_MOBILES_ELIGIBLES`, AUTRE_MOBILE exclu), `verifierModeleEquipement` (garde de saisie), `echeanceVerificationDetection` (+12 mois civils). **L2 (25/07) : la date de vérification exige le calendrier RÉEL (regex enfin ANCRÉE) et une date FUTURE ne vaut plus vérification — défense en profondeur dans `detectionEffective`, pour le cas où la valeur entre par l'import.** Miroir littéral CommonJS `server/equipement.js`, parité prouvée par `test-equipement-pur` ; comportement métier par `test-equipement` (doublée). Consommé par : le moteur de fréquence des 2 stores (détection EFFECTIVE), `getAlertes` (alr-detection-*), les 2 `cadreFicheOfficiel` (faits `intervenant.aptitude` P0-5 + `detectionObligatoireAbsente` cond. 17), `dossiers-fuite.estMachineMobile`, `machine-form`, `fiche-machine` |
| `declaration-annuelle.js` | pur : déclaration annuelle réglementaire (11 rubriques/fluide, arrêté 21/11/2025, P0-8) — `calculerDeclarationAnnuelle(annee, donnees)` → `{ annee, lignes, anomalies, complet }`. Rubriques 2-5 PAR TYPE de mouvement ; BSFF ventilé par ISSUE attestée (destruction = DESTRUCTION SEULE, BSFF ≠ destruction) ; rubrique 11 = photos N-1/N ventilées neuf/récup/déchet, repli stocks_initiaux + anomalie. Miroir serveur `server/declaration-annuelle.js`, consommé par `getDeclarationAnnuelle` des 2 stores. **Lot B2, CORRIGÉ après revue (bloquant) : une pièce manquante ne fait JAMAIS disparaître une masse.** La première version sortait des rubriques 8 et 9 toute issue déclarée sans pièce — 5,5 kg réellement détruits quittaient la déclaration faite à l'autorité (SOUS-DÉCLARATION), sur une règle probatoire nouvelle jamais soumise au propriétaire (règle d'or 6). ⚠ NE PAS LA REMETTRE : *le doute retire l'ALLÈGEMENT, jamais l'OBLIGATION, et jamais une masse.* État courant : la masse reste dans SA rubrique ; l'absence TOTALE de pièce jointe lève l'anomalie `BSFF_ISSUE_SANS_PIECE` (≠ `BSFF_SANS_ISSUE` : « déclaré, pièce manquante » ≠ « rien de déclaré ») et `remisIssueSansPieceKg` est un COMPTEUR D'ANOMALIE, jamais un poste de masse. Le contrôle s'arrête à la PRÉSENCE d'une pièce (une photo l'éteint, tiré) : les écrans le disent par `MENTION_PIECE_NON_PROBANTE`. Les deux stores passent les MÉTADONNÉES des PJ, jamais le binaire. Captures : `attesterIssueBsff` (migration 28) + `createCession` (migration 29, décrémente la bouteille) ; réconciliation : la balance matière compte enfin les cessions (loop démo + vue migration 30). ⚠️ Miroir littéral à tenir des 2 côtés ; l'assemblage du sac (`getDeclarationAnnuelle`) doit rester identique demo/serveur |

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
  `.modale` — `modale()` retourne sa racine). **B1 (25/07) : `machine-form.js`
  (bloc « Nature de l'équipement », type/sous-type d'installation, usage
  thermique) et `personne-form.js` (rôle applicatif + preuves d'aptitude)
  suivent la règle du store — blocs AFFICHÉS mais VERROUILLÉS hors
  REFERENT/ENSEIGNANT/ADMIN, avec une note qui DIT pourquoi. Patron de
  `views/fluides.js` (`getUtilisateurCourant`). ⚠️ La charge utile OMET les
  champs verrouillés (`filtrerQualification` / `filtrerFichePersonne`) : y
  remettre leur valeur par défaut ferait voir un changement au store et
  vaudrait le 403 qu'on évite. Listes d'écran = SOUS-ENSEMBLES assumés des
  listes serveur (`statut` et les dates de contrôle, `actif`, ne sont portés
  par aucun de ces formulaires). Sans ce volet, la fermeture serveur rendait
  l'écran MORT pour l'élève — piège déjà payé par la revue L2.
  ⭐ REVUE : une note ne vaut que si elle est VUE — celle de
  `personne-form` vivait dans `#pf-bloc-attestation`, masqué pour une fiche
  d'ÉLÈVE (sélecteur de rôle grisé sans un mot) ; celle du type
  d'installation était deux blocs plus bas. Chaque note est désormais dans
  le bloc du champ qu'elle explique, hors de tout bloc conditionnel. La
  CRÉATION d'une machine est annoncée fermée AVANT l'ouverture de la modale
  (la charge nominale, réservée, y est obligatoire).
  `test-formulaires-reserves.mjs`.** `signatures-modal.js`
  (lot C C4) = parcours de double signature d'un BROUILLON (bouton
  « Signatures » de la vue Mouvements, les deux modes) + panneau partagé
  `remplirSimulationOfficielle` ; le store reste seul juge.
- `wizard/` : les 6 étapes du mouvement (`wizard.js`, 2 203 l. au 26/07) + signature canvas
  (`creerSignature(conteneur, libelle?)`, libellé par défaut inchangé).
  **Lot B3 (25/07) : le canvas n'exporte QUE le tracé** — le fond blanc
  et le repère de ligne de base sont passés en DÉCOR CSS derrière lui
  (`.zone-signature__cadre::before`), sans quoi une case jamais dessinée
  produisait un PNG « non vide » qui passait le refus du vide absolu ;
  preuve tirée par `test-signature-canvas.mjs` (contexte 2D
  ENREGISTREUR : à l'ouverture et après « Effacer », zéro opération de
  peinture).
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
  `exports.js` (tous les CSV du dossier d'audit ; **lot B3 25/07 :
  `signatures.csv` CONDITIONNEL — les signatures de l'année AVEC leur
  TÉMOIN DE SESSION, personne résolue par la fiche VIVANTE donc
  pseudonyme si elle est au coffre ; aucun verdict, aucune comparaison
  de sessions — décision du propriétaire ; revue du 26/07 : colonne
  « État » à TROIS valeurs (valide / périmée / image illisible) —
  « périmée » NOMME une cause, l'employer pour une image qu'on ne sait
  pas relire écrivait une cause FAUSSE dans une archive scellée**),
  `verificateur.js`
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
  maison, `routeur.js`, `icones.js`, `shim-dom-tests.mjs` (tests DOM sans navigateur).
- `composants/` : morceaux d'écran réutilisés par plusieurs vues —
  `pieces-jointes.js` (`zonePiecesJointes`, option `categorieSeule`) et
  `conseil-intervenant.js` (le CONSEIL d'aptitude, partout ; le BLOCAGE, lui,
  n'existe qu'en Officiel et vient du store).
- `lib/` : **les seuls fichiers du dépôt que nous n'avons pas écrits** — 4 fichiers
  tiers (PDF.js 4.10.38 ×2, pdf-lib, qrcodejs), plus `qrcode.js` qui est de NOUS
  (38 l., adaptateur qui lit `window.QRCode`). Licences réelles relues fichier par
  fichier dans `LICENCES-TIERCES.md`. ⚠️ `outils/paquet-audit.mjs` écarte le
  **dossier entier** (`DOSSIERS_TIERS`) et le nomme au sommaire : notre adaptateur
  part donc avec, c'est assumé et c'est écrit.

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
