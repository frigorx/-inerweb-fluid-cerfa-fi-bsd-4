# PLAN P0-5 — Aptitude opposable (blocage dur de la matrice d'habilitation en mode Officiel)

> Écrit le 22/07/2026, AVANT code (méthode des grosses briques). Source : audit externe
> du 20/07 (`docs/AUDIT-INERWEB-FLUIDE-2026-07-20.md` §4.3, reco P0 n° 4, §11),
> constats triés (`docs/CONSTATS-AUDIT-EXTERNE-2026-07-20.md`, ligne P0-5) et
> `docs/PROMPT-REPRISE.md`. Le zip RC n'étant pas disponible dans cette session,
> le moteur repris est LE NÔTRE (`v8/js/data/habilitations.js`, matrice validée
> fonctionnellement par Franck le 14/07 — cas Bachir/Pierre), corrigé des deux
> erreurs relevées par l'audit puis branché en blocage dur.

## Le manque

Le mode Officiel ne vérifie aujourd'hui que « au moins une habilitation ACTIVE et en
cours de validité » (condition n° 7, code `APTITUDE` du moteur de blocage). Un
catégorie E (étanchéité seule) satisfait donc le blocage avant une charge ; un D
(récupération seule) avant une mise en service. La matrice fine
catégorie × opération × famille × charge × hermétique existe depuis le 14/07 mais
UNIQUEMENT en CONSEIL (front). Deux erreurs dans cette matrice (audit §4.3) :
frontières de charge inclusives (3 kg pile accepté au lieu de « inférieure à
3 kg ») et ancienne catégorie II sans limite de charge.

## Décisions appliquées (toutes issues du plan de correction adopté le 20/07)

