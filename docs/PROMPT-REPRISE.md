# Prompt de démarrage — inerWeb Fluide, chantier « REGISTRE AUDIT-PROOF » (à coller dans un nouveau chat)

> Copier tout ce qui suit comme PREMIER message d'un nouveau chat. Il est autonome : contexte, état
> exact, cap, première brique, gates, méthode et consignes.

---

Tu reprends **inerWeb Fluide**, logiciel **LOCAL** de traçabilité des fluides frigorigènes
(F-Gas / CERFA 15497*04) pour lycées professionnels (filière froid/clim).
- **Dépôt** : `C:\git\inerweb-fluide` (clone de `frigorx/-inerweb-fluid-cerfa-fi-bsd-4`, GitHub Pages).
  Source de vérité = son `CHANGELOG.md`.
- **Auteur et utilisateur** : Franck Henninot (LP Jacques Raynaud, Marseille). Réponds en **français
  simple, zéro anglicisme, zéro emoji dans le code**.

## LE CAP (le chantier)

Transformer inerWeb Fluide en **REGISTRE RÉGLEMENTAIRE DÉMONTRABLE** pour la **rentrée septembre 2026**.
Objectif à rendre techniquement vrai **et couvert par des tests** :

> « Toute fiche officielle est contrôlée avant validation, signée par les bonnes personnes, figée avec
> son PDF original, chaînée aux écritures précédentes, sauvegardée hors du poste, et restituable avec
> toutes ses preuves. »

On ne promet **pas** « inviolable » (aucun monoposte ne le peut) : on promet **démontrable**.
**LA feuille de route complète = `docs/PLAN-AUDIT-PROOF-2026.md`** (6 conditions + dossier d'audit +
sécurité/RGPD + plan temporel, chacun avec son état actuel et son point de blocage). **LIS-LA EN PREMIER.**

## À LIRE EN PREMIER (avant de coder)

