# PLAN P1-1 — LE MODÈLE D'ÉQUIPEMENT (hermétique, résidentiel, détection permanente)

> **Statut : RÉALISÉ le 23/07 (EQ-1 → EQ-10), TOUT VERT 98 exécutions, PR
> ouverte.** Décisions E1→E7 déléguées par Franck et tranchées « le plus
> réglementaire » (voir le tableau ci-dessous). Contrat **v10 (93 méthodes)**,
> migration **32**. Deux dettes soldées (P0-5, P0-6). Revue AF-10 : un bloquant
> candidat écarté (échéance figée = saine), un contournement bloqué, un constat
> **antérieur à P1-1** consigné (statut figé sur rétrogradation mobile→fixe).
> E3(b) — l'exemption des hermétiques étiquetés — reste un geste Franck (seuils à
> confirmer sur pièce), activable sans réécriture.

> **Statut : décisions E1→E7 DÉLÉGUÉES par Franck le 23/07** (« fais au mieux,
> tu travailles en autonomie, tu prends les décisions les plus réglementaires
> possible »). La règle d'or « aucune valeur réglementaire nouvelle sans
> validation » est levée par cette délégation explicite ; en contrepartie,
> chaque arbitrage est motivé ici et signalé à Franck.
>
> **Lecture retenue de « le plus réglementaire possible » : dans un registre
> OPPOSABLE, cela veut dire JAMAIS MOINS DE CONTRÔLES QU'EXIGÉ** — pas « le plus
> permissif que le texte tolère ». À chaque fois que deux lectures étaient
> défendables, la plus stricte l'emporte.
>
> ## Arbitrages retenus (23/07, en autonomie)
>
> | | Décision | Motif |
> |---|---|---|
> | **E1** | **OUI** — l'allègement de fréquence exige une vérification de moins de 12 mois | Sans elle, cocher une case retire la moitié des contrôles sans preuve. Périmée → retour à la fréquence SANS détection (jamais moins) |
> | **E2** | **OUI** — alerte CRITIQUE + condition bloquante OFFICIEL (inerte tant que `VERROU_LIVRAISON`) | Les seuils sont déjà dans le moteur (niveau 3) : rien d'inventé, on exploite l'existant |
> | **E3** | **(a) — AUCUNE exemption codée** | ⭐ Seul point du plan qui RETIRERAIT des contrôles. Les 3 valeurs (< 10 tCO₂eq, < 2 kg, < 3 kg résidentiel) ne sont pas vérifiables sur pièce en session. Aucune exemption = imparable en audit. Les champs sont posés et `exemptionControle()` existe en rendant TOUJOURS `exempte:false` : l'activer plus tard = une décision, pas une réécriture |
> | **E4** | **OUI, étiquette EXIGÉE** — seuil d'aptitude à 6 kg seulement si hermétique **ET** étiqueté | Solde la dette P0-5 sans ouvrir un assouplissement non marqué. Un hermétique non étiqueté reste au seuil de 3 kg |
> | **E5** | **Liste fermée** des équipements mobiles ; un mobile **sans** sous-type listé n'est PLUS admis au contrôle immédiat | « Équipements mobiles **listés** » : sans liste, l'exception n'était pas vérifiable. **Plus strict qu'avant** (tout MOBILE en profitait) |
> | **E6** | **Trois champs** sur la machine, pas de table dédiée | Un système par machine au lycée ; une table = un écran, une migration et un cycle de vie pour zéro gain |
> | **E7** | Case **documentaire** (sans effet, puisque E3 = a) | Décrit l'équipement honnêtement sans rien déclencher |
>
> **Point laissé à Franck (non bloquant)** : activer E3(b) — l'exemption des
> hermétiquement scellés étiquetés — quand les trois seuils auront été
> confirmés sur pièce. Tant que non activée, le logiciel exige des contrôles
> que le texte n'imposerait peut-être pas : c'est une sévérité assumée, jamais
> une non-conformité.
>
> Constat d'audit P1-1 (🔶) : « Fiche machine incapable de décrire : fixe/mobile
> + sous-type, hermétique **+ étiquette**, résidentiel, détection obligatoire +
> vérification du détecteur. Étendre le modèle équipement ; bloquer la détection
> obligatoire ≥ 500 tCO₂e / ≥ 100 kg HFO ; suivre la vérif annuelle du
> détecteur. »
>
> **Pourquoi cette brique maintenant** : elle solde **deux dettes déjà
> consignées** et conditionne la réouverture du mode Officiel.

