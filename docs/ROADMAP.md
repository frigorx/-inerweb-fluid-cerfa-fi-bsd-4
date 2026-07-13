# Feuille de route inerWeb Fluide — audit-proof

> **Pourquoi ce fichier est ICI (dépôt git) et plus dans la mémoire Drive** : la fiche
> `reference_roadmap_fluide.md` (ex-`reference_roadmap_fluide_audit.md`) a DISPARU TROIS FOIS
> du dossier Google Drive `claude-memoire` (2× le 10/07, constat de la 3e le 13/07 — la
> synchronisation re-supprimait la re-création). Le dépôt git est désormais la seule source
> de vérité de la feuille de route ; la mémoire Drive ne contient plus qu'un pointeur.
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

1. **③ Dossier de fuite fermé matérialisé** — *différenciateur n°1, aucun concurrent ne le
   documente*. La règle d'or est déjà codée et testée (retour EN_SERVICE impossible sans
   réparation tracée + contrôle conforme postérieur ; complément sur fuite ouverte bloqué).
   Reste : l'écran CHRONOLOGIE de la fuite + l'export scellé.
2. **④ Certificat de scellement + vérificateur HTML autonome** embarqué dans chaque ZIP —
   preuve auto-vérifiable par un auditeur sans le logiciel. Meilleur rapport impact/effort
   selon l'examen du 10/07.
3. **⑤ Correction automatique du CERFA rempli par l'élève** (v1 bornée aux PDF remplis
   numériquement) — le pont pédagogique.
4. Sentinelle d'alertes persistées.
5. Code machine lisible structuré `SITE-FAMILLE-NUMERO` (ex. `JR-CF-001`, décision Franck 07/07,
   remplace `M1/M2` ; le `code_public` opaque du QR reste distinct et inchangé).
6. Lien intervention → outils utilisés MULTI-outils (aujourd'hui seul le détecteur est lié —
   le « vrai plus audit ») + blocage par-outil non conforme en mode officiel.
7. Tableau de bord enrichi.

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
