# SPEC — Habilitations F-Gas (attestations de capacité & d'aptitude)

> **Le cœur « audit-proof » (chantier B2).** Objectif : savoir, pour chaque
> intervention, si la PERSONNE a l'aptitude requise et si l'ÉTABLISSEMENT a la
> capacité requise — et l'opposer en mode Officiel.
>
> ⚠️ **GARDE-FOU RÉGLEMENTAIRE.** La matrice ci-dessous est un BROUILLON reconstitué
> par recherche web (13/07/2026), à **valider ligne à ligne par Franck sur le texte
> officiel** avant tout **blocage dur**. Tant que ce n'est pas fait, le moteur SIGNALE,
> il ne BLOQUE pas. Une case fausse = audit faux : c'est précisément ce qu'on évite.

## 1. Cadre réglementaire (sources)

- **Arrêté du 21/11/2025** — attestations d'**aptitude** (personnes), art. R. 543-106 du
  code de l'environnement. [Légifrance](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053004604)
- **Arrêté du 21/11/2025** — attestations de **capacité** (opérateurs/entreprises),
  art. R. 543-99. [Légifrance](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000052993429)
- **Règlement (UE) 2024/573** (« F-Gas III ») — remplace le 517/2014.
  [EUR-Lex](https://eur-lex.europa.eu/legal-content/FR/TXT/PDF/?uri=OJ:L_202400573)
- **Bascule** : nouveau régime obligatoire au **01/01/2027** ; les attestations
  « 2008 » (I–IV) restent reconnues **jusqu'au 31/12/2026** → coexistence à gérer.

## 2. Matrice des catégories d'APTITUDE 2025 (BROUILLON — À VALIDER)

| Cat. | Opérations autorisées | Fluides | Charge |
|------|-----------------------|---------|--------|
| **A1** | étanchéité, installation, réparation, maintenance, récupération | HFC/HFO + hydrocarbures | aucune limite |
| **A2** | idem A1 | HFC/HFO + hydrocarbures | < 3 kg (< 6 kg si hermétique scellé) ⚠️ |
| **B**  | idem A1 | CO₂ (R-744) | aucune |
| **C**  | idem A1 | Ammoniac (R-717) | aucune |
| **D**  | récupération **seule** | HFC/HFO | < 3 kg (< 6 kg si scellé) ⚠️ |
| **E**  | contrôle d'étanchéité **seul** (sans ouvrir le circuit) | HFC/HFO | — |
| **V**  | climatisation **véhicules** | selon normes auto | ⚠️ **incertain** (à confirmer, hors périmètre froid/clim fixe ?) |

**Correspondance ancien → nouveau** : I & II → A1/A2 · III → D · IV → E.

**Cases à verrouiller par Franck** : catégorie **V** ; seuils **A2/D** (3 kg / 6 kg
scellé) ; **durée de validité** (« illimitée + remise à niveau tous les 7 ans » vs
« 7 ans »).

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
  deux coexistent via `habilitations.regime` jusqu'au 31/12/2026.
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

## 8. Ce qui attend Franck

1. **Valider/corriger la §2** (surtout les cases ⚠️) sur le texte officiel — débloque le
   passage en mode Officiel bloquant (Phase 3).
2. **Périmètre fluides** : HFC/HFO seuls, ou aussi CO₂ (B) / ammoniac (C) / véhicules (V) ?
3. **Lien capacité ↔ aptitude** : quelles opérations exiger de l'établissement en plus
   de la personne ?

## 9. Plan d'exécution

- **Phase 1** — modèle de données (migration + saisie + correspondance + parité + tests).
  Aucun blocage. **Sûr, indépendant de la validation §2.**
- **Phase 2** — moteur `verifierDroitIntervention` (pur, testé) + affichage informatif +
  alertes mode Formation. Non bloquant.
- **Phase 3** — mode Officiel bloquant (verrou dans `validerMouvement`/`createControle`),
  **gaté §8.1** + intégration feu tricolore / sentinelle.

Méthode : une phase = un ou plusieurs commits, tests d'abord, revue adversariale du cœur,
contrôle navigateur, parité démo/local stricte. Chantier lourd et décomposable →
candidat aux Dynamic Workflows (si Franck opte pour ultracode).
