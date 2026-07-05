# Changelog inerWeb Fluide

## [8.0.0-dev] - 2026-07-02 — Ouverture du chantier v8 « Registre opposable »

### 🏷️ V9.1 — Fiche machine vivante : accès par code, étiquette QR, mouvement pré-réglé (05/07)
Accéder à une machine par son identifiant public, avec une fiche complète, une étiquette QR
imprimable et un mouvement pré-rempli depuis cette fiche.
- **Décisions (arrêtées)** : `code_public` opaque base32 Crockford 7 caractères (sans I/L/O/U),
  généré à la création, JAMAIS modifiable ; recherche par filtrage `getMachines()` côté vue
  (AUCUNE méthode ajoutée au contrat, toujours **64 méthodes / 187 vérifications**) ; le QR
  encode un chemin relatif `#/m/<code_public>` (jamais d'URL absolue, indépendant de l'IP —
  l'URL LAN absolue attendra §16.6) ; scan caméra tablette DIFFÉRÉ (dépend du matériel, non
  testable ici).
- **`code_public`** généré sur les deux stores : `demo-store.js` et `server/api.js:createMachine`
  (via `codePublicUnique`, retry sur collision, index UNIQUE) ; immuable (`updateMachine` ne le
  liste pas) ; backfill des lignes existantes (migration 6 `backfill_code_public_machines` côté
  SQLite + normalisation à l'init du DemoStore) ; générateurs base32 dans
  `v8/js/core/utils.js`, `server/db.js`, `server/migrations.js` (3 implémentations séparées
  assumées, comme `genId`/`generateId`) ; `mapping.js` expose `codePublic`.
- **Route paramétrée** : `v8/js/core/routeur.js` (`lireHash()` renvoie `{id, param}`, compat
  totale des routes existantes) ; `v8/js/app.js` aiguille `id==='m'` vers
  `v8/js/views/fiche-machine.js` (hors sidebar, aucune entrée de navigation) ; bouton
  « Ouvrir la fiche » ajouté aux cartes du Parc (`machines.js`).
- **Fiche 5 blocs** (`fiche-machine.js`) : (1) identité 4 indicateurs (fluide, charge + barre,
  tCO₂ via `teqCO2`, prochaine échéance + statut), (2) actions (nouveau mouvement pré-réglé,
  contrôle, plaque F-Gas, CERFA, étiquette QR), (3) données techniques repliables `<details>`
  (valeurs nulles masquées), (4) alertes de la machine, (5) historique en onglets
  (mouvements / contrôles / documents via `zonePiecesJointes`) ; état vide « Machine
  introuvable » pour un code inexistant.
- **Wizard pré-réglé** (`wizard.js`) : `ouvrirWizard(ctx, {machineId, retour})` saute l'étape 2
  (choix machine) quand `machineId` est fourni (hors transfert) et revient sur
  `#/m/<code>` après finalisation ; parcours normal (sans `machineId`) inchangé.
- **Étiquette QR hors ligne** : lib davidshimjs/qrcodejs vendored copiée en
  `v8/js/lib/qrcode-vendor.js`, chargée par un `<script>` classique dans `v8/index.html`
  (autorisé par la CSP `script-src 'self'`) ; `v8/js/lib/qrcode.js` expose `obtenirQRCode()` =
  `window.QRCode` ; `v8/js/documents/etiquette-machine.js` : modale d'aperçu 50×70 mm (code
  M{n} + `code_public` + QR encodant `#/m/<code_public>`) + bascule planche A4 (3×3),
  impression navigateur.
- **Revue adversariale** (2 lentilles : `code_public` / routeur+fiche) : 0 constat.
- **Bug trouvé au navigateur ET corrigé dans le même incrément** : l'étiquette QR ne se rendait
  pas — l'emballage « paresseux » de la lib QR en module ES cassait son exécution
  (`Cannot read properties of undefined (reading '_android')`, la lib exige un contexte
  global) ; les tests le masquaient via un repli `<table>`. Corrigé par chargement en
  `<script>` classique (la lib tourne dans son contexte global d'origine) ; test de
  l'étiquette durci (ne s'appuie plus sur le repli). C'est précisément ce que le contrôle
  navigateur devait attraper.
- Tests (tous verts) : **`test-contrat.mjs` local ET demo = 187/0** (183 + 4 nouveaux : format
  Crockford, unicité, immutabilité, lot de 15) ; `test-routeur.mjs` 12/0 ; `test-wizard.mjs`
  7/0 ; `test-etiquette-machine.mjs` 15/0 ; `test-migrations.mjs` 64/0 ; `test-mapping.mjs`
  141/0 ; `test-chargement.mjs` OK (fiche-machine incluse) ; régression E5
  `test-routes-comptes` 30/0 ; toutes les autres suites du dépôt vertes.
- **Vérifié navigateur** (serveur réel Mode Local port 2011, base jetable) : machine créée en
  SQLite → `code_public` « TE9WHYH » (7 caractères Crockford) ; fiche `#/m/TE9WHYH` affiche
  les 5 blocs, charge « 2,50 / 2,50 kg », données techniques complètes, ZÉRO emoji ; étiquette
  QR rend un vrai `<canvas>`+`<img>` non vide, planche A4 = 9 QR ; « Nouveau mouvement » depuis
  la fiche saute l'étape 2 (Machine) et atterrit sur l'étape 3 (Bouteille) avec le fluide R-32
  déjà connu.
- ⚠️ **Point ouvert (non corrigé ici)** : `getUtilisateurCourant()` (`server/api.js:691`) est
  resté le stub d'avant E5 — il renvoie « le premier REFERENT du personnel » (et lève si le
  personnel est vide) au lieu de l'utilisateur réellement authentifié par sa session E5.
  Conséquence : sur une base fraîche (admin créé en CLI, personnel vide), le wizard ne peut
  pas s'ouvrir. À recâbler sur la session (finition E5), indépendant de V9.1.

### 🔒 SÉCURITÉ (correctif immédiat)
- **Clés API retirées du code** (`Code_API_v7.1.0.gs` + `apps-script/Code.gs`) : les 3 clés
  READ/WRITE/ADMIN étaient en clair dans le dépôt public. Lecture désormais exclusive depuis
  les Script Properties (`getApiKey_()`), fonction `setClesAPI_temp()` supprimée.
