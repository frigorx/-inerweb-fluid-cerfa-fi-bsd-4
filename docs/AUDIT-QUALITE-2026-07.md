# AUDIT QUALITÉ DU CODE — inerWeb Fluide (14/07/2026)

> Phase 1 : audit en LECTURE SEULE. Aucun fichier de code modifié.
> Point de départ : HEAD `fc4a2ce`, `git status` vide, **filet TOUT VERT (67 exécutions, 28,0 s)**.
> Méthode : 8 angles instruits en parallèle par sous-agents, **chaque constat contre-vérifié
> sur pièces par un second agent** (35 constats rendus, 2 réfutés) ; les 2 constats 🔴 et les
> points structurants ont été re-vérifiés une troisième fois à la main, code sous les yeux.
> Le précédent audit (`docs/AUDIT-2026-07-03.md`) n'est pas re-payé : on cherche la DÉRIVE.

## Verdict en une page

Le logiciel **fonctionne** et son socle d'opposabilité **tient** : garde Host/Origin en première
ligne de toutes les routes, 43 méthodes mutantes pour 43 entrées de rôle (aucun trou),
`recursive_triggers=ON` et déclencheurs WORM recréés à chaque migration touchant `mouvements`,
zéro secret en dur, scrypt et cookie de session corrects, `esc()` appliqué partout où une donnée
utilisateur entre dans du HTML (aucune injection trouvée), et **≈ 100 fichiers sur 100 portent
déjà un en-tête de contrat** — le dépôt est, sur ce point, exemplaire.

Mais l'audit a trouvé **deux défauts graves qui ne relèvent pas de la qualité de programmation :
ils touchent les données**. Tous deux vivent dans l'angle mort du filet de tests, c'est-à-dire
exactement là où la duplication démo/serveur n'est pas prouvée. Ce n'est pas une coïncidence :
c'est la démonstration, en production, du « point faible n° 1 » déjà identifié.

Le reste est de la dette structurelle saine à traiter : 76 des 77 méthodes du contrat écrites
deux fois, ~610 lignes de littéraux recopiés côté serveur, trois monolithes, et un filet qui
protège la sémantique du store mais **ni les gardes de rôle, ni le vrai transport HTTP, ni les
vues**. Il faut renforcer le filet AVANT de remanier, pas après.

---

## 🔴 BLOQUANTS (2)

### B1 — En mode serveur, toute pièce jointe ajoutée par l'interface est détruite en silence

**Preuve.** L'interface envoie le fichier comme objet : `v8/js/composants/pieces-jointes.js:145`
(`blob: fichier`, un `File`) et `v8/js/modales/personne-form.js:448` (`blob: blob`, la signature
manuscrite). `v8/js/data/transport-http.js:61` le passe à `JSON.stringify` — un `Blob` n'a pas de
représentation JSON, il devient `{}`. Côté serveur, `server/api.js:1561` :

```js
const contenuBase64 = d.base64 ?? d.blob;   // {} — truthy : le garde-fou laisse passer
```

puis `server/api.js:4480` fait `String({})` = `"[object Object]"`, que `Buffer.from(…, 'base64')`
décode **sans lever d'erreur** (le `try/catch` est mort) en **9 octets de déchet**
(`a1b8de72d39b8de72d`, reproduit en Node). Ces 9 octets sont écrits sur le disque, hachés en
SHA-256 et journalisés comme pièce probante.

**Impact.** En mode LOCAL — le mode d'un lycée en production — une facture, une attestation, une
photo de pesée, une signature d'élève sont **perdues à l'enregistrement**, et l'empreinte SHA-256
« prouve » le déchet. En mode démo, rien ne se voit (le `Blob` n'est jamais sérialisé, le DemoStore
le lit correctement — `demo-store.js:445`). Le test de parité ne le voit pas non plus : il n'exerce
que le chemin `base64` (`v8/js/data/test-contrat.mjs:1586`). Le DemoStore, lui, refuse proprement
un contenu non conforme (`demo-store.js:464`) : **les deux implémentations divergent en silence.**