---

## 1. État de départ — VÉRIFIÉ dans le code

| Fait | Preuve |
|---|---|
| La table `machines` n'a **aucun** champ hermétique / étiqueté / résidentiel | `server/schema.sql:179-209` + les 3 seuls `ALTER TABLE machines` (migrations 2, 6, 27) |
| `type_installation` FIXE/MOBILE existe (migration 27, P0-6) mais **sans sous-type** | `migrations.js:1402`, `mapping.js:193` |
| `detection_permanente` existe — **booléen sec, sans date de vérification** | `schema.sql:195` |
| Ce booléen **DOUBLE la fréquence de contrôle** (12 → 24 mois, 6 → 12, 3 → 6) | `reglementation-fluides.js` table `FREQUENCE` |
| ⚠️ **Donc aujourd'hui : cocher la case allège les obligations, sans aucune contrepartie vérifiable.** C'est le trou réel du constat | déduit des deux lignes ci-dessus |
| Le système de détection de la MACHINE n'existe pas comme objet ; `outillage` ne décrit que les **détecteurs portables** de l'atelier (avec étalonnage, vérification, échéance, statut) | `schema.sql:134-154` |
| **Dette P0-5** : l'aptitude est calculée avec `hermetiqueScelle: false` **en dur** | `server/api.js:7262` |
| Le seuil hermétique de l'aptitude existe déjà (6 kg au lieu de 3) | `habilitations.js:168-169` |
| **Dette P0-6** : « équipements mobiles listés » — le sous-type qui permettrait de vérifier l'appartenance à la liste n'existe pas | `dossiers-fuite.js` (`estMachineMobile` = booléen) |
| L'exemption hermétique est **consignée comme DIFFÉRÉE, en choix conservateur** (« pas d'exemption codée = jamais MOINS de contrôles qu'exigé ») — valeurs citées : < 10 tCO₂eq (annexe I), < 2 kg (annexe II-1), < 3 kg (hermétique résidentiel) | `docs/TABLE-REGLEMENTAIRE-FLUIDES.md`, point 8 |
| Le niveau 3 du moteur = **exactement** les seuils cités par l'audit pour la détection obligatoire (HFC 500 tCO₂eq · HFO 100 kg · HCFC 300 kg) | `reglementation-fluides.js` table `SEUILS` |
| 13 familles d'alertes existent (`alr-controle-`, `alr-outil-`…) — le patron pour en ajouter est établi | `demo-store.js getAlertes` |
| Dernière migration = **31** (P1-2), prochaine = **32** | registre `migrations.js` |

---

## 2. DÉCISIONS À ARBITRER AVANT LE CODE (gate Franck)

### E1 — La détection permanente doit-elle être VÉRIFIÉE pour continuer à alléger les contrôles ? ⚠️ valeur réglementaire
Aujourd'hui, cocher « détection permanente » divise par deux le nombre de
contrôles, **définitivement et sans preuve**. Le règlement impose que ces
systèmes soient contrôlés **au moins tous les 12 mois**.
**Recommandation : OUI.** L'allègement ne vaut que si la vérification a moins de
12 mois. Vérification périmée → on retombe sur la fréquence **sans détection**
(donc plus de contrôles, jamais moins) + une alerte. Jamais de blocage de
saisie : on ne t'empêche pas d'enregistrer la réalité.
→ **Choix proposé : allègement conditionné à une vérification < 12 mois.**

