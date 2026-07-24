# Conditions bloquantes du mode Officiel — condition 2 du plan audit-proof

> **Statut : ✅ VALIDÉE PAR FRANCK le 16/07/2026** (relecture faite le soir même — « ok »).
> Les 3 questions ouvertes sont tranchées avec les propositions par défaut : ① matrice
> d'habilitations NON bloquante tant qu'elle n'est pas validée ligne à ligne (la condition 7
> bloque sur « habilitation active et valide » seulement) ; ② blocage SEC du fluide vierge
> PRP ≥ 2500, la dérogation tracée attendra un cas réel ; ③ fiches officielles sur fluides
> hors périmètre (R-744, R-290) NON bloquées (trace volontaire possible).
> Établie depuis la condition 2 de `PLAN-AUDIT-PROOF-2026.md` et l'avis technique du 16/07
> (Q10 notamment). Chaque ligne est codée dans le moteur `blocage-officiel.js` (un module
> pur, une condition = une entrée) : toute retouche ultérieure reste triviale.
>
> Rappel du principe (décision Franck) : en mode **CONSEIL/FORMATION on ne bloque jamais** ;
> le mode **OFFICIEL, lui, DOIT bloquer** — c'est sa définition. Le mode Officiel reste
> **FERMÉ** (condition n° 13) tant que les lots C (double signature) et D ne sont pas livrés :
> cette liste prépare l'ouverture, elle n'ouvre rien.

## LA LISTE (à relire — une ligne par condition)

Moments : **P** = passage en officiel (création) · **S** = soumission · **V** = validation.
La **simulation de validation** évalue tout (niveau V) sans rien bloquer.

| n° | Condition bloquante | Moments |
|---|---|---|
| 1 | Attestation de capacité de l'établissement renseignée et non expirée | P·S·V |
| 2 | Au moins une balance CONFORME (vérification à jour) | P·S·V |
| 3 | Au moins un détecteur de fuite CONFORME (étalonnage à jour) | P·S·V |
| 4 | Aucun écart de balance matière non justifié | P·S·V |
| 5 | Sauvegarde vérifiée récente du poste (archive valide plus jeune que le seuil réglé, 24 h par défaut) — serveur seulement, sans objet en démonstration | P·S·V |
| 6 | Intervenant désigné (« exécuté par ») présent sur la fiche et fiche personnel ACTIVE | S·V |
| 7 | Au moins une habilitation F-Gas ACTIVE et en cours de validité pour l'intervenant | S·V |
| 8 | Fiche complète : machine désignée (tout type sauf TRANSFERT), fluide renseigné, pesées avant/après renseignées et différentes, cause de l'appoint renseignée (CHARGE_APPOINT) | S·V |
| 9 | Contrôle d'étanchéité renseigné (CONFORME ou FUITE, jamais « sans objet ») pour CHARGE_APPOINT et MISE_EN_SERVICE quand la machine est soumise au contrôle périodique OU que le fluide est inflammable (classe ≠ A1) | S·V |
| 10 | Charge d'appoint en fluide VIERGE de PRP ≥ 2500 interdite (maintenance, règl. UE 2024/573 — avis Q10 ; les deux dates 01/01/2025 et 01/01/2026 sont échues) | S·V |
| 11 | Signature du technicien présente (tracé + nom) | V |
| 12 | Le validateur est la personne CONNECTÉE : compte de session lié à une fiche du personnel, identité déclarée = identité de session (serveur ; appliqué à `validerMouvement` ET `annulerParContreEcriture`, **dans tous les modes** — c'est de la sécurité, pas du métier) | V |
| 13 | VERROU DE LIVRAISON : double signature réelle (condition 3) et empreinte renforcée + PDF conservé (condition 4) non livrées → le mode Officiel reste fermé | P·S·V |
| 14 | Signature RÉELLE du technicien présente et NON périmée — toute modification de la fiche après signature (champ, PJ, rejet) rend la signature périmée : « recommencez les signatures », jamais ignorée *(ajoutée par le lot C, brique C1, comme annoncé ci-dessous)* | V |
| 15 | Signature RÉELLE du détenteur présente et NON périmée, posée APRÈS celle du technicien (même révision) — au lycée le professeur signe détenteur PAR DÉLÉGATION (décision Franck 16/07, même personne autorisée) *(lot C, brique C1)* | V |
| 16 | APTITUDE OPPOSABLE : l'habilitation de l'intervenant COUVRE cette intervention — matrice catégorie × opération × famille de fluide × charge NOMINALE de la machine (moteur `verifierDroitIntervention`, fait `intervenant.aptitude` précalculé par les stores) ; une attestation 2008 ne compte plus après le 31/12/2026 (`habilitationReconnue`, appliquée aussi à la n° 7) ; jamais posée en doublon de la n° 7 ; une réserve non bloquante du moteur (gravité CONSEIL) ne bloque JAMAIS *(P0-5, 22/07 — code `APTITUDE_PORTEE`)* | S·V |
| 17 | DÉTECTION PERMANENTE OBLIGATOIRE présente : au-delà du seuil HAUT du moteur (500 tCO₂eq HFC / 100 kg HFO pur / 300 kg HCFC), un système de détection permanente est exigé (fait `detectionObligatoireAbsente` précalculé par les stores, `equipement.detectionObligatoire` interroge le moteur — aucun seuil recopié) ; une fiche officielle ne peut pas acter une intervention sur un équipement au-delà du seuil qui n'en a pas. En CONSEIL, seule l'alerte `alr-detection-obligatoire-` le signale (jamais bloquant) *(P1-1, 23/07 — code `DETECTION_OBLIGATOIRE`)* | S·V |
| 18 | FLUIDE DANS LE PÉRIMÈTRE DU CERFA : le CERFA 15497*04 vise les fluides fluorés (CFC/HCFC/HFC/PFC, HFO à titre volontaire) — pas de fiche OFFICIELLE pour le CO₂ (R-744), les hydrocarbures (R-290) ni l'ammoniac (R-717). Fait `fluideHorsPerimetreFluore` précalculé par les stores sur la fiche réglementaire EXPLICITE (`categorieCadre7 = 'AUCUNE'` — l'attribut BRUT, jamais la fonction qui replie « sans fiche »). La traçabilité volontaire = le mode Formation. Au PASSAGE la fiche n'existe pas encore (`fiche:null`) : la condition s'exerce S·V, le panneau de simulation du wizard la montre en direct *(Q4/L1b, décision Franck 24/07 — code `HORS_PERIMETRE_FLUORE`)* | S·V |

