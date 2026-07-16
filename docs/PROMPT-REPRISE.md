# Prompt de démarrage — inerWeb Fluide, chantier « REGISTRE AUDIT-PROOF » (à coller dans un nouveau chat)

> Copier tout ce qui suit comme PREMIER message d'un nouveau chat. Il est autonome : contexte, état
> exact, cap, prochaine brique, gates, méthode et consignes.
>
> **Session conseillée : Fable + ultracode** (le lot qui vient est décomposable et non gaté — voir
> RÉGLAGE). Bascule sur le modèle `claude-fable-5` dans le sélecteur (⚠️ `/fast` ne bascule PAS sur
> Fable, il garde Opus).

---

Tu reprends **inerWeb Fluide**, logiciel **LOCAL** de traçabilité des fluides frigorigènes
(F-Gas / CERFA 15497*04) pour lycées professionnels (filière froid/clim).
- **Dépôt** : `C:\git\inerweb-fluide` (clone de `frigorx/-inerweb-fluid-cerfa-fi-bsd-4`, GitHub Pages).
  Source de vérité = son `CHANGELOG.md`.
- **Auteur et utilisateur** : Franck Henninot (LP Jacques Raynaud, Marseille). Réponds en **français
  simple, zéro anglicisme, zéro emoji dans le code**.

## LE CAP (le chantier)

Transformer inerWeb Fluide en **REGISTRE RÉGLEMENTAIRE DÉMONTRABLE**.

**Cadrage Franck (16/07)** : priorité = un logiciel **opérationnel et IRRÉPROCHABLE** sur trois axes —
**législation, sauvegarde, ergonomie** —, **fini vite et bien** (plus vite c'est bouclé, plus vite Franck
teste et développe). « Septembre 2026 » est le **jalon personnel** de Franck, PAS un cap directeur : ne pas
en faire une échéance qui pilote les choix. **OVH / `inerweb.ovh` / bascule DNS = repoussé** (GitHub Pages
suffit ; à réévaluer plus tard, sans urgence).

Objectif à rendre techniquement vrai **et couvert par des tests** :

> « Toute fiche officielle est contrôlée avant validation, signée par les bonnes personnes, figée avec
> son PDF original, chaînée aux écritures précédentes, sauvegardée hors du poste, et restituable avec
> toutes ses preuves. »

On ne promet **pas** « inviolable » (aucun monoposte ne le peut) : on promet **démontrable**.
**LA feuille de route complète = `docs/PLAN-AUDIT-PROOF-2026.md`** (6 conditions + dossier d'audit +
sécurité/RGPD + plan temporel, chacun avec son état actuel et son point de blocage). **LIS-LA EN PREMIER.**

## À LIRE EN PREMIER (avant de coder)

