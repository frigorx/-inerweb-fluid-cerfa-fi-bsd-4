# Rapport de QA — inerWeb HabFluide

> **Livrable 10** du cadrage éditorial du 31 août 2026.
> Ce que la chaîne vérifie, ce qu'elle a trouvé, et **ce qu'aucune QA automatique ne pourra dire**.

---

## Avertissement liminaire

Une QA automatique n'est jamais un bon à tirer. Elle ne constitue ni une validation métier, ni une
validation pédagogique, ni une validation juridique, ni une autorisation de publication. Ce rapport
dit qu'un ensemble de conditions vérifiables sont remplies. Il ne dit pas que le livre est juste.

---

## 1. Les contrôles bloquants

Chacun de ces contrôles **arrête la fabrication**. Aucun n'est un avertissement.

### Contenu et référentiel — `build/extraire.mjs`

| Contrôle | État |
|---|---|
| Chaque code théorique A1/A2/D/E est porté par un chapitre | **39/39** |
| Chaque code atteint le plancher de profondeur (800 mots de cours) | **39/39** |
| Chaque code porte au moins une question d'entraînement rattachée | **39/39** |
| Aucune question officielle `pk-*` n'a filtré dans le livre | **vérifié** |
| Chaque désignation du plan trouve sa source (fiche, paragraphe, bloc) | **vérifié** |
| Chaque chapitre a des questions | **vérifié** |

Les deux planchers ont été relevés au fil du chantier, à mesure que le contenu progressait :
250 mots, puis 400, puis 600, puis 800. Chaque relèvement a été franchi **sans dérogation**. La
variable d'environnement `REFONTE=1`, qui transformait le contrôle de profondeur en avertissement
pendant l'écriture, n'est plus nécessaire et n'est plus utilisée.

### Visuels — `build/visuels.mjs`

| Contrôle | État |
|---|---|
| Chaque page porte au moins une illustration | **vérifié** |
| Chaque référence de visuel trouve son fichier | **159 références** |
| Autant de légendes que de visuels | **vérifié** |
| Aucune image `bib-*` (captures de documents tiers) | **verrou en dur** |
| Aucun visuel du dossier aux droits non établis | **verrou en dur** |
| Aucune photographie de matériel de marque | **verrou en dur** |
| Aucune des trois planches écartées à la relecture | **verrou en dur** |

Ces quatre derniers verrous n'étaient, avant le 31 août, que des **commentaires** dans le code. Le
résultat était conforme, mais uniquement par discipline : rien n'empêchait leur réintroduction. Ils
sont maintenant exécutables.

### Fabrication Amazon KDP — `build/verifier-kdp.py`

| Contrôle | État |
|---|---|
| Un seul format de page dans le fichier | **conforme** |
| Format conforme aux réglages (7 × 10 pouces) | **conforme** |
| Nombre de pages pair | **conforme** |
| Pagination dans les bornes KDP (24 à 828) | **418 pages** |
| Toutes les polices embarquées | **conforme** |
| Aucun marqueur de fabrication `@@` dans la couche texte | **conforme** |
| Rien à moins de 6,35 mm du bord | **conforme** |
| La fiche KDP annonce le même nombre de pages que le PDF | **conforme** |
| Marge de reliure suffisante pour cette pagination | **conforme** |
| La couverture tient en une page, aux cotes attendues | **conforme** |

---

## 2. Les réserves subsistantes

### Une image sous 300 points par pouce

Une seule, à 262 ppp. Amazon l'accepte ; elle sera simplement un peu moins nette que les autres.

*Historique* : elles étaient **dix-sept** avant correction, la plus faible à 168 ppp. Ce sont les
icônes, natives en 512 pixels, qui étaient étalées sur toute la largeur de la justification. Elles
sont désormais plafonnées à 40 mm, ce qui les remet au-dessus du seuil.

### Polices Type 3 : résolu

Aucune. Le contrôle n'émet plus cet avertissement.

