# inerWeb Fluide — Vision V9 (coffre-fort) et V10 (assistant)

> Document d'architecte, opinionné. Il tranche, hiérarchise et engage des choix.
> Rédigé à partir du code réel : `server/schema.sql`, `server/db.js`, `server/serveur.js`,
> `v8/js/data/datastore.js`, `v8/js/core/utils.js`, `docs/SPEC-V8.md`, `docs/SPEC-CERFA.md`,
> `docs/AUDIT-2026-07-03.md`, `CHANGELOG.md`.
> Il intègre 7 contributions d'experts, arbitre leurs désaccords, et ajoute la vision d'ensemble.
>
> **Auteur du projet :** Franck Henninot (LP Jacques Raynaud, Marseille).
> **Cap :** Phase E (mode Local) fiabilisée avant l'été 2026 ; V10 dans la foulée.

---

## 1. Vision en une page

inerWeb Fluide est aujourd'hui une **démonstration excellente** : registre à hash chaîné,
CERFA officiel rempli au pixel près, balance matière à écart bloquant, mode formation blindé.
Mais tout cela vit dans le navigateur, sur `localStorage`. **En démo, rien n'est opposable** :
un élève réécrit la base en une ligne dans la console. C'est acceptable pour une vitrine
pédagogique, ce serait un mensonge le jour où on dit à un professionnel « c'est inviolable ».

**La V9 fait passer l'outil de la démo au coffre-fort.** Un vrai coffre-fort, c'est trois promesses,
et une seule d'entre elles suffit à justifier tout le chantier :

1. **Ne jamais perdre les données.** Sauvegardes automatiques, restauration en un clic, règle 3-2-1,
   survie à une panne disque, à une erreur humaine, à un changement de poste.
2. **Prouver ce qui s'est passé.** « Voilà ce qui a été fait, à telle date, par telle personne, sur
   telle bouteille » — registre append-only, hash chaîné, journal d'audit, contre-écritures.
3. **Résister à la modification malveillante.** Détecter toute altération, même par accès direct au fichier.

Techniquement, la V9 n'est **pas une refonte** : c'est un **branchement**. Le contrat de données est déjà
100 % asynchrone (`datastore.js` est une fabrique triviale), le socle serveur existe (`node:sqlite`, WAL,
clés étrangères, triggers de verrouillage déjà écrits). Il faut brancher SQLite derrière ce contrat, et
durcir ce qui rend le coffre-fort réel : sauvegarde par `VACUUM INTO`, journal d'audit chaîné, contrôle
de rôle côté serveur, chiffrement des exports.

**La V10 fait passer l'outil du registre à l'assistant.** Aujourd'hui les alertes sont un *photographe* :
elles ne voient que ce qui est à l'écran, quand quelqu'un regarde. La V10 en fait une *sentinelle* qui
tourne même quand personne n'est connecté, qui classe par priorité, et qui répond à des questions
concrètes — « quelles machines contrôler ce mois-ci ? quelles fuites non clôturées ? quel client
relancer ? » — **sans jamais laisser une IA inventer un chiffre réglementaire**. La base reste la seule
vérité ; l'IA route, elle ne calcule pas.

**Prérequis dur, à graver :** la V10 n'a de sens que sur la V9 (SQLite branché). Un moteur d'alertes
« officielles » sur un `localStorage` falsifiable est une fausse assurance, donc dangereux.

---

## 2. Architecture cible

### Les trois modes — un seul contrat de données

| Mode | Transport | Base | Rôle | Opposable ? |
|---|---|---|---|---|
| **Démo** | mémoire + localStorage / IndexedDB | — | vitrine GitHub Pages, bac à sable pédagogique | **NON** (assumé) |
| **Local** | `fetch` REST → serveur Node `:2011` | SQLite (`node:sqlite`) | **le coffre-fort** — vérité = le fichier `.db` du poste | **OUI** |
| **Cloud** | Supabase JS | PostgreSQL UE + RLS | multi-poste, réplication hors site | OUI (plus tard) |

Le front **ne sait jamais** quel store il a en face. Le seul endroit qui connaît SQLite, c'est
`local-store.js` + le serveur. C'est la règle qui a coûté cher en v7 (wizard/générateur divergents) et
qu'il faut rendre mécanique.

### Schéma logique

```
                       ┌──────────────────────────────────────────┐
                       │   FRONT (modules ES, zéro framework)      │
                       │   vues · wizard · CERFA · PDF.js · QR     │
                       └───────────────────┬──────────────────────┘
                                           │  contrat DataStore (async, ~60 méthodes)
                       ┌───────────────────┼──────────────────────┐
                       ▼                   ▼                      ▼
                 ┌───────────┐      ┌────────────┐         ┌────────────┐
                 │ DemoStore │      │ LocalStore │         │ CloudStore │
                 │ localStg. │      │ fetch REST │         │ Supabase   │
                 └───────────┘      └─────┬──────┘         └─────┬──────┘
                    (vitrine)             │ HTTP /api/*          │
                                          ▼                      ▼
                               ┌────────────────────┐   ┌─────────────────┐
                               │  serveur.js (Node) │   │  PostgreSQL UE  │
                               │  rôles · sessions  │   │  RLS · pg_cron  │
                               └─────────┬──────────┘   └─────────────────┘
                                         │ db.js (get/all/run/transaction)
                                         ▼
                               ┌────────────────────┐
                               │  SQLite (WAL, FK)   │   ← LA VÉRITÉ, en local
                               │  triggers WORM      │
                               │  hash chaîné        │
                               └─────────┬──────────┘
                                         │  VACUUM INTO
                                         ▼
                          backups/  (snapshots + archives ZIP chiffrées)
```

### Le mode LOCAL est le socle du « officiel »

**Décision d'architecture n°1, qui commande tout le reste : le mot « opposable » appartient au mode
Local/serveur, jamais au navigateur.** Séparer ce discours partout (doc, UI, README). Le mode démo
*illustre* le mécanisme (hash chaîné visible, pédagogique), il ne le *garantit* pas.

Concrètement : `datastore.js` devient un **sélecteur**. Détection par `GET /api/ping` (déjà implémenté,
`serveur.js:83`) → `'local'` si le serveur répond, sinon `'demo'`, `'cloud'` si configuré. Le serveur
écoute aujourd'hui sur `127.0.0.1` — voir §5 pour la tension « tablette qui scanne » qui obligera à écouter
sur l'IP LAN derrière le pare-feu du lycée.

### Le chemin vers le cloud

Le cloud n'est **pas** un remplaçant du local, c'est une **destination de réplication hors site**. Le
registre étant append-only à hash chaîné, la synchro est un simple **push d'écritures ordonnées** — le
hash donne l'ordre total gratuitement. **Interdit :** synchro bidirectionnelle temps réel (conflits de
chaîne = corruption). Un lycée mono-poste n'a jamais besoin du cloud ; un site multi-poste désigne **un
poste maître** qui tient la chaîne, les autres soumettent des brouillons.

