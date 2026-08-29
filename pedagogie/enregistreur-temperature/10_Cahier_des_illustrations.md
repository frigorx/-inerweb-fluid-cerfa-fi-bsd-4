# 10 — Cahier des illustrations

**Ce qui est dessiné, ce qui est à photographier, et ce qui n'existera pas
avant le prototype.**

Le § 22 du dossier maître demandait 50 illustrations. En voici l'état exact.

| État | Nombre | Ce que ça veut dire |
|---|---:|---|
| **FAIT** | 7 | dessiné, rendu, contrôlé, dans `illustrations/` |
| **À PHOTOGRAPHIER** | 33 | impossible sans le prototype et sans les composants |
| **À DESSINER** | 10 | possible, non prioritaire |

> **Aucune illustration n'est fabriquée à partir d'une image trouvée ailleurs.**
> Les sept planches faites sont dessinées à la main en SVG, dans la charte
> inerWeb Édu, et régénérables. Les 33 photographies attendent le prototype :
> photographier un montage qui n'existe pas n'est pas possible, et illustrer un
> geste avec l'image d'un autre montage serait pire que de ne rien mettre.

---

## 1. Ce qui est FAIT — 7 planches

| Fichier | Ce qu'elle montre | Où elle sert |
|---|---|---|
| `chaine-acquisition.svg` | les 9 étapes, de la chaleur à la courbe, en 3 mondes (physique / électrique / numérique) | accueil du site · module 1B |
| `pont-diviseur.svg` | le pont, sa formule, et les 3 cas froid / 25 °C / chaud | module 1B · fiche 2 |
| `cablage-une-voie.svg` | une voie complète, de la sonde à l'entrée du convertisseur | module 2B · fiche 4 |
| `schema-general.svg` | les 6 voies, les 8 entrées, les 3 adresses, le bus | module 2B · dépannage |
| `alimentation.svg` | PILES – 0 – USB, la Schottky, la mesure des piles | module 2B · fiche 5 |
| `gabarit-percage.svg` | **1:1 sur A4**, avec carré de contrôle de 50 mm | module 2A · fiche 3 |
| `face-avant.svg` | **1:1 sur A4**, étiquette de couvercle + 12 étiquettes T1-T6 | module 2A |

### Deux d'entre elles sont des **outils**, pas des images

`gabarit-percage.svg` et `face-avant.svg` s'impriment **à l'échelle 1:1** et
portent chacune un carré de contrôle de 50 mm. Elles ne servent à rien
affichées à l'écran ; elles servent sur l'établi, collées au ruban de masquage.

**« Ajuster à la page » les fausse de 3 à 5 %**, soit 4 mm sur 120 — et six
embases ne rentrent plus. Le carré est là pour ça, et il se vérifie sur
**chaque exemplaire imprimé**.

---

## 2. À PHOTOGRAPHIER — 33 vues

**Toutes attendent le prototype n°1.** L'ordre ci-dessous est celui dans lequel
elles se prennent naturellement pendant le montage : suivre cette liste, appareil
photo posé sur pied à côté de l'établi, et le cahier se remplit tout seul.

### 2.1 Pendant le déballage des composants — 12 vues

Une par composant, à plat sur fond neutre, avec un réglet dans le cadre.

| # | Sujet | Ce qu'il faut absolument voir |
|---:|---|---|
| 1 | ESP32-C3 SuperMini | le connecteur **USB-C**, et la LED (pour trancher GPIO8) |
| 2 | ADS1115 | la broche **ADDR** et son marquage |
| 3 | Écran OLED 1,3" | l'ordre des 4 broches, et le pontet d'adresse au dos |
| 4 | Sonde NTC gaine inox | la gaine, le câble, et son marquage de température |
| 5 | Embase jack de panneau | **le filetage**, mesuré au pied à coulisse dans le cadre |
| 6 | Fiche jack à visser, démontée | les deux contacts, corps et broche |
| 7 | Sélecteur 3 positions | les cosses, et le repère de la position centrale |
| 8 | Convertisseur abaisseur-élévateur | le potentiomètre de réglage, IN et OUT |
| 9 | Porte-piles 3 × AA | la polarité des fils |
| 10 | Boîtier ABS ouvert | les colonnettes d'angle et les congés de moulage |
| 11 | Rallonge USB-C de façade | les deux extrémités |
| 12 | Plaque à pastilles | le pas de 2,54 mm, réglet dans le cadre |