1. **Mémoire** (`G:\Mon Drive\claude-memoire\`) : `MEMORY.md` puis `project_inerweb_fluide.md`.
2. **`docs/PLAN-AUDIT-PROOF-2026.md`** — le plan du chantier.
3. **`docs/TABLE-REGLEMENTAIRE-FLUIDES.md`** — la table par fluide VALIDÉE (règles A/B/C) ; §4 = les
   questions encore gatées pour le référent F-Gas.
4. Tête de **`CHANGELOG.md`** — dernier état, incrément le plus récent en tête.
5. **`docs/CARTE-CODE.md`** — l'architecture en une page, AVANT toute exploration.
6. `git log` + `git status` — ⚠️ **des sessions parallèles écrivent sur ce dépôt** : vérifie avant d'écrire.

## ÉTAT AU 15/07/2026 (dernier commit poussé `f8b7ea2`)

- **CONDITION 1 — MOTEUR RÉGLEMENTAIRE UNIQUE : PREMIÈRE BRIQUE FAITE et poussée** (`1d114c9`).
  Les 3 implémentations dupliquées et contradictoires du « cadre 7 » (seuils + fréquence de contrôle)
  sont unifiées dans **`v8/js/data/reglementation-fluides.js`** (`categorieCadre7` + `evaluerControle`) =
  source de vérité ; `plaque-fgas.js`, `cerfa/generateur.js` et `demo-store.js` la consomment, `server/api.js`
  en garde une **copie littérale** (CommonJS), parité prouvée par `test-contrat.mjs` (demo ET local).
  **Table par fluide VALIDÉE par Franck** (règles A/B/C, sources officielles) = `docs/TABLE-REGLEMENTAIRE-FLUIDES.md`.
  **Deux bugs réglementaires corrigés** : (1) un **mélange HFC/HFO** (R-455A) est traité comme un **HFC**
  (seuils en teqCO₂ ; on teste HFC/PFC **avant** HFO) — la notice CERFA le cite nommément ; (2) le seuil/la
  fréquence se calculent sur la **charge NOMINALE déclarée**, plus sur `chargeActuelleKg`. Batterie de tests
  aux valeurs limites (`test-reglementation-fluides.mjs`). **72 exécutions TOUT VERT.** Démo M5 clarifiée
  (`f8b7ea2` : sous le seuil → aucune échéance périodique, fuite suivie à part).
- **Règles réglementaires établies (sur textes officiels, à faire annoter par le référent)** : (A) mélange
  contenant du HFC → catégorie **HFC** (teqCO₂ 5/50/500) ; (B) HFO **purs** → seuils en **kg** 1/10/100
  (règl. UE **2024/573 F-Gas III** art. 5, depuis le 11/03/2024) ; (C) périodicité sur la **charge totale
  déclarée** (FAQ DGPR). ⚠️ **Régime EN VIGUEUR = F-Gas III (2024/573)**, le 517/2014 est abrogé depuis le
  31/12/2024 (le formulaire 15497*04 lui est antérieur → à confirmer avec le référent).
- **Le mode Officiel est FERMÉ** (le serveur refuse `mode:'OFFICIEL'`) et le reste **jusqu'à ce que les
  conditions 1→4 du plan soient prêtes ET testées**. On travaille en mode **CONSEIL**.
- Rappel socle (audit externe) : sécurité **SAINE** prouvée en conditions réelles (127.0.0.1, garde
  Host/Origin, scrypt + verrou 5 échecs, WORM inviolable même par SQL direct, AES-256-GCM réel). Rapports
  **INTERNES gitignorés** `docs/AUDIT-COMPLET-2026-07-15.md` et `docs/DOSSIER-TECHNIQUE.md`.

## PROCHAINE BRIQUE — suite de la condition 1 (NON gatée, décomposable → Fable + ultracode)

Le moteur existe et est testé. Les valeurs sont **déjà validées** : ce lot est du **refacto cadré +
migration + tests**, sans nouvelle décision réglementaire. Trois chantiers indépendants :

1. **Fiche EXPLICITE par fluide EN BASE (migration 21).** Aujourd'hui `categorieCadre7` dérive la catégorie
   de `famille.includes(...)`. La rendre explicite : colonnes `contient_hfc`, `contient_hfo` (et au besoin
   `categorie_cadre7`, `source_prp`) sur la table `fluides`, peuplées depuis les valeurs de
   `docs/TABLE-REGLEMENTAIRE-FLUIDES.md` ; `categorieCadre7` lit la colonne quand elle existe (repli sur la
   dérivation sinon). Objectif : ne plus dépendre d'un libellé de famille ambigu (« HFC/HFO » vs
   « Mélange HFO/HFC »). **Parité `mapping.js`/demo/serveur** (déclarer les champs des DEUX côtés, `mapping`
   lève sur clé inconnue). Migration `controles`-style **hors WORM** (table `fluides` n'est pas dans la chaîne).
2. **Date d'intervention dans le moteur.** `evaluerControle(fluide, chargeNominale, detection, dateIntervention)` :
   les **HFO purs** ne sont soumis au contrôle **qu'à partir du 11/03/2024** (F-Gas III). Aujourd'hui tout est
   postérieur, mais le moteur doit **porter la règle** (et un test la fige). Ne rien casser des appelants
   (paramètre optionnel, défaut = régime courant).
3. **Renfort de couverture de tests** (audit-qualité, lot 1) : le filet ne met pas en défaut certaines gardes
   de rôle, ne teste pas le vrai client HTTP (`transport-http.js`), ni plusieurs vues. Cibler d'abord ce qui
   touche le réglementaire (les gardes du mode CONSEIL, le calcul d'échéance côté serveur).

**Restent GATÉS (Opus effort MAX, quand Franck valide — PAS ce lot Fable)** : condition 2 (**blocage dur du
mode Officiel** — la *liste des conditions bloquantes* à valider par Franck + référent), 3 (double signature
réelle), 4 (empreinte renforcée + PDF scellé conservé — touche `hash-mouvement.js` → plan + migration + tests),
5 (scellement externe quotidien — DSI), 6 (sauvegardes auto). + les **10 questions du §4** de la table pour le
référent F-Gas. Ordre et dépendances : `docs/PLAN-AUDIT-PROOF-2026.md`.

## LES GATES (blocages hors code — à obtenir de Franck, ne pas les contourner)

- **Franck + référent F-Gas** : annoter la table (§4), valider la liste des conditions bloquantes du mode
  officiel, le parcours de double signature. **RÈGLE ABSOLUE : ne JAMAIS coder une valeur ou une règle
  réglementaire NOUVELLE sans la validation de Franck.** (Les règles A/B/C, elles, sont déjà validées.)
- **DPD du lycée** : relire la notice RGPD.
- **DSI du lycée** : emplacement extérieur du scellement quotidien (condition 5).

## MÉTHODE (règle d'or, ne rien casser)

- **RÉGLAGE à annoncer avant chaque tâche de code** :
  - Ce lot (migration/date/tests, valeurs déjà figées) → **Fable + ultracode**, orchestration effort
    medium/high, **sous-agents Sonnet** (refacto/lecture) **+ Haiku** (mécanique/tests). Économe et agentique.
  - Cœur réglementaire **NOUVEAU**, condition 2, RGPD, irréversible → **Opus effort MAX**.
  - **Jamais Sonnet (ni Haiku) en xhigh/ultra.**
- **carte → vérifier → modif chirurgicale → TESTS VERTS → commit.** `node outils/lancer-tests.mjs` doit être
  **TOUT VERT (72 exécutions)** avant tout commit.
- **Parité stricte DemoStore (`v8/js/data/demo-store.js`) / LocalStore (`server/api.js`)** : prouvée par
  `test-contrat.mjs` joué contre **demo ET local**. `server/mapping.js` **lève sur toute clé inconnue**
  (anti-dérive) → déclarer les nouveaux champs des deux côtés. Un module pur du front réutilisé côté serveur
  est **recopié en littéral** (CommonJS) : garder les deux STRICTEMENT identiques + un test de parité qui
  discrimine (ex. le moteur réglementaire : tester un mélange reclassé, pas seulement un HFC pur).
- **Vérification dynamique** : serveur sur **PORT jetable** + **`IWF_CHEMIN_BASE` base jetable** (JAMAIS le
  port 2011 ni le `data/` réel de Franck). Pour la démo (DemoStore) : `python -m http.server` sur un port
  jetable, origine neuve. ⚠️ Le corps des requêtes API est enveloppé **`{params:{...}}`**. **Tirer les
  failles, pas les lire.**
- **Empreinte de hash des mouvements** (`server/hash-mouvement.js` = clone exact de `v8/js/core/utils.js`,
  verrouillé par `server/test-hash-mouvement.mjs`) : NE PAS la modifier à la légère. La **condition 4** la
  touchera → plan + migration + tests.
- **Migrations** : registre `server/migrations.js` jusqu'à **20**, prochaine = **21**. Table `controles` et
  table `fluides` = **hors WORM**. Les triggers WORM sur `mouvements`/`journal_audit` sont recréés à chaque
  migration touchant `mouvements`. `PRAGMA recursive_triggers = ON` obligatoire (ne jamais retirer).
- **Sessions parallèles** : `git log` + `git status` **avant** d'écrire ; commits multi-lignes via
  `git commit -F` (jamais le here-string). Le dépôt est public : push quand Franck l'attend.

## DÉCISIONS ACTÉES (ne pas rouvrir sans raison)

- **Règles A/B/C validées** par Franck (mélange HFC/HFO → HFC ; HFO purs en kg via F-Gas III ; charge
  nominale). Le **PRP figé** à la validation d'un mouvement reste **NON rétroactif** (protège l'historique).
- **Licence** : PolyForm Noncommercial + **certificats nominatifs** gratuits accordés au cas par cas (PAS de DRM).
- **Rapports internes gitignorés** (`docs/DOSSIER-TECHNIQUE.md`, `docs/AUDIT-COMPLET-2026-07-15.md`) : jamais
  publics. Franck assume l'audit-qualité et la roadmap déjà publics.

## CE QUI ATTEND FRANCK (hors code)

**LE point qui débloque le réglementaire** : remplir le **questionnaire de validation** (règles A/B/C +
table par fluide + 10 questions) avec le **référent F-Gas**, puis le renvoyer → intégration au moteur. Le
`.docx` remplissable est sur le Bureau de Franck (`QUESTIONNAIRE-Table-reglementaire-fluides.docx`) ; version
de référence versionnée = `docs/TABLE-REGLEMENTAIRE-FLUIDES.md`.
Secondaire (non prioritaire) : relecture de `RGPD.md` (DPD), validation du texte de la vitrine. **OVH / DNS
`inerweb.ovh` = repoussé** (pas sûr d'apporter plus que GitHub — à réévaluer plus tard, sans urgence).
Quand Franck le décidera : essai en données fictives, puis fonctionnement **en parallèle** avec la procédure
actuelle avant de s'en servir comme registre principal.
