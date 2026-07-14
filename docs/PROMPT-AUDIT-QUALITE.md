# Prompt de démarrage — AUDIT QUALITÉ DU CODE inerWeb Fluide (à coller dans un nouveau chat)

> Copier tout ce qui suit comme PREMIER message d'un nouveau chat. Décision de Franck
> (14/07/2026 soir) : avant toute nouvelle fonctionnalité, **vérifier, sécuriser et
> contrôler tout le code**, puis le remanier pour qu'il coûte moins de tokens à chaque
> reprise et redevienne une somme de petits modules greffables — pas un grand programme.

---

Tu conduis un **AUDIT QUALITÉ COMPLET** du code d'**inerWeb Fluide**
(`C:\git\inerweb-fluide`), logiciel local de traçabilité des fluides frigorigènes
(F-Gas / CERFA) destiné à être diffusé gratuitement dans les lycées. Le logiciel
FONCTIONNE (67 suites de tests vertes, parité démo/serveur prouvée par contrat,
démo en ligne) — l'audit ne juge pas les fonctionnalités, il juge la QUALITÉ DE LA
PROGRAMMATION et prépare un remaniement SÛR.

## Phase 1 de ce chat : AUDIT EN LECTURE SEULE (ne modifier AUCUN fichier)

À lire d'abord : `docs/CARTE-CODE.md` (architecture + pièges), tête de `CHANGELOG.md`,
`docs/ROADMAP.md` (dettes notées en bas), `docs/AUDIT-2026-07-03.md` (le précédent
audit, pour ne pas re-payer ce qui a déjà été jugé). Puis `git log` + `git status`.

Angles d'attaque (chacun avec constats FACTUELS, fichier:ligne, chiffrés) :
1. **Monolithes et taille** : `server/api.js` (~5 000 l.), `v8/js/data/demo-store.js`
   (~3 940 l.), `v8/js/wizard/` (~1 800 l.) — cartographier leur découpage naturel
   (par domaine métier : machines/bouteilles/mouvements/contrôles/…), estimer le coût
   et le RISQUE d'un découpage, ce qu'il ferait gagner en tokens par session.
2. **Duplication** — le point faible n°1 CONNU : la sémantique du contrat (77 méthodes)
   est maintenue À LA MAIN dans les DEUX implémentations (DemoStore ES modules ↔
   api.js CommonJS), et les modules purs du front sont RECOPIÉS en littéraux côté
   serveur (habilitations, sentinelle, code-machine…). Inventorier toutes les
   duplications, évaluer les options (partage ESM réel entre front et serveur Node ≥ 22,
   génération, statu quo assumé) avec leurs risques.
3. **Code mort / résidus** : fonctions jamais appelées, exports orphelins, CSS inutilisé,
   résidus v7, TODO/dettes en commentaire, chemins morts.
4. **Cohérence des patrons** : styles en chaînes dans les vues vs feuille commune,
   utilitaires dupliqués entre modules purs (ex. pastille/feuDesAlertes entre
   feu-tricolore et audit-guide), gestion d'erreurs, conventions de nommage.
5. **Sécurité (re-balayage)** : garde Host/Origin, rôles côté serveur, WORM +
   `recursive_triggers`, échappement esc() systématique, imports, secrets. Le socle a
   déjà été audité — chercher ce qui a DÉRIVÉ depuis, pas re-prouver l'acquis.
6. **Dette notée** (ROADMAP) : `updateBouteille` sans garde de statut ; intégrité
   référentielle des fluides à l'import ; `pieces_jointes.chemin` absolu.
7. **Couverture de test** : zones du code sans suite (vues ? modales ? wizard partiel ?),
   suites redondantes, temps d'exécution.
8. **Coût en tokens des sessions futures** : en-têtes de contrat (3-6 lignes disant
   rôle/entrées/sorties/pièges) présents ou absents par module, qualité de la
   CARTE-CODE, ce qui obligerait encore une session à lire un fichier entier.

**Méthode** : audit exhaustif demandé explicitement → multi-agents JUSTIFIÉ (doctrine
sobriété : c'est le cas « critique »). Réglage conseillé : Opus, effort très élevé,
workflows avec sous-agents Sonnet/Haiku pour l'inventaire mécanique, Opus pour les
jugements ; chaque constat CONTRE-VÉRIFIÉ sur pièces avant d'être rapporté (pas de
constat « plausible » non vérifié). Zéro modification de fichier pendant l'audit.

**Livrable Phase 1** : `docs/AUDIT-QUALITE-2026-07.md` — constats classés
🔴 BLOQUANT / 🟠 IMPORTANT / 🟡 MINEUR + **plan de remaniement en PETITES BRIQUES
ORDONNÉES** (une brique = un commit = un risque borné = prouvée par le filet de tests),
avec pour chaque brique : gain attendu (maintenance/tokens), risque, effort.
S'arrêter là et présenter le plan à Franck AVANT de remanier quoi que ce soit.

## Phase 2 (chats suivants, après arbitrage de Franck) : remaniement par briques

Règles NON NÉGOCIABLES du remaniement :
- **JAMAIS de grand chamboulement d'un coup** : le registre opposable (hash chaîné,
  WORM, migrations, scellements) marche et est en usage réel — brancher le neuf avant
  de retirer l'ancien, une brique à la fois.
- Après CHAQUE brique : `node outils/lancer-tests.mjs` TOUT VERT (67 exécutions),
  contrôle navigateur si l'UI est touchée (port jetable NEUF, origine neuve),
  CHANGELOG + CARTE-CODE + commit + push.
- La parité démo/local prouvée par `test-contrat.mjs` est LA garantie d'audit du
  produit : aucun remaniement ne doit l'affaiblir.
- Ne JAMAIS toucher `data/` réel ; jamais de DROP destructif ; `schema.sql` intouchable
  (évolutions = migrations) ; zéro dépendance npm nouvelle.
- Objectif final : modules courts (< ~300 l. si possible), UN rôle par module, en-tête
  de contrat en tête de chaque fichier — c'est cet en-tête que les sessions futures
  liront au lieu de l'implémentation.

## Consignes de Franck (inchangées)

Réglage conseillé annoncé EN FRANÇAIS avant chaque tâche (niveaux : minimal/bas/moyen/
élevé/très élevé/maximum). Français simple, zéro anglicisme, zéro emoji dans le code.
Décider sans redemander quand le choix logique est clair ; les ARBITRAGES du plan de
remaniement, eux, reviennent à Franck. `git log` + `git status` à la reprise (sessions
parallèles possibles).

⚠️ Micro-tâche en ouverture de chat (30 s, AVANT l'audit) : lever la réserve navigateur
de la veille — un clic sur « Réinitialiser » dans la vue Mouvements (port jetable neuf),
consigner au CHANGELOG.
