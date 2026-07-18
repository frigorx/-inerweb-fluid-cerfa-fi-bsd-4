# Plan du LOT C — double signature réelle + empreinte renforcée + PDF conservé

> **Statut : ✅ PLAN VALIDÉ PAR FRANCK le 16/07/2026 (brique C0 SOLDÉE).** Décision 1 (le
> détenteur) actée explicitement ; décisions 2 à 5 confirmées telles quelles (« ok » du
> 16/07 au soir — appliquer les propositions sans redemander). Conditions 3 et 4 du plan
> audit-proof (`PLAN-AUDIT-PROOF-2026.md`), traitées ENSEMBLE parce que les deux touchent
> le scellement. ⚠️ Ce lot touche `hash-mouvement.js` — la règle de la maison s'applique :
> **plan écrit (fait), migration, tests, AVANT de coder.** Effort MAXIMUM.
>
> Calendrier : août. Le mode Officiel reste fermé (`VERROU_LIVRAISON`) pendant tout le lot ;
> la bascule du verrou est la DERNIÈRE brique, après l'essai complet en données fictives.

## 1. Ce qu'on doit rendre vrai (rappel des conditions)

- **Condition 3** : le technicien PUIS le détenteur signent RÉELLEMENT (personne physique,
  date réelle, déclaration explicite) ; toute modification après la première signature
  invalide les signatures ; une signature illisible n'est jamais ignorée en Officiel.
- **Condition 4** : l'empreinte du mouvement couvre TOUT ce qui est significatif (signatures,
  exécutant réel, PRP figé, n° CERFA, pièces jointes, PDF final) ; le PDF signé est CONSERVÉ
  tel quel (`FI-….pdf` + `.sha256` + manifeste), jamais régénéré.

## 2. DÉCISIONS GATÉES — à trancher par Franck à la relecture

