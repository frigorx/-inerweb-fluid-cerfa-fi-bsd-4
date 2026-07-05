# REPRISE — point d'entrée du chantier inerWeb Fluide

> **À lire en premier au démarrage de toute session de travail.**
> Rédigé le 04/07/2026 à la clôture de la session fondatrice (v8 complète + vision V9/V10).
> Mis à jour le 05/07/2026 après V9.1 (fiche machine vivante).

## État exact du projet (04/07/2026, commit `7b0fe17`)

- **Dépôt** : `C:\git\inerweb-fluide` → `github.com/frigorx/-inerweb-fluid-cerfa-fi-bsd-4` (public).
- **Démo en ligne** : https://frigorx.github.io/-inerweb-fluid-cerfa-fi-bsd-4/v8/ — GitHub Pages
  publie automatiquement chaque push sur `main` (source « Deploy from a branch », main/root —
  réparée le 04/07 après des mois de panne silencieuse du vieux workflow Actions).
- **v8 (dossier `v8/`) = TERMINÉE côté démo** : 13 vues, wizard 6 étapes avec création
  machine/bouteille à la volée, registre à hash chaîné + contre-écritures, balance matière +
  inventaire + écarts justifiés, personnel/outillage/BSFF/pièces jointes, CERFA = PDF officiel
  rempli (72 champs) rendu PDF.js, plaque F-Gas, dossier audit annuel ZIP, alertes dynamiques.
  Audit externe 7/10 puis Lots 1+2 corrigés (les 29 constats sérieux). ~460 vérifications
  automatisées réparties en 12+ suites `v8/**/test-*.mjs` (toutes vertes au dernier commit).
- **v7 (racine)** : ancienne version, gelée, encore servie à la racine du site. Bascule
  v8 → racine prévue mais **pas faite** (attend validation finale de Franck).
- **Mode démo uniquement** : tout vit dans le navigateur (localStorage + IndexedDB).
  **Rien n'est opposable.** Le socle serveur (`server/` : serveur.js, db.js, schema.sql
  avec triggers) existe mais n'est PAS branché.

## Les documents de référence (dans l'ordre)

1. **`docs/VISION-V9-V10.md`** — LA BOUSSOLE. Vision, architecture, plan E0→V10.5, risques,
   choix techniques tranchés, monétisation. §16 = les 7 décisions qui appartiennent à Franck.
2. **`CHANGELOG.md`** — l'historique réel, entrée la plus récente en tête.
3. **`docs/SPEC-V8.md`** — spécification fonctionnelle v8 (+ §8bis fiche machine/QR/relevés).
4. **`docs/SPEC-CERFA.md`** — les 72 champs officiels du CERFA 15497*04.
5. **`docs/AUDIT-2026-07-03.md`** — audit qualité + benchmark marché (C'Fluide, Clim'app…).
6. `design/DESIGN-TOKENS.md` — charte graphique (IBM Plex/Space Grotesk, marine/turquoise).

## Prochaine étape (le plan, dans l'ordre)

1. **Décisions §16 de la VISION** à trancher par Franck (dépôt/licence pro, cloud, RGPD élèves,
   écoute LAN pour scan tablette…). Non bloquant. Présentées à Franck le 04/07 avec
   recommandations ; actions qui ne dépendent que de lui : révoquer les clés v7 (§16.7),
   amorcer la démarche RGPD élèves (§16.5).
