# E3 — LocalStore + routes serveur : plan d'implémentation

> Document de référence du plus gros incrément de la V9 : brancher les 64 méthodes
> du contrat DataStore sur SQLite. Issu de la conception multi-agents du 04/07/2026.
> **Règle d'or : `v8/js/data/test-contrat.mjs` est la SEULE vérité.** Les mêmes 183
> assertions doivent passer sur `demo` ET `local`. On reprend la sémantique du
> DemoStore méthode par méthode (messages français EXACTS, tris, signes) — on ne
> réinvente rien. Le risque n°1 est la divergence (le bug v7 qui a motivé le contrat).

## Ossature (fichiers)

| Fichier | Rôle | Statut |
|---|---|---|
| `server/hash-mouvement.js` | Clone EXACT du hasseur mouvement du front (voir §Hash). | **fait** |
| `server/api.js` | Dispatcher : une fonction par méthode du contrat. Reçoit `(params, contexte{role,utilisateurId})`, applique la règle métier, traduit via `mapping.versSql/versFront`, écrit via `db.transaction()` englobant mutation + `journaliser()`. Renvoie la copie camelCase. Toute violation = `throw new Error(message français)`. Exporte `appeler(methode, params, contexte)`, `METHODES`, `ROLES_MUTATION`. Seul point serveur qui connaît SQL + contrat. | à créer |
| `server/registre.js` | Logique métier pure du registre WORM (quantité signée, effets stocks atomiques, scellement, contre-écriture, balance). `api.js` orchestre, `registre.js` calcule. | à créer |
| `v8/js/data/local-store.js` | `creerLocalStore(transport)` → les 64 méthodes + `{modeLabel:'LOCAL', registreAltere}`. Chaque méthode = `transport('nom', params)`, remonte les Error telles quelles. `surChangement` SYNCHRONE. Aucune logique métier. | à créer |
| `v8/js/data/transport-http.js` | Transport navigateur : `fetch('/api/'+methode, POST JSON)`, désenveloppe, lève `Error(erreur)` avec le message serveur intact. | à créer |
| `server/harnais-contrat.mjs` | Amorceur du cas test `local` : base jetable `mkdtemp`, LocalStore sur transport in-process, contexte `{role:'REFERENT'}`. | à créer |
| `server/serveur.js` | MODIFIER `traiterApi` : router `POST /api/:methode` → `api.appeler` ; 405 sur non-POST ; enveloppe `{ok,resultat}` / `{ok:false,erreur,code}` (200/400/403/500). `/api/ping` inchangé. | à modifier |
| `v8/js/data/datastore.js` | MODIFIER `creerStore` : SÉLECTEUR. `fetch('/api/ping')` → `local` (LocalStore) sinon `demo`. | à modifier |
| `v8/js/data/test-contrat.mjs` | MODIFIER le seul `fabriquerStore` : `case 'local'` via le harnais. AUCUNE assertion ne bouge. | à modifier |

## Transport (contrat d'échange)

- Signature unique : `transport(methode: string, params: object) => Promise<any>`.
- Requête : enveloppe `{ methode, params, contexte? }`. Les méthodes multi-arguments
  sont normalisées en objet nommé stable côté LocalStore, désassemblé par `api.js`
  (ex. `validerMouvement(id, validateurId)` → `{ id, validateurId }`).
- Réponse : `{ ok:true, resultat }` ou `{ ok:false, erreur:"message français", code }`.
  Le transport désenveloppe : succès → `resultat` (copie fraîche) ; échec →
  `throw new Error(erreur)` **mot pour mot** (le test vérifie `MSG_ECRITURE_FIGEE`,
  `'brouillon'`, `'otif'`, `'refusé'`…). Ne JAMAIS reformuler.
- `importerJSON` : le handler renvoie `{ok:true, resultat:false}` pour l'illisible
  (le transport rend `false` sans throw) et **lève** pour le forgé.
- Pièces jointes : contenu en base64 dans l'enveloppe. Sous Node le LocalStore rend
  un `Buffer` (`Buffer.from(base64,'base64')`), au navigateur un `Blob`. Le serveur
  stocke le contenu sur disque (colonne `chemin`) et ne renvoie le base64 que sur
  `obtenirPieceJointe` ; `listerPiecesJointes` = métadonnées seules.
- Node (direct) et navigateur (fetch) : même signature, même enveloppe. Le direct
  sérialise/désérialise quand même le JSON (éprouve le contrat, force les copies).

## Rôles (403 côté serveur, AVANT effet)

Cohérent avec `ROLES_VALIDEURS = [REFERENT, ENSEIGNANT, ADMIN]` (jamais ELEVE).

- **Niveau VALIDEUR** (fige/scelle/intégrité) : `validerMouvement`,
  `annulerParContreEcriture`, `importerJSON`, `updateEtablissement`,
  `createAuditOrganisme`, `createNonConformite`, `solderNonConformite`,
  `desactiverPersonne`, `reformerOutil`, `justifierEcart`, `saisirInventaire`,
  `createBsff`, `retournerFournisseur`, `deciderFluideRecupere`.
