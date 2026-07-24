# Plan des lots réglementaires Q1→Q11 — décisions du 24/07/2026

> **Source** : décisions transmises par Franck le 24/07 (sur la base d'une analyse tierce),
> passées à la vérification croisée le même jour : 8 constats d'écart contre le code réel
> + 18 contre-épreuves adversariales (3 angles par affirmation : réfuter, sourcer, mesurer
> le risque) + synthèse. **27 agents, 0 erreur.**
>
> **Règle de lecture de ce plan** : tout ce qui est marqué TRANCHÉ vient de Franck ou d'une
> lecture verbatim d'un texte primaire ; tout ce qui est marqué DÉLÉGUÉ est codé « le plus
> réglementaire » (jamais moins de contrôles qu'exigé), consigné et révocable ; tout ce qui
> est marqué GATÉ n'est pas codé, ou codé inerte, tant que la réponse manque.

---

## 1. Verdicts de la contre-épreuve (6 affirmations, 3 angles chacune)

| Affirmation | Verdict | Détail |
|---|---|---|
| Q1 — A2 : < 3 kg / < 6 kg hermétique étiqueté, strict | **SOLIDE** (3/3) | Confirme le code existant. |
| Q2 — cat. II 2008 : 2 kg par opération, étanchéité sans limite | **SOLIDE** (3/3) | Source primaire lue. Le code est à 3 kg : trop permissif. |
| Q4 — CERFA non prévu pour R-744/R-290/R-717 | **SOLIDE** (3/3) | Notice CERFA lue verbatim. |
| Q6 — exemption hermétique : < 10 t / < 2 kg / < 3 kg résidentiel | **SOLIDE** (3/3) | 4 sources convergentes, MAIS art. 5 EUR-Lex non lu verbatim (site en panne). Reste gaté visa. |
| Q9 — R-404A : vierge interdit 2025, recyclé/régénéré 2030, clim/PAC 2026 | **SOLIDE** (3/3) | Art. 13 non lu verbatim ; valeurs convergentes. |
| Q3 — attestations 2008 « valables jusqu'au 12/03/2029 » | **DOUTEUSE en l'état** (1 réfutation / 2 confirmations du fond) | Voir §2 : le fond est confirmé, la formulation est fausse. |

## 2. Deux corrections à l'analyse tierce (établies sur texte primaire)

**2a. Le 12/03/2029 n'est PAS un couperet de validité.** Lecture VERBATIM de l'arrêté du
21/11/2025 (aptitude, Légifrance JORFTEXT000053004604), articles 7 et 11 :
- **31/12/2026** = fin de la DÉLIVRANCE sous l'ancien régime + abrogation de l'ancien arrêté.
  Les attestations déjà détenues **ne meurent pas** à cette date. → **Notre code actuel
  (`FIN_RECONNAISSANCE_2008 = 31/12/2026`) est TROP restrictif : il déclarerait non habilités,
  dès le 01/01/2027, des techniciens parfaitement en règle.**
- **12/03/2029** = date-butoir de la **remise à niveau ponctuelle**. « En l'absence de suivi
  des formations de remise à niveau ponctuelles avant le 12 mars 2029, l'attestation [...]
  n'est plus valide. » C'est une **condition**, pas une échéance sèche : le titulaire remis
  à niveau reste valide **au-delà** de 2029 (puis cycle périodique ≤ 7 ans).
- Coder « valable jusqu'au 12/03/2029 » serait faux dans les deux sens : invaliderait à tort
  les remis à niveau, et sans champ « remise à niveau » on ne peut pas décider après 2029.

**2b. Mauvais arrêté cité.** L'aptitude des PERSONNES (catégories I à V, art. R.543-106)
relève de l'arrêté du **13 octobre 2008** — PAS du 30 juin 2008, qui vise l'attestation de
**capacité des opérateurs/entreprises** (art. R.543-99). L'analyse tierce (et une mention
dans nos propres docs) confond les deux. À corriger partout où le projet cite ce texte.

## 3. Verdict Q10 — l'ordre B→C→A est réfuté sur pièce

La prémisse de l'analyse tierce (« api.js et demo-store.js dupliquent les règles, donc
fusionner d'abord réduit le travail ») est **fausse et mesurable** : les règles réglementaires
vivent déjà dans **15 modules purs partagés** (habilitations, reglementation-fluides,
equipement, blocage-officiel, declaration-annuelle…), avec miroirs littéraux et suites de
parité (~130 cas). Les 13 676 lignes dupliquées des stores sont des **manutentions**
(transactions, mapping SQL, dispatch), pas des règles. Coder Q1→Q9 touche les modules purs,
jamais le corps des stores. Et la duplication miroir est **l'oracle** qui rend le test de
parité discriminant : fusionner maintenant le supprimerait juste avant la simulation d'audit
d'août — sur le cœur WORM. L'audit externe lui-même plaçait cette fusion en dernière étape.

**Ordre retenu** :
1. **L1 — durcissements prêts** (Q2, Q4, libellé Q7, tests figeant Q1/Q7/Q8) ;
2. **L2 — tests de sécurité négatifs (C / P2-2)** — en parallèle, additif ;
3. **L3 — Q9 en conseil** + champ « usage thermique » (si R4 = oui) ;
4. **L4 — Q3 modèle de remise à niveau** (derrière le verrou) ;
5. **L5 — Q6 exemption hermétique** (corps + branchement, inerte tant que verrou fermé) ;
6. **L6 — A : réouverture du mode Officiel** (après visa T3 sur Q3/Q6) ;
7. **L7 — B : fusion des stores (P2-1)** — APRÈS la simulation d'audit, plan dédié.

---

## 4. Les lots

### L1 — Durcissements prêts *(PLUS de contrôles, aucune migration)*

**L1a — Cat. II 2008 à 2 kg, découplée de l'A2 (Q2).**
- ⚠️ **PIÈGE CENTRAL, vérifié** : changer la constante ne produit AUCUN effet.
  `verifierDroitIntervention` calcule un seuil GLOBAL (`hermetiqueScelle ? 6 : 3`,
  habilitations.js:313) puis **écrase** la limite par catégorie (`limiteKg: p.limiteKg ===
  null ? null : seuil`, :329 ; miroir droit-intervention.js:199/:215). Le vrai correctif =
  **re-câbler cette ligne** pour propager la limite PAR CATÉGORIE.
- Constante DÉDIÉE `SEUIL_CHARGE_CAT_II_2008_KG = 2` (jamais réutiliser la constante 2025 :
  deux régimes, deux limites). Frontière stricte : 2,000 kg pile refusé.
- Contrôle d'étanchéité sans limite : DÉJÀ acquis (exemption de charge quand l'opération
  normalisée est ETANCHEITE, habilitations.js:369) — aucun champ « ouverture du circuit »
  nécessaire : le type de mouvement en tient lieu (proxy assumé, consigné §6).
