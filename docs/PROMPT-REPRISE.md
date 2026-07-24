# Prompt de démarrage — inerWeb Fluide, chantier « REGISTRE AUDIT-PROOF » (à coller dans un nouveau chat)

> Copier tout ce qui suit comme PREMIER message d'un nouveau chat. Il est autonome : contexte, état
> exact, cap, prochaine brique, gates, méthode et consignes.
>
> **Session conseillée : Opus, effort très élevé** (chantier probatoire/réglementaire, briques
> testées une à une). PAS d'ultracode hors point critique.
>
> **⭐⭐⭐⭐⭐⭐ 24/07 — LOTS RÉGLEMENTAIRES Q1→Q11 : L1 + L4 + L5 FUSIONNÉS
> (PR #9/#10/#11), TOUT VERT 101 EXÉCUTIONS.** Les décisions Franck du 24/07
> (issues d'une analyse tierce) ont été passées à la vérification croisée
> AVANT codage (27 agents, textes primaires) : deux erreurs de l'analyse
> corrigées sur pièce (**12/03/2029 = butoir de remise à niveau, PAS un
> couperet** ; aptitude des personnes = **arrêté du 13/10/2008**) et son
> ordre « B→C→A » réfuté (les règles vivent déjà dans les modules purs).
> Plan de référence = **`docs/PLAN-LOTS-REGLEMENTAIRES-Q1-Q11.md`** (décisions
> TRANCHÉES/DÉLÉGUÉES/GATÉES + les 2 revues adversariales §5 bis/5 ter).
> **L1** : cat. II 2008 à 2 kg PAR CATÉGORIE (le seuil global écrasait tout),
> condition 18 HORS_PERIMETRE_FLUORE (fait = CLASSIFICATION MOTEUR, repli
> famille — l'attribut brut était contournable, prouvé puis fermé), libellé
> annexe II section 1, suite doublée test-perimetre-cerfa. **L4** : migration
> 33, contrat v11 — transition 2008/2025 VRAIE (reconnue jusqu'au 12/03/2029
> puis remise à niveau + cycle 7 ans ; l'ancien couperet aurait bloqué des
> techniciens en règle dès 2027), garde de délivrance, alerte fondée sur
> l'état réel, « 2028-99-99 » ne ressuscite plus rien (2 étages de gardes).
> **L5** : exemption hermétique CODÉE derrière `EXEMPTION_HERMETIQUE_ACTIVE
> = false` (calculerExemption, 3 seuils stricts, cas R2 chiffré) — geste
> d'activation consigné §L5 (8 sites), APRÈS visa T3 + R2. **Catalogue Q11**
> livré (`docs/CATALOGUE-FLUIDES-A-VALIDER.md`, 10 fluides, 0 litige, RIEN
> semé). **GATÉ Franck : R1 · R2 · R4 · catalogue ligne à ligne · visa T3.**
> **RESTE en code : L2 (tests sécurité P2-2) · L3 (Q9 conseil + champ usage
> thermique si R4) · réouverture (L6) après visa · fusion stores (L7) après
> l'audit d'août. Suivi consigné : conseil-intervenant ne filtre pas encore
> par habilitationReconnue (préexistant).**
>
> **⭐⭐⭐⭐⭐ P1-1 (MODÈLE D'ÉQUIPEMENT) EST TERMINÉ — 23/07, EQ-1→EQ-10, plan
> `docs/PLAN-P1-1-MODELE-EQUIPEMENT.md`, TOUT VERT 98 exécutions, ⏳ PR à
> relire/fusionner par Franck.** Décisions E1→E7 **déléguées** par Franck (« fais
> au mieux, autonomie, le plus réglementaire ») → lecture « jamais moins de
> contrôles qu'exigé ». **Le trou réel soldé** : cocher « détection permanente »
> divisait par deux les contrôles sans preuve — l'allègement exige désormais une
> vérification < 12 mois (E1). Migration 32 (hermétique/étiqueté/résidentiel/
> sous-type mobile listé/vérif détection, backfill conservateur). Module pur
> `equipement.js` + miroir. **Deux dettes soldées** : P0-5 (hermétique plus en
> dur, seuil 6 kg si scellé ET étiqueté) et P0-6 (`estMachineMobile`→`mobileListe`,
> mobile LISTÉ seulement). 2 alertes `alr-detection-*`, condition Officiel 17
> **inerte tant que le verrou est fermé**. E3 = **aucune exemption codée** (les
> 3 seuils non confirmés sur pièce ; `exemptionControle` activable sans réécriture
> — geste Franck E3(b)). Contrat **v10 (93 méthodes)**. Consigné antérieur à P1-1 :
> `machine.statut` figé si on rétrograde un mobile après clôture immédiate.
>
> **⭐⭐⭐⭐ P1-2 (ÉCRAN D'ADMINISTRATION DU RÉFÉRENTIEL DES FLUIDES) EST
> TERMINÉ — 23/07, AF-1→AF-9, plan `docs/PLAN-P1-2-ADMIN-FLUIDES.md`, TOUT
> VERT 95 exécutions, PR #4.** Franck ajoute,
> modifie et désactive ses gaz lui-même : `createFluide`/`updateFluide`
> (2 stores + parité + REFERENT_ADMIN), migration 31 `fluides.actif`
> (désactivation, JAMAIS de suppression), vue + modale, `impact` enfin
> dérivé du PRP des DEUX côtés (il n'existait que dans le monde démo),
> `referentiel-fluides.csv` au dossier scellé, suite doublée de 55 vérifs
> dont ⭐ « corriger le référentiel ne retouche NI le prpFige d'une écriture
> validée, NI son empreinte, NI son CERFA, NI la chaîne ». Contrat **v9,
> 93 méthodes**. Décisions D1→D7 validées par Franck AVANT le code (voir le
> plan) ; revue adversariale : **1 bloquant** (un export ANTÉRIEUR
> ressuscitait un fluide désactivé — une clé absente ne vaut pas décision)
> et **1 important** (PRP négatif classé « impact FAIBLE ») corrigés.
> **RESTE de P1-2 (hors code, D7)** : pré-remplir le catalogue manquant
> (R-448A, R-449A, R-452A/B, R-454A/B/C, R-513A, R-1234ze, R-717…) — chaque
> ligne est une valeur réglementaire à faire valider par Franck, une par
> une ; l'écran le rend autonome pour les saisir au fil de l'eau.
>
> **PROCHAINE BRIQUE : au choix de Franck** — P0-9 (hors code, révocation
> des clés v7) · volet RGPD (notice/durées/DPD, surtout hors code) ·
> réouverture du mode Officiel (verrou T1) · T3 (relecture organisme
> agréé) · autres constats P1 de l'audit.
>
> --- ci-dessous, l'énoncé d'origine de la brique, conservé pour mémoire ---
>
> Besoin exprimé mot pour mot :
> « on doit pouvoir accéder à un tableau où tous les gaz sont rentrés, en
> ajouter de nouveaux ou modifier les informations » — Franck veut être
> AUTONOME, ne plus dépendre d'une migration (donc d'un développeur) pour
> corriger un PRP ou déclarer un fluide. C'était déjà demandé avant, et c'est
> le constat P1-2 de l'audit (« référentiel trop court, 9 entrées, pas d'écran
> d'administration, risque de repli PRP/famille pour un fluide hors table »).
> **État de départ VÉRIFIÉ : le contrat n'a que `getFluides` (lecture) — AUCUNE
> mutation fluide n'existe.** Tout est à créer : `createFluide`/`updateFluide`
> (2 stores + parité + relais local-store + entrées METHODES_CONTRAT + bump du
> compte dans test-contrat), écran d'édition, tests doublés.
> ⚠️ **PIÈGES À NE PAS RE-PAYER (ils ont déjà coûté cher) :**
> ① le **PRP est FIGÉ dans les écritures scellées** (`prpFige`, empreinte v2) —
> modifier le référentiel ne doit JAMAIS réécrire une écriture passée ni
> recalculer un CERFA déjà émis : le passé reste au PRP du jour de l'écriture ;
> ② **une migration est IMMUABLE** — ne jamais faire évoluer une migration
> existante pour changer une valeur (leçon du 16/07, migration 21 corrigée) ;
> ③ la **fiche réglementaire par fluide** (migration 21 : `contient_hfc`,
> `contient_hfo`, `categorie_cadre7`, `source_prp`) doit être saisissable —
> c'est elle qui PRIME sur le libellé de famille dans le moteur ;
> ④ le moteur `reglementation-fluides.js` (+ miroir serveur `api.js`) est la
> SOURCE DE VÉRITÉ du cadre 7 : ne pas le contourner ;
> ⑤ **un PRP ajusté localement ne doit jamais être réétiqueté « F-Gas III »**
> (sa source reste honnêtement inconnue) et **l'import d'un export ancien ne
> doit pas écraser la fiche actée** (constat de revue du 16/07, prouvé) ;
> ⑥ un fluide **supprimé** ne doit pas casser les écritures qui le référencent
> (préférer une désactivation à une suppression — à trancher au plan).
>
> **⭐ DÉCISION FRANCK 23/07 — T2 (R-455A) EST TRANCHÉ, LE VERROU TOMBE :** règle
> générale = **en cas de valeurs concurrentes, retenir le PRP le PLUS ÉLEVÉ**
> (principe de précaution : il déclenche les contrôles plus tôt). Pour le
> R-455A cela **CONFIRME les 148 déjà en place** → **aucun changement de code**,
> la table réglementaire est close sur ce point. La souplesse viendra de
> l'écran d'administration ci-dessus, pas d'une nouvelle migration.
>
> **⭐⭐⭐⭐ ÉTAT AU 23/07 — P0-8 DÉCLARATION ANNUELLE 11 RUBRIQUES ✅ FUSIONNÉ
> (PR #3, merge `102acf4`, DA-1→DA-8, plan `docs/PLAN-P0-8-DECLARATION.md`,
> périmètre A validé Franck, main TOUT VERT 93 exéc., vérifié au NAVIGATEUR).
> ⭐ LES 8 PREMIERS P0 SONT SOLDÉS CÔTÉ CODE — il ne reste que P0-9 (HORS code).** Le pseudo-bilan « déclaration
> ADEME » (incomplet, `cessions_kg=0`, BSFF compté en destruction) est remplacé
> par la déclaration réglementaire de l'arrêté du 21/11/2025. Migrations 28
> (`bsff.issue_traitement`) / 29 (table `cessions`) / 30 (vue `bilan_matiere`
> recréée pour compter les cessions). 2 captures : `attesterIssueBsff`
> (BSFF ≠ destruction — seule une issue DESTRUCTION attestée compte en rubrique 9)
> + `createCession` (décrémente la bouteille, rubrique 10). Moteur PUR
> `declaration-annuelle.js` (ESM + miroir CommonJS, parité prouvée,
> `test-declaration-annuelle` 30 vérifs) : rubriques 2-5 agrégées PAR TYPE,
> stocks 11 depuis photos N-1/N, anomalies (photos absentes, BSFF sans issue).
> `getDeclarationAnnuelle` (2 stores). UI : `bilan.js` retire « ADEME » + section
> 11 rubriques + CSV + bandeau anomalies ; `dechets.js` (attester l'issue) ;
> `fiche-bouteille.js` (céder à un tiers). Dossier d'audit scellé + declaration/
> cessions CSV + colonnes issue au bsff.csv. Contrat DataStore **v8** (91 méth.).
> **PROCHAINE ÉTAPE : P0-9 (HORS code — preuve de révocation des clés v7) + volet
> RGPD (surtout hors code, Franck+DPD) + décisions T2 (R-455A 148→146 pour la
> cible officielle) / T3 (relecture organisme agréé).** Le mode Officiel reste
> FERMÉ (`VERROU_LIVRAISON=true`). ⏳ **PR ouverte, à relire/fusionner par Franck.**
>
> **⭐⭐⭐ ÉTAT AU 22/07 (nuit) — P0-6 CYCLE FUITE TERMINÉ (CF-1→CF-6, plan
> `docs/PLAN-P0-6-CYCLE-FUITE.md`, décisions G1-G6 arbitrées par Franck AVANT
> code, TOUT VERT 92 exéc.)** : clôture d'une fuite STRICTE J+1 (fin de la
> convention « à date égale » — G1 tranchée par Franck, jour même réservé aux
> équipements MOBILES listés, migration 27 `machines.type_installation`
> défaut FIXE — G4 : le champ MAINTENANT) · échéance de suivi = 1 MOIS CIVIL
> (écrêtage fin de mois) · clôture tardive CONSIGNÉE jamais bloquée
> (`clotureEnRetard`, fiche + ZIP scellé) · écart P0-7 §7(a) SOLDÉ (contrôle
> annulé = fait dérivé, lectures de fuite sur contrôles ACTIFS,
> `recalculerEffetsMachineApresAnnulation` miroir 2 stores ; §7(b) reste
> consigné). Hors périmètre consigné : compteur de fonctionnement réel
> (24 h à l'heure près, granularité jour = proxy assumé), sous-type mobile
> (P1-1), exploitation du type APRES_REPARATION.
> **PROCHAINE BRIQUE : P0-8 déclaration annuelle 11 rubriques** (dernière
> grosse brique code des P0 ; restent ensuite P0-9 hors code + RGPD + T2/T3).
>
> **⭐⭐ ÉTAT AU 22/07 (soir) — P0-5 APTITUDE OPPOSABLE TERMINÉ (AP-1→AP-5, plan
> `docs/PLAN-P0-5-APTITUDE.md`, TOUT VERT 92 exéc.)** : condition 16
> `APTITUDE_PORTEE` (S·V) — la matrice d'aptitude (notre moteur, PAS le
> `droit-intervention.js` de la RC, zip indisponible en session) est branchée en
> blocage dur : fait `intervenant.aptitude` calculé par les 2 `cadreFicheOfficiel`
> (charge NOMINALE machine, hermétique=false tant que P1-1), miroir serveur
> `server/droit-intervention.js` + suite de parité. Corrections au passage :
> frontières STRICTES (< 3 / < 6 kg, 3,000 pile refusé), cat. II (2008) limitée
> (⚠️ à re-confirmer sur pièce avant réouverture — décisions D1-D5 au plan),
> contrôles P7 mappés ETANCHEITE, `habilitationReconnue` (2008 non reconnue
> après le 31/12/2026, semis démo doté d'une A1 2025 à échéance relative).
> Hors périmètre consigné : cycle de remise à niveau 2029/7 ans (aucun modèle),
> champ machine hermétique (P1-1), alignement du CONSEIL sur la fin de régime.
> **PROCHAINE BRIQUE : P0-6 cycle fuite ou P0-8 déclaration annuelle.**
>
> **⭐ ÉTAT AU 22/07 — CYCLE MATIÈRE (P0-3/4) TERMINÉ : CM-1→CM-4 codés, TOUT VERT
> 91 exéc.** ⚠️ L'audit externe (ChatGPT) + la RC S'ÉTAIENT TROMPÉS : ils bloquaient la
> charge depuis du récupéré et imposaient une table de traitement WORM. FAUX.
> **Franck (frigoriste) a tranché la VRAIE règle = CONSERVATION PAR MACHINE D'ORIGINE** :
> on a le DROIT de remettre dans une machine le fluide qu'on en a tiré (réemploi
> maintenance), sans retraitement ; on ne réintroduit dans M que ce qui a été récupéré de M
> (le reste part en déchet) ; tout complément = fluide ACHETÉ vierge/recyclé/**régénéré
> certifié** (jamais produit en interne). **2ᵉ décision Franck 22/07 : la surcharge de
> réemploi est SIGNALÉE, JAMAIS BLOQUÉE — même en OFFICIEL** (pas de forçage, pas de
> rectification imposée ; mémoire `feedback_surcharge_reemploi_avertir`). **FAIT** :
> CM-1 `a799304` (module pur `avoir-origine.js`, AUCUNE migration) · CM-2 `55b8704`
> (alerte `alr-reemploi-`, 2 stores) · CM-3 `3264f5b` (garde état↔type
> `verifierCoherenceEtatBouteille` miroir 2 stores : NEUVE=acheté VIERGE/RECYCLE/REGENERE,
> RECUPERATION=RECUPERE/MELANGE/DECHET/DOUTEUX, jamais de requalification interne ; état
> d'une NEUVE non verrouillé ; le reste — schéma, CERFA QB/QC, PJ certificat — était DÉJÀ là) ·
> CM-4a `6ff15d8` (bandeau réemploi wizard étape 4, zone dédiée jamais bloquante) ·
> CM-4b `b47944c` (mention SYSTÈME cadre 14 CERFA, écartée de la correction élève) ·
> CM-4c `689baf7` (bloc avoir d'origine sur la fiche, partition des états dans la modale,
> zone certificat fournisseur `categorieSeule`). Vérif navigateur faite (port jetable).
> **Revue adversariale du lot faite : 1 bloquant corrigé (`3c411bc`, état hérité préservé
> à l'écran) ; puis CM-5 = les TRANSFERTS propagent les lots d'origine au prorata
> (l'important n° 3 de la revue — mention CERFA fausse sur consolidation — est SOLDÉ, la
> gate avant réouverture Officiel est levée).** Migrations restées à **26**.
> **PROCHAINE BRIQUE (au choix Franck) : P0-5 aptitude opposable · P0-6 cycle fuite ·
> P0-8 déclaration annuelle** (§ plus bas). ⚠️ Tout ce qui
> suit CE bloc et décrit le cycle matière comme « blocage + table de traitement » est
> ANTÉRIEUR à la refonte : s'en tenir au plan refondu `docs/PLAN-P0-3-4-CYCLE-MATIERE.md`.

---

Tu reprends **inerWeb Fluide**, logiciel **LOCAL** de traçabilité des fluides frigorigènes
(F-Gas / CERFA 15497*04) pour lycées professionnels (filière froid/clim).
- **Dépôt** : `C:\git\inerweb-fluide` (clone de `frigorx/-inerweb-fluid-cerfa-fi-bsd-4`).
  Source de vérité = son `CHANGELOG.md` (dernier incrément en tête).
- **Auteur et utilisateur** : Franck Henninot (LP Jacques Raynaud, Marseille). Réponds en **français
  simple, zéro anglicisme, zéro emoji dans le code**.

## LE CAP (tranché par Franck le 20/07 — ne pas rouvrir)

**REGISTRE OFFICIEL UNIQUE** (opposable, sans doublon papier) = barème MAXIMAL. Un 2ᵉ audit
externe (ChatGPT) a donné NO GO en l'état comme registre unique → plan de correction en cours.
Le mode Officiel est REFERMÉ (`VERROU_LIVRAISON=true`, décision T1) le temps des P0 ; la suite
`server/test-officiel-e2e.mjs` est GELÉE par une garde en tête (consigne de réouverture incluse).

## ÉTAT (20/07 nuit) — dépôt PROPRE, TOUT VERT 87 exécutions, poussé jusqu'à `9dd9b6b`

- **P0-2 ✅ et P0-7 COMPLET (P7-a→e)** : le contrôle d'étanchéité EST un mouvement (parcours
  signé/scellé/WORM, carte wizard, CERFA, gardes structurelles — `createControle` direct
  FORMATION-only PAR NATURE, `mouvementId` forgé REFUSÉ, import orphelin refusé, échéance
  réglementaire calculée). Plan = `docs/PLAN-P0-INTEGRITE-CONTROLES.md`.
- **⭐ LES 3 BRIQUES AUTONOMES DE LA RC ChatGPT SONT REPRISES ET PROUVÉES (20/07 nuit)** :
  - **P1-5 ✅** (`065166a`) mode LAN = **HTTPS OBLIGATOIRE** (`IWF_TLS_CERT`/`IWF_TLS_KEY`,
    TLS ≥ 1.2, HSTS, refus de démarrer sans certificat, origine LAN `https://` seule ;
    suite `test-lan-https` 11 vérifs sur 127.0.0.2 ; loopback HTTP inchangé).
  - **P2-3 ✅** (`ec4ecf8`) scrypt **N=2^17** (OWASP) + re-hachage transparent du profil hérité
    N=2^15 à la connexion (même transaction, journal `RENFORCEMENT_HASH_MOT_DE_PASSE`).
    ⚠️ `chiffrement.js` GARDE N=2^15 : les archives chiffrées existantes en dépendent.
  - **P1-6 ✅** (`d53ef91`) base vive **REFUSÉE** sous OneDrive/Drive/Dropbox
    (`db.verifierEmplacementBase` dans `db.ouvrir` + démarrage serveur, dérogation
    `IWF_AUTORISER_BASE_SYNCHRONISEE=1` ; lanceur : `.env` + installs NEUVES sous
    `%LOCALAPPDATA%`, **continuité si `data\` existe déjà** — adaptation protectrice vs la RC ;
    suite `test-emplacement-base` 20 vérifs).
  - Revue adversariale (1 agent) : **0 bloquant, 0 important** ; oracle de timing du double
    scrypt PROUVÉ inexploitable (0,1 ms) ; 3 mineurs consignés au CHANGELOG (HSTS inerte sur
    IP · sauvegardes des installs neuves plus offsite par défaut, à rappeler à l'onboarding ·
    cas limites du parseur `.env`).

## LA SOURCE DE CODE : RC ChatGPT `8.1.0-rc.1`

Zip sur le Bureau (`inerWeb-Fluide-8.1.0-rc.1-portable.zip`, SHA-256
`e09ea34690b49ce9e14b0f7bc05a1e406372f61443242aee1a66317e3e3f251e`). Travail réel et large mais
**NON testé, hors git, contrat v8 ≠ notre v7, R-455A resté 148**. **DÉCISION FRANCK 20/07 :
notre dépôt git RESTE LA BASE ; on pioche la RC brique par brique RE-testée, JAMAIS d'import en
bloc.** Plan = `docs/PLAN-INTEGRATION-RC-CHATGPT.md` (étape 1 — briques autonomes — SOLDÉE).
Pour piocher : ré-extraire le zip dans un dossier jetable + `diff` le fichier contre notre dépôt.

## PROCHAINE BRIQUE (au choix Franck) : les GROSSES briques métier de la RC

Chacune = UN chantier avec **plan écrit et relu AVANT code** (comme le lot C), dans l'ordre
conseillé :
1. ~~**P0-3/P0-4 — cycle matière**~~ ✅ **TERMINÉ 22/07** (CM-1→CM-4, refondu — voir le
   bloc d'état en tête ; la description RC « blocage + WORM » était fausse).
2. ~~**P0-5 — aptitude opposable**~~ ✅ **TERMINÉ 22/07** (AP-1→AP-5, notre moteur
   corrigé et branché — voir le bloc d'état en tête ; comparateurs et cat. II corrigés).
3. ~~**P0-6 — cycle fuite**~~ ✅ **TERMINÉ 22/07** (CF-1→CF-6 — voir le bloc d'état en
   tête ; l'écart « effets machine d'un contrôle annulé » du plan P0-7 §7(a) est soldé).
4. **P0-8 — déclaration annuelle 11 rubriques**.
**Hors code** : P0-9 (révocation clés v7) · volet RGPD (notice/durées/DPD).

**Décisions transverses en attente (gatées Franck)** : **T2** R-455A 148→146 (à re-trancher pour
la cible officielle — la RC a gardé 148) · **T3** relecture organisme agréé + DPD (délai long).

## À LIRE EN PREMIER (avant de coder)

1. **Mémoire** (`G:\Mon Drive\claude-memoire\`) : `MEMORY.md` puis `project_inerweb_fluide.md`.
2. Tête de **`CHANGELOG.md`** — dernier état.
3. **`docs/CARTE-CODE.md`** — l'architecture en une page, AVANT toute exploration.
4. Le plan de la brique choisie : `docs/PLAN-INTEGRATION-RC-CHATGPT.md` +
   `docs/CONSTATS-AUDIT-EXTERNE-2026-07-20.md` (constats triés) +
   `docs/AUDIT-INERWEB-FLUIDE-2026-07-20.md` (rapport complet).
5. `git log` + `git status` — ⚠️ des sessions parallèles écrivent parfois sur ce dépôt.

## MÉTHODE / RÈGLES D'OR (ne rien casser)

- **RÉGLAGE à annoncer avant chaque tâche de code** (grille : mémoire
  `feedback_reglages_intelligence`).
- **carte → vérifier → plan (grosses briques) → modif chirurgicale → TESTS VERTS → revue
  adversariale (sobre : soi-même ou 1 agent) → commit.** `node outils/lancer-tests.mjs --tout`
  doit être **TOUT VERT (99 exécutions)** avant tout commit.
- **JAMAIS toucher au `data/` RÉEL** : vérification dynamique = serveur sur PORT jetable +
  `IWF_CHEMIN_BASE` base jetable (jamais 2011). Corps des requêtes API = **`{params:{...}}`**.
  **« Une faille se prouve en la TIRANT, pas en la lisant. »**
- **Parité STRICTE `server/api.js` ↔ `v8/js/data/demo-store.js`** (test-contrat, mapping qui
  lève sur clé inconnue → déclarer les nouveaux champs des deux côtés). Module pur du front
  réutilisé côté serveur = recopié en littéral (CommonJS) + test de parité qui discrimine.
- **Migrations** : registre `server/migrations.js`, dernière = **32**, prochaine = **33**.
  ⚠️ Une migration est IMMUABLE (littéraux figés, jamais de constante partagée qui évolue).
  Triggers WORM recréés à chaque migration qui touche leurs tables ;
  `PRAGMA recursive_triggers = ON` obligatoire.
- **Empreinte des mouvements** (`hash-mouvement.js`, v1 figée/v2) : ne JAMAIS recalculer
  rétroactivement ; toute évolution = versionnage + plan + tests sur empreintes CONNUES.
- Commits multi-lignes via `git commit -F fichier` (jamais le here-string).
- **RÈGLE ABSOLUE : ne JAMAIS coder une valeur ou une règle réglementaire NOUVELLE sans la
  validation de Franck.** En CONSEIL on ne bloque jamais ; le mode OFFICIEL, lui, DOIT bloquer.

## RESTE CONSIGNÉ (non bloquant)

- Écarts du plan P0-7 §7 : l'annulation d'un mouvement CONTROLE ne neutralise pas les effets
  machine du contrôle lié (à revoir avec P0-6) · l'échéance du contrôle ACCESSOIRE n'est pas
  mise à jour (historique).
- 3 mineurs de la revue du 20/07 (voir CHANGELOG, bloc P1-6).
- Hors code : relecture finale de la liste du lot B par Franck · simulation d'audit fin août ·
  septembre en PARALLÈLE de la procédure actuelle (2-4 semaines) puis bascule avec secours
  papier — jamais de bascule à sec.
