# PLAN B3 — NE PLUS MENTIR SUR UNE SIGNATURE

> **Écrit APRÈS le code, et il faut le dire.** Les plans P0-5, P0-6, P0-8 et
> P1-2 ont tous été écrits AVANT leur lot. Celui-ci ne l'a pas été : le lot B3
> est parti d'un constat d'audit tiré un soir, et il a été codé dans la foulée.
> La revue adversariale du 25/07 (constat IMPORTANT 6) a relevé l'absence :
> huit fois le code et le CHANGELOG invoquaient « DÉCISION DU PROPRIÉTAIRE
> (25/07) », et rien dans le dépôt ne permettait de les vérifier ni de refaire
> les mesures citées. Ce document répare cela.
>
> **Statut : lot RÉALISÉ (5 briques), revue adversariale PASSÉE et soldée.**
> Filet **TOUT VERT, 111 exécutions**. Aucune migration, aucune condition
> bloquante nouvelle du mode Officiel, verrou de livraison **FERMÉ**, empreintes
> intouchées.
>
> **UN POINT RESTE GATÉ (voir §6) : `MSG_ZONE_VIERGE` est un refus NOUVEAU à la
> pose.** Il ne bloque aucune écriture existante et n'entre pas dans le moteur
> Officiel, mais c'est un geste que l'élève ne pouvait pas se voir refuser
> hier. Il attend le visa explicite du propriétaire.

---

## 1. Origine du lot

**Constat A04 de l'audit externe du 25/07**, tiré et confirmé par contre-épreuve
avant d'écrire une ligne de code.

Le logiciel ne regardait pas les signatures : il regardait leur **taille**.
`verifierImageSignature` comparait les 8 premiers octets aux nombres magiques
PNG, puis la seule LONGUEUR du tampon à deux bornes (1 Ko / 1 Mo). Un bloc de
**2 348 octets** fait de ces 8 octets suivis d'une phrase en clair répétée était
donc **ACCEPTÉ** par `signerMouvement`, côté serveur ET côté DemoStore, pour les
deux rôles.

Et ce n'était pas cosmétique. Les faits `signatureTechnicienValide` /
`signatureDetenteurValide` passaient à `true`, donc **les conditions bloquantes
14 et 15 du moteur Officiel disparaissaient** (`docs/CONDITIONS-BLOCANTES-OFFICIEL.md`,
lignes 38-39). Autrement dit : les deux conditions censées garantir qu'une fiche
est signée étaient satisfaites par un fichier qui n'est pas une image.

Le second visage du même mensonge a été trouvé en codant le premier : même avec
un vrai décodeur, **un PNG parfaitement valide mais entièrement blanc** passait.
C'était le seul endroit du logiciel où il DISAIT quelque chose de faux —
« signature valide » sur une case blanche.

---

## 2. État de départ, vérifié dans le code (pas de mémoire, pas de suppositions)

| Fait | Preuve |
|---|---|
| Le contrôle d'image tenait en trois lignes : 8 octets magiques + deux bornes de taille | `signatures-mouvement.js` avant le lot (commit `c32f8c0`) |
| Le dépôt n'a **aucune dépendance tierce** — donc aucun décodeur PNG disponible : il n'y a ni `package.json` ni `node_modules` dans tout le dépôt | `find . -name package.json` = vide |
| `verifierImageSignature` n'était appelée **qu'à la POSE** | grep des appelants avant le lot, api.js + demo-store.js. ⚠️ **C'est l'état de DÉPART, plus l'état d'arrivée** : la revue a exigé de fermer la porte IMPORT, et le contrôle est désormais rejoué à chaque **LECTURE** (§ 6). Cette ligne a servi de preuve à une affirmation devenue fausse — un grep ne prouve que le passé. |
| Les conditions 14/15 du mode Officiel reposent entièrement sur ces faits | `docs/CONDITIONS-BLOCANTES-OFFICIEL.md:38-39` |
| Le canvas du wizard peignait lui-même son fond blanc et sa ligne de base pointillée **dans** le canvas | `v8/js/wizard/signature.js` avant le lot |
| Le témoin d'identité de session (compte + fiche liée) est capté et stocké **depuis la brique C1**, et affiché **nulle part** | colonnes `session_compte_id` / `session_personnel_id` |
| Le dossier d'audit scellé ne contenait **aucun** fichier de signatures | `v8/js/documents/exports.js`, 13 fichiers fixes |
| Les fixtures des suites fabriquaient de **FAUX** PNG et les faisaient accepter | contre-épreuve CE2 de la revue : retour aux 8 octets magiques → 14 échecs |

