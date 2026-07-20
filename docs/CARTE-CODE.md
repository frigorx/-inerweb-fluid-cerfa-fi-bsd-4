# CARTE DU CODE — inerWeb Fluide v8/v9

> **À lire AVANT toute exploration** (doctrine sobriété tokens, 14/07/2026).
> Elle remplace 90 % des grep/lectures. Mise à jour : une ligne par module
> ajouté/retiré, à CHAQUE incrément (comme le CHANGELOG).

## Architecture en une phrase

Front vanilla ES modules sous `v8/` (démo navigateur OU client du serveur
local), serveur Node CommonJS sous `server/` (SQLite `node:sqlite`, port
2011) ; les DEUX implémentent le MÊME contrat `v8/js/data/contrat.js`
(87 méthodes, `VERSION_CONTRAT` 7) prouvé par `test-contrat.mjs` joué
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
| `serveur.js` | HTTP loopback ; LAN si `IWF_LAN=1` = **HTTPS OBLIGATOIRE** (IWF_TLS_CERT/KEY, TLS ≥ 1.2, HSTS, refus de démarrer sans certificat — P1-5, test-lan-https) ; routage `/api/:methode`, statique `/v8/` | garde Host+Origin (CSRF/rebinding) obligatoire ; **lot A : TOUTE lecture exige une session (loopback compris), seuls ping + routes d'amorçage de routes-comptes passent sans** ; CSP servie en en-tête (`frame-ancestors 'none'`) |
| `api.js` (~5000 l.) | LE dispatcher : un handler par méthode du contrat, `muter()` = transaction, `ROLES_MUTATION` | sémantique = copie EXACTE du DemoStore ; rôle jamais lu du corps ; **lot E ① : `ROLES_LECTURE_SENSIBLE` (lectures gatées par rôle) consulté par `garderRole` après `ROLES_MUTATION` — `exporterDonneesPersonne` = VALIDEUR** |
| `export-personne.js` | miroir littéral de l'assemblage de l'export RGPD d'une personne (lot E ①) | parité prouvée par `test-export-personne.mjs` ; handler serveur = composition des getters existants + signatures brutes mappées ; personne AU COFFRE → signatures substituées par le pseudonyme |
| `coffre-identites.js` | miroir littéral des règles pures du COFFRE DES IDENTITÉS (lot E2) | parité prouvée par `test-coffre-identites.mjs` ; api.js porte les 6 gestes (REFERENT/ADMIN + poste local), le témoin GCM, l'archive préalable OBLIGATOIRE, la purge rattrapée au démarrage (`rejouerPurgeCoffre`), les verrous de fiche au coffre (updatePersonne/PJ/désactivation/habilitations/mentions) et le transport export/import du coffre (E2c : coffreConfig sel/témoin/kdf + compteurs + enveloppes base64, remplacement atomique, simulation rejetée, refus protecteur si fichier sans coffre sur poste au coffre) ; primitives crypto = `chiffrement.js` (enveloppes de champ autoportantes, scrypt N=131072) |
| `db.js` | ouverture PRAGMA coffre-fort, `journaliser()` SHA-256 CHAÎNÉ, transaction ré-entrante | `recursive_triggers=ON` VITAL (anti-REPLACE) |
| `migrations.js` | registre 2→26, transactionnel, consécutif ; exporte `FICHE_REGLEMENTAIRE_FLUIDES` (table validée, consommée par la migration 21 ET l'import JSON d'api.js) | JAMAIS de DROP destructif ; trigger WORM à recréer si colonne mouvements ajoutée ; registre-commentaire en tête à tenir ; **24 (C5) = WORM pieces_jointes d'un mouvement figé — à recréer si la table est recréée (procédure migration 10, fait par la 26)** ; **25-26 (E2b) = tables du coffre des identités + entités de PJ élargies (personne/OUTIL, bug préexistant)** |
| `schema.sql` | socle v1 SEUL (les évolutions = migrations) | ne jamais l'éditer pour une évolution |
| `mapping.js` | correspondance UNIQUE front(camel)↔SQL(snake), `CHAMPS_HASH_MOUVEMENT` = liste blanche du hasseur | toute colonne hors empreinte reste HORS de cette liste |
| `hash-mouvement.js` | clone EXACT du hasseur front — VERSIONNÉ (lot C, C2) : v1 (18 champs) FIGÉE À JAMAIS, v2 = +9 champs (PRP figé, CERFA, rôles, champs gelés) ; aides empreinteListeTriee / chaineCanoniqueSignature | ne jamais utiliser db.hashEcriture pour les mouvements ; QUATRE vérificateurs versionnés (api ×2 + démo + verification.js) ; empreintes CONNUES figées dans test-hash-mouvement |
| `blocage-officiel.js` | miroir littéral du moteur de blocage OFFICIEL (lot B) | **verrou REFERMÉ le 20/07 (T1, audit externe #2)** : `VERROU_LIVRAISON = true` ICI + côté ESM, nulle part ailleurs, NON configurable par l'env (rebasculer à `false` rouvre) ; ouvert le 19/07 (C5) puis refermé le temps des P0 ; api.js ajoute sauvegarde du poste + validateur de session (tous modes, 403) au cadre |
| `signatures-mouvement.js` | miroir littéral des signatures RÉELLES (lot C, C1) : déclarations figées + critères d'illisibilité | parité prouvée par test-signatures-mouvement ; ne jamais toucher un miroir sans l'autre |
| `pdf-final.js` | miroir littéral du PDF FINAL conservé (lot C, C3a) : messages canoniques + contrôle %PDF/5 Mo + nom `CERFA-<numéro>.pdf` | parité prouvée par test-signatures-mouvement ; la conservation = `conserverPdfFinal` d'api.js (PJ système CERFA_FINAL, SANS bump de révision) ; C3b : témoins `.sha256`+`.manifeste.json` frères (`ecrireTemoinsPdfFinal`, best-effort hors transaction) + `verifierPdfFinalConserve` (pluralité dénoncée) + RÉGÉNÉRATION des témoins manquants au démarrage (`reecrireTemoinsPdfFinalManquants`, jamais d'écrasement — la restauration d'archive ne transporte pas les frères) ; C3c : asymétrie FERMÉE (ajouterPieceJointe refuse figé + catégorie réservée), l'import RECOMPTE hashPiecesJointes des v2 + garde « CERFA_FINAL hors canal système » ; C5 : trigger WORM pieces_jointes POSÉ (migration 24) + `verifierTousPdfFinalConserves` joué au démarrage par serveur.js (anomalie journalisée PDF_FINAL_ANOMALIE, best-effort par écriture) |
| `comptes.js` / `sessions.js` / `routes-comptes.js` | scrypt **N=2^17** (OWASP, P2-3)+NFC+leurre anti-timing, jetons hachés SHA-256, cookie HttpOnly | message d'échec UNIQUE ; session meurt si compte désactivé ; ancien profil N=2^15 accepté puis RE-HACHÉ à la connexion (journal `RENFORCEMENT_HASH_MOT_DE_PASSE`) ; chiffrement.js garde N=2^15 (archives existantes) |
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
| `contrat.js` | LA vérité de surface : 87 méthodes documentées, messages canoniques |
| `demo-store.js` (~4000 l.) | implémentation mémoire complète (référence sémantique) |
| `local-store.js` | enveloppes 1-pour-1 vers l'API (ajouter CHAQUE nouvelle méthode ici) ; SEULE adaptation : le contenu binaire des PJ (base64 à l'aller, Blob au retour) |
| `contenu-pj.js` | pur : contenu binaire des pièces jointes (`versBase64`/`versBlob`) — JSON réduit un Blob à `{}`, d'où 9 octets de déchet enregistrés comme preuve avant le 14/07 ; **lot A : `signatureConcordeAvecMime` = contrôle des nombres magiques (PDF/PNG/JPEG/WebP), miroir littéral dans `api.js`, appelé par `ajouterPieceJointe` des deux côtés** |
| `datastore.js` | fabrique : choisit DemoStore ou LocalStore selon que le serveur répond |
| `demo-donnees.js` | le monde fictif de la Démo (données seules, aucune règle) |
| `transport-http.js` | transport `fetch` du LocalStore (`POST /api/:methode`, enveloppe `{ok,resultat}`) |
| `code-machine.js` | pur : code lisible SITE-FAMILLE-NUMÉRO (JR-CF-001), générateur/validation |
| `habilitations.js` | pur : moteur de conseil B2 (`verifierDroitIntervention`, matrice 2008+2025) |
| `reglementation-fluides.js` | pur : MOTEUR RÉGLEMENTAIRE UNIQUE cadre 7 (`categorieCadre7` + `evaluerControle`) — source de vérité des seuils/fréquences F-Gas (règles A/B/C, `docs/TABLE-REGLEMENTAIRE-FLUIDES.md`), consommé par plaque-fgas/generateur/demo-store, copié en littéral côté serveur (`api.js` `frequenceControleMois`). Charge NOMINALE, HFC avant HFO ; fiche EXPLICITE par fluide prioritaire (`categorieCadre7`, migration 21, AUCUNE = hors périmètre) ; `dateIntervention` optionnelle (HFO purs contrôlés depuis le 11/03/2024 seulement) |
| `blocage-officiel.js` | pur : moteur de blocage du mode OFFICIEL (lot B) — `evaluerBlocagesOfficiel(cadre)` applique la liste de `docs/CONDITIONS-BLOCANTES-OFFICIEL.md` filtrée par moment (PASSAGE/SOUMISSION/VALIDATION), `VERROU_LIVRAISON` ferme le mode jusqu'aux lots C-D ; branché aux 3 moments des deux stores + `simulerValidationOfficielle` (contrat) ; conditions 14-15 (lot C) = faits tri-état signatureTechnicienValide/signatureDetenteurValide ; P7-c : `MSG_CONTROLE_DIRECT_OFFICIEL` = refus STRUCTUREL de `createControle` en OFFICIEL (FORMATION-only par nature, l'officiel = mouvement type CONTROLE) |
| `signatures-mouvement.js` | pur : signatures RÉELLES (lot C, C1) — déclarations signées EXACTES (`declarationSignature`, délégation dans la qualité ET la déclaration) + critères d'illisibilité (`verifierImageSignature` : PNG réel, ≥ 1 Ko, ≤ 1 Mo) ; consommé par signerMouvement des deux stores, recopié en littéral côté serveur |
| `pdf-final.js` | pur : PDF FINAL conservé (lot C, C3a) — messages canoniques de refus + `verifierOctetsPdfFinal` (%PDF, 5 Mo) + `nomFichierPdfFinal` ; C5 : `pdfFinalAttendu(type)` = exemption TRANSFERT (jamais de CERFA, IM-12 — PDF fourni refusé) ; consommé par validerMouvement des deux stores (3e param `pdfFinalBase64`, OBLIGATOIRE en OFFICIEL hors transfert, refusé en FORMATION), recopié en littéral côté serveur |
| `parcours-signature.js` | pur : décisions de l'écran de double signature (lot C, C4) — `etatParcoursSignatures` (tri-état par rôle, signature retenue, prêt pour soumission) + `preremplirSignature` (équipement du lycée = professeur PAR DÉLÉGATION pré-cochée) ; consommé par la modale ET le générateur CERFA |
| `export-personne.js` | pur : assemble l'export RGPD des données d'UNE personne (lot E ①, `assemblerExportPersonne`) — accès/portabilité, SANS binaire ni journal ; recopié en littéral côté serveur ; `exporterDonneesPersonne` compose les getters existants dans les deux stores |
| `coffre-identites.js` | pur : règles du COFFRE DES IDENTITÉS (lot E2) — messages canoniques, AAD, pseudonymes « Élève AAAA-NN », éligibilité (élève désactivé), pseudonymisation/restauration bit à bit, `libelleIntervenant` (substitution par identifiant via la fiche vivante) ; le DemoStore SIMULE (enveloppes balisées `SIMULATION-COFFRE`, phrase d'exercice en mémoire de session seulement, jamais persistée) |
| `feu-tricolore.js` | pur : consolide alertes/officiel/chaîne en 7 domaines VERT/ORANGE/ROUGE (`collecterConformite(store)`) |
| `audit-guide.js` | pur : parcours d'audit en 9 étapes ordonnées (alertes par préfixe + faits de présence, `collecterAuditGuide(store)`) |
| `filtre-mouvements.js` | pur : filtres de la vue Mouvements (index cherchable sans accents, correspondance, options présentes) |
| `dossiers-fuite.js` | pur : dossiers de fuite reconstruits des contrôles (épisodes, OUVERTE/REPAREE/FERMEE) |
| `sentinelle.js` | pur : historisation temporelle des alertes (épisodes, acquittement) |
| `vie-bouteille.js` | pur : chronologie d'une bouteille (mouvements appariés) |

## v8/js/ (le reste)

- `views/` : une vue par écran (routeur hash `#/vue` ; fiches paramétrées
  `#/m|b|cl|o|f/<code>`). `communs.js` = modale/toast/enteteVue/carteKpi.
  `rgpd.js` (lot E ③ + E2d) = notice d'information RGPD (art. 13/14) +
  SECTION OPÉRATIONNELLE du coffre des identités (compteur, candidats
  pré-cochés, les 5 gestes en modales, bandeau démo) ; entrée de menu
  « Protection des données » (`app.js` VUES). Badge « au coffre » dans
  `personnel.js`, verrou d'écran dans `personne-form.js`, substitution par
  identifiant dans `mouvements.js` (modale + index de recherche,
  `indexerMouvement` 3e param) et `documents/exports.js` (CSV).
- `modales/` : formulaires (piège historique : jamais de sélecteur global
  `.modale` — `modale()` retourne sa racine). `signatures-modal.js`
  (lot C C4) = parcours de double signature d'un BROUILLON (bouton
  « Signatures » de la vue Mouvements, les deux modes) + panneau partagé
  `remplirSimulationOfficielle` ; le store reste seul juge.
