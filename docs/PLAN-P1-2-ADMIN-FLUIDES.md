# PLAN P1-2 — ÉCRAN D'ADMINISTRATION DU RÉFÉRENTIEL DES FLUIDES

> Statut : **PLAN — aucune ligne de code écrite.** Les décisions D1→D7 sont
> **gatées Franck** : rien ne part avant ses arbitrages (méthode P0-6 : les
> décisions AVANT le code, pas pendant).
>
> Besoin, mot pour mot : « on doit pouvoir accéder à un tableau où tous les gaz
> sont rentrés, en ajouter de nouveaux ou modifier les informations ».
> Objectif réel : **autonomie** — ne plus dépendre d'un développeur (donc d'une
> migration) pour corriger un PRP ou déclarer un fluide.
>
> Constat d'audit correspondant (P1-2, 🔶) : « référentiel trop court (9
> entrées), pas d'écran d'administration, risque de repli PRP/famille pour un
> fluide hors table ».

---

## 1. État de départ — VÉRIFIÉ dans le code (pas de mémoire, pas de suppositions)

| Fait | Preuve |
|---|---|
| Le contrat n'a que `getFluides` (lecture). **Aucune mutation fluide n'existe.** | `v8/js/data/contrat.js:132` |
| Contrat = **91 méthodes**, `VERSION_CONTRAT` 8 | `test-contrat.mjs:122` |
| Table `fluides` : `code` (PK), `famille`, `gwp_ar4`, `classe_securite` (CHECK 8 valeurs), `statut_reglementaire` (CHECK AUTORISE/RESTREINT/INTERDIT), `commentaire` | `server/schema.sql:33-42` |
| + fiche réglementaire migration 21 : `contient_hfc`, `contient_hfo`, `categorie_cadre7` (CHECK HFC/HFO/HCFC/AUCUNE), `source_prp` | `server/migrations.js:1005-1010` |
| Table `fluides` **HORS WORM** (modifiable par nature) | `server/migrations.js:119` |
| `code` référencé par **8 tables** (machines, bouteilles, mouvements, contrôles, BSFF, retours, cessions…) | `REFERENCES fluides(code)` × 8 + migration 1434 |
| Le moteur cadre 7 ne lit QUE `categorieCadre7` puis replie sur `famille` — `contientHfc`/`contientHfo` ne sont lus par **aucun** moteur (documentaires) | `reglementation-fluides.js:92-103` + grep consommateurs |
| Le PRP est **figé à la validation** dans l'écriture (`prpFige`, empreinte v2) | `api.js:3322`, `demo-store.js:3598`, `test-prp-fige.mjs` |
| `statutReglementaire` est exposé au mapping mais **lu nulle part** (colonne dormante) | grep : seul `mapping.js:54` |
| `impact` est **frontSeulement** : il n'existe QUE dans le monde démo → **en mode serveur la colonne « Impact » de la vue est vide** (trou réel, jamais vu) | `mapping.js:73` + `demo-donnees.js:504-521` vs `api.js:758` |
| La vue actuelle est **lecture seule assumée** (« Phase A — aucune action de modification ») | `v8/js/views/fluides.js:6` |
| L'import JSON recomplète la fiche depuis `FICHE_REGLEMENTAIRE_FLUIDES` **seulement si `categorieCadre7` est nul**, et ne réétiquette `sourcePrp` que si le PRP importé est la valeur officielle | `api.js:4799-4812` |
| Le dossier d'audit scellé **ne contient AUCUN CSV du référentiel fluides** (13 fichiers fixes, pas de `fluides.csv`) | grep `exports.js` / `dossier-audit.js` |
| Dernière migration = **30**, prochaine = **31** | `CARTE-CODE.md` + registre |

---

## 2. DÉCISIONS À ARBITRER AVANT LE CODE (gate Franck)

