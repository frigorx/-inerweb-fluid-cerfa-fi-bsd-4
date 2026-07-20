# Plan — Cycle matière : conservation du fluide par machine (REFONDU 20/07)

> **Statut : REFONDU après corrections métier de Franck (frigoriste), 20/07.**
> Le fondement de l'audit externe (« interdire la charge depuis récupéré + imposer
> un traitement recyclage/régénération prouvé ») était **FAUX** pour le réemploi en
> maintenance. Ce plan repart de la règle métier réelle. Décisions §9 mineures
> (je propose, Franck corrige). Rien n'est codé.

## 0. Pourquoi cette refonte (le fondement a changé)

L'audit ChatGPT + la RC ont modélisé un **blocage** de la charge depuis du récupéré et
une **table de traitement WORM** (recyclage/régénération prouvé) comme passage obligé.
Franck a corrigé en trois temps :

1. **On a le droit de remettre dans une machine le fluide qu'on vient d'en tirer**, sans
   retraitement. Appliquer le blocage RC empêchait un geste légal et quotidien.
2. **Règle de conservation par machine d'origine** : on ne réintroduit dans M que ce
   qui a été récupéré de M ; le complément est du fluide **acheté**.
3. **Le logiciel doit pouvoir INTÉGRER du fluide régénéré ACHETÉ** (certifié
   fournisseur), sans jamais le **produire** en interne (ils ne régénèrent pas).

→ Le cœur bloquant de « P0-3 » et la **table de traitement WORM** de la RC **tombent**.
Ce qui reste : une **traçabilité de conservation** (fluide récupéré ↔ sa machine) et la
**saisie du fluide acheté** (vierge / recyclé / régénéré certifié).

## 1. La règle métier (validée Franck)

Le fluide qu'on peut charger dans une machine M vient de deux sources :
- **(a) réemploi** : le propre fluide de M, récupéré puis réintroduit — **dans la limite
  de ce qui a été récupéré de M** ;
- **(b) fluide acheté** : bouteille NEUVE de fluide **vierge**, **recyclé** ou
  **régénéré** certifié fournisseur.

Anomalies / interdits :
- réintroduire dans M **plus que le lot d'origine M** disponible dans la bouteille →
  **surcharge = anomalie** : signalée, **forçable** ; si forcée, le CERFA est marqué
  **« forcé manuellement »** et une **erreur à rectifier** est enregistrée
  (contre-écriture). Conseil en Formation ; en Officiel la rectification est exigée ;
- **pas de production interne** de recyclé/régénéré : le récupéré reste `RECUPERE` →
  réemploi sur sa machine, sinon **déchet** (BSFF) ;
- `MELANGE` / `DOUTEUX` / `DECHET` ne chargent jamais (déjà en place).

Traçabilité : par **numéro de bouteille** + **machine d'origine** ; **2 CERFA** distincts
quand récupération et réintroduction sont différées (déjà le cas — 2 mouvements scellés).

## 2. États du fluide (clarifiés)

| État | Signification (chez Franck) | Porté par | Chargeable ? |
|---|---|---|---|
| `VIERGE` | neuf acheté | bouteille NEUVE | oui |
| `RECYCLE` / `REGENERE` | **acheté certifié fournisseur** (jamais produit en interne) | bouteille NEUVE, BL/certificat en PJ | oui |
| `RECUPERE` | propre fluide des machines, ventilé par machine d'origine | bouteille RÉCUPÉRATION | **réemploi seul** (≤ lot d'origine) |
| `DOUTEUX` / `MELANGE` / `DECHET` | non requalifiable, sortie = déchet | bouteille RÉCUPÉRATION/DÉCHET | non |

**Règle de cohérence** : `RECYCLE`/`REGENERE` ⟺ bouteille **NEUVE** (achat) ; une bouteille
de RÉCUPÉRATION ne devient jamais recyclé/régénéré (pas de traitement interne). On ne
**verrouille pas** l'état d'une bouteille NEUVE (contrairement à la RC) — on l'ouvre à
`VIERGE`/`RECYCLE`/`REGENERE` et on trace le certificat fournisseur.

## 3. Modèle de données — DÉRIVÉ, rien de nouveau à stocker

**Le registre de mouvements par bouteille existe déjà** (`vie-bouteille.js` : chaque
mouvement, opérateur, n° de CERFA cliquable). L'« avoir de fluide d'origine machine M
dans une bouteille B » s'en **dérive** directement, sans nouvelle structure :
`avoir(M, B) = Σ récupérations (M → B) − Σ réemplois (B → M)` sur les mouvements ACTIFS
(`VALIDE`, hors contre-écritures), aux mêmes conventions de signe que
`variationPourBouteille` (récupération `quantiteKg` négative, charge positive).

- **Aucune migration, aucune colonne, aucun JSON à maintenir en parité** — juste un
  **module pur** `avoir-origine.js` (patron `vie-bouteille.js`), recopié en littéral côté
  serveur, prouvé par un test de parité. Leçon « élaguer plutôt qu'empiler », à fond ; la
  vérité opposable reste les **mouvements déjà scellés**.
