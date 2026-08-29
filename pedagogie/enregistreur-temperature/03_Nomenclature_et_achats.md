# 03 — Nomenclature et achats

**Ce qu'on commande, en quelle quantité, et les pièges.**

> ### Pourquoi il n'y a aucun lien fournisseur dans ce document
> Trois raisons, et elles tiennent. Un lien meurt en six mois. Le prix d'un
> module varie du simple au double d'une semaine à l'autre. Et le dossier doit
> rester utilisable par un collègue qui n'achète pas au même endroit.
>
> Ce document donne donc des **familles de composants** avec leurs **critères de
> choix** et leurs **pièges**. C'est ce qui ne périme pas.
>
> Le § 34 du dossier maître demande ensuite une fiche par composant, avec photo,
> référence et lien. Elle n'est pas écrite : **elle ne peut pas l'être tant que
> le composant n'est pas sur la table.** Voir
> [`POINTS-OUVERTS.md`](POINTS-OUVERTS.md) § B2.

---

## 1. Nomenclature d'un appareil

Repères conformes au schéma de [`05_Plans_et_schema.md`](05_Plans_et_schema.md).

### 1.1 Électronique

| Repère | Désignation | Qté | Critère de choix | Budget |
|---|---|---:|---|---:|
| **A1** | ESP32-C3 SuperMini USB-C | 1 | connecteur **USB-C** (pas micro-USB), broches non soudées ou barrettes fournies | ~3 € |
| **A2, A3** | ADS1115 — module 4 voies 16 bits | 2 | module avec broche **ADDR accessible**, pas soudée à demeure | ~2 € pièce |
| **A4** | Écran OLED **1,3"** 128 × 64 I²C | 1 | 4 broches (VCC, GND, SCL, SDA). **Voir le piège n° 1** | ~4 € |
| **U1** | Convertisseur DC-DC **abaisseur-élévateur** réglable | 1 | **abaisseur-élévateur obligatoire**. Voir le piège n° 4 | ~2 € |
| **D1** | Diode Schottky 1N5819 ou SS14 | 1 | Schottky, pas une 1N4007 : la chute serait double | ~0,10 € |
| **F1** | Fusible réarmable PPTC 200 mA | 1 | tension ≥ 6 V | ~0,15 € |
| **R1…R8** | Résistance **10 kΩ ± 0,1 %** 1/4 W | 8 | **0,1 %, pas 1 %.** Voir le piège n° 3 | ~0,08 € pièce |
| **R9, R10** | Résistance 100 kΩ ± 1 % 1/4 W | 2 | | ~0,02 € |
| **C1** | Condensateur 100 µF / 10 V | 1 | électrochimique ou tantale | ~0,10 € |
| **C2…C8** | Condensateur 100 nF céramique | 7 | X7R de préférence | ~0,03 € pièce |
| | **Sous-total électronique** | | | **~14 €** |

### 1.2 Sondes et connectique

| Repère | Désignation | Qté | Critère de choix | Budget |
|---|---|---:|---|---:|
| — | Sonde **NTC 10 kΩ B3950**, gaine inox étanche | 6 | câble donné pour **105 °C**, longueur 1 à 3 m | ~0,70 € pièce |
| **J1…J6** | Embase jack 3,5 mm **mono**, de panneau | 6 | **mesurer le filetage**, pas le corps. Voir le piège n° 5 | ~0,40 € pièce |
| — | Fiche jack 3,5 mm mono, **à visser** | 6 | démontable — une fiche moulée ne se répare pas | ~0,35 € pièce |
| **X1** | Rallonge USB-C de façade, courte | 1 | **avec données**. Voir le piège n° 2 | ~2 € |
| — | Câble USB-C ↔ USB-A ou C, **avec données** | 1 | idem | ~1,50 € |
| | **Sous-total sondes + connectique** | | | **~12 €** |

### 1.3 Mécanique et alimentation

| Désignation | Qté | Critère de choix | Budget |
|---|---:|---|---:|
| Boîtier ABS ≈ 120 × 90 × 60 mm | 1 | **couvercle plat** de préférence : l'écran s'y encastre mieux | ~5 € |
| **S1** — inverseur 3 positions ON-OFF-ON | 1 | 1 ou 2 pôles, peu importe (voir POINTS-OUVERTS § O1) | ~1,50 € |
| Porte-piles 3 × AA avec fils | 1 | avec fils souples, pas à souder sur languette | ~1 € |
| Piles AA alcalines | 3 | | ~1,20 € |
| Plaque à pastilles / PCB prototype | 1 | pastilles individuelles, pas de bandes | ~1 € |
| Barrettes mâles et femelles 2,54 mm | 1 lot | **femelles pour les modules** : voir la note ci-dessous | ~1 € |
| Entretoises nylon M3 + vis + écrous + rondelles | 4 à 8 | | ~1 € |
| Pieds caoutchouc adhésifs | 4 | | ~0,50 € |
| Étiquette de façade + étiquettes T1 à T6 | 1 planche | imprimée depuis `illustrations/face-avant.svg` | ~0,30 € |
| | **Sous-total mécanique** | | **~13 €** |

