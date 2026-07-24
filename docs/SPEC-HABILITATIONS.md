# SPEC — Habilitations F-Gas (attestations de capacité & d'aptitude)

> **Le cœur « audit-proof » (chantier B2).** Objectif : savoir, pour chaque
> intervention, si la PERSONNE a l'aptitude requise et si l'ÉTABLISSEMENT a la
> capacité requise — et l'opposer en mode Officiel.
>
> ✅ **MATRICE VALIDÉE FONCTIONNELLEMENT par Franck (14/07)** via deux cas concrets
> (Bachir catégorie E = étanchéité seule ; Pierre catégorie D = récupération seule ≤ 3 kg,
> refusé sur une installation de 10 kg). Le moteur (Phase 2b) fonctionne en **CONSEIL**
> (rappelle le niveau, conseille peut/ne peut pas + pourquoi), pas en blocage brutal. Le
> **blocage dur** en mode Officiel (Phase 3) reste distinct et à confirmer.

## 0 bis. Vision & décisions Franck (14/07) — À RESPECTER

Le logiciel doit être **le plus complet** (couvre TOUT le parc, pas seulement le CERFA).
- **Périmètre COMPLET** : HFC/HFO **et** CO₂ (R-744) **et** ammoniac (R-717) **et**
  **véhicules (V)** — les ateliers ont une machine de transfert de clim et la méca auto
  fait la clim voiture. La catégorie V EST dans le périmètre.
- **Double référentiel COEXISTANT** : ancien (I-IV, **~99 % des gens aujourd'hui**) +
  nouveau (A1-V), montée en charge progressive **jusqu'à ~2029** (remise à niveau des
  anciens). Une personne cumule ses catégories anciennes ET nouvelles.
- **Formations complémentaires par FLUIDE** (CO₂, ammoniac, hydrocarbures) : une **mention**
  que l'admin **coche** sur une personne, qui ÉTEND son droit d'intervenir sur ce fluide
  (typiquement un ancien I-IV qui a suivi un stage CO₂ ou NH₃). Distincte des catégories.
- **Comportement = CONSEIL à l'entrée sur la machine** : la PREMIÈRE chose avant toute
  intervention = **identifier le technicien** ; le logiciel affiche alors son niveau et
  conseille (« contrôle d'étanchéité uniquement », « récupération limitée à 3 kg — cette
  installation en contient 10, vous ne pouvez pas »). Pas un blocage brutal (v1).
- **Débloqué par l'admin** : l'identification n'est possible que si l'administrateur a
  activé la personne (rôle) ET renseigné son **champ de compétence** (catégories + mentions).
- **Ammoniac hors CERFA** : les installations NH₃ ne sont **pas soumises au CERFA 15497**.
  Le logiciel les gère pour le **parc / vieillissement / habilitations**, sans générer de
  CERFA F-Gas. (Nuance à porter aussi côté génération de documents.)

## 1. Cadre réglementaire (sources)

- **Arrêté du 21/11/2025** — attestations d'**aptitude** (personnes), art. R. 543-106 du
  code de l'environnement. [Légifrance](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053004604)
- **Arrêté du 21/11/2025** — attestations de **capacité** (opérateurs/entreprises),
  art. R. 543-99. [Légifrance](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000052993429)
- **Règlement (UE) 2024/573** (« F-Gas III ») — remplace le 517/2014.
  [EUR-Lex](https://eur-lex.europa.eu/legal-content/FR/TXT/PDF/?uri=OJ:L_202400573)
- **Bascule (corrigée L4/Q3, 24/07/2026 — art. 7 et 11 lus verbatim)** : nouveau
  régime obligatoire au **01/01/2027** et fin de la DÉLIVRANCE 2008 au
  **31/12/2026** — mais les attestations détenues **ne meurent pas** à cette
  date. Elles restent reconnues **jusqu'au 12/03/2029** (butoir de la
  **remise à niveau ponctuelle**, art. 7) ; au-delà, seules celles dont la
  remise à niveau est enregistrée au plus tard le butoir comptent, puis cycle
  périodique **≤ 7 ans** (règl. UE 2024/573, art. 10). Une remise à niveau
  postérieure au butoir ne répare pas : examen à repasser (lecture stricte).
  L'ancien couperet « reconnues jusqu'au 31/12/2026 » confondait délivrance
  et validité : il aurait déclaré non habilités des techniciens en règle.

