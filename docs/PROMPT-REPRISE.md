# Prompt de démarrage — inerWeb Fluide, chantier « REGISTRE AUDIT-PROOF » (à coller dans un nouveau chat)

> Copier tout ce qui suit comme PREMIER message d'un nouveau chat. Il est autonome : contexte, état
> exact, cap, prochaine brique, gates, méthode et consignes.
>
> **Session conseillée : Opus, effort très élevé** (chantier probatoire/réglementaire, briques
> testées une à une). PAS d'ultracode hors point critique.
>
> **⭐⭐⭐⭐⭐⭐⭐⭐⭐ ÉTAT AU 26/07/2026 — 3ᵉ AUDIT EXTERNE (verdict NO GO) TRAITÉ.
> B1 + B2 + B3 FUSIONNÉS dans `main`, puis les résidus A18 / A23 / A02.
> TOUT VERT — 121 exécutions** (106 → 121, mesuré par
> `node outils/lancer-tests.mjs --tout`), **207 attaques** à
> `node server/test-securite-negative.mjs`, contrat v13, migration **36**
> (35 migrations, numérotées de 2 à 36), verrou Officiel toujours FERMÉ.
> ⚠️ Ce bloc part dans le paquet d'audit : tout chiffre qui y figure doit être
> celui que la commande citée produit le jour de l'envoi.
>
> **MÉTHODE — c'est elle qu'il faut retenir.** 31 constats inventoriés sans
> filtre, puis **TIRÉS en bac à sable** (jamais lus), puis contre-épreuve
> adversariale de chaque verdict. Résultat : **6 vrais trous** (A03 A04 A05
> A06 A07 A14), **1 désaccord métier** (A02), plusieurs constats **périmés ou
> déjà tranchés**. Puis 3 lots codés en worktrees isolés, 3 revues
> adversariales, 3 passes de correction, 3 contrôles finaux.
>
> **⚠️ A02 — DÉSACCORD MÉTIER MAINTENU, ARGUMENTÉ ET MESURÉ.** Le constat
> demandait que Formation et Officiel tiennent des stocks séparés. Le
> contrefactuel a été TIRÉ : avec une fiche Formation rendue INERTE sur les
> stocks, le gaz part quand même dans la machine pendant le TP → écart de
> balance non justifié → blocage du mode Officiel. Autrement dit, la correction
> demandée produit l'anomalie qu'elle veut prévenir. Le motif de fond est
> métier : chez Franck, Formation = registre RÉEL de l'atelier portant un
> document NON opposable ; le monde fictif, c'est le mode DÉMO. Décision Franck
> (25/07) : « par défaut, s'ils utilisent l'application c'est qu'ils ont
> manipulé du vrai fluide ; c'est moi qui valide le CERFA à la fin ».
> **Consigne interne : décision prise et motivée, à ne pas rouvrir sans élément
> nouveau.** La mesure du contrefactuel est reproductible, et l'avis de
> l'auditeur sur cette mesure reste demandé — un élément nouveau, c'est
> précisément cela.
>
> **CE QUE LES 3 LOTS FERMENT** (détail complet en tête de `CHANGELOG.md`) :
> - **B1 — « une règle, pas une porte »** (A05+A06). TROISIÈME occurrence du
>   motif L2-i. La garde vivait sur `updateMachine` seulement : un élève créait
>   une machine « hermétique + étiquetée » et le seuil d'aptitude passait de 3 à
>   6 kg (mesuré). Un filtre UNIQUE traverse les deux portes ; `detectionPermanente`
>   et `chargeNominaleKg` y entrent aussi (ils déplacent un seuil) ; la charge
>   ACTUELLE reste ouverte (geste du TP). Fiche personnel PARTITIONNÉE : état
>   civil ouvert, gouvernance et preuves réservées — fermait aussi un déni de
>   service (un élève rétrogradait la fiche du prof, qui ne pouvait plus valider).
> - **B2 — le suivi de remise en filière dit ce qu'il est** (A07). Franck a
>   confirmé le 25/07 : **le lycée émet réellement des déchets fluorés, voire
>   chlorés (bouteille de R-22 à réformer)**. L'objet ne s'appelle plus comme le
>   bordereau réglementaire, le numéro Trackdéchets a un champ distinct, unicité
>   et forme du numéro interne, mention permanente.
> - **B3 — ne plus mentir sur une signature** (A04). L'image est **vraiment
>   décodée** (module pur `png.js` + miroir, sans dépendance tierce) ; la zone
>   restée vierge est refusée ; le témoin de session est porté à la fiche et au
>   dossier d'audit. Décisions Franck consignées : `docs/PLAN-B3-SIGNATURE.md`.
>
> **⚠️ CE QUE LES REVUES ONT RATTRAPÉ — à relire avant d'écrire une garde :**
> à CHAQUE passe, un correctif a introduit un défaut. Une garde a fait
> **DISPARAÎTRE d'une déclaration officielle des masses réellement détruites**
> (sous-déclaration, bloquée avant fusion) ; une autre a **percé le coffre des
> identités** dans le dossier scellé ; une autre a rendu **faux le motif
> « signature périmée »** ; une autre accusait par écrit un **transfert entrant
> légitime**. Aucune n'était visible au filet vert. D'où la règle : *le doute
> retire l'ALLÉGEMENT, jamais l'OBLIGATION, et JAMAIS une masse.*
>
> **GATÉ FRANCK, à trancher** : (a) `MSG_ZONE_VIERGE` = refus NOUVEAU à la pose,
> et le contrôle d'image est rejoué **à chaque lecture** — un registre existant
> portant une case blanche verra sa signature retomber sur « absente »
> (`docs/PLAN-B3-SIGNATURE.md` §6) ; (b) boutons « Arrêter »/« Démanteler » de la
> vue Parc : griser ou laisser le refus en infobulle (présentation, pas sécurité).
>
> **RESTE DE L'AUDIT, hors code** : **T3 abandonné le 26/07/2026** (un organisme
> agréé ne rend pas d'avis sur l'outil d'un tiers — la réouverture du mode
> Officiel ne dépend plus d'un visa mais de la réunion de trois choses : décision
> écrite de l'établissement, pilote mené en parallèle sans écart, risques
> résiduels acceptés nommément ; voir `docs/NOTE-DECISION-ETABLISSEMENT.md` §4 et
> `docs/REGISTRE-DES-ARBITRAGES.md:481`) · P0-9 · chiffrement du
> poste et sauvegarde hors site · RGPD/AIPD · paquet de livraison complet (SBOM,
> licences, actifs) — le paquet d'audit exclut par construction les bibliothèques
> et le gabarit CERFA, ce qui explique les échecs de tests relevés par
> l'auditeur : ce n'est PAS un défaut du logiciel. ⚠️ Chiffres exacts, à ne pas
> arrondir : le rapport en annonçait **16** ; nous en reproduisons **14** en
> retirant bibliothèques et gabarit CERFA, une **15ᵉ** en retirant aussi les
> images — **la 16ᵉ n'est pas reproduite**, et nous refusons d'écrire
> « reproduits à l'identique ». Suites nommées et manipulation exacte :
> `docs/REPONSE-AUDIT-EXTERNE-2026-07-25.md`. **En code, non bloquant** :
> A14 déni de service sur la connexion (scrypt synchrone) — **à traiter AVANT
> d'activer le mode LAN, jamais après**.
>
> --- ci-dessous : blocs d'état ANTÉRIEURS, conservés tels quels. Les chiffres
> qu'ils portent sont ceux de LEUR date, pas ceux d'aujourd'hui : l'état courant
> est le bloc du 26/07 ci-dessus. ---
>
> **⭐⭐⭐⭐⭐⭐⭐⭐ ÉTAT AU 25/07/2026 (soir) — LOT L2 LIVRÉ : SUITE DE SÉCURITÉ
> NÉGATIVE + 9 TROUS FERMÉS. TOUT VERT 106 EXÉCUTIONS *au 25/07 au soir*
> (121 depuis)**, contrat v12 *à cette date* (v13 depuis), migration
> 35 *à cette date* (36 depuis) — aucune migration nouvelle dans ce lot : rien de
> tout cela n'a demandé de toucher au schéma. Branche
> `claude/l2-securite-negative`, 9 commits.
>
> **Méthode : on ne croit personne sur parole, on TIRE.** Inventaire des surfaces
> d'attaque (8 agents, 190 scénarios) → 36 candidats critiques non couverts → 10
> agents les EXÉCUTENT en bac à sable → **26 attaques CONFIRMÉES**, 9 réfutées
> (les gardes de transport, de rôles de mutation, le zip slip et la traversée de
> chemin tiennent bien). Puis correction, puis retrait du correctif pour prouver
> que le test devient rouge.
>
> **`server/test-securite-negative.mjs` — la suite d'attaques TIRÉES.** C'est
> l'endroit où répondre à un auditeur qui demande « montrez-moi que ça résiste ».
> Elle s'est étoffée à chaque lot depuis sa création : on ne cite donc PAS ici un
> décompte figé, on lit celui du jour en la lançant
> (`node server/test-securite-negative.mjs` — **207 le 26/07/2026**).
>
> **Les 9 trous fermés** (détail complet en tête de `CHANGELOG.md`) : **L2-a**
> annulation forgée en SQL direct (une écriture disparaissait des totaux, chaîne
> VERTE) · **L2-b** blanchiment du registre par import (retirer les empreintes
> faisait re-sceller des données falsifiées ; borne MONOTONE contre le
> contournement en deux temps) · **L2-c** « une date est une date » — module pur
> `dates.js` + 2 miroirs, racine commune à 8 attaques (`'31/12/2020'` déclarait
> valide une attestation périmée) · **L2-d** échéance de contrôle forgée à 2099,
> numéro usurpé, charge nominale à 0 · **L2-e** blanchiment du fluide récupéré en
> régénéré, sortie du déchet, R-410A déclaré « hors périmètre », photo
> d'inventaire d'exercice clos, fiche OFFICIELLE injectée par import malgré le
> verrou · **L2-f** base vive et jonction Windows servies par le web · **L2-g**
> réparation réécrite (refermait une fuite rétroactivement), qualification
> réglementaire cochée par un élève · **L2-h** purge du journal d'audit par
> aller-retour export/import · **L2-i** `exporterJSON` non gaté (un élève
> aspirait le journal nominatif et la config du coffre).
>
> **CE QUI RESTE APRÈS L2** : **L6** (réouverture du mode Officiel — toujours
> GATÉ par le visa T3 ; les gardes L2 posées sur l'import se désarment
> automatiquement avec le drapeau) · **L7** (fusion des stores, après la
> simulation d'audit d'août) · hors code : **T3**, **P0-9**, semis du catalogue.
>
> --- ci-dessous : l'état de la session précédente (24-25/07 matin) ---
>
> **⭐⭐⭐⭐⭐⭐⭐ ÉTAT AU 25/07/2026 — main PROPRE, TOUT VERT 104 EXÉCUTIONS,
> contrat v12, migration 35, dernier merge PR #16.** Session des 24-25/07 très
> productive (PR #9→#16). Source de vérité = tête de `CHANGELOG.md` + le plan
> `docs/PLAN-LOTS-REGLEMENTAIRES-Q1-Q11.md`. Fait dans la session :
> - **Lots réglementaires Q1→Q11** (décisions Franck du 24/07 passées à la
>   vérification croisée AVANT code : le 12/03/2029 est un BUTOIR de remise à
>   niveau PAS un couperet ; aptitude = arrêté du 13/10/2008) :
>   **L1** (cat. II 2008 à 2 kg par catégorie, condition 18 pas de CERFA
>   officiel R-744/R-290/R-717, libellé annexe II section 1) ·
>   **L4** (migration 33, transition 2008/2025 : reconnue jusqu'au 12/03/2029
>   puis remise à niveau + cycle 7 ans, garde de délivrance, alerte
>   `alr-remise-niveau-`) ·
>   **L5** (exemption hermétique CODÉE derrière `EXEMPTION_HERMETIQUE_ACTIVE=false`,
>   activation gatée visa T3 + réponses ci-dessous) ·
>   **L3** (migration 34, champ `usageThermique` froid/clim/PAC, condition 10
>   R-404A datée par usage : froid 01/01/2025, clim/PAC 01/01/2026).
>   2 revues adversariales par workflow (25 constats tirés, toutes racines
>   fermées) + bricoles de suivi (conseil-intervenant filtre par
>   `habilitationReconnue`, gardes rejouées à l'import).
> - **R-452A = 2141** tranché (règle du PRP le plus élevé au sens littéral).
> - **⭐ v7 ABANDONNÉE + SUPPRIMÉE (PR #16)** : audit de parité v7→v8 fait
>   (113 fonctions ; cœur intégralement en v8). 2 recoins reportés — **macaron**
>   (numérique au scan du QR machine, `data/macaron-controle.js`, pastille
>   couleur+date en tête de fiche) et **registre des plaintes** (CRUD complet,
>   migration 35, contrat v12, vue+modale+menu). `apps-script/` +
>   `Code_API_v7.1.0.gs` retirés du dépôt. Suivi pédago élève laissé à
>   inerWeb Édu (volontaire).
>
> **CE QUI RESTE (à proposer à Franck, il choisit)** :
> - **L2 — tests de sécurité négatifs (P2-2)** : suite nommée regroupant les
>   tests négatifs existants + manquants (Officiel forgé, appel API direct pour
>   contourner un blocage, base sous OneDrive, LAN sans HTTPS). Additif, sans
>   migration, indépendant. Bon prochain lot code.
> - **L6 — RÉOUVERTURE du mode Officiel** (bascule `VERROU_LIVRAISON`) : le vrai
>   jalon, mais GATÉ visa T3 (les conditions 16/17/18 + condition 10 raffinée +
>   aptitude 2008/2029 + exemption L5 s'activent alors). Ne PAS rouvrir avant le
>   visa. Dégèle `server/test-officiel-e2e.mjs` (+ cas « CONTROLE en Officiel »).
> - **L7 — fusion des stores (P2-1)** : APRÈS la simulation d'audit d'août
>   (conserver l'oracle de parité). Plan à écrire.
>
> **HORS CODE, de Franck (lui rappeler sans harceler)** :
> - **T3** relecture organisme agréé + DPD — CHEMIN CRITIQUE, dossier prêt
>   (`docs/T3-DOSSIER-RELECTURE-EXTERNE.md`), à envoyer. Les 11 questions du
>   volet A recoupent les décisions déjà prises → confirmation opposable.
> - **P0-9** : la v7 étant abandonnée, le geste devient **désactiver le
>   déploiement Apps Script** (pas régénérer les clés) — `docs/P0-9-…md` §0.
> - **Catalogue Q11** validé (R-452A=2141) ; reste à SEMER les fluides via
>   l'écran d'admin quand Franck le voudra (`docs/CATALOGUE-FLUIDES-A-VALIDER.md`).
>
> **GATES FRANCK (réponses du 25/07, codées) : R1 cat. II hermétique = 2 kg ·
> R2 « ou » résidentiel gardé · R4 champ usage thermique ajouté.** Reste à
> confirmer sur pièce au VISA : les seuils de L5 (exemption), la reconnaissance
> 2008 (art. 7/11), les dates R-404A (art. 13). T2 R-455A 148→146 pour la cible
> officielle si l'organisme l'exige (souplesse via l'écran d'admin des fluides,
> jamais une migration).
>
> --- ci-dessous : l'historique détaillé des briques antérieures, conservé ---
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

## LE CAP (tranché par Franck le 20/07 — décision prise, à ne pas rouvrir sans élément nouveau)

**REGISTRE OFFICIEL UNIQUE** (opposable, sans doublon papier) = barème MAXIMAL. Un 2ᵉ audit
externe (ChatGPT, 20/07) avait donné NO GO en l'état comme registre unique ; un 3ᵉ audit externe
a donné NO GO le 25/07. Les deux ont été traités (voir les blocs d'état en tête).
Le mode Officiel est REFERMÉ (`VERROU_LIVRAISON=true`, décision T1) ; la suite
`server/test-officiel-e2e.mjs` est GELÉE par une garde en tête (consigne de réouverture incluse).

## ÉTAT (20/07 nuit) — *bloc d'époque, conservé* : TOUT VERT 87 exécutions **à cette date**, poussé jusqu'à `9dd9b6b`

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

## ORDRE DE PASSAGE DES GROSSES BRIQUES MÉTIER DE LA RC — *liste d'époque (20/07), SOLDÉE*

> ⚠️ Les quatre entrées ci-dessous sont **toutes terminées** depuis (P0-8 le 23/07).
> Conservé pour l'ordre suivi, pas comme feuille de route : la suite se lit dans le bloc
> d'état du 26/07, en tête de ce fichier.

Chacune = UN chantier avec **plan écrit et relu AVANT code** (comme le lot C), dans l'ordre
conseillé :
1. ~~**P0-3/P0-4 — cycle matière**~~ ✅ **TERMINÉ 22/07** (CM-1→CM-4, refondu — voir le
   bloc d'état en tête ; la description RC « blocage + WORM » était fausse).
2. ~~**P0-5 — aptitude opposable**~~ ✅ **TERMINÉ 22/07** (AP-1→AP-5, notre moteur
   corrigé et branché — voir le bloc d'état en tête ; comparateurs et cat. II corrigés).
3. ~~**P0-6 — cycle fuite**~~ ✅ **TERMINÉ 22/07** (CF-1→CF-6 — voir le bloc d'état en
   tête ; l'écart « effets machine d'un contrôle annulé » du plan P0-7 §7(a) est soldé).
4. ~~**P0-8 — déclaration annuelle 11 rubriques**~~ ✅ **TERMINÉ 23/07** (PR #3).
**Hors code** : P0-9 (révocation clés v7 — devenu « désactiver le déploiement Apps Script »,
la v7 ayant été abandonnée le 25/07) · volet RGPD (notice/durées/DPD).

**Décisions transverses (état d'époque)** : **T2** R-455A 148→146 — **tranché le 23/07** :
règle du PRP le PLUS ÉLEVÉ, les 148 restent, à re-trancher seulement si l'organisme l'exige
pour la cible officielle · **T3** relecture organisme agréé + DPD (délai long) — **toujours
ouvert, chemin critique**.

## À LIRE EN PREMIER (avant de coder)

1. **Mémoire** (`G:\Mon Drive\claude-memoire\`) : `MEMORY.md` puis `project_inerweb_fluide.md`.
2. Tête de **`CHANGELOG.md`** — dernier état.
3. **`docs/CARTE-CODE.md`** — l'architecture en une page, AVANT toute exploration.
4. **`docs/REPONSE-AUDIT-EXTERNE-2026-07-25.md`** — le mémoire en réponse au 3ᵉ audit externe :
   ce qui est concédé, ce qui est corrigé, ce qui est contesté et pourquoi. En cas de
   divergence entre CE fichier-ci et le mémoire, **c'est le mémoire qui fait foi** : il est
   écrit pour un tiers et chacune de ses affirmations est vérifiable sur le paquet envoyé.
5. Le plan de la brique choisie : `docs/PLAN-INTEGRATION-RC-CHATGPT.md` +
   `docs/CONSTATS-AUDIT-EXTERNE-2026-07-20.md` (constats triés du 2ᵉ audit) +
   `docs/AUDIT-INERWEB-FLUIDE-2026-07-20.md` (rapport complet du 2ᵉ audit).
6. `git log` + `git status` — ⚠️ des sessions parallèles écrivent parfois sur ce dépôt.

## MÉTHODE / RÈGLES D'OR (ne rien casser)

- **RÉGLAGE à annoncer avant chaque tâche de code** (grille : mémoire
  `feedback_reglages_intelligence`).
- **carte → vérifier → plan (grosses briques) → modif chirurgicale → TESTS VERTS → revue
  adversariale (sobre : soi-même ou 1 agent) → commit.** `node outils/lancer-tests.mjs --tout`
  doit être **TOUT VERT** avant tout commit. Le nombre d'exécutions CROÎT à chaque lot : c'est
  le « TOUT VERT » qui fait foi, pas le compte. Repère au 27/07/2026 : **132 exécutions** —
  si le tien est inférieur, tu as perdu des suites en route.
- **JAMAIS toucher au `data/` RÉEL** : vérification dynamique = serveur sur PORT jetable +
  `IWF_CHEMIN_BASE` base jetable (jamais 2011). Corps des requêtes API = **`{params:{...}}`**.
  **« Une faille se prouve en la TIRANT, pas en la lisant. »**
- **Parité STRICTE `server/api.js` ↔ `v8/js/data/demo-store.js`** (test-contrat, mapping qui
  lève sur clé inconnue → déclarer les nouveaux champs des deux côtés). Module pur du front
  réutilisé côté serveur = recopié en littéral (CommonJS) + test de parité qui discrimine.
- **Migrations** : registre `server/migrations.js`, dernière = **36**, prochaine = **37**
  (au 26/07/2026 — se relit dans le registre, jamais de mémoire).
  ⚠️ Une migration est IMMUABLE (littéraux figés, jamais de constante partagée qui évolue).
  Triggers WORM recréés à chaque migration qui touche leurs tables ;
  `PRAGMA recursive_triggers = ON` obligatoire.
- **Empreinte des mouvements** (`hash-mouvement.js`, v1 figée/v2) : ne JAMAIS recalculer
  rétroactivement ; toute évolution = versionnage + plan + tests sur empreintes CONNUES.
- Commits multi-lignes via `git commit -F fichier` (jamais le here-string).
- **RÈGLE ABSOLUE : ne JAMAIS coder une valeur ou une règle réglementaire NOUVELLE sans la
  validation de Franck.** En CONSEIL on ne bloque jamais ; le mode OFFICIEL, lui, DOIT bloquer.

## RESTE CONSIGNÉ (non bloquant)

- Écarts du plan P0-7 §7 : ~~l'annulation d'un mouvement CONTROLE ne neutralise pas les effets
  machine du contrôle lié~~ **SOLDÉ le 22/07 par P0-6** (`recalculerEffetsMachineApresAnnulation`)
  · reste §7(b) : l'échéance du contrôle ACCESSOIRE n'est pas mise à jour (historique).
- 3 mineurs de la revue du 20/07 (voir CHANGELOG, bloc P1-6).
- Hors code : relecture finale de la liste du lot B par Franck · simulation d'audit fin août ·
  septembre en PARALLÈLE de la procédure actuelle (2-4 semaines) puis bascule avec secours
  papier — jamais de bascule à sec.