- **DÉLÉGUÉ (strict)** : cat. II 2008 sur machine hermétique = **2 kg quand même** (le texte
  2008 ne prévoit AUCUNE variante hermétique ; le 6 kg actuel vient du seuil global 2025
  appliqué à tort). Révocable sur réponse R1.
- **DÉLÉGUÉ (strict)** : cat. III 2008 (récupération seule) alignée à **2 kg** également —
  même logique de texte ; à confirmer via T3 (question au dossier).
- Fichiers : `v8/js/data/habilitations.js` + miroir `server/droit-intervention.js` +
  `test-habilitations-moteur.mjs` (assertions 3 kg à réécrire) + `server/test-droit-intervention.mjs`
  (éventail 1,999 / 2,000 / 2,5 kg).
- Au passage : `composants/conseil-intervenant.js:70` passe `hermetiqueScelle: false` EN DUR
  (commentaire périmé depuis P1-1) — l'aligner sur `hermetiqueOpposable(machine)`.

**L1b — Refus du CERFA officiel pour les fluides non fluorés (Q4).**
- Condition bloquante **n° 18** `HORS_PERIMETRE_FLUORE` dans les deux miroirs de
  `blocage-officiel.js`, moments **PASSAGE + VALIDATION**.
- Critère : l'attribut BRUT `categorie_cadre7 === 'AUCUNE'` de la fiche réglementaire
  (migration 21) — **PAS la fonction `categorieCadre7()`**, qui confond « non fluoré » et
  « fiche absente ».
