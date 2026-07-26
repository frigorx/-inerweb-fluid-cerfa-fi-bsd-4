# Réponse à l'audit externe du 25 juillet 2026

**Objet** : réponse motivée au rapport « Audit complet d'inerWeb Fluide » (25/07/2026,
verdict **NO-GO** pour le registre officiel unique).
**Version auditée** : paquet SHA-256 `cb6c248510eba68d861d160838bb0d6c217651dbbd0d598d91ce95f970fd1def`
(dépôt à `c32f8c0`).
**Version présentée aujourd'hui** : le dépôt tel qu'il est recopié dans ce paquet.
L'inventaire des fichiers, leur volume et le nom des bibliothèques tierces sont dans
`01-SOMMAIRE.md`, produit en même temps que les volumes de code. Ce sommaire porte la date
de production du paquet, et rien d'autre : il n'est pas une empreinte de version.
**Rédigé par** : l'assistant de développement du projet, sous la direction de l'auteur.

> **Une règle a gouverné la rédaction de ce mémoire** : n'affirmer que ce que vous pouvez
> vérifier vous-même avec ce qui vous est envoyé. Chaque chiffre porte donc la commande qui
> le produit, ou le fichier et la ligne qui le portent, ou la date du `CHANGELOG.md` qui le
> consigne. Là où nous n'avons qu'une mesure de banc, nous le disons et nous joignons le
> banc. Là où nous n'avons rien de vérifiable, nous avons retiré l'affirmation.

---

## 1. Ce que nous répondons, en une page

Le rapport a été traité **intégralement**. Aucun de ses constats n'a été écarté sans examen :
**31 constats** ont été inventoriés, y compris ceux que vos sections 5 et 11 portent hors des
listes P0/P1/P2. Ce nombre et les six trous finalement retenus sont consignés dans
`docs/PROMPT-REPRISE.md`, joint à ce paquet ; l'inventaire nominatif, lui, renvoie à votre
rapport, que nous n'avons pas versé ici. Chaque constat a ensuite été soumis à la règle
interne du projet :

> **Une faille se prouve en la TIRANT, pas en la lisant.**

Chaque constat **portant sur le code** a donc fait l'objet d'un script d'attaque exécuté
contre un vrai serveur, sur port jetable et base jetable. Les constats d'exploitation et de
gouvernance — visas, chiffrement du poste, protection des données — ne se tirent pas : ils
sont instruits séparément et renvoyés à l'établissement (§6). Puis chaque verdict engageant
a été confié à un second relecteur chargé de le **réfuter**. Deux verdicts ont changé à ce
stade, et ce sont exactement les deux que le corps de ce mémoire expose : la gravité annoncée
de **P0-04 B**, réfutée, et le volet « échéance à 2099 » de **P0-04 A**, réfuté lui aussi
(§4 pour les deux).

**Résultat du tri.** Nous donnons les constats par leur numéro plutôt que par un décompte,
pour que vous puissiez pointer votre propre rapport.

