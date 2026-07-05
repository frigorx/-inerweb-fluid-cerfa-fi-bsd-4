# E4 — Sauvegarde / restauration « coffre-fort » : plan d'implémentation

> L'exigence n°1 de Franck : ne JAMAIS perdre les données. Issu de la conception du 05/07/2026.
> Suit fidèlement la VISION §4. Périmètre SERVEUR (mode Local) — hors des 64 méthodes du contrat
> DataStore (le DemoStore n'a ni disque, ni VACUUM, ni ZIP serveur : les y mettre casserait
> test-contrat). Règle d'or : `server/test-sauvegarde.mjs` prouve la non-perte ET la réversibilité
> sur base JETABLE avant tout commit.

## Fichiers

| Fichier | Rôle | Statut |
|---|---|---|
| `server/zip-node.js` | Port CJS du créateur ZIP stored (`v8/js/core/zip.js`) + LECTEUR (extraction, `lireEntree` d'une seule entrée pour lire le manifeste sans tout extraire, CRC-32 vérifié). Écriture en flux, pas tout en RAM. | créer |
| `server/verification.js` | `verifierIntegrite(instance)` = `PRAGMA integrity_check` + `PRAGMA foreign_key_check` + chaîne registre + chaîne journal, **paramétré par instance** (partagé db.js / restauration / testerSauvegarde — évite la divergence). | créer |
| `server/manifeste.js` | Construit/relit le `manifeste.json` (schéma figé) : sha256 base, chaînes OK, dernier hash, compteurs, version, documents. Sépare la PREUVE du conteneur. | créer |
| `server/sauvegarde.js` | `VACUUM INTO` seule primitive, snapshots (base seule) + archives (base+documents+config+manifeste), `.partiel`→renommage, `purgerPartiels`, rotation GFS, PJ vérifiées (hash) avant ajout. | créer |
| `server/restauration.js` | Le déroulé atomique 0→6 + reprise au démarrage + rollback. `testerSauvegarde` (base temp lecture seule). | créer |
| `server/routes-sauvegarde.js` | Les 4 routes dédiées, garde ADMIN/REFERENT, enveloppe standard. | créer |
| `server/db.js` | Ajouter `vacuumInto(cible)`, `estOuverte()`, `reouvrir()`, exposer `user_version`/`VERSION_BASE`. Chirurgical. | modifier |
| `server/serveur.js` | Câbler les 4 routes E4 avant l'aiguillage `api.appeler` ; `purgerPartiels()` + détection OneDrive au démarrage. | modifier |
| `server/test-sauvegarde.mjs` | Les 6 familles de preuve (base jetable). | créer |
| `server/chiffrement.js` + `test-chiffrement.mjs` | E4.2 (AES-256-GCM). | créer |
| `v8/js/views/sauvegarde.js` | E4.3 (écran n°7). | créer |
| `SAUVEGARDE.md` | Faire évoluer : deux niveaux, manifeste, test, GFS, chiffrement OFFICIEL. | modifier |

## Le manifeste (ce qui transforme un ZIP en preuve)

`manifeste.json`, EN CLAIR, en TÊTE de l'archive ET du fichier chiffré (jamais chiffré ; sans donnée
sensible). Schéma versionné (`versionManifeste`). Champs clés :
- `format`, `versionManifeste`, `type` (SNAPSHOT | ARCHIVE), `horodatage` (ISO UTC), `versionApp`,
  `versionBase` (`user_version` au VACUUM) ;
- `base` : `nomFichier`, `tailleOctets`, **`sha256`** (du .db issu du VACUUM, calculé APRÈS écriture —
  le pivot de la vérification pré-écrasement) ;
- `integrite` : `chaineRegistreOk`, `chaineJournalOk`, `dernierHashRegistre`, `dernierHashJournal` ;
- `compteurs` : machines, bouteilles, mouvements, **`mouvementsValides`** (count statut VALIDE|ANNULE —
  le pivot de la détection de régression « restaurer perd N écritures »), controles, personnelActif,
  clients, documents, entreesJournal ;
- `documents` (si ARCHIVE) : `nombre` (= compteurs.documents), `tailleTotaleOctets`, `sha256Global`
  (SHA-256 de la concaténation triée des sha256 par PJ — détecte une PJ manquante sans tout ouvrir) ;
- `chiffrement` : `actif`, `algorithme`, `kdf`, `kdfParams` {N:32768,r:8,p:1,selLongueur:16}, `indice`
  (non secret).

## Primitive de sauvegarde — VACUUM INTO SEUL

`VACUUM INTO` sur le handle VIVANT (jamais copier le `.db` à chaud : sous WAL une copie brute est
amputée). `db.vacuumInto(cible)` = `base.exec("VACUUM INTO '" + cible.replace(/'/g,"''") + "'")`.
Cible TEMPORAIRE UNIQUE `backups/tmp/vacuum-<horodatage>-<rnd6>.db` (SQLite refuse une cible existante).
Produit un `.db` SANS `-wal`/`-shm`.