### E2 — La détection permanente OBLIGATOIRE au niveau haut ⚠️ valeur réglementaire
Au-delà de 500 tCO₂eq (HFC) / 100 kg (HFO) / 300 kg (HCFC), un système de
détection est **obligatoire**. Ces seuils sont **déjà dans le moteur** (niveau 3)
— rien de nouveau à inventer, juste à exploiter.
**Recommandation : alerte CRITIQUE, pas de blocage de saisie.** Et une
**condition bloquante en mode OFFICIEL** (à activer à la réouverture, comme
l'aptitude en P0-5). Cohérent avec la doctrine : en Conseil on ne bloque jamais,
l'Officiel doit bloquer.
→ **Choix proposé : alerte partout + condition Officiel préparée mais inerte tant que le verrou T1 est fermé.**

### E3 — Coder les EXEMPTIONS des hermétiquement scellés ? ⚠️ valeur réglementaire — le point le plus sensible
C'est le seul point de ce plan qui **RETIRE** des contrôles. Il est aujourd'hui
volontairement différé « en choix conservateur ».
Les valeurs consignées dans ta table validée : exemption < 10 tCO₂eq (annexe I),
< 2 kg (annexe II-1), < 3 kg pour un hermétique **résidentiel**.
**Recommandation : coder les CHAMPS maintenant, l'EXEMPTION seulement si tu la
valides, et sous condition stricte d'ÉTIQUETAGE** — le texte n'exempte que
l'équipement hermétique *marqué comme tel*. Un hermétique non étiqueté reste
contrôlé. L'écran devra **dire** pourquoi un équipement est exempté (« hermétique
étiqueté, 4,2 tCO₂eq < 10 »), jamais l'exempter en silence.
→ **Trois options, à trancher :**
> **(a) champs seulement**, aucune exemption codée — statu quo conservateur, mais
> les champs servent enfin à l'aptitude (E4) ;
> **(b) champs + exemption sous étiquetage** — recommandé si tu confirmes les
> trois valeurs sur pièce ;
> **(c) champs + exemption sans exiger l'étiquette** — **je le déconseille** : ce
> serait sous-contrôler un équipement au-delà de ce que le texte permet.

### E4 — Brancher l'hermétique sur l'aptitude (dette P0-5)
`hermetiqueScelle: false` est écrit en dur : l'aptitude est donc plus **sévère**
que la réalité (seuil 3 kg au lieu de 6 pour un hermétique scellé). Ça ne
produit pas d'autorisation abusive, mais ça peut refuser à tort — et c'est
bloquant en Officiel depuis P0-5.
**Recommandation : brancher le champ réel**, avec la même exigence
d'étiquetage que E3 si tu retiens (b).
→ **Choix proposé : oui, dette soldée dans cette brique.**

### E5 — Le sous-type d'équipement mobile (dette P0-6)
« Exception des équipements mobiles **listés** » : aujourd'hui MOBILE est un
booléen, on ne peut pas vérifier que l'équipement appartient bien à la liste.
**Recommandation : une liste fermée de sous-types** (camion/remorque frigorifique,
conteneur frigorifique, véhicule de transport réfrigéré, engin, autre) avec
« autre » qui **ne donne pas** droit au contrôle immédiat. Le sous-type ne
s'affiche que si l'installation est MOBILE.
→ **Choix proposé : oui, liste fermée. Dis-moi si ta liste diffère.**

### E6 — Comment décrire la vérification du système de détection ?
**Recommandation : trois champs sur la machine** (date de dernière vérification,
échéance calculée à +12 mois, référence/intervenant) — **pas une table dédiée**,
pas d'objet « détecteur fixe » distinct. Motif : au lycée, un système de
détection par machine ; une table entière ajouterait un écran, une migration et
un cycle de vie pour zéro gain. Élaguer plutôt qu'empiler.
→ **Choix proposé : trois champs sur la machine.**

### E7 — Résidentiel : champ libre ou usage réglementaire ?
Le résidentiel ne sert qu'au seuil de 3 kg de E3.
**Recommandation : une case à cocher, utilisée uniquement si tu retiens
l'option (b) de E3.** Sinon elle reste documentaire (et honnête : elle décrit
l'équipement sans rien déclencher).
→ **Choix proposé : case à cocher, effet conditionné à E3.**