> **Les barrettes femelles ne sont pas un luxe.** Les trois modules (ESP32,
> deux ADS1115, écran) se posent sur des barrettes femelles soudées à la plaque,
> jamais soudés directement. Une carte grillée se remplace alors **sans fer à
> souder**, en trente secondes, au milieu d'une séance. C'est 1 € qui sauve une
> heure.

### 1.4 Consommables de fabrication

Détaillés en [`04_Outillage_et_consommables.md`](04_Outillage_et_consommables.md).
Environ **5 à 6 €** par appareil (fil, gaine, étain, flux, colliers, colle).

### 1.5 Total

| Poste | Budget |
|---|---:|
| Électronique | ~14 € |
| Sondes et connectique | ~12 € |
| Mécanique et alimentation | ~13 € |
| Consommables de fabrication | ~5,5 € |
| **Coût réaliste par appareil terminé** | **≈ 45 €** |

Le dossier maître annonçait 40 à 45 €. La cible tient — avec deux résistances de
précision et six condensateurs de plus que prévu, soit **25 centimes** (§ 9 des
plans).

---

## 2. Les six pièges d'achat

Ils coûtent chacun au moins une séance. Ils sont classés par fréquence.

### Piège n° 1 — L'écran de 1,3" n'a pas le même contrôleur que celui de 0,96"

| Taille | Contrôleur habituel | Ce que ça change |
|---|---|---|
| 0,96" | **SSD1306** | mémoire de 128 colonnes, alignée sur l'écran |
| **1,3"** (retenu) | **SH1106** | mémoire de **132** colonnes → image **décalée de 2 pixels** si on le pilote en SSD1306 |

**Symptôme** : l'écran s'allume, affiche quelque chose, mais décalé, avec une
colonne parasite sur un bord. **Ce n'est pas une panne de câblage.**

**Parade** : les programmes utilisent U8g2, qui gère les deux — une ligne à
commenter en tête de fichier. Le programme 02 existe pour trancher la question
**avant** que la classe s'y perde.

**À l'achat** : accepter les deux, mais **savoir lequel on a**.

### Piège n° 2 — Le câble USB « charge seulement »

C'est la panne la plus fréquente et la plus déroutante de tout le projet : la
carte s'allume, la LED brille… et elle n'apparaît nulle part sur le PC.

**Parade** : deux câbles **connus bons** en permanence au bureau, marqués d'un
ruban de couleur. Devant un « ma carte ne marche pas », on change le câble
**avant** toute autre hypothèse.

**Attention** : ça vaut aussi pour la **rallonge USB-C de façade**. Beaucoup de
rallonges bon marché ne câblent que VBUS et GND. L'appareil s'alimenterait mais
ne se programmerait jamais. **À tester à l'achat, sur la première pièce.**

### Piège n° 3 — La résistance à 1 % au lieu de 0,1 %

R1 à R8 sont le **seul composant dont l'erreur se transforme directement en
erreur de température**, sans qu'aucun étalonnage à un point ne la rattrape
complètement.

| Tolérance | Erreur de température qui en découle à 25 °C |
|---|---|
| 1 % | **0,22 K** |
| **0,1 %** | **0,02 K** |

Le calcul est au § 3.2 des plans. La différence de prix est de quelques
centimes ; celle de résultat, d'un facteur dix.

**À l'achat** : la mention est « ±0,1 % » ou « 0,1% tolerance ». Un sachet
« métal film 1 % » ne convient pas. Les 0,1 % se vendent souvent par 20 ou 50 :
c'est ce qu'on veut, il en faut **8 par appareil**, plus la casse.

### Piège n° 4 — Le convertisseur doit être ABAISSEUR-ÉLÉVATEUR

Trois piles AA vont de **4,8 V** neuves à **2,7 V** en fin de vie. Le rail doit
rester à 3,3 V sur toute cette plage.

| Type de module | Marche ? | Pourquoi |
|---|---|---|
| Élévateur seul (boost) | **non** | ne peut pas descendre de 4,8 V à 3,55 V |
| Abaisseur seul (buck) | **non** | ne peut pas remonter de 2,7 V à 3,55 V |
| **Abaisseur-élévateur** | **oui** | c'est le seul qui couvre la plage |
| Régulateur linéaire | **non** | il faudrait 0,25 V de marge, on n'en a plus sous 3,8 V |

**À l'achat** : chercher « buck-boost », « step up down », « abaisseur
élévateur ». Sortie **réglable** (potentiomètre), à régler à 3,55 V.

### Piège n° 5 — Le diamètre de perçage des embases jack