> **Le réglet dans le cadre n'est pas décoratif.** Sans échelle, une photo de
> composant ne dit pas si l'objet fait 6 mm ou 16 mm — et c'est exactement
> l'information qui manque quand on commande.

### 2.2 Pendant le montage mécanique — 6 vues

| # | Sujet |
|---:|---|
| 13 | Le gabarit collé au ruban de masquage sur le boîtier |
| 14 | Le pointage au pointeau |
| 15 | Le perçage, **pièce bridée** — cette photo sert de consigne de sécurité |
| 16 | La découpe de la fenêtre à l'outil rotatif |
| 17 | L'ébavurage |
| 18 | Le montage à blanc, tout en place, rien de soudé |

### 2.3 Pendant le câblage — 8 vues

Ce sont les plus utiles du cahier, et les plus difficiles à trouver ailleurs.

| # | Sujet | Ce qu'il faut voir |
|---:|---|---|
| 19 | Longueur de dénudage correcte | **5 mm**, avec un réglet |
| 20 | Fil correctement étamé | l'étain mouille les brins |
| 21 | **Fil trop étamé** — le contre-exemple | la boule d'étain rigide |
| 22 | **Bonne soudure** | brillante, en petit cône |
| 23 | **Soudure froide** — le contre-exemple | terne, bombée, mal accrochée |
| 24 | **Surcharge d'étain** — le contre-exemple | la goutte qui déborde |
| 25 | Gaine thermo enfilée **avant** la soudure | le geste qui ne se rattrape pas |
| 26 | Utilisation de la tresse à dessouder | |

> **Les trois contre-exemples (21, 23, 24) valent plus que les trois exemples.**
> On reconnaît une bonne soudure quand on a vu une mauvaise. Les prendre
> **volontairement** pendant le montage du prototype, en ratant exprès.

### 2.4 Pendant les contrôles et la mise en service — 4 vues

| # | Sujet |
|---:|---|
| 27 | Mesure de continuité sur une embase, pointes en place |
| 28 | Mesure d'un pont : rail → point milieu, **10,00 kΩ** lisible à l'écran du multimètre |
| 29 | Contrôle du sens de D1, multimètre en **mode diode** |
| 30 | L'écran affichant les six températures — **la photo d'ouverture du dossier** |

### 2.5 Pendant l'exploitation — 3 vues

| # | Sujet | Ce qu'il faut voir |
|---:|---|---|
| 31 | **Sonde plaquée et isolée sur un tube** | le collier, puis l'isolant par-dessus |
| 32 | **Sonde nue sur un tube** — le contre-exemple | et l'erreur de 2 à 5 K qui va avec |
| 33 | L'appareil en service sur une installation, sondes posées | |

---

## 3. À DESSINER — 10 planches, non prioritaires

Possibles dès maintenant, mais moins utiles que les 33 photos.

| # | Planche | Pourquoi elle serait utile |
|---:|---|---|
| 34 | Vue éclatée du boîtier | montrer l'ordre de montage |
| 35 | Implantation des cartes dans le boîtier | où va quoi, et pourquoi |
| 36 | Brochage annoté de l'ESP32-C3 | avec les broches **interdites** en rouge |
| 37 | Brochage annoté de l'ADS1115 | avec les 4 adresses possibles |
| 38 | Le bus I²C expliqué | deux fils, plusieurs circuits, une adresse chacun |
| 39 | Le câblage des 6 voies vu de la plaque | complète `cablage-une-voie.svg` |
| 40 | La courbe R(T) de la NTC, tracée | complète le tableau du § 3.4 des plans |
| 41 | La recherche d'un court-circuit, pas à pas | méthode de dépannage illustrée |
| 42 | Lecture d'un démarrage frigorifique, annotée | les 6 courbes, avec les repères |
| 43 | Exemple de CSV ouvert dans un tableur | ce qu'on doit voir après l'export |