*Historique* : la bascule vers Lexend avait introduit **25 polices Type 3** — des glyphes dessinés
au lieu d'une police embarquée, sur la quasi-totalité des pages. Cause : le pack ne fournit Lexend
qu'en fonte variable, que Chrome instancie glyphe par glyphe à l'impression. Deux instances statiques
sont désormais produites par `build/lexend-statique.py` et commises.

### La licence contradictoire des planches

**39 planches** portent dans leur code une déclaration `cc:license` **CC BY-NC-ND 4.0** — qui
interdit l'usage commercial et les œuvres dérivées — alors que leur champ `dc:rights` du même fichier
indique « © inerWeb, tous droits réservés ».

Aucun blocage juridique : F. Henninot est l'auteur et peut disposer de son travail. Mais la
déclaration est incohérente, elle part à l'impression dans un livre vendu, et le garde-fou existant
ne la voit pas — il teste le texte de `dc:rights`, jamais l'attribut `cc:license`.

**À nettoyer dans le pack `pilote-fluides` avant le bon à tirer.** Ce n'est pas fait ici parce que
cela touche des fichiers sources du site, hors du périmètre du livre.

### La mention QElectroTech

Les crédits imprimés portent une attribution QElectroTech CC BY 3.0. L'audit n'a trouvé **aucun
visuel provenant de cette collection** parmi ceux que le livre imprime.

Soit un symbole en dérive et il faut l'identifier, soit la mention est orpheline. Elle **n'a pas été
retirée** : l'attribution d'une licence CC BY est une obligation, pas une option, et une mention en
trop est un moindre mal qu'une attribution manquante. À trancher sur vérification.

---

## 3. Le filet de tests

`node outils/lancer-tests.mjs --tout` — **140 exécutions, toutes vertes**, en environ trois minutes.

Rappel de procédure : `livret/dist` doit être déplacé hors du dépôt le temps des tests.

---

## 4. Ce que cette QA ne dit pas, et qui reste à faire

**L'exactitude métier.** Aucun contrôle ne vérifie qu'une phrase technique est juste. Le texte écrit
pendant la refonte — sept blocs, environ 10 000 mots — n'a été relu par personne d'autre que son
auteur.

**Les valeurs réglementaires.** Les ordres de grandeur de PRP cités doivent être vérifiés sur pièce
contre l'annexe I du règlement (UE) 2024/573 dans sa version consolidée à la date du bon à tirer.
Le livre les présente comme des ordres de grandeur et renvoie au texte ; cela réduit le risque, ne
le supprime pas.

**La pertinence pédagogique.** La mesure de profondeur compte des mots. Elle ne dit pas si ces mots
enseignent. C'est le jugement de F. Henninot, et il n'est pas délégable.

**Le rendu des 43 illustrations.** Elles ont été examinées à l'œil le 31 août, et six légendes qui
ne décrivaient pas ce qu'elles montrent ont été corrigées. Cet examen portait sur l'appariement
image-légende, pas sur l'exactitude technique de chaque dessin.

**L'état figé des planches animées.** Soixante planches sont animées à l'écran. À l'impression,
c'est leur état initial qui est capturé, et cet état n'est pas toujours celui qui porte
l'information complète. Un relevé existe (`reveillees.gen.json`) ; il n'a pas été vérifié page à
page.

---

## 5. Ce qui ne doit pas être fait avant le bon à tirer

Le cadrage l'énonce et il est tenu :

- pas de fabrication de couverture définitive ;
- pas de demande d'ISBN ;
- pas de téléversement sur KDP ;
- pas de publication des QR ;
- pas d'indexation dans le RAG.

Les deux pull requests restent ouvertes. Les 192 pages `/f/` ne sont pas en ligne : elles attendent
la fusion de la PR du site, qui n'a pas été demandée.

---

*Établi le 31 août 2026 sur le PDF fabriqué. Une QA automatique n'est jamais un bon à tirer.*
