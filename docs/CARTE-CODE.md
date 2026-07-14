# CARTE DU CODE — inerWeb Fluide v8/v9

> **À lire AVANT toute exploration** (doctrine sobriété tokens, 14/07/2026).
> Elle remplace 90 % des grep/lectures. Mise à jour : une ligne par module
> ajouté/retiré, à CHAQUE incrément (comme le CHANGELOG).

## Architecture en une phrase

Front vanilla ES modules sous `v8/` (démo navigateur OU client du serveur
local), serveur Node CommonJS sous `server/` (SQLite `node:sqlite`, port
2011) ; les DEUX implémentent le MÊME contrat `v8/js/data/contrat.js`
(77 méthodes, `VERSION_CONTRAT` 3) prouvé par `test-contrat.mjs` joué
contre chacune.

## Flux clés

- **Écriture opposable** : wizard → `creerMouvement` (BROUILLON) →
  `soumettreMouvement` → `validerMouvement` (effets stocks + contrôle lié +
  figeages PRP/outils + scellement hash chaîné) ; annulation UNIQUEMENT par
  `annulerParContreEcriture`. Statuts : BROUILLON/SOUMIS/VALIDE/ANNULE.
- **Choix du store** (front) : `v8/js/data/datastore.js` — DemoStore
  (mémoire+localStorage) par défaut, LocalStore (`local-store.js` →
  `transport-http.js` → `POST /api/:methode`) si le serveur répond.
- **Tests** : `node outils/lancer-tests.mjs` = TOUT le filet (~30 s, arrêt
  au premier rouge). Suites `SUITES_DOUBLEES` jouées demo PUIS local.
  Toute nouvelle suite `test-*.mjs` est auto-découverte.

## server/ (CommonJS — les modules purs du front y sont DUPLIQUÉS en littéraux)

| Module | Rôle | Pièges |
|---|---|---|
| `serveur.js` | HTTP loopback (LAN si `IWF_LAN=1`), routage `/api/:methode`, statique `/v8/` | garde Host+Origin (CSRF/rebinding) obligatoire |
| `api.js` (~5000 l.) | LE dispatcher : un handler par méthode du contrat, `muter()` = transaction, `ROLES_MUTATION` | sémantique = copie EXACTE du DemoStore ; rôle jamais lu du corps |
| `db.js` | ouverture PRAGMA coffre-fort, `journaliser()` SHA-256 CHAÎNÉ, transaction ré-entrante | `recursive_triggers=ON` VITAL (anti-REPLACE) |
| `migrations.js` | registre 2→18, transactionnel, consécutif | JAMAIS de DROP destructif ; trigger WORM à recréer si colonne mouvements ajoutée ; registre-commentaire en tête à tenir |
| `schema.sql` | socle v1 SEUL (les évolutions = migrations) | ne jamais l'éditer pour une évolution |
| `mapping.js` | correspondance UNIQUE front(camel)↔SQL(snake), `CHAMPS_HASH_MOUVEMENT` = liste blanche du hasseur | toute colonne hors empreinte reste HORS de cette liste |
| `hash-mouvement.js` | clone EXACT du hasseur front | ne jamais utiliser db.hashEcriture pour les mouvements |
| `comptes.js` / `sessions.js` / `routes-comptes.js` | scrypt+NFC+leurre anti-timing, jetons hachés SHA-256, cookie HttpOnly | message d'échec UNIQUE ; session meurt si compte désactivé |
| `sauvegarde.js` / `restauration.js` / `manifeste.js` / `verification.js` / `chiffrement.js` | coffre-fort : VACUUM INTO, restauration atomique, AES-256-GCM | jamais copier le .db à chaud ; phrase NFC ; rollback = reposer l'original |
| `creer-admin.js` | CLI bootstrap 1er ADMIN | aucun endpoint web équivalent |

## v8/js/data/ (cœur pur + stores)

| Module | Rôle |
|---|---|
| `contrat.js` | LA vérité de surface : 77 méthodes documentées, messages canoniques |
| `demo-store.js` (~4000 l.) | implémentation mémoire complète (référence sémantique) |
| `local-store.js` | enveloppes 1-pour-1 vers l'API (ajouter CHAQUE nouvelle méthode ici) |
| `code-machine.js` | pur : code lisible SITE-FAMILLE-NUMÉRO (JR-CF-001), générateur/validation |
| `habilitations.js` | pur : moteur de conseil B2 (`verifierDroitIntervention`, matrice 2008+2025) |
| `feu-tricolore.js` | pur : consolide alertes/officiel/chaîne en 7 domaines VERT/ORANGE/ROUGE (`collecterConformite(store)`) |
| `audit-guide.js` | pur : parcours d'audit en 9 étapes ordonnées (alertes par préfixe + faits de présence, `collecterAuditGuide(store)`) |
| `dossiers-fuite.js` | pur : dossiers de fuite reconstruits des contrôles (épisodes, OUVERTE/REPAREE/FERMEE) |
| `sentinelle.js` | pur : historisation temporelle des alertes (épisodes, acquittement) |
| `vie-bouteille.js` | pur : chronologie d'une bouteille (mouvements appariés) |

## v8/js/ (le reste)

- `views/` : une vue par écran (routeur hash `#/vue` ; fiches paramétrées
  `#/m|b|cl|o|f/<code>`). `communs.js` = modale/toast/enteteVue/carteKpi.
- `modales/` : formulaires (piège historique : jamais de sélecteur global
  `.modale` — `modale()` retourne sa racine).
- `wizard/` : les 6 étapes du mouvement (~1800 l.) + signature canvas.
- `cerfa/` : `generateur.js` (72 champs, `calculerChampsCerfa` = vérité),
  `correction.js` (correction copie élève), `visualiseur.js` (PDF.js).
- `documents/` : étiquettes QR, dossiers ZIP scellés SHA-256 (`dossier-commun.js`),
  `exports.js` (tous les CSV du dossier d'audit), `verificateur.js`
  (99-VERIFICATEUR.html embarqué), `plaque-fgas.js` (seuils tCO₂eq 5/50/500).
- `core/` : `utils.js` (esc, fmtDate, nombreFr, hasherEcriture…), `zip.js`
  maison, `routeur.js`, `shim-dom-tests.mjs` (tests DOM sans navigateur).

## Pièges transverses (payés cher — ne pas re-payer)

1. **Vérif navigateur** : servir `v8/` sur un port JETABLE NEUF à chaque
   session (cache modules ES) ; JAMAIS le port 2011 ni `data/` réel.
2. **Ordre contractuel** : tri en JS des deux côtés, JAMAIS d'ORDER BY
   (collation BINARY ≠ localeCompare).
3. **Empreinte** : l'objet `controle` entre dans le hash — une clé à null
   en plus/en moins casse la chaîne au round-trip démo↔local.
4. **Docx/PDF** : ne jamais relire un binaire en utf8.
5. **`??` vs `||`** : champs de rôle → `|| null` (chaîne vide = null).
6. **Import** : triggers WORM retirés puis recréés DANS la transaction ;
   compléments de collections absentes À VIDE.