## 2. Matrice des catégories d'APTITUDE 2025 (validée fonctionnellement 14/07)

| Cat. | Opérations autorisées | Fluides | Charge |
|------|-----------------------|---------|--------|
| **A1** | étanchéité, installation, réparation, maintenance, récupération | HFC/HFO + hydrocarbures | aucune limite |
| **A2** | idem A1 | HFC/HFO + hydrocarbures | < 3 kg (< 6 kg si hermétique scellé) |
| **B**  | idem A1 | CO₂ (R-744) | aucune |
| **C**  | idem A1 | Ammoniac (R-717) | aucune |
| **D**  | récupération **seule** | HFC/HFO | < 3 kg (< 6 kg si scellé) |
| **E**  | contrôle d'étanchéité **seul** (sans ouvrir le circuit) | HFC/HFO | — |
| **V**  | climatisation **véhicules** (dans le périmètre, Franck 14/07) | fluides clim auto | selon normes auto |

**Correspondance ancien → nouveau** : I & II → A1/A2 · III → D · IV → E.

**Profils du régime 2008 (arrêté du 13/10/2008 — révisés le 24/07, décision Q2)** :
I = toutes opérations sans limite · **II = toutes opérations avec accès au circuit
sur charge < 2 kg** — le contrôle d'étanchéité SANS ouverture du circuit reste sans
limite (porté par l'axe opération) et le texte 2008 ne prévoit **aucune variante
hermétique** (le 6 kg est une règle du régime 2025) · III = récupération seule
< 2 kg (aligné par délégation côté strict, R1 du PLAN-LOTS-REGLEMENTAIRES-Q1-Q11)
· IV = étanchéité seule. Familles natives 2008 = HFC/HFO seulement.
Historique : la II fut modélisée sans limite (relevé de l'audit du 20/07 §4.3),
puis à 3 kg comme l'A2 (P0-5/AP-2) — les deux étaient des erreurs.

**Frontières STRICTES (P0-5 / AP-1, étendues L1a)** : « inférieure à » = la valeur
pile est REFUSÉE — 2,000 kg (2008), 3,000 kg et 6,000 kg (2025) pile refusés
(les comparateurs inclusifs étaient un bug, corrigé le 22/07).

**Extension (mentions de formation complémentaire)** : indépendamment de la catégorie,
une personne peut détenir une **mention par fluide** (CO₂, ammoniac, hydrocarbures) qui
étend son droit d'intervenir sur ce fluide (ancien I-IV + stage). L'admin la coche.

**Reste à confirmer sur pièce (non bloquant, le moteur est en CONSEIL)** : les seuils
exacts A2/D (3 kg / 6 kg scellé) et la durée de validité. À affiner quand Franck aura
le texte sous les yeux ; sans impact tant qu'on conseille au lieu de bloquer.

## 3. Attestation de CAPACITÉ (établissement)

Déjà partiellement modélisée (`etablissements.date_echeance`, `categories_2025`,
`activites_autorisees`). À relier au régime 2025 (le 2ᵉ arrêté). L'établissement doit
détenir la capacité pour l'activité exercée, en plus de l'aptitude de la personne.

## 4. Seuils de contrôle d'étanchéité (RAPPEL — DÉJÀ CODÉ)

`v8/js/documents/plaque-fgas.js` : 5 / 50 / 500 tCO₂eq → 12 / 6 / 3 mois, doublés si
détection permanente ; détection obligatoire ≥ 500 t ; hermétique scellé < 10 t exempté.
À reconfirmer par Franck, mais implémenté et testé.

## 5. Modèle de données proposé (Phase 1)

- **Table `habilitations`** (multi-régime, une personne peut en cumuler) :
  `id, personne_id, regime ('2008'|'2025'), categorie, date_debut, date_fin,
  organisme, numero`. Jamais supprimée (historisée).
- **Personnel** : les catégories 2025 remplacent progressivement `I/II/III/IV` — les
  deux coexistent via `habilitations.regime` (délivrance 2008 close au
  31/12/2026, reconnaissance selon la remise à niveau — voir §1) ; la remise
  à niveau vit sur la ligne (`remise_niveau_le`/`remise_niveau_organisme`,
  migration 33).
- **Mouvements** : `execute_par_id` (qui fait le geste — ex. élève), `superviseur_id`
  (enseignant), `responsable_registre_id` (référent qui valide juridiquement). Distingue
  les trois rôles réels d'une intervention pédagogique.
- **Fonction pure `verifierDroitIntervention({ personne, operation, fluide, chargeKg,
  machine, date, mode })`** → `{ autorise: bool, motif: string, gravite: 'BLOQUANT'|'ALERTE' }`.
  Module pur `v8/js/data/habilitations.js`, testé unitairement, mirroir serveur exact.

## 6. Sémantique bloquant / alerte

- **Mode Formation** : jamais bloquant — alerte pédagogique (« cette opération exigerait
  une aptitude A1 »), on laisse l'élève apprendre.
- **Mode Officiel** : bloquant — MAIS derrière un drapeau `blocageHabilitationsActif`
  **gaté sur validation ligne à ligne de la §2 par Franck**. Tant que non validé :
  signalement seulement (le moteur tourne, la conformité est calculée, rien n'est refusé).
- Intégration `feu-tricolore.js` (domaine personnel/établissement) + sentinelle (une
  habilitation expirée = épisode d'alerte historisé).

## 7. Décisions par défaut (sobriété — corrigibles par Franck)

- On code la table **complète** (A1→E, +V si confirmée) : ne coûte pas plus, évite un
  re-chantier ; l'établissement n'active que ses formations.
- Moteur d'abord en **signalement** ; blocage dur activé après validation de la §2.
- Coexistence **2008 + 2025** saisie et appliquée via la correspondance §2.

## 8. Ce qui attend Franck (mis à jour 14/07)

1. ~~Valider la §2~~ **FAIT (validée fonctionnellement via Bachir/Pierre).**
2. ~~Périmètre fluides~~ **TRANCHÉ : COMPLET** (HFC/HFO + CO₂ + NH₃ + véhicules).
3. **Lien capacité ↔ aptitude** : quelles opérations exiger de l'établissement en plus
   de la personne ? (encore ouvert, non bloquant pour le moteur de conseil).
4. **Blocage dur vs conseil** en mode Officiel (Phase 3) : Franck penche CONSEIL ; le
   blocage brutal reste à décider (v1 = conseil).

## 9. Plan d'exécution (révisé 14/07)

- ~~**Phase 1** — modèle de données~~ **FAIT** (`da96709`, migration 016).
- ~~**Phase 2a** — saisie/affichage UI~~ **FAIT** (`4692c1d`).
- **Phase 2b** — le CŒUR fonctionnel voulu par Franck :
  1. **Extension modèle** (migration 017) : **mentions de formation complémentaire** par
     fluide (CO₂ / NH₃ / hydrocarbures) sur une personne + **catégorie V** admise.
  2. **Moteur pur `verifierDroitIntervention({ personne, operation, fluide, chargeKg })`**
     → `{ autorise, motif, conseil }` : croise catégories (A1-V, I-IV via correspondance)
     + mentions + seuils + fluide de l'installation. Testé, miroir serveur.
  3. **Écran « qui intervient ? » à l'entrée d'une machine** (fiche machine / wizard) :
     sélection du technicien parmi les personnes ACTIVÉES par l'admin → **conseil de
     compétence** affiché (peut / ne peut pas + pourquoi, façon Bachir/Pierre). Non bloquant.
- **Phase 3** — mode Officiel réellement bloquant (verrou dans validation), + feu
  tricolore / sentinelle. Décision conseil-vs-blocage à confirmer.

Méthode : une brique = un commit, tests d'abord, revue adversariale, contrôle navigateur,
parité démo/local. Orchestration Dynamic Workflows (ultracode actif).