**À faire tout de suite, hors code : vérifier la taille des pièces jointes déjà enregistrées sur
l'installation réelle.** Celles qui font 9 octets sont perdues (le fichier d'origine n'existe plus).

**Correctif (brique 1).** Convertir le blob en base64 dans `local-store.js` avant le transport ;
durcir le serveur (refuser tout contenu qui n'est pas une chaîne, même message que le DemoStore) ;
ajouter au contrat un cas « contenu non textuel refusé », joué contre les DEUX stores.
Effort **M** · Risque **faible**.

### B2 — Un fichier d'import peut faire lire, puis supprimer, n'importe quel fichier du poste

**Preuve.** À l'import, le chemin disque d'une pièce jointe est recopié tel quel depuis le JSON
candidat, sans confinement — `server/api.js:3405` :

```js
if (pj.chemin && fs.existsSync(pj.chemin)) ligne.chemin = pj.chemin;
```

Ensuite :
- `obtenirPieceJointe` (`server/api.js:1615`) fait `fs.readFileSync(ligne.chemin)` et renvoie le
  contenu en base64. Cette méthode n'est **pas** dans `ROLES_MUTATION` : elle est donc classée
  « lecture », **sans aucune restriction de rôle** (`api.js:224`) ;
- `supprimerPieceJointe` (`server/api.js:1644`) fait `fs.unlinkSync(ligne.chemin)`, et il est classé
  `OPERATEUR` (`api.js:287`) — **rôle qui inclut ELEVE** (`api.js:228`). La garde « écriture figée »
  ne protège pas : il suffit que la pièce soit déclarée rattachée à une MACHINE, pas à un MOUVEMENT.

**Impact.** Précondition : qu'un référent importe un JSON non fiable — c'est-à-dire précisément
l'usage que le produit encourage (sauvegarde d'un collègue, export d'un autre poste, fichier de
démo). Après cet import, un chemin forgé pointant vers `data/fluides.db`, un document personnel ou
n'importe quel fichier lisible par le processus permet d'en lire le contenu, et **un élève connecté
peut le supprimer**. Le patron de confinement existe déjà ailleurs dans le dépôt
(`server/serveur.js:475-477`) : il n'a simplement pas été appliqué ici.

**Correctif (brique 2).** Ne jamais accepter `chemin` d'un candidat : le recalculer localement
depuis l'identifiant (le nom du fichier sur disque EST l'identifiant). En défense de profondeur,
confiner lecture et suppression au dossier `documents/`. **Ce même correctif solde la dette 4 de la
ROADMAP** (chemin absolu → pièces jointes inaccessibles après restauration sur un autre poste, cf.
🟠 I7). Effort **M** · Risque **faible**.

---

## 🟠 IMPORTANTS

### Intégrité et opposabilité du registre

**I1 — Le « qui » du registre opposable est déclaré par le client, jamais prouvé par la session.**
Le serveur connaît l'utilisateur connecté, mais `contexte` n'est lu que par `garderRole` et
`getUtilisateurCourant` : **aucun des 43 handlers mutants ne l'utilise**. `validerMouvement`
(`api.js:2279`) scelle l'écriture au nom du `validateurId` **fourni dans le corps de la requête**
(seul son rôle métier est vérifié, `api.js:4544`), et le journal d'audit est alimenté de la même
façon (`api.js:1589`, et 10 autres appels `journaliser(params.par, …)`). Conséquence : un élève
connecté peut faire écrire au registre et au journal le nom d'un enseignant ; un référent peut
signer au nom d'un autre. Pour un registre censé être opposable en audit, c'est le trou le plus
profond — non pas technique, mais **de nature**. Effort **L** · Risque **moyen**.

