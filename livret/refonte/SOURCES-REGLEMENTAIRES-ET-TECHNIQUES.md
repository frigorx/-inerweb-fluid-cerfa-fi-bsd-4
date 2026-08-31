# Sources réglementaires et techniques — inerWeb HabFluide

> **Livrable 7** du cadrage éditorial du 31 août 2026.
> Ce document dit **d'où vient chaque affirmation réglementaire du livre**, et ce que le livre
> s'interdit d'affirmer.
>
> Règle tenue : *le texte officiel garde toujours l'autorité*. Aucun fichier de travail, aucune
> synthèse, aucune note de cours ne se substitue à lui.

---

## 1. Les textes qui font autorité

### Textes européens

**Règlement (UE) 2024/573** du Parlement européen et du Conseil, relatif aux gaz à effet de serre
fluorés. C'est le texte de référence pour : les valeurs de PRP (annexe I), les interdictions de mise
sur le marché, les quotas, les obligations de contrôle d'étanchéité, la récupération et la
traçabilité.

**Règlement d'exécution (UE) 2024/2215**, qui précise les modalités d'application.

*Ce que le livre en tire* : les ordres de grandeur de PRP cités au chapitre ozone-climat, le principe
du calcul en tonnes équivalent CO₂, l'interdiction de rejet volontaire.

*Ce que le livre ne fait pas* : il ne reproduit pas les tableaux de seuils. Ils changent, et un
livre imprimé les figerait. Le livre enseigne **le calcul**, qui ne change pas, et renvoie au texte
en vigueur au jour de l'intervention pour **le seuil**.

### Textes français

**Code de l'environnement**, notamment l'article R. 543-106, qui fonde l'exigence d'attestation
d'aptitude.

**Arrêté du 21 novembre 2025** relatif à la délivrance des attestations d'aptitude prévues à
l'article R. 543-106 du code de l'environnement — NOR TECP2532494A, publié au *JORF* du
10 décembre 2025, texte 9 sur 135.

C'est **la source unique** du référentiel de compétences. Son annexe II fixe les modalités
d'évaluation, les catégories, les durées d'épreuve et la liste des connaissances exigées.

*Traçabilité dans la chaîne* : le fichier `packs/fluides/referentiel-2025.json` est une
**transcription verbatim** de cette annexe II. Il porte lui-même sa source, sa règle de modification
(« ne se modifie que sur pièce, nouveau texte publié au JO ») et la liste des anomalies relevées dans
le texte publié. Les 39 codes théoriques du livre ne sont écrits en dur nulle part : ils sont
**calculés** par filtrage de ce fichier sur les catégories A1, A2, D et E. Un nouvel arrêté les
recalcule.

### Normes

**NF EN 378** — sécurité et environnement des systèmes de réfrigération. Le livre s'en sert pour la
lecture des classes de sécurité.

*Statut rappelé au lecteur* : une norme **n'est pas la loi**. Elle devient contraignante lorsqu'un
texte réglementaire la rend obligatoire, ou lorsqu'un contrat s'y réfère. Le livre le dit
explicitement au chapitre sur la hiérarchie des textes, parce que la confusion entre norme et
règlement est une erreur courante en épreuve comme sur le terrain.

### Documentation constructeur

Elle n'a pas valeur réglementaire, mais elle engage la responsabilité de l'intervenant et la garantie
du matériel.

*Règle d'écriture appliquée dans tout le livre* : partout où une valeur de réglage, une plage de
surchauffe, une pression de service ou une compatibilité est en jeu, le texte porte la mention
**« selon plaque ou documentation constructeur »**. Aucune plage « habituelle » universelle n'est
donnée comme si elle était une norme.

---

## 2. Ce que le livre s'interdit

**Il ne délivre aucune attestation.** Il prépare l'épreuve théorique. La formation encadrée,
l'apprentissage pratique, l'évaluation officielle et la décision de l'organisme évaluateur certifié
restent entiers.

**Il ne prépare pas les catégories B et C.** Le CO₂ et l'ammoniac y sont enseignés pour être
reconnus, pour que le lecteur en comprenne les caractéristiques générales et sache **s'arrêter**. La
frontière est écrite dans le livre et vérifiée dans la chaîne : le périmètre `A1, A2, D, E` est le
filtre qui produit les 39 codes.