- **Niveau OPERATEUR** (saisie courante, ELEVE inclus) : `creerMouvement`,
  `soumettreMouvement`, `rejeterMouvement`, `supprimerMouvement`, tous les
  `create/update` de machines/bouteilles/contrôles/clients/personnel/outillage,
  `peserBouteille`, `ajouterPieceJointe`, `supprimerPieceJointe`.
- **Lectures** : aucune restriction en E3 (les vues front filtrent ; E5 pourra).

**Double garde sur `validerMouvement`** (le test l'éprouve) : (1) barrière route — si
le contexte de session est ELEVE, `api.appeler` lève avant effet → 403 ; (2) garde
métier — la méthode lit en base le rôle du VALIDATEUR DÉSIGNÉ (`validateurId`) ; si ce
n'est pas un ROLES_VALIDEURS, elle lève le message français (statut reste SOUMIS). Le
test appelle avec un contexte référent mais un validateur élève → la route passe, la
garde métier refuse.

## Le hash chaîné des mouvements (LE piège n°1)

**`db.js:hashEcriture` ≠ `utils.js:hasherEcriture`** (vérifié empiriquement). Trois
causes : (1) le front PROJETTE sur les 18 `CHAMPS_HASH_MOUVEMENT` dans cet ordre,
absent→null ; le serveur hasherait l'objet entier. (2) `db.stringifierStable` TRIE les
clés ; le front garde l'ordre d'insertion. (3) Format : front =
`JSON.stringify(champs) + '|' + (hashPrecedent||'')` (précédent APRÈS, séparateur `|`) ;
`db` = `hashPrecedent + '\n' + stringifierStable` (précédent AVANT, séparateur `\n`).

→ Pour les MOUVEMENTS, le serveur utilise **`server/hash-mouvement.js`** (clone exact
du front), JAMAIS `db.hashEcriture`. Ce dernier reste bon pour le JOURNAL (chaîne
indépendante, client et serveur n'ont pas à partager ce hash-là). Équivalence
verrouillée par `server/test-hash-mouvement.mjs`.

**Dans / hors empreinte** : DANS = les 18 champs (dont l'objet `controle` entier,
`controleId` inclus après CR-3) + le `hashPrecedent`. HORS = `statut` (clé de la
conception : VALIDE→ANNULE sans casser la signature), `cerfaNumero`,
`signatureDataUrl`, `dateSoumission`, `motifRejet`, `machineLabel`, `ordreValidation`,
`hashPrecedent`/`hashEcriture` eux-mêmes, `proposerDemantelement` (éphémère).

**`sceller`** : la chaîne = écritures figées (VALIDE|ANNULE, `ordreValidation` fini,
triées par `ordreValidation`). `ordreValidation = (dernier?.ordreValidation ?? 0) + 1` ;
`hashPrecedent = dernier?.hashEcriture ?? null` ; `hashEcriture = hasherMouvement(...)`.
Le hash est calculé DANS la transaction de validation, sur l'objet mouvement logique
(avant aplatissement `versSql`).

## Sémantique de transposition (à ne pas trahir)

- **quantiteKg SIGNÉE** (calculée à la validation, `null` au brouillon ; entre dans le
  hash) : `CHARGE_APPOINT`/`MISE_EN_SERVICE`/`TRANSFERT` → `+arrondir(avant−après)` ;
  `RECUPERATION_MAINTENANCE`/`RECUPERATION_DEMANTELEMENT` → `−arrondir(après−avant)`.
  Contre-écriture : `−original.quantiteKg`, pesées PERMUTÉES (avant↔après), bouteilles
  src/dst NON permutées.
- **arrondir** = `Math.round(v*1000)/1000` (au gramme). Arrondir en JS avant écriture,
  jamais en SQL. **Tolérances** : 0,05 (machine vidée → propose démantèlement) ;
  0,01 (écart d'inventaire à justifier) ; 1e-9 (masse BSFF / vidage total) ;
  surcharge machine = `chargeNominaleKg × 1,05`.
- **calculerCadre7** (`generateur.js:126`, famille MAJUSCULES, testée dans l'ordre) :
  HFO (ou mélange contenant HFO) seuils kg 100/10/1 → niveaux 3/2/1 ; HCFC kg 300/30/2 ;
  HFC|PFC en t éq. CO₂ (`charge×gwpAr4/1000`) seuils 500/50/5. Fréquence × détection
  permanente : niv.1 → 24/12 mois ; niv.2 → 12/6 ; niv.3 → 6/3. CO₂/HC → `null`.
  `calculerProchainControle` : `null` si fréquence `null`, sinon
  `ajouterMois(dateControle ?? aujourdHui, frequenceMois)` (débordement fin de mois →
  dernier jour du mois cible).
- **numéros** (`prochainNumero`) : `FI-` si OFFICIEL sinon `FORM-` ;
  `PREF-AAAA(année courante)-NNNN`, NNNN = max du préfixe (toutes années) + 1, sur 4
  chiffres. Compteur GLOBAL par préfixe. Attribué au brouillon, conservé à la
  validation. **En SQL : verrou pour éviter les collisions concurrentes.**
- **CR-3** : à `validerMouvement`, si `machineId` ET `controle.statutControle ∈
  {CONFORME,FUITE}`, créer un VRAI contrôle (`NON_PERIODIQUE`, `DIRECTE`,
  `mouvementId` croisé) AVANT `sceller` ; `controle` devient `{...declare, controleId}`
  (donc dans l'empreinte) ; effets machine dans la même transaction.
- **CODES visibles** testés par regex (`/^M\d+$/`, `/^B-\d{2,}$/`,
  `/^FORM-\d{4}-\d{4}$/`) : générés par COMPTEUR comme le DemoStore, **jamais**
  `db.generateId` (qui fait `PREF-TS36-HEX`). `generateId` ne sert qu'aux `id` internes
  (non testés sur le format).
- **dates** : `aujourdHui()` = date LOCALE `AAAA-MM-JJ` (pas `toISOString` UTC qui
  décale à minuit). Journal et PJ = ISO complet.
- **tris SQL** = sémantique DemoStore exacte : mouvements date puis numéro décroissants ;
  contrôles/BSFF/retours date décroissante ; journal ordre d'insertion.
- **actions du journal** : libellés IDENTIQUES au DemoStore (`CREATION_MACHINE`,
  `VALIDATION_MOUVEMENT`, `CONTRE_ECRITURE`, `SORTIE_BSFF`, `SAISIE_INVENTAIRE`…).
- **amorçage base vierge** : les fluides sont déjà semés par `schema.sql` ; l'API doit
  amorcer un établissement singleton vide à l'init (le contrat lit `getEtablissement`).
- **aplatissement `mouvement.controle`** (divergence E3, `mapping.bloquees`) : aplatir
  vers `statut_controle_declare`/`detecteur_declare_id`/`controle_lie_id` AVANT
  `versSql`, reconstituer en lecture — en UN endroit (api.js). Retirer `controle` de
  `bloquees` seulement quand la reconstitution est prouvée.

## Vagues (ordre d'implémentation, chacune fait avancer test-contrat local)

1. **[MOYEN] Ossature** : transport, routage, `api.appeler`, enveloppe, harnais
   `mkdtemp`, sélecteur, `case 'local'`. Cible : la SURFACE passe (section 1).
2. **[CADRE] Lectures + amorçage** : `getFluides` (R-410A), `getEtablissement`,
   `getEtatRegistre`, `getAlertes`, `getPersonnel`, `getClients`, `getMachines`,
   `getBouteilles`, `getMouvements`, `getControles`, `getOutillage`, `getJournalAudit`.
3. **[CADRE] Personnel + Clients + rôles** : `createPersonne`, `updatePersonne`,
   `desactiverPersonne`, `getUtilisateurCourant`, `createClient`, `updateClient`.
4. **[MOYEN] Machines + Bouteilles** : cycle de vie, codes M{n}/B-NN, invariants.
5. **[DUR] Registre WORM** : `creerMouvement`, `soumettre`, `rejeter`, `supprimer`,
   `validerMouvement`, `annulerParContreEcriture`, `verifierChaineHash`, notifications.
6. **[MOYEN] Contrôles** : `createControle` (FUITE/EN_SERVICE), `calculerProchainControle`.
7. **[MOYEN] Déchets + retours** : `deciderFluideRecupere`, `createBsff`, `getBsff`,
   `retournerFournisseur`, `getRetoursFournisseur`.
8. **[DUR] Balance + synthèses** : `getBalanceMatiere`, `saisirInventaire`,
   `justifierEcart`, `getStats`, `getAnneesDisponibles`, `getBilan`, `peutPasserEnOfficiel`.
9. **[CADRE] Outillage + Dossier opérateur**.
10. **[MOYEN] Pièces jointes** : base64→disque, SHA-256, refus si liée à écriture figée.
11. **[DUR] Export / import** : `exporterJSON` (enveloppe FORMAT_EXPORT),
    `importerJSON` (false illisible / throw forgé / true propre). **FIN : local vert.**

## Risques et parades

1. **Divergence démo/local** → test-contrat seule vérité, reprendre la sémantique
   méthode par méthode, lancer `node test-contrat.mjs demo` puis `local` après chaque
   vague.
2. **Hash serveur** → `server/hash-mouvement.js` (clone), test d'équivalence, scellement
   dans la transaction.
3. **Transactions imbriquées** → une aide unique `muter(fn)` dans api.js ouvre la
   transaction, exécute l'effet, journalise (la ré-entrance de `db.transaction` gère
   `journaliser`). Ne JAMAIS journaliser hors transaction ambiante.
4. **Colonnes générées / codes** → toujours passer par `versSql` (ignore
   `masse_nette_kg`) ; codes visibles par compteur, `generateId` réservé aux id internes.
5. **Aplatissement `controle`** → un seul endroit (api.js), reconstitution prouvée avant
   de débloquer. `categories_2008` : réservé serveur tant que Franck n'a pas tranché.
