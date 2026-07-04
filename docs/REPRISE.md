# REPRISE — point d'entrée du chantier inerWeb Fluide

> **À lire en premier au démarrage de toute session de travail.**
> Rédigé le 04/07/2026 à la clôture de la session fondatrice (v8 complète + vision V9/V10).

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
3. **E1 migrations `user_version`** (PROCHAINE ÉTAPE — partir des DIVERGENCES de
   `server/mapping.js`) → E2 journal d'audit chaîné → E3 LocalStore + routes serveur
   (contrôle de rôle CÔTÉ SERVEUR, 403) → E4 sauvegarde `VACUUM INTO` + restauration atomique
   → E5 comptes/rôles/sessions (Franck = admin unique qui octroie, zéro inscription libre).
4. Puis V9.1 fiche machine vivante (`#/m/:code`) → QR (`code_public` opaque) → relevés élèves.
5. Bascule v8 → racine quand Franck valide. Lot confort audit (22 🟡) au fil de l'eau.

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
node v8/js/data/test-contrat.mjs    # conformité au contrat DataStore (E0) — 183 vérif.
node server/test-mapping.mjs        # correspondance front <-> SQL (E0) — 111 vérif.
```

⚠️ `test-contrat.mjs` ÉCRIT dans le store cible : contre le futur LocalStore (E3), toujours
sur une base de test jetable, jamais sur le `data/` réel.

*La mémoire persistante (fiche « Projet inerWeb Fluide v8 ») pointe vers ce fichier.*