**Il n'enseigne pas le geste.** Le brasage, la charge, la récupération sont expliqués et préparés ;
ils se démontrent et s'évaluent en atelier. La formule employée dans le livre est : *le livre
explique et prépare, l'atelier démontre et évalue le geste.*

**Il n'utilise aucune des 89 questions officielles.** Le verrou est en dur dans la chaîne
(`extraire.mjs`, `qr.mjs`) : toute question d'identifiant `pk-*` arrête la fabrication. Les
questions du livre sont soit issues de la banque publique d'entraînement, soit écrites pour ce livre.

---

## 3. Les valeurs citées, et leur statut

Le cadrage impose de distinguer trois natures de valeur. Le livre applique cette distinction.

| Nature | Exemple dans le livre | Comment le livre la traite |
|---|---|---|
| **Valeur réglementaire** | PRP du R-404A ≈ 3 900 | Citée avec sa source (annexe I du règlement 2024/573) et présentée comme un ordre de grandeur à vérifier |
| **Valeur constructeur** | Plage de surchauffe d'un détendeur | Jamais donnée comme générale ; renvoi explicite à la documentation |
| **Repère pédagogique** | « deux à trois pour cent de COP par kelvin » | Présenté comme un repère de raisonnement, avec mention que la valeur exacte dépend du fluide et du point de fonctionnement |

Cette troisième ligne mérite attention. Un repère pédagogique aide à hiérarchiser des gestes ; il ne
se cite pas dans un rapport comme s'il était une mesure. Le livre le dit à chaque fois qu'il en
emploie un.

---

## 4. Les points où le livre reste prudent, et pourquoi

**Les PFAS et les produits de décomposition.** Le livre expose le mécanisme — la décomposition
atmosphérique de plusieurs fluides fluorés conduit à des composés stables, dont l'acide
trifluoroacétique, qui appartient à la famille des PFAS — et s'arrête là. Les effets à long terme
font l'objet de travaux scientifiques et de discussions réglementaires **en cours** ; des
restrictions européennes sont à l'étude. Le livre fournit au lecteur une formulation défendable et
lui apprend à ne conclure ni dans un sens ni dans l'autre.

**Les seuils réglementaires.** Ils ont changé plusieurs fois et changeront encore. Le livre enseigne
les calculs et renvoie aux textes pour les seuils. C'est la seule façon qu'un livre imprimé a de ne
pas devenir faux.

**La transition et les échéances.** Elles sont mentionnées comme mécanisme, avec renvoi au texte.
Aucune date n'est présentée comme définitive sans sa source.

---

## 5. Sources techniques et documentaires internes

| Ressource | Rôle | Statut |
|---|---|---|
| `packs/fluides/cartes.js` | Texte de cours du site inerWeb, écrit par F. Henninot | Source éditoriale historique du livre |
| `livret/build/contenu-refonte.mjs` | Texte écrit pour la refonte, là où les cartes ne couvraient pas le référentiel | Brouillon, en attente de bon à tirer |
| `livret/build/questions-refonte.mjs` | 39 questions rattachées aux codes, écrites pour ce livre | Brouillon, en attente de bon à tirer |
| `packs/fluides/referentiel-2025.json` | Transcription verbatim de l'annexe II | Instrument de travail ; le JO fait foi |
| `packs/fluides/res/svg/` | 72 planches vectorielles dessinées | Voir `REGISTRE-VISUELS.md` |
| `legislation/stations/*/svg/` | 232 planches des stations | Voir `REGISTRE-VISUELS.md` |

---

## 6. Ce qui reste à faire sur les sources

- **Vérifier les valeurs de PRP citées** contre l'annexe I du règlement dans sa version consolidée à
  la date du bon à tirer. Les ordres de grandeur du livre sont cohérents avec les valeurs usuelles,
  mais une vérification sur pièce est due avant impression.
- **Dater la vérification** de chaque affirmation réglementaire, et porter cette date dans le livre.
- **Statuer sur la mention QElectroTech CC BY 3.0** imprimée aux crédits : l'audit des visuels n'a
  trouvé aucun visuel provenant de cette collection dans le livre. Soit un symbole en provient et il
  faut l'identifier, soit la mention est orpheline. Elle ne sera pas retirée sans cette vérification,
  l'attribution d'une licence CC BY étant une obligation, pas une option.

---

*Document de travail. Aucune valeur n'est réputée validée avant le bon à tirer explicite de
F. Henninot.*