---

## 3. LES BRIQUES (une brique = un commit, tests verts à chaque fois)

### EQ-1 — Schéma : migration **32**
`machines` : `hermetique_scelle`, `hermetique_etiquete`, `residentiel` (booléens
DEFAULT 0 = **backfill conservateur** : rien n'est exempté rétroactivement),
`sous_type_installation` (TEXT nullable, CHECK sur la liste fermée de E5),
`detection_verifiee_le` / `detection_prochaine_verif` / `detection_reference`
(TEXT nullable). Mapping des deux côtés. Registre-commentaire tenu.
Table `machines` hors WORM (comme les migrations 19, 21, 27, 31) : aucun trigger
à recréer. Test de migration : colonnes présentes, backfill à 0/NULL, CHECK du
sous-type, **rien de ce qui existe n'est exempté après migration**.

### EQ-2 — Module pur : `equipement.js` (nouveau, `v8/js/data/`)
Pur, testable seul, **miroir littéral CommonJS côté serveur** + suite de parité
qui discrimine (patron `droit-intervention.js` / `declaration-annuelle.js`) :
- `detectionEffective(machine, jour)` → la détection compte-t-elle ? (E1 : oui si
  déclarée ET vérifiée depuis moins de 12 mois) + motif lisible ;
- `detectionObligatoire(fluideRef, machine)` → vrai au niveau 3 (E2), en
  réutilisant `evaluerControle` — **aucun seuil recopié**, on interroge le moteur ;
- `exemptionControle(fluideRef, machine)` → `{ exempte, motif }` (E3, selon
  l'option retenue ; en (a) la fonction existe et rend toujours `exempte:false`,
  ce qui rend l'activation ultérieure triviale et testable) ;
- `sousTypeMobileEligible(machine)` (E5).
⚠️ Les seuils réglementaires restent dans `reglementation-fluides.js` : ce module
**compose**, il ne redéfinit rien.

### EQ-3 — Le moteur de fréquence consomme la détection EFFECTIVE
Les appels à `evaluerControle(..., detectionPermanente, ...)` passent désormais
la détection **effective** (E1). Sites recensés à l'avance : `demo-store.js`
(calcul d'échéance + validation de mouvement), `api.js` (`calculerProchainControle`
+ `validerMouvement`), `plaque-fgas.js`, `cerfa/generateur.js`, `fiche-machine.js`.
**Aucune échéance déjà FIGÉE dans une écriture validée n'est recalculée** — même
principe que le PRP figé : le passé garde ce qui a été scellé.

### EQ-4 — `createMachine` / `updateMachine` : les nouveaux champs
2 stores + parité stricte, gardes de valeur (sous-type hors liste refusé,
sous-type sans MOBILE refusé, `hermetique_etiquete` sans `hermetique_scelle`
refusé). Échéance de vérification calculée à +12 mois **civils**
(`ajouterUnMoisCivil` × 12 — la fonction existe depuis P0-6, on ne réinvente
pas l'arithmétique de dates). Contrat : descriptions mises à jour ; **pas de
nouvelle méthode** (donc contrat v9 → v10 pour l'évolution de surface des
descriptions, 93 méthodes inchangées).

### EQ-5 — Deux dettes soldées
- **P0-5** : `hermetiqueScelle` lit la machine dans les DEUX `cadreFicheOfficiel`
  (fin du `false` en dur, `api.js:7262`).
- **P0-6** : `estMachineMobile` exige un sous-type éligible (E5).
Les suites `test-habilitations`, `test-droit-intervention` et `test-dossiers-fuite`
sont étendues, pas réécrites.

### EQ-6 — Alertes + feu tricolore
Deux familles nouvelles, sur le patron `alr-outil-` :
- `alr-detection-obligatoire-` (CRITIQUE, E2) ;
- `alr-detection-verif-` (IMPORTANT : vérification périmée ou absente alors que
  la détection est déclarée — l'allègement est tombé).
Rattachées au feu tricolore (domaine Machines) et à l'audit guidé.

### EQ-7 — Écrans
`machine-form.js` : bloc « Nature de l'équipement » (hermétique + étiqueté +
résidentiel + sous-type conditionné à MOBILE) et bloc « Détection de fuites »
(déclarée, vérifiée le, échéance calculée affichée, référence).
`fiche-machine.js` : la nature de l'équipement, l'état de la détection, et
**pourquoi** la fréquence vaut ce qu'elle vaut (détection comptée ou non,
exemption motivée). Une fréquence de contrôle doit toujours être explicable.

### EQ-8 — Condition bloquante OFFICIEL (E2), préparée mais inerte
Nouvelle condition dans `blocage-officiel.js` (2 miroirs) : détection
obligatoire absente → refus en OFFICIEL. **Elle ne change rien tant que
`VERROU_LIVRAISON = true`** ; elle sera exercée par la suite e2e au dégel du
verrou. Documentée dans `docs/CONDITIONS-BLOCANTES-OFFICIEL.md`.

### EQ-9 — Tests
Nouvelle suite **doublée** `test-equipement.mjs` : détection non vérifiée →
fréquence NON allégée · vérification de la veille → allégée · vérification de
12 mois + 1 jour → plus allégée · niveau 3 sans détection → alerte critique ·
sous-type non éligible → pas de contrôle immédiat après réparation · hermétique
étiqueté → seuil d'aptitude à 6 kg, non étiqueté → 3 kg · (si E3 = (b))
exemption motivée aux valeurs limites, et **jamais** sans étiquette.
Plus : `test-migrations` (32), `test-contrat`, parité pure/serveur du nouveau
module.

### EQ-10 — Clôture
Revue adversariale (constats **tirés**), CHANGELOG, CARTE-CODE, PROMPT-REPRISE,
`TABLE-REGLEMENTAIRE-FLUIDES.md` (le point 8 sort de « différé »), PR.

---

## 4. CE QUE ÇA CHANGE POUR TOI, CONCRÈTEMENT

- Une machine au-dessus du seuil haut **sans** détection : tu le vois, tout de
  suite, en alerte critique — aujourd'hui rien ne te le dit.
- Une détection déclarée mais jamais vérifiée **cesse d'alléger** tes
  obligations : tu ne peux plus perdre des contrôles sans le savoir.
- L'aptitude cesse d'être trop sévère sur un hermétique scellé.
- Si tu valides E3(b) : plus de contrôles fictifs sur du petit matériel
  hermétique étiqueté — mais seulement avec l'étiquette, et l'écran le dit.

⚠️ **Effet de bord à connaître** : si tu as des machines qui portent aujourd'hui
« détection permanente » cochée sans date de vérification, leurs échéances vont
se **resserrer** dès la mise en service de cette brique (retour à la fréquence
sans détection). C'est la réalité réglementaire, mais ce sera visible — d'où
l'alerte dédiée plutôt qu'un changement silencieux.

---

## 5. HORS PÉRIMÈTRE (assumé)

- **Multi-circuits** (point 7 de la table réglementaire, différé 16/07 :
  équipements simples au lycée) — le modèle garde une charge nominale par
  machine.
- Table dédiée aux systèmes de détection fixes (E6 : trois champs suffisent).
- Réouverture du mode Officiel : **c'est le jalon d'après**, cette brique la
  prépare (EQ-8) sans la déclencher.

---

## 6. ORDRE ET COÛT

`EQ-1 → EQ-2 → EQ-3 → EQ-4 → EQ-5 → EQ-6 → EQ-7 → EQ-8 → EQ-9 → EQ-10`

Tests verts (`node outils/lancer-tests.mjs --tout`, **95 exécutions**, 97 après
la suite doublée) à chaque brique, vérification navigateur après EQ-7 sur port
jetable. Volume comparable à P0-5 (aptitude) — un cran au-dessus de P1-2, parce
que le moteur de fréquence est touché et qu'il irrigue six écrans.
