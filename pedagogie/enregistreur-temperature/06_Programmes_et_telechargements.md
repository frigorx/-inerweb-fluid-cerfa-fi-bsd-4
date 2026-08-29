# 06 — Programmes et téléchargements

**Onze programmes, dans l'ordre. Chacun prouve une chose, et une seule.**

---

## 1. Le principe : on ne donne jamais le code final

Le § 25 du dossier maître le posait déjà : *« les élèves ne doivent pas recevoir
directement le code final »*. Voici pourquoi, en une phrase :

> **Une panne se trouve parce qu'on sait quand elle est apparue.**

Un élève à qui on donne 500 lignes qui ne marchent pas n'a aucun point d'entrée.
Un élève qui vient de passer du programme 04 au programme 05, et chez qui ça
casse, sait que le problème est **dans ce qui a changé entre les deux** — c'est
à dire dans le calcul de la température, pas dans le bus ni dans l'écran.

C'est la seule raison de cette chaîne. Ce n'est pas de la progressivité
décorative.

---

## 2. La chaîne

| # | Dossier | Ce qu'il prouve | Ce que l'élève doit voir | Séance |
|---:|---|---|---|---|
| **01** | `01-test-carte` | l'ordinateur voit la carte, la carte parle | la LED clignote, le nom `ENR-T6-xxxx` s'affiche | 3A |
| **02** | `02-test-oled` | le bus existe, l'écran répond, le contrôleur est le bon | un cadre **net**, sans décalage de 2 pixels | 3A |
| **03** | `03-scanner-i2c` | trois circuits, trois adresses | `0x3C`, `0x48`, `0x49` | 3A |
| **04** | `04-lire-une-voie` | le convertisseur convertit | des **volts**, et le multimètre dit la même chose | 3A |
| **05** | `05-lire-une-ntc` | **la première température** | elle monte quand on serre la sonde | 3A |
| **06** | `06-lire-six-sondes` | les six voies, sonde absente détectée | `sonde absente` sur les voies vides | 3A |
| **07** | `07-afficher` | l'appareil se suffit à lui-même | six valeurs, colonnes stables | 3B |
| **08** | `08-niveau-piles` | la huitième voie | un pourcentage sur piles, `USB` sinon | 3B |
| **09** | `09-trame-usb` | la trame du § 26 | une ligne par seconde dans le moniteur | 3B |
| **10** | `10-bluetooth-ble` | la même trame, sans fil | l'appareil apparaît sous son nom | 3B |
| **11** | `11-version-finale` | étalonnage, extrema, pannes | l'étalonnage survit à la coupure | 3B / 4 |

Chaque programme tient dans **un seul fichier** : c'est la règle de l'IDE
Arduino, et c'est aussi la bonne règle pédagogique. Un programme se téléverse
d'un bloc ; il ne s'assemble pas.

---

## 3. Ce qu'il faut installer

### Le support de carte

**esp32 by Espressif Systems**, version **2.0.5 minimum**.
C'est cette version qui apporte `Wire.setPins()`, dont tous les programmes se
servent pour imposer GPIO5 et GPIO6 au bus I²C (§ 5.1 des plans).

Dans l'IDE : *Fichier > Préférences > URL de gestionnaire de cartes*, puis
*Outils > Type de carte > Gestionnaire de cartes*, chercher « esp32 ».

### Les deux bibliothèques

| Bibliothèque | Auteur | Utilisée à partir du | Ce qu'elle apporte |
|---|---|---|---|
| **U8g2** | Oliver Kraus | programme 02 | l'écran, **et les deux contrôleurs** |
| **Adafruit ADS1X15** | Adafruit | programme 04 | les convertisseurs |

`Adafruit BusIO` s'installe automatiquement avec la seconde.
**Le Bluetooth n'a rien à installer** : il vient avec le support ESP32.

---

## 4. Les réglages de l'IDE

Ce sont eux qui font perdre les deux premières heures quand ils sont faux.

| Réglage | Valeur | Ce qui se passe sinon |
|---|---|---|
| Type de carte | **ESP32C3 Dev Module** | — |
| **USB CDC On Boot** | **Enabled** | le moniteur série reste **muet** : l'élève croit que rien ne marche |
| **Schéma de partition** | **Huge APP (3MB No OTA/1MB SPIFFS)** | à partir du programme 10 : *text section exceeds available space* |
| Vitesse du moniteur | **115200** | des caractères illisibles |
| Port | celui qui apparaît quand on branche | — |

