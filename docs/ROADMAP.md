# Feuille de route inerWeb Fluide — audit-proof

> **Pourquoi ce fichier est ICI (dépôt git) et plus dans la mémoire Drive** : la fiche
> `reference_roadmap_fluide.md` (ex-`reference_roadmap_fluide_audit.md`) a disparu trois fois
> du dossier Google Drive `claude-memoire` (2× le 10/07, constat de la 3e le 13/07 —
> cause élucidée : fausse manipulation lors d'un nettoyage de fichiers, pas la
> synchronisation). Le dépôt git est désormais la seule source de vérité de la feuille
> de route ; la mémoire Drive ne contient plus qu'un pointeur.
> Reconstruite le 13/07/2026 depuis `docs/PROMPT-REPRISE.md` et la fiche projet ; le détail
> intégral de l'ancienne section G (examen multi-agents du 10/07, 9 agents) est résumé ci-dessous,
> sa version longue est perdue.

## Cap

Un logiciel **local** de traçabilité des fluides frigorigènes (F-Gas / CERFA 15497*04)
**irréprochable lors d'un audit**, qui **forme les élèves** et **simplifie toute la gestion du
fluide**, assez professionnel pour être **diffusé gratuitement dans les lycées**.
Carte blanche de Franck : « tout produire, irréprochable audit, gratuit lycées ».

## État (13/07/2026, dernier commit `f59972b`)

Socle E0→E5 + V9.1 + Phase 2 (lots 0-1) + référence client + QR intégral + fiche outil vivante +
scellement dossier d'audit + premier lancement web + gestion des comptes + sauvegarde configurable +
export ZIP machine/client + **Séance 0 + brique ① (feu tricolore) + brique ② (fiche bouteille
vivante, PRP figé, inventaire nominatif)** : FAITS, testés, poussés. Contrat 255/0 sur les deux
implémentations (démo + local). Démo en ligne fonctionnelle (GitHub Pages `/v8/`).

## Briques restantes — SANS dépendance à Franck (dans l'ordre)

1. ~~**③ Dossier de fuite fermé matérialisé**~~ — **FAIT 13/07 (`827fe9c`)** : module pur
   `dossiers-fuite.js` (épisodes regroupés alignés sur `estFuiteOuverte`), écran `#/f/`,
   bloc « Fuites » fiche machine, export ZIP scellé, 46/0+26/0, vérifié navigateur.
2. ~~**④ Certificat de scellement + vérificateur HTML autonome**~~ — **FAIT 13/07
   (`c00d264`)** : `99-VERIFICATEUR.html` dans chaque dossier scellé + certificat
   imprimable, 39/0 dont archives forgées hostiles, vérifié navigateur.
3. ~~**⑤ Correction automatique du CERFA rempli par l'élève**~~ — **FAIT 13/07
   (`e4a04c2`)** : comparateur équitable sur les 72 champs (rapport par cadre,
   rapport HTML imprimable), 30/0 sur PDF réels, vérifié navigateur.