Séquence : mkdir → purger tmp orphelins → vacuumInto → sha256 → manifeste → écrire ZIP en
`.zip.partiel` (ZIP stored : `base/inerweb-fluide.db` + `manifeste.json`, + `documents/<id>` et
`config/` si ARCHIVE) → supprimer le .db temp → **renommer `.partiel`→`.zip`** (cible horodatée
inexistante = rename NTFS OK) → journal SAUVEGARDE → rotation. Snapshot = archive sans documents/config.
**Règle inviolable : écrire la nouvelle (renommage réussi) AVANT de purger l'ancienne.**
`purgerPartiels()` au démarrage ET en tête de chaque sauvegarde : un `.partiel` = sauvegarde
interrompue = n'existe pas.

## Restauration atomique — LE POINT DUR (Windows, base ouverte, WAL)

Chemins : `data/inerweb-fluide.db` (+ -wal/-shm) = base VIVE ; `data/restauration-en-cours/` = zone de
travail ; `backups/avant-restauration/` = filet.

0. **Pré-contrôles SANS écrire** : lire `manifeste.json` (via `lireEntree`, sans tout extraire),
   vérifier format/version, écran de comparaison (compteurs archive vs base → « restaurer perd N
   écritures, confirmer ? »). Si chiffré : phrase + déchiffrement d'abord (mauvais tag = rejet, base
   vive jamais touchée).
1. **Extraire + vérifier HORS-BASE** : `restauration-en-cours/nouvelle.db` (CRC-32 par entrée),
   sha256 === `manifeste.base.sha256` (divergence = ABANDON, base vive intacte), ouvrir en base TEMP et
   passer les 3 vérifications DESSUS avant toute bascule. Extraire `documents/`, vérifier nombre +
   sha256Global.
2. **Sauvegarde de sécurité AUTO, NON désactivable** : `archiveComplete()` de l'état ACTUEL →
   `backups/avant-restauration/avant-<horodatage>.zip` (VACUUM INTO, cohérente). Échec ici = ABANDON
   (pas de restauration sans filet).