> **« text section exceeds available space » n'est pas une faute de programme.**
> C'est le schéma de partition. Le Bluetooth pèse lourd ; il ne rentre pas dans
> la partition par défaut. Un réglage, dix secondes.

---

## 5. Les commandes de l'appareil

Tapées dans le moniteur série, ou envoyées depuis `site/exploitation.html`.
Une ligne, une action, un accusé de réception.

| Commande | Effet | Disponible à partir du |
|---|---|---|
| `?` | l'appareil se présente | 09 |
| `H=14:05:30` | règle l'horloge | 09 |
| `I=5` | un relevé toutes les 5 s (1 à 3600) | 09 |
| `Z?` | liste les six décalages d'étalonnage | 11 |
| `Z3=-0.4` | impose un décalage à la voie 3 | 11 |
| `ZC3=0.0` | **étalonne** la voie 3 : « en ce moment, elle voit 0,0 » | 11 |
| `ZR` | remet les six décalages à zéro | 11 |
| `M?` | mini et maxi de chaque voie depuis la dernière remise à zéro | 11 |
| `MR` | remet les extrema à zéro | 11 |

### `ZCn=` est la commande de la séance 3B

Elle fait le calcul à la place de l'élève : *« la voie 3 affiche 0,4 alors
qu'elle est dans un bain à 0,0 — donc le décalage est de −0,4 »*. L'appareil
l'enregistre **dans sa mémoire flash**, où il survit à la coupure et même au
rechargement du programme.

Deux minutes par sonde, et l'appareil est étalonné pour l'année.

---

## 6. La trame de données

Format figé au § 26 du dossier maître :

```text
12:31:05;T1=4.8;T2=-3.2;T3=8.7;T4=52.1;T5=31.4;T6=24.8;BAT=78
```

### Une seule règle : un champ vide veut dire « pas de mesure valable »

```text
12:31:05;T1=4.8;T2=;T3=8.7;T4=52.1;T5=31.4;T6=24.8;BAT=
                ↑                                    ↑
      sonde 2 absente, coupée               appareil sur USB,
      ou en court-circuit                   pas sur piles
```

Un tableur affiche une cellule vide — ce qui est exactement juste. Une valeur
inventée, elle, serait fausse et invisible.

### Les lignes de commentaire

Toutes les 60 trames, et à chaque demande, une ligne qui commence par `#` :

```text
#ENR-T6-3A7F;v1.0;VOIES=6;INT=1;VEXC=3.301;ALIM=PILES;ETAL=1
```

Le dièse est le signe universel du commentaire. Un tableur peut l'ignorer, un
élève la lit, et l'outil d'acquisition s'en sert pour nommer le fichier.

### L'horloge — et c'est un vrai sujet de cours

Cet appareil n'a **pas de pile d'horloge**. À la mise sous tension, il ne sait
pas quelle heure il est : il compte le temps écoulé depuis le démarrage, à
partir de `00:00:00`.

> **Un enregistreur autonome connaît des durées, pas des dates.**

C'est le PC ou le téléphone — lui qui connaît l'heure — qui la lui donne avec
la commande `H=` dès qu'il se connecte. Et c'est lui qui date le fichier CSV.
Le dire en séance 3B : c'est une notion, pas une limitation.

### Pourquoi ce format et pas du JSON

- un élève le **lit à l'œil nu** et voit tout de suite ce qui cloche ;
- un tableur français l'ouvre directement, séparateur point-virgule ;
- il fait **61 caractères**, ce qui oblige à comprendre le découpage des
  notifications BLE — et c'est justement une chose à comprendre.

---

## 7. Le Bluetooth — le service NUS, et le piège des 20 octets

### Le service

**NUS**, *Nordic UART Service*. Ce n'est pas une norme officielle, c'est une
convention devenue universelle : un service qui fait passer du texte, dans les
deux sens, comme un câble série.

| Identifiant | Rôle |
|---|---|
| `6e400001-b5a3-f393-e0a9-e50e24dcca9e` | le service |
| `6e400002-…` | **RX** — le PC écrit vers l'appareil |
| `6e400003-…` | **TX** — l'appareil notifie le PC |

**Pourquoi celui-là** : il est lisible par tout ce qu'un lycée a sous la main,
**sans rien installer** — une page Web Bluetooth, nRF Connect sur Android, les
terminaux série BLE du commerce. Un service normalisé « Environmental Sensing »
serait plus orthodoxe et illisible à l'œil nu par un élève qui débogue.
Arbitrage O3 de [`POINTS-OUVERTS.md`](POINTS-OUVERTS.md).