4. ~~**Sentinelle d'alertes persistées**~~ — **FAIT 13/07 (`2f0c537`)** : module pur
   `sentinelle.js` + migration 015 (table `sentinelle_alertes`, index UNIQUE partiel
   « un seul épisode ouvert par alerte ») + 3 méthodes de contrat (rafraichir idempotente,
   acquitter → journal chaîné, getSentinelle ; surface 66→69). Aucun masquage (feu tricolore
   inchangé). UI tableau de bord (« active depuis » + « J'ai pris connaissance ») + historique
   Conformité. Escalade de niveau tracée (acquittement remis à zéro). Revue adversariale
   0 bloquant. 40/0 + 33/0 demo+local, 53 exécutions vertes, vérifié navigateur.
5. ~~**Code machine lisible structuré `SITE-FAMILLE-NUMERO`**~~ — **FAIT 14/07 (`5adb7c3`)** :
   module pur `code-machine.js` (JR-CF-001 proposé automatiquement au formulaire, site déduit
   de l'établissement + famille du type), createMachine/updateMachine avec unicité, renommage
   journalisé, fiche machine « code · QR ». 32/0 demo+local, vérifié navigateur.
6. ~~**Lien intervention → outils MULTI-outils**~~ — **FAIT 14/07 (`b5dfd9c`)** : migration 018
   `mouvement_outillage`, statut/échéance FIGÉS à la validation + journal chaîné (recoupement),
   4 triggers anti-forge (re-parentage compris), wizard cases + avertissement CONSEIL, CSV
   d'audit conditionnel. Contrat 77 (`VERSION_CONTRAT` 3). 26/0 ×2 + migrations 138/0, revue
   adversariale soldée, vérifié navigateur. ⚠️ Le « blocage par-outil en mode officiel » suit
   le sort du blocage dur B1 (gaté choix Franck — v1 = CONSEIL assumé).
7. ~~**Tableau de bord enrichi**~~ — **FAIT 14/07 (`162b086`)** : rôles réels B2 visibles
   (modale détail + `mouvements.csv` + exécutant sur les lignes du tableau de bord), carte
   « Conformité » mini feu tricolore. Vérifié navigateur (parcours wizard complet).
8. ~~**Réserves B2** (semis démo + anti-doublon de mention)~~ — **FAIT 14/07 (`b81b132`)** :
   habilitations/mentions semées au monde de démo (compléments d'import verrouillés À VIDE,
   piège testé), confirmation de renouvellement sur mention déjà active (conseil, jamais
   bloquant). Vérifié navigateur.
9. ~~**Parcours « audit guidé »** (priorité 3 de l'audit croisé GPT — le dernier trou
   produit non gaté)~~ — **FAIT 14/07** : module pur `audit-guide.js` (9 étapes ordonnées
   établissement → personnel → outillage → bouteilles → mouvements → contrôles →
   déchets/BSFF → balance → export ; alertes rattachées par préfixe, zéro perte, faits de
   présence lus du contrat) + vue `#/audit-guide` (stepper numéroté, constats cliquables,
   bouton d'ouverture par étape) + entrée sidebar. Suite doublée demo/local. Vérifié
   navigateur.

## Briques GATÉES sur la validation réglementaire de Franck

⛔ **NE PAS coder en dur avant validation sur le texte officiel (arrêté du 21/11/2025)** :

- **B1 — Mode Officiel réellement bloquant** : effort moyen — il manque la bascule + le verrou
  dans `validerMouvement` (examen 10/07).
- **B2 — Habilitations** : capacité établissement / aptitude personne, catégories 2008 (I-IV)
  *et* 2025 (A1/A2/B/C/D/E/V), table dédiée multi-régime, `verifierDroitIntervention(...)`,
  champs `execute_par_id`/`superviseur_id`/`responsable_registre_id`. **Le seul vrai gros
  chantier du cœur** (confirmé aux 3 rounds d'audit GPT + examen 10/07).
- **B3/B4 — Seuils tCO₂eq + fréquences de contrôle 12/6/3 mois** : quasi-faits — déjà
  codés/testés dans `plaque-fgas.js` ; reste le câblage + la confirmation des seuils
  (5/50/500 tCO₂eq, réduction si détection fixe) par Franck.

C'est ce trio qui rend le logiciel « irréprochable en audit ».

## Différé (ne pas rouvrir avant de fermer ce qui précède)

- **V1.5 (oct-déc 2026)** : relevés élèves à la tablette (⚠️ bloqué RGPD §16.5), diagramme
  enthalpique Frigolo-Mollier (intrant archivé `docs/intrants-v10/`), sondes Testo BLE
  (549i/115i de Franck), planche d'étiquettes optimisée, mode TP guidé, pont inerWeb Édu,
  horodatage externe du scellement, packs pédagogiques partageables.
- **V2 (2027+)** : Cloud Lycée Supabase, multi-poste par contributions nominatives (fusionner
  des ÉVÉNEMENTS, jamais des états — round 4 GPT ; préparé en doc seulement, décision Franck
  07/07), pont HAL, export inspecteur standardisé, pont Trackdéchets (obligatoire mais lourd),
  assistant client (contrats/portail/rapports).
- **Indéfiniment** : multi-établissement, app mobile, IA intégrée (l'IA ne calcule JAMAIS un
  chiffre réglementaire), facturation.

## Ce qui attend Franck (rappeler sans harceler)

1. La **grille réglementaire officielle** (catégories, seuils, dates, bloquant vs alerte) —
   débloque B1/B2/B3/B4, le cœur audit-proof.
2. Le **RGPD élèves** (§16.5, via DPO académie) — avant tout module relevés.
3. **Révoquer les vieilles clés API v7** (§16.7) — indépendant du reste.
4. La version définitive du cahier des charges Phase 2 (dialogue GPT).

## Examen multi-agents du 10/07 (résumé — ancienne section G)

9 agents en lecture seule, constats contre-vérifiés sur pièces. Verdict : **le code est plus
avancé que la feuille de route ne le disait** — B3/B4 quasi-faits (`plaque-fgas.js`), B1 =
effort moyen, règle d'or de la fuite déjà codée ; B2 = seul vrai gros chantier. Trous produit
confirmés (depuis traités pour la plupart) : pas de fiche bouteille (→ brique ② FAITE),
conformité éclatée sur 5 vues (→ brique ① FAITE), Mouvements sans filtre, guide
d'installation faux (→ Séance 0 FAITE).

## Atouts vs concurrence (C'Fluide, Clim'app)

Hash chaîné + triggers WORM + journal d'audit chaîné (aucun concurrent) · mode FORMATION avec
filigrane · dossier de fuite fermé documenté · scellement SHA-256 des exports · 100 % local,
zéro cloud imposé · **gratuit pour les lycées**. Retards marché assumés : scan caméra réel
(matériel), pont Trackdéchets (différé).

## Dettes techniques notées (à traiter avec B2)

- `updateBouteille` sans garde de statut.
- `prpFige` falsifiable dans un export édité à la main (recoupement = journal chaîné).
- L'import ne vérifie pas l'intégrité référentielle des fluides du candidat.
- `pieces_jointes.chemin` = chemin absolu → restauration cross-machine ne retrouverait pas
  les PJ (OK sur le même poste, cas actuel).