---

## 3. Le modèle de données

Le schéma actuel est **plat par établissement** (machines et bouteilles pendent directement de
`etablissements`). La hiérarchie métier voulue par Franck exige d'insérer le chaînon manquant **sites**, et
d'ajouter les objets qui portent la V10 (relevés, contrats, rapports).

### La hiérarchie cible

```
clients_detenteurs ──< sites ──< machines ──< [ mouvements | controles | releves | rapports ]
                                       │
bouteilles ──< pesées ──< mouvements ─┘        pieces_jointes (polymorphe, sur tout objet)
      │
      └──< bsff
```

### Tables NOUVELLES (par migration versionnée, cf. §11)

**`sites`** — le chaînon manquant client↔machine.
```sql
CREATE TABLE IF NOT EXISTS sites (
    id                  TEXT PRIMARY KEY,            -- SITE-…
    etablissement_id    TEXT NOT NULL REFERENCES etablissements(id),
    client_detenteur_id TEXT NOT NULL REFERENCES clients_detenteurs(id),
    nom                 TEXT NOT NULL,               -- « Cuisine centrale », « Magasin nord »
    adresse             TEXT,                        -- physique du site (≠ siège client)
    latitude            REAL, longitude REAL,        -- géoloc optionnelle (tournées V10)
    contact_site        TEXT, telephone TEXT,
    actif               INTEGER NOT NULL DEFAULT 1 CHECK (actif IN (0,1)),
    date_creation       TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
```
→ `machines` gagne `site_id TEXT REFERENCES sites(id)`, **nullable au départ** (règle d'or « brancher le
neuf avant de retirer l'ancien »). On **garde** `client_detenteur_id` sur la machine (dénormalisation
assumée : le cadre 2 CERFA se remplit depuis le client, et une machine se déplace entre sites du même
client sans reperdre son détenteur).

**`releves` + `releves_reference` + `releves_valeurs`** — le circuit pédagogique §8bis, aujourd'hui absent
à 100 %. Les relevés sont **figés après validation** comme les mouvements (mémoire de la machine), mais
restent hors `mouvements` (métier différent, pas de CERFA, pas de F-Gas). Une chaîne de hash **séparée par
machine**. Champs clés : `grandeur` (T_EVAP, T_COND, HP, BP, SURCHAUFFE, SOUS_REFROID, INTENSITE),
`valeur_attendue`, `tolerance`, `valeur_mesuree`, `ecart` (calculé), `dans_tolerance` (0/1), `eleve_id`.

**`contrats`** — pré-requis de l'assistant V10 (pas de relance sans échéance).
```sql
CREATE TABLE IF NOT EXISTS contrats (
    id            TEXT PRIMARY KEY,                  -- CTR-…
    etablissement_id TEXT NOT NULL REFERENCES etablissements(id),
    client_detenteur_id TEXT NOT NULL REFERENCES clients_detenteurs(id),
    site_id       TEXT REFERENCES sites(id),         -- NULL = tous les sites du client
    type          TEXT CHECK (type IN ('MAINTENANCE','ETANCHEITE','FULL_SERVICE')),
    frequence_visite_mois INTEGER,
    date_debut TEXT, date_fin TEXT,                  -- échéance → alerte CONTRAT_ECHEANCE
    date_derniere_visite TEXT, date_prochaine_visite TEXT,
    statut        TEXT DEFAULT 'ACTIF' CHECK (statut IN ('ACTIF','SUSPENDU','EXPIRE','RESILIE')),
    observation   TEXT
);
```

**`rapports`** — le compte rendu de visite (V10) que le CERFA ne couvre pas : relevés, diagnostic,
préconisations, photos avant/après. `contenu_json` = snapshot figé au moment du rapport ; `pdf_pj_id`
pointe vers la pièce jointe générée. Lié à `mouvement_id` / `controle_id` / `machine_id`.

**`alertes`** (V10) — la matérialisation de la sentinelle. Voir §9.

**`scelles`** (V9) — l'ancrage de preuve. Voir §4.

**`sessions`** (V9) — sessions serveur opaques (jamais de JWT client en local). Voir §5.

**`mouvement_intervenants`** (conformité 2027) — plusieurs opérateurs par intervention. Voir §10.

### Tables à ÉTENDRE

- **`machines`** : champs techniques §8bis (`regime_fonctionnement`, `temp_evaporation`,
  `temp_condensation`, `pression_hp_bar`, `pression_bp_bar`, `nature_huile`, `viscosite_huile`) +
  `site_id` + `code_public` (§6) + `prp_utilise`/`referentiel_prp` (fige la table PRP au calcul de seuil).
- **`etablissements`** : `date_validite_capacite` **manque** — sans elle, l'alerte « capacité expirée » est
  prévue mais **non calculable**. Blocage à corriger dès la V9 (cf. §10, M-2).
- **`journal_audit`** : ajouter `hash_precedent` / `hash` — le chaîner (cf. §4). **Le vrai passage démo →
  coffre-fort.**
- **`bouteilles`, `machines`** : `code_public TEXT UNIQUE` (identifiant opaque stable pour le QR, §6).

### Historisation et intégrité — le pattern est déjà le bon, ne pas le remplacer

Vous avez déjà un **CQRS pragmatique** : écritures immuables (mouvements append-only + journal) + tables
d'état matérialisées (machines/bouteilles à jour). C'est exactement ce qu'il faut. **Ne partez PAS sur un
event-sourcing pur** : la balance, les alertes et les vues attaquent des tables d'état directement, pas un
flux d'événements. Sur-ingénierie fatale, à écarter.

**Un durcissement obligatoire :** le `journal_audit` doit être **chaîné par hash** au même titre que les
mouvements. Les triggers empêchent la suppression *via l'application*, pas via un `sqlite3` externe. Sans
hash chaîné sur le journal, le coffre-fort a une porte dérobée : on excise une ligne sans trace. Le hash
rend toute excision **détectable**.

---

## 4. Le coffre-fort : sauvegarde, restauration, preuve

### 4.1 Le piège n°1, à régler AVANT tout : ne jamais copier le `.db` à chaud

En mode WAL (`db.js:47`), trois fichiers coexistent : `.db`, `.db-wal`, `.db-shm`. Un `copy .db` seul,
application ouverte, capture une base **amputée du WAL** — les dernières validations manquent, ou la base
est incohérente. C'est exactement le scénario que Franck redoute, transformé en générateur de fichiers
morts. **Règle absolue codée en dur : la seule primitive de sauvegarde est**

```sql
VACUUM INTO 'backups/tmp/inerweb-fluide-2026-09-07-1730.db';
```

`VACUUM INTO` produit une copie transactionnellement cohérente (WAL intégré, défragmentée, sans `-wal`/`-shm`)
sans bloquer les lectures. Interdire physiquement la copie de fichier : il n'y a **pas d'autre chemin** de
sauvegarde dans le code.