Ce dernier point est le piège payé le plus cher du lot : **le filet vert
attestait le comportement défaillant**. Une fabrique de VRAIS PNG
(`server/fabrique-png-test.mjs`) a dû être écrite et branchée sur les quatre
suites concernées avant de pouvoir prouver quoi que ce soit.

---

## 3. Les décisions du propriétaire (25/07)

Les trois décisions ont été prises en séance, à l'oral. Elles sont reproduites
ici avec les mots employés, parce que c'est ce qui fait foi — et parce que deux
d'entre elles vont à l'encontre de ce qu'un développeur mettrait spontanément.

### D1 — Deux signatures posées depuis une MÊME session sont NORMALES

> « que ce soit la même personne ou une autre, c'est pas grave ; il faut que
> les deux cases soient signées »

**Aucun message, aucun avertissement, aucun blocage, aucune comparaison de
sessions.** Au lycée, le professeur signe détenteur PAR DÉLÉGATION pendant que
l'élève signe technicien : la même session pose légitimement les deux. Un
logiciel qui crierait « signatures suspectes » dans ce cas serait un logiciel
qu'on apprend à ignorer.

Conséquence de code : le témoin de session est **affiché**, il n'est jamais
**jugé**. Les tests vérifient explicitement cette ABSENCE
(`v8/js/modales/test-signatures-modal.mjs`, section 2 : aucun bandeau, aucun mot
de suspicion à l'écran).

### D2 — AUCUN seuil d'encre

> « il essaye, ça marche ça marche ; c'est le signataire qui a le pouvoir de
> valider ou non sa signature »

Pas de pourcentage de pixels noircis, pas d'étendue minimale, pas de boîte
englobante, pas de « tracé douteux ». **Une griffure de deux pixels doit
passer.** La frontière est « rien du tout » contre « quelque chose », et rien
d'autre.

C'est une décision de fond, pas un réglage : c'est le signataire qui juge son
tracé, pas le logiciel. Un seuil, même bas, ferait refuser des signatures
d'élèves maladroits ou pressés — et pousserait à signer « plus fort » pour
plaire à la machine, ce qui n'a aucun sens probatoire.

Corollaire, et il est important : **sur un format que l'on ne sait pas relire**
(entrelacé Adam7, profondeur < 8 bits, flux zlib illisible, surface déclarée
> 32 Mo), `analyseEncre` répond `INDETERMINABLE` et l'image **passe**. On ne
conclut JAMAIS au vide sur un doute. Ici, refuser SERAIT l'allègement du
logiciel : il se débarrasserait d'un cas qu'il ne sait pas traiter en le faisant
porter au signataire.

### D3 — Nom du technicien pré-rempli depuis la session, et MODIFIABLE

Le nom du technicien est pré-rempli depuis la session connectée (ou depuis
l'intervenant DÉCLARÉ de la fiche s'il y en a un — c'est la fiche qui dit qui a
fait le geste), et le champ **reste saisissable** : jamais `readonly`, jamais
`disabled`.

Le témoin de session (compte connecté + fiche du personnel liée) est **porté à
la fiche** (modale des signatures) et **au dossier d'audit** (`signatures.csv`).
Il ne suffisait plus de le stocker sans jamais le montrer : on jetait une preuve
qu'on possédait déjà.

Vérifié à l'écran, pas seulement dans le module pur :
`v8/js/modales/test-signatures-modal.mjs`, section 4.

---

## 4. Le RETRAIT de la borne de 1 Ko

La borne basse de 1 Ko était consignée comme une **décision antérieure** (§2.5
du plan du lot C). On ne retire pas une décision consignée sur une intuition.

**Pourquoi elle tombe : elle ne séparait RIEN.**

### La mesure, et comment la refaire

    node outils/test-taille-signature.mjs

Le script encode les six états réels de la zone de signature du wizard
(1400 × 700 RGBA, la résolution ×2 de l'écran de saisie) et publie leur poids.
C'est une **suite du filet**, pas un script de coin de table : un outil de
mesure que personne ne relance pourrit en silence, et la mesure redevient
invérifiable — exactement le reproche de la revue.

| Poids | État de la zone de signature |
|---:|---|
| 3 879 o | zone **JAMAIS TOUCHÉE** (canvas transparent — ce que le wizard produit depuis la brique 4) |
| 5 506 o | zone **blanche unie** (l'ancien canvas, qui peignait son propre fond) |
| 3 893 o | **griffure de deux pixels** sur canvas transparent |
| 5 517 o | **griffure de deux pixels** sur fond blanc |
| 4 892 o | **un seul trait** (paraphe) sur canvas transparent |
| 6 559 o | **un seul trait** (paraphe) sur fond blanc |

Deux faits en sortent, tous deux **vérifiés à chaque exécution du filet** :

1. **La borne de 1 Ko n'a jamais refusé une seule case blanche.** La zone jamais
   touchée pèse déjà 3 879 octets. Elle donnait la sensation d'un contrôle sans
   en être un — le pire état pour une garde.
2. **Les deux populations se CHEVAUCHENT** : le plus lourd des fichiers vides
   (5 506 o) est plus lourd que le plus léger des fichiers signés (3 893 o).
   Aucun seuil, où qu'on le place, ne sépare « rien » de « quelque chose » : il
   refuserait de vraies signatures, ou accepterait de vraies cases blanches.

Une troisième vérification, dans la même suite, montre que le **décodage**, lui,
tranche les six cas sans se tromper.

### Honnêteté sur les chiffres

L'encodeur PNG d'un navigateur n'est pas `node:zlib` : les valeurs **absolues**
d'un vrai `canvas.toDataURL()` diffèrent. Les chiffres cités dans l'entrée
CHANGELOG du lot (5 562 / 5 509 / 6 518 / 5 584 o) avaient été mesurés sur fond
blanc, avec un autre réglage, et ne sont pas ceux de ce tableau. **Les chiffres
qui font foi sont ceux que la suite produit**, parce qu'ils sont les seuls qu'un
tiers puisse refaire.

Ce qui se transporte d'un encodeur à l'autre — et qui est le seul point en cause
— c'est le **chevauchement**, pas la valeur.

### Ce qui NE tombe pas

Le **plafond de 1 Mo reste**, et il est contrôlé **AVANT** décodage : on ne
décode pas ce qu'on refuse de tenir en mémoire. C'est une garde de ressource,
pas un jugement sur le tracé. De même, le plafond défensif de surface
décompressée (32 Mo) protège de la bombe de décompression — et il répond
`INDETERMINABLE`, jamais un refus.

---

## 5. Ce qui a été fait (5 briques + revue)

| # | Brique | Commit |
|---|---|---|
| 1 | **Lire VRAIMENT une image PNG** : module pur `v8/js/data/png.js` + miroir `server/png.js`. En-tête, chaîne des chunks, **CRC-32 de chacun**, IHDR cohérent, IDAT présent, IEND final, rien après — puis les PIXELS, par une décompression zlib/DEFLATE (RFC 1950/1951) et un dé-filtrage des 5 filtres PNG **écrits à la main** : le dépôt n'a aucune dépendance tierce et n'en prend pas pour cela. | `7bb3556` |
| 2 | **L'image est décodée, plus reconnue à 8 octets** : `verifierImageSignature` passe par le décodeur, des deux côtés. Le bloc A04 est refusé. | `d70a996` |
| 3 | **Refuser le VIDE ABSOLU, et rien de plus** : une image rigoureusement uniforme est refusée (`MSG_ZONE_VIERGE`). Borne de 1 Ko retirée (§4). | `71eb70e` |
| 4 | **Le canvas n'exporte plus que le tracé** : le décor (fond blanc, ligne de base) passe en CSS, DERRIÈRE le canvas. Une case jamais touchée produisait sinon une image à deux couleurs, donc « non vide ». Aucun changement visible à l'écran. | `35c2545` |
| 5 | **Le témoin de session est porté à la fiche et au dossier** (décision D3) : modale + `signatures.csv` (conditionnel). Les signatures, pièce la plus probante du registre, n'étaient dans AUCUN fichier du dossier scellé. | `2544577` |

### Ce que la revue adversariale a trouvé, et ce qui a été fait

| Constat | Correctif |
|---|---|
| **La porte IMPORT n'était pas gardée** : on exportait, on remplaçait l'image des signatures par le bloc A04, on réimportait — les conditions 14/15 disparaissaient à nouveau. 3ᵉ occurrence dans ce dépôt du motif « une garde sur une porte ». | `2bdc222` — plutôt qu'une Nᵉ garde sur une Nᵉ porte, **la validité elle-même devient honnête** : une signature dont l'image est illisible n'est pas une signature « périmée », ce n'est pas une signature. La fiche retombe sur « signature absente », **message canonique EXISTANT** — aucune condition, aucun message nouveau n'entre dans le moteur Officiel. |
| … et le fait ne se voyait nulle part | `8eab464` — toute signature illisible entrée par un import est **NOMMÉE au journal d'audit** (`SIGNATURE_ILLISIBLE_A_L_IMPORT`) : elle est conservée, mais elle ne vaut pas signature. |
| **`analyseEncre` répondait « ENCRE » avec assurance sur des images visuellement blanches** (alpha nul partout, palette dont toutes les entrées sont identiques) : le mensonge exact du lot, retourné contre lui. | `58cc401` — l'alpha est **composé** et la palette **résolue** avant comparaison. Un doute non résolu (palette absente, en double, taille invalide) répond `INDETERMINABLE`, jamais « vide ». |
| **`signatures.csv` perçait le coffre des identités** : un élève au coffre était « Élève AAAA-NN » dans `personnel.csv` et sous son vrai nom dans `signatures.csv`, dans LA MÊME archive scellée. Régression introduite par la brique 5. | `d1cad05` — patron de `technicienDe` repris : résolution par la **fiche VIVANTE** via `mv.executeParId`, donc par le pseudonyme. |
| **`server/fabrique-png-test.mjs` était invisible à la relecture** (un octet NUL littéral le classait BINAIRE pour git) — le seul fichier du lot exempté de la relecture de diff, dans un dépôt dont la doctrine est « relis le diff en entier ». | `a5e3097` — le NUL est écrit à part, le fichier redevient texte et diffable ; suite `test-sources-relisibles.mjs` pour que ça ne revienne pas. |
| **`contrat.js` mentait encore** : il annonçait « nombres magiques, ≥ 1 Ko ». C'est le seul fichier du dépôt dont le rôle est de ne pas mentir sur le comportement, et le lot « ne plus mentir » ne l'avait pas touché. | `8c37544` |
| 7 constats mineurs (assertions qui ne peuvent pas échouer, module ESM non interrogé, attaques non inscrites au répertoire des preuves, double décodage) | `5fe6b19`, `9d7e7de`, `3f07896`, `6dc8af1`, `446b1b6`, `c94e025` |

### Ce que la vérification FINALE a trouvé — deux défauts nés des correctifs (26/07)

Aucun constat rouvert, filet vert : les deux défauts sont **nés de la
correction elle-même**, et tous deux sont exactement ce que ce lot combat.

| Constat | Correctif |
|---|---|
| **Le motif affiché était FAUX pour une image illisible, et il entrait au dossier SCELLÉ.** Rendre la validité honnête a fait ressortir toute image illisible sous le seul état restant : `PERIMEE` = « la fiche a été modifiée après la signature ». Or la fiche n'avait pas bougé, et la ligne se contredisait : `signatures.csv` rendait `…;0;perimee;…`, révision signée 0 = révision courante 0. Écran (`signatures-modal.js`) **et** archive opposable (`exports.js`). | Quatrième état **`IMAGE_ILLISIBLE`** dans `parcours-signature.js`, troisième valeur « image illisible » dans la colonne État du CSV. La cause est dite à part par **`imageRecevable`**, nouveau champ de `getSignaturesMouvement` des DEUX magasins : il **NOMME**, il ne refuse rien (le refus reste dans `valide`, et là seulement ; recevabilité non dite = comportement d'avant). Les illisibles sont écartées avant le choix de la signature retenue, comme le fait `etatSignatureReelle` — l'écran ne dit jamais autre chose que le moteur. |
| **Le texte du visa affirmait le contraire du code** (§ 2 et § 6 de ce plan, CHANGELOG) : « aucun contrôle rétroactif, `verifierImageSignature` n'est appelée qu'à la POSE ». Vrai des quatre premières briques, faux depuis la fermeture de la porte IMPORT. | § 6 réécrit : le contrôle s'applique à la **LECTURE**, et la conséquence pour un registre existant est dite en clair — puis **TIRÉE** (`test-contrat.mjs`, une case blanche de 5 506 o insérée par le fichier, jouée contre les deux magasins). |

---

## 6. GATE PROPRIÉTAIRE — `MSG_ZONE_VIERGE` est un refus NOUVEAU

C'est le seul point du lot qui demande un visa avant fusion, et la revue a eu
raison de l'isoler.

> « Signature refusée : la zone est restée vierge, aucun tracé n'a été
> enregistré. Signez dans le cadre, puis recommencez. »

**Ce que ce refus fait :** un élève qui valide sans avoir touché la zone se voit
refuser la pose. Hier, la signature était enregistrée et déclarée valide.

**Ce que ce refus NE fait PAS**, et il faut le dire pour que la décision se
prenne sur des faits :

- il **ne bloque aucune écriture** : il refuse une pose, l'élève recommence ;
- il **n'entre pas dans le moteur Officiel** : aucune condition bloquante
  nouvelle, `VERROU_LIVRAISON` reste `true` des deux côtés ;
- il **ne bloque aucune écriture hors mode Officiel** : la validation en mode
  NORMAL passe comme avant ;
- il **ne s'applique qu'au vide ABSOLU** : une griffure de deux pixels passe
  (D2), et un format non relisible passe aussi.

⚠️ **En revanche il N'EST PAS « seulement à la pose » — et c'est le point sur
lequel il faut se prononcer en connaissance de cause.** Ce paragraphe affirmait
le contraire jusqu'au 26/07 (« jamais rétroactif : `verifierImageSignature`
n'est appelée qu'à la pose »). C'était vrai des quatre premières briques ; la
revue a exigé de fermer la porte IMPORT, et la seule façon honnête de la fermer
a été de rendre la VALIDITÉ elle-même exacte. Le contrôle est donc rejoué **à
chaque LECTURE**, des deux côtés : `getSignaturesMouvement`
(`server/api.js` · `demo-store.js`) et `etatSignatureReelle`, qui alimente le
moteur Officiel.

**Ce que cela change pour un registre EXISTANT**, dit en clair : une case
blanche déjà en base — un vrai PNG de 5 506 o, que la version d'avant B3
acceptait et stockait — voit sa signature **retomber sur « absente »**, et les
**conditions 14/15 lui être opposées en mode Officiel**.

**Ce que cela ne change pas**, et qui est TIRÉ (`v8/js/data/test-contrat.mjs`,
joué contre les DEUX magasins) : le registre **s'importe toujours** (rien n'est
refusé à l'entrée), la **chaîne d'empreintes reste verte** — aucun registre ne
devient « invalide » —, **aucune masse ne bouge**, et **aucune condition
bloquante nouvelle** n'apparaît : ce sont les codes existants, avec leur message
canonique existant. Le doute retire l'**allègement**, jamais l'**obligation**.

**Pourquoi il est proposé quand même :** c'est le seul cas où le logiciel
DISAIT quelque chose de faux. Un registre opposable peut refuser un geste ; il
ne peut pas certifier une case blanche.

Le principe maison — « on n'empêche jamais d'enregistrer la réalité » — n'est
pas en cause : une case blanche n'est pas une réalité qu'on empêche
d'enregistrer, c'est l'absence de geste.

**Aucune règle réglementaire n'a bougé** : aucun seuil, aucune date, aucune
fréquence, aucune catégorie F-Gas, aucun contenu de déclaration officielle.
Ce lot ne touche qu'à la lecture d'un fichier image.

---

## 7. Ce qui n'a PAS bougé (vérifié)

- **Verrou de livraison** : `VERROU_LIVRAISON = true` dans `server/blocage-officiel.js`
  ET `v8/js/data/blocage-officiel.js`. INTACT.
- **Migrations** : `git diff c32f8c0..HEAD -- server/migrations.js` = VIDE. Registre
  toujours à 35.
- **Conditions bloquantes du mode Officiel** : diff vide sur
  `docs/CONDITIONS-BLOCANTES-OFFICIEL.md` et les deux `blocage-officiel.js`.
- **Empreintes** : `hash-mouvement.js` absent du diff. Aucun recalcul rétroactif,
  aucune v3. Le témoin de session **n'entre PAS** dans l'empreinte scellée (ce
  serait une v3 du hasseur, hors de ce lot).
- **Contrat** : `VERSION_CONTRAT` reste à 12, aucune méthode ajoutée ni retirée
  (seules deux **descriptions** ont été corrigées, `8c37544`).
- **Parité stricte** : `v8/js/data/png.js` et `server/png.js` sont littéralement
  identiques (467 lignes utiles, un seul écart : la ligne d'export) ;
  `MSG_ZONE_VIERGE` identique caractère pour caractère des deux côtés.

---

## 8. Résidus assumés, et questions ouvertes

1. **`signatures.csv` : un signataire non relié reste figé sous son nom écrit.**
   *(Périmètre RE-MESURÉ le 26/07 — il est plus large que « le détenteur ».)*
   `signataireDe` (`v8/js/documents/exports.js`) ne passe par la fiche VIVANTE
   que si `sig.role === 'TECHNICIEN'` **et** que `mv.executeParId` existe. Le
   nom figé sort donc tel quel dans **deux** cas : toute signature
   **DÉTENTEUR**, et une signature **TECHNICIEN sur une fiche sans intervenant
   déclaré**. C'est le résidu identique à `technicienDe` de `mouvements.csv`,
   connu et antérieur — mais **`signatures.csv` est le SEUL fichier du dossier
   scellé où un nom de SIGNATAIRE entre**, et le coffre n'y a pas de seconde
   barrière.
   **Pourquoi ce n'est PAS fermable à peu de frais** (cherché le 26/07, aucune
   piste retenue) : au moment de produire le dossier, le vrai nom d'une
   personne au coffre n'existe plus en clair — la fiche vivante porte le
   pseudonyme, le nom réel est dans l'enveloppe chiffrée. On ne peut donc pas
   reconnaître qu'un nom figé appartient à quelqu'un du coffre. Les trois
   contournements envisagés ont tous été écartés, et pour la même raison que
   celle qui a motivé ce lot :
   - se rabattre sur `sig.sessionPersonnelId` **inventerait** un nom (les
     champs du signataire sont saisissables : la session peut avoir tapé le
     nom d'un représentant du client) — on écrirait une identité FAUSSE dans
     une archive scellée ;
   - reprendre la clause anti-homonyme de `mettreAuCoffre` (comparaison au
     libellé d'avant) est impossible ici : ce libellé n'est plus lisible ;
   - masquer le nom au moindre doute **retirerait une preuve** du dossier
     d'audit — c'est la faute déjà commise une fois dans ce chantier
     (des masses disparues d'une déclaration).
   **La seule fermeture honnête est la racine** : relier chaque signature à une
   fiche du personnel (`signature_personnel_id`), donc un champ nouveau, donc
   une migration — et elle ne remplirait PAS le passé.
   ⚠️ À noter aussi, dans le cas où la substitution s'applique : elle nomme
   l'**intervenant déclaré de la fiche**, qui n'est pas forcément le
   signataire. C'est le patron accepté de `mouvements.csv`, il protège le
   coffre, mais il n'est exact que parce que les deux coïncident en pratique.
   *Question au propriétaire : ouvre-t-on ce lot ? (migration + reprise
   manuelle du passé, ou acceptation écrite du résidu.)*
2. **Le témoin de session n'entre pas dans l'empreinte scellée.** Il est donc
   affiché et exporté, mais il n'est pas protégé par le chaînage. L'y mettre
   exigerait une v3 du hasseur — et la règle du dépôt est « aucune v3 ».
   *Question au propriétaire : accepte-t-on ce niveau de preuve pour le témoin ?*
3. **Le PNG entrelacé (Adam7) et les profondeurs sous-octet passent sans être
   jugés.** Un canvas n'en produit jamais ; un fichier importé, si. Le doute
   profite au signataire (D2). *Aucune action proposée.*