1. ✅ **ACTÉ (Franck, 16/07) — le détenteur et sa signature.** Deux cas :
   - **Équipement du lycée** (le cas courant) : le détenteur = l'ÉTABLISSEMENT (sa raison
     sociale figure comme détenteur au CERFA), et le PROFESSEUR signe **par délégation** —
     il est alors à la fois l'intervenant ET le signataire détenteur. Spécificité assumée du
     lycée : on ne va pas chercher la direction à chaque manipulation. Le parcours DOIT donc
     autoriser signataire technicien = signataire détenteur (une personne, deux signatures,
     pré-remplies).
   - **Intervention pour un tiers** : le détenteur est une personne physique (ou le
     représentant de l'entreprise cliente) qui signe, par délégation de plein droit le cas
     échéant.
   - **Mise en œuvre de la délégation (arbitrage délégué à l'assistant, vérifié sur le
     formulaire)** : le CERFA 15497*04 n'a PAS de case « délégation » — son bloc signature
     détenteur = Nom / **Qualité (texte libre)** / Date. La délégation s'exprime donc, comme
     sur papier, dans la QUALITÉ : `Sign_Detenteur_Nom` = la personne PHYSIQUE (prénom nom,
     plus jamais la raison sociale seule — défaut de l'audit corrigé),
     `Sign_Detenteur_Qualite` = « Professeur, par délégation du détenteur (raison sociale) »,
     `Sign_Detenteur_Date` = la date RÉELLE de signature. Dans le registre : la table
     `signatures_mouvement` porte une case `par_delegation` (booléen) + `organisation` =
     la raison sociale du détenteur représenté — cochée à l'écran de signature, pré-cochée
     pour un équipement du lycée.
2. **Textes exacts des déclarations signées** (affichés au moment de signer, figés dans la
   signature, DANS l'empreinte). Propositions à relire :
   - Technicien : « Je certifie avoir réalisé l'intervention décrite dans cette fiche et
     l'exactitude des informations qu'elle contient. »
   - Détenteur : « Je reconnais la réalisation de l'intervention décrite et l'exactitude des
     informations de cette fiche. » — quand `par_delegation` est cochée, la mention
     « , par délégation du détenteur (raison sociale) » s'ajoute à la déclaration figée
     (arbitrage délégué : la délégation vit dans la qualité ET la déclaration, pas dans une
     retouche du formulaire officiel).
3. **Le PDF final est généré CÔTÉ CLIENT** (navigateur) et transmis au serveur à la
   validation, qui le contrôle (nombres magiques `%PDF`), le fige et le scelle. Le registre
   STRUCTURÉ (la base) reste la vérité des données ; le PDF conservé est la preuve
   documentaire de ce que les signataires ont eu sous les yeux. Note honnête (relecture
   adversariale) : le générateur TOURNE déjà sous Node (ses tests le prouvent, pdf-lib et le
   modèle sont dans `v8/`) — l'alternative serveur est possible ; on l'écarte pour la
   frontière ESM/CommonJS et le couplage du serveur aux modules du front, pas pour un
   doublonnage. À confirmer.
4. **En FORMATION, rien ne change** : signature unique actuelle, pas de PDF conservé, pas de
   double signature (les élèves s'exercent sans friction). Confirmer.
5. **Anti-signature-illisible** : refus si l'image n'est pas un PNG valide (nombres magiques,
   réutilise `signatureConcordeAvecMime` du lot A), trop petite (< 1 Ko) ou vide. Confirmer
   ces trois critères.

## 3. Modèle de données (migration 23 — la prochaine)

- **Nouvelle table `signatures_mouvement`** (WORM par trigger, comme `mouvements`) :
  `id` · `mouvement_id` → mouvements · `role` (TECHNICIEN | DETENTEUR) · `nom` · `prenom` ·
  `qualite` · `organisation` (raison sociale représentée) · `par_delegation` (booléen —
  décision Franck 16/07 : au lycée le professeur signe détenteur par délégation de
  l'établissement) · `date_heure` (ISO réel, PAS la date d'intervention) ·
  `declaration` (texte exact affiché) · `image_png` (contenu, via le canal pièces jointes —
  voir §5) · `session_compte_id` + `session_personnel_id` (identité de session au moment de
  signer, témoin) · `sha256_document` (empreinte de la fiche telle que présentée : hash de
  l'objet logique du mouvement au moment de la signature) · `version_document` (compteur de
  révisions du brouillon, voir invalidation).
- **Colonnes ajoutées à `mouvements`** : `version_empreinte` (1 = historique, 2 = renforcée ;
  DEFAULT 1 pour l'existant) · `revision_brouillon` (compteur incrémenté à chaque modification
  du brouillon — support de l'invalidation des signatures) · les **champs dérivés GELÉS au
  scellement** (voir §6) : `outils_figes`, `hash_signatures`, `hash_pieces_jointes`,
  `hash_pdf_final`.
- ⚠️ Précisions de la relecture adversariale (vérifiées dans le code) :
  - seul le trigger `mouvements_interdire_modification_validee` énumère des colonnes → c'est
    LUI qu'il faut recréer (liste blanche étendue aux nouvelles colonnes) ; `_annulee` et
    `_suppression` sont sans liste, inutile d'y toucher. Un BROUILLON/SOUMIS n'est protégé par
    AUCUN trigger : `revision_brouillon` est compatible.
  - l'incrément de `revision_brouillon` n'est PAS automatique pour les mutations par tables
    ANNEXES : `ajouterPieceJointe`, `supprimerPieceJointe` et les liens d'outils devront
    « bumper » explicitement le compteur du mouvement BROUILLON/SOUMIS concerné.
  - la catégorie `CERFA_FINAL` n'existe PAS dans le CHECK de `pieces_jointes` (15 valeurs,
    migration 10) → la migration 23 RECRÉE la table `pieces_jointes` (procédure de la
    migration 10) pour l'ajouter — sinon échec en Local et acceptation silencieuse en démo.
  - **`mapping.js` est dans le périmètre** (il lève sur toute clé inconnue) : déclarer
    `versionEmpreinte`/`revisionBrouillon`/les champs gelés et la table `signatures_mouvement`
    des deux côtés, sinon import cassé et `test-mapping` rouge.
- ⚠️ Migration IMMUABLE (littéraux figés), `PRAGMA recursive_triggers = ON` — règles de la
  maison.

## 4. Parcours cible (mode OFFICIEL uniquement)

BROUILLON → (simulation de validation OK, lot B) → **signature TECHNICIEN** → **signature
DETENTEUR** → SOUMIS → génération du PDF final (client) → **validation** = réception du PDF +
contrôles + scellement empreinte v2 + conservation du PDF → VALIDE (verrouillé).

- **Invalidation** : toute mutation du mouvement (champs, contrôle, outils, PJ — y compris
  via les tables annexes, bump explicite, cf. §3) incrémente `revision_brouillon` ; une
  signature porte la révision qu'elle a signée ; à la validation, toute signature dont
  `version_document ≠ revision_brouillon` courant → REFUS « fiche modifiée après signature :
  recommencez les signatures ». Les signatures invalidées restent en table (trace), marquées
  obsolètes par comparaison — jamais de suppression.
- **Ordre imposé** : détenteur ne peut signer qu'après le technicien ; la validation exige les
  deux signatures VALIDES (condition 11 du lot B étendue : le moteur `blocage-officiel` gagne
  deux faits `signatureTechnicienValide` / `signatureDetenteurValide` — à ajouter dans les
  DEUX miroirs du moteur, ESM et CommonJS, parité discriminée par `test-blocage-officiel`).
  **La même personne physique PEUT porter les deux signatures** (décision Franck 16/07 :
  au lycée, le professeur intervient ET signe détenteur par délégation — deux gestes
  enchaînés, écran pré-rempli, `par_delegation` pré-cochée pour un équipement du lycée).
- **Garde de rôle** : `signerMouvement` est une MUTATION → entrée OBLIGATOIRE dans
  `ROLES_MUTATION` (une méthode absente y est traitée comme une lecture, donc OUVERTE — piège
  vérifié dans `garderRole`). Proposition : OPERATEUR (l'élève-technicien signe son travail) ;
  rôle du signataire détenteur à trancher à la relecture.
- En FORMATION : parcours actuel inchangé (une seule signature de wizard, facultative ;
  `signatureDataUrl` reste un canal distinct des signatures WORM).

## 5. PDF final conservé — par le canal PIÈCES JOINTES existant

Proposition : le PDF final = une pièce jointe SYSTÈME du mouvement
(`entiteType 'MOUVEMENT'`, `categorie 'CERFA_FINAL'`) — on réutilise TOUT l'existant :
stockage fichier `data/documents/`, contrôle des nombres magiques (lot A), hash SHA-256,
refus de suppression sur mouvement figé (déjà en place), inclusion dans les sauvegardes
(dossier `documents/` déjà archivé) et dans le dossier d'audit.
- En plus : fichier `.sha256` frère + `manifeste.json` (numéro de fiche, date, signataires,
  empreinte du mouvement, version du logiciel) — même esprit que le témoin du lot D.
- Le serveur REFUSE la validation officielle sans PDF reçu, ou si le contenu n'est pas un PDF.
- Aucune régénération : le bouton « CERFA » d'un mouvement officiel VALIDE sert le fichier
  conservé, jamais le générateur.
- ⚠️ Limite à écrire noir sur blanc : **l'export/import JSON ne transporte QUE les
  métadonnées des PJ** (jamais le binaire) — seul le canal ARCHIVE (dossier `documents/`,
  sha256 vérifié à l'archivage) porte les fichiers. Le PDF conservé et les images de
  signature suivent donc les ARCHIVES, pas les exports JSON (comme toutes les PJ
  aujourd'hui). Assumé, à documenter dans SAUVEGARDE.md.
- Durcissement associé : fermer l'asymétrie actuelle — `ajouterPieceJointe` accepte encore
  d'attacher une PJ à un mouvement FIGÉ (la suppression, elle, est déjà refusée) → refus
  symétrique en Officiel comme en Formation.

## 6. Empreinte v2 — le point délicat (touche `hash-mouvement.js`)

- **Principe : VERSIONNER, jamais recalculer.** Les écritures existantes gardent leur
  empreinte v1 pour toujours (cohérent avec « PRP figé non rétroactif »). Les nouvelles
  écritures scellées portent `version_empreinte = 2`.
- **Champs v2** = les 18 champs v1 **+** `prpFige` · `cerfaNumero` · `executeParId` ·
  `superviseurId` · `responsableRegistreId` · `outilsFiges` (liste triée `id=STATUT`, celle
  déjà consignée au journal) · `hashSignatures` (SHA-256 de la liste triée des signatures :
  rôle, nom, prénom, qualité, date_heure, déclaration, sha256 de l'image, version_document) ·
  `hashPiecesJointes` (SHA-256 de la liste triée des sha256 des PJ du mouvement) ·
  `hashPdfFinal` (null en FORMATION).
- **Les champs dérivés sont GELÉS, jamais re-dérivés** : `outilsFiges`, `hashSignatures`,
  `hashPiecesJointes`, `hashPdfFinal` sont CALCULÉS au scellement, ATTACHÉS à l'objet avant
  `sceller()`, STOCKÉS en colonnes (protégées par la liste blanche du trigger WORM) — la
  vérification de chaîne relit les valeurs stockées. Sans cela, tout ajout légitime ultérieur
  (une PJ sur un mouvement figé, aujourd'hui possible) casserait la chaîne (constat de la
  relecture adversariale).
- **Vérification mixte** : exactement TROIS hasseurs deviennent « version-aware » —
  `verifierChaineMouvements` (serveur), son miroir démo, et
  `verifierChaineMouvementsCandidat` (import). Le vérificateur autonome des dossiers ZIP
  n'est PAS concerné (vérifié : il contrôle des empreintes de FICHIERS, il ne hache aucun
  mouvement). La chaîne reste UNE seule chaîne (le `hashPrecedent` traverse les versions).
- ⚠️ **Ordre du figeage — serveur seulement** : au serveur, `validerMouvement` appelle
  `sceller()` PUIS fige les outils ; la DÉMO fige déjà AVANT. Le réordonnancement est donc
  une modification serveur uniquement (parité d'empreinte v2 sinon rompue). Et au serveur il
  y a DEUX points à étendre (le front n'en a qu'un) : `CHAMPS_HASH_MOUVEMENT` ET la
  projection `objetLogiquePourHash` (liste blanche qui droppe silencieusement tout champ non
  déclaré).
- **Parité** : `utils.js` (front) et `hash-mouvement.js` (serveur) évoluent ENSEMBLE,
  `test-hash-mouvement` étendu (v1 inchangé bit à bit — preuve de non-régression sur des
  empreintes CONNUES figées dans le test —, v2 identique des deux côtés, chaînes mixtes).
- **Export/import** : l'export JSON porte `versionEmpreinte` par mouvement ; l'import vérifie
  la chaîne mixte ; un export ANCIEN (sans le champ) = tout v1. Round-trip démo ↔ local prouvé.
- **Démo** : le DemoStore implémente le même parcours v2 (parité du contrat) — les signatures
  vivent dans `donnees.signaturesMouvement`, le « PDF conservé » démo reste en mémoire/PJ.

## 7. Ordre des briques (une brique = code + tests verts + commit)

1. ✅ **C0 — GATE SOLDÉE (16/07)** : plan relu et validé par Franck (les 5 décisions du §2
   sont tranchées). La brique C1 peut se coder directement.
2. ✅ **C1 — SOLDÉE (18/07)** — Modèle + signatures : migration 23 (COMPLÈTE pour le lot,
   champs gelés C2-C3 et catégorie CERFA_FINAL compris), table WORM (3 triggers), contrat
   78 → 80 (`signerMouvement`/`getSignaturesMouvement`, VERSION 5), invalidation par
   révision (rejet + PJ ajoutée/retirée, bumps explicites), critères d'illisibilité
   (module pur `signatures-mouvement.js` + miroir), moteur enrichi (faits tri-état,
   conditions 14-15 de la liste). Preuves : `test-signatures-mouvement` (37 vérifs,
   attaques tirées + WORM SQL direct + round-trip) + blocs test-contrat (demo ET local)
   + test-blocage-officiel étendu. TOUT VERT — 78 exécutions. Détail : CHANGELOG.
3. ✅ **C2 — SOLDÉE (18/07)** — Empreinte v2 : hasseurs front/serveur VERSIONNÉS (v1 figée
   à jamais, v2 = 27 champs), champs gelés calculés au scellement et relus tels quels,
   figeage serveur réordonné avant sceller(), contre-écritures v2 listes vides, import qui
   recompte les signatures gelées (« fichier forgé »), chaîne mixte v1→v2 prouvée de bout
   en bout + round-trip. ⚠️ ÉCART AU PLAN documenté : QUATRE vérificateurs versionnés, pas
   trois — `server/verification.js` (archives du coffre-fort) hache aussi les mouvements ;
   sans lui, la première écriture v2 invalidait toutes les sauvegardes vérifiées. Preuves :
   test-hash-mouvement 32 vérifs (empreintes v1/v2 CONNUES figées en dur),
   test-signatures-mouvement 50 vérifs, test-prp-fige (simulation « vieil export »
   refaite en vrai fichier d'époque). TOUT VERT — 78 exécutions. Détail : CHANGELOG.
4. **C3 — PDF final conservé** : réception à la validation, PJ système + `.sha256` +
   manifeste, `hashPdfFinal` dans l'empreinte v2, bouton CERFA servant le conservé, dossier
   d'audit enrichi. Tests + attaque (PDF altéré sur disque → sha divergent détecté).
   ⚠️ **Ajout de la revue adversariale C2 (constat tiré, MINEUR car documenté)** : tant que
   l'asymétrie des PJ est ouverte, une PJ CERFA_FINAL truquée dans un export (hashSha256 et
   nomFichier réécrits) est ADOPTÉE sans casser la chaîne — hashPiecesJointes est relu tel
   quel et l'import ne recompte pas les PJ. C3 DOIT donc : ① fermer l'asymétrie (plus
   d'ajout de PJ sur mouvement figé) ; ② à l'import, RECOMPTER hashPiecesJointes des
   écritures v2 (redevenu sain une fois ① fait) — ou a minima celui des CERFA_FINAL ;
   ③ l'attaque « CERFA truquée dans l'export » devient un test permanent.
5. **C4 — Parcours UI officiel** : écrans de signature (technicien puis détenteur,
   déclarations affichées, identité de session), simulation du lot B intégrée au parcours.
   Vérification navigateur (port jetable).
6. **C5 — BASCULE** : essai complet en données fictives (parcours officiel de bout en bout),
   puis `VERROU_LIVRAISON = false` (2 miroirs) + suite e2e officielle activée + relecture
   finale de la liste du lot B par Franck. Ensuite : simulation d'audit fin août.

## 8. Attaques à tirer (preuves exigées, pas seulement des tests verts)

- Modifier un champ (pesée, cause, contrôle, outil, PJ) après la signature du technicien →
  la validation refuse (revision divergente) — via vrai HTTP.
- Signer détenteur avant technicien → refus. Signature PNG forgée (HTML renommé) → refus.
- Valider sans PDF, ou avec un faux PDF (pas de `%PDF`) → refus.
- Altérer le PDF conservé sur disque → `.sha256` + empreinte v2 le dénoncent (vérificateur).
- Éditer une signature en SQL direct → trigger WORM refuse.
- Export → import d'une base MIXTE v1/v2 → chaîne verte ; export altéré (signature retouchée
  dans le JSON) → « fichier forgé ».

## 9. Ce qui ne doit PAS bouger (garanties à préserver)

- Empreintes v1 existantes : identiques bit à bit (test à empreintes figées).
- Mode FORMATION : zéro friction ajoutée, parcours actuel intact.
- Contre-écriture : inchangée. « Signée par le validateur de session » = attestation
  d'IDENTITÉ (exigence du lot B), pas un artefact de signature : elle scellera en v2 avec
  `hashSignatures`/`hashPiecesJointes` sur listes VIDES et `hashPdfFinal` null, sans passer
  par le parcours de double signature (cohérent avec le code vérifié). À CONFIRMER à la
  relecture.
- WORM, `recursive_triggers`, parité DemoStore/LocalStore, corps API `{params:{…}}`,
  « une faille se prouve en la TIRANT ».
