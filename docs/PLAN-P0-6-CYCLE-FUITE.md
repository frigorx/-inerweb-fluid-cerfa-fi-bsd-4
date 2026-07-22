# PLAN P0-6 — Cycle fuite (contrôle après réparation : 24 h / 1 mois civil)

> Écrit le 22/07/2026, AVANT code (méthode des grosses briques). Sources : audit externe
> du 20/07 (constat P0-6, critique ; tests d'acceptation §11), constats triés, plan
> P0-7 §7 (écart (a) « à revoir avec P0-6 »). Décisions G1-G6 arbitrées par Franck
> avant code (voir tableau).

## La règle

Le contrôle APRÈS RÉPARATION d'une fuite doit avoir lieu **au plus tôt après 24 h de
fonctionnement** de l'équipement et **au plus tard 1 mois civil** après la réparation ;
les équipements **mobiles listés** sont admis au contrôle immédiat.

## L'écart actuel (vérifié dans le code)

- Clôture possible **le jour même** : convention explicite « à date égale, le contrôle
  est réputé postérieur à la réparation » (dossiers-fuite.js l.29-31, estFuiteOuverte
  des 2 stores) — décision R4 d'origine, pensée pour le déroulé terrain.
- Échéance de suivi = **+30 jours calendaires** (constante dupliquée 3×), pas 1 mois civil.
- Le type `APRES_REPARATION` existe (schéma, modale) mais n'est **exploité nulle part**.
- **Aucun horodatage de fonctionnement** (toutes les dates métier sont au jour) ;
  **aucun champ machine fixe/mobile** (constat P1-1).
- Écart P0-7 §7(a) : l'annulation par contre-écriture d'un mouvement CONTROLE ne
  neutralise pas les effets machine (un contrôle FUITE annulé laisse la machine en
  FUITE à jamais).

## Décisions (G1-G6)

| # | Décision | Statut |
|---|----------|--------|
| G1 | **Clôture stricte J+1** : le CONFORME de clôture doit être STRICTEMENT postérieur AU JOUR de la réparation. Granularité jour = proxy honnête des « 24 h de fonctionnement » (pas de compteur de marche — chantier consigné hors périmètre). ⚠️ REVIENT sur la convention « à date égale » voulue par Franck (R4). | À arbitrer Franck |
| G2 | Retour EN_SERVICE de la machine aligné sur la clôture complète (source de vérité unique = `estFuiteOuverte` rejoué après insertion du contrôle) — plus de condition ad hoc divergente. | Correction de cohérence |
| G3 | Un contrôle AU-DELÀ d'1 mois **ferme quand même** l'épisode (on n'empêche jamais d'enregistrer la réalité) mais le dossier consigne la **clôture en retard** (`clotureEnRetard` + jours), visible fiche fuite + export ZIP scellé. | À arbitrer Franck |
| G4 | Exception mobile : **DÉCISION FRANCK 22/07 — le champ machine est ajouté MAINTENANT** (migration 27 : `machines.type_installation` TEXT 'FIXE'/'MOBILE', défaut FIXE — nom compatible avec le modèle complet P1-1 qui ajoutera le sous-type). Un équipement MOBILE est admis au contrôle immédiat : la clôture jour même reste possible pour lui, et le dossier consigne le **motif de périmètre** (`exceptionMobile: true`). Absence de valeur = FIXE (conservateur). | TRANCHÉ Franck 22/07 |
| G5 | Écart §7(a) : **contrôle annulé = fait DÉRIVÉ** (un contrôle est réputé annulé si son mouvement porteur est ANNULE — aucun UPDATE de `controles`, aucune migration ; la table controles n'a pas de trigger WORM, vérifié). Lectures filtrées sur les contrôles ACTIFS + recalcul des effets machine à l'annulation (statut, dernierControle ; `prochainControle` restitué du dernier contrôle actif restant, sinon laissé en l'état — limite consignée). | À arbitrer Franck (périmètre) |
| G6 | **Aucune nouvelle condition de blocage Officiel** : un contrôle réellement fait le jour même DOIT pouvoir être consigné — la sanction correcte est qu'il **ne clôture pas** (épisode reste REPAREE, machine reste FUITE, alerte reste). Le « refusé » de l'audit porte sur la valeur de clôture, pas sur l'enregistrement. | Recommandation |

## Sous-briques (chaque brique = tests verts `--tout` + commit)

1. **CF-1 — clôture stricte J+1 (G1+G2)** : `chercherCloture` (dossiers-fuite.js
   l.86-88, `>` au lieu de `>=` sur dateReparation), `estFuiteOuverte` des 2 stores
   (demo l.1841-1844, api l.5271-5274), branche EN_SERVICE des 2 stores rejouée via
   `estFuiteOuverte` (demo l.1895-1911, api l.5663-5676). Tests : test-dossiers-fuite
   (bloc « jour même » dédoublé : REPAREE le jour même / FERMEE à J+1), test-contrat
   13 quinquies réécrit (même jour → la machine RESTE en FUITE), test-registre
   (contrôle FUITE à dater explicitement).
2. **CF-2 — échéance 1 mois civil (D2)** : `ajouterMois(date, 1)` EXISTE déjà dans les
   2 stores (écrêtage fin de mois) — remplacer `ajouterJours(..., 30)` et supprimer la
   constante ; copie littérale `ajouterUnMoisCivil` dans le module pur. Tests : 31/01 →
   28/02 (29 bissextile), 31/08 → 30/09.
3. **CF-3 — retard de clôture consigné (G3)** : faits `clotureEnRetard` /
   `retardClotureJours` dans `construireDossier` ; surfaces fiche-fuite + export ZIP
   (02-SYNTHESE.csv) ; mention discrète fiche machine. Module pur seul.
4. **CF-4 — exception mobile (G4, tranchée : champ MAINTENANT)** : migration 27
   (`type_installation` défaut FIXE, backfill), mapping machines, createMachine/
   updateMachine des 2 stores (défaut FIXE, garde de valeur), machine-form (sélecteur
   Fixe/Mobile), exception dans la clôture (MOBILE → jour même admis) + fait
   `exceptionMobile` consigné au dossier (motif de périmètre, visible export). Les
   4 cas d'acceptation de l'audit deviennent TOUS exécutables.
5. **CF-5 — écart §7(a) (G5)** : variante « contrôles ACTIFS » (serveur : jointure sur
   mouvements ; demo : ensemble des controleId des mouvements ANNULES ; module pur :
   filtre en tête de `construireDossiersFuite`) appliquée aux 4 sites d'appel
   d'`estFuiteOuverte` par store + nouvelle branche dans `appliquerEffetsInverses`
   (recalcul : dernière fuite active non refermée → FUITE ; sinon échéance dépassée →
   CONTROLE_DU ; sinon EN_SERVICE ; jamais pour ARRETEE/DEMANTELEE). Aucun UPDATE de
   controles, chaîne d'empreintes indifférente. L'écart §7(b) (échéance du contrôle
   accessoire) RESTE consigné hors périmètre.
6. **CF-6 — docs + revue adversariale** : PLAN-P0-INTEGRITE-CONTROLES (§7(a) soldé),
   CONSTATS (ligne P0-6), CHANGELOG, PROMPT-REPRISE, CARTE-CODE.

## Couverture des cas d'acceptation de l'audit (§11)

1. Fixe, jour même → refusé COMME CLÔTURE (REPAREE, machine FUITE) — CF-1.
2. Fixe, J+1 → accepté (FERMEE, EN_SERVICE) — CF-1.
3. Fixe, > 1 mois → clôture acceptée + retard CONSIGNÉ — CF-2/CF-3 (interprétation G3).
4. Mobile éligible → contrôle immédiat accepté AVEC motif de périmètre consigné — CF-4.

## Hors périmètre (consigné)

- Compteur/horodatage de fonctionnement réel (les 24 h prouvées à l'heure près) —
  chantier de modèle à part ; la granularité jour est le proxy assumé.
- Sous-type d'équipement mobile et reste du modèle P1-1 (hermétique, résidentiel…) —
  seule la distinction FIXE/MOBILE entre ici.
- Exploitation du type `APRES_REPARATION` et de `controle_apres_reparation_id`
  (chaînage explicite du contrôle de suivi) — suite possible.
- Écart P0-7 §7(b) (échéance du contrôle accessoire non mise à jour).
- Champ machine fixe/mobile + sous-type (P1-1).

## Risques surveillés

- G1 casse des tests qui encodent la convention « même jour » (test-contrat 13
  quinquies l.1496-1554, test-dossiers-fuite l.143-163 et 320-349) — attendus à
  inverser, jamais les messages sans nécessité. Semis démo : AUCUN épisode
  REPAREE/FERMEE (M5 = fuite ouverte sans réparation) → rien ne bouge en démo.
- CF-5 = le plus risqué (parité fine du filtre « actifs », photo nominative des fuites
  = instantané non recalculé, consigné). Peut être re-priorisé sans bloquer CF-1→CF-4.
- Miroirs : toute modification = les 2 stores + le module pur, parité prouvée par les
  suites doublées.