- ⚠️ **Révocation à faire côté Apps Script** (les anciennes clés restent valides tant que
  `genererClesAPI()` n'a pas été exécutée puis le script redéployé) : procédure dans `SECURITE.md`.

### 🔑 V9-E5 — Comptes, rôles, sessions : fin du raccourci loopback=REFERENT (05/07)
Le raccourci provisoire d'E3 (loopback = REFERENT) est remplacé par un vrai contrôle d'accès.
- **Décisions (Franck)** : 4 rôles ADMIN/REFERENT/ENSEIGNANT/ELEVE (TECHNICIEN reporté V10) ;
  restauration du coffre = ADMIN + REFERENT (les 4 routes coffre inchangées) ; bootstrap par
  commande CLI uniquement (aucun endpoint web, aucun compte par défaut, aucune inscription
  libre) ; lectures ouvertes en loopback sans session (confort mono-poste), toute MUTATION
  exige une session, et sur le LAN une session est exigée même en lecture.
- **Migration 5** (`server/migrations.js`) : `echecs_consecutifs`/`verrouille_jusqua` sur
  `utilisateurs_app` + table `sessions` (jeton = empreinte SHA-256, `utilisateur_id`, `role`
  figé, `cree_le`, `expire_le`, `ip`, `revoque`, index sur `utilisateur_id`). `mapping.js` :
  `sessions` déclarée non mappée au contrat.
- **`server/comptes.js`** : hachage scrypt + sel 16 o + NFC (mêmes paramètres N=32768/r=8/p=1
  que `chiffrement.js`), vérification en `crypto.timingSafeEqual`, verrouillage par compte
  (verrou 15 min au 5ᵉ échec, remise à zéro sur succès).
- **`server/sessions.js`** : `creerSession` (jeton clair `randomBytes(32)` base64url, seule
  l'empreinte SHA-256 va en base, expire +8 h), `verifierSession` (timing-safe, expiration
  vérifiée à chaque appel, purge paresseuse, REFUSE si le compte est `actif=0`),
  `revoquerSession`, `revoquerToutesLesSessions(utilisateurId)`, `purgerSessionsObsoletes()`
  (branchée au démarrage).
- **`server/routes-comptes.js`** : `POST /api/connexion` (message d'échec UNIQUE, verrou avant
  vérification du mot de passe, cookie `iwf_session` HttpOnly ; SameSite=Strict ; Path=/ ;
  Max-Age=28800 ; Secure si TLS ; jeton clair jamais renvoyé dans le corps),
  `POST /api/deconnexion` (révoque la session du cookie entrant, idempotente),
  `POST /api/creerCompte` (GARDÉE ADMIN, unicité du login, longueur minimale du mot de passe
  selon le rôle, journalise CREATION_COMPTE).
- **`server/serveur.js`** : `contexteDeLaConnexion` lit le cookie `iwf_session` →
  `sessions.verifierSession` (le rôle vient TOUJOURS de la session serveur, jamais du corps) ;
  garde « lecture hors loopback sans session refusée » ; garde CSRF/anti-rebinding
  (`refusReseau`, Host+Origin) conservée ; écoute LAN conditionnée (`IWF_LAN=1` +
  `IWF_HOTE_LAN=<ip>`) avec extension des hôtes/origines autorisés à `<ip>:<port>`.
  **`server/api.js`** : `importerJSON` passe de VALIDEUR à REFERENT+ADMIN (les autres méthodes
  VALIDEUR inchangées). **`server/creer-admin.js`** : CLI de bootstrap du 1er ADMIN (saisie
  masquée si TTY, refuse un 2e ADMIN, journalise BOOTSTRAP_ADMIN).
- **Front** : `v8/js/views/connexion.js` (écran sobre, charte claire, zéro emoji),
  `v8/js/app.js` (montage hors routeur, pied de session identité+rôle+Déconnexion en Mode
  Local), `v8/js/data/transport-http.js` (`credentials:'same-origin'` + évènement
  `iwf:session-requise` sur 403 sans rôle), `v8/js/core/icones.js`, `v8/css/composants.css`.
- **Revue adversariale du cœur (3 lentilles : forgeage de rôle / crypto-timing /
  CSRF-atomicité)** : 1 constat IMPORTANT corrigé — oracle de timing scrypt à la connexion (un
  login inexistant renvoyait sans passer par scrypt) → vérification LEURRE constante ajoutée,
  les deux chemins paient désormais exactement un scrypt (vérification du mot de passe déplacée
  avant le test de verrou pour éviter toute asymétrie de branche). 2 constats MINEURS fermés :
  (a) une session survivait jusqu'à 8 h à la désactivation d'un compte → `verifierSession`
  refuse un compte `actif=0` + `revoquerToutesLesSessions` ; (b) sessions obsolètes jamais
  purgées → `purgerSessionsObsoletes` au démarrage.
- Tests (tous verts) : `test-comptes` 29/0, `test-sessions` 37/0, `test-routes-comptes` 30/0
  (dont le test anti-oracle de timing), `test-bootstrap` 19/0, `test-migrations` 58/0,
  `test-mapping` 141/0 ; suites existantes intactes ; **contrat `test-contrat.mjs local` ET
  `demo` = 183/0** (aucune adaptation du harnais).
- **Vérifié navigateur (serveur réel port 2011, base jetable)** : flux complet same-origin —
  mutation sans session refusée 403 « rôle courant : aucun » ; mauvais mot de passe = message
  unique ; connexion correcte = 200 + cookie `iwf_session` HttpOnly (invisible en JS) ; mutation
  ensuite = garde ouverte ; écran de connexion monté via `iwf:session-requise` ; pied de session
  « login + rôle » ; déconnexion = session révoquée, retour à l'écran de connexion, mutation de
  nouveau 403. Lectures ouvertes en loopback confirmées (tableau de bord sans connexion).
- ⚠️ **Observation hors périmètre (non corrigée)** : `serveur.js` sert la RACINE du dépôt ;
  `http://localhost:2011/` affiche l'ancienne démo v7 (sans E5), la v9 est sous `/v8/`. Piège
  d'entrée en Mode Local à trancher ultérieurement avec Franck (faut-il servir `v8/` comme
  racine ?).
- **Reste à valider par Franck** : écoute LAN + scan tablette RÉEL (2e appareil, vraie IP LAN) —
  non testable dans le bac à sable (validé seulement par câblage avec `IWF_HOTE_LAN=127.0.0.1`) ;
  saisie masquée interactive du CLI (validée seulement via arguments).