### D1 — Profondeur : table éditable **ou** table versionnée à dates d'effet ?
L'audit demandait une « table versionnée : dates d'effet, journal des révisions ».
**Recommandation : NON, table éditable simple.** Le versionnement à dates d'effet
serait **redondant** : le PRP est déjà figé dans chaque écriture scellée
(`prpFige`, dans l'empreinte v2) — le passé est protégé par le scellement, pas par
la table. Et tout changement est déjà horodaté et nominatif au **journal d'audit**
append-only. Le versionnement ajouterait une machinerie (résolution par date à
chaque lecture) pour zéro gain probatoire.
→ **Choix proposé : éditable + journal d'audit. Rien d'autre.**

### D2 — Suppression d'un fluide ?
**Recommandation : JAMAIS de suppression. Désactivation seulement**
(colonne `actif`, migration 31, défaut vrai). Un `DELETE` casserait les 8 clés
étrangères et rendrait illisibles des écritures scellées. Un fluide **désactivé**
disparaît des listes de saisie (machine, bouteille, wizard) mais reste affiché
partout où il est déjà référencé — cas réel : le R-22, qu'on ne monte plus mais
qu'on récupère encore.
→ **Choix proposé : désactivation toujours possible, suppression jamais.**

### D3 — Colonne « Impact » : la dériver du PRP ?
Aujourd'hui `impact` n'existe que dans le monde démo : **avec le serveur, la
colonne est vide**. Un fluide que Franck ajoutera n'aura donc pas d'impact du tout.
**Recommandation : dériver l'impact du PRP**, seuils calés sur les bornes
F-Gas déjà utilisées par le règlement : `< 150` FAIBLE · `< 750` MODÉRÉ ·
`< 2500` ÉLEVÉ · `≥ 2500` TRÈS ÉLEVÉ.
Vérifié : ces bornes redonnent **exactement** les 9 valeurs actuelles du monde
démo (R-455A 148 → FAIBLE, R-32 675 → MODÉRÉ, R-407C 1774 → ÉLEVÉ, R-404A 3922 →
TRÈS ÉLEVÉ). C'est un affichage, pas une règle réglementaire — mais les seuils
sont une valeur, donc c'est ton arbitrage.
→ **Choix proposé : oui, dérivation pure, mêmes chips qu'aujourd'hui.**

### D4 — Source du PRP quand tu modifies un PRP (piège ⑤)
Si tu changes le PRP d'un fluide, la mention « annexe F-Gas III » devient un
mensonge. **Recommandation : dès que le PRP change, le champ « source du PRP »
est OBLIGATOIRE** (message canonique de refus si l'ancienne étiquette officielle
est laissée telle quelle) ; le formulaire propose par défaut
`saisie locale du JJ/MM/AAAA`. **Jamais** de réétiquetage automatique en
« F-Gas III ».
→ **Choix proposé : oui, source obligatoire dès que le PRP bouge.**

### D5 — Qui a le droit ?
Le PRP pilote les tonnes équivalent CO₂, donc les seuils de contrôle, donc les
obligations. **Recommandation : `REFERENT_ADMIN`** (toi + un admin), même niveau
que `importerJSON` qui réécrit déjà cette table. Alternative : `VALIDEUR`
(inclut ENSEIGNANT). Jamais ÉLÈVE dans aucun scénario.
→ **Choix proposé : REFERENT_ADMIN.**

### D6 — Champs éditables, champs verrouillés, garde de cohérence
- **Le `code` est FIGÉ après création** (c'est la clé étrangère de 8 tables ; le
  renommer briserait des écritures scellées). Correction d'une faute de frappe =
  créer le bon code + désactiver le mauvais.
- Éditables : famille, PRP, classe de sécurité, statut réglementaire,
  commentaire, fiche cadre 7 (contient HFC / contient HFO / catégorie), source du
  PRP, actif.
- **Garde de cohérence légère** (bloque seulement les contradictions
  manifestes) : catégorie `HFC` ⇒ contient HFC ; catégorie `HFO` ⇒ contient HFO
  et pas HFC (sinon c'est un HFC, le moteur fait primer le HFC) ; catégorie
  `HCFC` ou `AUCUNE` ⇒ ni l'un ni l'autre. Tout le reste reste libre.
- Validations d'entrée : code non vide et **unique** (comparaison insensible à la
  casse, mais casse conservée — `R-1234yf` s'écrit en minuscules), PRP numérique
  ≥ 0 (le NH₃ vaut 0), classe de sécurité et statut dans les listes du schéma.
→ **Choix proposé : tel quel.**

### D7 — Pré-remplir le référentiel (R-448A, R-449A, R-452A/B, R-454A/B/C, R-513A, R-1234ze, R-717…) ?
**Recommandation : PAS dans cette brique.** Chaque ligne serait une valeur
réglementaire nouvelle → validation obligatoire de ta part, une par une (règle
d'or). L'écran te rend justement autonome pour les saisir au fil de l'eau.
Si tu veux quand même un catalogue livré, c'est un **lot séparé** : je te
présente le tableau des valeurs et de leurs sources, tu valides ligne par ligne,
et alors seulement je le sème.
→ **Choix proposé : hors périmètre, lot séparé sur ta demande.**

---

## 3. LES BRIQUES (une brique = un commit, tests verts à chaque fois)

### AF-1 — Schéma : `fluides.actif` (migration **31**)
`ALTER TABLE fluides ADD COLUMN actif INTEGER NOT NULL DEFAULT 1` (backfill
conservateur : tout l'existant reste actif). `mapping.js` : `actif: 'actif'`.
Registre-commentaire de `migrations.js` tenu à jour. Aucun trigger WORM à
recréer (table hors WORM, vérifié). Suite `test-migrations` : colonne présente,
9 fluides actifs après migration.
*(Migration IMMUABLE : littéraux figés, jamais de constante partagée.)*

### AF-2 — Module pur : validation + cohérence + impact
Ajouts **purs** dans `v8/js/data/reglementation-fluides.js` (la source de vérité
du cadre 7, déjà copiée en littéral côté serveur) :
- `verifierFicheFluide(fiche)` → messages canoniques de refus (code, PRP, classe,
  statut, cohérence cadre 7 de D6) ;
- `impactDepuisPrp(prp)` → FAIBLE / MODERE / ELEVE / TRES_ELEVE (D3).
**Miroir littéral CommonJS dans `server/api.js`** (le fichier y copie déjà
`frequenceControleMois`) + **suite de parité** qui discrimine (verdicts ET
messages), comme `test-droit-intervention`.

### AF-3 — `createFluide` (contrat, 2 stores, parité)
- `contrat.js` : entrée `createFluide` (genre mutation, description + erreurs).
- `demo-store.js` et `server/api.js` : même sémantique, mêmes messages, à la
  virgule près. Côté serveur : `muter()` + `journaliser(…, 'CREATION_FLUIDE', code, …)`.
- `local-store.js` : enveloppe 1-pour-1.
- `ROLES_MUTATION.createFluide = REFERENT_ADMIN` (D5).
- Retourne le fluide complet (avec `nbMachines: 0`).

### AF-4 — `updateFluide` (contrat, 2 stores, parité)
Même patron (le patron `updateClient` est celui à suivre : patch par champ
présent, journal des champs modifiés). Spécificités :
- **`code` refusé au patch** (D6) — message canonique dédié ;
- **source du PRP obligatoire dès que le PRP change** (D4) ;
- `actif` traité en booléen strict (`Boolean(...)`, jamais stringifié — piège `??`/`||`) ;
- journal `MODIFICATION_FLUIDE` avec la liste des champs touchés (c'est lui qui
  tient lieu de « journal des révisions » de D1).
Contrat : **91 → 93 méthodes**, `VERSION_CONTRAT` **8 → 9**, compteur de
`test-contrat.mjs:122` bumpé.

### AF-5 — La vue « Fluides frigorigènes » devient administrable
`v8/js/views/fluides.js` : le tableau actuel s'enrichit (source du PRP, fiche
cadre 7, statut réglementaire, état actif/inactif, machines) + bouton
« Ajouter un fluide » et action « Modifier » par ligne, **visibles seulement pour
le rôle habilité** (D5). Impact rendu par `impactDepuisPrp` (donc rempli aussi en
mode serveur — le trou de la colonne vide est bouché). Lignes inactives grisées.
Nouvelle modale `v8/js/modales/fluide-form.js` sur le patron `client-form.js`
(piège historique : jamais de sélecteur global `.modale`). Note de bas de carte
réécrite : le PRP affiché est celui du référentiel **courant**, les écritures
passées gardent le leur.

### AF-6 — Les sélecteurs respectent `actif`
`machine-form.js`, `bouteille-form.js`, `wizard.js` : les fluides **inactifs**
disparaissent des listes de choix, **sauf** s'ils sont la valeur déjà
enregistrée de la fiche ouverte (sinon rouvrir une vieille machine au R-22
viderait son fluide en silence). Suite `test-bouteille-form.mjs` étendue.

### AF-7 — Tests : nouvelle suite **doublée** `v8/js/data/test-referentiel-fluides.mjs`
Ajoutée à `SUITES_DOUBLEES` (jouée demo PUIS local). Elle prouve :
1. création d'un fluide, relecture par `getFluides`, `nbMachines = 0` ;
2. doublon de code **refusé** (y compris à la casse près) ;
3. PRP invalide / classe hors liste / statut hors liste refusés, **mêmes
   messages** des deux côtés ;
4. cohérence cadre 7 : les 3 contradictions de D6 refusées, `HFC` + contient HFO
   (cas R-455A) **accepté** ;
5. `code` non modifiable ;
6. **le passé ne bouge pas** : mouvement validé sur R-410A → PRP figé 2088 ;
   on modifie le référentiel à 2000 ; l'écriture garde 2088, **la chaîne de hash
   reste intacte** et le CERFA déjà émis est inchangé (c'est LE test qui garde
   le piège ①) ;
7. désactivation : le fluide sort des listes de saisie, reste lisible sur les
   fiches existantes, aucune écriture cassée ;
8. **export → import n'écrase pas une fiche actée** (piège ⑤) : un export
   ancien, sans fiche, réimporté, ne réétiquette pas un PRP ajusté localement.
Bumps associés : `test-contrat` (91 → 93 + assertions des 2 méthodes),
`test-mapping` (colonne `actif`), `test-migrations` (migration 31),
`test-gardes-roles` (les 2 mutations sont bien gatées).

### AF-8 (optionnel, recommandé) — Le référentiel entre au dossier d'audit
`referentiel-fluides.csv` ajouté au ZIP scellé (13 → 14 fichiers fixes) : un
auditeur doit pouvoir constater **quel référentiel** produisait les tCO₂eq. Léger,
mais c'est du probatoire — d'où « recommandé ».

### AF-9 — Clôture
Revue adversariale (2 relecteurs, angles distincts, constats **tirés** pas lus)
avant le commit final · `CHANGELOG.md` en tête · `CARTE-CODE.md` (ligne
`reglementation-fluides.js` enrichie, vue + modale, migration 31, contrat v9) ·
`PROMPT-REPRISE.md` · **PR pour ta relecture**.

---

## 4. LES PIÈGES, ET CE QUI LES GARDE

| Piège | Garde |
|---|---|
| ① Le PRP est figé dans les écritures scellées | test AF-7 n° 6 : on modifie le référentiel, l'écriture et le CERFA ne bougent pas, la chaîne reste intacte |
| ② Une migration est immuable | migration 31 en littéraux figés, aucune reprise de la 21/22 |
| ③ La fiche réglementaire prime sur la famille | elle est saisissable dans la modale, et la garde de cohérence D6 empêche de la rendre absurde |
| ④ `reglementation-fluides.js` est la source de vérité | on l'**étend**, on ne le contourne pas ; miroir serveur + parité |
| ⑤ Pas de réétiquetage « F-Gas III » d'un PRP local ; l'import n'écrase pas une fiche actée | D4 (source obligatoire) + test AF-7 n° 8 |
| ⑥ Un fluide supprimé casserait les écritures | D2 : désactivation, jamais de suppression |
| Parité stricte serveur ↔ démo | mêmes messages, suite doublée, mapping déclaré des 2 côtés |
| `data/` réel | vérification navigateur sur **port jetable** + `IWF_CHEMIN_BASE` jetable, jamais 2011 |

**Cas limite consigné (non traité) :** en mode démo, la correction F-Gas III
rejouée au chargement réécrit R-1234yf/R-290 si leur PRP vaut *exactement* 1, 4
ou 3 (les anciennes valeurs). Si tu fixais délibérément l'une de ces trois
valeurs sur ces deux fluides, elle serait ré-corrigée au rechargement. Cas
étroit, signalé plutôt que codé — à traiter si tu le rencontres.

---

## 5. HORS PÉRIMÈTRE (assumé, écrit noir sur blanc)

- Pré-remplissage du catalogue des fluides manquants (D7) → lot séparé, valeurs
  validées une par une.
- Versionnement à dates d'effet (D1) → refusé, redondant avec `prpFige`.
- T2 R-455A : **tranché le 23/07** (PRP le plus élevé → 148 conservé, aucun
  changement de code). L'écran d'administration est précisément l'outil qui
  rendra ce genre d'ajustement autonome à l'avenir.
- Le mode Officiel reste FERMÉ (`VERROU_LIVRAISON = true`) : cette brique ne le
  rouvre pas et n'ajoute **aucune** condition de blocage.

---

## 6. ORDRE D'EXÉCUTION ET COÛT

`AF-1 → AF-2 → AF-3 → AF-4 → AF-5 → AF-6 → AF-7 → (AF-8) → AF-9`

Chaque brique : modification chirurgicale → `node outils/lancer-tests.mjs --tout`
**TOUT VERT (93 exécutions, 95 après la suite doublée AF-7)** → commit
(`git commit -F fichier`). Vérification navigateur réelle après AF-5 et AF-6, sur
port jetable. Volume estimé : comparable à P0-5 (aptitude) — plus petit que P0-8.