**I2 — Rien ne verrouille l'invariant « handler mutant ⇒ entrée dans ROLES_MUTATION ».**
La garde est en liste blanche : toute méthode absente de la table est traitée comme une lecture,
donc exécutée **sans aucune restriction de rôle** (`api.js:5002` : `if (!roles) return;`).
L'invariant tient aujourd'hui (43/43), mais il ne repose que sur la vigilance : aucun des 14 fichiers
de test du serveur ne mentionne `ROLES_MUTATION`. La prochaine brique qui ajoute un handler mutant
et oublie sa ligne de rôle ouvre silencieusement la mutation à tout le monde, **sans qu'aucun test
ne vire au rouge**. Effort **S** · Risque **faible**.

**I3 — 40 des 43 gardes de rôle ne sont jamais mises en défaut par un test.**
`server/harnais-contrat.mjs` fixe `role: 'REFERENT'` en permanence : `test-contrat.mjs` ne peut donc
jamais déclencher un refus. Seuls `validerMouvement` et `creerCompte` sont testés avec un rôle
insuffisant. Si un remaniement abaisse `createHabilitation` ou `desactiverPersonne` de VALIDEUR à
OPERATEUR, un élève pourrait s'auto-attribuer une aptitude — sans un seul rouge. Effort **M** ·
Risque **faible**.

**I4 — `prpFige` est falsifiable dans le circuit export/import JSON, et le recoupement documenté
n'opère pas.** Le code et le CHANGELOG justifient l'exclusion de `prpFige` de l'empreinte par le
« recoupement opposable du journal chaîné ». Vérifié sur pièces : `prpFige` n'est effectivement pas
dans les 18 champs de `CHAMPS_HASH_MOUVEMENT` (`v8/js/core/utils.js:179`) ; **mais** le journal du
DemoStore n'est pas chaîné du tout (`demo-store.js:867` : un simple `push`), le hash du journal
serveur n'est **jamais exposé au contrat** (`server/mapping.js:423`), et **l'import ne vérifie
jamais la chaîne du journal** — ni côté démo (`demo-store.js:3909`) ni côté serveur
(`api.js:2913`) : seul `verifierChaineMouvements` est appelé. Un export JSON édité à la main peut
donc modifier le PRP figé d'un mouvement validé sans provoquer ni « registre altéré » ni rejet,
faussant les teq CO₂ et les seuils réglementaires (5/50/500 tCO₂eq). Le canal de preuve réel
(sauvegarde chiffrée) est, lui, correctement protégé (`restauration.js:463`). **Arbitrage Franck
requis** (voir plus bas). Effort **M** · Risque **moyen**.

**I5 — L'import ne vérifie pas l'intégrité référentielle des fluides.** Les deux fonctions de
validation d'import (`demo-store.js:246` et `api.js:3095`) vérifient bouteilles, machines, mouvements
figés, habilitations, mentions et liens d'outillage — mais **aucune ligne ne vérifie que le fluide
d'une bouteille, d'une machine ou d'un mouvement existe dans le référentiel importé**, alors que le
patron existe déjà dans les mêmes fonctions pour `personneId` et `outillageId`. Un fluide fantôme ne
plante pas : il retombe silencieusement à `gwpAr4 ?? 0` (`demo-store.js:2823`, `2964`), donc
**teq CO₂ = 0** et bilan annuel faux. Effort **S** · Risque **faible**.

**I6 — `updateBouteille` sans garde de statut** (dette ROADMAP 1, confirmée). Aucune vérification du
statut avant le patch (`demo-store.js:2327` / `api.js:1904`), alors que `updateMachine` refuse une
machine démantelée et `peserBouteille` refuse une bouteille RETOURNEE/DECHET. On peut donc repasser
une bouteille DECHET en EN_STOCK sans mouvement tracé (elle réapparaît en balance matière), ou
réécrire masse et date de pesée sur une bouteille sortie. L'interface masque déjà ces actions
(`fiche-bouteille.js:283`) : le trou est au niveau du store, pas du clic. **Trouvé au passage :**
l'invariant `masseNette ≤ contenanceMax` n'est revérifié que si la masse ou la tare changent — pas
si l'on ne change que `contenanceMaxKg` (`demo-store.js:2340`). Effort **S** · Risque **faible**.