| # | Décision | Statut |
|---|----------|--------|
| D1 | Frontières STRICTES : 2,999 kg accepté, 3,000 kg refusé ; hermétique 5,999 accepté, 6,000 refusé (`<=`→`<`, `>`→`>=`). | Prescrit par l'audit ET par le bloc P0-5 de PROMPT-REPRISE (« bug trivial des comparateurs »). |
| D2 | Ancienne catégorie II limitée à < 3 kg (< 6 kg hermétique scellé étiqueté) : `limiteKg: null` → `SEUIL_CHARGE_LIMITEE_KG`. | Prescrit par l'audit (constat « Vrai » du tri). ⚠️ Valeur réglementaire : à RE-confirmer sur pièce par Franck avant réouverture de l'Officiel (le verrou T1 couvre). |
| D3 | Reconnaissance 2008 jusqu'au 31/12/2026 APPLIQUÉE dans l'assemblage des faits Officiel (`habilitationReconnue`) : après cette date, une attestation 2008 ne compte ni pour `habilitationActive` ni pour l'aptitude. Le moteur reste sans horloge. | Valeur déjà dans SPEC-HABILITATIONS §1. ⚠️ Le semis démo (2 habilitations 2008/I) basculerait au 01/01/2027 → le semis reçoit AUSSI une habilitation 2025 par personne (leçon « dates démo qui pourrissent », 22/07). |
| D4 | Nouveau code de blocage `APTITUDE_PORTEE` (condition n° 16, S·V) : « Habilitation de {nom} inadaptée à cette intervention : {motif du moteur}. » Distinct de `APTITUDE` (n° 7 = EXISTE une habilitation ; n° 16 = elle COUVRE cette intervention). | Nouveau libellé, réutilise les motifs du moteur validés le 14/07. |
| D5 | Trou `MAP_OPERATION` corrigé : `CONTROLE_PERIODIQUE` et `CONTROLE_NON_PERIODIQUE` (types P7-a) → `ETANCHEITE` (aujourd'hui repli MAINTENANCE → faux REFUS de conseil pour un cat. E sur un contrôle, deviendrait un faux blocage). | Correction de cohérence avec `CONTROLE`/`CONTROLE_ETANCHEITE` déjà mappés. |

## Choix d'architecture

- **Charge du verdict = charge NOMINALE de la machine** (comme le conseil,
  `conseil-intervenant.js` : la limite réglementaire porte sur la charge de
  l'ÉQUIPEMENT, pas sur la quantité transvasée). Garde stricte contre null/0.
- **Hermétique scellé : la fiche machine ne porte pas (encore) le champ** (constat
  P1-1) → `hermetiqueScelle: false` en dur (conservateur : limite 3 kg). L'ajout du
  champ (« hermétique scellé ET étiqueté ») reste en P1-1.
- **Mouvement sans machine** (TRANSFERT…) : verdict quand même (opération + fluide),
  sans axe charge (`chargeKg: null`). TRANSFERT est déjà mappé RECUPERATION.
- **Fait précalculé, moteur de blocage inchangé dans son contrat** :
  `cadre.fiche.intervenant.aptitude = null | { autorise, motif }` calculé par les
  DEUX `cadreFicheOfficiel` ; `blocage-officiel.js` (les 2 miroirs) pose
  `APTITUDE_PORTEE` si `habilitationActive && aptitude && !aptitude.autorise`
  (jamais de double motif avec la n° 7 ; `autorise: true` en gravité CONSEIL ne
  bloque JAMAIS ; fait absent = sans objet → rétro-compatible).
- **Miroir serveur = nouveau module `server/droit-intervention.js`** (patron
  `signatures-mouvement.js` : module CJS autonome, bandeau miroir, parité prouvée
  par une suite dédiée qui discrimine) — PAS de recopie dans `api.js` (6800 l.).
- **Aucune migration** (la 26 reste la dernière), aucun changement de
  `VERSION_CONTRAT` (un blocage de plus dans une liste déjà contractuelle).

## Hors périmètre (consigné)

- Cycle de remise à niveau (ponctuelle avant le 12/03/2029 puis périodique ≤ 7 ans,
  suspension) : AUCUN modèle de données (pas de date de remise à niveau sur les
  lignes d'habilitation) → chantier dédié ultérieur.
- Champ machine « hermétique scellé étiqueté » → P1-1.
- Alignement du CONSEIL (composants front) sur `habilitationReconnue` (fin de
  reconnaissance 2008) : le conseil garde son comportement actuel — divergence
  possible avec l'Officiel après le 01/01/2027, purement indicative, à revoir
  avec P1-1.

## Sous-briques (chaque brique = tests verts `--tout` + commit)

1. **AP-1** — frontières strictes (l. 311 `<`, l. 335 `>=` de `habilitations.js`)
   + `MAP_OPERATION` contrôles → ETANCHEITE + tests frontière
   (2,999/3,000/5,999/6,000, E·contrôle périodique → OK).
2. **AP-2** — limite ancienne cat. II (< 3 / < 6 hermétique) + tests + SPEC §2.
3. **AP-3** — `server/droit-intervention.js` (miroir littéral du MOTEUR :
   `verifierDroitIntervention`, `operationNormalisee`, `familleDuFluide`,
   `jetonsMentionsActives`, `habilitationReconnue`, seuils, `FIN_RECONNAISSANCE_2008`)
   + `server/test-droit-intervention.mjs` (éventail discriminant, comparaison JSON).
   Côté ESM : ajout de `FIN_RECONNAISSANCE_2008` + `habilitationReconnue` (inertes
   jusqu'à AP-4).
4. **AP-4** — fait `aptitude` dans les 2 `cadreFicheOfficiel`
   (demo-store.js ~l. 1159, api.js ~l. 6716 : lignes d'habilitations + mentions,
   filtre `habilitationReconnue`, verdict via le moteur) + condition
   `APTITUDE_PORTEE` dans les 2 `blocage-officiel.js` + tests :
   `test-blocage-officiel.mjs` (ficheSaine enrichie, cas posé/ignoré/non-doublon,
   CADRES parité) et `test-contrat.mjs` (doublé demo/local, via
   `simulerValidationOfficielle` : E + charge → refus ; D + appoint → refus ;
   A1 → rien — cas d'acceptation de l'audit).
5. **AP-5** — semis démo : + 1 habilitation 2025 par personne (échéance relative
   `jourDemo`) ; docs (CONDITIONS-BLOCANTES n° 16, SPEC, CARTE-CODE, CHANGELOG,
   PROMPT-REPRISE) ; revue adversariale ; vérification navigateur (port jetable).

## Risques surveillés

- Messages exacts Bachir/Pierre : intacts (les cas existants sont à 2/5/8/10 kg,
  jamais à la frontière). Au point 3,000 pile le motif « limitée à 3 kg » reste
  tel quel (pas de changement de texte sans Franck).
- 3 paires de miroirs (habilitations↔droit-intervention, blocage-officiel ×2,
  cadreFicheOfficiel ×2) : chacune couverte par un test qui discrimine.
- Tests serveur qui simulent (test-validateur-session, test-signatures-mouvement) :
  vérifier leur semis d'habilitations, corriger le SEMIS jamais les messages.
- Mode Officiel FERMÉ (verrou T1) : la preuve passe par la simulation (jamais
  bloquante) et les tests — le blocage réel s'observera à la réouverture.