### 4.2 Deux niveaux, pas un seul

Le `SAUVEGARDE.md` actuel ne connaît qu'un objet : « une sauvegarde ZIP complète ». Trop lourd pour être
fréquent, donc trop rare pour protéger des erreurs de saisie du jour. **Distinction à introduire :**

- **Snapshots base-seule** (`backups/snapshots/`) : `VACUUM INTO` rapide, à chaque validation officielle +
  horaire pendant l'usage. Rotation 48 h. **Filet anti-erreur-humaine** (« j'ai validé une mauvaise pesée
  il y a 20 minutes »).
- **Archives complètes** (`backups/archives/`) : ZIP base + documents, quotidien + fermeture + manuel.
  **Filet anti-sinistre** (« le disque est mort »).

Anatomie d'une archive : `base/` (le `.db` issu de `VACUUM INTO`), `documents/` (toutes les PJ, hash
vérifié), `config/` (paramètres + établissement lisibles), et surtout **`manifeste.json`** — ce qui
transforme un ZIP en preuve : SHA-256 de la base, `chaine_hash_ok`, `dernier_hash`, compteurs
(machines, mouvements validés, documents). Le manifeste permet de répondre « voilà ce qui s'est passé, à
telle date » **sans même restaurer**, et de détecter une restauration qui régresse (« 588 mouvements dans
l'archive, 590 dans la base actuelle → restaurer perd 2 écritures officielles, confirmer ? »).

Rotation GFS (grand-père/père/fils) : snapshots 48 h · quotidiennes ×14 · hebdo ×8 · mensuelles ×12 (+ hors
site) · **fin d'année scolaire conservée indéfiniment, hors site, immuable**. Règle inviolable : **écrire la
nouvelle avant de purger l'ancienne**. Toujours écrire en `.partiel` puis renommer après manifeste validé ;
purger les `.partiel` au démarrage (une sauvegarde interrompue n'existe pas).

### 4.3 Restauration en un clic — le déroulé, avec ses garde-fous

1. Lire le manifeste **sans rien écrire** ; écran de comparaison (ce que je restaure vs l'état actuel, ce
   que je perds).
2. **Sauvegarde de sécurité automatique de l'état actuel** → `backups/avant-restauration/`. **Non
   désactivable.** C'est ce qui rend une fausse manœuvre réversible.
3. Vérifier le SHA-256 de la base du ZIP **avant** écrasement (archive corrompue en transit ne touche
   jamais une base saine).
4. **Écrasement atomique** : extraire dans `data/restauration-en-cours/`, vérifier là, puis renommer
   (quasi-atomique sur NTFS). Une coupure de courant laisse soit l'ancienne base intacte, soit la nouvelle
   validée — jamais un hybride.
5. **Trois vérifications post-restauration** : `PRAGMA integrity_check`, `PRAGMA foreign_key_check`,
   `verifierChaineHash()`. Une seule au rouge → rollback automatique vers la sauvegarde de sécurité.
6. Entrée `journal_audit` : « RESTAURATION depuis … par … ».

**Bouton « Tester une sauvegarde »** : ouvre le ZIP dans une base temporaire en lecture seule, lance les
trois vérifications, verdict vert/rouge. Sans ce test à un clic, une sauvegarde reste « un espoir ». Alerte
au tableau de bord si aucun test réussi depuis > 12 mois.

### 4.4 3-2-1 concret

**Lycée :** disque local (auto) + clé USB au bureau (vendredi) + lecteur réseau académique (mensuel,
chiffré). Le lecteur réseau **est** le hors-site à moindre effort (sauvegardé par la DSI, souvent hors du
bâtiment). **Jamais** OneDrive/Drive synchronisé sur `data/` (piège corruption WAL, déjà connu de Franck) :
le cloud reçoit des **ZIP figés**, jamais la base vivante. Détecter au démarrage si `data/` est sous un
chemin OneDrive et **avertir fort**.

**Pro :** disque + NAS (robocopy nocturne du dossier `backups/`, jamais `data/`) + cloud souverain UE
(hebdo). Le pro **doit** chiffrer (données clients : SIRET, adresses).

### 4.5 Chiffrement des exports (AES-256-GCM)

- **Optionnel** en local sur `backups/` pour un lycée (poste dans un local fermé) ; **par défaut en mode
  OFFICIEL** dès qu'il y a des données réelles.
- **Obligatoire, non contournable** dès qu'un ZIP quitte le poste (clé USB, réseau, cloud, mail).
- Schéma : dérivation `scrypt(phrase, sel16, N=2^15, r=8, p=1)` → clé 256 bits ; `AES-256-GCM`, IV 12 o,
  tag d'authentification 16 o vérifié au déchiffrement (un octet modifié = rejet, pas de bouillie). Tout en
  Node natif (`crypto`), **zéro dépendance** — cohérent avec la doctrine. Manifeste en clair en tête (hors
  chiffrement, sans donnée sensible) pour inventorier sans la phrase.
- **Risque mortel : la phrase perdue = données perdues à jamais.** Parades techniques : (a) après
  chiffrement, **re-déchiffrer en mémoire** pour prouver que la phrase marche avant d'annoncer « OK » ;
  (b) **séquestration à double phrase** (chiffrer la clé du ZIP une fois avec la phrase du prof, une fois
  avec une phrase « établissement » détenue par la direction — l'une *ou* l'autre ouvre) ; (c) **indice non
  secret** dans le manifeste (« coffre bureau + initiales »).

### 4.6 Ce qu'on garantit / ce qu'on ne garantit PAS (à écrire mot pour mot dans `SECURITE.md`)

**On garantit :** qu'une écriture validée n'est pas modifiable *par l'application* ; qu'une modification/
suppression *via un client SQLite honnête* est refusée par trigger ; qu'une altération du contenu *casse la
chaîne et est détectée* au prochain contrôle ; qu'une troncature *est détectée si un scellé postérieur
existe hors système* ; que le journal d'audit est append-only et chaîné.

**On NE garantit PAS :** qu'un administrateur système déterminé, disque en main, ne puisse pas reconstruire
une base cohérente falsifiée (il le peut — c'est vrai de TOUS les registres locaux du marché) ;
l'horodatage opposable à un tiers sans ancrage externe ; quoi que ce soit en mode démo (navigateur = zone
de non-droit assumée).

C'est de la **tamper-evidence** (on rend l'essai visible), pas de la tamper-proofing (on ne l'empêche pas).
Honnête, et **supérieur au marché observé** — aucun concurrent ne documente de hash chaîné.

---

## 5. Sécurité, comptes et rôles

### 5.1 Admin unique qui octroie, zéro inscription libre

- **Aucune route `/register`.** La seule création de compte passe par un ADMIN authentifié, vérifié
  **côté serveur** (`session.role === 'ADMIN'`), jamais côté interface.
- **Premier lancement :** l'assistant crée LE compte admin (Franck) avec mot de passe fort. **Pas de compte
  par défaut `admin/admin`** (faille garantie).
- Rôles : ADMIN (octroie, tout journalisé) · REFERENT (valide, passe en OFFICIEL) · ENSEIGNANT (valide le
  FORMATION des élèves) · ELEVE (saisit en FORMATION, fait des relevés, **jamais** valider/OFFICIEL) ·
  TECHNICIEN (= REFERENT sur son périmètre, usage pro). **CLIENT-LECTURE : PAS en V9** — un compte client
  externe casse le modèle souverain et ajoute une obligation RGPD pour zéro besoin immédiat ; en V10, le
  client reçoit un **PDF** ou un portail filtré, pas un compte à part entière.

### 5.2 Le point où « un élève ne passe jamais en officiel » se gagne ou se perd

**Décision d'architecture n°2 : le rôle est appliqué côté serveur, pas côté interface.** Cacher un bouton
n'est PAS une sécurité. Un élève qui connaît l'URL `POST /api/mouvements/valider` doit recevoir un **403 du
serveur**, pas seulement être privé de bouton. Chaque route mutante vérifie le rôle sur la session serveur.
En démo, l'audit notait « l'utilisateur courant est toujours référent » (CF-6) — acceptable en démo, **fatal
en officiel**.

### 5.3 Détails qui comptent

- **Mots de passe :** scrypt (déjà en schéma), `N=2^15, r=8, p=1`, sel 16 o, comparaison en **temps
  constant** (`crypto.timingSafeEqual` — à vérifier dans `db.js`). Argon2id serait marginalement mieux mais
  impose une dépendance native → **non**, contre la doctrine zéro-dépendance. Min 10 caractères pour
  ADMIN/REFERENT, verrouillage temporaire après 5 échecs.
- **Sessions :** token opaque en cookie `HttpOnly; SameSite=Strict`, stocké serveur (table `sessions`),
  expiration ~8 h, révocable par l'admin. Pas de JWT.
- **Tension à assumer :** le §8bis veut « scan tablette → fiche immédiate », mais une tablette ne peut pas
  atteindre le `127.0.0.1` du PC prof. **Il faudra écouter sur l'IP LAN du poste, derrière le pare-feu du
  lycée, avec authentification obligatoire.** Décision explicite, pas subie : LAN lycée = zone semi-fiable,
  l'auth par compte reste la barrière.

### 5.4 RGPD — la séparation qui réconcilie coffre-fort et effacement

**Décision d'architecture n°3 : séparer dès le modèle les « données de preuve » (hachées, WORM, conservées
5 ans par obligation légale) des « données de contact/pédagogiques » (mutables, anonymisables, purgeables).**
C'est ce qui évite d'être coincé entre « je ne peux rien effacer » et « la CNIL demande l'effacement ».

Trois catégories de personnes : personnel/techniciens (obligation légale F-Gas), clients (obligation légale
CERFA), **élèves — mineurs, le point le plus sensible**. Obligations concrètes :

- **Minimisation élève :** nom + prénom + classe suffisent. Jamais de date de naissance, adresse, email
  perso. Un identifiant interne (initiales + n°) est préférable.
- **Information des familles :** fournir dans `RGPD.md` un **modèle de mention** que Franck donne à sa
  direction — livrable concret qui débloque l'usage réel du module relevés.
- **Durées :** registre F-Gas ≥ 5 ans (le WORM interdit justement de purger avant) ; relevés élèves =
  fin d'année + N+1, puis anonymisation.
- **Anonymisation ≠ suppression :** on garde l'écriture (hash intact), on remplace les données de contact
  satellites par des jetons (`[ANONYMISÉ-2032]`) dans les tables non hachées.
- **Faille ouverte à fermer MAINTENANT :** les 3 clés API v7 restent valides tant que non révoquées côté
  Apps Script (CHANGELOG l'avoue). Ce n'est pas un « à faire plus tard », c'est une porte ouverte.

---

## 6. Les QR codes

**Principe : le QR est une clé d'entrée, jamais un porteur de données.** Un QR est photographiable par
n'importe qui dans un atelier. Il ne contient que de quoi *retrouver* l'objet. **Jamais** de données client
ni d'historique — fuite RGPD garantie sinon.

**Format : URL courte vers identifiant opaque public.**
```
http://<hôte>/#/v1/m/8F3K2Q      ← machine
http://<hôte>/#/v1/b/A19T7P      ← bouteille
```

- **URL, pas JSON brut** : scannée par l'appareil photo natif de la tablette, elle **ouvre directement la
  fiche**. C'est la promesse « scan → fiche immédiate ».
- **`code_public` opaque, PAS l'`id` interne** : l'`id` (`MAC-MCK3T9ZQ-…`) fuite l'horodatage et le volume
  (base36 de `Date.now()`). Colonne `code_public` = 6-8 caractères base32 sans ambiguïté (pas de 0/O/1/I),
  généré une fois, **stable à vie**. La base résout `code_public → id`.
- **Versionné** (`/v1/`) : si le format évolue (QR signés), `v2` cohabite sans invalider les étiquettes
  posées.
- **Résistance au changement de poste** (le vrai piège) : résolution **côté base** (l'URL peut changer, le
  code reste valide) ; nom d'hôte stable `inerweb.local` (mDNS) plutôt qu'une IP DHCP ; et **le code public
  imprimé en clair, en gros, sous le QR** — si le scan échoue, on tape 6 caractères (comportement déjà
  présent dans `qr-print.js` v7, à porter tel quel).
- **QR signé HMAC : ATTENDRE.** Utile seulement si des tiers impriment des étiquettes. Inutile en lycée.

Le routeur (`core/routeur.js`, aujourd'hui « vues plates ») doit apprendre les **routes paramétrées**
`#/m/:code` et `#/b/:code` — pré-requis technique de la fiche machine, à faire en même temps.

---

## 7. Les écrans à créer (priorisés)

| # | Écran | L'essentiel | Priorité |
|---|---|---|---|
| 1 | **Fiche machine vivante** (`#/m/:code`) | 5 blocs : identité rapide (fluide/charge/tCO₂/prochain contrôle, gros, lisible avec gants) · actions pré-ciblées (nouveau mouvement/contrôle/relevé/photo, CERFA, plaque) · données techniques (repliable) · alertes de cette machine · historique en **onglets** (interventions/contrôles/relevés/documents). Action = pré-remplissage, pas raccourci : « nouveau mouvement » ouvre le wizard avec l'étape Machine sautée. | **MAINTENANT** |
| 2 | **Fiche bouteille** (`#/b/:code`) | Identité (n°, fluide, état, tare/brute/nette en mono) · alertes (pas de pesée > 30 j, garde dépassée, bloquée) · actions (pesée, mouvement, retour fournisseur, BSFF) · historique + **mini-graphique des pesées** (une pesée aberrante saute aux yeux). | **MAINTENANT** |
| 3 | **Saisie de relevés** | Une carte par grandeur, `inputmode="decimal"`, **retour vert/ambre dès la saisie** (dans/hors tolérance), écart affiché sous le champ, bouton validation fixe en bas. Écran utilisé des dizaines de fois par séance → increvable et rapide. | **MAINTENANT** |
| 4 | **Vue prof agrégée des relevés** | Tableau croisé élève × grandeur × écart, trié par nb d'écarts hors tolérance. C'est *elle* qui vend pédagogiquement les relevés (le relevé seul n'est qu'un carnet papier numérisé). | **MAINTENANT** |
| 5 | **Configuration des références** (par machine) | Tableau éditable (grandeur/attendu/tolérance/unité), bouton **« Copier depuis une autre machine »** (parc homogène = gros gain). | ENSUITE |
| 6 | **Tableau d'alertes / sentinelle** | Liste classée par score de priorité, chaque alerte cliquable vers l'objet, cycle de vie (active/vue/reportée/traitée). | ENSUITE (V10) |
| 7 | **Sauvegarde / restauration** | Liste des sauvegardes (date, type, compteurs, chaîne OK) · boutons Sauvegarder / Restaurer / **Tester** · écran de comparaison avant restauration. | **MAINTENANT** (V9) |
| 8 | **Portail / tableau de bord client** (`#/client/:id`) | Sites et machines groupés, prochaines échéances, fuites ouvertes, documents, actions (rapport de visite, proposer une visite). | PLUS TARD (V10) |
| 9 | **Vérifier l'intégrité** (admin) | Bouton « Vérifier la chaîne », dernier scellé + sa date, `fsck` des PJ orphelines. | ENSUITE (V9) |

---

## 8. Workflows frigoriste et terrain

**Le réflexe terrain :** on ne scanne pas une machine pour lire son historique, on scanne pour **vérifier
qu'on ne se trompe pas de fluide avant de brancher le manifold** et pour savoir si un geste est dû.
D'où l'ordre des blocs de la fiche (§7) : identité et danger d'abord, actions ensuite, historique en
deuxième intention.

**Hors-ligne réel — ce qui ne doit JAMAIS dépendre du réseau** (cave, chaufferie, terrasse mal captée) :
afficher une fiche déjà consultée (Service Worker), saisir un relevé entier (calcul de tolérance = JS pur),
saisir un mouvement complet (wizard + signature canvas), prendre une photo (IndexedDB), consulter la liste
des objets du site si le QR est illisible.

**Décision d'architecture n°4 — la file de mutations offline.** Le mode Local a un serveur sur le poste,
mais la tablette qui scanne n'est PAS ce poste : c'est un client réseau qui appelle l'API REST. `LocalStore`
doit donc gérer une **file de mutations en attente** (queue IndexedDB côté tablette, rejeu FIFO dès que le
`fetch` réussit). Les écritures étant horodatées et immuables, **pas de fusion complexe** — juste du rejeu.
Ce morceau n'est pas encore dans la SPEC §2.2 : **à poser dans la spec avant de coder la Phase E.** Sans
lui, « coffre-fort qui ne perd jamais rien » est un vœu pieux dès qu'on sort de l'atelier confortable.

**Pièges mobiles à border :**
- **Virgule ET point** : `inputmode="decimal"` seul ne suffit pas en France. Normaliser côté JS (accepter
  les deux, jamais rejeter « 42,5 » en `NaN`). **DANGEREUX si oublié** : une mesure refusée en boucle casse
  la crédibilité de l'outil dès la première séance.
- **Quota IndexedDB** : photos non compressées × dizaines de relevés × une année scolaire = saturation
  silencieuse qui fait échouer une sauvegarde en pleine séance. Compression + purge dès la conception de la
  queue.
- Boutons ≥ 48 px (gant), pastilles avec texte (daltonien), sauvegarde locale à chaque champ (jamais tout
  perdre sur une mise en veille), confirmations **uniquement** sur l'irréversible.

---

## 9. V10 — l'assistant

### 9.1 Du photographe à la sentinelle

`getAlertes()` parcourt aujourd'hui les tableaux en mémoire à chaque navigation : personne ne regarde le
dimanche soir ni pendant les vacances. La V10 fait trois sauts : de la vue au **moteur** (alertes persistées,
datées, avec cycle de vie, calculées même hors connexion) ; de la liste à la **question** ; du registre au
**service** (portail client, rapport de visite).

**Architecture en trois couches :**
1. **Règles = SQL déterministe** (`v_alertes_controles`, `_fuites`, `_attestations`, `_bouteilles`,
   `_balance`, `_clients`), sur le modèle de la vue `bilan_matiere`. **Les chiffres réglementaires vivent
   dans le SQL versionné, jamais dans un prompt.**
2. **Matérialisation** = table `alertes` + un balayage qui réconcilie : crée les nouvelles, **éteint** (pas
   supprime) celles qui ne remontent plus, respecte les reports. `UNIQUE(code, entite_id)` empêche le
   harcèlement.
3. **Déclenchement** : au démarrage du serveur + après chaque mutation validée + **tâche planifiée Windows**
   quotidienne à 7 h (`schtasks`) qui écrit un digest `alertes-du-jour.html` même si personne n'ouvre l'app.
   En cloud : `pg_cron`.

**Score de priorité déterministe** (jamais par IA) :
`priorité = poids(niveau)×100 + urgence_temporelle(jours de retard, borné) + poids_réglementaire`.

**Catalogue (extrait) :** contrôles (`CTL_ECHU`/`CTL_30J`/`CTL_SANS_DATE`) · **fuites** (`FUITE_NON_REPAREE`
→ `FUITE_CONTROLE_MANQUANT` → `FUITE_RECONTROLE_1MOIS`) · attestations/étalonnages qui **bloquent l'officiel**
(`CAPACITE_EXPIREE`, `APTITUDE_EXPIREE`, `OUTIL_ETALONNAGE_EXPIRE`) · bouteilles (`BTL_INCOHERENCE_MASSE` via
`masse_nette_kg < 0`, `FLUIDE_GARDE_DEPASSEE`, `BSFF_NON_CLOTURE`) · balance (`ECART_NON_JUSTIFIE`) ·
clients (`CLIENT_CONTROLE_DU`, `INTERVENTION_A_RAPPORTER`).

**Le différenciateur vendable n°1 : le dossier de fuite fermé.** Une fuite ouvre un dossier qui ne se
referme que par la **preuve du re-contrôle conforme**. Combiné au hash chaîné, c'est le pitch : « je prouve,
daté et signé, que la fuite du 12 mars a été réparée le 15 et re-contrôlée conforme le 10 avril ». Aucun
concurrent du benchmark ne le documente.

**Le calcul automatique de la fréquence de contrôle** (charge × PRP → tCO₂eq → 12/6/3 mois, ajusté détection
permanente) alimente `date_prochain_controle` et bouche le trou actuel (fréquence 100 % manuelle) qui fait
vivre toute la famille `CTL_*`.

### 9.2 Requêtes en langage naturel — base = vérité, toujours

**Décision d'architecture n°5 : l'IA traduit, elle ne calcule jamais.** La question devient une requête SQL
choisie dans un **catalogue fermé** ; le résultat vient **toujours** de la base ; une couche de rendu
reformule. Si l'IA hallucine « 4,2 kg récupérés », ce chiffre n'a **aucun chemin** pour atteindre
l'utilisateur — seul existe ce que le `SELECT` renvoie. C'est la doctrine anti-hallucination de Franck
appliquée au domaine réglementaire, où une hallucination est une faute, pas une gêne.

- **(a) Questions prédéfinies — À FAIRE EN PREMIER, seul.** Des requêtes SQL nommées, testées, hors-ligne,
  instantanées. 80 % de la valeur, 20 % de l'effort, **risque nul**. Elles répondent directement aux
  5 questions de Franck. Puces cliquables sur le dashboard + saisie libre.
- **(b) niveau 1 — classification d'intention (Ollama).** L'IA reçoit la question + le catalogue et répond
  *uniquement* un JSON strict `{intention, paramètres}`, rejeté si hors catalogue. Zéro SQL généré. Pont
  naturel vers HAL (même modèle `qwen2.5:3b`, même bornage).
- **(b) niveau 2 — SQL généré sous liste blanche : PLUS TARD, jamais en écriture.** Connexion en lecture
  seule (`PRAGMA query_only=ON`), filtrée par `etablissement_id`, requête loggée et **affichée** à
  l'utilisateur. À n'ouvrir que si un besoin réel émerge.

**Cloisonnement :** IA locale par défaut (aucune donnée ne sort). IA externe (Claude) seulement sur
activation explicite et **données agrégées/anonymisées** (« 3 machines > 50 t à contrôler », jamais « la
chambre froide de la boucherie Untel »). Format d'échange avec HAL = JSON neutre — **ne pas coupler les deux
bases** tant que le référentiel unique HAL n'est pas posé (règle déjà en mémoire) ; partager la doctrine, pas
la plomberie.

### 9.3 Assistant client

Le socle relationnel existe (`clients_detenteurs` reliés aux machines). La V10 le transforme en service :
tableau de bord client (`#/client/:id`), relances (contrats à échéance, contrôles dus, clients sans visite
12 mois), portail lecture **strictement filtré** à ce client (RLS en cloud, filtre serveur en local), et
**rapport de visite en un clic** — le livrable qui transforme « outil de conformité » en « outil de relation
client » et qui facture. Le QR machine ouvre, en portail client, une **version réduite** de la fiche (pas de
données internes).

**Dangereux, à border :** aucun e-mail/relance automatique non validé par un humain en mode Officiel (un
rappel erroné à un vrai client engage la responsabilité).

### 9.4 Pistes V10+ exprimées par Franck (04/07/2026) — l'outil universel

Cap confirmé par Franck : transformer l'outil en **dossier vivant par machine**. Quatre pistes, par
ordre de maturité :

1. **Feuille de relevés complète, vérifiable, comparée au modèle de référence** — c'est déjà le cœur
   de V9.2 (relevés + références + tolérances + vue prof) : rien à ajouter au plan, juste à livrer.
2. **Assistant de mise en service** — guidage pas à pas d'une mise en service (checklist réglementaire
   + relevés + seuils), qui produit la feuille de mise en service (SPEC §8 bis) ET le mouvement
   MISE_EN_SERVICE. S'appuie sur l'existant : wizard + relevés + fiche machine. À placer après V9.2.
3. **Tracé du diagramme enthalpique** depuis les relevés (T°/pressions HP-BP → cycle frigorifique
   sur le diagramme du fluide). **Intrant REÇU le 04/07 : le traceur « FRIGOLO Mollier v3 PRO » de
   Franck** (https://frigorx.github.io/inerweb-frigolo/outils/frigolo-mollier.html, archivé dans
   `docs/intrants-v10/` avec sa fiche) — noyau thermodynamique complet (tables de saturation
   6 fluides, interpolation, cycle depuis BP/HP/surchauffe/sous-refroidissement, COP), autonome,
   zéro dépendance. Chemin tout tracé : extraire le noyau en module ES, superposer le cycle MESURÉ
   (relevés V9.2) au cycle de référence. Pédagogiquement fort.
4. **Module intelligent d'identification de problèmes** (surchauffe anormale, sous-refroidissement
   faible, HP/BP incohérentes → hypothèses de panne) — prolonge la sentinelle V10 ; MÊME DOCTRINE :
   règles déterministes d'abord (seuils métier), l'IA ne calcule jamais un diagnostic seule, elle
   formule à partir des règles. « On verra plus tard mais c'est l'objectif » (Franck).
5. **Sondes Testo Bluetooth → relevés automatiques** (Franck possède 549i pression / 115i
   température). **Intrant REÇU le 04/07 : outil de découverte GATT** (`docs/intrants-v10/
   testo-ble-discovery.html`, Web Bluetooth). La mesure entre seule dans la feuille de relevés —
   fin des erreurs de recopie, chaîne complète scan QR → sonde → relevé → comparaison → Mollier.
   Prérequis : (a) Franck relève les UUID/trames des sondes réelles avec l'outil (protocole
   propriétaire, se découvre sur le matériel) ; (b) contexte sécurisé — Web Bluetooth exige HTTPS
   ou localhost, la tablette du LAN devra être traitée avec la décision §16.6. Après V9.2.

