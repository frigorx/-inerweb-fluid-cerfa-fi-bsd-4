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

## État exact (dernier commit poussé `2f0c537`, 13/07/2026)

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
- **Ce qui attend Franck** (le lui rappeler, sans le harceler) : la **grille réglementaire** (qui
  débloque le cœur audit) ; le **RGPD élèves** (§16.5, avant tout module relevés) ; **révoquer les
  vieilles clés API v7** (§16.7, faille encore ouverte, à faire indépendamment).

## Prochaine action

*(Séance 0 + briques ① à ⑥ : TOUTES FAITES les 10 et 13/07 — la sentinelle d'alertes
persistées est SOLDÉE le 13/07.)*

Briques suivantes **sans dépendance à Franck**, dans l'ordre :
**code machine lisible `SITE-FAMILLE-NUMERO`** (ex. `JR-CF-001`, décision Franck 07/07 —
le `code_public` opaque du QR reste distinct et inchangé) → **lien intervention → outils
utilisés MULTI-outils** (+ blocage par-outil non conforme en mode officiel) → **tableau
de bord enrichi**. Sauf nouvelle consigne de Franck.
Annoncer le réglage conseillé, puis exécuter (tests d'abord — `node outils/lancer-tests.mjs`
= tout le filet en une commande —, vérification navigateur sur port JAMAIS UTILISÉ (origine
neuve, le cache de modules ES survit à tout), commit + push + mémoire).
⚠️ Dettes notées en revue (brique ②, à traiter avec les habilitations B2) : `updateBouteille`
sans garde de statut ; `prpFige` falsifiable dans un export édité à la main (recoupement =
journal chaîné) ; l'import ne vérifie pas l'intégrité référentielle des fluides du candidat.

Dès que Franck fournit la **grille réglementaire officielle**, basculer sur le **cœur audit-proof**
(mode Officiel bloquant + habilitations 2008/2025 + fréquence de contrôle auto) — c'est ce qui rend
le logiciel « irréprochable en audit ».
