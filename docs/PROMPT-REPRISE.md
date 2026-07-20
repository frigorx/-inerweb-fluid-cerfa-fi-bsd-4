# Prompt de démarrage — inerWeb Fluide, chantier « REGISTRE AUDIT-PROOF » (à coller dans un nouveau chat)

> Copier tout ce qui suit comme PREMIER message d'un nouveau chat. Il est autonome : contexte, état
> exact, cap, prochaine brique, gates, méthode et consignes.
>
> **Session conseillée : Opus, effort xhigh** (chantier probatoire/réglementaire, petites
> briques testées comme le lot C). PAS d'ultracode hors point critique.
>
> **ÉTAT (20/07 soir) — CAP = REGISTRE OFFICIEL UNIQUE (barème maximal, tranché par Franck).**
> Un 2ᵉ audit externe (ChatGPT) a été traité. Dépôt PROPRE, dernier commit **`f894cbc`**,
> **TOUT VERT — 85 exécutions** (`node outils/lancer-tests.mjs --tout`). Fait + poussé :
> - **T1 ✅** (`a65ea4b`) — mode Officiel REFERMÉ (`VERROU_LIVRAISON=true`, 2 miroirs
>   `server/blocage-officiel.js` + `v8/js/data/blocage-officiel.js`, NON configurable) le temps
>   des P0. Suite `server/test-officiel-e2e.mjs` GELÉE par une garde en tête (à rejouer à la réouverture).
> - **P0-2 ✅** (`8fdd5fb`) — colmatage initial, REMPLACÉ depuis par P7-c (refus structurel).
> - **P0-7 option A (le contrôle d'étanchéité DEVIENT un mouvement) — PARCOURS COMPLET P7-a→d2** :
>   **P7-a ✅** (`abe0003`) types CONTROLE + « sec » + CR-3 · **P7-b ✅** (`ffbf29a`)
>   garde résultat + libellés dashboard · **P7-c ✅** (`fc8b8f0`) `createControle` direct
>   FORMATION-only PAR NATURE (`MSG_CONTROLE_DIRECT_OFFICIEL` dans les 2 miroirs blocage-officiel,
>   refus STRUCTUREL qui tiendra verrou OUVERT, test d'égalité stricte du message) ·
>   **P7-d1 ✅** (`8ab4a98`) effets machine identiques à createControle (CR-3 transmet `operateurId` ;
>   échéance RÉGLEMENTAIRE calculée — logique unique cadre 7 — portée à la machine pour un mouvement
>   CONTROLE ; garde machine DEMANTELEE) + CERFA du mouvement CONTROLE prouvé au PDF relu ·
>   **P7-d2 ✅** (`f894cbc`) carte « Contrôle d'étanchéité » du wizard (parcours « sec », étapes 3-4
>   sautées aller/retour, « Sans objet » retiré de l'étape 5) + chipType/quantité « — »/filtre
>   CONTROLE dans les vues + VÉRIF NAVIGATEUR réelle complète (port statique jetable, mode démo).
>   **P7-e ✅** (`28d670b`) acceptation : garde `createControle` direct (mouvementId forgé REFUSÉ,
>   fermait le « reste consigné » de l'audit) + garde d'import (contrôle OFFICIEL orphelin refusé,
>   invariants des 2 stores) + acceptation contrat (écriture figée, contre-écriture seule correction,
>   contrôle lié survit à l'annulation — consigné) ; part OFFICIELLE → consigne de réouverture en
>   tête de la suite e2e GELÉE. **P0-7 (P7-a→e) : COMPLET.** Plan = `docs/PLAN-P0-INTEGRITE-CONTROLES.md`.
>   Écarts consignés à trancher avec Franck (non bloquants, plan §7) : (a) l'annulation d'un mouvement
>   CONTROLE ne neutralise pas les effets machine du contrôle lié (aligné sur l'accessoire, préexistant,
>   à revoir avec P0-6) ; (b) l'échéance du contrôle ACCESSOIRE (charge+contrôle déclaré) n'est
>   toujours pas mise à jour (comportement historique, P7-d1).
>
> **⭐ RC ChatGPT `8.1.0-rc.1` = SOURCE DE CODE** (zip sur le Bureau, SHA `e09ea34…`, intègre vérifié).
> Travail RÉEL et large (contrat **v8** ≠ notre v7 ; ~1400 lignes de cœur api+demo ; module
> `server/droit-intervention.js` branché ; cycle matière branché+WORM ; `createControle` colmaté
> COMME nous = convergence ; HTTPS LAN ; scrypt N=2^17 ; déclaration 11 rubriques ; RGPD) — mais
> **NON testée, hors git, R-455A resté 148**. **DÉCISION FRANCK 20/07 : notre dépôt git RESTE LA BASE ;
> on pioche la RC brique par brique RE-testée, JAMAIS d'import en bloc.** Plan = `docs/PLAN-INTEGRATION-RC-CHATGPT.md`.
> Pour piocher : ré-extraire le zip + `diff` le fichier contre l'archive d'audit ou notre dépôt.
>
> **PROCHAINE BRIQUE (au choix Franck)** : les **briques AUTONOMES de la RC** — P1-5 HTTPS LAN
> (`server/serveur.js`), P2-3 scrypt N=2^17 (`server/comptes.js`), P1-6 anti-OneDrive — faciles,
> sans conflit. Puis grosses briques métier reprises de la RC : P0-3/4 cycle matière, P0-5 aptitude
> (`droit-intervention.js` + frontières 3/6 kg), P0-6 fuite (24 h/1 mois — reprendra aussi l'écart
> consigné « effets machine d'un contrôle annulé »), P0-8 déclaration 11 rubriques. **Hors code** :
> P0-9 (révocation clés v7), RGPD (notice/durées/DPD).
>
> **Décisions transverses en attente** : **T2** R-455A 148→146 (la RC a gardé 148 ; à re-trancher pour
> la cible officielle) · **T3** relecture organisme agréé + DPD (délai long).
>
> **Docs à lire (dépôt)** : `docs/CONSTATS-AUDIT-EXTERNE-2026-07-20.md` (constats triés par gravité) ·
> `docs/AUDIT-INERWEB-FLUIDE-2026-07-20.md` (rapport ChatGPT complet) · `docs/PLAN-P0-INTEGRITE-CONTROLES.md` ·
> `docs/PLAN-INTEGRATION-RC-CHATGPT.md` · `docs/CARTE-CODE.md` (À LIRE AVANT d'explorer le code).
>
> **Reste consigné (préexistant)** : `createControle` accepte un `mouvementId` arbitraire — à fermer.
>
> **MÉTHODE / RÈGLES D'OR** : JAMAIS toucher au `data/` RÉEL (tester sur port + base JETABLES) · corps
> API = `{params:{...}}` (pas à plat) · « une faille se prouve en la TIRANT, pas en la lisant » · une
> brique = code + tests verts + revue adversariale AVANT commit · sessions parallèles → `git log`+`status`
> AVANT d'écrire · source de vérité = `CHANGELOG.md` (dernier en tête) · messages de commit multi-lignes
> via `git commit -F fichier` · parité STRICTE `server/api.js` ↔ `v8/js/data/demo-store.js`.
>
> --- ci-dessous, le brief E d'origine (E1 et E3 désormais faits) ---
> C5 soldée : `VERROU_LIVRAISON = false` (2 miroirs), exemption TRANSFERT du PDF final
> (arbitrage Franck — jamais de CERFA, PDF fourni refusé, scellé v2 chaîné), migration
> **24** (WORM pieces_jointes d'un mouvement figé, import qui recrée), vérification des
> PDF conservés au DÉMARRAGE (journal `PDF_FINAL_ANOMALIE`) et au DOSSIER D'AUDIT
> (restitution du CONSERVÉ + verdicts `02-PDF-CONSERVES.txt`, jamais de régénération),
> **choix du mode au wizard** (étape 6 — le chemin d'écran qui manquait ; en Officiel
> l'assistant s'arrête au BROUILLON, signatures d'abord), suite e2e
> `server/test-officiel-e2e.mjs` (41 vérifs, parcours complet + attaques + contre-écriture
> officielle CONFIRMÉE §9), essai complet AU NAVIGATEUR sur serveur réel jetable (double
> signature à l'écran, délégation pré-cochée, validation « aucun blocage », bouton CERFA
> « original conservé », base vérifiée). Revue adversariale : 4 constats fermés avant
> commit. **Filet : TOUT VERT — 81 exécutions** (`node outils/lancer-tests.mjs`).
> Détail : tête du `CHANGELOG.md`.
>
> **PROCHAINE ÉTAPE = LOT E — RGPD avant la rentrée** (des élèves y seront) :
> ① export individuel des données d'une personne · ② purge des données de formation
> selon la durée annoncée · ③ notice d'information affichée dans l'application ·
> ④ relecture DPD quand Franck peut (gate hors code).
> **HORS CODE, avant septembre** : relecture finale de la liste du lot B par Franck
> (gate ⑤ de C5, demandée le 19/07) · SIMULATION D'AUDIT fin août · septembre en
> PARALLÈLE de la procédure actuelle (2-4 semaines), puis bascule avec secours papier.
> **Reste consigné (préexistant, non bloquant)** : `createControle` accepte un
> `mouvementId` arbitraire (un contrôle forgé lié à une fiche d'une autre année
> échapperait au dossier d'audit annuel) — à fermer à l'occasion.

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
- **CONDITION 6 SOLDÉE (16/07 soir)** : sauvegardes RÉELLEMENT automatiques
  (`server/sauvegarde-auto.js` — archive au démarrage si > 24 h + VÉRIFIÉE, snapshot débouncé après
  chaque écriture scellée via `api.appeler`, jamais bloquant, réglages à l'écran Sauvegarde,
  famille 15 de test-sauvegarde + preuve sur le vrai serveur). `SAUVEGARDE.md` à jour.
- **DÉCISIONS FRANCK 16/07 (ne pas rouvrir)** : le logiciel est à usage **INTERNE** → R-455A =
  **148 DÉFINITIF**, pas de question DGPR, pas de signature formelle du référent — **la table
  réglementaire est CLOSE**. « Ne pas bloquer sur des détails, finir le logiciel. »
- **LE LOGICIEL EST COMPLET POUR L'USAGE INTERNE** : les 3 axes du cadrage sont couverts
  (législation = moteur conforme à l'avis ; sauvegarde = automatique et vérifiée ; ergonomie = RAS).
- **Le mode Officiel est OUVERT depuis le 19/07 (brique C5)** : les conditions 1→4 du plan sont
  livrées ET testées ; le mode est gouverné par les conditions réelles du moteur de blocage
  (docs/CONDITIONS-BLOCANTES-OFFICIEL.md). Le mode CONSEIL/FORMATION reste le défaut du wizard.
- Rappel socle (audit externe 15/07) : sécurité **SAINE** prouvée en conditions réelles. Rapports
  **INTERNES gitignorés** `docs/AUDIT-COMPLET-2026-07-15.md` et `docs/DOSSIER-TECHNIQUE.md`.

## LE CAP RÉACTIVÉ (Franck, 16/07 soir) : REGISTRE RÉEL EN SEPTEMBRE

Franck veut s'en servir **à partir de septembre pour TOUTE la traçabilité de son fluide**, en vrai
registre audit-proof. Les arbitrages restent délégués (« au mieux, compromis protecteur ») — il
RELIT, il ne rédige pas. Rappel : en CONSEIL on ne bloque jamais (sa règle) ; le mode OFFICIEL,
lui, DOIT bloquer — c'est sa définition. **Ordre des lots** :

1. ✅ **LOT A — SOLDÉ le 16/07 (commit `872d34b`)** : toute lecture exige une session (loopback
   COMPRIS), seuls `ping` + amorçage `routes-comptes` passent sans. Régression front réglée
   (`init()` tolère « Session requise », intégrité re-vérifiée post-connexion). Les 3 durcissements
   posés : signature binaire réelle des PJ (nombres magiques, démo + serveur), CSP en en-tête HTTP
   (`frame-ancestors 'none'`), phrase de sauvegarde ≥ 14 caractères à la création. 74 exéc. vertes,
   vérifié en direct (base + port jetables). Détail = tête du `CHANGELOG.md`.
2. ✅ **LOT B — SOLDÉ le 16/07 (liste VALIDÉE par Franck le soir même)** :
   liste des 13 conditions bloquantes = `docs/CONDITIONS-BLOCANTES-OFFICIEL.md` (les 3
   questions ouvertes tranchées avec les défauts proposés — voir son en-tête). Moteur pur
   `blocage-officiel.js` (ESM + miroir serveur, parité stricte testée) branché aux 3 moments
   des deux stores ; **validateur de session** (serveur, TOUS modes, 403 — trou « déclaré ≠
   prouvé » fermé, tiré sur vrai HTTP) ; `simulerValidationOfficielle` (contrat 77→78, v4)
   affichée dans la modale de validation. Mode Officiel toujours FERMÉ par `VERROU_LIVRAISON`
   (constante des 2 miroirs, à basculer en fin de lot C — brique C5).
3. **LOT C — Conditions 3+4 ensemble** (le gros morceau) : plan écrit et VALIDÉ =
   `docs/PLAN-LOT-C.md` (le suivre À LA LETTRE), briques C1→C5, effort MAXIMUM.
   ✅ **C1 (18/07)** signatures réelles (migration 23, table WORM, contrat 80, conditions
   14-15, invalidation par révision) · ✅ **C2 (18/07)** empreinte RENFORCÉE v2 (v1 figée
   à jamais, champs gelés au scellement, 4 vérificateurs versionnés, import qui recompte
   les signatures) · ✅ **C3 COMPLET (18-19/07)** PDF final conservé — C3a réception +
   contrôle `%PDF` + `hashPdfFinal` gelé, C3b témoins `.sha256`+manifeste + régénération
   au démarrage + bouton CERFA servant le CONSERVÉ (2 portes), C3c asymétrie PJ fermée +
   catégorie réservée + recomptage import + pluralité · ✅ **C4 (19/07)** parcours UI
   officiel (modale Signatures + validation officielle avec PDF final côté client +
   CERFA porteur des signatures réelles, revue adversariale : 2 IMPORTANTS fermés).
   Chaque brique : revue adversariale avant commit. ✅ **C5 (19/07 soir) — LOT C
   COMPLET** : bascule du verrou, exemption TRANSFERT (arbitrage Franck), migration 24,
   vérificateur branché (démarrage + dossier d'audit), choix du mode au wizard, suite
   e2e, essai navigateur complet — voir l'en-tête de ce document et le CHANGELOG.
4. ✅ **LOT D — SOLDÉ le 16/07** (livré dans la foulée du lot B) : témoin QUOTIDIEN
   `scellement/temoin-AAAA-MM-JJ.json` dans le dossier de sauvegarde configurable — têtes des
   chaînes, compteurs, intervalle de numéros, versions + empreinte du moteur réglementaire,
   chaîné entre jours, empreinte auto-vérifiable (recette embarquée), écrit au démarrage + après
   chaque écriture scellée, jamais bloquant (`SCELLEMENT_ECHEC` journalisé). Preuves :
   `test-scellement-externe` (13 vérifs dont falsification de la veille détectée) + vrai serveur.
   Geste Franck : pointer le dossier de sauvegarde vers un espace synchronisé. (La version
   « espace réseau du lycée » attendra le DSI.)
5. **LOT E — RGPD avant la rentrée** (des élèves y seront) : export individuel des données d'une
   personne, purge des données de formation selon la durée annoncée, notice d'information affichée
   dans l'application. Relecture DPD quand Franck peut.

**Calendrier** : A+B fin juillet · C en août · essai complet en données fictives + SIMULATION
D'AUDIT fin août · **septembre en PARALLÈLE** (2-4 semaines) de la procédure actuelle, puis bascule
avec secours papier/PDF. Jamais de bascule à sec le 1er septembre.

**Restent GATÉS** : plus AUCUN gate ouvert pour les lots A→D (liste du lot B validée, plan du
lot C validé — C0 soldée). Restent hors code : la version « réseau lycée » du scellement
externe (DSI, plus tard), la relecture DPD de la notice RGPD (lot E), et la validation ligne à
ligne de la matrice d'habilitations (SPEC-HABILITATIONS §2) AVANT de brancher la
correspondance fine aptitude ↔ intervention (condition 7 en version simple d'ici là).

## LES GATES (blocages hors code — à obtenir de Franck, ne pas les contourner)

- **Franck + référent F-Gas** : annoter la table (§4), valider la liste des conditions bloquantes du
  mode officiel, le parcours de double signature. **RÈGLE ABSOLUE : ne JAMAIS coder une valeur ou une
  règle réglementaire NOUVELLE sans la validation de Franck.**
- **DPD du lycée** : relire la notice RGPD. **DSI du lycée** : emplacement du scellement externe.

## MÉTHODE (règle d'or, ne rien casser)

- **RÉGLAGE à annoncer avant chaque tâche de code** (grille : mémoire `feedback_reglages_intelligence`).
- **carte → vérifier → modif chirurgicale → TESTS VERTS → commit.** `node outils/lancer-tests.mjs`
  doit être **TOUT VERT (78 exécutions)** avant tout commit.
- **Parité stricte DemoStore (`v8/js/data/demo-store.js`) / LocalStore (`server/api.js`)** : prouvée
  par `test-contrat.mjs` (demo ET local). `server/mapping.js` **lève sur toute clé inconnue** →
  déclarer les nouveaux champs des deux côtés. Un module pur du front réutilisé côté serveur est
  **recopié en littéral** (CommonJS) + un test de parité qui discrimine.
- **Vérification dynamique** : serveur sur **PORT jetable** + **`IWF_CHEMIN_BASE` base jetable**
  (JAMAIS le port 2011 ni le `data/` réel). Corps des requêtes API = **`{params:{...}}`**.
  **Tirer les failles, pas les lire.**
- **Empreinte des mouvements** (`server/hash-mouvement.js`) : NE PAS la modifier à la légère — la
  condition 4 la touchera → plan + migration + tests.
- **Migrations** : registre `server/migrations.js` jusqu'à **23**, prochaine = **24**. ⚠️ Une
  migration est IMMUABLE : elle fige ses propres littéraux, jamais de constante partagée qui
  évolue (leçon du 16/07). Triggers WORM
  sur `mouvements`/`journal_audit` recréés à chaque migration touchant `mouvements` ;
  `PRAGMA recursive_triggers = ON` obligatoire.
- **Sessions parallèles** : `git log` + `git status` **avant** d'écrire ; commits multi-lignes via
  `git commit -F` (jamais le here-string).

## DÉCISIONS ACTÉES (ne pas rouvrir sans raison)

- **Règles A/B/C validées** par Franck. PRP figé **NON rétroactif**. **Licence** PolyForm
  Noncommercial + certificats nominatifs. **Rapports internes gitignorés** jamais publics.

## CE QUI ATTEND FRANCK (hors code — aucun bloquant)

- **UTILISER le logiciel** : essai en données fictives, puis en parallèle de la procédure actuelle.
- **Pointer le dossier de sauvegarde vers un dossier synchronisé** (écran Sauvegarde) — le
  témoin quotidien du lot D quitte alors le poste chaque jour.
- Gestes de protection du poste (à son rythme) : **BitLocker**, un **exercice réel de
  restauration** (bouton « Tester » puis restaurer une sauvegarde sur un poste d'essai), pointer le
  **dossier de destination** des sauvegardes vers un dossier synchronisé (copie hors du poste).
- Secondaire : relecture `RGPD.md` (DPD), texte de la vitrine.