1. **Mémoire** (`G:\Mon Drive\claude-memoire\`) : `MEMORY.md` puis `project_inerweb_fluide.md`.
2. **`docs/PLAN-AUDIT-PROOF-2026.md`** — le plan du chantier.
3. Tête de **`CHANGELOG.md`** — dernier état, incrément le plus récent en tête.
4. **`docs/CARTE-CODE.md`** — l'architecture en une page, AVANT toute exploration.
5. `git log` + `git status` — ⚠️ **des sessions parallèles écrivent sur ce dépôt** : vérifie avant d'écrire.

## ÉTAT AU 15/07/2026 (dernier commit poussé `2b6c228`)

- **Audit externe (ChatGPT)** mené sur le code source complet : socle **SAIN**, 71 tests verts,
  sécurité **prouvée en conditions réelles** (écoute 127.0.0.1, garde Host/Origin, scrypt + verrou
  5 échecs, WORM inviolable même par SQL direct, AES-256-GCM réel, rôles). Rapports **INTERNES gitignorés**
  `docs/AUDIT-COMPLET-2026-07-15.md` et `docs/DOSSIER-TECHNIQUE.md`.
- **Correctifs poussés** : verrou du **mode Officiel côté serveur** (l'API refuse `mode:'OFFICIEL'`),
  **CERFA de contrôle** (migration 19 : numéro + mode ; contrôle autonome = `C-FORM-…`, espace disjoint
  des mouvements), **R-1234yf PRP 1→4** (migration 20), wording « inaltérable au sein de l'application »,
  doc sauvegarde honnête, contact `SECURITE.md`. Paquet public **v1.0.1** (via une session parallèle :
  licence Node.js + `X-Frame-Options`).
- **Le mode Officiel est FERMÉ** (le serveur refuse `OFFICIEL`) et le reste **jusqu'à ce que les
  conditions 1→4 du plan soient prêtes ET testées**. On ne rouvre l'officiel que quand une fiche
  officielle est réellement démontrable.

## LA PREMIÈRE BRIQUE (par où commencer)

**Le MOTEUR RÉGLEMENTAIRE UNIQUE (condition 1) = le fondement.** Aujourd'hui les règles sont dupliquées
(`v8/js/documents/plaque-fgas.js`, `v8/js/cerfa/generateur.js`, `server/api.js`). Il faut un **seul
module serveur** : famille + composition (HFC/HFO/PFC/HCFC/HC) + PRP et sa source + classe de sécurité +
teqCO₂ + seuils/périodicités + double signature + règles selon la date.

**Premier pas concret** : **PRÉPARER la table réglementaire des fluides** — une fiche **explicite** par
gaz (`contientHFC / contientHFO / traitementCadre7 / PRP + source / classe / seuils`), à partir des
valeurs actuelles ET de la **notice officielle du CERFA 15497*04**, et la **SOUMETTRE à Franck pour
validation** (lui + son référent F-Gas) **avant** tout code en dur. Plus de `famille.includes("HFO")`.

⚠️ **Deux bugs réglementaires reproduits par l'audit, à corriger dans le moteur** :
1. **Mélanges HFO/HFC** (ex. R-455A) : la notice CERFA demande de les traiter **comme des HFC**
   (seuil en teqCO₂). Aujourd'hui R-455A est seuillé à tort → contrôle annuel alors qu'il est < 5 tCO₂eq.
2. **Périodicité** : la calculer sur la **charge TOTALE déclarée** de l'équipement (cumul des circuits),
   **pas** `chargeActuelleKg` (une fuite/récupération ne doit pas effacer l'obligation de contrôle).

Puis : batterie de tests **aux valeurs limites** (sous / sur / au-dessus de chaque seuil ; HFC purs ;
mélanges ; HFO purs ; HCFC ; PFC ; CO₂/NH₃/HC hors périmètre ; détection présente/absente/expirée ;
multi-circuits). Ensuite seulement : condition 2 (blocage dur officiel complet), 3 (double signature),
4 (empreinte renforcée + PDF scellé), 5 (scellement externe), 6 (sauvegardes auto). Ordre et
dépendances : voir le plan. (La feuille de paramétrage des gaz — createFluide/updateFluide, plan prêt —
devient une brique de ce moteur : la table réglementaire éditable par le professeur.)

## LES GATES (blocages hors code — à obtenir de Franck, ne pas les contourner)

- **Franck + référent F-Gas** : valider la table réglementaire, la liste des conditions bloquantes du
  mode officiel, le parcours de double signature. **RÈGLE ABSOLUE : ne JAMAIS coder une valeur ou une
  règle réglementaire sans la validation de Franck.**
- **DPD du lycée** : relire la notice RGPD.
- **DSI du lycée** : emplacement extérieur du scellement quotidien (condition 5).

## MÉTHODE (règle d'or, ne rien casser)

- **Réglage à annoncer avant chaque tâche de code** : cœur réglementaire → **Opus effort MAX** ;
  refactoring cadré multi-fichiers → Opus high ; mécanique/renommage → Sonnet medium.
- **carte → vérifier → modif chirurgicale → TESTS VERTS → commit.** `node outils/lancer-tests.mjs`
  doit être **TOUT VERT (71 exécutions)** avant tout commit.
- **Parité stricte DemoStore (`v8/js/data/demo-store.js`) / LocalStore (`server/api.js`)** : prouvée par
  `test-contrat.mjs` joué contre **demo ET local**. `server/mapping.js` **lève sur toute clé inconnue**
  (anti-dérive) → déclarer les nouveaux champs des deux côtés.
- **Vérification dynamique** : serveur sur **PORT jetable** + **`IWF_CHEMIN_BASE` base jetable**
  (JAMAIS le port 2011 ni le `data/` réel de Franck). ⚠️ Le corps des requêtes API est enveloppé
  **`{params:{...}}`** (les champs à plat donnent un faux « incorrect »). **Tirer les failles, pas les lire.**
- **Empreinte de hash des mouvements** (`server/hash-mouvement.js` = clone exact de `v8/js/core/utils.js`,
  verrouillé par `server/test-hash-mouvement.mjs`) : NE PAS la modifier à la légère (change les empreintes).
  La **condition 4** (empreinte couvrant signature + identité + PDF) la touchera → plan + migration + tests.
- **Migrations** : registre `server/migrations.js` jusqu'à **20**, prochaine = **21**. Table `controles` =
  hors WORM (librement mutable). Les triggers WORM sur `mouvements`/`journal_audit` sont recréés à chaque
  migration touchant `mouvements`. `PRAGMA recursive_triggers = ON` obligatoire (ne jamais retirer).
- **Sessions parallèles** : `git log` + `git status` **avant** d'écrire ; commits multi-lignes via
  `git commit -F` (jamais le here-string). Le dépôt est public : push quand Franck l'attend.

## DÉCISIONS ACTÉES (ne pas rouvrir sans raison)

- **Licence** : PolyForm Noncommercial + **certificats nominatifs** gratuits que Franck accorde au cas par
  cas (le « numéro de licence » = véhicule juridique du don + capture de contact ; PAS de DRM).
- **PRP figé** à la validation = **NON rétroactif** : modifier le GWP d'un fluide n'affecte que les futurs
  mouvements ; les fiches validées gardent leur valeur d'époque. C'est voulu (protège l'historique).
- **Rapports internes gitignorés** (`docs/DOSSIER-TECHNIQUE.md`, `docs/AUDIT-COMPLET-2026-07-15.md`) : jamais
  publics (ils détaillent les limites/tests d'intrusion). Franck a tranché « **assumer** » l'audit-qualité
  et la roadmap déjà publics.

## CE QUI ATTEND FRANCK (hors code)

Bascule DNS chez OVH pour `inerweb.ovh` (créer le fichier `CNAME` **APRÈS** propagation vérifiée),
validation du texte de la vitrine, relecture de `RGPD.md`, + les **gates réglementaires** ci-dessus.
**Rythme** : été (corriger + tester aux limites) → août (essai complet en données fictives + **journée de
simulation d'audit** avec un professionnel extérieur) → **septembre : fonctionnement EN PARALLÈLE** 2 à
4 semaines avec la procédure actuelle **avant** bascule. **Ne pas basculer sans période parallèle.**