- **Point délicat** : le **transfert** entre bouteilles déplace du fluide sans machine
  d'origine explicite → il brouille l'origine. V1 : le fluide issu d'un transfert n'a pas
  d'avoir d'origine (un réemploi qui s'y appuierait est signalé comme anomalie). À
  affiner (§9).
- **Saisie du fluide acheté** : une bouteille NEUVE `RECYCLE`/`REGENERE` reste autorisée,
  certificat/BL fournisseur en PJ.

## 4. Règles à la charge (conseil Formation / anomalie forçable / Officiel exige rectif.)

- Charge M depuis bouteille **NEUVE** (vierge/recyclé/régénéré acheté) : **libre**
  (croisement de fluide déjà vérifié).
- Charge M depuis bouteille **RÉCUPÉRATION** = réemploi : quantité chargée ≤
  `disponible_origine_M` (somme des lots de la bouteille dont l'origine est M) ; débit du
  lot de M.
  - dépassement → **anomalie surcharge** (on met du fluide qui ne vient pas de M dans M) :
    signalée ; forçable ; si forcée → CERFA « forcé manuellement » + erreur à rectifier.

## 5. CERFA

- 2 mouvements = 2 CERFA (récupération, puis réintroduction), reliés par le n° de
  bouteille (mécanique existante).
- Cadre matière : cases `QA` (vierge) / `QB` (recyclé) / `QC` (régénéré) déjà mappées sur
  `etat_fluide` de la source achetée. Le **réemploi du propre fluide de M** est neutre
  (fluide qui appartient déjà à l'installation) — traitement CERFA à préciser (§9).
- Marque **« forcé manuellement »** + mention d'anomalie en cas de surcharge.

## 6. Ce qui TOMBE (vs plan v2 / RC)

- Blocage « charge depuis récupéré » (faux positif de l'audit) → **supprimé**.
- Gate **D3** (bimodal de blocage de charge) → **sans objet**.
- Table `traitements_fluide` WORM + hasseur dédié + `verifierChaineTraitementsFluide` +
  round-trip + ancrage certificat → **hors périmètre** (pas de traitement interne). Les
  trois BLOQUANTS/IMPORTANTS des revues portaient sur cette table : ils **disparaissent
  avec elle**. (Le travail d'analyse reste consigné si un jour Franck régénère en
  interne — improbable.)
- Verrou de l'état d'une bouteille NEUVE → **on garde ouvert** (intégration du régénéré
  acheté).

## 7. Ce qui RESTE valable

- **Parité stricte** api ↔ demo : la colonne `lots_origine` déclarée des deux côtés de
  `mapping.js` (qui lève sur clé inconnue), 2 miroirs, suites doublées.
- **Anomalie / rectification par contre-écriture** : mécanisme existant à réutiliser.
- **Vérif dynamique** sur base + port jetables ; `data/` réel jamais touché ; corps API
  `{params:{...}}`.
- Mode Officiel reste **FERMÉ** (`VERROU_LIVRAISON=true`) tout du long.

## 8. Découpage (une sous-brique = code + tests verts + revue + commit)

- **CM-1 — Module pur `avoir-origine.js`.** Dérive l'avoir de fluide par machine
  d'origine dans une bouteille, depuis les mouvements (aucune migration). Recopié en
  littéral côté serveur, test de parité. *Tests : avoir après récupération, après réemploi
  partiel/total, après contre-écriture, multi-origines, transfert (brouillage).* **Opus,
  effort high** (module pur, plus de migration immuable → risque abaissé).
- **CM-2 — Règle de réemploi + anomalie de surcharge.** `disponible_origine_M`, débit du
  lot à la charge, détection de surcharge → signalement + forçage + CERFA « forcé
  manuellement » + erreur à rectifier (conseil Formation / rectif. Officiel). *Tests
  d'acceptation : réemploi ≤ récupéré OK ; surcharge signalée/forçable ; complément
  acheté (NEUVE) OK.* **Opus, effort xhigh.**
- **CM-3 — Fluide acheté régénéré/recyclé.** Garantir la saisie d'une bouteille NEUVE
  `RECYCLE`/`REGENERE` + certificat fournisseur en PJ ; cohérence `RECYCLE`/`REGENERE` ⟺
  NEUVE ; CERFA `QB`/`QC`. *Tests : bouteille NEUVE régénérée saisissable et chargeable ;
  récupération jamais promue en interne.* **Opus, effort high.**
- **CM-4 — Surfaces.** CERFA (réemploi + anomalie forcée), vues (lot d'origine et avoir
  par machine visibles sur la bouteille), balance matière. *Vérif NAVIGATEUR port
  jetable.* **Opus, effort high.**

## 9. Décisions restantes (mineures — je propose, Franck corrige)

- **Traitement CERFA du réemploi** du propre fluide de M : mention neutre / pas de case
  QA-QC (à confirmer avec le référent au besoin).
- **`deciderFluideRecupere`** : on garde « à analyser » / « déchet » (utile pour orienter
  un récupéré douteux vers le déchet) ; « réutilisable » n'a plus de rôle bloquant (le
  réemploi est le défaut).
- **Forçage de surcharge** : libre en Formation ; en Officiel, l'anomalie doit être
  rectifiée avant clôture propre.

## Point dur (§8, à traiter dans CM-1)

Le **transfert** entre bouteilles doit **propager les lots d'origine** (le fluide
d'origine M passé de la bouteille B à B′ reste « d'origine M »), sinon on perdrait la
traçabilité en déplaçant du fluide. C'est le seul endroit délicat du modèle.