> **La n° 42 est celle qui manque le plus au module 4.** Elle ne peut être
> dessinée que d'après un **enregistrement réel** — donc après le prototype et
> un premier essai sur machine. Le mode démonstration de
> `site/exploitation.html` en donne une approximation utilisable en attendant,
> et il est signalé comme tel à l'écran.

---

## 4. Les animations du § 23

Le dossier maître en demandait dix, très courtes. **Aucune n'est faite**, et
c'est un choix, pas un oubli.

| Ce que demandait le § 23 | Ce qui le tient aujourd'hui |
|---|---|
| variation de résistance d'une NTC | **la sonde dans la main**, en séance 1A. Aucune animation ne bat ça |
| fonctionnement d'un pont diviseur | `pont-diviseur.svg`, les 3 cas côte à côte |
| conversion analogique-numérique | le tableau du § 3.4 : la colonne « °C par pas » |
| circulation de la donnée vers l'ESP32 | `chaine-acquisition.svg` |
| affichage OLED | l'appareil lui-même |
| envoi USB | le moniteur série, une ligne par seconde |
| envoi Bluetooth | la page d'acquisition, en direct |
| enregistrement d'une mesure | l'export CSV, ouvert dans le tableur |
| évolution au démarrage d'une machine | **le mode démonstration** de `exploitation.html` |
| démarche de recherche de panne | les 8 pannes à provoquer du dossier professeur |

**Neuf des dix sont tenues par quelque chose de mieux qu'une animation : la
chose elle-même.** Une animation de NTC qui chauffe est moins convaincante
qu'une NTC qu'on serre dans la main avec un ohmmètre dessus.

La dixième — l'évolution au démarrage — est celle qui manque vraiment quand on
n'a pas de machine sous la main. C'est exactement pour ça que le mode
démonstration existe.

---

## 5. Comment prendre ces photos, en pratique

Une demi-journée bien organisée suffit pour les 33.

1. **Appareil photo sur pied, à côté de l'établi**, cadré et réglé une fois pour
   toutes. Un téléphone récent suffit largement.
2. **Fond neutre** : une feuille A3 blanche ou gris clair, posée sous la pièce.
3. **Lumière latérale**, pas de flash direct : le flash écrase le relief d'une
   soudure, qui est précisément ce qu'on veut montrer.
4. **Un réglet dans le cadre** pour tout ce qui a une dimension.
5. **Prendre les contre-exemples pendant qu'on monte**, pas après. Rater une
   soudure exprès quand on est déjà installé prend trente secondes ; y revenir
   plus tard prend une heure.
6. **Nommer les fichiers tout de suite** : `19-denudage-5mm.jpg`,
   `23-soudure-froide.jpg`. Une photo non nommée le jour même ne sera plus
   jamais identifiée.
7. Les déposer dans `illustrations/photos/` et compléter les tableaux ci-dessus.

---

## 6. Règle de provenance

Même règle que pour le reste du dépôt :

- **Les 7 planches faites** sont dessinées ici, régénérables, dans la charte.
  `schema-general.svg` et les deux planches 1:1 sont produites par script, ce
  qui garantit que les cotes sont calculées et non placées à l'œil.
- **Les 33 photos** seront prises sur le prototype et l'installation de
  l'atelier. Elles ne viendront d'aucune banque d'images.
- **Aucune illustration ne représente un composant qu'on n'a pas.** Un dessin
  d'ESP32-C3 fait de mémoire, c'est un brochage faux dans un dossier
  pédagogique — la faute la plus coûteuse possible.