---

## 10. Conformité résiduelle — ce qui manque pour un usage pro opposable

Le socle est **au-dessus du marché** sur l'intégrité et la balance. Mais **trois trous rendent le mode
officiel non opposable en l'état.** Aucun mouvement officiel réel ne doit être produit tant qu'ils ne sont
pas fermés.

- **M-1 — Trackdéchets/BSFF (BLOQUANT).** Depuis le 01/01/2023, tout fluide à statut de déchet transite par
  un BSFF dématérialisé sur Trackdéchets. Le `createBsff` actuel génère un BSFF **interne, sans n° officiel**.
  Tant que le connecteur API n'existe pas, `SPEC-V8.md` doit dire noir sur blanc « le BSFF de ce logiciel ne
  remplace pas Trackdéchets ». Prérequis absolu du premier mouvement déchet officiel réel.
- **M-2 — Validité de l'attestation de capacité (BLOQUANT, petit effort).** `etablissements` n'a pas de
  `date_validite_capacite` → l'alerte « capacité expirée » est prévue mais **non calculable**. Sans elle, le
  blocage §7.2 est du vide. **À corriger dès la V9.**
- **M-3 — Aptitude/catégorie 2025 (avant le 01/01/2027).** Un seul `technicien_id` par mouvement, aucun
  contrôle catégorie↔opération. Ajouter `mouvement_intervenants` + « si intervention ≥ 01/01/2027 et
  catégorie_2025 vide → non conforme ». **Blocage dur à la sélection de l'intervenant** (aptitude expirée =
  non sélectionnable).