## Points gatés / arbitrages proposés (à confirmer en relisant)

- **n° 7 — correspondance fine aptitude ↔ intervention** : **BRANCHÉE le 22/07 (P0-5,
  condition n° 16 ci-dessus)**, comme prévu « au même endroit ». La matrice appliquée est
  celle de `SPEC-HABILITATIONS.md` §2 (validée fonctionnellement le 14/07, cas
  Bachir/Pierre), corrigée des deux erreurs relevées par l'audit du 20/07 : frontières
  STRICTES (< 3 kg / < 6 kg — 3,000 pile refusé) et ancienne cat. II limitée. ⚠️ Reste à
  RE-confirmer sur pièce par Franck avant la réouverture de l'Officiel (couvert par le
  verrou n° 13) : les seuils 3/6 kg et la limite de la cat. II — voir
  `docs/PLAN-P0-5-APTITUDE.md` (décisions D1-D5).
- **n° 10 — dérogation** : l'avis Q10 prévoit un blocage AVEC dérogation tracée. Proposition
  lot B : blocage sec (protecteur) ; le mécanisme de dérogation tracée sera ajouté si un cas
  réel l'exige (lycée : improbable).
- **Bouteille compatible / stocks / débordement / surcharge** : déjà bloquants dans TOUS les
  modes par les contrôles de faisabilité de la validation (règle 5 du contrat : jamais de
  mutation partielle). Pas re-vérifiés dans le moteur — pas de double source de vérité.
- **Signature du détenteur, invalidation des signatures à toute modification, signature
  illisible jamais ignorée** : condition 3 du plan = **lot C**. ✅ **LIVRÉ (brique C1,
  18/07)** : conditions 14 et 15 ci-dessus, moteur enrichi des faits tri-état
  `signatureTechnicienValide` / `signatureDetenteurValide` (true | false | 'PERIMEE') ;
  l'illisibilité est refusée À LA POSE (`signerMouvement` : PNG réel, ≥ 1 Ko, ≤ 1 Mo).
  L'empreinte v2 (C2) et le PDF conservé (C3) suivent.
- **Fluides hors périmètre (R-744, R-290, R-717)** : ~~question ouverte~~ **TRANCHÉ par
  Franck le 24/07 (Q4) : REFUSÉ** — condition n° 18 `HORS_PERIMETRE_FLUORE` ci-dessus.
  La notice du CERFA 15497*04 ne prévoit pas les fluides non fluorés ; la trace volontaire
  passe par le mode Formation (aucun troisième objet). L'arbitrage de juillet (« laisser
  passer ») est un revirement assumé, consigné au PLAN-LOTS-REGLEMENTAIRES-Q1-Q11.

## Mise en œuvre (lot B, technique)

- **Moteur pur** `v8/js/data/blocage-officiel.js` (miroir littéral CommonJS
  `server/blocage-officiel.js`, test de parité qui discrimine) : `evaluerBlocagesOfficiel(cadre)`
  → `{ ok, blocages: [{ code, motif }] }`, filtré par moment. Une condition = une entrée.
- Les conditions 1-4 restent portées par `peutPasserEnOfficiel` (SPEC §7.2, inchangé — aucune
  régression sur les vues et tests existants) ; le moteur les reprend telles quelles.
- **Les 3 moments** : `creerMouvement` (mode OFFICIEL demandé → refus motivé listant les
  blocages), `soumettreMouvement` et `validerMouvement` (fiche OFFICIEL → mêmes refus).
  En FORMATION : rien ne change, rien ne bloque.
- **Validateur de session** (n° 12) : serveur, tous modes, avant tout effet (code 403). Le
  repli sans session (harnais de test in-process) garde le comportement historique — même
  motif que `getUtilisateurCourant` (parité du contrat).
- **Simulation de validation** : nouvelle lecture du contrat `simulerValidationOfficielle
  (mouvementId)` (contrat 77 → 78, `VERSION_CONTRAT` 4) — la liste complète des blocages
  comme si on validait la fiche en Officiel maintenant. Affichée dans la modale de
  validation (information, jamais bloquante en Formation).