- `wizard/` : les 6 étapes du mouvement (~1800 l.) + signature canvas
  (`creerSignature(conteneur, libelle?)`, libellé par défaut inchangé).
  P7-d2 : carte « Contrôle d'étanchéité » (6ᵉ, interrupteur non
  périodique) = parcours « sec » — étapes 3-4 « Sans objet » SAUTÉES
  aller/retour, « Sans objet » retiré de l'étape 5, pesées null.
  C5 : choix du MODE à l'étape 6 (`etat.modeFiche`, Formation par défaut,
  Officiel si `peutPasserEnOfficiel().ok` et store non-démo) ; en OFFICIEL
  la finalisation s'arrête au BROUILLON (signatures d'abord) ; le mode
  d'une écriture déjà créée est FIGÉ ; reprise = mode conservé,
  rétrogradation signalée.
- `cerfa/` : `generateur.js` (72 champs, `calculerChampsCerfa` = vérité ;
  lot C C4 : inscrit les signatures RÉELLES valides — personne physique,
  qualité, date réelle, tracés — et `genererPdfFinalBase64` = PDF FINAL de
  la validation officielle, option `accepterSoumis` RÉSERVÉE à ce canal,
  SANS tolérance : deux signatures valides exigées, erreurs propagées),
  `correction.js` (correction copie élève — TOUJOURS les blocs de
  signature historiques, `sansSignaturesReelles`), `visualiseur.js` (PDF.js),
  `conserve.js` (lot C C3b : sert le PDF CONSERVÉ d'une fiche officielle
  figée — les DEUX portes, mouvement ET contrôle lié —, empreinte vérifiée
  contre `hashPdfFinal` scellé, jamais le générateur, jamais de repli).
- `documents/` : étiquettes QR, dossiers ZIP scellés SHA-256 (`dossier-commun.js`),
  `exports.js` (tous les CSV du dossier d'audit), `verificateur.js`
  (99-VERIFICATEUR.html embarqué), `plaque-fgas.js` (seuils tCO₂eq 5/50/500).
  C5 (`dossier-audit.js`) : fiche officielle scellée → PDF CONSERVÉ
  restitué (jamais régénéré), verdicts `02-PDF-CONSERVES.txt`, contrôle
  lié conservé sauté, TRANSFERT exclu de la boucle CERFA.
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