### Le piège des 20 octets

> Une notification BLE transporte par défaut **20 octets utiles**.
> Notre trame en fait **61**.

Sans précaution, le PC recevrait `12:31:05;T1=4.8;T2` et rien d'autre : la trame
serait **coupée**. On peut demander au téléphone d'agrandir le tuyau
(négociation de MTU), mais on ne peut pas l'y obliger.

**La parade** : découper la trame en morceaux de 20 octets et la terminer par un
retour à la ligne. Le récepteur recolle les morceaux jusqu'au retour à la ligne.
C'est exactement ce que fait un port série depuis toujours, et
`site/exploitation.js` le fait aussi.

### Le nom de l'appareil

Tiré de l'identifiant unique de la puce : `ENR-T6-3A7F`.

**Il doit être écrit sur l'étiquette de façade.** Six appareils identiques dans
une salle, sans nom, personne ne sait à qui il parle. Ce n'est pas un détail de
confort : c'est une consigne de montage, et le programme 10 l'affiche en grand
pendant trois secondes au démarrage pour qu'on le recopie.

---

## 8. Contrôler la logique sans avoir de carte

```sh
node outils/verifier-logique.mjs
```

Le script **découpe les fonctions pures du programme 11**, les compile avec g++
à côté d'un banc d'essai, et vérifie que :

1. la température calculée par le firmware est **celle du modèle** de
   `outils/table-ntc.mjs`, sur les 16 points du tableau du dossier, et aussi aux
   deux bouts de la fenêtre (−36 °C, +180 °C) ;
2. la trame est **exactement** au format du § 26 ;
3. les champs vides veulent bien dire « pas de mesure valable », pour les trois
   causes (sonde absente, court-circuit, circuit hors service) ;
4. la table des piles est **bornée et monotone** ;
5. l'analyseur de commandes accepte ce qu'il doit accepter et **refuse** ce
   qu'il doit refuser — voie inexistante, écart d'étalonnage supérieur à 10 K,
   intervalle hors bornes, heure invalide.

**Le code testé est le code embarqué** : il est extrait du `.ino` à chaque
exécution, jamais recopié. Si quelqu'un modifie le firmware et casse la
physique, ce contrôle tombe.

> **Ce que ce contrôle ne prouve pas** : rien de ce qui touche le matériel. Le
> bus, les convertisseurs, l'écran, le Bluetooth et la consommation attendent le
> prototype. Voir [`POINTS-OUVERTS.md`](POINTS-OUVERTS.md) § B1.

Les deux autres outils :

```sh
node outils/table-ntc.mjs        # le tableau R(T) du dossier, recalculé
node outils/bilan-energie.mjs    # l'autonomie, hypothèses affichées
node outils/verifier-module.mjs  # le filet complet du module
```

---

## 9. Téléchargements

Tout est dans le dépôt, sous `pedagogie/enregistreur-temperature/`.
**Rien n'est hébergé ailleurs, rien ne se télécharge depuis un service extérieur.**

| Quoi | Où |
|---|---|
| Les onze programmes | `programmes/01-…` à `programmes/11-…` |
| Le site compagnon, hors ligne | `site/index.html` |
| L'outil d'acquisition | `site/exploitation.html` |
| Le gabarit de perçage 1:1 | `illustrations/gabarit-percage.svg` |
| Les étiquettes 1:1 | `illustrations/face-avant.svg` |
| Les schémas | `illustrations/*.svg` |
| Les outils de contrôle | `outils/*.mjs` |

### À imprimer, et à quelle échelle

| Document | Échelle | Contrôle |
|---|---|---|
| `gabarit-percage.svg` | **100 %, taille réelle** | carré de **50,0 mm** au réglet |
| `face-avant.svg` | **100 %, sur papier adhésif** | carré de **50,0 mm** au réglet |
| `schema-general.svg` | libre | — |
| `pont-diviseur.svg` | libre — A4 paysage conseillé | — |
| Les fiches du dossier élève | A4 recto-verso | — |

> **« Ajuster à la page » fausse le gabarit de 3 à 5 %**, soit 4 mm sur 120 —
> et six embases ne rentrent plus. Le carré de contrôle est là pour ça.
> Vérifier **chaque exemplaire imprimé**, pas seulement le premier.
