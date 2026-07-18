# CARTE DU CODE — inerWeb Fluide v8/v9

> **À lire AVANT toute exploration** (doctrine sobriété tokens, 14/07/2026).
> Elle remplace 90 % des grep/lectures. Mise à jour : une ligne par module
> ajouté/retiré, à CHAQUE incrément (comme le CHANGELOG).

## Architecture en une phrase

Front vanilla ES modules sous `v8/` (démo navigateur OU client du serveur
local), serveur Node CommonJS sous `server/` (SQLite `node:sqlite`, port
2011) ; les DEUX implémentent le MÊME contrat `v8/js/data/contrat.js`
(80 méthodes, `VERSION_CONTRAT` 6) prouvé par `test-contrat.mjs` joué
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
| `serveur.js` | HTTP loopback (LAN si `IWF_LAN=1`), routage `/api/:methode`, statique `/v8/` | garde Host+Origin (CSRF/rebinding) obligatoire ; **lot A : TOUTE lecture exige une session (loopback compris), seuls ping + routes d'amorçage de routes-comptes passent sans** ; CSP servie en en-tête (`frame-ancestors 'none'`) |
| `api.js` (~5000 l.) | LE dispatcher : un handler par méthode du contrat, `muter()` = transaction, `ROLES_MUTATION` | sémantique = copie EXACTE du DemoStore ; rôle jamais lu du corps |
| `db.js` | ouverture PRAGMA coffre-fort, `journaliser()` SHA-256 CHAÎNÉ, transaction ré-entrante | `recursive_triggers=ON` VITAL (anti-REPLACE) |
| `migrations.js` | registre 2→23, transactionnel, consécutif ; exporte `FICHE_REGLEMENTAIRE_FLUIDES` (table validée, consommée par la migration 21 ET l'import JSON d'api.js) | JAMAIS de DROP destructif ; trigger WORM à recréer si colonne mouvements ajoutée ; registre-commentaire en tête à tenir |
| `schema.sql` | socle v1 SEUL (les évolutions = migrations) | ne jamais l'éditer pour une évolution |
| `mapping.js` | correspondance UNIQUE front(camel)↔SQL(snake), `CHAMPS_HASH_MOUVEMENT` = liste blanche du hasseur | toute colonne hors empreinte reste HORS de cette liste |
| `hash-mouvement.js` | clone EXACT du hasseur front — VERSIONNÉ (lot C, C2) : v1 (18 champs) FIGÉE À JAMAIS, v2 = +9 champs (PRP figé, CERFA, rôles, champs gelés) ; aides empreinteListeTriee / chaineCanoniqueSignature | ne jamais utiliser db.hashEcriture pour les mouvements ; QUATRE vérificateurs versionnés (api ×2 + démo + verification.js) ; empreintes CONNUES figées dans test-hash-mouvement |
| `blocage-officiel.js` | miroir littéral du moteur de blocage OFFICIEL (lot B) | `VERROU_LIVRAISON` à basculer ICI + côté ESM au lot C-D ; api.js ajoute sauvegarde du poste + validateur de session (tous modes, 403) au cadre |
| `signatures-mouvement.js` | miroir littéral des signatures RÉELLES (lot C, C1) : déclarations figées + critères d'illisibilité | parité prouvée par test-signatures-mouvement ; ne jamais toucher un miroir sans l'autre |
| `pdf-final.js` | miroir littéral du PDF FINAL conservé (lot C, C3a) : messages canoniques + contrôle %PDF/5 Mo + nom `CERFA-<numéro>.pdf` | parité prouvée par test-signatures-mouvement ; la conservation = `conserverPdfFinal` d'api.js (PJ système CERFA_FINAL, SANS bump de révision) ; C3b : témoins `.sha256`+`.manifeste.json` frères (`ecrireTemoinsPdfFinal`, best-effort hors transaction) + `verifierPdfFinalConserve` + RÉGÉNÉRATION des témoins manquants au démarrage (`reecrireTemoinsPdfFinalManquants`, jamais d'écrasement — la restauration d'archive ne transporte pas les frères) ; tout exporté pour le test seulement |
| `comptes.js` / `sessions.js` / `routes-comptes.js` | scrypt+NFC+leurre anti-timing, jetons hachés SHA-256, cookie HttpOnly | message d'échec UNIQUE ; session meurt si compte désactivé |
| `sauvegarde.js` / `restauration.js` / `manifeste.js` / `verification.js` / `chiffrement.js` | coffre-fort : VACUUM INTO, restauration atomique, AES-256-GCM | jamais copier le .db à chaud ; phrase NFC ; rollback = reposer l'original ; ⚠️ verification.js hache les mouvements (4e vérificateur versionné v2 — l'oublier rendrait toute archive « invalide ») |
| `sauvegarde-auto.js` | sauvegarde AUTOMATIQUE (condition 6) : archive au démarrage si > 24 h + VÉRIFIÉE, snapshot débouncé après écriture scellée (crochet dans api.appeler) | best-effort ABSOLU (jamais bloquant) ; hors transaction ; réglages `sauvegarde_auto_*` |
| `scellement-externe.js` | témoin QUOTIDIEN de scellement (lot D) : têtes des chaînes + compteurs + versions dans `backups/scellement/`, chaîné entre jours, empreinte auto-vérifiable | best-effort ABSOLU ; toujours actif ; crochets démarrage + api.appeler ; ⚠️ tests : base jetable NICHÉE sous `<mkdtemp>/data/` sinon backups/ dérive sur Temp partagé |
| `creer-admin.js` | CLI bootstrap 1er ADMIN | aucun endpoint web équivalent |
| `harnais-contrat.mjs` | monte un LocalStore sur une base JETABLE + transport in-process qui sérialise VRAIMENT en JSON | c'est lui qui joue `test-contrat.mjs local` ; contexte figé `role:'REFERENT'` |
| `parametres.js` | table clé/valeur (réglages du poste) | — |
| `zip-node.js` | ZIP « stored » côté serveur (coffre-fort) | confine les chemins (patron à reprendre) |

