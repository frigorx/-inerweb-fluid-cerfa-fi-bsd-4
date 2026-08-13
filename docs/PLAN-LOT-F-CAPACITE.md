# Plan lot F (13/08/2026, carte blanche) — la portée de capacité de l'établissement est LUE

> Blocage n° 1 de la 4e relecture externe (27/07), TIRÉ par elle : avec le seul verrou
> désarmé dans une copie jetable, une récupération de 8 kg sur une machine de 50 kg
> devenait une fiche OFFICIELLE scellée alors que l'établissement était déclaré
> « catégorie II, contrôle d'étanchéité seul ». `categoriesAutorisees` /
> `activitesAutorisees` étaient saisies, validées en forme, stockées, affichées — et
> lues par AUCUNE règle. Sans effet aujourd'hui (verrou fermé) ; bloquant avant toute
> réouverture.

## Décisions de conception (aucune valeur réglementaire NOUVELLE)

1. **Le verdict de portée réutilise la matrice d'aptitude EXISTANTE**
   (`verifierDroitIntervention`, mêmes catégories, mêmes seuils, mêmes messages) : les
   `categoriesAutorisees` de l'établissement y entrent comme des habilitations, le
   régime étant déduit de la catégorie (I-IV → 2008, A1…V → 2025 — bijectif). La grille
   de l'arrêté n'est écrite qu'à UN endroit du dépôt, elle le reste.
2. **L'activité déclarée doit couvrir le type d'intervention** : opération normalisée
   (mapping existant `operationNormalisee`) → activité réglementée requise
   (INSTALLATION → MISE_EN_SERVICE, MAINTENANCE → MAINTENANCE, ETANCHEITE → CONTROLE,
   RECUPERATION → RECUPERATION).
3. **Une portée vide n'autorise rien** : aucune catégorie déclarée, ou activité requise
   absente → refus motivé. Le doute retire l'allègement, jamais l'obligation.
4. **Condition 19 `CAPACITE_ETABLISSEMENT`** dans le moteur de blocage (pur + miroir),
   posée à partir de la SOUMISSION, sur fait précalculé par les deux
   `cadreFicheOfficiel`. Jamais en doublon des conditions 1-4 : sans attestation
   déclarée, elles seules parlent (patron de la condition 16).
5. **Les trois portes voisines** : la grille de saisie de l'établissement accepte les
   DEUX régimes (I-IV et A1…V — elle refusait le 2025) ; l'import JSON VALIDE la portée
   candidate (catégories connues, activités connues) ; la colonne SQL `categories_2025`
   qui portait la grille 2008 est renommée `categories_autorisees` (migration 37,
   RENAME COLUMN — non destructif ; `schema.sql` reste le socle v1, intouché).

## Briques

- F1 : `capaciteEtablissementCouvre` — `v8/js/data/habilitations.js` (pur) + miroir
  littéral `server/droit-intervention.js`, parité prouvée par `test-droit-intervention`.
- F2 : fait `capaciteEtablissement` posé par les deux `cadreFicheOfficiel`
  (`server/api.js`, `v8/js/data/demo-store.js`).
- F3 : condition 19 dans `v8/js/data/blocage-officiel.js` + miroir
  `server/blocage-officiel.js` ; `docs/CONDITIONS-BLOCANTES-OFFICIEL.md` complété.
- F4 : grille de saisie élargie (2 stores) · invariants d'import (portée candidate
  validée) · migration 37 (renommage de colonne) + `mapping.js`.
- F5 : preuves — suite neuve doublée `test-capacite-etablissement` : le scénario EXACT
  du constat (cat. II + contrôle seul → récupération 8 kg REFUSÉE par
  `simulerValidationOfficielle`), portée vide refusée, portée couvrante ACCEPTÉE
  (catégorie I toutes activités — pas de sur-blocage), régime 2025 enregistrable,
  import d'une portée forgée refusé. Contre-épreuve tirée : condition retirée → rouge.

## Ce que ce lot NE fait PAS

- Il ne rouvre pas le mode Officiel (`VERROU_LIVRAISON` inchangé, la condition est
  inerte tant que le verrou est fermé — patron de la condition 17).
- Il n'invente pas de grille « capacité entreprise » distincte : à la date du plan, la
  seule matrice opposable du dépôt est celle de l'aptitude ; si l'organisme
  certificateur en impose une autre, elle remplacera la délégation en UN endroit.
- Il ne touche pas à l'écran (la garde de saisie du navigateur existe déjà).
