# Prompt de démarrage — inerWeb Fluide, chantier « REGISTRE AUDIT-PROOF » (à coller dans un nouveau chat)

> Copier tout ce qui suit comme PREMIER message d'un nouveau chat. Il est autonome : contexte, état
> exact, cap, prochaine brique, gates, méthode et consignes.
>
> **Session conseillée : selon le lot choisi** (voir PROCHAINE BRIQUE). Condition 2/3 (réglementaire,
> gatée) → **Opus effort MAXIMUM**. Condition 6 (sauvegardes auto, non gatée) → **Opus effort élevé**
> (incrément cadré, PAS d'ultracode).

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
**législation, sauvegarde, ergonomie** —, **fini vite et bien**. « Septembre 2026 » est le **jalon
personnel** de Franck, PAS un cap directeur. **OVH / `inerweb.ovh` / bascule DNS = repoussé.**

> « Toute fiche officielle est contrôlée avant validation, signée par les bonnes personnes, figée avec
> son PDF original, chaînée aux écritures précédentes, sauvegardée hors du poste, et restituable avec
> toutes ses preuves. »

On ne promet **pas** « inviolable » : on promet **démontrable**.
**LA feuille de route = `docs/PLAN-AUDIT-PROOF-2026.md`. LIS-LA EN PREMIER.**

## À LIRE EN PREMIER (avant de coder)

1. **Mémoire** (`G:\Mon Drive\claude-memoire\`) : `MEMORY.md` puis `project_inerweb_fluide.md`.
2. **`docs/PLAN-AUDIT-PROOF-2026.md`** — le plan du chantier.
3. **`docs/TABLE-REGLEMENTAIRE-FLUIDES.md`** — la table par fluide VALIDÉE (règles A/B/C) ; §4 = les
   questions encore gatées pour le référent F-Gas.
4. Tête de **`CHANGELOG.md`** — dernier état, incrément le plus récent en tête.
5. **`docs/CARTE-CODE.md`** — l'architecture en une page, AVANT toute exploration.
6. `git log` + `git status` — ⚠️ **des sessions parallèles écrivent sur ce dépôt** : vérifie avant d'écrire.

## ÉTAT AU 16/07/2026

- **CONDITION 1 — MOTEUR RÉGLEMENTAIRE UNIQUE : SOLDÉE.** Moteur unique
  `v8/js/data/reglementation-fluides.js` (miroir strict `server/api.js`), 2 bugs corrigés (mélange
  HFC/HFO → HFC ; charge NOMINALE), **fiche EXPLICITE par fluide en base** (migration 21 : colonnes
  `contient_hfc`/`contient_hfo`/`categorie_cadre7`/`source_prp`, constante partagée
  `FICHE_REGLEMENTAIRE_FLUIDES` dans `migrations.js`, la colonne prime sur le libellé de famille,
  repli sinon), **portée temporelle de la Règle B** (`dateIntervention` optionnelle : HFO purs
  contrôlés seulement depuis le 11/03/2024, appelants câblés y compris le cadre 7 du CERFA),
  **l'import d'un export ancien ne détruit plus la fiche actée** (recomplétée des deux côtés).
  **Filet renforcé** : `server/test-gardes-roles.mjs` (25 gardes de rôle mises en défaut
  dynamiquement) + `server/test-transport-http.mjs` (vrai client HTTP contre vrai serveur, garde
  Origin) + charcutage proportionnel dans `test-sauvegarde`. **TOUT VERT — 74 exécutions.**
- **AVIS RÉGLEMENTAIRE REÇU ET APPLIQUÉ (16/07 après-midi)** : « Avis de validation réglementaire »
  (⚠️ section « Validation formelle » NON signée = avis technique, pas encore la validation du
  référent). Règles A/B/C + seuils + date HFO + CERFA *04 CONFIRMÉS (code déjà conforme). Appliqué
  (arbitrage Franck « au mieux F-Gas, compromis protecteur, jamais bloquant ») : **migration 22**
  PRP F-Gas III (R-1234yf 0,501 ; R-290 0,02 AR6 ; R-455A garde 148 conservatoire — réserve DGPR),
  correction REJOUÉE à l'import et au chargement localStorage (`corrigerPrpFgas3`), avertissement
  CONSEIL fluide vierge PRP ≥ 2500 au wizard (Q10), wording « hors périmètre » borné (Q5),
  affichage PRP à décimales adaptatives. DIFFÉRÉS conservateurs : multi-circuits (Q7),
  exemptions hermétiques (Q8), versionnage du modèle CERFA (→ condition 4). Détail =
  `docs/TABLE-REGLEMENTAIRE-FLUIDES.md` §1 bis. ⚠️ Une migration est IMMUABLE (littéraux figés).
- **Le mode Officiel est FERMÉ** (le serveur refuse `mode:'OFFICIEL'`) et le reste **jusqu'à ce que
  les conditions 1→4 du plan soient prêtes ET testées**. On travaille en mode **CONSEIL**.
- Rappel socle (audit externe 15/07) : sécurité **SAINE** prouvée en conditions réelles. Rapports
  **INTERNES gitignorés** `docs/AUDIT-COMPLET-2026-07-15.md` et `docs/DOSSIER-TECHNIQUE.md`.

## PROCHAINE BRIQUE (au choix)

- **Lot NON gaté aligné sur l'axe « sauvegarde »** → **condition 6 : sauvegardes RÉELLEMENT
  automatiques** (snapshot après chaque validation, archive quotidienne, alerte bloquante si aucune
  sauvegarde récente, vérification auto après création — hors décision BitLocker qui reste à Franck).
  Voir l'état/détail dans le plan. Incrément cadré : Opus effort élevé, relecture simple.
- **OU condition 2 : blocage dur du mode Officiel** — reste GATÉE sur la **liste des conditions
  bloquantes à valider par Franck** (`peutPasserEnOfficiel` aux 3 moments, **validateur lu de la
  session** — le trou « qui déclaré ≠ prouvé »). **Opus effort MAXIMUM, réglementaire.**
- ⏳ Questions encore ouvertes côté référent : échéance d'un contrôle HFO **ressaisi** d'avant le
  11/03/2024 (aujourd'hui : aucune — comportement conforme à la réponse Q2 de l'avis) ; réserve
  R-455A (148 vs 145,53, question écrite DGPR §8 de l'avis). Ne rien coder sans validation.

**Restent GATÉS** : condition 2 (liste des conditions bloquantes), 3 (double signature réelle),
4 (empreinte renforcée + PDF scellé conservé — touche `hash-mouvement.js` → plan + migration + tests),
5 (scellement externe quotidien — DSI). + les **10 questions du §4** de la table pour le référent.

## LES GATES (blocages hors code — à obtenir de Franck, ne pas les contourner)

- **Franck + référent F-Gas** : annoter la table (§4), valider la liste des conditions bloquantes du
  mode officiel, le parcours de double signature. **RÈGLE ABSOLUE : ne JAMAIS coder une valeur ou une
  règle réglementaire NOUVELLE sans la validation de Franck.**
- **DPD du lycée** : relire la notice RGPD. **DSI du lycée** : emplacement du scellement externe.

## MÉTHODE (règle d'or, ne rien casser)

- **RÉGLAGE à annoncer avant chaque tâche de code** (grille : mémoire `feedback_reglages_intelligence`).
- **carte → vérifier → modif chirurgicale → TESTS VERTS → commit.** `node outils/lancer-tests.mjs`
  doit être **TOUT VERT (74 exécutions)** avant tout commit.
- **Parité stricte DemoStore (`v8/js/data/demo-store.js`) / LocalStore (`server/api.js`)** : prouvée
  par `test-contrat.mjs` (demo ET local). `server/mapping.js` **lève sur toute clé inconnue** →
  déclarer les nouveaux champs des deux côtés. Un module pur du front réutilisé côté serveur est
  **recopié en littéral** (CommonJS) + un test de parité qui discrimine.
- **Vérification dynamique** : serveur sur **PORT jetable** + **`IWF_CHEMIN_BASE` base jetable**
  (JAMAIS le port 2011 ni le `data/` réel). Corps des requêtes API = **`{params:{...}}`**.
  **Tirer les failles, pas les lire.**
- **Empreinte des mouvements** (`server/hash-mouvement.js`) : NE PAS la modifier à la légère — la
  condition 4 la touchera → plan + migration + tests.
- **Migrations** : registre `server/migrations.js` jusqu'à **22**, prochaine = **23**. ⚠️ Une
  migration est IMMUABLE : elle fige ses propres littéraux, jamais de constante partagée qui
  évolue (leçon du 16/07). Triggers WORM
  sur `mouvements`/`journal_audit` recréés à chaque migration touchant `mouvements` ;
  `PRAGMA recursive_triggers = ON` obligatoire.
- **Sessions parallèles** : `git log` + `git status` **avant** d'écrire ; commits multi-lignes via
  `git commit -F` (jamais le here-string).

## DÉCISIONS ACTÉES (ne pas rouvrir sans raison)

- **Règles A/B/C validées** par Franck. PRP figé **NON rétroactif**. **Licence** PolyForm
  Noncommercial + certificats nominatifs. **Rapports internes gitignorés** jamais publics.

## CE QUI ATTEND FRANCK (hors code)

- **Envoyer la question écrite à la DGPR** (réserve R-455A : 148 vs ≈ 145,53 — le texte exact est
  au §8 de l'avis du 16/07) et **faire signer la section 9 « Validation formelle »** de l'avis par
  le référent F-Gas (aujourd'hui : avis technique non signé).
- **Valider la liste des conditions bloquantes** du mode Officiel (débloque la condition 2).
- Secondaire : relecture `RGPD.md` (DPD), texte de la vitrine. Quand il le décidera : essai en
  données fictives, puis fonctionnement **en parallèle** avec la procédure actuelle.
