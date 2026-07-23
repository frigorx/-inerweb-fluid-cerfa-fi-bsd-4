# PLAN P0-8 — Déclaration annuelle réglementaire (11 rubriques par fluide)

> Écrit le 22/07/2026, AVANT code (méthode des grosses briques). Sources : audit externe
> du 20/07 (constat P0-8 🔶 « double erreur de sens », §6 du rapport = liste des 11 rubriques
> de l'arrêté du 21/11/2025 ; P1-3 « cessions/remise/traitement final »), cartographie de
> compréhension du 22/07 (4 lecteurs : bilan actuel, vues/exports, sources par rubrique,
> RC ChatGPT). **Périmètre A validé par Franck 22/07** (déclaration + 2 captures légères).

## La règle (arrêté du 21/11/2025, §6 du rapport d'audit)

La déclaration annuelle distingue, **par fluide** :

1. acquisitions ;
2. charges en équipements **neufs** ;
3. charges de **maintenance** ;
4. récupérations sur équipements **hors d'usage** ;
5. récupérations de **maintenance** ;
6. remises à un **distributeur** ;
7. **recyclage** sous responsabilité propre ;
8. **régénération** (avec coordonnées de l'installation) ;
9. **destruction** (avec coordonnées de l'installation) ;
10. **cessions** à un opérateur attesté / distributeur / producteur ;
11. **stocks au 1ᵉʳ janvier et au 31 décembre**, séparés en fluide **neuf** et **déchets**.

Deux erreurs de sens à corriger EN PRIORITÉ (audit) : `cessions_kg` est codé à 0 ;
toute masse remise sous **BSFF est comptée comme détruite**, alors qu'un BSFF constate une
**remise** de déchet, pas le procédé final de traitement.

## L'écart actuel (vérifié dans le code)

- L'écran « Bilan annuel » porte le sous-titre **« Tableau de suivi réglementaire par fluide
  — déclaration ADEME »** ([bilan.js:205](../v8/js/views/bilan.js) ; en-tête l.5) et ne
  produit QUE charge / récupéré / en parc — pas les 11 rubriques.
- La **balance matière** (`calculerBalanceMatiere`, [demo-store.js:876](../v8/js/data/demo-store.js) ;
  miroir vue SQL `bilan_matiere` [schema.sql:670](../server/schema.sql)) agrège les charges et
  récupérations **par SIGNE** (`quantiteKg ≥ 0` vs `< 0`) — elle **perd** la distinction
  neuf/maintenance et hors-d'usage/maintenance que le TYPE de mouvement porte pourtant.
- `cessionsKg` = **constante 0** (démo l.888/950 ; SQL `0 AS cessions_kg` schema.sql:733).
- `destructionsKg` = **somme des masses BSFF remises** (démo l.930-934 ; CTE `destructions`
  schema.sql:696-703) — assimile remise = destruction.
- **Aucune** notion de nature de traitement final (recyclage / régénération / destruction) :
  la table `bsff` a un cycle de vie (EN_PREPARATION→…→TRAITE→CLOTURE) et une
  `installation_destination`, mais **pas d'issue de traitement**.
- **Aucune** mutation de cession (`createCession` inexistante).
- Rubrique 11 : `stocksInitiaux` ne connaît que neuf/récupéré (pas neuf/déchet) et il n'y a
  **pas de stock au 31/12 agrégé** — seulement un `stockTheoriqueKg` calculé qui mélange tout.
  La **photo nominative** (`figerPhotoNominative`, demo-store.js:982) capture pourtant déjà
  type + `etatFluide` + statut **par bouteille** → reconstituable.

## Ce qui est DÉJÀ opposable (bonne nouvelle)

Les rubriques **2, 3, 4, 5** viennent quasi gratuitement des mouvements **WORM signés/scellés** :
les 4 types `MISE_EN_SERVICE`, `CHARGE_APPOINT`, `RECUPERATION_DEMANTELEMENT`,
`RECUPERATION_MAINTENANCE` portent exactement la distinction demandée. Il suffit d'**agréger
par type** au lieu du signe. Rubrique 1 = bouteilles NEUVES ; rubrique 6 = `retoursFournisseur`.

## Décisions de périmètre (D1-D8)

| # | Décision | Statut |
|---|----------|--------|
| D1 | **Déclaration = agrégation en LECTURE** `calculerDeclarationAnnuelle(annee)`, module PUR miroir 2 stores (parité stricte, comme `blocage-officiel`/`droit-intervention`) — **agrégation 100 % JS des deux côtés** (pas de vue SQL : on ne touche pas `schema.sql`, base v1 gelée ; le serveur lit les tables via `db.all` et passe au module pur). Ne réécrit pas la balance matière (outil interne conservé) : c'est un **produit distinct**, les 11 rubriques. | TRANCHÉ |
| D2 | Rubriques **2/3/4/5 agrégées PAR TYPE de mouvement** (fin de l'agrégation par signe pour la déclaration ; la balance matière garde son calcul). | TRANCHÉ |
| D3 | **BSFF ≠ destruction** : ajout d'une **issue de traitement final** au cycle BSFF (`issue_traitement` ∈ RECYCLAGE / REGENERATION / DESTRUCTION / AUTRE, + `installation_traitement` + `certificat_traitement` + `date_traitement`, tous NULL tant que non attestés). Mutation `attesterIssueBsff`. Rubrique 9 (destruction) = **UNIQUEMENT** issues DESTRUCTION ; rubrique 8 (régénération) = issues REGENERATION (+ installation). Un BSFF **sans issue** = anomalie « traitement final non attesté », **compté nulle part**. Rigueur = avancement du cycle BSFF existant (pas de sur-WORM). | Périmètre A — validé Franck |
| D4 | **Cessions** : nouvelle trace figée `cessions` (comme `retours_fournisseur`), mutation `createCession` depuis une bouteille (décrémente + trace figée : `destinataireType` ∈ OPERATEUR_ATTESTE / DISTRIBUTEUR / PRODUCTEUR, `destinataireRaisonSociale`, `masseKg`, `date`, PJ, opérateur). Rubrique 10 = somme des cessions. Fin du `0` en dur. | Périmètre A — validé Franck |
| D5 | **Rubrique 7 (recyclage sous responsabilité propre)** = **0** pour cet établissement (aucun recyclage interne — le RECYCLE du référentiel désigne un fluide ACHETÉ certifié, [[cycle matière]]). Ligne déclarée honnêtement à 0, jamais alimentée en interne. Une issue BSFF RECYCLAGE (recyclage EN FILIÈRE par l'opérateur) est distincte : affichée en ligne « recyclage en filière » informative, hors rubrique 7. | TRANCHÉ |
| D6 | **Rubrique 11** dérivée des **photos nominatives** : stock au 1ᵉʳ janvier = photo de clôture N-1 (ou `stocksInitiaux` en repli) ; stock au 31 décembre = photo N. Ventilation **3 seaux honnêtes** : *disponible/neuf* (etatFluide VIERGE/RECYCLE/REGENERE) · *récupéré en attente* (RECUPERE/MELANGE/DOUTEUX) · *déchet* (etatFluide DECHET **ou** statut DECHET). L'arrêté demande neuf/déchet : les 3 seaux sont plus fins et honnêtes (le récupéré-en-attente n'est ni l'un ni l'autre). | TRANCHÉ |
| D7 | **Retrait du libellé « déclaration ADEME »** → « Matrice préparatoire — à valider par l'organisme agréé » + bandeau d'**anomalies** (photos manquantes, BSFF sans issue attestée, cessions sans PJ). `complet = anomalies.length === 0`. On ne prétend jamais produire le CERFA officiel. | TRANCHÉ (audit) |
| D8 | **Renvoyé à P1-3** (consigné, non bloquant P0-8) : n° d'agrément + identité structurée du distributeur (rubrique 6), réapprovisionnement d'une bouteille NEUVE existante compté en acquisition (rubrique 1), saisie UI du stock initial, intégration Trackdéchets, durcissement WORM/hash-chain des cessions et traitements finaux si l'organisme agréé l'exige (aujourd'hui `retours_fournisseur` lui-même n'est pas WORM — cohérence). | Consigné |

## Migrations

Nous sommes à **27** (`type_installation`, P0-6). P0-8 pose **28** (issue BSFF, colonnes sur
`bsff`) et **29** (table `cessions`). ⚠️ La RC ChatGPT numérote 27/28 différemment (collision
avec notre 27) : on **pioche la logique, jamais les migrations en bloc**.

## Sous-briques (chaque brique = tests verts `node outils/lancer-tests.mjs --tout` + commit)

1. **DA-1 — schéma des 2 captures** : migration 28 (`bsff.issue_traitement` +
   `installation_traitement` + `certificat_traitement` + `date_traitement`, CHECK sur l'issue,
   tous nullable) ; migration 29 (table `cessions` : id, etablissement_id, bouteille_id,
   bouteille_code figé, fluide, destinataire_type CHECK, destinataire_raison_sociale, masse_kg,
   date_cession, operateur, observation, date_creation) + index. ⚠️ **PAS de `schema.sql`** :
   c'est la base **v1 gelée** (jamais modifiée après coup ; comme `type_installation`, tout
   passe par les migrations). `mapping.js` (colonnes bsff + table cessions). Test-migrations
   (base v1→29 rejouable de zéro).
2. **DA-2 — `attesterIssueBsff`** (2 stores, parité) : avance un BSFF vers TRAITE avec l'issue
   + installation + certificat + date ; gardes (BSFF existant, issue dans la grille, pas déjà
   attesté autrement — ou ré-attestation consignée). Test-contrat doublé + parité.
3. **DA-3 — `createCession`** (2 stores, parité) : cession scellée depuis une bouteille
   (décrémente la masse, trace figée destinataire attesté + PJ) ; gardes (bouteille, masse ≤
   contenu, destinataire dans la grille, fluide). Test-contrat doublé + parité.
4. **DA-4 — cœur `calculerDeclarationAnnuelle(annee)`** : module PUR `v8/js/data/declaration-annuelle.js`
   (+ miroir serveur) produisant, par fluide, les 11 rubriques (2/3/4/5 par TYPE ; 9 = issues
   DESTRUCTION ; 8 = REGENERATION ; 10 = cessions ; 11 = 3 seaux depuis photos). Arrondi
   centralisé `arrondir`. Suite dédiée `test-declaration-annuelle` (scénario multi-fluides
   couvrant chaque rubrique + réconciliation avec stock initial/final).
5. **DA-5 — anomalies + `getDeclarationAnnuelle`** (2 stores) : { annee, lignes, anomalies,
   complet } ; anomalies = photo N-1 absente, photo N absente, BSFF sans issue attestée
   (nombre + masse), cessions sans PJ. Parité.
6. **DA-6 — vue + CSV + retrait ADEME** : refonte `bilan.js` (ou vue `declaration.js`) :
   tableau 11 rubriques, export CSV fr (`;`, BOM, CRLF, virgule décimale), bandeau anomalies,
   sous-titre « Matrice préparatoire — à valider par l'organisme agréé ». UI **légère** pour
   `attesterIssueBsff` (depuis la vue BSFF) et `createCession` (depuis la balance/stock). Vérif
   NAVIGATEUR (port jetable, mode démo, zéro erreur console).
7. **DA-7 — dossier d'audit** : `declaration-annuelle.csv` dans le ZIP scellé (`exports.js`) ;
   `cessions.csv` + issue BSFF dans `bsff.csv`. Monde démo enrichi (au moins 1 cession + 1 BSFF
   attesté DESTRUCTION + 1 REGENERATION, dates relatives) pour que la déclaration soit non triviale.
8. **DA-8 — docs + revue adversariale** : CHANGELOG, CARTE-CODE (2 modules + 2 tables),
   PROMPT-REPRISE ; revue adversariale ciblée (1 agent, constats tirés) AVANT le commit final ;
   PR pour relecture Franck (comme P0-5/P0-6).

## Invariants à ne jamais casser

- **Parité stricte démo ↔ serveur** sur toute méthode et tout calcul (suites doublées).
- Le mode **Officiel reste FERMÉ** (`VERROU_LIVRAISON=true`) — P0-8 ne le rouvre pas.
- **Jamais toucher au `data/` réel** : vérif = port + base jetables.
- La **balance matière** interne (`calculerBalanceMatiere`) N'EST PAS supprimée : la déclaration
  est un produit distinct qui coexiste (on n'élague pas un outil qui marche).
- `cessionsKg`/`destructionsKg` de la balance matière : à **réconcilier** avec les nouvelles
  sources (la cession alimente enfin `cessionsKg` ; le BSFF reste la « remise en filière », la
  balance peut garder `destructionsKg` = masses remises OU basculer sur issues attestées — à
  trancher en DA-4, décision consignée).
