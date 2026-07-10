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
   `MEMORY.md`, puis la fiche `project_inerweb_fluide.md` et la feuille de route
   `reference_roadmap_fluide_audit.md`.
2. **Dépôt `C:\git\inerweb-fluide`** : `docs/REPRISE.md` (état + pièges), `CHANGELOG.md`
   (**source de vérité**, entrées les plus récentes en tête), `docs/PLAN-PHASE-2.md`,
   `docs/VISION-V9-V10.md` (la boussole).

## État exact (dernier commit poussé `1a2a6b5`, 10/07/2026)

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

*(Séance 0, briques ① et ② : FAITES le 10/07, cf. « État exact » ci-dessus.)*

Briques **sans dépendance à Franck**, dans l'ordre (fort impact démo) :
**③ dossier de fuite fermé matérialisé** (la règle d'or est déjà codée/testée — retour
EN_SERVICE impossible sans réparation tracée + contrôle conforme postérieur ; construire
l'écran CHRONOLOGIE de la fuite + l'export — différenciateur n°1, aucun concurrent ne le
documente) → **④ certificat de scellement + vérificateur HTML autonome embarqué dans chaque
ZIP** (preuve auto-vérifiable par un auditeur sans le logiciel — meilleur rapport
impact/effort selon l'examen du 10/07) → **⑤ correction automatique du CERFA rempli par
l'élève** (v1 bornée aux PDF remplis numériquement). Sauf nouvelle consigne de Franck.
Annoncer le réglage conseillé, puis exécuter (tests d'abord — `node outils/lancer-tests.mjs`
= tout le filet en une commande —, vérification navigateur sur port JAMAIS UTILISÉ (origine
neuve, le cache de modules ES survit à tout), commit + push + mémoire).
⚠️ Dettes notées en revue (brique ②, à traiter avec les habilitations B2) : `updateBouteille`
sans garde de statut ; `prpFige` falsifiable dans un export édité à la main (recoupement =
journal chaîné) ; l'import ne vérifie pas l'intégrité référentielle des fluides du candidat.

Dès que Franck fournit la **grille réglementaire officielle**, basculer sur le **cœur audit-proof**
(mode Officiel bloquant + habilitations 2008/2025 + fréquence de contrôle auto) — c'est ce qui rend
le logiciel « irréprochable en audit ».