**I7 — `pieces_jointes.chemin` est absolu alors que le schéma promet un chemin relatif** (dette
ROADMAP 4, confirmée). `schema.sql:520` annonce « chemin relatif dans documents/ » ; le code stocke
un chemin absolu (`api.js:4488`), et la restauration ne le réécrit jamais. Après restauration sur un
autre poste, les pièces justificatives sont **physiquement présentes mais introuvables**. Même
brique que B2. Effort **S/M** · Risque **faible**.

**I8 — `estFuiteOuverte` : tri non total, et ordre source différent des deux côtés.** Le serveur trie
des contrôles déjà triés par SQL (`api.js:3809`, `ORDER BY date_controle DESC`), la démo trie l'ordre
d'insertion (`demo-store.js:1475`) ; le comparateur ne départage pas les dates égales
(`api.js:3823`). Deux contrôles FUITE le même jour sur la même machine peuvent donc donner « fuite
ouverte » d'un côté et « réparée » de l'autre — donc le complément de gaz **bloqué en démo et
autorisé en local**. Le dépôt s'était pourtant donné la règle inverse (« jamais d'ORDER BY pour un
ordre contractuel », `habilitations.js:63`). Effort **S** · Risque **faible**.

### Duplication (le point faible n° 1, mesuré)

**I9 — 76 des 77 méthodes du contrat sont écrites deux fois à la main**, et ~610 lignes de littéraux
sont recopiées côté serveur (constantes `api.js:40-115`, utilitaires de `utils.js` clonés
`api.js:311-390`, sentinelle `api.js:465-548`, `getAlertes` `api.js:607-870`, code machine
`api.js:4300`, hasseur `server/hash-mouvement.js`), avec 49 commentaires « miroir / clone / mot pour
mot » qui documentent la dette sans la traiter. **B1 est la preuve que ce dispositif a déjà lâché.**

**I10 — Le motif qui justifiait la duplication ne tient plus.** `api.js:54` dit « le serveur est
CommonJS : littéraux dupliqués » — or il n'y a **aucun `package.json` dans le dépôt** (donc aucun
champ `type`), Node est en 24.16, et `server/test-hash-mouvement.mjs:13` **importe déjà** un module
ESM du front (`v8/js/core/utils.js`) sans le moindre aménagement. Le partage réel est possible
aujourd'hui. Effort **M** · Risque **moyen**.