- Message : renvoi vers le mode Formation (qui EST la « fiche interne volontaire distincte » —
  aucun troisième objet à créer).
- Réécrire l'arbitrage de `docs/CONDITIONS-BLOCANTES-OFFICIEL.md` qui disait l'inverse
  (« question ouverte, laisser comme trace volontaire ») — revirement TRANCHÉ par Franck 24/07.

**L1c — Libellé « Gaz annexe II, section 1 » (Q7).**
- Voie AFFICHAGE seulement : le libellé « HFO pur » devient « Gaz annexe II, section 1
  (HFO) » partout où il s'affiche. **La valeur stockée ne change PAS** (un renommage en base
  = migration + rejet des sauvegardes anciennes à l'import, pour un gain nul). TRANCHÉ
  (recommandation ferme de la vérification, aucun enjeu réglementaire).

**L1d — Tests qui FIGENT ce qui est déjà conforme.**
Vérifié : Q1 (A2 3/6 strict), Q7 (5/50/500 t · 1/10/100 kg · 12/6/3 mois doublés · détection
obligatoire au seuil haut · mélange contenant du HFC → régime HFC), Q8 (HCFC ≥ 2,000 kg
inclusif) sont **DÉJÀ codés conformes**. On les fige par des tests de non-régression aux
frontières exigées : 2,999/3,000/5,999/6,000 kg · 9,999/10,000 t · 1,999/2,000/2,999/3,000 kg ·
mélange HFC/HFO → HFC · cat. II par nature d'intervention.

**L1e — Correction de la citation juridique** : arrêté du **13/10/2008** pour l'aptitude des
personnes (le 30/06/2008 = capacité des entreprises), partout dans docs et commentaires.

### L2 — Tests de sécurité négatifs (C / P2-2) *(NEUTRE, en parallèle)*
Suite NOMMÉE regroupant les tests négatifs existants + les manquants : mode Officiel forgé
refusé, appel direct à l'API pour contourner un blocage (exigence explicite de Franck),
`mouvementId` forgé, source de charge douteuse, démarrage LAN sans HTTPS, base sous OneDrive.
Ne dépend de RIEN — surtout pas de la fusion des stores.

### L3 — R-404A contextuel, en CONSEIL (Q9) *(MIXTE)*
- Le socle existe : origine bouteille (VIERGE/RECYCLE/REGENERE — cycle matière CM-1→CM-5),
  seuil PRP ≥ 2500, condition 10.
- Ajouter la logique de DATE : froid 01/01/2025 (vierge interdit) · clim/PAC 01/01/2026 ·
  fin recyclé/régénéré 01/01/2030 (valeur transmise ; « 2032 » à vérifier au visa).
  Exceptions (militaire, < −50 °C) : hors périmètre lycée, consignées non codées.
- **GATÉ R4** : champ « usage thermique » (froid commercial / climatisation / PAC), migration
  33, backfill conservateur = régime le plus strict. Sans réponse, PAS de champ : tout le
  parc reste au régime froid 2025 (le plus strict) — jamais moins de contrôles.