### 🔐 V9-E4 — Le coffre-fort : sauvegarde, restauration, chiffrement (05/07)
L'exigence n°1 (ne JAMAIS perdre les données) tenue de bout en bout, plan `docs/E4-PLAN.md`.
- **E4.1 noyau** : `VACUUM INTO` seule primitive (jamais copier le `.db` à chaud) ; snapshots
  (base seule, filet anti-erreur) + archives complètes (base+documents, filet anti-sinistre) ;
  **manifeste-preuve** (empreinte, chaîne OK, compteurs) ; **restauration atomique** Windows
  (sortir l'ancienne du chemin, poser la nouvelle sur le chemin libre, purge du WAL orphelin) ;
  sauvegarde de sécurité auto non désactivable ; **rollback via l'original intact** (`ancienne.db`,
  pas une archive faillible) ; bouton « Tester une sauvegarde » (base temporaire, jamais la base
  vive) ; reprise au démarrage. `server/` : zip-node, verification, manifeste, sauvegarde,
  restauration, routes-sauvegarde. **14 familles de test (158 vérif.)** dont la coupure simulée à
  chaque étape (jamais d'hybride), le filet saboté, le crash pendant rollback, la PJ manquante.
- **E4.2 chiffrement** : AES-256-GCM + scrypt, `.zip.chiffre` (manifeste EN CLAIR en tête pour
  inventorier sans la phrase, sert d'AAD GCM), **re-déchiffrement de vérification** (refuse
  d'annoncer OK si l'archive n'est pas ré-ouvrable — parade au « phrase perdue »), **phrase
  normalisée NFC** (une phrase accentuée saisie autrement ne rend plus la sauvegarde
  irrécupérable). 6 familles de test.
- **E4.3 écran** (`v8/js/views/sauvegarde.js`) : liste, Sauvegarder (snapshot/archive/chiffrer),
  Tester, Restaurer avec écran de comparaison + confirmation de perte ; en démo, encart + repli
  JSON. Vérifié navigateur (serveur réel) : snapshot chiffré créé, testé « restaurable ».
- Deux revues adversariales : la 1re a trouvé un **scénario de perte de données** (rollback si le
  filet échoue) et un bug de chemins — corrigés et prouvés ; la 2de (crypto) a fait ajouter la
  normalisation NFC. Rôles ADMIN/REFERENT sur les 4 routes, verrou anti-concurrence, détection
  OneDrive. Sécurité restante ASSUMÉE : tamper-evidence (§4.6), pas d'authentification du manifeste
  contre un falsificateur disque-en-main (comme tout registre local).
- Commits : `8f292d8` noyau · `0d232e4` durcissement · `73132de` chiffrement · `237b63c` écran+NFC.

### 🔌 V9-E3 — Le mode Local branché : le contrat passe 183/0 sur SQLite (04-05/07)
Le plus gros incrément de la V9 : les 64 méthodes du contrat DataStore réimplémentées côté
serveur, éprouvées par LES MÊMES 183 assertions que le mode démo. L'objectif d'E0 est atteint —
le branchement est prouvé fidèle, pas espéré.
- **Ossature** (`server/api.js` dispatcher + `muter()`, `v8/js/data/local-store.js`,
  `transport-http.js`, `server/harnais-contrat.mjs`, `serveur.js` routage `POST /api/:methode`,
  `datastore.js` sélecteur ping→local sinon demo) : le front ne sait jamais quel store il a.
- **Hash verrouillé AVANT tout** (`server/hash-mouvement.js`) : `db.hashEcriture` diverge du
  hasseur front sur 3 points — un clone exact + un test d'équivalence (18 vérifs) garantissent
  que le registre local est IMPORTABLE dans le registre démo et réciproquement (prouvé croisé).
- **Registre WORM** : quantité signée, effets stocks atomiques, contre-écriture, scellement,
  double garde de rôle (validateur élève → refus). **Balance matière** via la vue SQL (fidélité
  au calcul du front enfin prouvée). Déchets, outillage, dossier, pièces jointes (base64→disque),
  **8 familles d'alertes** à l'identique, export/import (remplacement total sous WORM : verrous
  retirés puis recréés dans la transaction, FK différées).
- **Vérifié EN VRAI (navigateur + serveur Node)** : bascule LOCAL automatique, création machine
  via HTTP, persistance SQLite après rechargement, badge « LOCAL / SQLite ».
- **Revue adversariale (fidélité + sécurité), constats corrigés** : trou de rôle forgeable dans
  le corps (→ contexte déterminé côté serveur), **CSRF / DNS-rebinding** (→ garde Host + Origin,
  éprouvé HTTP : hostile 403, légitime OK), CR-5 amputé (→ intégrité du registre ET du journal au
  chargement), `getAlertes` stub, statut d'outillage figé, machine libérée à tort, `registreAltere`
  non rafraîchi après import, masse nette générée non arrondie, compteurs de codes, tris, journaux.
- Sécurité restante ASSUMÉE (documentée) : les vraies sessions/comptes arrivent en E5 ; le rôle
  REFERENT accordé au loopback est un raccourci E3 explicite, jamais élargi au LAN sans E5.
- Commits : socle `e05c4ff` · fondations `3a81ada` · registre `9c92880` · métier `5fe0f69` ·
  export `c8c7a50` · navigateur `cc844e7` · revue fidélité `06386f1` · clôture `f62d367`.

### 🔗 V9-E2 — Le journal d'audit chaîné (04/07)
« Le vrai passage démo → coffre-fort » (vision §3) : sans chaîne, on pouvait exciser une ligne
du journal sans trace ; désormais toute excision est détectable.
- **Migration 004** : `journal_audit` gagne `cible`/`details` (les deux champs du contrat qui
  n'avaient pas de colonne) et `hash_precedent`/`hash` (le chaînage).
- **`db.js:journaliser()`** : écrit chaque entrée avec une empreinte SHA-256 qui intègre celle de
  la précédente, en transaction `BEGIN IMMEDIATE` (pas de fourche). **Ré-entrant** : appelé dans
  une transaction ouverte, il la REJOINT — mutation métier + journal dans le même tout-ou-rien
  (le piège « rollback saboteur » découvert en revue est neutralisé et prouvé dans les deux sens :
  commit atomique, rollback atomique).
- **`db.js:verifierChaineJournal()`** : recalcule la chaîne sur la table ENTIÈRE — une ligne sans
  hash est une anomalie SIGNALÉE, jamais tolérée (2ᵉ trou de revue : une entrée forgée hash NULL
  passait au vert). Limites honnêtes documentées (vision §4.6) : troncature de fin et ré-écriture
  totale cohérente restent l'affaire des scellés hors système (E4).
- Tests (58 vérifications au total) : chaîne tissée de proche en proche, excision au milieu
  détectée à la ligne près, altération du seul `hash_precedent` détectée, forgerie signalée,
  ré-entrance et rollback atomique prouvés. `mapping.js` : journal débloqué (cible/details),
  plus que 4 divergences. Intégration : **17 suites vertes, 794 vérifications**.

### 🗄️ V9-E1 — La base versionnée, alignée sur le contrat (04/07)
Le socle SQLite devient réel — et le contrat fait foi :
- **`server/schema.sql` v1 ALIGNÉ** : les 18 divergences front↔SQL relevées en E0 sont résorbées
  à la source (aucune base réelle n'existait — pas de migrations de reconstruction pour des
  tables vides). Colonnes de chaîne (`hash_precedent`, `ordre_validation` UNIQUE), statuts et
  enums du contrat (`ARRETEE`/`DEMANTELEE`/`FUITE`/`CONTROLE_DU`, rôles réels, `DETECTEUR`…),
  date de jour `date_mouvement`, quantité SIGNÉE, `technicien`/`operateur` en toutes lettres,
  tables `retours_fournisseur` + `stocks_initiaux` + `inventaires` à plat + `justifications_ecarts`,
  `pieces_jointes.mime_type`, décision déchet sur la bouteille. Déclencheur WORM étendu à
  **toutes** les colonnes de contenu. Vue `bilan_matiere` réécrite en miroir exact du contrat
  (écritures figées VALIDE **et** ANNULE, TRANSFERT exclu, repli masse d'entrée → nette courante,
  pas de ligne fantôme sur inventaire seul).
- **`server/migrations.js`** : boucle `user_version` transactionnelle (tout ou rien, registre
  troué refusé, jamais de DROP ni de re-hash), migrations **002 sites** (le chaînon
  client↔machine de la vision §3) et **003 codes publics QR** (identifiants opaques UNIQUE).
  Chemin unique : les bases neuves passent par les mêmes migrations — éprouvées à chaque création.
- **`server/db.js`** : PRAGMA coffre-fort (`synchronous=FULL`, `busy_timeout`, WAL,
  `wal_autocheckpoint`), création v1 ATOMIQUE (schéma + estampille en une transaction), refus
  motivé des bases non versionnées, migrations au fil de l'ouverture.
- 🛡️ **Trou WORM découvert par la revue adversariale et BOUCHÉ : `PRAGMA recursive_triggers=ON`.**
  Sans lui, le DELETE implicite d'un `INSERT OR REPLACE` / `UPDATE OR REPLACE` ne déclenche pas
  les `BEFORE DELETE` : une écriture scellée était **remplaçable en silence** (reproduit, puis
  prouvé bloqué). La suite éprouve désormais les trois assauts + la transition ANNULE-avec-retouche,
  et un garde anti-migration vérifie que le déclencheur couvre TOUTES les colonnes du registre.
- **`server/test-migrations.mjs`** (45 vérifications) + `test-mapping.mjs` refondu
  (**140 vérifications** : couverture par introspection de la base RÉELLE créée par db.js,
  CHECK confrontés aux énumérations du contrat, branches CR-3 et « vidage » provoquées).
  `mapping.js` v2 : champs débloqués, 4 nouvelles tables mappées, DIVERGENCES réduites à 5
  (contrôle imbriqué E3, journal E2, categories_2008, vue à éprouver en E3, inventaire nominatif V9.4).
- Intégration : **17 suites toutes vertes** (777 vérifications au passage de revue, 368 sur le
  périmètre serveur+contrat après correctifs).
- 🎁 **Intrant V10 reçu de Franck : le traceur « FRIGOLO Mollier v3 PRO »** (log(p)-h, noyau
  thermodynamique 6 fluides, COP), archivé dans `docs/intrants-v10/` avec sa fiche d'analyse ;
  vision enrichie d'un §9.4 (outil universel : relevés comparés, assistant de mise en service,
  diagramme enthalpique, identification de pannes).

### 🧩 V9-E0 — Le contrat DataStore est figé (04/07)
Ouverture du chantier V9 « coffre-fort » (plan `docs/VISION-V9-V10.md` §11) :
- **`v8/js/data/contrat.js`** : les 64 méthodes du magasin de données figées noir sur blanc,
  plus les 2 propriétés (`modeLabel`, `registreAltere`), les constantes canoniques
  (`MSG_ECRITURE_FIGEE`, `TYPES_MOUVEMENT`, `ROLES_VALIDEURS`, `FORMAT_EXPORT`) et
  `verifierSurface()` — qui inspecte aussi les prototypes (implémentations en classe) et
  signale méthodes manquantes ET intruses (l'anti-dérive du bug v7).
- **`v8/js/data/test-contrat.mjs`** : la suite de conformité (**183 vérifications**) qui tourne
  contre N'IMPORTE quelle implémentation (`node v8/js/data/test-contrat.mjs [demo]`). Règle
  d'or : elle construit son propre monde par les mutations du contrat, sans rien devoir aux
  données de démonstration — le LocalStore SQLite (E3) devra la passer TELLE QUELLE. Couvre les
  5 types de mouvement (dont TRANSFERT sans CERFA et RECUPERATION_DEMANTELEMENT avec
  proposition de démantèlement), la contre-écriture, la chaîne de hash, les copies sur toutes
  les collections, les messages canoniques, l'import forgé rejeté. Rejouable sur base
  persistante (identifiants uniques par passage).
- **`server/mapping.js`** : LA correspondance unique front (camelCase) ↔ SQL (snake_case), et
  le registre de **18 divergences structurelles** consignées avec leur échéance — colonnes
  `hash_precedent`/`ordre_validation`/`date_soumission` absentes du schéma, table
  `retours_fournisseur` inexistante, enums désaccordés (`ARRETEE`/`ARRETE`, `FUITE` sans valeur
  SQL, rôles applicatifs étrangers, types d'outils), quantité signée vs valeur absolue,
  `sitesCouverts` tableau… Tout champ non migré LÈVE une erreur explicite : rien ne passe en
  silence. C'est l'intrant direct des migrations E1/E2.
- **`server/test-mapping.mjs`** (**111 vérifications**) : aller-retour fidèle par table,
  couverture exhaustive du schéma (une migration qui ajoute une colonne sans la déclarer casse
  le test), couverture des objets RÉELS du DemoStore (cycle de mutation complet provoqué :
  soumission, rejet, validation, contre-écriture, pièce jointe), énumérations confrontées aux
  valeurs des CHECK du schéma.
- Méthode : cartographie multi-agents (64 méthodes inventoriées) → rédaction → revue
  adversariale (2 relecteurs ; constats corrigés : suite auto-suffisante en référent, fluide
  choisi par critère et non par position, surface via prototypes, `sitesCouverts` tableau,
  `controles.operateur` non jeté en silence) → intégration **16 suites toutes vertes**
  (~700 vérifications dont 294 nouvelles) → contrôle navigateur (surface conforme vérifiée
  dans le navigateur, zéro erreur console, tableau de bord intact).

### 🛠️ Retours terrain n° 1 — pesées, virgule, création à la volée, modales empilées (04/07)
Premiers retours d'utilisateurs réels sur la démo :
- **« Aucune bouteille compatible » ne bloque plus et ne gronde plus** : encart ambre guidant
  (« Vous avez besoin d'une bouteille de récupération R-134a… Créez-la en un clic ci-dessous »)
  + la carte « + Nouvelle bouteille » reste toujours proposée.
- **Création de machine ET de bouteille à la volée depuis l'assistant** (sans le quitter) :
  la fiche créée est présélectionnée, on continue le mouvement directement.
- **Bug grave corrigé — modales empilées** : les formulaires ciblaient « la première `.modale`
  du document » ; ouverts par-dessus l'assistant (lui-même une `.modale`), leur câblage plantait
  et le bouton Ajouter déclenchait un envoi natif → **rechargement de page, travail perdu**.
  Le helper `modale()` retourne désormais sa propre racine, les 12 fichiers appelants normalisés.
- **Messages de refus avec l'arithmétique** : « la machine contient déjà X kg ; ajouter Y kg
  donnerait Z kg, au-delà de la limite L (nominale + 5 %) » — le refus de surcharge signalé par
  Franck était mathématiquement juste mais illisible.
- **Virgule décimale blindée** : helper `nombreFr()` (« 13,9 » = « 13.9 »), plus de NaN silencieux.
- **Machines de démo avec marge réaliste** (elles étaient toutes à charge nominale → aucun
  appoint démontrable) : M1 3,80/4,50 · M2 1,50/1,80 · M3 1,80/2,40 · M4 0,70/0,90 · M6 3,00/3,80.
- Vérifié : 11 suites de tests vertes + parcours navigateur complet (impasse → création →
  présélection → pesées 0,90 kg sans erreur) + modales contrôle/outillage/audit.

### 🛠️ Lot 2 — les 23 constats importants de l'audit corrigés (03/07)
- **Cycle de vie complet des objets** : machines Arrêter / Remettre en service / Démanteler
  (proposition automatique quand une récupération-démantèlement vide la machine ; démantelées
  grisées et exclues des compteurs) ; bouteilles avec chip de statut, section « Sorties du
  stock », bouton **Retour fournisseur** (alimente la balance) ; décision déchet **réversible** ;
  **BSFF partiel** (reliquat exact en stock) ; filtres du wizard alignés sur les règles du
  registre (plus de bouteilles interdites proposées).
- **Alertes** : 3 familles ajoutées (bouteille sans pesée récente, mouvement à valider,
  brouillon ancien), chaque alerte **cliquable** (navigue vers l'objet), badge rafraîchi après
  toute mutation (abonnement au store) ; « prochain contrôle » calculable automatiquement.
- **Pérennité** : années dynamiques partout (fini le 2026 figé), flux mensuels glissants.
- **CERFA** : cadre 12 complété (codes déchets 14 06 01 / 16 05 04 selon classe), cause du
  mouvement saisie au wizard et reportée au cadre 14, types Assemblage/Modification accessibles.
- **Sécurité/durcissement** : **PDF.js 4.10.38** (CVE-2024-4367 corrigée, modules .mjs,
  isEvalSupported désactivé), **polices auto-hébergées** (10 woff2, hors-ligne complet,
  plus aucun appel à Google), **CSP stricte** dans index.html, MIME des pièces jointes validé
  côté registre, e-mails de démo en domaine réservé.
- **Accessibilité** : piégeage du focus dans les modales, contrastes corrigés, aria sur les
  pièces jointes.
- **Administration** : formulaire clients/détenteurs complet (SIRET validé) ; **vue « Audit en
  5 minutes »** imprimable (tout ce que l'auditeur demande, sur une page, depuis le Bilan).
- Qualité : 8 agents, **14 suites — ≈ 420 vérifications vertes** ; vérification navigateur
  (visualiseur PDF.js 4 sous CSP : rendu 0,3 s ; polices locales ; alertes cliquables ;
  création de détenteur).

### 🛠️ Lot 1 — les 6 critiques de l'audit corrigés (03/07)
Suite à l'audit complet (`docs/AUDIT-2026-07-03.md`, note 7/10) :
- **CR-1** : plus d'impasse — actions par statut sur les mouvements (Brouillon : reprendre dans
  le wizard / supprimer ; À valider : valider / rejeter avec motif) + purge du brouillon à
  l'abandon du wizard ; chips de statut distinctes (dont « Annulé »).
- **CR-2** : la **contre-écriture a son bouton** (« Annuler » sur les écritures validées,
  modale avec rappel de l'écriture + motif obligatoire).
- **CR-3** : la fuite déclarée dans le wizard **crée le contrôle lié** à la validation
  (machine → FUITE, alerte, contrôle NON_PERIODIQUE référencé).
- **CR-4** : balance matière juste pour les bouteilles créées dans l'application
  (`masseEntreeKg` figé à la création + reprise des anciennes sauvegardes).
- **CR-5** : intégrité vérifiée à l'import ET au chargement (invariants + chaîne de hash,
  rejet motivé des fichiers forgés, bandeau rouge « registre altéré » si rupture).
- **CR-6** : bandeau « Mode Officiel indisponible : {motifs} » au tableau de bord,
  branché sur `peutPasserEnOfficiel()`.
- **IM-12 + CF-1** : plus de CERFA pour les transferts (ni numéro, ni compteur, ni bouton) ;
  bouton CERFA seulement sur Validé/Annulé.
- ⚠️ **Découverte d'intégration : le `.gitignore` (motifs non ancrés `data/`, `documents/`)
  excluait `v8/js/data/` et `v8/js/documents/` — le store, le jeu de démo, les exports et
  9 fichiers de tests n'avaient JAMAIS été commis : la démo GitHub Pages `/v8/` était cassée
  en ligne.** Corrigé (motifs ancrés `/data/`…) : ce commit pousse enfin l'application complète.
- Qualité : 12 suites, **336+ vérifications vertes** (dont test-lot1 32 + scénario Lot 1 24) ;
  vérification navigateur (bandeau officiel, contre-écriture de bout en bout).

### ✅ Phase D — Documents officiels (03/07)
- **CERFA 15497*04 = le PDF officiel rempli, affiché tel quel** (exigence « au pixel près ») :
  moteur `v8/js/cerfa/generateur.js` couvrant les **72 champs officiels** de `docs/SPEC-CERFA.md`
  (cadre 4 via la table unique, cadre 7 seuils HCFC kg / HFC teq / HFO kg × détection permanente,
  cadre 10 fuites + réparations, cadre 11 ventilation vierge/recyclé/régénéré/déchet/réemploi,
  **cadre 12 transport UN 1078 / UN 3161 selon la classe de sécurité du fluide — première fois
  géré**, cadre 13 destination BSFF, signatures + image de la signature manuscrite) ;
  filigrane diagonal + mention cadre 14 en mode FORMATION ; classes de sécurité ajoutées au
  référentiel fluides (A1/A2L/A3).
- **Visualiseur plein écran** (PDF.js, fidèle à la maquette) : rendu canvas du PDF rempli,
  Imprimer / Télécharger / Fermer, branché partout (mouvements, tableau de bord, contrôles).
- **Plaque F-Gas** imprimable par machine (fluide, charge, teqCO₂, détection, fréquence).
- **Dossier audit annuel en un clic** (vue Bilan) : ZIP autonome — sommaire, 9 tableaux CSV,
  le CERFA PDF de chaque mouvement et contrôle de l'année, attestation de capacité jointe.
  Écriture ZIP maison sans dépendance (`v8/js/core/zip.js`), archive validée par l'extracteur
  Windows (20 documents, ~1,8 Mo).
- **2 correctifs de robustesse navigateur** (trouvés en vérification live) : `doc.save()` pdf-lib
  et `page.render()` PDF.js gelaient dans les onglets en arrière-plan (minuteries/rAF bridés) →
  sauvegarde en un bloc (`objectsPerTick: Infinity`) + rendu en intention `print` (qui donne
  aussi les apparences finales des champs).
- **Qualité : 280 vérifications automatisées vertes** (10 jeux de tests, dont 78 sur le PDF
  officiel relu case par case) + vérification navigateur (CERFA rendu, dossier ZIP généré).
- Reste : bascule v8 → racine (après validation Franck), puis Phase E (mode local Node+SQLite).

### ✅ Phase C — Conformité audit (03/07)
- **Balance matière annuelle** (le cœur de l'audit) : vue dédiée par fluide (stock initial neuf/
  récupéré, achats, récupérations, charges, cessions, retours, destructions → stock théorique),
  **inventaire physique au 31/12** (saisie par fluide, opérateur obligatoire) et **justification
  obligatoire des écarts** (écart non justifié = alerte critique + blocage du mode officiel).
- **Registre du personnel** : vue + formulaire complets (type de personne, attestation d'APTITUDE
  individuelle, organisme, catégories 2008 ET 2025 avec encart d'aide réglementaire, activités
  autorisées, désactivation — jamais de suppression). Séparation stricte capacité/aptitude.
- **Outillage réglementaire** : tous types (stations, balance, détecteurs, pompe, manifold…),
  statut recalculé depuis l'échéance (conforme / à vérifier / expiré), réforme tracée,
  bandeau de blocage officiel si détecteur ou balance expiré.
- **Pièces jointes généralisées** : composant réutilisable (dépôt, liste, téléchargement,
  5 Mo max), binaires dans IndexedDB + métadonnées et hash SHA-256 dans le registre — branché
  sur personnel (attestations), outillage (certificats), établissement (attestation capacité),
  BSFF (bordereaux).
- **Chaîne déchets/BSFF** : décision (réutilisable / à analyser / déchet + garde 1 an),
  bordereau BSFF, sortie de stock tracée au journal.
- **Dossier opérateur** : administration éditable (attestation de capacité complète, catégories,
  activités, sites) + suivi d'audit organisme (audits, non-conformités, actions correctives).
- **Alertes dynamiques** : recalculées depuis les données réelles (7 familles, niveaux SPEC §7.2),
  badge sidebar rafraîchi à chaque navigation ; `peutPasserEnOfficiel()` avec motifs.
- Navigation : 13 vues. **Qualité : 148 vérifications automatisées vertes** (6 jeux de tests dont
  scénario audit de bout en bout) + vérification navigateur (balance avec écart justifié,
  pièce jointe IndexedDB relue octet pour octet). Répartition Fable/Sonnet reconduite.
- Reste Phase D : CERFA (PDF officiel rempli affiché), plaque F-Gas, dossier audit annuel en un clic.

### 🔧 CERFA v7 — correctif de conformité (03/07)
- **Bug corrigé** : le wizard envoyait `CHARGE/MISE_EN_SERVICE/RECUPERATION/TRANSFERT`, le
  générateur testait `Charge/MiseEnService/Recuperation` → **aucune case du cadre 4 cochée**
  et quantités du cadre 11 mal ventilées sur les CERFA du wizard. Table de correspondance
  unique `CERFA_TYPE_NORMALISE`/`CERFA_TYPE_VERS_CASE` (PDF officiel + aperçu HTML).
- Correction métier : récupération simple = « Maintenance » (plus « Démantèlement »).
- **`docs/SPEC-CERFA.md`** : inventaire des **72 champs officiels** (extraits du PDF, MD5
  identique à service-public.gouv.fr), table types↔cases, seuils/fréquences cadre 7, ventilation
  QA→QE cadre 11, cadre 12 transport (UN 1078 / UN 3161, non géré v7 → Phase D), critères
  d'acceptation. Décision Phase D : l'aperçu à l'écran = le PDF officiel rempli (PDF.js).

### ✅ Phase B — Registre vivant (03/07)
- **Store** : mutations complètes (machines, bouteilles + pesée, contrôles, mouvements) ;
  cycle brouillon → soumis → validé ; **écritures validées figées** (correction uniquement par
  **contre-écriture** liée) ; **hash SHA-256 chaîné** + `verifierChaineHash()` ; journal d'audit
  append-only ; numérotation FORM-/FI- séparée ; règles métier (anti-croisement de fluides,
  bornes de charge/masse, un élève ne valide jamais) ; outillage (détecteurs/balance).
- **Wizard « Nouveau mouvement » 6 étapes** (Type/Technicien · Machine · Bouteille · Pesées ·
  Contrôle/Détecteur · Signature) : filtrage par compatibilité fluide, quantité calculée en
  direct, alerte détecteur expiré, signature manuscrite (canvas tactile), récapitulatif.
- **Formulaires** : création/édition machine, bouteille (+ pesée dédiée), contrôle d'étanchéité
  (fuite → localisation + réparation immédiate).
- **Qualité** : répartition Fable (cœur métier, wizard, intégration) / Sonnet (formulaires,
  signature) ; 6 corrections d'intégration (dont 1 bug bloquant de rafraîchissement) ;
  **74 vérifications automatisées vertes** (27 + 36 + chargement + scénario de bout en bout) ;
  parcours complet vérifié dans le navigateur (FORM-2026-0001 : M1 4,20→4,50 kg,
  B-03 3,6→3,3 kg, chaîne de hash intacte, audit tracé).
- Reste Phase C : conformité (personnel, outillage complet, pièces jointes, balance matière).

### ✅ Phase A — Socle v8 livré (dossier `v8/`, démo : `…/v8/`)
- **Coquille** fidèle à la maquette : sidebar marine dégradée (logo, 9 sections, badge d'alertes,
  bouton Sauvegarde + état), header (fil d'ariane, badge « DÉMO / FORMATION », avatar), routeur
  par ancre, tiroir mobile < 900 px, IBM Plex Sans / Space Grotesk / IBM Plex Mono, icônes SVG
  linéaires (zéro emoji).
- **Couche données** : contrat `DataStore` unique (prêt pour Local/Cloud en Phases E/F),
  `DemoStore` avec persistance localStorage + **export/restauration JSON fonctionnels** (modale
  Sauvegarde), monde de démonstration fidèle à la maquette (6 machines, 5 bouteilles,
  7 mouvements, 3 contrôles, 9 fluides GWP AR4, 4 alertes ; stats calculées : 16,0 kg en charge,
  31,0 kg de stock, 29,2 t éq. CO₂).
- **9 vues en lecture** : tableau de bord, parc machines, stock bouteilles, mouvements,
  contrôles, statistiques, bilan annuel (**export CSV fonctionnel** + impression), fluides,
  administration (lecture seule).
- **Qualité** : 12 agents, relecture d'intégration, `node --check` 18/18, 61 vérifications
  automatisées vertes (tests données + chargement des modules), vérification visuelle contre
  la maquette (bureau + mobile).
- Reste Phase B : wizard de mouvement, création/édition, verrouillage + contre-écritures.

### 📐 Fondations v8 (pas encore de code applicatif)
- `docs/SPEC-V8.md` : spécification consolidée — 3 modes (Démo GitHub Pages / Local Lycée
  portable Node+SQLite / Cloud Supabase), modèle de données « registre opposable » issu de
  l'audit métier du 02/07 (dossier opérateur, registre personnel, outillage réglementaire,
  bouteilles et mouvements enrichis, contre-écritures + hash chaîné, balance matière annuelle,
  chaîne BSFF, pièces jointes, dossier audit annuel en un clic), correspondance unique
  types ↔ cases CERFA, alertes bloquantes, phasage A→F.
- `design/DESIGN-TOKENS.md` : charte extraite de la maquette Claude Design validée
  (IBM Plex Sans / Space Grotesk / IBM Plex Mono, marine #0e2a47, turquoise #12b5c9,
  12 vues de référence).
- Documentation de diffusion : `README.md`, `LICENSE` (MIT), `INSTALLATION_SIMPLE.md`,
  `INSTALLATION_CLOUD.md`, `SAUVEGARDE.md`, `SECURITE.md`, `RGPD.md`.
- Socle technique : `server/schema.sql` (modèle v8 complet), `server/db.js` (node:sqlite),
  `server/serveur.js` (squelette), `lancer-inerweb.bat`, `.env.example`, `.gitignore`.

## [7.10.0] - 2026-05-18 (nuit) — P2 livré

### 🔗 Clients ↔ Machines bidirectionnel
- **Carte machine** : chip bleu cliquable « 🤝 Nom du client » qui ouvre la liste des machines de ce client
- **Admin → Clients** : nouvelle colonne « 🏭 N machine(s) » cliquable → modale détail
- **Nouvelle modale** `showClientMachines(clientId)` : liste compacte des équipements d'un client avec accès direct à la fiche détail (mouvements + contrôles + CERFAs)

### 🔇 UX silencieuse
- Bouton principal du dashboard reformulé « ➕ Nouvelle intervention → CERFA » (plus parlant, lien explicite avec le livrable réglementaire)
- Hiérarchie 3 niveaux + Calibri 14 pt + bleu/orange respectés partout

### 📊 Suivi machines (existait déjà — vérifié)
- `calcProchainControle()` + `getFrequenceControle()` calculent automatiquement la prochaine échéance F-Gas selon teqCO2/famille (HFC, HCFC, HFO)
- Carte machine : indicateur rouge si contrôle dépassé
- `openDetailModal('machine')` : historique mouvements + contrôles + CERFAs liés

## [7.9.0] - 2026-05-18 (soirée)

### 🧙 Wizard CERFA enrichi — 6 étapes au lieu de 5
Nouvelle étape **5 « Contrôle d'étanchéité + Détecteur »** insérée entre Pesées et Signature. Le wizard couvre désormais TOUS les cadres du CERFA 15497*04 :
- **Cadre 5 — Détecteur** : menu déroulant depuis Admin → Détecteurs (alerte ⚠ EXPIRÉ si étalonnage échu)
- **Cadre 6 — Détection permanente** : auto depuis la fiche machine (OUI/NON)
- **Cadre 10 — Résultat contrôle** : 3 boutons (Sans objet / Conforme / Fuite) ; si Fuite → 3 lignes localisation + cases « Réparée »
- **Cadre 13 — Destination + BSFF** : affiché uniquement si Récupération/Vidange (champ obligatoire)
- **Cadre 14 — Observations** : commentaire libre étape 6

### 📱 Étiquettes QR imprimables (module `qr-print.js`)
- Boutons orange « 📱 QR » sur chaque **carte machine**, **carte bouteille** et **ligne détecteur** (admin)
- Étiquette format **50 × 70 mm** : QR (35 mm) + code Trebuchet bold + détails Calibri
- Bouton « Imprimer les QR codes » → planche **A4 grille 3×2** (6 étiquettes par page)
- QR pointe vers URL absolue GitHub Pages avec paramètre (`?machine=...`, `?bouteille=...`, `?detecteur=...`)
- Lib **qrcodejs 1.0.0 (davidshimjs)** embarquée localement (offline OK)

### 🔧 Technique
- `state.js` : `wizardNext()` autorise 6 étapes au lieu de 5
- `ui.js` : libellé bouton « Valider » à l'étape 6
- `index.html` : 6e onglet « Contrôle » dans le bandeau wizard ; scripts `qrcode-lib.min.js` + `qr-print.js`
- `sw.js` : cache v7.9.0 incluant les nouveaux assets

## [7.8.0] - 2026-05-18

### 📄 CERFA — Aperçu HTML lisible + PDF officiel à un clic
- **Nouveau** : `CERFA.ouvrir()` affiche désormais un **aperçu HTML** lisible (cadres 1-14 numérotés, cases ☐/☒, mise en page proche du formulaire officiel imprimable) → on voit enfin le contenu à l'écran sans télécharger.
- **Bouton « 📑 PDF officiel »** dans la modale d'aperçu → bascule vers le vrai CERFA officiel ministère rempli via pdf-lib (pour archivage et signature réglementaire).
- **Préremplissage** : l'aperçu pioche dans `State.config` (établissement, SIRET, attestation, intervenant) et la machine sélectionnée. Le bouton « Aperçu CERFA » du tableau de bord passe maintenant une intervention exemple (Maintenance, 0,5 kg) pour montrer le rendu cases cochées.
- **API CERFA** :
  - `CERFA.ouvrir(data)` → aperçu HTML (nouveau défaut)
  - `CERFA.ouvrirPDF(data)` → PDF officiel directement (modale PDF.js)
  - `CERFA.imprimer(data)` → aperçu HTML + impression
  - `CERFA.telecharger(data)` → téléchargement direct du PDF officiel
- Labels boutons mis à jour : « CERFA 15497*04 (PDF officiel) » → « CERFA 15497*04 — Aperçu »

## [7.7.0] - 2026-05-18

### 📄 Visualiseur CERFA universel (PDF.js)
- **PDF.js 3.11.174** embarqué localement (`js/pdf.min.js` + worker) → fonctionne hors-ligne
- **Rendu canvas** garanti sur tous navigateurs : Safari iOS, Android, PC, Mac
- **Corrige** : sur Safari iOS / certains navigateurs mobiles, l'iframe affichait le code source du PDF au lieu du document — désormais le PDF s'ouvre dans une modale plein écran
- **Zoom −/+** (50 % → 400 %) dans la barre d'outils de la modale
- **Boutons** : 🖨️ Imprimer · ⬇️ Télécharger · ↗ Onglet · ✖ Fermer · Esc pour fermer
- **Confirmation** : le PDF `cerfa_15497-04_officiel.pdf` du repo est bien le document officiel (MD5 identique à service-public.gouv.fr) — depuis la révision *04 (juillet 2024), le CERFA tient sur 1 seule page (format compact ministère)

### 🔧 Technique
- `cerfa.js` : nouvelle méthode `_loadPdfJs()` (lazy load) + `_renderPdfInContainer()` (canvas par page)
- `_showInModal()` réécrit : reçoit les bytes du PDF en plus de l'URL pour rendu canvas
- `sw.js` : cache `pdf.min.js` et `pdf.worker.min.js`, bump `inerweb-fluide-v7.7.0`

## [7.1.0] - 2026-03-07

### 🎨 Charte graphique officielle
- **Logo inerWeb Fluide** : SVG officiel avec ❄️ + "iner" (Trebuchet bold) + "Web" (script) + cartouche orange
- **Couleurs** : `#1b3a63` (bleu marine) / `#e8914a` (orange) conformes à la charte inerWeb
- **Header** : Logo compact sur fond bleu, badge mode animé, infos utilisateur

### 📱 Responsive Design complet
- **Mobile-first** : CSS Variables, breakpoints à 640px, 1024px, 1280px
- **Grilles adaptatives** :
  - Mobile : 1 colonne
  - Tablette : 2-3 colonnes  
  - Desktop : 3-4 colonnes
- **Navigation** : Barre horizontale scrollable tactile
- **Modales** : Bottom-sheet sur mobile, centrées sur desktop
- **Touch targets** : Minimum 44px pour tous les éléments interactifs

### 🖼️ Interface utilisateur
- **Dashboard** : Cartes stats avec accent gradient, alertes stylisées
- **Machines** : Cartes avec icônes métier (❄️🌡️💨), statuts colorés
- **Bouteilles** : Niveau de remplissage visuel, catégories colorées (Neuve/Transfert/Récup)
- **Wizard mouvement** : 5 étapes avec progression visuelle, signature canvas
- **Pesées** : Interface intuitive avec calcul automatique
- **CERFA** : Aperçu vert officiel avec filigrane mode
- **Toasts** : Notifications animées

### 🔧 Architecture frontend
- **api.js** : Module de communication API avec gestion erreurs
- **state.js** : Gestion centralisée de l'état applicatif
- **ui.js** : Rendu dynamique des vues et composants
- **wizard.js** : Assistant de création mouvement complet
- **app.js** : Initialisation et bindings événements

### 📦 PWA
- **manifest.json** : Configuration PWA avec thème inerWeb
- **sw.js** : Service Worker pour support hors-ligne
- **Icons** : Placeholders 192x192 et 512x512

---

## [7.0.0] - 2026-03-07

### LOT 15 : Statistiques avancées
- `apiGetStatsAvancees_()` avec mouvements, contrôles, parc, opérateurs, tendances 12 mois
- Route GET `getStatsAvancees`

### LOT 16 : Multi-site / Multi-atelier
- Onglets SITES et ATELIERS
- Filtrage par siteId sur toutes les entités
- Routes `getSites`, `getAteliers`, `createSite`, `createAtelier`

### LOT 17 : Modèle utilisateur enrichi
- Onglet USERS (13 colonnes)
- Attestations avec catégories 2008 et 2025
- Route `createUser`

### LOT 18 : Durcissement réglementaire
- `verifierAttestation_()` avec seuils ALERTE/CRITIQUE/BLOQUANT
- Blocage mode OFFICIEL si attestation expirée
- Création automatique incident si fuite
- Route `getAlertesReglementaires`

### LOT 19 : Moteur d'export pro
- Types : registre, bilanAnnuel, conformiteReglementaire, declarationAnnuelle, historiqueComplet
- Données ADEME par fluide
- Route `exportPro`

### LOT 20 : Abstraction backend
- Interface DataStore pour préparation migration
- Toutes opérations DB via DataStore

---

## [6.3.0] - 2026-03-07

### LOT 11 : Login réel
- Vérification identifiant dans TECHNICIENS
- Génération token session
- Permissions par rôle

### LOT 12 : Audit enrichi
- Onglet AUDIT_LOG avec IP, userAgent, durée
- Rotation automatique > 10000 lignes
- Route `getAuditLog` et `getAuditStats`

### LOT 13 : CERFA normé
- Numérotation FI-YYYY-XXXXX / FORM-YYYY-XXXXX
- Onglet INDEX_CERFA
- PDF dans Drive avec nomFichier standardisé

### LOT 14 : Modes Formation/Officiel
- Filigrane "FORMATION" sur documents
- Préfixes distincts
- Validation enseignant requise en formation

---

## [6.2.1] - 2026-03-07

### LOT 9 : Optimisation I/O
- Batch reads/writes avec getRange().getValues()
- Cache configuration 6h
- Index en mémoire pour recherches

### LOT 10 : Version centralisée
- Constante VERSION unique
- Route `ping` avec version
- Headers de réponse avec version

---

## [6.2.0] - 2026-03-07

### LOT 4-8 : Sécurité et refactoring
- Validation stricte des entrées
- Gestion transactionnelle avec rollback
- Refactoring fonctions utilitaires
- Tests de non-régression

---

## [6.1.0] - 2026-03-07

### LOT 1-3 : Workflow mouvements
- Workflow BROUILLON → EN_ATTENTE → VALIDE
- Validation enseignant avec date/heure
- Mise à jour stocks machines et bouteilles
- Anti-croisement fluides

---

## [6.0.0] - 2026-03-06

### Migration architecture
- Passage de Go/SQLite à Google Sheets + Apps Script
- 15 onglets de données
- API REST complète
- PWA frontend

---

*inerWeb Fluide - Traçabilité F-Gas & CERFA 15497*04*
*Lycée Professionnel Jacques Raynaud, Marseille*
