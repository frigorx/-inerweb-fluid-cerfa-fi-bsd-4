# Prompt de démarrage — inerWeb Fluide (à coller dans un nouveau chat)

> Copier tout ce qui suit comme PREMIER message d'un nouveau chat. Il est
> autonome : il rappelle le contexte, l'état exact, la méthode et les consignes.

---

Tu reprends le développement d'**inerWeb Fluide**, un logiciel **local** de traçabilité des
fluides frigorigènes (F-Gas / CERFA 15497*04) pour lycées professionnels (filière froid/clim).
**Objectif** : un logiciel de traçabilité **irréprochable lors d'un audit**, qui permet de
**former les élèves** et de **simplifier toute la gestion du fluide**, assez **professionnel pour
être diffusé gratuitement dans les lycées**. Tu as **carte blanche** et le droit de dépasser les
attentes. Tu ne t'arrêtes que quand une brique est **finie et testée par toi-même**.

## À LIRE EN PREMIER (dans l'ordre, avant de coder)

1. **Mémoire persistante** (si présente sur le disque, `G:\Mon Drive\claude-memoire\`) :
   `MEMORY.md`, puis la fiche `project_inerweb_fluide.md`. La feuille de route vit
   désormais DANS le dépôt : **`docs/ROADMAP.md`** (la fiche Drive a disparu 3 fois,
   elle n'est plus qu'un pointeur).
2. **Dépôt `C:\git\inerweb-fluide`** : `docs/REPRISE.md` (état + pièges), `CHANGELOG.md`
   (**source de vérité**, entrées les plus récentes en tête), `docs/PLAN-PHASE-2.md`,
   `docs/VISION-V9-V10.md` (la boussole).

## État exact (14/07/2026 soir — voir `git log` pour le dernier commit)

**FAIT le 14/07 soir (2ᵉ partie) — FILTRES DE LA VUE MOUVEMENTS : ⭐ SOLDÉ ⭐**
- Trou de l'examen du 10/07 fermé : module pur `v8/js/data/filtre-mouvements.js`
  (index cherchable INSENSIBLE AUX ACCENTS, multi-mots ET, groupes de type fidèles aux
  chips, options limitées aux valeurs présentes, type futur filtrable — filet) + barre
  recherche/Statut/Type/Fluide/Année + compteur « X sur Y » + Réinitialiser conditionnel
  + message vide ; masquage de lignes par `data-id` (patron machines.js, délégation des
  actions INTOUCHÉE). `test-filtre-mouvements.mjs` 25/0 — TOUT VERT 67 exécutions.
- Vérifié navigateur (origine 8331) : recherche « fournil » 1 sur 7, « pedagogique »
  sans accent trouve la Vitrine, type Récupération, statut Brouillon → 0 + message,
  restauration de formulaire cohérente au rechargement. ⚠️ **RÉSERVE À LEVER D'UN CLIC :
  le bouton « Réinitialiser » n'a pas pu être cliqué en direct** (le navigateur intégré
  a cessé d'envoyer les événements souris — panne récurrente ; la cible est confirmée
  par elementFromPoint, le handler rappelle `appliquerFiltres` déjà exercée partout).

**FAIT le 14/07 soir (1ʳᵉ partie) — RÉSERVES B2 + PARCOURS « AUDIT GUIDÉ » : ⭐ SOLDÉS ⭐**
> Session Fable, sobriété appliquée : lecture par cartes, cœur+tests moi, UN agent de
> revue adversariale sur le cœur, navigateur (origines neuves 8317/8323/8329).
- **Réserves B2 (`b81b132`)** : habilitations SEMÉES au monde de démo (Marc 2008/I +
  mention CO₂ active = cas nominal du moteur ; Sophie 2008/I + mention HC révoquée datée ;
  échéances > 90 j → AUCUNE alerte ajoutée). **⚠️ Piège verrouillé ET testé** : les
  compléments d'init/import passent TOUJOURS à VIDE pour habilitations/mentions/
  mouvementOutillage (jamais depuis DEMO — un export ancien recevrait des aptitudes
  inventées, un registre étranger serait refusé en orphelin). Anti-doublon CONSEIL sur
  mention déjà active (confirmation de renouvellement, jamais bloquant). Suites adaptées
  au semis (tri CO₂ filtré par personne, CSV d'audit vérifiés porteurs, +11 vérifs).
- **Parcours « audit guidé » (`05d3497`)** — le dernier trou produit non gaté (priorité 3
  GPT) : module pur `v8/js/data/audit-guide.js` (9 étapes ordonnées établissement →
  personnel → outillage → bouteilles → mouvements → contrôles → déchets/BSFF → balance →
  export ; alertes rattachées par PRÉFIXE, barème hérité du feu tricolore, ZÉRO PERTE,
  couverture ⊇ `DOMAINES` prouvée, faits de présence lus du contrat) + vue `#/audit-guide`
  (stepper numéroté, bandeau de progression, constats cliquables, bouton par étape,
  étape 9 = action d'export vers le bilan) + entrée sidebar + icône `parcours`.
  **Revue adversariale 0 bloquant, 3 IMPORTANT soldés** (global couvrant les alertes non
  rattachées ; « au parc » hors démantelées ; compteur déchets aligné sur la définition
  de la vue cible). `test-audit-guide.mjs` 47/0 demo + 39/0 local (suite DOUBLÉE).
- **TOUT VERT : 66 exécutions.** Vérifié navigateur : semis + anti-doublon (Annuler /
  Ajouter quand même), parcours complet (constats rouges réels, navigation étape →
  Outillage, constat → cible, export → Bilan annuel), zéro erreur console.

## État antérieur (14/07 après-midi, dernier commit `162b086`)

**FAIT le 14/07 après-midi — SÉRIE PRODUIT POST-B2 (3 briques) : ⭐ SOLDÉE ⭐**
> Session ultracode Fable, méthode : carto 1 agent → cœur+tests moi → Sonnet sur l'UI
> → revue adversariale Opus sur le critique → navigateur (port jetable 8300, parcours
> wizard COMPLET signature comprise, zéro erreur console). ⚠️ **`docs/CARTE-CODE.md`
> créée — À LIRE AVANT TOUTE EXPLORATION** (et à tenir à jour à chaque incrément).
- **Brique 1 — code machine lisible (`5adb7c3`)** : module pur `v8/js/data/code-machine.js`
  (SITE-FAMILLE-NUMÉRO « JR-CF-001 », site déduit de l'établissement, famille du type,
  générateur par préfixe), createMachine/updateMachine acceptent/renomment avec unicité
  (renommage journalisé « ancien → nouveau »), formulaire à proposition automatique,
  fiche machine « JR-CF-001 · QR xxx ». `test-code-machine.mjs` 32/0 demo+local.
- **Brique 2 — outils MULTIPLES par intervention (`b5dfd9c`)** : migration 018
  `mouvement_outillage` (liens déclarés au BROUILLON, statut+échéance de CHAQUE outil
  FIGÉS à la validation — « la balance était-elle étalonnée CE jour-là ? ») ; 4 triggers
  anti-forge (liens d'un mouvement figé intouchables + re-parentage interdit, prouvés en
  SQL brut) ; **journal CHAÎNÉ consigne « outils figés : id=STATUT »** (recoupement d'un
  export édité — constat BLOQUANT de la revue, soldé) ; invariants d'import français
  (orphelin/doublon/enum/figeage forgé) ; contrat **76→77** (`getOutilsMouvement`,
  `VERSION_CONTRAT` 3) ; wizard cases à cocher + avertissement CONSEIL (jamais bloquant) ;
  modale détail ; `outils-intervention.csv` conditionnel au dossier d'audit.
  `test-outils-intervention.mjs` 26/0 ×2, migrations 138/0.
- **Brique 3 — tableau de bord enrichi (`162b086`)** : les rôles réels du B2 enfin
  VISIBLES (modale détail : Exécuté par / Superviseur / Responsable du registre résolus ;
  `mouvements.csv` +3 colonnes ; exécutant sur les lignes du tableau de bord) + carte
  « Conformité » mini feu tricolore (pastille globale + 7 domaines + lien, consolidation
  `collecterConformite`, zéro règle recalculée). Exports 34/0.
- **TOUT VERT : 64 exécutions.** Vérifié navigateur de bout en bout : formulaire propose
  JR-CF-001/JR-MM-001 selon le type, fiche « JR-CF-001 · QR 5MJ1C20 », wizard complet
  (encart bouteille manquante → M3, cases outils, avertissement « 1 outil non conforme »,
  récap « 2 outil(s) », signature canvas, validation) → modale détail : « Exécuté par
  Marc Delorme », « Balance Conforme le 15/01/2027 », « Détecteur Expiré le 10/11/2025 ».
- ⚠️ Leçon navigateur : en mode démo, `creerStore()` importé dans la console = une
  2ᵉ instance qui ÉCRASE les données de l'appli à la persistance — toujours passer par
  l'interface réelle (ou une seule instance) pour vérifier.

## État antérieur (matin du 14/07, dernier commit `cf1c3ff`)

**FAIT le 14/07 — CHANTIER « HABILITATIONS F-Gas » (cœur audit-proof, B2) : ⭐ SOLDÉ ⭐** :
> Phases 1, 2a, 2b (briques 1-4), dossier d'audit et Phase 3 en mode CONSEIL — toutes
> FAITES, testées, vérifiées navigateur et poussées. Cadrage = `docs/SPEC-HABILITATIONS.md`.
> Le BLOCAGE DUR du mode Officiel (verrou dans la validation) reste un choix ultérieur
> de Franck (il penche CONSEIL — v1 assumée en conseil, rien d'autre à coder d'ici là).
- **Phase 3 « conseil » — alertes d'échéance (`cf1c3ff`)** : `getAlertes()` couvre les
  tables du B2 (habilitation/mention active échue → CRITIQUE, sous 90 j → IMPORTANT,
  révoquées et personnes désactivées muettes) ; sentinelle (historisation) et feu
  tricolore (domaine Personnel) branchés. habilitations 48/0 ×2, feu-tricolore 31/0 ×2.
- **Dossier d'audit (`f83521d`)** : `habilitations.csv` + `mentions-habilitation.csv`
  dans le paquet annuel (11 tables, noms résolus, révoquées comprises).
- **Briques 3-4 — écran « qui intervient ? » (`1a89202`)** : composant pur
  `v8/js/composants/conseil-intervenant.js` (verdict + encart, échéances écartées par
  date de référence), bloc « Qui intervient ? » sur la fiche machine (la SYNTHÈSE tient
  compte de la charge — cas Pierre dès la fiche), panneau de conseil à l'étape 1 du
  wizard + **`executeParId` au `creerMouvement`** (prouvé jusqu'au scellement), section
  Mentions dans la modale habilitations + pastille, coquille « Élevé » corrigée. Revue
  2 angles 0 bloquant, 4 IMPORTANT corrigés. Moteur 50/0, composant 20/0, wizard 23/0.
  **Clic-à-travers Phase 2a CONFIRMÉ au navigateur (réserve levée).**
- **Brique 1 — table `mentions_habilitation` (`f45fa1d`)** : migration 017, 3 méthodes
  de contrat (surface **73→76**, `VERSION_CONTRAT` 1→2), miroir demo/serveur + mapping +
  export/import, branchement moteur. Revue 3 angles 0 bloquant ; invariants d'import
  renforcés sur les DEUX tables (actif booléen, unicité d'id, révocation datée).
  `test-mentions` 32/0 demo+local.
- **Contexte** : Franck a donné carte blanche + activé **ultracode**. Le logiciel doit être
  « le plus complet ». On a orchestré en workflows (conception + revue adversariale).
- **Décisions Franck ACTÉES (14/07, gravées SPEC §0bis)** — à respecter :
  - Périmètre **COMPLET** : HFC/HFO + CO₂ (R-744) + ammoniac (R-717) + **VÉHICULES (catégorie V)**
    (les ateliers ont une machine de transfert clim + méca auto = clim voiture).
  - **Matrice VALIDÉE fonctionnellement** (via 2 cas concrets, plus besoin de Légifrance) :
    A1 = tout · A2 = tout < 3 kg (6 si hermétique scellé) · B = CO₂ · C = NH₃ · D = récupération
    seule < 3 kg · E = étanchéité seule · V = véhicules. Correspondance I/II→A1, III→D, IV→E.
    Anciens (I-IV, ~99 % des gens) et nouveaux (A1-V) COEXISTENT jusqu'à ~2029.
  - **Formations complémentaires par fluide** (mentions CO₂/NH₃/HC que l'admin **coche**) :
    étendent l'axe fluide d'un ancien I-IV (ex. + stage CO₂ → peut intervenir sur CO₂).
  - **Comportement = CONSEIL** à l'entrée sur une machine (identifier le technicien → « peut /
    ne peut pas + pourquoi »), **PAS blocage brutal** (le blocage dur = Phase 3, plus tard).
  - **NH₃ hors CERFA** (le logiciel gère parc/vieillissement, pas de CERFA F-Gas sur ammoniac).
- **Phase 1 — modèle de données (`da96709`)** : migration 016 (table `habilitations`
  multi-régime cumul 2008+2025, CHECK composite, jamais supprimée ; + 3 colonnes de rôle
  `execute_par_id`/`superviseur_id`/`responsable_registre_id` sur mouvements, HORS empreinte,
  trigger WORM recréé) ; **4 méthodes de contrat (surface 69→73, réservées VALIDEUR)** ;
  export/import étendu. Revue adversariale 0 bloquant + 5 correctifs. `test-habilitations`
  38/0 demo+local.
- **Phase 2a — saisie/affichage UI (`4692c1d`)** : modale `v8/js/modales/habilitations-modal.js`
  (ajout/liste/révocation) + bouton « Habilitations » par ligne dans la vue personnel.
  ⚠️ **Clic-à-travers ajout/révocation NON vérifié en direct** (navigateur intégré tombé en
  panne au moment du test) — code relu + rend sans erreur. À confirmer d'un clic à la reprise.
- **Phase 2b brique 2 — MOTEUR de conseil (`55fb088`)** : `verifierDroitIntervention` dans le
  module pur `v8/js/data/habilitations.js` (+ `familleDuFluide`, `operationNormalisee`,
  `estIntervenantIdentifiable`, `FLUIDES_MENTION`, seuils). Matrice encodée + mentions +
  correspondance 2008. **Bachir (E) et Pierre (D, 10 kg > 3 kg) reproduits au message exact.**
  `test-habilitations-moteur.mjs` **44/0**, **57 exécutions TOUT VERT**. Pure fonction (pas de
  méthode de contrat, zéro parité/migration).
- **Phase 2b brique 1 — table `mentions_habilitation` (`f45fa1d`)** : migration 017 (table neuve,
  trigger WORM inchangé), 3 méthodes de contrat `getMentions`/`createMention`/`revoquerMention`
  (surface **73→76**, `VERSION_CONTRAT` 1→2), miroir demo/serveur + mapping + export/import,
  **branchement du moteur** (`jetonsMentionsActives` → `verifierDroitIntervention`, cas I+CO₂
  prouvé bout en bout sur le vrai store). Revue adversariale 0 bloquant ; **invariants d'import
  renforcés sur habilitations ET mentions** (actif booléen exigé, unicité d'id, révocation datée
  — dette Phase 1 soldée). `test-mentions` **32/0 demo+local**, habilitations 41/0,
  **59 exécutions TOUT VERT**.

**RESTE du chantier habilitations : RIEN d'obligatoire.** En réserve (non bloquant) :
- **Blocage dur en mode Officiel** (verrou dans `validerMouvement` derrière un drapeau) —
  SEULEMENT si Franck le demande un jour (il penche CONSEIL, v1 assumée en conseil).
- ~~Semer des habilitations dans le monde de démo · anti-doublon UI mention · colonnes
  « rôles réels » dans `mouvements.csv`~~ — **TOUT FAIT 14/07** (`b81b132`, `162b086`).

**FAIT le 13/07 (suite)** :
- **Brique ⑥ « sentinelle d'alertes persistées » (`2f0c537`)** : couche temporelle
  opposable par-dessus `getAlertes()` (qui reste la vérité du présent). Module pur
  `v8/js/data/sentinelle.js` (diff/format/tri, miroir exact côté serveur) ; **migration
  015** table `sentinelle_alertes` + **index UNIQUE partiel** `WHERE resolue_le IS NULL`
  (invariant « un seul épisode ouvert par alerte », résolu+ouvert cohabitent à la
  réapparition) ; **3 méthodes de contrat** (surface **66 → 69**) : `rafraichirSentinelle`
  (idempotente, hors journal chaîné), `acquitterAlerte` (→ **journal chaîné** = preuve
  opposable, VALIDEUR), `getSentinelle` (lecture). **Aucun masquage** (garde-fou audit :
  une critique acquittée reste active, feu tricolore inchangé). UI : tableau de bord
  (« Active depuis le … » + bouton « J'ai pris connaissance ») + carte « Historique des
  alertes » de la vue Conformité. **Escalade de niveau tracée** (snapshot rafraîchi +
  acquittement remis à zéro — constat IMPORTANT 1 de la revue). Tri déterministe par
  `idAlerte` + dédup défensif (constats IMPORTANT 2 / mineur). Revue adversariale
  **0 bloquant**. `test-sentinelle-pur` **40/0**, `test-sentinelle` **33/0 demo+local**,
  migrations v14→v15, contrat 255/0, mapping 156/0 — **53 exécutions TOUT VERT**, vérifié
  navigateur (ports neufs 8191/8207).

**FAIT le 13/07** :
- **Brique ⑤ « correction automatique du CERFA élève » (`e4a04c2`)** : refactor du
  générateur (`calculerChampsCerfa` = calcul des 72 champs séparé de l'écriture PDF,
  une seule vérité) ; cœur `v8/js/cerfa/correction.js` (lecture AcroForm du PDF élève —
  ⚠️ pdf-lib minifié : `instanceof`, jamais `constructor.name` —, garde 72 champs +
  anti-gel 15 Mo, comparateur PUR ÉQUITABLE par nature de champ : quantités souples,
  teqCO₂ ±1 %/±0,05 t, identifiants stricts, pavés multi-lignes sans ordre imposé +
  SIRET souple, mention MODE FORMATION jamais exigée) ; modale `correcteur.js`
  (rapport par cadre Juste/Faux/Oublié/Rempli à tort + rapport HTML imprimable,
  échappement complet) ; boutons « Correction élève » (Mouvements + fiche machine,
  mouvements figés hors transfert). `test-correction.mjs` **30/0** sur PDF réels,
  **50 exécutions TOUT VERT**, vérifié navigateur (100 % parfait / 88 % fautif avec
  fautes nommées / équité 100 %).
- **Brique ④ « certificat de scellement + vérificateur autonome » (`c00d264`)** :
  `v8/js/documents/verificateur.js` — `99-VERIFICATEUR.html` embarqué dans CHAQUE
  dossier scellé (point unique `assemblerDossier`) : page autonome hors ligne
  (analyseur ZIP « stored » pur, empreinte globale + comparaison à la référence
  externe, contrôle fichier par fichier contre le manifeste, données hostiles en
  textContent, gardes anti-gel, réserve d'honnêteté sur le verdict interne) +
  **certificat de scellement imprimable** (bouton dans la modale, voyage À CÔTÉ du
  ZIP). La MÊME source est testée sous Node et embarquée. `test-verificateur.mjs`
  **39/0** (dont archives forgées hostiles), **49 exécutions TOUT VERT**, vérifié
  navigateur (dossier réel conforme, falsification détectée ALTÉRÉ, certificat).
- **Brique ③ « dossier de fuite fermé matérialisé » (`827fe9c`)** — le différenciateur
  n°1 : module pur `v8/js/data/dossiers-fuite.js` (dossiers reconstruits des contrôles,
  **épisodes regroupés** — une FUITE sur épisode non refermé rejoint le dossier, statut
  du plus récent = `estFuiteOuverte` —, statuts OUVERTE/REPAREE(+30 j)/FERMEE, fenêtre
  des mouvements, tri intra-jour cohérent R3c/R4) ; écran `#/f/<idContrôle>` + bloc
  « Fuites » sur la fiche machine (les dossiers FERMÉS restent archivés) ; export ZIP
  scellé SHA-256 (synthèse, chronologie auditeur, contrôles, mouvements, CERFA).
  Revue adversariale 2×Opus (0 bloquant ; épisodes + désinfection CR/LF du TXT + garde
  date corrompue corrigés). `test-dossiers-fuite.mjs` **46/0 demo+local**,
  `test-dossier-fuite.mjs` **26/0**, **48 exécutions TOUT VERT**, vérifié navigateur
  (cycle complet ouverte→réparée→fermée sur la fuite démo, port neuf 8177).
- **`docs/ROADMAP.md`** : feuille de route restaurée DANS le dépôt (`f8596f8`).

**FAIT le 10/07 (après l'examen multi-agents)** :
- **Séance 0 « assainissement » (`c8b7dc7`)** : sw.js v7 sabordé (+ désenregistrement actif) ;
  **lanceur global `outils/lancer-tests.mjs`** (toutes les suites en une commande, suites de
  parité jouées demo+local, arrêt au premier rouge) ; CF-22 câblé (bouton « Exporter en
  PDF » du journal, Administration) ; **`amorcerEtablissement()` automatique** dans `inserer()`
  + upserts inventaire (fin des échecs FK sur base fraîche) ; encart Prise en main étape 1
  « Compléter votre établissement » ; `INSTALLATION_SIMPLE.md` conforme à la réalité.
- **Brique ① « Conformité » feu tricolore (`bc2698c`)** : écran « Conformité » (sidebar) —
  moteur pur `v8/js/data/feu-tricolore.js` consolidant getAlertes / peutPasserEnOfficiel /
  verifierChaineHash en 7 domaines tricolores ; garde-fous « jamais tout vert si prérequis
  Officiel manquants » et domaine-filet anti-omission ; test 30/0 demo+local.
- **Brique ② COMPLÈTE (volets A `bb30e4f` + B `1a2a6b5`)** :
  - **Fiche bouteille vivante `#/b/<code>`** (hash QR inchangé, patron fiche machine, lien
    « Fiche » sur les cartes du stock, consultation seule sur bouteille sortie) +
    **chronologie « la vie de la bouteille »** (module pur `v8/js/data/vie-bouteille.js` :
    mouvements opposables vus de la bouteille, contre-écritures appariées, contrepartie des
    transferts, journal — pesées avec valeurs, BSFF, retour, décision).
  - **PRP figé à la validation** (migration 013 `prg_fige`/`prpFige`, HORS empreinte — liste
    blanche du hasseur —, pas de backfill, consigné AUSSI au journal chaîné « · PRP figé N » ;
    trigger WORM recréé = trou migration 8 réparé). Bug latent corrigé : `verification.js`
    omettait `localisationFuite` (sauvegardes avec fuite localisée jugées corrompues à tort).
    IM-5 durci : `peserBouteille` refuse une bouteille sortie du stock (contrat 255/0).
  - **Inventaire NOMINATIF (B7/CF-20)** : `saisirInventaire` fige une PHOTOGRAPHIE
    (bouteilles présentes + fuites ouvertes, migration 014, tables dénormalisées) ; nouvelle
    méthode contrat `getInventaireNominatif(annee)` (surface **66**) avec **ouverture** =
    photo N−1 (état au 01/01) ; section dans la vue Balance ; 2 CSV conditionnels scellés
    dans le dossier d'audit ; export/import complet. ⚠️ Leçons : jamais d'ORDER BY pour un
    ordre contractuel (collation BINARY ≠ localeCompare) ; le trigger du socle ne peut pas
    référencer une colonne posée après le RENAME de la migration 10.
  **45 exécutions TOUT VERT** (suites doublées demo/local : contrat, feu-tricolore,
  prp-fige, inventaire-nominatif). Vérifié navigateur Local + Démo (origines neuves).

Socle **E0→E5** (contrat DataStore + SQLite + coffre-fort + comptes/rôles/sessions) et **V9.1**
(fiche machine + QR) déjà faits. **Phase 2 FAITE et poussée** :
- **Lot 0** — fix des catégories de pièces jointes (migration 010).
- **Lot 1** — paquet portable « clé en main » (Node embarqué, `outils/fabriquer-paquet.mjs`).
- **Référence client** — annuaire des détenteurs, fiche client `#/c/<id>`, machines par client.
- **QR intégral** — code public + étiquette + accès direct pour **clients** (`#/cl/<code>`) et
  **outillage** (`#/o/<code>`, migrations 011/012).
- **Fiche outil vivante** (route `#/o/` = vraie fiche, certificats en pièces jointes).
- **Scellement du dossier d'audit** (empreinte SHA-256, manifeste + empreinte globale du ZIP).
- **Premier lancement guidé par le web** (écran de création admin dans le navigateur) + **gestion
  des comptes** (créer / réinitialiser / activer-désactiver).
- **Dossier de sauvegarde configurable** + alerte si dernière sauvegarde ancienne.
- **Export ZIP « dossier machine » / « dossier client »** scellé (SHA-256).

Contrat **254/0** sur les deux implémentations, toutes les suites `test-*.mjs` à 0 échec.
**Démo en ligne vérifiée fonctionnelle** : https://frigorx.github.io/-inerweb-fluid-cerfa-fi-bsd-4/v8/
(GitHub Pages se republie à chaque push). Working tree **propre**, tout est poussé.

**EXAMEN MULTI-AGENTS du 10/07** (9 agents, lecture seule, constats contre-vérifiés sur pièces —
détail dans la **section G** de `reference_roadmap_fluide_audit.md`, à lire) : le code est **plus
avancé que la feuille de route ne le dit** — B3 et B4 quasi-faits (seuils tCO₂eq et fréquences
12/6/3 mois DÉJÀ codés/testés dans `plaque-fgas.js`, reste le câblage + la confirmation de Franck),
B1 = effort moyen (manque la bascule + le verrou dans `validerMouvement`), la règle d'or de B8 déjà
codée ; **B2 (habilitations) = seul vrai gros chantier du cœur**. Trous produit confirmés : pas de
fiche bouteille, conformité éclatée sur 5 vues, Mouvements sans filtre, guide d'installation faux.

## Feuille de route (détail COMPLET dans `reference_roadmap_fluide_audit.md`)

La feuille de route détaille : les briques restantes prévues (B1-B13), **des extensions au-delà du
prévu** (correction auto du CERFA élève, mode TP guidé, pont inerWeb Édu, tableau de bord de
conformité « feu tricolore », horodatage externe du scellement, sondes Testo BLE, packs pédagogiques
partageables…), ce qui attend Franck, et les atouts vs concurrence. En résumé :
- **À faire sans dépendance à Franck** : **dossier de fuite fermé** (différenciateur n°1),
  inventaire nominatif bouteille par bouteille, sentinelle d'alertes persistées, code machine
  lisible `JR-CF-001` + lien intervention→outils multi, tableau de bord enrichi.
- ⛔ **GATÉ sur la validation réglementaire de Franck (NE PAS coder en dur avant qu'il valide sur
  le texte officiel — arrêté du 21/11/2025)** : **mode Officiel réellement bloquant** +
  **habilitations** (capacité établissement / aptitude personne, catégories 2008 *et* 2025
  A1/A2/B/C/D/E/V) + **calcul auto de la fréquence de contrôle** (seuils tCO₂eq). **LE cœur de
  l'audit-proof.**
- **Différé** : pont Trackdéchets (obligatoire mais lourd), relevés élèves (bloqué RGPD §16.5),
  assistant client (contrats / portail / rapports).

## Méthode de travail (non négociable)

- **Une brique = un commit.** Cycle : tests d'abord → code → revue adversariale du cœur →
  **contrôle navigateur par toi-même** → `CHANGELOG.md` + commit + push (messages en français,
  finir par `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`) → mettre à jour la mémoire.
- **JAMAIS toucher au dossier `data/` réel de Franck** (incident vécu : dossier réel supprimé par
  erreur). Toute vérification navigateur = servir `v8/` en statique sur un **port jetable**
  (ex. `python -m http.server 8140 --directory v8`), **jamais le port 2011**, et sur une
  **origine/port NEUF à chaque session de vérif** (piège payé cher : le cache de modules ES sert
  l'ancien code ; un service worker v7 peut aussi intercepter).
- **Parité stricte** DemoStore (navigateur) ↔ LocalStore (serveur SQLite) : `test-contrat.mjs`
  tourne contre les deux et casse le build à la moindre divergence. Vérifier `local` ET `demo`.
- **Migrations** : jamais de DROP destructif ni de re-hash d'écritures scellées, versions
  consécutives, chaque migration rejouable de zéro. **`PRAGMA recursive_triggers = ON` obligatoire**
  (WORM). Ne jamais modifier `schema.sql` pour une évolution — c'est une migration.
- **QR** = `code_public` opaque (base32 Crockford), encodé en **chemin relatif** (`#/m/…`,
  `#/b/…`, `#/cl/…`, `#/o/…`), jamais d'URL absolue ni de donnée métier/client dans le QR.
- **Zéro dépendance npm nouvelle** (Node natif ; seules libs tolérées : pdf-lib, PDF.js, qrcode).
  **Zéro emoji dans l'interface. Français accentué partout.**
- Sécurité serveur local : garde CSRF/anti-rebinding (Host + Origin) sur le loopback ; le rôle
  n'est jamais lu du corps d'une requête ; ne jamais rendre un PDF non généré par l'application.

## Consignes de Franck (à respecter)

- **Avant chaque tâche de codage**, annoncer en une ligne le **réglage conseillé, EN FRANÇAIS** :
  « Réglage conseillé : [modèle], effort [niveau] » + une ligne de raison. **Niveaux en français** :
  minimal / bas / moyen / élevé / très élevé / maximum (jamais low/medium/high/xhigh/max — Franck
  recopie ça sur son tableau de bord et n'est pas à l'aise avec l'anglais). Franck applique
  lui-même le réglage. Défaut pour le cœur métier : **Opus, effort très élevé** ; tâches bien
  cadrées : Sonnet.
- **Décider sans redemander** quand le choix logique est clair ; ne pas bloquer sur des questions
  inutiles. **Français simple, zéro anglicisme.** Économiser les tokens sans sacrifier la rigueur
  (lire mémoire + CHANGELOG d'abord, carte ciblée, rester concis).
- **Sobriété** : ergonomie et fiabilité d'abord, ne pas complexifier pour pas grand-chose.
- **Ce qui attend Franck** (le lui rappeler, sans le harceler) : le **RGPD élèves** (§16.5, avant
  tout module relevés) ; **révoquer les vieilles clés API v7** (§16.7, faille encore ouverte).
  ⚠️ La **grille réglementaire est RÉGLÉE** (matrice validée fonctionnellement le 14/07) — ne plus
  la lui redemander.

## Prochaine action — TOUS les trous produit non gatés sont fermés (candidats, au choix de Franck)

0. **À la reprise (30 secondes)** : lever la réserve navigateur — un clic sur le bouton
   « Réinitialiser » de la vue Mouvements (port jetable neuf).
1. **V1.5 de la feuille de route** : planche d'étiquettes optimisée, mode TP guidé,
   diagramme enthalpique (intrant FRIGOLO, `docs/intrants-v10/`), pont inerWeb Édu,
   horodatage externe du scellement, packs pédagogiques partageables.
2. **Dettes techniques notées** (`docs/ROADMAP.md` en bas) : `updateBouteille` sans garde
   de statut ; l'import ne vérifie pas l'intégrité référentielle des fluides du candidat ;
   `pieces_jointes.chemin` absolu (restauration cross-machine).
⛔ Toujours GATÉ Franck : blocage dur mode Officiel (+ blocage par-outil), relevés élèves
(RGPD §16.5), Trackdéchets (différé).

Méthode inchangée : réglage conseillé annoncé EN FRANÇAIS, `docs/CARTE-CODE.md` AVANT toute
exploration, tests d'abord (`node outils/lancer-tests.mjs` = tout le filet), revue
adversariale sur le critique seulement (doctrine sobriété : 1 agent suffit sur un incrément
cadré), contrôle navigateur (port JAMAIS utilisé, origine neuve), CHANGELOG + CARTE-CODE +
commit + push + mémoire.

⚠️ À la reprise, `git log` + `git status` d'abord (sessions parallèles possibles).