3. **Bascule sans rename-sur-cible-existante** (le contournement NTFS) :
   a. `db.fermer()` (libère le handle) ;
   b. supprimer `data/inerweb-fluide.db-wal` et `-shm` résiduels — **PIÈGE MORTEL** : un WAL de
      l'ancienne base survivant à côté de la nouvelle serait rejoué → hybride corrompu ;
   c. renommer l'ancienne HORS du chemin : `inerweb-fluide.db` → `restauration-en-cours/ancienne.db`
      (cible inexistante = OK) ; désormais `data/inerweb-fluide.db` N'EXISTE PLUS ;
   d. renommer la nouvelle sur le chemin LIBRE : `restauration-en-cours/nouvelle.db` →
      `data/inerweb-fluide.db` (cible inexistante = rename quasi-atomique) ;
   e. basculer `documents/` par la même technique (jamais par-dessus l'existant).
   Coupure entre (c) et (d) : base absente au redémarrage → le serveur détecte l'absence +
   `restauration-en-cours/` et REPREND (idempotent) ou rollback. Jamais d'hybride : deux `.db` entiers
   distincts, on ne fusionne rien.
4. **Rouvrir + 3 vérifications sur la base VIVE** : `db.ouvrir()`, puis integrity_check +
   foreign_key_check + `getEtatRegistre().altere === false`. Une rouge → ROLLBACK.
5. **Rollback auto** : `db.fermer()`, effacer la vive + -wal/-shm, rejouer
   `backups/avant-restauration/avant-<horodatage>.zip` par le même chemin, rouvrir, revérifier.
6. **Nettoyage + journal** : supprimer `restauration-en-cours/`, `journaliser RESTAURATION` (source,
   compteurs avant/après, verdict). CONSERVER la sauvegarde de sécurité.

**Invariant global** : à AUCUN instant il n'existe un `data/inerweb-fluide.db` partiel. Soit l'ancien
entier, soit le nouveau entier, soit rien (et `restauration-en-cours/` porte les deux fichiers entiers
pour reprise). Les -wal/-shm sont TOUJOURS effacés avant réouverture.

## Tester une sauvegarde (une sauvegarde jamais testée n'est qu'un espoir)

Ouvrir le ZIP dans une base TEMP en LECTURE SEULE (instance `DatabaseSync` DÉDIÉE, jamais le singleton
db.js) : lireEntree manifeste → extraire base → sha256 === manifeste → `verifierIntegrite(instance)` (3
vérifs) → si ARCHIVE, documents nombre + sha256Global → verdict VERT/ROUGE. La base courante n'est
jamais ouverte/fermée/écrite. Date du dernier test OK dans `parametres` (`dernier_test_sauvegarde_ok`) ;
alerte tableau de bord si > 12 mois.

## Routes (dédiées, hors contrat DataStore)

Toutes POST /api/*, mêmes gardes CSRF/rebinding, **garde ADMIN/REFERENT** (403 avant effet ; loopback =
REFERENT en E3) :
- `sauvegarder` `{ type, chiffrer?, phrase?, indice? }` → `{ chemin, manifeste }`
- `listerSauvegardes` `{}` → `[{ chemin, type, horodatage, compteurs, chaineOk, chiffre }]` (lit le
  manifeste clair en tête, sans extraire)
- `restaurer` `{ chemin, phrase?, confirmePerte? }` → `{ ok, verdict, compteursAvant, compteursApres }`
  (refuse sans confirmePerte si régression)
- `testerSauvegarde` `{ chemin, phrase? }` → `{ verdict, details, compteurs }`

Enveloppe `{ ok, resultat }` / `{ ok:false, erreur, code }` identique à `traiterApi`. Un drapeau
« opération E4 en cours » refuse une seconde opération simultanée (et toute mutation pendant une
RESTAURATION, où la base est fermée).

## Pièges Windows (tous à border)

1. **Verrou fichier** : base ouverte non renommable/supprimable → `db.fermer()` d'abord pour restaurer ;
   pour SAUVEGARDER on ne ferme pas (VACUUM INTO lit sans verrou exclusif).
2. **WAL** : après `fermer()`, supprimer `-wal`/`-shm` AVANT de basculer (piège mortel du WAL orphelin).
3. **rename NTFS sur cible existante** échoue (EEXIST/EPERM) → toujours sortir l'ancien du chemin puis
   renommer sur cible inexistante.
4. **Chemins espaces/accents** (« inerweb full ia », OneDrive) : `path.join`/`resolve`, échapper les
   quotes SQL du VACUUM, cible temp sans espaces (`backups/tmp/`). ZIP en UTF-8 (bit 11).
5. **data/ sous OneDrive** : au démarrage, si le chemin résolu contient un segment OneDrive/`Mon Drive`
   (ou var d'env OneDrive), AVERTIR FORT (la synchro corrompt le WAL vif). Le cloud = ZIP figés.
6. **busy_timeout** 5000 déjà posé ; drapeau anti-concurrence E4.
7. **Antivirus/EPERM transitoire** sur un fichier fraîchement écrit → réessai borné sur les renames
   critiques, puis échec propre.
8. **Horodatage** : nom de fichier en heure LOCALE `AAAA-MM-JJ-HHMM` (jamais `:` interdit NTFS) ;
   `manifeste.horodatage` en ISO UTC pour le tri.

## Vagues

- **E4.1 — Noyau** (dans l'ordre) : (a) `zip-node.js` (port + lecteur, CRC vérifié, `lireEntree`) →
  (b) `db.js` primitives → (c) `verification.js(instance)` → (d) `manifeste.js` → (e) `sauvegarde.js`
  (snapshots + archives + purge + rotation) → (f) `restauration.js` (déroulé atomique + reprise +
  rollback) → (g) `testerSauvegarde` → (h) `routes-sauvegarde.js` + câblage + OneDrive → (i)
  `test-sauvegarde.mjs` (6 familles). **Le coffre-fort prouvé, sans UI.**
- **E4.2 — Chiffrement** : `chiffrement.js` (AES-256-GCM + scrypt, manifeste clair en tête,
  re-déchiffrement de vérification), branché sur les 4 routes ; `test-chiffrement.mjs`.
- **E4.3 — UI** : `v8/js/views/sauvegarde.js` (écran n°7 : liste + Sauvegarder/Restaurer/Tester + écran
  de comparaison + import ZIP externe + alerte > 12 mois + avertissement OneDrive) ; MAJ SAUVEGARDE.md.
  Vérification navigateur par l'orchestrateur.

## Stratégie de test (server/test-sauvegarde.mjs, base jetable)

1. **Aller-retour identique** : peupler → archive → restaurer dans une base vierge → compteurs du
   manifeste concordent, chaînes vertes, sha256 base restaurée === manifeste, chaque PJ relue (hash).
2. **Archive corrompue refusée AVANT écrasement** : 1 octet modifié → échec à la vérif sha256/CRC →
   base courante INTACTE (sha256 identique avant/après tentative).
3. **Coupure = base cohérente** : injecter une exception à CHAQUE étape (après extraction, après
   sauvegarde de sécurité, entre 3c et 3d, après réouverture) → reprise → base finale = ancienne entière
   OU nouvelle entière, JAMAIS un hybride.
4. **Sauvegarde de sécurité + rollback** : forcer une vérif post-restauration au rouge → la sauvegarde
   d'avant existe, le rollback la rejoue, la base finale === l'état d'avant.
5. **3 vérifications détectent** : base integrity_check KO / foreign_key_check KO / chaîne KO →
   testerSauvegarde ROUGE avec le bon motif, base courante intacte.
6. **.partiel purgés** : un `.partiel` + un `tmp/*.db` orphelins → `purgerPartiels()` les efface.