On mesure **le filetage**, pas le corps. Le corps d'une embase de panneau fait
souvent 8 à 10 mm ; c'est **le filetage** qui traverse la tôle, et il fait
typiquement Ø6 mm.

**Le gabarit est dessiné pour Ø6.** Il faut le confirmer sur les pièces
achetées, au pied à coulisse, **avant** de percer six trous dans six boîtiers.

### Piège n° 6 — Les sondes d'un même lot ne sont pas identiques

Une NTC 10 kΩ B3950 bon marché est vendue en tolérance ± 1 % sur R25 **et**
± 1 % sur B — souvent moins bien, et jamais garantie sur un lot d'entrée de
gamme.

Ce n'est **pas** un défaut à corriger à l'achat : c'est exactement ce que la
séance 3B fait tomber, avec un bain d'eau glacée et six commandes `ZCn=0.0`.

**Ce qu'il faut faire à l'achat** : commander les six sondes d'un appareil
**dans le même lot**. Deux sondes de lots différents sur le même appareil, et
l'écart entre voies devient inexplicable pour un élève.

---

## 3. Quantités pour une classe de 10 élèves

5 binômes → 5 appareils élèves + 1 appareil professeur = **6 appareils**.

| Matériel | Pour 6 appareils | Secours | **À commander** |
|---|---:|---:|---:|
| ESP32-C3 SuperMini | 6 | 2 | **8** |
| ADS1115 | 12 | 3 | **15** |
| Écran OLED 1,3" | 6 | 1 | **7** |
| Sonde NTC 10 kΩ B3950 | 36 | 10 | **46** |
| Résistance 10 kΩ **0,1 %** | 48 | 22 | **70** (souvent vendu par 50 ou 100) |
| Résistance 100 kΩ 1 % | 12 | 8 | **20** |
| Condensateur 100 nF | 42 | 18 | **60** |
| Condensateur 100 µF | 6 | 4 | **10** |
| Diode Schottky 1N5819 | 6 | 4 | **10** |
| Fusible PPTC 200 mA | 6 | 4 | **10** |
| Embase jack 3,5 mm | 36 | 10 | **46** |
| Fiche jack 3,5 mm | 36 | 10 | **46** |
| Boîtier ABS | 6 | 1 | **7** |
| Inverseur 3 positions | 6 | 2 | **8** |
| Convertisseur abaisseur-élévateur | 6 | 2 | **8** |
| Porte-piles 3 × AA | 6 | 1 | **7** |
| Piles AA (jeux de 3) | 6 | 2 | **8 jeux** |
| Plaque à pastilles | 6 | 2 | **8** |
| Rallonge USB-C de façade | 6 | 1 | **7** |
| Câble USB-C avec données | 6 | 2 | **8** |
| Barrettes 2,54 mm mâles + femelles | — | — | **1 lot généreux** |
| Entretoises + visserie M3 | — | — | **1 lot de 100** |

> **Les taux de secours ne sont pas de la prudence excessive.**
> 22 résistances de précision de rechange sur 48, c'est 45 % — parce qu'une
> résistance dessoudée deux fois n'est plus utilisable, et que c'est le
> composant le plus manipulé du montage. 10 sondes sur 36, parce qu'un câble
> écrasé par une porte de chambre froide, ça arrive.

---

## 4. Budget de lancement de la classe

| Poste | Budget |
|---|---:|
| 6 appareils terminés | ~270 € |
| Pièces électroniques de secours | ~25 € |
| Stock initial de consommables | ~60 € |
| **Budget de lancement, hors outillage** | **~355 €** |

L'outillage est chiffré séparément en
[`04_Outillage_et_consommables.md`](04_Outillage_et_consommables.md) : c'est un
investissement, pas un consommable, et une bonne partie existe déjà dans un
atelier de lycée.

> **Ce budget est une enveloppe, pas un devis.** Il sera affiné après la
> sélection des références commerciales définitives — étape 1 du § 39 du
> dossier maître, non faite à ce jour.

---

## 5. La commande, dans le bon ordre

1. **Commander d'abord UN exemplaire de chaque** : un ESP32, deux ADS1115, un
   écran, un boîtier, six embases, un convertisseur, un sélecteur.
2. **Monter le prototype professeur** avec ça. Deux soirées.
3. **Corriger** : le gabarit (cotes réelles du boîtier), la ligne « écran » de
   la nomenclature (SH1106 ou SSD1306), le diamètre de perçage des embases, le
   bilan d'énergie (`outils/bilan-energie.mjs`).
4. **Puis commander les cinq autres.**

Commander les six d'un coup avant d'en avoir monté un, c'est prendre le risque
de multiplier par six une erreur de référence. Le surcoût de la commande en
deux fois est de quelques euros de port. L'erreur, elle, coûte une séance et
la crédibilité du module devant la classe.