Plus commercial que réglementaire (peut attendre) : export « Déclaration ADEME » depuis la balance ; figer
`prp_utilise` sur mouvement + machine (M-6) ; inventaire **nominatif** bouteille par bouteille + inventaire
d'ouverture au 01/01 (aujourd'hui agrégé, CF-20) ; vue « fuites ouvertes au 31/12 » ; journal d'audit aussi
en PDF ; rapport d'intervention client (V10).

**Danger à écrire :** ne jamais livrer le mode officiel sans les blocages capacité + aptitude + le
garde-fou Trackdéchets. Un CERFA officiel signé par un technicien non habilité, ou un BSFF interne présenté
comme un BSD légal, est attaquable et engage la responsabilité.

---

## 11. Plan de développement et priorités

**Prérequis transverse (Phase E), à faire AVANT toute ligne de LocalStore :**

| # | Incrément | Objectif | Effort | Dépend de |
|---|---|---|---|---|
| E0 | **Contrat `DataStore` + test de conformité** | Figer `contrat.js` (les ~60 méthodes) + `test-contrat.mjs` qui tourne contre n'importe quel store. Le build casse si LocalStore ne passe pas la même sémantique. Ajouter le **mapping snake_case↔camelCase dans un seul module** (`server/mapping.js`). | Petit | — |
| E1 | **Migrations `user_version`** | Boucle « tant que `user_version < N`, jouer la migration N en transaction ». `002_sites`, `003_qr_code_public`, `004_journal_chaine`, `005_releves`. Jamais de DROP ni de re-hash. | Petit | E0 |
| E2 | **Journal d'audit chaîné** (`004`) | `hash_precedent`/`hash` sur `journal_audit`. **Le vrai passage démo → coffre-fort.** | Petit | E1 |
| E3 | **LocalStore + routes serveur** | Les 60 méthodes du contrat mappées 1:1 sur `/api/*` (aujourd'hui 501), chacune en transaction, réutilise `db.hashEcriture`. Contrôle de rôle serveur sur chaque route mutante. | **Gros** | E0-E2 |
| E4 | **Sauvegarde/restauration** | `VACUUM INTO` seule primitive · snapshots + archives · manifeste vérifié · restauration atomique + sauvegarde de sécurité + 3 vérifications + rollback · `.partiel` · chiffrement AES-GCM par défaut en OFFICIEL. | **Gros** | E3 |
| E5 | **Comptes/rôles/sessions** | Table `sessions`, admin unique, pas de compte par défaut, verrouillage. | Moyen | E3 |

### V9.x — le coffre-fort utilisable et vivant

| # | Incrément | Objectif | Effort |
|---|---|---|---|
| V9.1 | **Fiche machine vivante + routes `#/m/:code` + `code_public`** | Débloque QR et relevés, gros gain TP immédiat. | Moyen |
| V9.2 | **Relevés** (référence + saisie élève + vue prof agrégée) | Le circuit pédagogique §8bis. | Moyen |
| V9.3 | **File de mutations offline** (queue IndexedDB → rejeu) | Tient la promesse « ne perd jamais rien » hors atelier. | Moyen |
| V9.4 | **Conformité bloquante** : `date_validite_capacite` (M-2), aptitude expirée non sélectionnable, inventaire nominatif, fuites ouvertes, figer PRP. | Débloque le mode officiel. | Moyen |
| V9.5 | **Sentinelle** : table `alertes` + 6 vues `v_alertes_*` + balayage + score + tâche planifiée + calcul auto de la fréquence. | Le socle V10. | Moyen |

### V10 — l'assistant

| # | Incrément | Objectif | Effort |
|---|---|---|---|
| V10.1 | **Questions prédéfinies** (catalogue SQL) | 5 questions de Franck, risque nul, hors-ligne. | Petit |
| V10.2 | **Dossier de fuite fermé** | Différenciateur vendable n°1. | Moyen |
| V10.3 | **Assistant client + `contrats` + portail lecture + rapport de visite** | Du registre au service. | Gros |
| V10.4 | **IA locale niveau 1** (classification d'intention Ollama) | Confort, pont doctrinal vers HAL. | Moyen |
| V10.5 | **Pont Trackdéchets** (M-1) | Prérequis du premier BSFF officiel réel. | Gros |

**MAINTENANT :** E0 → E5, puis V9.1-V9.5. **ENSUITE :** V10.1, V10.2. **PLUS TARD :** V10.3-V10.5, cloud.

---

## 12. Risques et parades

| Risque | Nature | Parade |
|---|---|---|
| **Copie du `.db` à chaud** → corruption silencieuse | Technique | `VACUUM INTO` seule primitive, interdite en dur ; détecter `data/` sous OneDrive et avertir. |
| **LocalStore diverge de DemoStore** (bug v7 bis) | Technique | Test de conformité + mapping unique. Le build casse à la divergence. |
| **Journal excisable via SQLite externe** | Sécurité | Chaîner le journal (E2). |
| **Élève passe en officiel** | Sécurité | Contrôle de rôle **serveur**, 403, pas juste bouton caché. |
| **Phrase de chiffrement perdue** | Sécurité | Re-déchiffrement de vérification + séquestration double phrase + indice. |
| **Mode officiel ouvert sans Trackdéchets / capacité / aptitude** | Réglementaire | Ne pas livrer l'officiel sans les 3 blocages ; garde-fou déchets explicite. |
| **Clés API v7 non révoquées** | Sécurité | **Révoquer maintenant** (faille ouverte). |
| **Relevés élèves sans mention RGPD** | Réglementaire/juridique | Modèle de mention dans `RGPD.md`, inscription au registre du lycée. |
| **Perte de données d'un client payant avant un contrôle DREAL** | Business | **Le risque n°1.** Ne vendre qu'après un pilote gratuit de plusieurs mois qui prouve la non-perte. CGV avec limitation de responsabilité. |
| **Synchro cloud bidirectionnelle** | Technique | Interdite : cloud = push depuis un poste maître unique. |

---

## 13. Choix techniques tranchés

1. **`node:sqlite`, pas `better-sqlite3`.** Zéro dépendance native, zéro compilation : un enseignant copie
   un dossier et double-clique. Prix : Node ≥ 22, API expérimentale → garder `db.js` (get/all/run/
   transaction) comme couche d'abstraction fine pour basculer en une journée si régression.
2. **PRAGMA coffre-fort :** ajouter `busy_timeout=5000`, `synchronous=FULL` (durabilité > vitesse, volumes
   faibles), `wal_autocheckpoint=200`. Garder `foreign_keys=ON` + WAL.
3. **`BEGIN IMMEDIATE` + hash calculé DANS la transaction** (déjà le cas) : sérialise les validations
   concurrentes, évite la fourche de chaîne.
4. **CQRS pragmatique, pas d'event-sourcing.** Tables d'état + écritures immuables. Ne pas remplacer.
5. **Pas d'ORM** (Prisma/Drizzle) : détruit l'argument zéro-dépendance.
6. **QR = URL vers `code_public` opaque versionné**, jamais de JSON métier.
7. **Sessions serveur opaques, pas de JWT.** Scrypt, pas Argon2 (dépendance native).
8. **PWA assumée** en lycée ; pour le pro, wrapper (Capacitor/Tauri) plus tard, jamais d'app native
   développée de zéro.
9. **Chiffrement natif Node** (`crypto`, AES-256-GCM + scrypt), zéro lib crypto tierce.

---

## 14. Tests

- **Intégrité :** la chaîne de hash se vérifie au chargement ; une écriture altérée casse la chaîne et lève
  le bandeau ; le journal chaîné détecte une excision. Test qui **échoue si on ajoute une colonne au
  mouvement sans l'inclure dans le hash** (aujourd'hui `CHAMPS_HASH_MOUVEMENT` couvre bien technicien/
  validateur/date/motif — vérifié — mais rien n'empêche une régression future).
- **Restauration :** un ZIP restauré passe `integrity_check` + `foreign_key_check` + chaîne ; une archive
  corrompue est **refusée avant** écrasement ; une coupure pendant restauration laisse une base cohérente ;
  la sauvegarde de sécurité est bien créée.
- **Migrations :** chaque migration jouée **une seule fois**, dans l'ordre ; jamais rejouée ; jamais de perte
  de données ; `user_version` incrémenté.
- **Offline :** une mutation saisie hors réseau est rejouée FIFO au retour ; rien n'est perdu sur mise en
  veille ; le quota IndexedDB est géré.
- **Contrat :** `test-contrat.mjs` passe contre DemoStore ET LocalStore, mêmes clés d'objets, mêmes types
  (dates ISO, nombres pas chaînes).
- **Conformité CERFA :** les 72 champs (déjà 78 vérifications case par case) restent verts ; ne pas casser
  la vue `bilan_matiere` (cœur de l'audit).
- **Rôles :** un ELEVE reçoit 403 sur toute route de validation, côté serveur.

---

## 15. Monétisation

**Cibles :** (a) lycées/CFA — **segment de preuve, pas de revenu** (gratuit à vie, vitrine, prescripteurs) ;
(b) artisans frigoristes solo — payant réaliste, gros volume, sensibles au prix, poussés par l'échéance du
01/01/2027 ; (c) PME de maintenance CVC — **le segment qui finance**, mais exigences fortes (mobile,
multi-comptes, support) ; (d) bureaux de contrôle — influence, pas revenu direct.

**Prix de référence du marché :** EasyFluid, le plus transparent, à **17-20 €HT/technicien/mois**. Aucun
concurrent observé ne documente de hash chaîné, de mode formation, ni d'outillage bloquant — mais **tous**
ont une app mobile native et un pont Trackdéchets, deux standards que nous n'avons pas.

**Vendable MAINTENANT :** le mode Démo/Formation aux lycées et CFA, gratuitement — c'est déjà un produit
fini pour cet usage. **Rien de payant n'est vendable aujourd'hui** (officiel structurellement inatteignable,
local pas branché, ni mobile ni multi-utilisateurs ni Trackdéchets). Vendre maintenant = vendre une maquette.

**Jamais vendable tel quel :** la philosophie zéro-framework (invisible pour le client), la PWA sans app
store face à un pro habitué au natif, le « gratuit pour tous y compris pro » (mission, pas modèle).

**Modèle recommandé pour un enseignant seul :**
1. Maintenant → fin 2026 : **100 % gratuit, MIT, diffusion lycées.** Ne pas monétiser une promesse.
2. Courant 2027 (après Phase E fiabilisée) : **licence locale + maintenance** (modèle D) pour les PME — le
   client héberge chez lui, Franck vend une licence + une assistance limitée, **aucune responsabilité
   d'hébergement continue.** Idéalement via un revendeur/intégrateur qui porte le support.
3. Conditionnel : SaaS cloud **seulement** si une structure (association, GIE d'enseignants, partenaire)
   porte l'hébergement et le support — jamais en solo à côté d'un temps plein.

**Piège central, à nommer sans détour : la responsabilité en cas de perte de données d'un client payant est
le risque n°1.** Promettre l'inviolabilité et la décevoir coûterait plus cher en réputation que ne jamais
avoir vendu. **Pilote gratuit de plusieurs mois prouvant la non-perte AVANT le premier client payant — non
optionnel.** Prérequis avant le premier euro : statut professionnel (auto-entreprise a minima), CGV avec
clause de limitation de responsabilité, politique de support écrite (même « e-mail sous 5 j ouvrés, best
effort »). Piste faible risque : partenariat de **visibilité** avec un fournisseur de fluides
(Climalife/Dehon distribue déjà Clim'app) — posture **complémentaire** (souveraineté/gratuité/pédagogie),
jamais frontale.

---

## 16. Décisions à trancher par Franck

1. **Nom et dépôt V9 :** on reste sur `C:\git\inerweb-fluide` et on incrémente, ou on ouvre un dépôt séparé
   pour les futurs modules « pro » (recommandé : **réserver dès maintenant un dépôt non-MIT** pour le pro, si
   l'ambition commerciale est réelle — MIT n'empêche personne de forker le cœur et de vendre à ta place).
2. **Licence :** confirmer MIT sur le cœur (démo/formation) ; trancher le régime des futurs modules pro.
3. **Ambition commerciale :** simple mission pédagogique (gratuit, tranquille) OU licence locale pour PME en
   2027 OU SaaS (implique une structure) ? Ce choix conditionne le §15 et le §16.1.
4. **Cloud :** viser le cloud à terme, ou rester local souverain ? (Recommandation : local d'abord,
   longtemps ; le cloud n'est qu'une 3ᵉ copie hors site, pas une urgence.)
5. **RGPD élèves :** faire inscrire le traitement au registre du lycée et diffuser la mention aux familles
   **avant** d'utiliser le module relevés en vrai. Interlocuteur : DPO de l'académie.
6. **Écoute réseau LAN :** accepter que le mode Local écoute sur l'IP LAN du poste (pour le scan tablette),
   avec auth obligatoire — ou renoncer au « scan tablette → fiche » et rester `127.0.0.1` mono-poste ?
7. **Révocation des clés API v7 :** à faire, indépendamment de tout — c'est une faille ouverte, pas une
   décision de confort.

---

*inerWeb Fluide — Traçabilité F-Gas & CERFA 15497*04 · LP Jacques Raynaud, Marseille.*
*Ce document est la boussole V9/V10. Il tranche ; il n'attend pas d'être re-validé point par point.*