**I11 — 24 constantes métier vivent en double, 3 en triple**, dont un seuil de conformité et un délai
réglementaire : `DELAI_CONTROLE_SUIVI_JOURS` (`dossiers-fuite.js:34`, `demo-store.js:101`,
`api.js:113`), `SEUIL_ECART_KG` (`demo-store.js:37`, `api.js:90`, **et `views/balance.js:17`** — la
vue affiche donc son propre seuil, indépendant de celui qui déclenche l'exigence de justification).
Un ajustement réglementaire exige trois corrections coordonnées. Effort **S** · Risque **faible**.

**I12 — Aucun test ne compare les deux copies entre elles.** Le seul dispositif anti-divergence est
un scénario fonctionnel rejoué contre chaque store : il ne compare ni les 24 constantes, ni les
messages canoniques, ni les tris — et il a laissé passer B1. Tant que les 610 lignes restent
recopiées, il faut un test qui compare les COPIES, pas seulement les comportements. Effort **M** ·
Risque **faible**.

### Filet de tests (ce qu'il ne protège pas)

**I13 — Le filet ne couvre ni les gardes de rôle (I3), ni le vrai transport HTTP, ni les vues.**
`transport-http.js` — le client réellement utilisé en production — **n'est nommé dans aucune suite** :
la parité « local » passe par un harnais en processus qui saute l'aller-retour réseau. Les 25 vues
(10 179 lignes) ne sont testées que par un chargement à vide qui n'appelle même pas `render()`
(`v8/test-chargement.mjs:143`), et **9 vues ne figurent dans aucune suite** (audit-guide,
bootstrap-admin, clients, conformite, connexion, fiche-bouteille, fiche-client, fiche-fuite,
fiche-outil). **Conclusion pour le remaniement : `test-contrat.mjs` protège un découpage interne des
stores, mais ne verrait RIEN d'une régression sur les rôles, le transport ou une vue.** Effort
**S** (les 9 vues) à **L** (les vues pour de vrai) · Risque **faible**.

### Structure et propreté

**I14 — Les monolithes.** `server/api.js` (5 040 l., objet `HANDLERS` de 2 384 l. mêlant 8 domaines
métier), `demo-store.js` (3 951 l.), `wizard.js` (1 933 l. dont 1 576 dans un seul export, toute la
logique enfermée en fermeture autour d'un objet `etat` — rien n'y est testable isolément).
Cas le plus rentable : `getAlertes`, **257 lignes** mêlant 8 sources d'alerte (`api.js:613`).

**I15 — La v7 entière est encore à la racine** (`js/`, `index.html`, `demo.html`, `css/style.css` =
13 274 lignes) : le serveur redirige `/` vers `/v8/` mais **ne l'interdit pas** — `CHEMINS_INTERDITS`
(`serveur.js:71`) ne contient ni `js` ni `css`, donc `/js/ui.js` reste servi. Dedans,
`js/cerfa_html_backup.js` (869 l.) est un **mort absolu : zéro référence dans tout le dépôt**.

**I16 — Utilitaires dupliqués dans le front lui-même** : `feuDesAlertes()` recopié mot pour mot
(`feu-tricolore.js:72` et `audit-guide.js:125`) — c'est une règle métier, pas un détail ; et
**trois** implémentations divergentes du format de date (`utils.js:81` rend `—`,
`cerfa/generateur.js:101` et `documents/dossier-audit.js:28` rendent `''`).

**I17 — `docs/CARTE-CODE.md` omet 6 modules** (`datastore.js`, `demo-donnees.js`, `transport-http.js`,
`harnais-contrat.mjs`, `parametres.js`, `zip-node.js` — 515 lignes à elle seule). Une carte
incomplète, c'est une session future qui relit du code pour rien.

---

## 🟡 MINEURS

- **L'attribut `hidden` ne masque rien** dès qu'une classe pose un `display` : `.btn`,
  `.badge-rouge`, `.pied-session`, `.chip` (`composants.css:11`, `302`, `1193`). Une règle d'auteur
  bat toujours le `[hidden] { display: none }` du navigateur. Prouvé en direct : le bouton
  « Réinitialiser » des filtres, le badge d'alertes et le pied de session **ne peuvent pas se
  cacher**. Correctif : une ligne (`[hidden] { display: none !important; }`).
- `init()` écrit en base (`api.js:556`) tout en étant classé « lecture » (hors `ROLES_MUTATION`) —
  effet bénin (idempotent), mais casse l'invariant que le code affiche lui-même.
- Le type MIME des pièces jointes n'est **pas revalidé à l'import** (`api.js:3402`) : la liste
  blanche appliquée à la saisie est contournable par un fichier forgé (constat IM-19 du 03/07,
  corrigé côté saisie seulement).
- `createHabilitation`/`createMention` et leurs révocations sont dupliqués mot pour mot
  (`api.js:1098` et `1175`) ; `test-contrat.mjs` est un script séquentiel de 1 726 lignes sans
  fonctions isolées (un échec en section 5 masque les 17 suivantes).
- Deux générateurs d'identifiants de formats incompatibles (`utils.js:122` → `bou-…` ;
  `db.js:266` → `BTL-…`), alors que l'identifiant entre dans l'empreinte du mouvement.