2. ~~**V9 — E0** : figer le contrat `DataStore`~~ **FAIT le 04/07** : `v8/js/data/contrat.js`
   (64 méthodes) + `test-contrat.mjs` (183 vérifications, tourne contre n'importe quel store)
   + `server/mapping.js` (correspondance unique + **18 divergences front↔SQL consignées**,
   l'intrant des migrations E1) + `server/test-mapping.mjs` (111 vérifications).
3. ~~**E1 migrations `user_version`**~~ **FAIT le 04/07** : `server/schema.sql` v1 ALIGNÉ sur le
   contrat (les 18 divergences E0 résorbées à la source — aucune base réelle n'existait) +
   `server/migrations.js` (boucle `user_version` transactionnelle, migrations 002 sites +
   003 codes publics QR) + `db.js` versionné avec PRAGMA coffre-fort. ⚠️ **Trou WORM découvert
   et bouché en revue adversariale : `PRAGMA recursive_triggers = ON` obligatoire**, sans lui
   `INSERT OR REPLACE` contourne les déclencheurs (ne JAMAIS le retirer).
4. ~~**E2 journal d'audit chaîné**~~ **FAIT le 04/07** : migration 004 (cible/details +
   `hash_precedent`/`hash`), `db.js:journaliser()` (chaîne SHA-256 en transaction, ré-entrant —
   rejoint la transaction ambiante) et `verifierChaineJournal()` (table ENTIÈRE : une ligne sans
   hash = anomalie signalée, jamais tolérée). Excision, altération et forgerie détectées, prouvé.
5. ~~**E3 LocalStore + routes serveur**~~ **FAIT le 04-05/07** : les 64 méthodes branchées sur
   SQLite, **`test-contrat.mjs local` = 183/0** (les mêmes assertions que `demo`). Plan complet
   dans `docs/E3-PLAN.md`. Vérifié navigateur+serveur. Revue adversariale passée (fidélité +
   sécurité), CSRF/rebinding bouché. **Comment lancer le mode Local** : `node server/serveur.js`
   (port 2011) puis http://127.0.0.1:2011/v8/. ⚠️ Le rôle REFERENT accordé au loopback est un
   raccourci E3 provisoire (sessions réelles = E5).
6. ~~**E4 sauvegarde/restauration**~~ **FAIT le 05/07** : coffre-fort complet (plan `docs/E4-PLAN.md`).
   `VACUUM INTO` seule primitive, snapshots + archives, manifeste-preuve, restauration atomique +
   sauvegarde de sécurité + rollback via l'original intact + reprise au démarrage, chiffrement
   AES-256-GCM (phrase NFC + re-déchiffrement de vérification), écran `v8/js/views/sauvegarde.js`.
   Tests : `node server/test-sauvegarde.mjs` (14 familles), `node server/test-chiffrement.mjs`.
   ⚠️ Modules E4 = server/{sauvegarde,restauration,manifeste,verification,zip-node,chiffrement,
   routes-sauvegarde}.js. Rôles ADMIN/REFERENT sur les 4 routes /api/*.
7. ~~**E5 comptes/rôles/sessions**~~ **FAIT le 05/07** : 4 rôles (ADMIN/REFERENT/ENSEIGNANT/
   ELEVE, TECHNICIEN reporté V10), table `sessions` (migration 5), jeton opaque cookie
   `iwf_session` HttpOnly, bootstrap par CLI uniquement (`server/creer-admin.js`, zéro endpoint
   web, zéro compte par défaut), verrouillage 15 min au 5ᵉ échec, scrypt (`server/comptes.js`).
   **Remplace le raccourci loopback=REFERENT d'E3** : lectures ouvertes en loopback sans
   session, toute mutation exige une session, LAN exige une session même en lecture. Revue
   adversariale : oracle de timing scrypt corrigé (vérification leurre constante), session
   d'un compte désactivé révoquée, purge des sessions obsolètes au démarrage. Tests tous verts
   (comptes 29/0, sessions 37/0, routes-comptes 30/0, bootstrap 19/0, migrations 58/0, mapping
   141/0, contrat local+demo 183/0 chacun). Vérifié navigateur (port 2011) : connexion,
   mutation gardée, déconnexion, lectures loopback ouvertes — flux complet conforme.
   ⚠️ **Point ouvert non corrigé** : `serveur.js` sert la racine du dépôt, donc
   `http://localhost:2011/` affiche encore l'ancienne démo v7 (sans E5) ; la v9 est sous `/v8/`.
   À trancher avec Franck (servir `v8/` comme racine ?). **Reste à valider par Franck** :
   écoute LAN + scan tablette sur un vrai 2e appareil (non testable en bac à sable, seulement
   câblé en local avec `IWF_HOTE_LAN=127.0.0.1`) ; saisie masquée interactive du CLI bootstrap
   (validée seulement via arguments en test).
8. ~~**V9.1 fiche machine vivante**~~ **FAIT le 05/07** : accès à une machine par son
   `code_public` (base32 Crockford 7 caractères, opaque, immuable, généré sur les deux
   stores) ; route paramétrée `#/m/<code_public>` (`routeur.js` + `app.js`, hors sidebar) ;
   fiche 5 blocs (`v8/js/views/fiche-machine.js`) ; wizard pré-réglé qui saute l'étape
   « Machine » depuis la fiche (`wizard.js:ouvrirWizard`) ; étiquette QR imprimable 50×70 mm +
   planche A4 (`v8/js/documents/etiquette-machine.js`, lib QR vendored en `<script>`
   classique). Revue adversariale : 0 constat. Un bug trouvé ET corrigé au contrôle
   navigateur (rendu QR cassé par un emballage module ES — corrigé en chargement classique,
   test durci). Tests : **`test-contrat.mjs` local et demo = 187/0**, plus `test-routeur`
   12/0, `test-wizard` 7/0, `test-etiquette-machine` 15/0, `test-migrations` 64/0,
   `test-mapping` 141/0 ; vérifié navigateur (port 2011, base jetable). ✅ **Point ouvert
   RÉSOLU (05/07, finition E5)** : `getUtilisateurCourant()` est câblé sur la session
   (`contexte.utilisateur` → compte `utilisateurs_app`, fiche personnel liée ou objet minimal
   pour l'admin CLI ; `roleApp` = rôle de la session ; repli premier REFERENT sans session).
   Le wizard s'ouvre désormais sur une base fraîche. Preuve : `server/test-utilisateur-courant.mjs`
   (14/0) + contrat 187/0 inchangé.
9. **Prochaine étape** : validation live par Franck (LAN réel + tablette, saisie masquée CLI
   du bootstrap E5 — toujours en attente), puis choisir entre **V9.2 « Relevés »** (⚠️ bloquée
   par la décision RGPD élèves §16.5 avant tout usage réel) et le **lot confort audit**
   (22 points, au fil de l'eau) ; §16 de la VISION toujours en attente. Finition E5
   `getUtilisateurCourant` FAITE (05/07).
10. Bascule v8 → racine quand Franck valide.

## Méthode de travail validée avec Franck

- **Fable 5 + effort élevé + ultracode** ; orchestration par workflows multi-agents :
  Fable sur le cœur (contrats, moteur, intégration), **Sonnet sur les tâches cadrées**
  (formulaires, exports, docs). Toujours un agent d'intégration qui fait tourner TOUTES les
  suites + un scénario de bout en bout.
- Après chaque chantier : **vérification navigateur par l'orchestrateur** (les tests Node ne
  voient pas tout — 2 bugs graves attrapés uniquement en live), puis CHANGELOG + commit + push
  (messages français, `Co-Authored-By`), puis mémoire.
- Français accentué partout, zéro emoji dans l'interface, zéro dépendance nouvelle
  (seules libs : pdf-lib, PDF.js, qrcode v7 à porter).
- Franck teste sur le terrain et remonte les retours → correctif immédiat → en ligne.

## Pièges connus (payés cher — ne pas retomber dedans)

1. **Cache de modules ES en test navigateur** : `fetch cache:'reload'` + rechargement ne suffit
   PAS toujours. Pour tester du JS frais à coup sûr : servir le dossier depuis un AUTRE PORT
   (origine neuve = cache vierge). `.claude/launch.json` contient la config du serveur de test.
2. **`.gitignore` : motifs ancrés obligatoires** (`/data/`, pas `data/`) — un motif non ancré a
   exclu `v8/js/data/` du dépôt pendant 2 jours (démo en ligne cassée sans symptôme local).
3. **Jamais `document.querySelector('.modale')`** pour cibler sa propre boîte de dialogue :
   `modale()` de communs.js retourne `{ fermer, racine }` — utiliser `racine`.
4. **GitHub Pages** : si le site ne se met plus à jour, vérifier Settings → Pages (source) et
   l'onglet Actions ; au besoin dépublier/republier. Les commits peuvent être sur GitHub sans
   que le site rebuilde.
5. **pdf-lib/PDF.js dans les onglets en arrière-plan** : `doc.save({ objectsPerTick: Infinity })`
   et `page.render({ intent: 'print' })` — sinon gel par bridage des minuteries.
6. **SQLite (à venir, V9)** : sauvegarde par `VACUUM INTO` EXCLUSIVEMENT (jamais copier le `.db`
   à chaud) ; détecter `data/` sous OneDrive et avertir.
7. Sessions parallèles possibles sur le dépôt : `git log` + `git status` avant d'écrire le
   CHANGELOG.

## Comment tester en local

```
cd C:\git\inerweb-fluide
python -m http.server 8123          # puis http://localhost:8123/v8/
node v8/js/data/test-demo-store.mjs # (et les autres test-*.mjs — tous doivent être verts)
node v8/js/data/test-contrat.mjs        # contrat DataStore, mode DÉMO (E0) — 183 vérif.
node v8/js/data/test-contrat.mjs local  # contrat DataStore, mode LOCAL SQLite (E3) — 183 vérif.
node server/test-hash-mouvement.mjs     # équivalence hash front/serveur (E3) — 18 vérif.
node server/test-mapping.mjs            # correspondance front <-> SQL (E0/E1) — 140 vérif.
node server/test-migrations.mjs         # versionnage + WORM + journal chaîné (E1/E2) — 58 vérif.
node server/test-sauvegarde.mjs         # coffre-fort : sauvegarde/restauration (E4.1) — 14 familles
node server/test-chiffrement.mjs        # chiffrement AES-256-GCM (E4.2) — 6 familles
node server/test-comptes.mjs            # hachage scrypt + verrouillage de compte (E5) — 29 vérif.
node server/test-sessions.mjs           # cycle de vie des sessions (E5) — 37 vérif.
node server/test-routes-comptes.mjs     # connexion/déconnexion/création (E5) — 30 vérif.
node server/test-bootstrap.mjs          # CLI creer-admin.js (E5) — 19 vérif.
node server/test-utilisateur-courant.mjs # getUtilisateurCourant ← session (E5) — 14 vérif.
```

⚠️ `test-contrat.mjs` ÉCRIT dans le store cible : contre le futur LocalStore (E3), toujours
sur une base de test jetable, jamais sur le `data/` réel.

*La mémoire persistante (fiche « Projet inerWeb Fluide v8 ») pointe vers ce fichier.*