| Traitement | Constats de votre rapport nommés dans ce mémoire |
|---|---|
| **Confirmés par le tir** — 6 | P0-03 (deux volets), P0-04 A, P0-04 B, P0-05, P1-04. **Cinq corrigés dans ce paquet** ; P1-04 assumé et consigné (§4). |
| **Désaccord de fond** — 1 | P0-02 (§3), le plus lourd du rapport. Un résidu de présentation qu'il contenait a néanmoins été corrigé (§3.6). |
| **Exacts, corrigés dans ce paquet** hors des six trous | P1-08 (ses deux volets, et pire que ce qu'il disait), P2-03. §6. |
| **Exacts mais périmés ou déjà tranchés** avant l'audit | P0-07, P1-09. §6. |
| **Exacts et délibérés** | P2-06. §6. |
| **Qualité logicielle, non traités à ce stade, assumés** | P2-01, P2-02, P2-04, P2-05, P2-07. §6. |
| **Hors code** (visas, exploitation, gouvernance, protection des données) | instruits séparément, à la charge de l'établissement. §6. |

Ce tableau nomme les constats que ce mémoire traite explicitement. **Si un numéro de votre
rapport ne s'y trouve pas et que vous ne le retrouvez nulle part dans les pages qui suivent,
dites-le-nous : nous y répondrons point par point.** Nous n'avons pas versé votre rapport à
ce paquet — il ne nous appartient pas — et nous préférons vous inviter à vérifier plutôt que
de vous affirmer une couverture que vous seul pouvez constater.

**Ce que le rapport a trouvé et que personne n'avait vu** : six défauts réels, dont trois
touchaient directement la valeur probante du registre — les deux volets de la signature
(P0-03) et le suivi de remise en filière (P0-05). Ils sont corrigés, chacun avec le test qui
échoue si l'on retire le correctif. Le filet automatisé passe de **106 à 121 exécutions**
(`node outils/lancer-tests.mjs --tout` ; 106 se relit sur l'arbre `c32f8c0`, 121 sur celui-ci).

**Ce que le rapport n'a pas pu voir** : son constat le plus grave — la prétendue absence de
séparation entre Formation et Officiel — découle d'une définition du mot « Formation » que
**notre propre brief lui a donnée, et qui était fausse** (§7). Corrigée, cette définition
change la conclusion : la correction exigée rendrait le registre **faux**. La démonstration
est au §3, avec un contrefactuel mesuré et le banc qui le rejoue.

**Nous ne contestons pas le verdict NO-GO.** Le mode Officiel était verrouillé avant l'audit,
il l'est toujours, et il le restera jusqu'au retour d'un organisme agréé. Ce que nous
contestons est une partie du chemin qui y mène.

---

## 2. Comment ce rapport a été traité (méthode)

Nous détaillons la méthode parce qu'elle conditionne la valeur de ce qui suit.

1. **Inventaire sans filtre.** Les 31 constats ont été numérotés, y compris ceux qui
   semblaient faux. Un constat mal formulé cache parfois un vrai problème, et cela s'est
   vérifié : P0-02, que nous contestons sur le fond, contenait un défaut d'affichage réel
   (§3.6) ; P0-04 B, dont nous réfutons la gravité, en cachait deux autres (§4).
2. **Tir.** Un script d'attaque par constat portant sur le code, exécuté. Trois verdicts
   possibles : CONFIRMÉ (avec l'effet exact observé), RÉFUTÉ (avec le message de refus
   exact), ou DÉSACCORD MÉTIER.
3. **Contre-épreuve adversariale.** Chaque verdict engageant a été confié à un second
   relecteur dont la mission était de le **faire tomber** (voir §1 pour les deux verdicts
   qui ont changé).
4. **Correction par briques.** Un correctif, son test, le filet complet vert, un commit.
   Jamais deux corrections dans un commit.
5. **Revue adversariale de chaque lot**, puis contrôle final. Chacune des trois passes a
   introduit au moins un défaut nouveau — voir §5, nous les publions.

Cette méthode a un précédent. L'audit externe précédent (20/07/2026) exigeait de **bloquer la
recharge d'une machine depuis du fluide récupéré**. C'était faux : la conservation par machine
d'origine est un geste de maintenance quotidien et parfaitement licite. Coder cette exigence
aurait rendu le logiciel inutilisable. Nous avons donc pris l'habitude de vérifier avant de
coder.

---

## 3. Le désaccord de fond : P0-02, « Formation et Officiel partagent les mêmes stocks »

C'est le constat le plus lourd du rapport et **le seul que nous refusons de corriger**. Nous
demandons au prochain auditeur de traiter cette section en priorité.

### 3.1 Le fait technique est exact — nous le confirmons

Nous l'avons reproduit. Une fiche en mode Formation validée produit exactement les mêmes
effets qu'une fiche officielle : la matière bouge, la vue `bilan_matiere` enregistre la
charge, la déclaration annuelle aussi. Les références de code citées par l'auditeur sont
justes ; nous les avons relues, elles disent bien ce qu'il dit.

Nous avons même trouvé **davantage** que lui : un contrôle périodique saisi en Formation
déplace l'échéance réglementaire de la machine et éteint une alerte de retard ; une fuite
déclarée en Formation met réellement la machine en statut FUITE et bloque toute recharge
ultérieure.

### 3.2 Mais la conclusion est fausse, et le contrefactuel le prouve

L'auditeur en conclut qu'il faut deux univers de données. **Nous avons monté ce scénario et
l'avons mesuré.**

> **Montage.** Une bouteille de R-134a neuve — tare 10 kg, brut 20 kg, donc 10 kg nets — et
> une machine de 10 kg nominaux. Le gaz part réellement dans la machine pendant le TP
> (c'est la réalité de l'atelier) : la bouteille pèse physiquement 8 kg nets après le geste.
> Mais la fiche Formation est rendue INERTE, comme le rapport l'exige. Le professeur saisit
> ensuite l'inventaire physique réel : 8 kg.
>
> **Résultat mesuré.** `stock théorique 10 kg · stock réel 8 kg · ecartKg −2`, alerte
> **CRITIQUE** « Écart de balance matière non justifié — R-134a · 2026 · écart − 2,00 kg »,
> et **motif de blocage du mode Officiel** : « Écart de balance matière non justifié :
> R-134a (2026, − 2,00 kg). »
>
> **Le même montage, la Formation laissée vivante** (l'état livré) : la fiche
> `FORM-2026-0001` est validée, l'inventaire physique donne `théorique 8 kg · réel 8 kg ·
> ecartKg 0`, aucune alerte, aucun motif de blocage.

**Rejouez-le vous-même** — le banc est joint à ce paquet et il n'ouvre aucun port, il appelle
l'API en direct sur une base jetable :

```
node docs/banc-contrefactuel-P0-02.mjs inerte
node docs/banc-contrefactuel-P0-02.mjs vivant
```

**L'inertie réclamée produit elle-même la contamination reprochée.**

> **La variante qu'on nous opposera.** Objection prévisible : deux bases, plus une ressaisie
> par le professeur dans la base officielle. Nous y répondons sur trois points.
> ① Ce n'est plus une séparation, c'est une **double saisie** — c'est-à-dire le cahier tenu
> en parallèle que le registre unique a précisément pour objet de supprimer, avec le risque
> de divergence qui va avec. C'est la doctrine constante du projet : *un registre qui refuse
> la réalité pousse à tenir un cahier à côté* (`docs/PROMPT-REPRISE-AUDIT-EXTERNE.md` §5).
> ② Elle n'apporte aucune garantie nouvelle : aujourd'hui déjà, un élève ne peut ni valider
> une écriture ni saisir un inventaire (§3.5, tiré). La seule main qui engage le registre est
> celle de l'enseignant, dans les deux architectures.
> ③ Elle déplace le risque au lieu de le réduire : ce qui est ressaisi de mémoire, en fin de
> séance, sur un second support, est moins fidèle que ce qui est écrit au moment du geste.
> Nous restons demandeurs de votre avis si vous voyez un quatrième terme.

### 3.3 Pourquoi : « Formation » n'est pas un bac à sable

L'auditeur a lu « mode Formation » comme « environnement de test ». C'est l'erreur d'origine,
et **c'est notre documentation qui la lui a donnée** (voir §7, nous l'avons corrigée).

Dans ce lycée, **les élèves interviennent sur le parc réel de l'atelier, avec du vrai fluide
dans de vraies bouteilles**. Quand un élève charge 2 kg, la bouteille perd réellement 2 kg.
L'obligation F-Gas porte sur la **matière**, pas sur le statut pédagogique de celui qui
manipule. Ne pas tracer ce mouvement, ce n'est pas de la prudence : c'est un trou dans le
registre.

Le bac à sable existe, et il porte un autre nom : c'est le **mode Démo** (magasin en mémoire,
monde fictif, aucune donnée réelle). Il y a donc trois objets distincts, pas deux.

Le détenteur du registre a par ailleurs fixé une règle d'usage, rapportée le 25/07/2026 et
consignée en tête de `docs/PROMPT-REPRISE.md`, qui part avec ce paquet :

> « par défaut, s'ils utilisent l'application c'est qu'ils ont manipulé du vrai fluide ;
> c'est moi qui valide le CERFA à la fin »

**Ce n'est pas un argument technique et nous ne le présentons pas comme tel** : c'est une
décision d'usage du détenteur du registre, qui lui revient, et que nous rapportons pour que
vous puissiez la contester en tant que telle. Elle ne prouve rien à elle seule — c'est le
contrefactuel du §3.2 qui prouve.

### 3.4 Deux conséquences que la correction demandée entraînerait

- **Le parc non fluoré deviendrait intraçable.** Une décision antérieure — condition n° 18
  `HORS_PERIMETRE_FLUORE`, tranchée le 24/07 et écrite dans
  `docs/CONDITIONS-BLOCANTES-OFFICIEL.md` — refuse le CERFA officiel pour le R-744, le R-290
  et le R-717, « la traçabilité volontaire = le mode Formation ». Le même document écarte
  explicitement l'issue de repli qu'on pourrait nous suggérer : « aucun troisième objet ».
  Une Formation inerte supprimerait donc la seule trace existante du parc CO₂ et
  hydrocarbures de l'atelier.
- **Le registre n'enregistrerait plus rien pendant l'attente.** Le verrou de livraison étant
  fermé (`VERROU_LIVRAISON = true`, `server/blocage-officiel.js` et son miroir
  `v8/js/data/blocage-officiel.js`), la Formation est aujourd'hui le **seul mode d'écriture
  possible**. L'argument n'est pas que ce verrou est éternel — on nous répondrait « alors
  ouvrez l'Officiel ». Il est que **la période d'attente de votre avis et de celui de
  l'organisme agréé ne peut pas être une période sans registre.**

### 3.5 Ce que nous accordons au rapport

Le scénario de nuisance qu'il décrit — « un élève fait un exercice, le stock officiel bouge »
— est **inexact sur les droits**, et un élève est arrêté **deux fois**, par deux gardes
distinctes :

- **au niveau de la session**, `validerMouvement` répond **HTTP 403** : « Action
  « validerMouvement » réservée aux rôles habilités (REFERENT, ENSEIGNANT, ADMIN) — rôle
  courant : ELEVE. » (garde `garderRole`, `server/api.js`) ;
- **au niveau métier**, si l'on désigne une fiche d'élève comme validateur, `verifierValidateur`
  refuse à son tour, en **HTTP 400** : « Validation refusée : un élève ne peut pas valider une
  écriture (rôle requis : référent, enseignant ou administrateur). »

L'écart de balance exige en outre la saisie d'un inventaire, elle aussi réservée
(`saisirInventaire` → 403, même garde). Tout effet passe par un acte de l'enseignant.

Mais il reste un cas réel, **plus large que le papier** : tout exercice où **aucun fluide
fluoré n'a effectivement bougé** — un CERFA rempli à blanc, une charge simulée à l'azote, un
banc démonté. Dans ce cas, une écriture n'a aujourd'hui aucun moyen de ne pas mentir aux
stocks. L'auteur traite ce cas par l'annulation par contre-écriture, dont nous avons vérifié
qu'elle ramène la balance à zéro et fait disparaître le motif de blocage. **Nous le signalons
comme une limite assumée**, et nous demandons au prochain auditeur son avis sur ce point
précis — non sur le principe de la séparation, qui est tranché.

### 3.6 Ce que le constat contenait de vrai, et que nous avons corrigé

Le mode Formation ne partitionne pas les données — mais il partitionnait mal **l'affichage**,
et sur ce point le rapport avait raison sans le dire. Le numéro de fiche étant posé dans tous
les modes, le total « CERFA générés » du tableau de bord et de l'audit en cinq minutes
additionnait les fiches d'exercice : un lecteur pressé y lisait un volume officiel qui
n'existe pas.

**Corrigé dans ce paquet** (commit `dcd29fd`, 26/07) : la carte distingue le total des fiches
numérotées, les CERFA officiels et les fiches d'exercice ; et la part officielle se lit au
**mode scellé de l'écriture**, jamais au préfixe du numéro. Preuve :
`v8/js/views/test-compteur-fiches.mjs`, 19 vérifications — 14 échecs sans le correctif.

---

## 4. Les constats confirmés par le tir, et corrigés

### P0-03 — Une seule session fabrique les deux signatures : **CONFIRMÉ**

Reproduit intégralement. Un seul compte de niveau élève, une seule session, pose les deux
signatures sous deux identités inventées ; les conditions bloquantes 14 et 15 du moteur
officiel disparaissent (`docs/CONDITIONS-BLOCANTES-OFFICIEL.md`). Plusieurs angles de
réfutation ont été tentés, tous ont échoué. Le témoin de session existait en base mais
**aucune ligne de code ne le comparait**, ni au nom saisi, ni à l'autre signature.

**Décision de l'auteur, et nous l'assumons publiquement** (décision D1,
`docs/PLAN-B3-SIGNATURE.md`) : la présence de deux signatures posées depuis une même session
**n'est ni bloquée ni signalée**. En atelier de lycée, le détenteur est l'établissement et le
signataire est le professeur lui-même ; la délégation est un geste normal, câblé depuis le
16/07. Exiger deux sessions bloquerait l'activité sans rien prouver de plus.

**Ce qui a été corrigé** : le **témoin de session est porté sur la fiche et dans le dossier
d'audit** (commit `2544577`). Auparavant, cette information — la seule que le client ne peut
pas falsifier — était enregistrée puis jetée : ni à l'écran, ni au CERFA, ni dans l'archive.
Chaque signature valide de la modale porte désormais « Posée depuis la session <Prénom Nom>
(compte …) », et le dossier scellé reçoit un `signatures.csv` qui portait jusque-là… rien :
les signatures, pièce la plus probante du registre, n'étaient dans **aucun** fichier du
dossier.

**Ce que nous ne revendiquons pas, et qu'il serait facile de nous opposer** : le
pré-remplissage du nom du signataire n'a pas bougé. Il **existait déjà dans la version que
vous avez auditée** (`git show c32f8c0:v8/js/data/parcours-signature.js`) et le commit du
correctif l'écrit lui-même : « DÉCISION D3 : le pré-remplissage du nom du technicien depuis
la session connectée EXISTAIT DÉJÀ dans le module pur ». Décrit exactement, il prend
**l'intervenant déclaré sur la fiche**, et seulement à défaut la personne connectée ; les
champs restent saisissables (jamais `readonly`, jamais `disabled`). Le lot n'a fait que le
mettre sous test à l'écran.

Le journal d'audit chaîné, lui, consignait déjà l'auteur réel et signalait la discordance
(`journaliser`, `server/api.js` : l'entrée est écrite au nom de l'auteur RÉEL, avec la
mention « — auteur déclaré : <nom saisi> » quand les deux diffèrent).

**Nous ne prétendons pas** que ce mécanisme constitue une signature avancée ou qualifiée au
sens d'eIDAS. Vérification faite : aucun écran de l'application, aucun document qu'elle
produit (CERFA, dossier d'audit, exports) n'emploie ces termes. La seule occurrence du dépôt
est une note de conception interne — `docs/PLAN-AUDIT-PROOF-2026.md` ligne 82 — qui range
« horodatage qualifié / signature PAdES (eIDAS) » parmi des évolutions « entreprise »
envisagées plus tard et explicitement non retenues. Nous la citons nous-mêmes pour que vous
n'ayez pas à la trouver.

### P0-03 (second volet) — Le PNG n'est pas décodé : **CONFIRMÉ**

Reproduit. Un bloc de texte de 2 348 octets précédé des 8 octets magiques PNG était accepté
comme signature, et faisait passer les faits `signatureTechnicienValide` à vrai. Des PNG
structurellement valides mais **vides** l'étaient aussi : canvas blanc, canvas du wizard
jamais dessiné.

Nous ajoutons un chiffre que le rapport n'avait pas, **et il est rejouable en une commande** :

```
node outils/test-taille-signature.mjs
```

Zone de 1 400 × 700, encodeur `node:zlib`. Zone **jamais touchée** 3 879 o · zone blanche unie
5 506 o · **griffure de deux pixels** 3 893 o (5 517 o sur fond blanc) · **un seul trait**
4 892 o (6 559 o sur fond blanc). Deux faits en sortent :

1. **la borne basse de 1 Ko n'a jamais refusé une seule case vierge** — la plus légère pèse
   déjà 3 879 octets ;
2. **les deux populations se chevauchent** : le plus **lourd** des fichiers vides (5 506 o)
   est plus lourd que le plus **léger** des fichiers signés (3 893 o). Aucune borne de taille,
   où qu'on la place, ne les sépare — seul le décodage le peut.

> **Sur ces chiffres, une mise au point que nous devons.** Le 25/07 nous avions publié
> 5 562 / 5 509 / 6 518 / 5 584 o. Ces valeurs avaient été mesurées sur fond blanc avec un
> autre réglage et **n'étaient reproductibles par rien** : nous les avons rétractées le 26/07
> (`CHANGELOG.md`, lot B3, et `docs/PLAN-B3-SIGNATURE.md` § « Honnêteté sur les chiffres »).
> Les seuls chiffres que nous publions désormais sont ceux que la suite produit, parce qu'ils
> sont les seuls qu'un tiers puisse refaire. L'encodeur d'un navigateur n'est pas `node:zlib`
> et les valeurs absolues d'un vrai `canvas.toDataURL()` diffèrent ; ce qui se transporte d'un
> encodeur à l'autre — et qui est le seul point en cause — c'est le chevauchement.
> ⚠️ Un résidu subsiste dans le code que vous recevez : le commentaire de tête de
> `v8/js/data/signatures-mouvement.js` et celui de son miroir serveur citent encore les
> anciennes valeurs. Nous le signalons plutôt que de vous le laisser trouver.

**Corrigé** : l'image est **réellement décodée** — en-tête IHDR, parcours des chunks, CRC-32
de chacun, présence d'IDAT et d'IEND, rien après — puis les pixels, par une décompression
zlib/DEFLATE (RFC 1950/1951) et un dé-filtrage des cinq filtres PNG **écrits à la main**
(`v8/js/data/png.js`, miroir `server/png.js`). Une zone restée **rigoureusement vierge** est
refusée. La borne de 1 Ko est retirée ; celle de 1 Mo est conservée (protection mémoire,
contrôlée AVANT décodage), plus un plafond défensif de surface décompressée de 32 Mo contre
la bombe de décompression.

**Sur la dépendance, la formulation exacte** : le décodage n'a introduit **aucune dépendance
nouvelle** — le dépôt n'a ni `package.json` ni gestionnaire de paquets, et `png.js`
n'importe rien. Il embarque en revanche, sous `v8/js/lib/`, **cinq fichiers de bibliothèques
tierces minifiées issus de trois projets** (PDF.js, pdf-lib, qrcodejs — inventoriés dans
`LICENCES-TIERCES.md` et nommés au `01-SOMMAIRE.md`) : ils servent l'affichage et le
remplissage du CERFA et les étiquettes QR, et **aucun n'intervient sur le chemin qui juge une
signature**. *(Le commentaire de tête de `outils/paquet-audit.mjs` parle encore de « trois
bibliothèques » : trois projets, cinq fichiers — nous le signalons pour lever la
contradiction apparente.)*

**Aucun seuil d'encre n'a été posé**, et c'est délibéré (décision D2,
`docs/PLAN-B3-SIGNATURE.md`) : aucun texte n'en fixe, le signataire voit ce qu'il trace et
peut recommencer. Une griffure de deux pixels passe. Et sur un format qu'on ne sait pas
relire, la réponse est INDÉTERMINABLE : on ne conclut jamais au vide sur un doute.

**Point signalé pour le visa** : ce contrôle est rejoué **à chaque lecture**, pas seulement à
la pose — c'est ce qui referme la porte de l'import, une garde posée sur la seule pose ne
tenait pas. Conséquence vérifiée en la tirant : un registre existant contenant une case
blanche **s'importe toujours** (rien n'est refusé à l'entrée, la chaîne d'empreintes reste
verte, aucune masse ne bouge), mais cette signature retombe sur « absente » et les conditions
14/15 lui sont opposées en mode Officiel. À l'écran et dans `signatures.csv`, l'état affiché
est le quatrième état, « image illisible », qui **nomme** sans rien refuser de plus. Nous
jugeons que le sens est le bon — le doute retire l'allègement, jamais l'obligation — mais nous
le déclarons plutôt que de le laisser découvrir.

### P0-04 A — `createMachine` sans la garde de `updateMachine` : **CONFIRMÉ**

Reproduit avec une vraie session élève. La garde de qualification réglementaire existait sur
la modification et **manquait à la création**. Conséquence mesurée, non théorique, et consignée
au `CHANGELOG.md` (lot B1, brique B1-a) : sur deux machines identiques de 5 kg de R-410A créées
par le même élève, un titulaire A2/2025 (limite 3 kg) est bloqué en Officiel sur la machine
témoin et **plus du tout** sur celle déclarée hermétique et étiquetée. **Le seuil d'aptitude
passe de 3 à 6 kg par une case cochée à la création.**

Aggravant que le rapport n'avait pas vu : la qualification est un **cliquet à sens unique**.
L'élève l'installe mais ne peut plus la retirer (403 en modification).

**Un point du constat est réfuté** : l'affirmation selon laquelle une échéance à 2099 posée à
la création ferait disparaître l'alerte critique. Contre-épreuve : une machine neuve n'a
aucune échéance à effacer — le cas « champ omis » produit exactement le même silence — et le
moteur écrête la valeur dès qu'un champ de seuil bouge. Le rapport n'a pas joué le cas témoin.

**Corrigé, et au-delà du constat** : la règle ne vit plus dans un gestionnaire mais dans **un
filtre unique qui traverse les deux portes** (`CHAMPS_QUALIFICATION_MACHINE`, treize champs, et
`garderQualificationMachine`, appelée par `createMachine` comme par `updateMachine`). Nous y
avons ajouté deux champs que le rapport ne citait pas mais que notre propre critère désignait :
la **détection permanente** (elle divise par deux la fréquence des contrôles — la même machine
de 60 kg passait d'une échéance au 2027-01-25 à 2027-07-25 sur la seule déclaration d'un élève)
et la **charge nominale** (ramenée de 60 kg à 1 kg, la machine sortait du périmètre F-Gas :
plus d'échéance, plus d'alerte). La charge **actuelle**, elle, reste ouverte : c'est la pesée
du jour, le geste même du TP. À signaler par honnêteté : le champ `statut` entrant dans la
liste, les gestes dédiés `arreterMachine` et `demantelerMachine` — la troisième porte du même
seuil — ont été portés au niveau du responsable ; c'est une garde de rôle, pas le filtre.

### P0-04 B — Un élève crée du personnel et des attestations : **PARTIELLEMENT CONFIRMÉ**

Le geste est réel : un élève crée des fiches portant un rôle applicatif élevé et des numéros
d'attestation inventés.

**Mais la gravité annoncée est réfutée, et nous le démontrons** : ces preuves d'aptitude sont
**décoratives**. Le moteur d'aptitude opposable ne lit que la table des habilitations, réservée
au responsable ; la création d'une habilitation répond 403 à un élève (« Action
« createHabilitation » réservée aux rôles habilités (REFERENT, ENSEIGNANT, ADMIN) — rôle
courant : ELEVE. »). Contre-épreuve tirée dans les deux sens : la personne fabriquée reste
bloquée « Aucune habilitation F-Gas active et en cours de validité pour … », et ne se débloque
que lorsqu'un responsable pose une vraie habilitation. **Aucune intervention interdite ne
devient autorisée.** Le rapport signalait lui-même, honnêtement, que le rôle de la fiche ne
donne pas un rôle de session ; nous confirmons, aucun chemin indirect n'a été trouvé.

**En revanche, deux défauts réels que le rapport n'avait pas vus**, tirés et corrigés :
- la désactivation d'une personne était réservée au responsable, **mais le champ `actif`
  passait par la mise à jour ordinaire** — la porte de derrière. Exactement le motif d'un
  défaut que nous avions nous-mêmes fermé le 25/07 sur un autre couple de méthodes ;
- **déni de service** : un élève rétrogradait la fiche du professeur (`roleApp` → ELEVE) et le
  professeur ne pouvait plus valider, `verifierValidateur` lisant la fiche. Réversible, mais
  un jour d'examen, personne n'en devine la cause.

Un troisième trou est apparu pendant la revue du lot, et il n'exigeait même pas d'écrire le
rôle : tout `typePersonne` autre qu'ÉLÈVE faisait naître une fiche **ENSEIGNANT**, celle que
`verifierValidateur` lit. Un rôle ne se déduit désormais que pour qui a le droit de
l'attribuer.

**Corrigé** : la fiche du personnel est **partitionnée** — état civil ouvert (un élève inscrit
un camarade intervenant sur un TP, c'est légitime), gouvernance et preuves déclaratives
réservées, aux deux portes (`createPersonne` et `updatePersonne`).

### P0-05 — Le BSFF interne n'est pas Trackdéchets : **CONFIRMÉ**

Le rapport a raison sur toute la ligne, et la réponse de l'auteur **aggrave** le constat plutôt
que de l'atténuer :

> « Oui, le lycée émet vraiment des déchets fluorés, voire chlorés. On a encore une bouteille
> de R-22 à mettre en réforme. »

L'établissement est donc **producteur réel de déchets dangereux**. Nous avons tiré : numéro
fantaisiste accepté, doublon accepté, aucun chemin d'annulation, issue « DESTRUCTION » attestée
sans la moindre pièce et tombant directement dans une rubrique de la déclaration réglementaire.
Et surtout — c'est le cœur — **l'interface ne prononçait jamais le mot Trackdéchets** tout en
nommant l'objet exactement comme le bordereau réglementaire. La seule mise en garde vivait dans
un commentaire SQL, là où l'utilisateur ne la lira jamais.

Nous ajoutons un effet de bord découvert en tirant, que le rapport n'avait pas : la
décrémentation se **ré-inflatait** par une simple modification de la masse de la bouteille — du
fluide déchet « rendu » au stock après remise déclarée, le sens le plus dangereux.

**Corrigé** : l'objet ne porte plus, **dans aucun écran ni aucun document produit par le
logiciel**, le nom du document réglementaire ; ce que l'utilisateur lit est « Suivi interne de
remise en filière ». Le cadre 11 du CERFA — dont le libellé « n° de BSFF » appartient au
formulaire officiel et ne nous appartient pas — recevait jusqu'ici le numéro maison ; il ne
reçoit désormais **que** le numéro du bordereau officiel reporté, et reste vide à défaut. Un
champ distinct accueille ce numéro externe, le numéro interne est unique et de
forme contrôlée (`SIF-AAAA-NNNN`, unicité insensible à la casse, refusée par l'API comme par
l'import), une mention permanente rappelle que ce suivi ne remplace pas le bordereau
dématérialisé — et elle est **reportée au sommaire du dossier d'audit scellé**, parce qu'un
lecteur du dossier n'a pas le logiciel sous les yeux. La ré-inflation est signalée par une
alerte chiffrée, datée et rattachée au suivi.

**Déclaré d'emblée, pour que vous n'ayez pas à le trouver au `grep`** : les identifiants
techniques hérités n'ont pas été renommés — méthode d'API `createBsff`, table `bsff`, champ
`numeroBsff`. Ils ne sont **jamais affichés**, et les renommer imposerait une migration sur des
écritures scellées pour un gain nul.

**Deux nuances factuelles** : (a) l'absence de transporteur et de destination est vraie par
appel direct, **fausse par l'écran** (le formulaire les exige et les refuse en clair) — le
risque réel est l'import, pas le clic quotidien ; (b) le reproche « toute masse BSFF comptée à
tort comme détruite » était **déjà corrigé** avant l'audit : les masses non attestées sortent
en poste dédié avec une anomalie, et la déclaration est marquée incomplète.

**Non codé volontairement** : une condition bloquante supplémentaire (« pas de fiche officielle
sur une bouteille déchet sans bordereau réel joint »). Ce serait une **règle réglementaire
nouvelle**, et la règle interne du projet interdit d'en coder une sans validation. Nous la
soumettons.

### P1-04 — Déni de service sur la connexion : **CONFIRMÉ, non corrigé, assumé**

Mesuré, pas lu — mais nous donnons ici la méthode avec le chiffre, parce que ces deux mesures
dépendent du poste et qu'aucune des deux n'est consignée dans un fichier du dépôt.

- **Le facteur de travail cryptographique** est `scrypt` N = 2¹⁷, r = 8, p = 1
  (`server/comptes.js`, constante `SCRYPT_N = 131072`), appelé par `crypto.scryptSync` — donc
  **bloquant**, sur l'unique fil d'exécution, sur une route ouverte et sans limite de débit.
  Mesuré entre **0,19 s et 0,35 s** selon le poste et la charge (deux machines, une douzaine
  de tirs). Protocole : `crypto.scryptSync('…', '…', 64, { N: 131072, r: 8, p: 1 })`, chronométré.
- **La latence sous flux** : mesurée sur banc, port et base jetables. Au repos, une route légère
  (`/api/ping`) répond en **moins d'une milliseconde**. Sous un flux soutenu de quelques
  connexions en parallèle sur la route de connexion, sa latence médiane passe à **plus de deux
  secondes**, en continu. Protocole : lancer le serveur avec `PORT` et `IWF_CHEMIN_BASE`
  jetables, mesurer la médiane de vingt `/api/ping`, puis relancer la même mesure pendant que
  six clients bouclent sur `/api/connexion`. Nous ne publions pas un couple de valeurs
  précis : il dépend entièrement de l'intensité du flux et de la machine, et il ne serait
  reproductible chez vous par rien.

Le verrouillage étant indexé sur le compte et non sur l'origine (colonnes `echecs_consecutifs`
et `verrouille_jusqua`, `server/routes-comptes.js`), changer d'identifiant à chaque tentative
évite tout verrou. Aucune limitation de débit n'existe : la recherche de `rate limit`,
`throttle` ou « limitation de débit » dans `server/*.js` ne rend rien.

**Non corrigé, et voici pourquoi** : par défaut le serveur n'écoute que sur la boucle locale.
`server/serveur.js` ne lit `IWF_LAN` qu'en un seul point, et sans cette variable il imprime au
démarrage « Mode : local (écoute limitée à 127.0.0.1) ». Seul quelqu'un physiquement assis au
poste peut tirer, et cette personne dispose de leviers plus simples (éteindre la machine) sans
pouvoir altérer le registre scellé.

Le risque devient réel en **mode réseau local**. Ce mode est désactivé par défaut et **rien
dans ce qui vous est livré ne l'active** : il n'existe aucun fichier `.env` dans le dépôt,
`.env.example` ne livre les variables `IWF_LAN` / `IWF_HOTE_LAN` / `IWF_TLS_*` qu'en
commentaire, et le lanceur `lancer-inerweb.bat` n'en pose aucune. **L'activation est un geste
manuel de l'exploitant sur le poste** : nous ne pouvons pas vous le prouver depuis le code, et
c'est à l'établissement de vous l'attester.

**Dette consignée avec condition de réveil explicite** : à traiter **avant** toute activation
du mode réseau local, jamais après. C'est écrit dans le document de reprise du projet.

---

## 5. Ce que nos propres correctifs ont cassé — et que nos revues ont rattrapé

Nous publions cette section volontairement. Elle nous paraît plus informative sur la qualité du
processus que la liste des corrections réussies.

**Le compte réel d'abord.** Les trois revues adversariales des lots B1, B2 et B3 ont levé
**1 bloquant, 15 constats importants et 19 mineurs**, plus une passe de vérification finale qui
a **rouvert** l'un des importants et ajouté un mineur et une observation. Le détail complet est
en tête de `CHANGELOG.md`, lot par lot, avec pour chacun le correctif et sa contre-épreuve.
Une part de ces constats vient du code d'origine. Une autre — celle qui nous intéresse ici —
a été **fabriquée par nos propres correctifs** : chacune des trois passes en a produit au moins
un. En voici cinq, choisis pour ce qu'ils enseignent. **Aucun n'était visible au filet
automatisé, qui restait vert** ; tous ont été trouvés par des relecteurs chargés de réfuter le
travail, et corrigés avant fusion.

1. **Une sous-déclaration** (lot B2, commits `30d7a35` puis `b0c708e`). Un correctif appliquait
   « sans pièce jointe, une issue de traitement ne vaut pas preuve » **au calcul de la
   déclaration annuelle**. Sur le jeu d'essai `server/test-declaration-annuelle.mjs`, **5,5 kg
   de R-410A réellement traités** (3 kg détruits, 2 kg régénérés, 0,5 kg autre traitement) **et
   1 kg de R-32 recyclé** quittaient leurs rubriques réglementaires et n'étaient plus déclarés
   à l'autorité. *(Ces masses sont celles du jeu d'essai, pas du registre du lycée : aucune
   déclaration fausse n'a été transmise.)* La barre ainsi posée ne prouvait d'ailleurs rien —
   n'importe quelle pièce comptait, et le parcours normal en pose une avant même l'attestation.
   **Règle retirée du calcul** ; le défaut de pièce est devenu une **anomalie signalée**, sans
   qu'aucune masse ne bouge. Contre-épreuve tirée : le `continue` remis dans les deux miroirs →
   5 échecs. D'où la règle inscrite dans nos consignes : *le doute retire l'allègement, jamais
   l'obligation, et jamais une masse.*
2. **Le coffre des identités percé dans l'archive scellée** (lot B3, régression introduite par
   sa propre brique 5 `2544577`, fermée par `d1cad05`). En portant les signatures au dossier
   d'audit, un correctif y écrivait les noms bruts : dans une même archive, un élève au coffre
   apparaissait pseudonymisé dans `personnel.csv` et `mouvements.csv`, et sous son vrai nom
   dans `signatures.csv`. Contre-épreuve tirée et consignée dans le message de commit :
   correctif retiré → 2 échecs, et la ligne fuitée s'affiche mot pour mot.
3. **Un motif d'état devenu faux** (lot B3, `7b6ac98`). Rendre la validité honnête a fait
   ressortir toute image illisible sous le seul état qui restait : **PÉRIMÉE**, c'est-à-dire
   « la fiche a été modifiée après la signature » — alors que la fiche n'avait pas bougé. La
   ligne se contredisait elle-même : `signatures.csv` du dossier **scellé** rendait révision
   signée 0 et révision courante 0. **L'archive opposable portait donc une cause fausse.** Un
   quatrième état, `IMAGE_ILLISIBLE`, a été ajouté ; il nomme, il ne refuse rien de plus.
4. **Une accusation écrite contre une opération légitime** (lot B2, `7419303` puis `027b546`).
   Le contrôle de cohérence des remises en filière accusait un transfert entrant valide ; après
   un premier correctif, la passe de vérification finale a rouvert le constat, la racine n'étant
   pas fermée : toute écriture sortante datée du même jour que la remise — précisément le
   regroupement de déchets avant enlèvement — était encore dénoncée. **L'accusation ne restait
   pas dans un journal technique : elle remontait au feu tricolore et au guide d'audit,
   c'est-à-dire aux écrans qu'un contrôleur regarde en premier.** Le module portait même un
   commentaire affirmant l'inverse de ce que le code faisait.
5. **Un écran rendu mort** (lot B1, `f516a3d`). Le filtre de qualification introduit par le lot
   comparait la charge utile brute du formulaire au contenu de la base : un `typeInstallation`
   **absent** était lu comme un changement, et l'élève prenait un 403 pour un non-changement.
   La contre-épreuve a montré plus que le constat : la même valeur nulle serait partie dans le
   patch, où SQLite l'aurait refusée (`NOT NULL`).

Nous en ajoutons un sixième, parce qu'il est le plus embarrassant et que le taire dans la
section qui publie ses défauts serait la contredire : **le correctif vedette du paquet a
d'abord échoué exactement sur les images qu'il devait refuser.** `analyseEncre` comparait les
octets bruts et répondait « il y a de l'encre », avec assurance, sur des images visuellement
blanches — RGBA d'alpha nul partout, palette 8 bits dont toutes les entrées sont blanches. Le
mensonge que le lot prétendait fermer, retourné contre lui. Trouvé par la revue, fermé par
`58cc401` : le module compare désormais des **clés visibles**, pas des octets.

Nous en tirons une conclusion que nous soumettons au prochain auditeur : **dans ce logiciel, le
filet vert ne prouve pas l'absence de défaut** — il prouve l'absence de régression sur ce qui
est déjà testé. C'est la revue adversariale qui trouve, pas la suite.

---

## 6. Constats exacts mais périmés, déjà tranchés, corrigés, ou assumés

- **P1-08 (documents cloud)** : **partiellement périmé, partiellement confirmé — et plus grave
  que le rapport ne le disait.**
  `INSTALLATION_CLOUD.md` porte depuis le 23/07 un bandeau « ce guide décrit une intention, pas
  le logiciel livré » avant la procédure conservée comme note de conception : **périmé**.
  `SAUVEGARDE.md` promettait en revanche une sauvegarde automatique inexistante : **exact,
  corrigé dans ce paquet** (`cc486aa`), avec une suite de balayage qui manquait,
  `outils/test-promesses-cloud.mjs`.
  Surtout, en balayant, **nous avons trouvé pire que ce qui nous était reproché** : la notice
  d'information RGPD **affichée dans l'application** (section « Où sont stockées vos données »)
  annonçait encore un hébergement dans l'Union européenne « en mode Cloud ». Ce mode n'existe
  pas. Un guide, on peut ne pas le lire ; une notice d'information est précisément le document
  sur lequel une personne concernée se fonde. Corrigé (`0cdaa26`), et la racine élargie : le
  balayage automatique ne lisait que les `.md` de la racine — il n'aurait donc pas attrapé
  cette occurrence — il couvre désormais aussi le code livré.
  Vérifié par ailleurs, et cela reste vrai : **aucun de ces documents n'est servi par
  l'application** (liste blanche `server/serveur.js` : seuls `index.html`, `guide.html` et
  `manifest.json` à la racine, plus `v8/` et `img/` ; tout le reste répond 404, avec ou sans
  session — `server/test-distribution-statique.mjs` le tire) **ni embarqué dans le paquet de
  livraison** (`outils/fabriquer-paquet.mjs`). Ils sont en revanche dans le paquet d'**audit**
  que vous recevez, et c'est voulu.
- **P0-07, valeur PRP du R-455A** : **déjà tranché** le 23/07, par une règle générale de
  l'auteur — en cas de valeurs concurrentes, retenir **le PRP le plus élevé** (il déclenche les
  contrôles plus tôt). La fiche du fluide porte littéralement la mention
  `AR4 — 148 conservatoire (réserve DGPR)` : un lecteur voit que ce n'est pas une source
  officielle. L'objection de fond du rapport — un registre doit déclarer la valeur de la source
  applicable, pas une valeur prudente — est **recevable et distincte** ; elle figure au dossier
  de relecture externe (`docs/T3-DOSSIER-RELECTURE-EXTERNE.md`).
- **P1-09 (calendrier F-Gas)** : **exact et déjà consigné** avant l'audit. Le vierge à
  PRP ≥ 2500 est traité et daté par usage thermique ; la fin du sursis des fluides recyclés et
  régénérés, et le palier de 2032, ne sont pas modélisés. Aucun effet aujourd'hui. Nous ne
  coderons pas ces dates sans lecture verbatim du texte applicable et validation.
- **P2-06 (double signature plus large que le minimum)** : **exact, et délibéré**, acté le
  16/07 au titre de la doctrine « jamais moins de contrôles qu'exigé ». Le risque de blocage
  que redoute le rapport ne se matérialise pas ici : le détenteur est l'établissement, le
  signataire est le professeur, et la délégation est pré-remplie. Il pourrait se matérialiser
  chez un client tiers ; aucune occurrence à ce jour.
- **P2-03 (test non portable)** : **exact pour le test, réfuté pour la production**. Le harnais
  de `server/test-distribution-statique.mjs` convertissait l'URL du serveur en chemin par
  `pathname` puis retrait du slash de tête — correct sous Windows, chemin **relatif** sous
  Unix, donc serveur enfant qui ne démarre pas. Le code de distribution n'est pas en cause
  (liste blanche et `realpath` sains). **Corrigé dans ce paquet** (`e4be3e4`), avec balayage
  statique du même motif dans tout le dépôt.
- **P2-01, P2-02, P2-04, P2-05, P2-07** (monolithes, outillage, version du moteur,
  terminologie, accessibilité) : **non traités à ce stade, assumés**. Ils n'affectent pas la
  valeur probante du registre. La fusion des deux implémentations est explicitement différée :
  la parité entre elles est aujourd'hui notre **instrument de mesure**, et on ne jette pas
  l'instrument avant la mesure.
- **Les constats hors code** — visas, exploitation du poste, gouvernance, protection des
  données — ne se tirent pas contre un serveur. Ils sont instruits séparément et relèvent de
  l'établissement : relecture par un organisme agréé fluides frigorigènes
  (`docs/T3-DOSSIER-RELECTURE-EXTERNE.md`, 11 questions écrites, plus 6 au délégué à la
  protection des données), chiffrement du poste et sauvegarde hors site, dossier RGPD. Nous
  n'en revendiquons aucune fermeture ici.

---

## 7. Erreurs factuelles du rapport, et une de la nôtre

Nous les signalons pour que le prochain audit parte de bases exactes. Chacune est datée : le
paquet que vous recevez n'est plus celui qui a été audité, et un chiffre sans sa version n'a
aucun sens.

- **« 32 migrations » (§3)** : le registre `server/migrations.js` est numéroté à partir de 2.
  Il allait jusqu'à la migration **n° 35** au moment de l'audit — soit **34 migrations**,
  numérotées de 2 à 35 — et jusqu'à la **n° 36** aujourd'hui, soit **35 migrations**. Nous
  précisons la distinction parce que ce paragraphe corrige un comptage : il doit être
  irréprochable sur le sien.
- **« environ 8 900 lignes » pour le dispatcher** : **le rapport a raison sur la version qu'il
  a auditée** — `server/api.js` y compte exactement **8 896 lignes**
  (`git show c32f8c0:server/api.js | wc -l`). Dans le paquet que vous recevez, les correctifs
  l'ont portée à **9 412**. Nous avions d'abord opposé 8 451 : c'était un artefact de comptage
  de notre part, corrigé par notre propre vérification. Nous le mentionnons parce qu'un audit
  se juge aussi à ce qu'on lui concède.
- **Les 16 échecs de tests (§5)** : **expliqués, et l'affirmation du rapport est exacte — mais
  elle porte sur le PAQUET, pas sur le logiciel.** Le générateur de paquet exclut par
  construction les cinq fichiers de bibliothèques tierces, le gabarit CERFA (présent en deux
  exemplaires) et, plus largement, **tout fichier non-code** : il ne retient que neuf
  extensions. L'arithmétique, refaite sur l'arbre audité :
  - en retirant de `c32f8c0` les bibliothèques et le gabarit CERFA, on obtient **exactement
    14 échecs sur 14 suites**, nommées ci-dessous ;
  - en retirant **aussi les images** — le paquet ne transporte aucun `.png` —, une quinzième
    tombe : `server/test-distribution-statique.mjs`, sur `/img/icon-192.png` en 404 ;
  - **la seizième, nous ne la reproduisons pas.** L'explication la plus probable est le constat
    P2-03 lui-même : le harnais de cette même suite n'était pas portable hors Windows, et il
    fait donc échouer une exécution menée sur un autre système. Mais nous travaillons sous
    Windows et nous ne pouvons pas le vérifier ; nous préférons vous le dire ainsi plutôt que
    d'annoncer « reproduits à l'identique ». **Si vous nous nommez la seizième suite, nous
    l'instruirons.**

  Les 14, nominativement, pour que vous n'ayez pas à les redécouvrir :
  `v8/js/cerfa/test-correction.mjs`, `v8/js/cerfa/test-generateur.mjs`,
  `v8/js/data/test-lot1.mjs`, `v8/js/data/test-scenario-lot1.mjs`,
  `v8/js/documents/test-bon-intervention.mjs`, `v8/js/documents/test-dossier-audit.mjs`,
  `v8/js/documents/test-etiquette-bouteille.mjs`, `v8/js/documents/test-etiquette-machine.mjs`,
  `v8/js/documents/test-exports.mjs`, `v8/js/documents/test-feuille-mise-en-service.mjs`,
  `v8/js/documents/test-fiche-identification-machine.mjs`,
  `v8/js/modales/test-bouteille-form.mjs`, `v8/js/wizard/test-wizard.mjs`,
  `v8/test-chargement.mjs`. Toutes échouent sur un `Cannot find module` visant
  `v8/js/lib/qrcode.js` ou `v8/js/lib/pdf-lib.min.js`. Sur le dépôt complet, le filet passe
  TOUT VERT.
- **Notre propre erreur, la plus coûteuse** : le brief remis à l'auditeur annonçait « deux
  modes, strictement séparés » et présentait les écritures Formation comme « modifiables » face
  à des écritures Officiel « scellées ». **C'est faux** : une écriture Formation validée porte
  une empreinte chaînée et refuse la suppression, exactement comme une officielle. Ce paragraphe
  est très probablement la source du malentendu du §3. Il est réécrit dans ce paquet, et il
  porte désormais l'avertissement de sa propre erreur.

---

## 8. Ce que nous demandons au prochain audit

1. **Traitez le §3 en premier.** Si vous maintenez qu'il faut deux univers de données, traitez
   le contrefactuel : le gaz part réellement dans la machine, la fiche est inerte, l'inventaire
   physique est saisi. Que devient la balance ? Le banc est joint —
   `node docs/banc-contrefactuel-P0-02.mjs inerte` — et vous pouvez le modifier : il tient en
   une page et ne touche aucune donnée réelle.
2. **Attaquez les correctifs, pas seulement le code d'origine.** Dans cette campagne, plusieurs
   défauts sont nés des corrections elles-mêmes, et chacune des trois passes en a produit au
   moins un (§5). Les nôtres n'ont pas de raison d'échapper à la règle.
3. **Prenez la suite de sécurité négative comme point d'entrée**
   (`node server/test-securite-negative.mjs`, **207 attaques et preuves** au dernier tir). C'est
   le répertoire des refus déjà prouvés. Si une attaque que vous jugez évidente n'y figure pas,
   c'est un signal en soi.
4. **Le métier, dites-le-nous quand il vous manque.** Ce logiciel sert un atelier de lycée
   professionnel où les élèves manipulent du fluide réel sur un parc réel. Deux audits
   successifs ont buté sur ce point : nous en concluons que c'est **notre documentation** qui
   l'exposait mal, et nous l'avons réécrite (§7). Si une exigence vous paraît évidente et que
   nous la discutons, c'est qu'elle produit peut-être en atelier un effet que nous n'avons pas
   su décrire — dites-le, nous répondrons.
5. **Les points que nous savons ouverts** : le témoin d'intégrité du journal se recalcule
   (l'algorithme est dans le code diffusé ; la parade — confrontation au témoin de scellement
   externe quotidien — n'est pas faite) ; le modèle de menace s'arrête à l'accès disque ; le
   mode Officiel n'a jamais tourné en production ; le poste est unique ; et **certaines valeurs
   réglementaires** (seuils d'aptitude, exemption hermétique, dates de la condition 10) sont
   codées de façon délibérément conservatrice en attendant la confirmation d'un organisme
   agréé — elles sont listées dans `docs/T3-DOSSIER-RELECTURE-EXTERNE.md`. Inutile de les
   chercher, elles sont là. Dites-nous plutôt s'il en manque.

---

## Annexe — comment vérifier chaque affirmation de ce mémoire

Les commandes se lancent depuis la racine du dépôt, sans rien installer. Les documents cités
partent tous dans ce paquet.

| Ce qui est affirmé | Où c'est vérifiable |
|---|---|
| Le filet passe de 106 à 121 exécutions | `node outils/lancer-tests.mjs --tout` sur ce paquet (121) et sur l'arbre `c32f8c0` (106) |
| La suite de sécurité négative compte 207 attaques et preuves | `node server/test-securite-negative.mjs` |
| Aucune borne de taille ne sépare une case vierge d'une signature | `node outils/test-taille-signature.mjs` |
| Le contrefactuel du §3.2 | `node docs/banc-contrefactuel-P0-02.mjs inerte` puis `… vivant` |
| Les anciens chiffres de taille sont rétractés par nous | `CHANGELOG.md`, lot B3 ; `docs/PLAN-B3-SIGNATURE.md` § « Honnêteté sur les chiffres » |
| Les décisions du détenteur sur la signature (D1, D2, D3) | `docs/PLAN-B3-SIGNATURE.md` §3 |
| La condition n° 18 et le refus d'un troisième objet | `docs/CONDITIONS-BLOCANTES-OFFICIEL.md` |
| Le compte des constats des trois revues, lot par lot | tête de `CHANGELOG.md` |
| Le nombre de 31 constats et les six trous retenus | `docs/PROMPT-REPRISE.md`, bloc du 26/07 |
| Le pré-remplissage du signataire existait avant l'audit | `git show c32f8c0:v8/js/data/parcours-signature.js` |
| 8 896 lignes à l'audit, 9 412 aujourd'hui | `git show c32f8c0:server/api.js \| wc -l` puis `wc -l server/api.js` |
| 34 migrations (n° 2→35) à l'audit, 35 (n° 2→36) aujourd'hui | `server/migrations.js` aux deux versions |
| Les 14 échecs du paquet, reproduits | extraire `c32f8c0`, retirer `v8/js/lib/` et les deux `cerfa_15497-04_officiel.pdf`, relancer le filet |
| Les 15 échecs, images comprises | même manipulation, en retirant aussi les `.png` et les `.svg` |