- Un message d'erreur divergent entre les deux copies (`demo-store.js:552` / `api.js:4342`) ;
  un TODO obsolète contredit par le code qui suit (`serveur.js:13`) ; 6 exports serveur « pour
  réutilisation ciblée » jamais réutilisés ; 3 classes CSS mortes ; 97 `style="…"` en dur dans les
  vues alors que `composants.css` offre 182 classes.

## Réfuté par la contre-vérification (à ne pas re-payer)

- « Des docs périmés à signaler » : chiffres et dates faux (l'agent avait halluciné les tailles).
- « Des modules sans en-tête de contrat » : **faux** — les fichiers `server/` commencent par
  `'use strict';` puis un bloc JSDoc en règle. Le dépôt a ses en-têtes, la brique n'existe pas.
- Le nommage n'est **pas** incohérent (français partout), et **aucun `catch` vide** n'existe dans le
  code métier. `esc()` est appliqué partout : **aucune injection HTML trouvée**.

---

# PLAN DE REMANIEMENT EN BRIQUES

Règles gravées : une brique = un commit = un risque borné ; brancher le neuf avant de retirer
l'ancien ; après CHAQUE brique, `node outils/lancer-tests.mjs` TOUT VERT + contrôle navigateur si
l'UI est touchée (port jetable neuf) + CHANGELOG + CARTE-CODE + commit ; jamais `data/` réel ;
`schema.sql` intouchable (évolutions = migrations) ; zéro dépendance npm nouvelle ; la parité
démo/local prouvée par `test-contrat.mjs` ne doit jamais être affaiblie.

## Lot 0 — Les données d'abord (à faire avant tout le reste)

| # | Brique | Gain | Effort | Risque |
|---|---|---|---|---|
| 1 | **Pièces jointes en mode local** (B1) : conversion du blob en base64 côté client, serveur qui refuse tout contenu non textuel, cas ajouté au contrat joué des 2 côtés | Arrête la destruction silencieuse des preuves | M | faible |
| 2 | **Confinement des chemins de PJ** (B2 + I7) : `chemin` jamais cru d'un import, recalculé depuis l'identifiant ; lecture et suppression confinées à `documents/` | Ferme la faille ET rend les PJ portables après restauration | M | faible |
| 3 | **Une ligne CSS** : `[hidden] { display: none !important; }` | Rend `hidden` fiable dans toute l'appli | S | faible |

## Lot 1 — Renforcer le filet AVANT de remanier (il ne protège pas ce qu'on va toucher)

| # | Brique | Gain | Effort | Risque |
|---|---|---|---|---|
| 4 | **Test de parité rôles ↔ mutations** (I2) : tout handler appelant `muter()` doit avoir une entrée `ROLES_MUTATION` | Rend l'oubli de rôle impossible en silence | S | faible |
| 5 | **Test paramétré des 43 gardes** (I3) : chaque méthode rejouée avec un rôle insuffisant → 403 attendu | Verrouille la sécurité métier avant découpage | M | faible |
| 6 | **Test de non-divergence des copies** (I12) : comparaison terme à terme des 24 constantes et des messages canoniques entre les deux implémentations | Attrape la prochaine divergence du type B1 | M | faible |
| 7 | **Les 9 vues absentes du chargement** (I13, part 1) | Une régression d'import cesse d'être invisible | S | faible |

## Lot 2 — Les dettes métier (le patron du correctif existe déjà à côté)

| # | Brique | Gain | Effort | Risque |
|---|---|---|---|---|
| 8 | **Garde de statut sur `updateBouteille`** + invariant contenance revérifié (I6) | Ferme un contournement du registre | S | faible |
| 9 | **Intégrité référentielle des fluides à l'import** (I5) | Plus de teq CO₂ à 0 en silence | S | faible |
| 10 | **`estFuiteOuverte` : tri total des 2 côtés, ordre en JS, extraction dans `dossiers-fuite.js`** (I8) | Supprime une divergence sur une règle de sécurité | S | faible |
| 11 | **`prpFige`** (I4) — *arbitrage Franck requis* | Referme le dernier vecteur de falsification du JSON | M | moyen |

## Lot 3 — Dédupliquer (traiter la cause de B1)

| # | Brique | Gain | Effort | Risque |
|---|---|---|---|---|
| 12 | **Une constante = une source** (I11) : les 3 constantes en triple d'abord | Fin des ajustements réglementaires à 3 endroits | S | faible |
| 13 | **Partage ESM des modules purs côté serveur** (I10) : sentinelle, puis code machine, puis habilitations, puis le hasseur — **une brique par séance** | Supprime ~610 lignes recopiées, tarit la source des divergences | M ×4 | moyen |
| 14 | **`feuDesAlertes` et `fmtDate` unifiés** (I16) | Une règle métier, une définition | S | faible |

## Lot 4 — Les monolithes (seulement une fois le filet bon)

| # | Brique | Gain | Effort | Risque |
|---|---|---|---|---|
| 15 | **`getAlertes` → une fonction pure par domaine d'alerte** (I14) : 257 l. → 8 fonctions testables | Le meilleur rapport gain/risque du lot | M | faible |
| 16 | **`api.js` découpé par domaine métier** (I14) : le dispatcher n'assemble plus que des modules | Sessions futures nettement moins chères | L | moyen |
| 17 | **Logique pure du wizard sortie des fermetures** (I14) | Rend le wizard testable | L | **fort** |

## Lot 5 — Propreté (sans risque, à tout moment)

| # | Brique | Gain | Effort | Risque |
|---|---|---|---|---|
| 18 | Supprimer `js/cerfa_html_backup.js` (869 l., zéro référence) ; **archiver ou interdire la v7** (I15) | −13 274 lignes de doute à chaque exploration | S/M | faible |
| 19 | Compléter `CARTE-CODE.md` (6 modules) (I17) | La carte redevient fiable | S | faible |
| 20 | TODO obsolète, 6 exports orphelins, 3 classes CSS mortes, `init()` hors rôles, MIME à l'import | Propreté | S | faible |

---

## Les arbitrages qui reviennent à Franck

1. **`prpFige` (brique 11)** — deux voies : (a) vérifier la chaîne du journal à l'import, ce qui
   oblige à exposer le hash du journal au contrat et à chaîner aussi le journal du DemoStore
   (surface contractuelle élargie) ; (b) assumer que **l'export JSON n'est pas un canal de preuve**
   et le dire dans l'interface, la sauvegarde chiffrée restant le seul canal opposable. La (b) est
   honnête et peu coûteuse ; la (a) est plus solide mais touche le contrat.
2. **L'identité des acteurs (I1)** — c'est le trou le plus profond du registre « opposable » : le
   « qui » est déclaré, pas prouvé. Chantier L à risque moyen. Le traite-t-on maintenant, ou est-ce
   acceptable tant que le logiciel reste un poste unique tenu par le professeur ?
3. **La v7 à la racine (brique 18)** — archiver dans `archives/v7/` (traçable) ou supprimer
   franchement ?
4. **Le découpage d'`api.js` (brique 16)** — on le fait, ou on s'arrête à `getAlertes` + les modules
   purs partagés, ce qui donne déjà l'essentiel du gain pour un risque bien moindre ?
5. **`updateBouteille` (brique 8)** — quels champs restent modifiables sur une bouteille sortie du
   stock ? (propriétaire et lot, pour une correction administrative légitime ?)

## Ce qu'il ne faut PAS faire

- Tenter d'unifier les 76 handlers en une seule implémentation : risque disproportionné.
- Découper `api.js` ou `demo-store.js` **avant** les briques 4 à 6 : le filet actuel ne verrait pas
  une régression sur les rôles.
- Toucher au wizard (brique 17) tant que le reste n'est pas soldé.