## v8/js/data/ (cœur pur + stores)

| Module | Rôle |
|---|---|
| `contrat.js` | LA vérité de surface : 80 méthodes documentées, messages canoniques |
| `demo-store.js` (~4000 l.) | implémentation mémoire complète (référence sémantique) |
| `local-store.js` | enveloppes 1-pour-1 vers l'API (ajouter CHAQUE nouvelle méthode ici) ; SEULE adaptation : le contenu binaire des PJ (base64 à l'aller, Blob au retour) |
| `contenu-pj.js` | pur : contenu binaire des pièces jointes (`versBase64`/`versBlob`) — JSON réduit un Blob à `{}`, d'où 9 octets de déchet enregistrés comme preuve avant le 14/07 ; **lot A : `signatureConcordeAvecMime` = contrôle des nombres magiques (PDF/PNG/JPEG/WebP), miroir littéral dans `api.js`, appelé par `ajouterPieceJointe` des deux côtés** |
| `datastore.js` | fabrique : choisit DemoStore ou LocalStore selon que le serveur répond |
| `demo-donnees.js` | le monde fictif de la Démo (données seules, aucune règle) |
| `transport-http.js` | transport `fetch` du LocalStore (`POST /api/:methode`, enveloppe `{ok,resultat}`) |
| `code-machine.js` | pur : code lisible SITE-FAMILLE-NUMÉRO (JR-CF-001), générateur/validation |
| `habilitations.js` | pur : moteur de conseil B2 (`verifierDroitIntervention`, matrice 2008+2025) |
| `reglementation-fluides.js` | pur : MOTEUR RÉGLEMENTAIRE UNIQUE cadre 7 (`categorieCadre7` + `evaluerControle`) — source de vérité des seuils/fréquences F-Gas (règles A/B/C, `docs/TABLE-REGLEMENTAIRE-FLUIDES.md`), consommé par plaque-fgas/generateur/demo-store, copié en littéral côté serveur (`api.js` `frequenceControleMois`). Charge NOMINALE, HFC avant HFO ; fiche EXPLICITE par fluide prioritaire (`categorieCadre7`, migration 21, AUCUNE = hors périmètre) ; `dateIntervention` optionnelle (HFO purs contrôlés depuis le 11/03/2024 seulement) |
| `blocage-officiel.js` | pur : moteur de blocage du mode OFFICIEL (lot B) — `evaluerBlocagesOfficiel(cadre)` applique la liste de `docs/CONDITIONS-BLOCANTES-OFFICIEL.md` filtrée par moment (PASSAGE/SOUMISSION/VALIDATION), `VERROU_LIVRAISON` ferme le mode jusqu'aux lots C-D ; branché aux 3 moments des deux stores + `simulerValidationOfficielle` (contrat) ; conditions 14-15 (lot C) = faits tri-état signatureTechnicienValide/signatureDetenteurValide |
| `signatures-mouvement.js` | pur : signatures RÉELLES (lot C, C1) — déclarations signées EXACTES (`declarationSignature`, délégation dans la qualité ET la déclaration) + critères d'illisibilité (`verifierImageSignature` : PNG réel, ≥ 1 Ko, ≤ 1 Mo) ; consommé par signerMouvement des deux stores, recopié en littéral côté serveur |
| `pdf-final.js` | pur : PDF FINAL conservé (lot C, C3a) — messages canoniques de refus + `verifierOctetsPdfFinal` (%PDF, 5 Mo) + `nomFichierPdfFinal` ; consommé par validerMouvement des deux stores (3e param `pdfFinalBase64`, OBLIGATOIRE en OFFICIEL, refusé en FORMATION), recopié en littéral côté serveur |
| `feu-tricolore.js` | pur : consolide alertes/officiel/chaîne en 7 domaines VERT/ORANGE/ROUGE (`collecterConformite(store)`) |
| `audit-guide.js` | pur : parcours d'audit en 9 étapes ordonnées (alertes par préfixe + faits de présence, `collecterAuditGuide(store)`) |
| `filtre-mouvements.js` | pur : filtres de la vue Mouvements (index cherchable sans accents, correspondance, options présentes) |
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
  `correction.js` (correction copie élève), `visualiseur.js` (PDF.js),
  `conserve.js` (lot C C3b : sert le PDF CONSERVÉ d'une fiche officielle
  figée — les DEUX portes, mouvement ET contrôle lié —, empreinte vérifiée
  contre `hashPdfFinal` scellé, jamais le générateur, jamais de repli).
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
7. **Lot A / démarrage sans session** : `LocalStore.init()` TOLÈRE « Session
   requise » (le store se crée avant connexion) ; l'intégrité est re-vérifiée
   APRÈS connexion dans `reprendreDemarrageApresConnexion`. Ne pas remettre de
   lecture gatée « dure » dans `creerStore` — l'amorçage doit atteindre l'écran
   de connexion/bootstrap sans planter.