- ⚠️ Le raffinement clim-2026 ASSOUPLIT par rapport à la condition 10 actuelle (qui bloque
  tout vierge PRP ≥ 2500) : le blocage dur raffiné reste **derrière le verrou** ; seul le
  bandeau conseil (aligné sur l'état de la BOUTEILLE choisie, pas le seul PRP machine) est
  actif tout de suite.
- Trou consigné : MISE_EN_SERVICE (équipement neuf) non couvert par la restriction — au visa.

### L4 — Modèle de remise à niveau, transition 2008→2025 (Q3) *(derrière le verrou)*
- Remplacer le couperet `FIN_RECONNAISSANCE_2008 = 31/12/2026` par la mécanique du texte :
  - attestation 2008 détenue = reconnue **sans condition jusqu'au 12/03/2029** ;
  - **après le 12/03/2029** : reconnue UNIQUEMENT si une **remise à niveau ponctuelle** est
    enregistrée (date + organisme) — sinon invalide, examen à repasser ;
  - remise à niveau faite → cycle périodique **≤ 7 ans** (même cycle que les A1/A2/D/E 2025,
    dont le suivi 7 ans est posé au même lot).
- Migration : colonnes de remise à niveau sur `habilitations` (33 ou 34 selon L3).
- Semis démo : dates d'échéance RELATIVES (leçon « dates démo qui pourrissent »).
- **GATÉ visa T3** : la mécanique est codée et testée mais le comportement OFFICIEL reste
  inerte (verrou fermé) jusqu'à lecture confirmée sur pièce par l'organisme. C'est le seul
  lot où le code actuel est TROP STRICT : le corriger est un assouplissement JUSTIFIÉ par
  texte lu verbatim, mais un assouplissement quand même — il attend le visa pour s'exercer
  en Officiel.

### L5 — Exemption des hermétiques scellés étiquetés (Q6) *(MOINS de contrôles — le lot le plus surveillé)*
- Corps de `exemptionControle` (les 3 seuils STRICTS : annexe I < 10 t éq. CO2 · annexe II
  section 1 < 2 kg · résidentiel < 3 kg ; gate scellé ET étiqueté) dans les deux miroirs.
- ⚠️ Vérifié : la fonction n'a AUJOURD'HUI **AUCUN APPELANT**. L'écrire ne suffit pas : la
  **brancher** de façon UNIFORME sur les ~6 consommateurs de fréquence (moteur des 2 stores,
  alertes, plaque F-Gas, fiche machine, CERFA cadre 7) via une composition unique.
- **Jamais exempter en silence** : le motif d'exemption s'affiche (plaque, fiche machine,
  motif de fréquence).
- Priorité dans les bandes de recouvrement (HFO 1,5 kg hermétique : contrôlé par Q7,
  exempté par Q6) : **l'exemption prime à l'intérieur de sa bande** — c'est le sens du texte
  et du tableau tranché par Franck. Écrit noir sur blanc dans le module et testé.
- **GATÉ R2** : le « OU » résidentiel. 2,9 kg de R-404A résidentiel = **11,4 t éq. CO2** —
  la règle résidentielle exempterait un équipement plus de deux fois au-dessus du seuil de
  contrôle de 5 t. Le OU est fidèle au texte, mais tant que R2 n'est pas répondu, la branche
  résidentielle est codée MAIS le champ `residentiel` reste à 0 sur tout le parc (backfill
  migration 32) — aucun équipement du lycée n'est résidentiel.
- **GATÉ visa T3** : activation réelle à la réouverture seulement (verrou fermé = inerte).
- Piège consigné : les MÊMES booléens `hermetique_scelle`/`hermetique_etiquete` pilotent
  DEUX effets (aptitude 6 kg Q1 + exemption Q6). Cocher l'un ouvre l'autre : l'écran machine
  doit le DIRE (note en direct, comme P1-1 l'a fait pour la détection).

### L6 — Réouverture du mode Officiel (A)
`VERROU_LIVRAISON` → false (2 miroirs), dégel de `server/test-officiel-e2e.mjs` + ajout du
cas « mouvement CONTROLE en Officiel » (consigne P7-e), 99+ exécutions vertes.
**Prérequis** : L1 clos · visa T3 sur Q3/Q6 · gate cat. II confirmé (R1).

### L7 — Fusion des stores (B / P2-1)
APRÈS la simulation d'audit d'août. Plan dédié à écrire. Exigence : conserver un oracle de
parité même après fusion.

---

## 5. Décisions — état exact

**TRANCHÉES par Franck (24/07)** : Q1 confirme l'existant · Q2 cat. II à 2 kg par opération,
étanchéité sans limite · Q4 refus CERFA officiel R-744/R-290/R-717 (revirement assumé sur
l'arbitrage de juillet) · Q5 blocage sec (le brouillon non validable existe déjà par
construction ; sa justification se formule comme motif d'abandon, jamais comme contournement)
· Q6 activer les 3 seuils · Q7 seuils confirmés · Q8 HCFC 2 kg · Q9 restriction contextuelle
· Q11 catalogue 17 colonnes, R-1234ze(E) désambiguïsé (le moteur distingue déjà les codes
avec parenthèses — convention à documenter, pas de garde à coder).

**TRANCHÉES par la vérification (texte primaire lu verbatim)** : Q3 mécanique
2026-délivrance / 2029-remise-à-niveau / cycle 7 ans (PAS de couperet sec) · citation
13/10/2008 · Q10 ordre corrigé (§3).

**DÉLÉGUÉES côté strict (révocables)** : cat. II hermétique = 2 kg · cat. III 2008 = 2 kg ·
libellé Q7 par affichage seul · refus Q4 posé au PASSAGE et à la VALIDATION.

**GATÉES** :
- **R1** (Franck) : cat. II 2008 sur machine hermétique — 2 kg quand même, ou 6 kg ?
- **R2** (Franck, puis visa) : la règle résidentielle < 3 kg peut-elle exempter un équipement
  au-dessus du seuil tCO2eq (ex. chiffré : 2,9 kg de R-404A = 11,4 t) ?
- **R4** (Franck) : ajoute-t-on le champ « usage thermique » (froid/clim/PAC, migration 33),
  ou tout le parc au régime le plus strict ?
- **Visa T3** (organisme agréé) : Q3 (art. 7/11 sur pièce) · Q6 (art. 5 sur pièce) ·
  Q9 (art. 13 sur pièce, dates 2030/2032) · exceptions et MISE_EN_SERVICE.

## 5 bis. Revue adversariale du lot L1 (24/07) — corrigé et consigné

**12 constats, tous TIRÉS ; parité et frontières intactes** (6 560 entrées de fuzz sur le
moteur d'aptitude, 0 divergence ; 2 000/3 000/6 000 g pile refusés partout).

**Corrigé dans le lot** :
- ⭐ le critère de la condition 18 (attribut brut « AUCUNE ») était **contournable** — un
  fluide créé SANS fiche (le choix par défaut du formulaire, familles CO2/HC/NH3) passait,
  et vider la fiche du R-744 levait le blocage. Prouvé en le tirant sur les DEUX stores,
  puis FERMÉ : le fait suit la **classification moteur** (fiche explicite > repli famille >
  inconnue = hors périmètre). Un fluide inclassable n'obtient pas de CERFA officiel.
- la **synthèse « qui intervient ? » contredisait le verdict d'opération** : un cat. II
  seul sur 10 kg lisait REFUS sur la fiche machine quand le wizard autorisait le contrôle
  d'étanchéité. Le profil dépassé DÉGRADE désormais vers `{ ETANCHEITE, sans limite }`
  au lieu de disparaître (préexistant pour l'A2, étendu par L1a — corrigé pour tous).
- miroir `server/equipement.js` remis en LITTÉRAL (4 corps paraphrasés — préexistant P1-1,
  0 divergence de comportement sur 216 appels, mais la doctrine exige le caractère près).
- deux notes d'écran alignées (machine-form : le 6 kg est un privilège du régime 2025 ;
  fluide-form : une famille non fluorée sans fiche = pas de fiche officielle).

**Consigné, non corrigé (gaté ou mineur)** :
- garde de saisie OPTIONNELLE : exiger une fiche explicite à la création d'un fluide de
  famille CO2/HC/NH3 (durcit la création — **gaté Franck**, le repli moteur couvre déjà le
  risque Officiel) ;
- verdict INFIRMÉ : `updateFluide` qui vide une fiche n'est PAS une faille depuis le
  correctif (le repli famille reprend la main) — journalisation dédiée en amélioration
  possible ;
- moteur pur : un `chargeKg` non numérique (NaN, « 1,5 » à la française) vaut « charge
  inconnue » et n'empêche pas un verdict favorable — inoffensif via les stores (garde
  stricte en amont qui replie sur null), consigné pour P2-2 ;
- le fait périmètre se calcule sur le fluide du MOUVEMENT (clé étrangère du référentiel),
  pas celui de la machine — l'incohérence machine/fluide relève d'une autre garde,
  consignée.

## 5 ter. Revue adversariale du lot L4 (24/07) — corrigé et consigné

**13 constats, tous TIRÉS ; frontières de dates et parité INTACTES** (12/03/2029 pile,
cycle 7 ans au jour près, parité totale). **7 racines confirmées, toutes corrigées** :
- ⭐ `remiseNiveauLe` n'était jamais validée : « 2028-99-99 » passait les comparaisons de
  chaînes et RECONNAISSAIT l'attestation jusqu'en 2035 (dans le fait `aptitude` du mode
  Officiel !). Fermé à DEUX étages : garde de saisie au CRUD (format ancré + calendrier
  réel + **jamais dans le futur** — une formation non faite ne s'atteste pas d'avance) et
  défense en profondeur au moteur PUR (remise illisible = ne compte pas ; `plusAnnees`
  contrôle le calendrier et cadre l'année sur 4 chiffres).
- la garde de délivrance 2008 se contournait par `updateHabilitation` (créer légal, patcher
  2027) : les gardes de création valent désormais AUSSI en correction (2 stores).
- l'alerte était AVEUGLE dès qu'une remise existait : tardive ou cycle échu = attestation
  morte SANS alerte, le tableau contredisait le moteur. Refondue sur l'ÉTAT RÉEL
  (`habilitationReconnue`) : CRITIQUE motivé (sans remise / tardive / cycle échu),
  IMPORTANT en sursis, échéance affichée = min(dateFin propre, butoir).
- `habilitationReconnue` : défaut-REFUS (régime inconnu, date de référence illisible —
  plus jamais « reconnu par accident »).
- semis démo : le professeur porte désormais sa remise à niveau (date relative) — la démo
  montre le champ rempli ET le cas Sophie (sans remise, alerte vivante).

**Choix consigné** : une remise à niveau POSTÉRIEURE au butoir reste enregistrable après
coup (c'est un FAIT ; le moteur la juge non réparatrice et l'alerte CRITIQUE le dit) —
seul le déchet de format est refusé. Cohérent avec « avertir, jamais bloquer » pour les
faits, « refuser » pour les impossibilités.

**Consigné, non corrigé** :
- HORS-LOT (préexistant P0-5) : l'écran de CONSEIL (`conseil-intervenant`) ne filtre pas
  par `habilitationReconnue` — une 2008 non reconnue s'affiche « autorisée » en conseil
  pendant que l'Officiel la refuse. À traiter dans un lot de suivi (le composant reçoit
  `dateReference`, le branchement est prêt).
- import JSON : les gardes de délivrance et de remise ne sont pas rejouées à l'import
  (asymétrie MINEURE, même statut que d'autres invariants d'import — consigné pour P2-2).
- rappel d'approche de l'échéance du cycle 7 ans (horizon) : à ajouter plus tard si utile.

## 6. Proxies et limites ASSUMÉS (consignés, pas cachés)

- « Ouverture du circuit » (Q2) : dérivée du TYPE de mouvement (contrôle d'étanchéité =
  sans ouverture). Aucun booléen déclaratif ; un contrôle qui ouvrirait le circuit en
  pratique serait mal classé, indétectablement. Proxy assumé — si la finesse devient
  nécessaire : champ déclaratif, jamais une devinette.
- Les conditions Officiel (16, 17, 18, condition 10 raffinée) restent INERTES verrou fermé :
  un test « en conseil » ne prouve rien pour l'Officiel — les suites simulent le verrou
  ouvert pour tester le blocage réel.
- Aucune règle changée ne réécrit un mouvement scellé ni un CERFA émis : la restriction
  s'évalue à la saisie, le passé reste au barème du jour de l'écriture.
- Une migration est IMMUABLE : les nouvelles colonnes (usage thermique, remise à niveau)
  = migrations 33+, jamais une retouche de la 32.
